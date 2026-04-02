import { motion } from "framer-motion";
import { BookOpen, ClipboardList, Target, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const items = [
  {
    icon: BookOpen,
    label: "Subjects",
    description: "Question bank",
    to: "/teacher/subjects",
    style: "bg-black/5 border-black/20 text-black hover:bg-black/10",
  },
  {
    icon: ClipboardList,
    label: "Submissions",
    description: "Review & grade",
    to: "/teacher/submissions",
    style: "bg-gray-500/10 border-black/20/20 text-black dark:text-black hover:bg-gray-500/15",
  },
  {
    icon: Target,
    label: "Dashboard",
    description: "Exam control",
    to: "/teacher/dashboard",
    style: "bg-gray-500/10 border-black/20/20 text-black dark:text-black hover:bg-gray-500/15",
  },
];

export default function TeacherDashboardCards() {
  return (
    <div className="relative w-full h-full min-h-[280px] flex items-center justify-center">
      {/* Soft gradient orbs (decorative) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-black/20 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 left-1/4 w-48 h-48 rounded-full bg-black/5 blur-3xl"
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-black/5 blur-3xl"
        />
      </div>

      {/* Content: compact feature chips + central highlight */}
      <div className="relative flex flex-col gap-5 w-full max-w-sm">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.to}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.4 }}
            >
              <Link
                to={item.to}
                className={`flex items-center gap-4 p-4 rounded-2xl border ${item.style} transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.99]`}
              >
                <div className="w-11 h-11 rounded-xl bg-white/90/90 flex items-center justify-center shrink-0 shadow-sm">
                  <Icon className="w-5 h-5 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-black shrink-0 opacity-80" />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
