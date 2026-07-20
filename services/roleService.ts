// services/roleService.ts

import { fetchInstance } from "@/ultils/fetchInstance";
const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/roles`;


export interface RolePermission {
    [key: string]: string; // ví dụ: { "Nhập hàng": ["Xem DS", "Thêm mới"] }
}
export interface RoleApiResponse {
    role_id: number;
    role_name: string;
    permissions: RolePermission[];
    description?: string;
    fieldPolicy?: any;
    created_at?: Date;
}

export const getRoles = async (): Promise<RoleApiResponse[]> => {
    const url = API_BASE_URL;
    return await fetchInstance(url);
};

export const getRoleById = async (id: number): Promise<RoleApiResponse> => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url);
};

export const createRole = async (payload: any) => {
    const url = API_BASE_URL;
    const options = {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
            'Content-Type': 'application/json',
        },
    };
    return await fetchInstance(url, options);
};

export const updateRole = async (id: number, payload: any) => {
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

export const deleteRole = async (id: number) => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url, {
        method: 'DELETE',
    });
};
