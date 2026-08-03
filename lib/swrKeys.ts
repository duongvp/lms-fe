export const SWR_NAMESPACES = {
    lessons: "lessons",
    schedules: "schedules",
    moduleFields: "module-fields",
    teachingStaff: "teaching-staff",
    packageCourses: "package-courses",
} as const;

export const swrKeys = {
    lessonList: (userId: number, params: object) =>
        [SWR_NAMESPACES.lessons, "list", userId, params] as const,
    lessonSubjects: (userId: number) =>
        [SWR_NAMESPACES.lessons, "subjects", userId] as const,
    scheduleList: (userId: number, params: object) =>
        [SWR_NAMESPACES.schedules, "list", userId, params] as const,
    moduleFields: (userId: number, moduleCode: string) =>
        [SWR_NAMESPACES.moduleFields, userId, moduleCode] as const,
    teachingStaff: (userId: number, teacherType: number) =>
        [SWR_NAMESPACES.teachingStaff, userId, teacherType] as const,
    packageCourses: (userId: number) =>
        [SWR_NAMESPACES.packageCourses, userId] as const,
};

export const isSWRNamespace = (key: unknown, namespace: string) =>
    Array.isArray(key) && key[0] === namespace;
