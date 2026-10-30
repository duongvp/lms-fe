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
