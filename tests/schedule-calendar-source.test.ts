import assert from 'node:assert/strict';
import test from 'node:test';
import dayjs from 'dayjs';
import { cleanFilterValues, buildScheduleApiParams, buildScheduleUrl } from '../helper/scheduleFilters';
import { withProgramContext } from '../components/layouts/AdminLayout/SideMenu';

test('link chuyển từ đề cương sang lịch học mang đúng nguồn của chương trình', () => {
    for (const [program, source] of [['feed-tramtiepsuctrithuc', 'feed'], ['toan-12-2027', 'livestream']]) {
        const url = new URL(withProgramContext('/schedule', program), 'https://example.test');
        assert.equal(url.searchParams.get('program'), program);
        assert.equal(url.searchParams.get('calendar_source'), source);
    }
});

test('link cũ chỉ có program và link lưu sai nguồn đều được sửa trước khi gọi API', () => {
    for (const calendar_source of [undefined, 'livestream', 'feed'] as const) {
        const values = { code: 'feed-tramtiepsuctrithuc', calendar_source };
        assert.equal(cleanFilterValues(values).calendar_source, 'feed');
        assert.equal(buildScheduleApiParams(values).calendar_source, 'feed');
        const url = new URL(buildScheduleUrl(values), 'https://example.test');
        assert.equal(url.searchParams.get('program'), values.code);
        assert.equal(url.searchParams.get('calendar_source'), 'feed');
    }
});

test('chuyển về chương trình Livestream không giữ nhầm nguồn Feed', () => {
    const values = { code: 'toan-12-2027', calendar_source: 'feed' as const };
    assert.equal(buildScheduleApiParams(values).calendar_source, 'livestream');
    const url = new URL(buildScheduleUrl(values), 'https://example.test');
    assert.equal(url.searchParams.get('calendar_source'), null);
    const link = new URL(withProgramContext('/schedule?calendar_source=feed', values.code), 'https://example.test');
    assert.equal(link.searchParams.get('calendar_source'), 'livestream');
});

test('xem liên chương trình vẫn giữ nguồn được chọn và giữ nguyên các bộ lọc khác', () => {
    const values = {
        calendar_source: 'feed' as const, keyword: 'bài tập', teacher: ['GV1', 'GV2'],
        date_range: [dayjs('2026-10-18'), dayjs('2026-10-19')] as [dayjs.Dayjs, dayjs.Dayjs],
        from_learn_number: 2, to_learn_number: 5,
    };
    const params = buildScheduleApiParams(values);
    assert.equal(params.calendar_source, 'feed');
    assert.equal(params.teacher, 'GV1,GV2');
    const url = new URL(buildScheduleUrl(values, 3), 'https://example.test');
    assert.equal(url.searchParams.get('calendar_source'), 'feed');
    assert.equal(url.searchParams.get('q'), 'bài tập');
    assert.equal(url.searchParams.get('from'), '2026-10-18');
    assert.equal(url.searchParams.get('to'), '2026-10-19');
    assert.equal(url.searchParams.get('from_learn_number'), '2');
    assert.equal(url.searchParams.get('to_learn_number'), '5');
    assert.equal(url.searchParams.get('page'), '3');
    assert.equal(buildScheduleApiParams({}).calendar_source, 'livestream');
});

test('nguồn lịch lưu trong session cũ không ghi đè nguồn của chương trình khi chuyển trang', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: {
        sessionStorage: { getItem: () => '/schedule?program=feed-tramtiepsuctrithuc&calendar_source=livestream&q=test&page=2' },
    } });
    try {
        const url = new URL(withProgramContext('/schedule', 'feed-tramtiepsuctrithuc'), 'https://example.test');
        assert.equal(url.searchParams.get('calendar_source'), 'feed');
        assert.equal(url.searchParams.get('q'), 'test');
        assert.equal(url.searchParams.get('page'), '2');
    } finally {
        if (descriptor) Object.defineProperty(globalThis, 'window', descriptor);
        else Reflect.deleteProperty(globalThis, 'window');
    }
});
