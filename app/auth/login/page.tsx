'use client';
import React from 'react';
import LoginForm from './components/LoginForm';
import '@ant-design/v5-patch-for-react-19';
import AuthLayout from '@/components/layouts/AuthLayout';

const Page = () => {
    return (
        <AuthLayout>
            <LoginForm />
        </AuthLayout>
    );
};

export default Page;

