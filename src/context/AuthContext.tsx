import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { ProfileRow } from "@/lib/database.types";
import type { EducationEntry, ExperienceEntry, CertificationEntry, ProjectEntry } from "@/lib/database.types";
import type { OrganizationFeatureSettings, OrganizationType } from "@/lib/database.types";
import {
  getProfileUniversityIdentity,
  getSignupAuthorization,
  isUniversityManagedRole,
  syncManagedUniversityProfile,
  syncStudentUniversityProfile,
} from "@/services/universityAuthService";
import { normalizeOrganizationFeatures } from "@/lib/organizationFeatures";

export type UserRole = "student" | "teacher" | "recruiter" | "admin" | "developer";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  university_id: string | null;
  university_member_role: "student" | "teacher" | "official" | "admin" | null;
  university_name: string | null;
  university_short_name: string | null;
  university_slug: string | null;
  is_university_verified: boolean;
  organization_type: OrganizationType | null;
  organization_features: OrganizationFeatureSettings;
  roll_number: string | null;
  semester_label: string | null;
  department_label: string | null;
  parent_email: string | null;
  parent_email_verified: boolean;
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
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    username: string,
    role: UserRole
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  let universityIdentity = null;
  try {
    universityIdentity = await getProfileUniversityIdentity(userId);
  } catch (identityError) {
    console.error("Failed to fetch university identity:", identityError);
  }

  const row = data as ProfileRow;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    university_id: row.university_id ?? null,
    university_member_role: row.university_member_role ?? null,
    university_name: universityIdentity?.university_name ?? null,
    university_short_name: universityIdentity?.university_short_name ?? null,
    university_slug: universityIdentity?.university_slug ?? null,
    is_university_verified: universityIdentity?.is_university_verified ?? false,
    organization_type: universityIdentity?.organization_type ?? null,
    organization_features: normalizeOrganizationFeatures(universityIdentity?.organization_features),
    roll_number: row.roll_number ?? null,
    semester_label: row.semester_label ?? null,
    department_label: row.department_label ?? null,
    parent_email: row.parent_email ?? null,
    parent_email_verified: row.parent_email_verified ?? false,
    linkedin_url: row.linkedin_url ?? null,
    github_url: row.github_url ?? null,
    portfolio_url: row.portfolio_url ?? null,
    bio: row.bio ?? null,
    company_name: row.company_name ?? null,
    profile_visibility: row.profile_visibility ?? 'both',
    phone: row.phone ?? null,
    location: row.location ?? null,
    headline: row.headline ?? null,
    skills: row.skills ?? [],
    education: (row.education ?? []) as EducationEntry[],
    experience: (row.experience ?? []) as ExperienceEntry[],
    certifications: (row.certifications ?? []) as CertificationEntry[],
    projects: (row.projects ?? []) as ProjectEntry[],
    avatar_url: row.avatar_url ?? null,
    date_of_birth: row.date_of_birth ?? null,
    gender: row.gender ?? null,
    hometown: row.hometown ?? null,
    current_city: row.current_city ?? null,
    pincode: row.pincode ?? null,
    nationality: row.nationality ?? null,
    languages: row.languages ?? [],
    about_me: row.about_me ?? null,
    college_name: row.college_name ?? null,
    college_year: row.college_year ?? null,
    degree_pursuing: row.degree_pursuing ?? null,
    branch: row.branch ?? null,
    cgpa: row.cgpa ?? null,
    tenth_percentage: row.tenth_percentage ?? null,
    twelfth_percentage: row.twelfth_percentage ?? null,
    interests: row.interests ?? [],
    created_at: row.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const syncedManagedProfilesRef = useRef<Set<string>>(new Set());

  const loadProfile = useCallback(async (userId: string) => {
    // Retry a few times since the trigger may not have created the profile yet
    let attempts = 0;
    while (attempts < 3) {
      let p = await fetchProfile(userId);
      if (p) {
        if (isUniversityManagedRole(p.role) && !syncedManagedProfilesRef.current.has(userId)) {
          try {
            await syncManagedUniversityProfile();
            syncedManagedProfilesRef.current.add(userId);
            p = await fetchProfile(userId);
          } catch (error) {
            console.error("Failed to sync managed university profile:", error);
          }
        }

        if (
          p?.role === "student" &&
          p.email &&
          (!p.university_id || p.university_member_role !== "student")
        ) {
          try {
            const syncedStudentProfile = await syncStudentUniversityProfile(userId, p.email);
            if (syncedStudentProfile) {
              p = await fetchProfile(userId);
            }
          } catch (error) {
            console.error("Failed to sync student university profile:", error);
          }
        }

        setProfile(p);
        return;
      }
      attempts++;
      await new Promise((r) => setTimeout(r, 1000));
    }
    setProfile(null);
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      const normalized = error.message.toLowerCase();
      if (normalized.includes("invalid login credentials")) {
        return { error: "Invalid email or password." };
      }
      if (normalized.includes("email not confirmed")) {
        return { error: "Email is not confirmed yet. Please verify your email first." };
      }
      if (normalized.includes("too many requests")) {
        return { error: "Too many login attempts. Please wait a minute and try again." };
      }
      return { error: error.message };
    }
    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    role: UserRole
  ) => {
    try {
      const authorization = await getSignupAuthorization(email, role);
      if (!authorization.allowed) {
        return { error: authorization.reason || "Your account is not provisioned for this portal yet." };
      }
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Unable to verify your organization access right now.",
      };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, role },
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    syncedManagedProfilesRef.current.clear();
  };

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user.id);
    }
  }, [user, loadProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
