import { fetchInstance } from "@/ultils/fetchInstance";

const BASE = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/member-cards`;

export interface TierConfig {
    thresholds: Record<string, number>;
    discounts: {
        GOLF: Record<string, number>;
        FNB: Record<string, number>;
    };
    topup_bonus: {
        min_amount: number;
        bonus_percentage: number;
    };
}

export interface MemberCardAccount {
    balance: number;
    points: number;
    membership_tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
    total_spent: number;
    is_active: boolean;
}

export interface MemberCardTransaction {
    transaction_id: number;
    account_id: number;
    transaction_type: 'TOP_UP' | 'PAYMENT' | 'REFUND' | 'ADJUSTMENT';
    amount: number;
    balance_before: number;
    balance_after: number;
    reference_type: string | null;
    reference_id: string | null;
    notes: string | null;
    created_by: number;
    created_at: string;
}

export const getTierConfig = async (): Promise<TierConfig> => {
    return fetchInstance(`${BASE}/tier-config`);
};

export const getMemberCardAccount = async (customerId: number): Promise<MemberCardAccount> => {
    return fetchInstance(`${BASE}/${customerId}`);
};

export const topUpMemberCard = async (customerId: number, amount: number, notes?: string): Promise<any> => {
    return fetchInstance(`${BASE}/${customerId}/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, notes }),
    });
};

export const getMemberCardTransactions = async (customerId: number, limit: number = 50, offset: number = 0): Promise<MemberCardTransaction[]> => {
    return fetchInstance(`${BASE}/${customerId}/transactions?limit=${limit}&offset=${offset}`);
};
