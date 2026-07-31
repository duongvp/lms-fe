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
import { usePathname } from "next/navigation";
import { getMe } from "@/services/authService";
import { protectedRoutes } from "@/constants/protectedRoutes";

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
  const [authReady, setAuthReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const screens = useBreakpoint();
  const user = useAuthStore((state) => state.user);

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  useEffect(() => {
    const redirectToLogin = () => {
      if (window.location.pathname !== '/auth/login') {
        router.replace('/auth/login');
      }
    };

    const handleStorage = async (event: StorageEvent) => {
      if (event.key === 'logout') {
        useAuthStore.getState().clearUser();
        useAuthStore.getState().clearAccessToken();
        localStorage.removeItem('auth-storage');
        redirectToLogin();
      }
    };

    const handleAuthLogout = () => {
      redirectToLogin();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('auth:logout', handleAuthLogout);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('auth:logout', handleAuthLogout);
    };
  }, [router]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    let active = true;

    const verifySession = async () => {
      try {
        const response: any = await getMe();
        if (!active) return;
        const user = response?.data;
        useAuthStore.getState().setUser(user);
        setAuthReady(true);
      } catch (error: any) {
        if (!active) return;
        if (error?.status === 401 || error?.status === 403) {
          useAuthStore.getState().logout();
          router.replace('/auth/login');
          return;
        }
        setAuthReady(true);
      }
    };

    verifySession();
    return () => {
      active = false;
    };
  }, [isClient, router]);

  useEffect(() => {
    // Logout clears the user before navigation completes. Do not interpret that
    // short unauthenticated state as a permission failure, otherwise the /403
    // redirect races with the intended /auth/login redirect.
    if (!authReady || user.userId < 0) return;

    const matched = protectedRoutes
      .filter((route) => pathname.startsWith(route.path))
      .sort((a, b) => b.path.length - a.path.length)[0];

    if (
      matched
      && !user?.permissions?.includes('*')
      && !user?.permissions?.includes(matched.permission)
    ) {
      router.replace('/403');
    }
  }, [authReady, pathname, router, user.userId, user.permissions]);

  if (!isClient || !authReady) return <Spin size="large" fullscreen />;

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
