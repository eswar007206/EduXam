import { supabase } from '@/lib/supabase';
import type { JobPostingRow, JobApplicationRow } from '@/lib/database.types';

// ─── Recruiter operations ───

export async function createJobPosting(data: {
  recruiter_id: string;
  title: string;
  description: string;
  company_name: string;
  required_skills: string[];
  location?: string | null;
  job_type?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string;
  experience_level?: string;
  workplace_type?: string;
  application_deadline?: string | null;
  responsibilities?: string | null;
  qualifications?: string | null;
  benefits?: string | null;
}): Promise<JobPostingRow> {
  const { data: row, error } = await supabase
    .from('job_postings')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return row as JobPostingRow;
}

export async function getRecruiterJobs(recruiterId: string): Promise<JobPostingRow[]> {
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('recruiter_id', recruiterId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as JobPostingRow[];
}

export async function getJobById(jobId: string): Promise<JobPostingRow | null> {
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error) return null;
  return data as JobPostingRow;
}

export async function updateJobPosting(
  jobId: string,
  updates: { title?: string; description?: string; required_skills?: string[]; location?: string; job_type?: string; is_active?: boolean }
): Promise<void> {
  const { error } = await supabase
    .from('job_postings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', jobId);

  if (error) throw error;
}

export async function deleteJobPosting(jobId: string): Promise<void> {
  const { error } = await supabase
    .from('job_postings')
    .delete()
    .eq('id', jobId);

  if (error) throw error;
}

export async function toggleJobActive(jobId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('job_postings')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', jobId);

  if (error) throw error;
}

// ─── Student operations ───

export async function getActiveJobs(): Promise<JobPostingRow[]> {
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as JobPostingRow[];
}

export async function applyToJob(jobId: string, studentId: string, matchScore?: number): Promise<void> {
  const { error } = await supabase
    .from('job_applications')
    .insert({
      job_id: jobId,
      student_id: studentId,
      match_score: matchScore ?? null,
    });

  if (error) throw error;
}

export async function withdrawApplication(jobId: string, studentId: string): Promise<void> {
  const { error } = await supabase
    .from('job_applications')
    .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
    .eq('job_id', jobId)
    .eq('student_id', studentId);

  if (error) throw error;
}

export async function getStudentApplications(studentId: string): Promise<(JobApplicationRow & { job_postings?: JobPostingRow })[]> {
  const { data, error } = await supabase
    .from('job_applications')
    .select('*, job_postings(*)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as (JobApplicationRow & { job_postings?: JobPostingRow })[];
}

// ─── Recruiter viewing applications ───

export async function getJobApplications(jobId: string): Promise<(JobApplicationRow & { profiles?: { username: string; email: string } })[]> {
  const { data, error } = await supabase
    .from('job_applications')
    .select('*, profiles:student_id(username, email)')
    .eq('job_id', jobId)
    .order('match_score', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as (JobApplicationRow & { profiles?: { username: string; email: string } })[];
}

export async function updateApplicationStatus(applicationId: string, status: JobApplicationRow['status']): Promise<void> {
  const { error } = await supabase
    .from('job_applications')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', applicationId);

  if (error) throw error;
}

// ─── Shortlisting ───

export async function shortlistStudent(recruiterId: string, jobId: string, studentId: string, notes?: string): Promise<void> {
  const { error } = await supabase
    .from('recruiter_shortlists')
    .insert({
      recruiter_id: recruiterId,
      job_id: jobId,
      student_id: studentId,
      notes: notes ?? null,
    });

  if (error) throw error;
}

export async function removeShortlist(jobId: string, studentId: string): Promise<void> {
  const { error } = await supabase
    .from('recruiter_shortlists')
    .delete()
    .eq('job_id', jobId)
    .eq('student_id', studentId);

  if (error) throw error;
}

export async function getJobShortlists(jobId: string): Promise<{ student_id: string; notes: string | null; username: string }[]> {
  const { data, error } = await supabase
    .from('recruiter_shortlists')
    .select('student_id, notes, profiles:student_id(username)')
    .eq('job_id', jobId);

  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    student_id: r.student_id as string,
    notes: r.notes as string | null,
    username: (r.profiles as { username: string })?.username ?? 'Unknown',
  }));
}
