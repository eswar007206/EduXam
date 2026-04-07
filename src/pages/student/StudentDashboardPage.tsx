import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Briefcase,
  ClipboardCheck,
  FileText,
  GraduationCap,
  PenLine,
  Sparkles,
  Target,
  UserCircle,
  UserSearch,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { getStudentEvaluations } from "@/services/submissionService";
import { getStudentEnrollments } from "@/services/enrollmentService";
import { getStudentApplications, getActiveJobs } from "@/services/jobService";
import { getStudentSubjectStats } from "@/services/studentProfileService";
import { calculateProfileCompletion } from "@/utils/profileCompletion";
import {
  getStudentExamEntryPath,
  isStudentNavbarFeatureEnabled,
} from "@/lib/organizationFeatures";
import { EXAM_PORTAL_LABEL } from "@/lib/portalLabels";

type DashboardStats = {
  teacherCount: number;
  resultsCount: number;
  applicationsCount: number;
  activeJobsCount: number;
};

type TopSubject = {
  subjectId: string;
  subjectName: string;
  avgPercent: number;
  totalExams: number;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function StudentDashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    teacherCount: 0,
    resultsCount: 0,
    applicationsCount: 0,
    activeJobsCount: 0,
  });
  const [topSubjects, setTopSubjects] = useState<TopSubject[]>([]);
  const [recentResults, setRecentResults] = useState<
    { id: string; subject_name: string; total_marks_obtained: number | null; total_marks: number; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const showStudentFindTeachers = isStudentNavbarFeatureEnabled(profile, "find_teachers");
  const showStudentResults = isStudentNavbarFeatureEnabled(profile, "my_results");
  const showStudentJobs = isStudentNavbarFeatureEnabled(profile, "jobs");
  const showStudentMyProfile = isStudentNavbarFeatureEnabled(profile, "my_profile");
  const studentExamEntryPath = getStudentExamEntryPath(profile);
  const profileCompletion = profile ? calculateProfileCompletion(profile) : null;

  useEffect(() => {
    if (!profile || profile.role !== "student") {
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [
          enrollments,
          evaluations,
          applications,
          subjectStats,
          activeJobs,
        ] = await Promise.all([
          getStudentEnrollments(profile.id),
          getStudentEvaluations(profile.id),
          getStudentApplications(profile.id),
          getStudentSubjectStats(profile.id),
          showStudentJobs ? getActiveJobs() : Promise.resolve([]),
        ]);

        if (!mounted) {
          return;
        }

        setStats({
          teacherCount: enrollments.length,
          resultsCount: evaluations.length,
          applicationsCount: applications.filter((application) => application.status !== "withdrawn").length,
          activeJobsCount: activeJobs.length,
        });
        setTopSubjects(
          [...subjectStats]
            .sort((a, b) => b.avgPercent - a.avgPercent)
            .slice(0, 3)
            .map((subject) => ({
              subjectId: subject.subjectId,
              subjectName: subject.subjectName,
              avgPercent: subject.avgPercent,
              totalExams: subject.totalExams,
            }))
        );
        setRecentResults(
          evaluations.slice(0, 4).map((evaluation) => ({
            id: evaluation.id,
            subject_name: evaluation.subject_name,
            total_marks_obtained: evaluation.total_marks_obtained,
            total_marks: evaluation.total_marks,
            created_at: evaluation.created_at,
          }))
        );
      } catch (error) {
        console.error("Failed to load student dashboard:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [profile, showStudentJobs]);

  const statCards = useMemo(() => {
    const baseCards = [
      {
        label: "Connected Teachers",
        value: stats.teacherCount,
        icon: Users,
        tone: "from-sky-50 to-white text-sky-900 border-sky-100",
      },
      {
        label: "Results Ready",
        value: stats.resultsCount,
        icon: ClipboardCheck,
        tone: "from-amber-50 to-white text-amber-900 border-amber-100",
      },
      {
        label: "Profile Readiness",
        value: profileCompletion ? `${profileCompletion.percentage}%` : "0%",
        icon: UserCircle,
        tone: "from-emerald-50 to-white text-emerald-900 border-emerald-100",
      },
    ];

    if (showStudentJobs) {
      return [
        ...baseCards,
        {
          label: "Live Job Openings",
          value: stats.activeJobsCount,
          icon: Briefcase,
          tone: "from-violet-50 to-white text-violet-900 border-violet-100",
        },
      ];
    }

    return [
      ...baseCards,
      {
        label: "Active Applications",
        value: stats.applicationsCount,
        icon: FileText,
        tone: "from-violet-50 to-white text-violet-900 border-violet-100",
      },
    ];
  }, [profileCompletion, showStudentJobs, stats]);

  const quickActions = useMemo(() => {
    const actions = [
      {
        title: studentExamEntryPath === "/exam-practice" ? "Continue Practice" : `Open ${EXAM_PORTAL_LABEL}`,
        description:
          studentExamEntryPath === "/exam-practice"
            ? "Pick a subject and continue your prep workflow."
            : "Open your assigned exam flow inside the app.",
        to: studentExamEntryPath,
        icon: PenLine,
        visible: true,
      },
      {
        title: `Open ${EXAM_PORTAL_LABEL}`,
        description: "Write your scheduled exam without leaving the portal.",
        to: "/main-exam",
        icon: FileText,
        visible: true,
      },
      {
        title: "Find Teachers",
        description: "Connect with teachers and unlock guided practice.",
        to: "/teachers",
        icon: UserSearch,
        visible: showStudentFindTeachers,
      },
      {
        title: "View Results",
        description: "Review evaluated attempts and download feedback.",
        to: "/my-results",
        icon: ClipboardCheck,
        visible: showStudentResults,
      },
      {
        title: "Analytics Hub",
        description: "Open attempt, subject, and profile analytics from one page.",
        to: "/student/analytics",
        icon: BarChart3,
        visible: showStudentResults,
      },
      {
        title: "Job Board",
        description: "Browse live openings matched to your exam-backed skills.",
        to: "/jobs",
        icon: Briefcase,
        visible: showStudentJobs,
      },
      {
        title: "My Profile",
        description: "Keep your recruiter-ready student profile polished.",
        to: profile ? `/profile/${profile.id}` : "/student/dashboard",
        icon: UserCircle,
        visible: showStudentMyProfile && Boolean(profile),
      },
    ];

    return actions.filter((action) => action.visible);
  }, [
    profile,
    showStudentFindTeachers,
    showStudentJobs,
    showStudentMyProfile,
    showStudentResults,
    studentExamEntryPath,
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="pt-20">
        <div className="container mx-auto px-4 py-8">
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]"
          >
            <div className="grid gap-6 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.12),_transparent_34%),linear-gradient(135deg,_#ffffff,_#f8fafc)] p-6 sm:p-8 lg:grid-cols-[1.4fr_0.8fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-800">
                  <Sparkles className="h-3.5 w-3.5" />
                  Student Dashboard
                </div>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  {getGreeting()}, {profile?.username ?? "Student"}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  Stay on top of practice, results, profile progress, and career opportunities from one
                  focused portal instead of bouncing between pages.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to={studentExamEntryPath}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#071952] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#071952]/90"
                  >
                    <PenLine className="h-4 w-4" />
                    {studentExamEntryPath === "/exam-practice" ? "Start Practice" : `Open ${EXAM_PORTAL_LABEL}`}
                  </Link>
                  {showStudentResults && (
                    <Link
                      to="/my-results"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#071952]/30 hover:text-[#071952]"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      Review Results
                    </Link>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Readiness
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {profileCompletion?.percentage ?? 0}%
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Your student profile completion score
                    </p>
                  </div>
                  {profile?.is_university_verified && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Verified
                    </div>
                  )}
                </div>

                <div className="mt-5 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500"
                    style={{ width: `${profileCompletion?.percentage ?? 0}%` }}
                  />
                </div>

                <div className="mt-5 space-y-2">
                  {(profileCompletion?.sections ?? []).slice(0, 4).map((section) => (
                    <div key={section.key} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span className="text-sm font-medium text-slate-700">{section.label}</span>
                      <span
                        className={`text-xs font-semibold ${
                          section.completed ? "text-emerald-600" : "text-slate-400"
                        }`}
                      >
                        {section.completed ? "Complete" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>

                {showStudentMyProfile && profile && (
                  <Link
                    to={`/profile/${profile.id}`}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#071952] transition hover:text-[#071952]/80"
                  >
                    Open profile
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          </motion.section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-36 animate-pulse rounded-3xl border border-slate-200 bg-white"
                  />
                ))
              : statCards.map((card, index) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className={`rounded-3xl border bg-gradient-to-br p-5 shadow-sm ${card.tone}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                          {card.label}
                        </p>
                        <p className="mt-3 text-3xl font-bold text-current">{card.value}</p>
                      </div>
                      <div className="rounded-2xl bg-white/80 p-3 text-current shadow-sm">
                        <card.icon className="h-5 w-5" />
                      </div>
                    </div>
                  </motion.div>
                ))}
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Quick Actions
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">Move through your workflow faster</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {quickActions.map((action) => (
                  <Link
                    key={action.title}
                    to={action.to}
                    className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-[#071952]/20 hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-white p-3 text-[#071952] shadow-sm">
                        <action.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-slate-900">{action.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{action.description}</p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 text-slate-300 transition group-hover:text-[#071952]" />
                    </div>
                  </Link>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Performance Snapshot
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">Top subject momentum</h2>

              <div className="mt-5 space-y-4">
                {topSubjects.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    Complete a few evaluated attempts to start seeing subject trends here.
                  </div>
                ) : (
                  topSubjects.map((subject) => (
                    <div key={subject.subjectId} className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{subject.subjectName}</p>
                          <p className="mt-1 text-xs text-slate-500">{subject.totalExams} evaluated attempts</p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#071952] shadow-sm">
                          <Target className="h-4 w-4" />
                          {subject.avgPercent}%
                        </div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#071952] to-sky-500"
                          style={{ width: `${Math.min(subject.avgPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Portal Summary
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-900">What to focus on next</h2>

              <div className="mt-5 space-y-3">
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                  <div className="rounded-2xl bg-white p-2.5 text-[#071952] shadow-sm">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Teacher network</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {stats.teacherCount > 0
                        ? `You are connected to ${stats.teacherCount} teacher${stats.teacherCount === 1 ? "" : "s"}.`
                        : "Connect with a teacher to unlock guided prep and subject banks."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                  <div className="rounded-2xl bg-white p-2.5 text-[#071952] shadow-sm">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Exam momentum</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {stats.resultsCount > 0
                        ? `You already have ${stats.resultsCount} reviewed attempt${stats.resultsCount === 1 ? "" : "s"} to learn from.`
                        : "Start with a practice or main exam attempt to build momentum here."}
                    </p>
                  </div>
                </div>

                {showStudentJobs && (
                  <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                    <div className="rounded-2xl bg-white p-2.5 text-[#071952] shadow-sm">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Career readiness</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {stats.activeJobsCount > 0
                          ? `${stats.activeJobsCount} active role${stats.activeJobsCount === 1 ? "" : "s"} are available in the job portal today.`
                          : "The job portal will show openings here as soon as recruiters publish them."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Recent Results
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">Latest evaluated attempts</h2>
                </div>
                {showStudentResults && (
                  <Link
                    to="/my-results"
                    className="text-sm font-semibold text-[#071952] transition hover:text-[#071952]/80"
                  >
                    See all
                  </Link>
                )}
              </div>

              <div className="mt-5 space-y-3">
                {recentResults.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    Once your attempts are evaluated, they will show up here for quick review.
                  </div>
                ) : (
                  recentResults.map((result) => {
                    const percentage =
                      result.total_marks > 0 && result.total_marks_obtained !== null
                        ? Math.round((result.total_marks_obtained / result.total_marks) * 100)
                        : 0;

                    return (
                      <div key={result.id} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">{result.subject_name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(result.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#071952]">
                            {result.total_marks_obtained ?? 0}/{result.total_marks}
                          </p>
                          <p className="text-xs text-slate-500">{percentage}%</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </section>
        </div>
      </div>
    </div>
  );
}
