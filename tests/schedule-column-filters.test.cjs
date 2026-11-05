const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require('../../lms-manage-api/node_modules/esbuild');
const load = (source, bindings = {}) => {
  const module = { exports: {} };
  vm.runInNewContext(transformSync(source, { loader: 'ts', format: 'cjs' }).code,
    { module, exports: module.exports, URLSearchParams, ...bindings });
  return module.exports;
};
const { buildScheduleColumnFilterParams, normalizeScheduleAssistants } = load(fs.readFileSync(path.join(__dirname, '../helper/scheduleColumnFilters.ts'), 'utf8'));

test('header selections reach the API as server filters, including multiple dates, assistants and progress states', async () => {
  const params = buildScheduleColumnFilterParams({
    live_date: ['10/11/2026', '12/11/2026'], assistant_teacher: ['alice', 'zoe'],
    lesson_status: ['Nghỉ học', 'Chưa bắt đầu'],
  });
  const source = fs.readFileSync(path.join(__dirname, '../services/livestreamService.ts'), 'utf8');
  const start = source.indexOf('export const getLivestreams =');
  const end = source.indexOf('\nexport ', start + 1);
  let request;
  const { getLivestreams } = load(source.slice(start, end), {
    API_BASE_URL: 'https://backend.test/livestreams',
    fetchInstance: async url => { request = new URL(url); return { data: { data: [] } }; },
    asCalendarWallTime: value => value,
  });
  await getLivestreams({ code: 'QA', page: 1, limit: 25, ...params });
  assert.equal(request.searchParams.get('live_dates'), '2026-11-10,2026-11-12');
  assert.equal(request.searchParams.get('assistant_teachers'), 'alice,zoe');
  assert.deepEqual(request.searchParams.get('progress_statuses').split(',').sort(), ['cancelled', 'upcoming']);
  assert.equal(request.searchParams.get('page'), '1');
});

test('cleared header selections send no stale server filters; empty assistant values remain selectable', () => {
  assert.equal(Object.keys(buildScheduleColumnFilterParams({ live_date: null, assistant_teacher: [], lesson_status: null })).length, 0);
  const params = buildScheduleColumnFilterParams({ live_date: ['-'], assistant_teacher: ['-'], lesson_status: ['-'] });
  assert.equal(params.live_dates[0], 'undated');
  assert.equal(params.assistant_teachers[0], '-');
  assert.equal(params.progress_statuses[0], 'unknown');
});

test('header choices request retains the complete top-filter scope', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../services/livestreamService.ts'), 'utf8');
  const start = source.indexOf('export const getCalendarHeaderFilterOptions =');
  const end = source.indexOf('\nexport const getCalendarTeacherFilterOptions', start);
  let request;
  const choices = { live_dates: [], assistant_teachers: ['-'], progress_statuses: ['completed'] };
  const { getCalendarHeaderFilterOptions } = load(source.slice(start, end), {
    API_BASE_URL: 'https://backend.test/livestreams',
    fetchInstance: async url => { request = new URL(url); return { data: choices }; },
  });
  const result = await getCalendarHeaderFilterOptions({
    code: 'QA', calendar_source: 'livestream', teacher: ['A', 'B'],
    start_time: '2026-11-01T00:00:00Z', end_time: '2026-11-10T23:59:59Z',
    weekdays: [1, 3], from_learn_number: 5, to_learn_number: 20,
    system_type: ['topclass'], time_status: ['completed'], keyword: 'Bài học',
  });
  assert.equal(result, choices);
  assert.equal(request.searchParams.get('teacher'), 'A,B');
  assert.equal(request.searchParams.get('start_time'), '2026-11-01T00:00:00Z');
  assert.equal(request.searchParams.get('end_time'), '2026-11-10T23:59:59Z');
  assert.equal(request.searchParams.get('weekdays'), '1,3');
  assert.equal(request.searchParams.get('from_learn_number'), '5');
  assert.equal(request.searchParams.get('to_learn_number'), '20');
  assert.equal(request.searchParams.get('time_status'), 'completed');
  assert.equal(request.searchParams.get('system_type'), 'topclass');
  assert.equal(request.searchParams.get('keyword'), 'Bài học');
  assert.equal(request.searchParams.has('page'), false);
  assert.equal(request.searchParams.has('limit'), false);
});


test('legacy assistant placeholders are never treated as staff usernames', () => {
  for (const value of [null, undefined, '', ' ', '[NULL]', ' null ', '-', [null, '[NULL]', '']]) {
    assert.equal(normalizeScheduleAssistants(value).length, 0);
  }
  assert.equal(JSON.stringify(normalizeScheduleAssistants('alice, [NULL], bob,alice')), JSON.stringify(['alice', 'bob']));
});
