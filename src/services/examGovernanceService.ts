import { supabase } from "@/lib/supabase";
import type {
  MainExamScheduleSlotRow,
  SubjectExamChangeRequestRow,
  SubjectRow,
} from "@/lib/database.types";

export interface MainExamApprovalRequestInput {
  subjectId: string;
  teacherId: string;
  universityId?: string | null;
  title: string;
  description?: string | null;
  instructions: string;
  durationMinutes: number;
  targetSemester?: string | null;
  targetDepartment?: string | null;
  expectedStudents?: number | null;
}

export interface StudentMainExamAccess {
  canStart: boolean;
  durationMinutes: number;
  examTitle: string | null;
  examDescription: string | null;
  examInstructions: string | null;
  currentSlot: MainExamScheduleSlotRow | null;
  nextSlot: MainExamScheduleSlotRow | null;
  matchingSlots: MainExamScheduleSlotRow[];
}

function clampDuration(value: number): number {
  return Math.max(1, Math.min(300, value));
}

async function markSubjectPendingMain(
  subjectId: string,
  universityId: string | null
): Promise<void> {
  const { error } = await supabase
    .from("subjects")
    .update({
      exam_type_status: "pending_approval",
      pending_exam_type: "main",
      university_id: universityId,
    })
    .eq("id", subjectId);

  if (error) {
    throw error;
  }
}

export function matchesEmailRange(
  email: string | null | undefined,
  start: string | null | undefined,
  end: string | null | undefined
): boolean {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) return false;

  const lowerBound = (start?.trim().toLowerCase() || normalizedEmail);
  const upperBound = (end?.trim().toLowerCase() || normalizedEmail);

  return normalizedEmail >= lowerBound && normalizedEmail <= upperBound;
}

async function getSubjectOrThrow(subjectId: string): Promise<SubjectRow> {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", subjectId)
    .single();

  if (error || !data) {
    throw error || new Error("Subject not found.");
  }

  return data as SubjectRow;
}

export async function getTeacherExamChangeRequests(
  teacherId: string
): Promise<SubjectExamChangeRequestRow[]> {
  const { data, error } = await supabase
    .from("subject_exam_change_requests")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SubjectExamChangeRequestRow[];
}

export async function requestMainExamApproval(
  input: MainExamApprovalRequestInput
): Promise<SubjectExamChangeRequestRow> {
  const subject = await getSubjectOrThrow(input.subjectId);
  const resolvedUniversityId = input.universityId ?? subject.university_id;
  const requestPayload = {
    subject_id: input.subjectId,
    university_id: resolvedUniversityId,
    teacher_id: input.teacherId,
    current_exam_type: subject.exam_type,
    requested_exam_type: "main" as const,
    requested_title: input.title.trim(),
    requested_description: input.description?.trim() || null,
    requested_instructions: input.instructions.trim(),
    requested_duration_minutes: clampDuration(input.durationMinutes),
    requested_target_semester: input.targetSemester?.trim() || null,
    requested_target_department: input.targetDepartment?.trim() || null,
    requested_expected_students: input.expectedStudents ?? null,
  };

  const { data: existingPendingRequest, error: existingPendingRequestError } = await supabase
    .from("subject_exam_change_requests")
    .select("*")
    .eq("subject_id", input.subjectId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingPendingRequestError) {
    throw existingPendingRequestError;
  }

  let requestRow: SubjectExamChangeRequestRow | null =
    (existingPendingRequest as SubjectExamChangeRequestRow | null) ?? null;
  let createdNewRequest = false;

  if (requestRow) {
    const { data: updatedRequest, error: updateRequestError } = await supabase
      .from("subject_exam_change_requests")
      .update(requestPayload)
      .eq("id", requestRow.id)
      .select()
      .single();

    if (updateRequestError || !updatedRequest) {
      throw updateRequestError || new Error("Unable to update the pending exam portal approval request.");
    }

    requestRow = updatedRequest as SubjectExamChangeRequestRow;
  } else {
    const { data, error } = await supabase
      .from("subject_exam_change_requests")
      .insert(requestPayload)
      .select()
      .single();

    if (error?.code === "23505") {
      const { data: retryPendingRequest, error: retryPendingRequestError } = await supabase
        .from("subject_exam_change_requests")
        .select("*")
        .eq("subject_id", input.subjectId)
        .eq("status", "pending")
        .maybeSingle();

      if (retryPendingRequestError) {
        throw retryPendingRequestError;
      }

      if (!retryPendingRequest) {
        throw new Error("A pending exam portal request already exists for this subject.");
      }

      const { data: updatedRequest, error: updateRequestError } = await supabase
        .from("subject_exam_change_requests")
        .update(requestPayload)
        .eq("id", retryPendingRequest.id)
        .select()
        .single();

      if (updateRequestError || !updatedRequest) {
        throw updateRequestError || new Error("Unable to update the pending exam portal approval request.");
      }

      requestRow = updatedRequest as SubjectExamChangeRequestRow;
    } else if (error || !data) {
      throw error || new Error("Unable to create the exam portal approval request.");
    } else {
      requestRow = data as SubjectExamChangeRequestRow;
      createdNewRequest = true;
    }
  }

  try {
    await markSubjectPendingMain(input.subjectId, resolvedUniversityId);
  } catch (subjectError) {
    if (createdNewRequest && requestRow) {
      const { error: cleanupError } = await supabase
        .from("subject_exam_change_requests")
        .delete()
        .eq("id", requestRow.id);
      if (cleanupError) {
        console.error("Failed to roll back exam change request:", cleanupError);
      }
    }
    throw subjectError;
  }

  return requestRow;
}

export async function switchSubjectToPrep(
  subjectId: string,
  teacherId: string
): Promise<SubjectRow> {
  const { data, error } = await supabase
    .from("subjects")
    .update({
      exam_type: "prep",
      exam_type_status: "active",
      pending_exam_type: null,
    })
    .eq("id", subjectId)
    .eq("created_by", teacherId)
    .select()
    .single();

  if (error || !data) {
    throw error || new Error("Unable to switch the subject back to prep.");
  }

  const { error: cancelError } = await supabase
    .from("subject_exam_change_requests")
    .update({ status: "cancelled" })
    .eq("subject_id", subjectId)
    .eq("teacher_id", teacherId)
    .eq("status", "pending");
  if (cancelError) {
    console.error("Failed to cancel pending exam portal requests:", cancelError);
  }

  return data as SubjectRow;
}

export async function approveExamChangeRequest(
  requestId: string,
  adminId: string,
  adminNotes?: string | null
): Promise<void> {
  const { data: request, error } = await supabase
    .from("subject_exam_change_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (error || !request) {
    throw error || new Error("Approval request not found.");
  }

  const row = request as SubjectExamChangeRequestRow;

  const { error: subjectError } = await supabase
    .from("subjects")
    .update({
      exam_type: row.requested_exam_type,
      exam_type_status: "active",
      pending_exam_type: null,
      university_id: row.university_id,
      main_exam_title: row.requested_title,
      main_exam_description: row.requested_description,
      main_exam_instructions: row.requested_instructions,
      main_exam_duration_minutes: row.requested_duration_minutes ?? 90,
      main_exam_target_semester: row.requested_target_semester,
      main_exam_target_department: row.requested_target_department,
      main_exam_expected_students: row.requested_expected_students,
    })
    .eq("id", row.subject_id);

  if (subjectError) throw subjectError;

  const { error: requestError } = await supabase
    .from("subject_exam_change_requests")
    .update({
      status: "approved",
      admin_notes: adminNotes?.trim() || null,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (requestError) throw requestError;
}

export async function rejectExamChangeRequest(
  requestId: string,
  adminId: string,
  adminNotes?: string | null
): Promise<void> {
  const { data: request, error } = await supabase
    .from("subject_exam_change_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (error || !request) {
    throw error || new Error("Approval request not found.");
  }

  const row = request as SubjectExamChangeRequestRow;

  const { error: subjectError } = await supabase
    .from("subjects")
    .update({
      exam_type_status: "active",
      pending_exam_type: null,
    })
    .eq("id", row.subject_id);

  if (subjectError) throw subjectError;

  const { error: requestError } = await supabase
    .from("subject_exam_change_requests")
    .update({
      status: "rejected",
      admin_notes: adminNotes?.trim() || null,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (requestError) throw requestError;
}

export async function getStudentAssignedMainExamSubjectIds(studentEmail: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("main_exam_schedule_slots")
    .select("*")
    .eq("is_active", true)
    .order("start_time", { ascending: true });

  if (error) throw error;

  const subjectIds = new Set<string>();
  for (const slot of (data ?? []) as MainExamScheduleSlotRow[]) {
    if (matchesEmailRange(studentEmail, slot.allowed_email_start, slot.allowed_email_end)) {
      subjectIds.add(slot.subject_id);
    }
  }

  return [...subjectIds];
}

export async function getStudentMainExamAccess(
  subjectId: string,
  studentEmail: string
): Promise<StudentMainExamAccess> {
  const [{ data: subject }, { data: slotRows, error: slotsError }] = await Promise.all([
    supabase
      .from("subjects")
      .select(
        "main_exam_title, main_exam_description, main_exam_instructions, main_exam_duration_minutes"
      )
      .eq("id", subjectId)
      .single(),
    supabase
      .from("main_exam_schedule_slots")
      .select("*")
      .eq("subject_id", subjectId)
      .eq("is_active", true)
      .order("start_time", { ascending: true }),
  ]);

  if (slotsError) throw slotsError;

  const matchingSlots = ((slotRows ?? []) as MainExamScheduleSlotRow[]).filter((slot) =>
    matchesEmailRange(studentEmail, slot.allowed_email_start, slot.allowed_email_end)
  );

  const now = Date.now();
  const currentSlot =
    matchingSlots.find((slot) => {
      const start = new Date(slot.start_time).getTime();
      const end = new Date(slot.end_time).getTime();
      return now >= start && now <= end;
    }) ?? null;

  const nextSlot =
    matchingSlots.find((slot) => new Date(slot.start_time).getTime() > now) ?? null;

  return {
    canStart: currentSlot !== null,
    durationMinutes:
      (subject as { main_exam_duration_minutes?: number } | null)?.main_exam_duration_minutes ?? 90,
    examTitle: (subject as { main_exam_title?: string | null } | null)?.main_exam_title ?? null,
    examDescription:
      (subject as { main_exam_description?: string | null } | null)?.main_exam_description ?? null,
    examInstructions:
      (subject as { main_exam_instructions?: string | null } | null)?.main_exam_instructions ?? null,
    currentSlot,
    nextSlot,
    matchingSlots,
  };
}
