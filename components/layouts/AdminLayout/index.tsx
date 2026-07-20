"use client"
import React, { useState, useEffect } from 'react';
import { ConfigProvider, Layout, Spin, Grid } from 'antd';
import Header from './Header';
import SideMenu from './SideMenu';
import '@ant-design/v5-patch-for-react-19';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from "next/navigation";
import { getMe } from '@/services/authService';

const { Content } = Layout;
const { useBreakpoint } = Grid;

interface AdminLayoutProps {
  children: React.ReactNode;
}

dayjs.locale('vi');

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children
}: AdminLayoutProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const screens = useBreakpoint();

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  useEffect(() => {
    const handleStorage = async (event: StorageEvent) => {
      if (event.key === 'login') {
        const stored = localStorage.getItem('auth-storage');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const token = parsed?.state?.accessToken;
            if (token) {
              useAuthStore.getState().setAccessToken(token);
              const { data } = await getMe();
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
  }, [router]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return <Spin size="large" fullscreen />;

  const isMobile = screens && !screens.xl;
  const layoutPadding = isMobile ? 12 : 16;

  return (
    <ConfigProvider locale={viVN}>
      <Layout style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f6f8' }}>
        {/* Sticky top Header */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            background: '#ffffff',
          }}
        >
          <Header onToggleMenu={toggleDrawer} />
        </div>

        {/* Layout Body Container */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          flex: 1,
          overflow: 'hidden',
          padding: layoutPadding,
          gap: layoutPadding,
          background: '#f5f6f8'
        }}>
          <SideMenu drawerOpen={drawerOpen} onCloseDrawer={closeDrawer} />

          <Content
            style={{
              flex: 1,
              background: '#ffffff',
              borderRadius: 12,
              padding: isMobile ? 12 : 24,
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
              overflowY: 'auto',
              height: '100%'
            }}
          >
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, width: '100%' }}>
                {children}
              </div>
            </div>
          </Content>
        </div>
      </Layout>
    </ConfigProvider>
  );
};

export default AdminLayout;