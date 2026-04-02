import { useCallback, useEffect, useState } from "react";
import { Activity, BarChart3, Building2, Loader2, Users } from "lucide-react";
import { getAdminAnalytics } from "@/services/adminPortalService";

export default function PlatformAnalyticsPage() {
  const [analytics, setAnalytics] = useState({
    universities: 0,
    managedAccounts: 0,
    pendingRequests: 0,
    activeSlots: 0,
    submissions: 0,
    mainExamSubjects: 0,
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAnalytics(await getAdminAnalytics());
    } catch (error) {
      console.error("Failed to load admin analytics:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const cards = [
    { label: "Organization Reach", value: analytics.universities, icon: Building2, description: "Partner organizations currently configured." },
    { label: "Provisioned Users", value: analytics.managedAccounts, icon: Users, description: "Managed institutional identities across portals." },
    { label: "Live Exam Slots", value: analytics.activeSlots, icon: Activity, description: "Approved exam portal slot windows that are active in the system." },
    { label: "Total Exam Activity", value: analytics.submissions, icon: BarChart3, description: "All submission records from prep exams and exam portal attempts." },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#071952]">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          High-level platform metrics for organization operations and exam volume.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading analytics...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[#071952]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-extrabold text-[#071952] mt-5">{card.value.toLocaleString()}</p>
                  <p className="text-lg font-semibold text-[#071952] mt-2">{card.label}</p>
                  <p className="text-sm text-gray-500 mt-2 leading-relaxed">{card.description}</p>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#071952]">Governance Focus</h2>
            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">Pending approvals</p>
                <p className="text-2xl font-extrabold text-[#071952] mt-2">{analytics.pendingRequests}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Teacher requests still waiting for an admin decision before the exam can become official.
                </p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-xs uppercase tracking-wide text-sky-700 font-semibold">Approved Exam Portal Subjects</p>
                <p className="text-2xl font-extrabold text-[#071952] mt-2">{analytics.mainExamSubjects}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Exam Portal subjects already approved and ready for slot planning or live delivery.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
