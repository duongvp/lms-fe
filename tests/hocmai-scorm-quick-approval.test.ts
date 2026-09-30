import assert from 'node:assert/strict';
import test from 'node:test';
import { formatHocmaiSchedule, pickQuickApprovalLesson } from '../helper/hocmaiScormQuickApproval';
import type { HocmaiScormPreviewRow } from '../services/lessonService';

const row = (occurrence: number, lessons: Array<{ lessonId: string; name: string }>, sessionCount = 1) => ({
    key: 'row-' + occurrence,
    learnNumber: 1,
    lessonName: 'Mở đầu về Khoa học tự nhiên.',
    teacherName: 'Nguyễn Mỹ Hạnh',
    scheduleTime: occurrence === 1 ? '2026-08-25T20:00:00.000Z' : '2026-08-28T20:00:00.000Z',
    occurrence,
    status: 'skipped',
    candidateSessions: Array.from({ length: sessionCount }, (_, index) => ({
        key: 'session-' + index,
        name: 'THÁNG 08/2026',
        lessons,
    })),
}) satisfies HocmaiScormPreviewRow;

const duplicateLessons = [
    { lessonId: '167665', name: 'Mở đầu về Khoa học tự nhiên_Cô Nguyễn Mỹ Hạnh' },
    { lessonId: '167666', name: 'Mở đầu về Khoa học tự nhiên_Cô Nguyễn Mỹ Hạnh' },
];

test('Lịch 1 và Lịch 2 chọn đúng ứng viên theo occurrence', () => {
    assert.equal(pickQuickApprovalLesson(row(1, duplicateLessons))?.lessonId, '167665');
    assert.equal(pickQuickApprovalLesson(row(2, duplicateLessons))?.lessonId, '167666');
});

test('một Lesson duy nhất được dùng chung cho mọi occurrence', () => {
    assert.equal(pickQuickApprovalLesson(row(2, duplicateLessons.slice(0, 1)))?.lessonId, '167665');
});

test('không duyệt nhanh khi nhiều session hoặc occurrence vượt số ứng viên', () => {
    assert.equal(pickQuickApprovalLesson(row(1, duplicateLessons, 2)), undefined);
    assert.equal(pickQuickApprovalLesson(row(3, duplicateLessons)), undefined);
});

test('hiển thị rõ Lịch n và thời gian mà không đổi múi giờ DB', () => {
    assert.equal(
        formatHocmaiSchedule('2026-08-28T20:00:00.000Z', 2),
        'Lịch 2 · 28/08/2026 20:00',
    );
});
