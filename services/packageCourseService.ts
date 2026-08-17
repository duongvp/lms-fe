import { fetchInstance } from "@/ultils/fetchInstance";

const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:5000"}/api/package-courses`;

export interface PackageCourseOption {
    package_id: string;
    course_id: string;
    product_name?: string;
    course_name?: string;
}

export const getPackageCourses = () =>
    fetchInstance(API_BASE_URL, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });
