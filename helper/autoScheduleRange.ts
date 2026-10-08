type SchedulingLessonRange = {
    learn_number: number;
    scheduled_count?: number;
};

export const getLessonRangeFieldError = (
    value: unknown, field: 'from' | 'to', max: number, from?: unknown
): string | undefined => {
    if (value === undefined || value === null || value === '') {
        return field === 'from' ? 'Nhập bài bắt đầu' : 'Nhập bài kết thúc';
    }
    const number = Number(value);
    if (!Number.isInteger(number) || number < 1 || number > max) {
        return `Nhập số bài nguyên từ 1 đến ${max}`;
    }
    const fromNumber = Number(from);
    if (field === 'to' && Number.isInteger(fromNumber) && fromNumber >= 1 && fromNumber <= max && number < fromNumber) {
        return 'Đến bài phải lớn hơn hoặc bằng Từ bài';
    }
};

export const createDeferredRangeUpdate = (delay = 300) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending: (() => void) | undefined;
    const cancel = () => {
        clearTimeout(timer);
        timer = undefined;
        pending = undefined;
    };
    const flush = () => {
        const action = pending;
        cancel();
        action?.();
    };
    return {
        cancel,
        flush,
        schedule: (action: () => void) => {
            cancel();
            pending = action;
            timer = setTimeout(flush, delay);
        },
    };
};

export const getDefaultLessonRange = (lessons: SchedulingLessonRange[]) => {
    const validLessons = lessons.filter((lesson) => (
        Number.isInteger(Number(lesson.learn_number)) && Number(lesson.learn_number) > 0
    ));
    const remaining = validLessons.filter((lesson) => Number(lesson.scheduled_count || 0) === 0);
    if (!remaining.length) return { from_learn_number: undefined, to_learn_number: undefined };
    return {
        from_learn_number: Math.min(...remaining.map((lesson) => Number(lesson.learn_number))),
        to_learn_number: Math.max(...remaining.map((lesson) => Number(lesson.learn_number))),
    };
};

export const selectLessonsInRange = <T extends SchedulingLessonRange>(
    lessons: T[], from: number, to: number
): T[] => lessons.filter((lesson) => (
    Number(lesson.scheduled_count || 0) === 0
    && Number(lesson.learn_number) >= from
    && Number(lesson.learn_number) <= to
));

export const validateLessonRange = (from: number, to: number) => {
    if (!Number.isInteger(from) || from <= 0 || !Number.isInteger(to) || to < from) {
        throw new Error("Khoảng bài không hợp lệ. Nhập số bài nguyên dương và Đến bài phải lớn hơn hoặc bằng Từ bài.");
    }
};
