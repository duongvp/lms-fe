import { PermissionKey } from "@/types/permissions";

export const protectedRoutes = [
    { path: '/dashboard', permission: PermissionKey.DASHBOARD_VIEW },
    { path: '/lessons', permission: PermissionKey.LESSON_VIEW },
    { path: '/quizzes', permission: PermissionKey.QUIZ_VIEW },
    { path: '/teacher-profiles', permission: PermissionKey.TEACHER_PROFILE_VIEW },
    { path: '/schedule', permission: PermissionKey.SCHEDULE_VIEW },
    { path: '/room-config', permission: PermissionKey.ROOM_CONFIG_VIEW },
    { path: '/users', permission: PermissionKey.USER_VIEW },
    { path: '/member-roles', permission: PermissionKey.ROLE_VIEW },
];
