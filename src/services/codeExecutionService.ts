import type { TestCase } from "@/features/exam/types";

export type SupportedLanguage = "python" | "c" | "cpp" | "java";

export interface CodeExecutionResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  signal: string | null;
  compilationOutput: string;
  compilationError: string;
}

export interface TestCaseResult {
  testCaseId: string;
  label: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  stderr: string;
  exitCode: number;
}

// ── Pyodide (browser-side Python) ─────────────────────────────────────
// Loaded once and cached for the lifetime of the tab.
interface PyodideInterface {
  runPythonAsync(code: string): Promise<unknown>;
  setStdin(options: { stdin(): string }): void;
  setStdout(options: { batched(text: string): void }): void;
  setStderr(options: { batched(text: string): void }): void;
}

declare global {
  interface Window {
    loadPyodide?: (config?: Record<string, unknown>) => Promise<PyodideInterface>;
  }
}

let pyodideInstance: PyodideInterface | null = null;
let pyodideLoading: Promise<PyodideInterface> | null = null;

async function loadPyodideRuntime(): Promise<PyodideInterface> {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoading) return pyodideLoading;

  pyodideLoading = (async () => {
    // Load the Pyodide script from CDN if not already present
    if (!window.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Pyodide runtime"));
        document.head.appendChild(script);
      });
    }

    if (!window.loadPyodide) {
      throw new Error("Pyodide failed to initialize");
    }

    const py = await window.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/",
    });

    pyodideInstance = py;
    return py;
  })();

  return pyodideLoading;
}

async function executePython(
  code: string,
  stdin: string
): Promise<CodeExecutionResponse> {
  const py = await loadPyodideRuntime();

  let stdoutContent = "";
  let stderrContent = "";

  // Set up stdin - split by newlines so each input() call gets one line
  const stdinLines = stdin.split("\n");
  let stdinIndex = 0;
  py.setStdin({
    stdin() {
      if (stdinIndex < stdinLines.length) {
        return stdinLines[stdinIndex++];
      }
      return "";
    },
  });

  py.setStdout({
    batched(text: string) {
      stdoutContent += text + "\n";
    },
  });

  py.setStderr({
    batched(text: string) {
      stderrContent += text + "\n";
    },
  });

  try {
    await py.runPythonAsync(code);
    return {
      stdout: stdoutContent,
      stderr: stderrContent,
      exitCode: 0,
      signal: null,
      compilationOutput: "",
      compilationError: "",
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      stdout: stdoutContent,
      stderr: stderrContent || errMsg,
      exitCode: 1,
      signal: null,
      compilationOutput: "",
      compilationError: "",
    };
  }
}

// ── Judge0 CE (C, C++, Java) — free, no API key ──────────────────────
const JUDGE0_URL = "https://ce.judge0.com";

const JUDGE0_LANGUAGE_IDS: Record<Exclude<SupportedLanguage, "python">, number> = {
  c: 50,       // C (GCC 9.2.0)
  cpp: 54,     // C++ (GCC 9.2.0)
  java: 62,    // Java (OpenJDK 13.0.1)
};

async function executeWithJudge0(
  language: Exclude<SupportedLanguage, "python">,
  code: string,
  stdin: string
): Promise<CodeExecutionResponse | null> {
  const languageId = JUDGE0_LANGUAGE_IDS[language];
  try {
    const response = await fetch(
      `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: code,
          language_id: languageId,
          stdin,
          cpu_time_limit: 10,
          wall_time_limit: 15,
        }),
        signal: AbortSignal.timeout(20000),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();

    // Status IDs: 3=Accepted, 5=TLE, 6=Compilation Error, 11/12=Runtime Error
    const isCompileError = data.status?.id === 6;

    return {
      stdout: data.stdout || "",
      stderr: data.stderr || "",
      exitCode: data.status?.id === 3 ? 0 : 1,
      signal: null,
      compilationOutput: "",
      compilationError: isCompileError
        ? (data.compile_output || "Compilation error")
        : "",
    };
  } catch {
    return null;
  }
}

// ── OneCompiler API (fallback for C, C++, Java) ──────────────────────
const ONECOMPILER_TOKEN =
  import.meta.env.VITE_ONECOMPILER_TOKEN ||
  "oc_44feraq2b_44feraq2u_a322c21caf84cac8d9befe7eeaa83b2b689bdf52d3e2cecf";

const ONECOMPILER_LANG_MAP: Record<
  Exclude<SupportedLanguage, "python">,
  { language: string; fileName: string }
> = {
  c: { language: "c", fileName: "main.c" },
  cpp: { language: "cpp", fileName: "main.cpp" },
  java: { language: "java", fileName: "Main.java" },
};

async function executeWithOneCompiler(
  language: Exclude<SupportedLanguage, "python">,
  code: string,
  stdin: string
): Promise<CodeExecutionResponse | null> {
  const langConfig = ONECOMPILER_LANG_MAP[language];
  try {
    const response = await fetch(
      `https://onecompiler.com/api/v1/run?access_token=${ONECOMPILER_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: langConfig.language,
          stdin,
          files: [{ name: langConfig.fileName, content: code }],
        }),
        signal: AbortSignal.timeout(20000),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();

    if (data.status === "failed" || data.exception) {
      const isCompileError =
        data.exception?.includes("compilation") ||
        data.exception?.includes("error:") ||
        (!data.stdout && data.exception);

      return {
        stdout: data.stdout || "",
        stderr: data.stderr || "",
        exitCode: 1,
        signal: null,
        compilationOutput: "",
        compilationError: isCompileError ? (data.exception || "Compilation error") : "",
      };
    }

    return {
      stdout: data.stdout || "",
      stderr: data.stderr || "",
      exitCode: data.exception ? 1 : 0,
      signal: null,
      compilationOutput: "",
      compilationError: "",
    };
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────
export async function executeCode(
  language: SupportedLanguage,
  code: string,
  stdin?: string
): Promise<CodeExecutionResponse> {
  const input = stdin || "";

  // Python runs in-browser via Pyodide (no API call)
  if (language === "python") {
    return executePython(code, input);
  }

  // C/C++/Java: try Judge0 CE first (free, no key), fallback to OneCompiler
  const judge0Result = await executeWithJudge0(language, code, input);
  if (judge0Result) return judge0Result;

  const oneCompilerResult = await executeWithOneCompiler(language, code, input);
  if (oneCompilerResult) return oneCompilerResult;

  throw new Error(
    "All code execution services are currently unavailable. Please try again in a moment."
  );
}

export async function runTestCases(
  language: SupportedLanguage,
  code: string,
  testCases: TestCase[],
  onProgress?: (completed: number, total: number) => void
): Promise<TestCaseResult[]> {
  const results: TestCaseResult[] = [];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    try {
      const execResult = await executeCode(language, code, tc.input);

      const actualOutput = execResult.stdout.trimEnd();
      const expectedOutput = tc.expected_output.trimEnd();

      results.push({
        testCaseId: tc.id,
        label: tc.label,
        input: tc.input,
        expectedOutput: tc.expected_output,
        actualOutput: execResult.stdout,
        passed: actualOutput === expectedOutput && execResult.exitCode === 0,
        stderr: execResult.stderr,
        exitCode: execResult.exitCode,
      });
    } catch (error) {
      results.push({
        testCaseId: tc.id,
        label: tc.label,
        input: tc.input,
        expectedOutput: tc.expected_output,
        actualOutput: "",
        passed: false,
        stderr: String(error),
        exitCode: -1,
      });
    }

    onProgress?.(i + 1, testCases.length);
  }

  return results;
}
