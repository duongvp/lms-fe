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
