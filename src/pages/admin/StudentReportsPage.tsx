import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  User,
  Users,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Clock,
  CheckCircle2,
  ArrowRight,
  FileBarChart,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getTeacherSubmissions } from "@/services/submissionService";
import { supabase } from "@/lib/supabase";
import type { SubmissionRow } from "@/lib/database.types";

// ── Types ──

interface SubjectReport {
  subject_id: string;
  subject_name: string;
  submissions: (SubmissionRow & { student_username?: string })[];
  totalSubmissions: number;
  evaluatedCount: number;
  pendingCount: number;
  averageScore: number | null;
  bestScore: number | null;
}

interface StudentReport {
  student_id: string;
  student_username: string;
  subjects: SubjectReport[];
  totalSubmissions: number;
  evaluatedCount: number;
  pendingCount: number;
  overallAveragePercentage: number | null;
}

// ── Grouping logic ──

function groupSubmissionsByStudent(
  submissions: (SubmissionRow & { student_username?: string })[]
): StudentReport[] {
  const studentMap = new Map<
    string,
    {
      username: string;
      subjectMap: Map<string, (SubmissionRow & { student_username?: string })[]>;
    }
  >();

  for (const sub of submissions) {
    if (!studentMap.has(sub.student_id)) {
      studentMap.set(sub.student_id, {
        username: sub.student_username || "Student",
        subjectMap: new Map(),
      });
    }
    const student = studentMap.get(sub.student_id)!;
    if (!student.subjectMap.has(sub.subject_id)) {
      student.subjectMap.set(sub.subject_id, []);
    }
    student.subjectMap.get(sub.subject_id)!.push(sub);
  }

  const result: StudentReport[] = [];

  for (const [studentId, { username, subjectMap }] of studentMap) {
    const subjects: SubjectReport[] = [];
    let totalEval = 0;
    let totalPending = 0;
    let totalSubs = 0;
    const percentages: number[] = [];

    for (const [subjectId, subs] of subjectMap) {
      const evaluated = subs.filter((s) => s.status === "evaluated");
      const pending = subs.filter((s) => s.status === "pending");
      const scores = evaluated
        .filter((s) => s.total_marks_obtained !== null && s.total_marks > 0)
        .map((s) => (s.total_marks_obtained! / s.total_marks) * 100);

      const avg =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : null;
      const best = scores.length > 0 ? Math.max(...scores) : null;

      if (avg !== null) percentages.push(avg);

      subjects.push({
        subject_id: subjectId,
        subject_name: subs[0].subject_name,
        submissions: subs,
        totalSubmissions: subs.length,
        evaluatedCount: evaluated.length,
        pendingCount: pending.length,
        averageScore: avg,
        bestScore: best,
      });

      totalSubs += subs.length;
      totalEval += evaluated.length;
      totalPending += pending.length;
    }

    subjects.sort((a, b) => a.subject_name.localeCompare(b.subject_name));

    result.push({
      student_id: studentId,
      student_username: username,
      subjects,
      totalSubmissions: totalSubs,
      evaluatedCount: totalEval,
      pendingCount: totalPending,
      overallAveragePercentage:
        percentages.length > 0
          ? percentages.reduce((a, b) => a + b, 0) / percentages.length
          : null,
    });
  }

  result.sort((a, b) => a.student_username.localeCompare(b.student_username));
  return result;
}

// ── Helpers ──

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

function getGradeColor(percentage: number): string {
  if (percentage >= 80) return "text-emerald-600";
  if (percentage >= 60) return "text-blue-600";
  if (percentage >= 40) return "text-amber-600";
  return "text-red-600";
}

// ── Component ──

export default function StudentReportsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [submissions, setSubmissions] = useState<
    (SubmissionRow & { student_username?: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(
    null
  );

  const loadSubmissions = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await getTeacherSubmissions(profile.id);
      setSubmissions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadSubmissions();

    if (!profile) return;

    const channel = supabase
      .channel("reports-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "submissions",
          filter: `teacher_id=eq.${profile.id}`,
        },
        () => loadSubmissions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, loadSubmissions]);

  const studentReports = useMemo(
    () => groupSubmissionsByStudent(submissions),
    [submissions]
  );

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return studentReports;
    const q = searchQuery.toLowerCase();
    return studentReports.filter((r) =>
      r.student_username.toLowerCase().includes(q)
    );
  }, [studentReports, searchQuery]);

  // Summary stats
  const totalStudents = studentReports.length;
  const totalSubmissions = submissions.length;
  const evaluatedSubmissions = submissions.filter(
    (s) => s.status === "evaluated"
  );
  const overallAvg =
    evaluatedSubmissions.length > 0
      ? evaluatedSubmissions
          .filter((s) => s.total_marks_obtained !== null && s.total_marks > 0)
          .reduce(
            (acc, s) => acc + (s.total_marks_obtained! / s.total_marks) * 100,
            0
          ) /
        evaluatedSubmissions.filter(
          (s) => s.total_marks_obtained !== null && s.total_marks > 0
        ).length
      : null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-gray-900"
        >
          Student Reports
        </motion.h1>
      </div>

      {/* Summary Stats */}
      {!loading && submissions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-4 mb-6"
        >
          <div className="bg-white border-2 border-gray-100 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1e3a8a]/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#1e3a8a]" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-900">
                  {totalStudents}
                </p>
                <p className="text-xs text-gray-500 font-medium">Students</p>
              </div>
            </div>
          </div>
          <div className="bg-white border-2 border-gray-100 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1e3a8a]/10 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-[#1e3a8a]" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-900">
                  {totalSubmissions}
                </p>
                <p className="text-xs text-gray-500 font-medium">
                  Submissions
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white border-2 border-gray-100 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1e3a8a]/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#1e3a8a]" />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-gray-900">
                  {overallAvg !== null ? `${Math.round(overallAvg)}%` : "—"}
                </p>
                <p className="text-xs text-gray-500 font-medium">Avg Score</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search */}
      {!loading && submissions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm"
            />
          </div>
        </motion.div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse bg-white border border-gray-100 rounded-2xl p-5"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-100 rounded mb-2" />
                  <div className="h-3 w-48 bg-gray-100 rounded" />
                </div>
                <div className="h-6 w-20 bg-gray-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#1e3a8a]/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-[#1e3a8a]" />
          </div>
          <p className="text-gray-500 font-medium">No student reports yet.</p>
          <p className="text-gray-400 text-sm mt-1">
            Reports will appear here when students send you exam submissions.
          </p>
        </motion.div>
      ) : filteredReports.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">
            No students match your search.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((student, i) => {
            const isExpanded = expandedStudentId === student.student_id;

            return (
              <motion.div
                key={student.student_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-[#1e3a8a]/20"
              >
                {/* Student Header (clickable) */}
                <button
                  onClick={() =>
                    setExpandedStudentId(isExpanded ? null : student.student_id)
                  }
                  className="w-full flex items-center gap-4 p-5 text-left"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {student.student_username.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {student.student_username}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500">
                        {student.subjects.length}{" "}
                        {student.subjects.length === 1
                          ? "subject"
                          : "subjects"}
                      </span>
                      <span className="text-xs text-gray-300">-</span>
                      <span className="text-xs text-gray-500">
                        {student.totalSubmissions}{" "}
                        {student.totalSubmissions === 1
                          ? "submission"
                          : "submissions"}
                      </span>
                      {student.overallAveragePercentage !== null && (
                        <>
                          <span className="text-xs text-gray-300">-</span>
                          <span
                            className={`text-xs font-semibold ${getGradeColor(
                              student.overallAveragePercentage
                            )}`}
                          >
                            Avg: {Math.round(student.overallAveragePercentage)}%
                            ({getGrade(student.overallAveragePercentage)})
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    {student.pendingCount > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
                        <Clock className="w-3 h-3" />
                        {student.pendingCount}
                      </span>
                    )}
                    {student.evaluatedCount > 0 && (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        {student.evaluatedCount}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded: Subject details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
                        {student.subjects.map((subject) => (
                          <div
                            key={subject.subject_id}
                            className="rounded-xl border border-gray-200 overflow-hidden"
                          >
                            {/* Subject header */}
                            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                              <BookOpen className="w-4 h-4 text-[#1e3a8a]" />
                              <h4 className="font-semibold text-sm text-gray-900 flex-1">
                                {subject.subject_name}
                              </h4>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                {subject.averageScore !== null && (
                                  <span
                                    className={`font-semibold ${getGradeColor(
                                      subject.averageScore
                                    )}`}
                                  >
                                    Avg: {Math.round(subject.averageScore)}%
                                  </span>
                                )}
                                {subject.bestScore !== null && (
                                  <span className="text-gray-400">
                                    Best: {Math.round(subject.bestScore)}%
                                  </span>
                                )}
                                <span className="text-gray-400">
                                  {subject.totalSubmissions}{" "}
                                  {subject.totalSubmissions === 1
                                    ? "test"
                                    : "tests"}
                                </span>
                              </div>
                            </div>

                            {/* Submission list */}
                            <div className="divide-y divide-gray-100">
                              {subject.submissions.map((sub) => (
                                <button
                                  key={sub.id}
                                  onClick={() =>
                                    navigate(`/admin/submissions/${sub.id}`)
                                  }
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
                                >
                                  <span className="text-xs text-gray-400 w-32 shrink-0">
                                    {formatDate(sub.created_at)}
                                  </span>

                                  <div
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                                      sub.status === "pending"
                                        ? "bg-amber-50 text-amber-600"
                                        : "bg-emerald-50 text-emerald-600"
                                    }`}
                                  >
                                    {sub.status === "pending" ? (
                                      <Clock className="w-3 h-3" />
                                    ) : (
                                      <CheckCircle2 className="w-3 h-3" />
                                    )}
                                    {sub.status === "pending"
                                      ? "Pending"
                                      : "Evaluated"}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    {sub.status === "evaluated" &&
                                      sub.total_marks_obtained !== null && (
                                        <span className="text-sm font-medium text-gray-900">
                                          {sub.total_marks_obtained}/
                                          {sub.total_marks}
                                          <span className="text-gray-400 ml-1.5">
                                            (
                                            {sub.total_marks > 0
                                              ? Math.round(
                                                  (sub.total_marks_obtained /
                                                    sub.total_marks) *
                                                    100
                                                )
                                              : 0}
                                            %)
                                          </span>
                                        </span>
                                      )}
                                  </div>

                                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#1e3a8a] transition-colors shrink-0" />
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
