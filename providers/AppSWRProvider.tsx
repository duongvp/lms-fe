"use client";

import { SWRConfig } from "swr";

const shouldRetry = (error: any) => {
    const status = Number(error?.status ?? error?.detail?.status);
    return ![400, 401, 403, 404].includes(status);
};

export default function AppSWRProvider({ children }: { children: React.ReactNode }) {
    return (
        <SWRConfig
            value={{
                dedupingInterval: 10_000,
                focusThrottleInterval: 30_000,
                revalidateOnFocus: false,
                revalidateOnReconnect: true,
                shouldRetryOnError: shouldRetry,
                errorRetryCount: 2,
                keepPreviousData: true,
            }}
        >
            {children}
        </SWRConfig>
    );
}
