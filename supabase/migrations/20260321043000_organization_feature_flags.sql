-- add organization-level type and feature configuration to public.universities
-- and expose the safe organization config through public.get_profile_university_identity.
-- affected objects: public.universities, public.get_profile_university_identity

alter table public.universities
  add column if not exists organization_type text not null default 'university',
  add column if not exists organization_features jsonb not null default '{
    "navbar": {
      "find_teachers": true,
      "my_results": true,
      "practice": true,
      "jobs": true,
      "my_profile": true
    },
    "exam_portal": {
      "drawing_canvas": true,
      "code_compiler": true,
      "graph_calculator": true
    }
  }'::jsonb;

alter table public.universities
  drop constraint if exists universities_organization_type_check;

alter table public.universities
  add constraint universities_organization_type_check
  check (organization_type in ('university', 'tech_company', 'coaching_center', 'enterprise', 'other'));

comment on column public.universities.organization_type is
  'developer-managed organization classification used to tailor portal behavior.';

comment on column public.universities.organization_features is
  'developer-managed feature visibility toggles for student navigation and exam portal tools.';

drop function if exists public.get_profile_university_identity(uuid);

create or replace function public.get_profile_university_identity(
  p_profile_id uuid default null
)
returns table (
  university_id uuid,
  university_name text,
  university_short_name text,
  university_slug text,
  is_university_verified boolean,
  organization_type text,
  organization_features jsonb
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
    ) as is_university_verified,
    universities.organization_type,
    coalesce(
      universities.organization_features,
      '{
        "navbar": {
          "find_teachers": true,
          "my_results": true,
          "practice": true,
          "jobs": true,
          "my_profile": true
        },
        "exam_portal": {
          "drawing_canvas": true,
          "code_compiler": true,
          "graph_calculator": true
        }
      }'::jsonb
    ) as organization_features
  from public.profiles
  join public.universities
    on universities.id = profiles.university_id
  where profiles.id = target_profile_id;
end;
$$;

comment on function public.get_profile_university_identity(uuid) is
  'returns the safe university name, verified-student flag, and developer-managed organization config for the requested profile.';
