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
    if (!subjectSlug || !schoolYear) return "";
    return grade ? `${subjectSlug}-${grade}-${schoolYear}` : `${subjectSlug}-${schoolYear}`;
};

const topuniSlug = (value?: string) => String(value || "").trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "");

export const getTopuniSubjectCode = (subjectName?: string) => {
    const subjectAliases: Record<string, string> = {
        vatly: "vatli", ly: "vatli", li: "vatli",
        hoa: "hoahoc", sinh: "sinhhoc", anh: "tienganh",
        su: "lichsu", dia: "diali", dialy: "diali", van: "nguvan",
        suyluankhoahoc: "slkh",
        logicphantichsuyluan: "lgptsl",
    };
    const subject = topuniSlug(subjectName);
    return subjectAliases[subject] || subject;
};

export const buildTopuniProgramCode = ({ phase, phaseNumber, subjectName, exam, pathway, schoolYear }: {
    phase?: string;
    phaseNumber?: number | null;
    subjectName?: string;
    exam?: string;
    pathway?: string;
    schoolYear?: number;
}) => {
    const subject = getTopuniSubjectCode(subjectName);
    const examCode = topuniSlug(exam);
    const normalizedExam = examCode === "vactv" ? "vact" : examCode;
    const phaseCode = topuniSlug(phase);
    const pathwayCode = topuniSlug(pathway);
    if (!phaseCode || !subject || !normalizedExam || !pathwayCode
        || !Number.isInteger(schoolYear) || Number(schoolYear) < 2020 || Number(schoolYear) > 2100) return "";
    if (phaseNumber != null && (!Number.isSafeInteger(phaseNumber) || phaseNumber < 1)) return "";
    return `${phaseCode}${phaseNumber ?? ""}${subject}${normalizedExam}${pathwayCode}${schoolYear}`;
};

export const formatLessonScheduleOption = (lesson: LessonApiResponse) => {
    const programPrefix = String(lesson.subject_code || "").trim();
    const baseLabel = `${programPrefix ? `[${programPrefix}] ` : ""}Bài ${lesson.learn_number}: ${lesson.lesson_name}`;
    const scheduledCount = Number(lesson.scheduled_count ?? 0);
    if (scheduledCount <= 0) return baseLabel;

    return `${baseLabel} - Đã gán lịch: ${scheduledCount} buổi`;
};
