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
 * Creates 3 sections: MCQ (10 q, 1 mark), Theory (4 q, 4 marks), Analytical (4 q, 6 marks).
 */
export function generateExamSections(_subjectId: string, questions: Question[]): ExamSection[] {
  const mcqQuestions = questions.filter(q => q.type === 'mcq' && q.options && q.options.length > 0);
  const nonMcqQuestions = questions.filter(q => q.type !== 'mcq');

  // Theory: 4 marks each (use questions with marks 3 or 4)
  const theoryCandidates = nonMcqQuestions.filter(q => q.marks === 3 || q.marks === 4);
  const theoryQuestions = theoryCandidates.slice(0, 4).map(q => ({ ...q, marks: 4 }));

  // Analytical: 6 marks each (use questions with marks 5 or 6)
  const analyticalCandidates = nonMcqQuestions.filter(q => q.marks === 5 || q.marks === 6);
  const analyticalQuestions = analyticalCandidates.slice(0, 4).map(q => ({ ...q, marks: 6 }));

  // If non-MCQ don't match marks, distribute: first 4 → Theory (4m), next 4 → Analytical (6m)
  if (theoryQuestions.length === 0 && analyticalQuestions.length === 0 && nonMcqQuestions.length > 0) {
    const remaining = [...nonMcqQuestions];
    const theory = remaining.splice(0, 4).map(q => ({ ...q, marks: 4 }));
    const analytical = remaining.splice(0, 4).map(q => ({ ...q, marks: 6 }));
    return buildSections(
      mcqQuestions.slice(0, 10).map(q => shuffleOptions({ ...q, marks: 1, type: 'mcq' as const })),
      theory,
      analytical,
    );
  }

  return buildSections(
    mcqQuestions.slice(0, 10).map(q => shuffleOptions({ ...q, marks: 1, type: 'mcq' as const })),
    theoryQuestions,
    analyticalQuestions,
  );
}

function buildSections(
  mcq: Question[],
  theory: Question[],
  analytical: Question[],
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
      color: 'bg-black',
    });
  }

  if (theory.length > 0) {
    sections.push({
      id: 'section-2',
      name: 'Section B - Theory',
      description: 'Theory questions - answer in detail',
      questions: theory,
      marksPerQuestion: 4,
      icon: 'FileText',
      color: 'bg-black',
    });
  }

  if (analytical.length > 0) {
    sections.push({
      id: 'section-3',
      name: 'Section C - Analytical',
      description: 'Analytical questions - provide comprehensive answers',
      questions: analytical,
      marksPerQuestion: 6,
      icon: 'BookOpen',
      color: 'bg-black',
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
