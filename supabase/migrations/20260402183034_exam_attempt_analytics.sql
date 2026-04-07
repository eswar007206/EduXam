-- create a dedicated analytics store for exam attempts.
-- affected objects: public.submission_analytics, public.touch_submission_analytics_updated_at()

create table if not exists public.submission_analytics (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  subject_id text not null,
  subject_name text not null,
  exam_type text not null default 'main' check (exam_type in ('prep', 'main')),
  analytics_version integer not null default 1,
  exam_started_at timestamptz,
  exam_submitted_at timestamptz not null default timezone('utc', now()),
  total_duration_seconds integer not null default 0 check (total_duration_seconds >= 0),
  active_duration_seconds integer not null default 0 check (active_duration_seconds >= 0),
  idle_duration_seconds integer not null default 0 check (idle_duration_seconds >= 0),
  focus_loss_count integer not null default 0 check (focus_loss_count >= 0),
  fullscreen_exit_count integer not null default 0 check (fullscreen_exit_count >= 0),
  navigator_jump_count integer not null default 0 check (navigator_jump_count >= 0),
  answer_change_count integer not null default 0 check (answer_change_count >= 0),
  review_toggle_count integer not null default 0 check (review_toggle_count >= 0),
  copy_event_count integer not null default 0 check (copy_event_count >= 0),
  paste_event_count integer not null default 0 check (paste_event_count >= 0),
  total_characters_typed integer not null default 0 check (total_characters_typed >= 0),
  total_words_typed integer not null default 0 check (total_words_typed >= 0),
  total_backspace_count integer not null default 0 check (total_backspace_count >= 0),
  typing_speed_wpm numeric(8, 2),
  typing_speed_cpm numeric(8, 2),
  peak_wpm numeric(8, 2),
  question_analytics jsonb not null default '[]'::jsonb,
  section_analytics jsonb not null default '[]'::jsonb,
  timeline_events jsonb not null default '[]'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.submission_analytics is 'Stores per-attempt behavioral, timing, typing, and navigation analytics for a submission.';
comment on column public.submission_analytics.question_analytics is 'Per-question dwell time, visits, answer changes, typing, and final-state analytics.';
comment on column public.submission_analytics.section_analytics is 'Per-section timing, completion, and pacing analytics.';
comment on column public.submission_analytics.timeline_events is 'Compact event stream used to reconstruct attempt pacing and navigation.';
comment on column public.submission_analytics.summary is 'Derived snapshot values used for fast cards and analytics rollups.';

create index if not exists idx_submission_analytics_student_created
  on public.submission_analytics (student_id, created_at desc);

create index if not exists idx_submission_analytics_subject_created
  on public.submission_analytics (subject_id, created_at desc);

create index if not exists idx_submission_analytics_exam_type
  on public.submission_analytics (exam_type);

create or replace function public.touch_submission_analytics_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

comment on function public.touch_submission_analytics_updated_at() is 'Keeps submission_analytics.updated_at fresh on every update.';

drop trigger if exists trg_submission_analytics_updated_at on public.submission_analytics;

create trigger trg_submission_analytics_updated_at
before update on public.submission_analytics
for each row
execute function public.touch_submission_analytics_updated_at();

alter table public.submission_analytics enable row level security;

-- students can create analytics rows only for their own submissions.
drop policy if exists "students can insert own submission analytics" on public.submission_analytics;
create policy "students can insert own submission analytics"
  on public.submission_analytics for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1
      from public.submissions
      where submissions.id = submission_analytics.submission_id
        and submissions.student_id = auth.uid()
    )
  );

-- students can read analytics for their own submissions.
drop policy if exists "students can read own submission analytics" on public.submission_analytics;
create policy "students can read own submission analytics"
  on public.submission_analytics for select to authenticated
  using (
    student_id = auth.uid()
    and exists (
      select 1
      from public.submissions
      where submissions.id = submission_analytics.submission_id
        and submissions.student_id = auth.uid()
    )
  );

-- students can refresh or enrich their own analytics rows after evaluation completes.
drop policy if exists "students can update own submission analytics" on public.submission_analytics;
create policy "students can update own submission analytics"
  on public.submission_analytics for update to authenticated
  using (
    student_id = auth.uid()
    and exists (
      select 1
      from public.submissions
      where submissions.id = submission_analytics.submission_id
        and submissions.student_id = auth.uid()
    )
  )
  with check (
    student_id = auth.uid()
    and exists (
      select 1
      from public.submissions
      where submissions.id = submission_analytics.submission_id
        and submissions.student_id = auth.uid()
    )
  );

-- teachers can inspect analytics for submissions routed to them.
drop policy if exists "teachers can read own submission analytics" on public.submission_analytics;
create policy "teachers can read own submission analytics"
  on public.submission_analytics for select to authenticated
  using (
    exists (
      select 1
      from public.submissions
      where submissions.id = submission_analytics.submission_id
        and submissions.teacher_id = auth.uid()
    )
  );

-- university admins can inspect analytics scoped to subjects inside their own university.
drop policy if exists "university admins can read own university submission analytics" on public.submission_analytics;
create policy "university admins can read own university submission analytics"
  on public.submission_analytics for select to authenticated
  using (
    (select public.is_admin())
    and exists (
      select 1
      from public.submissions
      join public.subjects
        on (
          subjects.id::text = submissions.subject_id
          or subjects.slug = submissions.subject_id
        )
      where submissions.id = submission_analytics.submission_id
        and subjects.university_id = (select public.current_university_id())
    )
  );
