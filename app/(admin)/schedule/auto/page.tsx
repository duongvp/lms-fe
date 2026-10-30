"use client";

import { Button, Result, message } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import AutoScheduleModal from "../components/Modal/AutoScheduleModal";
import { useLmsCache } from "@/hooks/useLmsQueries";

const AutoSchedulePage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshSchedules } = useLmsCache();
    const programCode = String(searchParams.get("program") || "").trim();
    const returnToParam = String(searchParams.get("returnTo") || "");
    const returnTo = returnToParam.startsWith("/schedule")
        ? returnToParam
        : (programCode ? `/schedule?program=${encodeURIComponent(programCode)}` : "/schedule");

    if (!programCode) {
        return (
            <Result
                status="warning"
                title="Chưa chọn Chương trình"
                subTitle="Quay lại Quản lý lịch học, chọn Chương trình trong bộ lọc rồi bấm Tạo lịch tự động."
                extra={<Button type="primary" onClick={() => router.replace(returnTo)}>Quay lại Quản lý lịch học</Button>}
            />
        );
    }

    return (
        <AutoScheduleModal
            open
            fullscreen
            programCode={programCode}
            onClose={() => router.replace(returnTo)}
            onSuccess={async () => {
                await refreshSchedules();
                message.success("Đã tạo lịch tự động");
            }}
        />
    );
};

export default AutoSchedulePage;
