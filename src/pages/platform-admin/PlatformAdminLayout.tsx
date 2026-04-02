import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import type { CSSProperties } from "react";
import {
  Building2,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export default function PlatformAdminLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDeveloper = profile?.role === "developer";
  const dashboardPath = isDeveloper ? "/developer/dashboard" : "/admin/dashboard";
  const authPath = isDeveloper ? "/developerauth" : "/adminauth";
  const portalLabel = isDeveloper ? "Developer Portal" : "Admin Portal";
  const navLinks = isDeveloper
    ? [
        { to: "/developer/dashboard", label: "Dashboard", icon: LayoutDashboard, width: "126px", color: "#7c3aed", bg: "#f5f3ff", shadow: "rgba(124,58,237,0.2)" },
        { to: "/developer/organizations", label: "Organizations", icon: Building2, width: "146px", color: "#0369a1", bg: "#f0f9ff", shadow: "rgba(3,105,161,0.2)" },
        { to: "/developer/admin-access", label: "Admin Access", icon: KeyRound, width: "148px", color: "#b45309", bg: "#fffbeb", shadow: "rgba(180,83,9,0.2)" },
      ]
    : [
        { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, width: "126px", color: "#7c3aed", bg: "#f5f3ff", shadow: "rgba(124,58,237,0.2)" },
        { to: "/admin/university", label: "Organization", icon: Building2, width: "136px", color: "#0369a1", bg: "#f0f9ff", shadow: "rgba(3,105,161,0.2)" },
        { to: "/admin/accounts", label: "Accounts", icon: Users, width: "120px", color: "#0f766e", bg: "#f0fdfa", shadow: "rgba(15,118,110,0.2)" },
        { to: "/admin/main-exams", label: "Exam Portal", icon: ShieldCheck, width: "138px", color: "#b45309", bg: "#fffbeb", shadow: "rgba(180,83,9,0.2)" },
      ];

  const handleSignOut = async () => {
    await signOut();
    navigate(authPath, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <NavLink to={dashboardPath} className="flex items-center gap-2.5 group">
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
                  {portalLabel}
                </span>
              </div>
            </NavLink>

            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) => `nav-pill${isActive ? " nav-pill-active" : ""}`}
                  style={{
                    "--pill-color": link.color,
                    "--pill-bg": link.bg,
                    "--pill-shadow": link.shadow,
                    "--pill-width": link.width,
                  } as CSSProperties}
                >
                  <span className="nav-pill-icon"><link.icon className="w-4 h-4" /></span>
                  <span className="nav-pill-label">{link.label}</span>
                </NavLink>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                <div className="w-8 h-8 rounded-full bg-[#071952] flex items-center justify-center text-white text-sm font-bold">
                  {profile?.username?.charAt(0).toUpperCase() || "A"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#071952] truncate">{profile?.username}</p>
                  <p className="text-[11px] text-gray-500 truncate">{profile?.email}</p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-white hover:bg-[#071952] transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>

              <button
                onClick={() => setMobileOpen((open) => !open)}
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-[#071952] hover:text-white transition"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="lg:hidden border-t border-gray-100 py-3 space-y-1 overflow-hidden"
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

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
