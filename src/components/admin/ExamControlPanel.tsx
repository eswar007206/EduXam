import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { getTeacherSubjects } from "@/services/adminService";
import {
  getTeacherVisibilityMap,
  setTeacherSubjectVisibility,
} from "@/services/teacherVisibilityService";
import { getSubjectScheduleSlots } from "@/services/adminPortalService";
import type { MainExamScheduleSlotRow, SubjectRow } from "@/lib/database.types";
import ExamTypeBadge from "@/components/ExamTypeBadge";

type TeacherSubjectSummary = {
  id: string;
  name: string;
  department_name?: string;
  exam_type: SubjectRow["exam_type"];
  exam_type_status: SubjectRow["exam_type_status"];
  pending_exam_type: SubjectRow["pending_exam_type"];
  main_exam_title: SubjectRow["main_exam_title"];
  main_exam_duration_minutes: SubjectRow["main_exam_duration_minutes"];
  main_exam_target_semester: SubjectRow["main_exam_target_semester"];
  main_exam_target_department: SubjectRow["main_exam_target_department"];
  main_exam_expected_students: SubjectRow["main_exam_expected_students"];
  question_count?: number;
};

type SlotSummary = {
  count: number;
  currentSlot: MainExamScheduleSlotRow | null;
  nextSlot: MainExamScheduleSlotRow | null;
};

interface ExamControlPanelProps {
  teacherId: string;
}

function formatSlotWindow(slot: MainExamScheduleSlotRow) {
  return `${new Date(slot.start_time).toLocaleString()} to ${new Date(slot.end_time).toLocaleTimeString()}`;
}

function getSlotSummary(slots: MainExamScheduleSlotRow[]): SlotSummary {
  const now = Date.now();
  const currentSlot =
    slots.find((slot) => {
      const start = new Date(slot.start_time).getTime();
      const end = new Date(slot.end_time).getTime();
      return slot.is_active && now >= start && now <= end;
    }) ?? null;

  const nextSlot =
    slots.find((slot) => slot.is_active && new Date(slot.start_time).getTime() > now) ?? null;

  return {
    count: slots.length,
    currentSlot,
    nextSlot,
  };
}

export default function ExamControlPanel({ teacherId }: ExamControlPanelProps) {
  const [subjects, setSubjects] = useState<TeacherSubjectSummary[]>([]);
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>({});
  const [slotSummaries, setSlotSummaries] = useState<Record<string, SlotSummary>>({});
  const [loading, setLoading] = useState(true);
  const [togglingSubjectId, setTogglingSubjectId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, vis] = await Promise.all([
        getTeacherSubjects(teacherId),
        getTeacherVisibilityMap(teacherId),
      ]);

      setSubjects(
        subs.map((subject) => ({
          id: subject.id,
          name: subject.name,
          department_name: subject.department_name,
          exam_type: subject.exam_type ?? "main",
          exam_type_status: subject.exam_type_status ?? "active",
          pending_exam_type: subject.pending_exam_type ?? null,
          main_exam_title: subject.main_exam_title ?? null,
          main_exam_duration_minutes: subject.main_exam_duration_minutes ?? 90,
          main_exam_target_semester: subject.main_exam_target_semester ?? null,
          main_exam_target_department: subject.main_exam_target_department ?? null,
          main_exam_expected_students: subject.main_exam_expected_students ?? null,
          question_count: subject.question_count,
        }))
      );
      setVisibilityMap(vis);

      const slotEntries = await Promise.all(
        subs
          .filter(
            (subject) =>
              subject.exam_type === "main" || subject.pending_exam_type === "main"
          )
          .map(async (subject) => {
            const slots = await getSubjectScheduleSlots(subject.id);
            return [subject.id, getSlotSummary(slots)] as const;
          })
      );

      setSlotSummaries(Object.fromEntries(slotEntries));
    } catch (error) {
      console.error("Failed to load exam control panel:", error);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    load();
  }, [load]);

  const prepSubjects = useMemo(
    () =>
      subjects.filter(
        (subject) =>
          subject.exam_type === "prep" &&
          !(subject.exam_type_status === "pending_approval" && subject.pending_exam_type === "main")
      ),
    [subjects]
  );

  const mainSubjects = useMemo(
    () =>
      subjects.filter(
        (subject) =>
          subject.exam_type === "main" || subject.pending_exam_type === "main"
      ),
    [subjects]
  );

  const handleVisibilityToggle = async (subjectId: string) => {
    const next = !(visibilityMap[subjectId] !== false);
    setTogglingSubjectId(subjectId);

    try {
      await setTeacherSubjectVisibility(teacherId, subjectId, next);
      setVisibilityMap((prev) => ({ ...prev, [subjectId]: next }));
    } catch (error) {
      console.error("Failed to update prep visibility:", error);
    } finally {
      setTogglingSubjectId(null);
    }
  };

  return (
    <div className="bg-white border-2 border-black/20 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-black" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#071952]">Exam control and visibility</h2>
          <p className="text-sm text-gray-500">
            Prep exams stay teacher-controlled. Exam Portal subjects move through admin approval and slot scheduling.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading your subjects...
        </div>
      ) : subjects.length === 0 ? (
        <p className="text-sm text-gray-500 py-4">
          No subjects yet. Create one in{" "}
          <Link
            to="/teacher/subjects"
            className="font-semibold text-black hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40 focus-visible:ring-offset-1 rounded"
          >
            Manage Subjects
          </Link>{" "}
          first.
        </p>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-sky-700" />
              </div>
              <div>
                <h3 className="font-semibold text-[#071952]">Prep Exams</h3>
                <p className="text-xs text-gray-500">
                  Students can practice these anytime, and you can show or hide them instantly.
                </p>
              </div>
            </div>

            {prepSubjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-4 text-sm text-sky-700">
                No prep exams yet. Create a prep subject in{" "}
                <Link to="/teacher/subjects" className="font-semibold underline">
                  Manage Subjects
                </Link>
                .
              </div>
            ) : (
              <div className="space-y-3">
                {prepSubjects.map((subject) => {
                  const isVisible = visibilityMap[subject.id] !== false;

                  return (
                    <div
                      key={subject.id}
                      className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-semibold text-[#071952]">{subject.name}</h4>
                            <ExamTypeBadge examType="prep" compact />
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {subject.department_name
                              ? `${subject.department_name} - ${subject.question_count ?? 0} questions`
                              : `${subject.question_count ?? 0} questions`}
                          </p>
                          <p className="text-sm text-sky-700 mt-2">
                            Students can retry this exam as many times as they need while it is visible.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleVisibilityToggle(subject.id)}
                          disabled={togglingSubjectId === subject.id}
                          aria-pressed={isVisible}
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50 ${
                            isVisible
                              ? "border-sky-200 bg-white text-sky-700 hover:bg-[#071952] hover:text-white"
                              : "border-gray-200 bg-white text-gray-500 hover:bg-[#071952] hover:text-white"
                          }`}
                        >
                          {togglingSubjectId === subject.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isVisible ? (
                            <>
                              <Eye className="w-4 h-4" />
                              Visible to students
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-4 h-4" />
                              Hidden from students
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-semibold text-[#071952]">Exam Portal</h3>
                <p className="text-xs text-gray-500">
                  These are approved and scheduled by admins. Students only see them in the Exam Portal when their slot matches.
                </p>
              </div>
            </div>

            {mainSubjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/50 p-4 text-sm text-amber-700">
                No exam portal subjects or pending exam portal requests yet.
              </div>
            ) : (
              <div className="space-y-3">
                {mainSubjects.map((subject) => {
                  const slotSummary = slotSummaries[subject.id] ?? {
                    count: 0,
                    currentSlot: null,
                    nextSlot: null,
                  };
                  const isPendingApproval =
                    subject.exam_type_status === "pending_approval" &&
                    subject.pending_exam_type === "main";

                  return (
                    <div
                      key={subject.id}
                      className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-base font-semibold text-[#071952]">
                                {subject.main_exam_title || subject.name}
                              </h4>
                              <ExamTypeBadge examType="main" compact />
                              {isPendingApproval && (
                                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                                  Pending admin approval
                                </span>
                              )}
                              {!isPendingApproval && slotSummary.currentSlot && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                                  <Clock3 className="w-3.5 h-3.5" />
                                  Live slot
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {subject.department_name
                                ? `${subject.department_name} - ${subject.question_count ?? 0} questions`
                                : `${subject.question_count ?? 0} questions`}
                            </p>
                            <p className="text-sm text-amber-700 mt-2">
                              {isPendingApproval
                                ? "This paper is waiting for admin approval before students can see it."
                                : "Admin scheduling controls who can enter, when they can enter, and how each lab batch is split."}
                            </p>
                          </div>

                          <Link
                            to="/teacher/subjects"
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-[#071952] hover:bg-[#071952] hover:text-white transition-colors"
                          >
                            Manage Subjects
                          </Link>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700 mb-1">
                              Status
                            </p>
                            <p className="text-sm text-[#071952]">
                              {isPendingApproval ? "Waiting for admin review" : "Approved exam portal subject"}
                            </p>
                          </div>

                          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">
                              Duration
                            </p>
                            <p className="text-sm text-[#071952]">
                              {subject.main_exam_duration_minutes ?? 90} minutes
                            </p>
                          </div>

                          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">
                              Target Cohort
                            </p>
                            <p className="text-sm text-[#071952]">
                              {subject.main_exam_target_department || "Not set"}
                              {subject.main_exam_target_semester
                                ? ` / ${subject.main_exam_target_semester}`
                                : ""}
                            </p>
                          </div>

                          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">
                              Scheduled Slots
                            </p>
                            <p className="text-sm text-[#071952]">
                              {slotSummary.count} configured
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-2">
                          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">
                              Current or Next Slot
                            </p>
                            <div className="flex items-start gap-2 text-sm text-gray-700">
                              <CalendarDays className="w-4 h-4 mt-0.5 text-gray-400" />
                              <p>
                                {slotSummary.currentSlot
                                  ? formatSlotWindow(slotSummary.currentSlot)
                                  : slotSummary.nextSlot
                                    ? formatSlotWindow(slotSummary.nextSlot)
                                    : "No slot has been scheduled yet."}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">
                              Expected Students
                            </p>
                            <p className="text-sm text-[#071952]">
                              {subject.main_exam_expected_students ?? "Not set"}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              Students only gain access inside the Exam Portal tab when their organization email falls inside an approved slot range.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
