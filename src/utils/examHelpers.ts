import type { Question, ExamSection, MCQOption } from '@/features/exam/types';

/** Fisher–Yates in-place shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle MCQ option order for each question and update correctOption accordingly. */
function shuffleOptions(q: Question): Question {
  if (q.type !== 'mcq' || !q.options || q.options.length === 0) return q;

  const shuffled: MCQOption[] = shuffle(q.options);

  return { ...q, options: shuffled };
}

/**
 * Generate exam sections from a subject's questions.
 * Creates 4 sections: MCQ, Short, Medium, Long answers.
 * Uses real questions from the database, categorized by type and marks.
 */
export function generateExamSections(_subjectId: string, questions: Question[]): ExamSection[] {
  // Separate questions by type
  const mcqQuestions = questions.filter(q => q.type === 'mcq' && q.options && q.options.length > 0);
  const nonMcqQuestions = questions.filter(q => q.type !== 'mcq');

  // Categorize non-MCQ questions (both descriptive and code) by marks
  const shortQuestions = nonMcqQuestions.filter(q => q.marks === 3).slice(0, 2);
  const mediumQuestions = nonMcqQuestions.filter(q => q.marks === 4).slice(0, 3);
  const longQuestions = nonMcqQuestions.filter(q => q.marks === 5).slice(0, 4);

  // If non-MCQ questions don't have specific marks, distribute them
  if (shortQuestions.length === 0 && mediumQuestions.length === 0 && longQuestions.length === 0 && nonMcqQuestions.length > 0) {
    const remaining = [...nonMcqQuestions];
    const short = remaining.splice(0, 2).map(q => ({ ...q, marks: 3, type: q.type === 'code' ? 'code' as const : 'short' as const }));
    const medium = remaining.splice(0, 3).map(q => ({ ...q, marks: 4, type: q.type === 'code' ? 'code' as const : 'medium' as const }));
    const long = remaining.splice(0, 4).map(q => ({ ...q, marks: 5, type: q.type === 'code' ? 'code' as const : 'long' as const }));

    return buildSections(
      mcqQuestions.slice(0, 12).map(q => shuffleOptions({ ...q, marks: 1, type: 'mcq' as const })),
      short,
      medium,
      long,
    );
  }

  return buildSections(
    mcqQuestions.slice(0, 12).map(q => shuffleOptions({ ...q, marks: 1, type: 'mcq' as const })),
    shortQuestions.map(q => ({ ...q, marks: 3, type: q.type === 'code' ? 'code' as const : 'short' as const })),
    mediumQuestions.map(q => ({ ...q, marks: 4, type: q.type === 'code' ? 'code' as const : 'medium' as const })),
    longQuestions.map(q => ({ ...q, marks: 5, type: q.type === 'code' ? 'code' as const : 'long' as const })),
  );
}

function buildSections(
  mcq: Question[],
  short: Question[],
  medium: Question[],
  long: Question[],
): ExamSection[] {
  const sections: ExamSection[] = [];

  if (mcq.length > 0) {
    sections.push({
      id: 'section-1',
      name: 'Section A - MCQ',
      description: 'Multiple Choice Questions - Choose the correct answer',
      questions: mcq,
      marksPerQuestion: 1,
      icon: 'Target',
      color: 'bg-sky-600',
    });
  }

  if (short.length > 0) {
    sections.push({
      id: 'section-2',
      name: 'Section B - Short Answer',
      description: 'Answer briefly in 2-3 sentences',
      questions: short,
      marksPerQuestion: 3,
      icon: 'PenTool',
      color: 'bg-teal-600',
    });
  }

  if (medium.length > 0) {
    sections.push({
      id: 'section-3',
      name: 'Section C - Medium Answer',
      description: 'Answer in detail with explanations',
      questions: medium,
      marksPerQuestion: 4,
      icon: 'FileText',
      color: 'bg-orange-500',
    });
  }

  if (long.length > 0) {
    sections.push({
      id: 'section-4',
      name: 'Section D - Long Answer',
      description: 'Provide comprehensive answers with examples',
      questions: long,
      marksPerQuestion: 5,
      icon: 'BookOpen',
      color: 'bg-indigo-600',
    });
  }

  return sections;
}

// ── Combined Answer (text + inline compiler code) helpers ──

export interface CombinedAnswer {
  __eduxam: 'v1';
  text: string;
  code: string;
  language: string;
}

/** Build a combined answer string from rich text + compiler code. */
export function buildCombinedAnswer(text: string, code: string, language: string): string {
  if (!code.trim()) {
    // No code → store plain text only
    return text;
  }
  const obj: CombinedAnswer = { __eduxam: 'v1', text, code, language };
  return JSON.stringify(obj);
}

/** Parse an answer string. Returns CombinedAnswer if it contains compiler code, or null. */
export function parseCombinedAnswer(answer: string): CombinedAnswer | null {
  if (!answer || !answer.startsWith('{"__eduxam"')) return null;
  try {
    const obj = JSON.parse(answer);
    if (obj && obj.__eduxam === 'v1') return obj as CombinedAnswer;
  } catch {
    // not JSON
  }
  return null;
}

/** Get the display text from an answer (handles both plain and combined). */
export function getAnswerText(answer: string): string {
  const combined = parseCombinedAnswer(answer);
  return combined ? combined.text : answer;
}

/** Get the compiler code from an answer (handles both plain and combined). */
export function getAnswerCode(answer: string): { code: string; language: string } | null {
  const combined = parseCombinedAnswer(answer);
  if (combined && combined.code.trim()) return { code: combined.code, language: combined.language };
  return null;
}
