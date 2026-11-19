import { fetchInstance } from '@/ultils/fetchInstance';
const base = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/jev`;
export type JevPolicy = { id: number; policy_key: string; revision: number; edit_revision: number; status: 'DRAFT' | 'PUBLISHED'; config_json?: any; bundle_hash?: string | null; published_at?: string | null };
export type JevCalendar = { id: number; code: string; learn_number: number; lesson_name: string | null; start_time: string; end_time: string };
export type JevBinding = { id: number; scope_type: 'GLOBAL' | 'CODE' | 'CALENDAR'; scope_key: string; mode: string; policy_version_id: number | null; revision: number; runtime_json: any; calendar?: JevCalendar | null; configured?: { scope_type: 'GLOBAL' | 'CODE' | 'CALENDAR'; scope_key: string; mode: string; policy: Pick<JevPolicy, 'id' | 'policy_key' | 'revision'> | null } | null };
export async function jevRequest(path: string, method = 'GET', body?: unknown) {
  return fetchInstance(base + path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }, 'json', 25000);
}
