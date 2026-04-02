import { supabase } from "@/lib/supabase";
import type { TeacherVisibilityRow } from "@/lib/database.types";

/**
 * Set visibility for a teacher's subject. Used by admin.
 * If no row exists, inserts one; otherwise updates.
 */
export async function setTeacherSubjectVisibility(
  teacherId: string,
  subjectId: string,
  isVisible: boolean
): Promise<void> {
  const { error } = await supabase.from("teacher_visibility").upsert(
    {
      teacher_id: teacherId,
      subject_id: subjectId,
      is_visible: isVisible,
    },
    { onConflict: "teacher_id,subject_id" }
  );
  if (error) throw error;
}

/**
 * Get visibility for a teacher: map of subject_id -> is_visible.
 * Missing subject means visible (default).
 */
export async function getTeacherVisibilityMap(
  teacherId: string
): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from("teacher_visibility")
    .select("subject_id, is_visible")
    .eq("teacher_id", teacherId);
  if (error) throw error;
  const map: Record<string, boolean> = {};
  for (const row of (data ?? []) as Pick<TeacherVisibilityRow, "subject_id" | "is_visible">[]) {
    map[row.subject_id] = row.is_visible;
  }
  return map;
}

/**
 * Check if a teacher is visible to students.
 * A teacher is visible if they have at least one subject with is_visible = true (or no visibility row).
 */
export async function isTeacherVisible(teacherId: string): Promise<boolean> {
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id")
    .eq("created_by", teacherId);
  if (!subjects || subjects.length === 0) return false;

  const subjectIds = subjects.map((s: { id: string }) => s.id);
  const { data: visRows } = await supabase
    .from("teacher_visibility")
    .select("subject_id, is_visible")
    .eq("teacher_id", teacherId)
    .in("subject_id", subjectIds);

  const bySubject = new Map<string, boolean>();
  for (const row of (visRows ?? []) as { subject_id: string; is_visible: boolean }[]) {
    bySubject.set(row.subject_id, row.is_visible);
  }
  for (const sid of subjectIds) {
    if (bySubject.get(sid) !== false) return true;
  }
  return false;
}
