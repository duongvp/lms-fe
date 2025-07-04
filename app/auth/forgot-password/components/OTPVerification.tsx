import { Input, Button, Typography, Space, message } from 'antd';
import { useRef, useState } from 'react';

import { OTPRef } from 'antd/es/input/OTP';
import { verifyResetOTP } from '@/services/authService';
import { showErrorMessage, showSuccessMessage } from '@/ultils/message';

const { Title, Text, Link } = Typography;

interface OTPVerificationProps {
    email: string;
    setStep: (step: number) => void;
    handleLoginBack: () => void;
    setResetToken: (token: string) => void;
}

const OTPVerification = ({ email, setStep, handleLoginBack, setResetToken }: OTPVerificationProps) => {
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    const otpRef = useRef<OTPRef>(null);

    const verifyOTP = async () => {
        try {
            setLoading(true);
            const { data } = await verifyResetOTP(email, otp); // Giả lập gọi API xác thực OTP
            const { resetToken } = data;
            setResetToken(resetToken);
            showSuccessMessage('Xác thực OTP thành công');
            setStep(3);
        } catch (error: any) {
            showErrorMessage(error.message || 'Mã OTP không hợp lệ');
            setOtp('');
            setTimeout(() => {
                otpRef.current?.focus();
            }, 0);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 380, margin: '0 auto' }}>
            <Title level={4} style={{ marginTop: 16 }}>Xác thực OTP</Title>
            <Text >Nhập mã OTP gửi đến <strong>{email}</strong></Text>

            {/* Bọc trong form */}
            <form
                onSubmit={(e) => {
                    e.preventDefault(); // tránh reload trang
                    if (otp.length === 6 && !loading) {
                        verifyOTP();
                    }
                }}
            >
                <Space direction="vertical" style={{ width: '100%' }}>
                    <Input.OTP
                        ref={otpRef}
                        length={6}
                        value={otp}
                        onChange={setOtp}
                        autoFocus
                        style={{ margin: '16px 0' }}
                    />

                    <Button
                        type="primary"
                        htmlType="submit" // để nút nhận sự kiện Enter
                        loading={loading}
                        disabled={otp.length !== 6}
                    >
                        Xác thực
                    </Button>
                </Space>
            </form>
            <div style={{ textAlign: 'center' }}>
                <Text>Quay lại trang <Link onClick={handleLoginBack}>Đăng nhập</Link></Text>
            </div>
        </div>
    );
};

export default OTPVerification;
