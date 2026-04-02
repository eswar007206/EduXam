import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { getAdminSubmissions, type AdminSubmissionWithDetails } from "@/services/adminPortalService";

export default function PlatformReportsPage() {
  const [submissions, setSubmissions] = useState<AdminSubmissionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSubmissions(await getAdminSubmissions(100));
    } catch (error) {
      console.error("Failed to load admin reports:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#071952]">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Global submission reporting across students, teachers, prep exams, and exam portal attempts.
        </p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-700">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#071952]">Latest Submission Activity</h2>
            <p className="text-sm text-gray-500">An organization-wide view of the most recent exam attempts.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading reports...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="py-3 pr-4 font-medium">Student</th>
                  <th className="py-3 pr-4 font-medium">Teacher</th>
                  <th className="py-3 pr-4 font-medium">Subject</th>
                  <th className="py-3 pr-4 font-medium">Exam Type</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Marks</th>
                  <th className="py-3 pr-4 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id} className="border-b border-gray-100 align-top">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-[#071952]">{submission.student_username || "Unknown student"}</p>
                      <p className="text-xs text-gray-500 mt-1">{submission.student_email || "No email"}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-[#071952]">{submission.teacher_username || "Not assigned"}</p>
                      <p className="text-xs text-gray-500 mt-1">{submission.teacher_email || "—"}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-[#071952]">{submission.subject_name}</p>
                    </td>
                    <td className="py-3 pr-4 capitalize">{submission.exam_type}</td>
                    <td className="py-3 pr-4 capitalize">{submission.status}</td>
                    <td className="py-3 pr-4">
                      {submission.total_marks_obtained != null
                        ? `${submission.total_marks_obtained}/${submission.total_marks}`
                        : `Pending / ${submission.total_marks}`}
                    </td>
                    <td className="py-3 pr-4">{new Date(submission.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
