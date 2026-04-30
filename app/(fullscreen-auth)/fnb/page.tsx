"use client";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
    Button,
    Card,
    Col,
    Input,
    message,
    Row,
    Space,
    Typography,
    Tabs,
    Badge,
    Checkbox,
    Pagination,
    Avatar,
    Divider,
    Radio,
    Form,
    Modal,
    Select,
    Grid,
    Drawer,
} from "antd";
import {
    PlusOutlined,
    ShoppingCartOutlined,
    SearchOutlined,
    TableOutlined,
    AppstoreOutlined,
    BellOutlined,
    ReloadOutlined,
    UserOutlined,
    MenuOutlined,
    ShoppingOutlined,
    SwapOutlined,
    FieldTimeOutlined,
    EditOutlined,
    HistoryOutlined,
    CloseOutlined,
    GroupOutlined,
    MergeCellsOutlined,
    RollbackOutlined,
    CarryOutOutlined,
    MinusOutlined,
} from "@ant-design/icons";
import SelectWithButton from "@/components/ui/Selects/SelectWithButton";
import useProductSelect from "@/hooks/useProductSelect";
import { ProductApiResponse } from "@/services/productService";
import useProductStore from "@/stores/productStore";
import { ActionType } from "@/enums/action";
import ProductModal from "@/app/(admin)/products/components/Modal/ProductModal";
import useCustomerSelect from "@/hooks/useCustomerSelect";
import useCustomerStore from "@/stores/customerStore";
import CustomerModal from "@/app/(admin)/partners/customers/components/Modal/CustomerModal";
import useRoomStore from "@/stores/roomStore";
import RoomModal from "./components/RoomModal";
import TableActionModal from "./components/TableActionModal";
import RoomGrid from "./components/LeftPanel/RoomGrid";
import MenuGrid from "./components/LeftPanel/MenuGrid";
import OrderItemsTable from "./components/RightPanel/OrderItemsTable";
import { COLORS } from "./constants";
import { formatDuration, playTingSound } from "./utils";
import { Room, RoomStatus, OrderItem, Product } from "./types";
import { CategoryApiResponse, getCategories } from "@/services/categoryService";
import { getProductsByPage } from "@/services/productService";
import { Spin } from "antd";
import { useAuthStore } from "@/stores/authStore";
import PaymentDrawer from "./components/PaymentDrawer";
import OrderNoteModal from "./components/OrderNoteModal";
import KitchenHistoryDrawer from "./components/KitchenHistoryDrawer";
import SettingsDrawer from "./components/SettingsDrawer";
import ReturnProductModal from "./components/ReturnProductModal";
import { getAllAreas, getAllTables, AreaApiResponse, TableApiResponse, checkoutFnbOrder } from "@/services/fnbService";
import { useFnbSocket } from "@/hooks/useFnbSocket";
import { useFnbStore } from "@/stores/fnbStore";

const { Text, Title } = Typography;



const EMPTY_ARRAY: any[] = [];
const PAGE_SIZE = 24;

export default function FnbSalesPage() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [areas, setAreas] = useState<AreaApiResponse[]>([]);
    const [roomStatusFilter, setRoomStatusFilter] = useState<RoomStatus | "all">("all");
    const [activeFloor, setActiveFloor] = useState("all");
    const [orders, setOrders] = useState<Record<string, OrderItem[]>>({});
    const [openRoomIds, setOpenRoomIds] = useState<string[]>([]); // Default open tab
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"rooms" | "menu">("rooms");
    const [viewDensity, setViewDensity] = useState<"normal" | "compact">("normal");

    const { warehouseId, userId, username: staffName } = useAuthStore((state) => state.user);

    const [searchTerm, setSearchTerm] = useState("");
    const { setModal } = useProductStore();
    const { options, handleScroll } = useProductSelect(searchTerm, false, true, EMPTY_ARRAY);

    const screens = Grid.useBreakpoint();
    const isMobile = !screens.lg && screens.xs !== undefined ? true : false; // Treat < lg as mobile for better POS experience
    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

    const [customerSearchTerm, setCustomerSearchTerm] = useState("");
    const [form] = Form.useForm();
    const { setModal: setCustomerModal } = useCustomerStore();
    const { options: customerOptions, handleScroll: handleCustomerScroll } = useCustomerSelect(customerSearchTerm, form, null);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

    const [categories, setCategories] = useState<CategoryApiResponse[]>([]);
    const [products, setProducts] = useState<ProductApiResponse[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    // PAGE_SIZE moved to top level

    const { setModal: setRoomModal } = useRoomStore();

    const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
    const [roomsToMerge, setRoomsToMerge] = useState<string[]>([]);
    const [autoOpenMenu, setAutoOpenMenu] = useState(false);

    const [isTableActionModalOpen, setIsTableActionModalOpen] = useState(false);
    const [modalOrderType, setModalOrderType] = useState<"sit-in" | "delivery" | "takeaway">("sit-in");
    const [modalTargetRoomId, setModalTargetRoomId] = useState<string | null>(null);

    const [modalMode, setModalMode] = useState<"merge" | "split">("merge");
    const [splitQuantities, setSplitQuantities] = useState<Record<string, number>>({});
    const [modalTargetTableType, setModalTargetTableType] = useState<"new" | "existing">("new");
    const [orderStartTimes, setOrderStartTimes] = useState<Record<string, Date>>({});
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
    const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

    const [orderNotes, setOrderNotes] = useState<Record<string, string>>({});
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
    const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);

    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

    // Trạng thái cho modal xác nhận giảm/hủy món đã báo bếp
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelItem, setCancelItem] = useState<OrderItem | null>(null);
    const [cancelQty, setCancelQty] = useState(1);
    const [cancelReason, setCancelReason] = useState("Khác");
    const [cancelOtherReason, setCancelOtherReason] = useState("");
    const [onCancelConfirm, setOnCancelConfirm] = useState<{ fn: (qty: number, reason: string) => void } | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const targetOrderSummary = useMemo(() => {
        if (!modalTargetRoomId || modalMode !== 'merge') return [];
        const items = orders[modalTargetRoomId] || [];
        if (items.length === 0) return [];

        const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

        return [{
            key: modalTargetRoomId,
            customerName: "Khách lẻ",
            orderCode: modalTargetRoomId.startsWith('temp-') ? "Đơn mới" : modalTargetRoomId.replace('r', 'HD-'),
            totalQty,
            totalAmount
        }];
    }, [orders, modalTargetRoomId, modalMode]);

    // Load autoOpenMenu from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("fnb_auto_open_menu");
        if (saved !== null) {
            setAutoOpenMenu(saved === "true");
        }
    }, []);

    // Save autoOpenMenu to localStorage
    useEffect(() => {
        localStorage.setItem("fnb_auto_open_menu", String(autoOpenMenu));
    }, [autoOpenMenu]);

    const fetchAreasAndTables = async () => {
        try {
            const [areasData, tablesData] = await Promise.all([
                getAllAreas(),
                getAllTables()
            ]);

            setAreas(areasData);

            const mappedRooms: Room[] = tablesData.map(table => ({
                id: String(table.table_id),
                label: table.table_name,
                status: table.status as RoomStatus,
                floor: String(table.area_id)
            }));

            setRooms(mappedRooms);
        } catch (error) {
            console.error("Failed to fetch areas and tables", error);
            message.error("Lỗi khi tải dữ liệu phòng bàn");
        }
    };

    useEffect(() => {
        fetchAreasAndTables();
    }, []);

    // ─── Socket: callbacks phải dùng useCallback để tránh re-create socket ───
    const handleSocketTableStatusChange = useCallback(({ tableId, status }: { tableId: string | number; status: string }) => {
        setRooms(prev => prev.map(r =>
            r.id === String(tableId)
                ? { ...r, status: status === 'in_use' ? 'occupied' as RoomStatus : 'available' as RoomStatus }
                : r
        ));
    }, []);

    const handleSocketOrderUpdated = useCallback(({ tableId, orderItems }: { tableId: string | number; orderItems: OrderItem[] }) => {
        // Silent sync — không show message để tránh spam
        setOrders(prev => ({ ...prev, [String(tableId)]: orderItems }));
    }, []);

    // ordersRef để snapshot_requested có thể truy cập state mới nhất mà không cần re-create
    const ordersRef = React.useRef(orders);
    useEffect(() => { ordersRef.current = orders; }, [orders]);

    // syncOrderRef để onSnapshotRequested có thể gọi syncOrder mà không tạo circular dependency
    const syncOrderRef = React.useRef<((tableId: string | number, items: any[]) => void) | null>(null);

    const { joinTable, leaveTable, syncOrder, broadcastTableStatus, notifyKitchen, clearKitchenForTable } = useFnbSocket({
        warehouseId,
        userId: userId,
        userName: staffName || 'Nhân viên',
        onTableStatusChange: handleSocketTableStatusChange,
        onOrderUpdated: handleSocketOrderUpdated,
        onSnapshotRequested: useCallback(({ tableId }: { tableId: string | number }) => {
            const currentItems = ordersRef.current[String(tableId)];
            if (currentItems?.length > 0) {
                // Dùng ref để tránh circular dependency với syncOrder
                syncOrderRef.current?.(tableId, currentItems);
            }
        }, []),
        onKitchenItemUpdated: useCallback(({ notificationId, itemIdx, status, uniqueId, tableId }: any) => {
            if (!tableId || !uniqueId) return;
            setOrders(prev => {
                const roomOrders = prev[String(tableId)];
                if (!roomOrders) return prev;

                const updatedOrders = roomOrders.map(item => {
                    if (item.uniqueId === uniqueId) {
                        return { ...item, kitchenStatus: status };
                    }
                    return item;
                });

                // Đồng bộ thay đổi này ra các client khác
                if (syncOrderRef.current) {
                    syncOrderRef.current(tableId, updatedOrders);
                }

                return { ...prev, [String(tableId)]: updatedOrders };
            });
        }, []),
    });

    // Cập nhật ref sau khi syncOrder đã được khai báo
    useEffect(() => {
        syncOrderRef.current = syncOrder;
    }, [syncOrder]);

    const tablesState = useFnbStore(state => state.tables);
    // Sync store state sang local orders/startTimes (chỉ ảnh hưởng real tables, bỏ qua temp tabs)
    useEffect(() => {
        setOrders(prev => {
            const next = { ...prev };
            Object.entries(tablesState).forEach(([id, state]) => {
                if (state.order_draft) next[id] = state.order_draft;
            });
            return next;
        });

        setOrderStartTimes(prev => {
            const next = { ...prev };
            Object.entries(tablesState).forEach(([id, state]) => {
                if (state.start_time) next[id] = new Date(state.start_time);
            });
            return next;
        });
    }, [tablesState]);

    useEffect(() => {
        const fetchCats = async () => {
            try {
                const data = await getCategories();
                setCategories(data);
            } catch (error) {
                console.error("Failed to fetch categories", error);
            }
        };
        fetchCats();
    }, []);

    useEffect(() => {
        const fetchProds = async () => {
            if (warehouseId === -1) return;
            setIsLoadingProducts(true);
            try {
                const skip = (currentPage - 1) * PAGE_SIZE;
                const filter: any = { warehouse_id: warehouseId, is_active: 1 };
                if (selectedCategoryId) {
                    filter.category_id = selectedCategoryId;
                }
                const response = await getProductsByPage(PAGE_SIZE, skip, filter);
                setProducts(response.data);
                setTotalProducts(response.total);
            } catch (error) {
                console.error("Failed to fetch products", error);
            } finally {
                setIsLoadingProducts(false);
            }
        };
        fetchProds();
    }, [selectedCategoryId, currentPage, warehouseId]);

    const selectedRoom = useMemo(
        () => rooms.find((r) => r.id === selectedRoomId) ?? null,
        [rooms, selectedRoomId]
    );

    const counts = useMemo(() => {
        const total = rooms.length;
        const available = rooms.filter(r => r.status === "available").length;
        const inUse = total - available;
        return { total, available, inUse };
    }, [rooms]);

    const displayedRooms = useMemo(() => {
        let filtered = rooms;
        if (roomStatusFilter !== "all") {
            if (roomStatusFilter === ("in-use" as any)) {
                filtered = filtered.filter((r) => r.status === "occupied" || r.status === "reserved");
            } else {
                filtered = filtered.filter((r) => r.status === roomStatusFilter);
            }
        }
        if (activeFloor !== "all") {
            filtered = filtered.filter(r => r.floor === activeFloor);
        }
        return filtered;
    }, [rooms, roomStatusFilter, activeFloor]);

    const handleAddRoom = () => {
        fetchAreasAndTables();
    };

    const currentOrder = selectedRoomId ? orders[selectedRoomId] ?? [] : [];

    // true khi đơn hiện tại có thay đổi so với lần cuối đã báo bếp
    const hasKitchenChanges = useMemo(() => {
        if (!selectedRoomId || currentOrder.length === 0) return false;
        return currentOrder.some(item => (item.sentQuantity || 0) < item.quantity);
    }, [currentOrder, selectedRoomId]);

    const handleRoomClick = (room: Room) => {
        setSelectedRoomId(room.id);
        if (!openRoomIds.includes(room.id)) {
            setOpenRoomIds((prev) => [...prev, room.id]);
        }
        if (autoOpenMenu) {
            setActiveTab("menu");
        }
        // Socket: vào room bàn, tự động yêu cầu snapshot giỏ hàng từ nhân viên khác
        joinTable(room.id);
    };

    const handleAddOrder = () => {
        const newId = `temp-${Date.now()}`;
        setOpenRoomIds((prev) => [...prev, newId]);
        setSelectedRoomId(newId);
    };

    const tabItems = useMemo(() => {
        const items = openRoomIds.map(id => {
            const room = rooms.find(r => r.id === id);
            const label = id.startsWith("temp-") ? "Đơn mới" : (room?.label || id);
            return {
                label,
                key: id,
                closable: true,
            };
        });

        // Add trailing "+" tab
        items.push({
            label: <PlusOutlined style={{ fontSize: 16 }} />,
            key: "add_tab",
            closable: false,
        } as any);

        return items;
    }, [openRoomIds, rooms]);

    const handleAssignRoom = (newRoomId: string) => {
        if (!selectedRoomId) return;

        // If the room already has an open tab, we just switch to it (optionally merging)
        if (openRoomIds.includes(newRoomId)) {
            setSelectedRoomId(newRoomId);
            // Optional: If current temp tab has items, we could merge them here
            return;
        }

        const currentItems = orders[selectedRoomId] || [];

        setOpenRoomIds((prev) => {
            const next = prev.map(id => id === selectedRoomId ? newRoomId : id);
            return next;
        });

        setOrders((prev) => {
            const next = { ...prev };
            // Move items to the new room key
            if (currentItems.length > 0) {
                next[newRoomId] = [...(next[newRoomId] || []), ...currentItems];
            }
            // If it was a temp tab, we can delete the temp key
            if (selectedRoomId.startsWith("temp-")) {
                delete next[selectedRoomId];
            }
            return next;
        });

        // Transfer start time if it exists
        if (orderStartTimes[selectedRoomId]) {
            setOrderStartTimes(prev => {
                const next = { ...prev };
                next[newRoomId] = next[selectedRoomId];
                if (selectedRoomId.startsWith("temp-")) {
                    delete next[selectedRoomId];
                }
                return next;
            });
        }

        setSelectedRoomId(newRoomId);
        message.success(`Đã gán đơn cho ${rooms.find(r => r.id === newRoomId)?.label}`);
    };

    const handleRemoveOrder = (id: string) => {
        const room = rooms.find(r => r.id === id);
        const label = id.startsWith("temp-") ? "Đơn mới" : (room?.label || id);

        Modal.confirm({
            title: `Đóng đơn hàng ${label}`,
            content: 'Bạn có chắc chắn muốn đóng đơn hàng này? Nếu chưa lưu, dữ liệu sẽ bị mất.',
            okText: 'Đồng ý',
            cancelText: 'Bỏ qua',
            okButtonProps: { danger: true },
            onOk: () => {
                // Socket: rời room bàn trước khi đóng tab
                if (!id.startsWith('temp-')) {
                    leaveTable(id);
                }
                setOpenRoomIds((prev) => {
                    const next = prev.filter((item) => item !== id);
                    if (id === selectedRoomId) {
                        setSelectedRoomId(next.length > 0 ? next[next.length - 1] : null);
                    }
                    return next;
                });
            },
        });
    };
    const handleMergeRooms = (rawSourceIds: string[], rawTargetId: string) => {
        if (rawSourceIds.length === 0 || !rawTargetId) {
            message.warning("Vui lòng chọn bàn để ghép.");
            return;
        }

        const targetId = String(rawTargetId);
        const sourceIds = rawSourceIds.map(String);

        const newOrders = { ...orders };
        const targetItems = [...(newOrders[targetId] || [])];

        sourceIds.forEach((id) => {
            const sourceItems = newOrders[id] || [];
            sourceItems.forEach((sItem) => {
                const existingIdx = targetItems.findIndex(tItem => tItem.product.id === sItem.product.id);
                if (existingIdx !== -1) {
                    targetItems[existingIdx] = {
                        ...targetItems[existingIdx],
                        quantity: targetItems[existingIdx].quantity + sItem.quantity
                    };
                } else {
                    targetItems.push({
                        ...sItem,
                        uniqueId: `${sItem.product.id}-${Date.now()}-${Math.random()}`
                    });
                }
            });
            // Xóa món ở bàn nguồn
            delete newOrders[id];

            // Đồng bộ Socket cho bàn nguồn
            if (!id.startsWith('temp-')) {
                syncOrder(id, []);
                broadcastTableStatus(id, 'empty');
            }
        });

        newOrders[targetId] = targetItems;
        setOrders(newOrders);

        // Cập nhật trạng thái các bàn trong danh sách rooms
        setRooms(prev => prev.map(room => {
            if (sourceIds.includes(room.id)) return { ...room, status: 'available' as RoomStatus };
            if (room.id === targetId) return { ...room, status: 'occupied' as RoomStatus };
            return room;
        }));

        // Đồng bộ Socket cho bàn đích
        if (!targetId.startsWith('temp-')) {
            broadcastTableStatus(targetId, 'in_use');
            syncOrder(targetId, targetItems);
        }

        // Đóng tab của các bàn đã ghép
        setOpenRoomIds((prev) => prev.filter(id => !sourceIds.includes(id)));

        // Nếu bàn đang chọn là một trong các bàn nguồn, chuyển sang bàn đích
        if (sourceIds.includes(selectedRoomId!)) {
            setSelectedRoomId(targetId);
        }

        setIsMergeModalOpen(false);
        setRoomsToMerge([]);
        message.success("Đã ghép bàn thành công.");
    };


    const handlePayment = () => {
        if (!selectedRoomId || currentOrder.length === 0) return;
        setIsPaymentDrawerOpen(true);
    };

    const confirmPayment = async (payload: {
        paymentMethod: 'cash' | 'transfer' | 'card';
        finalAmount: number;
        discount: number;
        otherFeesTotal: number;
        voucherDiscountAmount: number;
        customerPaid: number;
    }) => {
        if (!selectedRoomId) return;

        setIsCheckoutLoading(true);
        try {
            // Map món hiện tại sang format API
            const checkoutItems = currentOrder.map(item => ({
                product_id: item.product.id,
                quantity: item.quantity,
                unit_price: item.product.price,
            }));

            await checkoutFnbOrder({
                tableId: selectedRoomId,
                items: checkoutItems,
                paymentMethod: payload.paymentMethod,
                finalAmount: payload.finalAmount,
                discount: payload.discount + payload.voucherDiscountAmount,
                otherFeesTotal: payload.otherFeesTotal,
                customerId: selectedCustomer?.customer_id ?? null,
                notes: orderNotes[selectedRoomId] ?? null,
            });

            // Chỉ clear order sau khi API thành công
            setOrders(prev => {
                const next = { ...prev };
                delete next[selectedRoomId];
                return next;
            });

            setOrderStartTimes(prev => {
                const next = { ...prev };
                delete next[selectedRoomId];
                return next;
            });

            setRooms(prev => prev.map(room =>
                room.id === selectedRoomId ? { ...room, status: 'available' as RoomStatus } : room
            ));

            // Socket: broadcast bàn trống cho toàn bộ nhân viên trong warehouse
            if (!selectedRoomId.startsWith('temp-')) {
                syncOrder(selectedRoomId, []);
                clearKitchenForTable(selectedRoomId); // Xóa bàn này khỏi màn hình bếp
            }
            broadcastTableStatus(selectedRoomId, 'empty');
            leaveTable(selectedRoomId);

            setOpenRoomIds(prev => prev.filter(id => id !== selectedRoomId));
            setSelectedRoomId(null);
            setIsPaymentDrawerOpen(false);

            message.success('Thanh toán thành công. Bàn đã được giải phóng.');
        } catch (error: any) {
            console.error('Checkout error:', error);
            message.error(error?.message || 'Thanh toán thất bại. Vui lòng thử lại.');
            // Không clear order khi lỗi
        } finally {
            setIsCheckoutLoading(false);
        }
    };

    const [isNotifyingKitchen, setIsNotifyingKitchen] = useState(false);

    const handleNotifyKitchen = () => {
        if (!selectedRoomId || currentOrder.length === 0) {
            message.warning('Chưa có món nào trong đơn để báo bếp.');
            return;
        }
        setIsNotifyingKitchen(true);
        const tableLabel = rooms.find(r => r.id === selectedRoomId)?.label
            || (selectedRoomId.startsWith('temp-') ? 'Đơn mới' : selectedRoomId);

        // Chỉ gửi những món chưa gửi đủ số lượng
        const kitchenItems = currentOrder
            .filter(item => (item.sentQuantity || 0) < item.quantity)
            .map(item => ({
                uniqueId: item.uniqueId,
                productName: item.product.name,
                quantity: item.quantity - (item.sentQuantity || 0),
            }));

        notifyKitchen(selectedRoomId, tableLabel, kitchenItems, staffName || 'Nhân viên');
        const currentTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        // Cập nhật lại số lượng đã gửi và trạng thái pending trên order_draft
        const updatedOrder = currentOrder.map(item => {
            if ((item.sentQuantity || 0) < item.quantity) {
                return {
                    ...item,
                    sentQuantity: item.quantity,
                    kitchenStatus: 'pending' as const,
                    sentTime: item.sentTime || currentTime
                };
            }
            return item;
        });

        setOrders(prev => ({ ...prev, [selectedRoomId]: updatedOrder }));
        syncOrder(selectedRoomId, updatedOrder);

        setIsNotifyingKitchen(false);
        message.success(`Đã gửi ${kitchenItems.length} món lên bếp!`);
        playTingSound();
    };

    const handleSplitOrder = () => {
        if (!selectedRoomId) return;
        const itemsToSplit = currentOrder.filter(item => splitQuantities[item.uniqueId] > 0);
        if (itemsToSplit.length === 0) {
            message.warning("Vui lòng chọn số lượng món để tách.");
            return;
        }

        let targetId = modalTargetRoomId ? String(modalTargetRoomId) : null;
        if (modalTargetTableType === "new") {
            targetId = `temp-${Date.now()}`;
        }

        if (!targetId) {
            message.warning("Vui lòng chọn bàn đích.");
            return;
        }

        if (targetId === selectedRoomId) {
            message.warning("Bàn đích không được trùng với bàn hiện tại.");
            return;
        }

        const sourceItems = [...(orders[selectedRoomId] || [])];
        const targetItems = [...(orders[targetId] || [])];

        itemsToSplit.forEach(splitItem => {
            const qtyToMove = splitQuantities[splitItem.uniqueId];
            const originalItemIndex = sourceItems.findIndex(i => i.uniqueId === splitItem.uniqueId);

            if (originalItemIndex !== -1) {
                const originalItem = sourceItems[originalItemIndex];

                // Giảm từ bàn nguồn
                if (originalItem.quantity === qtyToMove) {
                    sourceItems.splice(originalItemIndex, 1);
                } else {
                    sourceItems[originalItemIndex] = { ...originalItem, quantity: originalItem.quantity - qtyToMove };
                }

                // Thêm vào bàn đích
                const existingTargetIdx = targetItems.findIndex(i => i.product.id === splitItem.product.id);
                if (existingTargetIdx !== -1) {
                    targetItems[existingTargetIdx] = {
                        ...targetItems[existingTargetIdx],
                        quantity: targetItems[existingTargetIdx].quantity + qtyToMove
                    };
                } else {
                    targetItems.push({
                        ...splitItem,
                        uniqueId: `${splitItem.product.id}-${Date.now()}-${Math.random()}`,
                        quantity: qtyToMove
                    });
                }
            }
        });

        // Cập nhật state orders
        setOrders(prev => ({
            ...prev,
            [selectedRoomId]: sourceItems,
            [targetId!]: targetItems
        }));

        // Cập nhật thời gian bắt đầu cho bàn đích nếu chưa có
        if (!orderStartTimes[targetId!]) {
            setOrderStartTimes(prev => ({ ...prev, [targetId!]: new Date() }));
        }

        // Cập nhật trạng thái bàn và danh sách tab đang mở
        if (modalTargetTableType === "new") {
            setOpenRoomIds(prev => [...prev, targetId!]);
        } else {
            // Nếu bàn đích là bàn thật, cập nhật trạng thái thành 'occupied'
            setRooms(prev => prev.map(room =>
                room.id === targetId ? { ...room, status: 'occupied' as RoomStatus } : room
            ));
            if (!targetId.startsWith('temp-')) {
                broadcastTableStatus(targetId, 'in_use');
            }
            // Mở tab cho bàn đích nếu chưa mở
            if (!openRoomIds.includes(targetId)) {
                setOpenRoomIds(prev => [...prev, targetId]);
            }
        }

        // Đồng bộ qua Socket
        if (!selectedRoomId.startsWith('temp-')) {
            syncOrder(selectedRoomId, sourceItems);
        }
        if (!targetId.startsWith('temp-')) {
            syncOrder(targetId, targetItems);
        }

        // Nếu bàn nguồn hết món, giải phóng bàn (tùy chọn - ở đây tôi giữ nguyên để user tự xử lý hoặc checkout)
        if (sourceItems.length === 0) {
            // Có thể thêm logic tự động giải phóng bàn ở đây nếu muốn
        }

        setIsTableActionModalOpen(false);
        setSplitQuantities({});
        setSelectedRoomId(targetId);
        playTingSound();
        message.success("Đã tách đơn thành công.");
    };



    const syncOrderTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleAddProduct = (product: Product) => {
        if (!selectedRoomId) {
            message.warning("Vui lòng chọn phòng/bàn trước khi thêm món.");
            return;
        }

        let updatedItems: OrderItem[] = [];
        setOrders((prev) => {
            const items = prev[selectedRoomId] ? [...prev[selectedRoomId]] : [];
            const existing = items.find((item) => item.product.id === product.id);
            if (existing) {
                existing.quantity += 1;
            } else {
                items.push({
                    uniqueId: `${product.id}-${Date.now()}`,
                    product,
                    quantity: 1
                });
            }
            updatedItems = items;
            return { ...prev, [selectedRoomId]: items };
        });

        // Set start time if it's the first item
        if (!orderStartTimes[selectedRoomId]) {
            setOrderStartTimes(prev => ({
                ...prev,
                [selectedRoomId]: new Date()
            }));
        }

        // Socket: broadcast thêm món cho nhân viên khác cùng bàn
        if (!selectedRoomId.startsWith('temp-')) {
            syncOrder(selectedRoomId, updatedItems);
        }

        message.success(`Đã thêm ${product.name}`);
    };

    const handleReturnItems = (returnItems: Record<string, number>) => {
        if (!selectedRoomId) return;

        setOrders(prev => {
            const next = { ...prev };
            const currentItems = [...(next[selectedRoomId] || [])];

            const updatedItems = currentItems.map(item => {
                const returnQty = returnItems[item.uniqueId] || 0;
                if (returnQty > 0) {
                    return { ...item, quantity: Math.max(0, item.quantity - returnQty) };
                }
                return item;
            }).filter(item => item.quantity > 0);

            next[selectedRoomId] = updatedItems;

            // If no items left, free the room
            if (updatedItems.length === 0) {
                setRooms(prevRooms => prevRooms.map(room =>
                    room.id === selectedRoomId ? { ...room, status: 'available' as RoomStatus, price: undefined, time: undefined, customers: undefined } : room
                ));
                setOpenRoomIds(prevOpen => prevOpen.filter(id => id !== selectedRoomId));
                setSelectedRoomId(null);
            }

            return next;
        });

        message.success("Đã hoàn trả món thành công.");
    };

    const handleSelectProduct = (value: string | number) => {
        const selectedOption = options.find((item) => item.value === value);
        const selectedProduct = selectedOption?.data;

        if (selectedProduct) {
            handleAddProduct({
                id: selectedProduct.product_id,
                name: selectedProduct.product_name,
                price: Number(selectedProduct.selling_price),
                category_id: selectedProduct.category_id,
                category_name: selectedProduct.category_name,
            });
        }
    };

    const handleSelectCustomer = (value: string | number) => {
        const selectedOption = customerOptions.find((item) => item.value === value);
        setSelectedCustomer(selectedOption?.data || null);
    };

    const totalAmount = currentOrder.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
    );

    const updateOrderItem = (uniqueId: string, field: "quantity" | "price", value: number) => {
        if (!selectedRoomId) return;

        // Nếu giảm số lượng và món đã báo bếp -> Hiện modal xác nhận
        const currentItem = currentOrder.find(i => i.uniqueId === uniqueId);
        const sentQty = currentItem?.sentQuantity || 0;

        if (field === "quantity" && currentItem && value < sentQty) {
            setCancelItem(currentItem);
            setCancelQty(sentQty - value);
            setCancelReason("Khác");
            setCancelOtherReason("");
            setOnCancelConfirm({
                fn: (qty, reason) => {
                    const finalValue = sentQty - qty;
                    executeOrderUpdate(uniqueId, "quantity", finalValue);
                    // Cập nhật lại sentQuantity vì đã xác nhận hủy
                    setOrders(prev => {
                        const items = prev[selectedRoomId!] ? [...prev[selectedRoomId!]] : [];
                        const updated = items.map(i => i.uniqueId === uniqueId ? { ...i, sentQuantity: finalValue } : i);
                        syncOrder(selectedRoomId!, updated);
                        return { ...prev, [selectedRoomId!]: updated };
                    });
                    message.success(`Đã hủy ${qty} ${currentItem.product.name}. Lý do: ${reason}`);
                }
            });
            setIsCancelModalOpen(true);
            return;
        }

        executeOrderUpdate(uniqueId, field, value);
    };

    const executeOrderUpdate = (uniqueId: string, field: "quantity" | "price", value: number) => {
        if (!selectedRoomId) return;
        let updatedItems: OrderItem[] = [];
        setOrders((prev) => {
            const items = prev[selectedRoomId] ? [...prev[selectedRoomId]] : [];
            updatedItems = items.map((item) => {
                if (item.uniqueId === uniqueId) {
                    if (field === "quantity") {
                        return { ...item, quantity: value };
                    } else if (field === "price") {
                        return { ...item, product: { ...item.product, price: value } };
                    }
                }
                return item;
            });
            return { ...prev, [selectedRoomId]: updatedItems };
        });

        // Socket: debounce 600ms để tránh spam khi gõ nhanh
        if (!selectedRoomId.startsWith('temp-')) {
            if (syncOrderTimerRef.current) clearTimeout(syncOrderTimerRef.current);
            syncOrderTimerRef.current = setTimeout(() => {
                syncOrder(selectedRoomId, updatedItems);
            }, 600);
        }
    };

    const removeOrderItem = (uniqueId: string) => {
        if (!selectedRoomId) return;

        // Nếu xóa món và món đã báo bếp -> Hiện modal xác nhận
        const currentItem = currentOrder.find(i => i.uniqueId === uniqueId);
        const sentQty = currentItem?.sentQuantity || 0;

        if (currentItem && sentQty > 0) {
            setCancelItem(currentItem);
            setCancelQty(sentQty);
            setCancelReason("Khác");
            setCancelOtherReason("");
            setOnCancelConfirm({
                fn: (qty, reason) => {
                    executeOrderRemove(uniqueId);
                    message.success(`Đã hủy toàn bộ ${currentItem.product.name}. Lý do: ${reason}`);
                }
            });
            setIsCancelModalOpen(true);
            return;
        }

        executeOrderRemove(uniqueId);
    };

    const executeOrderRemove = (uniqueId: string) => {
        if (!selectedRoomId) return;
        let filteredItems: OrderItem[] = [];
        setOrders((prev) => {
            const items = prev[selectedRoomId] ? [...prev[selectedRoomId]] : [];
            filteredItems = items.filter((item) => item.uniqueId !== uniqueId);
            return { ...prev, [selectedRoomId]: filteredItems };
        });

        // Socket: broadcast xóa món cho nhân viên khác cùng bàn
        if (!selectedRoomId.startsWith('temp-')) {
            syncOrder(selectedRoomId, filteredItems);
        }
    };

    const splitOrderItem = (uniqueId: string) => {
        if (!selectedRoomId) return;

        setOrders((prev) => {
            const items = prev[selectedRoomId] ? [...prev[selectedRoomId]] : [];
            const index = items.findIndex(item => item.uniqueId === uniqueId);
            if (index !== -1 && items[index].quantity > 1) {
                const item = items[index];
                const newItems = [...items];

                // Giảm số lượng dòng cũ
                const newQuantity = item.quantity - 1;
                const newSentQuantity = item.sentQuantity ? Math.min(item.sentQuantity, newQuantity) : undefined;
                newItems[index] = {
                    ...item,
                    quantity: newQuantity,
                    sentQuantity: newSentQuantity
                };

                // Thêm dòng mới, kế thừa trạng thái bếp nếu cần
                const inheritedSentQuantity = item.sentQuantity && item.sentQuantity > newQuantity ? 1 : undefined;
                newItems.splice(index + 1, 0, {
                    uniqueId: `${item.product.id}-${Date.now()}-${Math.random()}`,
                    product: { ...item.product },
                    quantity: 1,
                    sentQuantity: inheritedSentQuantity,
                    kitchenStatus: inheritedSentQuantity ? item.kitchenStatus : undefined
                });

                // Sync qua socket
                if (!selectedRoomId.startsWith('temp-')) {
                    syncOrder(selectedRoomId, newItems);
                }

                return { ...prev, [selectedRoomId]: newItems };
            }
            return prev;
        });
    };

    const rightPanelContent = (
        <div style={{ flex: isMobile ? "auto" : "1 1 45%", minWidth: isMobile ? "100%" : 500, maxWidth: isMobile ? "100%" : 700, display: "flex", flexDirection: "column", background: "#fff", overflow: "hidden", height: isMobile ? "100%" : 'auto' }}>
            {/* Header Utilities */}
            <div style={{ padding: "12px 16px 0 16px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ width: isMobile ? 220 : 480, overflow: "hidden" }}>
                    <Tabs
                        type="editable-card"
                        activeKey={selectedRoomId || undefined}
                        onChange={(key) => {
                            if (key === "add_tab") {
                                handleAddOrder();
                            } else {
                                setSelectedRoomId(key);
                            }
                        }}
                        onEdit={(targetKey, action) => {
                            if (action === "remove") {
                                handleRemoveOrder(targetKey as string);
                            }
                        }}
                        className="fnb-order-tabs"
                        items={tabItems}
                        hideAdd
                    />
                </div>
                <Space size="middle" style={{ marginLeft: "auto", paddingBottom: 8 }}>
                    <Badge dot><BellOutlined style={{ fontSize: 18 }} /></Badge>
                    <ReloadOutlined
                        style={{ fontSize: 18, cursor: 'pointer' }}
                        onClick={() => window.location.reload()}
                    />
                    <Space>
                        <Text strong>{staffName}</Text>
                        <MenuOutlined
                            style={{ fontSize: 18, cursor: 'pointer' }}
                            onClick={() => setIsSettingsDrawerOpen(true)}
                        />
                    </Space>
                </Space>
            </div>

            {/* Selected Table Sub-header */}
            <div style={{ padding: "12px 16px", background: "#fff", display: "flex", alignItems: "center", gap: 12, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                <Space style={{ color: COLORS.primary, flex: 1, minWidth: isMobile ? "100%" : "auto" }}>
                    <TableOutlined style={{ fontSize: 20 }} />
                    <Select
                        placeholder="Chọn bàn"
                        variant="borderless"
                        value={selectedRoomId?.startsWith("temp-") ? undefined : selectedRoomId}
                        onChange={(val) => handleAssignRoom(val)}
                        suffixIcon={null}
                        dropdownStyle={{ minWidth: 200 }}
                        style={{ padding: 0 }}
                        className="fnb-room-assign-select"
                    >
                        {rooms.map(room => (
                            <Select.Option key={room.id} value={room.id}>
                                <Badge status={room.status === "available" ? "success" : "processing"} />
                                <Text style={{ marginLeft: 8 }}>{room.label} {room.floor && `(Tầng ${room.floor})`}</Text>
                            </Select.Option>
                        ))}
                    </Select>
                </Space>
                <SelectWithButton
                    options={customerOptions}
                    placeholder="Tìm khách hàng (F4)"
                    onSearch={setCustomerSearchTerm}
                    onSelect={handleSelectCustomer}
                    onPopupScroll={handleCustomerScroll}
                    onAddClick={() => setCustomerModal({ open: true, type: ActionType.CREATE, customer: null })}
                    value={selectedCustomer?.customer_id}
                    style={{ width: isMobile ? "100%" : 350 }}
                    styleWrapSelect={{
                        border: "none",
                        background: "#f5f5f5",
                        borderRadius: 20,
                        padding: "0 8px",
                    }}
                    className="fnb-customer-select"
                />
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", background: "#fff", overflowY: "auto" }}>
                <OrderItemsTable
                    currentOrder={currentOrder}
                    updateOrderItem={updateOrderItem}
                    splitOrderItem={splitOrderItem}
                    removeOrderItem={removeOrderItem}
                />
            </div>

            {/* Bottom Actions */}
            <div style={{ padding: 16, borderTop: "1px solid #f0f0f0" }}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
                    <Space size={16}>
                        <Space size={12}>
                            <Avatar size={32} icon={<UserOutlined />} style={{ background: '#e6f7ff', color: '#1890ff' }} />
                            <Text strong style={{ fontSize: 13 }}>admin</Text>
                        </Space>
                        <Space size={16}>
                            <EditOutlined
                                style={{ fontSize: 18, cursor: 'pointer', color: orderNotes[selectedRoomId || ''] ? COLORS.primary : 'inherit' }}
                                onClick={() => setIsNoteModalOpen(true)}
                                title="Ghi chú đơn hàng"
                            />
                            <HistoryOutlined
                                style={{ fontSize: 18, cursor: 'pointer' }}
                                onClick={() => setIsHistoryDrawerOpen(true)}
                                title="Lịch sử báo bếp"
                            />
                            <RollbackOutlined
                                style={{ fontSize: 18, cursor: 'pointer' }}
                                title="Trả món"
                                onClick={() => {
                                    if (!selectedRoomId || !currentOrder.length) {
                                        message.warning("Bàn hiện tại không có món để trả.");
                                        return;
                                    }
                                    setIsReturnModalOpen(true);
                                }}
                            />
                            <Space size={8}>
                                <Button
                                    type="text"
                                    icon={<MergeCellsOutlined style={{ color: COLORS.primary }} />}
                                    onClick={() => setIsTableActionModalOpen(true)}
                                    size="small"
                                    title="Tách ghép bàn"
                                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                                >
                                    <span style={{ fontWeight: 500 }}>Tách ghép</span>
                                </Button>
                            </Space>
                        </Space>
                    </Space>
                    <div style={{ marginLeft: "auto", textAlign: "right" }}>
                        <Text type="secondary">Tổng tiền: </Text>
                        <Badge count={currentOrder.length} offset={[10, 0]} color={COLORS.primary}>
                            <Text strong style={{ fontSize: 20 }}>{totalAmount.toLocaleString()} đ</Text>
                        </Badge>
                    </div>
                </div>

                <Row gutter={12}>
                    <Col span={10}>
                        <div style={{ width: '100%' }}>
                            <Badge
                                dot={hasKitchenChanges}
                                offset={[-4, 4]}
                                color="#f5222d"
                                title={hasKitchenChanges ? 'Có món chưa gửi bếp' : ''}
                                style={{ display: 'block' }}
                            >
                                <Button
                                    size="large"
                                    icon={<BellOutlined />}
                                    onClick={handleNotifyKitchen}
                                    loading={isNotifyingKitchen}
                                    disabled={!selectedRoomId || currentOrder.length === 0 || !hasKitchenChanges}
                                    style={{
                                        width: "100%",
                                        height: 50,
                                        borderRadius: 8,
                                        borderColor: hasKitchenChanges ? '#f5222d' : '#d9d9d9',
                                        color: hasKitchenChanges ? '#f5222d' : undefined,
                                        fontWeight: hasKitchenChanges ? 600 : undefined,
                                        transition: 'all 0.3s',
                                    }}
                                >
                                    Thông báo
                                </Button>
                            </Badge>
                        </div>
                    </Col>
                    <Col span={14}>
                        <Button
                            type="primary"
                            size="large"
                            icon={<ShoppingOutlined />}
                            onClick={handlePayment}
                            style={{ width: "100%", height: 50, borderRadius: 8, background: COLORS.primary, borderColor: COLORS.primary }}
                        >
                            Yêu cầu thanh toán
                        </Button>
                    </Col>
                </Row>
            </div>
        </div>
    );

    const kitchenHistoryData = useMemo(() => {
        return currentOrder
            .filter(item => (item.sentQuantity || 0) > 0)
            .map(item => ({
                id: item.uniqueId,
                time: item.sentTime || '---',
                productName: item.product.name,
                quantity: item.sentQuantity || 0,
                status: (item.kitchenStatus === 'done' ? 'finished' : 'pending') as 'pending' | 'cooking' | 'finished'
            }));
    }, [currentOrder]);

    return (
        <div style={{ display: "flex", height: "100vh", background: "#f0f2f5", overflow: "hidden" }}>
            {/* Left Panel - Table Selection */}
            <div style={{ flex: isMobile ? "1 1 100%" : "1 1 55%", display: "flex", flexDirection: "column", background: "#fff", borderRight: "1px solid #d9d9d9" }}>
                {/* Top Navigation */}
                <div style={{ padding: "8px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.primary }}>
                    <Space size={0}>
                        <Button
                            type="text"
                            icon={<TableOutlined />}
                            onClick={() => setActiveTab("rooms")}
                            style={{
                                color: "#fff",
                                height: 48,
                                borderBottom: activeTab === "rooms" ? "3px solid #fff" : "none",
                                borderRadius: 0,
                                opacity: activeTab === "rooms" ? 1 : 0.7
                            }}
                        >
                            Phòng bàn
                        </Button>
                        <Button
                            type="text"
                            icon={<MenuOutlined />}
                            onClick={() => setActiveTab("menu")}
                            style={{
                                color: "#fff",
                                height: 48,
                                borderBottom: activeTab === "menu" ? "3px solid #fff" : "none",
                                borderRadius: 0,
                                opacity: activeTab === "menu" ? 1 : 0.7
                            }}
                        >
                            Thực đơn
                        </Button>
                    </Space>
                    <Space>
                        <SelectWithButton
                            options={options}
                            placeholder="Tìm món (F3)"
                            onSearch={setSearchTerm}
                            onSelect={handleSelectProduct}
                            onPopupScroll={handleScroll}
                            onAddClick={() => setModal({ open: true, type: ActionType.CREATE, product: null })}
                            style={{ width: 300 }}
                            styleWrapSelect={{
                                border: "none",
                                background: "rgba(255, 255, 255, 0.15)",
                                borderRadius: 20,
                                padding: "0 8px",
                            }}
                            className="fnb-search-select"
                        />
                        <Button
                            icon={<PlusOutlined />}
                            shape="circle"
                            ghost
                            onClick={() => setRoomModal({ open: true, type: ActionType.CREATE, room: null })}
                        />
                        <Button
                            icon={<EditOutlined />}
                            shape="circle"
                            ghost
                            disabled={!selectedRoomId || selectedRoomId.startsWith('temp-')}
                            onClick={() => {
                                if (selectedRoomId && selectedRoom) {
                                    setRoomModal({
                                        open: true,
                                        type: ActionType.UPDATE,
                                        room: selectedRoom
                                    });
                                }
                            }}
                        />
                    </Space>
                </div>

                {/* Floor & Controls (Rooms Tab) */}
                <div style={{ padding: "8px 16px", background: "#fff", display: activeTab === "rooms" ? "block" : "none" }}>
                    <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
                        <Col>
                            <Space>
                                <Button
                                    size="small"
                                    type={activeFloor === "all" ? "primary" : "default"}
                                    shape="round"
                                    onClick={() => setActiveFloor("all")}
                                >
                                    Tất cả
                                </Button>
                                {areas.map(area => (
                                    <Button
                                        key={area.area_id}
                                        size="small"
                                        type={activeFloor === String(area.area_id) ? "primary" : "default"}
                                        shape="round"
                                        onClick={() => setActiveFloor(String(area.area_id))}
                                    >
                                        {area.area_name}
                                    </Button>
                                ))}
                            </Space>
                        </Col>
                        <Col>
                            <Space>
                                {viewDensity === "normal" ? (
                                    <AppstoreOutlined
                                        style={{
                                            fontSize: 18,
                                            cursor: "pointer",
                                        }}
                                        onClick={() => setViewDensity("compact")}
                                    />
                                ) : (
                                    <GroupOutlined
                                        style={{
                                            fontSize: 18,
                                            cursor: "pointer",
                                            color: COLORS.primary
                                        }}
                                        onClick={() => setViewDensity("normal")}
                                    />
                                )}
                                <SearchOutlined style={{ fontSize: 18, cursor: "pointer" }} />
                            </Space>
                        </Col>
                    </Row>

                    <Radio.Group
                        value={roomStatusFilter}
                        onChange={(e) => setRoomStatusFilter(e.target.value)}
                        className="table-actions-radio"
                    >
                        <Radio value="all">
                            <Text>Tất cả ({counts.total})</Text>
                        </Radio>
                        <Radio value="in-use">
                            <Text>Sử dụng ({counts.inUse})</Text>
                        </Radio>
                        <Radio value="available">
                            <Text>Còn trống ({counts.available})</Text>
                        </Radio>
                    </Radio.Group>
                </div>

                {/* Category Filters (Menu Tab) */}
                <div style={{ padding: "8px 16px", background: "#fff", display: activeTab === "menu" ? "block" : "none", borderBottom: "1px solid #f0f0f0" }}>
                    <div style={{ overflowX: "auto", whiteSpace: "nowrap", paddingBottom: 4 }}>
                        <Space size={8}>
                            <Button
                                size="small"
                                type={selectedCategoryId === null ? "primary" : "text"}
                                style={{
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    padding: "0 16px",
                                    height: 32,
                                    borderRadius: 16,
                                    background: selectedCategoryId === null ? COLORS.primary : "transparent",
                                    color: selectedCategoryId === null ? "#fff" : "#555"
                                }}
                                onClick={() => {
                                    setSelectedCategoryId(null);
                                    setCurrentPage(1);
                                }}
                            >
                                Tất cả
                            </Button>
                            {categories.map((cat) => (
                                <Button
                                    key={cat.category_id}
                                    size="small"
                                    type={selectedCategoryId === cat.category_id ? "primary" : "text"}
                                    style={{
                                        fontWeight: 600,
                                        textTransform: "uppercase",
                                        padding: "0 16px",
                                        height: 32,
                                        borderRadius: 16,
                                        background: selectedCategoryId === cat.category_id ? COLORS.primary : "transparent",
                                        color: selectedCategoryId === cat.category_id ? "#fff" : "#555"
                                    }}
                                    onClick={() => {
                                        setSelectedCategoryId(cat.category_id);
                                        setCurrentPage(1);
                                    }}
                                >
                                    {cat.category_name}
                                </Button>
                            ))}
                        </Space>
                    </div>
                </div>

                {/* Table Grid / Menu Grid */}
                <div style={{ flex: 1, padding: 16, overflowY: "auto", position: "relative" }}>
                    {isLoadingProducts && activeTab === "menu" && (
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.5)", zIndex: 10 }}>
                            <Spin size="large" />
                        </div>
                    )}
                    {activeTab === "rooms" ? (
                        <RoomGrid
                            viewDensity={viewDensity}
                            displayedRooms={displayedRooms}
                            selectedRoomId={selectedRoomId}
                            orders={orders}
                            orderStartTimes={orderStartTimes}
                            currentTime={currentTime}
                            handleRoomClick={handleRoomClick}
                        />
                    ) : (
                        <MenuGrid
                            products={products}
                            handleAddProduct={handleAddProduct}
                        />
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: "8px 16px", borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Checkbox
                        checked={autoOpenMenu}
                        onChange={(e) => setAutoOpenMenu(e.target.checked)}
                    >
                        <Text style={{ fontSize: 12 }}>Mở thực đơn khi chọn bàn</Text>
                    </Checkbox>
                    <Pagination
                        size="small"
                        current={currentPage}
                        total={activeTab === "menu" ? totalProducts : 49}
                        pageSize={PAGE_SIZE}
                        showSizeChanger={false}
                        onChange={(page) => setCurrentPage(page)}
                        style={{ display: activeTab === "menu" ? "block" : "none" }}
                    />
                    {activeTab === "rooms" && <Pagination size="small" total={49} pageSize={24} showSizeChanger={false} />}
                </div>
            </div>

            {isMobile ? (
                <Drawer
                    title="Đơn hàng"
                    placement="right"
                    width="100%"
                    closable={true}
                    onClose={() => setMobileDrawerOpen(false)}
                    open={mobileDrawerOpen}
                    styles={{ body: { padding: 0 } }}
                >
                    {rightPanelContent}
                </Drawer>
            ) : (
                rightPanelContent
            )}

            {isMobile && !mobileDrawerOpen && (
                <Button
                    type="primary"
                    shape="circle"
                    icon={<ShoppingCartOutlined style={{ fontSize: 24 }} />}
                    size="large"
                    onClick={() => setMobileDrawerOpen(true)}
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        height: 64,
                        width: 64,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 999
                    }}
                >
                </Button>
            )}

            <ProductModal />
            <CustomerModal />
            <RoomModal onSuccess={fetchAreasAndTables} />
            <PaymentDrawer
                open={isPaymentDrawerOpen}
                onClose={() => setIsPaymentDrawerOpen(false)}
                onConfirm={confirmPayment}
                roomLabel={selectedRoom?.label || "Đơn mới"}
                floor={selectedRoom?.floor}
                items={currentOrder}
                totalAmount={totalAmount}
                customerName={selectedCustomer?.customer_name}
                loading={isCheckoutLoading}
            />

            <TableActionModal
                open={isTableActionModalOpen}
                onCancel={() => {
                    setIsTableActionModalOpen(false);
                    setModalTargetRoomId(null);
                    setSplitQuantities({});
                }}
                selectedRoom={selectedRoom}
                rooms={rooms}
                orders={orders}
                modalMode={modalMode}
                setModalMode={setModalMode}
                modalTargetRoomId={modalTargetRoomId}
                setModalTargetRoomId={setModalTargetRoomId}
                splitQuantities={splitQuantities}
                setSplitQuantities={setSplitQuantities}
                handleMergeRooms={handleMergeRooms}
                handleSplitOrder={handleSplitOrder}
                targetOrderSummary={targetOrderSummary}
                currentOrder={currentOrder}
                setModalTargetTableType={setModalTargetTableType}
            />

            <OrderNoteModal
                open={isNoteModalOpen}
                note={selectedRoomId ? (orderNotes[selectedRoomId] || "") : ""}
                onSave={(note) => {
                    if (selectedRoomId) {
                        setOrderNotes(prev => ({ ...prev, [selectedRoomId]: note }));
                        setIsNoteModalOpen(false);
                        message.success("Đã lưu ghi chú đơn hàng");
                    }
                }}
                onCancel={() => setIsNoteModalOpen(false)}
            />

            <KitchenHistoryDrawer
                open={isHistoryDrawerOpen}
                onClose={() => setIsHistoryDrawerOpen(false)}
                historyData={kitchenHistoryData}
            />

            <SettingsDrawer
                open={isSettingsDrawerOpen}
                onClose={() => setIsSettingsDrawerOpen(false)}
            />

            <ReturnProductModal
                open={isReturnModalOpen}
                onClose={() => setIsReturnModalOpen(false)}
                room={rooms.find(r => r.id === selectedRoomId) || null}
                orderItems={currentOrder}
                onReturn={handleReturnItems}
            />

            {/* Modal xác nhận giảm/hủy món */}
            <Modal
                title={<Title level={4} style={{ margin: 0 }}>Xác nhận giảm / Hủy món</Title>}
                open={isCancelModalOpen}
                onCancel={() => setIsCancelModalOpen(false)}
                footer={[
                    <Button
                        key="back"
                        size="large"
                        shape="round"
                        icon={<CloseOutlined />}
                        onClick={() => setIsCancelModalOpen(false)}
                        style={{ minWidth: 120 }}
                    >
                        Bỏ qua
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        danger
                        size="large"
                        shape="round"
                        icon={<PlusOutlined rotate={45} />} // X icon
                        onClick={() => {
                            onCancelConfirm?.fn(cancelQty, cancelReason === "Khác" ? cancelOtherReason : cancelReason);
                            setIsCancelModalOpen(false);
                        }}
                        style={{ minWidth: 120, background: '#f5222d' }}
                    >
                        Chắc chắn
                    </Button>
                ]}
                width={500}
                centered
                styles={{
                    mask: { backdropFilter: 'blur(4px)' }
                }}
            >
                <div style={{ padding: '10px 0' }}>
                    <Text style={{ fontSize: 16 }}>
                        Bạn có chắc chắn muốn hủy món <Text strong>{cancelItem?.product.name}</Text> không?
                    </Text>

                    <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text strong style={{ fontSize: 15 }}>Số lượng hủy</Text>
                        <Space size={16}>
                            <Button
                                shape="circle"
                                icon={<MinusOutlined />}
                                disabled={cancelQty <= 1}
                                onClick={() => setCancelQty(prev => prev - 1)}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Title level={3} style={{ margin: 0, minWidth: 20, textAlign: 'center' }}>{cancelQty}</Title>
                                <Text type="secondary" style={{ fontSize: 18 }}>/ {cancelItem?.quantity}</Text>
                            </div>
                            <Button
                                shape="circle"
                                icon={<PlusOutlined />}
                                disabled={cancelQty >= (cancelItem?.quantity || 1)}
                                onClick={() => setCancelQty(prev => prev + 1)}
                            />
                        </Space>
                    </div>

                    <div style={{ marginTop: 24 }}>
                        <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>Lý do hủy</Text>
                        <Select
                            style={{ width: '100%' }}
                            size="large"
                            value={cancelReason}
                            onChange={setCancelReason}
                            options={[
                                { value: 'Khách đổi món', label: 'Khách đổi món' },
                                { value: 'Nhập nhầm', label: 'Nhập nhầm' },
                                { value: 'Hết hàng', label: 'Hết hàng' },
                                { value: 'Khác', label: 'Khác' },
                            ]}
                        />

                        {cancelReason === "Khác" && (
                            <Input
                                style={{ marginTop: 12 }}
                                placeholder="Nhập lý do khác..."
                                value={cancelOtherReason}
                                onChange={e => setCancelOtherReason(e.target.value)}
                                prefix={<EditOutlined style={{ color: '#bfbfbf' }} />}
                            />
                        )}
                    </div>
                </div>
            </Modal>

            <style dangerouslySetInnerHTML={{
                __html: `
                .fnb-search-select .ant-select-selector {
                    color: white !important;
                }
                .fnb-search-select .ant-select-selection-placeholder {
                    color: rgba(255, 255, 255, 0.7) !important;
                }
                .fnb-search-select .ant-select-arrow {
                    color: white !important;
                }
                .fnb-search-select .ant-select-clear {
                    background: transparent !important;
                    color: white !important;
                }
                .fnb-order-tabs .ant-tabs-nav {
                    margin-bottom: 0 !important;
                }
                .fnb-order-tabs .ant-tabs-nav::before {
                    border-bottom: none !important;
                }
                .fnb-order-tabs .ant-tabs-tab {
                    padding: 6px 14px !important;
                    height: 34px !important;
                    background: transparent !important;
                    border: none !important;
                    border-radius: 6px 6px 0 0 !important;
                    margin: 0 4px !important;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    opacity: 0.6;
                }
                .fnb-order-tabs .ant-tabs-tab:hover {
                    background: rgba(0, 0, 0, 0.04) !important;
                    opacity: 0.8;
                }
                .fnb-order-tabs .ant-tabs-tab-active {
                    background: #fff !important;
                    opacity: 1;
                    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1) !important;
                    height: 38px !important;
                    margin-top: -4px !important;
                }
                .fnb-order-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
                    color: #111827 !important;
                    font-weight: 600;
                    font-size: 13px;
                }
                .fnb-order-tabs .ant-tabs-tab-btn {
                    color: #4b5563 !important;
                    font-size: 13px;
                }
                .fnb-order-tabs .ant-tabs-tab-remove {
                    margin-left: 8px !important;
                    margin-right: -4px !important;
                    font-size: 10px !important;
                    color: #9ca3af !important;
                    padding: 4px !important;
                    border-radius: 50%;
                    transition: all 0.2s;
                }
                .fnb-order-tabs .ant-tabs-tab-remove:hover {
                    background: rgba(0, 0, 0, 0.05) !important;
                    color: #ef4444 !important;
                }
                .fnb-order-tabs .ant-tabs-tab-active .ant-tabs-tab-remove {
                    color: #6b7280 !important;
                }
                .fnb-order-tabs .ant-tabs-ink-bar {
                    display: none;
                }
                .fnb-order-tabs .ant-tabs-nav-more {
                    padding: 0 10px !important;
                    height: 34px !important;
                    display: flex !important;
                    align-items: center !important;
                    background: transparent !important;
                    border-radius: 6px !important;
                    transition: background 0.2s;
                }
                .fnb-order-tabs .ant-tabs-nav-more:hover {
                    background: rgba(0, 0, 0, 0.04) !important;
                }
                .fnb-room-assign-select .ant-select-selection-item {
                    color: ${COLORS.primary} !important;
                    font-weight: 600 !important;
                    font-size: 16px !important;
                    padding-left: 0 !important;
                }
                .fnb-room-assign-select .ant-select-selection-placeholder {
                    color: ${COLORS.primary} !important;
                    opacity: 0.7;
                    font-weight: 600;
                    font-size: 16px;
                    padding-left: 0 !important;
                }
                .fnb-modal-target-select .ant-select-selector {
                    border-radius: 8px !important;
                    border-color: #d9d9d9 !important;
                }
                .fnb-modal-target-select .ant-select-selection-placeholder {
                    color: #bfbfbf !important;
                }
            `}} />
        </div>
    );
}
