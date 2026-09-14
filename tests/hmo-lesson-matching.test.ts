import assert from 'node:assert/strict';
import test from 'node:test';
import {
    hmoCalendarOccurrence,
    matchHmoLessonsByCourse,
    normalizeLessonTitle,
} from '../helper/hmoLessonMatching';

test('lấy occurrence tuyệt đối từ tiền tố Lịch n', () => {
    assert.equal(hmoCalendarOccurrence('Bài 14: Unit 2'), 1);
    assert.equal(hmoCalendarOccurrence(' [Lịch 2] - Unit 2'), 2);
    assert.equal(hmoCalendarOccurrence('Tên lấy nguyên từ đề cương', 0), 1);
    assert.equal(hmoCalendarOccurrence('Tên lấy nguyên từ đề cương', 1), 2);
    assert.equal(hmoCalendarOccurrence('[Lịch 2] - Tên bài', 2), 3);
});

test('tên lịch giống đề cương vẫn lấy đúng ID theo lesson_count', () => {
    const result = matchHmoLessonsByCourse([
        { package_id: 'a', course_id: '3426', lesson_id: '171067', lesson_name: 'Unit 2: The Generation Gap - Language Focus.' },
        { package_id: 'a', course_id: '3426', lesson_id: '171068', lesson_name: 'Unit 2: The Generation Gap - Language Focus.' },
        { package_id: 'a', course_id: '3426', lesson_id: '171069', lesson_name: 'Unit 2: The Generation Gap - Language Focus.' },
    ], [{
        key: 'third',
        title: 'Unit 2: The Generation Gap - Language Focus.',
        occurrence: hmoCalendarOccurrence('Unit 2: The Generation Gap - Language Focus.', 2),
    }]);

    assert.equal(result.matchesByRow.get('third')?.get('3426')?.lessonId, '171069');
});

test('coi phần trước hậu tố _Cô/_Thầy là tên đề cương', () => {
    assert.equal(
        normalizeLessonTitle('Ôn tập viết nghị luận xã hội - Phần 3_Cô Mai'),
        'on tap viet nghi luan xa hoi p3 co mai',
    );
});

test('chỉ chọn Lịch 2 vẫn nhận Lesson ID thứ hai', () => {
    const result = matchHmoLessonsByCourse([
        { package_id: 'a', course_id: '3426', lesson_id: '171067', lesson_name: 'Unit 2: The Generation Gap - Language Focus.' },
        { package_id: 'a', course_id: '3426', lesson_id: '171068', lesson_name: 'Unit 2: The Generation Gap - Language Focus.' },
    ], [{
        key: 'second',
        title: 'Unit 2: The Generation Gap - Language Focus.',
        occurrence: hmoCalendarOccurrence('[Lịch 2] - Unit 2: The Generation Gap - Language Focus.'),
    }]);

    assert.equal(result.matchesByRow.get('second')?.get('3426')?.lessonId, '171068');
});

test('dùng chung ID khi HMO chỉ có một ứng viên đúng tên và giáo viên', () => {
    const result = matchHmoLessonsByCourse([
        { package_id: 'a', course_id: '3426', lesson_id: '171067', lesson_name: 'Unit 2: The Generation Gap - Language Focus.' },
    ], [{
        key: 'second',
        title: 'Unit 2: The Generation Gap - Language Focus.',
        occurrence: 2,
    }]);

    assert.equal(result.matchesByRow.get('second')?.get('3426')?.lessonId, '171067');
});

test('ghép Lesson ID theo hậu tố giáo viên trong từng Course', () => {
    const result = matchHmoLessonsByCourse([
        { package_id: '9162', course_id: '3426', lesson_id: '172985', lesson_name: 'Ôn tập viết nghị luận xã hội - Phần 3_Cô Mai' },
        { package_id: '9162', course_id: '3426', lesson_id: '176621', lesson_name: 'Ôn tập viết nghị luận xã hội - Phần 3_Cô Xuân' },
        { package_id: '9185', course_id: '3391', lesson_id: '173277', lesson_name: 'Ôn tập viết nghị luận xã hội - Phần 3_Cô Mai' },
        { package_id: '9185', course_id: '3391', lesson_id: '176622', lesson_name: 'Ôn tập viết nghị luận xã hội - Phần 3_Cô Xuân' },
    ], [
        { key: 'mai', title: 'Ôn tập viết nghị luận xã hội - Phần 3.', teacher: 'Mai Thị Phương Mai' },
        { key: 'xuan', title: 'Ôn tập viết nghị luận xã hội - Phần 3.', teacher: 'Nguyễn Thị Xuân' },
    ]);

    assert.deepEqual(
        Object.fromEntries([...result.matchesByRow.get('mai')!].map(([courseId, match]) => [courseId, match.lessonId])),
        { '3426': '172985', '3391': '173277' },
    );
    assert.deepEqual(
        Object.fromEntries([...result.matchesByRow.get('xuan')!].map(([courseId, match]) => [courseId, match.lessonId])),
        { '3426': '176621', '3391': '176622' },
    );
    assert.deepEqual(Object.fromEntries(result.matchedRowCountByCourse), { '3426': 2, '3391': 2 });
});

test('gán Lesson ID khác nhau cho lịch thường và Lịch 2 dù cùng giáo viên', () => {
    const result = matchHmoLessonsByCourse([
        { package_id: '9200', course_id: '3426', lesson_id: '175500', lesson_name: 'Ôn tập giữa kì I - Phần 2_Cô Mai' },
        { package_id: '9200', course_id: '3426', lesson_id: '175501', lesson_name: 'Ôn tập giữa kì I - Phần 2_Cô Mai' },
        { package_id: '9209', course_id: '3392', lesson_id: '175757', lesson_name: 'Ôn tập giữa kì I - Phần 2_Cô Mai' },
        { package_id: '9209', course_id: '3392', lesson_id: '175758', lesson_name: 'Ôn tập giữa kì I - Phần 2_Cô Mai' },
    ], [
        { key: 'normal', title: 'Ôn tập giữa kì I - Phần 2.', teacher: 'Mai Thị Phương Mai' },
        { key: 'second', title: '[Lịch 2] - Ôn tập giữa kì I - Phần 2.', teacher: 'Mai Thị Phương Mai' },
    ]);

    assert.deepEqual(
        Object.fromEntries([...result.matchesByRow.get('normal')!].map(([courseId, match]) => [courseId, match.lessonId])),
        { '3426': '175500', '3392': '175757' },
    );
    assert.deepEqual(
        Object.fromEntries([...result.matchesByRow.get('second')!].map(([courseId, match]) => [courseId, match.lessonId])),
        { '3426': '175501', '3392': '175758' },
    );
    assert.deepEqual(Object.fromEntries(result.matchedRowCountByCourse), { '3426': 2, '3392': 2 });
});

test('ghép đúng hậu tố HMO có đầy đủ họ tên giáo viên', () => {
    const result = matchHmoLessonsByCourse([
        { package_id: 'a', course_id: '1771', lesson_id: '171233', lesson_name: 'Từ phân chia theo cấu tạo_Cô Vũ Hồng Ngọc' },
        { package_id: 'b', course_id: '1771', lesson_id: '171235', lesson_name: 'Từ phân chia theo cấu tạo_Cô Nguyễn Thị Liệu' },
        { package_id: 'c', course_id: '3356', lesson_id: '173130', lesson_name: 'Từ phân chia theo cấu tạo_Cô Vũ Hồng Ngọc' },
        { package_id: 'd', course_id: '3356', lesson_id: '173132', lesson_name: 'Từ phân chia theo cấu tạo_Cô Nguyễn Thị Liệu' },
    ], [
        { key: 'ngoc', title: 'Từ phân chia theo cấu tạo', teacher: 'Vũ Hồng Ngọc' },
        { key: 'lieu', title: 'Từ phân chia theo cấu tạo', teacher: 'Nguyễn Thị Liệu' },
    ]);

    assert.deepEqual(
        Object.fromEntries([...result.matchesByRow.get('ngoc')!].map(([courseId, match]) => [courseId, match.lessonId])),
        { '1771': '171233', '3356': '173130' },
    );
    assert.deepEqual(
        Object.fromEntries([...result.matchesByRow.get('lieu')!].map(([courseId, match]) => [courseId, match.lessonId])),
        { '1771': '171235', '3356': '173132' },
    );
});

test('ưu tiên đủ họ tên trước tên gọi ngắn dù lesson_count là Lịch 2', () => {
    const result = matchHmoLessonsByCourse([
        { package_id: '9149', course_id: '1768', lesson_id: '168443', lesson_name: 'Hình tam giác đều, hình vuông, hình lục giác đều_Cô Nguyễn Thị Chi' },
        { package_id: '9149', course_id: '1768', lesson_id: '168758', lesson_name: 'Hình tam giác đều, hình vuông, hình lục giác đều_Cô Chi' },
    ], [{
        key: 'chi',
        title: 'Hình tam giác đều, hình vuông, hình lục giác đều',
        teacher: 'Nguyễn Thị Chi',
        occurrence: 2,
    }]);

    assert.equal(result.matchesByRow.get('chi')?.get('1768')?.lessonId, '168443');
});

test('vẫn dùng tên gọi ngắn khi HMO không có bản đủ họ tên', () => {
    const result = matchHmoLessonsByCourse([
        { package_id: '9149', course_id: '1768', lesson_id: '168758', lesson_name: 'Hình tam giác đều, hình vuông, hình lục giác đều_Cô Chi' },
    ], [{
        key: 'chi',
        title: 'Hình tam giác đều, hình vuông, hình lục giác đều',
        teacher: 'Nguyễn Thị Chi',
        occurrence: 2,
    }]);

    assert.equal(result.matchesByRow.get('chi')?.get('1768')?.lessonId, '168758');
});

test('Lịch 2 của đề số 1 không được lấy ứng viên fuzzy đề số 2', () => {
    const result = matchHmoLessonsByCourse([
        { package_id: '9169', course_id: '2434', lesson_id: '167996', lesson_name: 'ĐỀ ÔN TẬP GIỮA HỌC KÌ 1 - SỐ 1_Cô Nguyễn Thị Thìn' },
        { package_id: '9169', course_id: '2434', lesson_id: '168001', lesson_name: 'ĐỀ ÔN TẬP GIỮA HỌC KÌ 1 - SỐ 2_Cô Nguyễn Thị Thìn' },
    ], [{
        key: 'second-calendar',
        title: 'ĐỀ ÔN TẬP GIỮA HỌC KÌ 1 - SỐ 1',
        teacher: 'Nguyễn Thị Thìn',
        occurrence: 2,
    }]);

    assert.equal(result.matchesByRow.get('second-calendar')?.get('2434')?.lessonId, '167996');
});
