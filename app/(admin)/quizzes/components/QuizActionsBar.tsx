// components/QuizActionsBar.tsx
"use client";

import { Button, Input, Space, Tooltip } from "antd";
import {
    PlusOutlined,
    ImportOutlined,
    ExportOutlined,
    FilterOutlined,
    ReloadOutlined,
    SwapOutlined,
    CheckOutlined,
    CloseOutlined,
    SearchOutlined,
} from "@ant-design/icons";

interface QuizActionsBarProps {
    canCreate: boolean;
    canEdit: boolean;
    canImport: boolean;
    canExport: boolean;
    selectedCount: number;
    reorderMode: boolean;
    refreshing: boolean;
    savingReorder: boolean;
    onSearch: (value: string) => Promise<void>;
    onCreate: () => void;
    onFilter: () => void;
    onImport: () => void;
    onExport: () => void;
    onEnableReorder: () => void;
    onCancelReorder: () => void;
    onSaveReorder: () => void;
    onRefresh: () => void;
}

const QuizActionsBar = ({
    canCreate,
    canEdit,
    canImport,
    canExport,
    selectedCount,
    reorderMode,
    refreshing,
    savingReorder,
    onSearch,
    onCreate,
    onFilter,
    onImport,
    onExport,
    onEnableReorder,
    onCancelReorder,
    onSaveReorder,
    onRefresh,
}: QuizActionsBarProps) => {
    if (reorderMode) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 16,
                }}
            >
                <span style={{ fontWeight: 500, color: "#1677ff" }}>
                    Chế độ sắp xếp: Kéo thả để thay đổi thứ tự câu hỏi
                </span>
                <Space>
                    <Button
                        type="primary"
                        icon={<CheckOutlined />}
                        loading={savingReorder}
                        onClick={onSaveReorder}
                    >
                        Lưu thứ tự
                    </Button>
                    <Button
                        icon={<CloseOutlined />}
                        disabled={savingReorder}
                        onClick={onCancelReorder}
                    >
                        Hủy
                    </Button>
                </Space>
            </div>
        );
    }

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 16,
                flexWrap: "wrap",
            }}
        >
            <Space size="middle" wrap>
                <Input.Search
                    placeholder="Tìm kiếm câu hỏi..."
                    allowClear
                    onSearch={onSearch}
                    style={{ width: 280 }}
                    prefix={<SearchOutlined />}
                />


            </Space>

            <Space size="small" wrap>
                {canCreate && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
                        Thêm câu hỏi
                    </Button>
                )}

                {canImport && (
                    <Button icon={<ImportOutlined />} onClick={onImport}>
                        Import
                    </Button>
                )}

                {canExport && (
                    <Button
                        icon={<ExportOutlined />}
                        onClick={onExport}
                    >
                        Export{selectedCount > 0 ? ` (${selectedCount})` : ""}
                    </Button>
                )}

                <Tooltip title="Làm mới">
                    <Button
                        icon={<ReloadOutlined />}
                        loading={refreshing}
                        onClick={onRefresh}
                    />
                </Tooltip>

                {canEdit && (
                    <Button
                        type="primary"
                        icon={<SwapOutlined />}
                        onClick={onEnableReorder}
                    >
                        Sắp xếp
                    </Button>
                )}
                <Button icon={<FilterOutlined />} onClick={onFilter} />
            </Space>
        </div>
    );
};

export default QuizActionsBar;