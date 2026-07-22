// services/roleService.ts

import { fetchInstance } from "@/ultils/fetchInstance";

const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/roles`;

// ==================== INTERFACES ====================

export interface ModuleField {
    fieldCode: string;
    fieldLabel: string;
}

export interface ModuleStructure {
    code: string;
    name: string;
    fields: ModuleField[];
}

export interface PermissionActionGroup {
    actions: string[];
    keys: string[];
}

export interface PermissionStructure {
    [group: string]: {
        [menu: string]: PermissionActionGroup;
    };
}

export interface RolePermissionItem {
    key: string;
    name: string;
}

export interface RoleApiResponse {
    id: number;
    code: string;
    name: string;
    description?: string;
    permissions?: RolePermissionItem[];
    fieldPolicy?: any;
    isActive?: boolean;
}

export interface RolePayload {
    role_name: string;
    description?: string;
    permissions?: string[];
}

// ==================== HELPER ====================

/**
 * Hàm helper để trích xuất data từ response API.
 * Nếu response có dạng { data: ... } thì trả về data, ngược lại trả về chính nó.
 */
const extractData = <T>(response: any, fallback: T): T => {
    if (response && typeof response === "object" && "data" in response) {
        return response.data as T;
    }
    return response as T;
};

// ==================== API FUNCTIONS ====================

export const getRoles = async (): Promise<RoleApiResponse[]> => {
    const url = API_BASE_URL;
    const res = await fetchInstance(url);
    return extractData(res, []);
};

export const getRoleById = async (id: number): Promise<RoleApiResponse> => {
    const url = `${API_BASE_URL}/${id}`;
    const res = await fetchInstance(url);
    return extractData(res, {} as RoleApiResponse);
};

export const createRole = async (payload: RolePayload) => {
    const url = API_BASE_URL;
    const options = {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
    };
    return await fetchInstance(url, options);
};

export const updateRole = async (id: number, payload: Partial<RolePayload>) => {
    const url = `${API_BASE_URL}/${id}`;
    const options = {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
    };
    return await fetchInstance(url, options);
};

export const deleteRole = async (id: number) => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url, { method: "DELETE" });
};

export const getModulesStructure = async (): Promise<ModuleStructure[]> => {
    const url = `${API_BASE_URL}/modules-structure`;
    const res = await fetchInstance(url);
    // Nếu res là mảng trực tiếp hoặc res.data là mảng → trả về mảng
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.data)) return res.data;
    return [];
};

export const getPermissionsStructure = async (): Promise<PermissionStructure> => {
    const url = `${API_BASE_URL}/permissions-structure`;
    const res = await fetchInstance(url);
    if (res && typeof res === "object" && !Array.isArray(res)) {
        // Nếu có res.data và nó là object (không phải mảng) thì lấy data
        if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
            return res.data as PermissionStructure;
        }
        return res as PermissionStructure;
    }
    return {};
};