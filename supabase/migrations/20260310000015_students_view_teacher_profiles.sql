-- Allow any authenticated user to view teacher profiles.
-- This is needed for the Find Teachers page so students can discover and enroll with teachers.
CREATE POLICY "Anyone can view teacher profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (role = 'teacher');
