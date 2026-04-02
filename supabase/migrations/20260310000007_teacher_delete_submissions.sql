-- Allow teachers to delete their own submissions (for "Clear all reports")

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can delete own submissions"
  ON submissions FOR DELETE TO authenticated
  USING (teacher_id = auth.uid());
