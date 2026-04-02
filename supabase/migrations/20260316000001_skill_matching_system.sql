-- ============================================================
-- SKILL MATCHING SYSTEM: Add projects + subject_skills
-- ============================================================

-- Projects JSONB column on profiles (same pattern as experience/certifications/education)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS projects jsonb DEFAULT '[]'::jsonb;

-- Subject-to-skills mapping (so exams can contribute to skill points)
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS subject_skills text[] DEFAULT '{}';
