-- Create the exam-results storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exam-results',
  'exam-results',
  false,
  10485760, -- 10 MB
  ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Allow authenticated users to upload their own files
CREATE POLICY "Students can upload their own results"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'exam-results'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: Allow authenticated users to view/download their own files
CREATE POLICY "Students can view their own results"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'exam-results'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: Allow authenticated users to delete their own files
CREATE POLICY "Students can delete their own results"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'exam-results'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: Allow teachers to view files of their students
-- (This requires joining with enrollments - optional, can be added later)
