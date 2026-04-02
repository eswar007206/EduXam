import { supabase } from "@/lib/supabase";
import type { MainExamScheduleSlotRow, StudentNotificationRow } from "@/lib/database.types";
import { EXAM_PORTAL_LABEL } from "@/lib/portalLabels";
import { matchesEmailRange } from "@/services/examGovernanceService";

type NotificationType = StudentNotificationRow["type"];
type NotificationSource = "database" | "computed";

export interface StudentNotificationItem extends StudentNotificationRow {
  priority: "normal" | "high";
  route: "/exam-practice" | "/main-exam";
  source: NotificationSource;
  timestamp_label?: string | null;
}

const COMPUTED_NOTIFICATION_STORAGE_PREFIX = "eduxam:computed-notifications:read:";

function getComputedNotificationStorageKey(studentId: string): string {
  return `${COMPUTED_NOTIFICATION_STORAGE_PREFIX}${studentId}`;
}

function readComputedNotificationMap(studentId: string): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(getComputedNotificationStorageKey(studentId));
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeComputedNotificationMap(studentId: string, value: Record<string, string>): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getComputedNotificationStorageKey(studentId), JSON.stringify(value));
  } catch {
    // Ignore local persistence failures and keep the notification usable for this session.
  }
}

function markComputedNotificationReadLocally(studentId: string, notificationId: string): void {
  const readMap = readComputedNotificationMap(studentId);
  if (!readMap[notificationId]) {
    readMap[notificationId] = new Date().toISOString();
    writeComputedNotificationMap(studentId, readMap);
  }
}

function markComputedNotificationsReadLocally(studentId: string, notificationIds: string[]): void {
  if (notificationIds.length === 0) {
    return;
  }

  const readMap = readComputedNotificationMap(studentId);
  const readAt = new Date().toISOString();

  notificationIds.forEach((notificationId) => {
    if (!readMap[notificationId]) {
      readMap[notificationId] = readAt;
    }
  });

  writeComputedNotificationMap(studentId, readMap);
}

function formatSlotDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getNotificationPriority(type: NotificationType): "normal" | "high" {
  return type === "main_exam_started" ? "high" : "normal";
}

function getNotificationRoute(type: NotificationType): "/exam-practice" | "/main-exam" {
  return type === "main_exam_started" ? "/main-exam" : "/exam-practice";
}

async function getComputedMainExamNotifications(
  studentId: string,
  studentEmail?: string | null
): Promise<StudentNotificationItem[]> {
  const normalizedEmail = studentEmail?.trim().toLowerCase();
  if (!normalizedEmail) {
    return [];
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const { data: slotRows, error: slotsError } = await supabase
    .from("main_exam_schedule_slots")
    .select("*")
    .eq("is_active", true)
    .gte("end_time", nowIso)
    .order("start_time", { ascending: true });

  if (slotsError) {
    throw slotsError;
  }

  const matchingSlots = ((slotRows ?? []) as MainExamScheduleSlotRow[]).filter((slot) =>
    matchesEmailRange(normalizedEmail, slot.allowed_email_start, slot.allowed_email_end)
  );

  if (matchingSlots.length === 0) {
    return [];
  }

  const subjectIds = [...new Set(matchingSlots.map((slot) => slot.subject_id))];
  const { data: subjectRows, error: subjectsError } = await supabase
    .from("subjects")
    .select("id, name, main_exam_title, created_by")
    .in("id", subjectIds);

  if (subjectsError) {
    throw subjectsError;
  }

  const subjectMap = new Map(
    (subjectRows ?? []).map(
      (subject) =>
        [
          subject.id,
          {
            name: subject.name,
            mainExamTitle: subject.main_exam_title,
            teacherId: subject.created_by,
          },
        ] as const
    )
  );

  const readMap = readComputedNotificationMap(studentId);

  const notifications: StudentNotificationItem[] = [];

  subjectIds.forEach((subjectId) => {
      const subjectSlots = matchingSlots.filter((slot) => slot.subject_id === subjectId);
      const currentSlot =
        subjectSlots.find((slot) => {
          const start = new Date(slot.start_time).getTime();
          const end = new Date(slot.end_time).getTime();
          return now >= start && now <= end;
        }) ?? null;
      const nextSlot =
        subjectSlots.find((slot) => new Date(slot.start_time).getTime() > now) ?? null;
      const relevantSlot = currentSlot ?? nextSlot;
      const subject = subjectMap.get(subjectId);

      if (!relevantSlot || !subject) {
        return;
      }

      const effectiveTitle = subject.mainExamTitle?.trim() || subject.name;
      const notificationId = currentSlot
        ? `computed-main-exam:active:${relevantSlot.id}`
        : `computed-main-exam:scheduled:${relevantSlot.id}`;
      const readAt = readMap[notificationId] ?? null;

      notifications.push({
        id: notificationId,
        student_id: studentId,
        teacher_id: subject.teacherId || relevantSlot.created_by,
        subject_id: subjectId,
        type: "main_exam_started" as const,
        title: currentSlot
          ? `High Priority: ${effectiveTitle} is live now`
          : `High Priority: ${effectiveTitle} is scheduled`,
        message: currentSlot
          ? `Your slot ${relevantSlot.slot_name} is active until ${formatSlotDateTime(relevantSlot.end_time)}. Open the ${EXAM_PORTAL_LABEL} tab to start, and stay in fullscreen once the exam begins.`
          : `Your slot ${relevantSlot.slot_name} starts ${formatSlotDateTime(relevantSlot.start_time)}. Open the ${EXAM_PORTAL_LABEL} tab to review the exam notes before your window opens.`,
        is_read: Boolean(readAt),
        read_at: readAt,
        created_at: new Date().toISOString(),
        priority: "high" as const,
        route: "/main-exam" as const,
        source: "computed" as const,
        timestamp_label: currentSlot
          ? `Ends ${formatSlotDateTime(relevantSlot.end_time)}`
          : `Starts ${formatSlotDateTime(relevantSlot.start_time)}`,
      });
    });

  return notifications;
}

async function getTeacherStudentIds(teacherId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("teacher_id", teacherId);

  if (error) throw error;

  return [...new Set((data ?? []).map((row: { student_id: string }) => row.student_id))];
}

async function createNotifications(
  teacherId: string,
  subjectId: string,
  type: NotificationType,
  title: string,
  message: string
): Promise<void> {
  const studentIds = await getTeacherStudentIds(teacherId);
  if (studentIds.length === 0) return;

  const payload = studentIds.map((studentId) => ({
    student_id: studentId,
    teacher_id: teacherId,
    subject_id: subjectId,
    type,
    title,
    message,
  }));

  const { error } = await supabase.from("student_notifications").insert(payload);
  if (error) throw error;
}

export async function notifyPrepExamCreated(
  teacherId: string,
  subjectId: string,
  subjectName: string
): Promise<void> {
  await createNotifications(
    teacherId,
    subjectId,
    "prep_exam_created",
    `New prep exam: ${subjectName}`,
    `Your teacher has added a new prep exam for ${subjectName}. You can practice it as many times as you want.`
  );
}

export async function notifyMainExamStarted(
  teacherId: string,
  subjectId: string,
  subjectName: string,
  examTitle?: string | null
): Promise<void> {
  const effectiveTitle = examTitle?.trim() || subjectName;

  await createNotifications(
    teacherId,
    subjectId,
    "main_exam_started",
    `${EXAM_PORTAL_LABEL} started: ${effectiveTitle}`,
    `Your teacher has started the ${EXAM_PORTAL_LABEL.toLowerCase()} for ${subjectName}. Open the student portal to review the details and begin your attempt.`
  );
}

export async function notifyMainExamScheduledStudents(data: {
  adminId: string;
  subjectId: string;
  slotName: string;
  startTime: string;
  allowedEmailStart?: string | null;
  allowedEmailEnd?: string | null;
}): Promise<void> {
  const { data: subject, error: subjectError } = await supabase
    .from("subjects")
    .select("id, name, university_id, created_by")
    .eq("id", data.subjectId)
    .single();

  if (subjectError || !subject) throw subjectError || new Error("Subject not found for notifications.");

  const { data: students, error: studentsError } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("role", "student");
  if (studentsError) throw studentsError;

  const eligibleStudents = (students ?? []).filter((student) =>
    matchesEmailRange(
      (student as { email?: string | null }).email,
      data.allowedEmailStart,
      data.allowedEmailEnd
    )
  ) as Array<{ id: string }>;

  if (eligibleStudents.length === 0) return;

  const subjectName = (subject as { name: string }).name;
  const title = `${EXAM_PORTAL_LABEL} slot scheduled: ${subjectName}`;
  const message = `Your ${EXAM_PORTAL_LABEL.toLowerCase()} slot ${data.slotName} is scheduled for ${new Date(data.startTime).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}. Open the ${EXAM_PORTAL_LABEL} tab to review the details.`;

  const rows = eligibleStudents.map((student) => ({
    student_id: student.id,
    teacher_id: (subject as { created_by?: string | null }).created_by || data.adminId,
    subject_id: data.subjectId,
    type: "main_exam_started" as const,
    title,
    message,
  }));

  const { error } = await supabase
    .from("student_notifications")
    .insert(rows);

  if (error) throw error;
}

export async function getStudentNotifications(
  studentId: string,
  limit: number = 20,
  studentEmail?: string | null
): Promise<StudentNotificationItem[]> {
  const [{ data, error }, computedNotifications] = await Promise.all([
    supabase
      .from("student_notifications")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(limit),
    getComputedMainExamNotifications(studentId, studentEmail),
  ]);

  if (error) throw error;

  const storedNotifications = ((data ?? []) as StudentNotificationRow[]).map((notification) => ({
    ...notification,
    priority: getNotificationPriority(notification.type),
    route: getNotificationRoute(notification.type),
    source: "database" as const,
    timestamp_label: null,
  }));

  return [...computedNotifications, ...storedNotifications]
    .sort((left, right) => {
      const priorityScore = { high: 1, normal: 0 };
      const leftPriority = priorityScore[left.priority];
      const rightPriority = priorityScore[right.priority];

      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority;
      }

      if (left.is_read !== right.is_read) {
        return left.is_read ? 1 : -1;
      }

      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    })
    .slice(0, limit);
}

export async function markNotificationRead(
  notificationId: string,
  studentId: string,
  source: NotificationSource = "database"
): Promise<void> {
  if (source === "computed") {
    markComputedNotificationReadLocally(studentId, notificationId);
    return;
  }

  const { error } = await supabase
    .from("student_notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("student_id", studentId);

  if (error) throw error;
}

export async function markAllNotificationsRead(
  studentId: string,
  computedNotificationIds: string[] = []
): Promise<void> {
  markComputedNotificationsReadLocally(studentId, computedNotificationIds);

  const { error } = await supabase
    .from("student_notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("student_id", studentId)
    .eq("is_read", false);

  if (error) throw error;
}
