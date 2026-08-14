import { useAuthStore } from "@/stores/authStore";
import { logoutUser } from "@/services/authService";
import { MenuOutlined } from "@ant-design/icons";
import { Avatar, Button, Dropdown, Flex, Layout, Space, Menu, Grid } from "antd";
import { MenuProps } from "antd/lib";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  menuConfig,
  getActiveKeys,
  isProgramContextPath,
  withProgramContext,
} from "./SideMenu";

const { Header: AntdHeader } = Layout;
const { useBreakpoint } = Grid;

interface HeaderProps {
  onToggleMenu: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleMenu }) => {
  const { user } = useAuthStore();
  const { username } = user;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentProgram = useAuthStore((state) => state.currentProgram);
  const urlProgram = String(searchParams.get('program') || '').trim();
  // Menu luôn dùng shared state mới nhất. Nếu tiếp tục ưu tiên URL của trang
  // hiện tại, khoảng thời gian URL đang đồng bộ sau khi bấm Lọc có thể dựng
  // link sang module khác bằng Chương trình cũ.
  const navigationProgram = currentProgram;
  const screens = useBreakpoint();
  const isMobile = screens && !screens.xl;
  const isPhone = screens && !screens.sm;

  // Deep link hoặc tab mới có `program` là nguồn ưu tiên. URL trống không xóa
  // context, vì người dùng có thể đang đi qua Tổng quan hay module không lọc.
  useEffect(() => {
    if (urlProgram && isProgramContextPath(pathname)) {
      useAuthStore.getState().setCurrentProgram(urlProgram);
    }
  }, [pathname, urlProgram]);

  const { hasPermission: _hasPermission } = useAuthStore();

  const hasPermission = (permission: string | null) => {
    if (permission === null) return true;
    return _hasPermission(permission);
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      useAuthStore.getState().logout();
      router.replace('/auth/login');
    }
  };

  // Get active key based on current URL path
  const { activeTopKey, activeSideKey } = getActiveKeys(pathname);

  // Get allowed top level menu items for the desktop header (exclude Logout '9')
    const headerItems = menuConfig
    .filter(item => {
      if (item.key === '9') return false;
      if (item.children) {
        return item.children.some(child => hasPermission(child.permission)) || hasPermission(item.permission);
      }
      return hasPermission(item.permission);
    })
    .map(item => {
      const allowedChildren = item.children?.filter(child => hasPermission(child.permission));
      const targetPath = withProgramContext(
        item.path || allowedChildren?.[0]?.path || '/dashboard',
        navigationProgram
      );
      return {
        key: item.key,
        // Dùng link thật để menu chuột phải của trình duyệt có thể mở tab mới.
        label: <Link href={targetPath}>{item.label}</Link>,
        children: allowedChildren && allowedChildren.length > 0
          ? allowedChildren.map(child => ({
            key: child.key,
            label: <Link href={withProgramContext(child.path as string, navigationProgram)}>{child.label}</Link>,
          }))
          : undefined,
      };
    });

  const onHeaderMenuClick: MenuProps['onClick'] = ({ key }) => {
    let targetPath = '';

    // Check if it's a main item
    const mainItem = menuConfig.find(item => item.key === key);
    if (mainItem) {
      if (mainItem.children && mainItem.children.length > 0) {
        const allowedChild = mainItem.children.find(child => hasPermission(child.permission));
        if (allowedChild) {
          targetPath = allowedChild.path as string;
        }
      } else {
        targetPath = mainItem.path || '';
      }
    } else {
      // It might be a child item from the dropdown
      for (const item of menuConfig) {
        if (item.children) {
          const child = item.children.find(c => c.key === key);
          if (child) {
            targetPath = child.path as string;
            break;
          }
        }
      }
    }

    if (targetPath) {
      router.push(withProgramContext(targetPath, navigationProgram));
    }
  };

  const profileMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: (
        <div style={{ padding: '4px 8px' }}>
          <div style={{ fontWeight: 600, color: '#262626' }}>{username}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>Tài khoản quản trị</div>
        </div>
      ),
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      label: 'Đăng xuất',
      danger: true,
      onClick: logout,
    }
  ];

  return (
    <AntdHeader style={{ padding: isPhone ? '0 6px' : isMobile ? '0 10px' : '0 24px', background: '#ffffff', borderBottom: '1px solid #f0f0f0', height: isPhone ? 56 : 64, display: 'flex', alignItems: 'center' }}>
      <Flex align="center" justify="space-between" style={{ width: "100%", height: "100%" }}>
        {/* Left Side: Hamburger (mobile) + Logo */}
        {/* <Flex align="center" gap={12} style={{ flex: 1, minWidth: 0 }}>
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={onToggleMenu}
              style={{ fontSize: "18px", width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            />
          )}
          <Flex align="center" gap={8} style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
            <img
              src="https://hocmai.vn/study/public/images/logo.png"
              alt="Warehouse Logo"
              width={36}
              height={36}
              style={{ objectFit: 'contain' }}
            />
            <span style={{ fontSize: 20, fontWeight: 600, color: '#1890ff' }}>STREAM</span>
          </Flex>
        </Flex> */}

        {/* Center: Horizontal Navigation Menu (Desktop only) */}
        {/* {!isMobile && (
          <div style={{ flex: 2, minWidth: 0, height: '100%', display: 'flex', justifyContent: 'center' }}>
            <Flex >
              {isMobile && (
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={onToggleMenu}
                  style={{ fontSize: "18px", width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                />
              )}
              <Flex align="center" gap={8} style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
                <img
                  src="https://hocmai.vn/study/public/images/logo.png"
                  alt="Warehouse Logo"
                  width={36}
                  height={36}
                  style={{ objectFit: 'contain' }}
                />
                <span style={{ fontSize: 20, fontWeight: 600, color: '#1890ff' }}>STREAM</span>
              </Flex>
            </Flex>
            <Menu
              mode="horizontal"
              selectedKeys={[activeTopKey, activeSideKey]}
              items={headerItems}
              style={{
                borderBottom: 'none',
                height: 64,
                lineHeight: '64px',
                fontSize: 14,
                fontWeight: 500,
                minWidth: 400,
                justifyContent: 'center',
                flex: 1
              }}
            />
          </div>
        )} */}
        <div style={{ flex: 2, minWidth: 0, height: '100%', display: 'flex', justifyContent: 'start', alignItems: 'center', gap: isMobile ? 8 : 32 }}>
          <Flex align="center" >
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={onToggleMenu}
                style={{ fontSize: "18px", width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            )}
            <Flex align="center" gap={8} style={{ cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>
              <img
                src="https://hocmai.vn/study/public/images/logo.png"
                alt="Warehouse Logo"
                width={isPhone ? 30 : 36}
                height={isPhone ? 30 : 36}
                style={{ objectFit: 'contain' }}
              />
              {!isPhone && <span style={{ fontSize: isMobile ? 16 : 20, fontWeight: 600, color: '#1890ff' }}>STREAM</span>}
            </Flex>
          </Flex>
          {!isMobile && (
            <Menu
              mode="horizontal"
              selectedKeys={[activeTopKey, activeSideKey]}
              onClick={onHeaderMenuClick}
              items={headerItems}
              style={{
                borderBottom: 'none',
                height: 64,
                lineHeight: '64px',
                fontSize: 14,
                fontWeight: 500,
                minWidth: 400,
                justifyContent: 'start',
                flex: 1
              }}
            />
          )}
        </div>

        {/* Right Side: Warehouse Selector + Profile */}
        <Flex align="center" justify="flex-end" style={{ flex: 1, minWidth: 0 }}>
          <Space size="large">
            <Dropdown menu={{ items: profileMenuItems }} placement="bottomRight" arrow>
              <Flex align="center" gap={8} style={{ cursor: 'pointer' }}>
                <Avatar style={{ backgroundColor: '#fde3cf', color: '#f56a00', verticalAlign: 'middle' }}>
                  {username ? username.charAt(0).toUpperCase() : 'U'}
                </Avatar>
                {!isMobile && (
                  <span style={{ fontWeight: 500, fontSize: 14, color: '#262626' }}>
                    {username}
                  </span>
                )}
              </Flex>
            </Dropdown>
          </Space>
        </Flex>
      </Flex>
    </AntdHeader>
  );
};

export default Header;
