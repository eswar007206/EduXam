-- Teacher can set exam duration (in minutes) when starting an exam (1–300).
ALTER TABLE public.teacher_exam_control
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 90;

-- Add check only if it doesn't exist (safe to re-run migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'teacher_exam_control_duration_range'
    AND conrelid = 'public.teacher_exam_control'::regclass
  ) THEN
    ALTER TABLE public.teacher_exam_control
      ADD CONSTRAINT teacher_exam_control_duration_range
      CHECK (duration_minutes >= 1 AND duration_minutes <= 300);
  END IF;
END $$;

COMMENT ON COLUMN public.teacher_exam_control.duration_minutes IS 'Exam duration in minutes when teacher starts the exam (1–300).';
