'use client';
import React, { useEffect, useState } from 'react';
import { Result } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { protectedRoutes } from '@/constants/protectedRoutes';
import { useAuthStore } from '@/stores/authStore';

const Page403: React.FC = () => {
    const router = useRouter();
    const [redirectPath, setRedirectPath] = useState('/dashboard'); // fallback nếu không có quyền nào

    useEffect(() => {
        const permissions = useAuthStore.getState().user.permissions || [];
        const firstAllowed = protectedRoutes.find((route) =>
            permissions.includes(route.permission)
        );
        if (firstAllowed) {
            setRedirectPath(firstAllowed.path);
        }
    }, []);

    return (
        <Result
            status="403"
            title="403"
            subTitle="Bạn không có quyền truy cập trang này!"
            extra={
                <Link href={redirectPath}>
                    Quay về trang có quyền
                </Link>
            }
        />
    );
};

export default Page403;
