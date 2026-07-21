import dayjs, { Dayjs } from "dayjs";

/**
 * Ghép Date + Time => ISO String
 * Ví dụ:
 *  date = 2026-08-13
 *  time = 08:00
 *
 * =>
 * 2026-08-13T08:00:00.000Z
 */
export const combineDateTime = (
    date?: Dayjs | null,
    time?: Dayjs | null
): string | undefined => {
    if (!date || !time) return undefined;

    return date
        .hour(time.hour())
        .minute(time.minute())
        .second(0)
        .millisecond(0)
        .toISOString();
};

/**
 * Chuẩn hóa dữ liệu Form trước khi gọi API
 */
export const normalizeSchedulePayload = (values: any) => {
    // Không dùng structuredClone ở đây vì Dayjs không giữ được prototype sau khi clone.
    // Clone nông các object lồng nhau cần chỉnh sửa để không mutate Form values.
    const payload = {
        ...values,
        new_session: values.new_session
            ? { ...values.new_session }
            : values.new_session,
        separate_config: values.separate_config
            ? Object.fromEntries(
                Object.entries(values.separate_config).map(([day, config]: [string, any]) => [
                    day,
                    { ...config },
                ])
            )
            : values.separate_config,
    };

    // ===========================
    // Thêm / Sửa 1 buổi
    // ===========================
    if (payload.date) {
        payload.start_time = combineDateTime(
            payload.date,
            payload.start_time
        );

        payload.end_time = combineDateTime(
            payload.date,
            payload.end_time
        );

        delete payload.date;
    }

    // ===========================
    // Bulk (Dùng chung cấu hình)
    // ===========================
    if (payload.bulk_start_date) {
        payload.bulk_start_time = combineDateTime(
            payload.bulk_start_date,
            payload.bulk_start_time
        );

        payload.bulk_end_time = combineDateTime(
            payload.bulk_start_date,
            payload.bulk_end_time
        );
    }

    // ===========================
    // Update -> New Session
    // ===========================
    if (payload.new_session) {
        payload.new_session.start_time = combineDateTime(
            payload.new_session.date,
            payload.new_session.start_time
        );

        payload.new_session.end_time = combineDateTime(
            payload.new_session.date,
            payload.new_session.end_time
        );

        delete payload.new_session.date;
    }

    // ===========================
    // Bulk - Separate Config
    // ===========================
    if (payload.separate_config && payload.bulk_start_date) {
        Object.keys(payload.separate_config).forEach((day) => {
            const item = payload.separate_config[day];

            item.start_time = combineDateTime(
                payload.bulk_start_date,
                item.start_time
            );

            item.end_time = combineDateTime(
                payload.bulk_start_date,
                item.end_time
            );
        });
    }

    return payload;
};
