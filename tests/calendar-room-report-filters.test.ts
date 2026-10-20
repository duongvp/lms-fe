import assert from 'node:assert/strict';
import test from 'node:test';
import dayjs from 'dayjs';
import { buildCalendarRoomReportParams } from '../helper/scheduleFilters';

test('report uses the program currently selected, date filters and checked schedule IDs', () => {
    const params = buildCalendarRoomReportParams({
        code: 'feed-tramtiepsuctrithuc', calendar_source: 'livestream',
        date_range: [dayjs('2026-10-14'), dayjs('2026-10-18')], teacher: ['teacher-a'],
    }, { learn_numbers: [1, 3] }, ['4836', 4837]);
    assert.equal(params.code, 'feed-tramtiepsuctrithuc');
    assert.equal(params.calendar_source, 'feed');
    assert.deepEqual(params.calendar_ids, [4836, 4837]);
    assert.deepEqual(params.learn_numbers, [1, 3]);
    assert.equal(params.teacher, 'teacher-a');
    assert.equal(params.start_time, '2026-10-14T00:00:00.000Z');
    assert.equal(params.end_time, '2026-10-18T23:59:59.999Z');
});

test('local column filters restrict report scope, including an empty result; clearing selection restores filter scope', () => {
    assert.deepEqual(buildCalendarRoomReportParams({}, {}, [], [12]).calendar_ids, [12]);
    assert.deepEqual(buildCalendarRoomReportParams({}, {}, [], []).calendar_ids, []);
    assert.deepEqual(buildCalendarRoomReportParams({}, {}, [13], [12, 13]).calendar_ids, [13]);
    assert.equal(buildCalendarRoomReportParams({}, {}, []).calendar_ids, undefined);
});
