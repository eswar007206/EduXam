import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2,
  MapPin,
  Briefcase,
  Calendar,
  CheckCircle2,
  Send,
  XCircle,
  DollarSign,
  Clock,
  Globe,
  Building2,
  Award,
  ListChecks,
  Gift,
  BadgeCheck,
  ChevronRight,
} from "lucide-react";
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
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import {
  getJobById,
  applyToJob,
  withdrawApplication,
  getStudentApplications,
} from "@/services/jobService";
import { getStudentMatchForJobV2 } from "@/services/skillPointsService";
import type { StudentMatchDetailV2 } from "@/services/skillPointsService";
import SkillPointsBreakdown from "@/components/SkillPointsBreakdown";
import type { JobPostingRow } from "@/lib/database.types";
import { toast } from "sonner";

/* â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const EXPERIENCE_LABELS: Record<string, string> = {
  entry: "Entry Level",
  mid: "Mid Level",
  senior: "Senior Level",
  lead: "Lead / Manager",
};

const WORKPLACE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string
): string | null {
  if (min === null && max === null) return null;

  const fmt = (value: number) => {
    if (currency === "INR") {
      const lakhs = value / 100000;
      return `\u20B9${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`;
    }
    // USD or other
    const k = value / 1000;
    const symbol = currency === "USD" ? "$" : currency + " ";
    return `${symbol}${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  };

  if (min !== null && max !== null) return `${fmt(min)} - ${fmt(max)}`;
  if (min !== null) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function parseBulletList(text: string | null): string[] {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/* â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export default function JobViewPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const { profile } = useAuth();
  const [job, setJob] = useState<JobPostingRow | null>(null);
  const [matchScore, setMatchScore] = useState(0);
  const [matchDetail, setMatchDetail] = useState<StudentMatchDetailV2 | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

  useEffect(() => {
    if (!jobId || !profile) return;
    (async () => {
      try {
        const [jobData, detail, apps] = await Promise.all([
          getJobById(jobId),
          getStudentMatchForJobV2(profile.id, jobId),
          getStudentApplications(profile.id),
        ]);
        setJob(jobData);
        setMatchDetail(detail);
        setMatchScore(detail?.overallScore ?? 0);
        const existing = apps.find((a) => a.job_id === jobId);
        setApplicationStatus(existing?.status ?? null);
      } catch {
        console.error("Failed to load job.");
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId, profile]);

  /* â”€â”€ Actions â”€â”€ */

  const handleApply = async () => {
    if (!profile || !jobId) return;
    setApplying(true);
    try {
      await applyToJob(jobId, profile.id, matchScore);
      setApplicationStatus("applied");
      toast.success("Application submitted!");
    } catch {
      toast.error("Failed to apply.");
    } finally {
      setApplying(false);
    }
  };

  const handleWithdraw = async () => {
    if (!profile || !jobId) return;
    setApplying(true);
    try {
      await withdrawApplication(jobId, profile.id);
      setApplicationStatus("withdrawn");
      toast.success("Application withdrawn.");
    } catch {
      toast.error("Failed to withdraw.");
    } finally {
      setApplying(false);
    }
  };

  /* â”€â”€ Loading state â”€â”€ */

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#071952]" />
        </div>
      </>
    );
  }

  /* â”€â”€ Not found â”€â”€ */

  if (!job) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 pt-20">
          <p className="text-gray-500">Job not found.</p>
          <Link
            to="/jobs"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#071952] transition hover:border-[#071952]/20"
          >
            Browse Jobs
          </Link>
        </div>
      </>
    );
  }

  /* â”€â”€ Derived data â”€â”€ */

  const postedDate = new Date(job.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const deadlineDate = job.application_deadline
    ? new Date(job.application_deadline).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const isDeadlinePassed = job.application_deadline
    ? new Date(job.application_deadline) < new Date()
    : false;

  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
  const responsibilities = parseBulletList(job.responsibilities);
  const qualifications = parseBulletList(job.qualifications);
  const benefits = parseBulletList(job.benefits);

  const matchColor =
    matchScore >= 70
      ? "text-green-600"
      : matchScore >= 40
      ? "text-amber-600"
      : "text-gray-400";

  const matchBg =
    matchScore >= 70
      ? "bg-green-50 border-green-200"
      : matchScore >= 40
      ? "bg-amber-50 border-amber-200"
      : "bg-gray-50 border-gray-200";

  const matchRingColor =
    matchScore >= 70
      ? "stroke-green-500"
      : matchScore >= 40
      ? "stroke-amber-500"
      : "stroke-gray-300";

  /* â”€â”€ Render â”€â”€ */

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 pt-20">
        <div className="container mx-auto px-4 py-8 max-w-6xl">

          {/* â”€â”€ Two-column layout â”€â”€ */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* â”€â”€â”€â”€â”€â”€ SIDEBAR (right on desktop, top on mobile) â”€â”€â”€â”€â”€â”€ */}
            <aside className="w-full lg:w-[30%] order-first lg:order-last">
              <div className="lg:sticky lg:top-24 space-y-4">
                {/* Match Score Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className={`rounded-2xl border-2 p-6 flex flex-col items-center text-center ${matchBg}`}
                >
                  {/* Circular score ring */}
                  <div className="relative w-28 h-28 mb-3">
                    <svg
                      className="w-full h-full -rotate-90"
                      viewBox="0 0 100 100"
                    >
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        fill="none"
                        className={matchRingColor}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${(matchScore / 100) * 264} 264`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-3xl font-bold ${matchColor}`}>
                        {matchScore}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">
                        / 100
                      </span>
                    </div>
                  </div>
                  <h3 className={`text-sm font-semibold ${matchColor}`}>
                    Your Match Score
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Based on skills, projects, certs, exams &amp; experience
                  </p>
                </motion.div>

                {/* Per-Skill Breakdown */}
                {matchDetail && matchDetail.perSkill.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-2xl border-2 border-gray-100 p-5"
                  >
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Skill Breakdown
                    </h4>
                    <SkillPointsBreakdown perSkill={matchDetail.perSkill} />
                    {matchDetail.topEvidence.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
                        {matchDetail.topEvidence.map((ev, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-[#071952]/5 text-[#071952] font-medium"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Apply / Status Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-white rounded-2xl border-2 border-gray-100 p-5"
                >
                  {applicationStatus === null ? (
                    <>
                      <button
                        onClick={() => setShowApplyConfirm(true)}
                        disabled={applying || isDeadlinePassed}
                        className="w-full py-3 bg-[#071952] hover:bg-[#071952]/90 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {applying ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Apply Now
                          </>
                        )}
                      </button>
                      {isDeadlinePassed && (
                        <p className="text-xs text-red-500 text-center mt-2">
                          Application deadline has passed
                        </p>
                      )}
                    </>
                  ) : applicationStatus === "applied" ? (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <span className="text-sm font-semibold text-green-600">
                          Application Submitted
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Your application has been sent to the recruiter. They
                        can see your profile and exam history.
                      </p>
                      <button
                        onClick={() => setShowWithdrawConfirm(true)}
                        disabled={applying}
                        className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium transition-colors disabled:opacity-50"
                      >
                        {applying ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        Withdraw Application
                      </button>
                    </div>
                  ) : applicationStatus === "shortlisted" ? (
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-semibold text-green-600">
                        You&apos;ve been shortlisted!
                      </span>
                    </div>
                  ) : applicationStatus === "rejected" ? (
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-400" />
                      <span className="text-sm font-medium text-red-500">
                        Application not selected
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">
                        Application withdrawn
                      </span>
                    </div>
                  )}
                </motion.div>

                {/* Quick Info Card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="bg-white rounded-2xl border-2 border-gray-100 p-5 space-y-3"
                >
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Quick Info
                  </h4>

                  {salary && (
                    <div className="flex items-center gap-3 text-sm">
                      <DollarSign className="w-4 h-4 text-[#071952] shrink-0" />
                      <span className="text-gray-700 font-medium">
                        {salary}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    <Award className="w-4 h-4 text-[#071952] shrink-0" />
                    <span className="text-gray-700">
                      {EXPERIENCE_LABELS[job.experience_level] ?? job.experience_level}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="w-4 h-4 text-[#071952] shrink-0" />
                    <span className="text-gray-700">
                      {WORKPLACE_LABELS[job.workplace_type] ?? job.workplace_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="w-4 h-4 text-[#071952] shrink-0" />
                    <span className="text-gray-700 capitalize">
                      {job.job_type}
                    </span>
                  </div>

                  {job.location && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-[#071952] shrink-0" />
                      <span className="text-gray-700">{job.location}</span>
                    </div>
                  )}

                  {deadlineDate && (
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4 text-[#071952] shrink-0" />
                      <div>
                        <span
                          className={`${
                            isDeadlinePassed
                              ? "text-red-500 font-medium"
                              : "text-gray-700"
                          }`}
                        >
                          {isDeadlinePassed ? "Closed " : "Deadline: "}
                          {deadlineDate}
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            </aside>

            {/* â”€â”€â”€â”€â”€â”€ MAIN CONTENT (left) â”€â”€â”€â”€â”€â”€ */}
            <main className="w-full lg:w-[70%] space-y-5">
              {/* Header Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border-2 border-gray-100 p-6 sm:p-8"
              >
                {/* Company logo placeholder + Title */}
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-14 h-14 rounded-xl bg-[#071952]/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-7 h-7 text-[#071952]" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-[#071952] leading-tight">
                      {job.title}
                    </h1>
                    <p className="text-sm text-gray-600 mt-1 font-medium">
                      {job.company_name}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-400">
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Posted {postedDate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tag pills row */}
                <div className="flex flex-wrap gap-2 mb-5">
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-[#071952]/5 text-[#071952]">
                    <Briefcase className="w-3 h-3" />
                    <span className="capitalize">{job.job_type}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-[#071952]/5 text-[#071952]">
                    <Globe className="w-3 h-3" />
                    {WORKPLACE_LABELS[job.workplace_type] ?? job.workplace_type}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-[#071952]/5 text-[#071952]">
                    <Award className="w-3 h-3" />
                    {EXPERIENCE_LABELS[job.experience_level] ?? job.experience_level}
                  </span>
                  {salary && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-green-50 text-green-700">
                      <DollarSign className="w-3 h-3" />
                      {salary}
                    </span>
                  )}
                  {deadlineDate && (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full ${
                        isDeadlinePassed
                          ? "bg-red-50 text-red-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {isDeadlinePassed ? "Closed" : `Deadline: ${deadlineDate}`}
                    </span>
                  )}
                </div>

                {/* Required Skills */}
                {job.required_skills?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Required Skills
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {job.required_skills.map((skill, i) => (
                        <span
                          key={i}
                          className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#071952]/5 text-[#071952] border border-[#071952]/10"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Description Card */}
              {job.description && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="bg-white rounded-2xl border-2 border-gray-100 p-6 sm:p-8"
                >
                  <h2 className="text-base font-bold text-[#071952] mb-3 flex items-center gap-2">
                    <Briefcase className="w-4.5 h-4.5" />
                    About the Role
                  </h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {job.description}
                  </p>
                </motion.div>
              )}

              {/* Responsibilities Card */}
              {responsibilities.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl border-2 border-gray-100 p-6 sm:p-8"
                >
                  <h2 className="text-base font-bold text-[#071952] mb-4 flex items-center gap-2">
                    <ListChecks className="w-4.5 h-4.5" />
                    Responsibilities
                  </h2>
                  <ul className="space-y-2.5">
                    {responsibilities.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                        <ChevronRight className="w-4 h-4 text-[#071952] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Qualifications Card */}
              {qualifications.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-white rounded-2xl border-2 border-gray-100 p-6 sm:p-8"
                >
                  <h2 className="text-base font-bold text-[#071952] mb-4 flex items-center gap-2">
                    <Award className="w-4.5 h-4.5" />
                    Qualifications
                  </h2>
                  <ul className="space-y-2.5">
                    {qualifications.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {/* Benefits Card */}
              {benefits.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white rounded-2xl border-2 border-gray-100 p-6 sm:p-8"
                >
                  <h2 className="text-base font-bold text-[#071952] mb-4 flex items-center gap-2">
                    <Gift className="w-4.5 h-4.5" />
                    Benefits &amp; Perks
                  </h2>
                  <ul className="space-y-2.5">
                    {benefits.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                        <Gift className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Apply Confirmation Dialog */}
      <AlertDialog open={showApplyConfirm} onOpenChange={setShowApplyConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply to this job?</AlertDialogTitle>
            <AlertDialogDescription>
              Your profile, exam history, and match score will be shared with the recruiter at {job.company_name}. You can withdraw your application later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setShowApplyConfirm(false); handleApply(); }}
              className="bg-[#071952] hover:bg-[#071952]/90 text-white"
            >
              <Send className="w-4 h-4 mr-1.5" />
              Apply Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Withdraw Confirmation Dialog */}
      <AlertDialog open={showWithdrawConfirm} onOpenChange={setShowWithdrawConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Withdraw your application?</AlertDialogTitle>
            <AlertDialogDescription>
              Your application to {job.title} at {job.company_name} will be withdrawn. You may not be able to reapply for this position.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setShowWithdrawConfirm(false); handleWithdraw(); }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

