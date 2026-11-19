import React from 'react';
import { Form, Button, Checkbox, Typography, Alert } from 'antd';
// Tạm ẩn đăng nhập tài khoản/mật khẩu. Giữ code để bật lại khi cần.
// import { Input } from 'antd';
import { GoogleOutlined, ReadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import styles from './LoginForm.module.css';
// import { LockOutlined, UserOutlined } from '@ant-design/icons';
/* Tạm tắt các dependency của đăng nhập mật khẩu.
import { useRouter } from 'next/navigation';
import { showErrorMessage } from '@/ultils/message';
import { loginUser } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { protectedRoutes } from '@/constants/protectedRoutes';
*/

const { Title, Text } = Typography;

const LoginForm = () => {
    const [loading, setLoading] = React.useState(false);
    const [form] = Form.useForm();
    const [googleError, setGoogleError] = React.useState('');
    React.useEffect(() => {
        // Back from Google may restore the page from the browser's bfcache,
        // including the loading state set before leaving the page.
        const resetLoading = () => setLoading(false);
        window.addEventListener('pageshow', resetLoading);
        return () => window.removeEventListener('pageshow', resetLoading);
    }, []);
    React.useEffect(() => {
        const error = new URLSearchParams(window.location.search).get('googleError');
        if (error) setGoogleError(({
            unavailable: 'Đăng nhập Google chưa được cấu hình hoặc đang không khả dụng.',
            access: 'Email Google chưa được gắn với một tài khoản LMS có vai trò hoạt động. Vui lòng liên hệ quản trị viên.',
            email: 'Vui lòng sử dụng tài khoản Gmail hoặc Google Workspace đã xác minh.',
        } as Record<string, string>)[error] || 'Đăng nhập Google không thành công hoặc đã hết hạn. Vui lòng thử lại.');
    }, []);

    /* Tạm tắt xử lý đăng nhập mật khẩu và quên mật khẩu.
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
                normalizedUser.permissions?.includes('*')
                || normalizedUser.permissions?.includes(route.permission)
            );

            console.log("🚀 ~ onFinish ~ firstAllowedRoute:", firstAllowedRoute);

            if (firstAllowedRoute) {
                router.replace(firstAllowedRoute.path);
            } else {
                router.replace('/403');
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
    */

    return (
        <div className={styles.form}>
            <div className={styles.brand}>
                <span className={styles.brandIcon} aria-hidden="true"><ReadOutlined /></span>
                <div>
                    <div className={styles.brandName}>HOCMAI</div>
                    <div className={styles.brandCaption}>Hệ thống quản lý lớp học</div>
                </div>
            </div>
            <div className={styles.heading}>
                <Title level={2}>Chào mừng trở lại</Title>
                <Text className={styles.description}>Đăng nhập bằng tài khoản Google đã được cấp quyền để tiếp tục làm việc.</Text>
            </div>
            <Form
                form={form}
                name="login_form"
                initialValues={{
                    rememberMe: true
                }}
                layout="vertical"
                size="large"
            >
                {/* Tạm ẩn đăng nhập tài khoản/mật khẩu.
                <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}>
                    <Input prefix={<UserOutlined />} placeholder="Tên đăng nhập" allowClear />
                </Form.Item>

                <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Vui lòng nhập mật khóa' }]}>
                    <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" allowClear />
                </Form.Item>
                */}

                <Form.Item className={styles.remember}>
                    <Form.Item name="rememberMe" valuePropName="checked" noStyle>
                        <Checkbox disabled={loading}>Duy trì đăng nhập</Checkbox>
                    </Form.Item>
                    {/* <Link style={{ float: 'right' }} onClick={handleForgetPassword}>Quên mật khẩu?</Link> */}
                </Form.Item>

                {/*
                <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                        Đăng nhập
                    </Button>
                </Form.Item>
                */}
            </Form>
            {googleError && <Alert type="error" showIcon message={googleError} style={{ marginBottom: 16 }} />}
            <Button className={styles.googleButton} type="primary" block size="large" icon={<GoogleOutlined />} loading={loading} onClick={() => {
                setLoading(true);
                window.location.assign(`/api/auth/google?rememberMe=${form.getFieldValue('rememberMe') === true}`);
            }}>
                {loading ? 'Đang chuyển đến Google...' : 'Đăng nhập bằng Google'}
            </Button>
            <div className={styles.footer}>
                <SafetyCertificateOutlined aria-hidden="true" />
                <span>Dành cho tài khoản được cấp quyền truy cập</span>
            </div>
        </div>
    );
};

export default LoginForm;
