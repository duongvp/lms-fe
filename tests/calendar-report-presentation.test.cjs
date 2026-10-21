const assert = require('node:assert/strict');
const test = require('node:test');
const vm = require('node:vm');
const path = require('node:path');
const esbuild = require('../../lms-manage-api/node_modules/esbuild');
async function load() {
  const result = await esbuild.build({ entryPoints: [path.resolve(__dirname, '../helper/calendarReportPresentation.ts')], bundle: true, write: false, platform: 'node', format: 'cjs' });
  const module = { exports: {} }; vm.runInNewContext(result.outputFiles[0].text, { module, exports: module.exports }); return module.exports;
}
test('attendance stays independent of missing duration and does not fabricate absence or join events', async () => {
  const p = await load();
  assert.equal(p.attendancePresentation('attended').label, 'Đủ chuyên cần');
  assert.equal(p.attendancePresentation('observed').label, 'Chưa đủ chuyên cần');
  assert.equal(p.attendancePresentation('observed').color, 'warning');
  assert.equal(p.attendancePresentation('unobserved').label, 'Chưa ghi nhận tham gia');
  assert.match(p.attendancePresentation('unobserved').description, /Chưa thể khẳng định/);
  assert.equal(p.attendancePresentation(undefined).label, 'Chưa đủ dữ liệu để đánh giá');
  for (const status of [0, 1, 2, null, 99]) {
    const e = { source: 'presence', metadata: { status } };
    assert.equal(p.eventLabels.presence, 'Ghi nhận hoạt động tham gia');
    assert.match(p.eventDescription(e), /chưa đủ căn cứ/);
    assert.doesNotMatch(p.eventDescription(e), /status|Socket/);
  }
});
test('friendly chat/quiz labels preserve actual content and unknown values stay unknown', async () => {
  const p = await load();
  assert.equal(p.roleLabel('teacher'), 'Giáo viên'); assert.equal(p.roleLabel('student'), 'Học sinh');
  assert.equal(p.roleLabel('new-role'), 'Chưa xác định vai trò');
  assert.equal(p.chatTypeLabel(3), 'Thông báo chung'); assert.match(p.chatTypeLabel(99), /chưa xác định/);
  assert.equal(p.chatStatusLabel('sent'), 'Đã gửi'); assert.match(p.chatStatusLabel('unknown'), /Chưa xác định/);
  assert.equal(p.eventDescription({ source: 'chat', content: '<script>original text</script>', metadata: {} }), '<script>original text</script>');
  assert.match(p.eventDescription({ source: 'chat', content: null, metadata: {} }), /Không còn nội dung/);
  const text = p.eventDescription({ source: 'quiz_submission', content: null, metadata: { score: '9', answer_seconds: 30 } });
  assert.match(text, /Điểm: 9/); assert.match(text, /30 giây/); assert.doesNotMatch(text, /answer_seconds|quiz_id/);
});
test('room names require a complete canonical match; assignment is never substituted for activity room', async () => {
  const p = await load(), calendar = { code: 'math', learn_number: 24, start_time: '2026-10-20T18:00:00Z' };
  const serial = Math.floor((Date.UTC(2026, 9, 20) - Date.UTC(1899, 11, 30)) / 86400000);
  for (const n of [1, 10, 12]) assert.equal(p.reportRoomLabel(`math${serial}24${n}`, calendar), `Phòng ${n}`);
  for (const raw of [null, 'something', `math${serial}2401`, `math${serial - 1}241`, `other${serial}241`]) assert.equal(p.reportRoomLabel(raw, calendar), 'Chưa xác định');
});
test('accuracy notes reflect this student, never infer ban/allow from restriction rows or expiry, diagnostics require admin', async () => {
  const p = await load();
  const report = { student: { attendance: 'attended', duration_minutes: null, last_leave: null, chat_count: 0 }, capabilities: { chat: true, moderation: false }, data_quality: { overlapping_calendar_ids: [], hidden_rules_available: null }, restriction_records: [] };
  let notes = p.studentAccuracyNotes(report).join(' ');
  assert.match(notes, /tổng thời gian học/); assert.doesNotMatch(notes, /chắc chắn vắng mặt|hạn chế chat đang/);
  report.student.attendance = 'unobserved'; report.capabilities.moderation = true; report.data_quality.hidden_rules_available = false;
  report.restriction_records = [{ expired_at: '2000-01-01', note: 'Old restriction' }];
  notes = p.studentAccuracyNotes(report).join(' ');
  assert.match(notes, /không đồng nghĩa/); assert.match(notes, /chưa đủ để kết luận tình trạng chat/);
  assert.doesNotMatch(notes, /status|Socket|roster|actor|updated_at/);
  for (const user of [undefined, { roles: ['teacher'], permissions: ['calendar.report.detail.view'] }, { permissions: ['calendar.report.moderation.view'] }]) assert.equal(p.canViewReportDiagnostics(user), false);
  for (const user of [{ roles: ['admin'] }, { roles: [{ code: 'admin' }] }, { permissions: ['*'] }]) assert.equal(p.canViewReportDiagnostics(user), true);
});

test('backend diagnostic errors never become ordinary UI text', async () => {
  const p = await load();
  assert.equal(p.reportErrorMessage({ message: 'Prisma error: users_block updated_at socket_session_id' }, 'Vui lòng thử lại.'), 'Vui lòng thử lại.');
  assert.match(p.reportErrorMessage({ status: 403 }, ''), /chưa được cấp quyền/);
  assert.match(p.reportErrorMessage({ status: 503 }, ''), /đang bận/);
});
