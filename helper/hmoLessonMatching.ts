import type { HocmaiSectionOption } from '@/services/livestreamService';

export type HmoLessonMatchRow = {
    key: string;
    title: unknown;
    teacher?: unknown;
};

export type HmoLessonMatch = {
    lessonId: string;
    options: HocmaiSectionOption[];
    score: number;
    exactTitle: boolean;
    teacherMatched: boolean;
};

export type HmoLessonMatchingResult = {
    courseIds: string[];
    matchesByRow: Map<string, Map<string, HmoLessonMatch>>;
    matchedRowCountByCourse: Map<string, number>;
};

const canonicalText = (value: unknown) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

export const normalizeLessonTitle = (value: unknown) => {
    let title = canonicalText(value).trim();
    // Prefix này mô tả loại lịch, không thuộc tên nội dung trong đề cương/HMO.
    while (/^\s*\[\s*(?:lich\s*\d+|bo\s*tro)\s*\]/.test(title)) {
        title = title.replace(/^\s*\[\s*(?:lich\s*\d+|bo\s*tro)\s*\]\s*/, '');
    }
    return title
        .replace(/^bai\s*\d+\s*[:.\-–—]*\s*/, '')
        // (P2), P2 và "phần 2" cùng biểu diễn một vế của tên đề cương.
        .replace(/\bphan\s+(\d+)\b/g, 'p$1')
        // Dấu ., .., _, -, ... chỉ là khác biệt trình bày.
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
};

const teacherLastName = (value: unknown) => {
    const parts = canonicalText(value).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
    return parts.at(-1) || '';
};

const parseHmoTitle = (value: unknown) => {
    const normalized = normalizeLessonTitle(value);
    const parts = normalized.split(' ').filter(Boolean);
    if (
        parts.length >= 3
        && ['co', 'thay'].includes(parts[parts.length - 2])
    ) {
        return {
            title: parts.slice(0, -2).join(' '),
            teacher: parts[parts.length - 1],
        };
    }
    return { title: normalized, teacher: '' };
};

const partMarkers = (title: string) => Array.from(new Set(
    title.split(' ').filter((part) => /^p\d+$/.test(part))
)).sort();

const compatiblePartMarkers = (left: string, right: string) => {
    const leftMarkers = partMarkers(left);
    const rightMarkers = partMarkers(right);
    if (!leftMarkers.length && !rightMarkers.length) return true;
    return leftMarkers.join('|') === rightMarkers.join('|');
};

const levenshteinDistance = (left: string, right: string) => {
    if (left === right) return 0;
    if (!left.length) return right.length;
    if (!right.length) return left.length;
    let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
        const current = [leftIndex];
        for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
            current[rightIndex] = Math.min(
                current[rightIndex - 1] + 1,
                previous[rightIndex] + 1,
                previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
            );
        }
        previous = current;
    }
    return previous[right.length];
};

const titleSimilarity = (left: string, right: string) => {
    if (!left || !right) return 0;
    if (left === right) return 1;
    const maxLength = Math.max(left.length, right.length);
    const characterScore = 1 - (levenshteinDistance(left, right) / maxLength);
    const leftTokens = new Set(left.split(' ').filter(Boolean));
    const rightTokens = new Set(right.split(' ').filter(Boolean));
    const sharedTokens = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length;
    const tokenScore = (2 * sharedTokens) / (leftTokens.size + rightTokens.size);
    return (tokenScore * 0.6) + (characterScore * 0.4);
};

const uniqueOptions = (options: HocmaiSectionOption[]) => Array.from(new Map(
    options.map((option) => [
        `${String(option.package_id)}::${String(option.course_id)}::${String(option.lesson_id)}`,
        option,
    ])
).values());

type Candidate = {
    courseId: string;
    lessonId: string;
    options: HocmaiSectionOption[];
};

type EvaluatedCandidate = {
    candidate: Candidate;
    score: number;
    exactTitle: boolean;
    teacherMatched: boolean;
    normalizedHmoTitle: string;
};

const evaluateCandidate = (
    rowTitle: string,
    rowTeacher: string,
    candidate: Candidate,
): EvaluatedCandidate | null => {
    let best: EvaluatedCandidate | null = null;
    candidate.options.forEach((option) => {
        const parsed = parseHmoTitle(option.lesson_name);
        if (!parsed.title || !compatiblePartMarkers(rowTitle, parsed.title)) return;
        if (parsed.teacher && (!rowTeacher || parsed.teacher !== rowTeacher)) return;
        const similarity = titleSimilarity(rowTitle, parsed.title);
        if (similarity < 0.92) return;
        const evaluated: EvaluatedCandidate = {
            candidate,
            score: similarity,
            exactTitle: rowTitle === parsed.title,
            teacherMatched: Boolean(parsed.teacher && parsed.teacher === rowTeacher),
            normalizedHmoTitle: parsed.title,
        };
        if (!best
            || Number(evaluated.teacherMatched) > Number(best.teacherMatched)
            || (evaluated.teacherMatched === best.teacherMatched && evaluated.score > best.score)) {
            best = evaluated;
        }
    });
    return best;
};

export const matchHmoLessonsByCourse = (
    options: HocmaiSectionOption[],
    rows: HmoLessonMatchRow[],
): HmoLessonMatchingResult => {
    const deduplicatedOptions = uniqueOptions(options);
    const courseIds = Array.from(new Set(deduplicatedOptions.map((option) => String(option.course_id))));
    const matchesByRow = new Map(rows.map((row) => [row.key, new Map<string, HmoLessonMatch>()]));
    const matchedRowCountByCourse = new Map<string, number>();
    const normalizedRows = rows.map((row, index) => ({
        ...row,
        index,
        normalizedTitle: normalizeLessonTitle(row.title),
        normalizedTeacher: teacherLastName(row.teacher),
    }));

    courseIds.forEach((courseId) => {
        const candidates = Array.from(deduplicatedOptions
            .filter((option) => String(option.course_id) === courseId)
            .reduce((groups, option) => {
                const lessonId = String(option.lesson_id);
                const candidate = groups.get(lessonId) || { courseId, lessonId, options: [] };
                candidate.options.push(option);
                groups.set(lessonId, candidate);
                return groups;
            }, new Map<string, Candidate>()).values());

        const evaluatedByRow = normalizedRows.map((row) => {
            const evaluated = candidates
                .map((candidate) => evaluateCandidate(
                    row.normalizedTitle,
                    row.normalizedTeacher,
                    candidate,
                ))
                .filter((candidate): candidate is EvaluatedCandidate => Boolean(candidate))
                .sort((left, right) => (
                    Number(right.teacherMatched) - Number(left.teacherMatched)
                    || Number(right.exactTitle) - Number(left.exactTitle)
                    || right.score - left.score
                    || left.candidate.lessonId.localeCompare(right.candidate.lessonId, 'vi', { numeric: true })
                ));

            // Hai tên lõi fuzzy khác nhau có điểm sát nhau là trường hợp mơ hồ.
            // Nhiều Lesson ID có cùng một tên lõi vẫn hợp lệ và sẽ được chia theo thứ tự.
            if (evaluated[0] && !evaluated[0].exactTitle) {
                const competing = evaluated.find((item, index) => (
                    index > 0
                    && item.teacherMatched === evaluated[0].teacherMatched
                    && item.normalizedHmoTitle !== evaluated[0].normalizedHmoTitle
                ));
                if (competing && evaluated[0].score - competing.score < 0.05) return { row, evaluated: [] };
            }
            return { row, evaluated };
        });

        // Ưu tiên lịch có hậu tố giáo viên khớp và lịch có ít ứng viên trước;
        // phần còn lại giữ thứ tự lịch để tương thích cách gán Lesson ID tăng dần trước đây.
        evaluatedByRow.sort((left, right) => (
            Number(Boolean(right.evaluated[0]?.teacherMatched)) - Number(Boolean(left.evaluated[0]?.teacherMatched))
            || left.evaluated.length - right.evaluated.length
            || left.row.index - right.row.index
        ));
        const claimedLessonIds = new Set<string>();
        evaluatedByRow.forEach(({ row, evaluated }) => {
            const selected = evaluated.find((item) => !claimedLessonIds.has(item.candidate.lessonId));
            if (!selected) return;
            claimedLessonIds.add(selected.candidate.lessonId);
            matchesByRow.get(row.key)!.set(courseId, {
                lessonId: selected.candidate.lessonId,
                options: selected.candidate.options,
                score: selected.score,
                exactTitle: selected.exactTitle,
                teacherMatched: selected.teacherMatched,
            });
        });
        matchedRowCountByCourse.set(courseId, evaluatedByRow.filter(
            ({ row }) => matchesByRow.get(row.key)?.has(courseId)
        ).length);
    });

    return { courseIds, matchesByRow, matchedRowCountByCourse };
};

export const hmoCourseMatchSummary = (
    result: HmoLessonMatchingResult,
    courseIds: string[] = result.courseIds,
) => courseIds.map((courseId) => (
    `Course ${courseId}: ${result.matchedRowCountByCourse.get(courseId) || 0} lịch`
)).join('; ');

// LOGIC CŨ - giữ lại để rollback nhanh nếu luồng fuzzy phát sinh lỗi:
//
// const legacyNormalizeLessonTitle = (value: unknown) => String(value || '')
//   .normalize('NFD')
//   .replace(/[\u0300-\u036f]/g, '')
//   .replace(/đ/g, 'd')
//   .toLowerCase()
//   .replace(/^bai\s*\d+\s*[:.\-–—]*\s*/, '')
//   .replace(/[^a-z0-9]+/g, ' ')
//   .trim();
//
// const legacyHmoTitleMatchesByCourse = (
//   options: HocmaiSectionOption[], normalizedTitle: string
// ) => {
//   const matches = new Map<string, Map<string, HocmaiSectionOption[]>>();
//   uniqueOptions(options).forEach((option) => {
//     if (legacyNormalizeLessonTitle(option.lesson_name) !== normalizedTitle) return;
//     const byLessonId = matches.get(String(option.course_id))
//       || new Map<string, HocmaiSectionOption[]>();
//     const lessonId = String(option.lesson_id);
//     byLessonId.set(lessonId, [...(byLessonId.get(lessonId) || []), option]);
//     matches.set(String(option.course_id), byLessonId);
//   });
//   return matches;
// };
//
// Luồng gọi cũ chỉ nhận Course khi số Lesson ID exact bằng đúng số lịch,
// rồi sort Lesson ID tăng dần và gán lần lượt theo thứ tự thời gian của lịch.
