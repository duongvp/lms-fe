import assert from 'node:assert/strict';
import test from 'node:test';
import {
    matchHmoLessonsByCourse,
    normalizeLessonTitle,
} from '../helper/hmoLessonMatching';

test('coi phần trước hậu tố _Cô/_Thầy là tên đề cương', () => {
    assert.equal(
        normalizeLessonTitle('Ôn tập viết nghị luận xã hội - Phần 3_Cô Mai'),
        'on tap viet nghi luan xa hoi p3 co mai',
    );
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

test('cho phép lịch thường và Lịch 2 cùng giáo viên dùng lại Lesson ID của mỗi Course', () => {
    const result = matchHmoLessonsByCourse([
        { package_id: '9200', course_id: '3426', lesson_id: '175500', lesson_name: 'Ôn tập giữa kì I - Phần 2_Cô Mai' },
        { package_id: '9209', course_id: '3392', lesson_id: '175757', lesson_name: 'Ôn tập giữa kì I - Phần 2_Cô Mai' },
    ], [
        { key: 'normal', title: 'Ôn tập giữa kì I - Phần 2.', teacher: 'Mai Thị Phương Mai' },
        { key: 'second', title: '[Lịch 2] - Ôn tập giữa kì I - Phần 2.', teacher: 'Mai Thị Phương Mai' },
    ]);

    for (const rowKey of ['normal', 'second']) {
        assert.deepEqual(
            Object.fromEntries([...result.matchesByRow.get(rowKey)!].map(([courseId, match]) => [courseId, match.lessonId])),
            { '3426': '175500', '3392': '175757' },
        );
    }
    assert.deepEqual(Object.fromEntries(result.matchedRowCountByCourse), { '3426': 2, '3392': 2 });
});
