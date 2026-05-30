"use client";
import React, { useEffect, useState } from "react";
import { Card, Typography, Row, Col, Statistic, Button, Table, Modal, Form, InputNumber, message, Tag, Badge } from "antd";
import { WalletOutlined, StarOutlined, PlusOutlined, CrownOutlined } from "@ant-design/icons";
import { getMemberCardAccount, getMemberCardTransactions, topUpMemberCard, MemberCardAccount, MemberCardTransaction } from "@/services/memberCardService";

const { Text, Title } = Typography;

interface Props {
    customerId: number;
}

const TIER_COLORS: Record<string, string> = {
    BRONZE: 'gray',
    SILVER: 'blue',
    GOLD: 'gold',
    DIAMOND: 'magenta'
};

const MemberCardTab: React.FC<Props> = ({ customerId }) => {
    const [account, setAccount] = useState<MemberCardAccount | null>(null);
    const [transactions, setTransactions] = useState<MemberCardTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [topUpLoading, setTopUpLoading] = useState(false);
    const [form] = Form.useForm();

    const fetchAccountData = async () => {
        setLoading(true);
        try {
            const acc = await getMemberCardAccount(customerId);
            setAccount(acc);
            const txns = await getMemberCardTransactions(customerId);
            setTransactions(txns);
        } catch (error) {
            console.error("Failed to load member card account", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (customerId) {
            fetchAccountData();
        }
    }, [customerId]);

    const handleTopUp = async (values: any) => {
        setTopUpLoading(true);
        try {
            await topUpMemberCard(customerId, values.amount, values.notes);
            message.success('Nạp tiền thành công');
            setIsTopUpOpen(false);
            form.resetFields();
            fetchAccountData();
        } catch (error: any) {
            message.error(error?.message || 'Nạp tiền thất bại');
        } finally {
            setTopUpLoading(false);
        }
    };

    const columns = [
        {
            title: 'Mã GD',
            dataIndex: 'transaction_id',
            key: 'transaction_id',
            render: (id: number) => `#${id}`
        },
        {
            title: 'Thời gian',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => new Date(date).toLocaleString('vi-VN')
        },
        {
            title: 'Loại GD',
            dataIndex: 'transaction_type',
            key: 'transaction_type',
            render: (type: string) => {
                const map: Record<string, any> = {
                    TOP_UP: { text: 'Nạp tiền', color: 'green' },
                    PAYMENT: { text: 'Thanh toán', color: 'volcano' },
                    REFUND: { text: 'Hoàn tiền', color: 'blue' },
                    ADJUSTMENT: { text: 'Điều chỉnh', color: 'orange' },
                };
                return <Tag color={map[type]?.color || 'default'}>{map[type]?.text || type}</Tag>;
            }
        },
        {
            title: 'Số tiền',
            dataIndex: 'amount',
            key: 'amount',
            render: (val: number, record: MemberCardTransaction) => {
                const color = record.transaction_type === 'PAYMENT' ? '#cf1322' : '#3f8600';
                const sign = record.transaction_type === 'PAYMENT' ? '' : '+';
                return <Text style={{ color, fontWeight: 500 }}>{sign}{val.toLocaleString()}đ</Text>;
            }
        },
        {
            title: 'Số dư sau GD',
            dataIndex: 'balance_after',
            key: 'balance_after',
            render: (val: number) => `${val.toLocaleString()}đ`
        },
        {
            title: 'Ghi chú',
            dataIndex: 'notes',
            key: 'notes',
        }
    ];

    if (loading && !account) return <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>;

    return (
        <div style={{ padding: 16 }}>
            <Row gutter={16}>
                <Col span={8}>
                    <Card style={{ background: '#f0f5ff', border: '1px solid #adc6ff' }}>
                        <Statistic
                            title={<span style={{ color: '#2f54eb', fontWeight: 600 }}><WalletOutlined /> SỐ DƯ HIỆN TẠI</span>}
                            value={account?.balance || 0}
                            suffix="VNĐ"
                            valueStyle={{ color: '#1d39c4', fontWeight: 700 }}
                        />
                        <div style={{ marginTop: 16 }}>
                            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsTopUpOpen(true)}>
                                Nạp tiền ngay
                            </Button>
                        </div>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title={<span style={{ fontWeight: 600 }}><CrownOutlined /> HẠNG THẺ</span>}
                            value={account?.membership_tier || 'BRONZE'}
                            valueStyle={{ color: TIER_COLORS[account?.membership_tier || 'BRONZE'], fontWeight: 700 }}
                        />
                        <div style={{ marginTop: 16 }}>
                            <Text type="secondary">Tổng chi tiêu: {(account?.total_spent || 0).toLocaleString()} VNĐ</Text>
                        </div>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title={<span style={{ color: '#fa8c16', fontWeight: 600 }}><StarOutlined /> ĐIỂM TÍCH LŨY</span>}
                            value={account?.points || 0}
                            valueStyle={{ color: '#fa541c', fontWeight: 700 }}
                        />
                    </Card>
                </Col>
            </Row>

            <div style={{ marginTop: 24 }}>
                <Title level={5}>Lịch sử giao dịch</Title>
                <Table
                    dataSource={transactions}
                    columns={columns}
                    rowKey="transaction_id"
                    pagination={{ pageSize: 10 }}
                    size="small"
                />
            </div>

            <Modal
                title="Nạp tiền vào tài khoản thẻ"
                open={isTopUpOpen}
                onCancel={() => setIsTopUpOpen(false)}
                footer={null}
            >
                <Form layout="vertical" form={form} onFinish={handleTopUp}>
                    <Form.Item label="Số tiền nạp (VNĐ)" name="amount" rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}>
                        <InputNumber
                            style={{ width: '100%' }}
                            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            size="large"
                            min={10000}
                        />
                    </Form.Item>
                    <Form.Item label="Ghi chú" name="notes">
                        <Text>Ghi chú thêm về giao dịch nạp tiền</Text>
                    </Form.Item>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <Button onClick={() => setIsTopUpOpen(false)}>Hủy</Button>
                        <Button type="primary" htmlType="submit" loading={topUpLoading}>Xác nhận nạp</Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default MemberCardTab;
