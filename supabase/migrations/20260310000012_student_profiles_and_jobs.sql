-- Extend profiles for student digital profile and recruiter company info
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS linkedin_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS github_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS portfolio_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bio text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS company_name text DEFAULT NULL;

-- Job postings created by recruiters
CREATE TABLE IF NOT EXISTS public.job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  company_name text NOT NULL,
  required_skills text[] NOT NULL DEFAULT '{}',
  location text DEFAULT NULL,
  job_type text NOT NULL DEFAULT 'full-time' CHECK (job_type IN ('full-time', 'part-time', 'internship', 'contract')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Student applications to jobs
CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'shortlisted', 'rejected', 'withdrawn')),
  match_score numeric(5,2) DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, student_id)
);

-- Recruiter shortlists (recruiter-initiated, separate from applications)
CREATE TABLE IF NOT EXISTS public.recruiter_shortlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, student_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_postings_recruiter ON public.job_postings(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_active ON public.job_postings(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_job_applications_job ON public.job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_student ON public.job_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_shortlists_job ON public.recruiter_shortlists(job_id);
CREATE INDEX IF NOT EXISTS idx_test_results_student_subject ON public.test_results(student_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_created ON public.submissions(student_id, created_at);
