import assert from 'node:assert/strict';
import test from 'node:test';
import {
    hmoCalendarOccurrence,
    matchHmoLessonsByCourse,
    mergeHmoMappingKeys,
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


test('bài 67 và 81 cùng tên vẫn ghép theo đúng tháng của session', () => {
    const options = [
        { package_id: '9149', course_id: '1768', lesson_id: '168530', lesson_name: 'Ôn tập phân số và số thập phân_Cô Dương Thùy Linh', section_name: 'Tháng 2/2027' },
        { package_id: '9149', course_id: '1768', lesson_id: '168531', lesson_name: 'Ôn tập phân số và số thập phân_Cô Nguyễn Thị Chi', section_name: 'Tháng 2/2027' },
        { package_id: '9149', course_id: '1768', lesson_id: '168558', lesson_name: 'Ôn tập phân số và số thập phân_Cô Dương Thùy Linh', section_name: 'Tháng 4/2027' },
        { package_id: '9149', course_id: '1768', lesson_id: '168559', lesson_name: 'Ôn tập phân số và số thập phân_Cô Nguyễn Thị Chi', section_name: 'Tháng 4/2027' },
    ];
    const result = matchHmoLessonsByCourse(options, [
        { key: '67-linh', title: 'Ôn tập phân số và số thập phân..', teacher: 'Dương Thùy Linh', startTime: '2027-02-25T18:00:00.000Z' },
        { key: '67-chi', title: 'Ôn tập phân số và số thập phân..', teacher: 'Nguyễn Thị Chi', occurrence: 2, startTime: '2027-02-27T20:00:00.000Z' },
        { key: '81-linh', title: 'Ôn tập phân số và số thập phân..', teacher: 'Dương Thùy Linh', startTime: '2027-04-15T18:00:00.000Z' },
        { key: '81-chi', title: 'Ôn tập phân số và số thập phân..', teacher: 'Nguyễn Thị Chi', startTime: '2027-04-17T20:00:00.000Z' },
    ]);

    assert.equal(result.matchesByRow.get('67-linh')?.get('1768')?.lessonId, '168530');
    assert.equal(result.matchesByRow.get('67-chi')?.get('1768')?.lessonId, '168531');
    assert.equal(result.matchesByRow.get('81-linh')?.get('1768')?.lessonId, '168558');
    assert.equal(result.matchesByRow.get('81-chi')?.get('1768')?.lessonId, '168559');
});

test('session Livestream không chia tháng duy nhất được tự gán khi đúng tên và giáo viên', () => {
    const result = matchHmoLessonsByCourse([{
        package_id: '9149',
        course_id: '1768',
        lesson_id: '900001',
        lesson_name: 'Ôn tập phân số và số thập phân_Cô Nguyễn Thị Chi',
        section_name: 'Học tập tương tác',
    }], [{
        key: 'uncertain',
        title: 'Ôn tập phân số và số thập phân..',
        teacher: 'Nguyễn Thị Chi',
        startTime: '2027-03-10T20:00:00.000Z',
    }]);

    assert.equal(result.matchesByRow.get('uncertain')?.get('1768')?.lessonId, '900001');
});

test('Feed ghép bài giảng trong chuyên đề không chia tháng cho từng Course', () => {
    const title = 'Chia sẻ cách ôn luyện cân bằng giữa việc học trên trường và kỳ thi TSA';
    const result = matchHmoLessonsByCourse(['3124', '3449', '3485'].map((courseId) => ({
        package_id: '1', course_id: courseId, lesson_id: `lesson-${courseId}`,
        lesson_name: title, section_name: 'Trạm tiếp sức tri thức', section_id: `section-${courseId}`,
    })), [{ key: 'feed', title, programCode: 'feed-tramtiepsuctrithuc', startTime: '2026-10-14T22:00:00Z' }]);
    for (const courseId of ['3124', '3449', '3485']) {
        assert.equal(result.matchesByRow.get('feed')?.get(courseId)?.lessonId, `lesson-${courseId}`);
        assert.equal(result.unmatchedReasonsByRow.get('feed')?.has(courseId), false);
    }
});

test('Feed ghép tên bài khi HMO không có tên session và vẫn phân biệt giáo viên', () => {
    const result = matchHmoLessonsByCourse([
        { package_id: '1', course_id: '3124', lesson_id: 'a', lesson_name: 'Bài giảng_Cô Mai' },
        { package_id: '1', course_id: '3124', lesson_id: 'b', lesson_name: 'Bài giảng_Cô Lan' },
    ], [{ key: 'feed', title: 'Bài giảng', teacher: 'Nguyễn Thị Mai', programCode: 'feed-topic', startTime: '2026-10-14' }]);
    assert.equal(result.matchesByRow.get('feed')?.get('3124')?.lessonId, 'a');
});

test('Feed không tự chọn giữa hai session chuyên đề cùng tên bài và giáo viên', () => {
    const result = matchHmoLessonsByCourse(['a', 'b'].map((id) => ({
        package_id: '1', course_id: '3124', lesson_id: id, lesson_name: 'Bài giảng', section_id: id, section_name: 'Chuyên đề',
    })), [{ key: 'feed', title: 'Bài giảng', programCode: 'feed-topic', startTime: '2026-10-14' }]);
    assert.equal(result.matchesByRow.get('feed')?.has('3124'), false);
    assert.equal(result.unmatchedReasonsByRow.get('feed')?.get('3124'), 'SESSION_UNCERTAIN');
});

test('ưu tiên session đúng tháng, fallback khi mỗi Course chỉ có một ứng viên', () => {
    const options = [
        { package_id: '1', course_id: '3124', lesson_id: 'oct', lesson_name: 'Bài giảng', section_name: 'Tháng 10/2026' },
        { package_id: '1', course_id: '3124', lesson_id: 'topic', lesson_name: 'Bài giảng', section_name: 'Chuyên đề' },
    ];
    const row = { key: 'feed', title: 'Bài giảng', programCode: 'feed-topic', startTime: '2026-10-14' };
    assert.equal(matchHmoLessonsByCourse(options, [row]).matchesByRow.get('feed')?.get('3124')?.lessonId, 'oct');
    assert.equal(matchHmoLessonsByCourse(options.slice(0, 1), [{ ...row, startTime: '2026-11-14' }]).matchesByRow.get('feed')?.get('3124')?.lessonId, 'oct');
});


test('cùng một bài bắc qua đầu tháng vẫn dùng session duy nhất đã được xác nhận', () => {
    const result = matchHmoLessonsByCourse([
        { package_id: '9196', course_id: '3353', lesson_id: '173858', lesson_name: 'Đề luyện cuối kì I_Đề số 04_Cô Dương Thùy Linh', section_id: '1097911', section_name: 'Tháng 12/2026' },
        { package_id: '9196', course_id: '3353', lesson_id: '173883', lesson_name: 'Đề luyện cuối kì I_Đề số 04_Cô Nguyễn Thị Chi', section_id: '1097911', section_name: 'Tháng 12/2026' },
    ], [
        { key: '55-linh', title: 'Đề luyện cuối kì I_Đề số 04..', teacher: 'Dương Thùy Linh', startTime: '2026-12-31T18:00:00.000Z' },
        { key: '55-chi', title: 'Đề luyện cuối kì I_Đề số 04..', teacher: 'Nguyễn Thị Chi', occurrence: 2, startTime: '2027-01-02T20:00:00.000Z' },
    ]);

    assert.equal(result.matchesByRow.get('55-linh')?.get('3353')?.lessonId, '173858');
    assert.equal(result.matchesByRow.get('55-chi')?.get('3353')?.lessonId, '173883');
});


test('loại ID section bỏ và tự map sang section Chặng 1 hợp lệ', () => {
    const title = 'Lí thuyết đọc hiểu truyện ngắn hiện đại';
    for (const marker of ['(BỎ)', '(bỏ)', '(Bỏ)', '(bỎ)']) {
        const result = matchHmoLessonsByCourse([
            { package_id: '9408', course_id: '3562', lesson_id: '179133', lesson_name: title,
                section_id: 'old', section_name: `Chặng 1 ${marker}` },
            { package_id: '9408', course_id: '3562', lesson_id: '179163', lesson_name: title,
                section_id: 'active', section_name: 'Chặng 1: Các chủ đề trọng tâm - Học kì I' },
        ], [{ key: '1', title, startTime: '2026-11-11T14:00:00Z' }]);
        assert.equal(result.matchesByRow.get('1')?.get('3562')?.lessonId, '179163');
    }
});


test('Livestream vẫn cần chọn thủ công khi nhiều section Chặng cùng khớp', () => {
    const title = 'Lí thuyết đọc hiểu truyện ngắn hiện đại';
    const result = matchHmoLessonsByCourse(['1', '2'].map((id) => ({
        package_id: '9408', course_id: '3562', lesson_id: id, lesson_name: title,
        section_id: id, section_name: `Chặng ${id}`,
    })), [{ key: '1', title, startTime: '2026-11-11T14:00:00Z', programCode: 'LIVE' }]);
    assert.equal(result.matchesByRow.get('1')?.has('3562'), false);
    assert.equal(result.unmatchedReasonsByRow.get('1')?.get('3562'), 'SESSION_UNCERTAIN');
});

test('TSA P1/P2 tự gán đủ hai Course trong section TOÁN_Tháng 12/2026', () => {
    const title = 'Luyện đề TSA-OD-Phần Tư duy Toán';
    for (const prefix of ['TOÁN_', 'TOÁN - ', 'toán_', 'TOÁN: ']) {
        const options = [
            { package_id: '9056', course_id: '3297', lesson_id: '179221', lesson_name: `${title}-P1` },
            { package_id: '9131', course_id: '3342', lesson_id: '179490', lesson_name: `${title}-P1` },
            { package_id: '9056', course_id: '3297', lesson_id: '179222', lesson_name: `${title}-P2` },
            { package_id: '9131', course_id: '3342', lesson_id: '179491', lesson_name: `${title}-P2` },
        ].map((option) => ({ ...option, section_name: `${prefix}Tháng 12/2026` }));
        const rows = [
            { key: 'p1', title: `${title}-P1`, startTime: '2026-12-02T12:00:00Z' },
            { key: 'p2', title: `${title}-P2`, startTime: '2026-12-04T11:00:00Z' },
        ];
        const result = matchHmoLessonsByCourse(options, rows);
        assert.deepEqual([...result.matchesByRow.get('p1')!.values()].map((match) => match.lessonId), ['179221', '179490']);
        assert.deepEqual([...result.matchesByRow.get('p2')!.values()].map((match) => match.lessonId), ['179222', '179491']);
        const wrongMonth = matchHmoLessonsByCourse(options, rows.map((row) => ({ ...row, startTime: '2026-11-02T12:00:00Z' })));
        assert.equal(wrongMonth.matchesByRow.get('p2')!.size, 0);
        const wrongYear = matchHmoLessonsByCourse(options, rows.map((row) => ({ ...row, startTime: '2027-12-02T12:00:00Z' })));
        assert.equal(wrongYear.matchesByRow.get('p2')!.size, 0);
    }
});

test('Course thiếu ứng viên một lịch không chặn kết quả của lịch khác', () => {
    const title = 'Luyện đề TSA-OD-Phần Tư duy Toán-P2';
    const result = matchHmoLessonsByCourse([
        { package_id: '9056', course_id: '3297', lesson_id: '179222', lesson_name: `${title}_Cô Mai`, section_name: 'TOÁN_Tháng 12/2026' },
        { package_id: '9131', course_id: '3342', lesson_id: '179491', lesson_name: `${title}_Cô Mai`, section_name: 'TOÁN_Tháng 12/2026' },
        { package_id: '9056', course_id: '3297', lesson_id: 'other', lesson_name: `${title}_Cô Lan`, section_name: 'TOÁN_Tháng 12/2026' },
    ], [
        { key: 'mai', title, teacher: 'Mai', startTime: '2026-12-04T11:00:00Z' },
        { key: 'lan', title, teacher: 'Lan', startTime: '2026-12-05T11:00:00Z' },
    ]);
    assert.equal(result.matchesByRow.get('mai')!.size, 2);
    assert.equal(result.matchesByRow.get('lan')!.size, 1);
});

test('một lịch tự map đủ các Course dù tháng/năm section khác ngày lịch', () => {
    const title = 'Luyện đề TSA-OD-Phần Tư duy Toán-P2';
    const options = [
        { package_id: '9056', course_id: '3297', lesson_id: '179222', lesson_name: title, section_name: 'TOÁN_Tháng 12/2026' },
        { package_id: '9131', course_id: '3342', lesson_id: '179491', lesson_name: title, section_name: 'TOÁN_Tháng 9/2025' },
    ];
    const rows = [{ key: 'p2', title, startTime: '2026-11-04T11:00:00Z' }];
    const result = matchHmoLessonsByCourse(options, rows);
    assert.equal(result.matchesByRow.get('p2')?.get('3297')?.lessonId, '179222');
    assert.equal(result.matchesByRow.get('p2')?.get('3342')?.lessonId, '179491');
    assert.equal(result.unmatchedReasonsByRow.get('p2')!.size, 0);

    // Nhiều ứng viên trong cùng Course mới cần đối chiếu session.
    const ambiguous = matchHmoLessonsByCourse([
        ...options,
        { ...options[0], lesson_id: 'other', section_name: 'TOÁN_Tháng 8/2026' },
    ], rows);
    assert.equal(ambiguous.matchesByRow.get('p2')?.has('3297'), false);
    assert.equal(ambiguous.matchesByRow.get('p2')?.get('3342')?.lessonId, '179491');
});


test('một Course có hai Lesson cùng tên trong cùng section phải chọn tay, Course khác vẫn map', () => {
    const title = 'Luyện đề TSA-OD-Phần Tư duy Toán-P2';
    const base = { package_id: '9056', course_id: '3297', lesson_name: title, section_name: 'TOÁN_Tháng 12/2026' };
    const result = matchHmoLessonsByCourse([
        { ...base, lesson_id: '179222' },
        { ...base, lesson_id: 'duplicate' },
        { ...base, package_id: '9131', course_id: '3342', lesson_id: '179491' },
    ], [{ key: 'p2', title, startTime: '2026-12-04T11:00:00Z' }]);
    assert.equal(result.matchesByRow.get('p2')?.has('3297'), false);
    assert.equal(result.unmatchedReasonsByRow.get('p2')?.get('3297'), 'MULTIPLE_MATCHES');
    assert.equal(result.matchesByRow.get('p2')?.get('3342')?.lessonId, '179491');
});

test('một lịch ưu tiên đúng tháng trong mỗi Course trước khi xét Lesson trùng tên', () => {
    const title = 'Luyện đề TSA-OD-Phần Tư duy Toán-P2';
    const options = ['3297', '3342'].flatMap((course_id) => [
        { package_id: course_id, course_id, lesson_id: `${course_id}-nov`, lesson_name: title, section_name: 'TOÁN_Tháng 11/2026' },
        { package_id: course_id, course_id, lesson_id: `${course_id}-dec`, lesson_name: title, section_name: 'TOÁN_Tháng 12/2026' },
    ]);
    const rows = [{ key: 'p2', title, startTime: '2026-12-04T11:00:00Z' }];
    const result = matchHmoLessonsByCourse(options, rows);
    assert.equal(result.matchesByRow.get('p2')?.get('3297')?.lessonId, '3297-dec');
    assert.equal(result.matchesByRow.get('p2')?.get('3342')?.lessonId, '3342-dec');
    const duplicate = matchHmoLessonsByCourse([...options, { ...options[1], lesson_id: 'duplicate-dec' }], rows);
    assert.equal(duplicate.unmatchedReasonsByRow.get('p2')?.get('3297'), 'MULTIPLE_MATCHES');
    assert.equal(duplicate.matchesByRow.get('p2')?.get('3342')?.lessonId, '3342-dec');
});


test('không tìm được Lesson thì giữ nguyên mapping cũ kể cả ID không có trong outline', () => {
    const currentKeys = ['9056::3297::old-missing', '9131::3342::179491'];
    assert.deepEqual(mergeHmoMappingKeys(currentKeys, []), currentKeys);
    assert.deepEqual(mergeHmoMappingKeys([], []), []);
});

test('chỉ cập nhật Course đã khớp, giữ mapping cũ của Course thiếu kết quả', () => {
    const currentKeys = ['9056::3297::old-a', '9131::3342::old-b'];
    const options = [{ package_id: '9056', course_id: '3297', lesson_id: '179222' }];
    assert.deepEqual(mergeHmoMappingKeys(currentKeys, options), ['9131::3342::old-b', '9056::3297::179222']);
    assert.deepEqual(mergeHmoMappingKeys([], options), ['9056::3297::179222']);
});
