import { useAuthStore } from "@/stores/authStore";

let isHandlingAuthFailure = false;
let refreshPromise: Promise<string> | null = null;

const REFRESH_TOKEN_PATH = '/api/auth/refresh-token';
const LOGIN_PATH = '/api/auth/login';
const REQUEST_TIMEOUT_MS = 10000;
const REFRESH_TIMEOUT_MS = 15000;

class AuthSessionExpiredError extends Error {
    constructor(message = 'Session expired. Please login again.') {
        super(message);
        this.name = 'AuthSessionExpiredError';
    }
}

const shouldTryRefreshToken = (url: string) =>
    !url.includes(LOGIN_PATH) && !url.includes(REFRESH_TOKEN_PATH);

const handleAuthFailure = (logout: () => void) => {
    if (isHandlingAuthFailure) return;
    isHandlingAuthFailure = true;
    logout();
};

const isAuthSessionExpiredError = (error: unknown) =>
    error instanceof AuthSessionExpiredError;

const refreshAccessToken = (setAccessToken: (token: string | null) => void) => {
    if (!refreshPromise) {
        const refreshController = new AbortController();
        const refreshTimeoutId = setTimeout(() => refreshController.abort(), REFRESH_TIMEOUT_MS);

        refreshPromise = fetch(REFRESH_TOKEN_PATH, {
            method: 'POST',
            credentials: 'include',
            signal: refreshController.signal,
        })
            .then(async (res) => {
                if (res.status === 401 || res.status === 403) {
                    throw new AuthSessionExpiredError();
                }
                if (!res.ok) {
                    const error = new Error(`Unable to refresh access token: ${res.status}`);
                    (error as any).status = res.status;
                    throw error;
                }
                const { data } = await res.json();
                const { accessToken: newAccessToken } = data;
                if (!newAccessToken) throw new Error('Unable to refresh access token');
                setAccessToken(newAccessToken);
                isHandlingAuthFailure = false;
                return newAccessToken;
            })
            .catch((error) => {
                if (error?.name === 'AbortError') {
                    throw new Error('Refresh token request timeout');
                }
                throw error;
            })
            .finally(() => {
                clearTimeout(refreshTimeoutId);
                refreshPromise = null;
            });
    }

    return refreshPromise;
};

// Hàm hỗ trợ tạo request

export const fetchInstance = async (
    url: string,
    options: RequestInit = {},
    responseType: 'json' | 'blob' = 'json',
    timeoutMs = REQUEST_TIMEOUT_MS
) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const { accessToken, setAccessToken, logout } = useAuthStore.getState();
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const method = options.method || 'GET';
    let requestFailed = false;

    try {
        let res = await makeRequest(url, options, accessToken, controller);

        if (res.status === 401 && shouldTryRefreshToken(url)) {
            try {
                const newToken = await refreshAccessToken(setAccessToken);
                res = await makeRequest(url, options, newToken, controller);
            } catch (refreshError) {
                if (isAuthSessionExpiredError(refreshError)) {
                    handleAuthFailure(logout);
                }
                throw refreshError;
            }
        }

        if (!res.ok) {
            await handleErrorResponse(res);
        }

        if (url.includes(LOGIN_PATH)) {
            isHandlingAuthFailure = false;
        }

        //  xử lý trả kết quả tùy theo kiểu mong muốn
        if (responseType === 'blob') {
            return await res.blob();
        }

        return await res.json();
    } catch (error) {
        requestFailed = true;
        logSlowRequest(url, method, startedAt, error);
        handleFetchError(error);
        throw error;
    } finally {
        if (!requestFailed) {
            logSlowRequest(url, method, startedAt);
        }
        clearTimeout(timeoutId);
    }
};

const logSlowRequest = (
    url: string,
    method: string,
    startedAt: number,
    error?: unknown
) => {
    if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return;

    const durationMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt);
    if (!error && durationMs < 1000) return;

    const parsedUrl = (() => {
        try {
            const parsed = new URL(url);
            return `${parsed.pathname}${parsed.search}`;
        } catch {
            return url;
        }
    })();

    const message = `[API ${error ? 'error' : 'slow'}] ${method} ${parsedUrl} ${durationMs}ms`;
    if (error) {
        console.warn(message, error);
        return;
    }
    console.warn(message);
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
