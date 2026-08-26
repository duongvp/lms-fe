const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CHROME = '/usr/bin/google-chrome';
const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3000';
const QA_USERNAME = process.env.QA_USERNAME || 'qa.urlfilters';

const readEnvValue = (file, key) => {
    const text = fs.readFileSync(file, 'utf8');
    const line = text.split(/\r?\n/).find((item) => (
        item.trim() && !item.trim().startsWith('#') && item.split('=')[0].trim() === key
    ));
    if (!line) throw new Error(`${key} không tồn tại trong ${file}`);
    return line.slice(line.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
};

const QA_PASSWORD = readEnvValue(
    path.resolve(__dirname, '../../lms-manage-api/.env'),
    'ADMIN_DEFAULT_PASSWORD'
);
const LESSON_REAUTH_SECRET = readEnvValue(
    path.resolve(__dirname, '../../lms-manage-api/.env'),
    'LESSONS_REAUTH_TOKEN_SECRET'
);

const encodeBase64Url = (value) => Buffer.from(value).toString('base64url');
const signLessonReauthToken = (accessToken, userId) => {
    const accessPayload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'));
    const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = encodeBase64Url(JSON.stringify({
        type: 'lessons.secondary',
        userId: Number(userId),
        sessionId: String(accessPayload.sessionId || ''),
        iat: Math.floor(Date.now() / 1000),
    }));
    const unsigned = `${header}.${payload}`;
    const signature = crypto.createHmac('sha256', LESSON_REAUTH_SECRET)
        .update(unsigned)
        .digest('base64url');
    return `${unsigned}.${signature}`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class CdpPipe {
    constructor() {
        this.nextId = 0;
        this.pending = new Map();
        this.buffer = Buffer.alloc(0);
        this.profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-url-filter-qa-'));
        this.browser = spawn(CHROME, [
            '--headless=new',
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--remote-debugging-pipe',
            `--user-data-dir=${this.profileDir}`,
            'about:blank',
        ], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
        this.browser.stderr.on('data', () => {});
        this.writer = this.browser.stdio[3];
        this.reader = this.browser.stdio[4];
        this.reader.on('data', (chunk) => this.onData(chunk));
    }

    onData(chunk) {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        let boundary = this.buffer.indexOf(0);
        while (boundary >= 0) {
            const message = this.buffer.subarray(0, boundary).toString('utf8');
            this.buffer = this.buffer.subarray(boundary + 1);
            if (message) {
                const payload = JSON.parse(message);
                if (payload.id && this.pending.has(payload.id)) {
                    const { resolve, reject, timer } = this.pending.get(payload.id);
                    clearTimeout(timer);
                    this.pending.delete(payload.id);
                    if (payload.error) reject(new Error(payload.error.message));
                    else resolve(payload.result);
                }
            }
            boundary = this.buffer.indexOf(0);
        }
    }

    send(method, params = {}, sessionId) {
        const id = ++this.nextId;
        const payload = { id, method, params, ...(sessionId ? { sessionId } : {}) };
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`CDP timeout: ${method}`));
            }, 20_000);
            this.pending.set(id, { resolve, reject, timer });
            this.writer.write(`${JSON.stringify(payload)}\0`);
        });
    }

    async start() {
        await this.send('Browser.getVersion');
        const { targetId } = await this.send('Target.createTarget', { url: 'about:blank' });
        const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true });
        this.sessionId = sessionId;
        await this.send('Page.enable', {}, sessionId);
        await this.send('Runtime.enable', {}, sessionId);
        await this.send('Emulation.setDeviceMetricsOverride', {
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
            mobile: false,
        }, sessionId);
    }

    async evaluate(expression) {
        const result = await this.send('Runtime.evaluate', {
            expression,
            awaitPromise: true,
            returnByValue: true,
        }, this.sessionId);
        if (result.exceptionDetails) {
            throw new Error(result.exceptionDetails.exception?.description || 'Runtime.evaluate failed');
        }
        return result.result.value;
    }

    async navigate(relativeUrl) {
        await this.send('Page.navigate', { url: new URL(relativeUrl, BASE_URL).href }, this.sessionId);
        // First compilation in Next dev can take tens of seconds for the large
        // schedule page. Keep this above the UI assertion timeout so a cold
        // build is not reported as a filter failure.
        await this.waitFor(`document.readyState !== 'loading' && location.pathname !== '/auth/login'`, 60_000, true);
        await sleep(500);
    }

    async waitFor(expression, timeout = 15_000, allowLogin = false) {
        const started = Date.now();
        while (Date.now() - started < timeout) {
            try {
                if (await this.evaluate(expression)) return;
            } catch {}
            await sleep(100);
        }
        const location = await this.evaluate('location.href').catch(() => 'unknown');
        const snapshot = await this.evaluate(`({
            title: document.title,
            text: document.body?.innerText?.slice(0, 500),
            inputs: [...document.querySelectorAll('input')].map((item) => ({
                placeholder: item.getAttribute('placeholder'),
                value: item.value
            }))
        })`).catch(() => null);
        throw new Error(`Timeout chờ ${expression}; URL=${location}; DOM=${JSON.stringify(snapshot)}${allowLogin ? '' : ''}`);
    }

    async close() {
        await this.send('Browser.close').catch(() => {});
        if (this.browser.exitCode === null) {
            await Promise.race([
                new Promise((resolve) => this.browser.once('exit', resolve)),
                sleep(2_000).then(() => this.browser.kill('SIGTERM')),
            ]);
        }
        for (let attempt = 0; attempt < 5; attempt += 1) {
            try {
                fs.rmSync(this.profileDir, { recursive: true, force: true });
                break;
            } catch (error) {
                if (error?.code !== 'ENOTEMPTY' || attempt === 4) throw error;
                await sleep(100);
            }
        }
    }
}

const assert = (condition, message) => {
    if (!condition) throw new Error(message);
};

const inputValue = (placeholder) => `(() => {
    const input = [...document.querySelectorAll('input')]
        .find((item) => item.getAttribute('placeholder') === ${JSON.stringify(placeholder)});
    return input ? input.value : null;
})()`;

const clickHeaderRoute = (pathname) => `(() => {
    const link = [...document.querySelectorAll('a[href]')]
        .find((item) => new URL(item.href).pathname === ${JSON.stringify(pathname)});
    if (!link) return false;
    link.click();
    return true;
})()`;

const clickButtonByText = (text) => `(() => {
    const button = [...document.querySelectorAll('button')]
        .find((item) => item.innerText.trim() === ${JSON.stringify(text)});
    if (!button) return false;
    button.click();
    return true;
})()`;

const setSearchInput = (value) => `(() => {
    const input = document.querySelector('input[placeholder^="Tìm"]');
    if (!input) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
})()`;

const run = async () => {
    const cdp = new CdpPipe();
    const results = [];
    const check = async (name, callback) => {
        await callback();
        results.push({ name, status: 'passed' });
    };

    try {
        await cdp.start();
        await cdp.send('Page.navigate', { url: `${BASE_URL}/auth/login` }, cdp.sessionId);
        await cdp.waitFor(`document.readyState !== 'loading'`);
        const login = await cdp.evaluate(`fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: ${JSON.stringify(QA_USERNAME)}, password: ${JSON.stringify(QA_PASSWORD)}, rememberMe: true })
        }).then(async (response) => ({ status: response.status, body: await response.json() }))`);
        assert(
            login.status === 200 && login.body?.success,
            `Đăng nhập QA thất bại: HTTP ${login.status} - ${login.body?.message || 'không có thông báo'}`
        );
        const lessonReauthToken = signLessonReauthToken(
            login.body.data.accessToken,
            login.body.data.userId
        );
        await cdp.evaluate(`sessionStorage.setItem('lms.lessons.reauth', ${JSON.stringify(lessonReauthToken)})`);
        const lessonReauthStatus = await cdp.evaluate(`fetch('http://localhost:5000/api/lessons/reauth', {
            credentials: 'include',
            headers: {
                Authorization: 'Bearer ' + ${JSON.stringify(login.body.data.accessToken)},
                'X-Lessons-Reauth': ${JSON.stringify(lessonReauthToken)}
            }
        }).then(async (response) => ({ status: response.status, body: await response.json() }))`);
        assert(
            lessonReauthStatus.status === 200,
            `Không tạo được phiên xác thực cấp 2 QA: HTTP ${lessonReauthStatus.status} - ${lessonReauthStatus.body?.message || ''}`
        );
        results.push({ name: 'Đăng nhập bằng tài khoản QA', status: 'passed' });

        const scheduleUrl = '/schedule?program=sinhhoc-7-2027&q=Truy%E1%BB%87n&weekdays=1&from_learn_number=1&to_learn_number=3';
        await cdp.navigate(scheduleUrl);
        await cdp.waitFor(`${inputValue('Tìm kiếm theo chương trình, bài học, giáo viên, phòng học...')} === 'Truyện'`);
        await check('Schedule hydrate keyword từ URL', async () => {
            assert(await cdp.evaluate(inputValue('Tìm kiếm theo chương trình, bài học, giáo viên, phòng học...')) === 'Truyện', 'Keyword Schedule không khớp URL');
        });

        await cdp.navigate('/schedule?program=sinhhoc-7-2027');
        await cdp.waitFor(`[...document.querySelectorAll('.ant-table-thead th')]
            .some((item) => item.textContent?.includes('Giáo viên'))`);
        await cdp.waitFor(`document.querySelector('.ant-table-tbody tr.ant-table-row') !== null`);
        await check('Filter cột Giáo viên không reset Program', async () => {
            const opened = await cdp.evaluate(`(() => {
                const header = [...document.querySelectorAll('.ant-table-thead th')]
                    .find((item) => item.textContent?.includes('Giáo viên'));
                const trigger = header?.querySelector('.ant-table-filter-trigger');
                if (!trigger) return false;
                trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                return true;
            })()`);
            assert(opened, 'Không mở được filter cột Giáo viên');
            await cdp.waitFor(`document.querySelector('.ant-table-filter-dropdown .ant-checkbox-input') !== null`);
            const selectedLabel = await cdp.evaluate(`(() => {
                const option = [...document.querySelectorAll('.ant-table-filter-dropdown li')]
                    .find((item) => item.innerText?.trim() === 'Cô An');
                const checkbox = option?.querySelector('.ant-checkbox-input');
                const confirm = document.querySelector('.ant-table-filter-dropdown-btns .ant-btn-primary');
                if (!checkbox || !confirm) return '';
                const label = option.innerText.trim();
                checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                confirm.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                return label;
            })()`);
            assert(selectedLabel, 'Không chọn/xác nhận được filter Giáo viên');
            await cdp.waitFor(`(() => {
                const header = [...document.querySelectorAll('.ant-table-thead th')]
                    .find((item) => item.textContent?.includes('Giáo viên'));
                return header?.querySelector('.ant-table-filter-trigger.active') !== null;
            })()`);
            const filteredRows = await cdp.evaluate(`(() => {
                const headers = [...document.querySelectorAll('.ant-table-thead th')];
                const teacherIndex = headers.findIndex((item) => item.textContent?.includes('Giáo viên'));
                if (teacherIndex < 0) return { total: 0, values: [] };
                const values = [...document.querySelectorAll('.ant-table-tbody tr.ant-table-row')]
                    .map((row) => row.querySelectorAll('td')[teacherIndex]?.innerText?.trim() || '-');
                return { total: values.length, values };
            })()`);
            assert(filteredRows.total > 0, 'Filter Giáo viên trả về bảng rỗng ngoài dự kiến');
            assert(
                filteredRows.values.every((value) => value === selectedLabel),
                `Filter Giáo viên còn lẫn giá trị: chọn=${selectedLabel}, kết quả=${filteredRows.values.join(', ')}`
            );
            const currentUrl = await cdp.evaluate('location.search');
            assert(currentUrl.includes('program=sinhhoc-7-2027'), `Filter Giáo viên đã làm mất Program: ${currentUrl}`);
        });
        await cdp.navigate(scheduleUrl);
        await cdp.waitFor(`${inputValue('Tìm kiếm theo chương trình, bài học, giáo viên, phòng học...')} === 'Truyện'`);

        await check('Schedule → Lessons không rò param riêng', async () => {
            assert(await cdp.evaluate(clickHeaderRoute('/lessons')), 'Không tìm thấy link Lessons');
            await cdp.waitFor(`location.pathname === '/lessons'`);
            const query = await cdp.evaluate('location.search');
            assert(query.includes('program=sinhhoc-7-2027'), 'Lessons không nhận program dùng chung');
            assert(!query.includes('weekdays') && !query.includes('from_learn_number'), 'Lessons nhận nhầm filter Schedule');
        });

        const lessonsUrl = '/lessons?program=sinhhoc-7-2027&q=quanghop&from_learn_number=2&to_learn_number=4';
        await cdp.navigate(lessonsUrl);
        await cdp.waitFor(`${inputValue('Tìm theo tên bài học...')} === 'quanghop'`);
        await check('Lessons hydrate keyword và khoảng bài', async () => {
            assert(await cdp.evaluate(inputValue('Tìm theo tên bài học...')) === 'quanghop', 'Keyword Lessons không khớp URL');
            assert(await cdp.evaluate(clickButtonByText('Lọc')), 'Không mở được bộ lọc Lessons');
            await cdp.waitFor(`document.querySelector('input[placeholder="Từ bài"]') !== null`);
            const range = await cdp.evaluate(`[
                document.querySelector('input[placeholder="Từ bài"]')?.value,
                document.querySelector('input[placeholder="Đến bài"]')?.value
            ]`);
            assert(range[0] === '2' && range[1] === '4', `Khoảng bài không khớp URL: ${range}`);
        });

        await check('Lessons → Quizzes không rò khoảng bài', async () => {
            assert(await cdp.evaluate(clickHeaderRoute('/quizzes')), 'Không tìm thấy link Quizzes');
            await cdp.waitFor(`location.pathname === '/quizzes'`);
            const query = await cdp.evaluate('location.search');
            assert(query.includes('program=sinhhoc-7-2027'), 'Quizzes không nhận program dùng chung');
            assert(!query.includes('from_learn_number') && !query.includes('q='), 'Quizzes nhận nhầm filter Lessons');
        });

        await cdp.navigate('/quizzes?program=sinhhoc-7-2027&learn_number=1&quiz_status=done&q=photosynthesis');
        await cdp.waitFor(`${inputValue('Tìm kiếm câu hỏi...')} === 'photosynthesis'`);
        await check('Quizzes hydrate keyword từ URL', async () => {
            assert(await cdp.evaluate(inputValue('Tìm kiếm câu hỏi...')) === 'photosynthesis', 'Keyword Quizzes không khớp URL');
        });

        await check('Quay lại Schedule bằng menu khôi phục filter riêng', async () => {
            assert(await cdp.evaluate(clickHeaderRoute('/schedule')), 'Không tìm thấy link Schedule');
            await cdp.waitFor(`location.pathname === '/schedule' && location.search.includes('weekdays=1')`);
            assert(await cdp.evaluate(inputValue('Tìm kiếm theo chương trình, bài học, giáo viên, phòng học...')) === 'Truyện', 'Schedule không khôi phục keyword đã lưu');
        });

        await check('Debounce page cũ không ghi đè sau chuyển trang nhanh', async () => {
            assert(await cdp.evaluate(setSearchInput('delayed-old-page')), 'Không nhập được keyword Schedule');
            await sleep(350);
            assert(await cdp.evaluate(clickHeaderRoute('/lessons')), 'Không tìm thấy link Lessons khi test debounce');
            await cdp.waitFor(`location.pathname === '/lessons'`);
            await sleep(900);
            const current = await cdp.evaluate('location.pathname + location.search');
            assert(current.startsWith('/lessons'), `Callback Schedule đã ghi đè route mới: ${current}`);
            assert(!current.includes('delayed-old-page'), `Keyword page cũ bị rò sang Lessons: ${current}`);
        });

        await check('Refresh giữ UI và URL Lessons đồng bộ', async () => {
            await cdp.send('Page.reload', { ignoreCache: true }, cdp.sessionId);
            await cdp.waitFor(`document.readyState !== 'loading' && location.pathname === '/lessons'`);
            await cdp.waitFor(`${inputValue('Tìm theo tên bài học...')} !== null`);
            const urlKeyword = await cdp.evaluate(`new URLSearchParams(location.search).get('q') || ''`);
            const uiKeyword = await cdp.evaluate(inputValue('Tìm theo tên bài học...'));
            assert(uiKeyword === urlKeyword, `Refresh lệch keyword: UI=${uiKeyword}, URL=${urlKeyword}`);
        });

        await cdp.navigate('/room-config?q=sinhhoc&learn_number=2&page=2&limit=20');
        await check('Room config hydrate filter/pagination URL', async () => {
            await cdp.waitFor(`document.querySelector('input[placeholder^="Tìm kiếm môn học"]')?.value === 'sinhhoc'`);
            assert(await cdp.evaluate(inputValue('Lọc số buổi học...')) === '2', 'Room config không hydrate learn_number');
        });

        await cdp.navigate('/teacher-profiles?q=chau&teacher_type=1&status=1');
        await check('Teacher profiles hydrate keyword URL', async () => {
            await cdp.waitFor(`${inputValue('Tìm Tên đăng nhập hoặc họ tên')} === 'chau'`);
        });

        await cdp.navigate('/users?q=qa.urlfilters');
        await check('Users hydrate keyword URL', async () => {
            await cdp.waitFor(`${inputValue('Tên đăng nhập, người dùng')} === 'qa.urlfilters'`);
        });

        await cdp.navigate('/member-roles?q=admin');
        await check('Member roles hydrate và áp dụng keyword URL', async () => {
            await cdp.waitFor(`${inputValue('Tên vai trò')} === 'admin'`);
        });

        await check('Page không liên quan không giữ query cũ', async () => {
            await cdp.navigate('/dashboard?weekdays=1&q=stale');
            await cdp.waitFor(`!location.search.includes('weekdays') && !location.search.includes('q=')`);
            const query = await cdp.evaluate('location.search');
            assert(!query.includes('weekdays') && !query.includes('q='), `Dashboard còn query cũ: ${query}`);
        });

        console.log(JSON.stringify({ success: true, total: results.length, results }, null, 2));
    } catch (error) {
        console.error(JSON.stringify({ success: false, error: error.message, results }, null, 2));
        process.exitCode = 1;
    } finally {
        await cdp.close();
    }
};

void run();
