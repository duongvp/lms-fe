import React from "react";
import { Table, Button, Space, InputNumber, Typography } from "antd";
import { ShoppingOutlined, ForkOutlined, DeleteOutlined } from "@ant-design/icons";
import { OrderItem } from "../../types";
import { COLORS } from "../../constants";

const { Text, Title } = Typography;

interface OrderItemsTableProps {
    currentOrder: OrderItem[];
    updateOrderItem: (uniqueId: string, field: "quantity" | "price", value: number) => void;
    splitOrderItem: (uniqueId: string) => void;
    removeOrderItem: (uniqueId: string) => void;
}

const OrderItemsTable: React.FC<OrderItemsTableProps> = ({
    currentOrder,
    updateOrderItem,
    splitOrderItem,
    removeOrderItem,
}) => {
    if (currentOrder.length === 0) {
        return (
            <div style={{ textAlign: "center", opacity: 0.5, width: "100%", marginTop: 100 }}>
                <ShoppingOutlined style={{ fontSize: 64, color: COLORS.primary, marginBottom: 16 }} />
                <Title level={5}>Chưa có món trong đơn</Title>
                <Text type="secondary">Vui lòng chọn món trong thực đơn bên trái màn hình</Text>
            </div>
        );
    }

    return (
        <Table
            dataSource={currentOrder}
            columns={[
                {
                    title: "Tên món",
                    dataIndex: ["product", "name"],
                    key: "name",
                    width: "30%",
                    render: (name, record) => {
                        const status = record.kitchenStatus;
                        let color = 'inherit';
                        if (status === 'pending') color = '#f5222d'; // Đỏ (đã báo bếp, đang làm)
                        else if (status === 'done') color = '#52c41a'; // Xanh (bếp đã làm xong)
                        return <Text strong style={{ fontSize: 13, color }}>{name}</Text>;
                    }
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
    );
};

export default OrderItemsTable;
