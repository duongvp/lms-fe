import { Dayjs } from "dayjs";
import { combineDateTime, normalizeSchedulePayload } from "@/helper/convertDate";
import { fetchInstance } from "@/ultils/fetchInstance";

const API_BASE_URL = `${process.env.NEXT_PUBLIC_LMS_API || process.env.LMS_API || "http://localhost:5000"}/livestreams`;

export interface LivestreamPayload {
    system_type: string;
    code: string;
    teacher: string;
    learn_number: number;
    lesson_count: number;
    start_time: string;
    end_time: string;
    lesson_status: number;
}

export interface BulkLivestreamPayload {
    calendars: LivestreamPayload[];
}

const request = (url: string, body: LivestreamPayload | BulkLivestreamPayload) =>
    fetchInstance(url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });

export const createLivestream = (payload: LivestreamPayload) =>
    request(`${API_BASE_URL}/single`, payload);

export const createLivestreamBulk = (payload: BulkLivestreamPayload) =>
    request(`${API_BASE_URL}/bulk`, payload);

// Hàm mới: lấy danh sách lịch
export const getLivestreams = (params: {
    page?: number;
    limit?: number;
    teacher?: string;
    code?: string;
    start_time?: string;
    end_time?: string;
}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));
    if (params.teacher) query.append('teacher', params.teacher);
    if (params.code) query.append('code', params.code);
    if (params.start_time) query.append('start_time', params.start_time);
    if (params.end_time) query.append('end_time', params.end_time);

    return fetchInstance(`${API_BASE_URL}?${query.toString()}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
};


export const updateLivestream = (id: string, payload: any) =>
    fetchInstance(`${API_BASE_URL}/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });

export const cancelLivestream = (id: string) =>
    fetchInstance(`${API_BASE_URL}/${id}/cancel`, {
        method: "PUT",
        body: JSON.stringify({ lesson_status: 1 }),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });

const getDates = (start: Dayjs, end: Dayjs, days: number[]) => {
    const dates: Dayjs[] = [];
    let current = start.startOf("day");
    const last = end.startOf("day");

    while (!current.isAfter(last, "day")) {
        if (days.includes(current.day() === 0 ? 1 : current.day() + 1)) {
            dates.push(current);
        }
        current = current.add(1, "day");
    }

    return dates;
};

/** Chuyển dữ liệu form tạo lịch thành body của POST /livestreams/single. */
export const toLivestreamPayload = (values: any): LivestreamPayload => {
    const payload = normalizeSchedulePayload(values);

    return {
        system_type: payload.system_type,
        code: payload.class_code,
        teacher: payload.teacher,
        learn_number: Number(payload.learn_number ?? 1),
        lesson_count: Number(payload.lesson_count ?? 0),
        start_time: payload.start_time,
        end_time: payload.end_time,
        lesson_status: Number(payload.lesson_status ?? 0),
    };
};

/** Chuyển dữ liệu form bulk thành body của POST /livestreams/bulk. */
export const toBulkLivestreamPayload = (values: any): BulkLivestreamPayload => {
    const dates = getDates(values.bulk_start_date, values.bulk_end_date, values.days_of_week);
    const calendars = dates.map((date, index) => {
        const config = values.bulkConfigMode === "separate"
            ? values.separate_config?.[date.day() === 0 ? 1 : date.day() + 1]
            : values;

        return {
            system_type: values.bulk_system_type,
            code: values.bulk_code,
            teacher: config?.teacher ?? config?.bulk_teacher,
            learn_number: Number(values.bulk_learn_number ?? 1),
            lesson_count: index,
            start_time: combineDateTime(date, config?.start_time ?? config?.bulk_start_time)!,
            end_time: combineDateTime(date, config?.end_time ?? config?.bulk_end_time)!,
            lesson_status: 0,
        };
    });

    return { calendars };
};

/** Chuyển dữ liệu form update thành body của PUT /livestreams/:id. */
export const toUpdateLivestreamPayload = (values: any): any => {
    const payload = normalizeSchedulePayload(values);

    if (payload.update_mode === 'cancel') {
        return { lesson_status: 1 };
    }

    if (payload.update_mode === 'following') {
        return {
            update_mode: 'following',
            lesson_status: 1,
            new_session: {
                teacher: payload.new_session.teacher,
                start_time: payload.new_session.start_time,
                end_time: payload.new_session.end_time,
            }
        };
    }

    // current mode
    return {
        update_mode: 'current',
        teacher: payload.teacher,
        start_time: payload.start_time,
        end_time: payload.end_time,
    };
};


//update hàng loạt
export interface BulkUpdateLivestreamPayload {
    ids: (string | number)[];
    // Backend của bạn yêu cầu cấu trúc update như thế nào thì bạn điều chỉnh ở đây.
    // Ví dụ phổ biến:
    config_mode: 'common' | 'separate';
    common_data?: any;
    separate_data?: any;
}

// API gọi cập nhật hàng loạt
export const updateLivestreamBulk = (payload: any) =>
    fetchInstance(`${API_BASE_URL}/bulk`, {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });

/** 
 * Chuyển dữ liệu từ form BulkEditModal thành payload gửi lên BE 
 */
export const toBulkUpdatePayload = (
    values: any,
    selectedLessons: (string | number)[]
) => {
    // Nếu chọn cấu hình chung (áp dụng cho tất cả bài được chọn)
    if (values.config_mode === 'common') {
        return {
            ids: selectedLessons,
            config_mode: 'common',
            update_data: {
                start_time: values.common_start_time ? values.common_start_time.format("HH:mm") : undefined,
                end_time: values.common_end_time ? values.common_end_time.format("HH:mm") : undefined,
                teacher: values.common_teacher,
                room: values.common_room,
            }
        };
    }

    // Nếu chọn cấu hình riêng (từng bài một)
    if (values.config_mode === 'separate') {
        const separateDataArray = selectedLessons.map(lessonId => {
            const lessonConfig = values.separate_config?.[lessonId] || {};
            return {
                id: lessonId,
                start_time: lessonConfig.start_time ? lessonConfig.start_time.format("HH:mm") : undefined,
                end_time: lessonConfig.end_time ? lessonConfig.end_time.format("HH:mm") : undefined,
                teacher: lessonConfig.teacher,
                room: lessonConfig.room,
            };
        });

        return {
            ids: selectedLessons,
            config_mode: 'separate',
            update_data: separateDataArray
        };
    }

    return { ids: selectedLessons, ...values };
};