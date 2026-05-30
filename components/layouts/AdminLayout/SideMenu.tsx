"use client";
import { useRouter, usePathname } from "next/navigation";
import { Drawer, Layout, Menu, MenuProps } from "antd";
import { AppstoreOutlined, BankOutlined, CoffeeOutlined, DashboardOutlined, FileDoneOutlined, LogoutOutlined, MailOutlined, SwapOutlined, UsergroupAddOutlined, UserOutlined } from '@ant-design/icons';
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useAuthStore } from "@/stores/authStore";
import { useBreakpoint } from "@ant-design/pro-components";
import { PermissionKey } from "@/types/permissions";
import { handleLogout } from "@/ultils/auth";

const { Sider } = Layout;

interface SideMenuProps {
    collapsed: boolean;
    toggle: () => void;
}

interface LevelKeysProps {
    key?: string;
    children?: LevelKeysProps[];
}

type MenuItem = Required<MenuProps>['items'][number];

// Mapping key to URL path và permission tương ứng
const menuConfig = [
    {
        key: '0',
        icon: <DashboardOutlined />,
        label: 'Tổng quan',
        path: '/dashboard',
        permission: PermissionKey.DASHBOARD_VIEW,
    },
    {
        key: '1',
        icon: <AppstoreOutlined />,
        label: 'Hàng hoá',
        permission: PermissionKey.PRODUCT_VIEW,
        children: [
            {
                key: '11',
                label: 'Sản phẩm',
                path: '/products',
                permission: PermissionKey.PRODUCT_VIEW,
            },
            {
                key: '12',
                label: 'Nhóm hàng',
                path: '/categories',
                permission: PermissionKey.CATEGORY_VIEW,
            },
            // {
            //   key: '13',
            //   label: 'Đơn vị tính',
            //   path: '/units',
            //   permission: PermissionKey.UNIT_VIEW,
            // },
            {
                key: '14',
                label: 'Kiểm kho',
                path: '/transactions/inventory-checks',
                permission: PermissionKey.STOCK_CHECK_VIEW,
            },
        ],
    },
    {
        key: '2',
        icon: <SwapOutlined />,
        label: 'Giao dịch',
        permission: PermissionKey.PRODUCT_VIEW, // hoặc bạn có permission riêng như `order_view`?
        children: [
            {
                key: '22',
                label: 'Hoá đơn',
                path: '/transactions/invoices',
                permission: PermissionKey.INVOICE_VIEW,
            },
            {
                key: '23',
                label: 'Nhập hàng',
                path: '/transactions/purchase-orders',
                permission: PermissionKey.IMPORT_VIEW,
            },
            {
                key: '24',
                label: 'Trả hàng',
                path: '/transactions/returns',
                permission: PermissionKey.RETURN_VIEW,
            },
            {
                key: '25',
                label: 'Voucher',
                path: '/vouchers',
                permission: PermissionKey.VOUCHER_VIEW,
            },
        ],
    },
    {
        key: '3',
        icon: <CoffeeOutlined />,
        label: 'Thu ngân',
        path: '/fnb',
        permission: PermissionKey.INVOICE_VIEW,
    },
    {
        key: '4',
        icon: <MailOutlined />,
        label: 'Đối tác',
        permission: PermissionKey.CUSTOMER_VIEW,
        children: [
            {
                key: '31',
                label: 'Khách hàng',
                path: '/partners/customers',
                permission: PermissionKey.CUSTOMER_VIEW,
            },
            {
                key: '32',
                label: 'Nhà cung cấp',
                path: '/partners/suppliers',
                permission: PermissionKey.SUPPLIER_VIEW,
            },
        ],
    },
    {
        key: '5',
        icon: <BankOutlined />,
        label: 'Quản lý chi nhánh',
        path: '/branches',
        permission: PermissionKey.BRANCH_VIEW,
    },
    {
        key: '6',
        icon: <UserOutlined />,
        label: 'Quản trị viên',
        path: '/users',
        permission: PermissionKey.USER_VIEW,
    },
    {
        key: '7',
        icon: <UsergroupAddOutlined />,
        label: 'Vai trò thành viên',
        path: '/member-roles',
        permission: PermissionKey.USER_VIEW,
    },
    {
        key: '8',
        icon: <FileDoneOutlined />,
        label: 'Báo cáo',
        path: '/reports',
        permission: PermissionKey.REPORT_VIEW,
    },
    {
        key: '9',
        icon: <LogoutOutlined />,
        label: 'Đăng xuất',
        path: '/auth/login',
        permission: null, // Không cần permission để đăng xuất
    },
];

// Tạo menu items dựa trên quyền của user
const getMenuItems = (hasPermission: (permission: string | null) => boolean): MenuItem[] => {
    return menuConfig
        .filter(item => {
            // Nếu là menu cha, kiểm tra permission của chính nó hoặc của bất kỳ menu con nào
            if (item.children) {
                const hasChildPermission = item.children.some(child =>
                    hasPermission(child.permission)
                );
                return hasPermission(item.permission) || hasChildPermission;
            }
            return hasPermission(item.permission);
        })
        .map(item => {
            // Nếu là menu có children, lọc các children có quyền
            if (item.children) {
                return {
                    key: item.key,
                    icon: item.icon,
                    label: item.label,
                    children: item.children
                        .filter(child => hasPermission(child.permission))
                        .map(child => ({
                            key: child.key,
                            label: child.label,
                        }))
                };
            }
            return {
                key: item.key,
                icon: item.icon,
                label: item.label,
            };
        })
        .filter(item => {
            // Loại bỏ menu cha không có children (do không có quyền)
            if (item.children) {
                return item.children.length > 0;
            }
            return true;
        });
};

// Tạo mapping key to path từ menuConfig
const createMenuRoutes = () => {
    const routes: Record<string, string> = {};
    menuConfig.forEach(item => {
        if (item.path) {
            routes[item.key] = item.path;
        }
        if (item.children) {
            item.children.forEach(child => {
                if (child.path) {
                    routes[child.key] = child.path;
                }
            });
        }
    });
    return routes;
};

const menuRoutes = createMenuRoutes();

const getLevelKeys = (items1: LevelKeysProps[]) => {
    const key: Record<string, number> = {};
    const func = (items2: LevelKeysProps[], level = 1) => {
        items2.forEach((item) => {
            if (item.key) {
                key[item.key] = level;
            }
            if (item.children) {
                func(item.children, level + 1);
            }
        });
    };
    func(items1);
    return key;
};

const SideMenu: React.FC<SideMenuProps> = ({ collapsed, toggle }) => {
    const router = useRouter();
    const pathname = usePathname();
    const { hasPermission: _hasPermission } = useAuthStore();
    const screen = useBreakpoint();
    const isMobile = screen && ['lg', 'md', 'sm', 'xs'].includes(screen);
    // const [mounted, setMounted] = useState(false);

    // useEffect(() => {
    //     setMounted(true);
    // }, []);

    // Đảm bảo hàm hasPermission nhận string | null
    const hasPermission = (permission: string | null) => {
        if (permission === null) return true;
        return _hasPermission(permission);
    };

    // Tạo menu items dựa trên quyền
    const items = getMenuItems(hasPermission);

    const levelKeys = getLevelKeys(items as LevelKeysProps[]);

    const selectedKey = Object.entries(menuRoutes).find(([, path]) =>
        pathname?.startsWith(path)
    )?.[0];

    // Tự động mở các menu cha dựa vào selectedKey
    const getDefaultOpenKeys = (key: string | undefined): string[] => {
        if (!key) return [];
        if (key.startsWith('1')) return ['1'];
        if (key.startsWith('2')) return ['2'];
        if (key.startsWith('3')) return ['3'];
        return [];
    };

    const [stateOpenKeys, setStateOpenKeys] = useState<string[]>(getDefaultOpenKeys(selectedKey));

    const onOpenChange: MenuProps['onOpenChange'] = (openKeys) => {
        const currentOpenKey = openKeys.find((key) => stateOpenKeys.indexOf(key) === -1);
        if (currentOpenKey !== undefined) {
            const repeatIndex = openKeys
                .filter((key) => key !== currentOpenKey)
                .findIndex((key) => levelKeys[key] === levelKeys[currentOpenKey]);

            setStateOpenKeys(
                openKeys
                    .filter((_, index) => index !== repeatIndex)
                    .filter((key) => levelKeys[key] <= levelKeys[currentOpenKey]),
            );
        } else {
            setStateOpenKeys(openKeys);
        }
    };

    const onMenuClick: MenuProps['onClick'] = ({ key }) => {
        const path = menuRoutes[key];
        if (path) {
            if (path === "/auth/login") {
                handleLogout();
                router.push('/auth/login');
                return
            }
            router.push(path);
            if (isMobile) {
                toggle()
            }
        }
    };

    useEffect(() => {
        console.log('SideMenu mounted');

        return () => {
            console.log('SideMenu unmounted');
        };
    }, []);

    // if (!mounted) {
    //     return null;
    // }
    return (
        <>
            {isMobile ? (
                <>
                    <Drawer
                        placement="left"
                        closable
                        onClose={toggle}
                        open={collapsed}
                        styles={{ body: { padding: 10 } }}
                        width={250}
                    >
                        <Menu
                            mode="inline"
                            selectedKeys={selectedKey ? [selectedKey] : []}
                            openKeys={stateOpenKeys}
                            onOpenChange={onOpenChange}
                            onClick={onMenuClick}
                            items={items}
                        />
                    </Drawer>
                </>
            ) : (
                <Sider trigger={null} collapsible collapsed={collapsed} theme="light">
                    <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10, overflow: 'hidden' }}>
                        <Image
                            src="/A2S.png"
                            alt="Warehouse Logo"
                            width={collapsed ? 40 : 120}
                            height={collapsed ? 40 : 120}
                            style={{ objectFit: 'contain' }}
                            priority={true}
                        />
                    </div>
                    <Menu
                        mode="inline"
                        selectedKeys={selectedKey ? [selectedKey] : []}
                        openKeys={stateOpenKeys}
                        onOpenChange={onOpenChange}
                        onClick={onMenuClick}
                        items={items}
                    />
                </Sider>
            )}
        </>
    );
};

export default SideMenu;
