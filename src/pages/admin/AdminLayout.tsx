import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { LayoutDashboard, LogOut, Menu, X, Upload, ScrollText, ShieldAlert, BookMarked, ClipboardCheck, Users, FileText } from "lucide-react";
import { useState } from "react";
import type { CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { getAppHomePath } from "@/lib/appHome";

const navLinks = [
  { to: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard, width: "122px", color: "#7c3aed", bg: "#f5f3ff", shadow: "rgba(124,58,237,0.2)" },
  { to: "/teacher/subjects", label: "Subjects", icon: BookMarked, width: "108px", color: "#0f766e", bg: "#f0fdfa", shadow: "rgba(15,118,110,0.2)" },
  { to: "/teacher/import-questions", label: "Import Qs", icon: Upload, width: "114px", color: "#0369a1", bg: "#f0f9ff", shadow: "rgba(3,105,161,0.2)" },
  { to: "/teacher/syllabus-upload", label: "Upload Syllabus", icon: FileText, width: "154px", color: "#0c4a6e", bg: "#ecfeff", shadow: "rgba(12,74,110,0.2)" },
  { to: "/teacher/submissions", label: "Submissions", icon: ClipboardCheck, width: "132px", color: "#b45309", bg: "#fffbeb", shadow: "rgba(180,83,9,0.2)" },
  { to: "/teacher/reports", label: "Reports", icon: ScrollText, width: "106px", color: "#be185d", bg: "#fdf2f8", shadow: "rgba(190,24,93,0.2)" },
  { to: "/teacher/violations", label: "Violations", icon: ShieldAlert, width: "114px", color: "#dc2626", bg: "#fff1f2", shadow: "rgba(220,38,38,0.25)" },
  { to: "/teacher/students", label: "Students", icon: Users, width: "110px", color: "#4f46e5", bg: "#eef2ff", shadow: "rgba(79,70,229,0.2)" },
];

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const portalHomePath = getAppHomePath(profile);

  const handleSignOut = async () => {
    await signOut();
    navigate("/teacherauth", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Top Navbar ─── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo + Brand only */}
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
                    Teacher Portal
                  </span>
                </div>
              </Link>
            </div>

            {/* Right side: nav pills + user + sign out */}
            <div className="flex items-center gap-3">
              {/* Admin Nav Pills */}
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
              {/* User badge - desktop */}
              <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                <div className="w-8 h-8 rounded-full bg-[#071952] flex items-center justify-center text-white text-sm font-bold">
                  {profile?.username?.charAt(0).toUpperCase() || "T"}
                </div>
                <span className="text-sm font-medium text-[#071952]">
                  {profile?.username}
                </span>
              </div>

              {/* Sign out - desktop */}
              <button
                onClick={handleSignOut}
                className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-white hover:bg-[#071952] transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>

              {/* Mobile hamburger */}
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
                    {profile?.username?.charAt(0).toUpperCase() || "T"}
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

      {/* ─── Main Content ─── */}
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
