'use client';
import ForgotPasswordForm from "./components/ForgotPasswordForm";
import { useState } from "react";
import ResetPasswordForm from "./components/ResetPasswordForm";
import OTPVerification from "./components/OTPVerification";
import { useRouter } from "next/navigation";
import '@ant-design/v5-patch-for-react-19';
import AuthLayout from "@/components/layouts/AuthLayout";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [resetToken, setResetToken] = useState('');

    const handleLoginBack = () => {
        router.push('/auth/login');
    }

    return (
        <AuthLayout>
            {step === 1 && (
                <ForgotPasswordForm setStep={setStep} setEmail={setEmail} handleLoginBack={handleLoginBack} />
            )}
            {step === 2 && (
                <OTPVerification
                    email={email}
                    setStep={setStep}
                    handleLoginBack={handleLoginBack}
                    setResetToken={setResetToken}
                />
            )}
            {step === 3 && <ResetPasswordForm resetToken={resetToken} handleLoginBack={handleLoginBack} />}
        </AuthLayout>
    );
}
