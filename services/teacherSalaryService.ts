import { fetchInstance } from '@/ultils/fetchInstance';
const base = `${process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000'}/api/teacher-salary`;
export const salaryGet = async (path: string, params: Record<string, unknown> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '')
        query.set(k, String(v)); });
    return (await fetchInstance(`${base}/${path}${query.size ? '?' + query : ''}`)).data;
};
export const salaryWrite = async (path: string, body: Record<string, unknown>, method = 'POST') => (await fetchInstance(`${base}/${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, 'json', 65000)).data;
export const salaryExport = async (path: string, params: Record<string, unknown> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '')
        query.set(k, String(v)); });
    const blob = await fetchInstance(`${base}/${path}?${query}`, {}, 'blob', 65000);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bao-cao-giang-day-luong.xlsx';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
