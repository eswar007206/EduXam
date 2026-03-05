import { supabase } from '@/lib/supabase';
import type { TestResultRow } from '@/lib/database.types';

const TARGET_MARKS = 30;

export interface SubjectProgress {
  n: number;
  avg: number;
  progress: number;
}

/**
 * Save a test result after evaluation.
 * Looks up the subject UUID from the slug, then inserts the result.
 */
export async function saveTestResult(
  studentId: string,
  subjectSlug: string,
  marksObtained: number,
  totalMarks: number,
): Promise<void> {
  const { data: subject, error: subError } = await supabase
    .from('subjects')
    .select('id')
    .eq('slug', subjectSlug)
    .single();

  if (subError || !subject) {
    throw new Error(`Subject not found for slug: ${subjectSlug}`);
  }

  const { error } = await supabase.from('test_results').insert({
    student_id: studentId,
    subject_id: (subject as { id: string }).id,
    marks_obtained: marksObtained,
    total_marks: totalMarks,
  });

  if (error) throw error;
}

/**
 * Get progress for all subjects a student has taken tests in.
 * Returns a map of subject slug -> { n, avg, progress }.
 */
export async function getStudentProgress(
  studentId: string,
): Promise<Record<string, SubjectProgress>> {
  const { data, error } = await supabase
    .from('test_results')
    .select('marks_obtained, total_marks, subject_id, subjects(slug)')
    .eq('student_id', studentId);

  if (error) throw error;
  if (!data || data.length === 0) return {};

  // Group by subject slug
  const grouped: Record<string, number[]> = {};

  for (const row of (data as unknown as (TestResultRow & { subjects?: { slug: string } })[])) {
    const slug = row.subjects?.slug;
    if (!slug) continue;
    if (!grouped[slug]) grouped[slug] = [];
    grouped[slug].push(Number(row.marks_obtained));
  }

  const result: Record<string, SubjectProgress> = {};

  for (const [slug, marks] of Object.entries(grouped)) {
    const n = marks.length;
    const avg = marks.reduce((a, b) => a + b, 0) / n;
    const progress = Math.min(100, (Math.min(n, 3) / 3) * (avg / TARGET_MARKS) * 100);
    result[slug] = { n, avg: Math.round(avg * 10) / 10, progress: Math.round(progress) };
  }

  return result;
}
