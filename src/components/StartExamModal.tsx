import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/shared/ui/alert-dialog";
import { AlertCircle, Award, BookOpen, Clock, Loader2, Lock, ShieldAlert, Zap } from "lucide-react";
import { hasStudentAttemptedSubject } from "@/services/submissionService";
import { hasRetakePermission } from "@/services/examRetakeService";
import type { ExamType } from "@/features/exam/types";
import { getStudentMainExamAccess } from "@/services/examGovernanceService";
import type { MainExamScheduleSlotRow } from "@/lib/database.types";
import { EXAM_PORTAL_LABEL } from "@/lib/portalLabels";

interface StartExamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (examStartTime?: string | null, durationMinutes?: number) => void;
  onCancel: () => void;
  totalMarks: number;
  subjectSlug?: string | null;
  subjectUuid?: string | null;
  studentId?: string | null;
  studentEmail?: string | null;
  teacherId?: string | null;
  isStudent?: boolean;
  examType?: ExamType;
  strictModeSupported?: boolean;
}

export function StartExamModal({
  open,
  onOpenChange,
  onStart,
  onCancel,
  totalMarks,
  subjectSlug = null,
  subjectUuid = null,
  studentId = null,
  studentEmail = null,
  teacherId = null,
  isStudent = false,
  examType = "main",
  strictModeSupported = true,
}: StartExamModalProps) {
  const isMainExam = examType === "main";
  const [controlLoading, setControlLoading] = useState(false);
  const [attemptCheckLoading, setAttemptCheckLoading] = useState(false);
  const [examStarted, setExamStarted] = useState(!isMainExam);
  const [examStartTime, setExamStartTime] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [alreadyAttempted, setAlreadyAttempted] = useState(false);
  const [examTitle, setExamTitle] = useState<string | null>(null);
  const [examDescription, setExamDescription] = useState<string | null>(null);
  const [examInstructions, setExamInstructions] = useState<string | null>(null);
  const [nextSlot, setNextSlot] = useState<MainExamScheduleSlotRow | null>(null);
  const [hasAssignedSlot, setHasAssignedSlot] = useState(false);
  const [rulesAcknowledged, setRulesAcknowledged] = useState(false);

  useEffect(() => {
    if (!open || !isStudent || !subjectUuid || !isMainExam) {
      setExamStarted(true);
      setExamStartTime(null);
      setDurationMinutes(90);
      setAlreadyAttempted(false);
      setExamTitle(null);
      setExamDescription(null);
      setExamInstructions(null);
      setNextSlot(null);
      setHasAssignedSlot(false);
      setRulesAcknowledged(false);
      return;
    }

    let cancelled = false;
    setControlLoading(true);
    setExamStarted(false);
    setExamStartTime(null);
    setDurationMinutes(90);
    setAlreadyAttempted(false);
    setExamTitle(null);
    setExamDescription(null);
    setExamInstructions(null);
    setNextSlot(null);
    setHasAssignedSlot(false);
    setRulesAcknowledged(false);

    getStudentMainExamAccess(subjectUuid, studentEmail ?? "")
      .then((access) => {
        if (!cancelled) {
          setExamStarted(access.canStart);
          setExamStartTime(access.currentSlot?.start_time ?? null);
          setDurationMinutes(access.durationMinutes ?? 90);
          setExamTitle(access.examTitle ?? null);
          setExamDescription(access.examDescription ?? null);
          setExamInstructions(access.examInstructions ?? null);
          setNextSlot(access.nextSlot);
          setHasAssignedSlot(access.matchingSlots.length > 0);
        }
      })
      .finally(() => {
        if (!cancelled) setControlLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, isStudent, subjectUuid, studentEmail, isMainExam]);

  useEffect(() => {
    if (!open || !isStudent || !studentId || !teacherId || !subjectUuid || !isMainExam) {
      setAlreadyAttempted(false);
      return;
    }

    let cancelled = false;
    setAttemptCheckLoading(true);
    setAlreadyAttempted(false);

    Promise.all([
      hasStudentAttemptedSubject(studentId, subjectUuid, subjectSlug ?? undefined, examType),
      hasRetakePermission(teacherId, studentId, subjectUuid),
    ])
      .then(([attempted, hasRetake]) => {
        if (!cancelled) setAlreadyAttempted(attempted && !hasRetake);
      })
      .catch(() => {
        if (!cancelled) setAlreadyAttempted(false);
      })
      .finally(() => {
        if (!cancelled) setAttemptCheckLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, isStudent, studentId, teacherId, subjectUuid, subjectSlug, examType, isMainExam]);

  const requiresRulesAcknowledgement = isStudent && isMainExam && examStarted && !alreadyAttempted;
  const canStart =
    ((!isStudent || !isMainExam || examStarted) && !alreadyAttempted && (!requiresRulesAcknowledgement || rulesAcknowledged));
  const showWaitMessage = isStudent && isMainExam && !controlLoading && !examStarted;
  const showAlreadyAttempted = isStudent && isMainExam && !attemptCheckLoading && alreadyAttempted;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl flex items-center gap-2 shrink-0">
            <BookOpen className="text-black" />
            {isMainExam ? `Ready to Start Your ${EXAM_PORTAL_LABEL}?` : "Ready to Start Your Prep Exam?"}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 min-h-0">
              {showAlreadyAttempted && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-500/10 border border-black/20">
                  <Lock className="text-black shrink-0" size={24} />
                  <div>
                    <p className="font-medium text-foreground">Already attempted</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      You have already completed this exam portal attempt. You cannot re-attempt unless your teacher grants you permission.
                    </p>
                  </div>
                </div>
              )}

              {showWaitMessage && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-500/10 border border-black/20">
                  <AlertCircle className="text-black shrink-0" size={24} />
                  <div>
                    <p className="font-medium text-foreground">{EXAM_PORTAL_LABEL} has not started yet</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {nextSlot
                        ? `Your slot ${nextSlot.slot_name} opens on ${new Date(nextSlot.start_time).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}.`
                        : hasAssignedSlot
                          ? "Your assigned slot is not active right now. Please return during your approved exam window."
                          : "No exam slot has been assigned to your account yet. Please contact your admin."}
                    </p>
                  </div>
                </div>
              )}

              {(controlLoading || attemptCheckLoading) && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <Loader2 className="w-5 h-5 animate-spin text-black" />
                  <span className="text-sm text-muted-foreground">Checking exam status...</span>
                </div>
              )}

              {!isMainExam && (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-black/10 border border-black/20">
                  <Zap className="text-black shrink-0" size={24} />
                  <div>
                    <p className="font-medium text-foreground">Practice freely</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Prep exams can be taken as many times as you want so you can keep practicing.
                    </p>
                  </div>
                </div>
              )}

              {isMainExam && examStarted && (examTitle || examDescription || examInstructions) && (
                <div className="space-y-3 p-4 rounded-lg bg-black/10 border border-black/20">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Exam Details</p>
                    <p className="font-semibold text-foreground mt-1">{examTitle || EXAM_PORTAL_LABEL}</p>
                  </div>
                  {examDescription && (
                    <p className="text-sm text-muted-foreground">{examDescription}</p>
                  )}
                  {examInstructions && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Instructions</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{examInstructions}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 p-4 rounded-lg bg-black/10 border border-black/20">
                <Clock className="text-black" size={24} />
                <div>
                  <p className="font-medium text-foreground">Duration: {durationMinutes} minutes</p>
                  <p className="text-sm text-muted-foreground">
                    {isMainExam ? "Timer is controlled by your teacher." : "Use this timed practice to improve speed."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-lg bg-white border-2 border-black text-center">
                  <p className="text-3xl font-bold text-[#071952]">10</p>
                  <p className="text-xs text-gray-500 mt-1">MCQ (1 mark each)</p>
                </div>
                <div className="p-4 rounded-lg bg-white border-2 border-black text-center">
                  <p className="text-3xl font-bold text-[#071952]">4</p>
                  <p className="text-xs text-gray-500 mt-1">Theory (4 marks each)</p>
                </div>
                <div className="p-4 rounded-lg bg-white border-2 border-black text-center">
                  <p className="text-3xl font-bold text-[#071952]">4</p>
                  <p className="text-xs text-gray-500 mt-1">Analytical (6 marks each)</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-black/10 border-2 border-black">
                <p className="font-medium text-foreground flex items-center gap-2">
                  <Award className="text-black" size={20} />
                  <span className="text-black font-semibold">Total Marks: {totalMarks}</span>
                </p>
              </div>

              <div className="text-sm rounded-lg bg-gray-500/10 border border-black/20 p-4">
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <AlertCircle className="text-black" size={18} />
                    {isMainExam ? `${EXAM_PORTAL_LABEL} mode` : "Practice mode"}
                </p>
                <p className="text-muted-foreground mt-1">
                  {isMainExam
                    ? strictModeSupported
                      ? `${EXAM_PORTAL_LABEL} attempts use fullscreen protection and are limited to a single attempt per student account.`
                      : `${EXAM_PORTAL_LABEL} attempts are limited to a single attempt per student account and can now run on browsers without fullscreen protection support.`
                    : "Prep exams are relaxed so you can focus on repetition, learning, and improvement."}
                </p>
              </div>

              {isMainExam && examStarted && strictModeSupported && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="font-semibold text-amber-900 flex items-center gap-2">
                    <ShieldAlert className="text-amber-700" size={18} />
                    Important {EXAM_PORTAL_LABEL.toLowerCase()} rules
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-amber-900">
                    <p>Stay in fullscreen for the entire exam.</p>
                    <p>Leaving fullscreen starts a 10-second grace timer.</p>
                    <p>If you remain outside fullscreen for more than 10 seconds, it becomes a violation and your teacher is notified.</p>
                    <p>On the 3rd confirmed violation, your exam is automatically submitted to your teacher.</p>
                  </div>
                  {requiresRulesAcknowledgement && (
                    <label className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-white/80 px-3 py-2 text-sm text-amber-950">
                      <input
                        type="checkbox"
                        checked={rulesAcknowledged}
                        onChange={(event) => setRulesAcknowledged(event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-amber-300 text-[#071952] focus:ring-[#071952]"
                      />
                      <span>I understand the fullscreen rules and the 3-strike auto-submit policy for this exam portal.</span>
                    </label>
                  )}
                </div>
              )}

              {isMainExam && examStarted && !strictModeSupported && (
                <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
                  <p className="font-semibold text-sky-900 flex items-center gap-2">
                    <ShieldAlert className="text-sky-700" size={18} />
                    Browser compatibility mode
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-sky-900">
                    <p>This browser can still take the exam.</p>
                    <p>Fullscreen protection is skipped here so the exam flow stays usable across browsers.</p>
                    <p>Attempt limits, timing, saving, and analytics continue to work normally.</p>
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 mt-2 shrink-0">
          <AlertDialogCancel
            onClick={onCancel}
            className="bg-white border-2 border-black text-black hover:bg-[#071952] hover:text-white hover:scale-105 hover:shadow-lg transition-all duration-300 ease-out font-medium"
          >
            Choose Different Subject
          </AlertDialogCancel>
          <button
            onClick={canStart ? () => onStart(examStartTime, durationMinutes) : undefined}
            disabled={!canStart || controlLoading || attemptCheckLoading}
            className="bg-black px-4 py-2 rounded-md hover:bg-black/90 text-white hover:scale-105 hover:shadow-xl hover:shadow-[#1e3a8a]/50 transition-all duration-300 ease-out group font-medium inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <Zap size={18} className="mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300" />
            {isMainExam ? `Start ${EXAM_PORTAL_LABEL}` : "Start Prep Exam"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
