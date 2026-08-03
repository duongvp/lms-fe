import { fetchInstance } from "@/ultils/fetchInstance";

const API_BASE_URL = `${process.env.NEXT_PUBLIC_LMS_API || process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:5000"}/api/lessons`;

export interface LessonApiResponse {
    id: string;
    grade: number;
    subject_code: string;
    subject_name: string;
    learn_number: number;
    lesson_name: string;
    lesson_document?: string | null;
    evg_banner?: string | null;
    evg_stream?: string | null;
    lesson_link?: string | null;
    lesson_baitap?: string | null;
    lesson_tomtat?: string | null;
    lesson_phuongphap?: string | null;
    lesson_luuy?: string | null;
    lesson_ketqua?: string | null;
    scheduled_count?: number | string;
    status: number;
    created_at: string;
    updated_at: string;
}

export interface LessonListParams {
    page?: number;
    limit?: number;
    keyword?: string;
    course_code?: string;
    grade?: number | string;
    subject_code?: string;
    subject?: string;
    learn_number?: number | string;
    sort_by?: string;
    sort_order?: string;
}

export interface LessonSubjectOption {
    subject_name: string;
    subject_code: string;
}

export interface LessonProgramOption extends LessonSubjectOption {
    grade: number;
}

export interface LessonExportParams extends LessonListParams {
    format: "csv" | "xlsx";
    ids?: Array<string | number>;
}

export interface LessonPayload {
    grade: number;
    subject_code: string;
    subject_name: string;
    learn_number?: number;
    lesson_name: string;
    lesson_document?: string | null;
    evg_banner?: string | null;
    evg_stream?: string | null;
    lesson_link?: string | null;
    lesson_baitap?: string | null;
    lesson_tomtat?: string | null;
    lesson_phuongphap?: string | null;
    lesson_luuy?: string | null;
    lesson_ketqua?: string | null;
}

export interface LessonBulkUpdatePayload {
    ids: Array<string | number>;
    data: Partial<LessonPayload> & { status?: number };
}

export interface LessonReorderPayload {
    grade: number;
    subject_code: string;
    mode?: "insert" | "swap";
    ordered_ids: Array<string | number>;
}

const buildQuery = (params: LessonListParams) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        if (Array.isArray(value)) {
            if (value.length) query.append(key, value.join(","));
            return;
        }
        query.append(key, String(value));
    });
    return query.toString();
};

export const getLessons = (params: LessonListParams) =>
    fetchInstance(`${API_BASE_URL}?${buildQuery(params)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });

export const getLessonSubjects = () =>
    fetchInstance(`${API_BASE_URL}/options/subjects`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
    });

export const getLessonPrograms = () =>
    fetchInstance(`${API_BASE_URL}/options/programs`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
    });

export const getLessonById = (id: string | number) =>
    fetchInstance(`${API_BASE_URL}/${id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });

export const createLesson = (payload: LessonPayload) =>
    fetchInstance(`${API_BASE_URL}`, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });

export const updateLesson = (id: string | number, payload: Partial<LessonPayload>) =>
    fetchInstance(`${API_BASE_URL}/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });

export const bulkUpdateLessons = (payload: LessonBulkUpdatePayload) =>
    fetchInstance(`${API_BASE_URL}/bulk`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });

export const reorderLessons = (payload: LessonReorderPayload) =>
    fetchInstance(`${API_BASE_URL}/reorder`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });

export const deleteLesson = (id: string | number) =>
    fetchInstance(`${API_BASE_URL}/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });

export const exportLessons = (params: LessonExportParams) =>
    fetchInstance(`${API_BASE_URL}/export?${buildQuery(params)}`, {
        method: "GET",
        credentials: "include",
    }, "blob");

export const downloadLessonTemplate = (format: "csv" | "xlsx") =>
    fetchInstance(`${API_BASE_URL}/template?format=${format}`, {
        method: "GET",
        credentials: "include",
    }, "blob");

export const importLessonsFile = (file: File, mode: "overwrite" | "skip") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);

    return fetchInstance(`${API_BASE_URL}/import`, {
        method: "POST",
        body: formData,
        credentials: "include",
    });
};
