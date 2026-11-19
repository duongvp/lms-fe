export type BatchClassroomAssignmentItem = {
    calendarId: string;
    code: string;
    learnNumber?: number;
    lessonName?: string;
    startTime?: string;
    systemType?: string;
    status: 'pending' | 'running' | 'success' | 'skipped' | 'error';
    movedCount?: number;
    message?: string;
    errorDetails?: string;
};

type UpdateMode = 'all' | 'unlearned_only';

const assignmentError = (error: any) => {
    const raw = String(error?.message || 'Không thể chia lớp cho lịch này.');
    const message = /Unexpected token|not valid JSON|Unexpected end of JSON/i.test(raw)
        ? 'Máy chủ trả về dữ liệu không hợp lệ thay vì JSON. Vui lòng thử lại hoặc liên hệ quản trị viên.'
        : /timeout|timed out|hết thời gian/i.test(raw)
            ? `Hết thời gian chờ chia lớp${error?.status ? ` (HTTP ${error.status})` : ''}. Kết quả chưa được xác nhận; vui lòng đợi một lúc trước khi thử lại.`
            : /Failed to fetch|NetworkError|Load failed/i.test(raw)
                ? 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.'
                : raw;
    return {
        message,
        errorDetails: [
            error?.diagnostic,
            !error?.diagnostic && error?.status ? `HTTP ${error.status}` : '',
            raw !== message ? raw : '',
        ].filter(Boolean).join('\n') || undefined,
    };
};

// Retries operate on the original modal snapshot, preserving successful rows
// and the caller's update mode. Requests remain sequential.
export const runClassroomAssignmentItems = async (
    targets: BatchClassroomAssignmentItem[],
    updateMode: UpdateMode,
    options: {
        previousItems?: BatchClassroomAssignmentItem[];
        apply: (calendarId: string, maxStudents: undefined, mode: UpdateMode) => Promise<any>;
        onChange: (items: BatchClassroomAssignmentItem[]) => void;
    }
) => {
    let items = [...(options.previousItems ?? targets)];
    const targetIds = new Set(targets.map(item => item.calendarId));
    items = items.map(item => targetIds.has(item.calendarId)
        ? { ...item, status: 'pending', message: 'Chờ xử lý', errorDetails: undefined }
        : item);
    options.onChange(items);
    const update = (calendarId: string, patch: Partial<BatchClassroomAssignmentItem>) => {
        items = items.map(item => item.calendarId === calendarId ? { ...item, ...patch } : item);
        options.onChange(items);
    };
    let successCount = 0, skippedCount = 0, failedCount = 0;
    for (const target of targets) {
        update(target.calendarId, { status: 'running', message: 'Đang tính toán và chia lớp...' });
        try {
            const response = await options.apply(target.calendarId, undefined, updateMode);
            const result = response?.data ?? response;
            const totalStudents = Number(result?.total_students || 0);
            const eligibleStudents = Number(result?.eligible_students || 0);
            const movedCount = Number(result?.moved_count || 0);
            if (totalStudents === 0 || (updateMode === 'unlearned_only' && eligibleStudents === 0)) {
                skippedCount++;
                update(target.calendarId, {
                    status: 'skipped', movedCount: 0,
                    message: totalStudents === 0
                        ? 'Chưa có danh sách học sinh nên chưa thể chia lớp.'
                        : 'Toàn bộ học sinh đã học (islearn = 1), giữ nguyên phân lớp.',
                });
            } else {
                successCount++;
                update(target.calendarId, {
                    status: 'success', movedCount,
                    message: movedCount
                        ? `Đã cập nhật phân lớp cho ${movedCount.toLocaleString('vi-VN')} học sinh.`
                        : 'Phân lớp hiện tại đã phù hợp, không cần thay đổi.',
                });
            }
        } catch (error) {
            failedCount++;
            update(target.calendarId, { status: 'error', ...assignmentError(error) });
        }
    }
    return { items, successCount, skippedCount, failedCount };
};
