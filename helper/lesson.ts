import type { LessonApiResponse } from "@/services/lessonService";

export const formatLessonScheduleOption = (lesson: LessonApiResponse) => {
    const baseLabel = `Bài ${lesson.learn_number}: ${lesson.lesson_name}`;
    const scheduledCount = Number(lesson.scheduled_count ?? 0);
    if (scheduledCount <= 0) return baseLabel;

    return `${baseLabel} - Đã gán lịch: ${scheduledCount} buổi`;
};
