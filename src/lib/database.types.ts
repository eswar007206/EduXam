/**
 * Supabase Database Type Definitions
 *
 * These types match the tables created in the Supabase migration SQL.
 */

export interface EducationEntry {
  institution: string;
  degree: string;
  field: string;
  start_year: number;
  end_year: number | null;
}

export interface ExperienceEntry {
  title: string;
  company: string;
  location: string;
  start_date: string;
  end_date: string | null;
  description: string;
  current: boolean;
  skills_used: string[];
}

export interface CertificationEntry {
  name: string;
  issuer: string;
  date: string;
  url: string | null;
  image_url: string | null;
  skills_learned: string[];
}

export interface ProjectEntry {
  title: string;
  description: string;
  url: string | null;
  start_date: string;
  end_date: string | null;
  skills_used: string[];
}

export type ExamType = 'prep' | 'main';
export type ExamTypeStatus = 'active' | 'pending_approval';
export type UserRole = 'student' | 'teacher' | 'recruiter' | 'admin' | 'developer';
export type UniversityMemberRole = 'student' | 'teacher' | 'official' | 'admin';
export type ManagedAccountStatus = 'provisioned' | 'active' | 'disabled';
export type SubjectExamRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type OrganizationType = 'university' | 'tech_company' | 'coaching_center' | 'enterprise' | 'other';

export interface OrganizationNavbarFeatures {
  find_teachers: boolean;
  my_results: boolean;
  practice: boolean;
  jobs: boolean;
  my_profile: boolean;
}

export interface OrganizationExamPortalFeatures {
  drawing_canvas: boolean;
  code_compiler: boolean;
  graph_calculator: boolean;
}

export interface OrganizationFeatureSettings {
  navbar: OrganizationNavbarFeatures;
  exam_portal: OrganizationExamPortalFeatures;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          email: string;
          role: UserRole;
          university_id: string | null;
          university_member_role: UniversityMemberRole | null;
          roll_number: string | null;
          semester_label: string | null;
          department_label: string | null;
          parent_email: string | null;
          parent_email_verified: boolean;
          teacher_hidden: boolean;
          linkedin_url: string | null;
          github_url: string | null;
          portfolio_url: string | null;
          bio: string | null;
          company_name: string | null;
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
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          role?: UserRole;
          university_id?: string | null;
          university_member_role?: UniversityMemberRole | null;
          roll_number?: string | null;
          semester_label?: string | null;
          department_label?: string | null;
          parent_email?: string | null;
          parent_email_verified?: boolean;
          teacher_hidden?: boolean;
          linkedin_url?: string | null;
          github_url?: string | null;
          portfolio_url?: string | null;
          bio?: string | null;
          company_name?: string | null;
          profile_visibility?: 'teachers_only' | 'recruiters_only' | 'both' | 'applied_only';
          phone?: string | null;
          location?: string | null;
          headline?: string | null;
          skills?: string[];
          education?: EducationEntry[];
          experience?: ExperienceEntry[];
          certifications?: CertificationEntry[];
          projects?: ProjectEntry[];
          avatar_url?: string | null;
          date_of_birth?: string | null;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
          hometown?: string | null;
          current_city?: string | null;
          pincode?: string | null;
          nationality?: string | null;
          languages?: string[];
          about_me?: string | null;
          college_name?: string | null;
          college_year?: '1st' | '2nd' | '3rd' | '4th' | '5th' | 'alumni' | null;
          degree_pursuing?: string | null;
          branch?: string | null;
          cgpa?: number | null;
          tenth_percentage?: number | null;
          twelfth_percentage?: number | null;
          interests?: string[];
          created_at?: string;
        };
        Update: {
          username?: string;
          email?: string;
          role?: UserRole;
          university_id?: string | null;
          university_member_role?: UniversityMemberRole | null;
          roll_number?: string | null;
          semester_label?: string | null;
          department_label?: string | null;
          parent_email?: string | null;
          parent_email_verified?: boolean;
          teacher_hidden?: boolean;
          linkedin_url?: string | null;
          github_url?: string | null;
          portfolio_url?: string | null;
          bio?: string | null;
          company_name?: string | null;
          profile_visibility?: 'teachers_only' | 'recruiters_only' | 'both' | 'applied_only';
          phone?: string | null;
          location?: string | null;
          headline?: string | null;
          skills?: string[];
          education?: EducationEntry[];
          experience?: ExperienceEntry[];
          certifications?: CertificationEntry[];
          projects?: ProjectEntry[];
          avatar_url?: string | null;
          date_of_birth?: string | null;
          gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
          hometown?: string | null;
          current_city?: string | null;
          pincode?: string | null;
          nationality?: string | null;
          languages?: string[];
          about_me?: string | null;
          college_name?: string | null;
          college_year?: '1st' | '2nd' | '3rd' | '4th' | '5th' | 'alumni' | null;
          degree_pursuing?: string | null;
          branch?: string | null;
          cgpa?: number | null;
          tenth_percentage?: number | null;
          twelfth_percentage?: number | null;
          interests?: string[];
        };
        Relationships: [];
      };
      departments: {
        Row: {
          id: string;
          name: string;
          slug: string;
          university_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          university_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          university_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string;
          department_id: string;
          name: string;
          slug: string;
          exam_type: ExamType;
          university_id: string | null;
          main_exam_title: string | null;
          main_exam_description: string | null;
          main_exam_instructions: string | null;
          main_exam_duration_minutes: number;
          main_exam_target_semester: string | null;
          main_exam_target_department: string | null;
          main_exam_expected_students: number | null;
          exam_type_status: ExamTypeStatus;
          pending_exam_type: ExamType | null;
          subject_skills: string[];
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          name: string;
          slug: string;
          exam_type?: ExamType;
          university_id?: string | null;
          main_exam_title?: string | null;
          main_exam_description?: string | null;
          main_exam_instructions?: string | null;
          main_exam_duration_minutes?: number;
          main_exam_target_semester?: string | null;
          main_exam_target_department?: string | null;
          main_exam_expected_students?: number | null;
          exam_type_status?: ExamTypeStatus;
          pending_exam_type?: ExamType | null;
          subject_skills?: string[];
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          department_id?: string;
          name?: string;
          slug?: string;
          exam_type?: ExamType;
          university_id?: string | null;
          main_exam_title?: string | null;
          main_exam_description?: string | null;
          main_exam_instructions?: string | null;
          main_exam_duration_minutes?: number;
          main_exam_target_semester?: string | null;
          main_exam_target_department?: string | null;
          main_exam_expected_students?: number | null;
          exam_type_status?: ExamTypeStatus;
          pending_exam_type?: ExamType | null;
          subject_skills?: string[];
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          subject_id: string;
          text: string;
          marks: number;
          type: 'mcq' | 'descriptive' | 'code';
          options: Record<string, string> | null;
          answer: string | null;
          language: string | null;
          starter_code: string | null;
          test_cases: unknown[] | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          text: string;
          marks: number;
          type?: 'mcq' | 'descriptive' | 'code';
          options?: Record<string, string> | null;
          answer?: string | null;
          language?: string | null;
          starter_code?: string | null;
          test_cases?: unknown[] | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          text?: string;
          marks?: number;
          type?: 'mcq' | 'descriptive' | 'code';
          options?: Record<string, string> | null;
          answer?: string | null;
          language?: string | null;
          starter_code?: string | null;
          test_cases?: unknown[] | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          teacher_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          teacher_id: string;
          created_at?: string;
        };
        Update: {
          student_id?: string;
          teacher_id?: string;
        };
        Relationships: [];
      };
      test_results: {
        Row: {
          id: string;
          student_id: string;
          subject_id: string;
          marks_obtained: number;
          total_marks: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject_id: string;
          marks_obtained: number;
          total_marks?: number;
          created_at?: string;
        };
        Update: {
          marks_obtained?: number;
          total_marks?: number;
        };
        Relationships: [];
      };
      submissions: {
        Row: {
          id: string;
          student_id: string;
          teacher_id: string | null;
          subject_id: string;
          subject_name: string;
          exam_type: ExamType;
          exam_sections: unknown;
          answers: Record<string, string>;
          mcq_answers: Record<string, string>;
          status: 'pending' | 'evaluated';
          question_marks: Record<string, number>;
          total_marks_obtained: number | null;
          total_marks: number;
          feedback: string | null;
          time_elapsed: number | null;
          evaluation_type: 'teacher' | 'ai' | 'ai_teacher';
          evaluation_data: unknown;
          created_at: string;
          evaluated_at: string | null;
          submitted_due_to_violations: boolean;
        };
        Insert: {
          id?: string;
          student_id: string;
          teacher_id?: string | null;
          subject_id: string;
          subject_name: string;
          exam_type?: ExamType;
          exam_sections: unknown;
          answers?: Record<string, string>;
          mcq_answers?: Record<string, string>;
          status?: 'pending' | 'evaluated';
          question_marks?: Record<string, number>;
          total_marks_obtained?: number | null;
          total_marks: number;
          feedback?: string | null;
          time_elapsed?: number | null;
          evaluation_type?: 'teacher' | 'ai' | 'ai_teacher';
          evaluation_data?: unknown;
          created_at?: string;
          evaluated_at?: string | null;
          submitted_due_to_violations?: boolean;
        };
        Update: {
          exam_type?: ExamType;
          status?: 'pending' | 'evaluated';
          question_marks?: Record<string, number>;
          total_marks_obtained?: number | null;
          feedback?: string | null;
          evaluation_type?: 'teacher' | 'ai' | 'ai_teacher';
          evaluation_data?: unknown;
          evaluated_at?: string | null;
          submitted_due_to_violations?: boolean;
        };
        Relationships: [];
      };
      teacher_exam_control: {
        Row: {
          id: string;
          teacher_id: string;
          subject_id: string;
          exam_started: boolean;
          start_time: string | null;
          duration_minutes: number;
          exam_title: string | null;
          exam_description: string | null;
          exam_instructions: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          subject_id: string;
          exam_started?: boolean;
          start_time?: string | null;
          duration_minutes?: number;
          exam_title?: string | null;
          exam_description?: string | null;
          exam_instructions?: string | null;
          created_at?: string;
        };
        Update: {
          teacher_id?: string;
          subject_id?: string;
          exam_started?: boolean;
          start_time?: string | null;
          duration_minutes?: number;
          exam_title?: string | null;
          exam_description?: string | null;
          exam_instructions?: string | null;
        };
        Relationships: [];
      };
      teacher_visibility: {
        Row: {
          id: string;
          teacher_id: string;
          subject_id: string;
          is_visible: boolean;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          subject_id: string;
          is_visible?: boolean;
        };
        Update: {
          teacher_id?: string;
          subject_id?: string;
          is_visible?: boolean;
        };
        Relationships: [];
      };
      exam_retake_permissions: {
        Row: {
          id: string;
          teacher_id: string;
          student_id: string;
          subject_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          student_id: string;
          subject_id: string;
          created_at?: string;
        };
        Update: {
          teacher_id?: string;
          student_id?: string;
          subject_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      exam_violations: {
        Row: {
          id: string;
          student_id: string;
          teacher_id: string;
          subject_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          teacher_id: string;
          subject_id: string;
          created_at?: string;
        };
        Update: {
          student_id?: string;
          teacher_id?: string;
          subject_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      student_notifications: {
        Row: {
          id: string;
          student_id: string;
          teacher_id: string;
          subject_id: string;
          type: 'prep_exam_created' | 'main_exam_started';
          title: string;
          message: string;
          is_read: boolean;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          teacher_id: string;
          subject_id: string;
          type: 'prep_exam_created' | 'main_exam_started';
          title: string;
          message: string;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
          read_at?: string | null;
        };
        Relationships: [];
      };
      universities: {
        Row: {
          id: string;
          name: string;
          slug: string;
          short_name: string | null;
          organization_type: OrganizationType;
          organization_features: OrganizationFeatureSettings;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          short_name?: string | null;
          organization_type?: OrganizationType;
          organization_features?: OrganizationFeatureSettings;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          short_name?: string | null;
          organization_type?: OrganizationType;
          organization_features?: OrganizationFeatureSettings;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      university_private_profiles: {
        Row: {
          university_id: string;
          website: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          university_id: string;
          website?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          university_id?: string;
          website?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      university_email_domains: {
        Row: {
          id: string;
          university_id: string;
          domain: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          university_id: string;
          domain: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          university_id?: string;
          domain?: string;
          is_primary?: boolean;
        };
        Relationships: [];
      };
      university_managed_accounts: {
        Row: {
          id: string;
          university_id: string | null;
          email: string;
          username: string | null;
          full_name: string | null;
          company_name: string | null;
          role: Extract<UserRole, 'student' | 'teacher' | 'recruiter' | 'admin'>;
          roll_number: string | null;
          semester_label: string | null;
          department_label: string | null;
          provisioning_status: ManagedAccountStatus;
          linked_profile_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          university_id?: string | null;
          email: string;
          username?: string | null;
          full_name?: string | null;
          company_name?: string | null;
          role: Extract<UserRole, 'student' | 'teacher' | 'recruiter' | 'admin'>;
          roll_number?: string | null;
          semester_label?: string | null;
          department_label?: string | null;
          provisioning_status?: ManagedAccountStatus;
          linked_profile_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          university_id?: string | null;
          email?: string;
          username?: string | null;
          full_name?: string | null;
          company_name?: string | null;
          role?: Extract<UserRole, 'student' | 'teacher' | 'recruiter' | 'admin'>;
          roll_number?: string | null;
          semester_label?: string | null;
          department_label?: string | null;
          provisioning_status?: ManagedAccountStatus;
          linked_profile_id?: string | null;
          created_by?: string | null;
        };
        Relationships: [];
      };
      subject_exam_change_requests: {
        Row: {
          id: string;
          subject_id: string;
          university_id: string | null;
          teacher_id: string;
          current_exam_type: ExamType;
          requested_exam_type: ExamType;
          requested_title: string | null;
          requested_description: string | null;
          requested_instructions: string | null;
          requested_duration_minutes: number | null;
          requested_target_semester: string | null;
          requested_target_department: string | null;
          requested_expected_students: number | null;
          status: SubjectExamRequestStatus;
          admin_notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          university_id?: string | null;
          teacher_id: string;
          current_exam_type: ExamType;
          requested_exam_type: ExamType;
          requested_title?: string | null;
          requested_description?: string | null;
          requested_instructions?: string | null;
          requested_duration_minutes?: number | null;
          requested_target_semester?: string | null;
          requested_target_department?: string | null;
          requested_expected_students?: number | null;
          status?: SubjectExamRequestStatus;
          admin_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          university_id?: string | null;
          requested_title?: string | null;
          requested_description?: string | null;
          requested_instructions?: string | null;
          requested_duration_minutes?: number | null;
          requested_target_semester?: string | null;
          requested_target_department?: string | null;
          requested_expected_students?: number | null;
          status?: SubjectExamRequestStatus;
          admin_notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Relationships: [];
      };
      main_exam_schedule_slots: {
        Row: {
          id: string;
          subject_id: string;
          university_id: string | null;
          created_by: string;
          change_request_id: string | null;
          slot_name: string;
          start_time: string;
          end_time: string;
          allowed_email_start: string | null;
          allowed_email_end: string | null;
          max_students: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          university_id?: string | null;
          created_by: string;
          change_request_id?: string | null;
          slot_name: string;
          start_time: string;
          end_time: string;
          allowed_email_start?: string | null;
          allowed_email_end?: string | null;
          max_students?: number | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          university_id?: string | null;
          created_by?: string;
          change_request_id?: string | null;
          slot_name?: string;
          start_time?: string;
          end_time?: string;
          allowed_email_start?: string | null;
          allowed_email_end?: string | null;
          max_students?: number | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      job_postings: {
        Row: {
          id: string;
          recruiter_id: string;
          title: string;
          description: string;
          company_name: string;
          required_skills: string[];
          location: string | null;
          job_type: string;
          is_active: boolean;
          salary_min: number | null;
          salary_max: number | null;
          salary_currency: string;
          experience_level: 'entry' | 'mid' | 'senior' | 'lead';
          workplace_type: 'remote' | 'hybrid' | 'onsite';
          application_deadline: string | null;
          responsibilities: string | null;
          qualifications: string | null;
          benefits: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recruiter_id: string;
          title: string;
          description: string;
          company_name: string;
          required_skills?: string[];
          location?: string | null;
          job_type?: string;
          is_active?: boolean;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string;
          experience_level?: string;
          workplace_type?: string;
          application_deadline?: string | null;
          responsibilities?: string | null;
          qualifications?: string | null;
          benefits?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          company_name?: string;
          required_skills?: string[];
          location?: string | null;
          job_type?: string;
          is_active?: boolean;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string;
          experience_level?: string;
          workplace_type?: string;
          application_deadline?: string | null;
          responsibilities?: string | null;
          qualifications?: string | null;
          benefits?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      job_applications: {
        Row: {
          id: string;
          job_id: string;
          student_id: string;
          status: 'applied' | 'shortlisted' | 'rejected' | 'withdrawn';
          match_score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          student_id: string;
          status?: 'applied' | 'shortlisted' | 'rejected' | 'withdrawn';
          match_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: 'applied' | 'shortlisted' | 'rejected' | 'withdrawn';
          match_score?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      recruiter_shortlists: {
        Row: {
          id: string;
          recruiter_id: string;
          job_id: string;
          student_id: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recruiter_id: string;
          job_id: string;
          student_id: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          notes?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_signup_authorization: {
        Args: {
          p_email: string;
          p_role: UserRole;
        };
        Returns: {
          allowed: boolean;
          reason: string | null;
          university_id: string | null;
          account_role: string | null;
          username: string | null;
          full_name: string | null;
          roll_number: string | null;
          semester_label: string | null;
          department_label: string | null;
        }[];
      };
      link_managed_account_to_current_profile: {
        Args: Record<string, never>;
        Returns: Record<string, unknown>;
      };
      backfill_university_profiles_for_domain: {
        Args: {
          p_university_id: string;
          p_domain: string;
        };
        Returns: number;
      };
      get_profile_university_identity: {
        Args: {
          p_profile_id?: string | null;
        };
        Returns: {
          university_id: string;
          university_name: string;
          university_short_name: string | null;
          university_slug: string;
          is_university_verified: boolean;
          organization_type: OrganizationType;
          organization_features: OrganizationFeatureSettings;
        }[];
      };
      provision_platform_account: {
        Args: {
          p_profile_id: string;
          p_university_id: string | null;
          p_email: string;
          p_username?: string | null;
          p_role?: string | null;
          p_department_label?: string | null;
          p_company_name?: string | null;
          p_created_by?: string | null;
        };
        Returns: Database['public']['Tables']['university_managed_accounts']['Row'];
      };
      update_platform_account: {
        Args: {
          p_managed_account_id: string;
          p_username?: string | null;
          p_university_id?: string | null;
          p_department_label?: string | null;
          p_company_name?: string | null;
          p_provisioning_status?: string | null;
        };
        Returns: Database['public']['Tables']['university_managed_accounts']['Row'];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

/** Row types for convenience */
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type DepartmentRow = Database['public']['Tables']['departments']['Row'];
export type SubjectRow = Database['public']['Tables']['subjects']['Row'];
export type QuestionRow = Database['public']['Tables']['questions']['Row'];
export type EnrollmentRow = Database['public']['Tables']['enrollments']['Row'];
export type TestResultRow = Database['public']['Tables']['test_results']['Row'];
export type SubmissionRow = Database['public']['Tables']['submissions']['Row'];
export type TeacherExamControlRow = Database['public']['Tables']['teacher_exam_control']['Row'];
export type TeacherVisibilityRow = Database['public']['Tables']['teacher_visibility']['Row'];
export type ExamRetakePermissionRow = Database['public']['Tables']['exam_retake_permissions']['Row'];
export type ExamViolationRow = Database['public']['Tables']['exam_violations']['Row'];
export type StudentNotificationRow = Database['public']['Tables']['student_notifications']['Row'];
export type UniversityRow = Database['public']['Tables']['universities']['Row'];
export type UniversityPrivateProfileRow = Database['public']['Tables']['university_private_profiles']['Row'];
export type UniversityEmailDomainRow = Database['public']['Tables']['university_email_domains']['Row'];
export type UniversityManagedAccountRow = Database['public']['Tables']['university_managed_accounts']['Row'];
export type SubjectExamChangeRequestRow = Database['public']['Tables']['subject_exam_change_requests']['Row'];
export type MainExamScheduleSlotRow = Database['public']['Tables']['main_exam_schedule_slots']['Row'];
export type JobPostingRow = Database['public']['Tables']['job_postings']['Row'];
export type JobApplicationRow = Database['public']['Tables']['job_applications']['Row'];
export type RecruiterShortlistRow = Database['public']['Tables']['recruiter_shortlists']['Row'];
