-- move university email-domain ownership to the developer role.
-- affected objects: public.university_email_domains and
-- public.backfill_university_profiles_for_domain.

create or replace function public.backfill_university_profiles_for_domain(
  p_university_id uuid,
  p_domain text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_domain text := lower(trim(regexp_replace(coalesce(p_domain, ''), '^@+', '')));
  updated_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'you must be signed in to manage university domains.';
  end if;

  if not public.is_developer() then
    raise exception 'only developers can manage university domains.';
  end if;

  if p_university_id is null then
    raise exception 'a university is required.';
  end if;

  if normalized_domain = '' then
    raise exception 'domain is required.';
  end if;

  update public.profiles
  set
    university_id = p_university_id,
    university_member_role = case
      when role = 'student' then 'student'
      when role = 'teacher' then 'teacher'
      when role = 'admin' then 'admin'
      else university_member_role
    end
  where role in ('student', 'teacher', 'admin')
    and lower(split_part(email, '@', 2)) = normalized_domain
    and (
      university_id is distinct from p_university_id
      or university_member_role is null
    );

  get diagnostics updated_count = row_count;

  return updated_count;
end;
$$;

comment on function public.backfill_university_profiles_for_domain(uuid, text) is
  'assigns existing student, teacher, and admin profiles to a university when the developer adds an official email domain.';

drop policy if exists "university admins can insert own university domains" on public.university_email_domains;
drop policy if exists "university admins can update own university domains" on public.university_email_domains;
drop policy if exists "university admins can delete own university domains" on public.university_email_domains;

create policy "developers can insert university domains"
  on public.university_email_domains for insert to authenticated
  with check ((select public.is_developer()));

create policy "developers can update university domains"
  on public.university_email_domains for update to authenticated
  using ((select public.is_developer()))
  with check ((select public.is_developer()));

create policy "developers can delete university domains"
  on public.university_email_domains for delete to authenticated
  using ((select public.is_developer()));
