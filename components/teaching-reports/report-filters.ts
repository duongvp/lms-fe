export type AssignmentLink = {
    code: string;
    system_type?: string | null;
    teacher_id: number | null;
    assistant_ids: number[];
    subject: string | null;
    grade: number | null;
    has_teacher?: boolean;
    has_assistant?: boolean;
};
export type ReportFilters = Partial<Record<'code' | 'teacher_id' | 'assistant_id' | 'subject' | 'grade' | 'role' | 'system_type', string | number>>;
export const reportFilterKeys = ['code', 'teacher_id', 'assistant_id', 'subject', 'grade', 'role', 'system_type'] as const;
const hasRole = (link: AssignmentLink, role: string | number) => role === 'teacher'
    ? link.has_teacher ?? link.teacher_id != null
    : role === 'assistant' ? link.has_assistant ?? link.assistant_ids.length > 0 : false;
export const matchesReportFilters = (link: AssignmentLink, filters: ReportFilters, except?: keyof ReportFilters) => reportFilterKeys.every(key => {
    const value = filters[key];
    if (key === except || value == null || value === '') return true;
    if (key === 'role') return hasRole(link, value);
    return key === 'assistant_id' ? link.assistant_ids.includes(Number(value)) : link[key] === value;
});
export const reportFilterChoices = (links: AssignmentLink[], filters: ReportFilters) => {
    const values = (key: keyof ReportFilters) => links.filter(link => matchesReportFilters(link, filters, key));
    return {
        systems: new Set(values('system_type').map(link=>link.system_type)),
        programs: new Set(values('code').map(link => link.code)),
        teachers: new Set(values('teacher_id').map(link => link.teacher_id)),
        assistants: new Set(values('assistant_id').flatMap(link => link.assistant_ids)),
        subjects: new Set(values('subject').map(link => link.subject)),
        grades: new Set(values('grade').map(link => link.grade)),
        roles: new Set(['teacher', 'assistant'].filter(role => values('role').some(link => hasRole(link, role)))),
    };
};
