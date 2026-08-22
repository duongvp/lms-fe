"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Descriptions, Empty, Modal, Space, Spin, Table, Tag, Typography, notification } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
    applyStudentClassroomAssignment,
    ClassroomAssignmentResult,
    ClassroomAssignmentSummary,
    previewStudentClassroomAssignment,
} from "@/services/livestreamService";

interface ClassroomAssignmentModalProps {
    open: boolean;
    calendarId: string | number | null;
    onClose: () => void;
    onApplied?: () => void;
}

const unwrapResult = (response: any): ClassroomAssignmentResult => response?.data ?? response;

const ClassroomAssignmentModal: React.FC<ClassroomAssignmentModalProps> = ({
    open,
    calendarId,
    onClose,
    onApplied,
}) => {
    const [api, contextHolder] = notification.useNotification({ duration: 3 });
    const [preview, setPreview] = useState<ClassroomAssignmentResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState("");

    const loadPreview = useCallback(async () => {
        if (!calendarId) return;
        setLoading(true);
        setError("");
        try {
            const response = await previewStudentClassroomAssignment(calendarId);
            setPreview(unwrapResult(response));
        } catch (requestError: any) {
            setPreview(null);
            setError(requestError?.message || "Không thể xem trước kết quả chia lớp.");
        } finally {
            setLoading(false);
        }
    }, [calendarId]);

    useEffect(() => {
        if (open) void loadPreview();
        else {
            setPreview(null);
            setError("");
        }
    }, [open, loadPreview]);

    const handleApply = async () => {
        if (!calendarId || !preview) return;
        setApplying(true);
        try {
            const response = await applyStudentClassroomAssignment(calendarId);
            const result = unwrapResult(response);
            api.success({
                message: "Chia lớp học sinh thành công",
                description: result.moved_count
                    ? `Đã cập nhật phòng học cho ${result.moved_count} học sinh.`
                    : "Phân lớp hiện tại đã phù hợp, không có học sinh cần chuyển phòng.",
            });
            onApplied?.();
            onClose();
        } catch (requestError: any) {
            api.error({
                message: "Không thể chia lớp học sinh",
                description: requestError?.message || "Vui lòng kiểm tra lại cấu hình classroom.",
            });
        } finally {
            setApplying(false);
        }
    };

    const columns: ColumnsType<ClassroomAssignmentSummary> = [
        {
            title: "Phòng",
            dataIndex: "roomId",
            width: 90,
            render: (value) => <Tag color="blue">Room {value}</Tag>,
        },
        {
            title: "Class ID",
            dataIndex: "classId",
            ellipsis: true,
        },
        {
            title: "Số học sinh",
            dataIndex: "studentCount",
            width: 120,
            align: "center",
        },
        {
            title: "Điểm tương tác",
            dataIndex: "interactionScore",
            width: 130,
            align: "right",
            render: (value) => Number(value || 0).toLocaleString("vi-VN"),
        },
    ];

    return (
        <>
            {contextHolder}
            <Modal
                title="Chia lớp học sinh"
                open={open}
                width={820}
                destroyOnClose
                maskClosable={!applying}
                closable={!applying}
                onCancel={onClose}
                footer={[
                    <Button key="cancel" onClick={onClose} disabled={applying}>Hủy</Button>,
                    <Button key="reload" onClick={() => void loadPreview()} disabled={loading || applying}>
                        Tải lại xem trước
                    </Button>,
                    <Button
                        key="apply"
                        type="primary"
                        loading={applying}
                        disabled={!preview || loading || Boolean(error)}
                        onClick={handleApply}
                    >
                        Xác nhận chia lớp
                    </Button>,
                ]}
            >
                <Spin spinning={loading} tip="Đang tính toán phương án chia lớp...">
                    {error ? (
                        <Alert
                            type="error"
                            showIcon
                            message="Không thể tạo phương án chia lớp"
                            description={error}
                        />
                    ) : preview ? (
                        <Space direction="vertical" size={16} style={{ width: "100%" }}>
                            <Alert
                                type="info"
                                showIcon
                                message="Đây là dữ liệu xem trước"
                                description="Hệ thống chỉ cập nhật room_id và class_id của học sinh sau khi bạn bấm Xác nhận chia lớp. Giáo viên và trợ giảng không bị thay đổi."
                            />
                            <Descriptions bordered size="small" column={3}>
                                <Descriptions.Item label="Chương trình">{preview.calendar.code}</Descriptions.Item>
                                <Descriptions.Item label="Bài học">Bài {preview.calendar.learn_number}</Descriptions.Item>
                                <Descriptions.Item label="Hệ thống">
                                    <Tag color={preview.calendar.system_type === "topuni" ? "purple" : "cyan"}>
                                        {preview.calendar.system_type}
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Tổng học sinh">{preview.total_students}</Descriptions.Item>
                                <Descriptions.Item label="Số phòng">{preview.classroom_count}</Descriptions.Item>
                                <Descriptions.Item label="Cần chuyển phòng">
                                    <Typography.Text type={preview.moved_count ? "warning" : "success"} strong>
                                        {preview.moved_count}
                                    </Typography.Text>
                                </Descriptions.Item>
                            </Descriptions>
                            {preview.classrooms.length ? (
                                <Table
                                    rowKey="roomId"
                                    size="small"
                                    pagination={false}
                                    columns={columns}
                                    dataSource={preview.classrooms}
                                    scroll={{ x: 620, y: 320 }}
                                />
                            ) : (
                                <Empty description="Lịch này chưa có học sinh để chia lớp" />
                            )}
                        </Space>
                    ) : (
                        <div style={{ minHeight: 180 }} />
                    )}
                </Spin>
            </Modal>
        </>
    );
};

export default ClassroomAssignmentModal;
