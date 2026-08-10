import { fetchInstance } from '@/ultils/fetchInstance';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/dashboard`;

export interface DashboardOverview {
    generatedAt: string;
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
