import { fetchInstance } from "@/ultils/fetchInstance";
const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/return-orders`;

// Interface for Return Order API response
export interface ReturnOrderApiResponse {
    return_id: number;
    warehouse_id: number;
    return_order_code: string;
    supplier_id: number | null;
    user_id: number;
    return_date: string;
    total_value: string;
    status: string;
    notes: string | null;
    supplier_name: string;
    created_at: Date;
    updated_at: Date;
    total_amount: string;
}

export interface ReturnOrderDetailResponse {
    return_order_detail_id: number;
    return_id: number;
    product_id: number;
    return_quantity: number;
    unit_price: string;
    total_price: string;
    product_name: string;
    product_code: string;
    barcode: string;
    purchase_price: string;
    reason: string;
}

export interface FullReturnOrderResponse extends ReturnOrderApiResponse {
    summary: {
        total_items: number
        total_quantity: number
        refund_amount: string
        return_fee: string
        total_amount: string
        amount_paid: string
        discount_total: string
    };
    items: ReturnOrderDetailResponse[];
    invoiceDetails: any;
}

export const getReturnOrdersByPage = async (
    limit: number,
    skip: number,
    filter: any
): Promise<{ data: ReturnOrderApiResponse[], total: number, grand_total: string }> => {
    return await fetchInstance(`${API_BASE_URL}/search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit, skip, filter }),
    });
};

export const getReturnOrderById = async (id: number): Promise<FullReturnOrderResponse> => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url);
};

export const createReturnOrder = async (returnOrderData: any): Promise<ReturnOrderApiResponse> => {
    const url = `${API_BASE_URL}`;
    return await fetchInstance(url, {
        method: 'POST',
        body: JSON.stringify(returnOrderData),
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

export const importReturnOrdersFromExcel = async (formatData: any): Promise<any> => {
    return await fetchInstance(`${API_BASE_URL}/import`, {
        method: "POST",
        body: formatData,
    });
};

export const exportReturnOrders = async (
    returnIds: Array<string | number | undefined>,
    warehouseId?: number,
    filter: any = {}
): Promise<Blob> => {
    const response = await fetchInstance(`${API_BASE_URL}/export`, {
        method: 'POST',
        body: JSON.stringify({ returnIds, warehouseId, ...filter }),
    }, 'blob');

    return response;
};

export const updateReturnOrder = async (id: string, returnOrderData: any): Promise<ReturnOrderApiResponse> => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url, {
        method: 'PUT',
        body: JSON.stringify(returnOrderData),
        headers: {
            'Content-Type': 'application/json',
        },
    });
};


export const cancelReturnOrder = async (id: number) => {
    const url = `${API_BASE_URL}/cancel/${id}`;
    return await fetchInstance(url, {
        method: 'POST',
    });
};
