import { supabase } from "@/lib/supabase";
import type { ProfileRow, EnrollmentRow } from "@/lib/database.types";

export async function getTeachers(): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "teacher")
    .order("username");
  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}

export async function getStudentEnrollments(
  studentId: string
): Promise<(EnrollmentRow & { teacher_username?: string; teacher_email?: string })[]> {
  const { data, error } = await supabase
    .from("enrollments")
    .select("*, profiles!enrollments_teacher_id_fkey(username, email)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as (EnrollmentRow & { profiles?: { username: string; email: string } })[]).map((e) => ({
    ...e,
    teacher_username: e.profiles?.username,
    teacher_email: e.profiles?.email,
  }));
}

export async function enroll(
  studentId: string,
  teacherId: string
): Promise<void> {
  const { error } = await supabase
    .from("enrollments")
    .insert({ student_id: studentId, teacher_id: teacherId });
  if (error) throw error;
}

export async function unenroll(
  studentId: string,
  teacherId: string
): Promise<void> {
  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId);
  if (error) throw error;
}

export async function isEnrolled(
  studentId: string,
  teacherId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("teacher_id", teacherId);
  if (error) return false;
  return (count ?? 0) > 0;
}

export async function getTeacherSubjectCount(
  teacherId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("subjects")
    .select("*", { count: "exact", head: true })
    .eq("created_by", teacherId);
  if (error) return 0;
  return count ?? 0;
}
