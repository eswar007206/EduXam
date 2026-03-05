import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { LayoutDashboard, BookOpen, LogOut, Menu, X, ClipboardList, FileSpreadsheet, FileBarChart } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const navLinks = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/subjects", label: "Subjects", icon: BookOpen },
  { to: "/admin/import-questions", label: "Import Qs", icon: FileSpreadsheet },
  { to: "/admin/submissions", label: "Submissions", icon: ClipboardList },
  { to: "/admin/reports", label: "Reports", icon: FileBarChart },
];

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-[#1e3a8a] text-white shadow-md shadow-[#1e3a8a]/25"
        : "text-gray-600 hover:text-[#1e3a8a] hover:bg-[#1e3a8a]/5"
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ─── Top Navbar ─── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Logo + Brand */}
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2.5 group">
                <img
                  src="/eduxam-logo.png"
                  alt="EduXam Logo"
                  className="h-10 w-10 rounded-lg object-contain transition-transform duration-300 group-hover:scale-110"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-lg text-gray-900 tracking-tight leading-tight">
                    EduXam
                  </span>
                  <span className="text-[10px] font-semibold text-[#1e3a8a] leading-tight">
                    Teacher Portal
                  </span>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <div className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => (
                  <NavLink key={link.to} to={link.to} className={linkClass}>
                    <link.icon className="w-4 h-4" />
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Right side: user + sign out */}
            <div className="flex items-center gap-3">
              {/* User badge - desktop */}
              <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                <div className="w-8 h-8 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white text-sm font-bold">
                  {profile?.username?.charAt(0).toUpperCase() || "T"}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {profile?.username}
                </span>
              </div>

              {/* Sign out - desktop */}
              <button
                onClick={handleSignOut}
                className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown */}
          {mobileOpen && (
            <div className="md:hidden border-t border-gray-100 py-3 space-y-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? "bg-[#1e3a8a] text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`
                  }
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </NavLink>
              ))}
              <div className="border-t border-gray-100 pt-2 mt-2">
                <div className="flex items-center gap-2.5 px-4 py-2">
                  <div className="w-8 h-8 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white text-sm font-bold">
                    {profile?.username?.charAt(0).toUpperCase() || "T"}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {profile?.username}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition w-full"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ─── Main Content ─── */}
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
