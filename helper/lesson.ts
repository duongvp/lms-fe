import type { LessonApiResponse } from "@/services/lessonService";
import dayjs, { type Dayjs } from "dayjs";

// Năm học được đặt theo năm kết thúc. Ví dụ từ tháng 6/2026 trở đi sẽ
// đề xuất năm học 2027; người dùng vẫn có thể thay đổi trên form.
export const getSuggestedSchoolYear = (referenceDate: Dayjs = dayjs()) => (
    referenceDate.month() >= 5 ? referenceDate.year() + 1 : referenceDate.year()
);

export const buildLessonSubjectCode = (
    subjectName?: string,
    grade?: number,
    schoolYear?: number
) => {
    const subjectSlug = String(subjectName || "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "d")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
        .slice(0, 80);
    if (!subjectSlug || !grade || !schoolYear) return "";
    return `${subjectSlug}-${grade}-${schoolYear}`;
};

export const formatLessonScheduleOption = (lesson: LessonApiResponse) => {
    const baseLabel = `[${lesson.subject_code}] Bài ${lesson.learn_number}: ${lesson.lesson_name}`;
    const scheduledCount = Number(lesson.scheduled_count ?? 0);
    if (scheduledCount <= 0) return baseLabel;

    return `${baseLabel} - Đã gán lịch: ${scheduledCount} buổi`;
};
