// src/services/dashboardService.ts
import { fetchInstance } from "@/ultils/fetchInstance";
import dayjs from "dayjs";

const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/dashboard`;

export interface RevenueStats {
    dailyRevenue: number;
    weeklyRevenue: number;
    monthlyRevenue: number;
    revenueChanges: {
        daily: string
        weekly: string
        monthly: string
    };
}

export interface OrderStats {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
}

export interface ReturnStats {
    totalReturns: number;
}
export interface revenueChartData {
    date: string;
    revenue: number;
}

export interface OverviewResponse {
    revenueStats: RevenueStats;
    orderStats: OrderStats;
    returnStats: ReturnStats;
}

/**
 * Lấy dữ liệu tổng quan dashboard
 * @param timeRange Khoảng thời gian ('day', 'week', 'month')
 * @param date Ngày cụ thể (optional)
 * @param warehouseId ID kho hàng (optional)
 */
export const getDashboardOverview = async (
    warehouseId?: number
): Promise<OverviewResponse> => {
    const params = new URLSearchParams();

    if (warehouseId) {
        params.append('warehouseId', warehouseId.toString());
    }

    return await fetchInstance(`${API_BASE_URL}/overview?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
};


export const getRevenueChartOverView = async (
    timeRange: string,
    date?: dayjs.Dayjs,
    warehouseId?: number
): Promise<revenueChartData[]> => {
    const params = new URLSearchParams();
    params.append('timeRange', timeRange);

    if (date) {
        params.append('date', date.format('YYYY-MM-DD'));
    }

    if (warehouseId) {
        params.append('warehouseId', warehouseId.toString());
    }

    return await fetchInstance(`${API_BASE_URL}/overview/chart?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
};