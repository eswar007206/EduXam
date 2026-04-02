import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Trophy,
  Clock,
  FileText,
  BookOpen,
  Target,
  ChevronDown,
  ChevronUp,
  Cpu,
  User,
  Sparkles,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { getStudentExamEntryLabel, getStudentExamEntryPath } from "@/lib/organizationFeatures";
import { getStudentEvaluations, updateSubmissionMarks } from "@/services/submissionService";
import { evaluateExam, type EvaluationProgress } from "@/services/evaluationService";
import { exportExamToWord } from "@/utils/exportToWord";
import type { SubmissionRow } from "@/lib/database.types";
import type { ExamSection } from "@/features/exam/types";
import type { EvaluationResult } from "@/services/evaluationService";
import ExamTypeBadge from "@/components/ExamTypeBadge";

function getGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

function getGradeColor(grade: string): string {
  if (grade === "A+" || grade === "A") return "text-black bg-gray-500/10";
  if (grade === "B+" || grade === "B") return "text-black bg-gray-500/10";
  if (grade === "C") return "text-black bg-black/5";
  return "text-black bg-gray-500/10";
}

function formatTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function MyResultsPage() {
  const { profile } = useAuth();
  const { evaluationStrictness } = useSettings();
  const studentExamEntryPath = getStudentExamEntryPath(profile);
  const studentExamEntryLabel = getStudentExamEntryLabel(profile);
  const [results, setResults] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [evalProgress, setEvalProgress] = useState<EvaluationProgress | null>(null);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }
    getStudentEvaluations(profile.id)
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [profile]);

  const buildEvalResult = (submission: SubmissionRow): EvaluationResult | undefined => {
    // AI evaluation — use stored data directly
    if (submission.evaluation_data) {
      return submission.evaluation_data as EvaluationResult;
    }

    // Teacher evaluation — reconstruct from question_marks
    if (submission.evaluation_type === "teacher" && submission.question_marks) {
      const sections = submission.exam_sections as ExamSection[];
      const qEvals = sections.flatMap((section) =>
        section.questions.map((q) => ({
          questionId: q.id,
          questionText: q.text,
          studentAnswer:
            submission.mcq_answers?.[q.id] ||
            submission.answers?.[q.id] ||
            "[No answer provided]",
          maxMarks: q.marks,
          marksAwarded: (submission.question_marks as Record<string, number>)[q.id] ?? 0,
          feedback: "",
          isCorrect:
            ((submission.question_marks as Record<string, number>)[q.id] ?? 0) >= q.marks,
        }))
      );

      const obtained = submission.total_marks_obtained ?? 0;
      const total = submission.total_marks;
      const pct = total > 0 ? (obtained / total) * 100 : 0;

      return {
        totalMarksObtained: obtained,
        totalMaxMarks: total,
        percentage: pct,
        grade: getGrade(pct),
        overallFeedback: submission.feedback || "Evaluated by teacher.",
        questionEvaluations: qEvals,
        evaluationStrictness: "moderate",
      };
    }

    return undefined;
  };

  const handleRedownload = async (submission: SubmissionRow) => {
    try {
      const sections = submission.exam_sections as ExamSection[];
      const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);
      const answeredQuestions =
        Object.keys(submission.answers || {}).length +
        Object.keys(submission.mcq_answers || {}).length;

      const evaluationResult = buildEvalResult(submission);

      await exportExamToWord({
        examSections: sections,
        answers: submission.answers || {},
        mcqAnswers: submission.mcq_answers || {},
        timeElapsed: submission.time_elapsed || 0,
        totalMarks: submission.total_marks,
        answeredQuestions,
        totalQuestions,
        subjectName: submission.subject_name,
        evaluationResult,
        includeEvaluation: !!evaluationResult,
      });
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleEvaluateNow = async (submission: SubmissionRow) => {
    setEvaluatingId(submission.id);
    setEvalProgress(null);

    try {
      const sections = submission.exam_sections as ExamSection[];
      const result = await evaluateExam(
        sections,
        submission.answers || {},
        submission.mcq_answers || {},
        evaluationStrictness,
        (progress) => setEvalProgress(progress)
      );

      const qMarks: Record<string, number> = {};
      for (const qe of result.questionEvaluations) {
        qMarks[qe.questionId] = qe.marksAwarded;
      }

      await updateSubmissionMarks(
        submission.id,
        qMarks,
        result.totalMarksObtained,
        result.overallFeedback,
        result
      );

      // Refresh results list
      if (profile) {
        const updated = await getStudentEvaluations(profile.id);
        setResults(updated);
      }
    } catch (error) {
      console.error("Evaluation failed:", error);
    } finally {
      setEvaluatingId(null);
      setEvalProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-xl bg-primary/10">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Results</h1>
              <p className="text-sm text-muted-foreground">Your evaluated exam attempts</p>
            </div>
          </div>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="p-4 rounded-2xl bg-muted/50 mb-4">
              <FileText className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No evaluated results yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Complete an exam and use Super Teacher evaluation to see your results here.
            </p>
            <Link
              to={studentExamEntryPath}
              className="blob-btn"
            >
              {studentExamEntryLabel}
              <span className="blob-btn__inner">
                <span className="blob-btn__blobs">
                  <span className="blob-btn__blob" />
                  <span className="blob-btn__blob" />
                  <span className="blob-btn__blob" />
                  <span className="blob-btn__blob" />
                </span>
              </span>
            </Link>
          </motion.div>
        )}

        {/* Results List */}
        {!loading && results.length > 0 && (
          <div className="space-y-4">
            {results.map((result, index) => {
              const isPendingAiTeacher = result.status === 'pending' && result.evaluation_type === 'ai_teacher';
              const isPendingAi = result.status === 'pending' && result.evaluation_type === 'ai' && !result.evaluation_data;
              const isPending = isPendingAiTeacher || isPendingAi;
              const percentage =
                result.total_marks > 0 && result.total_marks_obtained !== null && !isPending
                  ? (result.total_marks_obtained / result.total_marks) * 100
                  : 0;
              const grade = getGrade(percentage);
              const gradeColor = getGradeColor(grade);
              const isExpanded = expandedId === result.id;
              const isAi = result.evaluation_type === "ai";
              const isAiTeacher = result.evaluation_type === "ai_teacher";
              const evalData = result.evaluation_data as EvaluationResult | null;

              return (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="rounded-xl border border-border bg-card overflow-hidden">
                    {/* Card Header */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : result.id)}
                      className="w-full p-5 flex items-center gap-4 hover:bg-[#071952]/10 transition-colors text-left"
                    >
                      {/* Grade / Pending Icon */}
                      {isPendingAi ? (
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-600">
                          <AlertTriangle size={24} />
                        </div>
                      ) : isPendingAiTeacher ? (
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-gray-500/10 text-black">
                          <Clock size={24} />
                        </div>
                      ) : (
                        <div
                          className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${gradeColor}`}
                        >
                          {grade}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-foreground truncate">
                            {result.subject_name}
                          </h3>
                          <ExamTypeBadge examType={result.exam_type ?? "main"} compact />
                          {isPendingAi ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700">
                              <Clock size={10} />
                              Pending Evaluation
                            </span>
                          ) : isPendingAiTeacher ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-500/10 text-black">
                              <Sparkles size={10} />
                              Pending Teacher Review
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                                isAi
                                  ? "bg-gray-500/10 text-black"
                                  : isAiTeacher
                                  ? "bg-gray-500/10 text-black"
                                  : "bg-gray-500/10 text-black"
                              }`}
                            >
                              {isAi ? <Cpu size={10} /> : isAiTeacher ? <Sparkles size={10} /> : <User size={10} />}
                              {isAi ? "Super Teacher" : isAiTeacher ? "Super Teacher + Teacher" : "Teacher Evaluated"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          {isPendingAi ? (
                            <span className="text-amber-700">Saved — tap to evaluate</span>
                          ) : isPendingAiTeacher ? (
                            <span className="text-black">Awaiting teacher review</span>
                          ) : (
                            <>
                              <span className="flex items-center gap-1">
                                <BookOpen size={14} />
                                {result.total_marks_obtained ?? 0}/{result.total_marks}
                              </span>
                              <span className="flex items-center gap-1">
                                <Target size={14} />
                                {percentage.toFixed(1)}%
                              </span>
                            </>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {formatTime(result.time_elapsed)}
                          </span>
                          <span>{formatDate(result.created_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {!isPending && (
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                        )}
                        {isExpanded ? (
                          <ChevronUp size={20} className="text-muted-foreground" />
                        ) : (
                          <ChevronDown size={20} className="text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="border-t border-border p-5 space-y-4 bg-accent/10">
                        {/* Pending AI evaluation — Evaluate Now */}
                        {isPendingAi && (
                          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">Evaluation Pending</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Your exam was saved during high demand. Click below to evaluate it now with Super Teacher.
                              </p>
                              <button
                                onClick={() => handleEvaluateNow(result)}
                                disabled={evaluatingId !== null}
                                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#071952] text-white hover:bg-[#071952]/80 transition-colors text-sm font-medium disabled:opacity-50"
                              >
                                {evaluatingId === result.id ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Sparkles size={16} />
                                )}
                                {evaluatingId === result.id ? "Evaluating..." : "Evaluate Now"}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Pending AI+Teacher info message */}
                        {isPendingAiTeacher && (
                          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-500/10 border border-black/20/20">
                            <Sparkles size={18} className="text-black shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-foreground">Super Teacher evaluation complete</p>
                              <p className="text-xs text-muted-foreground">
                                Your exam has been evaluated by Super Teacher and sent to the teacher for final review. Your marks and detailed feedback will be available once the teacher completes their review.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Overall Feedback */}
                        {result.feedback && !isPending && (
                          <div className="p-4 rounded-lg bg-card border border-border">
                            <h4 className="text-sm font-semibold text-foreground mb-2">
                              Overall Feedback
                            </h4>
                            <p className="text-sm text-muted-foreground">{result.feedback}</p>
                          </div>
                        )}

                        {/* Per-question breakdown for AI evaluations */}
                        {!isPending && evalData?.questionEvaluations && evalData.questionEvaluations.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-foreground">
                              Question Breakdown
                            </h4>
                            {evalData.questionEvaluations.map((qe, qi) => (
                              <div
                                key={qe.questionId}
                                className="p-3 rounded-lg bg-card border border-border"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-foreground">
                                    Q{qi + 1}
                                  </span>
                                  <span
                                    className={`text-sm font-semibold ${
                                      qe.isCorrect ? "text-black" : "text-black"
                                    }`}
                                  >
                                    {qe.marksAwarded}/{qe.maxMarks}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">{qe.feedback}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* For teacher evaluations without evaluation_data */}
                        {!isPending && !evalData &&
                          result.question_marks &&
                          Object.keys(result.question_marks).length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-foreground">
                                Marks Breakdown
                              </h4>
                              {Object.entries(result.question_marks).map(([qId, marks], qi) => (
                                <div
                                  key={qId}
                                  className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
                                >
                                  <span className="text-sm text-foreground">Question {qi + 1}</span>
                                  <span className="text-sm font-semibold text-foreground">
                                    {marks} marks
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                        {/* Re-download button */}
                        {!isPending && (
                          <button
                            onClick={() => handleRedownload(result)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-[#071952] hover:text-white transition-colors text-sm font-medium text-foreground"
                          >
                            <Download size={16} />
                            Download Word Document
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Evaluation Progress Overlay */}
      {evaluatingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md mx-4 p-6 rounded-2xl border border-border bg-card shadow-2xl"
          >
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Evaluating Your Exam</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait while Super Teacher evaluates your answers...
                </p>
              </div>

              {evalProgress && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium text-primary">
                        {evalProgress.currentQuestion} / {evalProgress.totalQuestions}
                      </span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(evalProgress.currentQuestion / evalProgress.totalQuestions) * 100}%`
                        }}
                        transition={{ duration: 0.3 }}
                        className="h-full bg-primary"
                      />
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/50 border border-border">
                    <p className="text-sm text-muted-foreground">{evalProgress.currentSection}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{evalProgress.message}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
