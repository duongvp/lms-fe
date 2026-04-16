"use client";
import React, { useState } from "react";
import { Modal, Input, Button, Typography, Space, message, Divider } from "antd";
import { TagOutlined, SearchOutlined, CheckCircleFilled } from "@ant-design/icons";

const { Text, Title } = Typography;

export interface Voucher {
    code: string;
    discountValue: number;
    discountType: "percentage" | "fixed";
    minOrderValue?: number;
    description: string;
}

interface VoucherModalProps {
    open: boolean;
    onClose: () => void;
    onApply: (voucher: Voucher | null) => void;
    currentTotal: number;
}

const MOCK_VOUCHERS: Voucher[] = [
    { code: "GIAM10", discountValue: 10, discountType: "percentage", description: "Giảm 10% tổng hóa đơn" },
    { code: "SAVE50K", discountValue: 50000, discountType: "fixed", description: "Giảm 50.000đ cho đơn từ 200k", minOrderValue: 200000 },
    { code: "CHECKOUT20", discountValue: 20, discountType: "percentage", description: "Giảm 20% cho khách hàng mới" },
];

const VoucherModal: React.FC<VoucherModalProps> = ({ open, onClose, onApply, currentTotal }) => {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);

    const handleApply = () => {
        if (!code.trim()) {
            message.warning("Vui lòng nhập mã voucher");
            return;
        }

        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            const found = MOCK_VOUCHERS.find(v => v.code.toUpperCase() === code.toUpperCase());
            
            if (!found) {
                message.error("Mã voucher không hợp lệ hoặc đã hết hạn");
                setLoading(false);
                return;
            }

            if (found.minOrderValue && currentTotal < found.minOrderValue) {
                message.error(`Đơn hàng tối thiểu ${found.minOrderValue.toLocaleString()}đ để sử dụng mã này`);
                setLoading(false);
                return;
            }

            message.success(`Áp dụng mã ${found.code} thành công!`);
            onApply(found);
            setCode("");
            setLoading(false);
            onClose();
        }, 600);
    };

    return (
        <Modal
            title={
                <Space>
                    <TagOutlined style={{ color: '#1890ff' }} />
                    <Text strong style={{ fontSize: 18 }}>Chọn mã giảm giá / Voucher</Text>
                </Space>
            }
            open={open}
            onCancel={onClose}
            width={500}
            footer={null}
            styles={{ body: { padding: '24px' } }}
        >
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                <Input 
                    placeholder="Nhập mã voucher (vd: GIAM10)" 
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                    size="large"
                    onPressEnter={handleApply}
                    style={{ borderRadius: 8 }}
                />
                <Button 
                    type="primary" 
                    onClick={handleApply} 
                    loading={loading}
                    size="large"
                    style={{ borderRadius: 8, background: '#1890ff', fontWeight: 600 }}
                >
                    Áp dụng
                </Button>
            </div>

            <Divider style={{ margin: '16px 0' }} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Text type="secondary" style={{ fontSize: 13, textTransform: 'uppercase', fontWeight: 600 }}>Mã voucher gợi ý</Text>
                {MOCK_VOUCHERS.map(v => (
                    <div 
                        key={v.code}
                        onClick={() => setCode(v.code)}
                        style={{ 
                            padding: '12px 16px', 
                            border: `1px solid ${code === v.code ? '#1890ff' : '#f0f0f0'}`,
                            borderRadius: 12,
                            background: code === v.code ? '#e6f7ff' : '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.2s'
                        }}
                    >
                        <div>
                            <Text strong style={{ color: '#1890ff', fontSize: 15 }}>{v.code}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>{v.description}</Text>
                        </div>
                        {code === v.code && <CheckCircleFilled style={{ color: '#1890ff', fontSize: 18 }} />}
                    </div>
                ))}
            </div>
        </Modal>
    );
};

export default VoucherModal;
