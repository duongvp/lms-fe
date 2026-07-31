// services/userService.ts

import { fetchInstance } from "@/ultils/fetchInstance";
import { UserApiResponse } from "./userService";
// Auth goes through Next.js so the HttpOnly refresh cookie belongs to the
// frontend origin and is visible to both middleware and browser requests.
const API_BASE_URL = '/api/auth';

export const registerUser = async (payload: UserApiResponse) => {
    const url = `${API_BASE_URL}/register`;
    const options = {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
            'Content-Type': 'application/json',
        },
    };
    return await fetchInstance(url, options);
}

export const loginUser = async (payload: UserApiResponse) => {
    const url = `${API_BASE_URL}/login`;
    const options = {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
            'Content-Type': 'application/json',
        },
    };
    return await fetchInstance(url, options);
}

export const getMe = async () => {
    const url = `${API_BASE_URL}/me`;
    const options = {
        method: 'GET',
    };
    return await fetchInstance(url, options);
}

export const logoutUser = async () => {
    const url = `${API_BASE_URL}/logout`;
    return await fetchInstance(url, { method: 'POST' });
}

/**
 * Gửi yêu cầu quên mật khẩu (bước 1)
 * @param email Email đăng ký tài khoản
 */
export const requestPasswordReset = async (email: string) => {
    const url = `${API_BASE_URL}/forgot-password`;
    const options = {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: {
            'Content-Type': 'application/json',
        },
    };
    return await fetchInstance(url, options);
};


/**
 * Xác thực OTP (bước 2)
 * @param email Email đã đăng ký
 * @param otp Mã OTP nhận được qua email
 */
export const verifyResetOTP = async (email: string, otp: string) => {
    const url = `${API_BASE_URL}/verify-reset-otp`;
    const options = {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
        headers: {
            'Content-Type': 'application/json',
        },
    };
    return await fetchInstance(url, options);
};

/**
 * Đặt lại mật khẩu mới (bước 3)
 * @param resetToken Token nhận được sau khi xác thực OTP
 * @param newPassword Mật khẩu mới
 * @param confirmPassword Xác nhận mật khẩu mới
 */
export const resetPassword = async (
    resetToken: string,
    newPassword: string,
    confirmPassword: string
) => {
    const url = `${API_BASE_URL}/reset-password`;
    const options = {
        method: 'POST',
        body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
        headers: {
            'Content-Type': 'application/json',
        },
    };
    return await fetchInstance(url, options);
};
