-- Hide teacher from DB: when true, teacher does not appear in student list and their subjects are excluded.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teacher_hidden boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.teacher_hidden IS 'When true (and role=teacher), teacher is hidden from students: excluded from teacher list and their subjects are not shown.';
