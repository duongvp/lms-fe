import { fetchInstance } from '@/ultils/fetchInstance';

const BASE = `${process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000'}/api/livestreams/students/registration-audits`;
export type RegistrationAudit = {
    jobId: string;
    status: 'checking' | 'ready' | 'inserting' | 'completed' | 'failed';
    progress: number; message: string; error?: string; registeredAt: string; calendarCount: number;
    stats?: { apiRows: number; apiRowsSinceDate?: number; excludedNewerRows?: number; uniqueUsers: number; expectedEnrollments: number; existingEnrollments: number; missingEnrollments: number };
    summary: Array<{code: string; learnNumber: number; expected: number; existing: number; missing: number}>;
    rows: Array<{key: string; username: string; studentHmid: string; name: string; code: string; learnNumber: number; packages: string[]}>;
    totalMissing: number; page: number; limit: number;
    result?: {inserted: number; alreadyPresent: number; remaining: number};
};

export const startRegistrationAudit = (ids: string[], registeredAt: string) => fetchInstance(BASE, {
    method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ids, registered_at: registeredAt}),
}, 'json');

export const getRegistrationAudit = (id: string, page = 1) => fetchInstance(`${BASE}/${encodeURIComponent(id)}?page=${page}&limit=50`, {
    method: 'GET', credentials: 'include',
}, 'json');

export const applyRegistrationAudit = (id: string) => fetchInstance(`${BASE}/${encodeURIComponent(id)}/apply`, {
    method: 'POST', credentials: 'include',
}, 'json');
