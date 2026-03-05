import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Clock, CheckCircle2, Search, User, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getTeacherSubmissions } from "@/services/submissionService";
import { supabase } from "@/lib/supabase";
import type { SubmissionRow } from "@/lib/database.types";

type TabFilter = "all" | "pending" | "evaluated";

export default function SubmissionsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<(SubmissionRow & { student_username?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
      .channel("submissions-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions", filter: `teacher_id=eq.${profile.id}` },
        () => loadSubmissions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, loadSubmissions]);

  const filteredSubmissions = submissions.filter((s) => {
    if (activeTab !== "all" && s.status !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.subject_name.toLowerCase().includes(q) ||
        (s.student_username && s.student_username.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const evaluatedCount = submissions.filter((s) => s.status === "evaluated").length;

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: submissions.length },
    { key: "pending", label: "Pending", count: pendingCount },
    { key: "evaluated", label: "Evaluated", count: evaluatedCount },
  ];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-gray-900"
        >
          Student Submissions
        </motion.h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition whitespace-nowrap ${
              activeTab === tab.key
                ? "border-[#1e3a8a] bg-[#1e3a8a]/10 text-[#1e3a8a]"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key
                  ? "bg-[#1e3a8a] text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

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
              placeholder="Search by student or subject..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] focus:border-transparent text-sm"
            />
          </div>
        </motion.div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white border border-gray-100 rounded-2xl p-5">
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
            <ClipboardList className="w-8 h-8 text-[#1e3a8a]" />
          </div>
          <p className="text-gray-500 font-medium">No submissions yet.</p>
          <p className="text-gray-400 text-sm mt-1">
            Student submissions will appear here when they send exams for your review.
          </p>
        </motion.div>
      ) : filteredSubmissions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No submissions match your search.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {filteredSubmissions.map((sub, i) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/admin/submissions/${sub.id}`)}
              className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-[#1e3a8a]/20 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                {/* Student avatar */}
                <div className="w-10 h-10 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {sub.student_username?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 group-hover:text-[#1e3a8a] transition-colors truncate">
                      {sub.student_username || "Student"}
                    </h3>
                    <span className="text-xs text-gray-400">-</span>
                    <span className="text-sm text-gray-600 truncate">{sub.subject_name}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">
                      {formatDate(sub.created_at)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {sub.total_marks} marks
                    </span>
                    {sub.status === "evaluated" && sub.total_marks_obtained !== null && (
                      <span className="text-xs font-medium text-emerald-600">
                        Score: {sub.total_marks_obtained}/{sub.total_marks}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2 shrink-0">
                  {sub.evaluation_type === 'ai_teacher' && sub.status === 'pending' && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
                      <Sparkles className="w-3 h-3" />
                      AI Pre-Evaluated
                    </div>
                  )}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                      sub.status === "pending"
                        ? "bg-amber-50 text-amber-600 border border-amber-200"
                        : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    }`}
                  >
                    {sub.status === "pending" ? (
                      <Clock className="w-3 h-3" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    {sub.status === "pending" ? "Pending" : "Evaluated"}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
