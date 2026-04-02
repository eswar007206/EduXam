import { getSubjectQuestions } from "@/services/adminService";
import type { QuestionRow } from "@/lib/database.types";

type GeneratedQuestionType = "mcq" | "descriptive";
type SectionKey = "A" | "B" | "C";

export interface GeneratedQuestion {
  section: SectionKey;
  type: GeneratedQuestionType;
  marks: number;
  text: string;
  options?: Record<string, string>;
  answer?: string;
}

export interface QuestionCountConfig {
  mcq: number;
  theory: number;
  analytical: number;
}

export interface GenerationProgress {
  phase: "preparing" | "generating" | "deduplicating" | "completed";
  section: SectionKey | "all";
  message: string;
}

export interface GenerationOutput {
  questions: GeneratedQuestion[];
  duplicateCount: number;
}

type ProgressCallback = (progress: GenerationProgress) => void;

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

const FREE_MODELS = [
  "google/gemma-3-27b-it:free",
  "google/gemma-3-12b-it:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "google/gemma-3-4b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "qwen/qwen3-4b:free",
];

const SECTION_DEFS = {
  A: { marks: 1, type: "mcq" as const, label: "MCQ" },
  B: { marks: 4, type: "descriptive" as const, label: "Theory" },
  C: { marks: 6, type: "descriptive" as const, label: "Analytical" },
};

const RETRY_DELAYS = [500, 1200, 2000];
const MAX_SYLLABUS_CHARS = 16000;
const DUPLICATE_THRESHOLD = 0.85;

let comboIdx = 0;

function nextCombo(): { apiKey: string; model: string } {
  if (API_KEYS.length === 0) {
    throw new Error("No OpenRouter API keys found in environment.");
  }
  const apiKey = API_KEYS[comboIdx % API_KEYS.length];
  const model = FREE_MODELS[comboIdx % FREE_MODELS.length];
  comboIdx += 1;
  return { apiKey, model };
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function cleanJson(raw: string): string {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Model response did not include JSON array.");
  return match[0];
}

function chunkSyllabus(content: string, chunkCount: number): string[] {
  const trimmed = content.trim();
  if (!trimmed) return [];
  const maxChars = Math.min(MAX_SYLLABUS_CHARS, Math.max(4000, Math.ceil(trimmed.length / chunkCount)));
  const chunks: string[] = [];
  let start = 0;

  while (start < trimmed.length) {
    let end = Math.min(start + maxChars, trimmed.length);
    if (end < trimmed.length) {
      const boundary = trimmed.lastIndexOf("\n", end);
      if (boundary > start + 500) end = boundary;
    }
    chunks.push(trimmed.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(Boolean);
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTokens(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(" ")
      .filter((word) => word.length > 2)
  );
}

function jaccardSimilarity(a: string, b: string): number {
  const aTokens = toTokens(a);
  const bTokens = toTokens(b);
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) intersection += 1;
  }
  const union = aTokens.size + bTokens.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function isDuplicateQuestion(currentText: string, compareText: string): boolean {
  const normalizedCurrent = normalizeText(currentText);
  const normalizedCompare = normalizeText(compareText);
  if (!normalizedCurrent || !normalizedCompare) return false;
  if (normalizedCurrent === normalizedCompare) return true;
  return jaccardSimilarity(normalizedCurrent, normalizedCompare) >= DUPLICATE_THRESHOLD;
}

function buildPrompt(
  section: SectionKey,
  questionCount: number,
  syllabusChunk: string
): string {
  const sectionDef = SECTION_DEFS[section];
  const baseRules = [
    "Generate high quality exam questions strictly from the syllabus content.",
    "Questions must be clear, grammatically correct, and not repetitive.",
    "Do not produce duplicate or near-duplicate questions.",
    "Avoid trivial wording changes of same question.",
    "Return ONLY valid JSON array. No markdown or explanation.",
  ];

  const typeRules =
    section === "A"
      ? [
          "For each MCQ question provide options A, B, C, D.",
          "Exactly one option must be correct.",
          "The answer field must be one of A/B/C/D.",
        ]
      : section === "B"
        ? [
            "Theory questions should test explanation and conceptual understanding.",
            "Questions must suit 4-mark answers and stay concise.",
          ]
        : [
            "Analytical questions should test reasoning, application, and multi-step thinking.",
            "Questions must suit 6-mark detailed answers.",
          ];

  const exampleShape =
    section === "A"
      ? `[{"text":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"answer":"B"}]`
      : `[{"text":"..."}]`;

  return `You are an expert question paper setter.

SECTION: ${sectionDef.label}
QUESTION_COUNT: ${questionCount}

RULES:
${[...baseRules, ...typeRules].map((rule, idx) => `${idx + 1}. ${rule}`).join("\n")}

SYLLABUS CONTENT:
${syllabusChunk}

OUTPUT FORMAT:
- JSON array only
- Length must be exactly ${questionCount}
- For section ${section}, each question must have unique "text"
- Shape example: ${exampleShape}`;
}

async function callOpenRouter(prompt: string, maxTokens: number) {
  const { apiKey, model } = nextCombo();
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "EduXam - Syllabus QB Generator",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.35,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed with HTTP ${response.status}`);
  }

  const payload = await response.json();
  const content = (payload.choices?.[0]?.message?.content || "").trim();
  if (!content) {
    throw new Error("OpenRouter returned an empty response.");
  }
  return content;
}

async function generateSectionQuestions(
  section: SectionKey,
  count: number,
  syllabusText: string
): Promise<GeneratedQuestion[]> {
  if (count <= 0) return [];
  const chunks = chunkSyllabus(syllabusText, Math.max(1, Math.ceil(count / 10)));
  if (chunks.length === 0) return [];

  const generated: GeneratedQuestion[] = [];
  const sectionDef = SECTION_DEFS[section];
  let remaining = count;

  for (let i = 0; i < chunks.length && remaining > 0; i += 1) {
    const chunk = chunks[i];
    const forThisChunk = Math.max(1, Math.round(remaining / (chunks.length - i)));
    const prompt = buildPrompt(section, forThisChunk, chunk);

    let parsedRows: Array<{ text?: string; options?: Record<string, string>; answer?: string }> = [];
    for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt += 1) {
      try {
        const raw = await callOpenRouter(prompt, Math.min(2200, 500 + forThisChunk * 180));
        parsedRows = JSON.parse(cleanJson(raw)) as Array<{
          text?: string;
          options?: Record<string, string>;
          answer?: string;
        }>;
        break;
      } catch (error) {
        if (attempt === RETRY_DELAYS.length) {
          const message = error instanceof Error ? error.message : "Failed to generate questions";
          throw new Error(`${sectionDef.label}: ${message}`);
        }
        await sleep(RETRY_DELAYS[attempt]);
      }
    }

    for (const row of parsedRows) {
      if (!row.text || !row.text.trim()) continue;
      if (section === "A") {
        const options = row.options ?? {};
        const answer = (row.answer ?? "").toUpperCase();
        if (!options.A || !options.B || !options.C || !options.D) continue;
        if (!["A", "B", "C", "D"].includes(answer)) continue;
        generated.push({
          section,
          type: sectionDef.type,
          marks: sectionDef.marks,
          text: row.text.trim(),
          options,
          answer,
        });
      } else {
        generated.push({
          section,
          type: sectionDef.type,
          marks: sectionDef.marks,
          text: row.text.trim(),
        });
      }
    }

    remaining = count - generated.length;
  }

  return generated.slice(0, count);
}

function deduplicateQuestions(
  generated: GeneratedQuestion[],
  existing: QuestionRow[]
): GenerationOutput {
  const filtered: GeneratedQuestion[] = [];
  let duplicateCount = 0;
  const existingTexts = existing.map((q) => q.text);

  for (const question of generated) {
    const duplicateInBatch = filtered.some((saved) =>
      isDuplicateQuestion(question.text, saved.text)
    );
    if (duplicateInBatch) {
      duplicateCount += 1;
      continue;
    }

    const duplicateInDb = existingTexts.some((oldText) =>
      isDuplicateQuestion(question.text, oldText)
    );
    if (duplicateInDb) {
      duplicateCount += 1;
      continue;
    }

    filtered.push(question);
  }

  return { questions: filtered, duplicateCount };
}

export async function generateQuestionsFromSyllabus(
  subjectId: string,
  syllabusText: string,
  counts: QuestionCountConfig,
  onProgress?: ProgressCallback
): Promise<GenerationOutput> {
  if (!syllabusText.trim()) {
    throw new Error("Syllabus content is empty.");
  }

  onProgress?.({
    phase: "preparing",
    section: "all",
    message: "Loading existing question bank for deduplication...",
  });
  const existingQuestions = await getSubjectQuestions(subjectId);

  onProgress?.({
    phase: "generating",
    section: "A",
    message: "Generating MCQ questions...",
  });
  const mcq = await generateSectionQuestions("A", counts.mcq, syllabusText);

  onProgress?.({
    phase: "generating",
    section: "B",
    message: "Generating Theory questions...",
  });
  const theory = await generateSectionQuestions("B", counts.theory, syllabusText);

  onProgress?.({
    phase: "generating",
    section: "C",
    message: "Generating Analytical questions...",
  });
  const analytical = await generateSectionQuestions("C", counts.analytical, syllabusText);

  onProgress?.({
    phase: "deduplicating",
    section: "all",
    message: "Removing duplicate questions...",
  });
  const deduped = deduplicateQuestions([...mcq, ...theory, ...analytical], existingQuestions);

  onProgress?.({
    phase: "completed",
    section: "all",
    message: `Generated ${deduped.questions.length} unique questions.`,
  });

  return deduped;
}
