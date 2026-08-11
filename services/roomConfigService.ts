import { fetchInstance } from '@/ultils/fetchInstance';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/room-config`;

export interface StaffInfo {
  username: string;
  student_hmid?: string;
  email?: string;
  phone?: string;
  name?: string;
  code?: string;
  learn_number?: number;
  islearn?: number;
  room_id?: number;
  class_id?: string;
}

export interface RoomConfigRecord {
  code: string;
  learn_number: number;
  config: any;
  updated_by?: string | null;
  updated_at?: string | null;
  teacher?: StaffInfo | null;
  assistant_teacher?: StaffInfo | null;
}

export interface RoomConfigListParams {
  page?: number;
  limit?: number;
  search?: string;
  code?: string;
  learn_number?: number;
}

export interface SaveRoomConfigPayload {
  code: string;
  learn_number: number;
  config: any;
  teacher?: StaffInfo;
  assistant_teacher?: StaffInfo;
}

export const getRoomConfigs = (params: RoomConfigListParams = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  return fetchInstance(`${API_BASE_URL}?${query.toString()}`);
};

export const getRoomConfigDetail = (code: string, learnNumber: number) => {
  return fetchInstance(`${API_BASE_URL}/${encodeURIComponent(code)}/${learnNumber}`);
};

export const saveRoomConfig = (payload: SaveRoomConfigPayload) => {
  return fetchInstance(API_BASE_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
};

export const importRoomConfigs = (programCode: string, items: SaveRoomConfigPayload[]) => {
  return fetchInstance(`${API_BASE_URL}/import`, {
    method: 'POST',
    body: JSON.stringify({ program_code: programCode, items }),
    headers: { 'Content-Type': 'application/json' },
  });
};
