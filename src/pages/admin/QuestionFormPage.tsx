import { useState, useEffect, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { createQuestion, updateQuestion, getQuestionById, QUESTION_CATEGORIES } from "@/services/adminService";
import type { TestCase } from "@/features/exam/types";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

const SUPPORTED_LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
];

export default function QuestionFormPage() {
  const { id: subjectId, qid: questionId } = useParams<{ id: string; qid: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isEdit = !!questionId;

  const categoryKey = searchParams.get("category") ?? "mcq";
  const initialCategory = QUESTION_CATEGORIES.find((c) => c.key === categoryKey) ?? QUESTION_CATEGORIES[0];

  const [text, setText] = useState("");
  const [selectedCategoryKey, setSelectedCategoryKey] = useState(initialCategory.key);
  const [options, setOptions] = useState({ a: "", b: "", c: "", d: "" });
  const [correctAnswer, setCorrectAnswer] = useState("a");
  const [loading, setLoading] = useState(false);
  const [fetchingQuestion, setFetchingQuestion] = useState(isEdit);

  // Code question state
  const [language, setLanguage] = useState("python");
  const [starterCode, setStarterCode] = useState("");
  const [testCases, setTestCases] = useState<TestCase[]>([
    { id: crypto.randomUUID(), input: "", expected_output: "", is_hidden: false, label: "Test Case 1" },
  ]);

  const selectedCategory = QUESTION_CATEGORIES.find((c) => c.key === selectedCategoryKey) ?? QUESTION_CATEGORIES[0];

  useEffect(() => {
    if (isEdit && questionId) {
      getQuestionById(questionId)
        .then((q) => {
          if (q) {
            setText(q.text);
            const matchedCat = QUESTION_CATEGORIES.find((c) => c.type === q.type && c.marks === q.marks);
            if (matchedCat) setSelectedCategoryKey(matchedCat.key);
            if (q.type === "mcq" && q.options) {
              setOptions({
                a: q.options.a || "",
                b: q.options.b || "",
                c: q.options.c || "",
                d: q.options.d || "",
              });
              setCorrectAnswer(q.answer || "a");
            }
            if (q.type === "code") {
              setLanguage(q.language || "python");
              setStarterCode(q.starter_code || "");
              if (q.test_cases && Array.isArray(q.test_cases) && q.test_cases.length > 0) {
                setTestCases(q.test_cases as unknown as TestCase[]);
              }
            }
          }
        })
        .catch(console.error)
        .finally(() => setFetchingQuestion(false));
    }
  }, [isEdit, questionId]);

  const addTestCase = () => {
    setTestCases((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        input: "",
        expected_output: "",
        is_hidden: false,
        label: `Test Case ${prev.length + 1}`,
      },
    ]);
  };

  const removeTestCase = (id: string) => {
    setTestCases((prev) => prev.filter((tc) => tc.id !== id));
  };

  const updateTestCase = (id: string, field: keyof TestCase, value: string | boolean) => {
    setTestCases((prev) =>
      prev.map((tc) => (tc.id === id ? { ...tc, [field]: value } : tc))
    );
  };

  const handleSave = async () => {
    if (!subjectId || !profile || !text.trim()) return;
    setLoading(true);

    try {
      const data: Record<string, unknown> = {
        text: text.trim(),
        marks: selectedCategory.marks,
        type: selectedCategory.type,
        options: selectedCategory.type === "mcq" ? options : null,
        answer: selectedCategory.type === "mcq" ? correctAnswer : null,
        language: selectedCategory.type === "code" ? language : null,
        starter_code: selectedCategory.type === "code" ? starterCode : null,
        test_cases: selectedCategory.type === "code" ? testCases : null,
      };

      if (isEdit && questionId) {
        await updateQuestion(questionId, data);
      } else {
        await createQuestion({
          ...data,
          subject_id: subjectId,
          created_by: profile.id,
        } as Parameters<typeof createQuestion>[0]);
      }

      navigate(`/admin/subjects/${subjectId}`);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingQuestion) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#1e3a8a]" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(`/admin/subjects/${subjectId}`)}
          className="text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-foreground"
        >
          {isEdit ? "Edit Question" : "Add Question"}
        </motion.h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        {/* Section / Category Selector */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Section</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {QUESTION_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategoryKey(cat.key)}
                className={`px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition text-center ${
                  selectedCategoryKey === cat.key
                    ? "border-[#1e3a8a] bg-[#1e3a8a]/10 text-[#1e3a8a]"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                }`}
              >
                <span className="block">{cat.label}</span>
                <span className="text-xs opacity-70">{cat.marks} mark{cat.marks > 1 ? "s" : ""}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            {selectedCategory.type === "code" ? "Problem Statement" : "Question Text"}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] resize-none"
            placeholder={selectedCategory.type === "code" ? "Describe the programming problem..." : "Enter the question..."}
          />
        </div>

        {/* MCQ Options (only for MCQ category) */}
        {selectedCategory.type === "mcq" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">Options</label>
            {(["a", "b", "c", "d"] as const).map((key) => (
              <div key={key} className="flex items-center gap-3">
                <input
                  type="radio"
                  name="correct"
                  checked={correctAnswer === key}
                  onChange={() => setCorrectAnswer(key)}
                  className="accent-[#1e3a8a]"
                />
                <span className="text-sm font-medium text-foreground w-6 uppercase">{key}.</span>
                <input
                  type="text"
                  value={options[key]}
                  onChange={(e) => setOptions((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  placeholder={`Option ${key.toUpperCase()}`}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer.</p>
          </div>
        )}

        {/* Code Question Fields */}
        {selectedCategory.type === "code" && (
          <div className="space-y-5">
            {/* Language Selector */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Starter Code */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Starter Code <span className="text-xs text-muted-foreground">(optional template for students)</span>
              </label>
              <div className="rounded-xl border border-border overflow-hidden">
                <Suspense
                  fallback={
                    <div className="h-[200px] flex items-center justify-center bg-zinc-900 text-zinc-400">
                      <Loader2 className="animate-spin mr-2" size={16} />
                      Loading editor...
                    </div>
                  }
                >
                  <MonacoEditor
                    height="200px"
                    language={language === "cpp" ? "cpp" : language}
                    value={starterCode}
                    onChange={(val) => setStarterCode(val || "")}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 4,
                      wordWrap: "on",
                      padding: { top: 8, bottom: 8 },
                    }}
                  />
                </Suspense>
              </div>
            </div>

            {/* Test Cases */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">Test Cases</label>
                <button
                  type="button"
                  onClick={addTestCase}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                >
                  <Plus size={14} />
                  Add Test Case
                </button>
              </div>
              <div className="space-y-3">
                {testCases.map((tc, idx) => (
                  <div
                    key={tc.id}
                    className="rounded-xl border border-border p-4 space-y-3 bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={tc.label}
                          onChange={(e) => updateTestCase(tc.id, "label", e.target.value)}
                          className="text-sm font-medium bg-transparent border-b border-transparent hover:border-border focus:border-[#1e3a8a] focus:outline-none text-foreground"
                          placeholder={`Test Case ${idx + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => updateTestCase(tc.id, "is_hidden", !tc.is_hidden)}
                          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-md transition ${
                            tc.is_hidden
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                              : "bg-zinc-100 dark:bg-zinc-800 text-muted-foreground"
                          }`}
                          title={tc.is_hidden ? "Hidden from students" : "Visible to students"}
                        >
                          {tc.is_hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                          {tc.is_hidden ? "Hidden" : "Visible"}
                        </button>
                      </div>
                      {testCases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTestCase(tc.id)}
                          className="text-red-500 hover:text-red-700 transition p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Input (stdin)</label>
                        <textarea
                          value={tc.input}
                          onChange={(e) => updateTestCase(tc.id, "input", e.target.value)}
                          rows={2}
                          className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] resize-none"
                          placeholder="e.g. 5 3"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Expected Output</label>
                        <textarea
                          value={tc.expected_output}
                          onChange={(e) => updateTestCase(tc.id, "expected_output", e.target.value)}
                          rows={2}
                          className="w-full px-2.5 py-1.5 bg-background border border-border rounded-lg text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1e3a8a] resize-none"
                          placeholder="e.g. 8"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Hidden test cases are used for grading but students cannot see the input/output.
              </p>
            </div>
          </div>
        )}

        {/* Info badge */}
        <div className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${selectedCategory.bgColor} ${selectedCategory.color}`}>
          Type: {selectedCategory.type === "mcq" ? "MCQ" : selectedCategory.type === "code" ? "Code" : "Descriptive"} &middot; {selectedCategory.marks} mark{selectedCategory.marks > 1 ? "s" : ""}
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={() => navigate(`/admin/subjects/${subjectId}`)}
            className="px-6 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !text.trim()}
            className="px-6 py-2 bg-[#1e3a8a] text-white rounded-lg hover:bg-[#1e3a8a]/90 transition text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? "Update" : "Save"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
