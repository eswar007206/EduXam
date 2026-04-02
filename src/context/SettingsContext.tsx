import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

export type Theme = "light" | "dark";
export type EvaluationStrictness = "easy" | "moderate" | "strict";

interface SubjectSettings {
  expectedMarks: number;
}

interface SettingsContextType {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  // Evaluation Strictness
  evaluationStrictness: EvaluationStrictness;
  setEvaluationStrictness: (strictness: EvaluationStrictness) => void;

  // Subject Settings
  subjectSettings: Record<string, SubjectSettings>;
  setSubjectExpectedMarks: (subjectId: string, marks: number) => void;
  getSubjectExpectedMarks: (subjectId: string, totalMarks: number) => number;

  // Calculate progress based on expected marks
  calculateProgress: (answeredMarks: number, expectedMarks: number) => number;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const SETTINGS_STORAGE_KEY = "eduexam-settings";

interface StoredSettings {
  theme: Theme;
  evaluationStrictness: EvaluationStrictness;
  subjectSettings: Record<string, SubjectSettings>;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Load settings from localStorage
  const loadSettings = (): StoredSettings => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
    return {
      theme: "dark",
      evaluationStrictness: "moderate",
      subjectSettings: {},
    };
  };

  const initialSettings = loadSettings();

  const [theme, setThemeState] = useState<Theme>(initialSettings.theme);
  const [evaluationStrictness, setEvaluationStrictnessState] = useState<EvaluationStrictness>(
    initialSettings.evaluationStrictness
  );
  const [subjectSettings, setSubjectSettings] = useState<Record<string, SubjectSettings>>(
    initialSettings.subjectSettings
  );

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const settings: StoredSettings = {
      theme,
      evaluationStrictness,
      subjectSettings,
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [theme, evaluationStrictness, subjectSettings]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setEvaluationStrictness = (strictness: EvaluationStrictness) => {
    setEvaluationStrictnessState(strictness);
  };

  const setSubjectExpectedMarks = (subjectId: string, marks: number) => {
    setSubjectSettings((prev) => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], expectedMarks: marks },
    }));
  };

  const getSubjectExpectedMarks = (subjectId: string, totalMarks: number): number => {
    return subjectSettings[subjectId]?.expectedMarks || totalMarks;
  };

  // Calculate progress based on expected marks
  // Formula: (Answered Marks / Expected Marks) * 100
  const calculateProgress = (answeredMarks: number, expectedMarks: number): number => {
    if (expectedMarks <= 0) return 0;
    const progress = (answeredMarks / expectedMarks) * 100;
    return Math.min(progress, 100); // Cap at 100%
  };

  return (
    <SettingsContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        evaluationStrictness,
        setEvaluationStrictness,
        subjectSettings,
        setSubjectExpectedMarks,
        getSubjectExpectedMarks,
        calculateProgress,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
