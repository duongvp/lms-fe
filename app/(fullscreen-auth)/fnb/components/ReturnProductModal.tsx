import React, { useState, useEffect } from 'react';
import { Modal, Button, List, Typography, Space } from 'antd';
import { 
    AppstoreOutlined, 
    MinusCircleOutlined, 
    PlusCircleOutlined 
} from '@ant-design/icons';
import { OrderItem, Room } from '../types';
import { COLORS } from '../constants';

const { Text, Title } = Typography;

interface ReturnProductModalProps {
    open: boolean;
    onClose: () => void;
    room: Room | null;
    orderItems: OrderItem[];
    onReturn: (returnItems: Record<string, number>) => void;
}

const ReturnProductModal: React.FC<ReturnProductModalProps> = ({
    open,
    onClose,
    room,
    orderItems,
    onReturn
}) => {
    const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});

    useEffect(() => {
        if (open) {
            // Reset quantities when modal opens
            setReturnQuantities({});
        }
    }, [open]);

    const handleIncrement = (uniqueId: string, max: number) => {
        const current = returnQuantities[uniqueId] || 0;
        if (current < max) {
            setReturnQuantities({
                ...returnQuantities,
                [uniqueId]: current + 1
            });
        }
    };

    const handleDecrement = (uniqueId: string) => {
        const current = returnQuantities[uniqueId] || 0;
        if (current > 0) {
            setReturnQuantities({
                ...returnQuantities,
                [uniqueId]: current - 1
            });
        }
    };

    const handleReturnAll = () => {
        const allItems: Record<string, number> = {};
        orderItems.forEach(item => {
            allItems[item.uniqueId] = item.quantity;
        });
        onReturn(allItems);
        onClose();
    };

    const handleConfirmReturn = () => {
        const hasSelection = Object.values(returnQuantities).some(q => q > 0);
        if (!hasSelection) return;
        
        onReturn(returnQuantities);
        onClose();
    };

    return (
        <Modal
            title={<Title level={4} style={{ margin: 0 }}>Trả món - {room?.id?.replace('r', '202-') || '202-67'}</Title>}
            open={open}
            onCancel={onClose}
            footer={null}
            width={500}
            centered
            bodyStyle={{ padding: '0 24px 24px 24px' }}
        >
            <div style={{ marginBottom: 20 }}>
                <Space style={{ color: COLORS.primary }}>
                    <AppstoreOutlined />
                    <Text strong style={{ color: COLORS.primary }}>
                        Tầng {room?.floor || '5'} / {room?.label || 'Bàn 33'}
                    </Text>
                </Space>
            </div>

            <List
                dataSource={orderItems}
                renderItem={(item) => (
                    <List.Item style={{ padding: '12px 0', borderBottom: 'none' }}>
                        <div style={{ flex: 1 }}>
                            <Text strong style={{ fontSize: 16 }}>{item.product.name}</Text>
                        </div>
                        <Space size={12}>
                            <MinusCircleOutlined 
                                style={{ 
                                    fontSize: 24, 
                                    color: (returnQuantities[item.uniqueId] || 0) > 0 ? '#BFBFBF' : '#E8E8E8',
                                    cursor: (returnQuantities[item.uniqueId] || 0) > 0 ? 'pointer' : 'not-allowed'
                                }} 
                                onClick={() => handleDecrement(item.uniqueId)}
                            />
                            <div style={{ fontSize: 18, width: 24, textAlign: 'center' }}>
                                {returnQuantities[item.uniqueId] || 0}
                            </div>
                            <Text type="secondary" style={{ fontSize: 16 }}>/{item.quantity}</Text>
                            <PlusCircleOutlined 
                                style={{ 
                                    fontSize: 24, 
                                    color: (returnQuantities[item.uniqueId] || 0) < item.quantity ? '#BFBFBF' : '#E8E8E8',
                                    cursor: (returnQuantities[item.uniqueId] || 0) < item.quantity ? 'pointer' : 'not-allowed'
                                }} 
                                onClick={() => handleIncrement(item.uniqueId, item.quantity)}
                            />
                        </Space>
                    </List.Item>
                )}
            />

            <div style={{ direction: 'rtl', marginTop: 30, display: 'flex', gap: 12 }}>
                <Button 
                    type="primary" 
                    size="large"
                    style={{ 
                        background: '#38b249', 
                        borderColor: '#38b249', 
                        borderRadius: 12,
                        minWidth: 140,
                        fontWeight: 600
                    }}
                    onClick={handleConfirmReturn}
                    disabled={!Object.values(returnQuantities).some(q => q > 0)}
                >
                    Trả món
                </Button>
                <Button 
                    type="primary" 
                    size="large"
                    style={{ 
                        background: '#006edc', 
                        borderColor: '#006edc', 
                        borderRadius: 12,
                        minWidth: 140,
                        fontWeight: 600
                    }}
                    onClick={handleReturnAll}
                >
                    Trả hết
                </Button>
            </div>
        </Modal>
    );
};

export default ReturnProductModal;
