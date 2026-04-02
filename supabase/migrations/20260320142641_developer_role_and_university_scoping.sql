-- split platform onboarding from university administration.
-- affected objects: public.profiles, public.departments, public.universities,
-- public.university_email_domains, public.university_managed_accounts,
-- public.subject_exam_change_requests, public.main_exam_schedule_slots,
-- public.subjects, public.questions, public.submissions.

-- expand the profile role constraint so platform staff can use a dedicated developer role.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'teacher', 'recruiter', 'admin', 'developer'));

-- departments are now university-owned and created by university admins.
alter table public.departments
  add column if not exists university_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'departments_university_id_fkey'
      and conrelid = 'public.departments'::regclass
  ) then
    alter table public.departments
      add constraint departments_university_id_fkey
      foreign key (university_id)
      references public.universities(id)
      on delete set null;
  end if;
end
$$;

create index if not exists idx_departments_university_id
  on public.departments (university_id);

with subject_universities as (
  select
    department_id,
    min(university_id::text)::uuid as university_id
  from public.subjects
  where department_id is not null
    and university_id is not null
  group by department_id
)
update public.departments as departments
set university_id = subject_universities.university_id
from subject_universities
where departments.id = subject_universities.department_id
  and departments.university_id is null;

update public.departments as departments
set university_id = profiles.university_id
from public.profiles as profiles
where departments.university_id is null
  and departments.created_by = profiles.id
  and profiles.university_id is not null;

create or replace function public.is_developer()
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
      and role = 'developer'
  );
$$;

comment on function public.is_developer() is 'returns true when the current authenticated user is a platform developer.';

create or replace function public.current_university_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select university_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

comment on function public.current_university_id() is 'returns the university_id linked to the current authenticated profile.';

alter table public.departments enable row level security;

-- replace the old platform-wide university policies with developer + university-admin scoped access.
drop policy if exists "Authenticated users can read universities" on public.universities;
drop policy if exists "Admins can insert universities" on public.universities;
drop policy if exists "Admins can update universities" on public.universities;
drop policy if exists "Admins can delete universities" on public.universities;

create policy "developers can read all universities"
  on public.universities for select to authenticated
  using ((select public.is_developer()));

create policy "university admins can read own university"
  on public.universities for select to authenticated
  using (
    (select public.is_admin())
    and id = (select public.current_university_id())
  );

create policy "developers can insert universities"
  on public.universities for insert to authenticated
  with check ((select public.is_developer()));

create policy "developers can update universities"
  on public.universities for update to authenticated
  using ((select public.is_developer()))
  with check ((select public.is_developer()));

create policy "university admins can update own university"
  on public.universities for update to authenticated
  using (
    (select public.is_admin())
    and id = (select public.current_university_id())
  )
  with check (
    (select public.is_admin())
    and id = (select public.current_university_id())
  );

create policy "developers can delete universities"
  on public.universities for delete to authenticated
  using ((select public.is_developer()));

-- email domains stay publicly readable for signup matching, but only university admins can maintain them.
drop policy if exists "Admins can insert university domains" on public.university_email_domains;
drop policy if exists "Admins can update university domains" on public.university_email_domains;
drop policy if exists "Admins can delete university domains" on public.university_email_domains;

create policy "university admins can insert own university domains"
  on public.university_email_domains for insert to authenticated
  with check (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

create policy "university admins can update own university domains"
  on public.university_email_domains for update to authenticated
  using (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  )
  with check (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

create policy "university admins can delete own university domains"
  on public.university_email_domains for delete to authenticated
  using (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

-- developers should only touch bootstrap admin identities, while university admins manage their own teacher/recruiter accounts.
drop policy if exists "Admins can read university accounts" on public.university_managed_accounts;
drop policy if exists "Admins can insert university accounts" on public.university_managed_accounts;
drop policy if exists "Admins can update university accounts" on public.university_managed_accounts;
drop policy if exists "Admins can delete university accounts" on public.university_managed_accounts;

create policy "developers can read admin managed accounts"
  on public.university_managed_accounts for select to authenticated
  using (
    (select public.is_developer())
    and role = 'admin'
  );

create policy "university admins can read own managed accounts"
  on public.university_managed_accounts for select to authenticated
  using (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

create policy "developers can insert admin managed accounts"
  on public.university_managed_accounts for insert to authenticated
  with check (
    (select public.is_developer())
    and role = 'admin'
  );

create policy "university admins can insert own managed accounts"
  on public.university_managed_accounts for insert to authenticated
  with check (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

create policy "developers can update admin managed accounts"
  on public.university_managed_accounts for update to authenticated
  using (
    (select public.is_developer())
    and role = 'admin'
  )
  with check (
    (select public.is_developer())
    and role = 'admin'
  );

create policy "university admins can update own managed accounts"
  on public.university_managed_accounts for update to authenticated
  using (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  )
  with check (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

create policy "developers can delete admin managed accounts"
  on public.university_managed_accounts for delete to authenticated
  using (
    (select public.is_developer())
    and role = 'admin'
  );

create policy "university admins can delete own managed accounts"
  on public.university_managed_accounts for delete to authenticated
  using (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

drop policy if exists "Admins can read subject exam change requests" on public.subject_exam_change_requests;
drop policy if exists "Admins can insert subject exam change requests" on public.subject_exam_change_requests;
drop policy if exists "Admins can update subject exam change requests" on public.subject_exam_change_requests;
drop policy if exists "Admins can delete subject exam change requests" on public.subject_exam_change_requests;

create policy "university admins can read own exam change requests"
  on public.subject_exam_change_requests for select to authenticated
  using (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

create policy "university admins can update own exam change requests"
  on public.subject_exam_change_requests for update to authenticated
  using (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  )
  with check (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

create policy "university admins can delete own exam change requests"
  on public.subject_exam_change_requests for delete to authenticated
  using (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

drop policy if exists "Users can read relevant main exam schedule slots" on public.main_exam_schedule_slots;
drop policy if exists "Admins can insert main exam schedule slots" on public.main_exam_schedule_slots;
drop policy if exists "Admins can update main exam schedule slots" on public.main_exam_schedule_slots;
drop policy if exists "Admins can delete main exam schedule slots" on public.main_exam_schedule_slots;

create policy "users can read relevant main exam schedule slots"
  on public.main_exam_schedule_slots for select to authenticated
  using (
    (
      (select public.is_admin())
      and university_id = (select public.current_university_id())
    )
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

create policy "university admins can insert own main exam schedule slots"
  on public.main_exam_schedule_slots for insert to authenticated
  with check (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

create policy "university admins can update own main exam schedule slots"
  on public.main_exam_schedule_slots for update to authenticated
  using (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  )
  with check (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

create policy "university admins can delete own main exam schedule slots"
  on public.main_exam_schedule_slots for delete to authenticated
  using (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;

create policy "university admins can read own university profiles"
  on public.profiles for select to authenticated
  using (
    (select public.is_admin())
    and (
      id = auth.uid()
      or university_id = (select public.current_university_id())
    )
  );

create policy "university admins can update own university profiles"
  on public.profiles for update to authenticated
  using (
    (select public.is_admin())
    and (
      id = auth.uid()
      or university_id = (select public.current_university_id())
    )
  )
  with check (
    (select public.is_admin())
    and (
      id = auth.uid()
      or university_id = (select public.current_university_id())
    )
  );

drop policy if exists "Admins can read all submissions" on public.submissions;

create policy "university admins can read own university submissions"
  on public.submissions for select to authenticated
  using (
    (select public.is_admin())
    and exists (
      select 1
      from public.subjects
      where (
        subjects.id::text = submissions.subject_id
        or subjects.slug = submissions.subject_id
      )
        and subjects.university_id = (select public.current_university_id())
    )
  );

drop policy if exists "Admins can read all subjects" on public.subjects;
drop policy if exists "Admins can insert all subjects" on public.subjects;
drop policy if exists "Admins can update all subjects" on public.subjects;
drop policy if exists "Admins can delete all subjects" on public.subjects;

create policy "university admins can read own subjects"
  on public.subjects for select to authenticated
  using (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

create policy "university admins can insert own subjects"
  on public.subjects for insert to authenticated
  with check (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

create policy "university admins can update own subjects"
  on public.subjects for update to authenticated
  using (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  )
  with check (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

create policy "university admins can delete own subjects"
  on public.subjects for delete to authenticated
  using (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

drop policy if exists "Admins can read all departments" on public.departments;
drop policy if exists "Admins can insert all departments" on public.departments;
drop policy if exists "Admins can update all departments" on public.departments;
drop policy if exists "Admins can delete all departments" on public.departments;

create policy "authenticated users can read own university departments"
  on public.departments for select to authenticated
  using (
    university_id = (select public.current_university_id())
  );

create policy "university admins can insert own departments"
  on public.departments for insert to authenticated
  with check (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

create policy "university admins can update own departments"
  on public.departments for update to authenticated
  using (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  )
  with check (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

create policy "university admins can delete own departments"
  on public.departments for delete to authenticated
  using (
    (select public.is_admin())
    and university_id = (select public.current_university_id())
  );

drop policy if exists "Admins can read all questions" on public.questions;
drop policy if exists "Admins can insert all questions" on public.questions;
drop policy if exists "Admins can update all questions" on public.questions;
drop policy if exists "Admins can delete all questions" on public.questions;

create policy "university admins can read own university questions"
  on public.questions for select to authenticated
  using (
    (select public.is_admin())
    and exists (
      select 1
      from public.subjects
      where subjects.id = questions.subject_id
        and subjects.university_id = (select public.current_university_id())
    )
  );

create policy "university admins can insert own university questions"
  on public.questions for insert to authenticated
  with check (
    (select public.is_admin())
    and exists (
      select 1
      from public.subjects
      where subjects.id = questions.subject_id
        and subjects.university_id = (select public.current_university_id())
    )
  );

create policy "university admins can update own university questions"
  on public.questions for update to authenticated
  using (
    (select public.is_admin())
    and exists (
      select 1
      from public.subjects
      where subjects.id = questions.subject_id
        and subjects.university_id = (select public.current_university_id())
    )
  )
  with check (
    (select public.is_admin())
    and exists (
      select 1
      from public.subjects
      where subjects.id = questions.subject_id
        and subjects.university_id = (select public.current_university_id())
    )
  );

create policy "university admins can delete own university questions"
  on public.questions for delete to authenticated
  using (
    (select public.is_admin())
    and exists (
      select 1
      from public.subjects
      where subjects.id = questions.subject_id
        and subjects.university_id = (select public.current_university_id())
    )
  );
