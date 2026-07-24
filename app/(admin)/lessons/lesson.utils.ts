import type { LessonFilterValues } from "./lesson.types";

export const cleanFilterValues = (values: LessonFilterValues): LessonFilterValues => {
    const cleaned: LessonFilterValues = {};

    Object.entries(values).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        (cleaned as Record<string, unknown>)[key] = typeof value === "string" ? value.trim() : value;
    });

    return cleaned;
};

export const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};
