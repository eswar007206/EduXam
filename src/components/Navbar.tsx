import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Settings,
  Gauge,
  X,
  LogOut,
  User,
  Users,
  LayoutDashboard,
  ChevronDown,
  Trophy,
  Mail,
  Shield,
  Loader2,
} from "lucide-react";
import { useSettings, type EvaluationStrictness } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { sendParentEmailOtp, verifyParentEmailOtp } from "@/services/emailService";

export default function Navbar() {
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const {
    evaluationStrictness,
    setEvaluationStrictness
  } = useSettings();
  const { profile, isAuthenticated, signOut, refreshProfile } = useAuth();

  // Parent email verification state
  const [parentEmail, setParentEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);

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
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const strictnessOptions: { value: EvaluationStrictness; label: string; description: string; color: string }[] = [
    {
      value: "easy",
      label: "Easy",
      description: "Lenient evaluation, partial marks given generously",
      color: "text-green-500"
    },
    {
      value: "moderate",
      label: "Moderate",
      description: "Balanced evaluation with fair partial marking",
      color: "text-yellow-500"
    },
    {
      value: "strict",
      label: "Strict",
      description: "Rigorous evaluation, exact answers required",
      color: "text-red-500"
    },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group transition-all duration-300 hover:scale-105">
            <img
              src="/eduxam-logo.png"
              alt="EduXam Logo"
              className="h-10 w-10 rounded-lg object-contain transition-all duration-300 group-hover:rotate-6 group-hover:scale-110"
            />
            <span className="font-bold text-xl text-foreground">EduXam</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
            >
              Home
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#1e3a8a] transition-all duration-300 group-hover:w-full"></span>
            </Link>

            {isAuthenticated && profile?.role === "student" && (
              <Link
                to="/teachers"
                className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                Find Teachers
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#1e3a8a] transition-all duration-300 group-hover:w-full"></span>
              </Link>
            )}

            {isAuthenticated && profile?.role === "student" && (
              <Link
                to="/my-results"
                className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group flex items-center gap-1.5"
              >
                <Trophy className="w-3.5 h-3.5" />
                My Results
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#1e3a8a] transition-all duration-300 group-hover:w-full"></span>
              </Link>
            )}

            {isAuthenticated && profile?.role === "teacher" && (
              <Link
                to="/admin/dashboard"
                className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group flex items-center gap-1.5"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Teacher Portal
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#1e3a8a] transition-all duration-300 group-hover:w-full"></span>
              </Link>
            )}

            {/* Settings Button - Only for students */}
            {(!isAuthenticated || profile?.role !== 'teacher') && (
              <div className="relative" ref={settingsRef}>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 rounded-lg transition-all duration-300 text-muted-foreground hover:text-foreground group"
                  title="Settings"
                >
                  <Settings size={20} className="transition-transform duration-300 group-hover:rotate-90" />
                </button>

                {/* Settings Dropdown */}
                {showSettings && (
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-accent/50">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Settings size={15} />
                        Settings
                      </h3>
                      <button
                        onClick={() => setShowSettings(false)}
                        className="p-1 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
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
                              className={`flex-1 px-2 py-1.5 text-xs font-medium transition-all ${evaluationStrictness === option.value
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-muted-foreground hover:text-white hover:bg-accent group"
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
                              <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <Shield size={14} className="text-emerald-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Verified</p>
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
                                      className="px-2 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                                    >
                                      Resend
                                    </button>
                                  </div>
                                </>
                              )}
                              {verifyError && (
                                <p className="text-[11px] text-red-500 font-medium">{verifyError}</p>
                              )}
                              {verifySuccess && (
                                <p className="text-[11px] text-emerald-500 font-medium">Parent email verified!</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Auth Buttons / User Menu */}
            {isAuthenticated && profile ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white text-xs font-bold">
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-foreground hidden sm:inline">{profile.username}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-border">
                      <p className="text-sm font-medium text-foreground truncate">{profile.username}</p>
                      <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1e3a8a]/10 text-[#1e3a8a]">
                        {profile.role}
                      </span>
                    </div>
                    <div className="p-1">
                      {profile.role === "teacher" && (
                        <button
                          onClick={() => { setShowUserMenu(false); navigate("/admin/dashboard"); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          Teacher Portal
                        </button>
                      )}
                      {profile.role === "student" && (
                        <button
                          onClick={() => { setShowUserMenu(false); navigate("/teachers"); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                        >
                          <Users className="w-4 h-4" />
                          Find Teachers
                        </button>
                      )}
                      {profile.role === "student" && (
                        <button
                          onClick={() => { setShowUserMenu(false); navigate("/my-results"); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                        >
                          <Trophy className="w-4 h-4" />
                          My Results
                        </button>
                      )}
                      <button
                        onClick={() => { setShowUserMenu(false); navigate("/exam-practice"); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                      >
                        <User className="w-4 h-4" />
                        Practice
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="relative text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 group"
                >
                  Login
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#1e3a8a] transition-all duration-300 group-hover:w-full"></span>
                </Link>
                <Link
                  to="/login"
                  className="text-sm font-medium text-white bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 px-4 py-1.5 rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_16px_rgba(30,58,138,0.5)] active:scale-95"
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
