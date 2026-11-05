"use client";
import { useEffect, useState } from "react";
import { Alert, Button, Modal, Space, Table, Typography, message } from "antd";
import { getLivestreams, restoreLivestream, type CalendarSource } from "@/services/livestreamService";
import { formatVietnamDateTime } from "@/helper/convertDate";

type Props = { open: boolean; programCode?: string; source: CalendarSource; onClose: () => void; onRestored: () => void };

export default function DeletedCalendarsModal({ open, programCode, source, onClose, onRestored }: Props) {
    const [rows, setRows] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [restoring, setRestoring] = useState<number | null>(null);
    const [refresh, setRefresh] = useState(0);
    const [error, setError] = useState("");
    const [api, contextHolder] = message.useMessage();
    useEffect(() => { if (open) setPage(1); }, [open, programCode, source]);
    useEffect(() => {
        if (!open) return;
        let active = true;
        setLoading(true); setRows([]); setError("");
        getLivestreams({ deleted: true, code_exact: programCode || undefined, calendar_source: source, page, limit: 20 })
            .then((response: any) => {
                if (!active) return;
                setRows(response?.data?.data || []);
                setTotal(Number(response?.data?.total || 0));
            })
            .catch((cause: any) => { if (active) setError(cause?.message || "Không tải được lịch đã xóa"); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [open, page, programCode, source, refresh]);
    const restore = async (row: any) => {
        setRestoring(Number(row.id));
        try {
            await restoreLivestream(String(row.id));
            api.success("Đã khôi phục lịch học và ghi nhận yêu cầu đồng bộ");
            if (rows.length === 1 && page > 1) setPage(page - 1);
            else setRefresh(value => value + 1);
            onRestored();
        } catch (cause: any) {
            api.error(cause?.message || "Không thể khôi phục lịch học");
        } finally { setRestoring(null); }
    };
    return <Modal open={open} title="Lịch đã xóa" onCancel={onClose} footer={null} width={1000} destroyOnClose>
        {contextHolder}
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
            <Typography.Text type="secondary">Khôi phục nguyên thông tin của lịch trước khi xóa. Lịch có key đã được tái sử dụng hoặc đề cương đã thay đổi sẽ được kiểm tra trước khi khôi phục.</Typography.Text>
            {error && <Alert type="error" message={error} showIcon />}
            <Table rowKey="id" loading={loading} dataSource={rows} size="small" scroll={{ x: 850 }}
                pagination={{ current: page, pageSize: 20, total, onChange: setPage, showSizeChanger: false }}
                columns={[
                    { title: "Chương trình", dataIndex: "code" },
                    { title: "Bài", dataIndex: "learn_number", width: 60 },
                    { title: "Tên bài", dataIndex: "lesson_name" },
                    { title: "Giáo viên", dataIndex: "teacher" },
                    { title: "Bắt đầu", dataIndex: "start_time", render: (value: string) => value?.replace("T", " ").slice(0, 19) },
                    { title: "Đã xóa lúc", dataIndex: "deleted_at", render: (value: string) => formatVietnamDateTime(value, "DD/MM/YYYY HH:mm:ss") },
                    { title: "Thao tác", fixed: "right", width: 120, render: (_: unknown, row: any) => <Button
                        disabled={!row.can_restore || restoring !== null} loading={restoring === Number(row.id)}
                        title={!row.can_restore ? "Key đã được tái sử dụng cho lịch khác" : "Khôi phục lịch học"}
                        onClick={() => Modal.confirm({ title: "Khôi phục lịch học?", content: `Khôi phục ${row.lesson_name || `bài ${row.learn_number}`} với thông tin trước khi xóa.`, okText: "Khôi phục", cancelText: "Hủy", onOk: () => restore(row) })}
                    >Khôi phục</Button> },
                ]} />
        </Space>
    </Modal>;
}
