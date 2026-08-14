export const SWR_NAMESPACES = {
    lessons: "lessons",
    quizzes: "quizzes",
    schedules: "schedules",
    moduleFields: "module-fields",
    teachingStaff: "teaching-staff",
    packageCourses: "package-courses",
} as const;

export const swrKeys = {
    lessonList: (userId: number | string, params: object) =>
        [SWR_NAMESPACES.lessons, "list", userId, params] as const,
    lessonSubjects: (userId: number | string) =>
        [SWR_NAMESPACES.lessons, "subjects", userId] as const,
    lessonPrograms: (userId: number | string) =>
        [SWR_NAMESPACES.lessons, "programs", userId] as const,
    quizList: (userId: number | string, params: object) =>
        [SWR_NAMESPACES.quizzes, "list", userId, params] as const,
    quizClasses: (userId: number | string) =>
        [SWR_NAMESPACES.quizzes, "classes", userId] as const,
    quizLessons: (userId: number | string, code: string) =>
        [SWR_NAMESPACES.quizzes, "lessons", userId, code] as const,
    quizIndexSuggestion: (userId: number | string, params: object) =>
        [SWR_NAMESPACES.quizzes, "index-suggestion", userId, params] as const,
    scheduleList: (userId: number | string, params: object) =>
        [SWR_NAMESPACES.schedules, "list", userId, params] as const,
    schedulePrograms: (userId: number | string) =>
        [SWR_NAMESPACES.schedules, "programs", userId] as const,
    moduleFields: (userId: number | string, moduleCode: string) =>
        [SWR_NAMESPACES.moduleFields, userId, moduleCode] as const,
    teachingStaff: (userId: number | string, teacherType: number) =>
        [SWR_NAMESPACES.teachingStaff, userId, teacherType] as const,
    packageCourses: (userId: number | string) =>
        [SWR_NAMESPACES.packageCourses, userId] as const,
};

export const isSWRNamespace = (key: unknown, namespace: string) =>
    Array.isArray(key) && key[0] === namespace;
