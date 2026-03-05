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
      supabase.removeChannel(channel);
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
      iconBg: "bg-[#1e3a8a]/10",
      iconColor: "text-[#1e3a8a]",
      valueColor: "text-[#1e3a8a]",
      borderColor: "border-[#1e3a8a]/20",
    },
    {
      label: "Total Questions",
      value: stats.questions,
      icon: HelpCircle,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-700",
      borderColor: "border-emerald-200",
    },
    {
      label: "Enrolled Students",
      value: stats.students,
      icon: Users,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
      valueColor: "text-blue-700",
      borderColor: "border-blue-200",
    },
    {
      label: "Pending Reviews",
      value: pendingSubmissions,
      icon: ClipboardList,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-600",
      valueColor: "text-amber-700",
      borderColor: "border-amber-200",
    },
  ];

  const quickActions = [
    {
      label: "Manage Subjects",
      description: "View, create, or edit your subjects",
      icon: BookOpen,
      onClick: () => navigate("/admin/subjects"),
      iconColor: "text-[#1e3a8a]",
      iconBg: "bg-[#1e3a8a]/10",
    },
    {
      label: "Add Questions",
      description: "Add new questions to your subjects",
      icon: Plus,
      onClick: () => navigate("/admin/subjects"),
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-500/10",
    },
    {
      label: "Review Submissions",
      description: `${pendingSubmissions} submission${pendingSubmissions !== 1 ? "s" : ""} pending review`,
      icon: ClipboardList,
      onClick: () => navigate("/admin/submissions"),
      iconColor: "text-amber-600",
      iconBg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
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
              transition={{ delay: i * 0.1 }}
              className={`bg-white border-2 ${card.borderColor} rounded-2xl p-5 hover:shadow-lg transition-all duration-200`}
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
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex items-center gap-4 p-4 rounded-xl bg-white border-2 border-gray-100 hover:border-[#1e3a8a]/20 hover:shadow-md transition-all duration-200 text-left group"
            >
              <div className={`w-11 h-11 rounded-xl ${action.iconBg} flex items-center justify-center shrink-0`}>
                <action.icon className={`w-5 h-5 ${action.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm group-hover:text-[#1e3a8a] transition-colors">
                  {action.label}
                </p>
                <p className="text-xs text-gray-500">
                  {action.description}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#1e3a8a] group-hover:translate-x-0.5 transition-all" />
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tips Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 p-5 rounded-2xl bg-white border-2 border-[#1e3a8a]/10"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1e3a8a]/10 flex items-center justify-center shrink-0 mt-0.5">
            <TrendingUp className="w-5 h-5 text-[#1e3a8a]" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">
              Getting Started
            </p>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Create subjects, add questions across 4 categories (MCQ, Short, Medium, Long answers),
              and share your teacher profile so students can enroll and practice with your question bank.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
