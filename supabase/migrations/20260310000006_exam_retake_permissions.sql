-- Teacher can grant a student permission to re-attempt an exam for a subject (one row = allowed).

CREATE TABLE IF NOT EXISTS exam_retake_permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, student_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_retake_teacher ON exam_retake_permissions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_exam_retake_student ON exam_retake_permissions(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_retake_subject ON exam_retake_permissions(subject_id);

COMMENT ON TABLE exam_retake_permissions IS 'When present, student is allowed to re-attempt the exam for this subject (teacher-granted).';

ALTER TABLE exam_retake_permissions ENABLE ROW LEVEL SECURITY;

-- Teachers can manage (insert/delete/select) their own retake permissions
CREATE POLICY "Teachers can manage own retake permissions"
  ON exam_retake_permissions FOR ALL TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- Students can only read (to check if they have permission to re-attempt)
CREATE POLICY "Students can read own retake permissions"
  ON exam_retake_permissions FOR SELECT TO authenticated
  USING (auth.uid() = student_id);
