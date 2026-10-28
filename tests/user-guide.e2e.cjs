// UI regression checks use mocked auth only; no LMS credentials or backend writes.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const CHROME = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3000';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
class CdpPipe {
    constructor() {
        this.nextId = 0;
        this.pending = new Map();
        this.buffer = Buffer.alloc(0);
        this.profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lms-user-guide-qa-'));
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
        console.log(`Navigate ${relativeUrl}`);
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


const clickText = text => `(() => {
    const node = [...document.querySelectorAll('button, a')].find(el => el.textContent.trim() === ${JSON.stringify(text)} && el.getBoundingClientRect().height);
    node?.click(); return !!node;
})()`;
const setInput = (selector, value) => `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true })); return true;
})()`;
const initMockAuth = `(() => {
    const permissions = JSON.parse(localStorage.getItem('guide-test-permissions') || '["*"]');
    const user = { userId: permissions.includes('*') ? 1001 : 1002, username: 'guide.ui.test', permissions, roles: [], programScope: { mode: 'ALL', programs: [] } };
    const originalFetch = window.fetch.bind(window);
    window.__guideRequests = [];
    window.fetch = async (input, options) => {
        const url = new URL(typeof input === 'string' ? input : input.url || String(input), location.origin);
        if (url.pathname.startsWith('/api/auth/')) {
            window.__guideRequests.push(url.pathname);
            const data = url.pathname.endsWith('/refresh-token') ? { accessToken: 'ui-test-token' } : user;
            return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (url.pathname.startsWith('/api/') || url.port === '5000') throw new Error('Backend access is disabled in this UI test');
        return originalFetch(input, options);
    };
})();`;

async function main() {
    const cdp = new CdpPipe();
    try {
        for (let attempt = 0; attempt < 120; attempt++) {
            try { await fetch(`${BASE_URL}/auth/login`); break; } catch { await sleep(500); }
            if (attempt === 119) throw new Error('Start the frontend dev server before running this UI test');
        }
        console.log('Frontend reachable; starting Chrome');
        await cdp.start();
        await cdp.send('Network.enable', {}, cdp.sessionId);
        await cdp.send('Network.setCookie', { name: 'refreshToken', value: 'guide-ui-test', url: BASE_URL, httpOnly: true }, cdp.sessionId);
        await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: initMockAuth }, cdp.sessionId);
        await cdp.navigate('/user-guide');
        await cdp.waitFor(`document.querySelector('h1')?.textContent === 'Hướng dẫn sử dụng'`, 90000);
        // A hidden absolute table caption must not enlarge the outer document.
        // Otherwise TOC/hash scrolling moves the app and reveals the dark body below.
        await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] }, cdp.sessionId);
        await cdp.evaluate(`document.querySelector('a[href="/user-guide/tao-lich-tu-dong"]').click()`);
        await cdp.waitFor(`document.querySelector('h1')?.textContent === 'Tạo lịch tự động theo đề cương'`);
        assert(await cdp.evaluate(`document.documentElement.scrollHeight <= innerHeight + 1`), 'Guide table created outer document overflow');
        await cdp.evaluate(`document.querySelector('[aria-label="Mục lục bài viết"] a:last-of-type').click()`);
        await cdp.waitFor(`document.querySelector('main').scrollTop > 0`);
        await cdp.evaluate(`document.querySelector('main').scrollTop = document.querySelector('main').scrollHeight; window.scrollTo(0, 500); true`);
        assert(await cdp.evaluate(`scrollY === 0 && Math.abs(document.querySelector('.ant-layout').getBoundingClientRect().bottom - innerHeight) <= 1`), 'TOC exposed background below the LMS layout');
        fs.writeFileSync('/tmp/lms-guide-dark-scroll-desktop.png', Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' }, cdp.sessionId)).data, 'base64'));
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true }, cdp.sessionId);
        await sleep(200);
        await cdp.evaluate(`document.querySelector('[aria-label="Mục lục trên điện thoại"] a:last-of-type').click()`);
        assert(await cdp.evaluate(`scrollY === 0 && document.documentElement.scrollHeight <= innerHeight + 1`), 'Mobile TOC moved the outer page');
        fs.writeFileSync('/tmp/lms-guide-dark-scroll-mobile.png', Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' }, cdp.sessionId)).data, 'base64'));
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false }, cdp.sessionId);
        await cdp.send('Emulation.setEmulatedMedia', { features: [] }, cdp.sessionId);
        await cdp.evaluate(clickText('Về tất cả hướng dẫn'));
        await cdp.waitFor(`document.querySelector('h1')?.textContent === 'Hướng dẫn sử dụng'`);
        await cdp.waitFor(`!!document.querySelector('header .ant-menu-horizontal .ant-menu-overflow-item-rest')`);
        await cdp.evaluate(`window.__guideHeaderMenu = document.querySelector('header .ant-menu-horizontal'); true`);
        const baselineCount = await cdp.evaluate(`Number(document.body.innerText.match(/(\\d+) bài hướng dẫn dành cho bạn/)[1])`);
        assert(baselineCount >= 20, 'Expected the adapted Word library, not the old demonstration content');
        assert(await cdp.evaluate(`!!document.querySelector('a[href="/user-guide/manage"]')`));
        assert(!(await cdp.evaluate(`document.querySelector('[aria-label="Danh sách bài hướng dẫn"]').innerText.includes('Bản nháp minh họa')`)));
        await cdp.evaluate(setInput('[aria-label="Tìm kiếm tài liệu hướng dẫn"]', 'nghi hoc (khong doi)'));
        await cdp.waitFor(`document.querySelector('[aria-label="Danh sách bài hướng dẫn"]').innerText.includes('1 bài viết')`);
        await cdp.evaluate(setInput('[aria-label="Tìm kiếm tài liệu hướng dẫn"]', 'nghỉ học (không dời)'));
        await cdp.waitFor(`document.querySelector('[aria-label="Danh sách bài hướng dẫn"]').innerText.includes('1 bài viết')`);
        await cdp.evaluate(setInput('[aria-label="Tìm kiếm tài liệu hướng dẫn"]', 'khongtimthay123'));
        await cdp.waitFor(`document.body.innerText.includes('Chưa tìm thấy tài liệu phù hợp')`);
        await cdp.evaluate(clickText('Xem tất cả hướng dẫn'));
        await cdp.waitFor(`document.querySelector('[aria-label="Danh sách bài hướng dẫn"]').innerText.includes('${baselineCount} bài viết')`);
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, cdp.sessionId);
        fs.writeFileSync('/tmp/lms-user-guide-desktop.png', Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' }, cdp.sessionId)).data, 'base64'));
        await cdp.evaluate(`document.querySelector('a[href="/user-guide/tra-cuu-lich-hoc"]').click()`);
        await cdp.waitFor(`document.querySelector('h1')?.textContent === 'Tra cứu lịch học'`);
        assert(await cdp.evaluate(`document.querySelector('header .ant-menu-horizontal') === window.__guideHeaderMenu`), 'Header menu remounted when opening an article');
        assert(await cdp.evaluate(`!!document.querySelector('[aria-label="Mục lục bài viết"]') && document.body.innerText.includes('Cập nhật 28/10/2026')`));
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true }, cdp.sessionId);
        await sleep(300);
        assert(await cdp.evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'Detail overflows mobile viewport');
        assert(await cdp.evaluate(`getComputedStyle(document.querySelector('[aria-label="Mục lục trên điện thoại"]')).display !== 'none'`));
        fs.writeFileSync('/tmp/lms-user-guide-mobile.png', Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' }, cdp.sessionId)).data, 'base64'));
        await cdp.evaluate(clickText('Về tất cả hướng dẫn'));
        await cdp.waitFor(`document.querySelector('h1')?.textContent === 'Hướng dẫn sử dụng'`);
        assert(await cdp.evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'Home overflows mobile viewport');
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, cdp.sessionId);
        await cdp.waitFor(`!!document.querySelector('header .ant-menu-horizontal')`);
        await cdp.evaluate(`window.__guideHeaderMenu = document.querySelector('header .ant-menu-horizontal'); true`);
        await cdp.evaluate(clickText('Quản lý tài liệu'));
        await cdp.waitFor(`document.querySelector('h1')?.textContent === 'Quản lý tài liệu'`, 90000);
        assert(await cdp.evaluate(`document.querySelector('header .ant-menu-horizontal') === window.__guideHeaderMenu`), 'Header menu remounted on route change, resetting overflow measurement');
        // Visual editing preserves the structured tables, callouts and preparation.
        const editorMode = label => cdp.evaluate(`(() => { const el = [...document.querySelectorAll('.ant-modal .ant-segmented-item')].find(el => el.textContent.trim() === ${JSON.stringify(label)}); el.click(); })()`);
        await cdp.evaluate(setInput('[aria-label="Tìm bài viết trong quản lý"]', 'Nghỉ học, tạo lịch bù và dời chuỗi'));
        await cdp.waitFor(`[...document.querySelectorAll('tr')].some(row => row.innerText.includes('Nghỉ học, tạo lịch bù và dời chuỗi'))`);
        await cdp.evaluate(`(() => { const row = [...document.querySelectorAll('tr')].find(el => el.innerText.includes('Nghỉ học, tạo lịch bù và dời chuỗi')); [...row.querySelectorAll('button')].find(el => el.textContent === 'Sửa').click(); })()`);
        await cdp.waitFor(`!!document.querySelector('#guide-editor-title')`);
        assert(await cdp.evaluate(`document.querySelector('[aria-label="Tên cột 1"]').value.includes('Chế độ trong Dời lịch')`));
        await cdp.evaluate(setInput('[aria-label="Ô dòng 1 cột 1"]', 'Nghỉ học & Tạo lịch bù | kiểm tra'));
        await cdp.waitFor(`document.querySelector('[aria-label="Bản xem trước trực tiếp"]').textContent.includes('Tạo lịch bù | kiểm tra')`);
        await cdp.evaluate(clickText('Lưu ý'));
        await cdp.evaluate(setInput('[aria-label="Nội dung lưu ý"]', 'Lưu ý kiểm thử trình soạn thảo trực quan.'));
        await cdp.evaluate(`document.querySelector('[aria-label="Đưa phần xuống"]').click()`);
        await cdp.waitFor(`document.querySelector('[aria-label="Các phần đang soạn"] button[aria-current="step"]').textContent.startsWith('2')`);
        await editorMode('Thông tin bài viết');
        await cdp.waitFor(`!!document.querySelector('#guide-editor-prerequisites')`);
        assert(await cdp.evaluate(`document.querySelector('#guide-editor-prerequisites').value.includes('chưa diễn ra')`));
        await editorMode('Nội dung');
        await cdp.waitFor(`!!document.querySelector('[aria-label="Tên cột 1"]')`);
        await sleep(400);
        assert(await cdp.evaluate(`Math.abs(document.querySelector('.ant-modal-content').getBoundingClientRect().width - innerWidth) < 2`), 'Editor should fill the desktop width');
        fs.writeFileSync('/tmp/lms-user-guide-editor-desktop.png', Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' }, cdp.sessionId)).data, 'base64'));
        await cdp.evaluate(clickText('Lưu thay đổi'));
        await cdp.waitFor(`!document.querySelector('#guide-editor-title')`);
        await cdp.evaluate(`document.querySelector('a[href="/user-guide/nghi-hoc-hoc-bu-doi-chuoi?preview=1"]').click()`);
        await cdp.waitFor(`!!document.querySelector('article table tbody tr')`);
        assert.equal(await cdp.evaluate(`document.querySelectorAll('article table tbody tr').length`), 3);
        assert(await cdp.evaluate(`document.querySelector('article').innerText.includes('Không khẳng định có thao tác khôi phục')`));
        assert(await cdp.evaluate(`document.querySelector('article').innerText.includes('Lưu ý kiểm thử trình soạn thảo trực quan.')`));
        assert(await cdp.evaluate(`document.querySelector('article table').textContent.includes('Tạo lịch bù | kiểm tra')`));
        await cdp.evaluate(clickText('Về quản lý'));
        await cdp.waitFor(`document.querySelector('h1')?.textContent === 'Quản lý tài liệu'`);
        await cdp.evaluate(clickText('Tạo bài viết'));
        await cdp.waitFor(`!!document.querySelector('#guide-editor-title')`);
        await cdp.evaluate(setInput('#guide-editor-title', 'Bài thử xuất bản'));
        await cdp.evaluate(setInput('#guide-editor-section-title', 'Phần kiểm thử'));
        await cdp.waitFor(`!!document.querySelector('#guide-editor-section-text[contenteditable="true"]')`);
        assert(!(await cdp.evaluate(`document.querySelector('[aria-label="Bản xem trước trực tiếp"]').innerText.split('\\n').some(line => line.trim() === '0')`)), 'Empty preview rendered zero');
        await cdp.evaluate(`document.querySelector('#guide-editor-section-text').focus()`);
        await cdp.send('Input.insertText', { text: 'Nội dung kiểm thử không ghi vào hệ thống thật.' }, cdp.sessionId);
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 }, cdp.sessionId);
        await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2 }, cdp.sessionId);
        await cdp.evaluate(`document.querySelector('[aria-label="In đậm (Ctrl+B)"]').click()`);
        await cdp.waitFor(`document.querySelector('[aria-label="Bản xem trước trực tiếp"] strong')?.textContent.includes('Nội dung kiểm thử')`);
        await cdp.evaluate(`document.querySelector('[aria-label="Chèn hoặc sửa liên kết"]').click()`);
        await cdp.waitFor(`!!document.querySelector('#guide-link-url')`);
        await cdp.evaluate(setInput('#guide-link-url', 'javascript:alert(1)'));
        await cdp.evaluate(clickText('Áp dụng'));
        await cdp.waitFor(`document.body.innerText.includes('Nhập địa chỉ HTTP, HTTPS hoặc email hợp lệ.')`);
        await cdp.evaluate(setInput('#guide-link-url', 'https://example.com/guide'));
        await cdp.evaluate(clickText('Áp dụng'));
        await cdp.waitFor(`!!document.querySelector('[aria-label="Bản xem trước trực tiếp"] a[href="https://example.com/guide"]')`);
        await sleep(400);
        // Position the ProseMirror selection before dispatching the synthetic paste.
        await cdp.evaluate(`document.querySelector('#guide-editor-section-text').editor.commands.focus('end')`);
        await sleep(100);
        await cdp.evaluate(`(() => {
            const el = document.querySelector('#guide-editor-section-text');
            const data = new DataTransfer();
            data.setData('text/html', '<p><em>Đoạn dán từ tài liệu</em> <a href="javascript:alert(1)">Liên kết không an toàn</a></p>');
            data.setData('text/plain', 'Đoạn dán từ tài liệu Liên kết không an toàn');
            el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
        })()`);
        await cdp.waitFor(`document.querySelector('[aria-label="Bản xem trước trực tiếp"] em')?.textContent.includes('Đoạn dán từ tài liệu')`);
        assert(!(await cdp.evaluate(`!!document.querySelector('[aria-label="Bản xem trước trực tiếp"] a[href^="javascript:"]')`)), 'Unsafe pasted link reached preview');
        fs.writeFileSync('/tmp/lms-rich-editor-desktop.png', Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' }, cdp.sessionId)).data, 'base64'));
        // Insert an image at the caret, not as a fixed section-level field.
        await cdp.evaluate(`document.querySelector('#guide-editor-section-text').editor.commands.focus('end')`);
        await sleep(100);
        await cdp.evaluate(`document.querySelector('[aria-label="Chèn hoặc sửa ảnh"]').click()`);
        await cdp.waitFor(`!!document.querySelector('#guide-editor-section-text-image-url')`);
        await cdp.evaluate(setInput('#guide-editor-section-text-image-url', 'javascript:alert(1)'));
        await cdp.evaluate(clickText('Chèn / cập nhật ảnh'));
        await cdp.waitFor(`document.body.innerText.includes('Nhập đường dẫn ảnh HTTPS hợp lệ.')`);
        await cdp.evaluate(setInput('#guide-editor-section-text-image-url', 'https://example.com/guide-test.png'));
        await cdp.evaluate(setInput('#guide-editor-section-text-image-alt', 'Ảnh minh họa bên trong đoạn văn'));
        await cdp.evaluate(clickText('Chèn / cập nhật ảnh'));
        await cdp.waitFor(`!!document.querySelector('[aria-label="Bản xem trước trực tiếp"] img[alt="Ảnh minh họa bên trong đoạn văn"]')`);
        await sleep(400);
        await cdp.evaluate(clickText('Các bước'));
        await cdp.evaluate(setInput('[aria-label="Nội dung bước 1"]', 'Bước A'));
        await cdp.evaluate(clickText('Thêm bước'));
        await cdp.evaluate(setInput('[aria-label="Nội dung bước 2"]', 'Bước B'));
        await cdp.evaluate(`document.querySelector('[aria-label="Đưa bước 2 lên"]').click()`);
        await cdp.waitFor(`document.querySelector('[aria-label="Nội dung bước 1"]').value === 'Bước B'`);
        // Multiple blocks of the same type, independent values, and ordering.
        await cdp.evaluate(clickText('Bảng'));
        await cdp.evaluate(setInput('[aria-label="Ô dòng 1 cột 1"]', 'Bảng thứ nhất'));
        await cdp.evaluate(`document.querySelector('[data-block-type="table"] [aria-label^="Nhân bản khối"]').click()`);
        await cdp.waitFor(`document.querySelectorAll('[data-block-type="table"]').length === 2`);
        await cdp.evaluate(`document.querySelectorAll('[data-block-type="table"]')[1].querySelector('[aria-label="Ô dòng 1 cột 1"]').setAttribute('data-test-cell', 'second')`);
        await cdp.evaluate(setInput('[data-test-cell="second"]', 'Bảng thứ hai độc lập'));
        await cdp.evaluate(clickText('Lưu ý'));
        await cdp.evaluate(setInput('[aria-label="Nội dung lưu ý"]', 'Lưu ý thứ nhất'));
        await cdp.evaluate(`document.querySelector('[data-block-type="notice"] [aria-label^="Nhân bản khối"]').click()`);
        await cdp.evaluate(`document.querySelectorAll('[data-block-type="notice"]')[1].querySelector('textarea').setAttribute('data-test-notice', 'second')`);
        await cdp.evaluate(setInput('[data-test-notice="second"]', 'Lưu ý thứ hai độc lập'));
        await cdp.evaluate(clickText('Đoạn văn'));
        await cdp.waitFor(`document.querySelectorAll('[data-block-type="text"] [contenteditable="true"]').length === 2`);
        await cdp.evaluate(`document.querySelectorAll('[data-block-type="text"] [contenteditable="true"]')[1].editor.commands.focus('end')`);
        await sleep(100);
        await cdp.send('Input.insertText', { text: 'Đoạn giải thích thứ hai độc lập.' }, cdp.sessionId);
        await cdp.evaluate(`document.querySelector('[data-block-type="steps"] [aria-label^="Nhân bản khối"]').click()`);
        await cdp.waitFor(`document.querySelectorAll('[data-block-type="steps"]').length === 2`);
        await cdp.evaluate(`(() => {
            const source = document.querySelector('[data-block-type="table"]');
            const target = document.querySelector('[data-block-id]');
            const transfer = new DataTransfer();
            source.querySelector('[draggable="true"]').dispatchEvent(new DragEvent('dragstart', { dataTransfer: transfer, bubbles: true }));
            const rect = target.getBoundingClientRect();
            target.dispatchEvent(new DragEvent('dragover', { dataTransfer: transfer, clientY: rect.top + 1, bubbles: true, cancelable: true }));
            target.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, clientY: rect.top + 1, bubbles: true, cancelable: true }));
        })()`);
        await cdp.waitFor(`document.querySelector('[data-block-id]').dataset.blockType === 'table'`);
        await cdp.evaluate(`document.querySelectorAll('[data-block-type="table"]')[1].querySelector('[aria-label$=" lên"]').click()`);
        const blockOrder = await cdp.evaluate(`[...document.querySelectorAll('[data-block-id]')].map(el => el.dataset.blockType)`);
        assert.equal(blockOrder.filter(type => type === 'table').length, 2);
        assert.equal(blockOrder.filter(type => type === 'text').length, 2);
        assert.equal(blockOrder.filter(type => type === 'notice').length, 2);
        assert.equal(blockOrder.filter(type => type === 'steps').length, 2);
        assert.deepEqual(await cdp.evaluate(`[...document.querySelectorAll('[aria-label="Bản xem trước trực tiếp"] [data-guide-block]')].map(el => el.dataset.guideBlock)`), blockOrder);
        assert(await cdp.evaluate(`document.querySelector('[aria-label="Bản xem trước trực tiếp"]').textContent.includes('Bảng thứ hai độc lập')`));
        await cdp.evaluate(`document.querySelector('[class*="editorCanvas"]').scrollTop = 0`);
        await sleep(300);
        fs.writeFileSync('/tmp/lms-block-editor-desktop.png', Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' }, cdp.sessionId)).data, 'base64'));
        await cdp.evaluate(clickText('Đóng'));
        await cdp.waitFor(`document.body.innerText.includes('Bạn còn thay đổi chưa lưu')`);
        await cdp.evaluate(clickText('Tiếp tục soạn'));
        assert(await cdp.evaluate(`document.querySelector('#guide-editor-title').value === 'Bài thử xuất bản'`));
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true }, cdp.sessionId);
        await sleep(400);
        assert(await cdp.evaluate(`document.querySelector('.ant-modal-content').scrollWidth <= innerWidth`), 'Mobile editor overflow');
        assert(await cdp.evaluate(`getComputedStyle(document.querySelector('[aria-label="Bản xem trước trực tiếp"]')).display === 'none'`));
        fs.writeFileSync('/tmp/lms-user-guide-editor-mobile.png', Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' }, cdp.sessionId)).data, 'base64'));
        await editorMode('Xem trước');
        await cdp.waitFor(`!!document.querySelector('[aria-label="Xem trước toàn bài"]')`);
        assert(await cdp.evaluate(`document.querySelector('[aria-label="Xem trước toàn bài"]').textContent.includes('Bước B')`));
        await cdp.evaluate(clickText('Xuất bản'));
        await cdp.waitFor(`!!document.querySelector('#guide-editor-description')`);
        assert(await cdp.evaluate(`document.body.innerText.includes('Thêm mô tả ngắn trước khi xuất bản')`));
        await cdp.evaluate(setInput('#guide-editor-description', 'Bài kiểm thử tạo, lưu và xuất bản trong phiên tạm.'));
        await cdp.evaluate(clickText('Lưu bản nháp'));
        await cdp.waitFor(`!document.querySelector('#guide-editor-description')`);
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, cdp.sessionId);
        await cdp.evaluate(setInput('[aria-label="Tìm bài viết trong quản lý"]', 'Bài thử xuất bản'));
        await cdp.waitFor(`[...document.querySelectorAll('tr')].some(row => row.innerText.includes('Bài thử xuất bản'))`);
        await cdp.evaluate(`(() => { const row = [...document.querySelectorAll('tr')].find(el => el.innerText.includes('Bài thử xuất bản')); [...row.querySelectorAll('button')].find(el => el.textContent === 'Sửa').click(); })()`);
        await cdp.waitFor(`!!document.querySelector('#guide-editor-title')`);
        assert(await cdp.evaluate(`document.querySelector('[aria-label="Nội dung bước 1"]').value === 'Bước B'`));
        await cdp.waitFor(`!!document.querySelector('#guide-editor-section-text strong')`);
        assert(await cdp.evaluate(`document.querySelector('#guide-editor-section-text a').getAttribute('href') === 'https://example.com/guide'`));
        assert.deepEqual(await cdp.evaluate(`[...document.querySelectorAll('[data-block-id]')].map(el => el.dataset.blockType)`), blockOrder);
        assert(await cdp.evaluate(`!!document.querySelector('#guide-editor-section-text img[alt="Ảnh minh họa bên trong đoạn văn"]')`));
        assert(await cdp.evaluate(`document.querySelectorAll('[data-block-type="table"]')[1].querySelector('[aria-label="Ô dòng 1 cột 1"]').value === 'Bảng thứ hai độc lập'`));
        await cdp.evaluate(clickText('Xuất bản'));
        await cdp.waitFor(`!document.querySelector('#guide-editor-title')`);
        await cdp.evaluate(clickText('Trang hướng dẫn'));
        await cdp.waitFor(`document.body.innerText.includes('${baselineCount + 1} bài hướng dẫn dành cho bạn')`);
        assert(await cdp.evaluate(`!!document.querySelector('a[href="/user-guide/bai-thu-xuat-ban"]')`), 'Published draft missing from reader');
        await cdp.evaluate(`document.querySelector('a[href="/user-guide/bai-thu-xuat-ban"]').click()`);
        await cdp.waitFor(`!!document.querySelector('article a[href="https://example.com/guide"]')`);
        assert.deepEqual(await cdp.evaluate(`[...document.querySelectorAll('article [data-guide-block]')].map(el => el.dataset.guideBlock)`), blockOrder);
        assert.equal(await cdp.evaluate(`document.querySelectorAll('article table').length`), 2);
        assert(await cdp.evaluate(`document.querySelector('article').innerText.includes('Lưu ý thứ hai độc lập') && document.querySelector('article').innerText.includes('Đoạn giải thích thứ hai độc lập.')`));
        assert(await cdp.evaluate(`!!document.querySelector('article img[alt="Ảnh minh họa bên trong đoạn văn"]')`));
        await cdp.evaluate(clickText('Về tất cả hướng dẫn'));
        await cdp.waitFor(`!!document.querySelector('a[href="/user-guide/bai-thu-xuat-ban"]')`);
        await cdp.evaluate(setInput('[aria-label="Tìm kiếm tài liệu hướng dẫn"]', 'Bảng thứ hai độc lập'));
        await cdp.waitFor(`!!document.querySelector('a[href="/user-guide/bai-thu-xuat-ban"]')`);
        await cdp.evaluate(clickText('Quản lý tài liệu'));
        await cdp.waitFor(`document.querySelector('h1')?.textContent === 'Quản lý tài liệu'`);
        await cdp.evaluate(setInput('[aria-label="Tìm bài viết trong quản lý"]', 'Bài thử xuất bản'));
        await cdp.waitFor(`[...document.querySelectorAll('tr')].some(row => row.innerText.includes('Bài thử xuất bản'))`);
        await cdp.evaluate(`(() => { const row = [...document.querySelectorAll('tr')].find(el => el.innerText.includes('Bài thử xuất bản')); [...row.querySelectorAll('button')].find(el => el.textContent === 'Ẩn').click(); })()`);
        await cdp.evaluate(clickText('Trang hướng dẫn'));
        await cdp.waitFor(`document.body.innerText.includes('${baselineCount} bài hướng dẫn dành cho bạn')`);
        assert(!(await cdp.evaluate(`!!document.querySelector('a[href="/user-guide/bai-thu-xuat-ban"]')`)), 'Hidden article leaked into reader');
        await cdp.navigate('/user-guide/no-such-article');
        await cdp.waitFor(`document.body.innerText.includes('Chưa tìm thấy tài liệu')`);
        await cdp.evaluate(`localStorage.setItem('guide-test-permissions', '["calendar.view"]')`);
        await cdp.navigate('/user-guide');
        await cdp.waitFor(`document.querySelector('h1')?.textContent === 'Hướng dẫn sử dụng'`);
        assert(await cdp.evaluate(`!!document.querySelector('a[href="/user-guide/tra-cuu-lich-hoc"]') && !document.querySelector('a[href="/user-guide/tim-bai-trong-de-cuong"]')`));
        assert(!(await cdp.evaluate(`!!document.querySelector('a[href="/user-guide/manage"]')`)), 'Management link visible to non-admin');
        await cdp.navigate('/user-guide/manage');
        await cdp.waitFor(`document.body.innerText.includes('Bạn chưa có quyền quản lý tài liệu')`);
        await cdp.navigate('/user-guide/tim-bai-trong-de-cuong?preview=1');
        await cdp.waitFor(`document.body.innerText.includes('Chưa tìm thấy tài liệu')`);
        await cdp.navigate('/user-guide/bai-thu-xuat-ban?preview=1');
        await cdp.waitFor(`document.body.innerText.includes('Chưa tìm thấy tài liệu')`);
        console.log('PASS: table captions contained, no dark gap after desktop/mobile TOC scrolling, persistent header menu across navigation, inline images and URL validation, repeated text/table/notice/steps blocks, drag and button reordering, ordered save/reopen/publish, search with/without accents, empty results, adapted Word content, reader/TOC, visual table editing, section and step ordering, live preview, unsaved changes guard, mobile editor, validation routing, metadata preservation, create draft, publish/hide, missing article, article permissions, management guard, preview guard. Auth mocked; no backend writes.');
    } finally {
        await cdp.close();
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
