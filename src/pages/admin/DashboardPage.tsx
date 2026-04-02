import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  HelpCircle,
  Users,
  ArrowRight,
  Plus,
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getTeacherStats } from "@/services/adminService";
import { getTeacherSubmissionCount } from "@/services/submissionService";
import { supabase } from "@/lib/supabase";
import { StatCardSkeletonRow } from "@/components/SkeletonLoaders";
import ExamControlPanel from "@/components/admin/ExamControlPanel";

export default function DashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ subjects: 0, questions: 0, students: 0 });
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(() => {
    if (!profile) return;
    Promise.all([
      getTeacherStats(profile.id),
      getTeacherSubmissionCount(profile.id, "pending"),
    ])
      .then(([s, pending]) => {
        setStats(s);
        setPendingSubmissions(pending);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profile]);

  useEffect(() => {
    loadStats();

    if (!profile) return;

    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subjects" },
        () => loadStats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "questions" },
        () => loadStats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "enrollments" },
        () => loadStats()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "submissions" },
        () => loadStats()
      )
      .subscribe();

    return () => {
      // Defer cleanup so WebSocket has time to connect (avoids "closed before connection" in Strict Mode)
      const ch = channel;
      setTimeout(() => {
        try {
          supabase.removeChannel(ch);
        } catch {
          // Ignore if channel was never fully established
        }
      }, 150);
    };
  }, [profile, loadStats]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const cards = [
    {
      label: "Total Subjects",
      value: stats.subjects,
      icon: BookOpen,
      iconBg: "bg-[#071952]/10",
      iconColor: "text-[#071952]",
      valueColor: "text-[#071952]",
      borderColor: "border-black/20",
    },
    {
      label: "Total Questions",
      value: stats.questions,
      icon: HelpCircle,
      iconBg: "bg-[#071952]/10",
      iconColor: "text-[#071952]",
      valueColor: "text-[#071952]",
      borderColor: "border-black/20",
    },
    {
      label: "Enrolled Students",
      value: stats.students,
      icon: Users,
      iconBg: "bg-[#071952]/10",
      iconColor: "text-[#071952]",
      valueColor: "text-[#071952]",
      borderColor: "border-black/20",
    },
    {
      label: "Pending Reviews",
      value: pendingSubmissions,
      icon: ClipboardList,
      iconBg: "bg-[#071952]/10",
      iconColor: "text-[#071952]",
      valueColor: "text-[#071952]",
      borderColor: "border-black/20",
    },
  ];

  const quickActions = [
    {
      label: "Manage Subjects",
      description: "View, create, or edit your subjects",
      icon: BookOpen,
      onClick: () => navigate("/teacher/subjects"),
      iconColor: "text-[#071952]",
      iconBg: "bg-[#071952]/10",
    },
    {
      label: "Add Questions",
      description: "Add new questions to your subjects",
      icon: Plus,
      onClick: () => navigate("/teacher/subjects"),
      iconColor: "text-[#071952]",
      iconBg: "bg-[#071952]/10",
    },
    {
      label: "Review Submissions",
      description: `${pendingSubmissions} submission${pendingSubmissions !== 1 ? "s" : ""} pending review`,
      icon: ClipboardList,
      onClick: () => navigate("/teacher/submissions"),
      iconColor: "text-[#071952]",
      iconBg: "bg-[#071952]/10",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto relative px-2 sm:px-0 pb-10">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-[#071952]">
          {getGreeting()}, {profile?.username || "Teacher"}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          Here's an overview of your teaching activity.
        </p>
      </motion.div>

      {/* Stats Cards */}
      {loading ? (
        <div className="mb-8">
          <StatCardSkeletonRow />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{
                y: -7,
                scale: 1.03,
                boxShadow: "0 24px 48px rgba(7, 25, 82, 0.18)",
                transition: { type: "spring", stiffness: 400, damping: 22, delay: 0 },
              }}
              whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className={`bg-white border-2 ${card.borderColor} rounded-2xl p-5 cursor-pointer`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {card.label}
                  </p>
                  <p className={`text-4xl font-extrabold mt-1 ${card.valueColor}`}>
                    {card.value.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center`}
                >
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <motion.button
              key={action.label}
              type="button"
              onClick={action.onClick}
              whileHover={{
                x: 5,
                boxShadow: "0 12px 32px rgba(7, 25, 82, 0.13)",
                transition: { type: "spring", stiffness: 400, damping: 25, delay: 0 },
              }}
              whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
              className="flex items-center gap-4 p-4 rounded-xl bg-white border-2 border-gray-100 hover:border-[#071952]/25 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#071952]/40 focus-visible:ring-offset-2"
            >
              <div className={`w-11 h-11 rounded-xl ${action.iconBg} flex items-center justify-center shrink-0`}>
                <action.icon className={`w-5 h-5 ${action.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[#071952] text-sm group-hover:text-[#071952] transition-colors">
                  {action.label}
                </p>
                <p className="text-xs text-gray-500">
                  {action.description}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#071952] transition-colors" />
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Exam control & visibility (Start exam, Visible/Hidden per subject) */}
      {profile?.id && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-8"
          aria-labelledby="admin-control-heading"
        >
          <h2 id="admin-control-heading" className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Admin control
          </h2>
          <ExamControlPanel teacherId={profile.id} />
        </motion.div>
      )}

      {/* Tips Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileHover={{
          boxShadow: "0 16px 40px rgba(7, 25, 82, 0.10)",
          transition: { type: "spring", stiffness: 400, damping: 25, delay: 0 },
        }}
        transition={{ delay: 0.5 }}
        className="mt-8 p-5 sm:p-6 rounded-2xl bg-white border-2 border-black/10"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center shrink-0 mt-0.5">
            <TrendingUp className="w-5 h-5 text-black" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#071952]">
              Getting Started
            </p>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Create subjects, add questions across 3 sections (MCQ, Theory, Analytical),
              and share your teacher profile so students can enroll and practice with your question bank.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
