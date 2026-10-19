import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveScheduleProgramMetadata } from '../helper/scheduleProgram';

const program = { subject_code: 'feed-tramtiepsuctrithuc', subject_name: 'Chia sẻ', system_type: 'topuni' as const, grade: 12 };

test('chưa tải được chương trình thì không tự nhận Topclass; tải xong nhận đúng Topuni', () => {
    assert.equal(resolveScheduleProgramMetadata(program.subject_code, [], []), undefined);
    assert.equal(resolveScheduleProgramMetadata(program.subject_code, [], [program])?.system_type, 'topuni');
});

test('ưu tiên hệ thống trong đề cương của đúng chương trình, kể cả option cũ ghi Topclass', () => {
    assert.equal(resolveScheduleProgramMetadata(program.subject_code, [program], [{ ...program, system_type: 'topclass' }])?.system_type, 'topuni');
    assert.equal(resolveScheduleProgramMetadata(program.subject_code, [{ ...program, subject_code: 'other' }], [])?.system_type, undefined);
});

test('chương trình Topclass vẫn nhận đúng Topclass và không dùng dữ liệu Feed của chương trình trước', () => {
    const topclass = { ...program, subject_code: 'toan-9-2027', system_type: 'topclass' as const };
    assert.equal(resolveScheduleProgramMetadata(topclass.subject_code, [program], [topclass])?.system_type, 'topclass');
    assert.equal(resolveScheduleProgramMetadata(undefined, [program], [topclass]), undefined);
});
