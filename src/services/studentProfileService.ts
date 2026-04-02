import { supabase } from '@/lib/supabase';
import type {
  EducationEntry,
  ExperienceEntry,
  CertificationEntry,
  ProjectEntry,
  OrganizationFeatureSettings,
  OrganizationType,
} from '@/lib/database.types';
import { normalizeOrganizationFeatures } from '@/lib/organizationFeatures';
import { getProfileUniversityIdentity } from '@/services/universityAuthService';

export interface StudentProfileData {
  id: string;
  username: string;
  email: string;
  university_id: string | null;
  university_member_role: 'student' | 'teacher' | 'official' | 'admin' | null;
  university_name: string | null;
  university_short_name: string | null;
  university_slug: string | null;
  is_university_verified: boolean;
  organization_type: OrganizationType | null;
  organization_features: OrganizationFeatureSettings;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  bio: string | null;
  profile_visibility: 'teachers_only' | 'recruiters_only' | 'both' | 'applied_only';
  phone: string | null;
  location: string | null;
  headline: string | null;
  skills: string[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  certifications: CertificationEntry[];
  projects: ProjectEntry[];
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  hometown: string | null;
  current_city: string | null;
  pincode: string | null;
  nationality: string | null;
  languages: string[];
  about_me: string | null;
  college_name: string | null;
  college_year: '1st' | '2nd' | '3rd' | '4th' | '5th' | 'alumni' | null;
  degree_pursuing: string | null;
  branch: string | null;
  cgpa: number | null;
  tenth_percentage: number | null;
  twelfth_percentage: number | null;
  interests: string[];
  created_at: string;
}

export interface SubjectStat {
  subjectId: string;
  subjectName: string;
  avgScore: number;
  avgPercent: number;
  totalExams: number;
  bestScore: number;
  totalMarks: number;
}

function mapProfileRow(d: Record<string, unknown>): StudentProfileData {
  return {
    id: d.id as string,
    username: d.username as string,
    email: d.email as string,
    university_id: (d.university_id as string) ?? null,
    university_member_role: (d.university_member_role as StudentProfileData['university_member_role']) ?? null,
    university_name: null,
    university_short_name: null,
    university_slug: null,
    is_university_verified: false,
    organization_type: null,
    organization_features: normalizeOrganizationFeatures(null),
    linkedin_url: (d.linkedin_url as string) ?? null,
    github_url: (d.github_url as string) ?? null,
    portfolio_url: (d.portfolio_url as string) ?? null,
    bio: (d.bio as string) ?? null,
    profile_visibility: (d.profile_visibility as StudentProfileData['profile_visibility']) ?? 'both',
    phone: (d.phone as string) ?? null,
    location: (d.location as string) ?? null,
    headline: (d.headline as string) ?? null,
    skills: (d.skills as string[]) ?? [],
    education: (d.education as EducationEntry[]) ?? [],
    experience: (d.experience as ExperienceEntry[]) ?? [],
    certifications: (d.certifications as CertificationEntry[]) ?? [],
    projects: (d.projects as ProjectEntry[]) ?? [],
    avatar_url: (d.avatar_url as string) ?? null,
    date_of_birth: (d.date_of_birth as string) ?? null,
    gender: (d.gender as StudentProfileData['gender']) ?? null,
    hometown: (d.hometown as string) ?? null,
    current_city: (d.current_city as string) ?? null,
    pincode: (d.pincode as string) ?? null,
    nationality: (d.nationality as string) ?? null,
    languages: (d.languages as string[]) ?? [],
    about_me: (d.about_me as string) ?? null,
    college_name: (d.college_name as string) ?? null,
    college_year: (d.college_year as StudentProfileData['college_year']) ?? null,
    degree_pursuing: (d.degree_pursuing as string) ?? null,
    branch: (d.branch as string) ?? null,
    cgpa: (d.cgpa as number) ?? null,
    tenth_percentage: (d.tenth_percentage as number) ?? null,
    twelfth_percentage: (d.twelfth_percentage as number) ?? null,
    interests: (d.interests as string[]) ?? [],
    created_at: d.created_at as string,
  };
}

export async function getStudentProfile(studentId: string): Promise<StudentProfileData | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .eq('role', 'student')
    .single();

  if (error || !data) return null;
  const profile = mapProfileRow(data as Record<string, unknown>);

  try {
    const universityIdentity = await getProfileUniversityIdentity(studentId);
    return {
      ...profile,
      university_name: universityIdentity?.university_name ?? null,
      university_short_name: universityIdentity?.university_short_name ?? null,
      university_slug: universityIdentity?.university_slug ?? null,
      is_university_verified: universityIdentity?.is_university_verified ?? false,
      organization_type: universityIdentity?.organization_type ?? null,
      organization_features: normalizeOrganizationFeatures(universityIdentity?.organization_features),
    };
  } catch (identityError) {
    console.error('Failed to load student university identity:', identityError);
    return profile;
  }
}

export async function updateStudentProfile(
  studentId: string,
  updates: Partial<
    Omit<
      StudentProfileData,
      | 'id'
      | 'username'
      | 'email'
      | 'created_at'
      | 'university_id'
      | 'university_member_role'
      | 'university_name'
      | 'university_short_name'
      | 'university_slug'
      | 'is_university_verified'
    >
  >
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', studentId);

  if (error) throw error;
}

export async function getAllStudentProfiles(): Promise<StudentProfileData[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('username');

  if (error) throw error;
  return Promise.all(
    (data ?? []).map(async (d: Record<string, unknown>) => {
      const profile = mapProfileRow(d);

      if (!profile.university_id) {
        return profile;
      }

      try {
        const universityIdentity = await getProfileUniversityIdentity(profile.id);
        return {
          ...profile,
          university_name: universityIdentity?.university_name ?? null,
          university_short_name: universityIdentity?.university_short_name ?? null,
          university_slug: universityIdentity?.university_slug ?? null,
          is_university_verified: universityIdentity?.is_university_verified ?? false,
        };
      } catch (identityError) {
        console.error('Failed to load student university identity:', identityError);
        return profile;
      }
    })
  );
}

export async function getStudentSubjectStats(studentId: string): Promise<SubjectStat[]> {
  const { data, error } = await supabase
    .from('test_results')
    .select('subject_id, marks_obtained, total_marks, subjects(id, name)')
    .eq('student_id', studentId);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const grouped: Record<string, { marks: number[]; totalMarks: number; name: string }> = {};

  for (const row of data as unknown as { subject_id: string; marks_obtained: number; total_marks: number; subjects?: { id: string; name: string } }[]) {
    const subjectName = row.subjects?.name;
    if (!subjectName) continue;
    if (!grouped[row.subject_id]) {
      grouped[row.subject_id] = { marks: [], totalMarks: row.total_marks, name: subjectName };
    }
    grouped[row.subject_id].marks.push(row.marks_obtained);
  }

  return Object.entries(grouped).map(([subjectId, g]) => {
    const avg = g.marks.reduce((a, b) => a + b, 0) / g.marks.length;
    const best = Math.max(...g.marks);
    return {
      subjectId,
      subjectName: g.name,
      avgScore: Math.round(avg * 10) / 10,
      avgPercent: Math.round((avg / g.totalMarks) * 100),
      totalExams: g.marks.length,
      bestScore: best,
      totalMarks: g.totalMarks,
    };
  });
}

export async function getStudentExamHistory(studentId: string): Promise<{
  id: string;
  subjectName: string;
  marksObtained: number;
  totalMarks: number;
  percent: number;
  date: string;
}[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, subject_name, total_marks_obtained, total_marks, created_at')
    .eq('student_id', studentId)
    .eq('status', 'evaluated')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  if (!data) return [];

  return data.map((s) => ({
    id: s.id,
    subjectName: s.subject_name,
    marksObtained: s.total_marks_obtained ?? 0,
    totalMarks: s.total_marks,
    percent: s.total_marks > 0 ? Math.round(((s.total_marks_obtained ?? 0) / s.total_marks) * 100) : 0,
    date: s.created_at,
  }));
}
