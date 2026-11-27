const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { transformSync } = require('../../lms-manage-api/node_modules/esbuild');

// Execute the production navigation helpers without mounting the menu UI.
const source = fs.readFileSync(path.join(__dirname, '../components/layouts/AdminLayout/SideMenu.tsx'), 'utf8');
const helpers = source.slice(source.indexOf('export const PROGRAM_CONTEXT_PATHS'), source.indexOf('// Tạo menu items'));
const createContext = () => {
    const storage = new Map();
    const module = { exports: {} };
    vm.runInNewContext(transformSync(helpers, { loader: 'ts', format: 'cjs' }).code, {
        module, exports: module.exports, URL, URLSearchParams,
        window: {
            location: { origin: 'https://lms.test' },
            sessionStorage: { setItem: (key, value) => storage.set(key, value), getItem: key => storage.get(key) ?? null },
        },
        useAuthStore: { getState: () => ({ currentProgram: 'van-9-2027' }) },
        calendarSourceFromCode: code => code.startsWith('feed-') ? 'feed' : 'livestream',
    });
    return { ...module.exports, storage };
};
const parse = url => new URL(url, 'https://lms.test');

for (const pathname of ['/lessons', '/schedule', '/quizzes']) {
    test(`${pathname}: navigation restores filters without remembering search`, () => {
        const { rememberProgramContextUrl, withProgramContext, storage } = createContext();
        const filters = new URLSearchParams({ program: 'van-9-2027', from_learn_number: '2', to_learn_number: '8', page: '3', q: 'ôn tập văn chương' });
        if (pathname === '/schedule') {
            filters.set('from', '2026-11-01');
            filters.set('to', '2026-11-30');
            filters.set('teacher', 'gv1,gv2');
            filters.set('weekdays', '2,4');
        } else {
            filters.set('taught_status', 'untaught');
        }
        rememberProgramContextUrl(`${pathname}?${filters}`);
        assert.equal(parse([...storage.values()][0]).searchParams.has('q'), false);
        const restored = parse(withProgramContext(pathname)).searchParams;
        for (const [key, value] of filters) {
            if (key !== 'q') assert.equal(restored.get(key), value, key);
        }
        assert.equal(restored.has('q'), false);
        // Navigating to the other module and back must also keep search empty.
        const other = pathname === '/lessons' ? '/schedule' : '/lessons';
        rememberProgramContextUrl(`${other}?program=van-9-2027&q=khác`);
        assert.equal(parse(withProgramContext(other)).searchParams.has('q'), false);
        assert.equal(parse(withProgramContext(pathname)).searchParams.has('q'), false);
    });

    test(`${pathname}: legacy session search is ignored; explicit search links still work`, () => {
        const { withProgramContext, storage } = createContext();
        storage.set(`lms:filters:${pathname}:van-9-2027`, `${pathname}?program=van-9-2027&q=old&grade=9`);
        const restored = parse(withProgramContext(`${pathname}#details`));
        assert.equal(restored.searchParams.has('q'), false);
        assert.equal(restored.searchParams.get('grade'), '9');
        assert.equal(restored.hash, '#details');
        assert.equal(parse(withProgramContext(`${pathname}?q=explicit`)).searchParams.get('q'), 'explicit');
    });
}

test('cross-program schedule filters also omit search', () => {
    const { rememberProgramContextUrl, withProgramContext } = createContext();
    rememberProgramContextUrl('/schedule?from=2026-11-01&to=2026-11-30&q=old');
    const restored = parse(withProgramContext('/schedule', null));
    assert.equal(restored.searchParams.has('q'), false);
    assert.equal(restored.searchParams.has('program'), false);
    assert.equal(restored.searchParams.get('from'), '2026-11-01');
    assert.equal(restored.searchParams.get('to'), '2026-11-30');
});

test('question management drops search while keeping lesson and status filters', () => {
    const { rememberProgramContextUrl, withProgramContext } = createContext();
    rememberProgramContextUrl('/quizzes?program=van-9-2027&q=question&learn_number=2&quiz_status=done');
    const params = parse(withProgramContext('/quizzes')).searchParams;
    assert.equal(params.has('q'), false);
    assert.equal(params.get('learn_number'), '2');
    assert.equal(params.get('quiz_status'), 'done');
});

// Compare menu destinations with the URL builder used by the schedule page.
const loadTs = (filename, bindings) => {
    const module = { exports: {} };
    vm.runInNewContext(transformSync(fs.readFileSync(path.join(__dirname, filename), 'utf8'), {
        loader: 'ts', format: 'cjs',
    }).code, { module, exports: module.exports, URLSearchParams, ...bindings });
    return module.exports;
};
const { calendarSourceFromCode } = loadTs('../helper/lesson.ts', {
    require: name => {
        assert.equal(name, 'dayjs');
        return require('../node_modules/dayjs');
    },
});
const { buildScheduleUrl } = loadTs('../helper/scheduleFilters.ts', {
    require: name => {
        if (name === 'dayjs') return require('../node_modules/dayjs');
        assert.equal(name, '@/helper/lesson');
        return { calendarSourceFromCode };
    },
});

for (const program of ['nguvan-8-2027', 'feed-tramtiepsuctrithuc']) {
    test(`${program}: menu URL already matches the schedule page, with no source rewrite`, () => {
        const { withProgramContext, rememberProgramContextUrl, storage } = createContext();
        const source = calendarSourceFromCode(program);
        const values = {
            code: program, calendar_source: source,
            teacher: ['gv1', 'gv2'], weekdays: [2, 4],
            from_learn_number: 1, to_learn_number: 5,
        };
        assert.equal(withProgramContext('/schedule', program), buildScheduleUrl({ code: program }));
        // Restore repeatedly, just like leaving and returning through the menu.
        const saved = buildScheduleUrl(values, 3);
        rememberProgramContextUrl(saved);
        for (let i = 0; i < 3; i++) {
            const destination = withProgramContext('/schedule', program);
            assert.equal(destination, saved);
            rememberProgramContextUrl(destination);
        }
        // Old sessions may contain an explicit default or even the wrong source.
        storage.set(`lms:filters:/schedule:${program}`, `/schedule?program=${program}&calendar_source=${source === 'feed' ? 'livestream' : 'feed'}`);
        assert.equal(withProgramContext('/schedule', program), buildScheduleUrl({ code: program }));
        const explicit = parse(withProgramContext('/schedule?calendar_source=feed', program));
        assert.equal(explicit.searchParams.get('program'), program);
        assert.equal(explicit.searchParams.get('calendar_source'), source === 'feed' ? 'feed' : null);
    });
}

test('cross-program schedule uses the same source default as the schedule page', () => {
    const { withProgramContext } = createContext();
    assert.equal(withProgramContext('/schedule?calendar_source=livestream', null), buildScheduleUrl({}));
    assert.equal(withProgramContext('/schedule?calendar_source=feed', null), buildScheduleUrl({ calendar_source: 'feed' }));
});

// Use the lesson page's actual URL builder to catch mismatches with menu links.
const lessonUtils = fs.readFileSync(path.join(__dirname, '../app/(admin)/lessons/lesson.utils.ts'), 'utf8');
const lessonPage = fs.readFileSync(path.join(__dirname, '../app/(admin)/lessons/page.tsx'), 'utf8');
const lessonModule = { exports: {} };
const lessonHelpers = lessonUtils.slice(lessonUtils.indexOf('export const cleanFilterValues'), lessonUtils.indexOf('export const downloadBlob'))
    + '\nexport ' + lessonPage.slice(lessonPage.indexOf('const buildLessonUrl'), lessonPage.indexOf('const Page ='));
vm.runInNewContext(transformSync(lessonHelpers, { loader: 'ts', format: 'cjs' }).code, {
    module: lessonModule, exports: lessonModule.exports, URLSearchParams, calendarSourceFromCode,
});
const { buildLessonUrl, cleanFilterValues: cleanLessonFilters } = lessonModule.exports;

for (const program of ['nguvan-8-2027', 'feed-tramtiepsuctrithuc']) {
    test(`${program}: lesson menu URL matches the page on first entry and repeated returns`, () => {
        const { withProgramContext, rememberProgramContextUrl, storage } = createContext();
        const source = calendarSourceFromCode(program);
        const filters = {
            subject_code: program, grade: 8, subject: 'Ngữ văn',
            from_learn_number: 2, to_learn_number: 8, taught_status: 'untaught',
        };
        assert.equal(withProgramContext('/lessons', program), buildLessonUrl({ subject_code: program }));
        const saved = buildLessonUrl(filters, 3);
        rememberProgramContextUrl(buildLessonUrl({ ...filters, keyword: 'ôn tập' }, 3));
        for (let i = 0; i < 3; i++) {
            withProgramContext('/schedule', program);
            const destination = withProgramContext('/lessons', program);
            assert.equal(destination, saved);
            assert.equal(parse(destination).searchParams.has('q'), false);
            rememberProgramContextUrl(destination);
        }
        storage.set(`lms:filters:/lessons:${program}`, `/lessons?program=${program}&calendar_source=${source === 'feed' ? 'livestream' : 'feed'}`);
        assert.equal(withProgramContext('/lessons', program), buildLessonUrl({ subject_code: program }));
        // Omitting the default source from the URL must not omit it from API filters.
        assert.equal(cleanLessonFilters({ subject_code: program }).calendar_source, source);
    });
}


test('approval pages do not activate schedule menu; calendar tools keep their active menu', () => {
    const config = source.slice(source.indexOf('export const menuConfig'), source.indexOf('// Chỉ ba trang'));
    const active = source.slice(source.indexOf('const isPathActive'), source.indexOf('const SideMenu:'));
    const module = { exports: {} };
    const icons = Object.fromEntries([...config.matchAll(/<(\w+)/g)].map(match => [match[1], () => null]));
    vm.runInNewContext(transformSync(config + active, { loader: 'tsx', format: 'cjs' }).code, {
        module, exports: module.exports, React: { createElement: () => null },
        PermissionKey: new Proxy({}, { get: (_, key) => key }), ...icons,
    });
    const { getActiveKeys } = module.exports;
    for (const pathname of ['/schedule/approvals', '/schedule/approvals/10']) {
        const result = getActiveKeys(pathname);
        assert.equal(result.activeTopKey, '');
        assert.equal(result.activeSideKey, '');
    }
    for (const pathname of ['/schedule', '/schedule/auto', '/schedule/auto-edit']) {
        const result = getActiveKeys(pathname);
        assert.equal(result.activeTopKey, 'schedule_management');
        assert.equal(result.activeSideKey, 'schedule_calendar');
    }
    assert.equal(getActiveKeys('/program-teacher-banners').activeSideKey, 'schedule_banners');
    assert.equal(getActiveKeys('/dashboard').activeTopKey, '0');
});
