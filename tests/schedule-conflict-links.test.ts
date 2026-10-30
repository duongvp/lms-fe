import assert from 'node:assert/strict';
import test from 'node:test';
import { getScheduleConflictLinks } from '../helper/scheduleConflictLinks';

test('structured conflicts link to exact calendar and program, retaining Feed source', () => {
    const [link] = getScheduleConflictLinks({ detail: { conflicts: [{ id: 735, code: 'feed-QA & demo', learn_number: 21, lesson_name: 'Bài QA' }] } });
    const url = new URL(link.href, 'https://test.invalid');
    assert.equal(url.searchParams.get('calendar_id'), '735');
    assert.equal(url.searchParams.get('program'), 'feed-QA & demo');
    assert.equal(url.searchParams.get('calendar_source'), 'feed');
    assert.match(link.label, /#735.*Bài 21.*Bài QA/);
});

test('legacy error text creates links, deduplicates IDs and preserves structured metadata', () => {
    const links = getScheduleConflictLinks({ message: 'ID lịch 735; ID lịch 736; ID lịch 735', detail: { conflicts: [{ id: 735, code: 'QA' }] } });
    assert.deepEqual(links.map(link => link.id), [735, 736]);
    assert.match(links[0].href, /program=QA/);
    assert.equal(links[1].href, '/schedule?calendar_id=736');
});

test('ignores invalid IDs and errors without schedules', () => {
    assert.deepEqual(getScheduleConflictLinks({ detail: { conflicts: [{ id: -1 }, { id: 'bad' }, null] } }), []);
    assert.deepEqual(getScheduleConflictLinks(new Error('Network failed')), []);
});

test('name-only mismatch opens exact program lesson in curriculum management', () => {
    const links = getScheduleConflictLinks({ detail: { conflicts: [{
        id: 735, code: 'QA & lesson', learn_number: 21, lesson_name: 'Bài cũ',
        shared_schedule_mismatch: ['Tên bài không khớp: lịch đang thao tác “Bài mới”; lịch đối chiếu “Bài cũ”.'],
    }] } });
    assert.equal(links.length, 1);
    assert.equal(links[0].kind, 'lesson');
    const url = new URL(links[0].href, 'https://test.invalid');
    assert.equal(url.pathname, '/lessons');
    assert.equal(url.searchParams.get('program'), 'QA & lesson');
    assert.equal(url.searchParams.get('from_learn_number'), '21');
    assert.equal(url.searchParams.get('to_learn_number'), '21');
});

test('mixed name and time mismatch offers two separate repair destinations', () => {
    const links = getScheduleConflictLinks({ detail: { conflicts: [{
        id: 735, code: 'QA', learn_number: 21,
        shared_schedule_mismatch: ['Tên bài không khớp', 'Giờ kết thúc không khớp'],
    }] } });
    assert.deepEqual(links.map(link => link.kind), ['lesson', 'schedule']);
    assert.match(links[1].href, /calendar_id=735/);
    assert.match(links[1].label, /Sửa thời gian/);
});

test('legacy name mismatch also directs to exact curriculum lesson', () => {
    const links = getScheduleConflictLinks({ message: '• Giáo viên QA: khóa QA, Bài 21, ID lịch 735 (02/11/2026 21:30)\n  Đã bật cho phép trùng nhưng chưa đủ điều kiện:\n  - Tên bài không khớp: A và B.' });
    assert.equal(links.length, 1);
    assert.equal(links[0].kind, 'lesson');
    assert.match(links[0].href, /from_learn_number=21/);
});
