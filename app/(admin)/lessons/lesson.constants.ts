import type { ModuleField } from "@/types/fieldPolicy";

export const LESSON_MODULE_CODE = "lessons";

export const SORTABLE_FIELDS = new Set([
    "grade",
    "subject_name",
    "learn_number",
    "lesson_name",
    "updated_at",
]);

export const LIST_FIELD_CODES = new Set([
    "grade",
    "subject_name",
    "learn_number",
    "lesson_name",
    "updated_at",
]);

export const DEFAULT_MODULE_FIELDS: ModuleField[] = [
    { fieldCode: "grade", fieldLabel: "Khối", fieldType: "select", sortOrder: 1 },
    { fieldCode: "subject_name", fieldLabel: "Môn học", fieldType: "select", sortOrder: 2 },
    { fieldCode: "learn_number", fieldLabel: "Số thứ tự bài", fieldType: "number", sortOrder: 3 },
    { fieldCode: "lesson_name", fieldLabel: "Tên bài học", fieldType: "text", sortOrder: 4 },
    { fieldCode: "updated_at", fieldLabel: "Ngày cập nhật", fieldType: "datetime", sortOrder: 5 },
];
