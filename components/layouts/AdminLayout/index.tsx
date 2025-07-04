"use client"
import React, { useState, useEffect } from 'react';
import { ConfigProvider, Layout, theme, Spin } from 'antd';
import Header from './Header';
import SideMenu from './SideMenu';
import '@ant-design/v5-patch-for-react-19';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from "next/navigation";
import { getMe } from '@/services/authService';
// import dynamic from 'next/dynamic';
// const SideMenu = dynamic(() => import('./SideMenu'), {
//   ssr: false,
// });

const { Content } = Layout;

interface AdminLayoutProps {
  children: React.ReactNode;
}

dayjs.locale('vi');

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children
}: AdminLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const clearUser = useAuthStore(state => state.clearUser);

  const router = useRouter();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const toggle = () => {
    setCollapsed(!collapsed);
  };

  // useEffect(() => {
  //   const handleStorage = (event: StorageEvent) => {
  //     if (event.key === 'logout') {
  //       clearUser();
  //       localStorage.removeItem('auth-storage');
  //       router.push('/auth/login');
  //     }
  //   }

  //   window.addEventListener('storage', handleStorage);
  //   return () => window.removeEventListener('storage', handleStorage);
  // }, []);

  // useEffect(() => {
  //   const handleStorage = async (event: StorageEvent) => {
  //     if (event.key === 'login') {
  //       // Tự fetch lại thông tin người dùng
  //       try {
  //         const data = await getMe();
  //         console.log("🚀 ~ handleStorage ~ data:", data)
  //       } catch (error) {
  //         router.push('/auth/login');
  //       }
  //     }
  //     if (event.key === 'logout') {
  //       router.push('/auth/login');
  //     }
  //   }

  //   window.addEventListener('storage', handleStorage);
  //   return () => window.removeEventListener('storage', handleStorage);
  // }, []);

  useEffect(() => {
    const handleStorage = async (event: StorageEvent) => {
      if (event.key === 'login') {
        // Tab khác vừa login → cần reload accessToken từ localStorage persist
        const stored = localStorage.getItem('auth-storage');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const token = parsed?.state?.accessToken;
            if (token) {
              useAuthStore.getState().setAccessToken(token); // ✅ cập nhật lại accessToken trong Zustand
              const { data } = await getMe(); // Tự fetch lại user info
              useAuthStore.getState().setUser(data);
            }
          } catch (error) {
            console.error('Error parsing auth-storage or fetching me:', error);
            router.push('/auth/login');
          }
        }
      }

      if (event.key === 'logout') {
        useAuthStore.getState().clearUser();
        useAuthStore.getState().clearAccessToken();
        localStorage.removeItem('auth-storage');
        router.push('/auth/login');
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <Spin size="large" fullscreen />;

  return (
    <ConfigProvider locale={viVN}>
      <Layout style={{ minHeight: '100vh' }}>
        <SideMenu collapsed={collapsed} toggle={toggle} />
        <Layout>
          <Header collapsed={collapsed} toggle={toggle} />
          <Content
            style={{
              minHeight: 280,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}
            className="site-layout-background"
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default AdminLayout;