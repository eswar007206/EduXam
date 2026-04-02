import { supabase } from "@/lib/supabase";

/**
 * Check if the teacher has granted this student permission to re-attempt the exam for this subject.
 */
export async function hasRetakePermission(
  teacherId: string,
  studentId: string,
  subjectIdUuid: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("exam_retake_permissions")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .eq("subject_id", subjectIdUuid)
    .limit(1);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/**
 * Grant a student permission to re-attempt the exam for this subject (teacher only).
 */
export async function grantRetakePermission(
  teacherId: string,
  studentId: string,
  subjectIdUuid: string
): Promise<void> {
  const { error } = await supabase.from("exam_retake_permissions").upsert(
    {
      teacher_id: teacherId,
      student_id: studentId,
      subject_id: subjectIdUuid,
    },
    { onConflict: "teacher_id,student_id,subject_id" }
  );
  if (error) throw error;
}

/**
 * Revoke re-attempt permission (teacher only).
 */
export async function revokeRetakePermission(
  teacherId: string,
  studentId: string,
  subjectIdUuid: string
): Promise<void> {
  const { error } = await supabase
    .from("exam_retake_permissions")
    .delete()
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .eq("subject_id", subjectIdUuid);
  if (error) throw error;
}

/**
 * Grant retake permission to multiple students at once (for Force Restart).
 */
export async function bulkGrantRetakePermission(
  teacherId: string,
  studentIds: string[],
  subjectIdUuid: string
): Promise<void> {
  if (studentIds.length === 0) return;

  const rows = studentIds.map((studentId) => ({
    teacher_id: teacherId,
    student_id: studentId,
    subject_id: subjectIdUuid,
  }));

  const { error } = await supabase
    .from("exam_retake_permissions")
    .upsert(rows, { onConflict: "teacher_id,student_id,subject_id" });

  if (error) throw error;
}

/** Key for set: "student_id:subject_id" */
export function retakeKey(studentId: string, subjectId: string): string {
  return `${studentId}:${subjectId}`;
}

/**
 * Get all retake permissions for a teacher (for UI: show which students can re-attempt which subject).
 */
export async function getRetakePermissionsForTeacher(
  teacherId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("exam_retake_permissions")
    .select("student_id, subject_id")
    .eq("teacher_id", teacherId);

  if (error) throw error;
  const set = new Set<string>();
  for (const row of data ?? []) {
    set.add(retakeKey((row as { student_id: string; subject_id: string }).student_id, (row as { student_id: string; subject_id: string }).subject_id));
  }
  return set;
}
