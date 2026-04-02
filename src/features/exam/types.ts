export type QuestionType = 'mcq' | 'rich-text' | 'short' | 'medium' | 'long' | 'code';

export interface MCQOption {
    id: string;
    text: string;
}

export interface TestCase {
    id: string;
    input: string;
    expected_output: string;
    is_hidden: boolean;
    label: string;
}

export interface Question {
    id: string;
    text: string;
    type?: QuestionType;
    options?: MCQOption[];
    correctOption?: string;
    marks: number;
    language?: string;
    starterCode?: string;
    testCases?: TestCase[];
}

export interface ExamSection {
    id: string;
    name: string;
    icon?: string;
    color?: string;
    description?: string;
    questions: Question[];
    timeLimit?: number;
    marksPerQuestion: number;
}

export type ExamType = 'prep' | 'main';

export interface Subject {
    id: string;
    name: string;
    questions: Question[];
    examSections?: ExamSection[];
    examType: ExamType;
    teacherName?: string;
    teacherId?: string;
    /** UUID from DB (subjects.id); used for teacher_exam_control and submissions */
    subjectUuid?: string;
}

export interface Department {
    id: string;
    name: string;
    subjects: Subject[];
}

export type QuestionStatus = 'unseen' | 'seen' | 'answered' | 'marked';
