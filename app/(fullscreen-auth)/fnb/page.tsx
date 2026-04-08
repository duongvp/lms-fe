"use client";
import React, { useMemo, useState } from "react";
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
};

type OrderItem = {
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

const productCatalog: Product[] = [
    { id: 1, name: "Trà sữa trân châu", price: 45000 },
    { id: 2, name: "Cà phê sữa", price: 30000 },
    { id: 3, name: "Nước ép cam", price: 35000 },
    { id: 4, name: "Bánh mì pate", price: 25000 },
    { id: 5, name: "Phở bò", price: 60000 },
    { id: 6, name: "Gà rán", price: 70000 },
];

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
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>("r23"); // Mock selection
    const [roomStatusFilter, setRoomStatusFilter] = useState<RoomStatus | "all">("all");
    const [activeFloor, setActiveFloor] = useState("all");
    const [orders, setOrders] = useState<Record<string, OrderItem[]>>({});
    const [activeTab, setActiveTab] = useState<"rooms" | "menu">("rooms");

    const [searchTerm, setSearchTerm] = useState("");
    const { setModal } = useProductStore();
    const { options, handleScroll } = useProductSelect(searchTerm, false, true, []);

    const [customerSearchTerm, setCustomerSearchTerm] = useState("");
    const [form] = Form.useForm();
    const { setModal: setCustomerModal } = useCustomerStore();
    const { options: customerOptions, handleScroll: handleCustomerScroll } = useCustomerSelect(customerSearchTerm, form, null);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

    const { setModal: setRoomModal } = useRoomStore();

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
                items.push({ product, quantity: 1 });
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

                {/* Floor & Controls */}
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
                                <AppstoreOutlined style={{ fontSize: 18, cursor: "pointer" }} />
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

                {/* Table Grid / Menu Grid */}
                <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
                    {activeTab === "rooms" ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 16 }}>
                            {/* Takeaway Card */}
                            <Card
                                hoverable
                                styles={{ body: { height: 120, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 8 } }}
                                style={{ borderRadius: 8, background: "#e6f7ff", border: `1px solid ${COLORS.occupiedBorder}` }}
                            >
                                <Badge count={<ShoppingCartOutlined style={{ color: '#fff', fontSize: 12 }} />}>
                                    <Avatar size={64} icon={<ShoppingOutlined />} style={{ backgroundColor: "#cfe9ff", color: COLORS.primary }} />
                                </Badge>
                                <Text strong style={{ color: "#3467cc", marginTop: 8 }}>Mang về</Text>
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
                                                    height: 100,
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
                                                    <Text style={{ fontSize: 11, color: isSelected ? "#fff" : textColor }}>
                                                        {room.price.toLocaleString()}
                                                        {room.time && <span style={{ marginLeft: 4 }}>{room.time}</span>}
                                                    </Text>
                                                )}
                                                {room.customers && (
                                                    <Text style={{ fontSize: 10, color: isSelected ? "#fff" : textColor }}>
                                                        {room.customers}
                                                    </Text>
                                                )}
                                            </div>
                                        </Card>
                                        <Text strong style={{ marginTop: 4, display: "block", fontSize: 12 }}>{room.label}</Text>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16 }}>
                            {productCatalog.map((product) => (
                                <Card
                                    key={product.id}
                                    hoverable
                                    onClick={() => handleAddProduct(product)}
                                    styles={{ body: { padding: 12 } }}
                                >
                                    <div style={{ height: 100, background: "#f5f5f5", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                                        <ShoppingOutlined style={{ fontSize: 32, opacity: 0.2 }} />
                                    </div>
                                    <Text strong style={{ display: "block" }}>{product.name}</Text>
                                    <Text type="danger">{product.price.toLocaleString()} đ</Text>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: "8px 16px", borderTop: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Checkbox><Text style={{ fontSize: 12 }}>Mở thực đơn khi chọn bàn</Text></Checkbox>
                    <Pagination size="small" total={49} pageSize={24} showSizeChanger={false} />
                </div>
            </div>

            {/* Right Panel - Order Management */}
            <div style={{ flex: "1 1 40%", display: "flex", flexDirection: "column", background: "#fff" }}>
                {/* Header Utilities */}
                <div style={{ padding: "8px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", background: "#fff", height: 48 }}>
                    <div style={{ display: "flex", alignItems: "center", marginRight: "auto" }}>
                        <Tag color="white" style={{ border: "1px solid #d9d9d9", color: "#333", height: 32, display: "flex", alignItems: "center", padding: "0 12px", borderRadius: 16, cursor: "pointer" }}>
                            202-14 <CloseOutlined style={{ marginLeft: 8, fontSize: 10 }} />
                        </Tag>
                        <PlusOutlined style={{ color: COLORS.primary, cursor: "pointer", fontSize: 18 }} />
                    </div>
                    <Space size="middle">
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
                        <Text strong style={{ color: COLORS.primary, fontSize: 16 }}>{selectedRoom?.label ?? "Chưa chọn bàn"}</Text>
                        <SwapOutlined style={{ marginLeft: 8 }} />
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
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#fff" }}>
                    {currentOrder.length === 0 ? (
                        <div style={{ textAlign: "center", opacity: 0.5 }}>
                            <ShoppingOutlined style={{ fontSize: 64, color: COLORS.primary, marginBottom: 16 }} />
                            <Title level={5}>Chưa có món trong đơn</Title>
                            <Text type="secondary">Vui lòng chọn món trong thực đơn bên trái màn hình</Text>
                        </div>
                    ) : (
                        <Table
                            dataSource={currentOrder}
                            columns={[
                                { title: "Tên món", dataIndex: ["product", "name"], key: "name" },
                                { title: "SL", dataIndex: "quantity", key: "qty" },
                                { title: "Giá", render: (_, record) => record.product.price.toLocaleString(), key: "price" },
                            ]}
                            pagination={false}
                            style={{ width: "100%" }}
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
                            <DeleteOutlined style={{ fontSize: 18, color: "#ff4d4f" }} />
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
                                Thông báo (F10)
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

            <style jsx global>{`
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
            `}</style>
        </div>
    );
}
