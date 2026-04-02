-- Enhanced profiles and job_postings for LinkedIn-level job section.

-- ─── Profile enhancements (resume fields) ───
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS education jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS experience jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS certifications jsonb DEFAULT '[]';

-- ─── Job posting enhancements ───
ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS salary_min integer,
  ADD COLUMN IF NOT EXISTS salary_max integer,
  ADD COLUMN IF NOT EXISTS salary_currency text DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS experience_level text DEFAULT 'entry'
    CHECK (experience_level IN ('entry', 'mid', 'senior', 'lead')),
  ADD COLUMN IF NOT EXISTS workplace_type text DEFAULT 'onsite'
    CHECK (workplace_type IN ('remote', 'hybrid', 'onsite')),
  ADD COLUMN IF NOT EXISTS application_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS responsibilities text,
  ADD COLUMN IF NOT EXISTS qualifications text,
  ADD COLUMN IF NOT EXISTS benefits text;
