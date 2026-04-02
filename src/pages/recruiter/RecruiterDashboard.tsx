import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  Users,
  ArrowRight,
  Plus,
  TrendingUp,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

export default function RecruiterDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalJobs: 0, activeJobs: 0, totalApplications: 0, totalShortlisted: 0 });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!profile) return;
    try {
      const [jobsRes, applicationsRes, shortlistRes] = await Promise.all([
        supabase
          .from("job_postings")
          .select("id, is_active")
          .eq("recruiter_id", profile.id),
        supabase
          .from("job_applications")
          .select("id, job_id, job_postings!inner(recruiter_id)")
          .eq("job_postings.recruiter_id", profile.id),
        supabase
          .from("recruiter_shortlists")
          .select("id")
          .eq("recruiter_id", profile.id),
      ]);

      const jobs = jobsRes.data ?? [];
      const applications = applicationsRes.data ?? [];
      const shortlists = shortlistRes.data ?? [];

      setStats({
        totalJobs: jobs.length,
        activeJobs: jobs.filter((j) => j.is_active).length,
        totalApplications: applications.length,
        totalShortlisted: shortlists.length,
      });
    } catch (err) {
      console.error("Failed to load recruiter stats:", err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const cards = [
    {
      label: "Total Jobs",
      value: stats.totalJobs,
      icon: Briefcase,
      iconBg: "bg-[#071952]/10",
      iconColor: "text-[#071952]",
      valueColor: "text-[#071952]",
      borderColor: "border-black/20",
    },
    {
      label: "Active Jobs",
      value: stats.activeJobs,
      icon: CheckCircle2,
      iconBg: "bg-[#071952]/10",
      iconColor: "text-[#071952]",
      valueColor: "text-[#071952]",
      borderColor: "border-black/20",
    },
    {
      label: "Applications",
      value: stats.totalApplications,
      icon: ClipboardList,
      iconBg: "bg-[#071952]/10",
      iconColor: "text-[#071952]",
      valueColor: "text-[#071952]",
      borderColor: "border-black/20",
    },
    {
      label: "Shortlisted",
      value: stats.totalShortlisted,
      icon: Users,
      iconBg: "bg-[#071952]/10",
      iconColor: "text-[#071952]",
      valueColor: "text-[#071952]",
      borderColor: "border-black/20",
    },
  ];

  const quickActions = [
    {
      label: "Post a New Job",
      description: "Create a new job posting to find top talent",
      icon: Plus,
      onClick: () => navigate("/recruiter/jobs/new"),
      iconColor: "text-[#071952]",
      iconBg: "bg-[#071952]/10",
    },
    {
      label: "View My Jobs",
      description: `${stats.totalJobs} job${stats.totalJobs !== 1 ? "s" : ""} posted`,
      icon: Briefcase,
      onClick: () => navigate("/recruiter/jobs"),
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
          {getGreeting()}, {profile?.username || "Recruiter"}
        </h1>
        <p className="text-gray-500 mt-1 text-sm">
          {profile?.company_name ? `${profile.company_name} · ` : ""}Here&apos;s an overview of your recruiting activity.
        </p>
      </motion.div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border-2 border-gray-100 rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              How it works
            </p>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Post jobs with required skills, and our matching algorithm will rank students based on their
              exam performance, consistency, and practice history. View student profiles with GitHub-style
              activity heatmaps to find the best candidates.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
