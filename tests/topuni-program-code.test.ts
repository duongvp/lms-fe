import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLessonSubjectCode, buildTopuniProgramCode } from '../helper/lesson';
import { getTopuniPathwayOptions } from '../constants/topuniProgram';

test('sinh đúng các mã Tổng ôn trong sheet, thay vact-v bằng vact', () => {
    const examples = [
        ['Toán', 'tsa', 'v', 'tongontoantsav2027'],
        ['Đọc hiểu', 'tsa', 'v', 'tongondochieutsav2027'],
        ['Vật lí', 'tsa', 'v', 'tongonvatlitsav2027'],
        ['Hóa học', 'tsa', 'v', 'tongonhoahoctsav2027'],
        ['Sinh học', 'tsa', 'v', 'tongonsinhhoctsav2027'],
        ['Tiếng Anh', 'vact-v', 'v', 'tongontienganhvactv2027'],
        ['Toán', 'vact-v', 'a', 'tongontoanvacta2027'],
        ['Tiếng Việt', 'vact-v', 'v', 'tongontiengvietvactv2027'],
        ['SLKH', 'vact-v', 'v', 'tongonslkhvactv2027'],
        ['LGPTSL', 'vact-v', 'v', 'tongonlgptslvactv2027'],
        ['Tiếng Việt', 'vact-v', 's', 'tongontiengvietvacts2027'],
        ['Tiếng Anh', 'vact-v', 's', 'tongontienganhvacts2027'],
        ['Khoa học', 'vact-v', 's', 'tongonkhoahocvacts2027'],
        ['Toán', 'tc', 'v', 'tongontoantcv2027'],
        ['Toán', 'tnthpt', 'v', 'tongontoantnthptv2027'],
        ['Định lượng', 'hsa', 'v', 'tongondinhluonghsav2027'],
        ['Định tính', 'hsa', 'v', 'tongondinhtinhhsav2027'],
        ['Tiếng Anh', 'hv', 'v', 'tongontienganhhvv2027'],
        ['Tiếng Anh', 'hsa', 'v', 'tongontienganhhsav2027'],
        ['Vật lí', 'hsa', 'v', 'tongonvatlihsav2027'],
        ['Vật lí', 'ht', 'v', 'tongonvatlihtv2027'],
        ['Hóa học', 'hsa', 'v', 'tongonhoahochsav2027'],
        ['Hóa học', 'ht', 'v', 'tongonhoahochtv2027'],
        ['Sinh học', 'hsa', 'v', 'tongonsinhhochsav2027'],
        ['Sinh học', 'ht', 'v', 'tongonsinhhochtv2027'],
        ['Ngữ văn', 'tnthpt', 'v', 'tongonnguvantnthptv2027'],
        ['Tiếng Anh', 'tnthpt', 'v', 'tongontienganhtnthptv2027'],
        ['Lịch sử', 'hsa', 'v', 'tongonlichsuhsav2027'],
        ['Địa lí', 'hsa', 'v', 'tongondialihsav2027'],
    ];
    for (const [subjectName, exam, pathway, expected] of examples) {
        assert.equal(buildTopuniProgramCode({ phase: 'Tổng ôn', subjectName, exam, pathway, schoolYear: 2027 }), expected);
        assert.ok(getTopuniPathwayOptions(exam, subjectName).some((option) => option.value === pathway));
    }
});

test('lọc lộ trình theo đúng kỳ thi và môn trong sheet', () => {
    const values = (exam: string, subject?: string) => getTopuniPathwayOptions(exam, subject).map((option) => option.value);
    assert.deepEqual(values('tsa', 'Toán'), ['v']);
    assert.deepEqual(values('tsa', 'Vật lý'), ['v']);
    assert.deepEqual(values('vact', 'Toán'), ['a']);
    assert.deepEqual(values('vact', 'SLKH'), ['v']);
    assert.deepEqual(values('vact', 'Khoa học'), ['s']);
    assert.deepEqual(values('vact', 'Tiếng Anh'), ['v', 's']);
    assert.deepEqual(values('vact-v', 'Tiếng Việt'), ['v', 's']);
    assert.deepEqual(values('hsa', 'Toán'), ['v', 'a', 's']);
    assert.deepEqual(values('hsa', 'Định lượng'), ['v']);
    assert.deepEqual(values('hsa', 'Định tính'), ['v']);
    assert.deepEqual(values('hsa', 'Địa lý'), ['v']);
    assert.deepEqual(values('tnthpt', 'Ngữ văn'), ['v']);
    assert.deepEqual(values('hv', 'Tiếng Anh'), ['v']);
    assert.deepEqual(values('ht', 'Vật lý'), ['v']);
    assert.deepEqual(values('tc', 'Toán'), ['v']);
    assert.deepEqual(values('ht', 'Tiếng Anh'), ['v', 'a', 's']);
    assert.deepEqual(values('tsa', 'Tiếng Anh'), ['v', 'a', 's']);
    assert.deepEqual(values('tsa', 'Công nghệ'), ['v', 'a', 's']);
    assert.deepEqual(values(''), []);
});

test('chuẩn hóa tên môn tương đương và mã VACT mới', () => {
    assert.equal(buildTopuniProgramCode({ phase: 'tongon', subjectName: 'Vật lý', exam: 'TSA', pathway: 'V', schoolYear: 2027 }), 'tongonvatlitsav2027');
    assert.equal(buildTopuniProgramCode({ phase: 'tongon', subjectName: 'Toán', exam: 'VACT', pathway: 'A', schoolYear: 2028 }), 'tongontoanvacta2028');
});

test('chưa sinh mã khi thiếu thành phần; giữ cách sinh mã Topclass', () => {
    const complete = { phase: 'tongon', subjectName: 'Toán', exam: 'tsa', pathway: 'v', schoolYear: 2027 };
    for (const key of ['phase', 'subjectName', 'exam', 'pathway', 'schoolYear']) {
        assert.equal(buildTopuniProgramCode({ ...complete, [key]: undefined }), '');
        assert.equal(buildTopuniProgramCode({ ...complete, [key]: '' }), '');
    }
    assert.equal(buildTopuniProgramCode({ ...complete, subjectName: 'Công nghệ', pathway: 's' }), 'tongoncongnghetsas2027');
    assert.equal(buildLessonSubjectCode('Ngữ văn', 6, 2027), 'nguvan-6-2027');
});

test('số giai đoạn được chèn sau Tổng ôn, để trống không thêm số', () => {
    const complete = { phase: 'tongon', subjectName: 'Toán', exam: 'tsa', pathway: 'v', schoolYear: 2027 };
    assert.equal(buildTopuniProgramCode({ ...complete, phaseNumber: 3 }), 'tongon3toantsav2027');
    assert.equal(buildTopuniProgramCode({ ...complete, phaseNumber: 2 }), 'tongon2toantsav2027');
    assert.equal(buildTopuniProgramCode(complete), 'tongontoantsav2027');
    assert.equal(buildTopuniProgramCode({ ...complete, phaseNumber: null }), 'tongontoantsav2027');
    for (const phaseNumber of [0, -1, 1.5, NaN]) {
        assert.equal(buildTopuniProgramCode({ ...complete, phaseNumber }), '');
    }
    assert.equal(buildTopuniProgramCode({ ...complete, exam: undefined, phaseNumber: 3 }), '');
});
