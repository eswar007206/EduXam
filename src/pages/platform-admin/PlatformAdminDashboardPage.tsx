import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Building2, Clock3, Loader2, ShieldCheck, Users } from "lucide-react";
import {
  getAdminExamChangeRequests,
  getDeveloperDashboardSnapshot,
  getUniversityAdminDashboard,
  getUniversityById,
  type DeveloperDashboardSnapshot,
  type ExamChangeRequestWithDetails,
  type UniversityAdminDashboardSnapshot,
  type UniversityWithMeta,
} from "@/services/adminPortalService";
import { useAuth } from "@/context/AuthContext";

export default function PlatformAdminDashboardPage() {
  const { profile } = useAuth();
  const isDeveloper = profile?.role === "developer";
  const [developerSnapshot, setDeveloperSnapshot] = useState<DeveloperDashboardSnapshot | null>(null);
  const [adminSnapshot, setAdminSnapshot] = useState<UniversityAdminDashboardSnapshot | null>(null);
  const [university, setUniversity] = useState<UniversityWithMeta | null>(null);
  const [pendingRequests, setPendingRequests] = useState<ExamChangeRequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    try {
      setErrorMessage("");

      if (isDeveloper) {
        setDeveloperSnapshot(await getDeveloperDashboardSnapshot());
        setAdminSnapshot(null);
        setUniversity(null);
        setPendingRequests([]);
        return;
      }

      if (!profile.university_id) {
        setErrorMessage("This admin account is not linked to an organization yet.");
        setAdminSnapshot(null);
        setUniversity(null);
        setPendingRequests([]);
        return;
      }

      const [snapshot, currentUniversity, requests] = await Promise.all([
        getUniversityAdminDashboard(profile.university_id),
        getUniversityById(profile.university_id),
        getAdminExamChangeRequests(profile.university_id),
      ]);

      setDeveloperSnapshot(null);
      setAdminSnapshot(snapshot);
      setUniversity(currentUniversity);
      setPendingRequests(requests.filter((request) => request.status === "pending").slice(0, 5));
    } catch (error) {
      console.error("Failed to load portal dashboard:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to load the dashboard right now."
      );
    } finally {
      setLoading(false);
    }
  }, [isDeveloper, profile]);

  useEffect(() => {
    load();
  }, [load]);

  const developerCards = [
    { label: "Organizations", value: developerSnapshot?.universities ?? 0, icon: Building2, accent: "bg-sky-50 text-sky-700 border-sky-100" },
    { label: "Organization Admins", value: developerSnapshot?.universityAdmins ?? 0, icon: Users, accent: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    { label: "Organizations Live", value: developerSnapshot?.universitiesWithAdmin ?? 0, icon: ShieldCheck, accent: "bg-amber-50 text-amber-700 border-amber-100" },
  ];

  const adminCards = [
    { label: "Departments", value: adminSnapshot?.departments ?? 0, icon: Building2, accent: "bg-sky-50 text-sky-700 border-sky-100" },
    { label: "Teacher & Recruiter Accounts", value: adminSnapshot?.managedAccounts ?? 0, icon: Users, accent: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    { label: "Pending Requests", value: adminSnapshot?.pendingRequests ?? 0, icon: ShieldCheck, accent: "bg-amber-50 text-amber-700 border-amber-100" },
    { label: "Active Slots", value: adminSnapshot?.activeSlots ?? 0, icon: Clock3, accent: "bg-rose-50 text-rose-700 border-rose-100" },
    { label: "Approved Exam Portal Subjects", value: adminSnapshot?.mainExamSubjects ?? 0, icon: BookOpen, accent: "bg-violet-50 text-violet-700 border-violet-100" },
  ];

  const cards = isDeveloper ? developerCards : adminCards;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#071952]">
          {isDeveloper ? "Developer Dashboard" : "Admin Dashboard"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isDeveloper
            ? "Create organizations, assign official email domains, configure feature visibility, and issue the first admin login without exposing admin-only details."
            : "Run your organization setup, staff onboarding, and exam portal approvals from one place."}
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {!isDeveloper && university && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Current organization</p>
          <h2 className="text-2xl font-bold text-[#071952] mt-2">{university.name}</h2>
          <p className="text-sm text-gray-500 mt-2">
            Update your organization profile and departments from the Organization page, then create staff logins from Accounts.
          </p>
        </section>
      )}

      <div className={`grid gap-4 ${isDeveloper ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-5"}`}>
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${card.accent}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-500 mt-4">{card.label}</p>
              <p className="text-3xl font-extrabold text-[#071952] mt-1">
                {loading ? "..." : card.value.toLocaleString()}
              </p>
            </motion.div>
          );
        })}
      </div>

      {isDeveloper ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[#071952]">Developer workflow</h2>
          <div className="grid gap-4 md:grid-cols-3 mt-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="font-semibold text-[#071952]">1. Create the organization</p>
              <p className="text-sm text-gray-600 mt-2">Add the organization shell in the Organizations page.</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="font-semibold text-[#071952]">2. Assign official domains</p>
              <p className="text-sm text-gray-600 mt-2">Map the official email domains so matching users automatically fall under that organization.</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="font-semibold text-[#071952]">3. Issue the first admin login</p>
              <p className="text-sm text-gray-600 mt-2">Generate an organization admin account and hand off the rest of the setup to the organization admin.</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#071952]">Pending Exam Portal Requests</h2>
              <p className="text-sm text-gray-500">Recent teacher requests waiting for approval inside your organization.</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {loading ? "..." : pendingRequests.length} open
            </span>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading requests...
            </div>
          ) : pendingRequests.length === 0 ? (
            <p className="text-sm text-gray-500">No pending requests right now.</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-[#071952] truncate">{request.subject_name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {request.teacher_username || "Teacher"} | {request.requested_target_department || "Department not set"}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                      {request.requested_exam_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                    {request.requested_instructions || request.requested_description || "No exam details provided yet."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
