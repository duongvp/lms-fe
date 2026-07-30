"use client";

import dayjs from "dayjs";
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
    tableScrollY?: string;
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
    tableScrollY,
    onSelectionChange,
    onPageChange,
    onSortChange,
    onDragStart,
    onDrop,
    onEdit,
    onDelete,
}: LessonTableProps) => {
    const screens = Grid.useBreakpoint();
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
                return value ? dayjs(value as string).format("DD/MM/YYYY HH:mm") : "-";
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
                onDragStart: () => onDragStart(record.key),
                onDragOver: (event) => {
                    if (reorderMode) event.preventDefault();
                },
                onDrop: () => onDrop(record.key),
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
            scroll={{ x: "max-content", y: data?.length > 5 ? tableScrollY ?? "calc(100vh - 330px)" : undefined }}
        />
    );
};

export default LessonTable;
