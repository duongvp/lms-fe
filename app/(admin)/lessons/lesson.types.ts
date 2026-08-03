import type { LessonApiResponse } from "@/services/lessonService";

export interface LessonDataType extends LessonApiResponse {
    key: string;
}

export interface LessonFilterValues {
    keyword?: string;
    grade?: number;
    subject_code?: string;
    subject?: string;
    learn_number?: number;
}

export interface LessonSortState {
    sort_by?: string;
    sort_order?: "ascend" | "descend";
}

export interface LessonImportError {
    row: number;
    field?: string;
    message: string;
}

export type LessonImportMode = "overwrite" | "skip";
export type LessonReorderStrategy = "insert" | "swap";
export type LessonExportFormat = "csv" | "xlsx";
export type LessonExportScope = "all" | "filter" | "selected";
