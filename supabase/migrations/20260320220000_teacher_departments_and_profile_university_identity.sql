-- allow teachers to manage their university departments and expose
-- non-confidential verified university identity for student-facing UI.
-- affected objects: public.departments, public.is_teacher,
-- public.get_profile_university_identity

create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'teacher'
  );
$$;

comment on function public.is_teacher() is 'returns true when the current authenticated user is a teacher.';

create or replace function public.get_profile_university_identity(
  p_profile_id uuid default null
)
returns table (
  university_id uuid,
  university_name text,
  university_short_name text,
  university_slug text,
  is_university_verified boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_profile_id uuid := coalesce(p_profile_id, auth.uid());
  viewer_role text;
  target_role text;
begin
  if auth.uid() is null then
    raise exception 'you must be signed in to view university identity.';
  end if;

  select role
  into viewer_role
  from public.profiles
  where id = auth.uid();

  select role
  into target_role
  from public.profiles
  where id = target_profile_id;

  if target_role is null then
    return;
  end if;

  if target_profile_id <> auth.uid()
     and (
       viewer_role not in ('teacher', 'recruiter', 'admin', 'developer')
       or target_role <> 'student'
     ) then
    raise exception 'you can only view your own university identity or a visible student university identity.';
  end if;

  return query
  select
    universities.id,
    universities.name,
    universities.short_name,
    universities.slug,
    (
      profiles.university_id is not null
      and profiles.university_member_role = 'student'
    ) as is_university_verified
  from public.profiles
  join public.universities
    on universities.id = profiles.university_id
  where profiles.id = target_profile_id;
end;
$$;

comment on function public.get_profile_university_identity(uuid) is
  'returns the safe university name and verified-student flag for the requested profile.';

drop policy if exists "teachers can insert own departments" on public.departments;
create policy "teachers can insert own departments"
  on public.departments for insert to authenticated
  with check (
    (select public.is_teacher())
    and university_id = (select public.current_university_id())
  );

drop policy if exists "teachers can update own departments" on public.departments;
create policy "teachers can update own departments"
  on public.departments for update to authenticated
  using (
    (select public.is_teacher())
    and university_id = (select public.current_university_id())
  )
  with check (
    (select public.is_teacher())
    and university_id = (select public.current_university_id())
  );

drop policy if exists "teachers can delete own departments" on public.departments;
create policy "teachers can delete own departments"
  on public.departments for delete to authenticated
  using (
    (select public.is_teacher())
    and university_id = (select public.current_university_id())
  );
