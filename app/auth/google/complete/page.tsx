'use client';

import { useEffect, useRef } from 'react';
import { Spin } from 'antd';
import { useRouter } from 'next/navigation';
import { restoreAccessToken } from '@/ultils/fetchInstance';
import { getMe } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { protectedRoutes } from '@/constants/protectedRoutes';

export default function GoogleLoginComplete() {
    const router = useRouter();
    const started = useRef(false);

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        const complete = async () => {
            try {
                useAuthStore.getState().clearAccessToken();
                await restoreAccessToken();
                const { data: user } = await getMe();
                useAuthStore.getState().setUser(user);
                localStorage.removeItem('logout');
                const route = protectedRoutes.find(route =>
                    user.permissions?.includes('*') || user.permissions?.includes(route.permission));
                router.replace(route?.path || '/403');
            } catch {
                router.replace('/auth/login?googleError=failed');
            }
        };
        void complete();
    }, [router]);

    return <div style={{ padding: 64, textAlign: 'center' }}><Spin tip="Đang hoàn tất đăng nhập Google..."><div style={{ minHeight: 80 }} /></Spin></div>;
}
