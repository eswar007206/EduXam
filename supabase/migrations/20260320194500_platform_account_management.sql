-- secure platform account provisioning and managed account updates.
-- affected objects: public.provision_platform_account,
-- public.update_platform_account, and auth.users access for managed portal accounts.

create or replace function public.provision_platform_account(
  p_profile_id uuid,
  p_university_id uuid,
  p_email text,
  p_username text default null,
  p_role text default null,
  p_department_label text default null,
  p_company_name text default null,
  p_created_by uuid default null
)
returns public.university_managed_accounts
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_email text := lower(trim(coalesce(p_email, '')));
  normalized_role text := lower(trim(coalesce(p_role, '')));
  normalized_username text := nullif(trim(coalesce(p_username, '')), '');
  normalized_department text := nullif(trim(coalesce(p_department_label, '')), '');
  normalized_company text := nullif(trim(coalesce(p_company_name, '')), '');
  resolved_university_id uuid := p_university_id;
  managed_account public.university_managed_accounts%rowtype;
begin
  if auth.uid() is null then
    raise exception 'you must be signed in to provision accounts.';
  end if;

  if p_profile_id is null then
    raise exception 'the target profile id is required.';
  end if;

  if normalized_email = '' then
    raise exception 'email is required.';
  end if;

  if normalized_role not in ('admin', 'teacher', 'recruiter') then
    raise exception 'only admin, teacher, and recruiter accounts can be provisioned here.';
  end if;

  if normalized_role = 'admin' then
    if not public.is_developer() then
      raise exception 'only developers can provision university admin accounts.';
    end if;

    if resolved_university_id is null then
      raise exception 'a university is required for admin accounts.';
    end if;
  else
    if not public.is_admin() then
      raise exception 'only university admins can provision teacher and recruiter accounts.';
    end if;

    resolved_university_id := public.current_university_id();
    if resolved_university_id is null then
      raise exception 'this admin account is not linked to a university yet.';
    end if;
  end if;

  if normalized_username is null then
    normalized_username := split_part(normalized_email, '@', 1);
  end if;

  if normalized_role = 'teacher' and normalized_department is null then
    raise exception 'department is required for teacher accounts.';
  end if;

  if normalized_role = 'recruiter' and normalized_company is null then
    raise exception 'company name is required for recruiter accounts.';
  end if;

  update public.profiles
  set
    email = normalized_email,
    username = normalized_username,
    role = normalized_role,
    university_id = resolved_university_id,
    university_member_role = case
      when normalized_role = 'admin' then 'admin'
      when normalized_role = 'teacher' then 'teacher'
      else null
    end,
    department_label = case
      when normalized_role = 'teacher' then normalized_department
      else null
    end,
    company_name = case
      when normalized_role = 'recruiter' then normalized_company
      else null
    end
  where id = p_profile_id;

  if not found then
    raise exception 'the provisioned auth profile could not be found.';
  end if;

  insert into public.university_managed_accounts (
    university_id,
    email,
    username,
    full_name,
    company_name,
    role,
    department_label,
    provisioning_status,
    linked_profile_id,
    created_by
  )
  values (
    resolved_university_id,
    normalized_email,
    normalized_username,
    null,
    case
      when normalized_role = 'recruiter' then normalized_company
      else null
    end,
    normalized_role,
    case
      when normalized_role = 'teacher' then normalized_department
      else null
    end,
    'active',
    p_profile_id,
    coalesce(p_created_by, auth.uid())
  )
  on conflict (email)
  do update
  set
    university_id = excluded.university_id,
    username = excluded.username,
    company_name = excluded.company_name,
    role = excluded.role,
    department_label = excluded.department_label,
    provisioning_status = 'active',
    linked_profile_id = excluded.linked_profile_id
  returning *
  into managed_account;

  update auth.users
  set
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'role',
        normalized_role,
        'username',
        normalized_username
      ),
    banned_until = null,
    updated_at = now()
  where id = p_profile_id;

  return managed_account;
end;
$$;

comment on function public.provision_platform_account(uuid, uuid, text, text, text, text, text, uuid) is
  'provisions admin, teacher, or recruiter accounts for the platform dashboards and keeps auth/profile state aligned.';

create or replace function public.update_platform_account(
  p_managed_account_id uuid,
  p_username text default null,
  p_university_id uuid default null,
  p_department_label text default null,
  p_company_name text default null,
  p_provisioning_status text default null
)
returns public.university_managed_accounts
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_account public.university_managed_accounts%rowtype;
  normalized_username text;
  normalized_department text;
  normalized_company text;
  normalized_status text;
  resolved_university_id uuid;
begin
  if auth.uid() is null then
    raise exception 'you must be signed in to update accounts.';
  end if;

  select *
  into target_account
  from public.university_managed_accounts
  where id = p_managed_account_id;

  if target_account.id is null then
    raise exception 'the managed account could not be found.';
  end if;

  if target_account.role = 'admin' then
    if not public.is_developer() then
      raise exception 'only developers can manage university admin accounts.';
    end if;

    resolved_university_id := coalesce(p_university_id, target_account.university_id);
    if resolved_university_id is null then
      raise exception 'a university is required for admin accounts.';
    end if;
  elsif target_account.role in ('teacher', 'recruiter') then
    if not public.is_admin() then
      raise exception 'only university admins can manage teacher and recruiter accounts.';
    end if;

    if target_account.university_id is distinct from public.current_university_id() then
      raise exception 'you can only manage accounts from your own university.';
    end if;

    resolved_university_id := target_account.university_id;
  else
    raise exception 'this account role is not supported in the platform dashboard.';
  end if;

  normalized_username := coalesce(
    nullif(trim(coalesce(p_username, '')), ''),
    target_account.username,
    split_part(target_account.email, '@', 1)
  );
  normalized_status := coalesce(
    nullif(trim(coalesce(p_provisioning_status, '')), ''),
    target_account.provisioning_status
  );

  if normalized_status not in ('provisioned', 'active', 'disabled') then
    raise exception 'invalid account status.';
  end if;

  normalized_department := case
    when target_account.role = 'teacher' then
      coalesce(nullif(trim(coalesce(p_department_label, '')), ''), target_account.department_label)
    else
      null
  end;

  normalized_company := case
    when target_account.role = 'recruiter' then
      coalesce(nullif(trim(coalesce(p_company_name, '')), ''), target_account.company_name)
    else
      null
  end;

  if target_account.role = 'teacher' and normalized_department is null then
    raise exception 'department is required for teacher accounts.';
  end if;

  if target_account.role = 'recruiter' and normalized_company is null then
    raise exception 'company name is required for recruiter accounts.';
  end if;

  update public.university_managed_accounts
  set
    university_id = resolved_university_id,
    username = normalized_username,
    company_name = normalized_company,
    department_label = normalized_department,
    provisioning_status = normalized_status
  where id = p_managed_account_id
  returning *
  into target_account;

  if target_account.linked_profile_id is not null then
    update public.profiles
    set
      username = normalized_username,
      role = target_account.role,
      university_id = resolved_university_id,
      university_member_role = case
        when target_account.role = 'admin' then 'admin'
        when target_account.role = 'teacher' then 'teacher'
        else null
      end,
      department_label = normalized_department,
      company_name = normalized_company
    where id = target_account.linked_profile_id;

    update auth.users
    set
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('username', normalized_username),
      banned_until = case
        when normalized_status = 'disabled' then now() + interval '100 years'
        else null
      end,
      updated_at = now()
    where id = target_account.linked_profile_id;
  end if;

  return target_account;
end;
$$;

comment on function public.update_platform_account(uuid, text, uuid, text, text, text) is
  'updates managed portal account details and keeps linked auth/profile state in sync, including disable and re-enable support.';
