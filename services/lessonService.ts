import { fetchInstance } from "@/ultils/fetchInstance";

const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:5000"}/api/lessons`;
const LESSON_REAUTH_STORAGE_KEY = "lms.lessons.reauth";

const getLessonReauthToken = () => (
    typeof window === "undefined" ? "" : sessionStorage.getItem(LESSON_REAUTH_STORAGE_KEY) || ""
);

const lessonHeaders = (json = true) => ({
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(getLessonReauthToken() ? { "X-Lessons-Reauth": getLessonReauthToken() } : {}),
});

export const clearLessonReauthToken = () => {
    if (typeof window !== "undefined") sessionStorage.removeItem(LESSON_REAUTH_STORAGE_KEY);
};

export const hasLessonReauthToken = () => Boolean(getLessonReauthToken());

export const reauthenticateLessons = async (password: string) => {
    const response: any = await fetchInstance(`${API_BASE_URL}/reauth`, {
        method: "POST",
        body: JSON.stringify({ password }),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
    const token = String(response?.data?.token || "");
    if (!token) throw new Error("Backend không trả token xác thực cấp 2");
    sessionStorage.setItem(LESSON_REAUTH_STORAGE_KEY, token);
    return response.data as { token: string; expiresInSeconds: number | null };
};

export const validateLessonReauthentication = () =>
    fetchInstance(`${API_BASE_URL}/reauth`, {
        method: "GET",
        headers: lessonHeaders(),
        credentials: "include",
        cache: "no-store",
    });

export interface LessonApiResponse {
    id: string;
    grade: number | null;
    system_type: "topclass" | "topuni";
    subject_code: string;
    subject_name: string;
    learn_number: number;
    lesson_name: string;
    scheduled_count?: number | string;
    past_scheduled_count?: number | string;
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
    grade?: number | null;
    system_type?: "topclass" | "topuni" | null;
}

export interface CreateLessonProgramPayload {
    grade?: number;
    system_type: "topclass" | "topuni";
    subject_code: string;
    subject_name: string;
    lesson_name: string;
}

export interface LessonExportParams extends LessonListParams {
    format: "csv" | "xlsx";
    ids?: Array<string | number>;
}

export interface LessonPayload {
    grade?: number;
    system_type?: "topclass" | "topuni";
    subject_code: string;
    subject_name: string;
    learn_number?: number;
    lesson_name: string;
}

export interface LessonBulkUpdatePayload {
    ids: Array<string | number>;
    data: Partial<LessonPayload> & { status?: number };
}

export interface LessonReorderPayload {
    grade?: number;
    subject_code: string;
    mode?: "insert" | "swap";
    ordered_ids: Array<string | number>;
}

export interface LessonCourseMapping {
    id: string;
    lesson_id: string;
    package_id: string;
    course_id: string;
    learn_number: number;
    lesson_name: string;
}

export interface LessonCourseMappingPayload {
    program_code: string;
    action: "add" | "delete";
    package_id: string;
    course_id: string;
    lesson_ids?: Array<string | number>;
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
        headers: lessonHeaders(),
        credentials: "include",
    });

export const getLessonSubjects = () =>
    fetchInstance(`${API_BASE_URL}/options/subjects`, {
        method: "GET",
        headers: lessonHeaders(),
        credentials: "include",
        cache: "no-store",
    });

export const getLessonPrograms = () =>
    fetchInstance(`${API_BASE_URL}/options/programs`, {
        method: "GET",
        headers: lessonHeaders(),
        credentials: "include",
        cache: "no-store",
    });

export const createLessonProgram = (payload: CreateLessonProgramPayload) =>
    fetchInstance(`${API_BASE_URL}/options/programs`, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: lessonHeaders(),
        credentials: "include",
    });

export const getLessonCourseMappings = (programCode: string) =>
    fetchInstance(`${API_BASE_URL}/course-mappings?program_code=${encodeURIComponent(programCode)}`, {
        method: "GET",
        headers: lessonHeaders(),
        credentials: "include",
        cache: "no-store",
    });

export const updateLessonCourseMappings = (payload: LessonCourseMappingPayload) =>
    fetchInstance(`${API_BASE_URL}/course-mappings`, {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: lessonHeaders(),
        credentials: "include",
    });

export const getLessonById = (id: string | number) =>
    fetchInstance(`${API_BASE_URL}/${id}`, {
        method: "GET",
        headers: lessonHeaders(),
        credentials: "include",
    });

export const createLesson = (payload: LessonPayload) =>
    fetchInstance(`${API_BASE_URL}`, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: lessonHeaders(),
        credentials: "include",
    });

export const updateLesson = (id: string | number, payload: Partial<LessonPayload>) =>
    fetchInstance(`${API_BASE_URL}/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: lessonHeaders(),
        credentials: "include",
    }, "json", 120_000);

export const bulkUpdateLessons = (payload: LessonBulkUpdatePayload) =>
    fetchInstance(`${API_BASE_URL}/bulk`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        headers: lessonHeaders(),
        credentials: "include",
    });

export const reorderLessons = (payload: LessonReorderPayload) =>
    fetchInstance(`${API_BASE_URL}/reorder`, {
        method: "PATCH",
        body: JSON.stringify(payload),
        headers: lessonHeaders(),
        credentials: "include",
    });

export const deleteLesson = (id: string | number) =>
    fetchInstance(`${API_BASE_URL}/${id}`, {
        method: "DELETE",
        headers: lessonHeaders(),
        credentials: "include",
    });

export const exportLessons = (params: LessonExportParams) =>
    fetchInstance(`${API_BASE_URL}/export?${buildQuery(params)}`, {
        method: "GET",
        headers: lessonHeaders(false),
        credentials: "include",
    }, "blob");

export const downloadLessonTemplate = (format: "csv" | "xlsx", programCode: string) =>
    fetchInstance(`${API_BASE_URL}/template?format=${format}&program_code=${encodeURIComponent(programCode)}`, {
        method: "GET",
        headers: lessonHeaders(false),
        credentials: "include",
    }, "blob");

export const downloadLessonProgramTemplate = (format: "csv" | "xlsx") =>
    fetchInstance(`${API_BASE_URL}/program-template?format=${format}`, {
        method: "GET",
        headers: lessonHeaders(false),
        credentials: "include",
    }, "blob");

export const importLessonsFile = (
    file: File,
    mode: "overwrite" | "skip",
    programCode: string
) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
    formData.append("program_code", programCode);

    return fetchInstance(`${API_BASE_URL}/import`, {
        method: "POST",
        body: formData,
        headers: lessonHeaders(false),
        credentials: "include",
    });
};

export const importLessonProgramFile = (
    file: File | undefined,
    mode: "overwrite" | "skip",
    program: Partial<Omit<CreateLessonProgramPayload, "lesson_name">> = {},
    sheetUrl?: string,
) => {
    const formData = new FormData();
    if (file) formData.append("file", file);
    if (sheetUrl) formData.append("sheet_url", sheetUrl);
    formData.append("mode", mode);
    formData.append("create_program", "true");
    Object.entries(program).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    return fetchInstance(`${API_BASE_URL}/import`, {
        method: "POST",
        body: formData,
        headers: lessonHeaders(false),
        credentials: "include",
    });
};
