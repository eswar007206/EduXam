import { useState, useMemo } from "react";
import { ShieldAlert, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getViolationsForTeacher, type ViolationWithDetails } from "@/services/examViolationService";
import { useEffect } from "react";

export default function ViolationsPage() {
  const { profile } = useAuth();
  const [violations, setViolations] = useState<ViolationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    getViolationsForTeacher(profile.id)
      .then(setViolations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profile?.id]);

  const byStudent = useMemo(() => {
    const map = new Map<string, { username: string; list: ViolationWithDetails[] }>();
    for (const v of violations) {
      const key = v.student_id;
      const username = v.student_username ?? "Unknown";
      if (!map.has(key)) map.set(key, { username, list: [] });
      map.get(key)!.list.push(v);
    }
    return Array.from(map.entries()).map(([studentId, { username, list }]) => ({
      studentId,
      username,
      list: list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      count: list.length,
    }));
  }, [violations]);

  const sortedByStudent = useMemo(
    () => [...byStudent].sort((a, b) => b.count - a.count),
    [byStudent]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#071952] flex items-center gap-2">
          <ShieldAlert className="w-7 h-7 text-black" />
          Exam Violations
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Every confirmed fullscreen exit longer than 10 seconds is reported here immediately. On the 3rd confirmed violation, the exam is auto-submitted to the teacher.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading…
        </div>
      ) : sortedByStudent.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          No violations recorded.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="divide-y divide-gray-100">
            {sortedByStudent.map(({ studentId, username, list, count }) => (
              <div key={studentId}>
                <button
                  type="button"
                  onClick={() => setExpandedStudentId((id) => (id === studentId ? null : studentId))}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#071952] transition-colors group"
                >
                  {expandedStudentId === studentId ? (
                    <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-white shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white shrink-0" />
                  )}
                  <span className="font-medium text-[#071952] group-hover:text-white transition-colors">{username}</span>
                  <span className="text-sm text-gray-500 group-hover:text-white/70 transition-colors">
                    {count} violation{count !== 1 ? "s" : ""}
                  </span>
                  {count < 3 && (
                    <span className="text-xs font-medium text-[#071952] bg-[#071952]/10 group-hover:bg-white/20 group-hover:text-white px-2 py-0.5 rounded transition-colors">
                      Reported
                    </span>
                  )}
                  {count >= 3 && (
                    <span className="text-xs font-medium text-[#071952] bg-[#071952]/10 group-hover:bg-white/20 group-hover:text-white px-2 py-0.5 rounded transition-colors">
                      Auto-submitted
                    </span>
                  )}
                </button>
                {expandedStudentId === studentId && (
                  <div className="bg-gray-50/80 border-t border-gray-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-200">
                          <th className="px-4 py-2 pl-12 font-medium">Subject</th>
                          <th className="px-4 py-2 font-medium">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((v) => (
                          <tr key={v.id} className="border-b border-gray-100 last:border-0">
                            <td className="px-4 py-2 pl-12 text-[#071952]">{v.subject_name ?? "—"}</td>
                            <td className="px-4 py-2 text-gray-600">
                              {new Date(v.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
