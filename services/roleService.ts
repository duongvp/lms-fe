// services/roleService.ts

import { fetchInstance } from "@/ultils/fetchInstance";
import type { ModuleField, ModuleStructure } from "@/types/fieldPolicy";
import { validateFieldPolicy } from "@/helper/fieldPolicy";

const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/roles`;
const MODULE_API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/modules`;

// ==================== INTERFACES ====================

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
    permissions?: Array<string | { code: string } | { key: string }>;
    fieldPolicy?: any;
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
    if (payload.fieldPolicy) validateFieldPolicy(payload.fieldPolicy);
    const url = API_BASE_URL;
    const options = {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
    };
    return await fetchInstance(url, options);
};

export const updateRole = async (id: number, payload: Partial<RolePayload>) => {
    if (payload.fieldPolicy) validateFieldPolicy(payload.fieldPolicy);
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

export const getModules = async (): Promise<Omit<ModuleStructure, "fields">[]> => {
    try {
        const url = MODULE_API_BASE_URL;
        const res = await fetchInstance(url);
        const data = extractData<any[]>(res, []);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.warn("Không thể lấy modules từ /api/modules, fallback modules-structure", error);
        return getModulesStructure();
    }
};

export const getModuleFields = async (moduleCode: string): Promise<ModuleStructure | null> => {
    try {
        const url = `${MODULE_API_BASE_URL}/${moduleCode}/fields`;
        const res = await fetchInstance(url);
        const data = extractData<any>(res, null);
        if (data?.fields) return data as ModuleStructure;
        if (Array.isArray(data)) {
            return {
                code: moduleCode,
                name: moduleCode,
                fields: data as ModuleField[],
            };
        }
    } catch (error) {
        console.warn(`Không thể lấy ModuleField ${moduleCode} từ /api/modules, fallback modules-structure`, error);
    }

    const modules = await getModulesStructure();
    return modules.find((module) => module.code === moduleCode) || null;
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
export const getRoleFieldPolicy = async (id: number): Promise<any> => {
    const url = `${API_BASE_URL}/${id}/field-policy`;
    const res = await fetchInstance(url);
    return extractData<any>(res, {});
};

export const updateRoleFieldPolicy = async (id: number, fieldPolicy: any) => {
    if (fieldPolicy) validateFieldPolicy(fieldPolicy);
    const url = `${API_BASE_URL}/${id}/field-policy`;
    const options = {
        method: "PUT",
        body: JSON.stringify({ fieldPolicy }),
        headers: { "Content-Type": "application/json" },
    };
    return await fetchInstance(url, options);
};