import type { EvaluationStrictness } from "@/context/SettingsContext";
import type { ExamSection, TestCase } from "@/features/exam/types";
import { runTestCases, type SupportedLanguage } from "./codeExecutionService";

// ── API Keys ────────────────────────────────────────────────────────────────
const API_KEYS = [
  import.meta.env.VITE_OPENROUTER_API_KEY_1,
  import.meta.env.VITE_OPENROUTER_API_KEY_2,
  import.meta.env.VITE_OPENROUTER_API_KEY_3,
  import.meta.env.VITE_OPENROUTER_API_KEY_4,
  import.meta.env.VITE_OPENROUTER_API_KEY_5,
  import.meta.env.VITE_OPENROUTER_API_KEY_6,
  import.meta.env.VITE_OPENROUTER_API_KEY_7,
].filter(Boolean) as string[];

const API_URL =
  import.meta.env.VITE_OPENROUTER_API_URL ||
  "https://openrouter.ai/api/v1/chat/completions";

// ── Free models on OpenRouter ───────────────────────────────────────────────
// Ordered by reliability. Each consecutive request uses a DIFFERENT key AND
// a DIFFERENT model via simple round-robin — no blacklisting, no complexity.
const FREE_MODELS = [
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "google/gemma-3-4b-it:free",
  "google/gemma-3n-e4b-it:free",
  "arcee-ai/trinity-large-preview:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "stepfun/step-3.5-flash:free",
  "z-ai/glm-4.5-air:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "qwen/qwen3-4b:free",
];

// ── Simple round-robin ──────────────────────────────────────────────────────
// comboIdx advances by 1 on every call. Using modular arithmetic against both
// arrays ensures each consecutive call hits a DIFFERENT key AND model.
// Since gcd(7, 13) = 1 the pattern covers all 91 unique combos before repeating.
let comboIdx = 0;

function nextCombo(): { apiKey: string; model: string } {
  if (API_KEYS.length === 0)
    throw new Error("No API keys found. Check your .env file.");
  const ki = comboIdx % API_KEYS.length;
  const mi = comboIdx % FREE_MODELS.length;
  comboIdx++;
  return { apiKey: API_KEYS[ki], model: FREE_MODELS[mi] };
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ── Progress messages ───────────────────────────────────────────────────────
const PROGRESS_MESSAGES = [
  "Our AI is reading through your answers...",
  "Analyzing your response carefully...",
  "Checking for key concepts and accuracy...",
  "Almost there, grading in progress...",
  "Comparing against expected answers...",
  "Evaluating depth and clarity of your response...",
  "Hang tight! Your results are coming soon...",
  "Cross-referencing your answer with the rubric...",
  "Double-checking the evaluation...",
  "Wrapping up the grading process...",
];

function getProgressMessage(questionNum: number): string {
  return PROGRESS_MESSAGES[questionNum % PROGRESS_MESSAGES.length];
}

// ── Types ───────────────────────────────────────────────────────────────────
export interface QuestionEvaluation {
  questionId: string;
  questionText: string;
  studentAnswer: string;
  maxMarks: number;
  marksAwarded: number;
  feedback: string;
  isCorrect: boolean;
}

export interface EvaluationResult {
  totalMarksObtained: number;
  totalMaxMarks: number;
  percentage: number;
  grade: string;
  overallFeedback: string;
  questionEvaluations: QuestionEvaluation[];
  evaluationStrictness: EvaluationStrictness;
}

export interface EvaluationProgress {
  currentQuestion: number;
  totalQuestions: number;
  currentSection: string;
  status: "evaluating" | "completed" | "error";
  message: string;
}

type ProgressCallback = (progress: EvaluationProgress) => void;

// ── Helpers ─────────────────────────────────────────────────────────────────
// Scale max answer length by question marks so students get full evaluation
// for big answers, but extreme cases are still capped to avoid token overflow.
// 1 mark → 2000 chars, 5 marks → 4000, 10 marks → 6500, 15+ marks → 8000
function maxAnswerChars(marks: number): number {
  return Math.min(1500 + marks * 500, 8000);
}

function truncateAnswer(text: string, marks: number): string {
  const limit = maxAnswerChars(marks);
  if (text.length <= limit) return text;
  return text.slice(0, limit) + "\n[Answer truncated for evaluation]";
}

function stripHtml(html: string): string {
  if (!html) return "";
  const temp = document.createElement("div");
  temp.innerHTML = html;
  temp.querySelectorAll("img").forEach((img) => img.remove());
  temp.querySelectorAll("br").forEach((br) =>
    br.replaceWith(document.createTextNode("\n"))
  );
  temp.querySelectorAll("p, div, h1, h2, h3, h4, h5, h6, li, tr").forEach(
    (el) => el.prepend(document.createTextNode("\n"))
  );
  let text = temp.textContent || temp.innerText || "";
  return text.replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n").trim();
}

function getStrictnessInstructions(strictness: EvaluationStrictness): string {
  switch (strictness) {
    case "easy":
      return `EVALUATION MODE: EASY (Generous Marking)
- Give harsh, brutally honest feedback but be GENEROUS with marks
- If the student shows ANY understanding, give significant partial credit
- Award 60-80% marks for answers that show basic understanding even if poorly expressed
- Award full marks for answers that cover the main idea, even if details are wrong
- Only give zero if the answer is completely irrelevant or blank
- Your feedback must still rip apart what's wrong — be specific about every flaw and gap`;
    case "moderate":
      return `EVALUATION MODE: MODERATE (Balanced)
- Be direct and fair in both marking and feedback
- Award marks proportional to how much of the answer is correct
- Deduct for wrong information, missing key points, and vague statements
- 50% marks require covering at least the core concept correctly
- Full marks require accurate, complete coverage of all key points
- Point out every flaw, every gap, every weakness. No sugar-coating.`;
    case "strict":
      return `EVALUATION MODE: STRICT (Ruthless)
- Maximum rigor. Every word matters.
- Deduct marks for: inaccuracies, missing key points, vague language, poor terminology, incomplete explanations
- Only award full marks for answers that are precise, comprehensive, and technically flawless
- Half-right is essentially wrong — award minimal partial credit (20-30% at best)
- Zero marks for any answer containing factual errors, even if partially correct elsewhere`;
  }
}

function buildPrompt(
  question: { text: string; marks: number },
  studentAnswer: string,
  strictness: EvaluationStrictness
): string {
  return `You are a strict exam evaluator. Evaluate the student answer and respond ONLY with valid JSON.

${getStrictnessInstructions(strictness)}

CRITICAL RULES:
- If the answer is gibberish, random characters, a single letter/word, or completely irrelevant to the question, award 0 marks.
- The answer must actually address the question to receive ANY marks.
- Evaluate like a real teacher would — no free marks for effort.

QUESTION (${question.marks} marks):
${question.text}

STUDENT ANSWER:
${truncateAnswer(studentAnswer, question.marks) || "[No answer provided]"}

Respond ONLY with this JSON (no markdown, no explanation, just the raw JSON object):
{"marksAwarded":0,"feedback":"your feedback here","isCorrect":false}

Replace the values with your actual evaluation. marksAwarded must be 0 to ${question.marks}. isCorrect must be true or false. feedback must be a string.`;
}

// ── API call (single attempt) ───────────────────────────────────────────────
async function callApi(
  prompt: string,
  apiKey: string,
  model: string,
  maxTokens: number
): Promise<{ marksAwarded: number; feedback: string; isCorrect: boolean }> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "EduXam - Exam Practice Platform",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const err = new Error(`HTTP ${response.status}`) as Error & {
      status: number;
    };
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const raw = (data.choices?.[0]?.message?.content || "").trim();

  if (!raw) throw new Error("Empty response from model");

  // Extract JSON — the model may wrap it in ```json ... ``` or add text
  const jsonMatch = raw.match(/\{[\s\S]*?\}/);
  if (!jsonMatch) throw new Error("No JSON in response");

  let jsonStr = jsonMatch[0];
  if (!jsonStr.trimEnd().endsWith("}")) {
    jsonStr = jsonStr.replace(/,?\s*"[^"]*$/, "") + "}";
  }

  const parsed = JSON.parse(jsonStr);
  return {
    marksAwarded: Number(parsed.marksAwarded) || 0,
    feedback: String(parsed.feedback || "Evaluation completed."),
    isCorrect: Boolean(parsed.isCorrect),
  };
}

// ── Evaluate one text question ──────────────────────────────────────────────
// Fast retries with short fixed delays. Each retry hits a different key+model
// combo via round-robin, so 429 on one key doesn't block the others.
const RETRY_DELAYS = [500, 1000, 1500, 2000];

const FAILED_SENTINEL =
  "AI evaluation unavailable for this question. Please review manually.";

async function evaluateSingleQuestion(
  question: { id: string; text: string; marks: number; type?: string },
  studentAnswer: string,
  strictness: EvaluationStrictness
): Promise<QuestionEvaluation> {
  const prompt = buildPrompt(question, studentAnswer, strictness);
  const maxTokens = Math.min(200 + question.marks * 60, 600);

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    const { apiKey, model } = nextCombo();
    try {
      const result = await callApi(prompt, apiKey, model, maxTokens);
      const marksAwarded = Math.min(
        Math.max(0, result.marksAwarded),
        question.marks
      );
      return {
        questionId: question.id,
        questionText: question.text,
        studentAnswer: studentAnswer || "[No answer provided]",
        maxMarks: question.marks,
        marksAwarded,
        feedback: result.feedback,
        isCorrect: marksAwarded >= question.marks * 0.5,
      };
    } catch {
      if (attempt < RETRY_DELAYS.length) {
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
  }

  // Mark as failed — the caller will retry in additional rounds
  return {
    questionId: question.id,
    questionText: question.text,
    studentAnswer: studentAnswer || "[No answer provided]",
    maxMarks: question.marks,
    marksAwarded: 0,
    feedback: FAILED_SENTINEL,
    isCorrect: false,
  };
}

// ── MCQ evaluation (instant, no API) ────────────────────────────────────────
function evaluateMCQ(
  question: {
    id: string;
    text: string;
    marks: number;
    correctOption?: string;
  },
  selectedOption: string
): QuestionEvaluation {
  const isCorrect =
    !!question.correctOption && question.correctOption === selectedOption;
  return {
    questionId: question.id,
    questionText: question.text,
    studentAnswer: selectedOption || "[No answer selected]",
    maxMarks: question.marks,
    marksAwarded: isCorrect ? question.marks : 0,
    feedback: isCorrect
      ? "Correct answer!"
      : selectedOption
        ? "Incorrect answer."
        : "No answer selected.",
    isCorrect,
  };
}

// ── Code question evaluation (test-case based, no AI) ──────────────────────
async function evaluateCodeQuestion(
  question: {
    id: string;
    text: string;
    marks: number;
    testCases?: TestCase[];
    language?: string;
  },
  studentCode: string,
  strictness: EvaluationStrictness
): Promise<QuestionEvaluation> {
  if (!studentCode.trim()) {
    return {
      questionId: question.id,
      questionText: question.text,
      studentAnswer: "[No code provided]",
      maxMarks: question.marks,
      marksAwarded: 0,
      feedback: "No code was provided.",
      isCorrect: false,
    };
  }

  if (!question.testCases || question.testCases.length === 0) {
    return {
      questionId: question.id,
      questionText: question.text,
      studentAnswer: studentCode,
      maxMarks: question.marks,
      marksAwarded: 0,
      feedback: "No test cases defined for this question.",
      isCorrect: false,
    };
  }

  const results = await runTestCases(
    (question.language as SupportedLanguage) || "python",
    studentCode,
    question.testCases
  );

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const passRatio = totalCount > 0 ? passedCount / totalCount : 0;

  let marksAwarded: number;
  if (strictness === "easy") {
    marksAwarded = Math.round(question.marks * passRatio);
    if (passedCount > 0 && marksAwarded === 0) marksAwarded = 1;
  } else if (strictness === "strict") {
    marksAwarded =
      passRatio === 1
        ? question.marks
        : Math.floor(question.marks * passRatio * 0.7);
  } else {
    marksAwarded = Math.round(question.marks * passRatio);
  }

  marksAwarded = Math.min(marksAwarded, question.marks);

  const failedDetails = results
    .filter((r) => !r.passed)
    .map(
      (r) =>
        `[${r.label}] Expected: "${r.expectedOutput.trim()}", Got: "${r.actualOutput.trim()}"${r.stderr ? ` (Error: ${r.stderr.slice(0, 100)})` : ""}`
    )
    .join(" | ");

  const feedback =
    `Passed ${passedCount}/${totalCount} test cases.` +
    (failedDetails ? ` ${failedDetails}` : "");

  return {
    questionId: question.id,
    questionText: question.text,
    studentAnswer: studentCode,
    maxMarks: question.marks,
    marksAwarded,
    feedback,
    isCorrect: passedCount === totalCount,
  };
}

// ── Main export ─────────────────────────────────────────────────────────────
export async function evaluateExam(
  examSections: ExamSection[],
  answers: Record<string, string>,
  mcqAnswers: Record<string, string>,
  strictness: EvaluationStrictness,
  onProgress?: ProgressCallback
): Promise<EvaluationResult> {
  const evaluationMap = new Map<string, QuestionEvaluation>();
  let totalMaxMarks = 0;
  let completedCount = 0;

  interface TextItem {
    question: { id: string; text: string; marks: number; type?: string };
    studentAnswer: string;
    sectionName: string;
  }
  const textQuestions: TextItem[] = [];

  interface CodeItem {
    question: {
      id: string;
      text: string;
      marks: number;
      type?: string;
      testCases?: TestCase[];
      language?: string;
    };
    studentCode: string;
    sectionName: string;
  }
  const codeQuestions: CodeItem[] = [];

  const totalQuestions = examSections.reduce(
    (acc, s) => acc + s.questions.length,
    0
  );

  // ── Step 1: MCQs instant, empty answers instant, rest queued for API ──
  for (const section of examSections) {
    for (const question of section.questions) {
      totalMaxMarks += question.marks;

      if (question.type === "mcq") {
        const evaluation = evaluateMCQ(
          question as {
            id: string;
            text: string;
            marks: number;
            correctOption?: string;
          },
          mcqAnswers[question.id] || ""
        );
        evaluationMap.set(question.id, evaluation);
        completedCount++;

        // Show progress for each MCQ so the bar fills smoothly
        onProgress?.({
          currentQuestion: completedCount,
          totalQuestions,
          currentSection: section.name,
          status: "evaluating",
          message: `Checking MCQ ${completedCount}...`,
        });
        // Tiny yield so the UI can repaint the progress bar
        if (completedCount % 5 === 0) await sleep(30);
      } else if (question.type === "code") {
        const studentCode = answers[question.id] || "";
        if (!studentCode.trim()) {
          evaluationMap.set(question.id, {
            questionId: question.id,
            questionText: question.text,
            studentAnswer: "[No code provided]",
            maxMarks: question.marks,
            marksAwarded: 0,
            feedback: "No code was provided.",
            isCorrect: false,
          });
          completedCount++;
          onProgress?.({
            currentQuestion: completedCount,
            totalQuestions,
            currentSection: section.name,
            status: "evaluating",
            message: "Skipping unanswered code question...",
          });
        } else {
          codeQuestions.push({
            question: question as CodeItem["question"],
            studentCode,
            sectionName: section.name,
          });
        }
      } else {
        const studentAnswer = stripHtml(answers[question.id] || "");
        if (!studentAnswer) {
          evaluationMap.set(question.id, {
            questionId: question.id,
            questionText: question.text,
            studentAnswer: "[No answer provided]",
            maxMarks: question.marks,
            marksAwarded: 0,
            feedback: "No answer was provided.",
            isCorrect: false,
          });
          completedCount++;
          onProgress?.({
            currentQuestion: completedCount,
            totalQuestions,
            currentSection: section.name,
            status: "evaluating",
            message: "Skipping unanswered question...",
          });
        } else {
          textQuestions.push({
            question,
            studentAnswer,
            sectionName: section.name,
          });
        }
      }
    }
  }

  // ── Step 2: Fire text questions in parallel (one per API key) ──
  const BATCH_SIZE = Math.max(API_KEYS.length, 1);

  for (let i = 0; i < textQuestions.length; i += BATCH_SIZE) {
    const batch = textQuestions.slice(i, i + BATCH_SIZE);

    // Show a message BEFORE the batch starts
    onProgress?.({
      currentQuestion: completedCount,
      totalQuestions,
      currentSection: batch[0].sectionName,
      status: "evaluating",
      message: getProgressMessage(i),
    });

    const batchResults = await Promise.all(
      batch.map(async ({ question, studentAnswer, sectionName }) => {
        const evaluation = await evaluateSingleQuestion(
          question,
          studentAnswer,
          strictness
        );

        // Fire progress when this question FINISHES (not just starts)
        completedCount++;
        onProgress?.({
          currentQuestion: completedCount,
          totalQuestions,
          currentSection: sectionName,
          status: "evaluating",
          message: getProgressMessage(completedCount),
        });

        return { id: question.id, evaluation };
      })
    );

    for (const { id, evaluation } of batchResults) {
      evaluationMap.set(id, evaluation);
    }

    // Pause between batches to avoid rate-limit floods
    if (i + BATCH_SIZE < textQuestions.length) {
      await sleep(2500);
    }
  }

  // ── Step 2b: Retry any failed questions until ALL succeed ──
  // Up to 5 extra rounds. Each round re-fires only the failed ones in parallel,
  // hitting fresh key+model combos via round-robin.
  const MAX_RETRY_ROUNDS = 5;
  for (let round = 0; round < MAX_RETRY_ROUNDS; round++) {
    const failed = textQuestions.filter(
      (tq) => evaluationMap.get(tq.question.id)?.feedback === FAILED_SENTINEL
    );
    if (failed.length === 0) break;

    onProgress?.({
      currentQuestion: completedCount,
      totalQuestions,
      currentSection: failed[0].sectionName,
      status: "evaluating",
      message: `Retrying ${failed.length} question${failed.length > 1 ? "s" : ""}...`,
    });

    await sleep(1500);

    const retryResults = await Promise.all(
      failed.map(async ({ question, studentAnswer }) => {
        const evaluation = await evaluateSingleQuestion(
          question,
          studentAnswer,
          strictness
        );
        return { id: question.id, evaluation };
      })
    );

    for (const { id, evaluation } of retryResults) {
      evaluationMap.set(id, evaluation);
    }
  }

  // ── Step 2c: Evaluate code questions (test-case based, no AI) ──
  for (let i = 0; i < codeQuestions.length; i++) {
    const { question, studentCode, sectionName } = codeQuestions[i];

    onProgress?.({
      currentQuestion: completedCount,
      totalQuestions,
      currentSection: sectionName,
      status: "evaluating",
      message: `Running test cases for code question ${i + 1}...`,
    });

    const evaluation = await evaluateCodeQuestion(
      question,
      studentCode,
      strictness
    );
    evaluationMap.set(question.id, evaluation);
    completedCount++;

    onProgress?.({
      currentQuestion: completedCount,
      totalQuestions,
      currentSection: sectionName,
      status: "evaluating",
      message: `Code question ${i + 1} evaluated.`,
    });
  }

  // ── Step 3: Build result in original question order ──
  const questionEvaluations: QuestionEvaluation[] = [];
  let totalMarksObtained = 0;

  for (const section of examSections) {
    for (const question of section.questions) {
      const evaluation = evaluationMap.get(question.id);
      if (evaluation) {
        questionEvaluations.push(evaluation);
        totalMarksObtained += evaluation.marksAwarded;
      }
    }
  }

  const percentage =
    totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;
  const grade = getGrade(percentage);
  const overallFeedback = generateOverallFeedback(percentage, strictness);

  onProgress?.({
    currentQuestion: totalQuestions,
    totalQuestions,
    currentSection: "Complete",
    status: "completed",
    message: "Evaluation complete!",
  });

  return {
    totalMarksObtained,
    totalMaxMarks,
    percentage,
    grade,
    overallFeedback,
    questionEvaluations,
    evaluationStrictness: strictness,
  };
}

function getGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

function generateOverallFeedback(
  percentage: number,
  strictness: EvaluationStrictness
): string {
  const mode =
    strictness === "easy"
      ? "[Easy — generous marking]"
      : strictness === "strict"
        ? "[Strict — ruthless marking]"
        : "[Moderate — balanced marking]";

  if (percentage >= 90)
    return `You answered most questions correctly. Review the marks you still lost. ${mode}`;
  if (percentage >= 80)
    return `Decent performance with notable gaps. The marks you dropped indicate real weaknesses. ${mode}`;
  if (percentage >= 70)
    return `Mediocre. You have surface-level knowledge but lack depth. ${mode}`;
  if (percentage >= 60)
    return `Barely adequate. Significant gaps across multiple topics. ${mode}`;
  if (percentage >= 50)
    return `Poor. You barely scraped through. Your understanding is superficial. ${mode}`;
  if (percentage >= 40)
    return `Failing level. Your answers show fundamental misunderstanding of the material. ${mode}`;
  return `Extremely poor. You need to restart learning this subject from scratch. ${mode}`;
}
