-- Hide EduXam teacher from Find Teachers and from subjects (student-facing).
-- EduXam profile (eduxam.in@gmail.com) will not appear in the teacher list.
UPDATE public.profiles
SET teacher_hidden = true
WHERE role = 'teacher'
  AND (email = 'eduxam.in@gmail.com' OR LOWER(username) = 'eduxam');
