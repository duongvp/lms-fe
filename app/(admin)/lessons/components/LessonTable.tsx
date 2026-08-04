"use client";

import { useEffect, useRef } from "react";
import type { DragEvent } from "react";
import { Button, Grid, Space, Tooltip } from "antd";
import {
    DeleteOutlined,
    DragOutlined,
    EditOutlined,
    EyeOutlined,
} from "@ant-design/icons";
import CustomTable from "@/components/ui/Table";
import type { ResolvedFieldPermission } from "@/types/fieldPolicy";
import type { ColumnsType } from "antd/es/table";
import type { SorterResult } from "antd/es/table/interface";
import { FIELD_LABELS } from "./Modal/LessonFormModal";
import { SORTABLE_FIELDS } from "../lesson.constants";
import type { LessonDataType, LessonSortState } from "../lesson.types";
import LessonDetailRow from "./LessonDetailRow";
import { formatLessonDateTime } from "../lesson.utils";
import { useTableViewport } from "@/hooks/useTableViewport";

interface LessonTableProps {
    data: LessonDataType[];
    loading: boolean;
    currentPage: number;
    pageSize: number;
    totalItems: number;
    sortState: LessonSortState;
    visibleFieldPermissions: ResolvedFieldPermission[];
    selectedRowKeys: React.Key[];
    reorderMode: boolean;
    dragRowKey: React.Key;
    canEdit: boolean;
    canDelete: boolean;
    visibleFormFieldCodes: string[];
    onSelectionChange: (selectedRowKeys: React.Key[]) => void;
    onPageChange: (page: number, pageSize: number) => void;
    onSortChange: (sorter: LessonSortState) => void;
    onDragStart: (key: React.Key) => void;
    onDrop: (key: React.Key) => void;
    onEdit: (record: LessonDataType) => void;
    onDelete: (record: LessonDataType) => void;
}

const LessonTable = ({
    data,
    loading,
    currentPage,
    pageSize,
    totalItems,
    sortState,
    visibleFieldPermissions,
    selectedRowKeys,
    reorderMode,
    dragRowKey,
    canEdit,
    canDelete,
    visibleFormFieldCodes,
    onSelectionChange,
    onPageChange,
    onSortChange,
    onDragStart,
    onDrop,
    onEdit,
    onDelete,
}: LessonTableProps) => {
    const screens = Grid.useBreakpoint();
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

    const columns: ColumnsType<LessonDataType> = visibleFieldPermissions.map(({ field }) => ({
        title: field.fieldLabel || FIELD_LABELS[field.fieldCode] || field.fieldCode,
        dataIndex: field.fieldCode,
        key: field.fieldCode,
        sorter: reorderMode ? false : SORTABLE_FIELDS.has(field.fieldCode),
        sortOrder: sortState.sort_by === field.fieldCode ? sortState.sort_order : undefined,
        width: field.fieldCode === "lesson_name" ? 260 : 150,
        ellipsis: field.fieldCode === "lesson_name",
        render: (value: unknown) => {
            if (field.fieldCode === "updated_at") {
                return formatLessonDateTime(value as string | undefined);
            }
            return value == null || value === "" ? "-" : String(value);
        },
    }));

    if (reorderMode) {
        columns.unshift({
            title: "",
            key: "drag",
            width: 48,
            render: () => <DragOutlined style={{ cursor: "grab", color: "#1677ff" }} />,
        });
    }

    if (!reorderMode) {
        columns.push({
            title: "Thao tác",
            key: "action",
            fixed: screens.lg ? "right" : undefined,
            width: 120,
            render: (_: unknown, record: LessonDataType) => (
                <Space>
                    {canEdit && (
                        <Tooltip title="Sửa">
                            <Button type="link" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); onEdit(record); }} />
                        </Tooltip>
                    )}
                    {canDelete && (
                        <Tooltip title="Xóa">
                            <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); onDelete(record); }} />
                        </Tooltip>
                    )}
                </Space>
            ),
        });
    }

    return (
        <div
            ref={containerRef}
            style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden" }}
            onDragOver={handleRowDragOver}
            onDragEnd={stopAutoScroll}
        >
        <CustomTable<LessonDataType>
            columns={columns}
            dataSource={data}
            loading={loading}
            rowSelection={reorderMode ? undefined : {
                selectedRowKeys,
                onChange: onSelectionChange,
                columnWidth: 32,
            }}
            onRow={(record) => ({
                draggable: reorderMode,
                onDragStart: (event) => {
                    event.dataTransfer.effectAllowed = "move";
                    onDragStart(record.key);
                },
                onDragOver: handleRowDragOver,
                onDragEnd: stopAutoScroll,
                onDrop: () => {
                    stopAutoScroll();
                    onDrop(record.key);
                },
                style: reorderMode
                    ? {
                        cursor: "grab",
                        backgroundColor: dragRowKey === record.key
                            ? "rgba(22, 119, 255, 0.06)"
                            : undefined,
                    }
                    : { cursor: "pointer" },
            })}
            expandable={reorderMode ? undefined : {
                expandedRowRender: (record) => (
                    <LessonDetailRow record={record} visibleFieldCodes={visibleFormFieldCodes} />
                ),
                expandRowByClick: true,
                columnWidth: 32,
            }}
            pagination={reorderMode ? false : {
                current: currentPage,
                pageSize,
                total: totalItems,
                showSizeChanger: true,
                position: ["bottomRight"],
                onChange: onPageChange,
            }}
            onChange={(_, __, sorter, extra) => {
                if (extra.action !== "sort") return;
                const activeSorter = Array.isArray(sorter)
                    ? sorter[0]
                    : sorter as SorterResult<LessonDataType>;
                const field = activeSorter?.field ? String(activeSorter.field) : undefined;
                onSortChange({
                    sort_by: field && SORTABLE_FIELDS.has(field) ? field : undefined,
                    sort_order: activeSorter?.order || undefined,
                });
            }}
            scroll={{ x: "max-content", y: scrollY }}
        />
        </div>
    );
};

export default LessonTable;
