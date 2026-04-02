import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { LayoutDashboard, LogOut, Menu, X, Briefcase, Users } from "lucide-react";
import { useState } from "react";
import type { CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { getAppHomePath } from "@/lib/appHome";

const navLinks = [
  { to: "/recruiter/dashboard", label: "Dashboard", icon: LayoutDashboard, width: "122px", color: "#7c3aed", bg: "#f5f3ff", shadow: "rgba(124,58,237,0.2)" },
  { to: "/recruiter/jobs", label: "My Jobs", icon: Briefcase, width: "108px", color: "#0f766e", bg: "#f0fdfa", shadow: "rgba(15,118,110,0.2)" },
  { to: "/recruiter/students", label: "Students", icon: Users, width: "110px", color: "#0369a1", bg: "#f0f9ff", shadow: "rgba(3,105,161,0.2)" },
];

export default function RecruiterLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const portalHomePath = getAppHomePath(profile);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link to={portalHomePath} className="flex items-center gap-2.5 group">
                <img
                  src="/eduxam-logo.png"
                  alt="EduXam Logo"
                  className="h-10 w-10 rounded-lg object-contain transition-transform duration-300 group-hover:scale-110"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-lg text-[#071952] tracking-tight leading-tight">
                    EduXam
                  </span>
                  <span className="text-[10px] font-semibold text-black leading-tight">
                    Recruiter Portal
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) => `nav-pill${isActive ? ' nav-pill-active' : ''}`}
                    style={{ "--pill-color": link.color, "--pill-bg": link.bg, "--pill-shadow": link.shadow, "--pill-width": link.width } as CSSProperties}
                  >
                    <span className="nav-pill-icon"><link.icon className="w-4 h-4" /></span>
                    <span className="nav-pill-label">{link.label}</span>
                  </NavLink>
                ))}
              </div>
              <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                <div className="w-8 h-8 rounded-full bg-[#071952] flex items-center justify-center text-white text-sm font-bold">
                  {profile?.username?.charAt(0).toUpperCase() || "R"}
                </div>
                <span className="text-sm font-medium text-[#071952]">
                  {profile?.username}
                </span>
              </div>

              <button
                onClick={handleSignOut}
                className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-white hover:bg-[#071952] transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>

              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-[#071952] hover:text-white transition"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown */}
          <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden border-t border-gray-100 py-3 space-y-1 overflow-hidden"
            >
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-[#071952] text-white shadow-sm shadow-[#071952]/25"
                        : "text-gray-600 hover:bg-[#071952]/5 hover:text-[#071952]"
                    }`
                  }
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </NavLink>
              ))}
              <div className="border-t border-gray-100 pt-2 mt-2">
                <div className="flex items-center gap-2.5 px-4 py-2">
                  <div className="w-8 h-8 rounded-full bg-[#071952] flex items-center justify-center text-white text-sm font-bold shadow-sm shadow-[#071952]/25">
                    {profile?.username?.charAt(0).toUpperCase() || "R"}
                  </div>
                  <span className="text-sm font-medium text-[#071952]">
                    {profile?.username}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150 w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
