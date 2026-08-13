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
    "learn_number",
    "lesson_name",
]);

export const DEFAULT_MODULE_FIELDS: ModuleField[] = [
    { fieldCode: "learn_number", fieldLabel: "Số thứ tự bài", fieldType: "number", sortOrder: 1 },
    { fieldCode: "lesson_name", fieldLabel: "Tên bài học", fieldType: "text", sortOrder: 2 },
];
