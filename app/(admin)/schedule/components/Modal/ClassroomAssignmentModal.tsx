"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Col, Descriptions, Empty, InputNumber, Modal, Progress, Row, Space, Spin, Statistic, Table, Tag, Typography, notification } from "antd";
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
    systemType?: "topclass" | "topuni" | null;
    onClose: () => void;
    onApplied?: () => void;
}

const unwrapResult = (response: any): ClassroomAssignmentResult => response?.data ?? response;
const DEFAULT_TOPUNI_MAX_STUDENTS_PER_ROOM = 500;

const ClassroomAssignmentModal: React.FC<ClassroomAssignmentModalProps> = ({
    open,
    calendarId,
    systemType,
    onClose,
    onApplied,
}) => {
    const [api, contextHolder] = notification.useNotification({ duration: 3 });
    const [preview, setPreview] = useState<ClassroomAssignmentResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState("");
    const [maxStudentsPerRoom, setMaxStudentsPerRoom] = useState(
        DEFAULT_TOPUNI_MAX_STUDENTS_PER_ROOM
    );

    const loadPreview = useCallback(async (requestedMaxStudentsPerRoom: number) => {
        if (!calendarId) return;
        setLoading(true);
        setError("");
        try {
            const response = await previewStudentClassroomAssignment(
                calendarId,
                requestedMaxStudentsPerRoom
            );
            setPreview(unwrapResult(response));
        } catch (requestError: any) {
            setError(requestError?.message || "Không thể xem trước kết quả chia lớp.");
        } finally {
            setLoading(false);
        }
    }, [calendarId]);

    useEffect(() => {
        if (open) {
            setPreview(null);
            setMaxStudentsPerRoom(DEFAULT_TOPUNI_MAX_STUDENTS_PER_ROOM);
            void loadPreview(DEFAULT_TOPUNI_MAX_STUDENTS_PER_ROOM);
        }
        else {
            setPreview(null);
            setError("");
        }
    }, [open, loadPreview]);

    const handleApply = async () => {
        if (!calendarId || !preview) return;
        setApplying(true);
        try {
            const response = await applyStudentClassroomAssignment(
                calendarId,
                preview.max_students_per_classroom ?? undefined
            );
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
            render: (value) => <Tag color="blue">Phòng {value}</Tag>,
        },
        {
            title: "Số học sinh",
            dataIndex: "studentCount",
            width: 105,
            align: "center",
            render: (value: number) => Number(value).toLocaleString("vi-VN"),
        },
    ];

    if (preview?.calendar.system_type === "topuni") {
        columns.push({
            title: "Lượt chat trước khi sắp xếp",
            dataIndex: "previousInteractionScore",
            width: 170,
            align: "right",
            render: (value: number | null) => Number(value || 0).toLocaleString("vi-VN"),
        });
        columns.push({
            title: "Lượt chat sau khi sắp xếp",
            dataIndex: "interactionScore",
            width: 175,
            align: "right",
            render: (value: number) => (
                <Typography.Text strong style={{ color: "#1677ff" }}>
                    {Number(value || 0).toLocaleString("vi-VN")}
                </Typography.Text>
            ),
        });
        columns.push({
            title: "Cơ cấu học sinh sau chia",
            dataIndex: "interactionBreakdown",
            width: 310,
            render: (value: ClassroomAssignmentSummary["interactionBreakdown"]) => value
                ? (
                    <Space size={[4, 4]} wrap>
                        <Tag color="blue">Tích cực: {value.high}</Tag>
                        <Tag color="cyan">Trung bình: {value.medium}</Tag>
                        <Tag color="orange">Ít tương tác: {value.low}</Tag>
                        <Tag>Không tương tác: {value.none}</Tag>
                    </Space>
                )
                : "-",
        });
    } else if (preview?.calendar.system_type === "topclass") {
        if (preview.attendance?.applied) {
            columns.push({
                title: preview.attendance.makeup_signal_applied
                    ? "Cần học bổ sung (trước → sau)"
                    : "Dự kiến tham gia (trước → sau)",
                key: "expectedAttendance",
                width: 190,
                align: "center",
                render: (_, row) => {
                    const value = preview.attendance?.makeup_signal_applied
                        ? row.needsMakeupCount
                        : row.expectedAttendeeCount;
                    const previousValue = preview.attendance?.makeup_signal_applied
                        ? row.previousNeedsMakeupCount
                        : row.previousExpectedAttendeeCount;
                    return value === null || value === undefined
                        ? "-"
                        : `${previousValue ?? "-"} → ${value}`;
                },
            });
        }
        if (preview.attendance && preview.attendance.lessons_considered > 0) {
            columns.push({
                title: `Chuyên cần ${preview.attendance.lessons_considered} bài gần nhất`,
                dataIndex: "attendanceBreakdown",
                width: 250,
                render: (value: ClassroomAssignmentSummary["attendanceBreakdown"]) => value
                    ? (
                        <Space size={[4, 4]} wrap>
                            {Array.from(
                                { length: preview.attendance!.lessons_considered + 1 },
                                (_, index) => preview.attendance!.lessons_considered - index
                            ).map((count) => (
                                <Tag key={count} color={count === 0 ? "default" : "green"}>
                                    {count}/{preview.attendance!.lessons_considered}: {value[count as 0 | 1 | 2 | 3] || 0}
                                </Tag>
                            ))}
                        </Space>
                    )
                    : "-",
            });
        }
    }

    columns.push({
        title: "Mã lớp dự kiến",
        dataIndex: "classId",
        width: 190,
        render: (value: string) => (
            <Typography.Text
                ellipsis={{ tooltip: value }}
                style={{ display: "block", maxWidth: 170 }}
            >
                {value}
            </Typography.Text>
        ),
    });

    const isTopUniPreview = preview?.calendar.system_type === "topuni" || systemType === "topuni";
    const previewedMaxStudentsPerRoom = preview?.max_students_per_classroom
        ?? DEFAULT_TOPUNI_MAX_STUDENTS_PER_ROOM;
    const maxStudentsPerRoomChanged = isTopUniPreview
        && maxStudentsPerRoom !== previewedMaxStudentsPerRoom;
    const topUniRoomLimitControl = isTopUniPreview ? (
        <Card size="small" title="Giới hạn sĩ số TopUni">
            <Space size={12} wrap>
                <Typography.Text>Tối đa mỗi phòng</Typography.Text>
                <InputNumber
                    min={1}
                    max={10_000}
                    precision={0}
                    value={maxStudentsPerRoom}
                    addonAfter="học sinh"
                    onChange={(value) => {
                        if (typeof value === "number") setMaxStudentsPerRoom(value);
                    }}
                    onPressEnter={() => void loadPreview(maxStudentsPerRoom)}
                />
                <Button
                    type={maxStudentsPerRoomChanged ? "primary" : "default"}
                    loading={loading}
                    disabled={!maxStudentsPerRoomChanged || applying}
                    onClick={() => void loadPreview(maxStudentsPerRoom)}
                >
                    Tính lại phương án
                </Button>
                <Typography.Text type={maxStudentsPerRoomChanged ? "warning" : "secondary"}>
                    {maxStudentsPerRoomChanged
                        ? "Giới hạn đã thay đổi, cần tính lại trước khi xác nhận."
                        : `Phương án hiện tại đang dùng tối đa ${previewedMaxStudentsPerRoom.toLocaleString("vi-VN")} học sinh/phòng.`}
                </Typography.Text>
            </Space>
        </Card>
    ) : null;

    return (
        <>
            {contextHolder}
            <Modal
                title="Chia lớp học sinh"
                open={open}
                width={960}
                styles={{
                    body: {
                        maxHeight: "calc(100dvh - 190px)",
                        overflowY: "auto",
                        overflowX: "hidden",
                        paddingRight: 12,
                    },
                }}
                destroyOnClose
                maskClosable={!applying}
                closable={!applying}
                onCancel={onClose}
                footer={[
                    <Button key="cancel" onClick={onClose} disabled={applying}>Hủy</Button>,
                    <Button key="reload" onClick={() => void loadPreview(maxStudentsPerRoom)} disabled={loading || applying}>
                        Tải lại xem trước
                    </Button>,
                    <Button
                        key="apply"
                        type="primary"
                        loading={applying}
                        disabled={!preview || preview.total_students === 0 || loading || Boolean(error) || maxStudentsPerRoomChanged}
                        onClick={handleApply}
                    >
                        Xác nhận chia lớp
                    </Button>,
                ]}
            >
                <Spin spinning={loading} tip="Đang tính toán phương án chia lớp...">
                    {error ? (
                        <Space direction="vertical" size={16} style={{ width: "100%" }}>
                            {topUniRoomLimitControl}
                            <Alert
                                type="error"
                                showIcon
                                message="Không thể tạo phương án chia lớp"
                                description={error}
                            />
                        </Space>
                    ) : preview ? (
                        <Space direction="vertical" size={16} style={{ width: "100%" }}>
                            <Alert
                                type="info"
                                showIcon
                                message="Đây là dữ liệu xem trước"
                                description="Chưa có dữ liệu nào được lưu ở bước này. Phòng học của học sinh chỉ được cập nhật sau khi bạn bấm “Xác nhận chia lớp”; giáo viên và trợ giảng không bị thay đổi."
                            />
                            {topUniRoomLimitControl}
                            {preview.calendar.system_type === "topclass" && (
                                <Alert
                                    type={preview.attendance?.applied ? "success" : "warning"}
                                    showIcon
                                    message={preview.attendance?.applied
                                        ? !preview.attendance.based_on_current_roster
                                            ? `Đã tìm thấy dữ liệu chuyên cần trước Bài ${preview.calendar.learn_number}`
                                            : preview.attendance.makeup_signal_applied
                                            ? `Đang cân bằng học sinh cần học bổ sung Bài ${preview.calendar.learn_number}`
                                            : `Đang cân bằng theo ${preview.attendance.lessons_considered} bài gần nhất`
                                        : "Chưa áp dụng dữ liệu chuyên cần"}
                                    description={preview.attendance?.applied
                                        ? !preview.attendance.based_on_current_roster
                                            ? `Phần dưới đang thống kê ${preview.attendance.population_students.toLocaleString("vi-VN")} học sinh từ dữ liệu bài trước. Bài ${preview.calendar.learn_number} chưa có danh sách học sinh nên hệ thống chưa lập phương án phòng và chưa cho phép xác nhận.`
                                            : preview.attendance.makeup_signal_applied
                                            ? `Đây là lần học tiếp theo của cùng nội dung. ${preview.attendance.already_covered_current_lesson.toLocaleString("vi-VN")} học sinh đã học ở lần trước không bị coi là nghỉ; ${preview.attendance.needs_makeup_current_lesson.toLocaleString("vi-VN")} học sinh chưa học nội dung này được phân bổ đều giữa các phòng.`
                                            : `Mỗi bài chỉ được tính một lần dù có nhiều lịch học. Hệ thống đang dùng ${preview.attendance.lessons_considered} bài có dữ liệu gần nhất và ưu tiên giữ phòng cũ khi mức chuyên cần đã cân bằng.`
                                        : "Chưa có bài học trước với dữ liệu tham gia hợp lệ. Hệ thống chỉ giữ nhóm cũ và cân bằng sĩ số."}
                                />
                            )}
                            {preview.calendar.system_type === "topclass" && preview.total_students === 0 && (
                                <Alert
                                    type="warning"
                                    showIcon
                                    message={`Bài ${preview.calendar.learn_number} chưa có danh sách học sinh`}
                                    description={`Dữ liệu bài trước chỉ được dùng để tham khảo. Sau khi cron thêm học sinh cho bài ${preview.calendar.learn_number}, hãy bấm “Tải lại xem trước” để hệ thống lập phương án chia phòng.`}
                                />
                            )}
                            {preview.calendar.system_type === "topuni" && (
                                <Alert
                                    type="success"
                                    showIcon
                                    message="Cách hệ thống chuẩn bị phương án"
                                    description="Học sinh đã học buổi trước được ưu tiên giữ nguyên phòng. Học sinh mới được bổ sung vào các phòng còn thiếu; hệ thống chỉ điều chuyển học sinh cũ khi thực sự cần để cân bằng bốn mức độ tham gia giữa các phòng."
                                />
                            )}
                            <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
                                <Descriptions.Item label="Chương trình">{preview.calendar.code}</Descriptions.Item>
                                <Descriptions.Item label="Bài học">Bài {preview.calendar.learn_number}</Descriptions.Item>
                                <Descriptions.Item label="Hệ thống">
                                    <Tag color={preview.calendar.system_type === "topuni" ? "purple" : "cyan"}>
                                        {preview.calendar.system_type === "topuni" ? "TopUni" : "TopClass"}
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Tổng học sinh">
                                    {preview.total_students.toLocaleString("vi-VN")}
                                </Descriptions.Item>
                                <Descriptions.Item label="Số phòng">{preview.classroom_count}</Descriptions.Item>
                                <Descriptions.Item label="Cần chuyển phòng">
                                    <Typography.Text type={preview.moved_count ? "warning" : "success"} strong>
                                        {preview.moved_count.toLocaleString("vi-VN")}
                                    </Typography.Text>
                                </Descriptions.Item>
                            </Descriptions>
                            {preview.calendar.system_type === "topuni" && preview.total_students === 0 && (
                                <Alert
                                    type="warning"
                                    showIcon
                                    message="Bài này chưa có danh sách học sinh"
                                    description={preview.interaction_source?.learn_number
                                        ? `Bạn vẫn có thể xem mức độ tham gia của học sinh ở bài ${preview.interaction_source.learn_number} bên dưới. Sau khi hệ thống bổ sung danh sách học sinh cho bài ${preview.calendar.learn_number}, hãy bấm “Tải lại xem trước” để nhận phương án chia phòng.`
                                        : `Chưa có danh sách học sinh của bài ${preview.calendar.learn_number} và cũng chưa tìm thấy buổi TopUni trước để tham khảo. Hãy bổ sung danh sách học sinh rồi tải lại xem trước.`}
                                />
                            )}
                            {preview.calendar.system_type === "topuni" && preview.total_students > 0 && preview.continuity && (
                                <Card size="small" title="Đối chiếu với buổi TopUni trước">
                                    <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
                                        <Descriptions.Item label="Học sinh cũ">
                                            {preview.continuity.existing_students.toLocaleString("vi-VN")}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Học sinh mới">
                                            {preview.continuity.new_students.toLocaleString("vi-VN")}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Học sinh cũ giữ nguyên phòng">
                                            <Typography.Text type="success" strong>
                                                {preview.continuity.retained_existing_students.toLocaleString("vi-VN")}
                                            </Typography.Text>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Học sinh cũ cần chuyển">
                                            <Typography.Text type={preview.continuity.moved_existing_students ? "warning" : "success"} strong>
                                                {preview.continuity.moved_existing_students.toLocaleString("vi-VN")}
                                            </Typography.Text>
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Card>
                            )}
                            {preview.calendar.system_type === "topclass"
                                && preview.attendance?.makeup_signal_applied && (
                                <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
                                    <Descriptions.Item label={`Đã học Bài ${preview.calendar.learn_number} ở lần trước`}>
                                        <Typography.Text type="success" strong>
                                            {preview.attendance.already_covered_current_lesson.toLocaleString("vi-VN")}
                                        </Typography.Text>
                                    </Descriptions.Item>
                                    <Descriptions.Item label={`Chưa học Bài ${preview.calendar.learn_number}`}>
                                        <Typography.Text type="warning" strong>
                                            {preview.attendance.needs_makeup_current_lesson.toLocaleString("vi-VN")}
                                        </Typography.Text>
                                    </Descriptions.Item>
                                </Descriptions>
                            )}
                            {preview.calendar.system_type === "topclass"
                                && preview.attendance?.applied
                                && preview.attendance.distribution && (
                                <Descriptions
                                    bordered
                                    size="small"
                                    column={{ xs: 1, sm: 2, md: preview.attendance.lessons_considered + 1 }}
                                >
                                    {Array.from(
                                        { length: preview.attendance.lessons_considered + 1 },
                                        (_, index) => preview.attendance!.lessons_considered - index
                                    ).map((count) => (
                                        <Descriptions.Item
                                            key={count}
                                            label={count === 0
                                                ? `Chưa học bài nào trong ${preview.attendance!.lessons_considered} bài`
                                                : `Đã học ${count}/${preview.attendance!.lessons_considered} bài`}
                                        >
                                            <Typography.Text type={count === 0 ? "danger" : undefined} strong>
                                                {preview.attendance!.distribution![count as 0 | 1 | 2 | 3] || 0}
                                            </Typography.Text>
                                        </Descriptions.Item>
                                    ))}
                                </Descriptions>
                            )}
                            {preview.calendar.system_type === "topuni"
                                && preview.interaction && (
                                <Card
                                    size="small"
                                    title={preview.interaction_source?.learn_number
                                        ? `Mức độ tham gia của học sinh ở bài ${preview.interaction_source.learn_number}`
                                        : "Mức độ tham gia dùng để chia phòng"}
                                >
                                    <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
                                        {preview.interaction_source?.learn_number
                                            ? `Hệ thống dùng số lượt chat ở bài ${preview.interaction_source.learn_number} để chuẩn bị phương án cho bài ${preview.calendar.learn_number}. Học sinh không gửi tin nhắn vẫn được tính trong tổng số học sinh của bài ${preview.interaction_source.learn_number}.`
                                            : "Hệ thống dùng số lượt chat của buổi TopUni gần nhất để cân bằng mức độ tham gia giữa các phòng. Học sinh không gửi tin nhắn vẫn được tính trong tổng số học sinh."}
                                    </Typography.Paragraph>
                                    <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                                        <Col xs={24} sm={12}>
                                            <Card size="small" styles={{ body: { padding: 12 } }}>
                                                <Statistic
                                                    title={preview.interaction_source?.learn_number
                                                        ? `Học sinh có tương tác ở bài ${preview.interaction_source.learn_number}`
                                                        : "Học sinh có tương tác"}
                                                    value={preview.interaction.interacting_students}
                                                    suffix={<Typography.Text type="secondary">/ {preview.interaction.population_students.toLocaleString("vi-VN")} học sinh</Typography.Text>}
                                                    valueStyle={{ fontSize: 22 }}
                                                />
                                            </Card>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Card size="small" styles={{ body: { padding: 12 } }}>
                                                <Statistic
                                                    title="Tổng lượt chat của học sinh"
                                                    value={preview.interaction.total_score}
                                                    groupSeparator="."
                                                    valueStyle={{ fontSize: 22 }}
                                                />
                                            </Card>
                                        </Col>
                                    </Row>
                                    <Typography.Text strong>Mức độ tham gia của học sinh</Typography.Text>
                                    {([
                                        ["Tích cực (> 7 lượt)", "high", "#1677ff"],
                                        ["Trung bình (4–7 lượt)", "medium", "#13c2c2"],
                                        ["Ít tương tác (1–3 lượt)", "low", "#faad14"],
                                        ["Không tương tác (0 lượt)", "none", "#bfbfbf"],
                                    ] as const).map(([label, key, color]) => {
                                        const count = preview.interaction!.distribution[key];
                                        const percent = preview.interaction!.population_students
                                            ? Number((count * 100 / preview.interaction!.population_students).toFixed(1))
                                            : 0;
                                        return (
                                            <div key={key} style={{ display: "grid", gridTemplateColumns: "150px minmax(120px, 1fr) 55px 105px", gap: 10, alignItems: "center", marginTop: 10 }}>
                                                <Typography.Text>{label}</Typography.Text>
                                                <Progress percent={percent} showInfo={false} strokeColor={color} size="small" />
                                                <Typography.Text strong style={{ textAlign: "right" }}>{percent}%</Typography.Text>
                                                <Typography.Text type="secondary" style={{ textAlign: "right" }}>
                                                    {count.toLocaleString("vi-VN")} học sinh
                                                </Typography.Text>
                                            </div>
                                        );
                                    })}
                                </Card>
                            )}
                            {preview.classrooms.length ? (
                                <Card size="small" title="Kết quả dự kiến theo từng phòng" styles={{ body: { padding: 0 } }}>
                                    {preview.calendar.system_type === "topuni" && (
                                        <div style={{ padding: "12px 16px", background: "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                                            <Typography.Text type="secondary">
                                                Cột <Typography.Text strong>trước khi sắp xếp</Typography.Text> cho biết tổng lượt chat của những học sinh đang thuộc phòng đó ở buổi trước. {" "}
                                                Cột <Typography.Text strong>sau khi sắp xếp</Typography.Text> là tổng lượt chat dự kiến sau khi giữ học sinh cũ, bổ sung học sinh mới và thực hiện các điều chỉnh cần thiết. {" "}
                                                Các phòng có kết quả càng gần nhau thì mức độ tham gia càng cân bằng.
                                            </Typography.Text>
                                        </div>
                                    )}
                                    <Table
                                        rowKey="roomId"
                                        size="small"
                                        pagination={false}
                                        columns={columns}
                                        dataSource={preview.classrooms}
                                        scroll={{ x: 900 }}
                                    />
                                </Card>
                            ) : (
                                <Empty description="Chưa thể lập phương án trước khi có danh sách học sinh của bài hiện tại" />
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
