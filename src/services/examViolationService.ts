import { supabase } from '@/lib/supabase';

/**
 * Record an exam violation (student left fullscreen for 10+ seconds).
 * Called when the 10s countdown expires. After 3 violations the teacher sees them in the portal.
 */
export async function reportExamViolation(
  studentId: string,
  teacherId: string,
  subjectIdUuid: string
): Promise<void> {
  await supabase.from('exam_violations').insert({
    student_id: studentId,
    teacher_id: teacherId,
    subject_id: subjectIdUuid,
  });
}

export interface ViolationRow {
  id: string;
  student_id: string;
  teacher_id: string;
  subject_id: string;
  created_at: string;
}

export interface ViolationWithDetails extends ViolationRow {
  subject_name?: string;
  student_username?: string;
}

/**
 * Fetch violations for the current teacher (for teacher portal).
 */
export async function getViolationsForTeacher(teacherId: string): Promise<ViolationWithDetails[]> {
  const { data, error } = await supabase
    .from('exam_violations')
    .select('id, student_id, subject_id, created_at')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw error;

  const list: ViolationWithDetails[] = (data ?? []).map((row) => ({
    id: row.id,
    student_id: row.student_id,
    teacher_id: teacherId,
    subject_id: row.subject_id,
    created_at: row.created_at,
    subject_name: undefined as string | undefined,
  }));

  const subjectIds = [...new Set(list.map((v) => v.subject_id))];
  if (subjectIds.length > 0) {
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('id, name')
      .in('id', subjectIds);
    const subjectNameMap = new Map(
      (subjectsData ?? []).map((s: { id: string; name: string }) => [s.id, s.name])
    );
    list.forEach((v) => {
      v.subject_name = subjectNameMap.get(v.subject_id);
    });
  }

  const studentIds = [...new Set(list.map((v) => v.student_id))];
  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', studentIds);
    const nameMap = new Map(
      (profiles ?? []).map((p: { id: string; username?: string }) => [p.id, p.username ?? 'Unknown'])
    );
    list.forEach((v) => {
      v.student_username = nameMap.get(v.student_id);
    });
  }
  return list;
}
