import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2,
  MapPin,
  Users,
  Star,
  Briefcase,
  UserPlus,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getJobById, getJobApplications, updateApplicationStatus } from "@/services/jobService";
import { getTopStudentsForJobV2 } from "@/services/skillPointsService";
import type { StudentMatchScoreV2 } from "@/services/skillPointsService";
import { getStudentMatchForJobV2 } from "@/services/skillPointsService";
import type { StudentMatchDetailV2 } from "@/services/skillPointsService";
import { shortlistStudent, removeShortlist, getJobShortlists } from "@/services/jobService";
import type { JobPostingRow, JobApplicationRow } from "@/lib/database.types";
import CandidateAnalyticsPanel from "@/components/CandidateAnalyticsPanel";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-amber-600";
  return "text-gray-500";
}

function scoreBg(score: number): string {
  if (score >= 70) return "bg-green-50";
  if (score >= 40) return "bg-amber-50";
  return "bg-gray-100";
}

function scoreBadgeBorder(score: number): string {
  if (score >= 70) return "border-green-200";
  if (score >= 40) return "border-amber-200";
  return "border-gray-200";
}

function scoreBarColor(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-gray-400";
}

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Core data
  const [job, setJob] = useState<JobPostingRow | null>(null);
  const [topStudents, setTopStudents] = useState<StudentMatchScoreV2[]>([]);
  const [applications, setApplications] = useState<
    (JobApplicationRow & { profiles?: { username: string; email: string } })[]
  >([]);
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"candidates" | "applications">("candidates");

  // Expandable candidate analytics
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
  const [candidateDetails, setCandidateDetails] = useState<Record<string, StudentMatchDetailV2>>({});

  // -----------------------------------------------------------------------
  //  Data loading
  // -----------------------------------------------------------------------

  const loadData = useCallback(async () => {
    if (!jobId) return;
    try {
      const [jobData, candidates, apps, shortlists] = await Promise.all([
        getJobById(jobId),
        getTopStudentsForJobV2(jobId, 50),
        getJobApplications(jobId),
        getJobShortlists(jobId),
      ]);
      setJob(jobData);
      setTopStudents(candidates);
      setApplications(apps);
      setShortlistedIds(new Set(shortlists.map((s) => s.student_id)));
    } catch {
      toast.error("Failed to load job details.");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -----------------------------------------------------------------------
  //  Expand / collapse candidate detail (lazy fetch)
  // -----------------------------------------------------------------------

  const handleExpandCandidate = async (studentId: string) => {
    if (expandedCandidate === studentId) {
      setExpandedCandidate(null);
      return;
    }
    setExpandedCandidate(studentId);
    if (!candidateDetails[studentId] && jobId) {
      const detail = await getStudentMatchForJobV2(studentId, jobId);
      if (detail) {
        setCandidateDetails((prev) => ({ ...prev, [studentId]: detail }));
      }
    }
  };

  // -----------------------------------------------------------------------
  //  Shortlist toggle
  // -----------------------------------------------------------------------

  const handleShortlist = async (studentId: string) => {
    if (!profile || !jobId) return;
    try {
      if (shortlistedIds.has(studentId)) {
        await removeShortlist(jobId, studentId);
        setShortlistedIds((prev) => {
          const next = new Set(prev);
          next.delete(studentId);
          return next;
        });
        toast.success("Removed from shortlist.");
      } else {
        await shortlistStudent(profile.id, jobId, studentId);
        setShortlistedIds((prev) => new Set(prev).add(studentId));
        toast.success("Added to shortlist!");
      }
    } catch {
      toast.error("Failed to update shortlist.");
    }
  };

  // -----------------------------------------------------------------------
  //  Application status
  // -----------------------------------------------------------------------

  const handleApplicationStatus = async (appId: string, status: JobApplicationRow["status"]) => {
    try {
      await updateApplicationStatus(appId, status);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: status as JobApplicationRow["status"] } : a)),
      );
      toast.success(`Application ${status}.`);
    } catch {
      toast.error("Failed to update status.");
    }
  };

  // -----------------------------------------------------------------------
  //  Loading & not-found states
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-[#071952]" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Job not found.</p>
        <button
          onClick={() => navigate("/recruiter/jobs")}
          className="mt-3 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#071952] transition hover:border-[#071952]/20"
        >
          Open Jobs
        </button>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  //  Render
  // -----------------------------------------------------------------------

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-0 pb-10">
      {/* ----------------------------------------------------------------- */}
      {/*  Job Header                                                       */}
      {/* ----------------------------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#071952]">{job.title}</h1>
            <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
              <Briefcase className="w-3.5 h-3.5" />
              {job.company_name}
              {job.location && (
                <>
                  <span className="text-gray-300">·</span>
                  <MapPin className="w-3.5 h-3.5" />
                  {job.location}
                </>
              )}
              <span className="text-gray-300">·</span>
              <span className="capitalize">{job.job_type}</span>
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {job.required_skills?.map((skill, i) => (
                <span
                  key={i}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#071952]/5 text-[#071952]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <span
            className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${
              job.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
            }`}
          >
            {job.is_active ? "Active" : "Inactive"}
          </span>
        </div>
        {job.description && (
          <p className="text-sm text-gray-600 mt-4 leading-relaxed">{job.description}</p>
        )}
      </motion.div>

      {/* ----------------------------------------------------------------- */}
      {/*  Tabs                                                             */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setTab("candidates")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "candidates"
              ? "bg-[#071952] text-white"
              : "bg-white text-gray-500 border border-gray-200 hover:border-[#071952]/30"
          }`}
        >
          <Star className="w-3.5 h-3.5 inline mr-1.5" />
          Top Candidates ({topStudents.length})
        </button>
        <button
          onClick={() => setTab("applications")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "applications"
              ? "bg-[#071952] text-white"
              : "bg-white text-gray-500 border border-gray-200 hover:border-[#071952]/30"
          }`}
        >
          <Users className="w-3.5 h-3.5 inline mr-1.5" />
          Applications ({applications.length})
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/*  Top Candidates Tab                                               */}
      {/* ----------------------------------------------------------------- */}
      {tab === "candidates" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {topStudents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border-2 border-gray-100">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No matching students found yet.</p>
              <p className="text-gray-400 text-xs mt-1">
                Students will appear here as they build relevant skills.
              </p>
            </div>
          ) : (
            topStudents.map((s, i) => {
              const isExpanded = expandedCandidate === s.studentId;
              const detail = candidateDetails[s.studentId] ?? null;

              return (
                <motion.div
                  key={s.studentId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden"
                >
                  {/* Card header — always visible */}
                  <button
                    type="button"
                    onClick={() => handleExpandCandidate(s.studentId)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50/50 transition-colors"
                  >
                    {/* Rank */}
                    <span className="text-xs font-bold text-gray-300 w-5 text-center shrink-0">
                      {i + 1}
                    </span>

                    {/* Avatar */}
                    {s.avatarUrl ? (
                      <img
                        src={s.avatarUrl}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-100 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#071952] flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {s.username.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Name + evidence tags */}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/profile/${s.studentId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm font-semibold text-[#071952] hover:underline truncate block"
                      >
                        {s.username}
                      </Link>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {s.topEvidence.slice(0, 3).map((ev, ei) => (
                          <span
                            key={ei}
                            className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#071952]/5 text-[#071952]/70 font-medium"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Overall score badge */}
                    <div
                      className={`shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-xl border ${scoreBadgeBorder(
                        s.overallScore,
                      )} ${scoreBg(s.overallScore)}`}
                    >
                      <span className={`text-lg font-bold leading-none ${scoreColor(s.overallScore)}`}>
                        {s.overallScore}
                      </span>
                      <span className="text-[9px] text-gray-400">/ 100</span>
                    </div>

                    {/* Top 3 skill mini bars */}
                    <div className="hidden sm:flex flex-col gap-1 w-28 shrink-0">
                      {s.perSkill.slice(0, 3).map((ps) => (
                        <div key={ps.skill} className="flex items-center gap-1.5">
                          <span className="text-[9px] text-gray-400 w-14 truncate" title={ps.skill}>
                            {ps.skill}
                          </span>
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${scoreBarColor(ps.points)}`}
                              style={{ width: `${ps.points}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-semibold text-gray-500 w-5 text-right">
                            {ps.points}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Shortlist button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShortlist(s.studentId);
                      }}
                      className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg transition-colors ${
                        shortlistedIds.has(s.studentId)
                          ? "bg-green-50 text-green-600 hover:bg-green-100"
                          : "bg-[#071952]/5 text-[#071952] hover:bg-[#071952]/10"
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      {shortlistedIds.has(s.studentId) ? "Shortlisted" : "Shortlist"}
                    </button>
                  </button>

                  {/* Expanded analytics panel */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="border-t border-gray-100"
                    >
                      {detail ? (
                        <div className="p-4">
                          <CandidateAnalyticsPanel
                            student={detail}
                            requiredSkills={job.required_skills ?? []}
                            defaultExpanded
                          />
                        </div>
                      ) : (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-[#071952]" />
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })
          )}
        </motion.div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/*  Applications Tab                                                 */}
      {/* ----------------------------------------------------------------- */}
      {tab === "applications" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {applications.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border-2 border-gray-100">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No applications yet.</p>
            </div>
          ) : (
            applications.map((app) => {
              const isExpanded = expandedCandidate === app.student_id;
              const detail = candidateDetails[app.student_id] ?? null;
              const matchScore = app.match_score ?? 0;

              return (
                <div
                  key={app.id}
                  className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden"
                >
                  {/* Application row */}
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar initial */}
                      <div className="w-9 h-9 rounded-full bg-[#071952] flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {app.profiles?.username?.charAt(0).toUpperCase() ?? "?"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/profile/${app.student_id}`}
                          className="text-sm font-medium text-[#071952] hover:underline"
                        >
                          {app.profiles?.username ?? "Unknown"}
                        </Link>

                        {/* Match score bar */}
                        {app.match_score != null && (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${scoreBarColor(matchScore)}`}
                                style={{ width: `${matchScore}%` }}
                              />
                            </div>
                            <span className={`text-xs font-semibold ${scoreColor(matchScore)}`}>
                              {matchScore}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* View Analytics button */}
                      <button
                        type="button"
                        onClick={() => handleExpandCandidate(app.student_id)}
                        className={`text-[10px] font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                          isExpanded
                            ? "bg-[#071952] text-white"
                            : "bg-[#071952]/5 text-[#071952] hover:bg-[#071952]/10"
                        }`}
                      >
                        {isExpanded ? "Hide Analytics" : "View Analytics"}
                      </button>

                      {/* Status badge */}
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          app.status === "applied"
                            ? "bg-blue-50 text-blue-500"
                            : app.status === "shortlisted"
                              ? "bg-green-50 text-green-600"
                              : app.status === "rejected"
                                ? "bg-red-50 text-red-500"
                                : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {app.status}
                      </span>

                      {/* Accept / Reject buttons */}
                      {app.status === "applied" && (
                        <>
                          <button
                            onClick={() => handleApplicationStatus(app.id, "shortlisted")}
                            className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 transition-colors"
                            title="Shortlist"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleApplicationStatus(app.id, "rejected")}
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded analytics */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="border-t border-gray-100"
                    >
                      {detail ? (
                        <div className="p-4">
                          <CandidateAnalyticsPanel
                            student={detail}
                            requiredSkills={job.required_skills ?? []}
                            defaultExpanded
                          />
                        </div>
                      ) : (
                        <div className="flex justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-[#071952]" />
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              );
            })
          )}
        </motion.div>
      )}
    </div>
  );
}
