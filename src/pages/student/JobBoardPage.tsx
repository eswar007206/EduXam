import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  MapPin,
  Search,
  Loader2,
  TrendingUp,
  Clock,
  DollarSign,
  Building2,
  Wifi,
  CalendarClock,
  GraduationCap,
  FileText,
  ChevronRight,
  AlertCircle,
  Filter,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getActiveJobs, getStudentApplications } from "@/services/jobService";
import { getStudentMatchScoresForJobs } from "@/services/skillPointsService";
import type { JobPostingRow, JobApplicationRow } from "@/lib/database.types";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

// ─── Types ───

interface JobWithMatch extends JobPostingRow {
  matchScore: number;
}

type ApplicationWithJob = JobApplicationRow & { job_postings?: JobPostingRow };

type TabKey = "listings" | "applications";

// ─── Helpers ───

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string
): string | null {
  if (min === null && max === null) return null;

  const fmt = (val: number) => {
    if (currency === "INR") {
      const lakhs = val / 100000;
      return `\u20B9${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(1)}L`;
    }
    const k = val / 1000;
    const symbol = currency === "USD" ? "$" : currency === "EUR" ? "\u20AC" : currency === "GBP" ? "\u00A3" : `${currency} `;
    return `${symbol}${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  };

  if (min !== null && max !== null) return `${fmt(min)} - ${fmt(max)}`;
  if (max !== null) return `Up to ${fmt(max)}`;
  if (min !== null) return `From ${fmt(min)}`;
  return null;
}

function experienceLabel(level: string): string {
  const map: Record<string, string> = {
    entry: "Entry Level",
    mid: "Mid Level",
    senior: "Senior Level",
    lead: "Lead / Principal",
  };
  return map[level] ?? level;
}

function workplaceLabel(type: string): string {
  const map: Record<string, string> = {
    remote: "Remote",
    hybrid: "Hybrid",
    onsite: "On-site",
  };
  return map[type] ?? type;
}

function workplaceIcon(type: string) {
  if (type === "remote") return <Wifi className="w-3 h-3" />;
  if (type === "hybrid") return <Building2 className="w-3 h-3" />;
  return <MapPin className="w-3 h-3" />;
}

function deadlineInfo(deadline: string | null): { label: string; urgent: boolean } | null {
  if (!deadline) return null;
  const now = new Date();
  const dl = new Date(deadline);
  const diffMs = dl.getTime() - now.getTime();
  if (diffMs < 0) return { label: "Expired", urgent: true };
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return { label: "Closes today", urgent: true };
  if (diffDays === 1) return { label: "Closes tomorrow", urgent: true };
  if (diffDays <= 7) return { label: `${diffDays} days left`, urgent: true };
  return { label: `${diffDays} days left`, urgent: false };
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now.getTime() - past.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  applied: { bg: "bg-blue-50", text: "text-blue-600", label: "Applied" },
  shortlisted: { bg: "bg-green-50", text: "text-green-600", label: "Shortlisted" },
  rejected: { bg: "bg-red-50", text: "text-red-600", label: "Rejected" },
  withdrawn: { bg: "bg-gray-100", text: "text-gray-500", label: "Withdrawn" },
};

// ─── Component ───

export default function JobBoardPage() {
  const { profile } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>("listings");

  // Job listings state
  const [jobs, setJobs] = useState<JobWithMatch[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"match" | "newest">("match");
  const [filterExperience, setFilterExperience] = useState<string>("");
  const [filterWorkplace, setFilterWorkplace] = useState<string>("");
  const [filterJobType, setFilterJobType] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Applications state
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [appsLoaded, setAppsLoaded] = useState(false);

  // ─── Load active jobs ───
  useEffect(() => {
    if (!profile) return;
    (async () => {
      try {
        const activeJobs = await getActiveJobs();
        const jobIds = activeJobs.map((j) => j.id);
        const scores = await getStudentMatchScoresForJobs(profile.id, jobIds);
        const jobsWithMatch = activeJobs.map((job) => ({
          ...job,
          matchScore: scores[job.id] ?? 0,
        }));
        setJobs(jobsWithMatch);
      } catch {
        toast.error("Failed to load job listings.");
      } finally {
        setLoadingJobs(false);
      }
    })();
  }, [profile]);

  // ─── Load applications lazily when tab is first opened ───
  useEffect(() => {
    if (activeTab !== "applications" || appsLoaded || !profile) return;
    setLoadingApps(true);
    (async () => {
      try {
        const data = await getStudentApplications(profile.id);
        setApplications(data);
        setAppsLoaded(true);
      } catch {
        toast.error("Failed to load your applications.");
      } finally {
        setLoadingApps(false);
      }
    })();
  }, [activeTab, appsLoaded, profile]);

  // ─── Filter & sort jobs ───
  const activeFilterCount = [filterExperience, filterWorkplace, filterJobType].filter(Boolean).length;

  const filtered = jobs
    .filter((j) => {
      if (filterExperience && j.experience_level !== filterExperience) return false;
      if (filterWorkplace && j.workplace_type !== filterWorkplace) return false;
      if (filterJobType && j.job_type !== filterJobType) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        j.title.toLowerCase().includes(q) ||
        j.company_name.toLowerCase().includes(q) ||
        j.required_skills.some((s) => s.toLowerCase().includes(q)) ||
        (j.location && j.location.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === "match") return b.matchScore - a.matchScore;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  // ─── Render ───
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 pt-20 pb-12 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#071952]">Job Board</h1>
          <p className="text-sm text-gray-500 mt-1">
            Find jobs that match your skills. Your match score is based on your
            exam performance and consistency.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border-2 border-gray-100 p-1">
          <button
            onClick={() => setActiveTab("listings")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "listings"
                ? "bg-[#071952] text-white shadow-sm"
                : "text-gray-500 hover:text-[#071952] hover:bg-gray-50"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Job Listings
          </button>
          <button
            onClick={() => setActiveTab("applications")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "applications"
                ? "bg-[#071952] text-white shadow-sm"
                : "text-gray-500 hover:text-[#071952] hover:bg-gray-50"
            }`}
          >
            <FileText className="w-4 h-4" />
            My Applications
            {appsLoaded && applications.length > 0 && (
              <span
                className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === "applications"
                    ? "bg-white/20 text-white"
                    : "bg-[#071952]/10 text-[#071952]"
                }`}
              >
                {applications.length}
              </span>
            )}
          </button>
        </div>

        {/* ════════════════════════════════════════ */}
        {/* TAB: Job Listings                       */}
        {/* ════════════════════════════════════════ */}
        {activeTab === "listings" && (
          <>
            {/* Search & Sort */}
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-[#071952] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#071952] focus:border-transparent"
                  placeholder="Search by title, company, skill, or location..."
                />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    showFilters || activeFilterCount > 0
                      ? "bg-[#071952] text-white"
                      : "bg-white text-gray-500 border border-gray-200"
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setSortBy("match")}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    sortBy === "match"
                      ? "bg-[#071952] text-white"
                      : "bg-white text-gray-500 border border-gray-200"
                  }`}
                >
                  Best Match
                </button>
                <button
                  onClick={() => setSortBy("newest")}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    sortBy === "newest"
                      ? "bg-[#071952] text-white"
                      : "bg-white text-gray-500 border border-gray-200"
                  }`}
                >
                  Newest
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
                <div className="flex flex-wrap gap-3">
                  {/* Experience Level */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Experience</label>
                    <select
                      value={filterExperience}
                      onChange={(e) => setFilterExperience(e.target.value)}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-[#071952] focus:outline-none focus:ring-2 focus:ring-[#071952] focus:border-transparent"
                    >
                      <option value="">All Levels</option>
                      <option value="entry">Entry Level</option>
                      <option value="mid">Mid Level</option>
                      <option value="senior">Senior Level</option>
                      <option value="lead">Lead / Principal</option>
                    </select>
                  </div>

                  {/* Workplace Type */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Workplace</label>
                    <select
                      value={filterWorkplace}
                      onChange={(e) => setFilterWorkplace(e.target.value)}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-[#071952] focus:outline-none focus:ring-2 focus:ring-[#071952] focus:border-transparent"
                    >
                      <option value="">All Types</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="onsite">On-site</option>
                    </select>
                  </div>

                  {/* Job Type */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Job Type</label>
                    <select
                      value={filterJobType}
                      onChange={(e) => setFilterJobType(e.target.value)}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs text-[#071952] focus:outline-none focus:ring-2 focus:ring-[#071952] focus:border-transparent"
                    >
                      <option value="">All</option>
                      <option value="full-time">Full-time</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                      <option value="internship">Internship</option>
                    </select>
                  </div>

                  {/* Clear All */}
                  {activeFilterCount > 0 && (
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setFilterExperience("");
                          setFilterWorkplace("");
                          setFilterJobType("");
                        }}
                        className="px-3 py-2 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Active filter pills */}
            {activeFilterCount > 0 && !showFilters && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {filterExperience && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-[#071952]/5 text-[#071952]">
                    {experienceLabel(filterExperience)}
                    <button onClick={() => setFilterExperience("")} className="hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filterWorkplace && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-[#071952]/5 text-[#071952]">
                    {workplaceLabel(filterWorkplace)}
                    <button onClick={() => setFilterWorkplace("")} className="hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filterJobType && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-[#071952]/5 text-[#071952]">
                    <span className="capitalize">{filterJobType}</span>
                    <button onClick={() => setFilterJobType("")} className="hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => { setFilterExperience(""); setFilterWorkplace(""); setFilterJobType(""); }}
                  className="text-[10px] font-medium text-red-500 hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Job list */}
            {loadingJobs ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[#071952]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  {search
                    ? "No jobs match your search."
                    : "No jobs available right now."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((job, i) => {
                  const salary = formatSalary(
                    job.salary_min,
                    job.salary_max,
                    job.salary_currency
                  );
                  const deadline = deadlineInfo(job.application_deadline);

                  return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Link
                        to={`/jobs/${job.id}`}
                        className="block bg-white rounded-2xl border-2 border-gray-100 p-5 hover:border-[#071952]/20 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start gap-4">
                          {/* Company Initial Avatar */}
                          <div className="shrink-0 w-12 h-12 rounded-xl bg-[#071952] flex items-center justify-center text-white text-lg font-bold uppercase shadow-sm">
                            {job.company_name.charAt(0)}
                          </div>

                          {/* Main content */}
                          <div className="flex-1 min-w-0">
                            {/* Title row */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="text-base font-semibold text-[#071952] group-hover:text-[#071952]/80 truncate">
                                  {job.title}
                                </h3>
                                <p className="text-sm text-gray-600 mt-0.5">
                                  {job.company_name}
                                </p>
                              </div>

                              {/* Match Score Badge */}
                              <div className="flex flex-col items-center shrink-0">
                                <div
                                  className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center ${
                                    job.matchScore >= 70
                                      ? "bg-green-50 text-green-600"
                                      : job.matchScore >= 40
                                      ? "bg-amber-50 text-amber-600"
                                      : "bg-gray-50 text-gray-400"
                                  }`}
                                >
                                  <TrendingUp className="w-3.5 h-3.5 mb-0.5" />
                                  <span className="text-lg font-bold leading-none">
                                    {job.matchScore}
                                  </span>
                                </div>
                                <span className="text-[9px] text-gray-400 mt-1">
                                  Match
                                </span>
                              </div>
                            </div>

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5 text-xs text-gray-500">
                              {job.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {job.location}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                {workplaceIcon(job.workplace_type)}
                                {workplaceLabel(job.workplace_type)}
                              </span>
                              <span className="flex items-center gap-1 capitalize">
                                <Briefcase className="w-3 h-3" />
                                {job.job_type}
                              </span>
                              <span className="flex items-center gap-1">
                                <GraduationCap className="w-3 h-3" />
                                {experienceLabel(job.experience_level)}
                              </span>
                              {salary && (
                                <span className="flex items-center gap-1 font-medium text-[#071952]">
                                  <DollarSign className="w-3 h-3" />
                                  {salary}
                                </span>
                              )}
                            </div>

                            {/* Deadline + posted time */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
                              <span className="text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Posted {timeAgo(job.created_at)}
                              </span>
                              {deadline && (
                                <span
                                  className={`flex items-center gap-1 ${
                                    deadline.urgent
                                      ? "text-red-500 font-medium"
                                      : "text-gray-400"
                                  }`}
                                >
                                  <CalendarClock className="w-3 h-3" />
                                  {deadline.label}
                                </span>
                              )}
                            </div>

                            {/* Skills */}
                            {job.required_skills?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {job.required_skills.slice(0, 6).map((skill, si) => (
                                  <span
                                    key={si}
                                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#071952]/5 text-[#071952]"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {job.required_skills.length > 6 && (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                    +{job.required_skills.length - 6} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════ */}
        {/* TAB: My Applications                    */}
        {/* ════════════════════════════════════════ */}
        {activeTab === "applications" && (
          <>
            {loadingApps ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[#071952]" />
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  You haven't applied to any jobs yet.
                </p>
                <button
                  onClick={() => setActiveTab("listings")}
                  className="mt-4 text-sm font-medium text-[#071952] hover:underline"
                >
                  Browse job listings
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app, i) => {
                  const job = app.job_postings;
                  const statusStyle = STATUS_STYLES[app.status] ?? STATUS_STYLES.applied;
                  const salary = job
                    ? formatSalary(job.salary_min, job.salary_max, job.salary_currency)
                    : null;
                  const deadline = job ? deadlineInfo(job.application_deadline) : null;

                  return (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Link
                        to={job ? `/jobs/${job.id}` : "#"}
                        className="block bg-white rounded-2xl border-2 border-gray-100 p-5 hover:border-[#071952]/20 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start gap-4">
                          {/* Company Initial Avatar */}
                          <div className="shrink-0 w-12 h-12 rounded-xl bg-[#071952] flex items-center justify-center text-white text-lg font-bold uppercase shadow-sm">
                            {job ? job.company_name.charAt(0) : "?"}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="text-base font-semibold text-[#071952] group-hover:text-[#071952]/80 truncate">
                                  {job?.title ?? "Unknown Position"}
                                </h3>
                                <p className="text-sm text-gray-600 mt-0.5">
                                  {job?.company_name ?? "Unknown Company"}
                                </p>
                              </div>

                              {/* Status Badge + arrow */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${statusStyle.bg} ${statusStyle.text}`}
                                >
                                  {statusStyle.label}
                                </span>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#071952] transition-colors" />
                              </div>
                            </div>

                            {/* Meta row */}
                            {job && (
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5 text-xs text-gray-500">
                                {job.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {job.location}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  {workplaceIcon(job.workplace_type)}
                                  {workplaceLabel(job.workplace_type)}
                                </span>
                                <span className="flex items-center gap-1 capitalize">
                                  <Briefcase className="w-3 h-3" />
                                  {job.job_type}
                                </span>
                                <span className="flex items-center gap-1">
                                  <GraduationCap className="w-3 h-3" />
                                  {experienceLabel(job.experience_level)}
                                </span>
                                {salary && (
                                  <span className="flex items-center gap-1 font-medium text-[#071952]">
                                    <DollarSign className="w-3 h-3" />
                                    {salary}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Application info row */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs">
                              <span className="text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Applied {timeAgo(app.created_at)}
                              </span>
                              {app.match_score !== null && (
                                <span
                                  className={`flex items-center gap-1 font-medium ${
                                    app.match_score >= 70
                                      ? "text-green-600"
                                      : app.match_score >= 40
                                      ? "text-amber-600"
                                      : "text-gray-400"
                                  }`}
                                >
                                  <TrendingUp className="w-3 h-3" />
                                  {app.match_score}% match
                                </span>
                              )}
                              {deadline && deadline.label !== "Expired" && (
                                <span
                                  className={`flex items-center gap-1 ${
                                    deadline.urgent
                                      ? "text-red-500 font-medium"
                                      : "text-gray-400"
                                  }`}
                                >
                                  <CalendarClock className="w-3 h-3" />
                                  {deadline.label}
                                </span>
                              )}
                              {!job?.is_active && (
                                <span className="flex items-center gap-1 text-red-400 font-medium">
                                  <AlertCircle className="w-3 h-3" />
                                  Listing closed
                                </span>
                              )}
                            </div>

                            {/* Skills */}
                            {job?.required_skills && job.required_skills.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {job.required_skills.slice(0, 6).map((skill, si) => (
                                  <span
                                    key={si}
                                    className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#071952]/5 text-[#071952]"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {job.required_skills.length > 6 && (
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                    +{job.required_skills.length - 6} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
