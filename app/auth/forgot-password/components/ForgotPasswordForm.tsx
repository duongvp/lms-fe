import React from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { requestPasswordReset } from '@/services/authService';
import { showErrorMessage } from '@/ultils/message';

const { Title, Text, Link } = Typography;

interface ForgotPasswordFormProps {
    setStep: (step: number) => void;
    handleLoginBack: () => void
    setEmail: (email: string) => void;
}

const ForgotPasswordForm = ({ setStep, setEmail, handleLoginBack }: ForgotPasswordFormProps) => {
    const [loading, setLoading] = React.useState(false);

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            await requestPasswordReset(values.email);
            setEmail(values.email);
            setStep(2)
        } catch (error: any) {
            setLoading(false);
            showErrorMessage(error.message || 'Gửi OTP thất bại');
        }
    };

    return (
        <div style={{ maxWidth: 380, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ marginTop: 16 }}>Quên mật khẩu</Title>
                <Text>Vui lòng nhập email đăng nhập để nhận liên kết khôi phục mật khẩu</Text>
            </div>
            <Form
                name="forgot_password_form"
                onFinish={onFinish}
                layout="vertical"
            >
                <Form.Item
                    name="email"
                    label="Email đăng nhập"
                    rules={[
                        { required: true, message: 'Vui lòng nhập email' },
                        { type: 'email', message: 'Email không hợp lệ' }
                    ]}
                >
                    <Input prefix={<MailOutlined />} placeholder="Email" allowClear />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" block loading={loading}>
                        Gửi yêu cầu
                    </Button>
                </Form.Item>

                <div style={{ textAlign: 'center' }}>
                    <Text>Quay lại trang <Link onClick={handleLoginBack}>Đăng nhập</Link></Text>
                </div>
            </Form>
        </div>
    );
};

export default ForgotPasswordForm;