import type {
  OrganizationFeatureSettings,
  OrganizationType,
} from "@/lib/database.types";

export const DEFAULT_ORGANIZATION_FEATURES: OrganizationFeatureSettings = {
  navbar: {
    find_teachers: true,
    my_results: true,
    practice: true,
    jobs: true,
    my_profile: true,
  },
  exam_portal: {
    drawing_canvas: true,
    code_compiler: true,
    graph_calculator: true,
  },
};

export type StudentNavbarFeatureKey = keyof OrganizationFeatureSettings["navbar"];
export type ExamPortalFeatureKey = keyof OrganizationFeatureSettings["exam_portal"];

interface ProfileLike {
  role?: string | null;
  organization_features?: OrganizationFeatureSettings | null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeOrganizationFeatures(value?: unknown): OrganizationFeatureSettings {
  const candidate = isPlainObject(value) ? value : {};
  const navbar = isPlainObject(candidate.navbar) ? candidate.navbar : {};
  const examPortal = isPlainObject(candidate.exam_portal) ? candidate.exam_portal : {};

  return {
    navbar: {
      find_teachers:
        typeof navbar.find_teachers === "boolean"
          ? navbar.find_teachers
          : DEFAULT_ORGANIZATION_FEATURES.navbar.find_teachers,
      my_results:
        typeof navbar.my_results === "boolean"
          ? navbar.my_results
          : DEFAULT_ORGANIZATION_FEATURES.navbar.my_results,
      practice:
        typeof navbar.practice === "boolean"
          ? navbar.practice
          : DEFAULT_ORGANIZATION_FEATURES.navbar.practice,
      jobs:
        typeof navbar.jobs === "boolean"
          ? navbar.jobs
          : DEFAULT_ORGANIZATION_FEATURES.navbar.jobs,
      my_profile:
        typeof navbar.my_profile === "boolean"
          ? navbar.my_profile
          : DEFAULT_ORGANIZATION_FEATURES.navbar.my_profile,
    },
    exam_portal: {
      drawing_canvas:
        typeof examPortal.drawing_canvas === "boolean"
          ? examPortal.drawing_canvas
          : DEFAULT_ORGANIZATION_FEATURES.exam_portal.drawing_canvas,
      code_compiler:
        typeof examPortal.code_compiler === "boolean"
          ? examPortal.code_compiler
          : DEFAULT_ORGANIZATION_FEATURES.exam_portal.code_compiler,
      graph_calculator:
        typeof examPortal.graph_calculator === "boolean"
          ? examPortal.graph_calculator
          : DEFAULT_ORGANIZATION_FEATURES.exam_portal.graph_calculator,
    },
  };
}

export function getProfileOrganizationFeatures(profile?: ProfileLike | null): OrganizationFeatureSettings {
  return normalizeOrganizationFeatures(profile?.organization_features);
}

export function isStudentNavbarFeatureEnabled(
  profile: ProfileLike | null | undefined,
  feature: StudentNavbarFeatureKey
): boolean {
  if (profile?.role !== "student") {
    return true;
  }

  return getProfileOrganizationFeatures(profile).navbar[feature];
}

export function isExamPortalFeatureEnabled(
  profile: ProfileLike | null | undefined,
  feature: ExamPortalFeatureKey
): boolean {
  if (profile?.role !== "student") {
    return true;
  }

  return getProfileOrganizationFeatures(profile).exam_portal[feature];
}

export function isPracticeFeatureEnabled(profile?: ProfileLike | null): boolean {
  return isStudentNavbarFeatureEnabled(profile, "practice");
}

export function getStudentExamEntryPath(profile?: ProfileLike | null): string {
  return isPracticeFeatureEnabled(profile) ? "/exam-practice" : "/main-exam";
}

export function getStudentExamEntryLabel(profile?: ProfileLike | null): string {
  return isPracticeFeatureEnabled(profile) ? "Start Practicing" : "Exam";
}

export function getOrganizationTypeLabel(type?: OrganizationType | null): string {
  switch (type) {
    case "tech_company":
      return "Tech Company";
    case "coaching_center":
      return "Coaching Center";
    case "enterprise":
      return "Enterprise";
    case "other":
      return "Organization";
    case "university":
    default:
      return "University";
  }
}

export function getVerifiedMemberLabel(type?: OrganizationType | null): string {
  switch (type) {
    case "tech_company":
      return "Verified Candidate";
    case "coaching_center":
      return "Verified Coaching Student";
    case "enterprise":
    case "other":
      return "Verified Organization Member";
    case "university":
    default:
      return "Verified University Student";
  }
}
