/**
 * Supabase Database Type Definitions
 *
 * These types match the tables created in the Supabase migration SQL.
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          email: string;
          role: 'student' | 'teacher';
          parent_email: string | null;
          parent_email_verified: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          role?: 'student' | 'teacher';
          parent_email?: string | null;
          parent_email_verified?: boolean;
          created_at?: string;
        };
        Update: {
          username?: string;
          email?: string;
          role?: 'student' | 'teacher';
          parent_email?: string | null;
          parent_email_verified?: boolean;
        };
        Relationships: [];
      };
      departments: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
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
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          department_id: string;
          name: string;
          slug: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          department_id?: string;
          name?: string;
          slug?: string;
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
        };
        Insert: {
          id?: string;
          student_id: string;
          teacher_id?: string | null;
          subject_id: string;
          subject_name: string;
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
        };
        Update: {
          status?: 'pending' | 'evaluated';
          question_marks?: Record<string, number>;
          total_marks_obtained?: number | null;
          feedback?: string | null;
          evaluation_type?: 'teacher' | 'ai' | 'ai_teacher';
          evaluation_data?: unknown;
          evaluated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
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
