import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import type { LessonFilterValues } from "./lesson.types";

dayjs.extend(utc);

// MySQL DATETIME của hệ thống đang lưu giờ Việt Nam nhưng API serialize với
// hậu tố Z. Hiển thị theo các thành phần UTC để không cộng thêm 7 giờ lần nữa.
export const formatLessonDateTime = (value?: string | null) => (
    value ? dayjs.utc(value).format("DD/MM/YYYY HH:mm") : "-"
);

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
