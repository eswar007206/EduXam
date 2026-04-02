import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Save,
  Loader2,
  Target,
  PenTool,
  FileText,
  BookOpen,
  Code2,
  User,
  Download,
  Play,
  Terminal,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { getSubmissionById, updateSubmissionMarks, updateSubmissionEvaluationData } from "@/services/submissionService";
import { sendParentNotification } from "@/services/emailService";
import { generateExamWordBlob, blobToBase64 } from "@/utils/exportToWord";
import { uploadExamResult } from "@/services/resultStorageService";
import { executeCode } from "@/services/codeExecutionService";
import type { SupportedLanguage } from "@/services/codeExecutionService";
import CodeEditorPanel from "@/components/CodeEditorPanel";
import { parseCombinedAnswer } from "@/utils/examHelpers";
import type { SubmissionRow } from "@/lib/database.types";
import type { ExamSection } from "@/features/exam/types";
import type { EvaluationResult } from "@/services/evaluationService";

function getIconComponent(iconName: string) {
  const iconMap: Record<string, React.ReactNode> = {
    Target: <Target className="w-full h-full" />,
    PenTool: <PenTool className="w-full h-full" />,
    FileText: <FileText className="w-full h-full" />,
    BookOpen: <BookOpen className="w-full h-full" />,
    Code2: <Code2 className="w-full h-full" />,
  };
  return iconMap[iconName] || null;
}

function getColorValue(colorClass: string): string {
  const colorMap: Record<string, string> = {
    "bg-sky-600": "#0284c7",
    "bg-black": "#000000",
  };
  return colorMap[colorClass] || "#000000";
}

export default function ReviewSubmissionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState<(SubmissionRow & { student_username?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [examSections, setExamSections] = useState<ExamSection[]>([]);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [questionMarks, setQuestionMarks] = useState<Record<string, number>>({});
  const [questionFeedback, setQuestionFeedback] = useState<Record<string, string>>({});
  const [feedbackSaving, setFeedbackSaving] = useState<Record<string, boolean>>({});
  const [feedbackSaved, setFeedbackSaved] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState("");

  const [codeRunState, setCodeRunState] = useState<
    Record<string, { running: boolean; stdout: string; stderr: string; exitCode: number | null }>
  >({});

  // Track editable code for inline compiler answers (teacher can modify to test)
  const [inlineCodeState, setInlineCodeState] = useState<Record<string, string>>({});

  const handleRunCode = useCallback(async (questionId: string, code: string, language: string) => {
    setCodeRunState((prev) => ({
      ...prev,
      [questionId]: { running: true, stdout: "", stderr: "", exitCode: null },
    }));
    try {
      const result = await executeCode(language as SupportedLanguage, code);
      setCodeRunState((prev) => ({
        ...prev,
        [questionId]: {
          running: false,
          stdout: result.stdout || "",
          stderr: result.stderr || result.compilationError || "",
          exitCode: result.exitCode,
        },
      }));
    } catch (err) {
      setCodeRunState((prev) => ({
        ...prev,
        [questionId]: {
          running: false,
          stdout: "",
          stderr: String(err),
          exitCode: 1,
        },
      }));
    }
  }, []);

  const loadSubmission = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getSubmissionById(id);
      if (data) {
        setSubmission(data);
        const sections = data.exam_sections as ExamSection[];
        setExamSections(sections);
        // Pre-fill marks if already evaluated
        if (data.question_marks && Object.keys(data.question_marks).length > 0) {
          setQuestionMarks(data.question_marks);
        }
        if (data.feedback) {
          setFeedback(data.feedback);
        }
        // Pre-fill per-question feedback from AI evaluation if present
        if (data.evaluation_data) {
          const evalData = data.evaluation_data as EvaluationResult;
          if (evalData.questionEvaluations) {
            const fb: Record<string, string> = {};
            for (const qe of evalData.questionEvaluations) {
              fb[qe.questionId] = qe.feedback || "";
            }
            setQuestionFeedback(fb);
          }
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSubmission();
  }, [loadSubmission]);

  const activeSection = examSections[activeSectionIndex];

  const totalMarksAwarded = Object.values(questionMarks).reduce((a, b) => a + b, 0);
  const totalMaxMarks = submission?.total_marks ?? 0;

  const allQuestionsMarked = examSections.every((section) =>
    section.questions.every((q) => questionMarks[q.id] !== undefined)
  );

  const handleMarkChange = (questionId: string, marks: number, maxMarks: number) => {
    const clamped = Math.max(0, Math.min(marks, maxMarks));
    setQuestionMarks((prev) => ({ ...prev, [questionId]: clamped }));
  };

  const handleFeedbackBlur = useCallback(async (questionId: string) => {
    if (!id || !submission) return;
    setFeedbackSaving((prev) => ({ ...prev, [questionId]: true }));
    try {
      const evalResult = buildTeacherEvalResult();
      await updateSubmissionEvaluationData(id, evalResult);
      setFeedbackSaved((prev) => ({ ...prev, [questionId]: true }));
      setTimeout(() => setFeedbackSaved((prev) => ({ ...prev, [questionId]: false })), 2000);
    } catch {
      // silently ignore
    } finally {
      setFeedbackSaving((prev) => ({ ...prev, [questionId]: false }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, submission, questionMarks, questionFeedback, feedback, examSections]);

  const buildTeacherEvalResult = () => {
    if (!submission) return undefined;
    // Build a QuestionEvaluation-like structure from teacher marks for the Word doc
    const qEvals = examSections.flatMap((section) =>
      section.questions.map((q) => ({
        questionId: q.id,
        questionText: q.text,
        studentAnswer:
          submission.mcq_answers?.[q.id] ||
          submission.answers?.[q.id] ||
          "[No answer provided]",
        maxMarks: q.marks,
        marksAwarded: questionMarks[q.id] ?? 0,
        feedback: questionFeedback[q.id] ?? "",
        isCorrect: (questionMarks[q.id] ?? 0) >= q.marks,
      }))
    );
    return {
      totalMarksObtained: totalMarksAwarded,
      totalMaxMarks: submission.total_marks,
      percentage:
        submission.total_marks > 0
          ? (totalMarksAwarded / submission.total_marks) * 100
          : 0,
      grade:
        totalMarksAwarded / submission.total_marks >= 0.9
          ? "A+"
          : totalMarksAwarded / submission.total_marks >= 0.8
          ? "A"
          : totalMarksAwarded / submission.total_marks >= 0.7
          ? "B+"
          : totalMarksAwarded / submission.total_marks >= 0.6
          ? "B"
          : totalMarksAwarded / submission.total_marks >= 0.5
          ? "C"
          : totalMarksAwarded / submission.total_marks >= 0.4
          ? "D"
          : "F",
      overallFeedback: feedback || "Evaluated by teacher.",
      questionEvaluations: qEvals,
      evaluationStrictness: "moderate" as const,
    };
  };

  const handleDownload = async () => {
    if (!submission) return;
    try {
      const sections = submission.exam_sections as ExamSection[];
      const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);
      const answeredCount =
        Object.keys(submission.answers || {}).length +
        Object.keys(submission.mcq_answers || {}).length;

      const blob = await generateExamWordBlob({
        examSections: sections,
        answers: submission.answers || {},
        mcqAnswers: submission.mcq_answers || {},
        timeElapsed: submission.time_elapsed || 0,
        totalMarks: submission.total_marks,
        answeredQuestions: answeredCount,
        totalQuestions,
        subjectName: submission.subject_name,
        evaluationResult: buildTeacherEvalResult(),
        includeEvaluation: true,
        studentName: (submission as SubmissionRow & { student_username?: string }).student_username,
      });

      const { saveAs } = await import("file-saver");
      const studentName =
        (submission as SubmissionRow & { student_username?: string }).student_username || "Student";
      saveAs(
        blob,
        `EduXam_${submission.subject_name.replace(/\s+/g, "_")}_${studentName.replace(/\s+/g, "_")}.docx`
      );
    } catch {
      // silently ignore download failures
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const evalResult = buildTeacherEvalResult();
      await updateSubmissionMarks(id, questionMarks, totalMarksAwarded, feedback || undefined, evalResult);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await loadSubmission();

      if (submission) {
        const percentage =
          submission.total_marks > 0
            ? (totalMarksAwarded / submission.total_marks) * 100
            : 0;
        const grade =
          percentage >= 90 ? "A+" :
          percentage >= 80 ? "A" :
          percentage >= 70 ? "B+" :
          percentage >= 60 ? "B" :
          percentage >= 50 ? "C" :
          percentage >= 40 ? "D" : "F";

        // Generate Word doc, upload to storage, and send parent email with attachment
        (async () => {
          try {
            const sections = submission.exam_sections as ExamSection[];
            const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);
            const answeredCount =
              Object.keys(submission.answers || {}).length +
              Object.keys(submission.mcq_answers || {}).length;

            const evalResult = buildTeacherEvalResult();
            const blob = await generateExamWordBlob({
              examSections: sections,
              answers: submission.answers || {},
              mcqAnswers: submission.mcq_answers || {},
              timeElapsed: submission.time_elapsed || 0,
              totalMarks: submission.total_marks,
              answeredQuestions: answeredCount,
              totalQuestions,
              subjectName: submission.subject_name,
              evaluationResult: evalResult,
              includeEvaluation: true,
              studentName: (submission as SubmissionRow & { student_username?: string }).student_username,
            });

            // Upload to storage (non-blocking, non-critical)
            uploadExamResult(submission.student_id, submission.subject_name, blob).catch(() => {});

            // Send parent email with Word doc attached
            const base64Doc = await blobToBase64(blob);
            sendParentNotification({
              studentId: submission.student_id,
              studentName:
                (submission as SubmissionRow & { student_username?: string }).student_username || "Student",
              subjectName: submission.subject_name,
              score: totalMarksAwarded,
              totalMarks: submission.total_marks,
              percentage,
              grade,
              evaluationType: submission.evaluation_type === 'ai_teacher' ? "ai_teacher" : "teacher",
              wordDocBase64: base64Doc,
            }).catch(() => {});
          } catch {
            // silently ignore background tasks
          }
        })();
      }
    } catch {
      // silently ignore
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="animate-pulse rounded bg-gray-200 w-5 h-5" />
          <div className="flex-1">
            <div className="animate-pulse rounded bg-gray-200 h-7 w-48 mb-2" />
            <div className="animate-pulse rounded bg-gray-200 h-4 w-32" />
          </div>
        </div>
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl bg-gray-200 h-10 w-28" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white border border-gray-100 rounded-xl p-4 h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="max-w-5xl mx-auto text-center py-20">
        <p className="text-gray-500">Submission not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/teacher/submissions")}
          className="text-gray-400 hover:text-gray-600 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-[#071952]"
          >
            Review Submission
          </motion.h1>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-sm text-gray-500">{submission.student_username || "Student"}</span>
            </div>
            <span className="text-gray-300">-</span>
            <span className="text-sm text-gray-500">{submission.subject_name}</span>
            <span className="text-gray-300">-</span>
            <span className="text-xs text-gray-400">{formatDate(submission.created_at)}</span>
            {submission.time_elapsed && (
              <>
                <span className="text-gray-300">-</span>
                <span className="text-xs text-gray-400">Duration: {formatTime(submission.time_elapsed)}</span>
              </>
            )}
          </div>
        </div>
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            submission.status === "pending"
              ? "bg-gray-50 text-black border border-black/20"
              : "bg-gray-50 text-black border border-black/20"
          }`}
        >
          {submission.status === "pending" ? (
            <Clock className="w-3 h-3" />
          ) : (
            <CheckCircle2 className="w-3 h-3" />
          )}
          {submission.status === "pending" ? "Pending Review" : "Evaluated"}
        </div>
      </div>

      {/* Auto-submitted due to violations */}
      {submission.submitted_due_to_violations && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border-2 border-black/20 mb-6"
        >
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-black" />
          </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-black">Auto-submitted due to violations</p>
              <p className="text-xs text-black mt-0.5">
                This exam was automatically submitted after the student stayed outside fullscreen for more than 10 seconds on 3 occasions. You are evaluating whatever the student had written until then.
              </p>
            </div>
          </motion.div>
        )}

      {/* Score Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-2 border-gray-100 rounded-2xl p-5 mb-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Marks Awarded</p>
            <p className="text-3xl font-extrabold text-black">
              {totalMarksAwarded}{" "}
              <span className="text-base font-medium text-gray-400">/ {totalMaxMarks}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-500">Percentage</p>
            <p className="text-3xl font-extrabold text-black">
              {totalMaxMarks > 0 ? Math.round((totalMarksAwarded / totalMaxMarks) * 100) : 0}%
            </p>
          </div>
        </div>
        {!allQuestionsMarked && submission.status === "pending" && (
          <p className="text-xs text-black mt-3">
            Assign marks to all questions before submitting the evaluation.
          </p>
        )}
      </motion.div>

      {/* AI Pre-Evaluated Banner */}
      {submission.evaluation_type === 'ai_teacher' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border-2 border-black/20 mb-6"
        >
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-black">Super Teacher Pre-Evaluated</p>
            <p className="text-xs text-black">
              Marks and feedback below were generated by Super Teacher. Review and adjust as needed before submitting.
            </p>
          </div>
        </motion.div>
      )}

      {/* Section Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {examSections.map((section, idx) => {
          const sectionMarked = section.questions.every((q) => questionMarks[q.id] !== undefined);
          const sectionTotal = section.questions.reduce(
            (acc, q) => acc + (questionMarks[q.id] ?? 0),
            0
          );
          const sectionMax = section.questions.length * section.marksPerQuestion;

          return (
            <button
              key={section.id}
              onClick={() => setActiveSectionIndex(idx)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition whitespace-nowrap ${
                activeSectionIndex === idx
                  ? "border-transparent text-white shadow-lg"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
              style={activeSectionIndex === idx ? { backgroundColor: getColorValue(section.color || "") } : {}}
            >
              <div className="w-4 h-4 text-white" style={activeSectionIndex !== idx ? { color: getColorValue(section.color || "") } : {}}>
                {getIconComponent(section.icon || "")}
              </div>
              <span>{section.name.replace(/Section [A-D] - /, "")}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeSectionIndex === idx
                    ? "bg-white/20 text-white"
                    : sectionMarked
                    ? "bg-gray-100 text-black"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {sectionTotal}/{sectionMax}
              </span>
            </button>
          );
        })}
      </div>

      {/* Questions */}
      {activeSection && (
        <div className="space-y-4">
          {activeSection.questions.map((question, qIdx) => {
            const isMCQ = question.type === "mcq";
            const isCode = question.type === "code";
            const studentMcqAnswer = submission.mcq_answers?.[question.id];
            const studentTextAnswer = submission.answers?.[question.id];
            const currentMarks = questionMarks[question.id];

            return (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: qIdx * 0.03 }}
                className="bg-white border-2 border-gray-100 rounded-2xl p-5"
              >
                {/* Question Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-xs text-gray-400 font-mono mt-1 shrink-0">
                      Q{qIdx + 1}.
                    </span>
                    <p className="text-sm text-[#071952] font-medium">{question.text}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-3">
                    {question.marks} marks
                  </span>
                </div>

                {/* Student's Answer */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                    Student's Answer
                  </p>
                  {isMCQ ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {question.options?.map((opt) => {
                        const isSelected = studentMcqAnswer === opt.id;
                        const isCorrect = question.correctOption === opt.id;
                        return (
                          <div
                            key={opt.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                              isSelected && isCorrect
                                ? "border-black/20 bg-gray-50 text-black"
                                : isSelected && !isCorrect
                                ? "border-black/20 bg-gray-50 text-black"
                                : isCorrect
                                ? "border-black/20 bg-gray-50/50 text-black"
                                : "border-gray-200 text-gray-600"
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? isCorrect
                                    ? "border-black/20 bg-gray-500"
                                    : "border-black/20 bg-gray-500"
                                  : isCorrect
                                  ? "border-black/20"
                                  : "border-gray-300"
                              }`}
                            >
                              {isSelected && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                            <span>{opt.text}</span>
                            {isCorrect && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-black ml-auto shrink-0" />
                            )}
                          </div>
                        );
                      })}
                      {!studentMcqAnswer && (
                        <p className="text-sm text-gray-400 italic col-span-2">Not answered</p>
                      )}
                    </div>
                  ) : isCode ? (
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      {/* Code header with language badge + Run button */}
                      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-500/20 text-black font-mono uppercase">
                          {(question as { language?: string }).language || "python"}
                        </span>
                        {studentTextAnswer && (
                          <button
                            onClick={() =>
                              handleRunCode(
                                question.id,
                                studentTextAnswer,
                                (question as { language?: string }).language || "python"
                              )
                            }
                            disabled={codeRunState[question.id]?.running}
                            className="flex items-center gap-1.5 px-3 py-1 bg-black hover:bg-black/80 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            {codeRunState[question.id]?.running ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                            {codeRunState[question.id]?.running ? "Running..." : "Run Code"}
                          </button>
                        )}
                      </div>

                      {/* Code display */}
                      <div className="bg-zinc-900 p-4">
                        {studentTextAnswer ? (
                          <pre className="text-sm text-black font-mono whitespace-pre-wrap overflow-x-auto">
                            <code>{studentTextAnswer}</code>
                          </pre>
                        ) : (
                          <p className="text-zinc-500 italic text-sm">No code submitted</p>
                        )}
                      </div>

                      {/* Output panel — shown once Run is clicked */}
                      {codeRunState[question.id] && !codeRunState[question.id].running && (
                        <div className="border-t border-zinc-700 bg-zinc-950 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                              Output
                            </span>
                            <span
                              className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                                codeRunState[question.id].exitCode === 0
                                  ? "bg-gray-500/20 text-black"
                                  : "bg-gray-500/20 text-black"
                              }`}
                            >
                              {codeRunState[question.id].exitCode === 0 ? "Passed" : "Error"}
                            </span>
                          </div>
                          {codeRunState[question.id].stdout ? (
                            <pre className="text-sm text-zinc-200 font-mono whitespace-pre-wrap">
                              {codeRunState[question.id].stdout}
                            </pre>
                          ) : null}
                          {codeRunState[question.id].stderr ? (
                            <pre className="text-sm text-black font-mono whitespace-pre-wrap mt-1">
                              {codeRunState[question.id].stderr}
                            </pre>
                          ) : null}
                          {!codeRunState[question.id].stdout && !codeRunState[question.id].stderr && (
                            <p className="text-zinc-500 italic text-sm">No output produced.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (() => {
                    const combined = studentTextAnswer ? parseCombinedAnswer(studentTextAnswer) : null;
                    const displayText = combined ? combined.text : studentTextAnswer;
                    const codeData = combined && combined.code?.trim() ? { code: combined.code, language: combined.language } : null;

                    return (
                      <div className="space-y-3">
                        {/* Rich text part */}
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-[#071952]">
                          {displayText ? (
                            <div
                              className="prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: displayText }}
                            />
                          ) : (
                            !codeData && <p className="text-gray-400 italic">Not answered</p>
                          )}
                        </div>

                        {/* Inline compiler code (runnable by teacher) */}
                        {codeData && (
                          <div className="rounded-xl border-2 border-black/20 overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-2 border-b border-black/20" style={{ backgroundColor: '#1e3a8a' }}>
                              <Code2 size={16} className="text-white" />
                              <span className="text-sm font-semibold text-white">Student's Code</span>
                              <span className="ml-auto text-xs px-2 py-0.5 rounded bg-white/20 text-white font-mono uppercase">
                                {codeData.language}
                              </span>
                            </div>
                            <div className="p-3">
                              <CodeEditorPanel
                                language={codeData.language as SupportedLanguage}
                                value={inlineCodeState[question.id] ?? codeData.code}
                                onChange={(code) => setInlineCodeState(prev => ({ ...prev, [question.id]: code }))}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* AI Feedback (for ai_teacher submissions) */}
                {submission.evaluation_type === 'ai_teacher' && !!submission.evaluation_data && (() => {
                  const aiEval = submission.evaluation_data as EvaluationResult;
                  const qFeedback = aiEval.questionEvaluations?.find(
                    (qe) => qe.questionId === question.id
                  );
                  if (!qFeedback) return null;
                  return (
                    <div className="p-3 rounded-lg bg-gray-50 border border-black/20 mb-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-black" />
                        <span className="text-xs font-semibold text-black">Super Teacher Feedback</span>
                        <span className="text-xs text-black ml-auto flex items-center gap-2">
                          {feedbackSaving[question.id] && (
                            <span className="flex items-center gap-1 text-black">
                              <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                            </span>
                          )}
                          {feedbackSaved[question.id] && !feedbackSaving[question.id] && (
                            <span className="flex items-center gap-1 text-black">
                              <CheckCircle2 className="w-3 h-3" /> Saved
                            </span>
                          )}
                          Super Teacher awarded: {qFeedback.marksAwarded}/{qFeedback.maxMarks}
                        </span>
                      </div>
                      <textarea
                        value={questionFeedback[question.id] ?? qFeedback.feedback ?? ""}
                        onChange={(e) => setQuestionFeedback(prev => ({ ...prev, [question.id]: e.target.value }))}
                        onBlur={() => handleFeedbackBlur(question.id)}
                        rows={2}
                        className="w-full text-xs text-black bg-transparent border-0 border-t border-black/20 mt-1 pt-1 resize-none focus:outline-none focus:ring-0 placeholder:text-black"
                        placeholder="Add feedback for this question..."
                      />
                    </div>
                  );
                })()}

                {/* Marks Input */}
                <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                  <label className="text-sm font-medium text-[#071952]">Marks:</label>
                  {isMCQ && currentMarks !== undefined && submission.status === "pending" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-black font-medium">
                      Auto-graded
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={question.marks}
                      step={0.5}
                      value={currentMarks ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                        handleMarkChange(question.id, val, question.marks);
                      }}
                      className="w-20 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[#071952] text-sm text-center focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-400">/ {question.marks}</span>
                  </div>
                  {/* Quick mark buttons */}
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleMarkChange(question.id, 0, question.marks)}
                      className={`px-2 py-1 rounded text-xs font-medium transition ${
                        currentMarks === 0
                          ? "bg-gray-100 text-black"
                          : "bg-gray-100 text-gray-500 hover:bg-[#071952] hover:text-white"
                      }`}
                    >
                      0
                    </button>
                    {question.marks > 1 && (
                      <button
                        onClick={() =>
                          handleMarkChange(
                            question.id,
                            Math.round(question.marks / 2 * 2) / 2,
                            question.marks
                          )
                        }
                        className={`px-2 py-1 rounded text-xs font-medium transition ${
                          currentMarks === Math.round(question.marks / 2 * 2) / 2
                            ? "bg-gray-100 text-black"
                            : "bg-gray-100 text-gray-500 hover:bg-[#071952] hover:text-white"
                        }`}
                      >
                        {Math.round(question.marks / 2 * 2) / 2}
                      </button>
                    )}
                    <button
                      onClick={() => handleMarkChange(question.id, question.marks, question.marks)}
                      className={`px-2 py-1 rounded text-xs font-medium transition ${
                        currentMarks === question.marks
                          ? "bg-gray-100 text-black"
                          : "bg-gray-100 text-gray-500 hover:bg-[#071952] hover:text-white"
                      }`}
                    >
                      {question.marks}
                    </button>
                  </div>
                  {/* Per-question save */}
                  <button
                    onClick={() => handleFeedbackBlur(question.id)}
                    disabled={feedbackSaving[question.id]}
                    className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#071952] text-white hover:bg-[#071952]/80 transition-colors disabled:opacity-50"
                  >
                    {feedbackSaving[question.id] ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : feedbackSaved[question.id] ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    {feedbackSaving[question.id] ? "Saving..." : feedbackSaved[question.id] ? "Saved" : "Save"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Feedback & Submit */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 bg-white border-2 border-gray-100 rounded-2xl p-5"
      >
        <label className="block text-sm font-medium text-[#071952] mb-2">
          Overall Feedback (Optional)
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[#071952] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm resize-none"
          placeholder="Add overall feedback for the student..."
        />

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            Total: <span className="font-bold text-black">{totalMarksAwarded}</span> /{" "}
            {totalMaxMarks} marks
            {totalMaxMarks > 0 && (
              <span className="ml-2 text-gray-400">
                ({Math.round((totalMarksAwarded / totalMaxMarks) * 100)}%)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {submission.status === "evaluated" && (
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-[#071952] hover:text-white transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Download Result
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !allQuestionsMarked}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#071952] text-white rounded-xl hover:bg-[#071952]/80 transition-colors text-sm font-semibold disabled:opacity-50 shadow-md shadow-[#1e3a8a]/25"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saved ? "Saved!" : submission.status === "evaluated" ? "Update Evaluation" : "Submit Evaluation"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
