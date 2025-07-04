import { useAuthStore } from "@/stores/authStore";
import { handleLogout } from "@/ultils/auth";
import { EnvironmentOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from "@ant-design/icons";
import { Avatar, Button, Dropdown, Flex, Layout, Space, theme } from "antd";
import { MenuProps } from "antd/lib";
import { useRouter } from "next/navigation";
import React from "react";

const { Header: AntdHeader } = Layout;

interface HeaderProps {
  collapsed: boolean;
  toggle: () => void;
}

const Header: React.FC<HeaderProps> = ({ collapsed, toggle }) => {
  const { user } = useAuthStore();
  const { username, warehouseName } = user
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const router = useRouter()

  const logout = () => {
    handleLogout();
    router.push('/auth/login');
  }

  const items: MenuProps['items'] = [
    {
      key: 'profile',
      label: username,
      onClick: () => { }
    },
    {
      key: 'logout',
      label: 'Đăng xuất',
      onClick: () => { logout() }
    }
  ];

  return (
    <AntdHeader style={{ padding: 0, background: colorBgContainer }}>
      <Flex align="center" justify="space-between" style={{ width: "100%" }}>
        <Button
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => toggle()}
          style={{
            fontSize: "16px",
            width: 64,
            height: 64,
          }}
        />
        <Space style={{ marginRight: 24 }} size="middle">
          <Flex align="center" gap={4}>
            <EnvironmentOutlined />
            <span style={{ fontWeight: "normal" }}>{warehouseName}</span>
          </Flex>
          <Dropdown menu={{ items }} placement="bottomRight">
            <Avatar style={{ backgroundColor: '#fde3cf', color: '#f56a00' }}>
              {username ? username.charAt(0).toUpperCase() : 'U'}
            </Avatar>
          </Dropdown>
        </Space>
      </Flex>
    </AntdHeader>
  );
}

export default Header


