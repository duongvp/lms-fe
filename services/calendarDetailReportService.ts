import { fetchInstance } from '@/ultils/fetchInstance';
const BASE = `${process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5000'}/api/livestreams/room-report/calendars`;
export type DetailFilters = { room_id?: number | 'unassigned'; q?: string; page?: number; limit?: number; attendance?: string; chat?: string; moderation?: string; sort?: string; order?: string; source?: string; from?: string; to?: string; cursor?: string; refresh?: boolean };
export type DetailStudent = { user_id: number; student_hmid: string | null; username: string; name: string; room_id: number | null;
  attendance: 'attended' | 'observed' | 'unobserved'; first_seen: string | null; last_seen: string | null; presence_records: number;
  status_1_records: number; socket_ids_count: number; duration_minutes: null; last_leave: null; reconnect_count: null; chat_count: number | null; moderation_records: number | null };
export type DetailOverview = {
  calendar: { id: number; code: string; learn_number: number; lesson_name: string | null; teacher: string | null; assistant_teacher: string | null; start_time: string; end_time: string };
  computed_at: string; capabilities: { chat: boolean; moderation: boolean; activities: boolean };
  counts: { added: number; attended: number; observed: number; unobserved: number; chat_messages: number | null; students_with_chat: number | null };
  rooms: Array<number | null>; data_quality: { limitations: string[]; hidden_rules_available: boolean | null; unmatched_presence_records: number; overlapping_calendar_ids: number[]; unmatched_chat_messages?: number | null; ambiguous_chat_messages?: number | null; ambiguous_chat_student_ids?: number[] };
};
export type DetailReport = DetailOverview & { rows: DetailStudent[]; total: number; page: number; limit: number };
export type RestrictionRecord = { id: string; note: string | null; type: number | null; created_at: string | null; updated_at: string | null; expired_at: string | null };
export type StudentReport = DetailOverview & { student: DetailStudent; restriction_records: RestrictionRecord[] | null };
export type DetailEvent = { id: string; source: string; source_rank: number; at: string; username: string | null; student_hmid: string | null; room: string | null; content: string | null; metadata: Record<string, unknown>; identity: 'matched' | 'unmatched' | 'ambiguous'; student_ids: number[] };
export type EventReport = { rows: DetailEvent[]; next_cursor: string | null; hidden_rules_available: boolean | null; limitations: string[]; overlapping_calendar_ids: number[]; unmatched_chat_messages?: number | null; ambiguous_chat_messages?: number | null; ambiguous_chat_student_ids?: number[] };
const url = (id: number, path: string, filters: DetailFilters) => {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)); });
  return `${BASE}/${id}/${path}?${query}`;
};
const get = async <T>(id: number, path: string, filters: DetailFilters, signal?: AbortSignal): Promise<T> => {
  const response = await fetchInstance(url(id, path, filters), { signal }, 'json', 60000);
  return response.data as T;
};
export const getDetailStudents = (id: number, filters: DetailFilters, signal?: AbortSignal) => get<DetailReport>(id, 'students', filters, signal);
export const getDetailStudent = (id: number, student: number, filters: DetailFilters, signal?: AbortSignal) => get<StudentReport>(id, `students/${student}`, filters, signal);
export const getDetailEvents = (id: number, student: number | undefined, filters: DetailFilters, signal?: AbortSignal) => get<EventReport>(id, student == null ? 'timeline' : `students/${student}/events`, filters, signal);
export const exportDetailReport = (id: number, student: number | undefined, filters: DetailFilters) => fetchInstance(url(id, student == null ? 'export/students' : `students/${student}/export`, { ...filters, cursor: undefined, page: undefined }), {}, 'blob', 120000) as Promise<Blob>;
export const downloadDetailReport = async (id: number, student: number | undefined, filters: DetailFilters) => {
  const blob = filters.source === 'restriction_snapshot' && student != null ? await fetchInstance(url(id, `students/${student}/export-restrictions`, { room_id: filters.room_id }), {}, 'blob', 120000) as Blob : await exportDetailReport(id, student, filters), link = document.createElement('a'), href = URL.createObjectURL(blob);
  link.href = href; link.download = `chi-tiet-buoi-${id}${student == null ? '' : `-hs-${student}`}.xlsx`;
  document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(href), 1000);
};

export type DetailLiveTimes = { status: string; ranges: Array<{ start_time: string; end_time: string }> };
export const getDetailLiveTimes = (id: number, signal?: AbortSignal) => get<DetailLiveTimes>(id, 'live-times', {}, signal);
