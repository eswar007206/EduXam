import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
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
} from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { getStudentEvaluations } from "@/services/submissionService";
import { exportExamToWord } from "@/utils/exportToWord";
import type { SubmissionRow } from "@/lib/database.types";
import type { ExamSection } from "@/features/exam/types";
import type { EvaluationResult } from "@/services/evaluationService";

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
  if (grade === "A+" || grade === "A") return "text-emerald-500 bg-emerald-500/10";
  if (grade === "B+" || grade === "B") return "text-blue-500 bg-blue-500/10";
  if (grade === "C") return "text-yellow-500 bg-yellow-500/10";
  return "text-red-500 bg-red-500/10";
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
  const [results, setResults] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-24">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Home</span>
          </Link>
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
              Complete an exam and use AI evaluation to see your results here.
            </p>
            <Link
              to="/exam-practice"
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-colors"
            >
              Start Practicing
            </Link>
          </motion.div>
        )}

        {/* Results List */}
        {!loading && results.length > 0 && (
          <div className="space-y-4">
            {results.map((result, index) => {
              const isPendingAiTeacher = result.status === 'pending' && result.evaluation_type === 'ai_teacher';
              const percentage =
                result.total_marks > 0 && result.total_marks_obtained !== null && !isPendingAiTeacher
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
                      className="w-full p-5 flex items-center gap-4 hover:bg-accent/30 transition-colors text-left"
                    >
                      {/* Grade / Pending Icon */}
                      {isPendingAiTeacher ? (
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 bg-blue-500/10 text-blue-500">
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
                          {isPendingAiTeacher ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                              <Sparkles size={10} />
                              Pending Teacher Review
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                                isAi
                                  ? "bg-blue-500/10 text-blue-500"
                                  : isAiTeacher
                                  ? "bg-blue-500/10 text-blue-500"
                                  : "bg-blue-500/10 text-blue-500"
                              }`}
                            >
                              {isAi ? <Cpu size={10} /> : isAiTeacher ? <Sparkles size={10} /> : <User size={10} />}
                              {isAi ? "AI Evaluated" : isAiTeacher ? "AI + Teacher Evaluated" : "Teacher Evaluated"}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          {isPendingAiTeacher ? (
                            <span className="text-blue-500">Awaiting teacher review</span>
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
                        {!isPendingAiTeacher && (
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
                        {/* Pending AI+Teacher info message */}
                        {isPendingAiTeacher && (
                          <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <Sparkles size={18} className="text-blue-500 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-foreground">AI evaluation complete</p>
                              <p className="text-xs text-muted-foreground">
                                Your exam has been AI-evaluated and sent to the teacher for final review. Your marks and detailed feedback will be available once the teacher completes their review.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Overall Feedback */}
                        {result.feedback && !isPendingAiTeacher && (
                          <div className="p-4 rounded-lg bg-card border border-border">
                            <h4 className="text-sm font-semibold text-foreground mb-2">
                              Overall Feedback
                            </h4>
                            <p className="text-sm text-muted-foreground">{result.feedback}</p>
                          </div>
                        )}

                        {/* Per-question breakdown for AI evaluations */}
                        {!isPendingAiTeacher && evalData?.questionEvaluations && evalData.questionEvaluations.length > 0 && (
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
                                      qe.isCorrect ? "text-emerald-500" : "text-red-500"
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
                        {!isPendingAiTeacher && !evalData &&
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
                        {!isPendingAiTeacher && (
                          <button
                            onClick={() => handleRedownload(result)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border hover:bg-accent transition-colors text-sm font-medium text-foreground"
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
    </div>
  );
}
