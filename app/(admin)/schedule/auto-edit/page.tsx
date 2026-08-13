"use client";

import { Alert, Button, Result, message } from "antd";
import { useRouter, useSearchParams } from "next/navigation";
import BulkEditModal from "../components/Modal/BulkEditModal";
import { useLmsCache } from "@/hooks/useLmsQueries";

const AutoEditSchedulePage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { refreshSchedules } = useLmsCache();
    const requestedIds = String(searchParams.get("ids") || "").split(",").map((id) => id.trim()).filter(Boolean);
    const program = String(searchParams.get("program") || "").trim();
    const returnToParam = String(searchParams.get("returnTo") || "");
    const returnTo = returnToParam.startsWith("/schedule") ? returnToParam : (program ? `/schedule?program=${encodeURIComponent(program)}` : "/schedule");

    const backToSchedule = () => router.push(returnTo);

    if (!requestedIds.length) {
        return (
            <Result
                status="warning"
                title="Không còn danh sách lịch cần chỉnh sửa"
                subTitle="Hãy quay lại Quản lý lịch học, chọn các lịch cần chỉnh sửa rồi bấm Sửa hàng loạt."
                extra={<Button type="primary" onClick={backToSchedule}>Quay lại Quản lý lịch học</Button>}
            />
        );
    }

    return (
        <>
            <Alert
                banner
                showIcon
                message={`Chỉnh sửa tự động ${requestedIds.length} lịch học${program ? ` · ${program}` : ""}`}
                description="Thiết lập chung hoặc riêng theo từng lịch, xem trước rồi xác nhận cập nhật."
            />
            <BulkEditModal
                open
                fullscreen
                requestedIds={requestedIds}
                onClose={backToSchedule}
                onSuccess={async () => {
                    await refreshSchedules();
                    message.success("Đã cập nhật lịch học");
                    backToSchedule();
                }}
            />
        </>
    );
};

export default AutoEditSchedulePage;
