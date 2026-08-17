"use client";

import { Alert, Button, Dropdown, Grid, Radio, Space } from "antd";
import {
    DownloadOutlined,
    FileExcelOutlined,
    FileTextOutlined,
    SaveOutlined,
    StopOutlined,
    UnorderedListOutlined,
    ReloadOutlined,
    LinkOutlined,
    FolderAddOutlined,
    UploadOutlined,
    DownOutlined,
    MoreOutlined,
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
    onCreateProgram: () => void;
    onImportProgram: () => void;
    onFilter: () => void;
    onImport: () => void;
    onExport: (format: LessonExportFormat, scope: LessonExportScope) => void;
    onEnableReorder: () => void;
    onCancelReorder: () => void;
    onSaveReorder: () => void;
    onReorderStrategyChange: (strategy: LessonReorderStrategy) => void;
    onReload: () => void;
    onManageCourseIds: () => void;
    canManageCourseIds: boolean;
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
    onCreateProgram,
    onImportProgram,
    onFilter,
    onImport,
    onExport,
    onEnableReorder,
    onCancelReorder,
    onSaveReorder,
    onReorderStrategyChange,
    onReload,
    onManageCourseIds,
    canManageCourseIds,
}: LessonActionsProps) => {
    const screens = Grid.useBreakpoint();
    const compact = !screens.md;
    const programMenuItems = [
        { key: "create-program", icon: <FolderAddOutlined />, label: "Tạo chương trình" },
        { key: "import-program", icon: <UploadOutlined />, label: "Import chương trình" },
    ];
    const exportMenuItems = [
        { key: "xlsx-filter", icon: <FileExcelOutlined />, label: "Excel theo bộ lọc" },
        { key: "csv-filter", icon: <FileTextOutlined />, label: "CSV theo bộ lọc" },
        { key: "xlsx-selected", icon: <FileExcelOutlined />, label: "Excel bản ghi đã chọn", disabled: selectedCount === 0 },
        { key: "csv-selected", icon: <FileTextOutlined />, label: "CSV bản ghi đã chọn", disabled: selectedCount === 0 },
        { key: "xlsx-all", icon: <FileExcelOutlined />, label: "Excel toàn bộ" },
        { key: "csv-all", icon: <FileTextOutlined />, label: "CSV toàn bộ" },
    ];
    const handleProgramMenuClick = ({ key }: { key: string }) => {
        if (key === "create-program") onCreateProgram();
        if (key === "import-program") onImportProgram();
    };
    const handleExportMenuClick = ({ key }: { key: string }) => {
        const [format, scope] = String(key).split("-") as [LessonExportFormat, LessonExportScope];
        onExport(format, scope);
    };

    const desktopUtilityActions = (
        <>
            {canCreate && (
                <Dropdown menu={{ items: programMenuItems, onClick: handleProgramMenuClick }} trigger={["click"]}>
                    <Button icon={<FolderAddOutlined />}>Chương trình <DownOutlined /></Button>
                </Dropdown>
            )}
            <Dropdown menu={{ items: exportMenuItems, onClick: handleExportMenuClick }} trigger={["click"]}>
                <Button icon={<DownloadOutlined />}>Export</Button>
            </Dropdown>
            <Button icon={<ReloadOutlined />} onClick={onReload} />
            {canEdit && (
                <Button icon={<LinkOutlined />} disabled={!canManageCourseIds} onClick={onManageCourseIds}>
                    Course ID theo bài
                </Button>
            )}
            {canEdit && <Button icon={<UnorderedListOutlined />} onClick={onEnableReorder}>Sắp xếp thứ tự</Button>}
        </>
    );
    const mobileUtilityActions = (
        <Dropdown
            menu={{
                items: [
                    ...(canCreate ? programMenuItems : []),
                    { type: "divider" as const },
                    ...exportMenuItems,
                    { type: "divider" as const },
                    { key: "reload", icon: <ReloadOutlined />, label: "Làm mới" },
                    ...(canEdit ? [{ key: "manage-course-ids", icon: <LinkOutlined />, label: "Course ID theo bài", disabled: !canManageCourseIds }] : []),
                    ...(canEdit ? [{ key: "reorder", icon: <UnorderedListOutlined />, label: "Sắp xếp thứ tự" }] : []),
                ],
                onClick: ({ key }) => {
                    if (key === "create-program" || key === "import-program") {
                        handleProgramMenuClick({ key });
                    } else if (String(key).startsWith("xlsx-") || String(key).startsWith("csv-")) {
                        handleExportMenuClick({ key: String(key) });
                    } else if (key === "reload") {
                        onReload();
                    } else if (key === "manage-course-ids") {
                        onManageCourseIds();
                    } else if (key === "reorder") {
                        onEnableReorder();
                    }
                },
            }}
            trigger={["click"]}
        >
            <Button icon={<MoreOutlined />}>Thao tác khác</Button>
        </Dropdown>
    );

    return (
    <>
        <SearchAndActionsBar
            onSearch={onSearch}
            placeholder="Tìm theo tên bài học..."
            titleBtnAdd="Bài học"
            handleAddBtn={canCreate && !reorderMode ? onCreate : undefined}
            handleFilterBtn={!reorderMode ? onFilter : undefined}
            filterLabel="Lọc"
            handleImportClick={canCreate && !reorderMode ? onImport : undefined}
            extraExportButton={
                <>
                    {!reorderMode && (
                        compact ? mobileUtilityActions : desktopUtilityActions
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
                </>
            }
        />

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
};

export default LessonActions;
