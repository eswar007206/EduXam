import { supabase } from '@/lib/supabase';
import type { CertificationEntry, ExperienceEntry, ProjectEntry } from '@/lib/database.types';

// ============================================================
//  TYPES
// ============================================================

export interface SkillPointsBreakdown {
  profile: number;        // 0 or 5
  certifications: number; // 0-30
  projects: number;       // 0-36
  exams: number;          // 0-15
  experience: number;     // 0-20
}

export interface PerSkillMatch {
  skill: string;
  points: number; // 0-100
  breakdown: SkillPointsBreakdown;
}

export interface StudentMatchScoreV2 {
  studentId: string;
  username: string;
  avatarUrl: string | null;
  overallScore: number; // 0-100
  perSkill: PerSkillMatch[];
  topEvidence: string[];
}

export interface StudentMatchDetailV2 extends StudentMatchScoreV2 {
  certDetails: { name: string; skills: string[] }[];
  projectDetails: { title: string; skills: string[] }[];
  experienceDetails: { title: string; company: string; skills: string[] }[];
}

// ============================================================
//  POINTS CAPS
// ============================================================

const CAPS = {
  profile: 5,
  certifications: 30,
  projects: 36,
  exams: 15,
  experience: 20,
} as const;

const PER_CERT = 15;
const PER_PROJECT = 12;
const PER_EXPERIENCE = 10;
const MAX_SKILL_POINTS = 100;

// ============================================================
//  PURE COMPUTATION (no DB)
// ============================================================

/** Normalize a skill string for comparison */
function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Compute skill points for a single student.
 *
 * @param profileSkills   - student's skills[]
 * @param certs           - student's certifications[] (with skills_learned)
 * @param projects        - student's projects[] (with skills_used)
 * @param experiences     - student's experience[] (with skills_used)
 * @param subjectSkillMap - subject_id → skill names this subject maps to
 * @param bestExamScores  - subject_id → best score percentage (0-100)
 */
export function computeSkillPoints(
  profileSkills: string[],
  certs: CertificationEntry[],
  projects: ProjectEntry[],
  experiences: ExperienceEntry[],
  subjectSkillMap: Record<string, string[]>,
  bestExamScores: Record<string, number>,
): Record<string, { total: number; sources: SkillPointsBreakdown }> {
  const result: Record<string, { total: number; sources: SkillPointsBreakdown }> = {};

  const ensure = (skill: string) => {
    const key = norm(skill);
    if (!result[key]) {
      result[key] = {
        total: 0,
        sources: { profile: 0, certifications: 0, projects: 0, exams: 0, experience: 0 },
      };
    }
    return result[key];
  };

  // 1. Profile skills → 5 pts each
  for (const sk of profileSkills) {
    const entry = ensure(sk);
    entry.sources.profile = CAPS.profile;
  }

  // 2. Certifications → 15 pts each, capped at 30
  for (const cert of certs) {
    const skills = cert.skills_learned ?? [];
    for (const sk of skills) {
      const entry = ensure(sk);
      entry.sources.certifications = Math.min(
        entry.sources.certifications + PER_CERT,
        CAPS.certifications,
      );
    }
  }

  // 3. Projects → 12 pts each, capped at 36
  for (const proj of projects) {
    const skills = proj.skills_used ?? [];
    for (const sk of skills) {
      const entry = ensure(sk);
      entry.sources.projects = Math.min(
        entry.sources.projects + PER_PROJECT,
        CAPS.projects,
      );
    }
  }

  // 4. Experience → 10 pts each, capped at 20
  for (const exp of experiences) {
    const skills = exp.skills_used ?? [];
    for (const sk of skills) {
      const entry = ensure(sk);
      entry.sources.experience = Math.min(
        entry.sources.experience + PER_EXPERIENCE,
        CAPS.experience,
      );
    }
  }

  // 5. Exams → best score % × 15 / 100, capped at 15
  for (const [subjectId, skills] of Object.entries(subjectSkillMap)) {
    const bestPct = bestExamScores[subjectId];
    if (bestPct == null || bestPct <= 0) continue;
    const pts = Math.round((bestPct / 100) * CAPS.exams * 10) / 10;
    for (const sk of skills) {
      const entry = ensure(sk);
      entry.sources.exams = Math.min(
        Math.max(entry.sources.exams, pts), // take best across subjects
        CAPS.exams,
      );
    }
  }

  // Sum + clamp
  for (const entry of Object.values(result)) {
    const s = entry.sources;
    entry.total = Math.min(
      s.profile + s.certifications + s.projects + s.exams + s.experience,
      MAX_SKILL_POINTS,
    );
  }

  return result;
}

/**
 * Given a student's full skill points map and a job's required_skills,
 * compute the overall match percentage and per-skill breakdown.
 */
export function computeMatchScore(
  skillPoints: Record<string, { total: number; sources: SkillPointsBreakdown }>,
  requiredSkills: string[],
): { overallScore: number; perSkill: PerSkillMatch[] } {
  if (requiredSkills.length === 0) {
    return { overallScore: 0, perSkill: [] };
  }

  const perSkill: PerSkillMatch[] = requiredSkills.map((skill) => {
    const entry = skillPoints[norm(skill)];
    return {
      skill,
      points: entry?.total ?? 0,
      breakdown: entry?.sources ?? { profile: 0, certifications: 0, projects: 0, exams: 0, experience: 0 },
    };
  });

  const overallScore = Math.round(
    perSkill.reduce((sum, s) => sum + s.points, 0) / perSkill.length,
  );

  return { overallScore, perSkill };
}

// ============================================================
//  DB-BACKED FUNCTIONS
// ============================================================

/** Build subject_id → skill names map from the subjects table */
async function fetchSubjectSkillMap(): Promise<Record<string, string[]>> {
  const { data } = await supabase
    .from('subjects')
    .select('id, name, subject_skills');

  const map: Record<string, string[]> = {};
  for (const row of (data ?? []) as { id: string; name: string; subject_skills?: string[] }[]) {
    const skills = row.subject_skills ?? [];
    // Fallback: if no subject_skills are configured, use the subject name itself
    map[row.id] = skills.length > 0 ? skills : [row.name];
  }
  return map;
}

/** Fetch best exam score % per subject per student */
async function fetchBestExamScores(
  studentIds?: string[],
): Promise<Record<string, Record<string, number>>> {
  let query = supabase
    .from('test_results')
    .select('student_id, subject_id, marks_obtained, total_marks');

  if (studentIds && studentIds.length > 0) {
    query = query.in('student_id', studentIds);
  }

  const { data } = await query;

  // student_id → subject_id → best percentage
  const map: Record<string, Record<string, number>> = {};
  for (const row of (data ?? []) as { student_id: string; subject_id: string; marks_obtained: number; total_marks: number }[]) {
    if (row.total_marks <= 0) continue;
    const pct = (row.marks_obtained / row.total_marks) * 100;
    if (!map[row.student_id]) map[row.student_id] = {};
    map[row.student_id][row.subject_id] = Math.max(map[row.student_id][row.subject_id] ?? 0, pct);
  }
  return map;
}

/** Build top evidence strings */
function buildTopEvidence(
  perSkill: PerSkillMatch[],
  certs: CertificationEntry[],
  projects: ProjectEntry[],
  experiences: ExperienceEntry[],
): string[] {
  const evidence: string[] = [];
  const relevantCerts = certs.filter((c) =>
    (c.skills_learned ?? []).some((s) => perSkill.some((ps) => norm(ps.skill) === norm(s))),
  );
  if (relevantCerts.length > 0) evidence.push(`${relevantCerts.length} relevant cert${relevantCerts.length > 1 ? 's' : ''}`);

  const relevantProjects = projects.filter((p) =>
    (p.skills_used ?? []).some((s) => perSkill.some((ps) => norm(ps.skill) === norm(s))),
  );
  if (relevantProjects.length > 0) evidence.push(`${relevantProjects.length} relevant project${relevantProjects.length > 1 ? 's' : ''}`);

  const relevantExp = experiences.filter((e) =>
    (e.skills_used ?? []).some((s) => perSkill.some((ps) => norm(ps.skill) === norm(s))),
  );
  if (relevantExp.length > 0) evidence.push(`${relevantExp.length} relevant experience${relevantExp.length > 1 ? 's' : ''}`);

  const examSkills = perSkill.filter((ps) => ps.breakdown.exams > 0);
  if (examSkills.length > 0) evidence.push(`Exams in ${examSkills.length} skill${examSkills.length > 1 ? 's' : ''}`);

  return evidence;
}

/**
 * Get top students for a job with full skill-points breakdown.
 * Only 4 DB queries regardless of student count.
 */
export async function getTopStudentsForJobV2(
  jobId: string,
  limit: number = 50,
): Promise<StudentMatchScoreV2[]> {
  // 1. Job required skills
  const { data: job } = await supabase
    .from('job_postings')
    .select('required_skills')
    .eq('id', jobId)
    .single();

  if (!job || !job.required_skills?.length) return [];
  const requiredSkills = job.required_skills as string[];

  // 2. Subject skill map
  const subjectSkillMap = await fetchSubjectSkillMap();

  // 3. Student profiles (only students)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, skills, certifications, projects, experience')
    .eq('role', 'student');

  if (!profiles || profiles.length === 0) return [];

  const studentIds = profiles.map((p: { id: string }) => p.id);

  // 4. Best exam scores
  const allExamScores = await fetchBestExamScores(studentIds);

  // Compute scores
  const scores: StudentMatchScoreV2[] = [];

  for (const p of profiles as {
    id: string;
    username: string;
    avatar_url: string | null;
    skills: string[];
    certifications: CertificationEntry[];
    projects: ProjectEntry[];
    experience: ExperienceEntry[];
  }[]) {
    const profileSkills = p.skills ?? [];
    const certs = (p.certifications ?? []) as CertificationEntry[];
    const projs = (p.projects ?? []) as ProjectEntry[];
    const exps = (p.experience ?? []) as ExperienceEntry[];
    const examScores = allExamScores[p.id] ?? {};

    const skillPoints = computeSkillPoints(
      profileSkills,
      certs,
      projs,
      exps,
      subjectSkillMap,
      examScores,
    );

    const { overallScore, perSkill } = computeMatchScore(skillPoints, requiredSkills);

    if (overallScore > 0) {
      scores.push({
        studentId: p.id,
        username: p.username,
        avatarUrl: p.avatar_url,
        overallScore,
        perSkill,
        topEvidence: buildTopEvidence(perSkill, certs, projs, exps),
      });
    }
  }

  scores.sort((a, b) => b.overallScore - a.overallScore);
  return scores.slice(0, limit);
}

/**
 * Get detailed match info for a single student vs a single job.
 */
export async function getStudentMatchForJobV2(
  studentId: string,
  jobId: string,
): Promise<StudentMatchDetailV2 | null> {
  // 1. Job
  const { data: job } = await supabase
    .from('job_postings')
    .select('required_skills')
    .eq('id', jobId)
    .single();

  if (!job || !job.required_skills?.length) return null;
  const requiredSkills = job.required_skills as string[];

  // 2. Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, skills, certifications, projects, experience')
    .eq('id', studentId)
    .single();

  if (!profile) return null;

  const p = profile as {
    id: string;
    username: string;
    avatar_url: string | null;
    skills: string[];
    certifications: CertificationEntry[];
    projects: ProjectEntry[];
    experience: ExperienceEntry[];
  };

  // 3. Subject skill map + exam scores
  const [subjectSkillMap, examScoresMap] = await Promise.all([
    fetchSubjectSkillMap(),
    fetchBestExamScores([studentId]),
  ]);

  const profileSkills = p.skills ?? [];
  const certs = (p.certifications ?? []) as CertificationEntry[];
  const projs = (p.projects ?? []) as ProjectEntry[];
  const exps = (p.experience ?? []) as ExperienceEntry[];
  const examScores = examScoresMap[studentId] ?? {};

  const skillPoints = computeSkillPoints(profileSkills, certs, projs, exps, subjectSkillMap, examScores);
  const { overallScore, perSkill } = computeMatchScore(skillPoints, requiredSkills);

  const reqNorm = new Set(requiredSkills.map(norm));

  return {
    studentId: p.id,
    username: p.username,
    avatarUrl: p.avatar_url,
    overallScore,
    perSkill,
    topEvidence: buildTopEvidence(perSkill, certs, projs, exps),
    certDetails: certs
      .filter((c) => (c.skills_learned ?? []).some((s) => reqNorm.has(norm(s))))
      .map((c) => ({ name: c.name, skills: c.skills_learned ?? [] })),
    projectDetails: projs
      .filter((pr) => (pr.skills_used ?? []).some((s) => reqNorm.has(norm(s))))
      .map((pr) => ({ title: pr.title, skills: pr.skills_used ?? [] })),
    experienceDetails: exps
      .filter((e) => (e.skills_used ?? []).some((s) => reqNorm.has(norm(s))))
      .map((e) => ({ title: e.title, company: e.company, skills: e.skills_used ?? [] })),
  };
}

/**
 * Batch: compute match scores for a single student across multiple jobs.
 * Used by JobBoardPage to avoid N+1 queries.
 */
export async function getStudentMatchScoresForJobs(
  studentId: string,
  jobIds: string[],
): Promise<Record<string, number>> {
  if (jobIds.length === 0) return {};

  // 1. Student profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('skills, certifications, projects, experience')
    .eq('id', studentId)
    .single();

  if (!profile) return {};

  const p = profile as {
    skills: string[];
    certifications: CertificationEntry[];
    projects: ProjectEntry[];
    experience: ExperienceEntry[];
  };

  // 2. Subject skill map + exam scores (one query each)
  const [subjectSkillMap, examScoresMap] = await Promise.all([
    fetchSubjectSkillMap(),
    fetchBestExamScores([studentId]),
  ]);

  const examScores = examScoresMap[studentId] ?? {};

  // Compute full skill points once
  const skillPoints = computeSkillPoints(
    p.skills ?? [],
    (p.certifications ?? []) as CertificationEntry[],
    (p.projects ?? []) as ProjectEntry[],
    (p.experience ?? []) as ExperienceEntry[],
    subjectSkillMap,
    examScores,
  );

  // 3. Fetch all jobs' required_skills
  const { data: jobs } = await supabase
    .from('job_postings')
    .select('id, required_skills')
    .in('id', jobIds);

  const result: Record<string, number> = {};
  for (const job of (jobs ?? []) as { id: string; required_skills: string[] }[]) {
    const { overallScore } = computeMatchScore(skillPoints, job.required_skills ?? []);
    result[job.id] = overallScore;
  }

  return result;
}
