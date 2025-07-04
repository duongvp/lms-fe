import React from 'react';
import { Form, Input, Button, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { resetPassword } from '@/services/authService';
import { showErrorMessage, showSuccessMessage } from '@/ultils/message';

const { Title, Text, Link } = Typography;

interface ResetPasswordFormProps {
    resetToken: string
    handleLoginBack: () => void;
}

const ResetPasswordForm = ({ resetToken, handleLoginBack }: ResetPasswordFormProps) => {
    const [loading, setLoading] = React.useState(false);

    const onFinish = async (values: { newPassword: string; confirmPassword: string }) => {
        if (values.newPassword !== values.confirmPassword) {
            showErrorMessage('Mật khẩu không khớp');
            return;
        }

        setLoading(true);
        try {
            await resetPassword(resetToken, values.newPassword, values.confirmPassword);
            showSuccessMessage('Đặt lại mật khẩu thành công');
            handleLoginBack();
        } catch (error) {
            showErrorMessage('Đặt lại mật khẩu thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 380, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ marginTop: 16 }}>Đặt lại mật khẩu</Title>
                <Text>Vui lòng nhập mật khẩu mới cho tài khoản của bạn</Text>
            </div>
            <Form
                name="reset_password"
                onFinish={onFinish}
                layout="vertical"
                autoComplete="off"
            >
                <Form.Item
                    name="newPassword"
                    label="Mật khẩu mới"
                    rules={[
                        { required: true, message: 'Vui lòng nhập mật khẩu mới' },
                    ]}
                >
                    <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="Mật khẩu mới"
                    />
                </Form.Item>

                <Form.Item
                    name="confirmPassword"
                    label="Xác nhận mật khẩu"
                    dependencies={['newPassword']}
                    rules={[
                        { required: true, message: 'Vui lòng xác nhận mật khẩu' },
                        ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('newPassword') === value) {
                                    return Promise.resolve();
                                }
                                return Promise.reject('Mật khẩu không khớp');
                            },
                        }),
                    ]}
                >
                    <Input.Password
                        prefix={<LockOutlined />}
                        placeholder="Nhập lại mật khẩu"
                    />
                </Form.Item>

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        block
                        loading={loading}
                    >
                        Đặt lại mật khẩu
                    </Button>
                </Form.Item>
                <div style={{ textAlign: 'center' }}>
                    <Text>Quay lại trang <Link onClick={handleLoginBack}>Đăng nhập</Link></Text>
                </div>
            </Form>
        </div>
    );
};

export default ResetPasswordForm;