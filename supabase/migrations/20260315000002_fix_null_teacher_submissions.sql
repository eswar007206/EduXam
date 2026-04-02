-- Allow teachers to delete submissions that have NULL teacher_id but belong to their subjects.
-- This handles a legacy bug where some submissions were stored with teacher_id = NULL.

CREATE POLICY "Teachers can delete null-teacher submissions for their subjects"
  ON submissions FOR DELETE TO authenticated
  USING (
    teacher_id IS NULL
    AND subject_id IN (SELECT id::text FROM subjects WHERE created_by = auth.uid())
  );
