-- add support for prep exams, main exam metadata, and student notifications

alter table public.subjects
  add column if not exists exam_type text not null default 'main';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'subjects_exam_type_check'
      and conrelid = 'public.subjects'::regclass
  ) then
    alter table public.subjects
      add constraint subjects_exam_type_check
      check (exam_type in ('prep', 'main'));
  end if;
end
$$;

create index if not exists idx_subjects_exam_type
  on public.subjects (exam_type);

comment on column public.subjects.exam_type is 'Classifies a subject as either a prep exam or a main exam.';

alter table public.submissions
  add column if not exists exam_type text not null default 'main';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'submissions_exam_type_check'
      and conrelid = 'public.submissions'::regclass
  ) then
    alter table public.submissions
      add constraint submissions_exam_type_check
      check (exam_type in ('prep', 'main'));
  end if;
end
$$;

update public.submissions as sub
set exam_type = subj.exam_type
from public.subjects as subj
where sub.subject_id = subj.id::text
   or sub.subject_id = subj.slug;

create index if not exists idx_submissions_student_subject_exam_type
  on public.submissions (student_id, subject_id, exam_type);

comment on column public.submissions.exam_type is 'Snapshot of the exam type at the time of submission.';

alter table public.teacher_exam_control
  add column if not exists exam_title text,
  add column if not exists exam_description text,
  add column if not exists exam_instructions text;

comment on column public.teacher_exam_control.exam_title is 'Teacher-provided title for a main exam run.';
comment on column public.teacher_exam_control.exam_description is 'Short description shown to students before a main exam starts.';
comment on column public.teacher_exam_control.exam_instructions is 'Teacher-provided instructions shown to students before a main exam starts.';

create table if not exists public.student_notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_notifications_type_check'
      and conrelid = 'public.student_notifications'::regclass
  ) then
    alter table public.student_notifications
      add constraint student_notifications_type_check
      check (type in ('prep_exam_created', 'main_exam_started'));
  end if;
end
$$;

create index if not exists idx_student_notifications_student_created
  on public.student_notifications (student_id, created_at desc);

create index if not exists idx_student_notifications_student_unread
  on public.student_notifications (student_id, is_read);

comment on table public.student_notifications is 'Notifications delivered to students about teacher-created prep exams and started main exams.';

alter table public.student_notifications enable row level security;

drop policy if exists "Students can read own notifications" on public.student_notifications;
create policy "Students can read own notifications"
  on public.student_notifications for select to authenticated
  using (student_id = auth.uid());

drop policy if exists "Students can update own notifications" on public.student_notifications;
create policy "Students can update own notifications"
  on public.student_notifications for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

drop policy if exists "Teachers can create notifications for own students" on public.student_notifications;
create policy "Teachers can create notifications for own students"
  on public.student_notifications for insert to authenticated
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1
      from public.subjects
      where subjects.id = student_notifications.subject_id
        and subjects.created_by = auth.uid()
    )
    and exists (
      select 1
      from public.enrollments
      where enrollments.teacher_id = auth.uid()
        and enrollments.student_id = student_notifications.student_id
    )
  );
