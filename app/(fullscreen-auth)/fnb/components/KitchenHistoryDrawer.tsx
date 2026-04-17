'use client';
import React from 'react';
import { Drawer, Table, Tag, Typography, Empty, Space } from 'antd';
import { ClockCircleOutlined, HistoryOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface KitchenHistoryItem {
    id: string;
    time: string;
    productName: string;
    quantity: number;
    status: 'pending' | 'cooking' | 'finished';
    note?: string;
}

interface KitchenHistoryDrawerProps {
    open: boolean;
    onClose: () => void;
    historyData?: KitchenHistoryItem[];
}

const KitchenHistoryDrawer: React.FC<KitchenHistoryDrawerProps> = ({ open, onClose, historyData = [] }) => {
    const columns = [
        {
            title: 'Thời gian',
            dataIndex: 'time',
            key: 'time',
            width: 100,
            render: (time: string) => (
                <Space direction="vertical" size={0}>
                    <Text style={{ fontSize: 12 }} type="secondary"><ClockCircleOutlined /> {time}</Text>
                </Space>
            )
        },
        {
            title: 'Món ăn/Đồ uống',
            dataIndex: 'productName',
            key: 'productName',
            render: (name: string, record: KitchenHistoryItem) => (
                <div>
                    <Text strong>{name}</Text>
                    {record.note && <div style={{ fontSize: 12, color: '#f5222d' }}>Lưu ý: {record.note}</div>}
                </div>
            )
        },
        {
            title: 'SL',
            dataIndex: 'quantity',
            key: 'quantity',
            align: 'center' as const,
            width: 60,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            align: 'center' as const,
            render: (status: KitchenHistoryItem['status']) => {
                switch (status) {
                    case 'pending': return <Tag color="warning">Chờ xử lý</Tag>;
                    case 'cooking': return <Tag color="processing">Đang chế biến</Tag>;
                    case 'finished': return <Tag color="success">Hoàn thành</Tag>;
                    default: return <Tag>{status}</Tag>;
                }
            }
        }
    ];



    return (
        <Drawer
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <HistoryOutlined />
                    <span>Lịch sử báo bếp</span>
                </div>
            }
            placement="right"
            width={500}
            onClose={onClose}
            open={open}
            styles={{ body: { padding: 0 } }}
        >
            {historyData.length > 0 ? (
                <Table
                    dataSource={historyData}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                />
            ) : (
                <div style={{ padding: 100 }}>
                    <Empty description="Chưa có lịch sử báo bếp cho đơn hàng này" />
                </div>
            )}
        </Drawer>
    );
};

export default KitchenHistoryDrawer;
