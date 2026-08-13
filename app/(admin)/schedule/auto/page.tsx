"use client";

import { Alert, Button, Result, message } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import AutoScheduleModal from "../components/Modal/AutoScheduleModal";
import { useLmsCache } from "@/hooks/useLmsQueries";

const AutoSchedulePage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshSchedules } = useLmsCache();
    const programCode = String(searchParams.get("program") || "").trim();
    const returnToParam = String(searchParams.get("returnTo") || "");
    const returnTo = returnToParam.startsWith("/schedule") ? returnToParam : "/schedule";

    if (!programCode) {
        return (
            <Result
                status="warning"
                title="Chưa chọn Chương trình"
                subTitle="Quay lại Quản lý lịch học, chọn Chương trình trong bộ lọc rồi bấm Tạo lịch tự động."
                extra={<Button type="primary" onClick={() => router.push(returnTo)}>Quay lại Quản lý lịch học</Button>}
            />
        );
    }

    return (
        <>
            <Alert
                banner
                showIcon
                message={`Tạo lịch tự động cho Chương trình ${programCode}`}
                description="Bạn có thể cấu hình riêng lịch và nhân sự theo Block, sau đó tinh chỉnh từng lịch trước khi xem trước và xác nhận."
            />
            <AutoScheduleModal
                open
                fullscreen
                programCode={programCode}
                onClose={() => router.push(returnTo)}
                onSuccess={async () => {
                    await refreshSchedules();
                    message.success("Đã tạo lịch tự động");
                }}
            />
        </>
    );
};

export default AutoSchedulePage;
