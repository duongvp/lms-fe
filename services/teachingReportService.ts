import { fetchInstance } from '@/ultils/fetchInstance';
const base = `${process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000'}/api/teaching-reports`;
export const reportGet = async (path: string, params: Record<string, unknown> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '')
        query.set(k, String(v)); });
    return (await fetchInstance(`${base}/${path}${query.size ? '?' + query : ''}`)).data;
};
export const reportExport = async (params: Record<string, unknown> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '')
        query.set(k, String(v)); });
    const blob = await fetchInstance(`${base}/export?${query}`, {}, 'blob', 65000);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bao-cao-giang-day.xlsx';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
