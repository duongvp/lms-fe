import type { LivestreamListParams } from "@/services/livestreamService";

export const normalizeScheduleAssistants = (value: unknown): string[] => {
    const values = Array.isArray(value) ? value : String(value ?? "").split(",");
    return Array.from(new Set(values.map(item => String(item ?? "").trim())
        .filter(item => Boolean(item) && !/^(?:\[null\]|null|-)$/i.test(item))));
};

export const SCHEDULE_PROGRESS_FILTERS = [
    { text: "Chưa bắt đầu", value: "Chưa bắt đầu", status: "upcoming" },
    { text: "Đang diễn ra", value: "Đang diễn ra", status: "ongoing" },
    { text: "Đã kết thúc", value: "Đã kết thúc", status: "completed" },
    { text: "Nghỉ học", value: "Nghỉ học", status: "cancelled" },
    { text: "-", value: "-", status: "unknown" },
] as const;

export const buildScheduleColumnFilterParams = (
    filters: Record<string, readonly unknown[] | null | undefined>,
): Partial<LivestreamListParams> => {
    const assistants = filters.assistant_teacher?.map(String).filter(Boolean) ?? [];
    const dates = filters.live_date?.map(String).map(value => {
        if (value === "-") return "undated";
        const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
        return parts ? `${parts[3]}-${parts[2]}-${parts[1]}` : "";
    }).filter(Boolean) ?? [];
    const statuses = SCHEDULE_PROGRESS_FILTERS
        .filter(option => filters.lesson_status?.map(String).includes(option.value))
        .map(option => option.status);
    return {
        ...(assistants.length ? { assistant_teachers: assistants } : {}),
        ...(dates.length ? { live_dates: dates } : {}),
        ...(statuses.length ? { progress_statuses: statuses } : {}),
    };
};
