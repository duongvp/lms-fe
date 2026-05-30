import { fetchInstance } from "@/ultils/fetchInstance";

const BASE = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/golf`;

// ─── Types ───────────────────────────────────────────────────────────────────

export type LineStatus = 'AVAILABLE' | 'PLAYING' | 'BOOKED' | 'CLEANING' | 'MAINTENANCE';
export type OrderStatus = 'OPENING' | 'PLAYING' | 'PAUSED' | 'CHECKOUT_PENDING' | 'COMPLETED' | 'CANCELLED';

export interface GolfLine {
  line_id: number;
  warehouse_id: number;
  line_code: string;
  line_name: string;
  status: LineStatus;
  base_rate_per_min: number;
  peak_rate_per_min: number;
  notes: string | null;
  is_active: boolean;
  active_order?: GolfOrder | null;
  // realtime dashboard fields
  elapsed_seconds?: number;
  estimated_bill?: number;
  players?: GolfPlayer[];
}

export interface GolfOrder {
  golf_order_id: number;
  warehouse_id: number;
  golf_order_code: string;
  line_id: number;
  status: OrderStatus;
  started_at: string | null;
  paused_at: string | null;
  ended_at: string | null;
  total_paused_seconds: number;
  play_duration_minutes: number | null;
  rate_per_min: number;
  is_peak_hour: boolean;
  play_subtotal: number;
  fnb_subtotal: number;
  total_amount: number;
  notes: string | null;
  players?: GolfPlayer[];
  fnb_items?: GolfOrderItem[];
}

export interface GolfPlayer {
  player_id: number;
  golf_order_id: number;
  customer_id: number | null;
  player_name: string;
  is_primary: boolean;
}

export interface GolfOrderItem {
  item_id: number;
  golf_order_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
}

export interface MembershipCard {
  card_id: number;
  card_code: string;
  card_type: 'PRIVATE' | 'SHARED';
  card_name: string | null;
  wallet_minutes: number;
  total_minutes: number;
  expiry_date: string | null;
  is_active: boolean;
  active_line_id: number | null;
}

export interface CheckoutPayload {
  payment_method: 'CASH_OR_BANK' | 'PREPAID';
  membership_cards?: { card_id: number }[];
  voucher_code?: string;
  cash_amount?: number;
  bank_amount?: number;
  prepaid_amount?: number;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getGolfDashboard = async (): Promise<GolfLine[]> =>
  fetchInstance(`${BASE}/dashboard`);

// ─── Lines ────────────────────────────────────────────────────────────────────

export const getGolfLines = async (): Promise<GolfLine[]> =>
  fetchInstance(`${BASE}/lines`);

export const createGolfLine = async (data: Partial<GolfLine>): Promise<GolfLine> =>
  fetchInstance(`${BASE}/lines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateGolfLine = async (lineId: number, data: Partial<GolfLine>): Promise<GolfLine> =>
  fetchInstance(`${BASE}/lines/${lineId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const updateLineStatus = async (lineId: number, status: LineStatus): Promise<GolfLine> =>
  fetchInstance(`${BASE}/lines/${lineId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

// ─── Orders ───────────────────────────────────────────────────────────────────

export const createGolfOrder = async (lineId: number): Promise<GolfOrder> =>
  fetchInstance(`${BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ line_id: lineId }),
  });

export const getGolfOrder = async (id: number): Promise<GolfOrder> =>
  fetchInstance(`${BASE}/orders/${id}`);

export const startGolfOrder = async (id: number): Promise<GolfOrder> =>
  fetchInstance(`${BASE}/orders/${id}/start`, { method: 'PATCH' });

export const pauseGolfOrder = async (id: number): Promise<GolfOrder> =>
  fetchInstance(`${BASE}/orders/${id}/pause`, { method: 'PATCH' });

export const resumeGolfOrder = async (id: number): Promise<GolfOrder> =>
  fetchInstance(`${BASE}/orders/${id}/resume`, { method: 'PATCH' });

export const cancelGolfOrder = async (id: number, reason: string): Promise<void> =>
  fetchInstance(`${BASE}/orders/${id}/cancel`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });

export const checkoutGolfOrder = async (id: number, payload: CheckoutPayload): Promise<any> =>
  fetchInstance(`${BASE}/orders/${id}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

export const setGolfOrderCustomer = async (orderId: number, customerId: number): Promise<GolfOrder> =>
  fetchInstance(`${BASE}/orders/${orderId}/customer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_id: customerId }),
  });

export const addFnbItems = async (orderId: number, items: any[]): Promise<GolfOrderItem[]> =>
  fetchInstance(`${BASE}/orders/${orderId}/fnb`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });

export const validateGolfVoucher = async (code: string, orderValue: number): Promise<any> =>
  fetchInstance(`${BASE}/vouchers/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, order_value: orderValue }),
  });

// ─── Membership ───────────────────────────────────────────────────────────────

export const getMembershipCards = async (customerId: number): Promise<MembershipCard[]> =>
  fetchInstance(`${BASE}/membership/cards/customer/${customerId}`);

export const createMembershipCard = async (data: any): Promise<MembershipCard> =>
  fetchInstance(`${BASE}/membership/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

export const topUpMembershipCard = async (cardId: number, minutes: number, note?: string): Promise<MembershipCard> =>
  fetchInstance(`${BASE}/membership/cards/${cardId}/topup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ minutes, note }),
  });

export const getCardTransactions = async (cardId: number): Promise<any[]> =>
  fetchInstance(`${BASE}/membership/cards/${cardId}/transactions`);

export const activateMembershipCard = async (cardId: number, lineId: number): Promise<MembershipCard> =>
  fetchInstance(`${BASE}/membership/cards/${cardId}/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ line_id: lineId }),
  });
