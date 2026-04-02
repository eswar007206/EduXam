import { supabase } from "@/lib/supabase";
import type {
  OrganizationFeatureSettings,
  OrganizationType,
  UserRole,
} from "@/lib/database.types";

export interface SignupAuthorizationResult {
  allowed: boolean;
  reason: string | null;
  university_id: string | null;
  account_role: string | null;
  username: string | null;
  full_name: string | null;
  roll_number: string | null;
  semester_label: string | null;
  department_label: string | null;
}

const DEFAULT_AUTHORIZATION: SignupAuthorizationResult = {
  allowed: false,
  reason: "Unable to verify your signup eligibility right now.",
  university_id: null,
  account_role: null,
  username: null,
  full_name: null,
  roll_number: null,
  semester_label: null,
  department_label: null,
};

const GCU_DOMAIN = "gcu.edu.in";

export interface ProfileUniversityIdentity {
  university_id: string;
  university_name: string;
  university_short_name: string | null;
  university_slug: string;
  is_university_verified: boolean;
  organization_type: OrganizationType;
  organization_features: OrganizationFeatureSettings;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function getEmailParts(email: string): { localPart: string; domain: string } | null {
  const normalizedEmail = normalizeEmail(email);
  const [localPart, domain, ...rest] = normalizedEmail.split("@");

  if (!localPart || !domain || rest.length > 0) {
    return null;
  }

  return { localPart, domain };
}

async function resolveUniversityIdForEmail(email: string): Promise<string | null> {
  const emailParts = getEmailParts(email);
  if (!emailParts) {
    return null;
  }

  const { data, error } = await supabase
    .from("university_email_domains")
    .select("university_id")
    .eq("domain", emailParts.domain)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.university_id ?? null;
}

function deriveStudentRollNumber(email: string): string | null {
  const emailParts = getEmailParts(email);
  if (!emailParts) {
    return null;
  }

  if (emailParts.domain === GCU_DOMAIN && /^\d{2}[a-z]{4}\d{3}$/.test(emailParts.localPart)) {
    return emailParts.localPart;
  }

  return null;
}

async function getStudentSignupAuthorization(email: string): Promise<SignupAuthorizationResult> {
  const universityId = await resolveUniversityIdForEmail(email);

  if (!universityId) {
    return {
      ...DEFAULT_AUTHORIZATION,
      allowed: true,
      reason: null,
      account_role: "student",
    };
  }

  return {
    ...DEFAULT_AUTHORIZATION,
    allowed: true,
    reason: null,
    university_id: universityId,
    account_role: "student",
    roll_number: deriveStudentRollNumber(email),
  };
}

export function isUniversityManagedRole(role: UserRole): role is Extract<UserRole, "teacher" | "recruiter" | "admin"> {
  return role === "teacher" || role === "recruiter" || role === "admin";
}

export async function getSignupAuthorization(
  email: string,
  role: UserRole
): Promise<SignupAuthorizationResult> {
  if (role === "student") {
    return getStudentSignupAuthorization(email);
  }

  const { data, error } = await supabase.rpc("get_signup_authorization", {
    p_email: email,
    p_role: role,
  });

  if (error) {
    throw error;
  }

  if (Array.isArray(data) && data.length > 0) {
    return {
      ...DEFAULT_AUTHORIZATION,
      ...(data[0] as Partial<SignupAuthorizationResult>),
    };
  }

  return DEFAULT_AUTHORIZATION;
}

export async function syncManagedUniversityProfile(): Promise<void> {
  const { error } = await supabase.rpc("link_managed_account_to_current_profile");
  if (error) {
    throw error;
  }
}

export async function getProfileUniversityIdentity(
  profileId?: string | null
): Promise<ProfileUniversityIdentity | null> {
  const { data, error } = await supabase.rpc("get_profile_university_identity", {
    p_profile_id: profileId ?? null,
  });

  if (error) {
    throw error;
  }

  if (Array.isArray(data) && data.length > 0) {
    return data[0] as ProfileUniversityIdentity;
  }

  return null;
}

export async function syncStudentUniversityProfile(
  userId: string,
  email: string
): Promise<boolean> {
  const universityId = await resolveUniversityIdForEmail(email);

  if (!universityId) {
    return false;
  }

  const rollNumber = deriveStudentRollNumber(email);
  const updates = {
    university_id: universityId,
    university_member_role: "student" as const,
    ...(rollNumber ? { roll_number: rollNumber } : {}),
  };

  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .eq("role", "student");

  if (error) {
    throw error;
  }

  return true;
}
