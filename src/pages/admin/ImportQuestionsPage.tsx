import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileSpreadsheet, ArrowLeft, Check, AlertCircle, Download, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useAuth } from "@/context/AuthContext";
import { getDepartments, getTeacherSubjects, bulkCreateQuestions } from "@/services/adminService";
import type { DepartmentRow, SubjectRow } from "@/lib/database.types";

// ─── Section config ───
interface SectionConfig {
  key: string;
  label: string;
  type: "mcq" | "descriptive";
  marks: number;
  color: string;
}

const SECTIONS: SectionConfig[] = [
  { key: "A", label: "Section A — MCQ (1 mark)", type: "mcq", marks: 1, color: "blue" },
  { key: "B", label: "Section B — Short Answer (3 marks)", type: "descriptive", marks: 3, color: "emerald" },
  { key: "C", label: "Section C — Medium Answer (4 marks)", type: "descriptive", marks: 4, color: "amber" },
  { key: "D", label: "Section D — Long Answer (5 marks)", type: "descriptive", marks: 5, color: "purple" },
];

// ─── Parsed question shape ───
interface ParsedQuestion {
  section: string;
  text: string;
  type: "mcq" | "descriptive";
  marks: number;
  options?: Record<string, string>;
  answer?: string;
  error?: string;
}

// ─── Excel sheet parsing ───
function parseSheet(sheet: XLSX.WorkSheet, section: SectionConfig): ParsedQuestion[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const questions: ParsedQuestion[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Normalize header keys to lowercase trimmed
    const get = (keys: string[]) => {
      for (const k of Object.keys(row)) {
        if (keys.some((kk) => k.trim().toLowerCase() === kk.toLowerCase())) {
          return String(row[k] ?? "").trim();
        }
      }
      return "";
    };

    const text = get(["question", "question text", "text", "q"]);
    if (!text) continue; // skip empty rows

    if (section.type === "mcq") {
      const optA = get(["option a", "a", "opt a", "option_a"]);
      const optB = get(["option b", "b", "opt b", "option_b"]);
      const optC = get(["option c", "c", "opt c", "option_c"]);
      const optD = get(["option d", "d", "opt d", "option_d"]);
      const answer = get(["answer", "correct answer", "correct", "ans"]).toUpperCase();

      const q: ParsedQuestion = {
        section: section.key,
        text,
        type: "mcq",
        marks: section.marks,
        options: { A: optA, B: optB, C: optC, D: optD },
        answer,
      };

      if (!optA || !optB || !optC || !optD) q.error = "Missing one or more options";
      else if (!["A", "B", "C", "D"].includes(answer)) q.error = `Invalid answer "${answer}" — must be A, B, C, or D`;

      questions.push(q);
    } else {
      questions.push({
        section: section.key,
        text,
        type: "descriptive",
        marks: section.marks,
      });
    }
  }
  return questions;
}

// ─── Download template ───
function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  // Section A — MCQ
  const mcqData = [
    { Question: "What is 2+2?", "Option A": "3", "Option B": "4", "Option C": "5", "Option D": "6", Answer: "B" },
    { Question: "", "Option A": "", "Option B": "", "Option C": "", "Option D": "", Answer: "" },
  ];
  const wsA = XLSX.utils.json_to_sheet(mcqData);
  XLSX.utils.book_append_sheet(wb, wsA, "Section A - MCQ");

  // Section B — Short
  const shortData = [{ Question: "Define photosynthesis in one sentence." }, { Question: "" }];
  const wsB = XLSX.utils.json_to_sheet(shortData);
  XLSX.utils.book_append_sheet(wb, wsB, "Section B - Short");

  // Section C — Medium
  const medData = [{ Question: "Explain the water cycle with a diagram description." }, { Question: "" }];
  const wsC = XLSX.utils.json_to_sheet(medData);
  XLSX.utils.book_append_sheet(wb, wsC, "Section C - Medium");

  // Section D — Long
  const longData = [{ Question: "Discuss the causes and effects of global warming in detail." }, { Question: "" }];
  const wsD = XLSX.utils.json_to_sheet(longData);
  XLSX.utils.book_append_sheet(wb, wsD, "Section D - Long");

  XLSX.writeFile(wb, "EduXam_Questions_Template.xlsx");
}

// ─── Color helpers ───
const sectionColors: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  A: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", text: "text-blue-700" },
  B: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700", text: "text-emerald-700" },
  C: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700", text: "text-amber-700" },
  D: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700", text: "text-blue-700" },
};

// ─────────────────── Component ───────────────────
export default function ImportQuestionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [subjects, setSubjects] = useState<(SubjectRow & { department_name?: string })[]>([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  // Import state
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);
  const [error, setError] = useState("");

  // Load departments + subjects
  useEffect(() => {
    (async () => {
      try {
        const depts = await getDepartments();
        setDepartments(depts);
        if (user) {
          const subs = await getTeacherSubjects(user.id);
          setSubjects(subs);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [user]);

  const filteredSubjects = selectedDept
    ? subjects.filter((s) => s.department_id === selectedDept)
    : subjects;

  // ─── File handler ───
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setResult(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });

        const allQuestions: ParsedQuestion[] = [];
        // Try to find sheets by name or by index order
        for (let i = 0; i < SECTIONS.length; i++) {
          const sec = SECTIONS[i];
          // Match by sheet name containing section key or index
          const sheetName = wb.SheetNames.find(
            (n) =>
              n.toLowerCase().includes(`section ${sec.key.toLowerCase()}`) ||
              n.toLowerCase().startsWith(`section ${sec.key.toLowerCase()}`) ||
              n.toLowerCase() === sec.key.toLowerCase()
          ) ?? wb.SheetNames[i];

          if (sheetName && wb.Sheets[sheetName]) {
            const parsed = parseSheet(wb.Sheets[sheetName], sec);
            allQuestions.push(...parsed);
          }
        }

        if (allQuestions.length === 0) {
          setError("No questions found. Make sure your Excel file has sheets named Section A, Section B, Section C, Section D.");
        }
        setParsedQuestions(allQuestions);
      } catch {
        setError("Failed to parse the Excel file. Please check the format.");
        setParsedQuestions([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const validQuestions = parsedQuestions.filter((q) => !q.error);
  const errorQuestions = parsedQuestions.filter((q) => q.error);

  // ─── Import handler ───
  const handleImport = async () => {
    if (!selectedSubject || !user) return;
    setImporting(true);
    setError("");
    try {
      const rows = validQuestions.map((q) => ({
        subject_id: selectedSubject,
        text: q.text,
        marks: q.marks,
        type: q.type,
        options: q.type === "mcq" ? (q.options ?? null) : null,
        answer: q.type === "mcq" ? (q.answer ?? null) : null,
        created_by: user.id,
      }));

      await bulkCreateQuestions(rows);
      setResult({ success: rows.length, failed: errorQuestions.length });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      setError(msg);
    } finally {
      setImporting(false);
    }
  };

  const resetFile = () => {
    setParsedQuestions([]);
    setFileName("");
    setResult(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  // ─── Counts per section ───
  const sectionCounts = SECTIONS.map((s) => ({
    ...s,
    count: parsedQuestions.filter((q) => q.section === s.key).length,
    errors: parsedQuestions.filter((q) => q.section === s.key && q.error).length,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Questions from Excel</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload an Excel file with sections A, B, C, D to bulk-import questions
          </p>
        </div>
      </div>

      {/* Step 1: Select Department & Subject */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center text-xs font-bold">1</span>
          Select Department & Subject
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setSelectedSubject("");
              }}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject *</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition"
            >
              <option value="">Choose a subject…</option>
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.department_name ? `(${s.department_name})` : ""}
                </option>
              ))}
            </select>
            {filteredSubjects.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">No subjects found. Create one first.</p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Step 2: Upload File */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center text-xs font-bold">2</span>
          Upload Excel File
        </h2>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1e3a8a] bg-[#1e3a8a]/5 rounded-lg hover:bg-[#1e3a8a]/10 transition"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
          <span className="text-xs text-gray-400">Use this template to see the expected format</span>
        </div>

        {!fileName ? (
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-[#1e3a8a]/40 hover:bg-gray-50 transition group">
            <Upload className="w-8 h-8 text-gray-400 group-hover:text-[#1e3a8a] transition mb-2" />
            <span className="text-sm text-gray-500 group-hover:text-gray-700 transition">
              Click to upload <span className="font-medium">.xlsx</span> or <span className="font-medium">.xls</span> file
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              className="hidden"
            />
          </label>
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
            <FileSpreadsheet className="w-5 h-5 text-green-600 shrink-0" />
            <span className="text-sm font-medium text-gray-700 flex-1 truncate">{fileName}</span>
            <button
              onClick={resetFile}
              className="p-1.5 rounded-md hover:bg-gray-200 transition text-gray-500"
              title="Remove file"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>

      {/* Step 3: Preview */}
      <AnimatePresence>
        {parsedQuestions.length > 0 && !result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-[#1e3a8a] text-white flex items-center justify-center text-xs font-bold">3</span>
              Preview — {parsedQuestions.length} questions found
            </h2>

            {/* Section summary chips */}
            <div className="flex flex-wrap gap-2 mb-5">
              {sectionCounts.map((s) => (
                <div key={s.key} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${sectionColors[s.key].badge}`}>
                  {s.label.split("—")[0].trim()}
                  <span className="font-bold">{s.count}</span>
                  {s.errors > 0 && (
                    <span className="text-red-600 font-bold">({s.errors} errors)</span>
                  )}
                </div>
              ))}
            </div>

            {/* Error summary */}
            {errorQuestions.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div className="text-sm text-red-700">
                  <span className="font-semibold">{errorQuestions.length} question(s)</span> have errors and will be skipped.
                  {errorQuestions.slice(0, 3).map((eq, i) => (
                    <div key={i} className="mt-1 text-xs text-red-600">• {eq.text.slice(0, 60)}… — {eq.error}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Questions list */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {parsedQuestions.map((q, i) => {
                const colors = sectionColors[q.section];
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${q.error ? "border-red-200 bg-red-50/50" : `${colors.border} ${colors.bg}`}`}
                  >
                    <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${q.error ? "bg-red-100 text-red-600" : colors.badge}`}>
                      {q.section}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 line-clamp-2">{q.text}</p>
                      {q.type === "mcq" && q.options && (
                        <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-500">
                          {Object.entries(q.options).map(([k, v]) => (
                            <span key={k} className={k === q.answer ? "font-bold text-green-700" : ""}>
                              {k}. {v}
                            </span>
                          ))}
                        </div>
                      )}
                      {q.error && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <X className="w-3 h-3" /> {q.error}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{q.marks}m</span>
                  </div>
                );
              })}
            </div>

            {/* Import button */}
            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {validQuestions.length} question(s) will be imported
              </p>
              <button
                onClick={handleImport}
                disabled={importing || !selectedSubject || validQuestions.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1e3a8a] text-white text-sm font-semibold rounded-lg hover:bg-[#152e6e] disabled:opacity-50 disabled:cursor-not-allowed transition shadow-md shadow-[#1e3a8a]/25"
              >
                {importing ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import {validQuestions.length} Questions
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      {error && !result && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl border border-green-200 shadow-sm p-6 text-center"
          >
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Import Complete!</h3>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-semibold text-green-700">{result.success}</span> questions imported successfully.
              {result.failed > 0 && (
                <> <span className="font-semibold text-red-600">{result.failed}</span> skipped due to errors.</>
              )}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  resetFile();
                  setResult(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Import More
              </button>
              <button
                onClick={() => navigate(`/admin/subjects/${selectedSubject}`)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#1e3a8a] rounded-lg hover:bg-[#152e6e] transition shadow"
              >
                View Subject
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help section */}
      {parsedQuestions.length === 0 && !result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-linear-to-br from-gray-50 to-white rounded-xl border border-gray-200 p-6"
        >
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Excel Format Guide</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SECTIONS.map((s) => {
              const colors = sectionColors[s.key];
              return (
                <div key={s.key} className={`p-3 rounded-lg border ${colors.border} ${colors.bg}`}>
                  <p className={`text-sm font-semibold ${colors.text}`}>{s.label}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Sheet: <code className="bg-white/70 px-1 rounded">Section {s.key} - {s.key === "A" ? "MCQ" : s.key === "B" ? "Short" : s.key === "C" ? "Medium" : "Long"}</code>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {s.type === "mcq"
                      ? "Columns: Question, Option A, Option B, Option C, Option D, Answer"
                      : "Columns: Question"}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
