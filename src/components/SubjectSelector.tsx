import { motion } from "framer-motion";
import type { Department } from "@/features/exam/types";
import type { SubjectProgress } from "@/services/testResultsService";
import { memo } from "react";
import { GraduationCap, TrendingUp, User } from "lucide-react";
import { EXAM_PORTAL_LABEL, getExamTypeCollectionLabel } from "@/lib/portalLabels";

interface SubjectSelectorProps {
  departments: Department[];
  onSelect: (departmentId: string, subjectId: string) => void;
  progress?: Record<string, SubjectProgress>;
}

function getProgressColor(avg: number) {
  if (avg >= 25) return { bar: "bg-gray-500", text: "text-black" };
  if (avg >= 15) return { bar: "bg-gray-500", text: "text-black" };
  return { bar: "bg-black", text: "text-black" };
}

const SubjectSelector = memo(function SubjectSelector({ departments, onSelect, progress }: SubjectSelectorProps) {
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
              <GraduationCap className="w-6 h-6 text-black" />
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">{department.name}</h2>
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-border via-border/50 to-transparent" />
          </div>

          {(["prep", "main"] as const).map((examType) => {
            const subjects = department.subjects.filter((subject) => subject.examType === examType);
            if (subjects.length === 0) return null;

            return (
              <div key={examType} className="mb-6 last:mb-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    examType === "prep"
                      ? "bg-sky-50 text-sky-700 border-sky-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {getExamTypeCollectionLabel(examType)}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {examType === "prep"
                      ? "Practice as many times as you want."
                      : "Strict exam mode with one attempt per account."}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjects.map((subject, subjectIndex) => {
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
                        className="group relative p-6 rounded-2xl border-2 border-black !bg-white transition-all duration-300 text-left overflow-hidden hover:shadow-xl hover:shadow-[#1e3a8a]/20"
                      >
                        <div className="relative z-10">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className="font-bold text-lg text-foreground group-hover:text-black transition-colors duration-300">
                              {subject.name}
                            </h3>
                            <span className={`shrink-0 inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                              subject.examType === "prep"
                                ? "bg-sky-100 text-sky-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                              {subject.examType}
                            </span>
                          </div>

                          {subject.teacherName && (
                            <div className="flex items-center gap-2 flex-wrap mb-3">
                              <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-black/5 border border-black/10">
                                <User className="w-3 h-3 text-black" />
                                <span className="text-xs font-medium text-black">
                                  {subject.teacherName}
                                </span>
                              </div>
                            </div>
                          )}

                          <p className="text-xs text-muted-foreground mb-3">
                            {subject.examType === "prep"
                              ? "Unlimited practice attempts."
                              : `Teacher-controlled ${EXAM_PORTAL_LABEL.toLowerCase()}.`}
                          </p>

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

                        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-[#1e3a8a]/5 to-transparent animate-shimmer" />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </motion.div>
      ))}
    </div>
  );
});

export default SubjectSelector;
