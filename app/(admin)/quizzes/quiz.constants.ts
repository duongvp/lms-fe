import type { ModuleField } from "@/types/fieldPolicy";
import type { QuizScoreType, QuizStatus, QuizType } from "@/services/quizService";

export const QUIZ_MODULE_CODE = "quiz";

export const QUIZ_FIELDS: ModuleField[] = [
    { fieldCode: "quiz_id", fieldLabel: "Mã câu hỏi", fieldType: "text", sortOrder: 1 },
    { fieldCode: "code", fieldLabel: "Mã chương trình", fieldType: "text", sortOrder: 2 },
    { fieldCode: "learn_number", fieldLabel: "Bài học", fieldType: "number", sortOrder: 3 },
    { fieldCode: "quiz_type", fieldLabel: "Loại câu hỏi", fieldType: "select", sortOrder: 4 },
    { fieldCode: "quiz_name", fieldLabel: "Nội dung câu hỏi", fieldType: "textarea", sortOrder: 5 },
    { fieldCode: "ans", fieldLabel: "Đáp án", fieldType: "json", sortOrder: 6 },
    { fieldCode: "score_type", fieldLabel: "Cách tính điểm", fieldType: "select", sortOrder: 7 },
    { fieldCode: "ans_duration", fieldLabel: "Thời gian trả lời", fieldType: "number", sortOrder: 8 },
    { fieldCode: "quiz_status", fieldLabel: "Trạng thái", fieldType: "select", sortOrder: 9 },
    { fieldCode: "quiz_index", fieldLabel: "Thứ tự", fieldType: "number", sortOrder: 10 },
    { fieldCode: "creator", fieldLabel: "Người tạo", fieldType: "text", sortOrder: 11 },
    { fieldCode: "updated_at", fieldLabel: "Cập nhật lúc", fieldType: "datetime", sortOrder: 12 },
];

export const QUIZ_TYPE_OPTIONS: Array<{ value: QuizType; label: string; shortLabel: string }> = [
    { value: 1, label: "Trắc nghiệm", shortLabel: "Trắc nghiệm" },
    { value: 2, label: "Điền từ", shortLabel: "Điền từ" },
    { value: 3, label: "Trả lời ngắn", shortLabel: "Trả lời ngắn" },
];

export const SCORE_TYPE_OPTIONS: Array<{ value: QuizScoreType; label: string }> = [
    { value: 1, label: "Tính điểm toàn câu" },
    { value: 2, label: "Tính điểm theo ý" },
];

export const STATUS_OPTIONS: Array<{ value: QuizStatus; label: string; color: string }> = [
    { value: "active", label: "Đang hoạt động", color: "green" },
    { value: "done", label: "Đã hoàn thiện", color: "blue" },
    { value: "disable", label: "Đã vô hiệu hóa", color: "default" },
];

export const quizTypeLabel = (value?: number) =>
    QUIZ_TYPE_OPTIONS.find((item) => item.value === value)?.label || "Chưa xác định";

export const statusMeta = (value?: string) =>
    STATUS_OPTIONS.find((item) => item.value === value) || STATUS_OPTIONS[2];
