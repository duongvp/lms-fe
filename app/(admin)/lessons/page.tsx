"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Modal, notification } from "antd";
import { DownOutlined, InfoCircleOutlined, UpOutlined } from "@ant-design/icons";
import { useAuthStore } from "@/stores/authStore";
import { PermissionKey } from "@/types/permissions";
import {
    canEditAnyField,
    resolveModuleFieldPermissions,
    sanitizeEditablePayload,
} from "@/helper/fieldPolicy";
import type { ModuleField } from "@/types/fieldPolicy";
import {
    createLesson,
    deleteLesson,
    downloadLessonTemplate,
    exportLessons,
    importLessonsFile,
    type LessonApiResponse,
    type LessonExportParams,
    type LessonListParams,
    type LessonPayload,
    reorderLessons,
    updateLesson,
} from "@/services/lessonService";
import { useLessonsQuery, useLmsCache, useModuleFieldsQuery } from "@/hooks/useLmsQueries";
import LessonFormModal, { FORM_FIELDS } from "./components/Modal/LessonFormModal";
import LessonActions from "./components/LessonActions";
import LessonFilterDrawer from "./components/LessonFilterDrawer";
import LessonImportModal from "./components/LessonImportModal";
import LessonTable from "./components/LessonTable";
import {
    DEFAULT_MODULE_FIELDS,
    LESSON_MODULE_CODE,
    LIST_FIELD_CODES,
} from "./lesson.constants";
import type {
    LessonDataType,
    LessonExportFormat,
    LessonExportScope,
    LessonFilterValues,
    LessonImportError,
    LessonImportMode,
    LessonReorderStrategy,
    LessonSortState,
} from "./lesson.types";
import { cleanFilterValues, downloadBlob } from "./lesson.utils";

const Page = () => {
    const [data, setData] = useState<LessonDataType[]>([]);
    const [saving, setSaving] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [searchText, setSearchText] = useState("");
    const [filterValues, setFilterValues] = useState<LessonFilterValues>({});
    const [sortState, setSortState] = useState<LessonSortState>({});
    const [openFilterDrawer, setOpenFilterDrawer] = useState(false);
    const [openFormModal, setOpenFormModal] = useState(false);
    const [openImportModal, setOpenImportModal] = useState(false);
    const [openDetailDrawer, setOpenDetailDrawer] = useState(false);
    const [moduleFields, setModuleFields] = useState<ModuleField[]>(DEFAULT_MODULE_FIELDS);
    const [selectedRecord, setSelectedRecord] = useState<LessonDataType | null>(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [reorderMode, setReorderMode] = useState(false);
    const [reorderStrategy, setReorderStrategy] = useState<LessonReorderStrategy>("insert");
    const [savingReorder, setSavingReorder] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importErrors, setImportErrors] = useState<LessonImportError[]>([]);
    const [dragRowKey, setDragRowKey] = useState<React.Key | null>(null);
    const [showPageInfo, setShowPageInfo] = useState(true);
    const [api, contextHolder] = notification.useNotification();
    const hasPermission = useAuthStore((state) => state.hasPermission);
    const { fieldPolicy } = useAuthStore((state) => state.user);

    const canCreate = hasPermission(PermissionKey.LESSON_CREATE);
    const canEdit = hasPermission(PermissionKey.LESSON_EDIT);
    const canDelete = hasPermission(PermissionKey.LESSON_DELETE);

    const fieldPermissions = resolveModuleFieldPermissions(
        moduleFields,
        fieldPolicy,
        LESSON_MODULE_CODE
    );
    const formFieldPermissions = resolveModuleFieldPermissions(
        FORM_FIELDS,
        fieldPolicy,
        LESSON_MODULE_CODE
    );
    const visibleFieldPermissions = fieldPermissions.filter(
        (item) => item.visible && LIST_FIELD_CODES.has(item.field.fieldCode)
    );
    const visibleFormFieldCodes = formFieldPermissions
        .filter((item) => item.visible)
        .map((item) => item.field.fieldCode);
    const editableFormFieldCodes = formFieldPermissions
        .filter((item) => item.editable)
        .map((item) => item.field.fieldCode);

    const lessonParams = useMemo<LessonListParams>(() => ({
        page: currentPage,
        limit: pageSize,
        ...filterValues,
        sort_by: sortState.sort_by,
        sort_order: sortState.sort_by
            ? (sortState.sort_order === "descend" ? "desc" : "asc")
            : undefined,
    }), [currentPage, pageSize, filterValues, sortState]);
    const lessonsQuery = useLessonsQuery(lessonParams);
    const moduleFieldsQuery = useModuleFieldsQuery(LESSON_MODULE_CODE);
    const { refreshLessons } = useLmsCache();
    const loading = lessonsQuery.isLoading || lessonsQuery.isValidating;

    useEffect(() => {
        const response: any = lessonsQuery.data;
        if (!response?.data) return;
        const list = response.data.data ?? [];
        setData(list.map((item: LessonApiResponse) => ({
            ...item,
            key: String(item.id),
        })));
        setTotalItems(response.data.total ?? 0);
    }, [lessonsQuery.data]);

    useEffect(() => {
        if (!lessonsQuery.error) return;
        api.error({
            message: "Lỗi khi tải dữ liệu",
            description: lessonsQuery.error.message || "Không thể tải danh sách bài học.",
        });
    }, [api, lessonsQuery.error]);

    useEffect(() => {
        const fields = moduleFieldsQuery.data?.fields;
        if (fields?.length) {
            const mergedFields = new Map(
                DEFAULT_MODULE_FIELDS.map((field) => [field.fieldCode, field])
            );
            fields.forEach((field) => mergedFields.set(field.fieldCode, field));
            setModuleFields(Array.from(mergedFields.values()).sort(
                (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
            ));
        }
    }, [moduleFieldsQuery.data]);

    const handleSearch = async (value: string) => {
        setSearchText(value);
        setFilterValues((prev) => cleanFilterValues({ ...prev, keyword: value }));
        setCurrentPage(1);
    };

    const handleFilter = (values: LessonFilterValues) => {
        setFilterValues(cleanFilterValues({ ...values, keyword: searchText }));
        setCurrentPage(1);
        setOpenFilterDrawer(false);
    };

    const handleResetFilter = () => {
        setFilterValues(cleanFilterValues({ keyword: searchText }));
        setCurrentPage(1);
        setOpenFilterDrawer(false);
    };

    const handleOpenCreate = () => {
        if (!canEditAnyField(FORM_FIELDS, fieldPolicy, LESSON_MODULE_CODE)) {
            api.warning({
                message: "Không có quyền",
                description: "Vai trò hiện tại không có quyền chỉnh sửa/thêm dữ liệu bài học.",
            });
            return;
        }
        setSelectedRecord(null);
        setOpenFormModal(true);
    };

    const handleSubmit = async (payload: LessonPayload) => {
        try {
            setSaving(true);
            const sanitizedPayload = sanitizeEditablePayload(
                payload,
                FORM_FIELDS,
                fieldPolicy,
                LESSON_MODULE_CODE
            ) as LessonPayload;

            if (Object.keys(sanitizedPayload).length === 0) {
                api.warning({
                    message: "Không có quyền",
                    description: "Không có trường nào được phép chỉnh sửa.",
                });
                return;
            }

            if (selectedRecord) {
                await updateLesson(selectedRecord.id, sanitizedPayload);
                api.success({
                    message: "Cập nhật thành công",
                    description: "Đã cập nhật nội dung bài học.",
                });
            } else {
                await createLesson(sanitizedPayload);
                api.success({
                    message: "Tạo thành công",
                    description: "Đã thêm bài học mới.",
                });
            }

            setOpenFormModal(false);
            setSelectedRecord(null);
            await refreshLessons();
        } catch (error: any) {
            api.error({
                message: "Lưu thất bại",
                description: error.message || "Vui lòng kiểm tra lại dữ liệu.",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (record: LessonDataType) => {
        Modal.confirm({
            title: "Xác nhận xóa",
            content: `Bạn có chắc chắn muốn xóa bài học "${record.lesson_name}" không?`,
            okText: "Xóa",
            okType: "danger",
            cancelText: "Hủy",
            onOk: async () => {
                try {
                    await deleteLesson(record.id);
                    api.success({
                        message: "Xóa thành công",
                        description: "Bài học đã được chuyển về trạng thái không hoạt động.",
                    });
                    await refreshLessons();
                } catch (error: any) {
                    api.error({
                        message: "Xóa thất bại",
                        description: error.message || "Không thể xóa bài học.",
                    });
                }
            },
        });
    };

    const handleEnableReorder = () => {
        if (!filterValues.grade || !filterValues.subject_code) {
            api.warning({
                message: "Cần chọn Khối và Mã môn học",
                description: "Sắp xếp thứ tự chỉ áp dụng trong đúng một chương trình môn học.",
            });
            setOpenFilterDrawer(true);
            return;
        }

        setSelectedRowKeys([]);
        setReorderMode(true);
        setReorderStrategy("insert");
        setCurrentPage(1);
        setPageSize(100);
        setSortState({ sort_by: "learn_number", sort_order: "ascend" });
    };

    const handleCancelReorder = () => {
        setReorderMode(false);
        setDragRowKey(null);
        void refreshLessons();
    };

    const handleDropRow = (targetKey: React.Key) => {
        if (!dragRowKey || dragRowKey === targetKey) return;

        setData((prev) => {
            const sourceIndex = prev.findIndex((item) => item.key === dragRowKey);
            const targetIndex = prev.findIndex((item) => item.key === targetKey);
            if (sourceIndex < 0 || targetIndex < 0) return prev;

            const next = [...prev];
            if (reorderStrategy === "swap") {
                [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
            } else {
                const [moved] = next.splice(sourceIndex, 1);
                next.splice(targetIndex, 0, moved);
            }
            return next.map((item, index) => ({ ...item, learn_number: index + 1 }));
        });
        setDragRowKey(null);
    };

    const handleSaveReorder = async () => {
        if (!filterValues.grade || !filterValues.subject_code) return;
        if (totalItems > data.length) {
            api.warning({
                message: "Danh sách chưa đầy đủ",
                description: "Vui lòng tải toàn bộ bài học trước khi sắp xếp.",
            });
            return;
        }

        try {
            setSavingReorder(true);
            await reorderLessons({
                grade: Number(filterValues.grade),
                subject_code: String(filterValues.subject_code),
                mode: reorderStrategy,
                ordered_ids: data.map((item) => item.id),
            });
            api.success({ message: "Đã lưu thứ tự bài học" });
            setReorderMode(false);
            await refreshLessons();
        } catch (error: any) {
            api.error({
                message: "Lưu thứ tự thất bại",
                description: error.message || "Không thể cập nhật thứ tự bài học.",
            });
        } finally {
            setSavingReorder(false);
        }
    };

    const handleExport = async (
        format: LessonExportFormat,
        scope: LessonExportScope
    ) => {
        try {
            const params: LessonExportParams = { format };
            if (scope === "filter") {
                Object.assign(params, filterValues, {
                    keyword: searchText || filterValues.keyword,
                    sort_by: sortState.sort_by,
                    sort_order: sortState.sort_by
                        ? (sortState.sort_order === "descend" ? "desc" : "asc")
                        : undefined,
                });
            }
            if (scope === "selected") {
                if (!selectedRowKeys.length) {
                    api.warning({
                        message: "Chưa chọn bài học",
                        description: "Vui lòng chọn ít nhất một bài học để export.",
                    });
                    return;
                }
                params.ids = selectedRowKeys.map(String);
            }

            const blob = await exportLessons(params);
            const scopeName = scope === "selected"
                ? "selected"
                : scope === "filter" ? "filtered" : "all";
            downloadBlob(blob, `lessons-${scopeName}.${format}`);
        } catch (error: any) {
            api.error({
                message: "Export thất bại",
                description: error.message || "Không thể export danh sách bài học.",
            });
        }
    };

    const handleDownloadTemplate = async (format: LessonExportFormat) => {
        try {
            const blob = await downloadLessonTemplate(format);
            downloadBlob(blob, `lessons-import-template.${format}`);
        } catch (error: any) {
            api.error({
                message: "Tải file mẫu thất bại",
                description: error.message || "Không thể tải file mẫu.",
            });
        }
    };

    const handleImport = async (file: File, mode: LessonImportMode) => {
        try {
            setImporting(true);
            setImportErrors([]);
            const response: any = await importLessonsFile(file, mode);
            api.success({
                message: "Import thành công",
                description: `Đã xử lý ${response?.data?.total ?? 0} dòng: tạo mới ${response?.data?.created ?? 0}, cập nhật ${response?.data?.updated ?? 0}, bỏ qua ${response?.data?.skipped ?? 0}.`,
            });
            setOpenImportModal(false);
            await refreshLessons();
        } catch (error: any) {
            const errors = error?.detail?.errors ?? [];
            if (Array.isArray(errors) && errors.length) {
                setImportErrors(errors);
            }
            api.error({
                message: "Import thất bại",
                description: error.message || "File import có dữ liệu không hợp lệ.",
            });
        } finally {
            setImporting(false);
        }
    };

    return (
        <>
            {contextHolder}
            <div
                style={{
                    border: "1px solid #d6e4ff",
                    background: "#f6fbff",
                    borderRadius: 8,
                    padding: showPageInfo ? "10px 12px" : "8px 12px",
                    marginBottom: 10,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <InfoCircleOutlined style={{ color: "#1677ff", fontSize: 16 }} />
                        <span style={{ fontWeight: 600 }}>Quản lý nội dung bài học</span>
                    </div>
                    <Button
                        type="text"
                        size="small"
                        icon={showPageInfo ? <UpOutlined /> : <DownOutlined />}
                        onClick={() => setShowPageInfo((value) => !value)}
                    >
                        {showPageInfo ? "Ẩn thông tin" : "Hiện thông tin"}
                    </Button>
                </div>
                <div
                    style={{
                        display: "grid",
                        gridTemplateRows: showPageInfo ? "1fr" : "0fr",
                        transition: "grid-template-rows 0.3s ease-in-out",
                        overflow: "hidden",
                    }}
                >
                    <div style={{ minHeight: 0 }}>
                        <div 
                            style={{ 
                                marginTop: 6, 
                                paddingLeft: 24, 
                                color: "rgba(0, 0, 0, 0.72)", 
                                lineHeight: 1.55 
                            }}
                        >
                            Tạo và chỉnh sửa danh mục bài học theo khối, môn học, thứ tự bài. Dùng bộ lọc để tìm nhanh,
                            import/export dữ liệu khi cần cập nhật hàng loạt, và mở từng dòng để xem thông tin chi tiết.
                        </div>
                    </div>
                </div>
            </div>
            <LessonActions
                canCreate={canCreate}
                canEdit={canEdit}
                selectedCount={selectedRowKeys.length}
                reorderMode={reorderMode}
                reorderStrategy={reorderStrategy}
                savingReorder={savingReorder}
                onSearch={handleSearch}
                onCreate={handleOpenCreate}
                onFilter={() => setOpenFilterDrawer(true)}
                onImport={() => {
                    setImportErrors([]);
                    setOpenImportModal(true);
                }}
                onExport={handleExport}
                onEnableReorder={handleEnableReorder}
                onCancelReorder={handleCancelReorder}
                onSaveReorder={handleSaveReorder}
                onReorderStrategyChange={setReorderStrategy}
                onReload={() => {
                    handleResetFilter();
                    void refreshLessons();
                }}
            />

            <LessonTable
                data={data}
                loading={loading}
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={totalItems}
                sortState={sortState}
                visibleFieldPermissions={visibleFieldPermissions}
                selectedRowKeys={selectedRowKeys}
                reorderMode={reorderMode}
                dragRowKey={dragRowKey as React.Key}
                canEdit={canEdit}
                canDelete={canDelete}
                visibleFormFieldCodes={[...visibleFormFieldCodes, "updated_at"]}
                tableScrollY={showPageInfo ? "calc(100vh - 330px)" : "calc(100vh - 260px)"}
                onSelectionChange={setSelectedRowKeys}
                onPageChange={(page, size) => {
                    setCurrentPage(page);
                    setPageSize(size);
                }}
                onSortChange={(sorter) => {
                    setSortState(sorter);
                    setCurrentPage(1);
                }}
                onDragStart={setDragRowKey}
                onDrop={handleDropRow}
                onEdit={(record) => {
                    setSelectedRecord(record);
                    setOpenFormModal(true);
                }}
                onDelete={handleDelete}
            />

            <LessonFilterDrawer
                open={openFilterDrawer}
                value={filterValues}
                loading={loading}
                onClose={() => setOpenFilterDrawer(false)}
                onSearch={handleFilter}
                onReset={handleResetFilter}
            />
            <LessonFormModal
                open={openFormModal}
                record={selectedRecord}
                loading={saving}
                visibleFieldCodes={visibleFormFieldCodes}
                editableFieldCodes={editableFormFieldCodes}
                onClose={() => {
                    setOpenFormModal(false);
                    setSelectedRecord(null);
                }}
                onSubmit={handleSubmit}
            />
            <LessonImportModal
                open={openImportModal}
                loading={importing}
                errors={importErrors}
                onClose={() => setOpenImportModal(false)}
                onSubmit={handleImport}
                onDownloadTemplate={handleDownloadTemplate}
            />
        </>
    );
};

export default Page;
