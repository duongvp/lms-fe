import { fetchInstance } from "@/ultils/fetchInstance";

const API_BASE_URL = `${process.env.NEXT_PUBLIC_LMS_API || process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:5000"}/api/package-courses`;

export interface PackageCourseOption {
    package_id: string;
    course_id: string;
    product_name?: string;
    course_name?: string;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedResponse: { expiresAt: number; value: any } | null = null;
let pendingRequest: Promise<any> | null = null;

export const getPackageCourses = (forceRefresh = false) => {
    if (!forceRefresh && cachedResponse && cachedResponse.expiresAt > Date.now()) {
        return Promise.resolve(cachedResponse.value);
    }
    if (!forceRefresh && pendingRequest) return pendingRequest;

    pendingRequest = fetchInstance(API_BASE_URL, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    }).then((response) => {
        cachedResponse = {
            value: response,
            expiresAt: Date.now() + CACHE_TTL_MS,
        };
        return response;
    }).finally(() => {
        pendingRequest = null;
    });

    return pendingRequest;
};

export const clearPackageCourseCache = () => {
    cachedResponse = null;
};
