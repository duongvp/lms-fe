import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeferredRangeUpdate, getDefaultLessonRange, getLessonRangeFieldError, selectLessonsInRange, validateLessonRange } from '../helper/autoScheduleRange';

test('ô Đến bài chỉ trả một lỗi phù hợp, không so sánh khi dữ liệu chưa hợp lệ', () => {
    for (const value of [null, undefined, '']) {
        assert.equal(getLessonRangeFieldError(value, 'to', 30, 5), 'Nhập bài kết thúc');
    }
    assert.equal(getLessonRangeFieldError(4, 'to', 30, 5), 'Đến bài phải lớn hơn hoặc bằng Từ bài');
    assert.equal(getLessonRangeFieldError(5, 'to', 30, 5), undefined);
    assert.equal(getLessonRangeFieldError(15, 'to', 30, 5), undefined);
    assert.equal(getLessonRangeFieldError(0, 'to', 30, 5), 'Nhập số bài nguyên từ 1 đến 30');
    assert.equal(getLessonRangeFieldError(1.5, 'to', 30, 5), 'Nhập số bài nguyên từ 1 đến 30');
    assert.equal(getLessonRangeFieldError(31, 'to', 30, 5), 'Nhập số bài nguyên từ 1 đến 30');
    assert.equal(getLessonRangeFieldError(2, 'to', 30, null), undefined);
    assert.equal(getLessonRangeFieldError(2, 'to', 30, 31), undefined);
});

test('nhập nhanh chỉ áp dụng khoảng cuối sau 300 ms', (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    const update = createDeferredRangeUpdate();
    const applied: number[] = [];
    update.schedule(() => applied.push(1));
    context.mock.timers.tick(100);
    update.schedule(() => applied.push(15));
    context.mock.timers.tick(299);
    assert.deepEqual(applied, []);
    context.mock.timers.tick(1);
    assert.deepEqual(applied, [15]);
});

test('blur/xem trước áp dụng ngay, khoảng sai hoặc đóng modal hủy cập nhật chờ', (context) => {
    context.mock.timers.enable({ apis: ['setTimeout'] });
    const update = createDeferredRangeUpdate();
    const applied: number[] = [];
    update.schedule(() => applied.push(15));
    update.flush();
    assert.deepEqual(applied, [15]);
    context.mock.timers.tick(300);
    assert.deepEqual(applied, [15]);
    update.schedule(() => applied.push(30));
    update.cancel();
    context.mock.timers.tick(300);
    assert.deepEqual(applied, [15]);
});

const lessons = Array.from({ length: 30 }, (_, index) => ({
    id: String(index + 1), learn_number: index + 1, scheduled_count: 0,
}));

test('gợi ý khoảng từ bài đầu đến bài cuối chưa có lịch', () => {
    assert.deepEqual(getDefaultLessonRange(lessons), { from_learn_number: 1, to_learn_number: 30 });
    const onlyFirstRemaining = lessons.map((lesson) => ({
        ...lesson, scheduled_count: lesson.learn_number === 1 ? 0 : 2,
    }));
    assert.deepEqual(getDefaultLessonRange(onlyFirstRemaining), { from_learn_number: 1, to_learn_number: 1 });
    const afterFirstBatch = lessons.map((lesson) => ({
        ...lesson, scheduled_count: lesson.learn_number <= 15 ? 2 : 0,
    }));
    assert.deepEqual(getDefaultLessonRange(afterFirstBatch), { from_learn_number: 16, to_learn_number: 30 });
    const remainingMiddle = lessons.map((lesson) => ({
        ...lesson, scheduled_count: lesson.learn_number >= 16 && lesson.learn_number <= 25 ? 0 : 2,
    }));
    assert.deepEqual(getDefaultLessonRange(remainingMiddle), { from_learn_number: 16, to_learn_number: 25 });
    assert.deepEqual(getDefaultLessonRange(lessons.map((lesson) => ({ ...lesson, scheduled_count: 2 }))),
        { from_learn_number: undefined, to_learn_number: undefined });
    assert.deepEqual(getDefaultLessonRange([]), { from_learn_number: undefined, to_learn_number: undefined });
});

test('chọn hai đợt 1–15 và 16–30 theo số bài gốc, không tạo lại đợt đã có lịch', () => {
    const first = selectLessonsInRange(lessons, 1, 15);
    assert.deepEqual(first.map((lesson) => lesson.learn_number), Array.from({ length: 15 }, (_, i) => i + 1));
    const afterCommit = lessons.map((lesson) => ({ ...lesson, scheduled_count: lesson.learn_number <= 15 ? 2 : 0 }));
    assert.equal(selectLessonsInRange(afterCommit, 1, 15).length, 0);
    assert.deepEqual(selectLessonsInRange(afterCommit, 16, 30).map((lesson) => lesson.learn_number),
        Array.from({ length: 15 }, (_, i) => i + 16));
});

test('giữ thứ tự đề cương, bỏ bài đã có lịch và không bù bằng bài ngoài khoảng', () => {
    const source = [
        { learn_number: 16, scheduled_count: 0 },
        { learn_number: 18, scheduled_count: 3 },
        { learn_number: 20, scheduled_count: 0 },
        { learn_number: 30, scheduled_count: 0 },
    ];
    assert.deepEqual(selectLessonsInRange(source, 16, 20).map((lesson) => lesson.learn_number), [16, 20]);
    assert.deepEqual(selectLessonsInRange(source, 20, 20).map((lesson) => lesson.learn_number), [20]);
    assert.equal(selectLessonsInRange(source, 21, 29).length, 0);
});

test('kiểm tra khoảng hợp lệ và từ chối số bài không hợp lệ', () => {
    validateLessonRange(1, 15);
    validateLessonRange(16, 16);
    for (const [from, to] of [[16, 15], [0, 15], [1.5, 15], [1, NaN], [NaN, 15]]) {
        assert.throws(() => validateLessonRange(from, to), /Khoảng bài không hợp lệ/);
    }
});
