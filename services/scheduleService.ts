import { fetchInstance } from "@/ultils/fetchInstance";

const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/schedules`;

export interface ScheduleApiResponse {
    key?: string; // used for frontend table if needed
    id?: number;
    class_code: string;
    class_name: string;
    date: string;
    time: string;
    room: string;
    subject: string;
    teacher: string;
    system: string;
    status: string;
    created_at?: Date;
    updated_at?: Date;
}

export interface GetAllSchedulesResponse {
    data: ScheduleApiResponse[];
    total: number;
}

export const getAllSchedules = async (): Promise<ScheduleApiResponse[]> => {
    const url = `${API_BASE_URL}`;
    return await fetchInstance(url);
};

export const getSchedulesByPage = async (limit: number, skip: number, filter: any): Promise<GetAllSchedulesResponse> => {
    return await fetchInstance(`${API_BASE_URL}/search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit, skip, filter }),
    });
};

export const getScheduleById = async (id: string | number): Promise<ScheduleApiResponse> => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url);
};

export const deleteSchedule = async (id: string | number): Promise<void> => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url, {
        method: 'DELETE',
    });
};

export const deleteMultipleSchedules = async (ids: (string | number)[]): Promise<void> => {
    const url = `${API_BASE_URL}/batch-delete`;
    return await fetchInstance(url, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
    });
};

export const createSchedule = async (scheduleData: any): Promise<ScheduleApiResponse> => {
    const url = `${API_BASE_URL}`;
    return await fetchInstance(url, {
        method: 'POST',
        body: JSON.stringify(scheduleData),
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

export const updateSchedule = async (id: string | number, scheduleData: any): Promise<ScheduleApiResponse> => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url, {
        method: 'PUT',
        body: JSON.stringify(scheduleData),
        headers: {
            'Content-Type': 'application/json',
        },
    });
};
