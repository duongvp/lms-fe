import type { QuizListParams, QuizPayload } from "@/services/quizService";

export type EditorAnswer = {
    text?: string;
    placeholder?: string;
    correct?: boolean;
};

export type QuizFormValues = Omit<QuizPayload, "ans"> & {
    answers?: EditorAnswer[];
    short_answer?: string;
};

export type QuizFilterValues = Pick<
    QuizListParams,
    "code" | "learn_number" | "quiz_type" | "quiz_status"
>;

export type QuizClassSelectOption = {
    value: string;
    label: string;
    searchText: string;
};
