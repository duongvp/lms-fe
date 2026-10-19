type ProgramMetadata = {
    subject_code: string;
    subject_name: string;
    grade?: number | null;
    system_type?: 'topclass' | 'topuni' | null;
};

// Ưu tiên đề cương của đúng chương trình, cùng quy tắc với tạo lịch tự động.
export const resolveScheduleProgramMetadata = (
    code: string | undefined,
    lessons: ProgramMetadata[],
    programs: ProgramMetadata[],
) => {
    if (!code) return undefined;
    const matches = lessons.filter((lesson) => lesson.subject_code === code);
    return matches.find((lesson) => lesson.system_type === 'topuni')
        || matches.find((lesson) => lesson.system_type === 'topclass')
        || programs.find((program) => program.subject_code === code && program.system_type);
};
