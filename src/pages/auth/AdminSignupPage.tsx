import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import HeroBg from "@/assets/vecteezy_abstract-boxes-background-modern-technology-with-square_8171873.jpg";

export default function AdminSignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp, isAuthenticated, profile, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated && profile?.role === "admin") {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, profile]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await signUp(email, password, username, "admin");
    setLoading(false);

    if (signUpError) {
      setError(signUpError);
      return;
    }

    setSuccess(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    );
  }

  const inputCls =
    "w-full pl-11 pr-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-black lg:bg-gray-50 lg:border-gray-200 lg:text-[#071952] lg:placeholder:text-gray-400";

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      <div className="relative z-10 w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat lg:hidden" style={{ backgroundImage: `url(${HeroBg})` }} />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/70 to-[#1e3a8a]/30 lg:hidden" />
        <div className="absolute inset-0 hidden lg:block bg-white" />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md my-8"
        >
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 lg:p-8 shadow-2xl lg:bg-white lg:border-gray-200 lg:backdrop-blur-none lg:shadow-xl">
            <div className="mb-4">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white lg:text-gray-400 lg:hover:text-[#071952] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </div>

            <div className="mb-6 inline-flex items-center gap-2.5">
              <img src="/eduxam-logo.png" alt="EduXam" className="w-12 h-12 rounded-xl object-contain" />
              <span className="font-bold text-xl text-white lg:text-black tracking-tight">EduXam</span>
            </div>

            <h1 className="text-2xl font-bold text-white lg:text-[#071952]">Admin Sign Up</h1>
            <p className="text-white/70 lg:text-gray-500 text-sm mt-1.5">
              Create a provisioned admin account for the organization operations portal
            </p>

            {success ? (
              <div className="mt-6 p-4 rounded-xl bg-gray-500/10 border border-black/20 lg:bg-gray-50 lg:border-black/20">
                <p className="text-black text-sm font-medium text-center">
                  Account created. Check your email to confirm, then sign in.
                </p>
                <Link
                  to="/adminauth"
                  className="mt-4 block w-full py-3 bg-black hover:bg-black/80 text-white font-semibold rounded-xl text-center transition-colors"
                >
                  Go to Admin Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium text-white/90 lg:text-[#071952] mb-1.5">Username</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/40 lg:text-gray-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className={inputCls}
                      placeholder="Choose a username"
                      required
                      minLength={3}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 lg:text-[#071952] mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/40 lg:text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className={inputCls}
                      placeholder="official-admin@example.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 lg:text-[#071952] mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/40 lg:text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={`${inputCls} pr-12`}
                      placeholder="Min. 6 characters"
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 lg:text-gray-400 lg:hover:text-gray-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 lg:text-[#071952] mb-1.5">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-white/40 lg:text-gray-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className={`${inputCls} pr-12`}
                      placeholder="Re-enter password"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 lg:text-gray-400 lg:hover:text-gray-600"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-gray-500/10 border border-black/20 lg:bg-gray-50 lg:border-black/20">
                    <p className="text-black text-sm text-center font-medium">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-black hover:bg-black/80 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create account <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            )}

            {!success && (
              <p className="text-center text-xs text-white/50 lg:text-gray-500 mt-4">
                Already have an admin account?{" "}
                <Link to="/adminauth" className="text-black font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            )}
          </div>
        </motion.div>
      </div>

      <div className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden bg-black/5">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105" style={{ backgroundImage: `url(${HeroBg})` }} />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a]/90 via-[#0f172a]/80 to-[#1e3a8a]/50" />
        <div className="relative z-10 max-w-md px-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-black/20 backdrop-blur-md border border-black/30 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Admin Portal</h2>
          <p className="text-white/70">
            Provisioning controls who enters the admin portal, so this signup works only for accounts created by the organization first.
          </p>
        </div>
      </div>
    </div>
  );
}
