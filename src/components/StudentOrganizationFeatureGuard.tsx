import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getStudentExamEntryPath,
  isStudentNavbarFeatureEnabled,
  type StudentNavbarFeatureKey,
} from "@/lib/organizationFeatures";

interface StudentOrganizationFeatureGuardProps {
  feature: StudentNavbarFeatureKey;
  fallbackTo?: string;
}

export default function StudentOrganizationFeatureGuard({
  feature,
  fallbackTo,
}: StudentOrganizationFeatureGuardProps) {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  if (profile?.role === "student" && !isStudentNavbarFeatureEnabled(profile, feature)) {
    return <Navigate to={fallbackTo ?? getStudentExamEntryPath(profile)} replace />;
  }

  return <Outlet />;
}
