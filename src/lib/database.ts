/**
 * Database Service
 * Fetches departments, subjects, and questions from Supabase.
 * Optimized with parallel queries and DB-level filtering.
 */

import { supabase } from './supabase';
import type { Department, Subject, Question, TestCase } from '@/features/exam/types';
import type { Database, DepartmentRow, SubjectRow, QuestionRow } from './database.types';
import { getStudentAssignedMainExamSubjectIds } from '@/services/examGovernanceService';

type TableName = keyof Database['public']['Tables'];

/** Supabase default max rows per request */
const PAGE_SIZE = 1000;

/**
 * Fetch all rows from a table with optional filters, paginating automatically.
 */
async function fetchRows<T>(
  table: TableName,
  orderBy: string,
  filters?: { column: string; op: 'eq' | 'in'; value: string | number | string[] }[],
  selectClause = '*',
): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;
  let done = false;

  while (!done) {
    let query = supabase
      .from(table)
      .select(selectClause)
      .order(orderBy)
      .range(from, from + PAGE_SIZE - 1);

    if (filters) {
      for (const f of filters) {
        if (f.op === 'eq') query = query.eq(f.column, f.value);
        if (f.op === 'in') query = query.in(f.column, f.value as string[]);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as T[];
    allRows.push(...rows);

    if (rows.length < PAGE_SIZE) {
      done = true;
    } else {
      from += PAGE_SIZE;
    }
  }

  return allRows;
}

/**
 * Parse MCQ options from various DB formats into a consistent array.
 * Handles: { "A": "text" }, { "a": "text" }, string JSON, arrays.
 * Always normalises keys to lowercase.
 */
function parseMcqOptions(raw: unknown): { id: string; text: string }[] | null {
  let opts = raw;
  if (!opts) return null;

  // If it came back as a JSON string, parse it first
  if (typeof opts === 'string') {
    try { opts = JSON.parse(opts); } catch { return null; }
  }

  if (Array.isArray(opts)) {
    // Array of strings or objects
    return opts.map((item: unknown, idx: number) => {
      if (typeof item === 'string') return { id: String.fromCharCode(97 + idx), text: item };
      if (item && typeof item === 'object' && 'text' in item) {
        const o = item as { id?: string; text: string };
        return { id: (o.id || String.fromCharCode(97 + idx)).toLowerCase(), text: String(o.text) };
      }
      return { id: String.fromCharCode(97 + idx), text: String(item) };
    });
  }

  if (opts && typeof opts === 'object') {
    // Record format: { "A": "text", ... } or { "a": "text", ... }
    return Object.entries(opts as Record<string, string>)
      .map(([key, text]) => ({ id: key.toLowerCase(), text: String(text) }));
  }

  return null;
}

/** Convert a QuestionRow into the app Question type. */
function mapQuestion(q: QuestionRow): Question {
  const isMcq = q.type === 'mcq' || (q.marks === 1 && q.options != null);
  const isCode = q.type === 'code';
  const options = isMcq ? parseMcqOptions(q.options) : null;
  const correctOption = isMcq && q.answer ? q.answer.toLowerCase() : undefined;

  return {
    id: q.id,
    text: q.text,
    marks: q.marks,
    type: isMcq ? 'mcq' : isCode ? 'code' : undefined,
    ...(options && options.length > 0 ? { options, correctOption } : {}),
    ...(isCode ? {
      language: q.language || 'python',
      starterCode: q.starter_code || '',
      testCases: (q.test_cases as TestCase[]) || [],
    } : {}),
  };
}

function buildDepartments(
  deptRows: DepartmentRow[],
  subjectRows: (SubjectRow & { profiles?: { username: string } })[],
  questionRows: QuestionRow[]
): Department[] {
  return deptRows
    .map((dept) => {
      const deptSubjects = subjectRows
        .filter((s) => s.department_id === dept.id)
        .map((sub): Subject => {
          const subQuestions = questionRows
            .filter((q) => q.subject_id === sub.id)
            .map(mapQuestion);

          return {
            id: sub.slug,
            name: sub.name,
            questions: subQuestions,
            examType: sub.exam_type ?? 'main',
            teacherName: sub.profiles?.username,
            teacherId: sub.created_by ?? undefined,
            subjectUuid: sub.id,
          };
        });

      return {
        id: dept.slug,
        name: dept.name,
        subjects: deptSubjects,
      };
    })
    .filter((department) => department.subjects.length > 0);
}

/**
 * Fetch all departments with their subjects and questions from Supabase.
 * Uses DB-level filtering and parallel queries for performance.
 */
export async function fetchDepartments(enrolledTeacherIds?: string[]): Promise<Department[]> {
  // Step 1: Fetch departments and subjects in parallel
  const subjectFilters = enrolledTeacherIds !== undefined && enrolledTeacherIds.length > 0
    ? [{ column: 'created_by', op: 'in' as const, value: enrolledTeacherIds }]
    : undefined;

  // If enrolled teacher list is explicitly empty, no subjects to show
  if (enrolledTeacherIds !== undefined && enrolledTeacherIds.length === 0) {
    return [];
  }

  const [deptRows, subjectRows] = await Promise.all([
    fetchRows<DepartmentRow>('departments', 'name'),
    fetchRows<SubjectRow & { profiles?: { username: string } }>(
      'subjects',
      'name',
      subjectFilters,
      '*, profiles!subjects_created_by_fkey(username)',
    ),
  ]);

  if (deptRows.length === 0 || subjectRows.length === 0) return [];

  // Step 1a: Exclude subjects whose teacher is hidden in DB (profiles.teacher_hidden = true)
  const creatorIds = [...new Set((subjectRows as { created_by: string | null }[]).map((s) => s.created_by).filter(Boolean))] as string[];
  const profileResult = creatorIds.length > 0
    ? await supabase.from('profiles').select('id, teacher_hidden').in('id', creatorIds).eq('role', 'teacher')
    : { data: [] };
  const profileRows = (profileResult as { data: unknown }).data as { id: string; teacher_hidden: boolean }[] | null;
  const hiddenTeacherIds = new Set<string>();
  for (const row of profileRows ?? []) {
    if (row.teacher_hidden) hiddenTeacherIds.add(row.id);
  }
  const rowsAfterHiddenTeachers = subjectRows.filter((s) => !(s.created_by && hiddenTeacherIds.has(s.created_by)));

  // Step 1b: Filter subjects by teacher_visibility (hide if is_visible = false)
  const { data: visibilityRows } = await supabase
    .from('teacher_visibility')
    .select('teacher_id, subject_id, is_visible');
  const hiddenSubjectKeys = new Set<string>();
  for (const row of (visibilityRows ?? []) as { teacher_id: string; subject_id: string; is_visible: boolean }[]) {
    if (row.is_visible === false) {
      hiddenSubjectKeys.add(`${row.teacher_id}:${row.subject_id}`);
    }
  }
  const visibleSubjectRows = rowsAfterHiddenTeachers.filter((s) => {
    const key = `${s.created_by ?? ''}:${s.id}`;
    return !hiddenSubjectKeys.has(key) && s.exam_type_status !== 'pending_approval';
  });
  const subjectIds = visibleSubjectRows.map((s) => s.id);

  // Step 2: Fetch questions filtered by visible subject IDs (DB-level)
  const questionRows = await fetchRows<QuestionRow>(
    'questions',
    'created_at',
    [{ column: 'subject_id', op: 'in', value: subjectIds }],
  );

  // Step 3: Build department hierarchy (only visible subjects)
  return buildDepartments(
    deptRows,
    visibleSubjectRows as (SubjectRow & { profiles?: { username: string } })[],
    questionRows
  );
}

export async function fetchAssignedMainExamDepartments(studentEmail: string): Promise<Department[]> {
  const assignedSubjectIds = await getStudentAssignedMainExamSubjectIds(studentEmail);
  if (assignedSubjectIds.length === 0) {
    return [];
  }

  const [deptRows, subjectRows, questionRows] = await Promise.all([
    fetchRows<DepartmentRow>('departments', 'name'),
    fetchRows<SubjectRow & { profiles?: { username: string } }>(
      'subjects',
      'name',
      [
        { column: 'id', op: 'in', value: assignedSubjectIds },
        { column: 'exam_type', op: 'eq', value: 'main' },
        { column: 'exam_type_status', op: 'eq', value: 'active' },
      ],
      '*, profiles!subjects_created_by_fkey(username)',
    ),
    fetchRows<QuestionRow>(
      'questions',
      'created_at',
      [{ column: 'subject_id', op: 'in', value: assignedSubjectIds }],
    ),
  ]);

  return buildDepartments(deptRows, subjectRows, questionRows);
}

/**
 * Fetch questions for a specific subject by its slug.
 */
export async function fetchQuestionsBySubject(subjectSlug: string): Promise<Question[]> {
  const { data: subjectRow, error: subError } = await supabase
    .from('subjects')
    .select('id')
    .eq('slug', subjectSlug)
    .single();

  if (subError || !subjectRow) {
    return [];
  }

  const subjectId = (subjectRow as { id: string }).id;
  const questionRows = await fetchRows<QuestionRow>(
    'questions',
    'created_at',
    [{ column: 'subject_id', op: 'eq', value: subjectId }],
  );

  return questionRows.map(mapQuestion);
}
