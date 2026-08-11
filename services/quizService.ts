import { fetchInstance } from "@/ultils/fetchInstance";

const API_BASE_URL = `${process.env.NEXT_PUBLIC_LMS_API || process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:5000"}/api/quizzes`;

export type QuizType = 1 | 2 | 3;
export type QuizScoreType = 1 | 2;
export type QuizStatus = "active" | "done" | "disable";
export type QuizAnswerItem = Record<string, string | boolean | number>;

export interface QuizApiResponse {
    id?: string | number;
    quiz_id: string;
    code: string;
    learn_number: number;
    quiz_type: QuizType;
    quiz_name: string;
    ans: QuizAnswerItem[];
    score_type: QuizScoreType;
    ans_duration: number;
    quiz_status: QuizStatus;
    quiz_index: number;
    creator?: string;
    created_at?: string;
    updated_at?: string;
}

export interface QuizPayload {
    code: string;
    learn_number: number;
    quiz_type: QuizType;
    quiz_name: string;
    ans: QuizAnswerItem[];
    score_type: QuizScoreType;
    ans_duration: number;
    quiz_status: QuizStatus;
    quiz_index: number;
}

export interface QuizClassOption {
    code: string;
    subject_name?: string | null;
    lesson_count: number;
}

export interface QuizLessonOption {
    lesson_id?: string | null;
    learn_number: number;
    lesson_name: string;
    subject_name?: string | null;
    grade?: number | null;
}

export interface QuizIndexSuggestionParams {
    code: string;
    learn_number: number;
    quiz_index?: number;
    exclude_quiz_id?: string;
}

export interface QuizIndexSuggestion {
    next_index: number;
    duplicate: QuizApiResponse | null;
}

export interface QuizListParams {
    page?: number;
    limit?: number;
    code?: string;
    learn_number?: number | string;
    quiz_type?: QuizType;
    score_type?: QuizScoreType;
    quiz_status?: QuizStatus;
    keyword?: string;
    sort_by?: string;
    sort_order?: "asc" | "desc";
}

export interface QuizExportParams extends QuizListParams {
    format: "csv" | "xlsx";
    quiz_ids?: string[];
}

const buildQuery = (params: object) => {
    const query = new URLSearchParams();
    Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        query.set(key, Array.isArray(value) ? value.join(",") : String(value));
    });
    return query.toString();
};

export const getQuizzes = (params: QuizListParams) =>
    fetchInstance(`${API_BASE_URL}?${buildQuery(params)}`, { method: "GET", credentials: "include" });

export const getQuizById = (quizId: string) =>
    fetchInstance(`${API_BASE_URL}/${encodeURIComponent(quizId)}`, { method: "GET", credentials: "include" });

export const getQuizClasses = () =>
    fetchInstance(`${API_BASE_URL}/classes`, { method: "GET", credentials: "include" });

export const getQuizLessons = (code: string) =>
    fetchInstance(`${API_BASE_URL}/lessons?code=${encodeURIComponent(code)}`, { method: "GET", credentials: "include" });

export const getQuizIndexSuggestion = (params: QuizIndexSuggestionParams) =>
    fetchInstance(`${API_BASE_URL}/index-suggestion?${buildQuery(params)}`, { method: "GET", credentials: "include" });

export const createQuiz = (payload: QuizPayload) =>
    fetchInstance(API_BASE_URL, { method: "POST", body: JSON.stringify(payload), credentials: "include" });

export const updateQuiz = (quizId: string, payload: Partial<QuizPayload>) =>
    fetchInstance(`${API_BASE_URL}/${encodeURIComponent(quizId)}`, { method: "PUT", body: JSON.stringify(payload), credentials: "include" });

export const disableQuiz = (quizId: string) =>
    fetchInstance(`${API_BASE_URL}/${encodeURIComponent(quizId)}`, { method: "DELETE", credentials: "include" });

export const restoreQuiz = (quizId: string) =>
    fetchInstance(`${API_BASE_URL}/${encodeURIComponent(quizId)}/restore`, { method: "POST", credentials: "include" });

export const reorderQuizzes = (payload: { code: string; learn_number: number; ordered_quiz_ids: string[] }) =>
    fetchInstance(`${API_BASE_URL}/reorder`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        credentials: "include",
    });

export const exportQuizzes = (params: QuizExportParams) =>
    fetchInstance(`${API_BASE_URL}/export?${buildQuery(params)}`, { method: "GET", credentials: "include" }, "blob");

export const downloadQuizTemplate = (format: "csv" | "xlsx", code: string) =>
    fetchInstance(
        `${API_BASE_URL}/template?format=${format}&code=${encodeURIComponent(code)}&_=${Date.now()}`,
        { method: "GET", credentials: "include", cache: "no-store" },
        "blob"
    );

export const importQuizzesFile = (file: File, mode: "skip" | "overwrite", code: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
    formData.append("code", code);
    return fetchInstance(API_BASE_URL + "/import", { method: "POST", body: formData, credentials: "include" });
};
