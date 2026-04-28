'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useFnbStore, FnbTableState } from '../stores/fnbStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface FnbOrderItem {
    uniqueId: string;
    product: {
        id: number;
        name: string;
        price: number;
        category_id?: number;
        category_name?: string;
    };
    quantity: number;
}

export interface TableStatusChangePayload {
    tableId: string | number;
    status: 'empty' | 'in_use';
    occupantCount?: number;
    joinedBy?: { userId: string; userName: string };
    disconnectedUser?: string;
    state?: FnbTableState;
}

export interface OrderUpdatedPayload {
    tableId: string | number;
    orderItems: FnbOrderItem[];
    updatedBy: string;
    timestamp: string;
}

export interface SnapshotRequestedPayload {
    tableId: string | number;
    requestedBy: string;
}

// ── Kitchen Types ─────────────────────────────────────────────────────────────
export interface KitchenNotifyItem {
    productName: string;
    quantity: number;
    note?: string;
}

export interface KitchenOrderReceivedPayload {
    notificationId: string;
    warehouseId: number;
    tableId: string;


    tableLabel: string;
    items: (KitchenNotifyItem & { idx: number; status: 'pending' | 'done' })[];
    sentBy: string;
    timestamp: number;
}

export interface KitchenItemUpdatedPayload {
    notificationId: string;
    itemIdx: number;
    status: 'done' | 'pending';
}

export interface KitchenTableClearedPayload {
    tableId: string;
}

interface UseFnbSocketOptions {
    warehouseId: number;
    userId?: string | number;
    userName?: string;
    onTableStatusChange?: (payload: TableStatusChangePayload) => void;
    onOrderUpdated?: (payload: OrderUpdatedPayload) => void;
    onSnapshotRequested?: (payload: SnapshotRequestedPayload) => void;
    // Kitchen callbacks
    onKitchenOrderReceived?: (payload: KitchenOrderReceivedPayload) => void;
    onKitchenItemUpdated?: (payload: KitchenItemUpdatedPayload) => void;
    onKitchenTableCleared?: (payload: KitchenTableClearedPayload) => void;
    onInitKitchenTickets?: (payload: { tickets: KitchenOrderReceivedPayload[] }) => void;
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useFnbSocket({
    warehouseId,
    userId,
    userName,
    onTableStatusChange,
    onOrderUpdated,
    onSnapshotRequested,
    onKitchenOrderReceived,
    onKitchenItemUpdated,
    onKitchenTableCleared,
    onInitKitchenTickets,
}: UseFnbSocketOptions) {
    const socketRef = useRef<Socket | null>(null);
    const currentTableIdRef = useRef<string | number | null>(null);

    const initTables = useFnbStore(state => state.initTables);
    const updateTable = useFnbStore(state => state.updateTable);

    // Giữ ref tới callbacks để tránh re-create socket khi callback thay đổi
    const onTableStatusChangeRef = useRef(onTableStatusChange);
    const onOrderUpdatedRef = useRef(onOrderUpdated);
    const onSnapshotRequestedRef = useRef(onSnapshotRequested);
    const onKitchenOrderReceivedRef = useRef(onKitchenOrderReceived);
    const onKitchenItemUpdatedRef = useRef(onKitchenItemUpdated);
    const onKitchenTableClearedRef = useRef(onKitchenTableCleared);
    const onInitKitchenTicketsRef = useRef(onInitKitchenTickets);

    useEffect(() => { onTableStatusChangeRef.current = onTableStatusChange; }, [onTableStatusChange]);
    useEffect(() => { onOrderUpdatedRef.current = onOrderUpdated; }, [onOrderUpdated]);
    useEffect(() => { onSnapshotRequestedRef.current = onSnapshotRequested; }, [onSnapshotRequested]);
    useEffect(() => { onKitchenOrderReceivedRef.current = onKitchenOrderReceived; }, [onKitchenOrderReceived]);
    useEffect(() => { onKitchenItemUpdatedRef.current = onKitchenItemUpdated; }, [onKitchenItemUpdated]);
    useEffect(() => { onKitchenTableClearedRef.current = onKitchenTableCleared; }, [onKitchenTableCleared]);
    useEffect(() => { onInitKitchenTicketsRef.current = onInitKitchenTickets; }, [onInitKitchenTickets]);

    // ────────── Connect & Setup listeners ──────────
    useEffect(() => {
        if (!warehouseId || warehouseId === -1) return;

        const socket = io(`${SOCKET_URL}/fnb`, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[FnB Socket] Connected:', socket.id);
            // Auto-join warehouse room để nhận update màu bàn trên sơ đồ
            socket.emit('join_warehouse', { warehouseId });

            // Re-join bàn hiện tại nếu có (sau reconnect)
            if (currentTableIdRef.current) {
                socket.emit('join_table', {
                    tableId: currentTableIdRef.current,
                    warehouseId,
                    userId: String(userId || ''),
                    userName: userName || 'Nhân viên',
                });
            }
        });

        socket.on('connect_error', (err) => {
            console.warn('[FnB Socket] Connection error:', err.message);
        });

        socket.on('disconnect', (reason) => {
            console.warn('[FnB Socket] Disconnected:', reason);
        });

        // Nhận trạng thái toàn bộ bàn lúc vừa join hoặc F5
        socket.on('init_table_states', (payload: { warehouseId: number, data: Record<string, FnbTableState> }) => {
            if (payload.data) {
                initTables(payload.data);
            }
        });

        // Nhận thay đổi trạng thái của 1 bàn duy nhất (khi người ngoài click vào đổi món)
        socket.on('table_state_changed', (payload: { tableId: string | number, state: FnbTableState }) => {
            updateTable(payload.tableId, payload.state);
        });

        // Nhận thay đổi trạng thái bàn (từ mọi bàn trong warehouse) - logic cũ duy trì tương thích
        socket.on('table_status_change', (payload: TableStatusChangePayload) => {
            // Tự cập nhật store nếu có state đính kèm để đảm bảo sync (cả status vs timer)
            if (payload.state) {
                updateTable(payload.tableId, payload.state);
            } else {
                updateTable(payload.tableId, { status: payload.status, occupantCount: payload.occupantCount || 0 });
            }
            onTableStatusChangeRef.current?.(payload);
        });

        // Nhận cập nhật giỏ hàng từ nhân viên khác cùng bàn
        socket.on('order_updated', (payload: OrderUpdatedPayload) => {
            onOrderUpdatedRef.current?.(payload);
        });

        // Khi người khác trong bàn yêu cầu snapshot — client này push lại order
        socket.on('snapshot_requested', (payload: SnapshotRequestedPayload) => {
            onSnapshotRequestedRef.current?.(payload);
        });

        // ── Kitchen events ─────────────────────────────────────────────
        // Nhận đơn mới từ phục vụ gửi lên bếp
        socket.on('kitchen_order_received', (payload: KitchenOrderReceivedPayload) => {
            onKitchenOrderReceivedRef.current?.(payload);
        });

        // Nhận cập nhật trạng thái 1 món đã được bếp đánh dấu xong
        socket.on('kitchen_item_updated', (payload: KitchenItemUpdatedPayload) => {
            onKitchenItemUpdatedRef.current?.(payload);
        });

        // Nhận thông báo bàn đã thanh toán — xóa khỏi màn hình bếp
        socket.on('kitchen_table_cleared', (payload: KitchenTableClearedPayload) => {
            onKitchenTableClearedRef.current?.(payload);
        });

        // Nhận toàn bộ kitchen tickets hiện có (lúc mới vào màn hình bếp)
        socket.on('init_kitchen_tickets', (payload: { tickets: KitchenOrderReceivedPayload[] }) => {
            onInitKitchenTicketsRef.current?.(payload);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [warehouseId]);

    // ────────── Actions ──────────

    /** Gọi khi click vào bàn */
    const joinTable = useCallback((tableId: string | number) => {
        currentTableIdRef.current = tableId;
        socketRef.current?.emit('join_table', {
            tableId,
            warehouseId,
            userId: String(userId || ''),
            userName: userName || 'Nhân viên',
        });
        // Yêu cầu snapshot từ nhân viên đang ở bàn
        socketRef.current?.emit('request_table_snapshot', { tableId, warehouseId });
    }, [warehouseId, userId, userName]);

    /** Gọi khi đóng tab đơn hàng hoặc chuyển bàn */
    const leaveTable = useCallback((tableId: string | number) => {
        if (currentTableIdRef.current === tableId) {
            currentTableIdRef.current = null;
        }
        socketRef.current?.emit('leave_table', { tableId, warehouseId });
    }, [warehouseId]);

    /**
     * Gọi khi order thay đổi (thêm/sửa/xóa món)
     * Nên dùng kèm debounce ở bên ngoài để tránh spam events
     */
    const syncOrder = useCallback((tableId: string | number, orderItems: FnbOrderItem[]) => {
        socketRef.current?.emit('sync_order', { tableId, warehouseId, orderItems });
    }, [warehouseId]);

    /** Broadcast trạng thái bàn sau REST API (tạo bàn, thanh toán...) */
    const broadcastTableStatus = useCallback((tableId: string | number, status: 'empty' | 'in_use') => {
        socketRef.current?.emit('table_status_update', { tableId, warehouseId, status });
    }, [warehouseId]);

    /**
     * Gửi thông báo danh sách món lên bếp
     * Gọi khi nhân viên bấm nút "Báo bếp"
     */
    const notifyKitchen = useCallback((
        tableId: string,
        tableLabel: string,
        items: KitchenNotifyItem[],
        sentBy: string,
    ) => {
        const notificationId = `${tableId}-${Date.now()}`;
        socketRef.current?.emit('kitchen_notify', {
            warehouseId,
            tableId,
            tableLabel,
            items,
            sentBy,
            notificationId,
            timestamp: Date.now(),
        });
        return notificationId;
    }, [warehouseId]);

    /**
     * Bếp đánh dấu một món đã xong
     */
    const markKitchenItemDone = useCallback((notificationId: string, itemIdx: number) => {
        socketRef.current?.emit('kitchen_item_done', { warehouseId, notificationId, itemIdx });
    }, [warehouseId]);

    /**
     * Gọi khi thanh toán xong — xóa bàn khỏi màn hình bếp
     */
    const clearKitchenForTable = useCallback((tableId: string) => {
        socketRef.current?.emit('kitchen_order_cancelled', { warehouseId, tableId });
    }, [warehouseId]);

    return {
        joinTable,
        leaveTable,
        syncOrder,
        broadcastTableStatus,
        notifyKitchen,
        markKitchenItemDone,
        clearKitchenForTable,
    };
}
