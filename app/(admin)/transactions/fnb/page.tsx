"use client";
import React, { useMemo, useState } from "react";
import { Button, Card, Col, Input, message, Row, Space, Table, Typography } from "antd";
import { PlusCircleOutlined, DeleteOutlined, ShoppingCartOutlined } from '@ant-design/icons';

const { Search } = Input;
const { Title, Text } = Typography;

type RoomStatus = "available" | "occupied" | "reserved";

type Room = {
    id: string;
    label: string;
    status: RoomStatus;
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
    { id: "r1", label: "Phòng 1", status: "available" },
    { id: "r2", label: "Phòng 2", status: "available" },
    { id: "r3", label: "Phòng 3", status: "available" },
    { id: "r4", label: "Phòng 4", status: "reserved" },
    { id: "r5", label: "Phòng 5", status: "occupied" },
    { id: "r6", label: "Phòng 6", status: "available" },
    { id: "r7", label: "Phòng 7", status: "available" },
    { id: "r8", label: "Phòng 8", status: "available" },
    { id: "r9", label: "Phòng 9", status: "available" },
    { id: "r10", label: "Phòng 10", status: "available" },
];

const productCatalog: Product[] = [
    { id: 1, name: "Trà sữa trân châu", price: 45000 },
    { id: 2, name: "Cà phê sữa", price: 30000 },
    { id: 3, name: "Nước ép cam", price: 35000 },
    { id: 4, name: "Bánh mì pate", price: 25000 },
    { id: 5, name: "Phở bò", price: 60000 },
    { id: 6, name: "Gà rán", price: 70000 },
];

const statusColors: Record<RoomStatus, string> = {
    available: "#b3e5fc",
    occupied: "#ffe0b2",
    reserved: "#d1c4e9",
};

export default function FnbSalesPage() {
    const [rooms, setRooms] = useState<Room[]>(initialRooms);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [roomStatusFilter, setRoomStatusFilter] = useState<RoomStatus | "all">("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [orders, setOrders] = useState<Record<string, OrderItem[]>>({});

    const selectedRoom = useMemo(() => rooms.find((r) => r.id === selectedRoomId) ?? null, [rooms, selectedRoomId]);
    const displayedRooms = useMemo(
        () => roomStatusFilter === "all" ? rooms : rooms.filter((r) => r.status === roomStatusFilter),
        [rooms, roomStatusFilter],
    );
    const currentOrder = selectedRoomId ? orders[selectedRoomId] ?? [] : [];
    const filteredProducts = productCatalog.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const setRoomStatus = (roomId: string, status: RoomStatus) => {
        setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, status } : r)));
    };

    const handleRoomClick = (room: Room) => {
        if (room.status === "available") {
            setRoomStatus(room.id, "occupied");
        }
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
    };

    const updateQuantity = (productId: number, qty: number) => {
        if (!selectedRoomId) return;
        setOrders((prev) => {
            const items = (prev[selectedRoomId] ?? []).map((item) =>
                item.product.id === productId ? { ...item, quantity: Math.max(1, qty) } : item
            );
            return { ...prev, [selectedRoomId]: items };
        });
    };

    const removeItem = (productId: number) => {
        if (!selectedRoomId) return;
        setOrders((prev) => {
            const items = (prev[selectedRoomId] ?? []).filter((item) => item.product.id !== productId);
            return { ...prev, [selectedRoomId]: items };
        });
    };

    const handleCheckout = () => {
        if (!selectedRoomId) {
            message.warning("Chọn phòng/bàn để thanh toán.");
            return;
        }

        if (!currentOrder.length) {
            message.warning("Giỏ hàng trống.");
            return;
        }

        const totalAmount = currentOrder.reduce(
            (sum, item) => sum + item.product.price * item.quantity,
            0
        );

        message.success(`Thanh toán thành công ${selectedRoom?.label} - Tổng ${Number(totalAmount).toLocaleString()} VND`);

        setOrders((prev) => ({ ...prev, [selectedRoomId]: [] }));
        setRoomStatus(selectedRoomId, "available");
        setSelectedRoomId(null);
    };

    const totalAmount = currentOrder.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const columns = [
        {
            title: "Món",
            dataIndex: ["product", "name"],
            key: "product",
        },
        {
            title: "Số lượng",
            dataIndex: "quantity",
            key: "quantity",
            render: (_: any, record: OrderItem) => (
                <Space>
                    <Button size="small" onClick={() => updateQuantity(record.product.id, record.quantity - 1)}>-</Button>
                    <Text>{record.quantity}</Text>
                    <Button size="small" onClick={() => updateQuantity(record.product.id, record.quantity + 1)}>+</Button>
                </Space>
            ),
        },
        {
            title: "Đơn giá",
            key: "price",
            render: (_: any, record: OrderItem) => `${Number(record.product.price).toLocaleString()} VNĐ`,
        },
        {
            title: "Thành tiền",
            key: "total",
            render: (_: any, record: OrderItem) => `${Number(record.product.price * record.quantity).toLocaleString()} VNĐ`,
        },
        {
            title: "Hành động",
            key: "action",
            render: (_: any, record: OrderItem) => (
                <Button danger icon={<DeleteOutlined />} size="small" onClick={() => removeItem(record.product.id)}>
                    Xóa
                </Button>
            ),
        },
    ];

    return (
        <div style={{ padding: 16, minHeight: "calc(100vh - 90px)" }}>
            <Title level={4} style={{ marginBottom: 16 }}>
                Bán hàng F&B
            </Title>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                    <Card
                        title="Bản đồ phòng/bàn"
                        extra={
                            <Space>
                                <Button type={roomStatusFilter === "all" ? "primary" : "default"} size="small" onClick={() => setRoomStatusFilter("all")}>Tất cả</Button>
                                <Button type={roomStatusFilter === "available" ? "primary" : "default"} size="small" onClick={() => setRoomStatusFilter("available")}>Trống</Button>
                                <Button type={roomStatusFilter === "occupied" ? "primary" : "default"} size="small" onClick={() => setRoomStatusFilter("occupied")}>Đang dùng</Button>
                                <Button type={roomStatusFilter === "reserved" ? "primary" : "default"} size="small" onClick={() => setRoomStatusFilter("reserved")}>Đã đặt</Button>
                            </Space>
                        }
                        style={{ minHeight: 640 }}
                    >
                        <div style={{ marginBottom: 12 }}>
                            <Text type="secondary">Lọc trạng thái: </Text>
                            <Text strong>{roomStatusFilter === "all" ? "Tất cả" : roomStatusFilter === "available" ? "Trống" : roomStatusFilter === "occupied" ? "Đang phục vụ" : "Đã đặt"}</Text>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12 }}>
                            {displayedRooms.length ? displayedRooms.map((room) => (
                                <Card
                                    key={room.id}
                                    hoverable
                                    onClick={() => handleRoomClick(room)}
                                    style={{
                                        background: statusColors[room.status],
                                        border: selectedRoomId === room.id ? "2px solid #1890ff" : "1px solid #d9d9d9",
                                        cursor: "pointer",
                                        textAlign: "center",
                                    }}
                                >
                                    <Text strong>{room.label}</Text>
                                    <br />
                                    <Text type={room.status === "occupied" ? "danger" : room.status === "reserved" ? "warning" : "success"}>
                                        {room.status === "available" ? "Trống" : room.status === "occupied" ? "Đang phục vụ" : "Đã đặt"}
                                    </Text>
                                </Card>
                            )) : (
                                <div style={{ gridColumn: "1 / -1", textAlign: "center" }}>
                                    <Text type="secondary">Không có phòng/bàn phù hợp</Text>
                                </div>
                            )}
                        </div>
                        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <Text strong>Màu sắc:</Text>
                            <Space>
                                <Text style={{ color: statusColors.available }}>■</Text> <Text>Trống</Text>
                                <Text style={{ color: statusColors.occupied }}>■</Text> <Text>Đang phục vụ</Text>
                                <Text style={{ color: statusColors.reserved }}>■</Text> <Text>Đã đặt</Text>
                            </Space>
                        </div>
                    </Card>
                </Col>

                <Col xs={24} lg={10}>
                    <Card title="Hoá đơn" style={{ minHeight: 640 }}>
                        <Space direction="vertical" size={12} style={{ width: "100%" }}>
                            <Row justify="space-between" align="middle">
                                <Col>
                                    <Text strong>Phòng/Bàn: </Text>
                                    <Text>{selectedRoom?.label ?? "Chưa chọn"}</Text>
                                </Col>
                                <Col>
                                    <Button
                                        type="primary"
                                        icon={<ShoppingCartOutlined />}
                                        onClick={handleCheckout}
                                        disabled={!selectedRoom || currentOrder.length === 0}
                                    >
                                        Thanh toán
                                    </Button>
                                </Col>
                            </Row>

                            <Search
                                placeholder="Tìm món"
                                allowClear
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />

                            <Card size="small" title="Danh sách món" style={{ maxHeight: 220, overflowY: "auto" }}>
                                <Row gutter={[8, 8]}>
                                    {filteredProducts.length ? (
                                        filteredProducts.map((product) => (
                                            <Col span={12} key={product.id}>
                                                <Card size="small" type="inner" style={{ cursor: "pointer" }} onClick={() => handleAddProduct(product)}>
                                                    <Text>{product.name}</Text>
                                                    <br />
                                                    <Text type="secondary">{product.price.toLocaleString()} VNĐ</Text>
                                                </Card>
                                            </Col>
                                        ))
                                    ) : (
                                        <Col span={24} style={{ textAlign: "center" }}>
                                            <Text type="secondary">Không có món phù hợp</Text>
                                        </Col>
                                    )}
                                </Row>
                            </Card>

                            <Table
                                columns={columns}
                                dataSource={currentOrder.map((item) => ({ ...item, key: item.product.id }))}
                                pagination={false}
                                locale={{ emptyText: "Chưa có món nào" }}
                                size="small"
                            />

                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <Text strong>Tổng</Text>
                                <Text strong>{totalAmount.toLocaleString()} VNĐ</Text>
                            </div>

                            <Button
                                danger
                                onClick={() => {
                                    if (!selectedRoomId) return;
                                    setOrders((prev) => ({ ...prev, [selectedRoomId]: [] }));
                                    setRoomStatus(selectedRoomId, "available");
                                    setSelectedRoomId(null);
                                }}
                                disabled={!selectedRoom || currentOrder.length === 0}
                            >
                                Huỷ đơn
                            </Button>
                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
