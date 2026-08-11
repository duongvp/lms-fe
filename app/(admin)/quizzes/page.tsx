"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { Key } from "react";
import { Button, Form, Modal, notification, Drawer, Select, Space, Empty, Dropdown } from "antd";
import { DownOutlined, InfoCircleOutlined, UpOutlined, EditOutlined, ReloadOutlined, DownloadOutlined, FilterOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd/es/upload/interface";
import { useAuthStore } from "@/stores/authStore";
import { PermissionKey } from "@/types/permissions";
import { resolveModuleFieldPermissions, sanitizeEditablePayload } from "@/helper/fieldPolicy";
import type { ModuleField } from "@/types/fieldPolicy";
import { useModuleFieldsQuery } from "@/hooks/useLmsQueries";
import {
    useQuizCache,
    useQuizClassesQuery,
    useQuizIndexSuggestionQuery,
    useQuizLessonsQuery,
    useQuizzesQuery,
} from "@/hooks/useQuizQueries";
import {
    createQuiz,
    disableQuiz,
    downloadQuizTemplate,
    exportQuizzes,
    getQuizIndexSuggestion,
    importQuizzesFile,
    reorderQuizzes,
    restoreQuiz,
    updateQuiz,
    type QuizApiResponse,
    type QuizClassOption,
    type QuizLessonOption,
    type QuizListParams,
    type QuizPayload,
} from "@/services/quizService";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import QuizFormModal from "./components/QuizFormModal";
import QuizImportModal from "./components/QuizImportModal";
import QuizPreviewModal from "./components/QuizPreviewModal";
import QuizTable from "./components/QuizTable";
import { QUIZ_FIELDS, QUIZ_MODULE_CODE } from "./quiz.constants";
import type { QuizClassSelectOption, QuizFilterValues, QuizFormValues } from "./quiz.types";
import {
    downloadQuizBlob,
    getAnswerKey,
    INITIAL_QUIZ_FORM_VALUES,
    quizFormToPayload,
    recordToQuizForm,
} from "./quiz.utils";
import styles from "./quiz.module.css";

// ✅ Hook debounce
function useDebounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const fnRef = useRef(fn);
    fnRef.current = fn;

    return useCallback((...args: Parameters<T>) => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            fnRef.current(...args);
        }, delay);
    }, [delay]);
}

const QuizManagementPage = () => {
    const [form] = Form.useForm<QuizFormValues>();
    const [api, contextHolder] = notification.useNotification();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const previousPageSizeRef = useRef(10);
    const [keyword, setKeyword] = useState("");
    const [filters, setFilters] = useState<QuizFilterValues>({});
    const [submittedFilters, setSubmittedFilters] = useState<QuizFilterValues>({});
    const [submittedKeyword, setSubmittedKeyword] = useState("");
    const [hasSearched, setHasSearched] = useState(false);
    const [editing, setEditing] = useState<QuizApiResponse | null>(null);
    const [preview, setPreview] = useState<QuizFormValues>(INITIAL_QUIZ_FORM_VALUES);
    const [saving, setSaving] = useState(false);
    const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
    const [formOpen, setFormOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importMode, setImportMode] = useState<"skip" | "overwrite">("skip");
    const [importFiles, setImportFiles] = useState<UploadFile[]>([]);
    const [moduleFields, setModuleFields] = useState<ModuleField[]>(QUIZ_FIELDS);
    const [reorderMode, setReorderMode] = useState(false);
    const [reorderRows, setReorderRows] = useState<QuizApiResponse[]>([]);
    const [dragRowKey, setDragRowKey] = useState<Key | null>(null);
    const [savingReorder, setSavingReorder] = useState(false);
    const [showPageInfo, setShowPageInfo] = useState(true);
    const [openFilterDrawer, setOpenFilterDrawer] = useState(false);

    const hasPermission = useAuthStore((state) => state.hasPermission);
    const can = useAuthStore((state) => state.can);
    const fieldPolicy = useAuthStore((state) => state.user.fieldPolicy);
    const activeProgramCode = String(submittedFilters.code || "").trim() || undefined;
    const canCreate = can(PermissionKey.QUIZ_CREATE, activeProgramCode);
    const canEdit = can(PermissionKey.QUIZ_EDIT, activeProgramCode);
    const canDelete = can(PermissionKey.QUIZ_DELETE, activeProgramCode);
    const canImport = can(PermissionKey.QUIZ_IMPORT, activeProgramCode);
    const canExport = can(PermissionKey.QUIZ_EXPORT, activeProgramCode);

    const params = useMemo<QuizListParams>(() => {
        if (!hasSearched && !reorderMode) return {} as QuizListParams;

        if (reorderMode) {
            return {
                page: 1,
                limit: 100,
                code: submittedFilters.code,
                learn_number: submittedFilters.learn_number,
                sort_by: "quiz_index",
                sort_order: "asc",
            };
        }

        return {
            page,
            limit: pageSize,
            keyword: submittedKeyword || undefined,
            ...submittedFilters,
            sort_by: "updated_at",
            sort_order: "desc",
        };
    }, [submittedFilters, submittedKeyword, page, pageSize, reorderMode, hasSearched]);

    const quizzesQuery = useQuizzesQuery((hasSearched || reorderMode) ? params : null);
    const classesQuery = useQuizClassesQuery();
    const moduleFieldsQuery = useModuleFieldsQuery(QUIZ_MODULE_CODE);
    const selectedFormCode = Form.useWatch("code", form);
    const selectedFormLearnNumber = Form.useWatch("learn_number", form);
    const selectedFormQuizIndex = Form.useWatch("quiz_index", form);
    const formLessonsQuery = useQuizLessonsQuery(selectedFormCode);
    const filterLessonsQuery = useQuizLessonsQuery(filters.code);
    const { refreshQuizzes } = useQuizCache();

    const response = quizzesQuery.data?.data;
    const data = useMemo<QuizApiResponse[]>(() => {
        if (!hasSearched && !reorderMode) return [];
        return response?.data || [];
    }, [response?.data, hasSearched, reorderMode]);
    const total = Number(response?.total || 0);
    const classRows: QuizClassOption[] = Array.isArray(classesQuery.data?.data)
        ? classesQuery.data.data
        : [];
    const formLessons: QuizLessonOption[] = formLessonsQuery.data?.data || [];
    const filterLessons: QuizLessonOption[] = filterLessonsQuery.data?.data || [];

    const suggestionParams = useMemo(() => {
        if (!selectedFormCode || !selectedFormLearnNumber) return null;
        return {
            code: selectedFormCode,
            learn_number: Number(selectedFormLearnNumber),
            exclude_quiz_id: editing?.quiz_id,
        };
    }, [editing?.quiz_id, selectedFormCode, selectedFormLearnNumber]);

    const duplicateIndexParams = useMemo(() => {
        if (!suggestionParams || selectedFormQuizIndex === undefined || selectedFormQuizIndex === null) return null;
        return {
            ...suggestionParams,
            quiz_index: Number(selectedFormQuizIndex),
        };
    }, [selectedFormQuizIndex, suggestionParams]);

    const quizIndexSuggestionQuery = useQuizIndexSuggestionQuery(suggestionParams);
    const duplicateIndexQuery = useQuizIndexSuggestionQuery(duplicateIndexParams);
    const suggestedQuizIndex = quizIndexSuggestionQuery.data?.data?.next_index;
    const duplicateIndexQuiz: QuizApiResponse | null = duplicateIndexQuery.data?.data?.duplicate || null;

    useEffect(() => {
        const fields = moduleFieldsQuery.data?.fields;
        if (!fields?.length) return;
        const merged = new Map(QUIZ_FIELDS.map((item) => [item.fieldCode, item]));
        fields.forEach((item) => merged.set(item.fieldCode, item));
        setModuleFields(Array.from(merged.values()).sort(
            (left, right) => (left.sortOrder || 0) - (right.sortOrder || 0)
        ));
    }, [moduleFieldsQuery.data]);

    useEffect(() => {
        if (!quizzesQuery.error) return;
        api.error({
            message: "Không thể tải câu hỏi",
            description: quizzesQuery.error.message,
        });
    }, [api, quizzesQuery.error]);

    useEffect(() => {
        if (!classesQuery.error) return;
        api.error({
            message: "Không thể tải danh sách Chương trình",
            description: classesQuery.error.message,
        });
    }, [api, classesQuery.error]);

    useEffect(() => {
        if (!reorderMode) return;
        setReorderRows(data
            .filter((item) => item.quiz_status !== "disable")
            .sort((left, right) => Number(left.quiz_index) - Number(right.quiz_index))
        );
    }, [data, reorderMode]);

    const fieldPermissions = useMemo(
        () => resolveModuleFieldPermissions(moduleFields, fieldPolicy, QUIZ_MODULE_CODE),
        [fieldPolicy, moduleFields]
    );
    const fieldRule = (fieldCode: string) => fieldPermissions.find(
        (item) => item.field.fieldCode === fieldCode
    ) || { visible: false, editable: false };
    const canViewField = (fieldCode: string) => fieldRule(fieldCode).visible;
    const canEditField = (fieldCode: string) => fieldRule(fieldCode).editable;
    const canEditQuizIndex = canEditField("quiz_index");

    useEffect(() => {
        if (!formOpen || editing || !selectedFormCode || !selectedFormLearnNumber) return;
        if (!canEditQuizIndex) return;
        if (suggestedQuizIndex === undefined || suggestedQuizIndex === null) return;
        if (form.isFieldTouched("quiz_index")) return;
        form.setFieldValue("quiz_index", suggestedQuizIndex);
    }, [
        canEditQuizIndex,
        editing,
        form,
        formOpen,
        selectedFormCode,
        selectedFormLearnNumber,
        suggestedQuizIndex,
    ]);

    const classOptions = useMemo<QuizClassSelectOption[]>(() => {
        return classRows.map((item) => ({
            value: item.code,
            label: item.subject_name ? `${item.code} — ${item.subject_name}` : item.code,
            searchText: `${item.code} ${item.subject_name || ""}`,
        }));
    }, [classRows]);

    const resetEditor = () => {
        setEditing(null);
        form.resetFields();
        form.setFieldsValue(INITIAL_QUIZ_FORM_VALUES);
        setPreview(INITIAL_QUIZ_FORM_VALUES);
    };

    // ✅ Hàm thực sự submit search (được debounce)
    const doSearch = useCallback((keywordValue: string) => {
        if (!hasSearched) return;
        setSubmittedKeyword(keywordValue);
        setPage(1);
    }, [hasSearched]);

    // ✅ Debounce hàm doSearch với 500ms
    const debouncedDoSearch = useDebounce(doSearch, 500);

    const handleSearch = useCallback(async (value: string) => {
        const trimmed = value.trim();
        setKeyword(trimmed);
        debouncedDoSearch(trimmed);
    }, [debouncedDoSearch]);

    const handleFilterSubmit = () => {
        if (!filters.code) {
            api.warning({ message: "Vui lòng chọn Chương trình" });
            return;
        }
        setSubmittedFilters(filters);
        setSubmittedKeyword(keyword);
        setHasSearched(true);
        setPage(1);
        setOpenFilterDrawer(false);
    };

    const handleResetFilter = () => {
        setFilters({});
        setKeyword("");
        setSubmittedFilters({});
        setSubmittedKeyword("");
        setHasSearched(false);
        setPage(1);
        setOpenFilterDrawer(false);
    };

    const handleOpenCreate = () => {
        if (!submittedFilters.code) {
            api.warning({ message: "Vui lòng chọn Chương trình trước khi thêm câu hỏi" });
            setOpenFilterDrawer(true);
            return;
        }
        resetEditor();
        form.setFieldValue("code", submittedFilters.code);
        setFormOpen(true);
    };

    const handleOpenEdit = (record: QuizApiResponse) => {
        const values = recordToQuizForm(record);
        setEditing(record);
        form.setFieldsValue(values);
        setPreview(values);
        setFormOpen(true);
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        resetEditor();
    };

    const handleResetForm = () => {
        const values = editing
            ? recordToQuizForm(editing)
            : INITIAL_QUIZ_FORM_VALUES;
        form.setFieldsValue(values);
        setPreview(values);
    };

    const handleOpenPreview = (record?: QuizApiResponse) => {
        setPreview(record ? recordToQuizForm(record) : form.getFieldsValue(true));
        setPreviewOpen(true);
    };

    const handleSubmit = async (values: QuizFormValues) => {
        try {
            const payload = quizFormToPayload(values);
            if (
                payload.quiz_type === 1
                && !payload.ans.some((item) => Boolean(item[getAnswerKey(item) || "A"]))
            ) {
                throw new Error("Cần chọn ít nhất một đáp án đúng.");
            }
            const sanitized = sanitizeEditablePayload(
                payload,
                QUIZ_FIELDS,
                fieldPolicy,
                QUIZ_MODULE_CODE
            );
            if (!Object.keys(sanitized).length) {
                throw new Error("Vai trò hiện tại không được chỉnh sửa trường dữ liệu nào.");
            }
            const indexResult = await getQuizIndexSuggestion({
                code: payload.code,
                learn_number: payload.learn_number,
                quiz_index: payload.quiz_index,
                exclude_quiz_id: editing?.quiz_id,
            });
            const duplicate = indexResult?.data?.duplicate as QuizApiResponse | null | undefined;
            let overwriteQuizId: string | null = null;
            if (duplicate) {
                if (editing) {
                    throw new Error(`Thứ tự ${payload.quiz_index} đang có câu hỏi khác. Vui lòng chọn thứ tự khác.`);
                }
                if (!canEdit) {
                    throw new Error("Thứ tự này đã có câu hỏi. Cần quyền cập nhật để ghi đè câu hỏi cũ.");
                }
                const confirmed = await new Promise<boolean>((resolve) => {
                    Modal.confirm({
                        title: "Thứ tự đã có câu hỏi",
                        content: `Thứ tự ${payload.quiz_index} hiện đang là "${duplicate.quiz_name}". Nếu tiếp tục lưu, câu hỏi cũ sẽ được ghi đè bằng nội dung mới.`,
                        okText: "Ghi đè",
                        cancelText: "Kiểm tra lại",
                        onOk: () => resolve(true),
                        onCancel: () => resolve(false),
                    });
                });
                if (!confirmed) return;
                overwriteQuizId = duplicate.quiz_id;
            }
            setSaving(true);
            if (editing) {
                await updateQuiz(editing.quiz_id, sanitized);
                api.success({ message: "Đã cập nhật câu hỏi" });
            } else if (overwriteQuizId) {
                await updateQuiz(overwriteQuizId, sanitized);
                api.success({ message: "Đã ghi đè câu hỏi cũ" });
            } else {
                await createQuiz(sanitized as QuizPayload);
                api.success({ message: "Đã thêm câu hỏi mới" });
            }
            handleCloseForm();
            if (hasSearched || reorderMode) {
                await refreshQuizzes();
            }
        } catch (error: any) {
            api.error({
                message: "Không thể lưu câu hỏi",
                description: error.message || "Vui lòng kiểm tra lại dữ liệu.",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDisable = async (record: QuizApiResponse) => {
        try {
            await disableQuiz(record.quiz_id);
            api.success({ message: "Đã vô hiệu hóa câu hỏi" });
            if (hasSearched || reorderMode) {
                await refreshQuizzes();
            }
        } catch (error: any) {
            api.error({ message: "Không thể vô hiệu hóa", description: error.message });
        }
    };

    const handleRestore = async (record: QuizApiResponse) => {
        try {
            await restoreQuiz(record.quiz_id);
            api.success({
                message: "Đã khôi phục câu hỏi",
                description: "Câu hỏi được chuyển về trạng thái đã hoàn thiện.",
            });
            if (hasSearched || reorderMode) {
                await refreshQuizzes();
            }
        } catch (error: any) {
            api.error({ message: "Không thể khôi phục", description: error.message });
        }
    };

    const handleExport = async () => {
        if (!submittedFilters.code) {
            api.warning({ message: "Vui lòng chọn Chương trình trước khi xuất file" });
            return;
        }
        try {
            const blob = await exportQuizzes({
                ...params,
                format: "xlsx",
                quiz_ids: selectedKeys.length ? selectedKeys.map(String) : undefined,
            });
            downloadQuizBlob(blob, "danh-sach-cau-hoi.xlsx");
            api.success({
                message: "Đã xuất danh sách câu hỏi",
                description: selectedKeys.length
                    ? `File gồm ${selectedKeys.length} câu hỏi bạn đã chọn.`
                    : "File gồm toàn bộ câu hỏi phù hợp với bộ lọc hiện tại.",
            });
        } catch (error: any) {
            api.error({ message: "Xuất file thất bại", description: error.message });
        }
    };

    const handleDownloadTemplate = async () => {
        const code = String(submittedFilters.code || "").trim();
        if (!code) {
            api.warning({ message: "Vui lòng chọn Chương trình trước khi tải file mẫu" });
            return;
        }
        try {
            downloadQuizBlob(
                await downloadQuizTemplate("xlsx", code),
                "mau-import-cau-hoi-v2.xlsx"
            );
        } catch (error: any) {
            api.error({ message: "Không thể tải file mẫu", description: error.message });
        }
    };

    const handleImport = async () => {
        const code = String(submittedFilters.code || "").trim();
        if (!code) {
            api.warning({ message: "Vui lòng chọn Chương trình trước khi import" });
            return;
        }
        const file = importFiles[0]?.originFileObj;
        if (!file) {
            api.warning({ message: "Vui lòng chọn file .xlsx hoặc .csv" });
            return;
        }
        try {
            setImporting(true);
            const result = await importQuizzesFile(file, importMode, code);
            const summary = result?.data;
            api.success({
                message: "Nhập câu hỏi thành công",
                description: summary
                    ? `Tạo mới ${summary.created || 0}, cập nhật ${summary.updated || 0}, bỏ qua ${summary.skipped || 0}.`
                    : undefined,
            });
            setImportOpen(false);
            setImportFiles([]);
            if (hasSearched || reorderMode) {
                await refreshQuizzes();
            }
        } catch (error: any) {
            const errors = error?.detail?.errors;
            if (Array.isArray(errors) && errors.length) {
                Modal.error({
                    title: `File có ${errors.length} dòng cần sửa`,
                    width: 620,
                    okText: "Đã hiểu",
                    content: (
                        <div>
                            <p>Chưa có dữ liệu nào được lưu. Hãy sửa các dòng dưới đây trong Excel rồi nhập lại:</p>
                            <div style={{ maxHeight: 260, overflowY: "auto" }}>
                                {errors.slice(0, 20).map((item: { row: number; message: string }, index: number) => (
                                    <div key={`${item.row}-${index}`} style={{ marginBottom: 6 }}>
                                        <b>Dòng {item.row}:</b> {item.message}
                                    </div>
                                ))}
                            </div>
                            {errors.length > 20 && <p>Còn {errors.length - 20} lỗi khác. Hãy kiểm tra lại toàn bộ file.</p>}
                        </div>
                    ),
                });
                return;
            }
            api.error({
                message: "Nhập file thất bại",
                description: error.message,
                duration: 7,
            });
        } finally {
            setImporting(false);
        }
    };

    const handleEnableReorder = () => {
        if (
            !filters.code
            || filters.learn_number === undefined
            || filters.learn_number === null
            || filters.learn_number === ""
        ) {
            api.warning({
                message: "Chọn Chương trình và bài học trước",
                description: "Thứ tự câu hỏi được quản lý riêng trong từng bài học.",
            });
            return;
        }

        if (!hasSearched) {
            setSubmittedFilters(filters);
            setSubmittedKeyword(keyword);
            setHasSearched(true);
        }

        previousPageSizeRef.current = pageSize;
        setSelectedKeys([]);
        setPage(1);
        setPageSize(100);
        setReorderMode(true);
    };

    const handleDropRow = (targetKey: Key) => {
        if (!dragRowKey || dragRowKey === targetKey) return;
        setReorderRows((current) => {
            const sourceIndex = current.findIndex((item) => item.quiz_id === dragRowKey);
            const targetIndex = current.findIndex((item) => item.quiz_id === targetKey);
            if (sourceIndex < 0 || targetIndex < 0) return current;
            const next = [...current];
            const [moved] = next.splice(sourceIndex, 1);
            next.splice(targetIndex, 0, moved);
            return next.map((item, index) => ({ ...item, quiz_index: index + 1 }));
        });
        setDragRowKey(null);
    };

    const handleCancelReorder = () => {
        setReorderMode(false);
        setDragRowKey(null);
        setPage(1);
        setPageSize(previousPageSizeRef.current);
        if (hasSearched) {
            void refreshQuizzes();
        }
    };

    const handleSaveReorder = async () => {
        if (!filters.code || filters.learn_number === undefined || filters.learn_number === "") return;
        if (total > data.length) {
            api.warning({
                message: "Danh sách câu hỏi vượt quá 100 dòng",
                description: "Không thể sắp xếp khi chưa tải đủ toàn bộ câu hỏi của bài học.",
            });
            return;
        }
        try {
            setSavingReorder(true);
            await reorderQuizzes({
                code: filters.code,
                learn_number: Number(filters.learn_number),
                ordered_quiz_ids: reorderRows.map((item) => item.quiz_id),
            });
            api.success({ message: "Đã lưu thứ tự câu hỏi" });
            setReorderMode(false);
            setPage(1);
            setPageSize(previousPageSizeRef.current);
            if (hasSearched) {
                await refreshQuizzes();
            }
        } catch (error: any) {
            api.error({ message: "Không thể lưu thứ tự", description: error.message });
        } finally {
            setSavingReorder(false);
        }
    };

    // ✅ Filter drawer với đầy đủ 4 field
    const filterDrawer = (
        <Drawer
            title="Bộ lọc câu hỏi"
            placement="right"
            open={openFilterDrawer}
            onClose={() => setOpenFilterDrawer(false)}
            width={360}
            footer={
                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                    <Button onClick={handleResetFilter}>Đặt lại</Button>
                    <Button
                        type="primary"
                        onClick={handleFilterSubmit}
                        loading={quizzesQuery.isLoading || quizzesQuery.isValidating}
                    >
                        Lọc
                    </Button>
                </Space>
            }
        >
            <div>
                <Form layout="vertical">
                    <Form.Item label="Chương trình" required>
                        <Select
                            showSearch
                            allowClear
                            placeholder="Chọn Chương trình"
                            loading={classesQuery.isLoading || classesQuery.isValidating}
                            filterOption={(input, option) =>
                                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                            }
                            options={classOptions}
                            value={filters.code || undefined}
                            onChange={(value) => {
                                setFilters((prev) => ({
                                    ...prev,
                                    code: value || undefined,
                                    learn_number: undefined,
                                }));
                            }}
                        />
                    </Form.Item>
                    <Form.Item label="Bài học">
                        <Select
                            showSearch
                            allowClear
                            placeholder="Chọn bài học"
                            loading={filterLessonsQuery.isLoading || filterLessonsQuery.isValidating}
                            disabled={!filters.code}
                            filterOption={(input, option) =>
                                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                            }
                            options={filterLessons.map((item) => ({
                                value: item.learn_number,
                                label: `Bài ${item.learn_number}${item.lesson_name ? `: ${item.lesson_name}` : ""}`,
                            }))}
                            value={filters.learn_number !== undefined ? Number(filters.learn_number) : undefined}
                            onChange={(value) => {
                                setFilters((prev) => ({
                                    ...prev,
                                    learn_number: value !== undefined && value !== null ? String(value) : undefined,
                                }));
                            }}
                        />
                    </Form.Item>
                    <Form.Item label="Trạng thái">
                        <Select
                            allowClear
                            placeholder="Tất cả trạng thái"
                            options={[
                                { value: "active", label: "Hoàn thiện" },
                                { value: "disable", label: "Đã vô hiệu hóa" },
                            ]}
                            value={filters.quiz_status || undefined}
                            onChange={(value) => {
                                setFilters((prev) => ({ ...prev, quiz_status: value || undefined }));
                            }}
                        />
                    </Form.Item>
                    <Form.Item label="Loại câu hỏi">
                        <Select
                            mode="multiple"
                            allowClear
                            placeholder="Tất cả loại"
                            options={[
                                { value: 1, label: "Trắc nghiệm" },
                                { value: 2, label: "Điền từ" },
                                { value: 3, label: "Tự luận" },
                            ]}
                            value={
                                filters.quiz_type !== undefined
                                    ? String(filters.quiz_type)
                                        .split(",")
                                        .map(Number)
                                        .filter((n) => !isNaN(n))
                                    : undefined
                            }
                            onChange={(value) => {
                                setFilters((prev) => ({
                                    ...prev,
                                    quiz_type: (value && value.length > 0
                                        ? (value as number[]).join(",")
                                        : undefined) as any,
                                }));
                            }}
                        />
                    </Form.Item>
                </Form>
            </div>
        </Drawer>
    );

    return <div className={styles.page}>
        {contextHolder}
        <div className={`${styles.pageInfo} ${showPageInfo ? styles.pageInfoExpanded : ""}`}>
            <div className={styles.pageInfoHeader}>
                <div className={styles.pageInfoTitle}>
                    <InfoCircleOutlined />
                    <span>Quản lý câu hỏi</span>
                </div>
                <Button
                    type="link"
                    size="small"
                    icon={showPageInfo ? <UpOutlined /> : <DownOutlined />}
                    onClick={() => setShowPageInfo((value) => !value)}
                >
                    {showPageInfo ? "Ẩn thông tin" : "Hiện thông tin"}
                </Button>
            </div>
            <div className={styles.pageInfoBody} style={{ gridTemplateRows: showPageInfo ? "1fr" : "0fr" }}>
                <div>
                    <p>
                        Tạo và quản lý ngân hàng câu hỏi theo Chương trình và bài học. Dùng bộ lọc để tìm nhanh,
                        nhập/xuất Excel khi cập nhật hàng loạt và kéo thả để sắp xếp câu hỏi trong từng bài học.
                    </p>
                </div>
            </div>
        </div>

        <SearchAndActionsBar
            onSearch={handleSearch}
            placeholder="Tìm kiếm câu hỏi..."
            handleAddBtn={canCreate ? handleOpenCreate : undefined}
            handleImportClick={canImport ? () => {
                if (!submittedFilters.code) {
                    api.warning({ message: "Vui lòng chọn Chương trình trước khi import" });
                    setOpenFilterDrawer(true);
                    return;
                }
                setImportFiles([]);
                setImportOpen(true);
            } : undefined}
            handleFilterBtn={() => setOpenFilterDrawer(true)}
            extraExportButton={
                <>
                    {canExport && (
                        <Dropdown
                            trigger={["click"]}
                            menu={{
                                items: [
                                    { key: "xlsx", label: "Xuất Excel (.xlsx)" },
                                ],
                                onClick: () => handleExport(),
                            }}
                        >
                            <Button icon={<DownloadOutlined />}>
                                Export{selectedKeys.length ? ` (${selectedKeys.length})` : ""}
                            </Button>
                        </Dropdown>
                    )}
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={() => {
                            if (hasSearched || reorderMode) void refreshQuizzes();
                        }}
                    />
                    {canEdit && (
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={handleEnableReorder}
                        >
                            Sắp xếp
                        </Button>
                    )}
                </>
            }
        />

        {filterDrawer}

        {!hasSearched && !reorderMode ? (
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                    <span>
                        Vui lòng chọn điều kiện lọc và bấm{" "}
                        <FilterOutlined /> <b>Lọc</b> để xem dữ liệu
                    </span>
                }
                style={{ padding: "48px 0" }}
            />
        ) : (
            <QuizTable
                data={reorderMode ? reorderRows : data}
                loading={quizzesQuery.isLoading || quizzesQuery.isValidating}
                total={total}
                page={page}
                pageSize={pageSize}
                selectedKeys={selectedKeys}
                reorderMode={reorderMode}
                dragRowKey={dragRowKey}
                canEdit={canEdit}
                canDelete={canDelete}
                canExport={canExport}
                lessons={filterLessons}
                filterCode={filters.code}
                canViewField={canViewField}
                hasSearched={hasSearched}
                onSelectionChange={setSelectedKeys}
                onPageChange={(nextPage, nextSize) => {
                    if (!hasSearched && !reorderMode) return;
                    setPage(nextSize !== pageSize ? 1 : nextPage);
                    setPageSize(nextSize);
                }}
                onDragStart={setDragRowKey}
                onDrop={handleDropRow}
                onPreview={handleOpenPreview}
                onEdit={handleOpenEdit}
                onDisable={handleDisable}
                onRestore={handleRestore}
            />
        )}

        <QuizFormModal
            open={formOpen}
            editing={editing}
            form={form}
            classOptions={classOptions}
            classesLoading={classesQuery.isLoading || classesQuery.isValidating}
            selectedCode={selectedFormCode}
            lessons={formLessons}
            lessonsLoading={formLessonsQuery.isLoading || formLessonsQuery.isValidating}
            suggestedQuizIndex={suggestedQuizIndex}
            duplicateIndexQuiz={duplicateIndexQuiz}
            indexSuggestionLoading={quizIndexSuggestionQuery.isLoading || duplicateIndexQuery.isLoading}
            saving={saving}
            canViewField={canViewField}
            canEditField={canEditField}
            onSubmit={handleSubmit}
            onPreview={() => handleOpenPreview()}
            onReset={handleResetForm}
            onClose={handleCloseForm}
        />
        <QuizPreviewModal
            open={previewOpen}
            values={preview}
            canViewAnswers={canViewField("ans")}
            canViewDuration={canViewField("ans_duration")}
            canViewStatus={canViewField("quiz_status")}
            onClose={() => setPreviewOpen(false)}
        />
        <QuizImportModal
            open={importOpen}
            importing={importing}
            mode={importMode}
            files={importFiles}
            onModeChange={setImportMode}
            onFilesChange={setImportFiles}
            onDownloadTemplate={handleDownloadTemplate}
            onImport={handleImport}
            onClose={() => { setImportOpen(false); setImportFiles([]); }}
        />
    </div>;
};

export default QuizManagementPage;
