const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../app/(admin)/lessons/components/Modal/HocmaiScormNameSyncModal.tsx'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve)); };
const row = { key: '12::9154::1777', learnNumber: 12, teacherName: 'A', lessonName: 'Tên không khớp',
  packageId: '9154', courseId: '1777', status: 'skipped', occurrence: 1, scheduleTime: '2026-08-02' };
const other = { ...row, key: '13::9177::3367', packageId: '9177', courseId: '3367' };
const list = (target, lessons) => ({ data: { rowKey: target.key, packageId: target.packageId, courseId: target.courseId, lessons } });
function mount() {
  const values = [], deps = [], pendingEffects = [], cleanups = [];
  let cursor = 0, dirty = false, tree;
  const calls = [], requests = [], resolves = [], errors = [], previewCalls = [], applyCalls = [];
  const element = (type, props) => ({ type, props: props || {} });
  const antd = Object.fromEntries(['Alert', 'Button', 'Descriptions', 'Input', 'Modal', 'Progress', 'Space', 'Tag'].map(name => [name, name]));
  antd.Typography = { Text: 'Text', Paragraph: 'Paragraph' }; antd.Descriptions = Object.assign(() => {}, { Item: 'Item' });
  const modules = {
    'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'Fragment' },
    react: {
      useState(initial) { const index = cursor++; if (!(index in values)) values[index] = initial;
        return [values[index], next => { const value = typeof next === 'function' ? next(values[index]) : next;
          if (!Object.is(value, values[index])) { values[index] = value; dirty = true; } }]; },
      useRef(initial) { const index = cursor++; return values[index] ||= { current: initial }; },
      useMemo(fn) { cursor++; return fn(); },
      useEffect(fn, next) { const index = cursor++; if (!deps[index] || next.some((value, n) => !Object.is(value, deps[index][n]))) {
        deps[index] = next; pendingEffects.push(() => { cleanups[index]?.(); cleanups[index] = fn(); }); } },
    },
    antd,
    '@/components/ui/MobileSelect': { default: 'Select', __esModule: true },
    '@/components/ui/ModalTable': { default: 'Table', __esModule: true },
    '@/helper/hocmaiScormQuickApproval': { pickQuickApprovalLesson: () => undefined, formatHocmaiSchedule: () => '' },
    '@/services/lessonService': {
      getHocmaiScormTeachers: async () => ({ data: [{ key: 'dao thi hong anh', name: 'Đào Thị Hồng Anh', prefix: '' }, { key: 'nguyen van binh', name: 'Nguyễn Văn Bình', prefix: '' }] }),
      previewHocmaiScormNames: async (program, options) => { previewCalls.push({ program, options }); return { data: { rows: [row, other], warnings: [], skippedCount: 2, updateCount: 0 } }; },
      applyHocmaiScormNames: async (program, overrides, options) => { applyCalls.push({ program, overrides, options }); return { data: { id: 'job' } }; },
      getHocmaiScormNameSyncStatus: async () => ({ data: { status: 'completed', updated: 1, total: 1 } }),
      getManualHocmaiScormLessons: (program, key) => new Promise((resolve, reject) => { calls.push([program, key]); requests.push({ resolve, reject }); }),
      resolveManualHocmaiScormLesson: (program, key, id, options) => new Promise(resolve => { resolves.push({ program, key, id, options, resolve }); }),
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: name => { if (!(name in modules)) throw Error(name); return modules[name]; }, setTimeout: callback => { queueMicrotask(callback); return 1; } });
  const props = { open: true, programCode: 'nguvan-7-2027', onClose() {}, onSuccess() {}, onError: error => errors.push(error) };
  const render = () => { let count = 0; do { dirty = false; cursor = 0; tree = exports.default(props);
    pendingEffects.splice(0).forEach(run => run()); if (++count > 20) throw Error('Render loop'); } while (dirty); };
  const nodes = (node) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes)
    : [node, ...nodes(node.props?.children)];
  const get = (type, predicate = () => true) => nodes(tree).find(node => node.type === type && predicate(node.props));
  const main = () => get('Modal', p => p.title === 'Đồng bộ tên SCORM từ HOCMAI');
  const manual = () => get('Modal', p => p.title === 'Xử lý thủ công Lesson HOCMAI');
  const select = () => get('Select', p => p.placeholder?.includes('Lesson') && p.style?.width === '100%');
  render();
  return { calls, requests, resolves, errors, previewCalls, applyCalls, props, render, nodes, get, main, manual, select,
    async preview() { main().props.onOk(); await flush(); render(); },
    open(target = row) { const table = get('Table'); const column = table.props.columns.find(c => c.title === 'Kết quả');
      const rendered = column.render(null, target); const button = nodes(rendered).find(n => n.type === 'Button' && n.props.children === 'Chọn Lesson HOCMAI');
      button.props.onClick(); render(); },
    async settle() { await flush(); render(); },
    cleanup() { cleanups.forEach(fn => fn?.()); },
  };
}

test('manual selector loads every lesson for the row, searches by label and validates the selected ID', async () => {
  const s = mount();
  try {
    await s.preview(); s.open();
    assert.deepEqual(s.calls[0], ['nguvan-7-2027', row.key]);
    assert.equal(s.manual().props.okButtonProps.disabled, true);
    s.requests[0].resolve(list(row, [
      { lessonId: '100', name: 'Khác tên_Giáo viên B', sectionName: 'Tháng 6' },
      { lessonId: '101', name: 'Bài khác_Giáo viên C', sectionName: 'Tháng 7' },
    ])); await s.settle();
    const select = s.select();
    assert.equal(select.props.options.length, 2);
    assert.equal(select.props.showSearch, true); assert.equal(select.props.optionFilterProp, 'label');
    assert.match(select.props.options[1].label, /Tháng 7.*101.*Bài khác/);
    select.props.onChange('101'); s.render(); s.manual().props.onOk();
    assert.equal(s.resolves[0].id, '101');
    s.resolves[0].resolve({ data: { rowKey: row.key, lessonId: '101', currentName: 'Bài khác', suggestedName: 'Tên dự kiến', packageId: '9154', courseId: '1777' } });
    await s.settle(); assert.equal(s.manual().props.okText, 'Áp dụng vào preview');
    assert.deepEqual(s.errors, []);
  } finally { s.cleanup(); }
});

test('late outline response from the previous row cannot replace the new row list', async () => {
  const s = mount();
  try {
    await s.preview(); s.open(); s.open(other);
    s.requests[1].resolve(list(other, [{ lessonId: '200', name: 'Bài mới' }])); await s.settle();
    s.requests[0].resolve(list(row, [{ lessonId: '100', name: 'Bài cũ' }])); await s.settle();
    assert.equal(s.select().props.options[0].value, '200');
    assert.equal(s.select().props.options.length, 1);
  } finally { s.cleanup(); }
});

test('loading errors support retry and empty lists cannot be applied', async () => {
  const s = mount();
  try {
    await s.preview(); s.open();
    s.requests[0].reject(new Error('HMO_TIMEOUT')); await s.settle();
    assert.equal(s.manual().props.okButtonProps.disabled, true);
    const alert = s.get('Alert', p => p.type === 'error'); assert.equal(alert.props.message, 'HMO_TIMEOUT');
    alert.props.action.props.onClick(); s.render();
    assert.equal(s.requests.length, 2);
    s.requests[1].resolve(list(row, [])); await s.settle();
    assert.equal(s.select().props.options.length, 0);
    assert.equal(s.manual().props.okButtonProps.disabled, true);
  } finally { s.cleanup(); }
});

test('closing the editor invalidates a pending resolution before another row is opened', async () => {
  const s = mount();
  try {
    await s.preview(); s.open();
    s.requests[0].resolve(list(row, [{ lessonId: '100', name: 'Bài cũ' }])); await s.settle();
    s.select().props.onChange('100'); s.render(); s.manual().props.onOk();
    s.manual().props.onCancel(); s.render(); s.open(other);
    s.requests[1].resolve(list(other, [{ lessonId: '200', name: 'Bài mới' }])); await s.settle();
    s.resolves[0].resolve({ data: { lessonId: '100', suggestedName: 'Tên cũ' } }); await s.settle();
    assert.equal(s.manual().props.okText, 'Kiểm tra Lesson đã chọn');
    assert.equal(s.select().props.value, undefined);
  } finally { s.cleanup(); }
});


test('missing honorific must be selected before applying the full teacher name to preview', async () => {
  const s = mount();
  try {
    await s.preview(); s.open();
    s.requests[0].resolve(list(row, [{ lessonId: '100', name: 'Bài không có giáo viên' }])); await s.settle();
    s.select().props.onChange('100'); s.render(); s.manual().props.onOk();
    s.resolves[0].resolve({ data: { rowKey: row.key, lessonId: '100', currentName: 'Bài không có giáo viên',
      suggestedName: '', baseName: 'Tên bài', teacherName: 'Đào Thị Hồng Anh', requiresHonorific: true,
      packageId: row.packageId, courseId: row.courseId } });
    await s.settle();
    assert.equal(s.manual().props.okButtonProps.disabled, true);
    const titleSelect = s.get('Select', p => p.placeholder === 'Chọn Cô hoặc Thầy');
    titleSelect.props.onChange('Cô'); s.render();
    assert.equal(s.manual().props.okButtonProps.disabled, false);
    const nameInput = s.get('Input', p => p.value === 'Tên bài_Cô Đào Thị Hồng Anh');
    assert.ok(nameInput);
    s.manual().props.onOk(); s.render();
    assert.equal(s.manual().props.open, false);
    assert.deepEqual(s.errors, []);
  } finally { s.cleanup(); }
});


test('an automatically mapped ID is preselected for manual honorific handling', async () => {
  const s = mount();
  try {
    await s.preview(); s.open({ ...row, hocmaiLessonId: '100' });
    s.requests[0].resolve(list(row, [{ lessonId: '100', name: 'Bài đã tìm được ID' }])); await s.settle();
    assert.equal(s.select().props.value, '100');
    s.manual().props.onOk();
    assert.equal(s.resolves[0].id, '100');
  } finally { s.cleanup(); }
});


test('program teachers accept prefixes and changing the matching mode invalidates the old preview', async () => {
  const s = mount();
  try {
    await s.settle();
    const prefix = s.get('Input', p => p['aria-label'] === 'Tiền tố Đào Thị Hồng Anh');
    assert.ok(prefix);
    prefix.props.onChange({ target: { value: 'Cô' } }); s.render();
    await s.preview();
    assert.equal(s.previewCalls[0].options.matchingMode, 'name_teacher');
    assert.equal(s.previewCalls[0].options.teacherPrefixes['dao thi hong anh'], 'Cô');
    const mode = s.get('Select', p => p.options?.some(option => option.value === 'lesson_id'));
    mode.props.onChange('lesson_id'); s.render();
    assert.equal(s.main().props.okText, 'Tạo bản xem trước');
    assert.equal(s.get('Table'), undefined);
    await s.preview();
    assert.equal(s.previewCalls[1].options.matchingMode, 'lesson_id');
    assert.equal(s.previewCalls[1].options.teacherPrefixes['dao thi hong anh'], 'Cô');
    s.get('Input', p => p['aria-label'] === 'Tiền tố Đào Thị Hồng Anh').props.onChange({ target: { value: 'TS.' } }); s.render();
    assert.equal(s.main().props.okText, 'Tạo bản xem trước');
  } finally { s.cleanup(); }
});

test('manual check and apply carry the exact mode and teacher prefixes used by preview', async () => {
  const s = mount();
  try {
    await s.settle();
    s.get('Select', p => p.options?.some(option => option.value === 'lesson_id')).props.onChange('lesson_id'); s.render();
    s.get('Input', p => p['aria-label'] === 'Tiền tố Đào Thị Hồng Anh').props.onChange({ target: { value: 'Cô' } }); s.render();
    await s.preview(); s.open();
    s.requests[0].resolve(list(row, [{ lessonId: '100', name: 'Bài' }])); await s.settle();
    s.select().props.onChange('100'); s.render(); s.manual().props.onOk();
    assert.equal(s.resolves[0].options.matchingMode, 'lesson_id');
    assert.equal(s.resolves[0].options.teacherPrefixes['dao thi hong anh'], 'Cô');
    s.resolves[0].resolve({ data: { rowKey: row.key, lessonId: '100', suggestedName: 'Bài_Cô Đào Thị Hồng Anh', packageId: row.packageId, courseId: row.courseId } });
    await s.settle(); s.manual().props.onOk(); s.render();
    s.main().props.onOk(); await s.settle();
    assert.equal(s.applyCalls[0].options.matchingMode, s.previewCalls[0].options.matchingMode);
    assert.deepEqual(s.applyCalls[0].options.teacherPrefixes, s.previewCalls[0].options.teacherPrefixes);
  } finally { s.cleanup(); }
});
