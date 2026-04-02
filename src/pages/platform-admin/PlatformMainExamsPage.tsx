import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Clock3, Loader2, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import {
  createSubjectScheduleSlot,
  deleteSubjectScheduleSlot,
  getActiveMainSubjects,
  getAdminExamChangeRequests,
  getSubjectScheduleSlots,
  getUniversitiesWithMeta,
  type ExamChangeRequestWithDetails,
  type UniversityWithMeta,
} from "@/services/adminPortalService";
import { approveExamChangeRequest, rejectExamChangeRequest } from "@/services/examGovernanceService";
import { notifyMainExamScheduledStudents } from "@/services/notificationService";
import { useAuth } from "@/context/AuthContext";
import type { MainExamScheduleSlotRow, SubjectRow } from "@/lib/database.types";

type SlotDraft = {
  slot_name: string;
  start_time: string;
  end_time: string;
  allowed_email_start: string;
  allowed_email_end: string;
  max_students: string;
};

type SubjectFeedback = { type: "error" | "success"; message: string };
type SlotStatusFilter = "all" | "needs_slot" | "has_slots";
type ParsedGcuIdentifier = { year: string; branch: string; roll: number; normalized: string };

const EMPTY_SLOT: SlotDraft = {
  slot_name: "",
  start_time: "",
  end_time: "",
  allowed_email_start: "",
  allowed_email_end: "",
  max_students: "",
};

const GCU_DOMAIN = "gcu.edu.in";

function normalizeGcuIdentifier(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function parseGcuIdentifier(value: string): ParsedGcuIdentifier | null {
  const normalized = normalizeGcuIdentifier(value);
  const match = normalized.match(/^(\d{2})([a-z]+)(\d{3})$/i);
  if (!match) return null;
  return {
    year: match[1],
    branch: match[2],
    roll: Number(match[3]),
    normalized,
  };
}

function buildGcuEmail(identifier: string): string | null {
  const normalized = normalizeGcuIdentifier(identifier);
  return normalized ? `${normalized}@${GCU_DOMAIN}` : null;
}

function getGcuRangeDetails(start: string, end: string) {
  const startParsed = parseGcuIdentifier(start);
  const endParsed = parseGcuIdentifier(end);

  if (!start.trim() && !end.trim()) {
    return { startEmail: null, endEmail: null, studentCount: null, error: null };
  }

  if (!startParsed || !endParsed) {
    return {
      startEmail: buildGcuEmail(start),
      endEmail: buildGcuEmail(end),
      studentCount: null,
      error: `Use the GCU format like 24btre110 and 24btre120. The full email will end with @${GCU_DOMAIN}.`,
    };
  }

  if (startParsed.normalized > endParsed.normalized) {
    return {
      startEmail: buildGcuEmail(startParsed.normalized),
      endEmail: buildGcuEmail(endParsed.normalized),
      studentCount: null,
      error: "The ending code must be greater than or equal to the starting code.",
    };
  }

  const sameBranch = startParsed.year === endParsed.year && startParsed.branch === endParsed.branch;

  return {
    startEmail: buildGcuEmail(startParsed.normalized),
    endEmail: buildGcuEmail(endParsed.normalized),
    studentCount: sameBranch ? endParsed.roll - startParsed.roll + 1 : null,
    error: null,
  };
}

function isGcuUniversity(university: UniversityWithMeta | null | undefined): boolean {
  return university?.domains.some((domain) => domain.domain.trim().toLowerCase() === GCU_DOMAIN) ?? false;
}

function matchesSubjectSearch(subject: SubjectRow, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    subject.name,
    subject.slug,
    subject.main_exam_title,
    subject.main_exam_target_department,
    subject.main_exam_target_semester,
    subject.main_exam_description,
  ]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(normalized));
}

function formatEmailRangeForDisplay(slot: MainExamScheduleSlotRow, university: UniversityWithMeta | null | undefined): string {
  if (isGcuUniversity(university) && slot.allowed_email_start && slot.allowed_email_end) {
    const startPrefix = slot.allowed_email_start.replace(`@${GCU_DOMAIN}`, "");
    const endPrefix = slot.allowed_email_end.replace(`@${GCU_DOMAIN}`, "");
    return `${startPrefix} to ${endPrefix} @${GCU_DOMAIN}`;
  }

  return `${slot.allowed_email_start || "Open"} to ${slot.allowed_email_end || "Open"}`;
}

export default function PlatformMainExamsPage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<ExamChangeRequestWithDetails[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [universities, setUniversities] = useState<UniversityWithMeta[]>([]);
  const [slotsBySubject, setSlotsBySubject] = useState<Record<string, MainExamScheduleSlotRow[]>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [slotDrafts, setSlotDrafts] = useState<Record<string, SlotDraft>>({});
  const [subjectFeedbacks, setSubjectFeedbacks] = useState<Record<string, SubjectFeedback>>({});
  const [pageError, setPageError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [slotStatusFilter, setSlotStatusFilter] = useState<SlotStatusFilter>("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile?.university_id) {
      setPageError("This admin account is not linked to an organization yet.");
      setRequests([]);
      setSubjects([]);
      setUniversities([]);
      setSlotsBySubject({});
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [requestRows, subjectRows, universityRows] = await Promise.all([
        getAdminExamChangeRequests(profile.university_id),
        getActiveMainSubjects(profile.university_id),
        getUniversitiesWithMeta([profile.university_id]),
      ]);

      setPageError("");
      setRequests(requestRows);
      setSubjects(subjectRows);
      setUniversities(universityRows);

      const slotEntries = await Promise.all(
        subjectRows.map(async (subject) => [subject.id, await getSubjectScheduleSlots(subject.id)] as const)
      );
      setSlotsBySubject(Object.fromEntries(slotEntries));
    } catch (error) {
      console.error("Failed to load exam portal governance data:", error);
      setPageError(
        error instanceof Error ? error.message : "Unable to load the exam portal administration view right now."
      );
    } finally {
      setLoading(false);
    }
  }, [profile?.university_id]);

  useEffect(() => {
    load();
  }, [load]);

  const universityLookup = useMemo(
    () => Object.fromEntries(universities.map((university) => [university.id, university])),
    [universities]
  );

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests]
  );

  const departmentOptions = useMemo(() => {
    const values = new Set<string>();
    for (const subject of subjects) {
      const department = subject.main_exam_target_department?.trim();
      if (department) values.add(department);
    }
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [subjects]);

  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      if (!matchesSubjectSearch(subject, searchQuery)) return false;
      if (departmentFilter !== "all" && (subject.main_exam_target_department?.trim() || "") !== departmentFilter) {
        return false;
      }
      const slotCount = slotsBySubject[subject.id]?.length ?? 0;
      if (slotStatusFilter === "needs_slot" && slotCount > 0) return false;
      if (slotStatusFilter === "has_slots" && slotCount === 0) return false;
      return true;
    });
  }, [departmentFilter, searchQuery, slotStatusFilter, slotsBySubject, subjects]);

  const handleApprove = async (requestId: string) => {
    if (!profile) return;
    setBusyKey(`approve:${requestId}`);
    try {
      await approveExamChangeRequest(requestId, profile.id, adminNotes[requestId]);
      await load();
    } catch (error) {
      console.error("Failed to approve request:", error);
      setPageError(error instanceof Error ? error.message : "Unable to approve this request right now.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!profile) return;
    setBusyKey(`reject:${requestId}`);
    try {
      await rejectExamChangeRequest(requestId, profile.id, adminNotes[requestId]);
      await load();
    } catch (error) {
      console.error("Failed to reject request:", error);
      setPageError(error instanceof Error ? error.message : "Unable to reject this request right now.");
    } finally {
      setBusyKey(null);
    }
  };

  const handleCreateSlot = async (subject: SubjectRow) => {
    if (!profile) return;

    const draft = slotDrafts[subject.id] ?? EMPTY_SLOT;
    const subjectUniversity = subject.university_id ? universityLookup[subject.university_id] : undefined;
    const gcuSubject = isGcuUniversity(subjectUniversity);
    const gcuRange = getGcuRangeDetails(draft.allowed_email_start, draft.allowed_email_end);

    if (!draft.slot_name.trim() || !draft.start_time || !draft.end_time) {
      setSubjectFeedbacks((prev) => ({
        ...prev,
        [subject.id]: { type: "error", message: "Slot name, start time, and end time are required." },
      }));
      return;
    }

    const startTime = new Date(draft.start_time);
    const endTime = new Date(draft.end_time);
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || endTime <= startTime) {
      setSubjectFeedbacks((prev) => ({
        ...prev,
        [subject.id]: { type: "error", message: "End time must be later than the start time." },
      }));
      return;
    }

    let allowedEmailStart = draft.allowed_email_start.trim() || null;
    let allowedEmailEnd = draft.allowed_email_end.trim() || null;
    let computedStudentCount: number | null = null;

    if (gcuSubject) {
      if (!draft.allowed_email_start.trim() || !draft.allowed_email_end.trim()) {
        setSubjectFeedbacks((prev) => ({
          ...prev,
          [subject.id]: {
            type: "error",
            message: `Enter the GCU start and end student codes. The page will append @${GCU_DOMAIN} automatically.`,
          },
        }));
        return;
      }

      if (gcuRange.error || !gcuRange.startEmail || !gcuRange.endEmail) {
        setSubjectFeedbacks((prev) => ({
          ...prev,
          [subject.id]: { type: "error", message: gcuRange.error || "The GCU range is not valid yet." },
        }));
        return;
      }

      allowedEmailStart = gcuRange.startEmail;
      allowedEmailEnd = gcuRange.endEmail;
      computedStudentCount = gcuRange.studentCount;
    }

    const resolvedCapacity = draft.max_students.trim() ? Number(draft.max_students) : computedStudentCount;
    if (resolvedCapacity !== null && (!Number.isFinite(resolvedCapacity) || resolvedCapacity <= 0)) {
      setSubjectFeedbacks((prev) => ({
        ...prev,
        [subject.id]: { type: "error", message: "Lab capacity must be a positive number." },
      }));
      return;
    }

    setBusyKey(`slot:${subject.id}`);
    try {
      await createSubjectScheduleSlot({
        subject_id: subject.id,
        university_id: subject.university_id,
        created_by: profile.id,
        slot_name: draft.slot_name.trim(),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        allowed_email_start: allowedEmailStart,
        allowed_email_end: allowedEmailEnd,
        max_students: resolvedCapacity,
      });

      await notifyMainExamScheduledStudents({
        adminId: profile.id,
        subjectId: subject.id,
        slotName: draft.slot_name.trim(),
        startTime: startTime.toISOString(),
        allowedEmailStart: allowedEmailStart,
        allowedEmailEnd: allowedEmailEnd,
      }).catch(console.error);

      setSlotDrafts((prev) => ({ ...prev, [subject.id]: EMPTY_SLOT }));
      setSubjectFeedbacks((prev) => ({
        ...prev,
        [subject.id]: {
          type: "success",
          message:
            computedStudentCount !== null
              ? `Slot created for ${computedStudentCount} GCU students.`
              : "Slot created successfully.",
        },
      }));
      await load();
    } catch (error) {
      console.error("Failed to create exam slot:", error);
      setSubjectFeedbacks((prev) => ({
        ...prev,
        [subject.id]: {
          type: "error",
          message: error instanceof Error ? error.message : "Unable to create the slot right now.",
        },
      }));
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteSlot = async (slotId: string, subjectId: string) => {
    setBusyKey(`delete:${slotId}`);
    try {
      await deleteSubjectScheduleSlot(slotId);
      setSubjectFeedbacks((prev) => ({
        ...prev,
        [subjectId]: { type: "success", message: "Slot deleted." },
      }));
      await load();
    } catch (error) {
      console.error("Failed to delete slot:", error);
      setSubjectFeedbacks((prev) => ({
        ...prev,
        [subjectId]: {
          type: "error",
          message: error instanceof Error ? error.message : "Unable to delete this slot right now.",
        },
      }));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#071952]">Exam Portal Governance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Approve teacher requests, then schedule structured student ranges for approved exam portal subjects in your organization.
        </p>
      </div>

      {pageError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
        <div className="flex items-center gap-2 text-sky-900 font-semibold">
          <Building2 className="w-4 h-4" />
          How This Works
        </div>
        <div className="grid gap-3 md:grid-cols-3 mt-4 text-sm text-sky-900">
          <div className="rounded-2xl bg-white/80 px-4 py-3">
            <p className="font-semibold">1. Teacher requests exam portal access</p>
            <p className="text-sky-800 mt-1">The subject lands in the approval queue first.</p>
          </div>
          <div className="rounded-2xl bg-white/80 px-4 py-3">
            <p className="font-semibold">2. Admin approves it</p>
            <p className="text-sky-800 mt-1">Once approved, the subject appears in the scheduling section below.</p>
          </div>
          <div className="rounded-2xl bg-white/80 px-4 py-3">
            <p className="font-semibold">3. GCU slots use student codes</p>
            <p className="text-sky-800 mt-1">
              Enter codes like <span className="font-semibold">24btre110</span>; the page auto-appends <span className="font-semibold">@{GCU_DOMAIN}</span>.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#071952]">Pending Approval Queue</h2>
            <p className="text-sm text-gray-500">Every teacher move into the exam portal lands here first.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading requests...
          </div>
        ) : pendingRequests.length === 0 ? (
          <p className="text-sm text-gray-500">No pending teacher requests right now.</p>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-[#071952]">{request.subject_name}</h3>
                      <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                        {request.requested_exam_type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {request.teacher_username || "Teacher"} | {request.university_name || "Unassigned organization"}
                    </p>
                    <div className="grid gap-3 md:grid-cols-3 mt-4">
                      <div className="rounded-xl border border-gray-100 bg-white p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Title</p>
                        <p className="text-sm text-[#071952] mt-1">{request.requested_title || "Untitled exam portal subject"}</p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-white p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Target cohort</p>
                        <p className="text-sm text-[#071952] mt-1">
                          {request.requested_target_department || "Department not set"}
                          {request.requested_target_semester ? ` | ${request.requested_target_semester}` : ""}
                        </p>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-white p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Expected students</p>
                        <p className="text-sm text-[#071952] mt-1">{request.requested_expected_students ?? "Not set"}</p>
                      </div>
                    </div>
                    {request.requested_description && (
                      <p className="text-sm text-gray-600 mt-4">{request.requested_description}</p>
                    )}
                    {request.requested_instructions && (
                      <div className="mt-4 rounded-xl border border-gray-100 bg-white p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">Instructions</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.requested_instructions}</p>
                      </div>
                    )}
                  </div>

                  <div className="w-full xl:w-80 space-y-3">
                    <textarea
                      value={adminNotes[request.id] ?? ""}
                      onChange={(event) => setAdminNotes((prev) => ({ ...prev, [request.id]: event.target.value }))}
                      placeholder="Admin notes or approval comments"
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952] resize-none"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={busyKey === `reject:${request.id}` || busyKey === `approve:${request.id}`}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 font-semibold disabled:opacity-50"
                      >
                        {busyKey === `reject:${request.id}` ? "Rejecting..." : "Reject"}
                      </button>
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={busyKey === `reject:${request.id}` || busyKey === `approve:${request.id}`}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-[#071952] text-white font-semibold disabled:opacity-50"
                      >
                        {busyKey === `approve:${request.id}` ? "Approving..." : "Approve"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[#071952]">Approved Exam Portal Subjects</h2>
          <p className="text-sm text-gray-500 mt-1">
            Search subjects fast, then create clean GCU slot ranges without typing full email addresses.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr]">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by subject, title, slug, department, or semester"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
            >
              <option value="all">All departments</option>
              {departmentOptions.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
            <select
              value={slotStatusFilter}
              onChange={(event) => setSlotStatusFilter(event.target.value as SlotStatusFilter)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
            >
              <option value="all">All subjects</option>
              <option value="needs_slot">Needs slot</option>
              <option value="has_slots">Has slots</option>
            </select>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Showing {filteredSubjects.length} of {subjects.length} approved exam portal subjects.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading active exam portal subjects...
          </div>
        ) : subjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            No approved exam portal subjects yet.
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            No subjects match the current search and filters.
          </div>
        ) : (
          filteredSubjects.map((subject) => {
            const draft = slotDrafts[subject.id] ?? EMPTY_SLOT;
            const slots = slotsBySubject[subject.id] ?? [];
            const subjectUniversity = subject.university_id ? universityLookup[subject.university_id] : undefined;
            const gcuSubject = isGcuUniversity(subjectUniversity);
            const gcuRange = getGcuRangeDetails(draft.allowed_email_start, draft.allowed_email_end);
            const feedback = subjectFeedbacks[subject.id];
            const autoCapacity = gcuRange.studentCount;

            return (
              <div key={subject.id} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-semibold text-[#071952]">{subject.main_exam_title || subject.name}</h3>
                      {subjectUniversity && (
                        <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-sky-100 text-sky-700">
                          {subjectUniversity.short_name || subjectUniversity.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {subject.main_exam_target_department || "Department pending"}
                      {subject.main_exam_target_semester ? ` | ${subject.main_exam_target_semester}` : ""}
                    </p>
                    <p className="text-sm text-gray-600 mt-3">
                      {subject.main_exam_description || "No description configured."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 min-w-[240px]">
                    <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Exam settings</p>
                    <p className="text-sm text-[#071952] mt-2">{subject.main_exam_duration_minutes} minutes</p>
                    <p className="text-sm text-[#071952] mt-1">
                      Expected students: {subject.main_exam_expected_students ?? "Not set"}
                    </p>
                    <p className="text-sm text-[#071952] mt-1">Slots created: {slots.length}</p>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.15fr_1fr] mt-6">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock3 className="w-4 h-4 text-amber-700" />
                      <p className="text-sm font-semibold text-[#071952]">Schedule Slots</p>
                    </div>
                    {slots.length === 0 ? (
                      <p className="text-sm text-gray-500">No slots created yet for this exam.</p>
                    ) : (
                      <div className="space-y-3">
                        {slots.map((slot) => (
                          <div key={slot.id} className="rounded-xl border border-gray-100 bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-[#071952]">{slot.slot_name}</p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {new Date(slot.start_time).toLocaleString()} to {new Date(slot.end_time).toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                  {formatEmailRangeForDisplay(slot, subjectUniversity)} | Capacity {slot.max_students ?? "Not set"}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDeleteSlot(slot.id, subject.id)}
                                disabled={busyKey === `delete:${slot.id}`}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold disabled:opacity-50"
                              >
                                {busyKey === `delete:${slot.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-[#071952] mb-4">Create New Slot</p>
                    <div className="space-y-3">
                      <input
                        value={draft.slot_name}
                        onChange={(event) => setSlotDrafts((prev) => ({ ...prev, [subject.id]: { ...draft, slot_name: event.target.value } }))}
                        placeholder="Slot name"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                      />
                      <input
                        type="datetime-local"
                        value={draft.start_time}
                        onChange={(event) => setSlotDrafts((prev) => ({ ...prev, [subject.id]: { ...draft, start_time: event.target.value } }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                      />
                      <input
                        type="datetime-local"
                        value={draft.end_time}
                        onChange={(event) => setSlotDrafts((prev) => ({ ...prev, [subject.id]: { ...draft, end_time: event.target.value } }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                      />

                      {gcuSubject ? (
                        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                          <div className="flex items-center gap-2 text-sky-900 font-semibold">
                            <Building2 className="w-4 h-4" />
                            Garden City University Range
                          </div>
                          <p className="text-xs text-sky-800 mt-1">
                            Enter only the student code. This page automatically appends @{GCU_DOMAIN}.
                          </p>
                          <div className="grid gap-3 md:grid-cols-2 mt-3">
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wide text-sky-800 mb-1.5">Start code</label>
                              <input
                                value={draft.allowed_email_start}
                                onChange={(event) => setSlotDrafts((prev) => ({ ...prev, [subject.id]: { ...draft, allowed_email_start: event.target.value } }))}
                                placeholder="24btre110"
                                className="w-full px-3 py-2.5 rounded-xl border border-sky-200 text-[#071952] bg-white"
                              />
                              <p className="text-xs text-sky-800 mt-1 break-all">
                                Preview: {gcuRange.startEmail || `24btre110@${GCU_DOMAIN}`}
                              </p>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wide text-sky-800 mb-1.5">End code</label>
                              <input
                                value={draft.allowed_email_end}
                                onChange={(event) => setSlotDrafts((prev) => ({ ...prev, [subject.id]: { ...draft, allowed_email_end: event.target.value } }))}
                                placeholder="24btre120"
                                className="w-full px-3 py-2.5 rounded-xl border border-sky-200 text-[#071952] bg-white"
                              />
                              <p className="text-xs text-sky-800 mt-1 break-all">
                                Preview: {gcuRange.endEmail || `24btre120@${GCU_DOMAIN}`}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-sm text-[#071952]">
                            Students covered (inclusive range): {gcuRange.studentCount ?? "Not ready"}
                          </div>
                          {gcuRange.error && <p className="text-xs text-red-700 mt-2">{gcuRange.error}</p>}
                        </div>
                      ) : (
                        <>
                          <input
                            value={draft.allowed_email_start}
                            onChange={(event) => setSlotDrafts((prev) => ({ ...prev, [subject.id]: { ...draft, allowed_email_start: event.target.value } }))}
                            placeholder="Start email range"
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                          />
                          <input
                            value={draft.allowed_email_end}
                            onChange={(event) => setSlotDrafts((prev) => ({ ...prev, [subject.id]: { ...draft, allowed_email_end: event.target.value } }))}
                            placeholder="End email range"
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                          />
                        </>
                      )}

                      <input
                        value={draft.max_students}
                        onChange={(event) => setSlotDrafts((prev) => ({ ...prev, [subject.id]: { ...draft, max_students: event.target.value } }))}
                        placeholder={autoCapacity ? `Lab capacity (default ${autoCapacity})` : "Lab capacity"}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[#071952]"
                      />

                      {feedback && (
                        <div className={`rounded-2xl px-4 py-3 text-sm ${feedback.type === "error" ? "border border-red-200 bg-red-50 text-red-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                          {feedback.message}
                        </div>
                      )}

                      <button
                        onClick={() => handleCreateSlot(subject)}
                        disabled={busyKey === `slot:${subject.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#071952] text-white font-semibold disabled:opacity-50"
                      >
                        {busyKey === `slot:${subject.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add Slot
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
