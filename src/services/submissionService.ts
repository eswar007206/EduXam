import { supabase } from "@/lib/supabase";
import type { SubmissionRow } from "@/lib/database.types";
import type { ExamSection } from "@/features/exam/types";

export interface CreateSubmissionData {
  studentId: string;
  teacherId?: string | null;
  subjectId: string;
  subjectName: string;
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
}

export async function createSubmission(data: CreateSubmissionData): Promise<SubmissionRow> {
  const isAiEvalOnly = data.evaluationType === 'ai';
  const { data: row, error } = await supabase
    .from("submissions")
    .insert({
      student_id: data.studentId,
      teacher_id: data.teacherId || null,
      subject_id: data.subjectId,
      subject_name: data.subjectName,
      exam_sections: data.examSections as unknown,
      answers: data.answers,
      mcq_answers: data.mcqAnswers,
      total_marks: data.totalMarks,
      time_elapsed: data.timeElapsed,
      question_marks: data.questionMarks || {},
      total_marks_obtained: data.totalMarksObtained ?? null,
      status: isAiEvalOnly ? ("evaluated" as const) : ("pending" as const),
      evaluation_type: data.evaluationType || 'teacher',
      evaluation_data: data.evaluationData || null,
      feedback: data.feedback || null,
      evaluated_at: isAiEvalOnly ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) throw error;
  return row as SubmissionRow;
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
    .or("status.eq.evaluated,and(status.eq.pending,evaluation_type.eq.ai_teacher)")
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
