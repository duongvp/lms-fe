"use client";

import { useEffect, useRef } from "react";
import type { DragEvent, Key } from "react";
import { Button, Popconfirm, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { DeleteOutlined, DragOutlined, EditOutlined, EyeOutlined, UndoOutlined } from "@ant-design/icons";
import type {
    QuizAnswerItem,
    QuizApiResponse,
    QuizClassOption,
    QuizLessonOption,
    QuizStatus,
    QuizType,
} from "@/services/quizService";
import { quizTypeLabel, statusMeta } from "../quiz.constants";
import { formatQuizDate } from "../quiz.utils";
import { useTableViewport } from "@/hooks/useTableViewport";
import styles from "../quiz.module.css";

const { Text } = Typography;

interface QuizTableProps {
    data: QuizApiResponse[];
    loading: boolean;
    total: number;
    page: number;
    pageSize: number;
    selectedKeys: Key[];
    reorderMode: boolean;
    dragRowKey: Key | null;
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
    classes: QuizClassOption[];
    lessons: QuizLessonOption[];
    filterCode?: string;
    canViewField: (field: string) => boolean;
    onSelectionChange: (keys: Key[]) => void;
    onPageChange: (page: number, pageSize: number) => void;
    onDragStart: (key: Key) => void;
    onDrop: (key: Key) => void;
    onPreview: (record: QuizApiResponse) => void;
    onEdit: (record: QuizApiResponse) => void;
    onDisable: (record: QuizApiResponse) => void;
    onRestore: (record: QuizApiResponse) => void;
}

const QuizTable = ({
    data,
    loading,
    total,
    page,
    pageSize,
    selectedKeys,
    reorderMode,
    dragRowKey,
    canEdit,
    canDelete,
    canExport,
    classes,
    lessons,
    filterCode,
    canViewField,
    onSelectionChange,
    onPageChange,
    onDragStart,
    onDrop,
    onPreview,
    onEdit,
    onDisable,
    onRestore,
}: QuizTableProps) => {
    const { containerRef, scrollY } = useTableViewport(reorderMode ? 64 : 112);
    const dragPointerYRef = useRef<number | null>(null);
    const autoScrollFrameRef = useRef<number | null>(null);

    const stopAutoScroll = () => {
        dragPointerYRef.current = null;
        if (autoScrollFrameRef.current !== null) {
            cancelAnimationFrame(autoScrollFrameRef.current);
            autoScrollFrameRef.current = null;
        }
    };

    const runAutoScroll = () => {
        autoScrollFrameRef.current = null;
        const pointerY = dragPointerYRef.current;
        const scrollContainer = containerRef.current?.querySelector<HTMLElement>(".ant-table-body");
        if (pointerY === null || !scrollContainer) return;

        const bounds = scrollContainer.getBoundingClientRect();
        const edgeSize = Math.min(80, Math.max(48, bounds.height * 0.2));
        let direction = 0;
        let distanceInsideEdge = 0;

        if (pointerY < bounds.top + edgeSize) {
            direction = -1;
            distanceInsideEdge = bounds.top + edgeSize - pointerY;
        } else if (pointerY > bounds.bottom - edgeSize) {
            direction = 1;
            distanceInsideEdge = pointerY - (bounds.bottom - edgeSize);
        }

        if (direction === 0) return;

        const speed = Math.ceil(4 + Math.min(1, distanceInsideEdge / edgeSize) * 16);
        scrollContainer.scrollTop += direction * speed;
        autoScrollFrameRef.current = requestAnimationFrame(runAutoScroll);
    };

    const handleRowDragOver = (event: DragEvent<HTMLElement>) => {
        if (!reorderMode) return;
        event.preventDefault();
        dragPointerYRef.current = event.clientY;
        if (autoScrollFrameRef.current === null) {
            autoScrollFrameRef.current = requestAnimationFrame(runAutoScroll);
        }
    };

    useEffect(() => () => {
        if (autoScrollFrameRef.current !== null) {
            cancelAnimationFrame(autoScrollFrameRef.current);
        }
    }, []);

    const lessonNameByNumber = new Map(
        lessons.map((item) => [Number(item.learn_number), item.lesson_name])
    );
    const columns: ColumnsType<QuizApiResponse> = [
        ...(canViewField("quiz_index") ? [{
            title: "Thứ tự",
            dataIndex: "quiz_index" as const,
            width: 86,
            align: "center" as const,
        }] : []),
        ...(canViewField("code") ? [{
            title: "Lớp học",
            dataIndex: "code" as const,
            width: 170,
            render: (value: string) => {
                const classInfo = classes.find((item) => item.code === value);
                return <div>
                    <Text strong>{value || "—"}</Text>
                    {classInfo?.subject_name && <div className={styles.tableSub}>{classInfo.subject_name}</div>}
                </div>;
            },
        }] : []),
        ...(canViewField("learn_number") ? [{
            title: "Bài học",
            dataIndex: "learn_number" as const,
            width: 210,
            render: (value: number, record: QuizApiResponse) => {
                const lessonName = filterCode === record.code
                    ? lessonNameByNumber.get(Number(value))
                    : undefined;
                return <div>
                    <Tag color="geekblue">Buổi {value}</Tag>
                    {lessonName && <div className={styles.tableSub}>{lessonName}</div>}
                </div>;
            },
        }] : []),
        ...(canViewField("quiz_name") ? [{
            title: "Nội dung câu hỏi",
            dataIndex: "quiz_name" as const,
            render: (value: string) => <div className={styles.tableQuestion}>{value || "—"}</div>,
        }] : []),
        ...(canViewField("quiz_type") ? [{
            title: "Loại câu hỏi",
            dataIndex: "quiz_type" as const,
            width: 145,
            render: (value: QuizType) => (
                <Tag color={value === 1 ? "blue" : value === 2 ? "purple" : "cyan"}>
                    {quizTypeLabel(value)}
                </Tag>
            ),
        }] : []),
        ...(canViewField("ans") ? [{
            title: "Đáp án",
            dataIndex: "ans" as const,
            width: 120,
            render: (answers: QuizAnswerItem[], record: QuizApiResponse) => (
                <Text type="secondary">
                    {record.quiz_type === 1
                        ? `${answers?.length || 0} lựa chọn`
                        : answers?.[0]?.text ? "Đã thiết lập" : "Chưa có"}
                </Text>
            ),
        }] : []),
        ...(canViewField("ans_duration") ? [{
            title: "Thời gian",
            dataIndex: "ans_duration" as const,
            width: 105,
            render: (value: number) => `${value} giây`,
        }] : []),
        ...(canViewField("quiz_status") ? [{
            title: "Trạng thái",
            dataIndex: "quiz_status" as const,
            width: 145,
            render: (value: QuizStatus) => {
                const meta = statusMeta(value);
                return <Tag color={meta.color}>{meta.label}</Tag>;
            },
        }] : []),
        ...(canViewField("updated_at") ? [{
            title: "Cập nhật",
            dataIndex: "updated_at" as const,
            width: 150,
            render: formatQuizDate,
        }] : []),
        ...(!reorderMode && (canEdit || canDelete) ? [{
            title: "Thao tác",
            key: "actions",
            width: 130,
            fixed: "right" as const,
            render: (_: unknown, record: QuizApiResponse) => (
                <Space size={4}>
                    <Tooltip title="Xem trước">
                        <Button type="text" icon={<EyeOutlined />} onClick={() => onPreview(record)} />
                    </Tooltip>
                    {canEdit && record.quiz_status !== "disable" && (
                        <Tooltip title="Chỉnh sửa">
                            <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(record)} />
                        </Tooltip>
                    )}
                    {canDelete && record.quiz_status !== "disable" && (
                        <Popconfirm
                            title="Vô hiệu hóa câu hỏi này?"
                            okText="Vô hiệu hóa"
                            cancelText="Hủy"
                            onConfirm={() => onDisable(record)}
                        >
                            <Tooltip title="Vô hiệu hóa"><Button type="text" danger icon={<DeleteOutlined />} /></Tooltip>
                        </Popconfirm>
                    )}
                    {canEdit && record.quiz_status === "disable" && (
                        <Tooltip title="Khôi phục">
                            <Button type="text" icon={<UndoOutlined />} onClick={() => onRestore(record)} />
                        </Tooltip>
                    )}
                </Space>
            ),
        }] : []),
    ];

    if (reorderMode) {
        columns.unshift({
            title: "",
            key: "drag",
            width: 48,
            fixed: "left",
            render: () => <DragOutlined style={{ color: "#1677ff", cursor: "grab", fontSize: 17 }} />,
        });
    }

    return <div
        ref={containerRef}
        className={styles.tableViewport}
        onDragOver={handleRowDragOver}
        onDragEnd={stopAutoScroll}
    >
    <Table<QuizApiResponse>
        rowKey="quiz_id"
        columns={columns}
        dataSource={data}
        loading={loading}
        rowSelection={!reorderMode && canExport ? {
            selectedRowKeys: selectedKeys,
            onChange: onSelectionChange,
        } : undefined}
        onRow={(record) => ({
            draggable: reorderMode,
            onDragStart: (event) => {
                event.dataTransfer.effectAllowed = "move";
                onDragStart(record.quiz_id);
            },
            onDragOver: handleRowDragOver,
            onDragEnd: stopAutoScroll,
            onDrop: () => {
                stopAutoScroll();
                onDrop(record.quiz_id);
            },
            style: reorderMode ? {
                cursor: "grab",
                backgroundColor: dragRowKey === record.quiz_id
                    ? "rgba(22, 119, 255, 0.06)"
                    : undefined,
            } : undefined,
        })}
        pagination={reorderMode ? false : {
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `Tổng ${value} câu hỏi`,
            onChange: onPageChange,
        }}
        scroll={{ x: 1250, y: scrollY }}
    />
    </div>;
};

export default QuizTable;
