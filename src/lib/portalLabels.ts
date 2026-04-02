import type { ExamType } from "@/lib/database.types";

export const EXAM_PORTAL_LABEL = "Exam Portal";

export function getExamTypeLabel(examType: ExamType): string {
  return examType === "prep" ? "Prep Exam" : EXAM_PORTAL_LABEL;
}

export function getExamTypeCollectionLabel(examType: ExamType): string {
  return examType === "prep" ? "Prep Exams" : EXAM_PORTAL_LABEL;
}
