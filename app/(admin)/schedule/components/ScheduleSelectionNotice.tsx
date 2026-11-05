"use client";

import { memo } from "react";
import { Alert, Button, Spin } from "antd";
import { InfoCircleFilled } from "@ant-design/icons";
import { useSelectionKeys, type ScheduleSelectionStore } from "./ScheduleSelectionCheckbox";

// Subscribe here instead of waiting for the page's deferred table render.
const ScheduleSelectionNotice = memo(function ScheduleSelectionNotice({ store, desktop, busy, loaded, total, filteredTotal, onClear }: {
    store: ScheduleSelectionStore;
    desktop: boolean;
    busy: boolean;
    loaded: number;
    total: number;
    filteredTotal?: number;
    onClear: () => void;
}) {
    const keys = useSelectionKeys(store);
    if (!busy && keys.length === 0) return null;

    const text = busy
        ? `Đang chọn tất cả lịch học · Đã tải ${Math.min(loaded, total)}/${total} lịch`
        : filteredTotal !== undefined
            ? `Đã chọn ${keys.length}/${filteredTotal} lịch học đang hiển thị sau khi lọc`
            : `Đã chọn ${keys.length} lịch học`;

    if (!desktop) return <Alert
        style={{ marginTop: 8, marginBottom: 12 }}
        type="info"
        showIcon
        icon={busy ? <Spin size="small" /> : undefined}
        message={text}
        description={busy ? "Các thao tác hàng loạt sẽ sẵn sàng khi chọn xong." : undefined}
        action={<Button size="small" onClick={onClear}>Hủy chọn</Button>}
        role="status"
    />;

    return <div role="status" aria-live="polite" style={{ flex: "1 1 0", minWidth: 0, display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 12px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: 6, border: "1px solid #d6e4ff", background: "#f0f5ff", color: "#0958d9", fontSize: 13, fontWeight: 500, lineHeight: "20px" }}>
            {busy ? <Spin size="small" /> : <InfoCircleFilled style={{ color: "#1677ff" }} />}
            <span>{text}</span>
        </span>
        {!busy && <span style={{ color: "#8c8c8c", fontSize: 12 }}>Lựa chọn được giữ khi chuyển trang</span>}
    </div>;
});

export default ScheduleSelectionNotice;
