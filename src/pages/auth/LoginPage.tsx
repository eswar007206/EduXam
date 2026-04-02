import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import {
  BookOpen,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import HeroBg from "@/assets/vecteezy_abstract-boxes-background-modern-technology-with-square_8171873.jpg";

/* ─── Framer-motion variants ─── */
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, isAuthenticated, profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const leftSectionRef = useRef<HTMLDivElement | null>(null);
  const rightSectionRef = useRef<HTMLDivElement | null>(null);
  const leftContentRef = useRef<HTMLDivElement | null>(null);
  const rightContentRef = useRef<HTMLDivElement | null>(null);
  const isAnimatingRef = useRef(false);

  /* ─── Redirect if already authenticated ─── */
  useEffect(() => {
    if (!isLoading && isAuthenticated && profile) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, profile, isLoading, navigate]);

  /* ─── Form submission ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError);
      setLoading(false);
    }
  };

  const handleGoToSignup = () => {
    if (isAnimatingRef.current) return;

    isAnimatingRef.current = true;

    const tl = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onComplete: () => {
        isAnimatingRef.current = false;
        navigate("/signup");
      },
    });

    tl.to([leftContentRef.current, rightContentRef.current], {
      opacity: 0,
      duration: 0.4,
      stagger: 0.05,
    })
      .to(
        leftSectionRef.current,
        {
          xPercent: 100,
          duration: 0.6,
        },
        "<"
      )
      .to(
        rightSectionRef.current,
        {
          xPercent: -100,
          duration: 0.6,
        },
        "<"
      );
  };

  /* ─── Full-screen loading state ─── */
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* ================================================================ */}
      {/*  LEFT SIDE — Form                                                */}
      {/* ================================================================ */}
      <div
        ref={leftSectionRef}
        className="relative z-10 w-full lg:w-1/2 flex items-start pt-8 lg:items-center lg:pt-0 justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto"
      >
        {/* Mobile-only background image + dark overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat lg:hidden"
          style={{ backgroundImage: `url(${HeroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/70 to-[#1e3a8a]/30 lg:hidden" />

        {/* Desktop solid white background */}
        <div className="absolute inset-0 hidden lg:block bg-white" />

        {/* ─── Form Card ─── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="relative z-10 w-full max-w-md"
          ref={leftContentRef}
        >
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 sm:p-6 lg:p-8 shadow-2xl lg:bg-white lg:border-gray-200 lg:backdrop-blur-none lg:shadow-xl">
            {/* ── Back button ── */}
            <motion.div variants={itemVariants} className="mb-4">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white lg:text-gray-400 lg:hover:text-[#071952] transition-colors duration-200 group"
              >
                <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
                Back to Home
              </Link>
            </motion.div>

            {/* ── Logo ── */}
            <motion.div variants={itemVariants} className="mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.1,
                }}
                className="inline-flex items-center gap-2.5 mb-5"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-[#1e3a8a]/25">
                  <img
                    src="/eduxam-logo.png"
                    alt="EduXam Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="font-bold text-xl text-white lg:text-black tracking-tight">
                  EduXam
                </span>
              </motion.div>

              <h1 className="text-2xl font-bold text-white lg:text-[#071952]">
                Welcome back
              </h1>
              <p className="text-white/70 lg:text-gray-500 text-sm mt-1.5">
                Sign in to continue to your account
              </p>
            </motion.div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 lg:space-y-5">
              {/* Email field */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium text-white/90 lg:text-[#071952] mb-1.5">
                  Email address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/40 lg:text-gray-400 transition-colors group-focus-within:text-black" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 lg:bg-gray-50 lg:border-gray-200 lg:text-[#071952] lg:placeholder:text-gray-400 lg:hover:border-gray-300 lg:focus:bg-white"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </motion.div>

              {/* Password field */}
              <motion.div variants={itemVariants}>
                <label className="block text-sm font-medium text-white/90 lg:text-[#071952] mb-1.5">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/40 lg:text-gray-400 transition-colors group-focus-within:text-black" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-12 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 lg:bg-gray-50 lg:border-gray-200 lg:text-[#071952] lg:placeholder:text-gray-400 lg:hover:border-gray-300 lg:focus:bg-white"
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 lg:text-gray-400 lg:hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-[18px] h-[18px]" />
                    ) : (
                      <Eye className="w-[18px] h-[18px]" />
                    )}
                  </button>
                </div>
              </motion.div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
                  animate={{ opacity: 1, y: 0, scaleY: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="p-3 rounded-xl bg-gray-500/10 border border-black/20/20 lg:bg-gray-50 lg:border-black/20"
                >
                  <p className="text-black lg:text-black text-sm text-center font-medium">
                    {error}
                  </p>
                </motion.div>
              )}

              {/* Submit button */}
              <motion.div variants={itemVariants}>
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="w-full py-3 bg-black hover:bg-black/80 text-white font-semibold rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group shadow-lg shadow-[#1e3a8a]/25 hover:shadow-[#1e3a8a]/40"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </>
                  )}
                </motion.button>
              </motion.div>
            </form>

            {/* ── Divider ── */}
            <motion.div variants={itemVariants} className="relative my-7">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10 lg:border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 text-white/50 bg-white/10 backdrop-blur-sm rounded-full lg:text-gray-500 lg:bg-white lg:backdrop-blur-none">
                  New to EduXam?
                </span>
              </div>
            </motion.div>

            {/* ── Sign-up link ── */}
            <motion.div variants={itemVariants}>
              <button
                type="button"
                onClick={handleGoToSignup}
                className="block w-full py-3 text-center border border-white/20 rounded-xl text-white/90 hover:bg-white/10 font-medium text-sm transition-all duration-200 lg:border-gray-200 lg:text-black lg:hover:bg-black/5 lg:hover:border-black/30"
              >
                Create an account
              </button>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* ================================================================ */}
      {/*  RIGHT SIDE — Hero visual (desktop only)                         */}
      {/* ================================================================ */}
      <div
        ref={rightSectionRef}
        className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden"
      >
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{ backgroundImage: `url(${HeroBg})` }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a]/90 via-[#0f172a]/80 to-[#1e3a8a]/50" />

        {/* Subtle radial glow behind the content */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] rounded-full bg-black/15 blur-3xl" />
        </div>

        {/* Content */}
        <div
          className="relative z-10 max-w-md px-8 text-center"
          ref={rightContentRef}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
          >
            {/* Floating hero icon */}
            <div className="animate-bob-1 mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.6,
                }}
                className="w-20 h-20 rounded-2xl bg-black/20 backdrop-blur-md border border-black/30 flex items-center justify-center mx-auto shadow-xl shadow-[#1e3a8a]/10"
              >
                <BookOpen className="w-10 h-10 text-white" />
              </motion.div>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="text-4xl font-bold text-white mb-4 tracking-tight"
            >
              Practice Smarter
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.5 }}
              className="text-white/70 text-base leading-relaxed"
            >
              Access curated question banks from your teachers, practice with
              timed exams, and get AI-powered evaluation to improve your
              performance.
            </motion.p>

            {/* Decorative feature pills */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.5 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-3"
            >
              {["Timed Exams", "AI Grading", "Progress Tracking"].map(
                (label) => (
                  <span
                    key={label}
                    className="px-4 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm text-white/80 text-sm font-medium"
                  >
                    {label}
                  </span>
                )
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
