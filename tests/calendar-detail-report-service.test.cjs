const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const vm = require('node:vm');
const esbuild = require('../../lms-manage-api/node_modules/esbuild');

test('detail client retains calendar/room/filter scope; exports start at first page and snapshot uses its own endpoint', async () => {
  const requests = [], result = await esbuild.build({
    entryPoints: [path.resolve(__dirname, '../services/calendarDetailReportService.ts')], bundle: true, write: false, platform: 'node', format: 'cjs',
    define: { 'process.env.NEXT_PUBLIC_BACKEND_API_URL': '"https://backend.test"' },
    plugins: [{ name: 'mock-transport', setup(build) {
      build.onResolve({ filter: /^@\/ultils\/fetchInstance$/ }, () => ({ path: 'transport', namespace: 'test' }));
      build.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const fetchInstance = async (url, options, kind) => {globalThis.requests.push({url,options,kind});return kind === "blob" ? {} : {data:{rows:[]}}}', loader: 'js' }));
    } }],
  });
  const module = { exports: {} };
  vm.runInNewContext(result.outputFiles[0].text, { module, exports: module.exports, requests, URLSearchParams,
    URL: { createObjectURL: () => 'blob:fixture', revokeObjectURL() {} }, setTimeout: () => 0,
    document: { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } },
  });
  const service = module.exports;
  await service.getDetailStudents(12, { room_id: 10, q: 'Học sinh A', attendance: 'observed', page: 2, limit: 50 });
  let url = new URL(requests.at(-1).url);
  assert.equal(url.pathname, '/api/livestreams/room-report/calendars/12/students');
  assert.equal(url.searchParams.get('room_id'), '10'); assert.equal(url.searchParams.get('q'), 'Học sinh A'); assert.equal(url.searchParams.get('page'), '2');
  await service.exportDetailReport(12, 99, { room_id: 10, source: 'chat', q: 'hello', cursor: 'old-cursor', page: 3 });
  url = new URL(requests.at(-1).url);
  assert.equal(url.pathname, '/api/livestreams/room-report/calendars/12/students/99/export');
  assert.equal(url.searchParams.get('source'), 'chat'); assert.equal(url.searchParams.get('q'), 'hello');
  assert.equal(url.searchParams.has('cursor'), false); assert.equal(url.searchParams.has('page'), false);
  await service.downloadDetailReport(12, 99, { room_id: 'unassigned', source: 'restriction_snapshot' });
  url = new URL(requests.at(-1).url);
  assert.equal(url.pathname, '/api/livestreams/room-report/calendars/12/students/99/export-restrictions');
  assert.equal(url.searchParams.get('room_id'), 'unassigned'); assert.equal(url.searchParams.has('source'), false);
});
