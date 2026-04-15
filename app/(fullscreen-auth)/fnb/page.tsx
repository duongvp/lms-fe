"use client";
import React, { useMemo, useState, useEffect } from "react";
import {
    Button,
    Card,
    Col,
    Input,
    message,
    Row,
    Space,
    Table,
    Typography,
    Tabs,
    Badge,
    Checkbox,
    Pagination,
    Avatar,
    Divider,
    Tag,
    Radio,
    Form,
    InputNumber,
    Modal,
    Select,
} from "antd";
import {
    PlusOutlined,
    DeleteOutlined,
    ShoppingCartOutlined,
    SearchOutlined,
    ThunderboltOutlined,
    TableOutlined,
    AppstoreOutlined,
    BellOutlined,
    ReloadOutlined,
    PrinterOutlined,
    StarOutlined,
    UserOutlined,
    MenuOutlined,
    ShoppingOutlined,
    SwapOutlined,
    FieldTimeOutlined,
    EditOutlined,
    HistoryOutlined,
    CloseOutlined,
    GroupOutlined,
    ForkOutlined,
    MergeCellsOutlined,
    CheckSquareFilled,
    StopOutlined,
    MinusCircleOutlined,
    PlusCircleOutlined,
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
import { CategoryApiResponse, getCategories } from "@/services/categoryService";
import { getProductsByPage } from "@/services/productService";
import { Spin } from "antd";
import { useAuthStore } from "@/stores/authStore";

const { Text, Title } = Typography;

type RoomStatus = "available" | "occupied" | "reserved";

type Room = {
    id: string;
    label: string;
    status: RoomStatus;
    price?: number;
    time?: string;
    customers?: number;
    floor: string;
};

type Product = {
    id: number;
    name: string;
    price: number;
    category_id?: number;
    category_name?: string;
};

type OrderItem = {
    uniqueId: string;
    product: Product;
    quantity: number;
};

const initialRooms: Room[] = [
    ...Array.from({ length: 9 }, (_, i) => ({
        id: `r${i + 1}`,
        label: `Bàn ${i + 1}`,
        status: "available" as RoomStatus,
        floor: "1",
    })),
    {
        id: "r10",
        label: "Bàn 10",
        status: "occupied",
        price: 80000,
        time: "384g39p",
        customers: 3,
        floor: "1",
    },
    {
        id: "r11",
        label: "Bàn 11",
        status: "reserved",
        price: 943000,
        time: "33-1",
        customers: 1,
        floor: "2",
    },
    {
        id: "r12",
        label: "Bàn 12",
        status: "occupied",
        price: 100000,
        time: "4-1",
        customers: 1,
        floor: "2",
    },
    {
        id: "r13",
        label: "Bàn 13",
        status: "reserved",
        price: 247500,
        time: "9-1",
        customers: 1,
        floor: "2",
    },
    { id: "r14", label: "Bàn 14", status: "available", floor: "2" },
    {
        id: "r15",
        label: "Bàn 15",
        status: "occupied",
        price: 10000,
        time: "112g5p",
        customers: 1,
        floor: "2",
    },
    {
        id: "r16",
        label: "Bàn 16",
        status: "reserved",
        price: 3334000,
        time: "135-1",
        customers: 1,
        floor: "2",
    },
    {
        id: "r17",
        label: "Bàn 17",
        status: "occupied",
        price: 922500,
        time: "763g0p",
        customers: 1,
        floor: "2",
    },
    { id: "r18", label: "Bàn 18", status: "occupied", price: 405000, time: "8-1", floor: "2" },
    { id: "r19", label: "Bàn 19", status: "occupied", price: 220000, time: "10-1", floor: "2" },
    { id: "r20", label: "Phòng 3D - 01", status: "occupied", price: 80000, time: "642g37p", floor: "5" },
    { id: "r21", label: "Phòng 3D - 02", status: "available", floor: "5" },
    { id: "r22", label: "Phòng 3D VIP", status: "available", floor: "5" },
    { id: "r23", label: "Phòng 3D VIP 2", status: "occupied", floor: "5" },
    { id: "r24", label: "Bàn 21", status: "available", floor: "5" },
    { id: "r25", label: "Bàn 22", status: "available", floor: "5" },
    { id: "r26", label: "Bàn 23", status: "available", floor: "5" },
    { id: "r27", label: "Bàn 24", status: "occupied", price: 355000, time: "8-1", floor: "5" },
];

// Removed hardcoded productCatalog
const EMPTY_ARRAY: any[] = [];
const PAGE_SIZE = 24;

const COLORS = {
    primary: "#3467cc",
    occupied: "#e6f7ff",
    occupiedText: "#3467cc",
    occupiedBorder: "#91d5ff",
    reserved: "#fff7e6",
    reservedText: "#fa8c16",
    reservedBorder: "#ffd591",
    selected: "#3467cc",
    empty: "#ffffff",
    emptyBorder: "#d9d9d9",
};

export default function FnbSalesPage() {
    const [rooms, setRooms] = useState<Room[]>(initialRooms);
    const [roomStatusFilter, setRoomStatusFilter] = useState<RoomStatus | "all">("all");
    const [activeFloor, setActiveFloor] = useState("all");
    const [orders, setOrders] = useState<Record<string, OrderItem[]>>({});
    const [openRoomIds, setOpenRoomIds] = useState<string[]>(["r23"]); // Default open tab
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>("r23");
    const [activeTab, setActiveTab] = useState<"rooms" | "menu">("rooms");
    const [viewDensity, setViewDensity] = useState<"normal" | "compact">("normal");

    const { warehouseId } = useAuthStore((state) => state.user);

    const [searchTerm, setSearchTerm] = useState("");
    const { setModal } = useProductStore();
    const { options, handleScroll } = useProductSelect(searchTerm, false, true, EMPTY_ARRAY);

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

    const handleAddRoom = (room: Room) => {
        setRooms((prev) => [...prev, room]);
        message.success(`Đã thêm ${room.label}`);
    };

    const currentOrder = selectedRoomId ? orders[selectedRoomId] ?? [] : [];

    const handleRoomClick = (room: Room) => {
        setSelectedRoomId(room.id);
        if (!openRoomIds.includes(room.id)) {
            setOpenRoomIds((prev) => [...prev, room.id]);
        }
        if (autoOpenMenu) {
            setActiveTab("menu");
        }
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
                setOpenRoomIds((prev) => {
                    const next = prev.filter((item) => item !== id);
                    if (id === selectedRoomId) {
                        setSelectedRoomId(next.length > 0 ? next[next.length - 1] : null);
                    }
                    return next;
                });
                // Optional: clear order data if it's not saved
                // setOrders((prev) => {
                //     const next = { ...prev };
                //     delete next[id];
                //     return next;
                // });
            },
        });
    };
    const handleMergeRooms = () => {
        if (!selectedRoomId) return;
        if (roomsToMerge.length === 0) {
            message.warning("Vui lòng chọn bàn để ghép.");
            return;
        }

        setOrders((prev) => {
            const next = { ...prev };
            const targetItems = [...(next[selectedRoomId] || [])];

            roomsToMerge.forEach((id) => {
                const sourceItems = next[id] || [];
                sourceItems.forEach((sItem) => {
                    const existing = targetItems.find(tItem => tItem.product.id === sItem.product.id);
                    if (existing) {
                        existing.quantity += sItem.quantity;
                    } else {
                        targetItems.push({
                            ...sItem,
                            uniqueId: `${sItem.product.id}-${Date.now()}-${Math.random()}`
                        });
                    }
                });
                // Clear source items
                delete next[id];
            });

            return { ...next, [selectedRoomId]: targetItems };
        });

        // Close tabs of merged tables
        setOpenRoomIds((prev) => prev.filter(id => !roomsToMerge.includes(id)));

        setIsMergeModalOpen(false);
        setRoomsToMerge([]);
        message.success("Đã ghép bàn thành công.");
    };

    const handleSplitOrder = () => {
        if (!selectedRoomId) return;
        const itemsToSplit = currentOrder.filter(item => splitQuantities[item.uniqueId] > 0);
        if (itemsToSplit.length === 0) {
            message.warning("Vui lòng chọn số lượng món để tách.");
            return;
        }

        let targetId = modalTargetRoomId;
        if (modalTargetTableType === "new") {
            targetId = `temp-${Date.now()}`;
            setOpenRoomIds(prev => [...prev, targetId!]);
        }

        if (!targetId) {
            message.warning("Vui lòng chọn bàn đích.");
            return;
        }

        setOrders(prev => {
            const next = { ...prev };
            const currentItems = [...(next[selectedRoomId!] || [])];
            const targetItems = [...(next[targetId!] || [])];

            itemsToSplit.forEach(splitItem => {
                const qtyToMove = splitQuantities[splitItem.uniqueId];
                const originalItemIndex = currentItems.findIndex(i => i.uniqueId === splitItem.uniqueId);

                if (originalItemIndex !== -1) {
                    const originalItem = currentItems[originalItemIndex];
                    // Reduce from source
                    if (originalItem.quantity === qtyToMove) {
                        currentItems.splice(originalItemIndex, 1);
                    } else {
                        currentItems[originalItemIndex] = { ...originalItem, quantity: originalItem.quantity - qtyToMove };
                    }

                    // Add to target
                    const existingTarget = targetItems.find(i => i.product.id === splitItem.product.id);
                    if (existingTarget) {
                        existingTarget.quantity += qtyToMove;
                    } else {
                        targetItems.push({
                            ...splitItem,
                            uniqueId: `${splitItem.product.id}-${Date.now()}-${Math.random()}`,
                            quantity: qtyToMove
                        });
                    }
                }
            });

            next[selectedRoomId!] = currentItems;
            next[targetId!] = targetItems;
            return next;
        });

        setIsTableActionModalOpen(false);
        setSplitQuantities({});
        message.success("Đã tách đơn thành công.");
    };


    const handleAddProduct = (product: Product) => {
        if (!selectedRoomId) {
            message.warning("Vui lòng chọn phòng/bàn trước khi thêm món.");
            return;
        }

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
            return { ...prev, [selectedRoomId]: items };
        });
        message.success(`Đã thêm ${product.name}`);
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

        setOrders((prev) => {
            const items = prev[selectedRoomId] ? [...prev[selectedRoomId]] : [];
            const updatedItems = items.map((item) => {
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
    };

    const removeOrderItem = (uniqueId: string) => {
        if (!selectedRoomId) return;

        setOrders((prev) => {
            const items = prev[selectedRoomId] ? [...prev[selectedRoomId]] : [];
            const filteredItems = items.filter((item) => item.uniqueId !== uniqueId);
            return { ...prev, [selectedRoomId]: filteredItems };
        });
    };

    const splitOrderItem = (uniqueId: string) => {
        if (!selectedRoomId) return;

        setOrders((prev) => {
            const items = prev[selectedRoomId] ? [...prev[selectedRoomId]] : [];
            const index = items.findIndex(item => item.uniqueId === uniqueId);
            if (index !== -1 && items[index].quantity > 1) {
                const item = items[index];
                // Create a copy of the list to avoid mutations
                const newItems = [...items];
                // Reduce quantity of original
                newItems[index] = { ...item, quantity: item.quantity - 1 };
                // Add new row with quantity 1
                newItems.splice(index + 1, 0, {
                    uniqueId: `${item.product.id}-${Date.now()}-${Math.random()}`,
                    product: { ...item.product },
                    quantity: 1
                });
                return { ...prev, [selectedRoomId]: newItems };
            }
            return prev;
        });
    };

    return (
        <div style={{ display: "flex", height: "100vh", background: "#f0f2f5", overflow: "hidden" }}>
            {/* Left Panel - Table Selection */}
            <div style={{ flex: "1 1 60%", display: "flex", flexDirection: "column", background: "#fff", borderRight: "1px solid #d9d9d9" }}>
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
                        <Button icon={<ThunderboltOutlined />} shape="circle" ghost />
                        <Button
                            icon={<PlusOutlined />}
                            shape="circle"
                            ghost
                            onClick={() => setRoomModal({ open: true, type: ActionType.CREATE, room: null })}
                        />
                    </Space>
                </div>

                {/* Floor & Controls (Rooms Tab) */}
                <div style={{ padding: "8px 16px", background: "#fff", display: activeTab === "rooms" ? "block" : "none" }}>
                    <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
                        <Col>
                            <Space>
                                <Button size="small" type={activeFloor === "all" ? "primary" : "default"} shape="round" onClick={() => setActiveFloor("all")}>Tất cả</Button>
                                <Button size="small" type={activeFloor === "1" ? "primary" : "default"} shape="round" onClick={() => setActiveFloor("1")}>Tầng 1</Button>
                                <Button size="small" type={activeFloor === "2" ? "primary" : "default"} shape="round" onClick={() => setActiveFloor("2")}>Tầng 2</Button>
                                <Button size="small" type={activeFloor === "5" ? "primary" : "default"} shape="round" onClick={() => setActiveFloor("5")}>Tầng 5</Button>
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
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: viewDensity === "normal"
                                ? "repeat(auto-fill, minmax(130px, 1fr))"
                                : "repeat(auto-fill, minmax(85px, 1fr))",
                            gap: viewDensity === "normal" ? 16 : 8,
                            transition: "all 0.3s ease"
                        }}>
                            {/* Takeaway Card */}
                            <Card
                                hoverable
                                styles={{ body: { height: viewDensity === "normal" ? 120 : 80, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 8 } }}
                                style={{ borderRadius: 8, background: "#e6f7ff", border: `1px solid ${COLORS.occupiedBorder}` }}
                            >
                                <Badge count={<ShoppingCartOutlined style={{ color: '#fff', fontSize: viewDensity === "normal" ? 12 : 10 }} />}>
                                    <Avatar size={viewDensity === "normal" ? 64 : 40} icon={<ShoppingOutlined />} style={{ backgroundColor: "#cfe9ff", color: COLORS.primary }} />
                                </Badge>
                                <Text strong style={{ color: "#3467cc", marginTop: viewDensity === "normal" ? 8 : 4, fontSize: viewDensity === "normal" ? 14 : 11 }}>Mang về</Text>
                            </Card>

                            {displayedRooms.map((room) => {
                                const isSelected = selectedRoomId === room.id;
                                const isOccupied = room.status === "occupied";
                                const isReserved = room.status === "reserved";

                                let bg = COLORS.empty;
                                let border = `1px solid ${COLORS.emptyBorder}`;
                                let textColor = "inherit";

                                if (isSelected) {
                                    bg = COLORS.primary;
                                    border = `1px solid ${COLORS.primary}`;
                                    textColor = "#fff";
                                } else if (isOccupied) {
                                    bg = COLORS.occupied;
                                    border = `1px solid ${COLORS.occupiedBorder}`;
                                    textColor = COLORS.occupiedText;
                                } else if (isReserved) {
                                    bg = COLORS.reserved;
                                    border = `1px solid ${COLORS.reservedBorder}`;
                                    textColor = COLORS.reservedText;
                                }

                                return (
                                    <div key={room.id} style={{ textAlign: "center" }}>
                                        <Card
                                            hoverable
                                            onClick={() => handleRoomClick(room)}
                                            styles={{
                                                body: {
                                                    height: viewDensity === "normal" ? 100 : 70,
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    padding: 4,
                                                    position: "relative"
                                                }
                                            }}
                                            style={{
                                                borderRadius: 16,
                                                background: bg,
                                                border: border,
                                                transition: "all 0.3s",
                                                overflow: "hidden"
                                            }}
                                        >
                                            {/* Visual representation of a table top */}
                                            <div style={{
                                                width: "80%",
                                                height: "70%",
                                                border: `1.5px solid ${isSelected ? "#fff" : (isOccupied ? COLORS.occupiedBorder : (isReserved ? COLORS.reservedBorder : COLORS.emptyBorder))}`,
                                                borderRadius: 12,
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                justifyContent: "center"
                                            }}>
                                                {room.price && (
                                                    <Text style={{ fontSize: viewDensity === "normal" ? 11 : 9, color: isSelected ? "#fff" : textColor }}>
                                                        {room.price.toLocaleString()}
                                                        {room.time && <span style={{ marginLeft: 4 }}>{room.time}</span>}
                                                    </Text>
                                                )}
                                                {room.customers && (
                                                    <Text style={{ fontSize: viewDensity === "normal" ? 10 : 8, color: isSelected ? "#fff" : textColor }}>
                                                        {room.customers}
                                                    </Text>
                                                )}
                                            </div>
                                        </Card>
                                        <Text strong style={{ marginTop: 4, display: "block", fontSize: viewDensity === "normal" ? 12 : 10 }}>{room.label}</Text>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
                            {products.map((product) => (
                                <Card
                                    key={product.product_id}
                                    hoverable
                                    onClick={() => handleAddProduct({
                                        id: product.product_id,
                                        name: product.product_name,
                                        price: Number(product.selling_price),
                                        category_id: product.category_id,
                                        category_name: product.category_name,
                                    })}
                                    styles={{ body: { padding: 12 } }}
                                >
                                    <div style={{ height: 100, background: "#f5f5f5", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                                        <ShoppingOutlined style={{ fontSize: 32, opacity: 0.2 }} />
                                    </div>
                                    <Text strong style={{ display: "block" }}>{product.product_name}</Text>
                                    <Text type="danger">{Number(product.selling_price).toLocaleString()} đ</Text>
                                </Card>
                            ))}
                        </div>
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

            <div style={{ flex: "1 1 40%", minWidth: 450, maxWidth: 600, display: "flex", flexDirection: "column", background: "#fff", overflow: "hidden" }}>
                {/* Header Utilities */}
                <div style={{ padding: "12px 16px 0 16px", borderBottom: "1px solid #e5e7eb", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ width: 280, overflow: "hidden" }}>
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
                        <ReloadOutlined style={{ fontSize: 18 }} />
                        <PrinterOutlined style={{ fontSize: 18 }} />
                        <StarOutlined style={{ fontSize: 18, color: "#faad14" }} />
                        <Avatar size="small" src="https://flagcdn.com/w40/vn.png" />
                        <Space>
                            <Text strong>AsiaGolfVit</Text>
                            <MenuOutlined style={{ fontSize: 18 }} />
                        </Space>
                    </Space>
                </div>

                {/* Selected Table Sub-header */}
                <div style={{ padding: "12px 16px", background: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
                    <Space style={{ color: COLORS.primary, flex: 1 }}>
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
                        <Space size={8}>
                            <SwapOutlined style={{ opacity: 0.5 }} />
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
                    <SelectWithButton
                        options={customerOptions}
                        placeholder="Tìm khách hàng (F4)"
                        onSearch={setCustomerSearchTerm}
                        onSelect={handleSelectCustomer}
                        onPopupScroll={handleCustomerScroll}
                        onAddClick={() => setCustomerModal({ open: true, type: ActionType.CREATE, customer: null })}
                        value={selectedCustomer?.customer_id}
                        style={{ width: 320 }}
                        styleWrapSelect={{
                            border: "none",
                            background: "#f5f5f5",
                            borderRadius: 20,
                            padding: "0 8px",
                        }}
                        className="fnb-customer-select"
                    />
                </div>

                {/* Order Items List */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", background: "#fff", overflowY: "auto" }}>
                    {currentOrder.length === 0 ? (
                        <div style={{ textAlign: "center", opacity: 0.5, width: "100%", marginTop: 100 }}>
                            <ShoppingOutlined style={{ fontSize: 64, color: COLORS.primary, marginBottom: 16 }} />
                            <Title level={5}>Chưa có món trong đơn</Title>
                            <Text type="secondary">Vui lòng chọn món trong thực đơn bên trái màn hình</Text>
                        </div>
                    ) : (
                        <Table
                            dataSource={currentOrder}
                            columns={[
                                {
                                    title: "Tên món",
                                    dataIndex: ["product", "name"],
                                    key: "name",
                                    width: "30%",
                                    render: (name) => <Text strong style={{ fontSize: 13 }}>{name}</Text>
                                },
                                {
                                    title: "SL",
                                    dataIndex: "quantity",
                                    key: "qty",
                                    width: "15%",
                                    render: (qty, record) => (
                                        <InputNumber
                                            min={1}
                                            value={qty}
                                            onChange={(val) => updateOrderItem(record.uniqueId, "quantity", val || 1)}
                                            size="small"
                                            controls={false}
                                            style={{
                                                width: "100%",
                                                border: 'none',
                                                borderBottom: '1px solid #d9d9d9',
                                                borderRadius: 0,
                                                boxShadow: 'none'
                                            }}
                                        />
                                    )
                                },
                                {
                                    title: "Đơn giá",
                                    dataIndex: ["product", "price"],
                                    key: "price",
                                    width: "25%",
                                    render: (price, record) => (
                                        <InputNumber
                                            min={0}
                                            value={price}
                                            onChange={(val) => updateOrderItem(record.uniqueId, "price", val || 0)}
                                            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                                            parser={(value) => value!.replace(/\$\s?|(,*)/g, "")}
                                            size="small"
                                            controls={false}
                                            style={{
                                                width: "100%",
                                                border: 'none',
                                                borderBottom: '1px solid #d9d9d9',
                                                borderRadius: 0,
                                                boxShadow: 'none',
                                                fontSize: 13
                                            }}
                                        />
                                    )
                                },
                                {
                                    title: "Thành tiền",
                                    key: "subtotal",
                                    width: "25%",
                                    render: (_, record) => (
                                        <Text strong style={{ fontSize: 13 }}>
                                            {(record.product.price * record.quantity).toLocaleString()}
                                        </Text>
                                    )
                                },
                                {
                                    title: "",
                                    key: "action",
                                    width: "15%",
                                    render: (_, record) => (
                                        <Space size={0}>
                                            {record.quantity > 1 && (
                                                <Button
                                                    type="text"
                                                    icon={<ForkOutlined style={{ color: COLORS.primary }} />}
                                                    onClick={() => splitOrderItem(record.uniqueId)}
                                                    title="Tách dòng"
                                                />
                                            )}
                                            <Button
                                                type="text"
                                                danger
                                                icon={<DeleteOutlined />}
                                                onClick={() => removeOrderItem(record.uniqueId)}
                                            />
                                        </Space>
                                    )
                                }
                            ]}
                            pagination={false}
                            style={{ width: "100%" }}
                            size="small"
                            rowKey={(record) => record.uniqueId}
                        />
                    )}
                </div>

                {/* Bottom Actions */}
                <div style={{ padding: 16, borderTop: "1px solid #f0f0f0" }}>
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
                        <Space size="large">
                            <Avatar shape="square" icon={<UserOutlined />} />
                            <Space>
                                <Text strong>Nguyễn ...</Text>
                                <MenuOutlined style={{ fontSize: 12 }} />
                            </Space>
                            <FieldTimeOutlined style={{ fontSize: 18 }} />
                            <EditOutlined style={{ fontSize: 18 }} />
                            <HistoryOutlined style={{ fontSize: 18 }} />
                        </Space>
                        <div style={{ marginLeft: "auto", textAlign: "right" }}>
                            <Text type="secondary">Tổng tiền: </Text>
                            <Badge count={currentOrder.length} offset={[10, 0]} color={COLORS.primary}>
                                <Text strong style={{ fontSize: 20 }}>{totalAmount.toLocaleString()} đ</Text>
                            </Badge>
                        </div>
                    </div>

                    <Row gutter={12}>
                        <Col span={8}>
                            <Button
                                size="large"
                                icon={<BellOutlined />}
                                style={{ width: "100%", height: 50, borderRadius: 8 }}
                            >
                                Thông báo
                            </Button>
                        </Col>
                        <Col span={16}>
                            <Button
                                type="primary"
                                size="large"
                                icon={<ShoppingOutlined />}
                                style={{ width: "100%", height: 50, borderRadius: 8, background: COLORS.primary, borderColor: COLORS.primary }}
                            >
                                Yêu cầu thanh toán
                            </Button>
                        </Col>
                    </Row>
                </div>
            </div>
            <ProductModal />
            <CustomerModal />
            <RoomModal onAdd={handleAddRoom} />

            <Modal
                title={
                    <span style={{ fontSize: 20, fontWeight: 700 }}>
                        {selectedRoom ? `${selectedRoom.id.replace('r', '202-')} - ${selectedRoom.label} Tầng ${selectedRoom.floor}` : "Đơn mới"}
                    </span>
                }
                open={isTableActionModalOpen}
                onCancel={() => {
                    setIsTableActionModalOpen(false);
                    setModalTargetRoomId(null);
                    setSplitQuantities({});
                }}
                footer={null}
                width={850}
                styles={{ body: { padding: '24px 32px' } }}
                closeIcon={<CloseOutlined style={{ fontSize: 18 }} />}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <Radio.Group 
                        value={modalMode} 
                        onChange={e => {
                            setModalMode(e.target.value);
                            setSplitQuantities({});
                        }}
                        style={{ marginBottom: 8 }}
                    >
                        <Space size={32}>
                            <Radio value="merge">
                                <span style={{ fontSize: 16 }}>Ghép đơn</span>
                            </Radio>
                            <Radio value="split">
                                <span style={{ fontSize: 16, fontWeight: 600 }}>Tách đơn</span>
                            </Radio>
                        </Space>
                    </Radio.Group>

                    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                            <Text strong style={{ fontSize: 16, whiteSpace: 'nowrap' }}>Ghép đến</Text>
                            <Select
                                value={modalTargetTableType}
                                onChange={setModalTargetTableType}
                                style={{ width: '100%', height: 40 }}
                                options={[
                                    { label: 'Tạo đơn mới', value: 'new' },
                                    ...(modalTargetRoomId && (orders[modalTargetRoomId]?.length || 0) > 0 ? [
                                        { label: 'Ghép vào đơn hiện tại', value: 'existing' }
                                    ] : [])
                                ]}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                            <Text strong style={{ fontSize: 16, whiteSpace: 'nowrap' }}>Chọn phòng/bàn</Text>
                            <Select
                                showSearch
                                placeholder="Chọn phòng/bàn"
                                value={modalTargetRoomId}
                                onChange={(val) => {
                                    setModalTargetRoomId(val);
                                    // Default to existing if the room has an order, otherwise new
                                    if ((orders[val]?.length || 0) > 0) {
                                        setModalTargetTableType('existing');
                                    } else {
                                        setModalTargetTableType('new');
                                    }
                                }}
                                style={{ width: '100%', height: 40 }}
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                                }
                                options={[
                                    ...rooms
                                        .filter(r => (orders[r.id]?.length || 0) > 0)
                                        .map(r => ({ label: `${r.label} (Đang có đơn)`, value: r.id })),
                                    ...rooms
                                        .filter(r => (orders[r.id]?.length || 0) === 0)
                                        .map(r => ({ label: r.label, value: r.id }))
                                ]}
                            />
                        </div>
                    </div>

                    <div style={{ border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
                        <Table
                            dataSource={currentOrder}
                            pagination={false}
                            size="middle"
                            columns={[
                                { 
                                    title: <Text strong style={{ fontSize: 13 }}>Đồ ăn / Đồ uống</Text>, 
                                    dataIndex: ['product', 'name'], 
                                    key: 'name',
                                    render: (name, record, index) => (
                                        <Space align="start">
                                            <span style={{ color: '#8c8c8c', width: 24, display: 'inline-block', paddingTop: 2 }}>{index + 1}</span>
                                            <div>
                                                <Text strong style={{ fontSize: 15 }}>{name}</Text>
                                                {record.product.category_name && (
                                                    <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: -2 }}>{record.product.category_name}</div>
                                                )}
                                            </div>
                                        </Space>
                                    )
                                },
                                { 
                                    title: <Text type="secondary" style={{ fontSize: 12 }}>SL trên đơn gốc</Text>, 
                                    dataIndex: 'quantity', 
                                    key: 'original_qty', 
                                    align: 'center',
                                    width: 150,
                                    render: (val) => <Text style={{ fontSize: 16 }}>{val}</Text>
                                },
                                { 
                                    title: modalMode === 'split' ? <Text type="secondary" style={{ fontSize: 12 }}>SL tách</Text> : null,
                                    key: 'split_qty',
                                    align: 'right',
                                    width: 180,
                                    render: (_, record) => modalMode === 'split' ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
                                            <Button 
                                                icon={<MinusCircleOutlined style={{ fontSize: 24, color: '#8c8c8c' }} />} 
                                                type="text" 
                                                disabled={(splitQuantities[record.uniqueId] || 0) <= 0}
                                                onClick={() => setSplitQuantities(prev => ({
                                                    ...prev,
                                                    [record.uniqueId]: (prev[record.uniqueId] || 0) - 1
                                                }))}
                                                style={{ border: 'none', padding: 0, height: 'auto', display: 'flex' }}
                                            />
                                            <Text strong style={{ fontSize: 20, minWidth: 20, textAlign: 'center' }}>{splitQuantities[record.uniqueId] || 0}</Text>
                                            <Button 
                                                icon={<PlusCircleOutlined style={{ fontSize: 24, color: '#8c8c8c' }} />} 
                                                type="text" 
                                                disabled={(splitQuantities[record.uniqueId] || 0) >= record.quantity}
                                                onClick={() => setSplitQuantities(prev => ({
                                                    ...prev,
                                                    [record.uniqueId]: (prev[record.uniqueId] || 0) + 1
                                                }))}
                                                style={{ border: 'none', padding: 0, height: 'auto', display: 'flex' }}
                                            />
                                        </div>
                                    ) : null
                                }
                            ]}
                            locale={{ emptyText: <div style={{ padding: '60px 0', color: '#999' }}>Bàn chưa có hóa đơn nào</div> }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 12 }}>
                        <Button 
                            type="primary"
                            icon={<CheckSquareFilled />}
                            onClick={() => {
                                if (modalMode === 'merge') {
                                    if (selectedRoomId && modalTargetRoomId) {
                                        setRoomsToMerge([modalTargetRoomId]);
                                        handleMergeRooms();
                                        setIsTableActionModalOpen(false);
                                    }
                                } else {
                                    handleSplitOrder();
                                }
                            }}
                            style={{ 
                                height: 50, 
                                padding: '0 32px', 
                                borderRadius: 12, 
                                background: '#006adc', 
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 18,
                                fontWeight: 600
                            }}
                        >
                            Thực hiện
                        </Button>
                        <Button 
                            onClick={() => {
                                setIsTableActionModalOpen(false);
                                setSplitQuantities({});
                            }}
                            icon={<StopOutlined />}
                            style={{ 
                                height: 50, 
                                padding: '0 32px', 
                                borderRadius: 12, 
                                background: '#8c9196', 
                                color: '#fff', 
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 18,
                                fontWeight: 600
                            }}
                        >
                            Bỏ qua
                        </Button>
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
            `}} />
        </div>
    );
}
