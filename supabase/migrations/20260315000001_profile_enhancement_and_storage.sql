-- ═══════════════════════════════════════════════════════════════
-- Migration: Profile Enhancement + Storage Buckets
-- Adds comprehensive personal/academic fields to profiles
-- Creates avatars (public) and certificates (private) storage buckets
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. New profile columns ─────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS date_of_birth date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS gender text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hometown text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS current_city text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pincode text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nationality text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS about_me text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS college_name text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS college_year text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS degree_pursuing text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS branch text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cgpa numeric(4,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tenth_percentage numeric(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS twelfth_percentage numeric(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';

-- CHECK constraints (safe: only added if column exists and no constraint yet)
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_gender_check
    CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_college_year_check
    CHECK (college_year IN ('1st', '2nd', '3rd', '4th', '5th', 'alumni'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_cgpa_check
    CHECK (cgpa >= 0 AND cgpa <= 10);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_tenth_percentage_check
    CHECK (tenth_percentage >= 0 AND tenth_percentage <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_twelfth_percentage_check
    CHECK (twelfth_percentage >= 0 AND twelfth_percentage <= 100);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- GIN index for skill-based recruiter queries
CREATE INDEX IF NOT EXISTS idx_profiles_role_skills
  ON public.profiles USING gin(skills) WHERE role = 'student';

-- ─── 2. Storage bucket: avatars (public) ────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Public avatar read access"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Users upload own avatar
CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users update own avatar
CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users delete own avatar
CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── 3. Storage bucket: certificates (private) ─────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates', 'certificates', false,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Students upload own certificates
CREATE POLICY "Students upload own certificates"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'certificates'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can read certificates
CREATE POLICY "Authenticated users read certificates"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'certificates');

-- Students delete own certificates
CREATE POLICY "Students delete own certificates"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'certificates'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
