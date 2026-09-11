import { fetchInstance } from '@/ultils/fetchInstance';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/dashboard`;

export interface DashboardOverview {
    generatedAt: string;
    hmoLessonSyncAvailable: boolean;
    summary: {
        courses: number;
        lessons: number;
        quizzes: number;
        teachingStaff: number;
        teachers: number;
        assistants: number;
        adminUsers: number;
        outlinesWithQuiz: number;
        outlinesWithoutQuiz: number;
    };
    outlineQuizDetails: {
        withQuiz: Array<{
            id: string;
            programCode: string;
            subjectName: string | null;
            learnNumber: number;
            lessonName: string;
        }>;
        withoutQuiz: Array<{
            id: string;
            programCode: string;
            subjectName: string | null;
            learnNumber: number;
            lessonName: string;
        }>;
    };
    today: {
        total: number;
        upcoming: number;
        ongoing: number;
        completed: number;
        cancelled: number;
    };
    nextSevenDays: Array<{
        date: string;
        total: number;
        cancelled: number;
    }>;
    upcomingSchedules: Array<{
        id: number;
        code: string;
        learnNumber: number;
        subject: string | null;
        lessonName: string | null;
        teacher: string | null;
        assistantTeacher: string | null;
        startTime: string;
        endTime: string;
        room: string | null;
    }>;
    recentChanges: Array<{
        id: string;
        action: string;
        code: string;
        learnNumber: number;
        reason: string;
        actorUsername: string;
        createdAt: string;
    }>;
    integrations: {
        teams: { pending: number; failed: number; sentToday: number };
        hocmai: { pending: number; failed: number; syncedToday: number };
    };
    hmoLessonSync: null | {
        id: string;
        triggerType: 'cron' | 'manual';
        status: 'running' | 'completed' | 'completed_with_errors' | 'failed' | 'interrupted';
        programsTotal: number; programsProcessed: number; programsFailed: number;
        lessonsTotal: number; lessonsSynced: number; lessonsFailed: number;
        calendarsSynced: number; lastError: string | null;
        heartbeatAt: string | null; currentProgram: string | null;
        startedAt: string; finishedAt: string | null;
        issues: Array<{
            id: string; programCode: string; calendarId: number | null;
            learnNumber: number | null; lessonName: string | null; teacher: string | null;
            courseId: string | null; packageId: string | null;
            errorCode: string; message: string; createdAt: string;
        }>;
        issuePrograms: Array<{ programCode: string; issueCount: number; lessonCount: number }>;
    };
}

export const getDashboardOverview = async (params?: { from?: string; to?: string }): Promise<DashboardOverview> => {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    const response = await fetchInstance(`${API_BASE_URL}/overview?${query.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
};

export const runHmoLessonSync = async () => fetchInstance(`${API_BASE_URL}/hmo-lesson-sync/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
});

export const getHmoLessonSyncIssues = async (params?: { programCode?: string; errorCode?: string }) => {
    const query = new URLSearchParams();
    if (params?.programCode) query.set('program_code', params.programCode);
    if (params?.errorCode) query.set('error_code', params.errorCode);
    const response = await fetchInstance(`${API_BASE_URL}/hmo-lesson-sync/issues?${query.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    return response.data as NonNullable<DashboardOverview['hmoLessonSync']>['issues'];
};
