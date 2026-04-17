'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

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

interface UseFnbSocketOptions {
    warehouseId: number;
    userId?: string | number;
    userName?: string;
    onTableStatusChange?: (payload: TableStatusChangePayload) => void;
    onOrderUpdated?: (payload: OrderUpdatedPayload) => void;
    onSnapshotRequested?: (payload: SnapshotRequestedPayload) => void;
}

// ── Hook ───────────────────────────────────────────────────────────────────────
export function useFnbSocket({
    warehouseId,
    userId,
    userName,
    onTableStatusChange,
    onOrderUpdated,
    onSnapshotRequested,
}: UseFnbSocketOptions) {
    const socketRef = useRef<Socket | null>(null);
    const currentTableIdRef = useRef<string | number | null>(null);

    // Giữ ref tới callbacks để tránh re-create socket khi callback thay đổi
    const onTableStatusChangeRef = useRef(onTableStatusChange);
    const onOrderUpdatedRef = useRef(onOrderUpdated);
    const onSnapshotRequestedRef = useRef(onSnapshotRequested);

    useEffect(() => {
        onTableStatusChangeRef.current = onTableStatusChange;
    }, [onTableStatusChange]);

    useEffect(() => {
        onOrderUpdatedRef.current = onOrderUpdated;
    }, [onOrderUpdated]);

    useEffect(() => {
        onSnapshotRequestedRef.current = onSnapshotRequested;
    }, [onSnapshotRequested]);

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

        // Nhận thay đổi trạng thái bàn (từ mọi bàn trong warehouse)
        socket.on('table_status_change', (payload: TableStatusChangePayload) => {
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

    return { joinTable, leaveTable, syncOrder, broadcastTableStatus };
}
