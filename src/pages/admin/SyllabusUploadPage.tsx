import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  FileText,
  AlertCircle,
  Check,
  Trash2,
  Sparkles,
  Save,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as mammoth from "mammoth/mammoth.browser";
import * as pdfjsLib from "pdfjs-dist";
import { useAuth } from "@/context/AuthContext";
import type { DepartmentRow, SubjectRow } from "@/lib/database.types";
import {
  bulkCreateQuestions,
  getDepartments,
  getTeacherSubjects,
} from "@/services/adminService";
import {
  generateQuestionsFromSyllabus,
  type GeneratedQuestion,
  type GenerationProgress,
} from "@/services/syllabusQBService";
import { exportGeneratedQuestionsToWord } from "@/utils/exportGeneratedQuestions";
import DropdownMenu from "@/shared/ui/dropdown-menu";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

type CountState = {
  mcq: number;
  theory: number;
  analytical: number;
};

const sectionColors: Record<
  "A" | "B" | "C",
  { bg: string; border: string; badge: string; text: string }
> = {
  A: {
    bg: "bg-[#071952]/[0.03]",
    border: "border-[#071952]/20",
    badge: "bg-[#071952]/10 text-[#071952]",
    text: "text-[#071952]",
  },
  B: {
    bg: "bg-[#071952]/[0.03]",
    border: "border-[#071952]/20",
    badge: "bg-[#071952]/10 text-[#071952]",
    text: "text-[#071952]",
  },
  C: {
    bg: "bg-[#071952]/[0.03]",
    border: "border-[#071952]/20",
    badge: "bg-[#071952]/10 text-[#071952]",
    text: "text-[#071952]",
  },
};

function sanitizeCount(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(500, Math.floor(value)));
}

async function extractTextFromPdf(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(pageText);
  }
  return pages.join("\n").trim();
}

async function extractTextFromDocx(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value.trim();
}

export default function SyllabusUploadPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const { user, profile } = useAuth();

  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [subjects, setSubjects] = useState<
    (SubjectRow & { department_name?: string })[]
  >([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [subjectName, setSubjectName] = useState("");

  const [fileName, setFileName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [syllabusText, setSyllabusText] = useState("");
  const [counts, setCounts] = useState<CountState>({
    mcq: 10,
    theory: 5,
    analytical: 5,
  });

  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>(
    []
  );
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const depts = await getDepartments(profile?.university_id);
        setDepartments(depts);
        if (user) {
          const subs = await getTeacherSubjects(user.id);
          setSubjects(subs);
        }
      } catch {
        setError("Failed to load departments and subjects.");
      }
    })();
  }, [profile?.university_id, user]);

  const filteredSubjects = useMemo(
    () =>
      selectedDept
        ? subjects.filter((subject) => subject.department_id === selectedDept)
        : subjects,
    [subjects, selectedDept]
  );

  const sectionCounts = useMemo(
    () => ({
      A: generatedQuestions.filter((q) => q.section === "A").length,
      B: generatedQuestions.filter((q) => q.section === "B").length,
      C: generatedQuestions.filter((q) => q.section === "C").length,
    }),
    [generatedQuestions]
  );

  const totalRequested =
    sanitizeCount(counts.mcq) +
    sanitizeCount(counts.theory) +
    sanitizeCount(counts.analytical);

  async function handleFile(file: File) {
    setError("");
    setSavedCount(null);
    setGeneratedQuestions([]);
    setDuplicateCount(0);
    setProgress(null);
    setExtracting(true);
    setFileName(file.name);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      let text = "";

      if (extension === "pdf") {
        text = await extractTextFromPdf(file);
      } else if (extension === "docx") {
        text = await extractTextFromDocx(file);
      } else if (extension === "doc") {
        throw new Error("Legacy .doc files are not supported. Please upload .docx or .pdf.");
      } else {
        throw new Error("Unsupported file type. Upload PDF or DOCX.");
      }

      if (!text.trim()) {
        throw new Error("Could not extract text from the file.");
      }

      setSyllabusText(text);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process syllabus file.";
      setError(message);
      setSyllabusText("");
      setFileName("");
    } finally {
      setExtracting(false);
    }
  }

  async function handleGenerate() {
    if (!selectedSubject) {
      setError("Please select a subject.");
      return;
    }
    if (!syllabusText.trim()) {
      setError("Please upload a syllabus file first.");
      return;
    }
    if (totalRequested <= 0) {
      setError("Please request at least one question.");
      return;
    }

    setGenerating(true);
    setError("");
    setSavedCount(null);
    setGeneratedQuestions([]);
    setDuplicateCount(0);

    try {
      const result = await generateQuestionsFromSyllabus(
        selectedSubject,
        syllabusText,
        {
          mcq: sanitizeCount(counts.mcq),
          theory: sanitizeCount(counts.theory),
          analytical: sanitizeCount(counts.analytical),
        },
        (nextProgress) => setProgress(nextProgress)
      );

      setGeneratedQuestions(result.questions);
      setDuplicateCount(result.duplicateCount);
      if (result.questions.length === 0) {
        setError("No unique questions were generated. Try changing counts or uploading a richer syllabus.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate questions.";
      setError(message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveToBank() {
    if (!user || !selectedSubject || generatedQuestions.length === 0) return;
    setSaving(true);
    setError("");
    try {
      const payload = generatedQuestions.map((q) => ({
        subject_id: selectedSubject,
        text: q.text,
        marks: q.marks,
        type: q.type,
        options: q.type === "mcq" ? q.options ?? null : null,
        answer: q.type === "mcq" ? q.answer ?? null : null,
        created_by: user.id,
      }));
      await bulkCreateQuestions(payload);
      setSavedCount(payload.length);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save generated questions.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function resetFile() {
    setFileName("");
    setSyllabusText("");
    setGeneratedQuestions([]);
    setDuplicateCount(0);
    setProgress(null);
    setSavedCount(null);
    setError("");
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  const previewText =
    syllabusText.length > 600
      ? `${syllabusText.slice(0, 600)}...`
      : syllabusText;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-[#071952] hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[#071952]">
            Upload Syllabus and Generate Question Bank
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload PDF or Word syllabus, choose question counts per section, and
            generate accurate MCQ, Theory, and Analytical questions.
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
      >
        <h2 className="text-lg font-semibold text-[#071952] mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[#071952] text-white flex items-center justify-center text-xs font-bold">
            1
          </span>
          Select Department and Subject
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#071952] mb-1.5">
              Department
            </label>
            <DropdownMenu
              fullWidth
              value={selectedDept}
              onChange={(value) => {
                setSelectedDept(value);
                setSelectedSubject("");
              }}
              placeholder="All Departments"
              items={[
                { label: "All Departments", value: "" },
                ...departments.map((d) => ({ label: d.name, value: d.id })),
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#071952] mb-1.5">
              Subject *
            </label>
            <DropdownMenu
              fullWidth
              value={selectedSubject}
              onChange={(value) => {
                setSelectedSubject(value);
                const selected = filteredSubjects.find((s) => s.id === value);
                setSubjectName(selected?.name ?? "");
              }}
              placeholder="Choose a subject..."
              items={[
                { label: "Choose a subject...", value: "" },
                ...filteredSubjects.map((s) => ({
                  label:
                    s.name + (s.department_name ? ` (${s.department_name})` : ""),
                  value: s.id,
                })),
              ]}
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
      >
        <h2 className="text-lg font-semibold text-[#071952] mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[#071952] text-white flex items-center justify-center text-xs font-bold">
            2
          </span>
          Upload Syllabus File
        </h2>

        {!fileName ? (
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#071952]/40 hover:bg-[#071952]/[0.02] transition group">
            <Upload className="w-8 h-8 text-gray-400 group-hover:text-[#071952] transition mb-2" />
            <span className="text-sm text-gray-500 group-hover:text-[#071952] transition">
              Click to upload <span className="font-medium">.pdf</span> or{" "}
              <span className="font-medium">.docx</span> file
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.doc"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                void handleFile(file);
              }}
            />
          </label>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
              <FileText className="w-5 h-5 text-[#071952] shrink-0" />
              <span className="text-sm font-medium text-[#071952] flex-1 truncate">
                {fileName}
              </span>
              <button
                onClick={resetFile}
                className="p-1.5 rounded-md hover:bg-[#071952] hover:text-white transition text-gray-500"
                title="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {extracting && (
              <p className="text-sm text-[#071952]">Extracting text from syllabus...</p>
            )}
            {!!syllabusText && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                  Extracted preview
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {previewText}
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
      >
        <h2 className="text-lg font-semibold text-[#071952] mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[#071952] text-white flex items-center justify-center text-xs font-bold">
            3
          </span>
          Configure Section Question Counts
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#071952] mb-1.5">
              MCQ (Section A)
            </label>
            <input
              type="number"
              min={0}
              max={500}
              value={counts.mcq}
              onChange={(e) =>
                setCounts((prev) => ({
                  ...prev,
                  mcq: sanitizeCount(Number(e.target.value)),
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#071952] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#071952] mb-1.5">
              Theory (Section B)
            </label>
            <input
              type="number"
              min={0}
              max={500}
              value={counts.theory}
              onChange={(e) =>
                setCounts((prev) => ({
                  ...prev,
                  theory: sanitizeCount(Number(e.target.value)),
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#071952] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#071952] mb-1.5">
              Analytical (Section C)
            </label>
            <input
              type="number"
              min={0}
              max={500}
              value={counts.analytical}
              onChange={(e) =>
                setCounts((prev) => ({
                  ...prev,
                  analytical: sanitizeCount(Number(e.target.value)),
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#071952] focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            Total requested: <span className="font-semibold text-[#071952]">{totalRequested}</span>
          </p>
          <button
            onClick={() => void handleGenerate()}
            disabled={extracting || generating || !syllabusText || !selectedSubject || totalRequested === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#071952] text-white text-sm font-semibold rounded-lg hover:bg-[#152e6e] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-[#1e3a8a]/25"
          >
            {generating ? (
              <>
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Questions
              </>
            )}
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {progress && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
          >
            <p className="text-sm font-medium text-[#071952]">{progress.message}</p>
            <p className="text-xs text-gray-500 mt-1">
              Phase: {progress.phase} {progress.section !== "all" ? `| Section ${progress.section}` : ""}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {generatedQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
          >
            <h2 className="text-lg font-semibold text-[#071952] mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#071952] text-white flex items-center justify-center text-xs font-bold">
                4
              </span>
              Preview Generated Questions
            </h2>

            <div className="flex flex-wrap gap-2 mb-4">
              {(["A", "B", "C"] as const).map((section) => (
                <div
                  key={section}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${sectionColors[section].badge}`}
                >
                  Section {section}
                  <span className="font-bold">
                    {section === "A"
                      ? sectionCounts.A
                      : section === "B"
                        ? sectionCounts.B
                        : sectionCounts.C}
                  </span>
                </div>
              ))}
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                Duplicates removed <span className="font-bold">{duplicateCount}</span>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {generatedQuestions.map((q, index) => {
                const colors = sectionColors[q.section];
                return (
                  <div
                    key={`${q.section}-${index}`}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${colors.border} ${colors.bg}`}
                  >
                    <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${colors.badge}`}>
                      {q.section}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#071952]">{q.text}</p>
                      {q.type === "mcq" && q.options && (
                        <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-500">
                          {Object.entries(q.options).map(([key, value]) => (
                            <span
                              key={key}
                              className={key === q.answer ? "font-bold text-[#071952]" : ""}
                            >
                              {key}. {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{q.marks}m</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                Generated <span className="font-semibold text-[#071952]">{generatedQuestions.length}</span> unique questions.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    void exportGeneratedQuestionsToWord({
                      questions: generatedQuestions,
                      subjectName: subjectName || "Subject",
                    })
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#071952] bg-[#071952]/10 rounded-lg hover:bg-[#071952]/20 transition"
                >
                  <Download className="w-4 h-4" />
                  Export Word
                </button>
                <button
                  onClick={() => void handleSaveToBank()}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#071952] rounded-lg hover:bg-[#152e6e] disabled:opacity-50 transition"
                >
                  {saving ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save to Question Bank
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {savedCount !== null && (
        <div className="p-4 rounded-lg bg-[#071952]/[0.03] border border-[#071952]/20 flex items-start gap-2">
          <Check className="w-5 h-5 text-[#071952] shrink-0 mt-0.5" />
          <p className="text-sm text-[#071952]">
            Saved {savedCount} generated questions to question bank successfully.
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-[#071952]/[0.03] border border-[#071952]/20 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-[#071952] shrink-0 mt-0.5" />
          <p className="text-sm text-[#071952]">{error}</p>
        </div>
      )}
    </div>
  );
}
