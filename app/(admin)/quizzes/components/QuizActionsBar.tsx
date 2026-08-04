"use client";

import { Alert, Button, Tooltip } from "antd";
import {
    DragOutlined,
    ExportOutlined,
    ReloadOutlined,
    SaveOutlined,
    StopOutlined,
} from "@ant-design/icons";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";

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
    onImport,
    onExport,
    onEnableReorder,
    onCancelReorder,
    onSaveReorder,
    onRefresh,
}: QuizActionsBarProps) => (
    <>
        <SearchAndActionsBar
            onSearch={onSearch}
            placeholder="Tìm theo nội dung câu hỏi..."
            titleBtnAdd="Câu hỏi"
            titleBtnImport="Nhập từ Excel"
            handleAddBtn={canCreate && !reorderMode ? onCreate : undefined}
            handleImportClick={canImport && !reorderMode ? onImport : undefined}
            extraExportButton={
                <>
                    {!reorderMode && canExport && (
                        <Tooltip title={selectedCount
                            ? `Chỉ xuất ${selectedCount} câu hỏi đang được chọn trong bảng`
                            : "Xuất toàn bộ câu hỏi phù hợp với bộ lọc hiện tại"}
                        >
                            <Button icon={<ExportOutlined />} onClick={onExport}>
                                {selectedCount
                                    ? `Xuất ${selectedCount} câu đã chọn`
                                    : "Xuất danh sách đang lọc"}
                            </Button>
                        </Tooltip>
                    )}
                    {!reorderMode && (
                        <Button
                            aria-label="Tải lại danh sách"
                            icon={<ReloadOutlined />}
                            onClick={onRefresh}
                            loading={refreshing}
                        />
                    )}
                    {canEdit && !reorderMode && (
                        <Button icon={<DragOutlined />} onClick={onEnableReorder}>
                            Sắp xếp câu hỏi
                        </Button>
                    )}
                    {reorderMode && (
                        <>
                            <Button icon={<StopOutlined />} onClick={onCancelReorder}>
                                Hủy sắp xếp
                            </Button>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                loading={savingReorder}
                                onClick={onSaveReorder}
                            >
                                Lưu thứ tự
                            </Button>
                        </>
                    )}
                </>
            }
        />

        {reorderMode && (
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message="Kéo từng dòng đến vị trí mới trong bài học. Thứ tự chỉ được lưu khi bạn chọn “Lưu thứ tự”."
            />
        )}
    </>
);

export default QuizActionsBar;
