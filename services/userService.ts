// services/userService.ts

import { fetchInstance } from "@/ultils/fetchInstance";

const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/users`;

// ---------- Interface ----------
export interface RoleInfo {
    role_id: number;   // id của role (BE trả về là id, nhưng để thống nhất với store có thể map)
    role_code: string;
    role_name: string;
}

export interface UserApiResponse {
    id: number;
    username: string;
    name: string;
    email: string | null;
    phone: string | null;
    code: string;
    learn_number: number;
    class_id: string | null;
    room_id: number | null;
    islearn: number;
    created_at: string;
    updated_at: string;
    roles: RoleInfo[];
}

// Payload dùng cho update user
export interface UpdateUserPayload {
    name?: string;
    email?: string;
    phone?: string;
    username?: string;
    islearn?: number;
    class_id?: string;
    room_id?: number;
    roleIds?: number[];
}

// ---------- API functions ----------

// Lấy danh sách users
export const getUsers = async (): Promise<{ data: UserApiResponse[] }> => {
    const url = API_BASE_URL;
    return await fetchInstance(url);
};

export const getUsersFollowWarehouse = async (_warehouseId?: number): Promise<Array<UserApiResponse & { user_id: number }>> => {
    const response = await getUsers();
    return (response?.data || []).map((user) => ({
        ...user,
        user_id: user.id,
    }));
};

// Lấy chi tiết 1 user
export const getUserById = async (id: number): Promise<UserApiResponse> => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url);
};

// Cập nhật user
export const updateUser = async (id: number, payload: UpdateUserPayload) => {
    const url = `${API_BASE_URL}/${id}`;
    const options = {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: {
            'Content-Type': 'application/json',
        },
    };
    return await fetchInstance(url, options);
};

// (Tạm thời bỏ delete, toggle do schema chưa hỗ trợ, nếu cần sau có thể thêm)
// export const deleteUser = ...
// export const toggleUserStatus = ...
