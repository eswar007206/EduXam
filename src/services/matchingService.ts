import { getTopStudentsForJobV2, getStudentMatchForJobV2 } from './skillPointsService';
import type { StudentMatchScoreV2, PerSkillMatch } from './skillPointsService';

// Re-export new types for consumers
export type { StudentMatchScoreV2, PerSkillMatch };
export type { SkillPointsBreakdown, StudentMatchDetailV2 } from './skillPointsService';

/**
 * Legacy interface kept for backward compatibility.
 * New code should use StudentMatchScoreV2 directly.
 */
export interface StudentMatchScore {
  studentId: string;
  username: string;
  overallScore: number;
  avgScorePercent: number;
  consistencyScore: number;
  examCountScore: number;
  relevantSubjects: {
    subjectName: string;
    avgPercent: number;
    examCount: number;
    activeDays: number;
  }[];
}

/**
 * Get top students for a job — now powered by the points-based engine.
 * Returns legacy StudentMatchScore shape for backward compat.
 */
export async function getTopStudentsForJob(
  jobId: string,
  limit: number = 50,
): Promise<StudentMatchScore[]> {
  const v2 = await getTopStudentsForJobV2(jobId, limit);
  return v2.map(toLegacy);
}

/**
 * Get a single student's match score for a job.
 */
export async function getStudentMatchForJob(
  studentId: string,
  jobId: string,
): Promise<number> {
  const detail = await getStudentMatchForJobV2(studentId, jobId);
  return detail?.overallScore ?? 0;
}

/** Map V2 → legacy shape for pages that haven't migrated yet */
function toLegacy(v2: StudentMatchScoreV2): StudentMatchScore {
  return {
    studentId: v2.studentId,
    username: v2.username,
    overallScore: v2.overallScore,
    avgScorePercent: v2.overallScore, // approximate
    consistencyScore: 0,
    examCountScore: 0,
    relevantSubjects: v2.perSkill.map((ps: PerSkillMatch) => ({
      subjectName: ps.skill,
      avgPercent: ps.points,
      examCount: ps.breakdown.exams > 0 ? 1 : 0,
      activeDays: 0,
    })),
  };
}
