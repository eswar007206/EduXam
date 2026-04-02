-- Enable RLS on new tables
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiter_shortlists ENABLE ROW LEVEL SECURITY;

-- ─── job_postings ───
CREATE POLICY "Recruiters can insert jobs"
  ON public.job_postings FOR INSERT TO authenticated
  WITH CHECK (
    recruiter_id = auth.uid()
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'recruiter'
  );

CREATE POLICY "Recruiters can view own jobs"
  ON public.job_postings FOR SELECT TO authenticated
  USING (recruiter_id = auth.uid());

CREATE POLICY "Anyone can view active jobs"
  ON public.job_postings FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Recruiters can update own jobs"
  ON public.job_postings FOR UPDATE TO authenticated
  USING (recruiter_id = auth.uid())
  WITH CHECK (recruiter_id = auth.uid());

CREATE POLICY "Recruiters can delete own jobs"
  ON public.job_postings FOR DELETE TO authenticated
  USING (recruiter_id = auth.uid());

-- ─── job_applications ───
CREATE POLICY "Students can manage own applications"
  ON public.job_applications FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Recruiters can view applications for their jobs"
  ON public.job_applications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_postings
      WHERE job_postings.id = job_applications.job_id
        AND job_postings.recruiter_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can update applications for their jobs"
  ON public.job_applications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_postings
      WHERE job_postings.id = job_applications.job_id
        AND job_postings.recruiter_id = auth.uid()
    )
  );

-- ─── recruiter_shortlists ───
CREATE POLICY "Recruiters can manage own shortlists"
  ON public.recruiter_shortlists FOR ALL TO authenticated
  USING (recruiter_id = auth.uid())
  WITH CHECK (recruiter_id = auth.uid());

-- ─── Profile visibility & cross-role access ───

-- Add visibility column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_visibility text NOT NULL DEFAULT 'applied_only'
  CHECK (profile_visibility IN ('teachers_only', 'recruiters_only', 'both', 'applied_only'));

-- Users can always read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Teachers can view student profiles (if visibility allows)
CREATE POLICY "Teachers can view student profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    role = 'student'
    AND profile_visibility IN ('teachers_only', 'both')
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'teacher'
  );

-- Recruiters can view student profiles (if visibility allows)
CREATE POLICY "Recruiters can view student profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    role = 'student'
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'recruiter'
    AND (
      profile_visibility IN ('recruiters_only', 'both')
      OR (
        profile_visibility = 'applied_only'
        AND EXISTS (
          SELECT 1 FROM public.job_applications ja
          JOIN public.job_postings jp ON jp.id = ja.job_id
          WHERE ja.student_id = profiles.id
            AND jp.recruiter_id = auth.uid()
        )
      )
    )
  );

-- Teachers and recruiters can view test results
CREATE POLICY "Teachers and recruiters can view test results"
  ON public.test_results FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'recruiter')
  );

-- Teachers and recruiters can view submissions
CREATE POLICY "Teachers and recruiters can view submissions"
  ON public.submissions FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('teacher', 'recruiter')
  );
