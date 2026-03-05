import { create } from 'zustand';
import type { Question, QuestionStatus } from '@/features/exam/types';

interface ExamState {
    selectedDepartment: string | null;
    selectedSubject: string | null;
    examQuestions: Question[];
    currentQuestionIndex: number;
    answers: Record<string, string>;
    mcqAnswers: Record<string, string>;
    questionStatus: Record<string, QuestionStatus>;

    // Actions
    setDepartment: (dept: string) => void;
    setSubject: (subj: string) => void;
    setExamQuestions: (questions: Question[]) => void;
    setCurrentQuestionIndex: (index: number) => void;
    updateAnswer: (qId: string, answer: string) => void;
    updateMcqAnswer: (qId: string, answer: string) => void;
    setQuestionStatus: (status: Record<string, QuestionStatus>) => void;
}

export const useExamStore = create<ExamState>((set) => ({
    selectedDepartment: null,
    selectedSubject: null,
    examQuestions: [],
    currentQuestionIndex: 0,
    answers: {},
    mcqAnswers: {},
    questionStatus: {},

    setDepartment: (dept) => set({ selectedDepartment: dept }),
    setSubject: (subj) => set({ selectedSubject: subj }),
    setExamQuestions: (questions) => set({ examQuestions: questions }),
    setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),

    updateAnswer: (qId, answer) => set((state) => ({
        answers: { ...state.answers, [qId]: answer },
        questionStatus: { ...state.questionStatus, [qId]: 'answered' as QuestionStatus }
    })),

    updateMcqAnswer: (qId, answer) => set((state) => ({
        mcqAnswers: { ...state.mcqAnswers, [qId]: answer },
        questionStatus: { ...state.questionStatus, [qId]: 'answered' as QuestionStatus }
    })),

    setQuestionStatus: (status) => set({ questionStatus: status }),
}));
