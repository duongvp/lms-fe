export type ScheduleConflictLink = {
    id: number;
    href: string;
    label: string;
    kind: 'lesson' | 'schedule';
    summary: string;
    reasons: string[];
};

export const getScheduleConflictLinks = (error: any): ScheduleConflictLink[] => {
    const conflicts = Array.isArray(error?.detail?.conflicts) ? error.detail.conflicts : [];
    const links = new Map<string, ScheduleConflictLink>();
    const knownIds = new Set<number>();
    const addConflict = (conflict: any) => {
        const id = Number(conflict?.id);
        if (!Number.isSafeInteger(id) || id <= 0) return;
        knownIds.add(id);
        const code = typeof conflict.code === 'string' ? conflict.code.trim() : '';
        const lesson = Number(conflict.learn_number);
        const hasLesson = Boolean(code && Number.isSafeInteger(lesson) && lesson > 0);
        const reasons: string[] = Array.isArray(conflict.shared_schedule_mismatch)
            ? conflict.shared_schedule_mismatch.filter((value: unknown): value is string => typeof value === 'string') : [];
        const nameMismatch = reasons.some(reason => /Tên bài|Thiếu tên bài/.test(reason));
        const otherMismatch = reasons.some(reason => !/Tên bài|Thiếu tên bài/.test(reason));
        const detail = [code, hasLesson ? `Bài ${lesson}` : '', conflict.lesson_name].filter(Boolean).join(' · ');
        const summary = `Lịch #${id}${detail ? ` · ${detail}` : ''}`;
        if (nameMismatch && hasLesson) {
            const params = new URLSearchParams({ program: code, from_learn_number: String(lesson), to_learn_number: String(lesson) });
            links.set(`${id}-lesson`, {
                id, kind: 'lesson', summary, reasons,
                href: `/lessons?${params.toString()}`,
                label: `Sửa tên Bài ${lesson} trong Quản lý đề cương`,
            });
        }
        if (!nameMismatch || !hasLesson || otherMismatch) {
            const params = new URLSearchParams({ calendar_id: String(id) });
            if (code) params.set('program', code);
            if (conflict.calendar_source === 'feed' || /^feed-/i.test(code)) params.set('calendar_source', 'feed');
            links.set(`${id}-schedule`, {
                id, kind: 'schedule', summary, reasons,
                href: `/schedule?${params.toString()}`,
                label: reasons.some(reason => /Giờ bắt đầu|Giờ kết thúc/.test(reason))
                    ? `Sửa thời gian lịch #${id}` : `Mở lịch #${id}${detail ? ` — ${detail}` : ''}`,
            });
        }
    };
    conflicts.forEach(addConflict);
    // Older API responses only contain text. Recover the program/lesson and
    // mismatch details from each conflict block when available.
    const message: string = typeof error?.message === 'string' ? error.message : '';
    for (const match of message.matchAll(/ID lịch\s+(\d+)/g)) {
        const id = Number(match[1]);
        if (knownIds.has(id)) continue;
        const lineStart = message.lastIndexOf('\n', match.index) + 1;
        const end = message.indexOf('\n', match.index);
        const lineEnd = end < 0 ? message.length : end;
        const line = message.slice(lineStart, lineEnd);
        const nextBlock = message.indexOf('\n•', lineEnd);
        const block = message.slice(lineEnd, nextBlock < 0 ? message.length : nextBlock);
        addConflict({
            id,
            code: line.match(/khóa\s+([^,\s]+)/)?.[1],
            learn_number: line.match(/Bài\s+(\d+)/)?.[1],
            shared_schedule_mismatch: block.split('\n').map(value => value.trim()).filter(value => value.startsWith('- ')).map(value => value.slice(2)),
        });
    }
    return [...links.values()];
};
