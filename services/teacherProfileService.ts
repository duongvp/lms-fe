import { fetchInstance } from '@/ultils/fetchInstance';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/teacher-profiles`;

export type CanViewStreamKey = 0 | 1;
export type TeacherProfileStatus = 0 | 1;

export interface TeacherProfile {
    id: number;
    username: string;
    display_name?: string | null;
    can_view_stream_key: CanViewStreamKey;
    status: TeacherProfileStatus;
    created_at?: string;
    updated_at?: string;
}

export interface TeacherProfilePayload {
    username?: string;
    display_name?: string | null;
    can_view_stream_key?: CanViewStreamKey;
    status?: TeacherProfileStatus;
}

export interface TeacherProfileListParams {
    page?: number;
    limit?: number;
    search?: string;
    can_view_stream_key?: CanViewStreamKey;
    status?: TeacherProfileStatus;
}

export const formatTeachingStaffLabel = (
    displayName?: string | null,
    username?: string | null
) => {
    const normalizedUsername = String(username || '').trim();
    const normalizedDisplayName = String(displayName || '').trim();
    if (!normalizedDisplayName || normalizedDisplayName === normalizedUsername) {
        return normalizedUsername;
    }
    return `${normalizedDisplayName} (${normalizedUsername})`;
};

export const getTeacherProfiles = (params: TeacherProfileListParams = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.set(key, String(value));
        }
    });
    return fetchInstance(`${API_BASE_URL}?${query.toString()}`);
};

export const createTeacherProfile = (payload: TeacherProfilePayload) =>
    fetchInstance(API_BASE_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
    });

export const updateTeacherProfile = (id: number, payload: TeacherProfilePayload) =>
    fetchInstance(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
    });

export const updateTeacherProfileStatus = (
    id: number,
    status: TeacherProfileStatus
) => fetchInstance(`${API_BASE_URL}/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    headers: { 'Content-Type': 'application/json' },
});

export const deleteTeacherProfile = (id: number) =>
    fetchInstance(`${API_BASE_URL}/${id}`, { method: 'DELETE' });

export const exportTeacherProfiles = (
    format: 'xlsx' | 'csv',
    params: Omit<TeacherProfileListParams, 'page' | 'limit'> = {}
) => {
    const query = new URLSearchParams({ format });
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            query.set(key, String(value));
        }
    });
    return fetchInstance(
        `${API_BASE_URL}/export?${query.toString()}`,
        { method: 'GET' },
        'blob'
    );
};

export const downloadTeacherProfileTemplate = (format: 'xlsx' | 'csv') =>
    fetchInstance(
        `${API_BASE_URL}/template?format=${format}`,
        { method: 'GET' },
        'blob'
    );

export const importTeacherProfiles = (
    file: File,
    mode: 'skip' | 'overwrite'
) => {
    const body = new FormData();
    body.append('file', file);
    body.append('mode', mode);
    return fetchInstance(`${API_BASE_URL}/import`, {
        method: 'POST',
        body,
    });
};

export const getTeachingStaffOptions = async (canViewStreamKey: CanViewStreamKey) => {
    const profiles: TeacherProfile[] = [];
    let page = 1;
    let total = 0;
    do {
        const response: any = await getTeacherProfiles({
            page,
            limit: 100,
            can_view_stream_key: canViewStreamKey,
            status: 1,
        });
        const rows: TeacherProfile[] = response?.data?.data ?? [];
        total = Number(response?.data?.pagination?.total ?? rows.length);
        profiles.push(...rows);
        page += 1;
    } while (profiles.length < total && page <= 20);

    return profiles.map((profile) => {
        const label = formatTeachingStaffLabel(profile.display_name, profile.username);
        return {
            value: profile.username,
            label,
            username: profile.username,
            displayName: profile.display_name?.trim() || profile.username,
        };
    });
};
