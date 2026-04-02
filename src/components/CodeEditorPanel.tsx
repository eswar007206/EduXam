import { useState, useCallback, lazy, Suspense } from "react";
import { Play, FlaskConical, Loader2, CheckCircle2, XCircle, Terminal, TestTubes } from "lucide-react";
import { executeCode, runTestCases } from "@/services/codeExecutionService";
import type { SupportedLanguage, TestCaseResult } from "@/services/codeExecutionService";
import type { TestCase } from "@/features/exam/types";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

interface CodeEditorPanelProps {
  language: SupportedLanguage;
  starterCode?: string;
  testCases?: TestCase[];
  value: string;
  onChange: (code: string) => void;
  readOnly?: boolean;
}

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  python: "Python",
  c: "C",
  cpp: "C++",
  java: "Java",
};

const MONACO_LANGUAGE_MAP: Record<SupportedLanguage, string> = {
  python: "python",
  c: "c",
  cpp: "cpp",
  java: "java",
};

type Tab = "output" | "tests";

export default function CodeEditorPanel({
  language,
  testCases,
  value,
  onChange,
  readOnly = false,
}: CodeEditorPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("output");
  const [output, setOutput] = useState("");
  const [stderr, setStderr] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [testProgress, setTestProgress] = useState({ completed: 0, total: 0 });
  const [compilationError, setCompilationError] = useState("");

  const handleRunCode = useCallback(async () => {
    setIsRunning(true);
    setOutput("");
    setStderr("");
    setCompilationError("");
    setActiveTab("output");

    try {
      const result = await executeCode(language, value);
      setOutput(result.stdout);
      setStderr(result.stderr);
      if (result.compilationError) {
        setCompilationError(result.compilationError);
      }
    } catch (error) {
      setStderr(String(error));
    } finally {
      setIsRunning(false);
    }
  }, [language, value]);

  const handleRunTests = useCallback(async () => {
    if (!testCases || testCases.length === 0) return;

    setIsRunningTests(true);
    setTestResults([]);
    setTestProgress({ completed: 0, total: testCases.length });
    setActiveTab("tests");

    try {
      const results = await runTestCases(language, value, testCases, (completed, total) => {
        setTestProgress({ completed, total });
      });
      setTestResults(results);
    } catch (error) {
      setStderr(String(error));
    } finally {
      setIsRunningTests(false);
    }
  }, [language, value, testCases]);

  const passedCount = testResults.filter((r) => r.passed).length;
  const totalTests = testResults.length;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "output", label: "Output", icon: <Terminal size={14} /> },
    ...(testCases && testCases.length > 0
      ? [{ key: "tests" as Tab, label: "Test Cases", icon: <TestTubes size={14} /> }]
      : []),
  ];

  return (
    <div className="space-y-3">
      {/* Language badge + action buttons */}
      <div className="flex items-center justify-between">
        <span className="px-2.5 py-1 rounded-md bg-black/10 text-black text-xs font-semibold uppercase tracking-wide">
          {LANGUAGE_LABELS[language]}
        </span>
        <div className="flex items-center gap-2">
          {testCases && testCases.length > 0 && (
            <button
              onClick={handleRunTests}
              disabled={isRunningTests || isRunning || !value.trim() || readOnly}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#071952] text-white text-sm font-medium hover:bg-[#071952]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRunningTests ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FlaskConical size={14} />
              )}
              {isRunningTests
                ? `Running ${testProgress.completed}/${testProgress.total}`
                : "Run Tests"}
            </button>
          )}
          <button
            onClick={handleRunCode}
            disabled={isRunning || isRunningTests || !value.trim() || readOnly}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#071952] text-white text-sm font-medium hover:bg-[#071952]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            Run Code
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Suspense
          fallback={
            <div className="h-[350px] flex items-center justify-center bg-zinc-900 text-zinc-400">
              <Loader2 className="animate-spin mr-2" size={18} />
              Loading editor...
            </div>
          }
        >
          <MonacoEditor
            height="350px"
            language={MONACO_LANGUAGE_MAP[language]}
            value={value}
            onChange={(val) => onChange(val || "")}
            theme="vs-dark"
            options={{
              readOnly,
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              wordWrap: "on",
              padding: { top: 12, bottom: 12 },
            }}
          />
        </Suspense>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-accent text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-white hover:bg-[#071952]"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.key === "tests" && totalTests > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded text-xs font-bold ${
                    passedCount === totalTests
                      ? "bg-gray-100 dark:bg-black/10 text-black dark:text-black"
                      : "bg-gray-100 dark:bg-black/10 text-black dark:text-black"
                  }`}
                >
                  {passedCount}/{totalTests}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-3">
          {/* Output tab */}
          {activeTab === "output" && (
            <div className="rounded-lg bg-zinc-900 p-3 min-h-[120px] max-h-[200px] overflow-auto">
              {compilationError && (
                <pre className="text-red-400 text-sm font-mono whitespace-pre-wrap mb-2">
                  <span className="text-red-400 font-bold">Compilation Error:</span>
                  {"\n"}
                  {compilationError}
                </pre>
              )}
              {stderr && !compilationError && (
                <pre className="text-yellow-400 text-sm font-mono whitespace-pre-wrap mb-2">
                  {stderr}
                </pre>
              )}
              {output ? (
                <pre className="text-white text-sm font-mono whitespace-pre-wrap">
                  {output}
                </pre>
              ) : (
                !stderr &&
                !compilationError &&
                !isRunning && (
                  <p className="text-zinc-500 text-sm italic">
                    Run your code to see output here.
                  </p>
                )
              )}
              {isRunning && (
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Loader2 size={14} className="animate-spin" />
                  Executing...
                </div>
              )}
            </div>
          )}

          {/* Test Cases tab */}
          {activeTab === "tests" && testCases && (
            <div className="space-y-2 max-h-[200px] overflow-auto">
              {testCases.map((tc, idx) => {
                const result = testResults.find((r) => r.testCaseId === tc.id);

                return (
                  <div
                    key={tc.id}
                    className={`rounded-lg border p-3 ${
                      result
                        ? result.passed
                          ? "border-black/20 dark:border-black/20 bg-gray-50 dark:bg-black/5"
                          : "border-black/20 dark:border-black/20 bg-gray-50 dark:bg-black/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {tc.is_hidden ? `Hidden Test Case ${idx + 1}` : tc.label}
                      </span>
                      {result && (
                        <span className="flex items-center gap-1 text-xs font-semibold">
                          {result.passed ? (
                            <>
                              <CheckCircle2 size={14} className="text-black dark:text-black" />
                              <span className="text-black dark:text-black">Passed</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={14} className="text-black dark:text-black" />
                              <span className="text-black dark:text-black">Failed</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>

                    {!tc.is_hidden && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Input</p>
                          <pre className="text-xs font-mono bg-zinc-100 rounded p-1.5 whitespace-pre-wrap">
                            {tc.input || "(empty)"}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Expected Output</p>
                          <pre className="text-xs font-mono bg-zinc-100 rounded p-1.5 whitespace-pre-wrap">
                            {tc.expected_output}
                          </pre>
                        </div>
                        {result && !result.passed && (
                          <div className="col-span-2">
                            <p className="text-xs text-muted-foreground mb-0.5">Your Output</p>
                            <pre className="text-xs font-mono bg-gray-50 dark:bg-black/10 text-black dark:text-black rounded p-1.5 whitespace-pre-wrap">
                              {result.actualOutput || "(no output)"}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {isRunningTests && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm p-2">
                  <Loader2 size={14} className="animate-spin" />
                  Running test {testProgress.completed + 1} of {testProgress.total}...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
