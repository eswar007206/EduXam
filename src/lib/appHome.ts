import type { OrganizationFeatureSettings } from "@/lib/database.types";

interface AppHomeProfileLike {
  role?: string | null;
  organization_features?: OrganizationFeatureSettings | null;
}

export function getAppHomePath(profile?: AppHomeProfileLike | null): string {
  switch (profile?.role) {
    case "student":
      return "/student/dashboard";
    case "teacher":
      return "/teacher/dashboard";
    case "admin":
      return "/admin/dashboard";
    case "developer":
      return "/developer/dashboard";
    case "recruiter":
      return "/recruiter/dashboard";
    default:
      return "/";
  }
}
