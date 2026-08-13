export enum PermissionKey {
    USER_VIEW = 'users.view',
    USER_CREATE = 'users.create',
    USER_EDIT = 'users.update',
    USER_DELETE = 'users.delete',

    ROLE_VIEW = 'roles.view',
    ROLE_CREATE = 'roles.create',
    ROLE_EDIT = 'roles.update',
    ROLE_DELETE = 'roles.delete',

    BRANCH_VIEW = 'branch_view',
    BRANCH_CREATE = 'branch_create',
    BRANCH_EDIT = 'branch_edit',
    BRANCH_DELETE = 'branch_delete',

    DASHBOARD_VIEW = 'dashboard_view',

    SCHEDULE_VIEW = 'calendar.view',
    SCHEDULE_CREATE = 'calendar.create',
    SCHEDULE_EDIT = 'calendar.update',
    SCHEDULE_DELETE = 'calendar.delete',
    SCHEDULE_IMPORT = 'calendar.import',
    SCHEDULE_EXPORT = 'calendar.export',

    LESSON_VIEW = 'lessons.view',
    LESSON_CREATE = 'lessons.create',
    LESSON_EDIT = 'lessons.update',
    LESSON_DELETE = 'lessons.delete',
    LESSON_IMPORT = 'lessons.import',
    LESSON_EXPORT = 'lessons.export',

    QUIZ_VIEW = 'quiz.view',
    QUIZ_CREATE = 'quiz.create',
    QUIZ_EDIT = 'quiz.update',
    QUIZ_DELETE = 'quiz.delete',
    QUIZ_IMPORT = 'quiz.import',
    QUIZ_EXPORT = 'quiz.export',

    TEACHER_PROFILE_VIEW = 'teacher_profile.view',
    TEACHER_PROFILE_CREATE = 'teacher_profile.create',
    TEACHER_PROFILE_EDIT = 'teacher_profile.update',
    TEACHER_PROFILE_DELETE = 'teacher_profile.delete',
    TEACHER_PROFILE_STATUS = 'teacher_profile.status',
    TEACHER_PROFILE_IMPORT = 'teacher_profile.import',
    TEACHER_PROFILE_EXPORT = 'teacher_profile.export',

    CALENDAR_TEACHER_MANAGE = 'calendar.teacher.manage',

    ROOM_CONFIG_VIEW = 'room_config.view',
    ROOM_CONFIG_CREATE = 'room_config.create',
    ROOM_CONFIG_EDIT = 'room_config.update',
    ROOM_CONFIG_IMPORT = 'room_config.import',
}
