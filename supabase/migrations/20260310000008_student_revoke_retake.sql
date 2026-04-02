-- Allow students to delete (revoke) their own retake permission when they use it.
-- One "Allow re-attempt" = one extra attempt; after submit we revoke so they need teacher to grant again.

CREATE POLICY "Students can delete own retake permission"
  ON exam_retake_permissions FOR DELETE TO authenticated
  USING (auth.uid() = student_id);
