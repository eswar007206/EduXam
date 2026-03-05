import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Timer,
  Save,
  Download,
  Flag,
  Maximize2,
  Minimize2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Sparkles,
  Trophy,
  Zap,
  Target,
  PenTool,
  FileText,
  BookOpen,
  Settings,
  X,
  Loader2,
  FileCheck,
  UserCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import HeroBg from "@/assets/vecteezy_abstract-boxes-background-modern-technology-with-square_8171873.jpg";
import Navbar from "@/components/Navbar";
import RichTextEditor from "@/components/RichTextEditor";
import SubjectSelector from "@/components/SubjectSelector";
import { SubjectCardSkeletonGrid } from "@/components/SkeletonLoaders";
import { StartExamModal } from "@/components/StartExamModal";
import { generateExamSections, buildCombinedAnswer, parseCombinedAnswer } from "@/utils/examHelpers";
import type { Department, ExamSection, MCQOption } from "@/features/exam/types";
import { fetchDepartments } from "@/lib/database";
import { generateExamWordBlob, blobToBase64 } from "@/utils/exportToWord";
import { uploadExamResult } from "@/services/resultStorageService";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { getStudentEnrollments } from "@/services/enrollmentService";
import { evaluateExam, type EvaluationResult, type EvaluationProgress } from "@/services/evaluationService";
import { saveTestResult, getStudentProgress, type SubjectProgress } from "@/services/testResultsService";
import { createSubmission } from "@/services/submissionService";
import { sendParentNotification } from "@/services/emailService";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";

type QuestionStatus = "unattempted" | "answered" | "marked" | "skipped";
const EXAM_DURATION = 90 * 60; // 90 minutes in seconds

// Helper function to get icon component from icon name
function getIconComponent(iconName: string) {
  const iconMap: Record<string, React.ReactNode> = {
    'Target': <Target className="w-full h-full" />,
    'PenTool': <PenTool className="w-full h-full" />,
    'FileText': <FileText className="w-full h-full" />,
    'BookOpen': <BookOpen className="w-full h-full" />
  };
  return iconMap[iconName] || iconName;
}

// Helper function to get color value from Tailwind class name
function getColorValue(colorClass: string): string {
  const colorMap: Record<string, string> = {
    'bg-sky-600': '#0284c7',
    'bg-teal-600': '#0d9488',
    'bg-orange-500': '#f97316',
    'bg-indigo-600': '#4f46e5'
  };
  const result = colorMap[colorClass];
  return result || '#3b82f6'; // Return blue as fallback instead of black
}

// Motivational messages that appear during the exam
const MOTIVATIONAL_MESSAGES = [
  "You're doing great! Keep going! 🚀",
  "Focus and finish strong! 💪",
  "Every question answered is progress! ✨",
  "You've got this! Stay confident! 🌟",
  "Almost there! Keep pushing! 🎯",
  "Great work! You're on fire! 🔥",
  "Stay calm and carry on! 😌",
  "Your hard work will pay off! 💎"
];

// Celebration messages for completing sections
const SECTION_COMPLETE_MESSAGES = [
  "🎉 Section Complete! Amazing work!",
  "🌟 You crushed it! Moving on!",
  "💪 One section down! Keep going!",
  "🚀 Fantastic! You're making progress!"
];

// Bump this when exam data format changes to invalidate stale localStorage
const EXAM_PROGRESS_VERSION = 2;

interface SavedProgress {
  version?: number;
  selectedDepartment: string | null;
  selectedSubject: string | null;
  examSections: ExamSection[];
  currentSectionIndex: number;
  currentQuestionIndex: number;
  answers: Record<string, string>;
  mcqAnswers: Record<string, string>;
  questionStatus: Record<string, QuestionStatus>;
  timeElapsed: number;
  streak: number;
  inlineCompilerOpen?: boolean;
  inlineCompilerCode?: string;
  inlineCompilerLang?: string;
}

export default function ExamPracticePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Departments fetched from database
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [studentProgress, setStudentProgress] = useState<Record<string, SubjectProgress>>({});

  // Fetch departments on mount, filtering by enrolled teachers for students
  useEffect(() => {
    let cancelled = false;
    setIsLoadingDepartments(true);

    const load = async () => {
      try {
        let teacherIds: string[] | undefined;

        if (profile?.role === "student") {
          // Fetch enrollments and progress in parallel
          const [enrollments, progress] = await Promise.all([
            getStudentEnrollments(profile.id),
            getStudentProgress(profile.id),
          ]);
          teacherIds = enrollments.map((e) => e.teacher_id);
          if (!cancelled) setStudentProgress(progress);
        } else if (profile?.role === "teacher") {
          teacherIds = [profile.id];
        }

        const deps = await fetchDepartments(teacherIds);
        if (!cancelled) setDepartments(deps);
      } catch {
        // silently ignore department fetch failures
      } finally {
        if (!cancelled) setIsLoadingDepartments(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [profile]);

  // Load saved progress from localStorage (discard stale versions)
  const [savedProgress] = useState<SavedProgress | null>(() => {
    const saved = localStorage.getItem('examProgress');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved) as SavedProgress;
      if (parsed.version !== EXAM_PROGRESS_VERSION) {
        localStorage.removeItem('examProgress');
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem('examProgress');
      return null;
    }
  });

  // Subject selection states
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(
    savedProgress?.selectedDepartment || null
  );
  const [selectedSubject, setSelectedSubject] = useState<string | null>(
    savedProgress?.selectedSubject || null
  );
  // Always show selector initially (user requirement)
  const [showSubjectSelector, setShowSubjectSelector] = useState(true);

  // Exam state
  const [examSections, setExamSections] = useState<ExamSection[]>(() => {
    if (savedProgress?.examSections) {
      return savedProgress.examSections;
    }
    return [];
  });

  const [currentSectionIndex, setCurrentSectionIndex] = useState(savedProgress?.currentSectionIndex || 0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(savedProgress?.currentQuestionIndex || 0);
  const [answers, setAnswers] = useState<Record<string, string>>(savedProgress?.answers || {});
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>(savedProgress?.mcqAnswers || {});
  const [questionStatus, setQuestionStatus] = useState<Record<string, QuestionStatus>>(savedProgress?.questionStatus || {});
  const [hasStarted, setHasStarted] = useState(savedProgress ? true : false);
  const [timeElapsed, setTimeElapsed] = useState(savedProgress?.timeElapsed || 0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [streak, setStreak] = useState(savedProgress?.streak || 0);
  const [showMotivation, setShowMotivation] = useState(false);
  const [motivationMessage, setMotivationMessage] = useState("");
  const [showSectionComplete, setShowSectionComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Inline compiler state
  const [inlineCompilerOpen, setInlineCompilerOpen] = useState(savedProgress?.inlineCompilerOpen || false);
  const [inlineCompilerCode, setInlineCompilerCode] = useState(savedProgress?.inlineCompilerCode || '');
  const [inlineCompilerLang, setInlineCompilerLang] = useState<'python' | 'c' | 'cpp' | 'java'>((savedProgress?.inlineCompilerLang as 'python' | 'c' | 'cpp' | 'java') || 'python');

  // Subject settings dialog
  const [showSubjectSettings, setShowSubjectSettings] = useState(false);
  const [tempExpectedMarks, setTempExpectedMarks] = useState<number>(0);

  // Evaluation state
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationProgress, setEvaluationProgress] = useState<EvaluationProgress | null>(null);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [showEvaluationResult, setShowEvaluationResult] = useState(false);
  const [includeEvaluationInDownload, setIncludeEvaluationInDownload] = useState(false);

  // Teacher submission state
  const [isSendingToTeacher, setIsSendingToTeacher] = useState(false);
  const [submissionSent, setSubmissionSent] = useState(false);
  const [submissionSentTitle, setSubmissionSentTitle] = useState("Sent to Teacher");
  const [submissionSentMessage, setSubmissionSentMessage] = useState("");

  // Settings context
  const {
    getSubjectExpectedMarks,
    setSubjectExpectedMarks,
    calculateProgress,
    evaluationStrictness
  } = useSettings();

  // Current section and question
  const currentSection = examSections[currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];

  // Calculate total questions and progress
  const totalQuestions = examSections.reduce((acc, section) => acc + section.questions.length, 0);
  const answeredQuestions = Object.keys(questionStatus).filter(k => questionStatus[k] === 'answered').length;

  // Calculate answered marks (for progress based on expected marks)
  const answeredMarks = examSections.reduce((acc, section) => {
    const sectionAnswered = section.questions.filter(q => questionStatus[q.id] === 'answered').length;
    return acc + (sectionAnswered * section.marksPerQuestion);
  }, 0);

  // Get expected marks for current subject (defaults to total marks)
  const totalMarks = examSections.reduce((acc, section) =>
    acc + section.questions.length * section.marksPerQuestion, 0
  );
  const expectedMarks = selectedSubject ? getSubjectExpectedMarks(selectedSubject, totalMarks) : totalMarks;

  // Progress based on expected marks: (Answered Marks / Expected Marks) * 100
  const progressPercentage = calculateProgress(answeredMarks, expectedMarks);

  // Handler for subject selection
  const handleSubjectSelect = (departmentId: string, subjectId: string) => {
    // Check if resuming existing session for same subject
    if (savedProgress?.selectedSubject === subjectId) {
      // Show start dialog for resume as well (keep state preserved)
      setShowStartDialog(true);
      return;
    }

    setSelectedDepartment(departmentId);
    setSelectedSubject(subjectId);
    const department = departments.find(d => d.id === departmentId);
    const subject = department?.subjects.find(s => s.id === subjectId);

    if (subject) {
      // Generate exam sections with questions
      const shuffled = [...subject.questions].sort(() => Math.random() - 0.5);
      const sections = generateExamSections(subjectId, shuffled);
      setExamSections(sections);

      // Reset exam progress
      setAnswers({});
      setMcqAnswers({});
      setQuestionStatus({});
      setCurrentQuestionIndex(0);
      setCurrentSectionIndex(0);
      setTimeElapsed(0);
      setStreak(0);

      // Always show start dialog for NEW selection
      setShowStartDialog(true);
      setHasStarted(false);
    }
  };

  // Function to restart the exam
  const restartExam = () => {
    localStorage.removeItem('examProgress');
    window.location.reload();
  };

  // Function to handle exam end
  const endExam = () => {
    saveNow();
    localStorage.removeItem('examProgress');
    navigate('/');
  };

  // Timer effect with auto-save
  useEffect(() => {
    if (!savedProgress) {
      localStorage.removeItem('examProgress');
      setTimeElapsed(0);
    }
  }, [savedProgress]);

  // Save function
  const saveNow = useCallback(() => {
    localStorage.setItem('examProgress', JSON.stringify({
      version: EXAM_PROGRESS_VERSION,
      answers,
      mcqAnswers,
      questionStatus,
      timeElapsed,
      examSections,
      currentSectionIndex,
      currentQuestionIndex,
      selectedDepartment,
      selectedSubject,
      streak,
      inlineCompilerOpen,
      inlineCompilerCode,
      inlineCompilerLang
    }));
  }, [answers, mcqAnswers, questionStatus, timeElapsed, examSections, currentSectionIndex, currentQuestionIndex, selectedDepartment, selectedSubject, streak, inlineCompilerOpen, inlineCompilerCode, inlineCompilerLang]);

  // Show random motivation every 5 minutes
  useEffect(() => {
    if (!hasStarted) return;

    const showRandomMotivation = () => {
      const randomMessage = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
      setMotivationMessage(randomMessage);
      setShowMotivation(true);
      setTimeout(() => setShowMotivation(false), 3000);
    };

    // Show motivation at 5 minute intervals
    if (timeElapsed > 0 && timeElapsed % 300 === 0) {
      showRandomMotivation();
    }
  }, [timeElapsed, hasStarted]);

  useEffect(() => {
    if (!hasStarted || timeElapsed >= EXAM_DURATION) return;

    const interval = setInterval(() => {
      setTimeElapsed((prev) => {
        const newTime = prev + 1;
        if (newTime % 60 === 0) {
          saveNow();
        }

        if (newTime >= EXAM_DURATION) {
          saveNow();
          setShowEndDialog(true);
          return EXAM_DURATION;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted, timeElapsed, saveNow]);

  const updateAnswer = (questionId: string, content: string) => {
    if (answers[questionId] !== content) {
      setAnswers((prev) => ({ ...prev, [questionId]: content }));
      if (!questionStatus[questionId] || questionStatus[questionId] !== 'answered') {
        setQuestionStatus((prev) => ({ ...prev, [questionId]: "answered" }));
        setStreak(prev => prev + 1);

        // Show confetti for streak milestones
        if ((streak + 1) % 5 === 0) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2000);
        }
      }
    }
  };

  const updateMcqAnswer = (questionId: string, optionId: string) => {
    setMcqAnswers((prev) => ({ ...prev, [questionId]: optionId }));
    if (!questionStatus[questionId] || questionStatus[questionId] !== 'answered') {
      setQuestionStatus((prev) => ({ ...prev, [questionId]: "answered" }));
      setStreak(prev => prev + 1);

      if ((streak + 1) % 5 === 0) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      }
    }
  };

  // Sync inline compiler state when navigating between questions
  useEffect(() => {
    if (!currentQuestion) return;
    const raw = answers[currentQuestion.id] || '';
    const combined = parseCombinedAnswer(raw);
    if (combined) {
      setInlineCompilerOpen(true);
      setInlineCompilerCode(combined.code);
      setInlineCompilerLang(combined.language as 'python' | 'c' | 'cpp' | 'java');
    } else {
      setInlineCompilerOpen(false);
      setInlineCompilerCode('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id]);

  const markForReview = () => {
    if (currentQuestion) {
      setQuestionStatus((prev) => ({
        ...prev,
        [currentQuestion.id]: prev[currentQuestion.id] === "marked" ? "unattempted" : "marked",
      }));
    }
  };

  const downloadAttempt = async () => {
    try {
      let subjectName = "Exam";
      if (selectedSubject) {
        for (const dept of departments) {
          const subject = dept.subjects.find((s) => s.id === selectedSubject);
          if (subject) {
            subjectName = subject.name;
            break;
          }
        }
      }

      const exportData = {
        examSections,
        answers,
        mcqAnswers,
        timeElapsed,
        totalMarks,
        answeredQuestions,
        totalQuestions,
        subjectName,
        evaluationResult: evaluationResult || undefined,
        includeEvaluation: includeEvaluationInDownload && evaluationResult !== null,
      };

      // Generate blob once and use it for both local download and cloud storage
      const blob = await generateExamWordBlob(exportData);

      // Trigger local download
      const { saveAs } = await import("file-saver");
      const fileName = `EduXam_${subjectName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.docx`;
      saveAs(blob, fileName);

      // Upload to Supabase storage in the background (don't block the download)
      if (profile) {
        uploadExamResult(profile.id, subjectName, blob).catch(() => {});
      }
    } catch {
      // silently ignore download failures
    }
  };

  // Start evaluation process
  const startEvaluation = async () => {
    setIsEvaluating(true);
    setEvaluationProgress(null);

    try {
      const result = await evaluateExam(
        examSections,
        answers,
        mcqAnswers,
        evaluationStrictness,
        (progress) => {
          setEvaluationProgress(progress);
        }
      );

      setEvaluationResult(result);
      setShowEvaluationResult(true);
      setShowEndDialog(false);
      setIncludeEvaluationInDownload(true);

      // Save test result to database
      if (profile && selectedSubject) {
        saveTestResult(profile.id, selectedSubject, result.totalMarksObtained, result.totalMaxMarks)
          .catch(() => {});

        // Save full evaluation as a submission for "My Results" page
        let subjectName = "Exam";
        for (const dept of departments) {
          const subject = dept.subjects.find((s) => s.id === selectedSubject);
          if (subject) {
            subjectName = subject.name;
            break;
          }
        }

        const qMarks: Record<string, number> = {};
        for (const qe of result.questionEvaluations) {
          qMarks[qe.questionId] = qe.marksAwarded;
        }

        createSubmission({
          studentId: profile.id,
          teacherId: null,
          subjectId: selectedSubject,
          subjectName,
          examSections,
          answers,
          mcqAnswers,
          totalMarks,
          timeElapsed,
          questionMarks: qMarks,
          totalMarksObtained: result.totalMarksObtained,
          evaluationType: 'ai',
          evaluationData: result,
          feedback: result.overallFeedback,
        }).catch(() => {});

        // Upload result to Supabase storage (cloud backup - always)
        (async () => {
          try {
            const wordBlob = await generateExamWordBlob({
              examSections,
              answers,
              mcqAnswers,
              timeElapsed,
              totalMarks,
              answeredQuestions,
              totalQuestions,
              subjectName,
              evaluationResult: result,
              includeEvaluation: true,
            });
            await uploadExamResult(profile.id, subjectName, wordBlob);
          } catch {
            // cloud backup is non-critical, silently ignore
          }
        })();

        // Send parent email notification if parent email is verified
        if (profile.parent_email_verified && profile.parent_email) {
          (async () => {
            try {
              const wordBlob = await generateExamWordBlob({
                examSections,
                answers,
                mcqAnswers,
                timeElapsed,
                totalMarks,
                answeredQuestions,
                totalQuestions,
                subjectName,
                evaluationResult: result,
                includeEvaluation: true,
              });
              const base64Doc = await blobToBase64(wordBlob);

              await sendParentNotification({
                studentId: profile.id,
                studentName: profile.username,
                subjectName,
                score: result.totalMarksObtained,
                totalMarks: result.totalMaxMarks,
                percentage: result.percentage,
                grade: result.grade,
                evaluationType: "ai",
                wordDocBase64: base64Doc,
              });
            } catch {
              // silently ignore parent notification failures
            }
          })();
        }
      }
    } catch {
      setEvaluationProgress({
        currentQuestion: 0,
        totalQuestions: totalQuestions,
        currentSection: "Error",
        status: "error",
        message: "Evaluation failed. Please try again.",
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  // Send exam to teacher for evaluation
  const sendToTeacher = async () => {
    if (!profile || !selectedSubject) return;

    // Find the subject and its teacher
    let teacherId: string | undefined;
    let subjectName = "Exam";
    for (const dept of departments) {
      const subject = dept.subjects.find((s) => s.id === selectedSubject);
      if (subject) {
        teacherId = subject.teacherId;
        subjectName = subject.name;
        break;
      }
    }

    if (!teacherId) {
      return;
    }

    setIsSendingToTeacher(true);
    try {
      // Auto-evaluate MCQ answers before sending
      const preCalculatedMarks: Record<string, number> = {};
      for (const section of examSections) {
        for (const question of section.questions) {
          if (question.type === 'mcq' && question.correctOption) {
            const selectedOption = mcqAnswers[question.id] || '';
            const isCorrect = question.correctOption === selectedOption;
            preCalculatedMarks[question.id] = isCorrect ? question.marks : 0;
          }
        }
      }

      await createSubmission({
        studentId: profile.id,
        teacherId,
        subjectId: selectedSubject,
        subjectName,
        examSections,
        answers,
        mcqAnswers,
        totalMarks,
        timeElapsed,
        questionMarks: preCalculatedMarks,
      });

      setSubmissionSentTitle("Sent to Teacher");
      setSubmissionSentMessage("Your exam has been submitted for teacher evaluation. You will be able to see your results once the teacher has reviewed your answers.");
      setSubmissionSent(true);
      setShowEndDialog(false);
      localStorage.removeItem("examProgress");
    } catch {
      // silently ignore send-to-teacher failures
    } finally {
      setIsSendingToTeacher(false);
    }
  };

  // AI + Teacher: AI evaluates first, then sends to teacher for review
  const startAiThenTeacherEvaluation = async () => {
    if (!profile || !selectedSubject) return;

    // Resolve teacher ID from subject
    let teacherId: string | undefined;
    let subjectName = "Exam";
    for (const dept of departments) {
      const subject = dept.subjects.find((s) => s.id === selectedSubject);
      if (subject) {
        teacherId = subject.teacherId;
        subjectName = subject.name;
        break;
      }
    }

    if (!teacherId) return;

    setIsEvaluating(true);
    setEvaluationProgress(null);

    try {
      // Step 1: Run AI evaluation with progress dialog
      const result = await evaluateExam(
        examSections,
        answers,
        mcqAnswers,
        evaluationStrictness,
        (progress) => {
          setEvaluationProgress(progress);
        }
      );

      // Step 2: Build question marks map from AI evaluation
      const qMarks: Record<string, number> = {};
      for (const qe of result.questionEvaluations) {
        qMarks[qe.questionId] = qe.marksAwarded;
      }

      // Step 3: Create submission as pending ai_teacher (no parent email, no test_results)
      await createSubmission({
        studentId: profile.id,
        teacherId,
        subjectId: selectedSubject,
        subjectName,
        examSections,
        answers,
        mcqAnswers,
        totalMarks,
        timeElapsed,
        questionMarks: qMarks,
        totalMarksObtained: result.totalMarksObtained,
        evaluationType: 'ai_teacher',
        evaluationData: result,
        feedback: result.overallFeedback,
      });

      // Step 4: Show success
      setSubmissionSentTitle("AI Evaluated & Sent to Teacher");
      setSubmissionSentMessage("Your exam has been AI-evaluated and sent for teacher review. The teacher will review the AI marks and finalize your results.");
      setSubmissionSent(true);
      setShowEndDialog(false);
      localStorage.removeItem("examProgress");
    } catch {
      setEvaluationProgress({
        currentQuestion: 0,
        totalQuestions: totalQuestions,
        currentSection: "Error",
        status: "error",
        message: "Evaluation failed. Please try again.",
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const getStatusColor = (status: QuestionStatus | undefined) => {
    switch (status) {
      case "answered":
        return "bg-green-500/20 border-green-500 text-green-500";
      case "marked":
        return "bg-yellow-500/20 border-yellow-500 text-yellow-500";
      case "skipped":
        return "bg-orange-500/20 border-orange-500 text-orange-500";
      default:
        return "bg-muted/20 border-muted text-muted-foreground";
    }
  };

  // Mark current question as skipped if it hasn't been answered or marked
  const markCurrentAsSkippedIfUnattempted = () => {
    if (currentQuestion && questionStatus[currentQuestion.id] !== "answered" && questionStatus[currentQuestion.id] !== "marked") {
      setQuestionStatus((prev) => ({ ...prev, [currentQuestion.id]: "skipped" }));
    }
  };

  // Navigate to next question
  const goToNextQuestion = () => {
    if (!currentSection) return;
    markCurrentAsSkippedIfUnattempted();

    if (currentQuestionIndex < currentSection.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (currentSectionIndex < examSections.length - 1) {
      // Moving to next section - show celebration
      const randomMessage = SECTION_COMPLETE_MESSAGES[Math.floor(Math.random() * SECTION_COMPLETE_MESSAGES.length)];
      setMotivationMessage(randomMessage);
      setShowSectionComplete(true);
      setTimeout(() => {
        setShowSectionComplete(false);
        setCurrentSectionIndex(prev => prev + 1);
        setCurrentQuestionIndex(0);
      }, 2000);
    }
  };

  // Navigate to previous question
  const goToPreviousQuestion = () => {
    markCurrentAsSkippedIfUnattempted();
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (currentSectionIndex > 0) {
      const prevSection = examSections[currentSectionIndex - 1];
      setCurrentSectionIndex(prev => prev - 1);
      setCurrentQuestionIndex(prevSection.questions.length - 1);
    }
  };

  // Jump to specific question
  const jumpToQuestion = (sectionIdx: number, questionIdx: number) => {
    markCurrentAsSkippedIfUnattempted();
    setCurrentSectionIndex(sectionIdx);
    setCurrentQuestionIndex(questionIdx);
  };

  // Calculate time remaining
  const timeRemaining = EXAM_DURATION - timeElapsed;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  // Get time color based on remaining time
  const getTimeColor = () => {
    if (timeRemaining < 300) return 'text-rose-600 bg-gradient-to-r from-rose-500/15 to-rose-600/10 border border-rose-200/30';
    if (timeRemaining < 900) return 'text-amber-600 bg-gradient-to-r from-amber-500/15 to-amber-600/10 border border-amber-200/30';
    return 'text-slate-700 bg-gradient-to-r from-slate-500/10 to-slate-600/5 border border-slate-200/20';
  };

  // Reset progress if accessing directly
  useEffect(() => {
    if (!selectedSubject && !savedProgress) {
      localStorage.removeItem('examProgress');
      setTimeElapsed(0);
    }
  }, [selectedSubject, savedProgress]);

  // Toggle fullscreen
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  // Calculate section progress
  const getSectionProgress = (section: ExamSection) => {
    const answered = section.questions.filter(q => questionStatus[q.id] === 'answered').length;
    return (answered / section.questions.length) * 100;
  };

  // If subject is not selected and there's no saved progress, show subject selector
  if (showSubjectSelector) {
    return (
      <div className="min-h-screen bg-background">
        {/* Global Background Image */}
        <div className="fixed inset-0 z-0 pointer-events-none">
          <img
            src={HeroBg}
            alt="Background"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        </div>

        <div className="relative z-50">
          <Navbar />
          <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-24 sm:pt-28">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative mb-8"
            >
              {/* Back Button */}
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 group"
              >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform duration-300" />
                <span>Back to Home</span>
              </Link>

            </motion.div>
            {isLoadingDepartments ? (
              <div className="container mx-auto px-3 sm:px-4">
                <SubjectCardSkeletonGrid count={6} />
              </div>
            ) : departments.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 px-4"
              >
                <div className="w-20 h-20 rounded-2xl bg-[#1e3a8a]/10 border border-[#1e3a8a]/20 flex items-center justify-center mb-6">
                  <BookOpen className="w-10 h-10 text-[#1e3a8a]" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3 text-center">
                  No Subjects Available
                </h2>
                <p className="text-muted-foreground text-center max-w-md mb-8 leading-relaxed">
                  {profile?.role === "student"
                    ? "You haven't enrolled with any teacher yet. Find and enroll with a teacher to access their subjects and start practicing."
                    : "You haven't created any subjects yet. Go to your Teacher Portal to create subjects and add questions."}
                </p>
                <Link
                  to={profile?.role === "student" ? "/teachers" : "/admin/dashboard"}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#1e3a8a] text-white rounded-xl font-semibold hover:bg-[#162d6e] transition-colors shadow-lg shadow-[#1e3a8a]/25"
                >
                  {profile?.role === "student" ? (
                    <>
                      Find Teachers
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </>
                  ) : (
                    <>
                      Go to Teacher Portal
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </>
                  )}
                </Link>
              </motion.div>
            ) : (
              <SubjectSelector departments={departments} onSelect={handleSubjectSelect} progress={studentProgress} />
            )}

            {/* Start Dialog moved here to overlay selector */}
            <StartExamModal
              open={showStartDialog}
              onOpenChange={(open) => {
                setShowStartDialog(open);
              }}
              onStart={() => {
                setShowStartDialog(false);
                setShowSubjectSelector(false);
                setHasStarted(true);
              }}
              onCancel={() => setShowStartDialog(false)}
              totalMarks={totalMarks}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!isFullScreen && <Navbar />}

      {/* Motivational Toast */}
      <AnimatePresence>
        {showMotivation && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full bg-primary text-white font-medium shadow-lg flex items-center gap-2"
          >
            <Sparkles size={20} />
            {motivationMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section Complete Animation */}
      <AnimatePresence>
        {showSectionComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className="bg-card p-8 rounded-2xl shadow-2xl text-center"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.5 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>
              <h2 className="text-2xl font-bold gradient-text mb-2">{motivationMessage}</h2>
              <p className="text-muted-foreground">Moving to next section...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confetti Effect */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  y: -20,
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                  rotate: 0,
                  opacity: 1
                }}
                animate={{
                  y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 20,
                  rotate: Math.random() * 360,
                  opacity: 0
                }}
                transition={{
                  duration: 2 + Math.random(),
                  delay: Math.random() * 0.5
                }}
                className="absolute w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa'][Math.floor(Math.random() * 5)]
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-6 sm:py-8 pt-24 sm:pt-28">
        {!isFullScreen && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft size={20} />
              <span>Back to Home</span>
            </Link>
          </motion.div>
        )}



        {/* End Dialog */}
        <AlertDialog open={showEndDialog && !isEvaluating} onOpenChange={setShowEndDialog}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trophy className="text-yellow-500" />
                {timeRemaining <= 0 ? "Time's Up!" : "End Exam?"}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <p>
                    {timeRemaining <= 0
                      ? "Your exam time has ended. Your answers have been saved automatically."
                      : "Are you sure you want to end the exam? Your answers will be saved."}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-green-500/10 text-center">
                      <p className="text-2xl font-bold text-green-500">{answeredQuestions}</p>
                      <p className="text-xs text-muted-foreground">Questions Answered</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/20 text-center">
                      <p className="text-2xl font-bold text-muted-foreground">{totalQuestions - answeredQuestions}</p>
                      <p className="text-xs text-muted-foreground">Unanswered</p>
                    </div>
                  </div>

                  {/* Evaluation Mode Info */}
                  <div className="p-3 rounded-lg bg-accent/50 border border-border">
                    <p className="text-sm flex items-center justify-between">
                      <span className="text-muted-foreground">Evaluation Mode:</span>
                      <span className={`font-medium capitalize ${evaluationStrictness === 'easy' ? 'text-green-500' :
                        evaluationStrictness === 'moderate' ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                        {evaluationStrictness}
                      </span>
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="!flex-row flex-wrap justify-end gap-2 !space-x-0 mt-2">
              <AlertDialogCancel className="mt-0">
                Cancel
              </AlertDialogCancel>
              <button
                onClick={() => {
                  setShowEndDialog(false);
                  downloadAttempt();
                }}
                className="inline-flex items-center justify-center px-3 py-2 rounded-md border border-border hover:bg-accent transition-colors text-sm"
              >
                <Download size={16} className="mr-1.5" />
                Download
              </button>
              <button
                onClick={startEvaluation}
                className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-colors text-sm"
              >
                <FileCheck size={16} className="mr-1.5" />
                AI Evaluate
              </button>
              {profile?.role === "student" && (
                <button
                  onClick={startAiThenTeacherEvaluation}
                  disabled={isSendingToTeacher || isEvaluating}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-[#1e3a8a] text-white hover:bg-[#162d6e] transition-colors disabled:opacity-50 text-sm"
                >
                  {isEvaluating ? (
                    <Loader2 size={16} className="mr-1.5 animate-spin" />
                  ) : (
                    <Sparkles size={16} className="mr-1.5" />
                  )}
                  AI + Teacher
                </button>
              )}
              {profile?.role === "student" && (
                <button
                  onClick={sendToTeacher}
                  disabled={isSendingToTeacher}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 text-sm"
                >
                  {isSendingToTeacher ? (
                    <Loader2 size={16} className="mr-1.5 animate-spin" />
                  ) : (
                    <UserCheck size={16} className="mr-1.5" />
                  )}
                  Send to Teacher
                </button>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Evaluation Progress Dialog */}
        {isEvaluating && (
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
                    Please wait while we evaluate your answers...
                  </p>
                </div>

                {evaluationProgress && (
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-primary">
                          {evaluationProgress.currentQuestion} / {evaluationProgress.totalQuestions}
                        </span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(evaluationProgress.currentQuestion / evaluationProgress.totalQuestions) * 100}%`
                          }}
                          transition={{ duration: 0.3 }}
                          className="h-full bg-primary"
                        />
                      </div>
                    </div>

                    {/* Current Section */}
                    <div className="p-3 rounded-lg bg-accent/50 border border-border">
                      <p className="text-sm text-muted-foreground">{evaluationProgress.currentSection}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {evaluationProgress.message}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-center gap-2 text-sm">
                      {evaluationProgress.status === "evaluating" && (
                        <>
                          <Loader2 size={16} className="animate-spin text-primary" />
                          <span className="text-muted-foreground">Evaluating question {evaluationProgress.currentQuestion}...</span>
                        </>
                      )}
                      {evaluationProgress.status === "error" && (
                        <span className="text-red-500">{evaluationProgress.message}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Submission Sent Success Dialog */}
        {submissionSent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-md mx-4 p-6 rounded-2xl border border-border bg-card shadow-2xl"
            >
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground">{submissionSentTitle}</h3>
                <p className="text-sm text-muted-foreground">
                  {submissionSentMessage || "Your exam has been submitted for teacher evaluation. You will be able to see your results once the teacher has reviewed your answers."}
                </p>
                <button
                  onClick={() => {
                    setSubmissionSent(false);
                    navigate("/");
                  }}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition font-medium text-sm"
                >
                  Back to Home
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Evaluation Result Dialog */}
        {showEvaluationResult && evaluationResult && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-16 pb-16">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowEvaluationResult(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-2xl mx-4 p-6 rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setShowEvaluationResult(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
              >
                <X size={20} />
              </button>

              <div className="space-y-6">
                {/* Header */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                    <Trophy className="w-10 h-10 text-yellow-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">Exam Results</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Here's how you performed!
                  </p>
                </div>

                {/* Score Card */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-primary/20 border border-primary/30 text-center">
                    <p className="text-3xl font-bold text-primary">{evaluationResult.totalMarksObtained}</p>
                    <p className="text-sm text-muted-foreground">/ {evaluationResult.totalMaxMarks}</p>
                    <p className="text-xs text-muted-foreground mt-1">Marks Obtained</p>
                  </div>
                  <div className="p-4 rounded-xl bg-accent/50 border border-border text-center">
                    <p className="text-3xl font-bold text-foreground">{evaluationResult.percentage.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground mt-1">Percentage</p>
                  </div>
                  <div className={`p-4 rounded-xl text-center ${evaluationResult.percentage >= 60
                    ? 'bg-green-500/10 border border-green-500/30'
                    : evaluationResult.percentage >= 40
                      ? 'bg-yellow-500/10 border border-yellow-500/30'
                      : 'bg-red-500/10 border border-red-500/30'
                    }`}>
                    <p className={`text-3xl font-bold ${evaluationResult.percentage >= 60
                      ? 'text-green-500'
                      : evaluationResult.percentage >= 40
                        ? 'text-yellow-500'
                        : 'text-red-500'
                      }`}>{evaluationResult.grade}</p>
                    <p className="text-xs text-muted-foreground mt-1">Grade</p>
                  </div>
                </div>

                {/* Overall Feedback */}
                <div className="p-4 rounded-xl bg-accent/50 border border-border">
                  <p className="text-sm text-foreground">{evaluationResult.overallFeedback}</p>
                </div>

                {/* Section Breakdown */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Target size={18} />
                    Section Breakdown
                  </h4>
                  {examSections.map((section) => {
                    const sectionEvals = evaluationResult.questionEvaluations.filter(
                      e => section.questions.some(q => q.id === e.questionId)
                    );
                    const sectionMarks = sectionEvals.reduce((acc, e) => acc + e.marksAwarded, 0);
                    const sectionMaxMarks = section.questions.length * section.marksPerQuestion;
                    const sectionPercentage = sectionMaxMarks > 0 ? (sectionMarks / sectionMaxMarks) * 100 : 0;

                    return (
                      <div key={section.id} className="p-3 rounded-lg bg-muted/30 border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium flex items-center gap-2">
                            <span>{section.icon}</span>
                            {section.name}
                          </span>
                          <span className="text-sm font-bold text-primary">
                            {sectionMarks}/{sectionMaxMarks}
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${sectionPercentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Download Options */}
                <div className="p-4 rounded-xl bg-accent/30 border border-border space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeEvaluationInDownload}
                      onChange={(e) => setIncludeEvaluationInDownload(e.target.checked)}
                      className="w-5 h-5 rounded border-border accent-primary"
                    />
                    <span className="text-sm text-foreground">
                      Include evaluation marks & feedback in Word document
                    </span>
                  </label>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      await downloadAttempt();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border hover:bg-accent transition-colors font-medium"
                  >
                    <Download size={18} />
                    Download Word Document
                  </button>
                  <button
                    onClick={() => {
                      setShowEvaluationResult(false);
                      endExam();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-colors font-medium"
                  >
                    <CheckCircle2 size={18} />
                    Finish & Exit
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Subject Settings Dialog */}
        {showSubjectSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowSubjectSettings(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md mx-4 p-6 rounded-2xl border border-border bg-card shadow-2xl"
            >
              <button
                onClick={() => setShowSubjectSettings(false)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
              >
                <X size={20} />
              </button>

              <div className="space-y-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Target className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">Set Your Goal</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    How many marks are you expecting in this exam?
                  </p>
                </div>

                {/* Expected Marks Input */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-foreground">
                    Expected Marks (out of {totalMarks})
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max={totalMarks}
                      value={tempExpectedMarks}
                      onChange={(e) => setTempExpectedMarks(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="w-20 flex items-center justify-center px-4 py-2 rounded-lg border border-border bg-accent font-bold text-lg text-primary">
                      {tempExpectedMarks}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Min: 1</span>
                    <span>Max: {totalMarks}</span>
                  </div>
                </div>

                {/* Preview */}
                <div className="p-4 rounded-xl bg-accent/50 border border-border space-y-3">
                  <p className="text-sm font-medium text-foreground">Progress Preview</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Marks Answered</span>
                      <span className="font-medium">{answeredMarks}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Expected Marks</span>
                      <span className="font-medium text-primary">{tempExpectedMarks}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${Math.min((answeredMarks / tempExpectedMarks) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-center text-sm font-medium">
                      {Math.round(Math.min((answeredMarks / tempExpectedMarks) * 100, 100))}% of goal
                    </p>
                  </div>
                </div>

                {/* Strictness Indicator */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-sm text-muted-foreground">Evaluation Mode</span>
                  <span className={`text-sm font-medium capitalize ${evaluationStrictness === 'easy' ? 'text-green-500' :
                    evaluationStrictness === 'moderate' ? 'text-yellow-500' : 'text-red-500'
                    }`}>
                    {evaluationStrictness}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSubjectSettings(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-border hover:bg-accent transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (selectedSubject) {
                        setSubjectExpectedMarks(selectedSubject, tempExpectedMarks);
                      }
                      setShowSubjectSettings(false);
                    }}
                    className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-colors font-medium"
                  >
                    Save Goal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Main Exam Interface */}
        {hasStarted && currentQuestion && (
          <div className="space-y-6">
            {/* Top Progress Bar */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative"
            >
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full bg-primary"
                />
              </div>
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>{answeredMarks}/{expectedMarks} marks ({answeredQuestions} of {totalQuestions} questions)</span>
                <span className="flex items-center gap-2">
                  {expectedMarks < totalMarks && (
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                      🎯 Goal: {expectedMarks}
                    </span>
                  )}
                  <span>{Math.round(progressPercentage)}% complete</span>
                </span>
              </div>
            </motion.div>

            {/* Header with Timer and Stats */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card"
            >
              <div className="flex items-center gap-4 flex-wrap">
                {/* Timer */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono ${getTimeColor()}`}>
                  <Timer size={20} />
                  <span className="text-lg font-bold">
                    {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                  </span>
                </div>

                {/* Streak Counter */}
                {streak > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/15 border border-primary/30 text-primary"
                  >
                    <Zap size={18} />
                    <span className="font-semibold">{streak} streak!</span>
                  </motion.div>
                )}

                {/* Current Section Info */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500/12 to-cyan-500/8 border border-teal-200/30 text-teal-700 font-medium">
                  <span className="text-xl">{getIconComponent(currentSection?.icon || '')}</span>
                  <span className="text-sm hidden sm:inline">{currentSection?.name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Subject Settings Button */}
                <button
                  onClick={() => {
                    setTempExpectedMarks(expectedMarks);
                    setShowSubjectSettings(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
                  title="Subject Settings"
                >
                  <Settings size={18} />
                  <span className="hidden sm:inline">Goal</span>
                </button>
                <button
                  onClick={saveNow}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
                  title="Save Progress"
                >
                  <Save size={18} />
                  <span className="hidden sm:inline">Save</span>
                </button>
                <button
                  onClick={downloadAttempt}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
                  title="Download Attempt"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={toggleFullScreen}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent transition-colors"
                  title="Toggle Fullscreen"
                >
                  {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
              </div>
            </motion.div>

            {/* Section Navigation Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {examSections.map((section, idx) => (
                <motion.button
                  key={section.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setCurrentSectionIndex(idx);
                    setCurrentQuestionIndex(0);
                  }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all whitespace-nowrap ${currentSectionIndex === idx
                    ? 'border-transparent text-white shadow-lg'
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  style={currentSectionIndex === idx ? { backgroundColor: getColorValue(section.color ?? 'bg-blue-500') } : {}}
                >
                  <span className={`text-lg ${currentSectionIndex === idx ? 'text-white' : 'text-slate-600'}`}>{getIconComponent(section.icon ?? 'BookOpen')}</span>
                  <div className="text-left">
                    <p className={`font-semibold text-sm ${currentSectionIndex === idx ? 'text-white' : 'text-slate-800'}`}>{section.name.split(' - ')[0]}</p>
                    <p className={`text-xs ${currentSectionIndex === idx ? 'text-white/70' : 'text-slate-500'}`}>
                      {section.questions.length} × {section.marksPerQuestion}m
                    </p>
                  </div>
                  {/* Section Progress Indicator */}
                  <div className="ml-2 w-8 h-8 relative">
                    <svg className="w-8 h-8 -rotate-90">
                      <circle
                        cx="16"
                        cy="16"
                        r="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-20"
                      />
                      <circle
                        cx="16"
                        cy="16"
                        r="12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray={`${(getSectionProgress(section) / 100) * 75.4} 75.4`}
                        className={currentSectionIndex === idx ? 'text-white' : 'text-primary'}
                      />
                    </svg>
                  </div>
                </motion.button>
              ))}

            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-4">
              {/* Question Panel */}
              <div className="lg:col-span-3 space-y-6">
                {/* Section Header */}
                <motion.div
                  key={currentSection?.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-6 rounded-2xl text-white shadow-lg`}
                  style={{
                    backgroundColor: getColorValue(currentSection?.color || '')
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold flex items-center gap-3">
                        <span className="text-4xl">{getIconComponent(currentSection?.icon || '')}</span>
                        {currentSection?.name}
                      </h2>
                      <p className="text-white text-sm mt-2 font-medium opacity-90">{currentSection?.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">
                        {currentQuestionIndex + 1}/{currentSection?.questions.length}
                      </p>
                      <p className="text-white text-sm font-medium opacity-90">{currentSection?.marksPerQuestion} marks each</p>
                    </div>
                  </div>
                </motion.div>

                {/* Question */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                    className="p-6 rounded-xl border border-border bg-card"
                  >
                    <div className="flex items-start justify-between gap-4 mb-6">
                      <div className="flex items-start gap-3">
                        <span className="shrink-0 w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                          Q{currentQuestionIndex + 1}
                        </span>
                        <h2 className="text-lg font-medium text-foreground pt-1.5">
                          {currentQuestion.text}
                        </h2>
                      </div>
                      <span className="shrink-0 px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-medium">
                        {currentQuestion.marks} {currentQuestion.marks === 1 ? 'mark' : 'marks'}
                      </span>
                    </div>

                    {/* MCQ Options */}
                    {currentQuestion.type === 'mcq' && currentQuestion.options && (
                      <div className="space-y-3">
                        {currentQuestion.options.map((option: MCQOption, idx: number) => (
                          <motion.button
                            key={option.id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => updateMcqAnswer(currentQuestion.id, option.id)}
                            className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${mcqAnswers[currentQuestion.id] === option.id
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50 hover:bg-accent'
                              }`}
                          >
                            <span className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-medium transition-all ${mcqAnswers[currentQuestion.id] === option.id
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-muted-foreground'
                              }`}>
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="flex-1">{option.text}</span>
                            {mcqAnswers[currentQuestion.id] === option.id && (
                              <CheckCircle2 className="text-primary" size={20} />
                            )}
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {/* Text Answer */}
                    {currentQuestion.type !== 'mcq' && (() => {
                      const raw = answers[currentQuestion.id] || '';
                      const combined = parseCombinedAnswer(raw);
                      const textContent = combined ? combined.text : raw;
                      return (
                        <RichTextEditor
                          content={textContent}
                          onChange={(content) => {
                            const finalAnswer = inlineCompilerOpen && inlineCompilerCode.trim()
                              ? buildCombinedAnswer(content, inlineCompilerCode, inlineCompilerLang)
                              : content;
                            updateAnswer(currentQuestion.id, finalAnswer);
                          }}
                          showCompiler={inlineCompilerOpen}
                          onToggleCompiler={() => setInlineCompilerOpen(!inlineCompilerOpen)}
                          compilerCode={inlineCompilerCode}
                          onCompilerCodeChange={(code) => {
                            setInlineCompilerCode(code);
                            const raw2 = answers[currentQuestion.id] || '';
                            const combined2 = parseCombinedAnswer(raw2);
                            const textPart = combined2 ? combined2.text : raw2;
                            const finalAnswer = code.trim()
                              ? buildCombinedAnswer(textPart, code, inlineCompilerLang)
                              : textPart;
                            setAnswers((prev) => ({ ...prev, [currentQuestion.id]: finalAnswer }));
                          }}
                          compilerLanguage={inlineCompilerLang}
                          onCompilerLanguageChange={(lang) => {
                            setInlineCompilerLang(lang);
                            if (inlineCompilerCode.trim()) {
                              const raw3 = answers[currentQuestion.id] || '';
                              const combined3 = parseCombinedAnswer(raw3);
                              const textPart = combined3 ? combined3.text : raw3;
                              const finalAnswer = buildCombinedAnswer(textPart, inlineCompilerCode, lang);
                              setAnswers((prev) => ({ ...prev, [currentQuestion.id]: finalAnswer }));
                            }
                          }}
                        />
                      );
                    })()}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="flex items-center justify-between gap-4">
                  <button
                    onClick={goToPreviousQuestion}
                    disabled={currentSectionIndex === 0 && currentQuestionIndex === 0}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground enabled:hover:bg-primary/90 enabled:hover:shadow-xl enabled:hover:scale-110 transition-all duration-200 disabled:bg-primary/40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={20} />
                    Previous
                  </button>

                  <button
                    onClick={markForReview}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${questionStatus[currentQuestion.id] === 'marked'
                      ? 'border-yellow-500 bg-yellow-500/20 text-yellow-500'
                      : 'border-border hover:bg-accent'
                      }`}
                  >
                    <Flag size={18} />
                    <span className="hidden sm:inline">
                      {questionStatus[currentQuestion.id] === 'marked' ? 'Marked' : 'Mark for Review'}
                    </span>
                  </button>

                  {/* Next button - changes to Finish on last question */}
                  {currentSectionIndex === examSections.length - 1 && currentQuestionIndex === currentSection.questions.length - 1 ? (
                    <button
                      onClick={() => setShowEndDialog(true)}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      Finish Exam
                      <CheckCircle2 size={20} />
                    </button>
                  ) : (
                    <button
                      onClick={goToNextQuestion}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:scale-105 transition-all duration-200"
                    >
                      Next
                      <ChevronRight size={20} />
                    </button>
                  )}
                </div>
              </div>

              {/* Question Navigator Sidebar */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="sticky top-20 p-4 rounded-xl border border-border bg-card space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Target size={18} />
                      Navigator
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {answeredQuestions}/{totalQuestions}
                    </span>
                  </div>

                  {/* Question Grid by Section */}
                  <div className="space-y-4 max-h-100 overflow-y-auto">
                    {examSections.map((section, sectionIdx) => (
                      <div key={section.id} className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <span>{section.icon}</span>
                          {section.name.split(' - ')[0]}
                        </p>
                        <div className="grid grid-cols-4 gap-1.5">
                          {section.questions.map((q, qIdx) => (
                            <button
                              key={q.id}
                              onClick={() => jumpToQuestion(sectionIdx, qIdx)}
                              className={`aspect-square rounded-lg border-2 flex items-center justify-center text-sm font-medium transition-all ${currentSectionIndex === sectionIdx && currentQuestionIndex === qIdx
                                ? 'border-primary bg-primary text-primary-foreground scale-110'
                                : getStatusColor(questionStatus[q.id])
                                }`}
                            >
                              {qIdx + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="space-y-2 text-sm border-t border-border pt-4">
                    <div className="flex items-center gap-2">
                      <Circle size={16} className="text-muted-foreground" />
                      <span className="text-muted-foreground">Unattempted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500" />
                      <span className="text-muted-foreground">Answered</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Circle size={16} className="text-orange-500" />
                      <span className="text-muted-foreground">Skipped — Not Answered</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Flag size={16} className="text-yellow-500" />
                      <span className="text-muted-foreground">Marked for Review</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="p-3 rounded-lg bg-accent space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Marks</span>
                      <span className="font-medium">{totalMarks}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{Math.round(progressPercentage)}%</span>
                    </div>
                  </div>

                  {/* End Exam Button */}
                  <button
                    onClick={() => setShowEndDialog(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors font-medium"
                  >
                    <LogOut size={18} />
                    End Exam
                  </button>

                  {/* Restart Button */}
                  <button
                    onClick={restartExam}
                    className="w-full px-4 py-2 rounded-xl border border-border hover:bg-accent transition-colors text-sm text-muted-foreground"
                  >
                    Restart with New Questions
                  </button>
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
