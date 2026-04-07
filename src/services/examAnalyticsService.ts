import { supabase } from "@/lib/supabase";
import type { SubmissionRow } from "@/lib/database.types";
import type { ExamSection, Question } from "@/features/exam/types";
import type { EvaluationResult } from "@/services/evaluationService";
import { getAnswerText } from "@/utils/examHelpers";

const IDLE_THRESHOLD_MS = 20_000;
const TIMELINE_LIMIT = 360;

export const EXAM_ANALYTICS_DRAFT_STORAGE_KEY = "eduxam:exam-analytics-draft";

export type FinalQuestionStatus = "answered" | "marked" | "skipped" | "unattempted";
export type QuestionStatusLike = "answered" | "marked" | "skipped" | "unattempted";
export type NavigationKind = "start" | "resume" | "next" | "previous" | "jump" | "section";

export interface TimelineEvent {
  at_ms: number;
  type:
    | "question_enter"
    | "answer_change"
    | "mcq_change"
    | "mark_review"
    | "focus_lost"
    | "focus_regained"
    | "copy_attempt"
    | "paste_attempt"
    | "fullscreen_exit"
    | "backspace"
    | "exam_submit";
  question_id?: string | null;
  section_id?: string | null;
  detail?: string | null;
  value?: number | null;
}

export interface QuestionAnalyticsSnapshot {
  question_id: string;
  question_label: string;
  question_text: string;
  question_type: string;
  section_id: string;
  section_name: string;
  max_marks: number;
  visits: number;
  revisit_count: number;
  navigator_entry_count: number;
  active_time_ms: number;
  idle_time_ms: number;
  answer_change_count: number;
  mark_for_review_count: number;
  paste_count: number;
  copy_count: number;
  characters_typed: number;
  words_typed: number;
  backspace_count: number;
  first_seen_at: string | null;
  first_answered_at: string | null;
  last_answered_at: string | null;
  last_interaction_at: string | null;
  final_status?: FinalQuestionStatus;
  final_answer_length?: number;
  final_mcq_option?: string | null;
}

export interface SectionAnalyticsSnapshot {
  section_id: string;
  section_name: string;
  question_count: number;
  total_marks: number;
  active_time_ms: number;
  idle_time_ms: number;
  visit_count: number;
}

export interface TypingAnalyticsSnapshot {
  total_characters_typed: number;
  total_words_typed: number;
  total_backspace_count: number;
  active_typing_ms: number;
  average_wpm: number;
  average_cpm: number;
  peak_wpm: number;
  last_typing_at: string | null;
}

export interface ExamAnalyticsSnapshot {
  version: number;
  started_at: string;
  last_tick_at: string;
  last_interaction_at: string;
  last_question_id: string | null;
  last_section_id: string | null;
  focus_loss_count: number;
  fullscreen_exit_count: number;
  navigator_jump_count: number;
  answer_change_count: number;
  review_toggle_count: number;
  copy_event_count: number;
  paste_event_count: number;
  typing: TypingAnalyticsSnapshot;
  questions: Record<string, QuestionAnalyticsSnapshot>;
  sections: Record<string, SectionAnalyticsSnapshot>;
  timeline: TimelineEvent[];
  summary: Record<string, unknown>;
}

export interface ExamAnalyticsDraft {
  student_id: string;
  student_name: string;
  teacher_id: string | null;
  subject_id: string;
  subject_slug: string | null;
  subject_name: string;
  exam_type: "prep" | "main";
  total_marks: number;
  answered_questions: number;
  total_questions: number;
  time_elapsed: number;
  exam_started_at: string | null;
  exam_submitted_at: string;
  exam_sections: ExamSection[];
  answers: Record<string, string>;
  mcq_answers: Record<string, string>;
  question_status: Record<string, FinalQuestionStatus>;
  analytics: ExamAnalyticsSnapshot;
  submitted_due_to_violations?: boolean;
}

export interface SubmissionAnalyticsRow {
  submission_id: string;
  student_id: string;
  teacher_id: string | null;
  subject_id: string;
  subject_name: string;
  exam_type: "prep" | "main";
  analytics_version: number;
  exam_started_at: string | null;
  exam_submitted_at: string;
  total_duration_seconds: number;
  active_duration_seconds: number;
  idle_duration_seconds: number;
  focus_loss_count: number;
  fullscreen_exit_count: number;
  navigator_jump_count: number;
  answer_change_count: number;
  review_toggle_count: number;
  copy_event_count: number;
  paste_event_count: number;
  total_characters_typed: number;
  total_words_typed: number;
  total_backspace_count: number;
  typing_speed_wpm: number | null;
  typing_speed_cpm: number | null;
  peak_wpm: number | null;
  question_analytics: QuestionAnalyticsSnapshot[];
  section_analytics: SectionAnalyticsSnapshot[];
  timeline_events: TimelineEvent[];
  summary: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AttemptQuestionMetric {
  questionId: string;
  questionLabel: string;
  questionText: string;
  sectionId: string;
  sectionName: string;
  questionType: string;
  maxMarks: number;
  timeSpentSeconds: number;
  activeSeconds: number;
  idleSeconds: number;
  visits: number;
  revisits: number;
  answerChanges: number;
  markForReviewCount: number;
  typingWords: number;
  typingCharacters: number;
  backspaceCount: number;
  finalStatus: FinalQuestionStatus;
  answerLength: number;
  marksAwarded: number | null;
  scorePercentage: number | null;
  feedback: string | null;
  isCorrect: boolean | null;
}

export interface AttemptSectionMetric {
  sectionId: string;
  sectionName: string;
  questionCount: number;
  totalMarks: number;
  timeSpentSeconds: number;
  activeSeconds: number;
  idleSeconds: number;
  scorePercentage: number | null;
  answeredCount: number;
  markedCount: number;
  skippedCount: number;
}

export interface AttemptAnalyticsViewModel {
  mode: "draft" | "saved";
  submission: SubmissionRow | null;
  draft: ExamAnalyticsDraft | null;
  analytics: SubmissionAnalyticsRow | null;
  evaluationResult: EvaluationResult | null;
  answeredQuestions: number;
  totalQuestions: number;
  totalDurationSeconds: number;
  activeDurationSeconds: number;
  idleDurationSeconds: number;
  activeRatio: number;
  averageTimePerQuestionSeconds: number;
  answerChangeCount: number;
  navigatorJumpCount: number;
  focusLossCount: number;
  fullscreenExitCount: number;
  copyEventCount: number;
  pasteEventCount: number;
  typingWpm: number;
  typingCpm: number;
  peakWpm: number;
  totalCharactersTyped: number;
  totalWordsTyped: number;
  totalBackspaceCount: number;
  questions: AttemptQuestionMetric[];
  sections: AttemptSectionMetric[];
  timeline: { label: string; seconds: number; answers: number; activeSeconds: number }[];
  highlights: {
    longestQuestion: AttemptQuestionMetric | null;
    mostEditedQuestion: AttemptQuestionMetric | null;
    mostRevisitedQuestion: AttemptQuestionMetric | null;
    strongestQuestion: AttemptQuestionMetric | null;
    weakestQuestion: AttemptQuestionMetric | null;
  };
}

export interface SubjectAnalyticsViewModel {
  subjectId: string;
  subjectName: string;
  attemptCount: number;
  evaluatedAttemptCount: number;
  pendingAttemptCount: number;
  averagePercentage: number | null;
  bestPercentage: number | null;
  averageDurationSeconds: number | null;
  averageActiveRatio: number | null;
  averageTypingWpm: number | null;
  latestPercentage: number | null;
  recentAttempts: {
    submissionId: string;
    label: string;
    percentage: number | null;
    durationSeconds: number;
    activeRatio: number | null;
  }[];
  sectionRollup: {
    sectionId: string;
    sectionName: string;
    averageTimeSeconds: number;
    averageScorePercentage: number | null;
  }[];
  questionRollup: {
    questionId: string;
    questionLabel: string;
    questionText: string;
    averageTimeSeconds: number;
    averageScorePercentage: number | null;
    averageAnswerChanges: number;
  }[];
}

export interface ProfileAnalyticsViewModel {
  attemptCount: number;
  evaluatedAttemptCount: number;
  pendingAttemptCount: number;
  averagePercentage: number | null;
  averageDurationSeconds: number | null;
  averageActiveRatio: number | null;
  averageTypingWpm: number | null;
  totalExamSeconds: number;
  strongestSubject: { subjectId: string; subjectName: string; averagePercentage: number } | null;
  mostImprovedSubject: { subjectId: string; subjectName: string; improvement: number } | null;
  subjectSummaries: SubjectAnalyticsViewModel[];
  recentAttempts: {
    submissionId: string;
    subjectName: string;
    percentage: number | null;
    durationSeconds: number;
    activeRatio: number | null;
    createdAt: string;
  }[];
}

type EvaluationQuestionMetric = {
  marksAwarded: number;
  maxMarks: number;
  feedback: string | null;
  isCorrect: boolean | null;
};

function safeLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toPlainTextAnswer(value: string): string {
  return stripHtml(getAnswerText(value || ""));
}

function countWords(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

function round(value: number, precision = 1): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min = 0, max = Number.POSITIVE_INFINITY): number {
  return Math.max(min, Math.min(max, value));
}

function appendTimeline(snapshot: ExamAnalyticsSnapshot, event: TimelineEvent) {
  snapshot.timeline.push(event);
  if (snapshot.timeline.length > TIMELINE_LIMIT) {
    snapshot.timeline.splice(0, snapshot.timeline.length - TIMELINE_LIMIT);
  }
}

function buildQuestionLabel(questionIndex: number) {
  return `Q${questionIndex + 1}`;
}

function buildQuestionDefaults(
  section: ExamSection,
  question: Question,
  questionIndex: number
): QuestionAnalyticsSnapshot {
  return {
    question_id: question.id,
    question_label: buildQuestionLabel(questionIndex),
    question_text: question.text,
    question_type: question.type ?? "descriptive",
    section_id: section.id,
    section_name: section.name,
    max_marks: question.marks,
    visits: 0,
    revisit_count: 0,
    navigator_entry_count: 0,
    active_time_ms: 0,
    idle_time_ms: 0,
    answer_change_count: 0,
    mark_for_review_count: 0,
    paste_count: 0,
    copy_count: 0,
    characters_typed: 0,
    words_typed: 0,
    backspace_count: 0,
    first_seen_at: null,
    first_answered_at: null,
    last_answered_at: null,
    last_interaction_at: null,
  };
}

function buildSectionDefaults(section: ExamSection): SectionAnalyticsSnapshot {
  return {
    section_id: section.id,
    section_name: section.name,
    question_count: section.questions.length,
    total_marks: section.questions.reduce((total, question) => total + question.marks, 0),
    active_time_ms: 0,
    idle_time_ms: 0,
    visit_count: 0,
  };
}

export function createExamAnalyticsSnapshot(
  examSections: ExamSection[],
  startedAt?: string | null,
  existing?: ExamAnalyticsSnapshot | null
): ExamAnalyticsSnapshot {
  const now = startedAt ?? existing?.started_at ?? new Date().toISOString();
  const questions: Record<string, QuestionAnalyticsSnapshot> = {};
  const sections: Record<string, SectionAnalyticsSnapshot> = {};

  examSections.forEach((section) => {
    sections[section.id] = {
      ...buildSectionDefaults(section),
      ...(existing?.sections?.[section.id] ?? {}),
    };

    section.questions.forEach((question, questionIndex) => {
      questions[question.id] = {
        ...buildQuestionDefaults(section, question, questionIndex),
        ...(existing?.questions?.[question.id] ?? {}),
      };
    });
  });

  return {
    version: existing?.version ?? 1,
    started_at: existing?.started_at ?? now,
    last_tick_at: existing?.last_tick_at ?? now,
    last_interaction_at: existing?.last_interaction_at ?? now,
    last_question_id: existing?.last_question_id ?? null,
    last_section_id: existing?.last_section_id ?? null,
    focus_loss_count: existing?.focus_loss_count ?? 0,
    fullscreen_exit_count: existing?.fullscreen_exit_count ?? 0,
    navigator_jump_count: existing?.navigator_jump_count ?? 0,
    answer_change_count: existing?.answer_change_count ?? 0,
    review_toggle_count: existing?.review_toggle_count ?? 0,
    copy_event_count: existing?.copy_event_count ?? 0,
    paste_event_count: existing?.paste_event_count ?? 0,
    typing: existing?.typing ?? {
      total_characters_typed: 0,
      total_words_typed: 0,
      total_backspace_count: 0,
      active_typing_ms: 0,
      average_wpm: 0,
      average_cpm: 0,
      peak_wpm: 0,
      last_typing_at: null,
    },
    questions,
    sections,
    timeline: existing?.timeline ?? [],
    summary: existing?.summary ?? {},
  };
}

export function syncExamAnalyticsSnapshot(
  snapshot: ExamAnalyticsSnapshot,
  activeQuestionId?: string | null,
  activeSectionId?: string | null,
  nowMs: number = Date.now(),
  isHidden = false
) {
  const lastTick = new Date(snapshot.last_tick_at).getTime();
  const delta = Math.max(0, nowMs - lastTick);
  if (delta === 0) {
    return;
  }

  const questionId = activeQuestionId ?? snapshot.last_question_id;
  const sectionId = activeSectionId ?? snapshot.last_section_id;
  if (questionId && sectionId) {
    const question = snapshot.questions[questionId];
    const section = snapshot.sections[sectionId];
    if (question && section) {
      const idle = isHidden || nowMs - new Date(snapshot.last_interaction_at).getTime() > IDLE_THRESHOLD_MS;
      if (idle) {
        question.idle_time_ms += delta;
        section.idle_time_ms += delta;
      } else {
        question.active_time_ms += delta;
        section.active_time_ms += delta;
      }
    }
  }

  snapshot.last_tick_at = new Date(nowMs).toISOString();
}

function updateTypingSnapshot(
  snapshot: ExamAnalyticsSnapshot,
  deltaChars: number,
  deltaWords: number,
  nowMs: number
) {
  const typing = snapshot.typing;
  typing.total_characters_typed += deltaChars;
  typing.total_words_typed += deltaWords;

  const lastTypingMs = typing.last_typing_at ? new Date(typing.last_typing_at).getTime() : nowMs;
  const deltaMs = clamp(nowMs - lastTypingMs, 0, 5_000);
  typing.active_typing_ms += deltaMs;

  if (deltaWords > 0 && deltaMs > 0) {
    const instantWpm = deltaWords / (deltaMs / 60_000);
    typing.peak_wpm = round(Math.max(typing.peak_wpm, instantWpm), 1);
  }

  typing.last_typing_at = new Date(nowMs).toISOString();

  const activeTypingMinutes = typing.active_typing_ms / 60_000;
  if (activeTypingMinutes > 0) {
    typing.average_wpm = round(typing.total_words_typed / activeTypingMinutes, 1);
    typing.average_cpm = round(typing.total_characters_typed / activeTypingMinutes, 1);
  }
}

export function recordQuestionEntry(
  snapshot: ExamAnalyticsSnapshot,
  question: Question,
  section: ExamSection,
  questionIndex: number,
  navigationKind: NavigationKind,
  nowMs: number = Date.now(),
  isHidden = false
) {
  syncExamAnalyticsSnapshot(snapshot, snapshot.last_question_id, snapshot.last_section_id, nowMs, isHidden);

  const record = snapshot.questions[question.id];
  const sectionRecord = snapshot.sections[section.id];
  if (!record || !sectionRecord) {
    return;
  }

  if (snapshot.last_question_id === question.id) {
    return;
  }

  record.visits += 1;
  if (record.visits > 1) {
    record.revisit_count += 1;
  }
  record.navigator_entry_count += 1;
  record.first_seen_at = record.first_seen_at ?? new Date(nowMs).toISOString();
  record.last_interaction_at = new Date(nowMs).toISOString();
  sectionRecord.visit_count += 1;

  if (navigationKind === "jump" || navigationKind === "section") {
    snapshot.navigator_jump_count += 1;
  }

  snapshot.last_question_id = question.id;
  snapshot.last_section_id = section.id;
  snapshot.last_interaction_at = new Date(nowMs).toISOString();

  appendTimeline(snapshot, {
    at_ms: nowMs - new Date(snapshot.started_at).getTime(),
    type: "question_enter",
    question_id: question.id,
    section_id: section.id,
    detail: navigationKind,
    value: questionIndex + 1,
  });
}

export function recordTextAnswerChange(
  snapshot: ExamAnalyticsSnapshot,
  questionId: string,
  previousValue: string,
  nextValue: string,
  nowMs: number = Date.now(),
  isHidden = false
) {
  syncExamAnalyticsSnapshot(snapshot, snapshot.last_question_id, snapshot.last_section_id, nowMs, isHidden);

  const record = snapshot.questions[questionId];
  if (!record) {
    return;
  }

  const previousPlain = toPlainTextAnswer(previousValue);
  const nextPlain = toPlainTextAnswer(nextValue);
  if (previousPlain === nextPlain) {
    return;
  }

  const deltaChars = Math.max(0, nextPlain.length - previousPlain.length);
  const deltaWords = Math.max(0, countWords(nextPlain) - countWords(previousPlain));

  snapshot.answer_change_count += 1;
  record.answer_change_count += 1;
  record.last_interaction_at = new Date(nowMs).toISOString();
  record.first_answered_at = nextPlain ? record.first_answered_at ?? new Date(nowMs).toISOString() : record.first_answered_at;
  record.last_answered_at = nextPlain ? new Date(nowMs).toISOString() : record.last_answered_at;

  if (deltaChars > 0 || deltaWords > 0) {
    record.characters_typed += deltaChars;
    record.words_typed += deltaWords;
    updateTypingSnapshot(snapshot, deltaChars, deltaWords, nowMs);
  }

  snapshot.last_interaction_at = new Date(nowMs).toISOString();

  appendTimeline(snapshot, {
    at_ms: nowMs - new Date(snapshot.started_at).getTime(),
    type: "answer_change",
    question_id: questionId,
    section_id: record.section_id,
    value: nextPlain.length,
  });
}

export function recordMcqAnswerChange(
  snapshot: ExamAnalyticsSnapshot,
  questionId: string,
  previousOption: string | undefined,
  nextOption: string,
  nowMs: number = Date.now(),
  isHidden = false
) {
  syncExamAnalyticsSnapshot(snapshot, snapshot.last_question_id, snapshot.last_section_id, nowMs, isHidden);

  if (previousOption === nextOption) {
    return;
  }

  const record = snapshot.questions[questionId];
  if (!record) {
    return;
  }

  snapshot.answer_change_count += 1;
  record.answer_change_count += 1;
  record.first_answered_at = record.first_answered_at ?? new Date(nowMs).toISOString();
  record.last_answered_at = new Date(nowMs).toISOString();
  record.last_interaction_at = new Date(nowMs).toISOString();
  snapshot.last_interaction_at = new Date(nowMs).toISOString();

  appendTimeline(snapshot, {
    at_ms: nowMs - new Date(snapshot.started_at).getTime(),
    type: "mcq_change",
    question_id: questionId,
    section_id: record.section_id,
    detail: nextOption,
  });
}

export function recordReviewToggle(
  snapshot: ExamAnalyticsSnapshot,
  questionId: string,
  nowMs: number = Date.now(),
  isHidden = false
) {
  syncExamAnalyticsSnapshot(snapshot, snapshot.last_question_id, snapshot.last_section_id, nowMs, isHidden);

  const record = snapshot.questions[questionId];
  if (!record) {
    return;
  }

  snapshot.review_toggle_count += 1;
  record.mark_for_review_count += 1;
  record.last_interaction_at = new Date(nowMs).toISOString();
  snapshot.last_interaction_at = new Date(nowMs).toISOString();

  appendTimeline(snapshot, {
    at_ms: nowMs - new Date(snapshot.started_at).getTime(),
    type: "mark_review",
    question_id: questionId,
    section_id: record.section_id,
  });
}

export function recordFocusLoss(
  snapshot: ExamAnalyticsSnapshot,
  detail: string,
  nowMs: number = Date.now()
) {
  syncExamAnalyticsSnapshot(snapshot, snapshot.last_question_id, snapshot.last_section_id, nowMs, true);
  snapshot.focus_loss_count += 1;
  appendTimeline(snapshot, {
    at_ms: nowMs - new Date(snapshot.started_at).getTime(),
    type: "focus_lost",
    question_id: snapshot.last_question_id,
    section_id: snapshot.last_section_id,
    detail,
  });
}

export function recordFocusGain(
  snapshot: ExamAnalyticsSnapshot,
  detail: string,
  nowMs: number = Date.now()
) {
  snapshot.last_interaction_at = new Date(nowMs).toISOString();
  appendTimeline(snapshot, {
    at_ms: nowMs - new Date(snapshot.started_at).getTime(),
    type: "focus_regained",
    question_id: snapshot.last_question_id,
    section_id: snapshot.last_section_id,
    detail,
  });
}

export function recordClipboardEvent(
  snapshot: ExamAnalyticsSnapshot,
  kind: "copy" | "paste",
  nowMs: number = Date.now(),
  isHidden = false
) {
  syncExamAnalyticsSnapshot(snapshot, snapshot.last_question_id, snapshot.last_section_id, nowMs, isHidden);

  const questionId = snapshot.last_question_id;
  if (questionId) {
    const record = snapshot.questions[questionId];
    if (record) {
      if (kind === "copy") {
        record.copy_count += 1;
      } else {
        record.paste_count += 1;
      }
      record.last_interaction_at = new Date(nowMs).toISOString();
    }
  }

  if (kind === "copy") {
    snapshot.copy_event_count += 1;
  } else {
    snapshot.paste_event_count += 1;
  }

  snapshot.last_interaction_at = new Date(nowMs).toISOString();
  appendTimeline(snapshot, {
    at_ms: nowMs - new Date(snapshot.started_at).getTime(),
    type: kind === "copy" ? "copy_attempt" : "paste_attempt",
    question_id: snapshot.last_question_id,
    section_id: snapshot.last_section_id,
  });
}

export function recordBackspace(
  snapshot: ExamAnalyticsSnapshot,
  nowMs: number = Date.now(),
  isHidden = false
) {
  syncExamAnalyticsSnapshot(snapshot, snapshot.last_question_id, snapshot.last_section_id, nowMs, isHidden);

  snapshot.typing.total_backspace_count += 1;
  snapshot.last_interaction_at = new Date(nowMs).toISOString();

  if (snapshot.last_question_id) {
    const record = snapshot.questions[snapshot.last_question_id];
    if (record) {
      record.backspace_count += 1;
      record.last_interaction_at = new Date(nowMs).toISOString();
    }
  }

  appendTimeline(snapshot, {
    at_ms: nowMs - new Date(snapshot.started_at).getTime(),
    type: "backspace",
    question_id: snapshot.last_question_id,
    section_id: snapshot.last_section_id,
  });
}

export function recordFullscreenExit(snapshot: ExamAnalyticsSnapshot, nowMs: number = Date.now()) {
  syncExamAnalyticsSnapshot(snapshot, snapshot.last_question_id, snapshot.last_section_id, nowMs, true);
  snapshot.fullscreen_exit_count += 1;
  appendTimeline(snapshot, {
    at_ms: nowMs - new Date(snapshot.started_at).getTime(),
    type: "fullscreen_exit",
    question_id: snapshot.last_question_id,
    section_id: snapshot.last_section_id,
  });
}

function buildSummary(snapshot: ExamAnalyticsSnapshot) {
  const questions = Object.values(snapshot.questions);
  const totalActiveMs = questions.reduce((sum, question) => sum + question.active_time_ms, 0);
  const totalIdleMs = questions.reduce((sum, question) => sum + question.idle_time_ms, 0);
  const totalMs = totalActiveMs + totalIdleMs;
  const answeredCount = questions.filter((question) => question.final_status === "answered").length;
  const longestQuestion = [...questions].sort(
    (left, right) => right.active_time_ms + right.idle_time_ms - (left.active_time_ms + left.idle_time_ms)
  )[0];
  const mostEditedQuestion = [...questions].sort((left, right) => right.answer_change_count - left.answer_change_count)[0];
  const mostRevisitedQuestion = [...questions].sort((left, right) => right.revisit_count - left.revisit_count)[0];

  return {
    answered_ratio: questions.length > 0 ? round((answeredCount / questions.length) * 100, 1) : 0,
    active_ratio: totalMs > 0 ? round((totalActiveMs / totalMs) * 100, 1) : 0,
    longest_question_id: longestQuestion?.question_id ?? null,
    most_edited_question_id: mostEditedQuestion?.question_id ?? null,
    most_revisited_question_id: mostRevisitedQuestion?.question_id ?? null,
    peak_wpm: snapshot.typing.peak_wpm,
  };
}

export function finalizeExamAnalyticsDraft(input: {
  studentId: string;
  studentName: string;
  teacherId?: string | null;
  subjectId: string;
  subjectSlug?: string | null;
  subjectName: string;
  examType: "prep" | "main";
  totalMarks: number;
  timeElapsed: number;
  examStartedAt?: string | null;
  examSections: ExamSection[];
  answers: Record<string, string>;
  mcqAnswers: Record<string, string>;
  questionStatus: Record<string, QuestionStatusLike>;
  analyticsSnapshot: ExamAnalyticsSnapshot;
  submittedDueToViolations?: boolean;
}): ExamAnalyticsDraft {
  const submittedAt = new Date().toISOString();
  const analytics = createExamAnalyticsSnapshot(
    input.examSections,
    input.examStartedAt ?? input.analyticsSnapshot.started_at,
    input.analyticsSnapshot
  );

  syncExamAnalyticsSnapshot(analytics, analytics.last_question_id, analytics.last_section_id, Date.now(), false);

  Object.values(analytics.questions).forEach((question) => {
    const answer = input.answers[question.question_id];
    const plainAnswer = answer ? toPlainTextAnswer(answer) : "";
    const mcqAnswer = input.mcqAnswers[question.question_id];
    const rawStatus = input.questionStatus[question.question_id];
    const finalStatus: FinalQuestionStatus = rawStatus
      ? rawStatus
      : mcqAnswer || plainAnswer
      ? "answered"
      : "unattempted";

    question.final_status = finalStatus;
    question.final_answer_length = plainAnswer.length;
    question.final_mcq_option = mcqAnswer ?? null;
  });

  analytics.summary = buildSummary(analytics);
  appendTimeline(analytics, {
    at_ms: Date.now() - new Date(analytics.started_at).getTime(),
    type: "exam_submit",
    question_id: analytics.last_question_id,
    section_id: analytics.last_section_id,
  });

  const totalQuestions = input.examSections.reduce((sum, section) => sum + section.questions.length, 0);
  const answeredQuestions = Object.values(analytics.questions).filter((question) => question.final_status === "answered").length;

  return {
    student_id: input.studentId,
    student_name: input.studentName,
    teacher_id: input.teacherId ?? null,
    subject_id: input.subjectId,
    subject_slug: input.subjectSlug ?? null,
    subject_name: input.subjectName,
    exam_type: input.examType,
    total_marks: input.totalMarks,
    answered_questions: answeredQuestions,
    total_questions: totalQuestions,
    time_elapsed: input.timeElapsed,
    exam_started_at: input.examStartedAt ?? analytics.started_at,
    exam_submitted_at: submittedAt,
    exam_sections: input.examSections,
    answers: input.answers,
    mcq_answers: input.mcqAnswers,
    question_status: Object.fromEntries(
      Object.values(analytics.questions).map((question) => [question.question_id, question.final_status ?? "unattempted"])
    ),
    analytics,
    submitted_due_to_violations: input.submittedDueToViolations ?? false,
  };
}

export function saveExamAnalyticsDraft(draft: ExamAnalyticsDraft) {
  const storage = safeLocalStorage();
  if (!storage) {
    return;
  }
  storage.setItem(EXAM_ANALYTICS_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function loadExamAnalyticsDraft(studentId?: string): ExamAnalyticsDraft | null {
  const storage = safeLocalStorage();
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(EXAM_ANALYTICS_DRAFT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ExamAnalyticsDraft;
    if (studentId && parsed.student_id !== studentId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearExamAnalyticsDraft() {
  const storage = safeLocalStorage();
  if (!storage) {
    return;
  }
  storage.removeItem(EXAM_ANALYTICS_DRAFT_STORAGE_KEY);
}

export function buildSubmissionAnalyticsInsert(
  draft: ExamAnalyticsDraft,
  submissionId: string
) {
  const questions = Object.values(draft.analytics.questions);
  const sections = Object.values(draft.analytics.sections);
  const totalActiveSeconds = Math.round(questions.reduce((sum, question) => sum + question.active_time_ms, 0) / 1000);
  const totalIdleSeconds = Math.round(questions.reduce((sum, question) => sum + question.idle_time_ms, 0) / 1000);

  return {
    submission_id: submissionId,
    student_id: draft.student_id,
    teacher_id: draft.teacher_id,
    subject_id: draft.subject_id,
    subject_name: draft.subject_name,
    exam_type: draft.exam_type,
    analytics_version: draft.analytics.version,
    exam_started_at: draft.exam_started_at,
    exam_submitted_at: draft.exam_submitted_at,
    total_duration_seconds: draft.time_elapsed,
    active_duration_seconds: totalActiveSeconds,
    idle_duration_seconds: totalIdleSeconds,
    focus_loss_count: draft.analytics.focus_loss_count,
    fullscreen_exit_count: draft.analytics.fullscreen_exit_count,
    navigator_jump_count: draft.analytics.navigator_jump_count,
    answer_change_count: draft.analytics.answer_change_count,
    review_toggle_count: draft.analytics.review_toggle_count,
    copy_event_count: draft.analytics.copy_event_count,
    paste_event_count: draft.analytics.paste_event_count,
    total_characters_typed: draft.analytics.typing.total_characters_typed,
    total_words_typed: draft.analytics.typing.total_words_typed,
    total_backspace_count: draft.analytics.typing.total_backspace_count,
    typing_speed_wpm: draft.analytics.typing.average_wpm || null,
    typing_speed_cpm: draft.analytics.typing.average_cpm || null,
    peak_wpm: draft.analytics.typing.peak_wpm || null,
    question_analytics: questions,
    section_analytics: sections,
    timeline_events: draft.analytics.timeline,
    summary: draft.analytics.summary,
  };
}

export async function upsertSubmissionAnalytics(
  draft: ExamAnalyticsDraft,
  submissionId: string
): Promise<SubmissionAnalyticsRow> {
  const insert = buildSubmissionAnalyticsInsert(draft, submissionId);
  const { data, error } = await supabase
    .from("submission_analytics")
    .upsert(insert)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as SubmissionAnalyticsRow;
}

export async function getSubmissionAnalyticsBySubmissionId(
  submissionId: string
): Promise<SubmissionAnalyticsRow | null> {
  const { data, error } = await supabase
    .from("submission_analytics")
    .select("*")
    .eq("submission_id", submissionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as SubmissionAnalyticsRow | null) ?? null;
}

export async function getStudentSubmissionAnalytics(
  studentId: string
): Promise<SubmissionAnalyticsRow[]> {
  const { data, error } = await supabase
    .from("submission_analytics")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as SubmissionAnalyticsRow[];
}

function evaluationFromSubmission(submission: SubmissionRow | null): EvaluationResult | null {
  if (!submission?.evaluation_data) {
    return null;
  }

  return submission.evaluation_data as EvaluationResult;
}

function buildFallbackEvaluation(submission: SubmissionRow | null): Record<string, EvaluationQuestionMetric> {
  if (!submission) {
    return {};
  }

  const result: Record<string, EvaluationQuestionMetric> = {};
  for (const [questionId, marks] of Object.entries(submission.question_marks ?? {})) {
    result[questionId] = {
      marksAwarded: marks,
      maxMarks: 0,
      feedback: null,
      isCorrect: null,
    };
  }
  return result;
}

function buildEvaluationMap(
  submission: SubmissionRow | null,
  examSections: ExamSection[]
): Record<string, EvaluationQuestionMetric> {
  const questionMaxMarks = new Map<string, number>();
  examSections.forEach((section) => {
    section.questions.forEach((question) => {
      questionMaxMarks.set(question.id, question.marks);
    });
  });

  const result = buildFallbackEvaluation(submission);
  const evaluation = evaluationFromSubmission(submission);
  if (evaluation?.questionEvaluations?.length) {
    evaluation.questionEvaluations.forEach((item) => {
      result[item.questionId] = {
        marksAwarded: item.marksAwarded,
        maxMarks: item.maxMarks,
        feedback: item.feedback ?? null,
        isCorrect: item.isCorrect ?? null,
      };
    });
  }

  Object.entries(result).forEach(([questionId, item]) => {
    if (item.maxMarks === 0) {
      item.maxMarks = questionMaxMarks.get(questionId) ?? 0;
    }
  });

  return result;
}

function getAttemptSource(
  submission: SubmissionRow | null,
  draft: ExamAnalyticsDraft | null,
  analytics: SubmissionAnalyticsRow | null
) {
  if (draft) {
    return {
      examSections: draft.exam_sections,
      answers: draft.answers,
      mcqAnswers: draft.mcq_answers,
      durationSeconds: draft.time_elapsed,
      answeredQuestions: draft.answered_questions,
      totalQuestions: draft.total_questions,
    };
  }

  return {
    examSections: (submission?.exam_sections as ExamSection[]) ?? [],
    answers: submission?.answers ?? {},
    mcqAnswers: submission?.mcq_answers ?? {},
    durationSeconds: submission?.time_elapsed ?? analytics?.total_duration_seconds ?? 0,
    answeredQuestions: 0,
    totalQuestions: 0,
  };
}

export function buildAttemptAnalyticsViewModel(input: {
  submission?: SubmissionRow | null;
  draft?: ExamAnalyticsDraft | null;
  analytics?: SubmissionAnalyticsRow | null;
}): AttemptAnalyticsViewModel {
  const submission = input.submission ?? null;
  const draft = input.draft ?? null;
  const analytics = input.analytics ?? null;
  const source = getAttemptSource(submission, draft, analytics);
  const evaluationMap = buildEvaluationMap(submission, source.examSections);
  const evaluationResult = evaluationFromSubmission(submission);

  const questionMetrics = Object.values(
    draft?.analytics.questions ??
      Object.fromEntries((analytics?.question_analytics ?? []).map((question) => [question.question_id, question]))
  );

  const questionOrder = questionMetrics.length
    ? questionMetrics
    : source.examSections.flatMap((section) =>
        section.questions.map((question, questionIndex) => buildQuestionDefaults(section, question, questionIndex))
      );

  const questions: AttemptQuestionMetric[] = questionOrder.map((question) => {
    const evaluation = evaluationMap[question.question_id];
    const marksAwarded = evaluation ? evaluation.marksAwarded : null;
    const maxMarks = evaluation?.maxMarks ?? question.max_marks;
    return {
      questionId: question.question_id,
      questionLabel: question.question_label,
      questionText: question.question_text,
      sectionId: question.section_id,
      sectionName: question.section_name,
      questionType: question.question_type,
      maxMarks: question.max_marks,
      timeSpentSeconds: Math.round((question.active_time_ms + question.idle_time_ms) / 1000),
      activeSeconds: Math.round(question.active_time_ms / 1000),
      idleSeconds: Math.round(question.idle_time_ms / 1000),
      visits: question.visits,
      revisits: question.revisit_count,
      answerChanges: question.answer_change_count,
      markForReviewCount: question.mark_for_review_count,
      typingWords: question.words_typed,
      typingCharacters: question.characters_typed,
      backspaceCount: question.backspace_count,
      finalStatus: question.final_status ?? "unattempted",
      answerLength: question.final_answer_length ?? 0,
      marksAwarded,
      scorePercentage: marksAwarded !== null && maxMarks > 0 ? round((marksAwarded / maxMarks) * 100, 1) : null,
      feedback: evaluation?.feedback ?? null,
      isCorrect: evaluation?.isCorrect ?? null,
    };
  });

  const sectionRecords = analytics?.section_analytics ?? Object.values(draft?.analytics.sections ?? {});
  const sections: AttemptSectionMetric[] = sectionRecords.map((section) => {
    const sectionQuestions = questions.filter((question) => question.sectionId === section.section_id);
    const sectionMarks = sectionQuestions.reduce((sum, question) => sum + question.maxMarks, 0);
    const awardedMarks = sectionQuestions.reduce((sum, question) => sum + (question.marksAwarded ?? 0), 0);
    return {
      sectionId: section.section_id,
      sectionName: section.section_name,
      questionCount: section.question_count,
      totalMarks: section.total_marks,
      timeSpentSeconds: Math.round((section.active_time_ms + section.idle_time_ms) / 1000),
      activeSeconds: Math.round(section.active_time_ms / 1000),
      idleSeconds: Math.round(section.idle_time_ms / 1000),
      scorePercentage:
        sectionQuestions.some((question) => question.marksAwarded !== null) && sectionMarks > 0
          ? round((awardedMarks / sectionMarks) * 100, 1)
          : null,
      answeredCount: sectionQuestions.filter((question) => question.finalStatus === "answered").length,
      markedCount: sectionQuestions.filter((question) => question.finalStatus === "marked").length,
      skippedCount: sectionQuestions.filter((question) => question.finalStatus === "skipped").length,
    };
  });

  const totalDurationSeconds = draft?.time_elapsed ?? analytics?.total_duration_seconds ?? source.durationSeconds;
  const activeDurationSeconds =
    analytics?.active_duration_seconds ?? Math.round(questions.reduce((sum, question) => sum + question.activeSeconds, 0));
  const idleDurationSeconds =
    analytics?.idle_duration_seconds ?? Math.round(questions.reduce((sum, question) => sum + question.idleSeconds, 0));
  const totalObservedSeconds = activeDurationSeconds + idleDurationSeconds;
  const answeredQuestions =
    draft?.answered_questions ?? questions.filter((question) => question.finalStatus === "answered").length;
  const totalQuestions = draft?.total_questions ?? questions.length;

  const answersOverTime = new Map<number, number>();
  const activeOverTime = new Map<number, number>();
  (draft?.analytics.timeline ?? analytics?.timeline_events ?? []).forEach((event) => {
    const bucket = Math.floor(event.at_ms / 300_000);
    if (event.type === "answer_change" || event.type === "mcq_change") {
      answersOverTime.set(bucket, (answersOverTime.get(bucket) ?? 0) + 1);
    }
  });

  questions.forEach((question) => {
    const bucket = Math.max(0, Math.floor(question.timeSpentSeconds / 300));
    activeOverTime.set(bucket, (activeOverTime.get(bucket) ?? 0) + question.activeSeconds);
  });

  const timelineBuckets = Math.max(1, Math.ceil(Math.max(totalDurationSeconds, 1) / 300));
  const timeline = Array.from({ length: timelineBuckets }, (_, index) => ({
    label: `${index * 5}-${index * 5 + 5}m`,
    seconds: Math.min(300, Math.max(0, totalDurationSeconds - index * 300)),
    answers: answersOverTime.get(index) ?? 0,
    activeSeconds: activeOverTime.get(index) ?? 0,
  }));

  const strongestQuestion =
    questions
      .filter((question) => question.scorePercentage !== null)
      .sort((left, right) => (right.scorePercentage ?? 0) - (left.scorePercentage ?? 0))[0] ?? null;
  const weakestQuestion =
    questions
      .filter((question) => question.scorePercentage !== null)
      .sort((left, right) => (left.scorePercentage ?? 0) - (right.scorePercentage ?? 0))[0] ?? null;

  return {
    mode: draft ? "draft" : "saved",
    submission,
    draft,
    analytics,
    evaluationResult,
    answeredQuestions,
    totalQuestions,
    totalDurationSeconds,
    activeDurationSeconds,
    idleDurationSeconds,
    activeRatio: totalObservedSeconds > 0 ? round((activeDurationSeconds / totalObservedSeconds) * 100, 1) : 0,
    averageTimePerQuestionSeconds: totalQuestions > 0 ? round(totalDurationSeconds / totalQuestions, 1) : 0,
    answerChangeCount: analytics?.answer_change_count ?? draft?.analytics.answer_change_count ?? 0,
    navigatorJumpCount: analytics?.navigator_jump_count ?? draft?.analytics.navigator_jump_count ?? 0,
    focusLossCount: analytics?.focus_loss_count ?? draft?.analytics.focus_loss_count ?? 0,
    fullscreenExitCount: analytics?.fullscreen_exit_count ?? draft?.analytics.fullscreen_exit_count ?? 0,
    copyEventCount: analytics?.copy_event_count ?? draft?.analytics.copy_event_count ?? 0,
    pasteEventCount: analytics?.paste_event_count ?? draft?.analytics.paste_event_count ?? 0,
    typingWpm: analytics?.typing_speed_wpm ?? draft?.analytics.typing.average_wpm ?? 0,
    typingCpm: analytics?.typing_speed_cpm ?? draft?.analytics.typing.average_cpm ?? 0,
    peakWpm: analytics?.peak_wpm ?? draft?.analytics.typing.peak_wpm ?? 0,
    totalCharactersTyped: analytics?.total_characters_typed ?? draft?.analytics.typing.total_characters_typed ?? 0,
    totalWordsTyped: analytics?.total_words_typed ?? draft?.analytics.typing.total_words_typed ?? 0,
    totalBackspaceCount: analytics?.total_backspace_count ?? draft?.analytics.typing.total_backspace_count ?? 0,
    questions,
    sections,
    timeline,
    highlights: {
      longestQuestion: [...questions].sort((left, right) => right.timeSpentSeconds - left.timeSpentSeconds)[0] ?? null,
      mostEditedQuestion: [...questions].sort((left, right) => right.answerChanges - left.answerChanges)[0] ?? null,
      mostRevisitedQuestion: [...questions].sort((left, right) => right.revisits - left.revisits)[0] ?? null,
      strongestQuestion,
      weakestQuestion,
    },
  };
}

function getSubmissionPercentage(submission: SubmissionRow): number | null {
  if (submission.total_marks <= 0 || submission.total_marks_obtained === null) {
    return null;
  }

  return round((submission.total_marks_obtained / submission.total_marks) * 100, 1);
}

function buildSubjectSummaries(
  submissions: SubmissionRow[],
  analyticsRows: SubmissionAnalyticsRow[]
): SubjectAnalyticsViewModel[] {
  const analyticsMap = new Map(analyticsRows.map((analytics) => [analytics.submission_id, analytics]));
  const grouped = new Map<string, SubmissionRow[]>();

  submissions.forEach((submission) => {
    const key = `${submission.subject_id}::${submission.subject_name}`;
    const list = grouped.get(key) ?? [];
    list.push(submission);
    grouped.set(key, list);
  });

  return Array.from(grouped.entries()).map(([key, rows]) => {
    const [subjectId, subjectName] = key.split("::");
    const evaluatedRows = rows.filter((row) => row.total_marks_obtained !== null);
    const percentages = evaluatedRows.map(getSubmissionPercentage).filter((value): value is number => value !== null);
    const durations = rows.map((row) => row.time_elapsed ?? 0).filter((value) => value > 0);
    const activeRatios = rows
      .map((row) => {
        const analytics = analyticsMap.get(row.id);
        if (!analytics) {
          return null;
        }
        const total = analytics.active_duration_seconds + analytics.idle_duration_seconds;
        return total > 0 ? (analytics.active_duration_seconds / total) * 100 : null;
      })
      .filter((value): value is number => value !== null);
    const typingWpms = rows
      .map((row) => analyticsMap.get(row.id)?.typing_speed_wpm ?? null)
      .filter((value): value is number => value !== null);

    const questionRollup = new Map<
      string,
      {
        questionId: string;
        questionLabel: string;
        questionText: string;
        totalSeconds: number;
        totalAnswerChanges: number;
        scorePercentages: number[];
        count: number;
      }
    >();
    const sectionRollup = new Map<
      string,
      {
        sectionId: string;
        sectionName: string;
        totalSeconds: number;
        scorePercentages: number[];
        count: number;
      }
    >();

    rows.forEach((row) => {
      const viewModel = buildAttemptAnalyticsViewModel({
        submission: row,
        analytics: analyticsMap.get(row.id) ?? null,
      });

      viewModel.questions.forEach((question) => {
        const bucket = questionRollup.get(question.questionId) ?? {
          questionId: question.questionId,
          questionLabel: question.questionLabel,
          questionText: question.questionText,
          totalSeconds: 0,
          totalAnswerChanges: 0,
          scorePercentages: [],
          count: 0,
        };
        bucket.totalSeconds += question.timeSpentSeconds;
        bucket.totalAnswerChanges += question.answerChanges;
        if (question.scorePercentage !== null) {
          bucket.scorePercentages.push(question.scorePercentage);
        }
        bucket.count += 1;
        questionRollup.set(question.questionId, bucket);
      });

      viewModel.sections.forEach((section) => {
        const bucket = sectionRollup.get(section.sectionId) ?? {
          sectionId: section.sectionId,
          sectionName: section.sectionName,
          totalSeconds: 0,
          scorePercentages: [],
          count: 0,
        };
        bucket.totalSeconds += section.timeSpentSeconds;
        if (section.scorePercentage !== null) {
          bucket.scorePercentages.push(section.scorePercentage);
        }
        bucket.count += 1;
        sectionRollup.set(section.sectionId, bucket);
      });
    });

    return {
      subjectId,
      subjectName,
      attemptCount: rows.length,
      evaluatedAttemptCount: evaluatedRows.length,
      pendingAttemptCount: rows.length - evaluatedRows.length,
      averagePercentage: percentages.length > 0 ? round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length, 1) : null,
      bestPercentage: percentages.length > 0 ? Math.max(...percentages) : null,
      averageDurationSeconds: durations.length > 0 ? round(durations.reduce((sum, value) => sum + value, 0) / durations.length, 1) : null,
      averageActiveRatio: activeRatios.length > 0 ? round(activeRatios.reduce((sum, value) => sum + value, 0) / activeRatios.length, 1) : null,
      averageTypingWpm: typingWpms.length > 0 ? round(typingWpms.reduce((sum, value) => sum + value, 0) / typingWpms.length, 1) : null,
      latestPercentage:
        rows.length > 0
          ? getSubmissionPercentage([...rows].sort((left, right) => right.created_at.localeCompare(left.created_at))[0])
          : null,
      recentAttempts: [...rows]
        .sort((left, right) => right.created_at.localeCompare(left.created_at))
        .slice(0, 6)
        .map((row) => {
          const analytics = analyticsMap.get(row.id);
          const total = analytics ? analytics.active_duration_seconds + analytics.idle_duration_seconds : 0;
          return {
            submissionId: row.id,
            label: new Date(row.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            percentage: getSubmissionPercentage(row),
            durationSeconds: row.time_elapsed ?? 0,
            activeRatio: analytics && total > 0 ? round((analytics.active_duration_seconds / total) * 100, 1) : null,
          };
        }),
      sectionRollup: Array.from(sectionRollup.values()).map((section) => ({
        sectionId: section.sectionId,
        sectionName: section.sectionName,
        averageTimeSeconds: round(section.totalSeconds / Math.max(1, section.count), 1),
        averageScorePercentage:
          section.scorePercentages.length > 0
            ? round(section.scorePercentages.reduce((sum, value) => sum + value, 0) / section.scorePercentages.length, 1)
            : null,
      })),
      questionRollup: Array.from(questionRollup.values())
        .map((question) => ({
          questionId: question.questionId,
          questionLabel: question.questionLabel,
          questionText: question.questionText,
          averageTimeSeconds: round(question.totalSeconds / Math.max(1, question.count), 1),
          averageScorePercentage:
            question.scorePercentages.length > 0
              ? round(question.scorePercentages.reduce((sum, value) => sum + value, 0) / question.scorePercentages.length, 1)
              : null,
          averageAnswerChanges: round(question.totalAnswerChanges / Math.max(1, question.count), 1),
        }))
        .sort((left, right) => right.averageTimeSeconds - left.averageTimeSeconds),
    };
  });
}

export function buildSubjectAnalyticsViewModel(input: {
  submissions: SubmissionRow[];
  analyticsRows: SubmissionAnalyticsRow[];
  subjectId: string;
}): SubjectAnalyticsViewModel | null {
  const summaries = buildSubjectSummaries(input.submissions, input.analyticsRows);
  return summaries.find((summary) => summary.subjectId === input.subjectId) ?? null;
}

export function buildProfileAnalyticsViewModel(input: {
  submissions: SubmissionRow[];
  analyticsRows: SubmissionAnalyticsRow[];
}): ProfileAnalyticsViewModel {
  const analyticsMap = new Map(input.analyticsRows.map((analytics) => [analytics.submission_id, analytics]));
  const subjectSummaries = buildSubjectSummaries(input.submissions, input.analyticsRows).sort(
    (left, right) => (right.averagePercentage ?? 0) - (left.averagePercentage ?? 0)
  );
  const evaluatedSubmissions = input.submissions.filter((submission) => submission.total_marks_obtained !== null);
  const percentages = evaluatedSubmissions
    .map(getSubmissionPercentage)
    .filter((value): value is number => value !== null);
  const durations = input.submissions
    .map((submission) => submission.time_elapsed ?? 0)
    .filter((value) => value > 0);
  const activeRatios = input.submissions
    .map((submission) => {
      const analytics = analyticsMap.get(submission.id);
      if (!analytics) {
        return null;
      }
      const total = analytics.active_duration_seconds + analytics.idle_duration_seconds;
      return total > 0 ? (analytics.active_duration_seconds / total) * 100 : null;
    })
    .filter((value): value is number => value !== null);
  const typingWpms = input.analyticsRows
    .map((analytics) => analytics.typing_speed_wpm)
    .filter((value): value is number => value !== null);

  const strongestBase = subjectSummaries.find((summary) => summary.averagePercentage !== null);
  const strongestSubject = strongestBase
    ? {
        subjectId: strongestBase.subjectId,
        subjectName: strongestBase.subjectName,
        averagePercentage: strongestBase.averagePercentage!,
      }
    : null;

  const groupedBySubject = new Map<string, SubmissionRow[]>();
  input.submissions.forEach((submission) => {
    const list = groupedBySubject.get(submission.subject_id) ?? [];
    list.push(submission);
    groupedBySubject.set(submission.subject_id, list);
  });

  let mostImprovedSubject: ProfileAnalyticsViewModel["mostImprovedSubject"] = null;
  groupedBySubject.forEach((rows, subjectId) => {
    const evaluated = rows
      .filter((row) => row.total_marks_obtained !== null)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
    if (evaluated.length < 2) {
      return;
    }
    const first = getSubmissionPercentage(evaluated[0]) ?? 0;
    const last = getSubmissionPercentage(evaluated[evaluated.length - 1]) ?? 0;
    const improvement = round(last - first, 1);
    if (!mostImprovedSubject || improvement > mostImprovedSubject.improvement) {
      mostImprovedSubject = {
        subjectId,
        subjectName: evaluated[evaluated.length - 1].subject_name,
        improvement,
      };
    }
  });

  return {
    attemptCount: input.submissions.length,
    evaluatedAttemptCount: evaluatedSubmissions.length,
    pendingAttemptCount: input.submissions.length - evaluatedSubmissions.length,
    averagePercentage: percentages.length > 0 ? round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length, 1) : null,
    averageDurationSeconds: durations.length > 0 ? round(durations.reduce((sum, value) => sum + value, 0) / durations.length, 1) : null,
    averageActiveRatio: activeRatios.length > 0 ? round(activeRatios.reduce((sum, value) => sum + value, 0) / activeRatios.length, 1) : null,
    averageTypingWpm: typingWpms.length > 0 ? round(typingWpms.reduce((sum, value) => sum + value, 0) / typingWpms.length, 1) : null,
    totalExamSeconds: input.submissions.reduce((sum, submission) => sum + (submission.time_elapsed ?? 0), 0),
    strongestSubject,
    mostImprovedSubject,
    subjectSummaries,
    recentAttempts: [...input.submissions]
      .sort((left, right) => right.created_at.localeCompare(left.created_at))
      .slice(0, 8)
      .map((submission) => {
        const analytics = analyticsMap.get(submission.id);
        const total = analytics ? analytics.active_duration_seconds + analytics.idle_duration_seconds : 0;
        return {
          submissionId: submission.id,
          subjectName: submission.subject_name,
          percentage: getSubmissionPercentage(submission),
          durationSeconds: submission.time_elapsed ?? 0,
          activeRatio: analytics && total > 0 ? round((analytics.active_duration_seconds / total) * 100, 1) : null,
          createdAt: submission.created_at,
        };
      }),
  };
}
