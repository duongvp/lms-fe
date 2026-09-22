import { fetchInstance } from '@/ultils/fetchInstance';

const API = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/program-teacher-banners`;
export interface ProgramTeacherBanner {
  id: number;
  program_code: string;
  teacher_profile_id: number;
  username: string;
  display_name?: string | null;
  banner_url: string;
  status: 0 | 1;
  updated_at?: string;
}
export type ProgramTeacherBannerPayload = Pick<ProgramTeacherBanner, 'program_code' | 'teacher_profile_id' | 'banner_url' | 'status'>;
export const getProgramTeacherBanners = (params: Record<string, string | number | undefined> = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => value !== undefined && value !== '' && query.set(key, String(value)));
  return fetchInstance(`${API}?${query}`);
};
export const createProgramTeacherBanner = (payload: ProgramTeacherBannerPayload) => fetchInstance(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
export const updateProgramTeacherBanner = (id: number, payload: ProgramTeacherBannerPayload) => fetchInstance(`${API}/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
export const deleteProgramTeacherBanner = (id: number) => fetchInstance(`${API}/${id}`, { method: 'DELETE' });
export const getProgramTeacherBannerOptions = (programCode?: string, teacherProfileId?: number) => {
  const query = new URLSearchParams();
  if (programCode) query.set('program_code', programCode);
  if (teacherProfileId) query.set('teacher_profile_id', String(teacherProfileId));
  return fetchInstance(`${API}/options?${query}`, { cache: 'no-store' });
};
export const importProgramTeacherBanners = (file: File, mode: 'skip' | 'overwrite') => {
  const body = new FormData(); body.append('file', file); body.append('mode', mode);
  return fetchInstance(`${API}/import`, { method: 'POST', body }, 'json', 120_000);
};
export const downloadProgramTeacherBannerTemplate = () => fetchInstance(`${API}/template`, { method: 'GET' }, 'blob');
