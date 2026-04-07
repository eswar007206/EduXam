import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  BarChart3,
  Settings,
  Gauge,
  X,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  Mail,
  Shield,
  Loader2,
  PenLine,
  UserSearch,
  ClipboardCheck,
  Briefcase,
  UserCircle,
  Bell,
  CheckCheck,
  FileText,
} from "lucide-react";
import { useSettings, type EvaluationStrictness } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { sendParentEmailOtp, verifyParentEmailOtp } from "@/services/emailService";
import { supabase } from "@/lib/supabase";
import {
  getStudentNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type StudentNotificationItem,
} from "@/services/notificationService";
import ExamTypeBadge from "@/components/ExamTypeBadge";
import { getStudentExamEntryPath, isStudentNavbarFeatureEnabled } from "@/lib/organizationFeatures";
import { getAppHomePath } from "@/lib/appHome";
import { EXAM_PORTAL_LABEL } from "@/lib/portalLabels";

/** Set to true to show the Settings (gear) button and dropdown in the navbar */
const SHOW_NAVBAR_SETTINGS = true;

export default function Navbar() {
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<StudentNotificationItem[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    evaluationStrictness,
    setEvaluationStrictness
  } = useSettings();
  const { profile, isAuthenticated, signOut, refreshProfile } = useAuth();
  const showStudentFindTeachers = isStudentNavbarFeatureEnabled(profile, "find_teachers");
  const showStudentResults = isStudentNavbarFeatureEnabled(profile, "my_results");
  const showStudentPractice = isStudentNavbarFeatureEnabled(profile, "practice");
  const showStudentJobs = isStudentNavbarFeatureEnabled(profile, "jobs");
  const showStudentMyProfile = isStudentNavbarFeatureEnabled(profile, "my_profile");
  const studentExamEntryPath = getStudentExamEntryPath(profile);
  const appHomePath = getAppHomePath(profile);
  const brandHomePath = isAuthenticated ? appHomePath : "/";
  const isStudentPortal = profile?.role === "student";

  // Parent email verification state
  const [parentEmail, setParentEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!profile || profile.role !== "student") {
      setNotifications([]);
      return;
    }

    setLoadingNotifications(true);
    try {
      const data = await getStudentNotifications(profile.id, 20, profile.email);
      setNotifications(data);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoadingNotifications(false);
    }
  }, [profile]);

  const unreadNotificationCount = notifications.filter((item) => !item.is_read).length;

  const formatNotificationTime = (value: string) => {
    const date = new Date(value);
    const now = Date.now();
    const diffMinutes = Math.floor((now - date.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 24 * 60) return `${Math.floor(diffMinutes / 60)}h ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  useEffect(() => {
    if (profile?.parent_email) {
      setParentEmail(profile.parent_email);
    }
  }, [profile?.parent_email]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || profile?.role !== "student") {
      setNotifications([]);
      setShowNotifications(false);
      return;
    }

    loadNotifications();

    const channel = supabase
      .channel(`student-notifications:${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_notifications",
          filter: `student_id=eq.${profile.id}`,
        },
        () => loadNotifications()
      )
      .subscribe();

    const refreshTimer = window.setInterval(() => {
      loadNotifications();
    }, 60000);

    return () => {
      window.clearInterval(refreshTimer);
      const ch = channel;
      setTimeout(() => supabase.removeChannel(ch), 0);
    };
  }, [isAuthenticated, profile, loadNotifications]);

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
    navigate("/");
  };

  const handleSendOtp = async () => {
    if (!profile || !parentEmail) return;
    setSendingOtp(true);
    setVerifyError("");
    setVerifySuccess(false);
    try {
      await sendParentEmailOtp(profile.id, parentEmail);
      setOtpSent(true);
    } catch (err: unknown) {
      setVerifyError((err as Error).message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!profile || !parentEmail || !otp) return;
    setVerifying(true);
    setVerifyError("");
    try {
      const result = await verifyParentEmailOtp(profile.id, parentEmail, otp);
      if (result.verified) {
        setVerifySuccess(true);
        setOtpSent(false);
        setOtp("");
        setIsChangingEmail(false);
        await refreshProfile();
      } else {
        setVerifyError(result.message || "Invalid OTP");
      }
    } catch (err: unknown) {
      setVerifyError((err as Error).message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleChangeParentEmail = () => {
    setParentEmail("");
    setOtpSent(false);
    setOtp("");
    setVerifyError("");
    setVerifySuccess(false);
    setIsChangingEmail(true);
  };

  const handleNotificationClick = async (notification: StudentNotificationItem) => {
    if (profile?.role !== "student") return;

    try {
      if (!notification.is_read) {
        await markNotificationRead(notification.id, profile.id, notification.source);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id
              ? { ...item, is_read: true, read_at: new Date().toISOString() }
              : item
          )
        );
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }

    setShowNotifications(false);
    navigate(notification.route);
  };

  const handleMarkAllNotificationsRead = async () => {
    if (profile?.role !== "student" || unreadNotificationCount === 0) return;

    try {
      await markAllNotificationsRead(
        profile.id,
        notifications
          .filter((item) => item.source === "computed" && !item.is_read)
          .map((item) => item.id)
      );
      setNotifications((prev) =>
        prev.map((item) =>
          item.is_read ? item : { ...item, is_read: true, read_at: new Date().toISOString() }
        )
      );
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const strictnessOptions: { value: EvaluationStrictness; label: string; description: string; color: string }[] = [
    {
      value: "easy",
      label: "Easy",
      description: "Lenient evaluation, partial marks given generously",
      color: "text-black"
    },
    {
      value: "moderate",
      label: "Moderate",
      description: "Balanced evaluation with fair partial marking",
      color: "text-black"
    },
    {
      value: "strict",
      label: "Strict",
      description: "Rigorous evaluation, exact answers required",
      color: "text-black"
    },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <Link to={brandHomePath} className="flex items-center gap-3 group transition-all duration-300 hover:scale-[1.02]">
            <img
              src="/eduxam-logo.png"
              alt="EduXam Logo"
              className="h-10 w-10 rounded-lg object-contain transition-all duration-300 group-hover:rotate-6 group-hover:scale-110"
            />
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-xl text-foreground">EduXam</span>
              {isStudentPortal && (
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#071952]/70">
                  Student Portal
                </span>
              )}
            </div>
          </Link>
          <div className="flex items-center gap-4">
            {isStudentPortal && (
              <Link
                to={appHomePath}
                className={`nav-pill${location.pathname === appHomePath ? ' nav-pill-active' : ''}`}
                style={{ "--pill-color": "#071952", "--pill-bg": "#eff2ff", "--pill-shadow": "rgba(7,25,82,0.2)", "--pill-width": "122px" } as React.CSSProperties}
              >
                <span className="nav-pill-icon"><LayoutDashboard className="w-4 h-4" /></span>
                <span className="nav-pill-label">Dashboard</span>
              </Link>
            )}

            {isAuthenticated && profile?.role === "student" && showStudentFindTeachers && (
              <Link
                to="/teachers"
                className={`nav-pill${location.pathname === '/teachers' ? ' nav-pill-active' : ''}`}
                style={{ "--pill-color": "#0f766e", "--pill-bg": "#f0fdfa", "--pill-shadow": "rgba(15,118,110,0.2)", "--pill-width": "142px" } as React.CSSProperties}
              >
                <span className="nav-pill-icon"><UserSearch className="w-4 h-4" /></span>
                <span className="nav-pill-label">Find Teachers</span>
              </Link>
            )}

            {isAuthenticated && profile?.role === "student" && showStudentResults && (
              <Link
                to="/my-results"
                className={`nav-pill${location.pathname === '/my-results' ? ' nav-pill-active' : ''}`}
                style={{ "--pill-color": "#b45309", "--pill-bg": "#fffbeb", "--pill-shadow": "rgba(180,83,9,0.2)", "--pill-width": "122px" } as React.CSSProperties}
              >
                <span className="nav-pill-icon"><ClipboardCheck className="w-4 h-4" /></span>
                <span className="nav-pill-label">My Results</span>
              </Link>
            )}

            {isAuthenticated && profile?.role === "student" && (
              <Link
                to="/student/analytics"
                className={`nav-pill${location.pathname.startsWith('/student/analytics') ? ' nav-pill-active' : ''}`}
                style={{ "--pill-color": "#7c3aed", "--pill-bg": "#f5f3ff", "--pill-shadow": "rgba(124,58,237,0.2)", "--pill-width": "118px" } as React.CSSProperties}
              >
                <span className="nav-pill-icon"><BarChart3 className="w-4 h-4" /></span>
                <span className="nav-pill-label">Analytics</span>
              </Link>
            )}

            {isAuthenticated && profile?.role === "student" && showStudentPractice && (
              <Link
                to={studentExamEntryPath}
                className={`nav-pill${location.pathname === '/exam-practice' ? ' nav-pill-active' : ''}`}
                style={{ "--pill-color": "#0369a1", "--pill-bg": "#f0f9ff", "--pill-shadow": "rgba(3,105,161,0.2)", "--pill-width": "110px" } as React.CSSProperties}
              >
                <span className="nav-pill-icon"><PenLine className="w-4 h-4" /></span>
                <span className="nav-pill-label">Practice</span>
              </Link>
            )}

            {isAuthenticated && profile?.role === "student" && (
              <Link
                to="/main-exam"
                className={`nav-pill${location.pathname === '/main-exam' ? ' nav-pill-active' : ''}`}
                style={{ "--pill-color": "#b45309", "--pill-bg": "#fffbeb", "--pill-shadow": "rgba(180,83,9,0.2)", "--pill-width": "126px" } as React.CSSProperties}
              >
                <span className="nav-pill-icon"><FileText className="w-4 h-4" /></span>
                <span className="nav-pill-label">{EXAM_PORTAL_LABEL}</span>
              </Link>
            )}

            {isAuthenticated && profile?.role === "student" && (
              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={() => {
                    const nextValue = !showNotifications;
                    setShowNotifications(nextValue);
                    if (nextValue) {
                      loadNotifications();
                    }
                  }}
                  className="relative p-2 rounded-lg hover:bg-[#071952]/10 transition-colors"
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <Bell className={`w-5 h-5 ${showNotifications ? "text-[#071952]" : "text-muted-foreground"}`} />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#071952] text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-100 bg-white shadow-[0_8px_32px_rgba(7,25,82,0.12),0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-[#071952]/5 to-transparent">
                        <div>
                          <h3 className="text-sm font-semibold text-[#071952]">Notifications</h3>
                          <p className="text-[11px] text-gray-500">
                            {unreadNotificationCount > 0
                              ? `${unreadNotificationCount} unread update${unreadNotificationCount === 1 ? "" : "s"}`
                              : "You are all caught up"}
                          </p>
                        </div>
                        {unreadNotificationCount > 0 && (
                          <button
                            onClick={handleMarkAllNotificationsRead}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#071952] hover:text-black transition-colors"
                          >
                            <CheckCheck className="w-3.5 h-3.5" />
                            Mark all read
                          </button>
                        )}
                      </div>

                      <div className="max-h-[420px] overflow-y-auto">
                        {loadingNotifications ? (
                          <div className="flex items-center gap-2 p-4 text-sm text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading notifications...
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="p-6 text-center">
                            <Bell className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm font-medium text-[#071952]">No notifications yet</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Prep exams and high-priority exam portal alerts will appear here.
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {notifications.map((notification) => (
                              <button
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={`w-full px-4 py-3 text-left transition-colors ${
                                  notification.priority === "high"
                                    ? "hover:bg-amber-50/80"
                                    : "hover:bg-[#071952]/5"
                                } ${
                                  notification.priority === "high"
                                    ? notification.is_read
                                      ? "bg-white border-l-4 border-l-amber-200"
                                      : "bg-amber-50/60 border-l-4 border-l-amber-400"
                                    : notification.is_read
                                      ? "bg-white"
                                      : "bg-[#071952]/[0.03]"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`mt-1 w-2.5 h-2.5 rounded-full ${
                                    notification.priority === "high"
                                      ? notification.is_read
                                        ? "bg-amber-200"
                                        : "bg-amber-500"
                                      : notification.is_read
                                        ? "bg-gray-200"
                                        : "bg-[#071952]"
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <p className="text-sm font-semibold text-[#071952] truncate">
                                        {notification.title}
                                      </p>
                                      {notification.priority === "high" && (
                                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                          High Priority
                                        </span>
                                      )}
                                      <ExamTypeBadge
                                        examType={notification.type === "prep_exam_created" ? "prep" : "main"}
                                        compact
                                      />
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                      {notification.message}
                                    </p>
                                    <p className="text-[11px] text-gray-400 mt-2">
                                      {notification.timestamp_label || formatNotificationTime(notification.created_at)}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {isAuthenticated && profile?.role === "student" && showStudentJobs && (
              <Link
                to="/jobs"
                className={`nav-pill${location.pathname.startsWith('/jobs') ? ' nav-pill-active' : ''}`}
                style={{ "--pill-color": "#7c3aed", "--pill-bg": "#f5f3ff", "--pill-shadow": "rgba(124,58,237,0.2)", "--pill-width": "104px" } as React.CSSProperties}
              >
                <span className="nav-pill-icon"><Briefcase className="w-4 h-4" /></span>
                <span className="nav-pill-label">Jobs</span>
              </Link>
            )}

            {isAuthenticated && profile?.role === "teacher" && (
              <Link
                to="/teacher/dashboard"
                className={`nav-pill${location.pathname.startsWith('/teacher') ? ' nav-pill-active' : ''}`}
                style={{ "--pill-color": "#7c3aed", "--pill-bg": "#f5f3ff", "--pill-shadow": "rgba(124,58,237,0.2)", "--pill-width": "148px" } as React.CSSProperties}
              >
                <span className="nav-pill-icon"><LayoutDashboard className="w-4 h-4" /></span>
                <span className="nav-pill-label">Teacher Portal</span>
              </Link>
            )}

            {isAuthenticated && profile?.role === "admin" && (
              <Link
                to="/admin/dashboard"
                className={`nav-pill${location.pathname.startsWith('/admin') ? ' nav-pill-active' : ''}`}
                style={{ "--pill-color": "#b45309", "--pill-bg": "#fffbeb", "--pill-shadow": "rgba(180,83,9,0.2)", "--pill-width": "136px" } as React.CSSProperties}
              >
                <span className="nav-pill-icon"><Shield className="w-4 h-4" /></span>
                <span className="nav-pill-label">Admin Portal</span>
              </Link>
            )}

            {isAuthenticated && profile?.role === "recruiter" && (
              <Link
                to="/recruiter/dashboard"
                className={`nav-pill${location.pathname.startsWith('/recruiter') ? ' nav-pill-active' : ''}`}
                style={{ "--pill-color": "#9333ea", "--pill-bg": "#faf5ff", "--pill-shadow": "rgba(147,51,234,0.2)", "--pill-width": "168px" } as React.CSSProperties}
              >
                <span className="nav-pill-icon"><Briefcase className="w-4 h-4" /></span>
                <span className="nav-pill-label">Recruiter Portal</span>
              </Link>
            )}

            {/* Settings Button - hidden per requirement */}
            {SHOW_NAVBAR_SETTINGS && isAuthenticated && profile?.role !== 'teacher' && (
              <div className="relative" ref={settingsRef}>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 rounded-lg transition-all duration-300 text-muted-foreground hover:text-foreground group"
                  title="Settings"
                >
                  <Settings size={20} className="transition-transform duration-300 group-hover:rotate-90" />
                </button>

                {/* Settings Dropdown */}
                <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-gray-100 bg-white shadow-[0_8px_32px_rgba(7,25,82,0.12),0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-[#071952]/5 to-transparent">
                      <h3 className="text-sm font-semibold text-[#071952] flex items-center gap-2">
                        <Settings size={15} />
                        Settings
                      </h3>
                      <button
                        onClick={() => setShowSettings(false)}
                        className="p-1 rounded-lg hover:bg-[#071952] hover:text-white transition-colors text-gray-400"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="max-h-[calc(100vh-5rem)] overflow-y-auto p-3 space-y-4">
                      {/* Evaluation Strictness — compact segmented control */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <Gauge size={14} />
                          Evaluation Strictness
                        </label>
                        <div className="flex rounded-lg border border-border overflow-hidden">
                          {strictnessOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => setEvaluationStrictness(option.value)}
                              className={`flex-1 px-2 py-1.5 text-xs font-medium transition-all group ${evaluationStrictness === option.value
                                ? "bg-[#071952] text-white"
                                : "bg-white text-gray-700 hover:bg-[#071952]"
                                }`}
                            >
                              <span className={evaluationStrictness === option.value ? "" : `${option.color} group-hover:text-white`}>{option.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Parent Email Section - Students only */}
                      {isAuthenticated && profile?.role === "student" && (
                        <div className="space-y-2 border-t border-border pt-3">
                          <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                            <Mail size={14} />
                            Parent Email Notifications
                          </label>

                          {profile.parent_email_verified && profile.parent_email && !isChangingEmail ? (
                            <div>
                              <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gray-500/10 border border-black/20/20">
                                <Shield size={14} className="text-black shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-black dark:text-black">Verified</p>
                                  <p className="text-[11px] text-muted-foreground truncate">{profile.parent_email}</p>
                                </div>
                              </div>
                              <button
                                onClick={handleChangeParentEmail}
                                className="mt-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors underline"
                              >
                                Change parent email
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                  <input
                                    type="email"
                                    value={parentEmail}
                                    onChange={(e) => setParentEmail(e.target.value)}
                                    placeholder="parent@example.com"
                                    className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                  />
                                </div>
                                {!otpSent && (
                                  <button
                                    onClick={handleSendOtp}
                                    disabled={sendingOtp || !parentEmail || !parentEmail.includes("@")}
                                    className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                                  >
                                    {sendingOtp ? (
                                      <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                      "Send OTP"
                                    )}
                                  </button>
                                )}
                              </div>
                              {otpSent && (
                                <>
                                  <p className="text-[11px] text-muted-foreground">
                                    Code sent to <strong>{parentEmail}</strong>
                                  </p>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={otp}
                                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                      placeholder="6-digit OTP"
                                      maxLength={6}
                                      className="flex-1 px-2 py-1.5 text-xs text-center tracking-widest font-mono rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                    <button
                                      onClick={handleVerifyOtp}
                                      disabled={verifying || otp.length !== 6}
                                      className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                    >
                                      {verifying ? (
                                        <Loader2 size={12} className="animate-spin" />
                                      ) : (
                                        "Verify"
                                      )}
                                    </button>
                                    <button
                                      onClick={handleSendOtp}
                                      disabled={sendingOtp}
                                      className="px-2 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-white hover:bg-[#071952] transition-colors disabled:opacity-50"
                                    >
                                      Resend
                                    </button>
                                  </div>
                                </>
                              )}
                              {verifyError && (
                                <p className="text-[11px] text-black font-medium">{verifyError}</p>
                              )}
                              {verifySuccess && (
                                <p className="text-[11px] text-black font-medium">Parent email verified!</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            )}

            {/* Auth Buttons / User Menu */}
            {isAuthenticated && profile ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#071952]/10 transition-colors"
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.username} className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold">
                      {profile.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground hidden sm:inline">{profile.username}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showUserMenu ? "rotate-180 text-[#071952]" : "text-muted-foreground"}`} />
                </button>

                <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-gray-100 bg-white shadow-[0_8px_32px_rgba(7,25,82,0.12),0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden"
                  >
                    {/* Profile Header */}
                    <div className="px-4 py-3.5 bg-gradient-to-br from-[#071952]/[0.06] to-[#071952]/[0.02] border-b border-[#071952]/10">
                      <div className="flex items-center gap-3">
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt={profile.username} className="w-9 h-9 rounded-full object-cover shadow-md shadow-[#071952]/25" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#071952] flex items-center justify-center text-white font-bold text-sm shadow-md shadow-[#071952]/25">
                            {profile.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{profile.username}</p>
                          <p className="text-[11px] text-gray-500 truncate">{profile.email}</p>
                          <span className="inline-block mt-0.5 text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#071952] text-white">
                            {profile.role}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Nav Items */}
                    <div className="p-1.5 space-y-0.5">
                      {profile.role === "teacher" && (
                        <button
                          onClick={() => { setShowUserMenu(false); navigate("/teacher/dashboard"); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-[#071952]/5 hover:text-[#071952] rounded-xl transition-all duration-150"
                        >
                          <LayoutDashboard className="w-4 h-4 text-gray-400" />
                          Teacher Portal
                        </button>
                      )}
                      {profile.role === "admin" && (
                        <button
                          onClick={() => { setShowUserMenu(false); navigate("/admin/dashboard"); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-[#071952]/5 hover:text-[#071952] rounded-xl transition-all duration-150"
                        >
                          <Shield className="w-4 h-4 text-gray-400" />
                          Admin Portal
                        </button>
                      )}
                      {profile.role === "student" && showStudentMyProfile && (
                        <button
                          onClick={() => { setShowUserMenu(false); navigate("/student/dashboard"); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-[#071952]/5 hover:text-[#071952] rounded-xl transition-all duration-150"
                        >
                          <LayoutDashboard className="w-4 h-4 text-gray-400" />
                          Dashboard
                        </button>
                      )}
                      {profile.role === "student" && showStudentMyProfile && (
                        <button
                          onClick={() => { setShowUserMenu(false); navigate(`/profile/${profile.id}`); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-[#071952]/5 hover:text-[#071952] rounded-xl transition-all duration-150"
                        >
                          <UserCircle className="w-4 h-4 text-gray-400" />
                          My Profile
                        </button>
                      )}
                      {profile.role === "student" && showStudentFindTeachers && (
                        <button
                          onClick={() => { setShowUserMenu(false); navigate("/teachers"); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-[#071952]/5 hover:text-[#071952] rounded-xl transition-all duration-150"
                        >
                          <UserSearch className="w-4 h-4 text-gray-400" />
                          Find Teachers
                        </button>
                      )}
                      {profile.role === "student" && showStudentResults && (
                        <button
                          onClick={() => { setShowUserMenu(false); navigate("/my-results"); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-[#071952]/5 hover:text-[#071952] rounded-xl transition-all duration-150"
                        >
                          <ClipboardCheck className="w-4 h-4 text-gray-400" />
                          My Results
                        </button>
                      )}
                      {profile.role === "student" && (
                        <button
                          onClick={() => { setShowUserMenu(false); navigate("/student/analytics"); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-[#071952]/5 hover:text-[#071952] rounded-xl transition-all duration-150"
                        >
                          <BarChart3 className="w-4 h-4 text-gray-400" />
                          Analytics
                        </button>
                      )}
                      {profile.role === "student" && showStudentPractice && (
                        <button
                          onClick={() => { setShowUserMenu(false); navigate(studentExamEntryPath); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-[#071952]/5 hover:text-[#071952] rounded-xl transition-all duration-150"
                        >
                          <PenLine className="w-4 h-4 text-gray-400" />
                          Practice
                        </button>
                      )}
                      {profile.role === "student" && (
                        <button
                          onClick={() => { setShowUserMenu(false); navigate("/main-exam"); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-[#071952]/5 hover:text-[#071952] rounded-xl transition-all duration-150"
                        >
                          <FileText className="w-4 h-4 text-gray-400" />
                          {EXAM_PORTAL_LABEL}
                        </button>
                      )}
                      {profile.role === "student" && showStudentJobs && (
                        <button
                          onClick={() => { setShowUserMenu(false); navigate("/jobs"); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-[#071952]/5 hover:text-[#071952] rounded-xl transition-all duration-150"
                        >
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          Jobs
                        </button>
                      )}
                      {profile.role === "recruiter" && (
                        <button
                          onClick={() => { setShowUserMenu(false); navigate("/recruiter/dashboard"); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-[#071952]/5 hover:text-[#071952] rounded-xl transition-all duration-150"
                        >
                          <Briefcase className="w-4 h-4 text-gray-400" />
                          Recruiter Portal
                        </button>
                      )}
                      <div className="h-px bg-gray-100 my-1" />
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-150"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 group"
                >
                  Sign In
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-black transition-all duration-300 group-hover:w-full"></span>
                </Link>
                <Link
                  to="/signup"
                  className="text-sm font-medium text-white bg-black hover:bg-black/90 px-4 py-1.5 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_16px_rgba(30,58,138,0.5)] active:scale-95"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
