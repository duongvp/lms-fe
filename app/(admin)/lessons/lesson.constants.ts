import type { ModuleField } from "@/types/fieldPolicy";

export const LESSON_MODULE_CODE = "lessons";

export const SORTABLE_FIELDS = new Set([
    "grade",
    "subject_code",
    "subject_name",
    "learn_number",
    "lesson_name",
    "updated_at",
]);

export const LIST_FIELD_CODES = new Set([
    "grade",
    "subject_code",
    "subject_name",
    "learn_number",
    "lesson_name",
    "updated_at",
]);

export const DEFAULT_MODULE_FIELDS: ModuleField[] = [
    { fieldCode: "grade", fieldLabel: "Khối", fieldType: "select", sortOrder: 1 },
    { fieldCode: "subject_name", fieldLabel: "Môn học", fieldType: "select", sortOrder: 2 },
    { fieldCode: "subject_code", fieldLabel: "Mã môn học", fieldType: "text", sortOrder: 3 },
    { fieldCode: "learn_number", fieldLabel: "Số thứ tự bài", fieldType: "number", sortOrder: 4 },
    { fieldCode: "lesson_name", fieldLabel: "Tên bài học", fieldType: "text", sortOrder: 5 },
    { fieldCode: "updated_at", fieldLabel: "Ngày cập nhật", fieldType: "datetime", sortOrder: 6 },
];
