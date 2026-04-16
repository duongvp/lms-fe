"use client";
import React, { useMemo, useState, useEffect } from "react";
import { Modal, Table, Button, Space, Typography, Checkbox } from "antd";

const { Text } = Typography;

export interface OtherFee {
    id: string;
    code: string;
    name: string;
    rate: number; // Percentage (e.g., 10 for 10%)
    isPercentage: boolean;
}

interface OtherFeesModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (selectedFees: OtherFee[]) => void;
    totalAmount: number;
    initialSelectedFees: OtherFee[];
}

const MOCK_FEES: OtherFee[] = [
    { id: "1", code: "THK000001", name: "Phí quẹt thẻ nội địa ATN/NAPAS", rate: 1.4, isPercentage: true },
    { id: "2", code: "THK000002", name: "Phí quẹt thẻ VISA, MASTER, JCB, CUP phát hành tại Việt Nam", rate: 2.42, isPercentage: true },
    { id: "3", code: "THK000003", name: "Phí quẹt thẻ VISA, MASTER, JCB, CUP phát hành tại nước ngoài", rate: 3.85, isPercentage: true },
    { id: "4", code: "THK000011", name: "Thuế", rate: 10, isPercentage: true },
    { id: "5", code: "THK0000012", name: "Thu khác", rate: 0, isPercentage: false },
    { id: "6", code: "THK000006", name: "Phí quẹt thẻ AMEX phát hành tại nước ngoài", rate: 3.9, isPercentage: true },
    { id: "7", code: "THK000007", name: "Phí quẹt thẻ AMEX phát hành tại Việt Nam", rate: 2.75, isPercentage: true },
];

const OtherFeesModal: React.FC<OtherFeesModalProps> = ({
    open,
    onClose,
    onSave,
    totalAmount,
    initialSelectedFees
}) => {
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    useEffect(() => {
        if (open) {
            setSelectedRowKeys(initialSelectedFees.map(f => f.id));
        }
    }, [open, initialSelectedFees]);

    const handleSave = () => {
        const selectedFees = MOCK_FEES.filter(f => selectedRowKeys.includes(f.id));
        onSave(selectedFees);
        onClose();
    };

    const columns = [
        {
            title: "Mã thu khác",
            dataIndex: "code",
            key: "code",
            width: 120,
        },
        {
            title: "Loại thu",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "Mức thu",
            dataIndex: "rate",
            key: "rate",
            width: 100,
            render: (rate: number, record: OtherFee) => (
                <Text>{rate} {record.isPercentage ? "%" : ""}</Text>
            ),
        },
        {
            title: "Thu trên hóa đơn",
            key: "calculated",
            width: 150,
            align: "right" as const,
            render: (_: any, record: OtherFee) => {
                const amount = record.isPercentage ? (totalAmount * record.rate) / 100 : record.rate;
                return <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: '4px 12px', background: '#fff', textAlign: 'right', minWidth: 100 }}>
                    {Math.round(amount).toLocaleString()}
                </div>;
            },
        },
    ];

    return (
        <Modal
            title={<Text strong style={{ fontSize: 18 }}>Các khoản thu khác</Text>}
            open={open}
            onCancel={onClose}
            width={1000}
            footer={[
                <Button key="cancel" onClick={onClose} size="large" style={{ borderRadius: 10, minWidth: 120, background: '#e6f4ff', border: 'none', color: '#006adc' }}>
                    Bỏ qua
                </Button>,
                <Button key="save" type="primary" onClick={handleSave} size="large" style={{ borderRadius: 10, minWidth: 120, background: '#006adc' }}>
                    Lưu lại
                </Button>,
            ]}
            styles={{ body: { padding: '12px 0' } }}
        >
            <Table
                dataSource={MOCK_FEES}
                columns={columns}
                rowKey="id"
                pagination={false}
                rowSelection={{
                    selectedRowKeys,
                    onChange: (keys) => setSelectedRowKeys(keys),
                }}
                className="other-fees-table"
            />
            <style jsx global>{`
                .other-fees-table .ant-table-thead > tr > th {
                    background: #f7f9fb !important;
                    font-weight: 600 !important;
                    color: #595959 !important;
                }
                .other-fees-table .ant-table-tbody > tr > td {
                    padding: 16px 16px !important;
                }
            `}</style>
        </Modal>
    );
};

export default OtherFeesModal;
