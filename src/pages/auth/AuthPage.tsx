import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  BookOpen,
  GraduationCap,
  Loader2,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/context/AuthContext";
import { getAppHomePath } from "@/lib/appHome";
import HeroBg from "@/assets/vecteezy_abstract-boxes-background-modern-technology-with-square_8171873.jpg";
import girlReadingVideo from "@/assets/gir_reading.mp4";

type AuthMode = "login" | "signup";

interface AuthPageProps {
  initialMode?: AuthMode;
  allowSignup?: boolean;
  portalName?: string | null;
}

const fieldVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 280, damping: 22 },
  },
};

export default function AuthPage({
  initialMode = "login",
  allowSignup = true,
  portalName = null,
}: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup state
  const [username, setUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("student");
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  const { signIn, signUp, isAuthenticated, profile, isLoading } = useAuth();
  const navigate = useNavigate();

  // GSAP refs
  const heroRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);
  const formContentRef = useRef<HTMLDivElement | null>(null);
  const heroContentRef = useRef<HTMLDivElement | null>(null);
  const isAnimating = useRef(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated && profile) {
      navigate(getAppHomePath(profile), { replace: true });
    }
  }, [isAuthenticated, profile, isLoading, navigate]);

  // Set initial panel positions for signup mode (no animation)
  useEffect(() => {
    if (initialMode === "signup" && window.innerWidth >= 1024) {
      gsap.set(heroRef.current, { x: "-100%" });
      gsap.set(formRef.current, { x: "100%" });
    }
  }, [initialMode]);

  // ─── Switch to Signup (Login → Signup) ───
  const switchToSignup = () => {
    if (isAnimating.current || mode === "signup") return;

    // Mobile: just swap mode, no panel animation
    if (window.innerWidth < 1024) {
      setMode("signup");
      return;
    }

    isAnimating.current = true;

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimating.current = false;
      },
    });

    // Phase 1: fade out content
    tl.to(formContentRef.current, {
      opacity: 0,
      duration: 0.75,
      ease: "power1.inOut",
    }, 0);
    tl.to(heroContentRef.current, {
      opacity: 0,
      duration: 0.75,
      ease: "power1.inOut",
    }, 0);

    // Swap mode when invisible
    tl.call(() => setMode("signup"), [], 0.78);

    // Phase 2: slide panels
    tl.to(heroRef.current, {
      x: "-100%",
      duration: 0.88,
      ease: "power3.inOut",
    }, 0.72);
    tl.to(formRef.current, {
      x: "100%",
      duration: 0.88,
      ease: "power3.inOut",
    }, 0.72);

    // Phase 3: fade in new content
    tl.to(heroContentRef.current, {
      opacity: 1,
      duration: 0.55,
      ease: "power2.out",
    }, 1.1);
    tl.to(formContentRef.current, {
      opacity: 1,
      duration: 0.55,
      ease: "power2.out",
    }, 1.2);
  };

  // ─── Switch to Login (Signup → Login) ───
  const switchToLogin = () => {
    if (isAnimating.current || mode === "login") return;

    if (window.innerWidth < 1024) {
      setMode("login");
      return;
    }

    isAnimating.current = true;

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimating.current = false;
      },
    });

    // Phase 1: fade out content
    tl.to(formContentRef.current, {
      opacity: 0,
      duration: 0.75,
      ease: "power1.inOut",
    }, 0);
    tl.to(heroContentRef.current, {
      opacity: 0,
      duration: 0.75,
      ease: "power1.inOut",
    }, 0);

    // Swap mode when invisible
    tl.call(() => setMode("login"), [], 0.78);

    // Phase 2: slide panels back
    tl.to(heroRef.current, {
      x: "0%",
      duration: 0.88,
      ease: "power3.inOut",
    }, 0.72);
    tl.to(formRef.current, {
      x: "0%",
      duration: 0.88,
      ease: "power3.inOut",
    }, 0.72);

    // Phase 3: fade in new content
    tl.to(heroContentRef.current, {
      opacity: 1,
      duration: 0.55,
      ease: "power2.out",
    }, 1.1);
    tl.to(formContentRef.current, {
      opacity: 1,
      duration: 0.55,
      ease: "power2.out",
    }, 1.2);
  };

  // ─── Form handlers ───
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    if (error) {
      setLoginError(error);
      setLoginLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError("");

    if (username.length < 3) {
      setSignupError("Username must be at least 3 characters.");
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      return;
    }
    if (signupPassword !== confirmPassword) {
      setSignupError("Passwords do not match.");
      return;
    }
    setSignupLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, username, role);
    setSignupLoading(false);
    if (error) setSignupError(error);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-white">
      {/* ================================================================ */}
      {/*  HERO PANEL — starts on RIGHT in login mode                     */}
      {/* ================================================================ */}
      <div
        ref={heroRef}
        className="hidden lg:flex absolute top-0 left-1/2 w-1/2 h-full items-center justify-center overflow-hidden"
        style={{ backgroundColor: "#1A3D64", willChange: "transform" }}
      >
        {/* Background video */}
        <video
          className="absolute inset-0 w-full h-full object-cover object-bottom"
          src={girlReadingVideo}
          autoPlay
          loop
          muted
          playsInline
        />

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1b30]/90 via-[#0b1b30]/75 to-[#1A3D64]/85" />

        {/* Ambient glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[480px] h-[480px] rounded-full bg-white/5 blur-3xl" />
        </div>

        {/* Hero content */}
        <div
          ref={heroContentRef}
          className="relative z-10 max-w-sm px-10 text-center select-none"
        >
          {/* Icon */}
          <div className="animate-bob-1 mb-8">
            <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto shadow-xl shadow-black/20">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight leading-tight">
            {mode === "login" ? "Practice Smarter" : "Join EduXam"}
          </h2>

          {/* Paragraph */}
          <p className="text-white/65 text-base leading-relaxed">
            {mode === "login"
              ? portalName
                ? `Sign in to continue to the ${portalName.toLowerCase()}.`
                : "Access curated question banks, practice with timed exams, and get AI-powered evaluation to improve your performance."
              : "Create your account and start practicing with curated question banks, timed exams, and AI-powered evaluation to boost your performance."}
          </p>

          {/* Feature pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {["Timed Exams", "AI Grading", "Progress Tracking"].map((label) => (
              <span
                key={label}
                className="px-4 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm text-white/75 text-sm font-medium"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/*  FORM PANEL — starts on LEFT in login mode                      */}
      {/* ================================================================ */}
      <div
        ref={formRef}
        className={`relative z-10 w-full min-h-screen
          lg:absolute lg:top-0 lg:left-0 lg:w-1/2 lg:h-full lg:min-h-0
          flex justify-center overflow-y-auto bg-white
          ${mode === "signup" ? "items-start pt-8 lg:pt-12" : "items-center"}
        `}
        style={{ willChange: "transform" }}
      >
        {/* Mobile-only background */}
        <div
          className="absolute inset-0 lg:hidden bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${HeroBg})` }}
        />
        <div className="absolute inset-0 lg:hidden bg-gradient-to-br from-black/80 via-black/70 to-[#1A3D64]/40" />

        {/* Form card */}
        <div className="relative z-10 w-full max-w-md px-6 py-10 lg:px-10">
          <div ref={formContentRef}>
            {/* Back to Home */}
            <div className="mb-4">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm px-3 py-1.5 rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white lg:bg-gray-100 lg:text-gray-600 lg:hover:bg-gray-200 lg:hover:text-[#071952] shadow-sm transition-colors duration-200 group"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/70 lg:text-gray-500 group-hover:text-white lg:group-hover:text-[#071952] transition-transform duration-200 group-hover:-translate-x-1" />
                Back to Home
              </Link>
            </div>

            {/* Logo */}
            <div className="mb-5 inline-flex items-center gap-2.5">
              <img
                src="/eduxam-logo.png"
                alt="EduXam Logo"
                className="w-11 h-11 rounded-xl object-contain shadow-md"
              />
              <span className="font-bold text-xl text-white lg:text-black tracking-tight">
                EduXam
              </span>
            </div>

            {/* Heading + subtitle */}
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-white lg:text-[#071952]">
                {mode === "login" ? (portalName ? `${portalName} Login` : "Welcome back") : "Create your account"}
              </h1>
              <p className="text-white/65 lg:text-gray-500 text-sm mt-1.5">
                {mode === "login"
                  ? portalName
                    ? "Sign in with your approved account credentials."
                    : "Sign in to continue to your account"
                  : "Sign up to get started with EduXam"}
              </p>
            </div>

            {mode === "login" ? (
              <LoginFormFields
                email={loginEmail}
                setEmail={setLoginEmail}
                password={loginPassword}
                setPassword={setLoginPassword}
                showPassword={showLoginPassword}
                setShowPassword={setShowLoginPassword}
                error={loginError}
                loading={loginLoading}
                onSubmit={handleLoginSubmit}
                onSwitchToSignup={switchToSignup}
                allowSignup={allowSignup}
                signupNotice={
                  portalName === "Developer Portal"
                    ? "Developer Portal accounts are created internally by the platform team."
                    : portalName === "Admin Portal"
                      ? "Admin Portal accounts are provisioned from the developer dashboard first."
                      : portalName
                        ? `${portalName} accounts are approved and provisioned by your organization admin first.`
                        : undefined
                }
                fieldVariants={fieldVariants}
              />
            ) : (
              <SignupFormFields
                username={username}
                setUsername={setUsername}
                email={signupEmail}
                setEmail={setSignupEmail}
                password={signupPassword}
                setPassword={setSignupPassword}
                confirmPassword={confirmPassword}
                setConfirmPassword={setConfirmPassword}
                showPassword={showSignupPassword}
                setShowPassword={setShowSignupPassword}
                showConfirmPassword={showConfirmPassword}
                setShowConfirmPassword={setShowConfirmPassword}
                role={role}
                setRole={setRole}
                error={signupError}
                loading={signupLoading}
                onSubmit={handleSignupSubmit}
                onSwitchToLogin={switchToLogin}
                fieldVariants={fieldVariants}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  SUB-COMPONENTS
// ─────────────────────────────────────────────

interface LoginFormProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  error: string;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSwitchToSignup: () => void;
  allowSignup: boolean;
  signupNotice?: string;
  fieldVariants: Variants;
}

function LoginFormFields({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  error,
  loading,
  onSubmit,
  onSwitchToSignup,
  allowSignup,
  signupNotice,
  fieldVariants,
}: LoginFormProps) {
  const inputCls =
    "w-full pl-11 pr-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 lg:bg-gray-50 lg:border-gray-200 lg:text-[#071952] lg:placeholder:text-gray-400 lg:hover:border-gray-300 lg:focus:bg-white text-sm";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Email */}
      <motion.div variants={fieldVariants}>
        <label className="block text-sm font-medium text-white/90 lg:text-[#071952] mb-1.5">
          Email address
        </label>
        <div className="relative group">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[17px] h-[17px] text-white/40 lg:text-gray-400 transition-colors group-focus-within:text-black" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>
      </motion.div>

      {/* Password */}
      <motion.div variants={fieldVariants}>
        <label className="block text-sm font-medium text-white/90 lg:text-[#071952] mb-1.5">
          Password
        </label>
        <div className="relative group">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[17px] h-[17px] text-white/40 lg:text-gray-400 transition-colors group-focus-within:text-black" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputCls} pr-12`}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 lg:text-gray-400 lg:hover:text-gray-600 transition-colors"
            aria-label={showPassword ? "Hide" : "Show"}
          >
            {showPassword ? (
              <EyeOff className="w-[17px] h-[17px]" />
            ) : (
              <Eye className="w-[17px] h-[17px]" />
            )}
          </button>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-gray-500/10 border border-black/20/20 lg:bg-gray-50 lg:border-black/20"
        >
          <p className="text-black lg:text-black text-sm text-center font-medium">
            {error}
          </p>
        </motion.div>
      )}

      {/* Submit */}
      <motion.div variants={fieldVariants}>
        <button
          type="submit"
          disabled={loading}
          className="group w-full py-3 bg-[#071952] hover:bg-[#071952]/90 text-white font-semibold rounded-full transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1e3a8a]/25 hover:shadow-xl hover:shadow-[#1e3a8a]/40 hover:-translate-y-0.5 active:translate-y-0"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </>
          )}
        </button>
      </motion.div>

      {allowSignup ? (
        <>
          <motion.div variants={fieldVariants} className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10 lg:border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 text-white/50 bg-white/10 backdrop-blur-sm rounded-full lg:text-gray-500 lg:bg-white">
                New to EduXam?
              </span>
            </div>
          </motion.div>

          <motion.div variants={fieldVariants}>
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="blob-btn blob-btn-sm w-full justify-center"
            >
              Create an account
              <span className="blob-btn__inner">
                <span className="blob-btn__blobs">
                  <span className="blob-btn__blob" />
                  <span className="blob-btn__blob" />
                  <span className="blob-btn__blob" />
                  <span className="blob-btn__blob" />
                </span>
              </span>
            </button>
          </motion.div>
        </>
      ) : (
        <motion.div
          variants={fieldVariants}
          className="rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-white/75 lg:border-gray-200 lg:bg-gray-50 lg:text-gray-600"
        >
          {signupNotice || "This portal is invite-only. Contact your admin if you need access."}
        </motion.div>
      )}
    </form>
  );
}

interface SignupFormProps {
  username: string;
  setUsername: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (v: boolean) => void;
  role: UserRole;
  setRole: (v: UserRole) => void;
  error: string;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onSwitchToLogin: () => void;
  fieldVariants: Variants;
}

function SignupFormFields({
  username,
  setUsername,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  role: _role,
  setRole,
  error,
  loading,
  onSubmit,
  onSwitchToLogin,
  fieldVariants,
}: SignupFormProps) {
  const inputCls =
    "w-full pl-11 pr-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 lg:bg-gray-50 lg:border-gray-200 lg:text-[#071952] lg:placeholder:text-gray-400 lg:hover:border-gray-300 lg:focus:bg-white text-sm";

  return (
    <form onSubmit={onSubmit} className="space-y-3.5">
      {/* Username */}
      <motion.div variants={fieldVariants}>
        <label className="block text-sm font-medium text-white/90 lg:text-[#071952] mb-1.5">
          Username
        </label>
        <div className="relative group">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[17px] h-[17px] text-white/40 lg:text-gray-400 transition-colors group-focus-within:text-black" />
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputCls}
            placeholder="Choose a username"
            required
            autoComplete="username"
          />
        </div>
      </motion.div>

      {/* Email */}
      <motion.div variants={fieldVariants}>
        <label className="block text-sm font-medium text-white/90 lg:text-[#071952] mb-1.5">
          Email address
        </label>
        <div className="relative group">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[17px] h-[17px] text-white/40 lg:text-gray-400 transition-colors group-focus-within:text-black" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          placeholder="your student email"
            required
            autoComplete="email"
          />
        </div>
        <p className="mt-1 text-xs text-white/50 lg:text-gray-400">
          You can use any email to create a student account. Use your organization email if you want verified access and exam portal slots from active ranges.
        </p>
      </motion.div>

      {/* Password */}
      <motion.div variants={fieldVariants}>
        <label className="block text-sm font-medium text-white/90 lg:text-[#071952] mb-1.5">
          Password
        </label>
        <div className="relative group">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[17px] h-[17px] text-white/40 lg:text-gray-400 transition-colors group-focus-within:text-black" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputCls} pr-12`}
            placeholder="Min. 6 characters"
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 lg:text-gray-400 lg:hover:text-gray-600 transition-colors"
          >
            {showPassword ? (
              <EyeOff className="w-[17px] h-[17px]" />
            ) : (
              <Eye className="w-[17px] h-[17px]" />
            )}
          </button>
        </div>
      </motion.div>

      {/* Confirm Password */}
      <motion.div variants={fieldVariants}>
        <label className="block text-sm font-medium text-white/90 lg:text-[#071952] mb-1.5">
          Confirm Password
        </label>
        <div className="relative group">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[17px] h-[17px] text-white/40 lg:text-gray-400 transition-colors group-focus-within:text-black" />
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`${inputCls} pr-12`}
            placeholder="Re-enter your password"
            required
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 lg:text-gray-400 lg:hover:text-gray-600 transition-colors"
          >
            {showConfirmPassword ? (
              <EyeOff className="w-[17px] h-[17px]" />
            ) : (
              <Eye className="w-[17px] h-[17px]" />
            )}
          </button>
        </div>
      </motion.div>

      {/* Role selector: Student only (teacher signup removed from main page) */}
      <motion.div variants={fieldVariants}>
        <label className="block text-sm font-medium text-white/90 lg:text-[#071952] mb-2">
          I am a...
        </label>
        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={() => setRole("student")}
            className="p-3 rounded-xl border-2 text-left transition-all duration-200 border-blue-500 ring-4 ring-blue-400/40 shadow-lg shadow-blue-400/40 bg-gray-500/10 lg:bg-blue-50"
          >
            <GraduationCap className="w-5 h-5 mb-1.5 text-black" />
            <p className="font-semibold text-sm text-black">Student</p>
            <p className="text-white/40 lg:text-gray-400 text-xs mt-0.5">Practice exams</p>
          </button>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-gray-500/10 border border-black/20/20 lg:bg-gray-50 lg:border-black/20"
        >
          <p className="text-black lg:text-black text-sm text-center font-medium">
            {error}
          </p>
        </motion.div>
      )}

      {/* Submit */}
      <motion.div variants={fieldVariants}>
        <button
          type="submit"
          disabled={loading}
          className="group w-full py-3 bg-[#071952] hover:bg-[#071952]/90 text-white font-semibold rounded-full transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#1e3a8a]/25 hover:shadow-xl hover:shadow-[#1e3a8a]/40 hover:-translate-y-0.5 active:translate-y-0"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </>
          )}
        </button>
      </motion.div>

      {/* Divider + switch */}
      <motion.div variants={fieldVariants} className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10 lg:border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 text-white/50 bg-white/10 backdrop-blur-sm rounded-full lg:text-gray-500 lg:bg-white">
            Already have an account?
          </span>
        </div>
      </motion.div>

      <motion.div variants={fieldVariants}>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="blob-btn blob-btn-sm w-full justify-center"
        >
          Sign in instead
          <span className="blob-btn__inner">
            <span className="blob-btn__blobs">
              <span className="blob-btn__blob" />
              <span className="blob-btn__blob" />
              <span className="blob-btn__blob" />
              <span className="blob-btn__blob" />
            </span>
          </span>
        </button>
      </motion.div>
    </form>
  );
}
