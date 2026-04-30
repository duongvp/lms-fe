import React from "react";
import { Modal, Radio, Space, Select, Table, Button, Typography } from "antd";
import { 
    CloseOutlined, 
    MinusCircleOutlined, 
    PlusCircleOutlined, 
    CheckSquareFilled, 
    StopOutlined 
} from "@ant-design/icons";
import { Room, OrderItem } from "../types";

const { Text } = Typography;

interface TableActionModalProps {
    open: boolean;
    onCancel: () => void;
    selectedRoom: Room | null;
    rooms: Room[];
    orders: Record<string, OrderItem[]>;
    modalMode: "merge" | "split";
    setModalMode: (mode: "merge" | "split") => void;
    modalTargetRoomId: string | null;
    setModalTargetRoomId: (id: string | null) => void;
    splitQuantities: Record<string, number>;
    setSplitQuantities: (quantities: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
    handleMergeRooms: (sourceIds: string[], targetId: string) => void;
    handleSplitOrder: () => void;
    targetOrderSummary: any[];
    currentOrder: OrderItem[];
    setModalTargetTableType: (type: "new" | "existing") => void;
}

const TableActionModal: React.FC<TableActionModalProps> = ({
    open,
    onCancel,
    selectedRoom,
    rooms,
    orders,
    modalMode,
    setModalMode,
    modalTargetRoomId,
    setModalTargetRoomId,
    splitQuantities,
    setSplitQuantities,
    handleMergeRooms,
    handleSplitOrder,
    targetOrderSummary,
    currentOrder,
    setModalTargetTableType,
}) => {
    return (
        <Modal
            title={
                <span style={{ fontSize: 20, fontWeight: 700 }}>
                    {selectedRoom ? `${selectedRoom.id.replace('r', '202-')} - ${selectedRoom.label} Tầng ${selectedRoom.floor}` : "Đơn mới"}
                </span>
            }
            open={open}
            onCancel={onCancel}
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
                            <span style={{ fontSize: 16, fontWeight: modalMode === 'merge' ? 600 : 400 }}>Ghép đơn</span>
                        </Radio>
                        <Radio value="split">
                            <span style={{ fontSize: 16, fontWeight: modalMode === 'split' ? 600 : 400 }}>Tách đơn</span>
                        </Radio>
                    </Space>
                </Radio.Group>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Text strong style={{ fontSize: 16, whiteSpace: 'nowrap' }}>{modalMode === 'merge' ? "Ghép đến" : "Tách đến"}</Text>
                    <Select
                        showSearch
                        placeholder="Chọn phòng/bàn"
                        value={modalTargetRoomId}
                        onChange={(val) => {
                            setModalTargetRoomId(val);
                            if (val === "takeaway") {
                                setModalTargetTableType('new');
                            } else {
                                setModalTargetTableType('existing');
                            }
                        }}
                        style={{ width: 300, height: 40 }}
                        filterOption={(input, option) =>
                            (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                        }
                        options={[
                            { label: 'Chọn phòng/bàn', value: null, disabled: true },
                            { label: 'Mang về', value: 'takeaway' },
                            ...rooms
                                .filter(r => (orders[r.id]?.length || 0) > 0)
                                .map(r => ({ label: `${r.label} (Đang có đơn)`, value: r.id })),
                            ...rooms
                                .filter(r => (orders[r.id]?.length || 0) === 0)
                                .map(r => ({ label: r.label, value: r.id }))
                        ]}
                        className="fnb-modal-target-select"
                    />
                </div>

                <div style={{ border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
                    <Table
                        dataSource={(modalMode === 'merge' ? targetOrderSummary : currentOrder) as any[]}
                        pagination={false}
                        size="middle"
                        columns={modalMode === 'merge' ? [
                            {
                                title: <Text strong style={{ fontSize: 13 }}>Khách hàng</Text>,
                                dataIndex: 'customerName',
                                key: 'customer',
                                render: (name) => <Text style={{ fontSize: 14 }}>{name}</Text>
                            },
                            {
                                title: <Text strong style={{ fontSize: 13 }}>Mã đơn</Text>,
                                dataIndex: 'orderCode',
                                key: 'code',
                                render: (code) => <Text style={{ fontSize: 14 }}>{code}</Text>
                            },
                            {
                                title: <Text strong style={{ fontSize: 13 }}>Số lượng hàng</Text>,
                                dataIndex: 'totalQty',
                                key: 'qty',
                                align: 'center',
                                render: (qty) => <Text style={{ fontSize: 14 }}>{qty}</Text>
                            },
                            {
                                title: <Text strong style={{ fontSize: 13 }}>Tổng tiền</Text>,
                                dataIndex: 'totalAmount',
                                key: 'amount',
                                align: 'right',
                                render: (amount) => <Text strong style={{ fontSize: 14 }}>{amount.toLocaleString()}</Text>
                            }
                        ] : [
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
                                title: <Text type="secondary" style={{ fontSize: 12 }}>SL tách</Text>,
                                key: 'split_qty',
                                align: 'right',
                                width: 180,
                                render: (_, record) => (
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
                                )
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
                                if (selectedRoom && modalTargetRoomId) {
                                    handleMergeRooms([selectedRoom.id], modalTargetRoomId);
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
                        onClick={onCancel}
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
    );
};

export default TableActionModal;
