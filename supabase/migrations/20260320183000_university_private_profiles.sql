-- move confidential university details into an admin-only table.
-- affected objects: public.universities, public.university_private_profiles

create table if not exists public.university_private_profiles (
  university_id uuid primary key references public.universities(id) on delete cascade,
  website text,
  contact_email text,
  contact_phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

comment on table public.university_private_profiles is 'Confidential university details managed only inside the university admin workspace.';
comment on column public.university_private_profiles.website is 'Official university website maintained by the university admin.';
comment on column public.university_private_profiles.contact_email is 'Primary university contact email maintained by the university admin.';
comment on column public.university_private_profiles.contact_phone is 'Primary university contact phone maintained by the university admin.';
comment on column public.university_private_profiles.address is 'Campus address maintained by the university admin.';
comment on column public.university_private_profiles.notes is 'Internal university notes visible only to the university admin workspace.';

insert into public.university_private_profiles (
  university_id,
  website,
  contact_email,
  contact_phone,
  address,
  notes,
  created_at,
  updated_at,
  updated_by
)
select
  public.universities.id,
  public.universities.website,
  public.universities.contact_email,
  public.universities.contact_phone,
  public.universities.address,
  public.universities.notes,
  public.universities.created_at,
  now(),
  public.universities.created_by
from public.universities
where public.universities.website is not null
   or public.universities.contact_email is not null
   or public.universities.contact_phone is not null
   or public.universities.address is not null
   or public.universities.notes is not null
on conflict (university_id) do update
set
  website = excluded.website,
  contact_email = excluded.contact_email,
  contact_phone = excluded.contact_phone,
  address = excluded.address,
  notes = excluded.notes,
  updated_at = now(),
  updated_by = excluded.updated_by;

create or replace function public.touch_university_private_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function public.touch_university_private_profiles_updated_at() is 'Keeps university_private_profiles.updated_at fresh on every update.';

drop trigger if exists trg_university_private_profiles_updated_at on public.university_private_profiles;

create trigger trg_university_private_profiles_updated_at
before update on public.university_private_profiles
for each row
execute function public.touch_university_private_profiles_updated_at();

alter table public.university_private_profiles enable row level security;

drop policy if exists "university admins can read own private university details" on public.university_private_profiles;
create policy "university admins can read own private university details"
  on public.university_private_profiles for select to authenticated
  using (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

drop policy if exists "university admins can insert own private university details" on public.university_private_profiles;
create policy "university admins can insert own private university details"
  on public.university_private_profiles for insert to authenticated
  with check (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

drop policy if exists "university admins can update own private university details" on public.university_private_profiles;
create policy "university admins can update own private university details"
  on public.university_private_profiles for update to authenticated
  using (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  )
  with check (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

drop policy if exists "university admins can delete own private university details" on public.university_private_profiles;
create policy "university admins can delete own private university details"
  on public.university_private_profiles for delete to authenticated
  using (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

-- destructive cleanup: these confidential columns must leave the developer-readable shell table.
alter table public.universities
  drop column if exists website,
  drop column if exists contact_email,
  drop column if exists contact_phone,
  drop column if exists address,
  drop column if exists notes;

comment on table public.universities is 'University shell records used for developer onboarding and university ownership.';
