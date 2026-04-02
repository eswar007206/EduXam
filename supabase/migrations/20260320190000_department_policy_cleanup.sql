-- remove legacy department policies so only university admins can manage departments.
-- affected objects: public.departments

drop policy if exists "Departments are viewable by authenticated users" on public.departments;
drop policy if exists "Teachers can create departments" on public.departments;
drop policy if exists "Teachers can update own departments" on public.departments;
