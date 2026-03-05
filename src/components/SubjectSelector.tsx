import { motion } from "framer-motion";
import type { Department } from "@/features/exam/types";
import type { SubjectProgress } from "@/services/testResultsService";
import { memo } from "react";
import {
  Cpu,
  Zap,
  Database,
  Calculator,
  Binary,
  Lightbulb,
  BookOpen,
  FileText,
  GraduationCap,
  TrendingUp,
  User,
  type LucideIcon,
} from "lucide-react";


interface SubjectSelectorProps {
  departments: Department[];
  onSelect: (departmentId: string, subjectId: string) => void;
  progress?: Record<string, SubjectProgress>;
}

// Map subject names to icons - white background with navy blue accents
const subjectStyles: Record<string, { icon: LucideIcon; gradient: string; bgGradient: string; iconColor: string; borderColor: string }> = {
  "Applied Physics (AP)": {
    icon: Cpu,
    gradient: "from-[#1e3a8a]/10 via-[#1e3a8a]/5 to-transparent",
    bgGradient: "from-white to-white dark:from-gray-900 dark:to-gray-900",
    iconColor: "text-[#1e3a8a] dark:text-[#3b5998]",
    borderColor: "hover:border-[#1e3a8a]"
  },
  "Basic Electronics (BEE)": {
    icon: Zap,
    gradient: "from-[#1e3a8a]/10 via-[#1e3a8a]/5 to-transparent",
    bgGradient: "from-white to-white dark:from-gray-900 dark:to-gray-900",
    iconColor: "text-[#1e3a8a] dark:text-[#3b5998]",
    borderColor: "hover:border-[#1e3a8a]"
  },
  "Data Communication (DC)": {
    icon: Database,
    gradient: "from-[#1e3a8a]/10 via-[#1e3a8a]/5 to-transparent",
    bgGradient: "from-white to-white dark:from-gray-900 dark:to-gray-900",
    iconColor: "text-[#1e3a8a] dark:text-[#3b5998]",
    borderColor: "hover:border-[#1e3a8a]"
  },
  "Linear Algebra & Calculus (L&AC)": {
    icon: Calculator,
    gradient: "from-[#1e3a8a]/10 via-[#1e3a8a]/5 to-transparent",
    bgGradient: "from-white to-white dark:from-gray-900 dark:to-gray-900",
    iconColor: "text-[#1e3a8a] dark:text-[#3b5998]",
    borderColor: "hover:border-[#1e3a8a]"
  },
  "Operating System (OS)": {
    icon: Binary,
    gradient: "from-[#1e3a8a]/10 via-[#1e3a8a]/5 to-transparent",
    bgGradient: "from-white to-white dark:from-gray-900 dark:to-gray-900",
    iconColor: "text-[#1e3a8a] dark:text-[#3b5998]",
    borderColor: "hover:border-[#1e3a8a]"
  },
  "Problem Solving Techniques (PST)": {
    icon: Lightbulb,
    gradient: "from-[#1e3a8a]/10 via-[#1e3a8a]/5 to-transparent",
    bgGradient: "from-white to-white dark:from-gray-900 dark:to-gray-900",
    iconColor: "text-[#1e3a8a] dark:text-[#3b5998]",
    borderColor: "hover:border-[#1e3a8a]"
  },
};

function getProgressColor(avg: number) {
  if (avg >= 25) return { bar: "bg-emerald-500", text: "text-emerald-600" };
  if (avg >= 15) return { bar: "bg-amber-500", text: "text-amber-600" };
  return { bar: "bg-[#1e3a8a]", text: "text-[#1e3a8a]" };
}

const SubjectSelector = memo(function SubjectSelector({ departments, onSelect, progress }: SubjectSelectorProps) {
  const getSubjectStyle = (subjectName: string) => {
    return subjectStyles[subjectName] || {
      icon: BookOpen,
      gradient: "from-gray-500/25 via-gray-600/25 to-gray-700/25",
      bgGradient: "from-gray-50/50 to-gray-100/50 dark:from-gray-900/20 dark:to-gray-800/20",
      iconColor: "text-gray-700 dark:text-gray-300",
      borderColor: "hover:border-gray-500"
    };
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6">
      {departments.map((department, deptIndex) => (
        <motion.div
          key={department.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: deptIndex * 0.1 }}
          className="mb-8"
        >
          {/* Enhanced Department Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-[#1e3a8a]" />
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">{department.name}</h2>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-border via-border/50 to-transparent" />
          </div>

          {/* Subject Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {department.subjects.map((subject, subjectIndex) => {
              const style = getSubjectStyle(subject.name);
              const Icon = style.icon;
              const subjectProgress = progress?.[subject.id];

              return (
                <motion.button
                  key={subject.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: deptIndex * 0.1 + subjectIndex * 0.05 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(department.id, subject.id)}
                  className="group relative p-6 rounded-2xl border-2 border-[#1e3a8a] !bg-white transition-all duration-300 text-left overflow-hidden hover:shadow-xl hover:shadow-[#1e3a8a]/20"
                >
                  {/* Content */}
                  <div className="relative z-10">
                    {/* Icon */}
                    <div className="mb-4">
                      <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${style.gradient} border border-border group-hover:border-[#1e3a8a]/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6`}>
                        <Icon className={`w-6 h-6 ${style.iconColor} transition-transform duration-300`} />
                      </div>
                    </div>

                    {/* Subject Name */}
                    <h3 className="font-bold text-lg text-foreground mb-2 group-hover:text-[#1e3a8a] transition-colors duration-300">
                      {subject.name}
                    </h3>

                    {/* Question Count & Teacher Badge */}
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 group-hover:bg-[#1e3a8a]/10 border border-border group-hover:border-[#1e3a8a]/30 transition-all duration-300">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#1e3a8a] transition-colors duration-300" />
                        <span className="text-xs font-medium text-muted-foreground group-hover:text-[#1e3a8a] transition-colors duration-300">
                          {subject.questions.length} questions
                        </span>
                      </div>
                      {subject.teacherName && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#1e3a8a]/5 border border-[#1e3a8a]/10">
                          <User className="w-3 h-3 text-[#1e3a8a]" />
                          <span className="text-xs font-medium text-[#1e3a8a]">
                            {subject.teacherName}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {(() => {
                      const sp = subjectProgress ?? { n: 0, avg: 0, progress: 0 };
                      return (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <TrendingUp className="w-3 h-3" />
                              {sp.n === 0 ? "No tests yet" : `${sp.n} ${sp.n === 1 ? "test" : "tests"} | avg ${sp.avg}/30`}
                            </span>
                            <span className={`font-semibold ${sp.n === 0 ? "text-muted-foreground" : getProgressColor(sp.avg).text}`}>
                              {sp.progress}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${sp.progress}%` }}
                              transition={{ duration: 0.8, delay: deptIndex * 0.1 + subjectIndex * 0.05 + 0.3 }}
                              className={`h-full rounded-full ${sp.n === 0 ? "bg-gray-300" : getProgressColor(sp.avg).bar}`}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Hover Glow Effect */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-[#1e3a8a]/5 to-transparent animate-shimmer" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
});

export default SubjectSelector;
