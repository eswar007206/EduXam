/**
 * Database Service
 * Fetches departments, subjects, and questions from Supabase.
 * Optimized with parallel queries and DB-level filtering.
 */

import { supabase } from './supabase';
import type { Department, Subject, Question, TestCase } from '@/features/exam/types';
import type { Database, DepartmentRow, SubjectRow, QuestionRow } from './database.types';

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

  // Step 2: Fetch questions filtered by visible subject IDs (DB-level)
  const subjectIds = subjectRows.map((s) => s.id);
  const questionRows = await fetchRows<QuestionRow>(
    'questions',
    'created_at',
    [{ column: 'subject_id', op: 'in', value: subjectIds }],
  );

  // Step 3: Build department hierarchy
  const departments: Department[] = deptRows.map((dept) => {
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
          teacherName: (sub as SubjectRow & { profiles?: { username: string } }).profiles?.username,
          teacherId: sub.created_by ?? undefined,
        };
      });

    return {
      id: dept.slug,
      name: dept.name,
      subjects: deptSubjects,
    };
  });

  return departments.filter((d) => d.subjects.length > 0);
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
