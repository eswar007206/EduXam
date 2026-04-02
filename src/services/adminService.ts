import { supabase } from "@/lib/supabase";
import type { DepartmentRow, SubjectRow, QuestionRow } from "@/lib/database.types";

// ========== QUESTION CATEGORIES ==========

export interface QuestionCategory {
  key: string;
  label: string;
  type: "mcq" | "descriptive" | "code";
  marks: number;
  color: string;
  bgColor: string;
}

export const QUESTION_CATEGORIES: QuestionCategory[] = [
  { key: "mcq", label: "MCQ", type: "mcq", marks: 1, color: "text-black dark:text-black", bgColor: "bg-gray-100 dark:bg-black/10" },
  { key: "theory", label: "Theory", type: "descriptive", marks: 4, color: "text-black dark:text-black", bgColor: "bg-gray-100 dark:bg-black/10" },
  { key: "analytical", label: "Analytical", type: "descriptive", marks: 6, color: "text-black dark:text-black", bgColor: "bg-gray-100 dark:bg-black/10" },
  { key: "code", label: "Code", type: "code", marks: 6, color: "text-black dark:text-black", bgColor: "bg-gray-100 dark:bg-black/10" },
];

export function getCategoryByMarksAndType(marks: number, type: string): QuestionCategory {
  if (type === "mcq" || marks === 1) return QUESTION_CATEGORIES[0];
  if (marks === 4 || marks === 3) return QUESTION_CATEGORIES[1];
  if (marks === 6 || marks === 5) return QUESTION_CATEGORIES[2];
  return QUESTION_CATEGORIES.find((c) => c.marks === marks && c.type === type) ?? QUESTION_CATEGORIES[0];
}

// ========== DEPARTMENTS ==========

export async function getDepartments(universityId?: string | null): Promise<DepartmentRow[]> {
  let query = supabase
    .from("departments")
    .select("*")
    .order("name");

  if (universityId) {
    query = query.eq("university_id", universityId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DepartmentRow[];
}

export async function createDepartment(
  name: string,
  slug: string,
  universityId: string,
  createdBy: string
): Promise<DepartmentRow> {
  const { data, error } = await supabase
    .from("departments")
    .insert({
      name,
      slug,
      university_id: universityId,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DepartmentRow;
}

export async function updateDepartment(
  departmentId: string,
  updates: Pick<DepartmentRow, "name" | "slug">
): Promise<DepartmentRow> {
  const { data, error } = await supabase
    .from("departments")
    .update(updates)
    .eq("id", departmentId)
    .select()
    .single();

  if (error) throw error;
  return data as DepartmentRow;
}

export async function deleteDepartment(departmentId: string): Promise<void> {
  const { error } = await supabase
    .from("departments")
    .delete()
    .eq("id", departmentId);

  if (error) throw error;
}

// ========== SUBJECTS ==========

export async function getTeacherSubjects(
  teacherId: string
): Promise<(SubjectRow & { department_name?: string; question_count?: number })[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select("*, departments(name)")
    .eq("created_by", teacherId)
    .order("name");
  if (error) throw error;

  const subjects = (data ?? []) as unknown as (SubjectRow & { departments?: { name: string } })[];
  const results: (SubjectRow & { department_name?: string; question_count?: number })[] = [];
  for (const sub of subjects) {
    const { count } = await supabase
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("subject_id", sub.id);

    results.push({
      ...sub,
      department_name: sub.departments?.name,
      question_count: count ?? 0,
    });
  }
  return results;
}

export async function createSubject(
  name: string,
  slug: string,
  departmentId: string,
  createdBy: string,
  universityId: string | null,
  examType: SubjectRow['exam_type'] = 'main'
): Promise<SubjectRow> {
  const { data, error } = await supabase
    .from("subjects")
    .insert({
      name,
      slug,
      department_id: departmentId,
      created_by: createdBy,
      university_id: universityId,
      exam_type: examType,
    })
    .select()
    .single();
  if (error) throw error;
  return data as SubjectRow;
}

export async function updateSubject(
  id: string,
  updates: { name?: string; slug?: string; department_id?: string; exam_type?: SubjectRow['exam_type'] }
): Promise<SubjectRow> {
  const { data, error } = await supabase
    .from("subjects")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as SubjectRow;
}

export async function deleteSubject(id: string): Promise<void> {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw error;
}

export async function getSubjectById(
  id: string
): Promise<(SubjectRow & { department_name?: string }) | null> {
  const { data, error } = await supabase
    .from("subjects")
    .select("*, departments(name)")
    .eq("id", id)
    .single();
  if (error) return null;
  const sub = data as unknown as SubjectRow & { departments?: { name: string } };
  return { ...sub, department_name: sub.departments?.name };
}

// ========== QUESTIONS ==========

export interface CategoryCounts {
  [categoryKey: string]: number;
}

export async function getSubjectCategoryCounts(
  subjectId: string
): Promise<CategoryCounts> {
  const counts: CategoryCounts = {};
  for (const cat of QUESTION_CATEGORIES) {
    const { count, error } = await supabase
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("subject_id", subjectId)
      .eq("type", cat.type)
      .eq("marks", cat.marks);
    if (!error) {
      counts[cat.key] = count ?? 0;
    }
  }
  return counts;
}

export async function getSubjectQuestionsByCategory(
  subjectId: string,
  type: "mcq" | "descriptive" | "code",
  marks: number,
  page: number = 0,
  pageSize: number = 50,
  search?: string
): Promise<{ data: QuestionRow[]; total: number }> {
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("questions")
    .select("*", { count: "exact" })
    .eq("subject_id", subjectId)
    .eq("type", type)
    .eq("marks", marks);

  if (search && search.trim()) {
    query = query.ilike("text", `%${search.trim()}%`);
  }

  const { data, error, count } = await query
    .order("created_at")
    .range(from, to);

  if (error) throw error;
  return { data: (data ?? []) as QuestionRow[], total: count ?? 0 };
}

/** @deprecated Use getSubjectQuestionsByCategory for paginated access */
export async function getSubjectQuestions(
  subjectId: string
): Promise<QuestionRow[]> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("subject_id", subjectId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as QuestionRow[];
}

export async function createQuestion(data: {
  subject_id: string;
  text: string;
  marks: number;
  type: "mcq" | "descriptive" | "code";
  options?: Record<string, string> | null;
  answer?: string | null;
  language?: string | null;
  starter_code?: string | null;
  test_cases?: unknown[] | null;
  created_by: string;
}): Promise<QuestionRow> {
  const { data: row, error } = await supabase
    .from("questions")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as QuestionRow;
}

export async function updateQuestion(
  id: string,
  updates: {
    text?: string;
    marks?: number;
    type?: "mcq" | "descriptive" | "code";
    options?: Record<string, string> | null;
    answer?: string | null;
    language?: string | null;
    starter_code?: string | null;
    test_cases?: unknown[] | null;
  }
): Promise<QuestionRow> {
  const { data, error } = await supabase
    .from("questions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as QuestionRow;
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabase.from("questions").delete().eq("id", id);
  if (error) throw error;
}

export async function getQuestionById(id: string): Promise<QuestionRow | null> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as QuestionRow;
}

// ========== BULK IMPORT ==========

export async function bulkCreateQuestions(
  questions: {
    subject_id: string;
    text: string;
    marks: number;
    type: "mcq" | "descriptive" | "code";
    options?: Record<string, string> | null;
    answer?: string | null;
    created_by: string;
  }[]
): Promise<QuestionRow[]> {
  // Supabase supports batch inserts; chunk to 100 rows to stay safe
  const results: QuestionRow[] = [];
  for (let i = 0; i < questions.length; i += 100) {
    const chunk = questions.slice(i, i + 100);
    const { data, error } = await supabase
      .from("questions")
      .insert(chunk)
      .select();
    if (error) throw error;
    results.push(...((data ?? []) as QuestionRow[]));
  }
  return results;
}

// ========== STATS ==========

export async function getTeacherStats(teacherId: string) {
  const { count: subjectCount } = await supabase
    .from("subjects")
    .select("*", { count: "exact", head: true })
    .eq("created_by", teacherId);

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id")
    .eq("created_by", teacherId);

  let questionCount = 0;
  if (subjects && subjects.length > 0) {
    const ids = subjects.map((s: { id: string }) => s.id);
    const { count } = await supabase
      .from("questions")
      .select("*", { count: "exact", head: true })
      .in("subject_id", ids);
    questionCount = count ?? 0;
  }

  const { count: enrollmentCount } = await supabase
    .from("enrollments")
    .select("*", { count: "exact", head: true })
    .eq("teacher_id", teacherId);

  return {
    subjects: subjectCount ?? 0,
    questions: questionCount,
    students: enrollmentCount ?? 0,
  };
}
