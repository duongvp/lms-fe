"use client";

import { useState } from "react";

import { Alert, Button, Collapse, Dropdown, Grid, Radio, Space, Tooltip, Typography } from "antd";
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
  FilterOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import CustomSearchInput from "@/components/ui/Inputs/CustomSearchInput";
import { Popup as MobilePopup } from "antd-mobile";
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
  renumberEnabled: boolean;
  onSearch: (value: string) => Promise<void>;
  searchValue: string;
  onCreate: () => void;
  onCreateProgram: () => void;
  onImportProgram: () => void;
  onFilter: () => void;
  onImport: () => void;
  onExport: (format: LessonExportFormat, scope: LessonExportScope) => void;
  onEnableReorder: () => void;
  onCancelReorder: () => void;
  onSaveReorder: () => void;
  onToggleRenumber: () => void;
  onReorderStrategyChange: (strategy: LessonReorderStrategy) => void;
  onReload: () => void;
  onManageCourseIds: () => void;
  canManageCourseIds: boolean;
  onSyncScormNames: () => void;
  onSyncHocmaiScormNames: () => void;
}

const LessonActions = ({
  canCreate,
  canEdit,
  selectedCount,
  reorderMode,
  reorderStrategy,
  savingReorder,
  renumberEnabled,
  onSearch,
  searchValue,
  onCreate,
  onCreateProgram,
  onImportProgram,
  onFilter,
  onImport,
  onExport,
  onEnableReorder,
  onCancelReorder,
  onSaveReorder,
  onToggleRenumber,
  onReorderStrategyChange,
  onReload,
  onManageCourseIds,
  canManageCourseIds,
  onSyncScormNames,
  onSyncHocmaiScormNames,
}: LessonActionsProps) => {
  const screens = Grid.useBreakpoint();
  const compact = !screens.md;
  const programMenuItems = [
    {
      key: "create-program",
      icon: <FolderAddOutlined />,
      label: "Tạo chương trình",
    },
    {
      key: "import-program",
      icon: <UploadOutlined />,
      label: "Import chương trình",
    },
  ];
  const exportMenuItems = [
    {
      key: "xlsx-filter",
      icon: <FileExcelOutlined />,
      label: "Excel theo bộ lọc",
    },
    { key: "csv-filter", icon: <FileTextOutlined />, label: "CSV theo bộ lọc" },
    {
      key: "xlsx-selected",
      icon: <FileExcelOutlined />,
      label: "Excel bản ghi đã chọn",
      disabled: selectedCount === 0,
    },
    {
      key: "csv-selected",
      icon: <FileTextOutlined />,
      label: "CSV bản ghi đã chọn",
      disabled: selectedCount === 0,
    },
    { key: "xlsx-all", icon: <FileExcelOutlined />, label: "Excel toàn bộ" },
    { key: "csv-all", icon: <FileTextOutlined />, label: "CSV toàn bộ" },
  ];
  const handleProgramMenuClick = ({ key }: { key: string }) => {
    if (key === "create-program") onCreateProgram();
    if (key === "import-program") onImportProgram();
  };
  const handleExportMenuClick = ({ key }: { key: string }) => {
    const [format, scope] = String(key).split("-") as [
      LessonExportFormat,
      LessonExportScope,
    ];
    onExport(format, scope);
  };

  const desktopUtilityActions = (
    <>
      {canCreate && (
        <Dropdown
          menu={{ items: programMenuItems, onClick: handleProgramMenuClick }}
          trigger={["click"]}
        >
          <Button icon={<FolderAddOutlined />}>
            Chương trình <DownOutlined />
          </Button>
        </Dropdown>
      )}
      <Dropdown
        menu={{ items: exportMenuItems, onClick: handleExportMenuClick }}
        trigger={["click"]}
      >
        <Button icon={<DownloadOutlined />}>Export</Button>
      </Dropdown>
      <Button icon={<ReloadOutlined />} onClick={onReload} />
      {canEdit && (
        <Button
          icon={<LinkOutlined />}
          disabled={!canManageCourseIds}
          onClick={onManageCourseIds}
        >
          Course ID theo bài
        </Button>
      )}
      {canEdit && (
        <Button onClick={onSyncScormNames}>Đồng bộ từ Google Sheets</Button>
      )}
      {canEdit && (
        <Button disabled={!canManageCourseIds} onClick={onSyncHocmaiScormNames}>
          Đồng bộ tên SCORM từ HOCMAI
        </Button>
      )}
      {canEdit && (
        <Button icon={<UnorderedListOutlined />} onClick={onEnableReorder}>
          Sắp xếp thứ tự
        </Button>
      )}
    </>
  );
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [mobileActionGroup, setMobileActionGroup] = useState<string>();
  const runMobileAction = (action: () => void) => {
    setMobileActionsOpen(false);
    action();
  };
  const mobileUtilityActions = (
    <>
      <Button
        className="schedule-mobile-toolbar-button"
        aria-label="Mở menu thao tác"
        icon={<MoreOutlined />}
        onClick={() => { setMobileActionGroup(undefined); setMobileActionsOpen(true); }}
      />
      <MobilePopup
        position="bottom"
        visible={mobileActionsOpen}
        onClose={() => setMobileActionsOpen(false)}
        closeOnMaskClick
        bodyClassName="lesson-actions-sheet"
        bodyStyle={{ maxHeight: "min(80dvh, 560px)" }}
      >
        <div className="lesson-actions-sheet-header">
          <Typography.Text strong>Thao tác đề cương</Typography.Text>
          <Button type="text" aria-label="Đóng menu thao tác" icon={<CloseOutlined />} onClick={() => setMobileActionsOpen(false)} />
        </div>
        <div className="lesson-actions-sheet-body">
          <Collapse
            accordion
            ghost
            activeKey={mobileActionGroup}
            onChange={(key) => setMobileActionGroup(Array.isArray(key) ? key[0] : key)}
            items={[
              ...(canCreate ? [{
                key: "program",
                label: "Chương trình",
                children: <div className="lesson-actions-sheet-list">
                  {programMenuItems.map((item) => (
                    <Button key={item.key} type="text" block icon={item.icon} onClick={() => runMobileAction(() => handleProgramMenuClick({ key: item.key }))}>
                      {item.label}
                    </Button>
                  ))}
                </div>,
              }] : []),
              {
                key: "export",
                label: "Xuất dữ liệu",
                children: <div className="lesson-actions-sheet-list">
                  {exportMenuItems.map((item) => (
                    <Button key={item.key} type="text" block icon={item.icon} disabled={"disabled" in item && item.disabled} onClick={() => runMobileAction(() => handleExportMenuClick({ key: item.key }))}>
                      {item.label}
                    </Button>
                  ))}
                </div>,
              },
              {
                key: "tools",
                label: "Công cụ",
                children: <div className="lesson-actions-sheet-list">
                  <Button type="text" block icon={<ReloadOutlined />} onClick={() => runMobileAction(onReload)}>Làm mới</Button>
                  {canEdit && <>
                    <Button type="text" block icon={<LinkOutlined />} disabled={!canManageCourseIds} onClick={() => runMobileAction(onManageCourseIds)}>Course ID theo bài</Button>
                    <Button type="text" block onClick={() => runMobileAction(onSyncScormNames)}>Đồng bộ từ Google Sheets</Button>
                    <Button type="text" block disabled={!canManageCourseIds} onClick={() => runMobileAction(onSyncHocmaiScormNames)}>Đồng bộ tên SCORM từ HOCMAI</Button>
                    <Button type="text" block icon={<UnorderedListOutlined />} onClick={() => runMobileAction(onEnableReorder)}>Sắp xếp thứ tự</Button>
                  </>}
                </div>,
              },
            ]}
          />
        </div>
      </MobilePopup>
    </>
  );

  return (
    <>
      {compact ? (
        <div className="schedule-mobile-toolbar lesson-mobile-toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
          {!reorderMode ? (
            <>
              <div className="schedule-mobile-search">
                <CustomSearchInput
                  placeholder="Tìm theo tên bài học..."
                  value={searchValue}
                  fetchApi={onSearch}
                />
              </div>
              <Tooltip title="Lọc đề cương">
                <Button className="schedule-mobile-toolbar-button" aria-label="Lọc đề cương" icon={<FilterOutlined />} onClick={onFilter} />
              </Tooltip>
              {mobileUtilityActions}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 8 }}>
              <Radio.Group
                value={reorderStrategy}
                onChange={(event) =>
                  onReorderStrategyChange(event.target.value)
                }
                optionType="button"
                buttonStyle="solid"
                options={[
                  { label: "Chèn vị trí", value: "insert" },
                  { label: "Đổi chỗ", value: "swap" },
                ]}
                style={{ display: 'flex', width: '100%' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button style={{ flex: 1, padding: 0 }} icon={<StopOutlined />} onClick={onCancelReorder}>
                  Hủy
                </Button>
                <Button
                  style={{ flex: 1, padding: 0 }}
                  type={renumberEnabled ? "primary" : "default"}
                  ghost={renumberEnabled}
                  icon={<ReloadOutlined />}
                  onClick={onToggleRenumber}
                >
                  {renumberEnabled ? "Khôi phục" : "Đánh số"}
                </Button>
                <Button
                  style={{ flex: 1, padding: 0 }}
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={savingReorder}
                  onClick={onSaveReorder}
                >
                  Lưu
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <SearchAndActionsBar
          onSearch={onSearch}
          searchValue={searchValue}
          placeholder="Tìm theo tên bài học..."
          titleBtnAdd="Bài học"
          handleAddBtn={canCreate && !reorderMode ? onCreate : undefined}
          handleFilterBtn={!reorderMode ? onFilter : undefined}
          filterLabel="Lọc"
          handleImportClick={canCreate && !reorderMode ? onImport : undefined}
          extraExportButton={
            <>
              {!reorderMode && desktopUtilityActions}
              {reorderMode && (
                <>
                  <Radio.Group
                    value={reorderStrategy}
                    onChange={(event) =>
                      onReorderStrategyChange(event.target.value)
                    }
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
                    type={renumberEnabled ? "primary" : "default"}
                    ghost={renumberEnabled}
                    icon={<ReloadOutlined />}
                    onClick={onToggleRenumber}
                  >
                    {renumberEnabled ? "Khôi phục số bài" : "Đánh lại số bài"}
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
      )}

      {reorderMode && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={
            reorderStrategy === "insert"
              ? `Kiểu Chèn vị trí: bài được kéo sẽ chèn vào vị trí mới, các bài ở giữa tự dịch chuyển.${renumberEnabled ? " Số bài đang được đánh liên tục theo thứ tự mới; chọn Khôi phục số bài để hoàn tác." : ""}`
              : `Kiểu Đổi chỗ: bài được kéo và bài tại vị trí thả sẽ đổi vị trí trực tiếp.${renumberEnabled ? " Số bài đang được đánh liên tục theo thứ tự mới; chọn Khôi phục số bài để hoàn tác." : ""}`
          }
        />
      )}
    </>
  );
};

export default LessonActions;
