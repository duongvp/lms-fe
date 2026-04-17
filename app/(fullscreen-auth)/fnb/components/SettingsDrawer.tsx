'use client';
import React from 'react';
import { Drawer, Avatar, Typography, Divider, List, Space, Button, message } from 'antd';
import {
    UserOutlined,
    CloseOutlined,
    ShopOutlined,
    CoffeeOutlined,
    DesktopOutlined,
    LineChartOutlined,
    FileTextOutlined,
    HistoryOutlined,
    SettingOutlined,
    DollarOutlined,
    UnorderedListOutlined,
    KeyOutlined,
    LockOutlined,
    LogoutOutlined,
    RightOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Text, Title } = Typography;

interface SettingsDrawerProps {
    open: boolean;
    onClose: () => void;
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ open, onClose }) => {
    const router = useRouter();

    const handleLogout = () => {
        message.loading("Đang đăng xuất...");
        setTimeout(() => {
            // Local storage cleanup or store reset could go here
            message.success("Đã đăng xuất thành công");
            onClose();
            // router.push('/login');
        }, 800);
    };

    const topApps = [
        { icon: <ShopOutlined style={{ fontSize: 22, color: '#fff' }} />, label: 'Quản lý', color: '#1890ff' },
        { 
            icon: <CoffeeOutlined style={{ fontSize: 22, color: '#fff' }} />, 
            label: 'Nhà bếp', 
            color: '#722ed1', 
            onClick: () => {
                onClose();
                router.push('/fnb/kitchen');
            } 
        },
        { icon: <DesktopOutlined style={{ fontSize: 22, color: '#fff' }} />, label: 'Màn hình phụ', color: '#1890ff' },
    ];

    const menuItems = [
        { icon: <LineChartOutlined />, label: 'Báo cáo cuối ngày' },
        { icon: <FileTextOutlined />, label: 'Lập phiếu thu' },
        { icon: <HistoryOutlined />, label: 'Chọn hóa đơn trả hàng' },
        { divider: true },
        { icon: <SettingOutlined />, label: 'Cài đặt chung' },
        { icon: <DollarOutlined />, label: 'Thiết lập giá' },
        { icon: <UnorderedListOutlined />, label: 'Món có sẵn trong đơn' },
        { icon: <KeyOutlined />, label: 'Phím tắt', suffix: <RightOutlined style={{ fontSize: 12, color: '#bfbfbf' }} /> },
        { divider: true },
        { icon: <LockOutlined />, label: 'Đổi mật khẩu' },
        { icon: <LogoutOutlined style={{ color: '#ff4d4f' }} />, label: 'Đăng xuất', color: '#ff4d4f', onClick: handleLogout },
    ];

    return (
        <Drawer
            title={null}
            placement="right"
            closable={false}
            onClose={onClose}
            open={open}
            width={320}
            styles={{ body: { padding: 0 } }}
        >
            {/* Header */}
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space size={12}>
                    <Avatar size={40} icon={<UserOutlined />} style={{ background: '#e6f7ff', color: '#1890ff' }} />
                    <Title level={5} style={{ margin: 0 }}>admin</Title>
                </Space>
                <Button type="text" icon={<CloseOutlined />} onClick={onClose} style={{ color: '#bfbfbf' }} />
            </div>

            {/* App Shortcuts Grid */}
            <div style={{ padding: '0 20px 16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {topApps.map((app, index) => (
                    <div 
                        key={index} 
                        className="settings-app-card"
                        style={{ 
                            padding: '12px', 
                            background: '#f5f5f5', 
                            borderRadius: 12, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 12,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onClick={app.onClick}
                    >
                        <div style={{ 
                            width: 36, 
                            height: 36, 
                            borderRadius: 8, 
                            background: app.color, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center' 
                        }}>
                            {app.icon}
                        </div>
                        <Text strong style={{ fontSize: 13 }}>{app.label}</Text>
                    </div>
                ))}
            </div>

            <Divider style={{ margin: 0 }} />

            {/* Menu List */}
            <List
                dataSource={menuItems}
                renderItem={(item) => (
                    item.divider ? (
                        <Divider style={{ margin: '8px 0' }} />
                    ) : (
                        <List.Item 
                            style={{ 
                                padding: '14px 24px', 
                                cursor: 'pointer',
                                border: 'none',
                            }}
                            className="settings-menu-item"
                            onClick={item.onClick}
                        >
                            <Space size={16} style={{ width: '100%' }}>
                                <span style={{ fontSize: 18, color: item.color || '#595959', display: 'flex' }}>{item.icon}</span>
                                <Text style={{ color: item.color || '#262626', fontSize: 14 }}>{item.label}</Text>
                                {item.suffix && <div style={{ marginLeft: 'auto' }}>{item.suffix}</div>}
                            </Space>
                        </List.Item>
                    )
                )}
            />

            <style dangerouslySetInnerHTML={{
                __html: `
                .settings-menu-item:hover {
                    background: #f0f5ff !important;
                }
                .settings-app-card:hover {
                    background: #f0f5ff !important;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                `
            }} />
        </Drawer>
    );
};

export default SettingsDrawer;
