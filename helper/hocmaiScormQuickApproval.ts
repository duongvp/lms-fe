import type { HocmaiScormPreviewRow } from '@/services/lessonService';

export const pickQuickApprovalLesson = (row: HocmaiScormPreviewRow) => {
    const sessions = row.candidateSessions || [];
    if (sessions.length !== 1) return undefined;
    const lessons = sessions[0].lessons;
    if (lessons.length === 1) return lessons[0];
    const occurrence = Number(row.occurrence || 1);
    if (!Number.isInteger(occurrence) || occurrence <= 0) return undefined;
    return lessons[occurrence - 1];
};

export const formatHocmaiSchedule = (value: string, occurrence: number) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(value || ''));
    const dateTime = match
        ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}`
        : String(value || '');
    return `Lịch ${occurrence || 1} · ${dateTime}`;
};
