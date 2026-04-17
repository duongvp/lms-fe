'use client';
import React, { useState } from 'react';
import { Layout, Typography, Space, Button, Badge, Row, Col, Card, List, Tabs, Divider, Tag, Dropdown, MenuProps, message } from 'antd';
import {
    SoundOutlined,
    SettingOutlined,
    BellOutlined,
    MenuOutlined,
    RightOutlined,
    DoubleRightOutlined,
    PhoneOutlined,
    CheckCircleFilled,
    ClockCircleOutlined,
    LogoutOutlined,
    AudioMutedOutlined,
    FormOutlined,
    AppstoreOutlined,
    MutedOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { COLORS } from '../constants';
import { playTingSound } from '../utils';

const { Header, Content, Footer } = Layout;
const { Text, Title } = Typography;

interface KitchenOrder {
    id: string;
    orderId: string;
    table: string;
    productName: string;
    quantity: number;
    time: string;
    status: 'pending' | 'done';
}

const initialKitchenOrders: KitchenOrder[] = [
    { id: '1', orderId: '169-672', table: 'Mang về', productName: 'Tee gỗ PTS Pro-Trắng xanh (Gói)', quantity: 1, time: 'một năm trước', status: 'pending' },
    { id: '2', orderId: '169-672', table: 'Mang về', productName: 'Găng tay GL003-Xanh dương-L', quantity: 1, time: '09/03/2025 15:44', status: 'pending' },
    { id: '3', orderId: '169-672', table: 'Mang về', productName: 'Giày nữ Callaway-TRẮNG SAO-24', quantity: 1, time: '09/03/2025 15:44', status: 'pending' },
    { id: '4', orderId: '183-237', table: 'Bàn 45', productName: 'Sinh tố bơ xoài (Cốc)', quantity: 1, time: '22/07/2025 19:12', status: 'pending' },
    { id: '5', orderId: '183-237', table: 'Bàn 45', productName: 'Cafe muối', quantity: 1, time: '22/07/2025 19:12', status: 'pending' },
    { id: '6', orderId: '183-237', table: 'Bàn 45', productName: 'Nước cam tươi (Cốc)', quantity: 3, time: '22/07/2025 19:12', status: 'pending' },
    { id: '7', orderId: '183-237', table: 'Bàn 45', productName: 'Bim bim Oishi Snack 32Gr (Gói)', quantity: 2, time: '22/07/2025 19:12', status: 'pending' },
    { id: '8', orderId: '202-67', table: 'Bàn 33', productName: 'NGK Đảnh Thạnh Chanh muối', quantity: 1, time: '29 phút trước', status: 'done' },
];

const KitchenPage = () => {
    const router = useRouter();
    const [orders, setOrders] = useState<KitchenOrder[]>(initialKitchenOrders);
    const [activeKitchenTab, setActiveKitchenTab] = useState<'priority' | 'dish' | 'table'>('table');
    const [isSoundEnabled, setIsSoundEnabled] = useState(true);

    const handleAction = (id: string, newStatus: 'pending' | 'done') => {
        setOrders(prev => prev.map(order =>
            order.id === id ? { ...order, status: newStatus } : order
        ));
        if (isSoundEnabled) playTingSound();
    };

    const pendingOrders = orders.filter(o => o.status === 'pending');
    const doneOrders = orders.filter(o => o.status === 'done');

    // Group pending orders by table
    const groupedPending = pendingOrders.reduce((acc, order) => {
        const key = `${order.table} (${order.orderId})`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(order);
        return acc;
    }, {} as Record<string, KitchenOrder[]>);

    const menuItems: MenuProps['items'] = [
        {
            key: 'cashier',
            label: 'Thu ngân',
            icon: <FormOutlined />,
            onClick: () => router.push('/fnb')
        },
        {
            key: 'manage',
            label: 'Quản lý',
            icon: <AppstoreOutlined />,
        },
        {
            key: 'exit',
            label: 'Thoát',
            icon: <LogoutOutlined />,
            onClick: () => router.push('/fnb')
        }
    ];

    return (
        <Layout style={{ height: '100vh', background: '#f0f2f5' }}>
            <Header style={{ background: COLORS.primary, padding: '0 24px', height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '50%', gap: 24 }}>
                    <Title level={5} style={{ color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>Chờ chế biến</Title>
                    <Tabs
                        activeKey={activeKitchenTab}
                        onChange={(key) => setActiveKitchenTab(key as any)}
                        className="kitchen-header-tabs"
                        items={[
                            { key: 'priority', label: 'Ưu tiên' },
                            { key: 'dish', label: 'Theo món' },
                            { key: 'table', label: 'Theo phòng/bàn' },
                        ]}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', width: '50%', paddingLeft: 40, justifyContent: 'space-between' }}>
                    <Title level={5} style={{ color: '#fff', margin: 0 }}>Đã xong/ Chờ cung ứng</Title>
                    <Space size={20} style={{ color: '#fff' }}>
                        <div
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            onClick={() => {
                                setIsSoundEnabled(!isSoundEnabled);
                                message.info(isSoundEnabled ? 'Đã tắt âm thanh' : 'Đã bật âm thanh');
                            }}
                        >
                            {isSoundEnabled ? <SoundOutlined /> : <MutedOutlined />}
                        </div>
                        <BellOutlined />
                        <Dropdown menu={{ items: menuItems }} placement="bottomRight" arrow>
                            <MenuOutlined style={{ cursor: 'pointer' }} />
                        </Dropdown>
                    </Space>
                </div>
            </Header>

            <Content style={{ display: 'flex', overflow: 'hidden', padding: 12, gap: 12 }}>
                {/* Processing Column */}
                <div style={{ flex: 1, background: '#fff', display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {Object.entries(groupedPending).map(([group, groupOrders]) => (
                            <div key={group}>
                                <div style={{ background: COLORS.occupied, padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${COLORS.occupiedBorder}` }}>
                                    <Space direction="vertical" size={0}>
                                        <Text strong style={{ color: COLORS.primary }}>— {group}</Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>{groupOrders[0].time}</Text>
                                    </Space>
                                    <Title level={4} style={{ color: COLORS.primary, margin: 0 }}>{groupOrders.length}</Title>
                                    <Button type="primary" shape="round" icon={<DoubleRightOutlined />} style={{ background: '#f5222d', borderColor: '#f5222d' }} />
                                </div>
                                <List
                                    dataSource={groupOrders}
                                    renderItem={item => (
                                        <List.Item style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                                            <div style={{ flex: 1 }}>
                                                <Title level={5} style={{ margin: '0 0 4px 0', fontSize: 14 }}>{item.productName}</Title>
                                                <Text type="secondary" style={{ fontSize: 12 }}>{item.orderId} - {item.time} - Bởi admin</Text>
                                            </div>
                                            <Title level={4} style={{ margin: '0 24px', width: 20, textAlign: 'center' }}>{item.quantity}</Title>
                                            <Space>
                                                <Button
                                                    icon={<RightOutlined />}
                                                    style={{ borderColor: '#ff4d4f', color: '#ff4d4f' }}
                                                    onClick={() => handleAction(item.id, 'done')}
                                                />
                                                <Button
                                                    type="primary"
                                                    icon={<DoubleRightOutlined />}
                                                    style={{ background: '#ff4d4f', borderColor: '#ff4d4f' }}
                                                    onClick={() => handleAction(item.id, 'done')}
                                                />
                                            </Space>
                                        </List.Item>
                                    )}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Done Column */}
                <div style={{ flex: 1, background: '#fff', display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <List
                            dataSource={doneOrders}
                            renderItem={item => (
                                <List.Item style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
                                    <div style={{ flex: 1 }}>
                                        <Title level={5} style={{ margin: '0 0 4px 0', fontSize: 15 }}>{item.productName}</Title>
                                        <Text type="secondary" style={{ fontSize: 12 }}>{item.orderId} - {new Date().toLocaleDateString()} - Bởi admin</Text>
                                    </div>
                                    <div style={{ textAlign: 'right', marginRight: 40 }}>
                                        <Title level={4} style={{ margin: 0 }}>{item.quantity}</Title>
                                        <Text strong>{item.table}</Text>
                                        <div><Text type="secondary" style={{ fontSize: 11 }}>{item.time}</Text></div>
                                    </div>
                                    <Space>
                                        <Button
                                            icon={<CheckCircleFilled />}
                                            style={{ borderColor: '#52c41a', color: '#52c41a' }}
                                        />
                                        <Button
                                            type="primary"
                                            icon={<DoubleRightOutlined />}
                                            style={{ background: '#52c41a', borderColor: '#52c41a' }}
                                        />
                                    </Space>
                                </List.Item>
                            )}
                        />
                    </div>
                </div>
            </Content>

            <Footer style={{ background: COLORS.primary, padding: '6px 20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: 35 }}>
                <Space size={24}>
                    <Text style={{ color: '#fff', fontSize: 12 }}><PhoneOutlined /> Hỗ trợ khách hàng 1900 6522</Text>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ background: '#fff', color: COLORS.primary, borderRadius: '50%', width: 14, height: 14, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>V</div>
                        kiotviet.vn
                    </div>
                </Space>
            </Footer>
            <style dangerouslySetInnerHTML={{
                __html: `
                .kitchen-header-tabs .ant-tabs-nav {
                    margin-bottom: 0 !important;
                }
                .kitchen-header-tabs .ant-tabs-nav::before {
                    display: none;
                }
                .kitchen-header-tabs .ant-tabs-tab {
                    padding: 4px 16px !important;
                    margin: 0 !important;
                    transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
                }
                .kitchen-header-tabs .ant-tabs-tab-btn {
                    color: rgba(255, 255, 255, 0.7) !important;
                    font-size: 12px;
                    font-weight: 400;
                }
                .kitchen-header-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
                    color: ${COLORS.primary} !important;
                    font-weight: 600 !important;
                }
                .kitchen-header-tabs .ant-tabs-ink-bar {
                    height: 100% !important;
                    background: #fff !important;
                    border-radius: 20px;
                    z-index: 0;
                }
                .kitchen-header-tabs .ant-tabs-tab {
                    position: relative;
                    z-index: 1;
                }
                .kitchen-header-tabs .ant-tabs-nav-list {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 2px;
                    border-radius: 20px;
                }
                .kitchen-menu-item-active {
                    background-color: #e6f7ff !important;
                    color: #1890ff !important;
                }
                `
            }} />
        </Layout>
    );
};

export default KitchenPage;
