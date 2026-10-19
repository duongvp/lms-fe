import dayjs, { type Dayjs } from "dayjs";
import type { CalendarSource } from "@/services/livestreamService";
import { calendarSourceFromCode } from "@/helper/lesson";

export interface ScheduleFilterValues {
    calendar_source?: CalendarSource;
    keyword?: string;
    calendar_id?: number;
    code?: string;
    teacher?: string[];
    system_type?: Array<"topclass" | "topuni">;
    time_status?: Array<"upcoming" | "ongoing" | "completed">;
    date_range?: [Dayjs, Dayjs];
    weekdays?: number[];
    from_learn_number?: number;
    to_learn_number?: number;
}

export const cleanFilterValues = (values: ScheduleFilterValues): ScheduleFilterValues => {
    const cleaned: ScheduleFilterValues = { calendar_source: "livestream" };

    Object.entries(values).forEach(([key, value]) => {
        if (key === "calendar_source") {
            cleaned.calendar_source = value === "feed" ? "feed" : "livestream";
            return;
        }
        // RangePicker có thể trả về null hoặc mảng [null, null] sau khi người
        // dùng bấm xoá. Chỉ giữ khoảng ngày khi có đủ hai ngày hợp lệ, để URL
        // không giữ lại from/to của lần lọc trước.
        if (key === "date_range") {
            const [from, to] = Array.isArray(value) ? value : [];
            if (dayjs.isDayjs(from) && from.isValid() && dayjs.isDayjs(to) && to.isValid()) {
                cleaned.date_range = [from, to];
            }
            return;
        }
        if (value === undefined || value === null || value === "") return;
        if (Array.isArray(value) && value.length === 0) return;
        (cleaned as any)[key] = typeof value === "string" ? value.trim() : value;
    });

    // Mã chương trình xác định nguồn lịch, kể cả URL cũ thiếu hoặc lưu sai nguồn.
    if (cleaned.code) cleaned.calendar_source = calendarSourceFromCode(cleaned.code);
    return cleaned;
};

export const buildScheduleApiParams = (values: ScheduleFilterValues) => {
    const cleaned = cleanFilterValues(values);
    const { date_range, teacher, ...rest } = cleaned;

    return {
        ...rest,
        teacher: teacher?.join(","),
        start_time: date_range?.[0]?.startOf("day").format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
        end_time: date_range?.[1]?.endOf("day").format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
    };
};

export const buildScheduleUrl = (values: ScheduleFilterValues, targetPage = 1) => {
    // Đây là lớp bảo vệ cuối cùng trước khi ghi URL. Không phụ thuộc việc
    // caller đã làm sạch form hay chưa, nên thao tác clear ở bất kỳ filter nào
    // cũng không thể giữ lại params của lần tìm kiếm trước.
    const cleaned = cleanFilterValues(values);
    const params = new URLSearchParams();
    const program = String(cleaned.code || "").trim();
    const keyword = String(cleaned.keyword || "").trim();
    const teachers = Array.isArray(cleaned.teacher) ? cleaned.teacher : [];
    if (program) params.set("program", program);
    if (cleaned.calendar_source === "feed") params.set("calendar_source", "feed");
    if (keyword) params.set("q", keyword);
    if (cleaned.calendar_id !== undefined) params.set("calendar_id", String(cleaned.calendar_id));
    if (teachers.length) params.set("teacher", teachers.join(","));
    if (cleaned.system_type?.length) params.set("system_type", cleaned.system_type.join(","));
    if (cleaned.time_status?.length) params.set("status", cleaned.time_status.join(","));
    if (cleaned.weekdays?.length) params.set("weekdays", cleaned.weekdays.join(","));
    if (cleaned.from_learn_number !== undefined) params.set("from_learn_number", String(cleaned.from_learn_number));
    if (cleaned.to_learn_number !== undefined) params.set("to_learn_number", String(cleaned.to_learn_number));
    if (cleaned.date_range?.[0]?.isValid() && cleaned.date_range[1]?.isValid()) {
        params.set("from", cleaned.date_range[0].format("YYYY-MM-DD"));
        params.set("to", cleaned.date_range[1].format("YYYY-MM-DD"));
    }
    if (targetPage > 1) params.set("page", String(targetPage));
    return params.size ? `/schedule?${params.toString()}` : "/schedule";
};
