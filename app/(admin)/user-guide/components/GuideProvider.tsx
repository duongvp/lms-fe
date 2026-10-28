"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Alert, Button, Skeleton } from 'antd';
import { useAuthStore } from '@/stores/authStore';
import { userGuideService, type GuideData } from '@/services/userGuideService';

interface GuideContextValue {
    data: GuideData;
    canManage: boolean;
    readable: GuideData['articles'];
    update: (data: GuideData) => void;
}

const GuideContext = createContext<GuideContextValue | null>(null);

function GuideSession({ children }: { children: ReactNode }) {
    const user = useAuthStore(s => s.user);
    const [data, setData] = useState<GuideData | null>(null);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const canManage = user.permissions.includes('*');

    useEffect(() => {
        let active = true;
        setError(false);
        setData(null);
        userGuideService.load().then(value => {
            if (active) setData(value);
        }).catch(() => { if (active) setError(true); });
        return () => { active = false; };
    }, [attempt]);

    const update = useCallback((next: GuideData) => {
        if (canManage) setData(next);
    }, [canManage]);

    if (error) return <Alert type="error" showIcon message="Chưa tải được hướng dẫn" description="Vui lòng thử lại để tiếp tục tra cứu tài liệu." action={<Button onClick={() => setAttempt(v => v + 1)}>Thử lại</Button>} />;
    if (!data) return <div aria-label="Đang tải hướng dẫn"><Skeleton active paragraph={{ rows: 5 }} /><Skeleton active paragraph={{ rows: 4 }} /></div>;

    const readable = data.articles.filter(a => a.status === 'published' && (
        !a.requiredPermission || user.permissions.includes('*') || user.permissions.includes(a.requiredPermission)
    ));

    return <GuideContext.Provider value={{ data, canManage, readable, update }}>{children}</GuideContext.Provider>;
}

export function GuideProvider({ children }: { children: ReactNode }) {
    const userId = useAuthStore(s => s.user.userId);
    // A fresh demo session per account; no storage, backend writes or cross-account state.
    if (userId < 0) return null;
    return <GuideSession key={userId}>{children}</GuideSession>;
}

export function useGuides() {
    const context = useContext(GuideContext);
    if (!context) throw new Error('GuideProvider is required');
    return context;
}
