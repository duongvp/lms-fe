"use client";

import { Alert, Button, Dropdown, Radio, Space } from "antd";
import {
    DownloadOutlined,
    FileExcelOutlined,
    FileTextOutlined,
    SaveOutlined,
    StopOutlined,
    UnorderedListOutlined,
} from "@ant-design/icons";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import type {
    LessonExportFormat,
    LessonExportScope,
    LessonReorderStrategy,
} from "../lesson.types";

interface LessonActionsProps {
    canCreate: boolean;
    canEdit: boolean;
    selectedCount: number;
    reorderMode: boolean;
    reorderStrategy: LessonReorderStrategy;
    savingReorder: boolean;
    onSearch: (value: string) => Promise<void>;
    onCreate: () => void;
    onFilter: () => void;
    onImport: () => void;
    onExport: (format: LessonExportFormat, scope: LessonExportScope) => void;
    onEnableReorder: () => void;
    onCancelReorder: () => void;
    onSaveReorder: () => void;
    onReorderStrategyChange: (strategy: LessonReorderStrategy) => void;
}

const LessonActions = ({
    canCreate,
    canEdit,
    selectedCount,
    reorderMode,
    reorderStrategy,
    savingReorder,
    onSearch,
    onCreate,
    onFilter,
    onImport,
    onExport,
    onEnableReorder,
    onCancelReorder,
    onSaveReorder,
    onReorderStrategyChange,
}: LessonActionsProps) => (
    <>
        <SearchAndActionsBar
            onSearch={onSearch}
            placeholder="Tìm theo tên bài học..."
            titleBtnAdd="Bài học"
            handleAddBtn={canCreate ? onCreate : undefined}
            handleFilterBtn={onFilter}
            handleImportClick={canCreate ? onImport : undefined}
            extraExportButton={
                <Dropdown
                    menu={{
                        items: [
                            { key: "xlsx-filter", icon: <FileExcelOutlined />, label: "Excel theo bộ lọc" },
                            { key: "csv-filter", icon: <FileTextOutlined />, label: "CSV theo bộ lọc" },
                            { key: "xlsx-selected", icon: <FileExcelOutlined />, label: "Excel bản ghi đã chọn", disabled: selectedCount === 0 },
                            { key: "csv-selected", icon: <FileTextOutlined />, label: "CSV bản ghi đã chọn", disabled: selectedCount === 0 },
                            { key: "xlsx-all", icon: <FileExcelOutlined />, label: "Excel toàn bộ" },
                            { key: "csv-all", icon: <FileTextOutlined />, label: "CSV toàn bộ" },
                        ],
                        onClick: ({ key }) => {
                            const [format, scope] = String(key).split("-") as [
                                LessonExportFormat,
                                LessonExportScope,
                            ];
                            onExport(format, scope);
                        },
                    }}
                    trigger={["click"]}
                >
                    <Button icon={<DownloadOutlined />}>Export</Button>
                </Dropdown>
            }
        />

        <Space wrap style={{ width: "100%", justifyContent: "flex-end", marginBottom: 12 }}>
            {canEdit && !reorderMode && (
                <Button icon={<UnorderedListOutlined />} onClick={onEnableReorder}>
                    Sắp xếp thứ tự
                </Button>
            )}
            {reorderMode && (
                <>
                    <Radio.Group
                        value={reorderStrategy}
                        onChange={(event) => onReorderStrategyChange(event.target.value)}
                        optionType="button"
                        buttonStyle="solid"
                        options={[
                            { label: "Chèn vị trí", value: "insert" },
                            { label: "Đổi chỗ", value: "swap" },
                        ]}
                    />
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
        </Space>

        {reorderMode && (
            <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message={reorderStrategy === "insert"
                    ? "Kiểu Chèn vị trí: bài được kéo sẽ chèn vào vị trí mới, các bài ở giữa tự dịch chuyển."
                    : "Kiểu Đổi chỗ: bài được kéo và bài tại vị trí thả sẽ đổi vị trí trực tiếp."}
            />
        )}
    </>
);

export default LessonActions;
