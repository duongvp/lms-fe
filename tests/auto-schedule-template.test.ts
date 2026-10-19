import assert from 'node:assert/strict';
import test from 'node:test';
import dayjs from 'dayjs';
import { syncTopuniTemplateChanges } from '../helper/autoScheduleTemplate';

const at = (time: string) => dayjs(`2026-10-14T${time}:00`);

test('sửa khung giờ thứ 4 thành 22:00–23:00 cập nhật giờ gửi tạo cho các bài cùng thứ', () => {
    const blocks = [{ lessons: [{ learn_number: 1, sessions: [{ weekday: 3, start_time: at('21:00'), end_time: at('22:00'), teacher: 'gv', hmo_mapping_keys: ['mapping'] }] }] }];
    const start = at('22:00'), end = at('23:00');
    const updated = syncTopuniTemplateChanges(blocks, [{ weekday: 3, start_time: start, end_time: end }], [{ start_time: start }]);
    const session = updated[0].lessons[0].sessions[0];
    assert.equal(session.start_time.format('HH:mm'), '22:00');
    assert.equal(session.end_time.format('HH:mm'), '23:00');
    assert.equal(session.teacher, 'gv');
    assert.deepEqual(session.hmo_mapping_keys, ['mapping']);
    assert.equal(blocks[0].lessons[0].sessions[0].start_time.format('HH:mm'), '21:00');
});

test('chỉ đồng bộ ô vừa sửa, giữ lịch riêng của thứ khác và giờ ngoại lệ khi đổi giáo viên', () => {
    const blocks = [{ lessons: [{ sessions: [
        { weekday: 3, start_time: at('20:00'), teacher: 'old' },
        { weekday: 4, start_time: at('19:00'), teacher: 'other' },
    ] }] }];
    const updated = syncTopuniTemplateChanges(blocks, [{ weekday: 3, start_time: at('22:00'), teacher: 'new' }], [{ teacher: 'new' }]);
    assert.equal(updated[0].lessons[0].sessions[0].teacher, 'new');
    assert.equal(updated[0].lessons[0].sessions[0].start_time.format('HH:mm'), '20:00');
    assert.equal(updated[0].lessons[0].sessions[1].teacher, 'other');
});

test('mảng thay đổi thưa cập nhật đúng thứ, xóa giờ kết thúc không hợp lệ khỏi dữ liệu bài', () => {
    const changes: any[] = [];
    changes[1] = { start_time: at('23:00') };
    const updated = syncTopuniTemplateChanges([{ lessons: [{ sessions: [{ weekday: 4, end_time: at('22:00') }] }] }], [
        { weekday: 3 }, { weekday: 4, start_time: at('23:00'), end_time: undefined },
    ], changes);
    assert.equal(updated[0].lessons[0].sessions[0].end_time, undefined);
});
