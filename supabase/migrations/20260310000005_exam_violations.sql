-- Exam violations: student left fullscreen for 10+ seconds; 3 violations = complaint to teacher

CREATE TABLE IF NOT EXISTS exam_violations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_violations_teacher ON exam_violations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_exam_violations_student ON exam_violations(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_violations_created ON exam_violations(created_at DESC);

COMMENT ON TABLE exam_violations IS 'Record when a student left fullscreen for 10+ seconds during an exam; 3+ = complaint to teacher.';

ALTER TABLE exam_violations ENABLE ROW LEVEL SECURITY;

-- Students can insert their own violations (when countdown hits 0)
CREATE POLICY "Students can insert own violations"
  ON exam_violations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

-- Teachers can read violations for their students (teacher_id = self)
CREATE POLICY "Teachers can read own violations"
  ON exam_violations FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id);
