import { useAuthStore } from "@/stores/authStore";

let isRefreshing = false;
let isHandlingAuthFailure = false;
let refreshPromise: Promise<string> | null = null;

const REFRESH_TOKEN_PATH = '/api/auth/refresh-token';
const LOGIN_PATH = '/api/auth/login';

const shouldTryRefreshToken = (url: string) =>
    !url.includes(LOGIN_PATH) && !url.includes(REFRESH_TOKEN_PATH);

const handleAuthFailure = (logout: () => void) => {
    if (isHandlingAuthFailure) return;
    isHandlingAuthFailure = true;
    logout();
};

// Hàm hỗ trợ tạo request

export const fetchInstance = async (
    url: string,
    options: RequestInit = {},
    responseType: 'json' | 'blob' = 'json'
) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const { accessToken, setAccessToken, logout } = useAuthStore.getState();

    try {
        let res = await makeRequest(url, options, accessToken, controller);

        if (res.status === 401 && shouldTryRefreshToken(url)) {
            if (!isRefreshing) {
                isRefreshing = true;
                refreshPromise = fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}${REFRESH_TOKEN_PATH}`, {
                    method: 'POST',
                    credentials: 'include',
                    signal: controller.signal,
                })
                    .then(async (res) => {
                        if (!res.ok) throw new Error('Session expired. Please login again.');
                        const { data } = await res.json();
                        const { accessToken: newAccessToken } = data;
                        setAccessToken(newAccessToken);
                        return newAccessToken;
                    })
                    .finally(() => {
                        isRefreshing = false;
                    });
            }

            try {
                const newToken = await refreshPromise;
                if (!newToken) throw new Error('Unable to refresh access token');
                res = await makeRequest(url, options, newToken, controller);
            } catch (refreshError) {
                handleAuthFailure(logout);
                throw refreshError;
            }
        }

        if (!res.ok) {
            await handleErrorResponse(res);
        }

        //  xử lý trả kết quả tùy theo kiểu mong muốn
        if (responseType === 'blob') {
            return await res.blob();
        }

        return await res.json();
    } catch (error) {
        handleFetchError(error);
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};


const makeRequest = async (
    url: string,
    options: RequestInit,
    token: string | null,
    controller: AbortController
) => {
    const isFormData = options.body instanceof FormData;
    const mergedHeaders = {
        ...(token && { Authorization: `Bearer ${token}` }),

        ...(options.headers || {}),
        ...(!isFormData && { 'Content-Type': 'application/json' }) // ✅ chỉ set nếu không phải FormData
    };

    return await fetch(url, {
        ...options,
        headers: mergedHeaders,
        signal: controller.signal,
        credentials: 'include'
    });
};

// Xử lý lỗi từ response
const handleErrorResponse = async (res: Response) => {
    const responseData = await res.json();
    const error = new Error(responseData?.message || `API Error: ${res.status}`);
    (error as any).status = res.status;
    (error as any).detail = responseData;
    throw error;
};

// Xử lý lỗi fetch
const handleFetchError = (error: any) => {
    if (error.name === 'AbortError') {
        throw new Error('Request timeout');
    }
    throw error;
};