-- university admin portal foundation
-- adds university management, managed university identities, secure signup gating,
-- teacher-to-admin main exam approval, and slot-based main exam scheduling

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'teacher', 'recruiter', 'admin'));

alter table public.profiles
  add column if not exists university_id uuid,
  add column if not exists university_member_role text,
  add column if not exists roll_number text,
  add column if not exists semester_label text,
  add column if not exists department_label text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_university_member_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_university_member_role_check
      check (
        university_member_role is null
        or university_member_role in ('student', 'teacher', 'official', 'admin')
      );
  end if;
end
$$;

create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_name text,
  website text,
  contact_email text,
  contact_phone text,
  address text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.universities is 'University master records used by the admin portal.';

create table if not exists public.university_email_domains (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  domain text not null unique,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.university_email_domains is 'Allowed email domains that belong to a university.';

create table if not exists public.university_managed_accounts (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  email text not null unique,
  username text,
  full_name text,
  role text not null,
  roll_number text,
  semester_label text,
  department_label text,
  provisioning_status text not null default 'provisioned',
  linked_profile_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.university_managed_accounts is 'Pre-provisioned university identities for students, teachers, and admins.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'university_managed_accounts_role_check'
      and conrelid = 'public.university_managed_accounts'::regclass
  ) then
    alter table public.university_managed_accounts
      add constraint university_managed_accounts_role_check
      check (role in ('student', 'teacher', 'admin'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'university_managed_accounts_status_check'
      and conrelid = 'public.university_managed_accounts'::regclass
  ) then
    alter table public.university_managed_accounts
      add constraint university_managed_accounts_status_check
      check (provisioning_status in ('provisioned', 'active', 'disabled'));
  end if;
end
$$;

alter table public.subjects
  add column if not exists university_id uuid references public.universities(id) on delete set null,
  add column if not exists main_exam_title text,
  add column if not exists main_exam_description text,
  add column if not exists main_exam_instructions text,
  add column if not exists main_exam_duration_minutes integer not null default 90,
  add column if not exists main_exam_target_semester text,
  add column if not exists main_exam_target_department text,
  add column if not exists main_exam_expected_students integer,
  add column if not exists exam_type_status text not null default 'active',
  add column if not exists pending_exam_type text;

comment on column public.subjects.main_exam_title is 'Admin-approved title shown to students before a main exam.';
comment on column public.subjects.main_exam_description is 'Admin-approved description shown to students before a main exam.';
comment on column public.subjects.main_exam_instructions is 'Admin-approved instructions shown to students before a main exam.';
comment on column public.subjects.main_exam_duration_minutes is 'Main exam duration in minutes.';
comment on column public.subjects.main_exam_target_semester is 'Teacher-requested semester target for a main exam.';
comment on column public.subjects.main_exam_target_department is 'Teacher-requested department or cohort target for a main exam.';
comment on column public.subjects.main_exam_expected_students is 'Expected student count for the main exam.';
comment on column public.subjects.exam_type_status is 'Whether the subject exam mode is active or waiting for admin approval.';
comment on column public.subjects.pending_exam_type is 'Requested next exam type awaiting admin review.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subjects_exam_type_status_check'
      and conrelid = 'public.subjects'::regclass
  ) then
    alter table public.subjects
      add constraint subjects_exam_type_status_check
      check (exam_type_status in ('active', 'pending_approval'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subjects_pending_exam_type_check'
      and conrelid = 'public.subjects'::regclass
  ) then
    alter table public.subjects
      add constraint subjects_pending_exam_type_check
      check (pending_exam_type is null or pending_exam_type in ('prep', 'main'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subjects_main_exam_duration_minutes_check'
      and conrelid = 'public.subjects'::regclass
  ) then
    alter table public.subjects
      add constraint subjects_main_exam_duration_minutes_check
      check (main_exam_duration_minutes between 1 and 300);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subjects_main_exam_expected_students_check'
      and conrelid = 'public.subjects'::regclass
  ) then
    alter table public.subjects
      add constraint subjects_main_exam_expected_students_check
      check (main_exam_expected_students is null or main_exam_expected_students > 0);
  end if;
end
$$;

create table if not exists public.subject_exam_change_requests (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  university_id uuid references public.universities(id) on delete set null,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  current_exam_type text not null,
  requested_exam_type text not null,
  requested_title text,
  requested_description text,
  requested_instructions text,
  requested_duration_minutes integer,
  requested_target_semester text,
  requested_target_department text,
  requested_expected_students integer,
  status text not null default 'pending',
  admin_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.subject_exam_change_requests is 'Teacher-submitted exam mode changes that require admin approval for main exams.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subject_exam_change_requests_current_exam_type_check'
      and conrelid = 'public.subject_exam_change_requests'::regclass
  ) then
    alter table public.subject_exam_change_requests
      add constraint subject_exam_change_requests_current_exam_type_check
      check (current_exam_type in ('prep', 'main'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subject_exam_change_requests_requested_exam_type_check'
      and conrelid = 'public.subject_exam_change_requests'::regclass
  ) then
    alter table public.subject_exam_change_requests
      add constraint subject_exam_change_requests_requested_exam_type_check
      check (requested_exam_type in ('prep', 'main'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subject_exam_change_requests_status_check'
      and conrelid = 'public.subject_exam_change_requests'::regclass
  ) then
    alter table public.subject_exam_change_requests
      add constraint subject_exam_change_requests_status_check
      check (status in ('pending', 'approved', 'rejected', 'cancelled'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subject_exam_change_requests_requested_duration_check'
      and conrelid = 'public.subject_exam_change_requests'::regclass
  ) then
    alter table public.subject_exam_change_requests
      add constraint subject_exam_change_requests_requested_duration_check
      check (
        requested_duration_minutes is null
        or requested_duration_minutes between 1 and 300
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subject_exam_change_requests_requested_expected_students_check'
      and conrelid = 'public.subject_exam_change_requests'::regclass
  ) then
    alter table public.subject_exam_change_requests
      add constraint subject_exam_change_requests_requested_expected_students_check
      check (
        requested_expected_students is null
        or requested_expected_students > 0
      );
  end if;
end
$$;

create unique index if not exists idx_subject_exam_change_requests_pending
  on public.subject_exam_change_requests (subject_id)
  where status = 'pending';

create table if not exists public.main_exam_schedule_slots (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  university_id uuid references public.universities(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  change_request_id uuid references public.subject_exam_change_requests(id) on delete set null,
  slot_name text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  allowed_email_start text,
  allowed_email_end text,
  max_students integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.main_exam_schedule_slots is 'Admin-managed exam windows that gate student access to main exams.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'main_exam_schedule_slots_time_check'
      and conrelid = 'public.main_exam_schedule_slots'::regclass
  ) then
    alter table public.main_exam_schedule_slots
      add constraint main_exam_schedule_slots_time_check
      check (end_time > start_time);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'main_exam_schedule_slots_max_students_check'
      and conrelid = 'public.main_exam_schedule_slots'::regclass
  ) then
    alter table public.main_exam_schedule_slots
      add constraint main_exam_schedule_slots_max_students_check
      check (max_students is null or max_students > 0);
  end if;
end
$$;

create index if not exists idx_university_email_domains_university
  on public.university_email_domains (university_id);

create index if not exists idx_university_managed_accounts_university_role
  on public.university_managed_accounts (university_id, role);

create index if not exists idx_university_managed_accounts_email_role
  on public.university_managed_accounts (lower(email), role);

create index if not exists idx_subjects_university_id
  on public.subjects (university_id);

create index if not exists idx_subjects_exam_type_status
  on public.subjects (exam_type, exam_type_status);

create index if not exists idx_subject_exam_change_requests_status_created
  on public.subject_exam_change_requests (status, created_at desc);

create index if not exists idx_main_exam_schedule_slots_subject_time
  on public.main_exam_schedule_slots (subject_id, start_time, end_time);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_university_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_university_id_fkey
      foreign key (university_id)
      references public.universities(id)
      on delete set null;
  end if;
end
$$;

create or replace function public.is_admin()
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
      and role = 'admin'
  );
$$;

comment on function public.is_admin() is 'Returns true when the current authenticated user is an admin.';

create or replace function public.is_email_in_range(
  p_email text,
  p_start text,
  p_end text
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when coalesce(trim(p_email), '') = '' then false
    else lower(trim(p_email)) >= lower(coalesce(nullif(trim(p_start), ''), trim(p_email)))
      and lower(trim(p_email)) <= lower(coalesce(nullif(trim(p_end), ''), trim(p_email)))
  end;
$$;

comment on function public.is_email_in_range(text, text, text) is 'Checks whether an email falls inside an inclusive lexical email range.';

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
    select false, 'Email is required.', null::uuid, null::text, null::text, null::text, null::text, null::text, null::text;
    return;
  end if;

  if normalized_role = '' then
    return query
    select false, 'Role is required.', null::uuid, null::text, null::text, null::text, null::text, null::text, null::text;
    return;
  end if;

  if normalized_role = 'recruiter' then
    return query
    select true, null::text, null::uuid, null::text, null::text, null::text, null::text, null::text, null::text;
    return;
  end if;

  if normalized_role not in ('student', 'teacher', 'admin') then
    return query
    select false, 'This portal role is not supported for signup.', null::uuid, null::text, null::text, null::text, null::text, null::text, null::text;
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
        when normalized_role = 'admin' then 'This admin email has not been provisioned in the university portal yet.'
        when normalized_role = 'teacher' then 'This teacher email has not been provisioned in the university portal yet.'
        else 'This student email has not been provisioned in the university portal yet.'
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

comment on function public.get_signup_authorization(text, text) is 'Securely validates whether a signup email and role are provisioned for university access.';

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

  if current_profile.role not in ('student', 'teacher', 'admin') then
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
    university_id = managed_record.university_id,
    university_member_role = case
      when current_profile.role = 'admin' then 'admin'
      else managed_record.role
    end,
    roll_number = managed_record.roll_number,
    semester_label = managed_record.semester_label,
    department_label = managed_record.department_label
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

comment on function public.link_managed_account_to_current_profile() is 'Syncs the authenticated profile with its provisioned university account record.';

alter table public.universities enable row level security;
alter table public.university_email_domains enable row level security;
alter table public.university_managed_accounts enable row level security;
alter table public.subject_exam_change_requests enable row level security;
alter table public.main_exam_schedule_slots enable row level security;

drop policy if exists "Authenticated users can read universities" on public.universities;
create policy "Authenticated users can read universities"
  on public.universities for select to authenticated
  using (true);

drop policy if exists "Admins can insert universities" on public.universities;
create policy "Admins can insert universities"
  on public.universities for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update universities" on public.universities;
create policy "Admins can update universities"
  on public.universities for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete universities" on public.universities;
create policy "Admins can delete universities"
  on public.universities for delete to authenticated
  using (public.is_admin());

drop policy if exists "Anyone can read university domains" on public.university_email_domains;
create policy "Anyone can read university domains"
  on public.university_email_domains for select to anon, authenticated
  using (true);

drop policy if exists "Admins can insert university domains" on public.university_email_domains;
create policy "Admins can insert university domains"
  on public.university_email_domains for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update university domains" on public.university_email_domains;
create policy "Admins can update university domains"
  on public.university_email_domains for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete university domains" on public.university_email_domains;
create policy "Admins can delete university domains"
  on public.university_email_domains for delete to authenticated
  using (public.is_admin());

drop policy if exists "Admins can read university accounts" on public.university_managed_accounts;
create policy "Admins can read university accounts"
  on public.university_managed_accounts for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can insert university accounts" on public.university_managed_accounts;
create policy "Admins can insert university accounts"
  on public.university_managed_accounts for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update university accounts" on public.university_managed_accounts;
create policy "Admins can update university accounts"
  on public.university_managed_accounts for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete university accounts" on public.university_managed_accounts;
create policy "Admins can delete university accounts"
  on public.university_managed_accounts for delete to authenticated
  using (public.is_admin());

drop policy if exists "Teachers can read own subject exam change requests" on public.subject_exam_change_requests;
create policy "Teachers can read own subject exam change requests"
  on public.subject_exam_change_requests for select to authenticated
  using (teacher_id = auth.uid());

drop policy if exists "Teachers can create own subject exam change requests" on public.subject_exam_change_requests;
create policy "Teachers can create own subject exam change requests"
  on public.subject_exam_change_requests for insert to authenticated
  with check (teacher_id = auth.uid());

drop policy if exists "Teachers can update own pending exam change requests" on public.subject_exam_change_requests;
create policy "Teachers can update own pending exam change requests"
  on public.subject_exam_change_requests for update to authenticated
  using (teacher_id = auth.uid() and status = 'pending')
  with check (teacher_id = auth.uid());

drop policy if exists "Admins can read subject exam change requests" on public.subject_exam_change_requests;
create policy "Admins can read subject exam change requests"
  on public.subject_exam_change_requests for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can insert subject exam change requests" on public.subject_exam_change_requests;
create policy "Admins can insert subject exam change requests"
  on public.subject_exam_change_requests for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update subject exam change requests" on public.subject_exam_change_requests;
create policy "Admins can update subject exam change requests"
  on public.subject_exam_change_requests for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete subject exam change requests" on public.subject_exam_change_requests;
create policy "Admins can delete subject exam change requests"
  on public.subject_exam_change_requests for delete to authenticated
  using (public.is_admin());

drop policy if exists "Users can read relevant main exam schedule slots" on public.main_exam_schedule_slots;
create policy "Users can read relevant main exam schedule slots"
  on public.main_exam_schedule_slots for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.subjects
      where subjects.id = main_exam_schedule_slots.subject_id
        and subjects.created_by = auth.uid()
    )
    or (
      is_active = true
      and public.is_email_in_range(auth.jwt() ->> 'email', allowed_email_start, allowed_email_end)
    )
  );

drop policy if exists "Admins can insert main exam schedule slots" on public.main_exam_schedule_slots;
create policy "Admins can insert main exam schedule slots"
  on public.main_exam_schedule_slots for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update main exam schedule slots" on public.main_exam_schedule_slots;
create policy "Admins can update main exam schedule slots"
  on public.main_exam_schedule_slots for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete main exam schedule slots" on public.main_exam_schedule_slots;
create policy "Admins can delete main exam schedule slots"
  on public.main_exam_schedule_slots for delete to authenticated
  using (public.is_admin());

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can read all submissions" on public.submissions;
create policy "Admins can read all submissions"
  on public.submissions for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can read all subjects" on public.subjects;
create policy "Admins can read all subjects"
  on public.subjects for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can insert all subjects" on public.subjects;
create policy "Admins can insert all subjects"
  on public.subjects for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update all subjects" on public.subjects;
create policy "Admins can update all subjects"
  on public.subjects for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete all subjects" on public.subjects;
create policy "Admins can delete all subjects"
  on public.subjects for delete to authenticated
  using (public.is_admin());

drop policy if exists "Admins can read all departments" on public.departments;
create policy "Admins can read all departments"
  on public.departments for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can insert all departments" on public.departments;
create policy "Admins can insert all departments"
  on public.departments for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update all departments" on public.departments;
create policy "Admins can update all departments"
  on public.departments for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete all departments" on public.departments;
create policy "Admins can delete all departments"
  on public.departments for delete to authenticated
  using (public.is_admin());

drop policy if exists "Admins can read all questions" on public.questions;
create policy "Admins can read all questions"
  on public.questions for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can insert all questions" on public.questions;
create policy "Admins can insert all questions"
  on public.questions for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update all questions" on public.questions;
create policy "Admins can update all questions"
  on public.questions for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete all questions" on public.questions;
create policy "Admins can delete all questions"
  on public.questions for delete to authenticated
  using (public.is_admin());

drop policy if exists "Admins can read all enrollments" on public.enrollments;
create policy "Admins can read all enrollments"
  on public.enrollments for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can read all teacher exam control rows" on public.teacher_exam_control;
create policy "Admins can read all teacher exam control rows"
  on public.teacher_exam_control for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can insert all teacher exam control rows" on public.teacher_exam_control;
create policy "Admins can insert all teacher exam control rows"
  on public.teacher_exam_control for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update all teacher exam control rows" on public.teacher_exam_control;
create policy "Admins can update all teacher exam control rows"
  on public.teacher_exam_control for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete all teacher exam control rows" on public.teacher_exam_control;
create policy "Admins can delete all teacher exam control rows"
  on public.teacher_exam_control for delete to authenticated
  using (public.is_admin());

drop policy if exists "Admins can read all student notifications" on public.student_notifications;
create policy "Admins can read all student notifications"
  on public.student_notifications for select to authenticated
  using (public.is_admin());

drop policy if exists "Admins can insert student notifications" on public.student_notifications;
create policy "Admins can insert student notifications"
  on public.student_notifications for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update student notifications" on public.student_notifications;
create policy "Admins can update student notifications"
  on public.student_notifications for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete student notifications" on public.student_notifications;
create policy "Admins can delete student notifications"
  on public.student_notifications for delete to authenticated
  using (public.is_admin());
