-- Teacher-controlled exam start
-- Students can only start an exam when the teacher has set exam_started = true for that subject.

CREATE TABLE IF NOT EXISTS teacher_exam_control (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id uuid NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  exam_started boolean NOT NULL DEFAULT false,
  start_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_exam_control_subject
  ON teacher_exam_control(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_exam_control_teacher
  ON teacher_exam_control(teacher_id);

COMMENT ON TABLE teacher_exam_control IS 'Controls whether students can start an exam for a subject; teacher must set exam_started = true.';

-- RLS
ALTER TABLE teacher_exam_control ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own rows
CREATE POLICY "Teachers can manage own exam control"
  ON teacher_exam_control
  FOR ALL
  TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- Students can read to check if exam has started (needed for StartExamModal)
CREATE POLICY "Students can read exam control for subjects"
  ON teacher_exam_control
  FOR SELECT
  TO authenticated
  USING (true);
