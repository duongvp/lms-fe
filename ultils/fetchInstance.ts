// // utils/fetchInstance.ts
// export const fetchInstance = async (url: string, options: RequestInit = {}) => {
//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout sau 10 giây


//     try {
//         const res = await fetch(url, {
//             ...options,
//             signal: controller.signal,
//             credentials: 'include'
//         });
//         if (!res.ok) {
//             const responseData = await res.json();
//             const error = new Error(responseData?.message || `API Error: ${res.status}`);
//             (error as any).status = res.status;
//             (error as any).detail = responseData;
//             throw error;
//         }

//         return await res.json();
//     } catch (error: any) {
//         if (error.name === 'AbortError') {
//             throw new Error('Request timeout');
//         }
//         throw error;
//     } finally {
//         clearTimeout(timeoutId); // Xóa timeout khi có kết quả
//     }
// };


import { useAuthStore } from "@/stores/authStore";

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

// export const fetchInstance = async (url: string, options: RequestInit = {}) => {
//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), 10000);
//     const { accessToken, setAccessToken, logout } = useAuthStore.getState();

//     try {
//         console.log("url", url, accessToken);
//         let res = await makeRequest(url, options, accessToken, controller);

//         // Nếu access token hết hạn (401)
//         if (res.status === 401) {
//             console.log('Access token hết hạn. Đang cố gắng làm mới...');
//             // Nếu chưa có refreshPromise nào đang chạy
//             if (!isRefreshing) {
//                 isRefreshing = true;
//                 refreshPromise = fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/auth/refresh-token`, {
//                     method: 'POST',
//                     credentials: 'include',
//                     signal: controller.signal,
//                 })
//                     .then(async (res) => {
//                         if (!res.ok) throw new Error('Session expired. Please login again.');
//                         const { data } = await res.json();
//                         const { accessToken: newAccessToken } = data;
//                         setAccessToken(newAccessToken);
//                         return newAccessToken;
//                     })
//                     .catch((error) => {
//                         logout();
//                     })
//                     .finally(() => {
//                         isRefreshing = false;
//                     });
//             }

//             // Chờ token mới
//             const newToken = await refreshPromise;

//             // Retry lại API với token mới
//             res = await makeRequest(url, options, newToken, controller);
//         }

//         if (!res.ok) {
//             await handleErrorResponse(res);
//         }

//         return await res.json();
//     } catch (error) {
//         handleFetchError(error);
//         throw error;
//     } finally {
//         clearTimeout(timeoutId);
//     }
// };

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

        if (res.status === 401) {
            if (!isRefreshing) {
                isRefreshing = true;
                refreshPromise = fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/auth/refresh-token`, {
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
                    .catch(() => logout())
                    .finally(() => {
                        isRefreshing = false;
                    });
            }

            const newToken = await refreshPromise;
            res = await makeRequest(url, options, newToken, controller);
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
    console.log("toksadsadasden:", token);
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