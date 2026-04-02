import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Clock, CheckCircle2, Search, User, Sparkles, Unlock, Lock, Loader2, Trash2, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getTeacherSubmissions, deleteAllSubmissionsForTeacher, getSubjectUuid } from "@/services/submissionService";
import {
  getRetakePermissionsForTeacher,
  grantRetakePermission,
  revokeRetakePermission,
  retakeKey,
} from "@/services/examRetakeService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import type { SubmissionRow } from "@/lib/database.types";
import ExamTypeBadge from "@/components/ExamTypeBadge";

type TabFilter = "all" | "pending" | "evaluated";

export default function SubmissionsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<(SubmissionRow & { student_username?: string })[]>([]);
  const [retakeSet, setRetakeSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [retakeActionKey, setRetakeActionKey] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [subjectIdToUuid, setSubjectIdToUuid] = useState<Record<string, string>>({});

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

  const loadRetakePermissions = useCallback(async () => {
    if (!profile) return;
    try {
      const set = await getRetakePermissionsForTeacher(profile.id);
      setRetakeSet(set);
    } catch (e) {
      console.error(e);
    }
  }, [profile]);

  useEffect(() => {
    loadSubmissions();
    loadRetakePermissions();
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
      const ch = channel;
      setTimeout(() => supabase.removeChannel(ch), 0);
    };
  }, [profile, loadSubmissions, loadRetakePermissions]);

  // Resolve subject_id (slug or UUID) to UUID for retake key display
  useEffect(() => {
    if (submissions.length === 0) return;
    const ids = [...new Set(submissions.map((s) => s.subject_id))];
    const missing = ids.filter((id) => !subjectIdToUuid[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    const map: Record<string, string> = {};
    Promise.all(missing.map(async (id) => ({ id, uuid: await getSubjectUuid(id).catch(() => id) })))
      .then((pairs) => {
        if (cancelled) return;
        pairs.forEach(({ id, uuid }) => { map[id] = uuid; });
        setSubjectIdToUuid((prev) => ({ ...prev, ...map }));
      });
    return () => { cancelled = true; };
  }, [submissions]);

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

  const handleClearAllConfirm = async () => {
    if (!profile) return;
    setIsClearingAll(true);
    try {
      await deleteAllSubmissionsForTeacher(profile.id);
      setShowClearAllConfirm(false);
      await loadSubmissions();
      await loadRetakePermissions();
    } catch (err) {
      console.error(err);
    } finally {
      setIsClearingAll(false);
    }
  };

  const handleRetakeToggle = async (e: React.MouseEvent, sub: SubmissionRow) => {
    e.stopPropagation();
    if (!profile) return;
    if (sub.exam_type !== "main") return;
    setRetakeActionKey(retakeKey(sub.student_id, sub.subject_id));
    try {
      const subjectUuid = await getSubjectUuid(sub.subject_id);
      const key = retakeKey(sub.student_id, subjectUuid);
      if (retakeSet.has(key)) {
        await revokeRetakePermission(profile.id, sub.student_id, subjectUuid);
        setRetakeSet((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      } else {
        await grantRetakePermission(profile.id, sub.student_id, subjectUuid);
        setRetakeSet((prev) => new Set(prev).add(key));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRetakeActionKey(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-[#071952]"
        >
          Student Submissions
        </motion.h1>
        {submissions.length > 0 && (
          <button
            type="button"
            onClick={() => setShowClearAllConfirm(true)}
            disabled={isClearingAll}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-[#071952]/20 bg-[#071952]/5 text-[#071952] hover:bg-[#071952] hover:text-white disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
            title="Permanently delete all submission reports"
          >
            {isClearingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Clear all reports
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => {
          const colorMap: Record<string, { active: string; badge: string; inactiveBadge: string; inactive: string }> = {
            all:       { active: "border-[#071952] bg-[#071952]/10 text-[#071952]",     badge: "bg-[#071952] text-white",         inactiveBadge: "bg-[#071952]/10 text-[#071952]",       inactive: "border-gray-200 text-[#071952]/50 hover:border-[#071952]/30" },
            pending:   { active: "border-amber-500 bg-amber-50 text-amber-700",          badge: "bg-amber-500 text-white",          inactiveBadge: "bg-amber-100 text-amber-500",           inactive: "border-gray-200 text-amber-400 hover:border-amber-300" },
            evaluated: { active: "border-emerald-500 bg-emerald-50 text-emerald-700",    badge: "bg-emerald-500 text-white",        inactiveBadge: "bg-emerald-100 text-emerald-500",       inactive: "border-gray-200 text-emerald-400 hover:border-emerald-300" },
          };
          const colors = colorMap[tab.key];
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition whitespace-nowrap ${
                isActive ? colors.active : colors.inactive
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? colors.badge : colors.inactiveBadge
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
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
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[#071952] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#071952]/30 focus:border-[#071952] text-sm"
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
          <div className="w-16 h-16 rounded-2xl bg-[#071952]/10 flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-[#071952]" />
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
              onClick={() => navigate(`/teacher/submissions/${sub.id}`)}
              className="bg-white border-2 border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-[#071952]/20 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                {/* Student avatar */}
                <div className="w-10 h-10 rounded-full bg-[#071952] flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {sub.student_username?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#071952] group-hover:text-[#071952]/70 transition-colors truncate">
                      {sub.student_username || "Student"}
                    </h3>
                    <span className="text-xs text-[#071952]/30">-</span>
                    <span className="text-sm text-[#071952]/60 truncate">{sub.subject_name}</span>
                    <ExamTypeBadge examType={sub.exam_type ?? "main"} compact />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-[#071952]/50">
                      {formatDate(sub.created_at)}
                    </span>
                    <span className="text-xs text-[#071952]/50">
                      {sub.total_marks} marks
                    </span>
                    {sub.status === "evaluated" && sub.total_marks_obtained !== null && (
                      <span className="text-xs font-medium text-[#071952]">
                        Score: {sub.total_marks_obtained}/{sub.total_marks}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status badge + Re-attempt */}
                <div className="flex items-center gap-2 shrink-0">
                  {sub.submitted_due_to_violations && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#071952]/5 text-[#071952] border border-[#071952]/20" title="Auto-submitted after 3 fullscreen violations">
                      <ShieldAlert className="w-3 h-3" />
                      Auto-submitted (violations)
                    </div>
                  )}
                  {sub.exam_type === "main" ? (() => {
                    const subjectUuid = subjectIdToUuid[sub.subject_id] ?? sub.subject_id;
                    const retakeKeyForRow = retakeKey(sub.student_id, subjectUuid);
                    return (
                  <button
                    type="button"
                    onClick={(e) => handleRetakeToggle(e, sub)}
                    disabled={retakeActionKey === retakeKey(sub.student_id, sub.subject_id)}
                    title={retakeSet.has(retakeKeyForRow) ? "Revoke re-attempt permission" : "Allow student to re-attempt this exam"}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      retakeSet.has(retakeKeyForRow)
                        ? "bg-[#071952]/5 text-[#071952] border-[#071952]/20 hover:bg-[#071952] hover:text-white"
                        : "bg-[#071952]/5 text-[#071952]/60 border-[#071952]/15 hover:bg-[#071952] hover:text-white"
                    }`}
                  >
                    {retakeActionKey === retakeKey(sub.student_id, sub.subject_id) ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : retakeSet.has(retakeKeyForRow) ? (
                      <>
                        <Unlock className="w-3 h-3" />
                        Re-attempt allowed
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        Allow re-attempt
                      </>
                    )}
                  </button>
                    );
                  })() : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-sky-50 text-sky-700 border-sky-200">
                      <Unlock className="w-3 h-3" />
                      Unlimited prep attempts
                    </div>
                  )}
                  {sub.evaluation_type === 'ai_teacher' && sub.status === 'pending' && (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#071952]/5 text-[#071952] border border-[#071952]/20">
                      <Sparkles className="w-3 h-3" />
                      Super Teacher Pre-Evaluated
                    </div>
                  )}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                      sub.status === "pending"
                        ? "bg-[#071952]/5 text-[#071952] border border-[#071952]/20"
                        : "bg-[#071952]/5 text-[#071952] border border-[#071952]/20"
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

      <AlertDialog open={showClearAllConfirm} onOpenChange={setShowClearAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all student reports?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all submission reports. Students will need to re-submit if you run the exam again. This cannot be undone. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllConfirm}
              disabled={isClearingAll}
              className="bg-[#071952] hover:bg-[#071952]/80"
            >
              {isClearingAll ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
              ) : null}
              Clear all reports
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
