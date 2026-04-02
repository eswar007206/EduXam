import { NavLink } from "react-router-dom";
import { BookOpen, LayoutDashboard, LogOut, X } from "lucide-react";

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onSignOut: () => void;
}

export default function AdminSidebar({ isOpen, onToggle, onSignOut }: AdminSidebarProps) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg transition text-sm font-medium ${
      isActive
        ? "bg-black text-white"
        : "text-white/70 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#0f1729] z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:z-auto`}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-black" />
            <div>
              <h1 className="text-lg font-bold text-white">EduXam</h1>
              <span className="text-[10px] font-medium text-black bg-black/20 px-1.5 py-0.5 rounded">
                Teacher Portal
              </span>
            </div>
          </div>
          <button onClick={onToggle} className="lg:hidden text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <NavLink to="/teacher/dashboard" className={linkClass} onClick={onToggle}>
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </NavLink>
          <NavLink to="/teacher/subjects" className={linkClass} onClick={onToggle}>
            <BookOpen className="w-4 h-4" />
            Subjects
          </NavLink>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={onSignOut}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-black hover:bg-[#071952] hover:text-white transition w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
