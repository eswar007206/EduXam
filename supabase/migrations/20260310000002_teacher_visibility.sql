-- Teacher visibility: hide teachers/subjects from student list and exam practice.
-- When is_visible = false, teacher (and their subjects) are hidden from students.

CREATE TABLE IF NOT EXISTS teacher_visibility (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id uuid NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  is_visible boolean NOT NULL DEFAULT true,
  UNIQUE(teacher_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_visibility_teacher
  ON teacher_visibility(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_visibility_subject
  ON teacher_visibility(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_visibility_visible
  ON teacher_visibility(teacher_id, is_visible);

COMMENT ON TABLE teacher_visibility IS 'When is_visible = false, teacher/subject are hidden from student UI.';

-- RLS
ALTER TABLE teacher_visibility ENABLE ROW LEVEL SECURITY;

-- Teachers can read/update their own visibility rows
CREATE POLICY "Teachers can manage own visibility"
  ON teacher_visibility
  FOR ALL
  TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- Students can read visibility (to filter visible teachers only)
CREATE POLICY "Anyone authenticated can read visibility"
  ON teacher_visibility
  FOR SELECT
  TO authenticated
  USING (true);
