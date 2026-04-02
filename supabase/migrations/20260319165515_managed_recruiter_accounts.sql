-- extend managed account provisioning to recruiter identities.
-- affected objects: public.university_managed_accounts,
-- public.get_signup_authorization, and public.link_managed_account_to_current_profile.

alter table public.university_managed_accounts
  add column if not exists company_name text;

comment on table public.university_managed_accounts is 'Pre-provisioned identities for students, teachers, recruiters, and admins.';
comment on column public.university_managed_accounts.company_name is 'Company name synced into recruiter profiles for admin-provisioned recruiter accounts.';

alter table public.university_managed_accounts
  alter column university_id drop not null;

alter table public.university_managed_accounts
  drop constraint if exists university_managed_accounts_role_check;

alter table public.university_managed_accounts
  add constraint university_managed_accounts_role_check
  check (role in ('student', 'teacher', 'recruiter', 'admin'));

alter table public.university_managed_accounts
  drop constraint if exists university_managed_accounts_required_fields_check;

alter table public.university_managed_accounts
  add constraint university_managed_accounts_required_fields_check
  check (
    (
      role = 'recruiter'
      and nullif(trim(company_name), '') is not null
    )
    or (
      role in ('student', 'teacher', 'admin')
      and university_id is not null
    )
  );

create or replace function public.get_signup_authorization(
  p_email text,
  p_role text
)
returns table (
  allowed boolean,
  reason text,
  university_id uuid,
  account_role text,
  username text,
  full_name text,
  roll_number text,
  semester_label text,
  department_label text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(coalesce(p_email, '')));
  normalized_role text := lower(trim(coalesce(p_role, '')));
  managed_record public.university_managed_accounts%rowtype;
  existing_admin_count integer := 0;
begin
  if normalized_email = '' then
    return query
    select false, 'email is required.', null::uuid, null::text, null::text, null::text, null::text, null::text, null::text;
    return;
  end if;

  if normalized_role = '' then
    return query
    select false, 'role is required.', null::uuid, null::text, null::text, null::text, null::text, null::text, null::text;
    return;
  end if;

  if normalized_role not in ('student', 'teacher', 'recruiter', 'admin') then
    return query
    select false, 'this portal role is not supported for signup.', null::uuid, null::text, null::text, null::text, null::text, null::text, null::text;
    return;
  end if;

  if normalized_role = 'admin' then
    select count(*)
    into existing_admin_count
    from public.profiles
    where role = 'admin';

    if existing_admin_count = 0 then
      return query
      select true, null::text, null::uuid, 'admin', null::text, null::text, null::text, null::text, null::text;
      return;
    end if;
  end if;

  select *
  into managed_record
  from public.university_managed_accounts
  where lower(email) = normalized_email
    and role = normalized_role
    and provisioning_status in ('provisioned', 'active')
  order by created_at asc
  limit 1;

  if managed_record.id is null then
    return query
    select
      false,
      case
        when normalized_role = 'admin' then 'this admin email has not been provisioned in the admin portal yet.'
        when normalized_role = 'teacher' then 'this teacher email has not been provisioned in the admin portal yet.'
        when normalized_role = 'recruiter' then 'this recruiter email has not been provisioned in the admin portal yet.'
        else 'this student email has not been provisioned in the admin portal yet.'
      end,
      null::uuid,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text;
    return;
  end if;

  return query
  select
    true,
    null::text,
    managed_record.university_id,
    managed_record.role,
    managed_record.username,
    managed_record.full_name,
    managed_record.roll_number,
    managed_record.semester_label,
    managed_record.department_label;
end
$$;

comment on function public.get_signup_authorization(text, text) is 'securely validates whether a signup email and role are provisioned for managed access.';

create or replace function public.link_managed_account_to_current_profile()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.profiles%rowtype;
  managed_record public.university_managed_accounts%rowtype;
  other_admin_count integer := 0;
begin
  if auth.uid() is null then
    return jsonb_build_object('linked', false, 'reason', 'not_authenticated');
  end if;

  select *
  into current_profile
  from public.profiles
  where id = auth.uid();

  if current_profile.id is null then
    return jsonb_build_object('linked', false, 'reason', 'profile_missing');
  end if;

  if current_profile.role not in ('student', 'teacher', 'recruiter', 'admin') then
    return jsonb_build_object('linked', false, 'reason', 'role_not_managed');
  end if;

  select *
  into managed_record
  from public.university_managed_accounts
  where lower(email) = lower(current_profile.email)
    and role = current_profile.role
    and provisioning_status in ('provisioned', 'active')
  order by created_at asc
  limit 1;

  if managed_record.id is null and current_profile.role = 'admin' then
    select count(*)
    into other_admin_count
    from public.profiles
    where role = 'admin'
      and id <> current_profile.id;

    if other_admin_count = 0 then
      update public.profiles
      set university_member_role = 'admin'
      where id = current_profile.id;

      return jsonb_build_object('linked', true, 'bootstrap_admin', true);
    end if;
  end if;

  if managed_record.id is null then
    return jsonb_build_object('linked', false, 'reason', 'managed_account_missing');
  end if;

  update public.profiles
  set
    university_id = case
      when current_profile.role = 'recruiter' then null
      else managed_record.university_id
    end,
    university_member_role = case
      when current_profile.role = 'admin' then 'admin'
      when current_profile.role = 'recruiter' then null
      else managed_record.role
    end,
    roll_number = case
      when current_profile.role = 'recruiter' then null
      else managed_record.roll_number
    end,
    semester_label = case
      when current_profile.role = 'recruiter' then null
      else managed_record.semester_label
    end,
    department_label = case
      when current_profile.role = 'recruiter' then null
      else managed_record.department_label
    end,
    company_name = case
      when current_profile.role = 'recruiter' then coalesce(nullif(trim(managed_record.company_name), ''), current_profile.company_name)
      else current_profile.company_name
    end
  where id = current_profile.id;

  update public.university_managed_accounts
  set
    linked_profile_id = current_profile.id,
    provisioning_status = 'active'
  where id = managed_record.id;

  return jsonb_build_object(
    'linked',
    true,
    'managed_account_id',
    managed_record.id,
    'university_id',
    managed_record.university_id
  );
end
$$;

comment on function public.link_managed_account_to_current_profile() is 'syncs the authenticated profile with its provisioned managed account record.';
