import { Status } from "@/enums/status";
import { fetchInstance } from "@/ultils/fetchInstance";
import { filter } from "lodash";
const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/inventory-checks`;

// Kiểu dữ liệu API trả về
export interface InventoryCheckApiResponse {
    stock_take_id: number
    warehouse_id: number
    stock_take_code: string
    user_id: number
    start_date: Date
    end_date: Date
    status: string
    created_at: Date
    updated_at: Date
    created_by: string
    username: string
    warehouse_name: string
    total_actual_quantity: string
    total_variance: string
    quantity_increased: string
    quantity_decreased: string
}

export interface InventoryCheckBase {
    stock_take_id: number;
    warehouse_id: number;
    stock_take_code: string;
    user_id: number;
    start_date: string | null;
    end_date: string | null;
    status: Status
    created_at: string;
    updated_at: string;
    created_by: string;
    username: string;
    user_email: string;
    user_phone: string;
    warehouse_name: string;
    warehouse_address: string;
    notes: string;
}

export interface StockTakeSummary {
    total_items: number;
    total_variance: number;
    total_value_variance: number;
}

export interface StockTakeItem {
    key: number;
    stock_take_detail_id: number;
    stock_take_id: number;
    product_id: number;
    system_quantity: number;
    actual_quantity: number;
    variance: number;
    product_name: string;
    product_code: string;
    barcode: string;
    purchase_price: string; // hoặc number nếu bạn parse trước
    value_variance: number;
    selling_price: string;
    unit_name: string;
}

export interface InventoryCheck extends InventoryCheckBase {
    summary: StockTakeSummary;
    items: StockTakeItem[];
}

export const getInventoryChecksByPage = async (
    limit: number,
    skip: number,
    filter: any
): Promise<{ data: InventoryCheckApiResponse[]; total: number }> => {
    return await fetchInstance(`${API_BASE_URL}/search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit, skip, filter }),
    });
};

export const importInventoryChecksFromExcel = async (formatData: any): Promise<any> => {
    return await fetchInstance(`${API_BASE_URL}/import`, {
        method: "POST",
        body: formatData,
    });
};

export const exportInventoryChecks = async (
    stockTakeIds: Array<string | number | undefined>,
    warehouseId?: number,
    filter: any = {}
): Promise<Blob> => {
    const response = await fetchInstance(`${API_BASE_URL}/export`, {
        method: 'POST',
        body: JSON.stringify({ stockTakeIds, warehouseId, ...filter }),
    }, 'blob');

    return response;
};

export const getInventoryCheckById = async (id: number): Promise<InventoryCheck> => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url);
};

export const createInventoryCheck = async (inventoryCheckData: any) => {
    const url = `${API_BASE_URL}`;
    return await fetchInstance(url, {
        method: 'POST',
        body: JSON.stringify(inventoryCheckData),
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

export const updateInventoryCheck = async (id: number, inventoryCheckData: any) => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url, {
        method: 'PUT',
        body: JSON.stringify(inventoryCheckData),
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

export const deleteInventoryCheck = async (id: number) => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url, {
        method: 'DELETE',
    });
};
