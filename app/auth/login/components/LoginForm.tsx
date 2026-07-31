import React from 'react';
import { Form, Input, Button, Checkbox, Typography, Segmented } from 'antd';
import { LockOutlined, UserOutlined, ShopOutlined, DesktopOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { showErrorMessage } from '@/ultils/message';
import { loginUser } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { protectedRoutes } from '@/constants/protectedRoutes';

const { Title, Text, Link } = Typography;

const LoginForm = () => {
    const router = useRouter()
    const { setUser, setAccessToken } = useAuthStore();
    const [loading, setLoading] = React.useState(false);

    const onFinish = async (values: any) => {
        setLoading(true);
        const { mode, ...loginData } = values;
        try {
            const response = await loginUser(loginData);
            const { accessToken, ...normalizedUser } = response.data;

            setUser(normalizedUser);
            setAccessToken(accessToken);

            localStorage.removeItem('logout');
            localStorage.setItem('lastLoginMode', mode);

            // Tìm route đầu tiên mà user có quyền (thường là dashboard)
            const firstAllowedRoute = protectedRoutes.find(route =>
                normalizedUser.permissions?.includes(route.permission)
            );

            console.log("🚀 ~ onFinish ~ firstAllowedRoute:", firstAllowedRoute);

            if (firstAllowedRoute) {
                router.push(firstAllowedRoute.path);
            } else {
                router.push('/dashboard'); // fallback
            }
        } catch (error) {
            console.log("🚀 ~ onFinish ~ error:", error)
            setLoading(false);
            showErrorMessage('Tên đăng nhập hoặc mật khẩu không đúng');
        }
    };

    const handleForgetPassword = () => {
        router.push('/auth/forgot-password');
    }

    return (
        <div style={{ maxWidth: 380, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ marginTop: 16 }}>Đăng nhập</Title>
                <Text>Chào mừng quay lại! Vui lòng nhập thông tin của bạn để đăng nhập.</Text>
            </div>
            <Form
                name="login_form"
                initialValues={{
                    rememberMe: true,
                    mode: typeof window !== 'undefined' ? localStorage.getItem('lastLoginMode') || 'admin' : 'admin'
                }}
                onFinish={onFinish}
                layout="vertical"
                size="large"
            >
                <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}>
                    <Input prefix={<UserOutlined />} placeholder="Tên đăng nhập" allowClear />
                </Form.Item>

                <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Vui lòng nhập mật khóa' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" allowClear />
                </Form.Item>

                <Form.Item>
                    <Form.Item name="rememberMe" valuePropName="checked" noStyle>
                        <Checkbox>Duy trì đăng nhập</Checkbox>
                    </Form.Item>
                    <Link style={{ float: 'right' }} onClick={handleForgetPassword}>Quên mật khẩu?</Link>
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                        Đăng nhập
                    </Button>
                </Form.Item>
            </Form>
        </div>
    );
};

export default LoginForm;
