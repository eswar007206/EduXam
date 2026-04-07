import { supabase } from "@/lib/supabase";
import type { SubmissionRow } from "@/lib/database.types";
import type { ExamSection } from "@/features/exam/types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns subject UUID. If the value is already a UUID, return it; otherwise look up by slug.
 * Used when submissions.subject_id may be slug (legacy) or UUID.
 */
export async function getSubjectUuid(slugOrUuid: string): Promise<string> {
  if (UUID_REGEX.test(slugOrUuid)) return slugOrUuid;
  const { data, error } = await supabase
    .from("subjects")
    .select("id")
    .eq("slug", slugOrUuid)
    .single();
  if (error || !data) throw new Error(`Subject not found: ${slugOrUuid}`);
  return (data as { id: string }).id;
}

export interface CreateSubmissionData {
  studentId: string;
  teacherId?: string | null;
  subjectId: string;
  subjectName: string;
  examType?: SubmissionRow['exam_type'];
  examSections: ExamSection[];
  answers: Record<string, string>;
  mcqAnswers: Record<string, string>;
  totalMarks: number;
  timeElapsed: number;
  questionMarks?: Record<string, number>;
  totalMarksObtained?: number;
  evaluationType?: 'teacher' | 'ai' | 'ai_teacher';
  evaluationData?: unknown;
  feedback?: string;
  /** True when auto-submitted after 3 fullscreen violations; shown to teacher when evaluating. */
  submittedDueToViolations?: boolean;
}

export async function createSubmission(data: CreateSubmissionData): Promise<SubmissionRow> {
  const isAiEvalComplete = data.evaluationType === 'ai' && data.evaluationData != null;
  const { data: row, error } = await supabase
    .from("submissions")
    .insert({
      student_id: data.studentId,
      teacher_id: data.teacherId || null,
      subject_id: data.subjectId,
      subject_name: data.subjectName,
      exam_type: data.examType ?? 'main',
      exam_sections: data.examSections as unknown,
      answers: data.answers,
      mcq_answers: data.mcqAnswers,
      total_marks: data.totalMarks,
      time_elapsed: data.timeElapsed,
      question_marks: data.questionMarks || {},
      total_marks_obtained: data.totalMarksObtained ?? null,
      status: isAiEvalComplete ? ("evaluated" as const) : ("pending" as const),
      evaluation_type: data.evaluationType || 'teacher',
      evaluation_data: data.evaluationData || null,
      feedback: data.feedback || null,
      evaluated_at: isAiEvalComplete ? new Date().toISOString() : null,
      submitted_due_to_violations: data.submittedDueToViolations ?? false,
    })
    .select()
    .single();

  if (error) throw error;
  return row as SubmissionRow;
}

/**
 * Count recent submissions for a subject within the last N minutes.
 * Used to detect high demand before AI evaluation.
 */
export async function getRecentSubmissionCount(
  subjectId: string,
  minutes: number = 15
): Promise<number> {
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("subject_id", subjectId)
    .gte("created_at", since);

  if (error) return 0;
  return count ?? 0;
}

export async function getTeacherSubmissions(
  teacherId: string,
  status?: "pending" | "evaluated"
): Promise<(SubmissionRow & { student_username?: string })[]> {
  let query = supabase
    .from("submissions")
    .select("*, profiles!submissions_student_id_fkey(username)")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as unknown as (SubmissionRow & { profiles?: { username: string } })[]).map(
    (s) => ({
      ...s,
      student_username: s.profiles?.username,
    })
  );
}

export async function getSubmissionById(
  id: string
): Promise<(SubmissionRow & { student_username?: string }) | null> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*, profiles!submissions_student_id_fkey(username)")
    .eq("id", id)
    .single();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as SubmissionRow & { profiles?: { username: string } };
  return {
    ...row,
    student_username: row.profiles?.username,
  };
}

export async function updateSubmissionMarks(
  id: string,
  questionMarks: Record<string, number>,
  totalMarksObtained: number,
  feedback?: string,
  evaluationData?: unknown
): Promise<void> {
  const updateObj: Record<string, unknown> = {
    question_marks: questionMarks,
    total_marks_obtained: totalMarksObtained,
    feedback: feedback || null,
    status: "evaluated" as const,
    evaluated_at: new Date().toISOString(),
  };
  if (evaluationData !== undefined) {
    updateObj.evaluation_data = evaluationData;
  }
  const { error } = await supabase
    .from("submissions")
    .update(updateObj)
    .eq("id", id);

  if (error) throw error;
}

export async function updateSubmissionEvaluationData(
  id: string,
  evaluationData: unknown
): Promise<void> {
  const { error } = await supabase
    .from("submissions")
    .update({ evaluation_data: evaluationData })
    .eq("id", id);

  if (error) throw error;
}

export async function getTeacherSubmissionCount(
  teacherId: string,
  status?: "pending" | "evaluated"
): Promise<number> {
  let query = supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("teacher_id", teacherId);

  if (status) {
    query = query.eq("status", status);
  }

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

export async function getStudentEvaluations(
  studentId: string
): Promise<SubmissionRow[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("student_id", studentId)
    .or("status.eq.evaluated,and(status.eq.pending,evaluation_type.eq.ai_teacher),and(status.eq.pending,evaluation_type.eq.ai)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SubmissionRow[];
}

export async function getStudentSubmissions(
  studentId: string
): Promise<SubmissionRow[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SubmissionRow[];
}

export async function getStudentEvaluationById(
  id: string,
  studentId: string
): Promise<SubmissionRow | null> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", id)
    .eq("student_id", studentId)
    .single();

  if (error) throw error;
  return data as SubmissionRow | null;
}

/**
 * Returns true if the student has at least one submission (completed attempt) for this subject.
 * Used to block re-attempt unless teacher granted retake permission.
 * Supports both subject_id stored as UUID or slug (for backward compatibility).
 */
export async function hasStudentAttemptedSubject(
  studentId: string,
  subjectIdUuid: string,
  subjectSlug?: string | null,
  examType: SubmissionRow['exam_type'] = 'main'
): Promise<boolean> {
  if (examType !== 'main') {
    return false;
  }

  let query = supabase
    .from("submissions")
    .select("id")
    .eq("student_id", studentId)
    .eq("exam_type", "main")
    .limit(1);

  if (subjectSlug != null && subjectSlug !== subjectIdUuid) {
    query = query.or(`subject_id.eq.${subjectIdUuid},subject_id.eq.${subjectSlug}`);
  } else {
    query = query.eq("subject_id", subjectIdUuid);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/**
 * Delete all submission reports for a teacher (teacher only). Requires RLS policy allowing DELETE where teacher_id = auth.uid().
 */
export async function deleteAllSubmissionsForTeacher(teacherId: string): Promise<void> {
  const { error } = await supabase
    .from("submissions")
    .delete()
    .eq("teacher_id", teacherId);

  if (error) throw error;
}

/**
 * Delete all submissions for a specific teacher + subject. Returns the student IDs that had submissions.
 * Matches subject_id by both UUID and slug (some old submissions stored the slug).
 * Also matches teacher_id IS NULL (old bug stored null teacher_id).
 */
export async function deleteSubmissionsForSubject(
  teacherId: string,
  subjectId: string,
  subjectSlug?: string
): Promise<string[]> {
  // Build the OR filter to match both UUID and slug
  const subjectFilter = subjectSlug && subjectSlug !== subjectId
    ? `subject_id.eq.${subjectId},subject_id.eq.${subjectSlug}`
    : `subject_id.eq.${subjectId}`;

  // Match teacher_id = teacherId OR teacher_id IS NULL (old bug)
  const teacherFilter = `teacher_id.eq.${teacherId},teacher_id.is.null`;

  // First, get the student IDs who have submissions for this subject
  const { data: existing, error: fetchError } = await supabase
    .from("submissions")
    .select("student_id")
    .or(teacherFilter)
    .or(subjectFilter);

  if (fetchError) throw fetchError;

  const studentIds = [...new Set((existing ?? []).map((r: { student_id: string }) => r.student_id))];

  // Delete all submissions for this teacher + subject (both UUID and slug, both teacher_id and null)
  const { error } = await supabase
    .from("submissions")
    .delete()
    .or(teacherFilter)
    .or(subjectFilter);

  if (error) throw error;

  return studentIds;
}
