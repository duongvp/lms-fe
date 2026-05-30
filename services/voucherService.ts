import { fetchInstance } from "@/ultils/fetchInstance";

const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/vouchers`;

export type VoucherDiscountType = 'percentage' | 'fixed';

export interface VoucherApiResponse {
    voucher_id: number;
    code: string;
    discount_type: VoucherDiscountType;
    discount_value: number | string;
    max_discount?: number | string | null;
    min_order_value: number | string;
    expiry_date?: string | null;
    usage_limit?: number | null;
    usage_count: number;
    is_active: boolean | number;
    created_at?: string;
    updated_at?: string;
}

export interface VoucherPayload {
    code: string;
    discount_type: VoucherDiscountType;
    discount_value: number;
    max_discount?: number | null;
    min_order_value?: number;
    expiry_date?: string | null;
    usage_limit?: number | null;
    is_active?: boolean;
}

export const getVouchers = async (filter: { search?: string; is_active?: string } = {}): Promise<VoucherApiResponse[]> => {
    const params = new URLSearchParams();
    if (filter.search) params.set('search', filter.search);
    if (filter.is_active) params.set('is_active', filter.is_active);
    const query = params.toString();
    return fetchInstance(`${API_BASE_URL}${query ? `?${query}` : ''}`);
};

export const createVoucher = async (payload: VoucherPayload): Promise<VoucherApiResponse> =>
    fetchInstance(API_BASE_URL, {
        method: 'POST',
        body: JSON.stringify(payload),
    });

export const updateVoucher = async (id: number, payload: VoucherPayload): Promise<VoucherApiResponse> =>
    fetchInstance(`${API_BASE_URL}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });

export const deleteVoucher = async (id: number): Promise<{ success: boolean }> =>
    fetchInstance(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
    });
