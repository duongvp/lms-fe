export type ScheduleConflictLink = { id: number; href: string; label: string };

export const getScheduleConflictLinks = (error: any): ScheduleConflictLink[] => {
    const conflicts = Array.isArray(error?.detail?.conflicts) ? error.detail.conflicts : [];
    const links = new Map<number, ScheduleConflictLink>();
    for (const conflict of conflicts) {
        const id = Number(conflict?.id);
        if (!Number.isSafeInteger(id) || id <= 0) continue;
        const code = typeof conflict.code === 'string' ? conflict.code.trim() : '';
        const params = new URLSearchParams({ calendar_id: String(id) });
        if (code) params.set('program', code);
        if (conflict.calendar_source === 'feed' || /^feed-/i.test(code)) params.set('calendar_source', 'feed');
        const summary = [code, conflict.learn_number ? `Bài ${conflict.learn_number}` : '', conflict.lesson_name].filter(Boolean).join(' · ');
        links.set(id, { id, href: `/schedule?${params.toString()}`, label: `Mở lịch #${id}${summary ? ` — ${summary}` : ''}` });
    }
    // Compatibility with older API responses that only include conflict IDs in text.
    const message = typeof error?.message === 'string' ? error.message : '';
    for (const match of message.matchAll(/ID lịch\s+(\d+)/g)) {
        const id = Number(match[1]);
        if (!Number.isSafeInteger(id) || id <= 0 || links.has(id)) continue;
        links.set(id, { id, href: `/schedule?calendar_id=${id}`, label: `Mở lịch #${id}` });
    }
    return [...links.values()];
};
