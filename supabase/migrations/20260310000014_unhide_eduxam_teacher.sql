-- Make all teachers visible on Find Teachers and Exam Practice pages.
UPDATE public.profiles
SET teacher_hidden = false
WHERE role = 'teacher';
