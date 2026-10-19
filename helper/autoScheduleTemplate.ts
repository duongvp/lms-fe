type Session = { weekday?: number; [key: string]: any };
type Block = { lessons?: Array<{ sessions?: Session[]; [key: string]: any }>; [key: string]: any };

/** Đồng bộ các ô mẫu vừa sửa vào bài cùng thứ, giữ các chỉnh sửa khác và mapping HMO. */
export const syncTopuniTemplateChanges = (blocks: Block[], template: Session[], changes: Partial<Session>[]) => {
    const patches = new Map<number, Partial<Session>>();
    changes.forEach((changed, index) => {
        const session = template[index];
        if (!changed || !session?.weekday) return;
        const fields = ['start_time', 'end_time', 'teacher', 'assistant_teachers']
            .filter((field) => Object.prototype.hasOwnProperty.call(changed, field));
        // Đổi giờ bắt đầu có thể đồng thời xóa giờ kết thúc không còn hợp lệ.
        if (fields.includes('start_time') && !fields.includes('end_time')) fields.push('end_time');
        patches.set(Number(session.weekday), Object.fromEntries(fields.map((field) => [field, session[field]])));
    });
    return blocks.map((block) => ({
        ...block,
        lessons: (block.lessons || []).map((lesson) => ({
            ...lesson,
            sessions: (lesson.sessions || []).map((session) => ({
                ...session,
                ...patches.get(Number(session.weekday)),
            })),
        })),
    }));
};
