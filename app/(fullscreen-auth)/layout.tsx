"use client"
import React, { useState, useEffect } from 'react';
import { ConfigProvider, Layout, Spin } from 'antd';
import '@ant-design/v5-patch-for-react-19';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from "next/navigation";
import { getMe } from '@/services/authService';

const { Content } = Layout;

dayjs.locale('vi');

interface FullscreenAuthLayoutProps {
  children: React.ReactNode;
}

const FullscreenAuthLayout: React.FC<FullscreenAuthLayoutProps> = ({
  children
}: FullscreenAuthLayoutProps) => {
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

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

  return (
    <ConfigProvider locale={viVN}>
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ background: "#fff" }}>
          {children}
        </Content>
      </Layout>
    </ConfigProvider>
  );
};

export default FullscreenAuthLayout;
