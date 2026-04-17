import { fetchInstance } from "@/ultils/fetchInstance";

const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/fnb`;

export interface AreaApiResponse {
    area_id: number;
    area_name: string;
    description?: string;
    warehouse_id?: number;
}

export interface TableApiResponse {
    table_id: number;
    area_id: number;
    table_name: string;
    status: 'available' | 'occupied' | 'reserved';
    capacity?: number;
    warehouse_id?: number;
}

export const getAllAreas = async (): Promise<AreaApiResponse[]> => {
    return await fetchInstance(`${API_BASE_URL}/areas`);
};

export const createArea = async (areaData: Partial<AreaApiResponse>) => {
    return await fetchInstance(`${API_BASE_URL}/areas`, {
        method: 'POST',
        body: JSON.stringify(areaData),
    });
};

export const updateArea = async (id: number, areaData: Partial<AreaApiResponse>) => {
    return await fetchInstance(`${API_BASE_URL}/areas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(areaData),
    });
};

export const deleteArea = async (id: number) => {
    return await fetchInstance(`${API_BASE_URL}/areas/${id}`, {
        method: 'DELETE',
    });
};

export const getAllTables = async (): Promise<TableApiResponse[]> => {
    return await fetchInstance(`${API_BASE_URL}/tables`);
};

export const createTable = async (tableData: Partial<TableApiResponse>) => {
    return await fetchInstance(`${API_BASE_URL}/tables`, {
        method: 'POST',
        body: JSON.stringify(tableData),
    });
};

export const updateTable = async (id: number, tableData: Partial<TableApiResponse>) => {
    return await fetchInstance(`${API_BASE_URL}/tables/${id}`, {
        method: 'PUT',
        body: JSON.stringify(tableData),
    });
};

export const updateTableStatus = async (id: number, status: string) => {
    return await fetchInstance(`${API_BASE_URL}/tables/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
};

export const deleteTable = async (id: number) => {
    return await fetchInstance(`${API_BASE_URL}/tables/${id}`, {
        method: 'DELETE',
    });
};
