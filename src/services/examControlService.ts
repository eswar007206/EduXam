import { supabase } from "@/lib/supabase";
import type { TeacherExamControlRow } from "@/lib/database.types";
import { deleteSubmissionsForSubject } from "@/services/submissionService";
import { bulkGrantRetakePermission } from "@/services/examRetakeService";

export interface ExamRunDetails {
  title?: string | null;
  description?: string | null;
  instructions?: string | null;
}

export interface ExamControlInfo {
  examStarted: boolean;
  startTime: string | null;
  durationMinutes: number;
  examTitle: string | null;
  examDescription: string | null;
  examInstructions: string | null;
}

/**
 * Get exam control for a subject by its slug (used by students on exam practice page).
 * Returns whether the teacher has started the exam and duration_minutes (default 90).
 */
export async function getExamControlBySubjectSlug(
  subjectSlug: string
): Promise<ExamControlInfo | null> {
  const { data: subject, error: subError } = await supabase
    .from("subjects")
    .select("id")
    .eq("slug", subjectSlug)
    .single();

  if (subError || !subject) return null;

  const subjectId = (subject as { id: string }).id;
  const res = await getExamControlBySubjectId(subjectId);
  return res;
}

/**
 * Get exam control for a subject by UUID (used when we already have subject id).
 */
export async function getExamControlBySubjectId(
  subjectId: string
): Promise<ExamControlInfo | null> {
  const { data: control, error } = await supabase
    .from("teacher_exam_control")
    .select("exam_started, start_time, duration_minutes, exam_title, exam_description, exam_instructions")
    .eq("subject_id", subjectId)
    .maybeSingle();

  if (error || !control) {
    return {
      examStarted: false,
      startTime: null,
      durationMinutes: 90,
      examTitle: null,
      examDescription: null,
      examInstructions: null,
    };
  }

  const row = control as TeacherExamControlRow & { duration_minutes?: number };
  return {
    examStarted: row.exam_started,
    startTime: row.start_time,
    durationMinutes: row.duration_minutes ?? 90,
    examTitle: row.exam_title ?? null,
    examDescription: row.exam_description ?? null,
    examInstructions: row.exam_instructions ?? null,
  };
}

/**
 * Start exam for a subject (teacher only). Sets exam_started = true, start_time = now(), duration_minutes = durationMinutes.
 */
export async function startExamForSubject(
  teacherId: string,
  subjectId: string,
  durationMinutes: number = 90,
  details?: ExamRunDetails
): Promise<void> {
  const duration = Math.max(1, Math.min(300, durationMinutes));
  const { error } = await supabase.from("teacher_exam_control").upsert(
    {
      teacher_id: teacherId,
      subject_id: subjectId,
      exam_started: true,
      start_time: new Date().toISOString(),
      duration_minutes: duration,
      exam_title: details?.title?.trim() || null,
      exam_description: details?.description?.trim() || null,
      exam_instructions: details?.instructions?.trim() || null,
    },
    { onConflict: "teacher_id,subject_id" }
  );
  if (error) throw error;
}

/**
 * End exam for a subject (teacher only). Sets exam_started = false so students can no longer start or continue.
 */
export async function endExamForSubject(
  teacherId: string,
  subjectId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("teacher_exam_control")
    .update({
      exam_started: false,
      start_time: null,
    })
    .eq("teacher_id", teacherId)
    .eq("subject_id", subjectId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (data) return;

  const { error: insertError } = await supabase.from("teacher_exam_control").insert({
    teacher_id: teacherId,
    subject_id: subjectId,
    exam_started: false,
    start_time: null,
    duration_minutes: 90,
  });

  if (insertError) throw insertError;
}

/**
 * Get all exam control rows for a teacher (for dashboard).
 */
export async function getTeacherExamControls(
  teacherId: string
): Promise<TeacherExamControlRow[]> {
  const { data, error } = await supabase
    .from("teacher_exam_control")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TeacherExamControlRow[];
}

/**
 * Force restart exam: delete all submissions for this subject, grant retake permission
 * to all students who had submitted, and restart the exam timer.
 */
export async function forceRestartExam(
  teacherId: string,
  subjectId: string,
  durationMinutes: number = 90,
  subjectSlug?: string,
  details?: ExamRunDetails
): Promise<void> {
  // 1. Delete submissions and get affected student IDs (matches both UUID and slug)
  const studentIds = await deleteSubmissionsForSubject(teacherId, subjectId, subjectSlug);

  // 2. Grant retake permission to all affected students
  if (studentIds.length > 0) {
    await bulkGrantRetakePermission(teacherId, studentIds, subjectId);
  }

  // 3. Restart the exam timer
  await startExamForSubject(teacherId, subjectId, durationMinutes, details);
}
