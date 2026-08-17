"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Modal, notification, Spin, Tag } from "antd";
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
    clearLessonReauthToken,
    createLessonProgram,
    createLesson,
    deleteLesson,
    downloadLessonTemplate,
    downloadLessonProgramTemplate,
    exportLessons,
    importLessonsFile,
    importLessonProgramFile,
    hasLessonReauthToken,
    reauthenticateLessons,
    validateLessonReauthentication,
    type LessonApiResponse,
    type LessonExportParams,
    type LessonListParams,
    type LessonPayload,
    type CreateLessonProgramPayload,
    reorderLessons,
    updateLesson,
} from "@/services/lessonService";
import { useLessonsQuery, useLmsCache, useModuleFieldsQuery } from "@/hooks/useLmsQueries";
import { useLessonProgramOptions } from "@/hooks/useLessonSubjectOptions";
import LessonFormModal, { FORM_FIELDS } from "./components/Modal/LessonFormModal";
import LessonActions from "./components/LessonActions";
import LessonFilterDrawer from "./components/LessonFilterDrawer";
import LessonImportModal from "./components/LessonImportModal";
import LessonCourseMappingModal from "./components/Modal/LessonCourseMappingModal";
import ProgramCreateModal from "./components/Modal/ProgramCreateModal";
import ProgramImportModal from "./components/Modal/ProgramImportModal";
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

// ✅ Hàm debounce helper
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

const Page = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [data, setData] = useState<LessonDataType[]>([]);
    const [saving, setSaving] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [searchText, setSearchText] = useState("");
    const [filterValues, setFilterValues] = useState<LessonFilterValues>({});
    const [submittedFilterValues, setSubmittedFilterValues] = useState<LessonFilterValues>({});
    const [hasSearched, setHasSearched] = useState(false);
    const [sortState, setSortState] = useState<LessonSortState>({
        sort_by: "learn_number",
        sort_order: "ascend",
    });
    const [openFilterDrawer, setOpenFilterDrawer] = useState(false);
    const [openFormModal, setOpenFormModal] = useState(false);
    const [openProgramModal, setOpenProgramModal] = useState(false);
    const [openProgramImportModal, setOpenProgramImportModal] = useState(false);
    const [openImportModal, setOpenImportModal] = useState(false);
    const [openCourseMappingModal, setOpenCourseMappingModal] = useState(false);
    const [openDetailDrawer, setOpenDetailDrawer] = useState(false);
    const [moduleFields, setModuleFields] = useState<ModuleField[]>(DEFAULT_MODULE_FIELDS);
    const [selectedRecord, setSelectedRecord] = useState<LessonDataType | null>(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [reorderMode, setReorderMode] = useState(false);
    const [reorderStrategy, setReorderStrategy] = useState<LessonReorderStrategy>("insert");
    const [savingReorder, setSavingReorder] = useState(false);
    const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
    const [editingLessonName, setEditingLessonName] = useState("");
    const [savingInlineName, setSavingInlineName] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importErrors, setImportErrors] = useState<LessonImportError[]>([]);
    const [dragRowKey, setDragRowKey] = useState<React.Key | null>(null);
    const [showPageInfo, setShowPageInfo] = useState(true);
    // Dùng token sẵn có ngay khi quay lại trang để tránh nháy trạng thái chưa xác thực.
    // API vẫn kiểm tra token và sẽ khóa lại nếu token đã hết hạn.
    const [secondaryUnlocked, setSecondaryUnlocked] = useState(() => hasLessonReauthToken());
    const [secondaryPromptOpen, setSecondaryPromptOpen] = useState(false);
    const [secondaryChecking, setSecondaryChecking] = useState(true);
    const [secondaryPassword, setSecondaryPassword] = useState("");
    const [secondaryLoading, setSecondaryLoading] = useState(false);
    const [api, contextHolder] = notification.useNotification({duration: 2.5});
    const lessonPrograms = useLessonProgramOptions();

    const replaceLessonUrl = useCallback((values: LessonFilterValues, page = 1) => {
        const params = new URLSearchParams();
        const program = String(values.subject_code || "").trim();
        if (program) useAuthStore.getState().setCurrentProgram(program);
        const lesson = values.learn_number;
        const keyword = String(values.keyword || "").trim();
        if (program) params.set("program", program);
        if (values.grade !== undefined && values.grade !== null) params.set("grade", String(values.grade));
        if (values.subject) params.set("subject", String(values.subject).trim());
        if (lesson !== undefined && lesson !== null) params.set("lesson", String(lesson));
        if (keyword) params.set("q", keyword);
        if (page > 1) params.set("page", String(page));
        router.replace(params.size ? `/lessons?${params.toString()}` : "/lessons", { scroll: false });
    }, [router]);

    useEffect(() => {
        const urlProgram = String(searchParams.get("program") || "").trim();
        const sharedProgram = String(useAuthStore.getState().currentProgram || "").trim();
        const program = urlProgram || sharedProgram;
        if (!program) return;

        // Khi đi từ Lịch học/Câu hỏi sang, URL thường chỉ có `program`.
        // Bổ sung thông tin ngữ cảnh từ danh sách chương trình để thao tác
        // thêm bài học không bị coi là chưa chọn chương trình.
        const matchedProgram = lessonPrograms.find(
            (item) => String(item.subject_code || "").trim() === program
        );
        useAuthStore.getState().setCurrentProgram(program);
        if (!urlProgram) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("program", program);
            router.replace(`/lessons?${params.toString()}`, { scroll: false });
        }
        const lesson = Number(searchParams.get("lesson"));
        const grade = Number(searchParams.get("grade"));
        const keyword = String(searchParams.get("q") || "").trim();
        const page = Math.max(1, Number(searchParams.get("page")) || 1);
        const values = cleanFilterValues({
            subject_code: program,
            grade: grade || matchedProgram?.grade || undefined,
            subject: String(searchParams.get("subject") || "").trim() || matchedProgram?.subject_name || undefined,
            learn_number: lesson || undefined,
            keyword,
        });
        setFilterValues(values);
        setSubmittedFilterValues(values);
        setSearchText(keyword);
        setCurrentPage(page);
        setHasSearched(true);
    }, [lessonPrograms, router, searchParams]);
    const hasPermission = useAuthStore((state) => state.hasPermission);
    const can = useAuthStore((state) => state.can);
    const { fieldPolicy } = useAuthStore((state) => state.user);

    const activeProgramCode = String(submittedFilterValues.subject_code || "").trim() || undefined;
    const canCreate = can(PermissionKey.LESSON_CREATE, activeProgramCode);
    const canEdit = can(PermissionKey.LESSON_EDIT, activeProgramCode);
    const canDelete = can(PermissionKey.LESSON_DELETE, activeProgramCode);

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
    const canEditTitle = editableFormFieldCodes.includes("lesson_name");

    // ✅ Hàm thực sự submit filter (được debounce)
    const doSearch = useCallback((keyword: string) => {
        if (!hasSearched) return;
        const nextValues = cleanFilterValues({ ...submittedFilterValues, keyword });
        setSubmittedFilterValues(nextValues);
        setCurrentPage(1);
        replaceLessonUrl(nextValues);
    }, [hasSearched, submittedFilterValues, replaceLessonUrl]);

    // ✅ Debounce hàm doSearch với 500ms
    const debouncedDoSearch = useDebounce(doSearch, 500);

    const lessonParams = useMemo<LessonListParams>(() => {
        if (!hasSearched) return {} as LessonListParams;

        return {
            page: currentPage,
            limit: pageSize,
            ...submittedFilterValues,
            sort_by: sortState.sort_by,
            sort_order: sortState.sort_by
                ? (sortState.sort_order === "descend" ? "desc" : "asc")
                : undefined,
        };
    }, [currentPage, pageSize, submittedFilterValues, sortState, hasSearched]);

    const lessonsQuery = useLessonsQuery(
        secondaryUnlocked && hasSearched ? lessonParams : null
    );
    const moduleFieldsQuery = useModuleFieldsQuery(LESSON_MODULE_CODE);
    const { refreshLessons } = useLmsCache();
    const loading = lessonsQuery.isLoading || lessonsQuery.isValidating;

    useEffect(() => {
        let active = true;
        const validateStoredToken = async () => {
            if (!hasLessonReauthToken()) {
                if (!active) return;
                setSecondaryUnlocked(false);
                setSecondaryPromptOpen(true);
                setSecondaryChecking(false);
                return;
            }
            try {
                await validateLessonReauthentication();
                if (!active) return;
                setSecondaryUnlocked(true);
                setSecondaryPromptOpen(false);
            } catch {
                if (!active) return;
                clearLessonReauthToken();
                setSecondaryUnlocked(false);
                setSecondaryPromptOpen(true);
            } finally {
                if (active) setSecondaryChecking(false);
            }
        };
        void validateStoredToken();
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (!hasSearched) {
            setData([]);
            setTotalItems(0);
            return;
        }

        const response: any = lessonsQuery.data;
        if (!response?.data) return;
        const list = response.data.data ?? [];
        setData(list.map((item: LessonApiResponse) => ({
            ...item,
            key: String(item.id),
        })));
        setTotalItems(response.data.total ?? 0);
    }, [lessonsQuery.data, hasSearched]);

    useEffect(() => {
        if (!lessonsQuery.error) return;
        if (
            Number((lessonsQuery.error as any)?.status) === 428
            || (lessonsQuery.error as any)?.detail?.code === "LESSONS_REAUTH_REQUIRED"
        ) {
            clearLessonReauthToken();
            setSecondaryUnlocked(false);
            setSecondaryPromptOpen(true);
            setHasSearched(false);
            setData([]);
            setTotalItems(0);
            return;
        }
        api.error({
            message: "Lỗi khi tải dữ liệu",
            description: lessonsQuery.error.message || "Không thể tải danh sách bài học.",
        });
    }, [api, lessonsQuery.error]);

    const handleSecondaryAuth = async () => {
        try {
            setSecondaryLoading(true);
            await reauthenticateLessons(secondaryPassword);
            setSecondaryPassword("");
            setSecondaryUnlocked(true);
            setSecondaryPromptOpen(false);
            await refreshLessons();
            api.success({ message: "Xác thực cấp 2 thành công" });
        } catch (error: any) {
            api.error({
                message: "Xác thực thất bại",
                description: error?.message || "Mật khẩu cấp 2 không đúng.",
            });
        } finally {
            setSecondaryLoading(false);
        }
    };

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

    // ✅ Sửa thành async để khớp với type yêu cầu
    const handleSearch = useCallback(async (value: string) => {
        setSearchText(value);
        setFilterValues((prev) => cleanFilterValues({ ...prev, keyword: value }));
        setCurrentPage(1);

        debouncedDoSearch(value);
    }, [debouncedDoSearch]);

    const handleFilter = (values: LessonFilterValues) => {
        if (!values.subject_code) {
            api.warning({ message: "Vui lòng chọn Chương trình" });
            return;
        }
        const cleaned = cleanFilterValues({ ...values, keyword: searchText });
        setFilterValues(cleaned);
        setSubmittedFilterValues(cleaned);
        setHasSearched(true);
        setCurrentPage(1);
        replaceLessonUrl(cleaned);
        setOpenFilterDrawer(false);
    };

    const handleResetFilter = () => {
        const cleaned = cleanFilterValues({ keyword: "" });
        setSearchText("");
        setFilterValues(cleaned);
        setSubmittedFilterValues(cleaned);
        setHasSearched(false);
        setCurrentPage(1);
        replaceLessonUrl(cleaned);
        setOpenFilterDrawer(false);
    };

    const handleOpenCreate = () => {
        // `submittedFilterValues` được hydrate bất đồng bộ khi vừa chuyển
        // trang/hoàn tất xác thực cấp 2. Ưu tiên URL và shared context để nút
        // Thêm bài học không báo sai là chưa chọn Chương trình.
        const programCode = String(
            submittedFilterValues.subject_code
            || searchParams.get("program")
            || useAuthStore.getState().currentProgram
            || ""
        ).trim();
        if (!programCode) {
            api.warning({ message: "Vui lòng chọn Chương trình trước khi thêm đề cương" });
            setOpenFilterDrawer(true);
            return;
        }
        if (!canEditAnyField(FORM_FIELDS, fieldPolicy, LESSON_MODULE_CODE)) {
            api.warning({
                message: "Không có quyền",
                description: "Vai trò hiện tại không có quyền chỉnh sửa/thêm dữ liệu bài học.",
            });
            return;
        }
        const matchedProgram = lessonPrograms.find(
            (item) => String(item.subject_code || "").trim() === programCode
        );
        const programContext = cleanFilterValues({
            ...submittedFilterValues,
            subject_code: programCode,
            grade: submittedFilterValues.grade ?? matchedProgram?.grade ?? undefined,
            subject: submittedFilterValues.subject || matchedProgram?.subject_name,
        });
        setFilterValues(programContext);
        setSubmittedFilterValues(programContext);
        setHasSearched(true);
        setSelectedRecord(null);
        setOpenFormModal(true);
    };

    const handleSubmit = async (payload: LessonPayload) => {
        try {
            setSaving(true);
            const editablePayload = sanitizeEditablePayload(
                payload,
                FORM_FIELDS,
                fieldPolicy,
                LESSON_MODULE_CODE
            ) as LessonPayload;

            if (Object.keys(editablePayload).length === 0) {
                api.warning({
                    message: "Không có quyền",
                    description: "Không có trường nào được phép chỉnh sửa.",
                });
                return;
            }

            // Chương trình là ngữ cảnh đã chọn ở bộ lọc, không phải field người dùng
            // thao tác trong quyền dữ liệu. Chỉ nội dung đề cương được field-policy kiểm soát.
            const sanitizedPayload = selectedRecord
                ? editablePayload
                : {
                    ...editablePayload,
                    grade: submittedFilterValues.grade === undefined ? undefined : Number(submittedFilterValues.grade),
                    subject_code: String(submittedFilterValues.subject_code || ""),
                    subject_name: String(submittedFilterValues.subject || ""),
                };

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
            if (hasSearched) {
                await refreshLessons();
            }
        } catch (error: any) {
            api.error({
                message: "Lưu thất bại",
                description: error.message || "Vui lòng kiểm tra lại dữ liệu.",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleCreateProgram = async (payload: CreateLessonProgramPayload) => {
        try {
            setSaving(true);
            const response: any = await createLessonProgram({
                ...payload,
                subject_code: payload.subject_code.trim(),
                subject_name: payload.subject_name.trim(),
                lesson_name: payload.lesson_name.trim(),
            });
            const program = response?.data;
            const nextFilters = cleanFilterValues({
                grade: program?.grade ?? payload.grade,
                subject_code: program?.subject_code ?? payload.subject_code,
                subject: program?.subject_name ?? payload.subject_name,
                keyword: "",
            });
            setSearchText("");
            setFilterValues(nextFilters);
            setSubmittedFilterValues(nextFilters);
            setHasSearched(true);
            setCurrentPage(1);
            setOpenProgramModal(false);
            await refreshLessons();
            api.success({
                message: "Tạo Chương trình thành công",
                description: `Đã tạo ${nextFilters.subject_code} cùng bài học đầu tiên.`,
            });
        } catch (error: any) {
            api.error({
                message: "Không thể tạo Chương trình",
                description: error?.message || "Vui lòng kiểm tra lại thông tin.",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleImportProgram = async (file: File | undefined, sheetUrl?: string) => {
        try {
            setImporting(true);
            const response: any = await importLessonProgramFile(file, "overwrite", {}, sheetUrl);
            const program = response?.data?.program;
            const nextFilters = cleanFilterValues({ grade: program.grade ?? undefined, subject_code: program.subject_code, subject: program.subject_name, keyword: "" });
            setFilterValues(nextFilters);
            setSubmittedFilterValues(nextFilters);
            setHasSearched(true);
            setCurrentPage(1);
            setOpenProgramImportModal(false);
            await refreshLessons();
            api.success({ message: "Import chương trình thành công", description: `Đã xử lý ${response?.data?.total ?? 0} bài học.` });
        } catch (error: any) {
            const errors = error?.detail?.errors ?? [];
            if (Array.isArray(errors)) setImportErrors(errors);
            api.error({ message: "Import chương trình thất bại", description: error.message || "Vui lòng kiểm tra lại file và thông tin chương trình." });
        } finally {
            setImporting(false);
        }
    };

    const handleDownloadProgramTemplate = async (format: "csv" | "xlsx") => {
        try {
            const blob = await downloadLessonProgramTemplate(format);
            downloadBlob(blob, `program-import-template.${format}`);
        } catch (error: any) {
            api.error({ message: "Tải file mẫu thất bại", description: error.message || "Không thể tải file mẫu." });
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
                        description: "Bài học chưa được gán lịch đã được xóa khỏi hệ thống.",
                    });
                    if (hasSearched) {
                        await refreshLessons();
                    }
                } catch (error: any) {
                    api.error({
                        message: "Xóa thất bại",
                        description: error.message || "Không thể xóa bài học.",
                    });
                }
            },
        });
    };

    const handleStartEditTitle = (record: LessonDataType) => {
        if (Number(record.past_scheduled_count || 0) > 0) {
            api.warning({ message: "Bài học đã được dạy, không thể chỉnh sửa" });
            return;
        }
        setEditingLessonId(String(record.id));
        setEditingLessonName(String(record.lesson_name || ""));
    };

    const handleSaveEditTitle = async () => {
        if (!editingLessonId) return;
        const lessonName = editingLessonName.trim();
        if (!lessonName) {
            api.warning({ message: "Tên bài học không được để trống" });
            return;
        }
        try {
            setSavingInlineName(true);
            await updateLesson(editingLessonId, { lesson_name: lessonName });
            api.success({ message: "Đã cập nhật tên bài học" });
            setEditingLessonId(null);
            setEditingLessonName("");
            if (hasSearched) await refreshLessons();
        } catch (error: any) {
            api.error({
                message: "Cập nhật thất bại",
                description: error.message || "Không thể cập nhật tên bài học.",
            });
        } finally {
            setSavingInlineName(false);
        }
    };

    const handleEnableReorder = () => {
        if (!filterValues.subject_code) {
            api.warning({
                message: "Cần chọn Mã chương trình",
                description: "Sắp xếp thứ tự chỉ áp dụng trong đúng một chương trình.",
            });
            setOpenFilterDrawer(true);
            return;
        }

        if (!hasSearched) {
            const cleaned = cleanFilterValues(filterValues);
            setSubmittedFilterValues(cleaned);
            setHasSearched(true);
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
        if (hasSearched) {
            void refreshLessons();
        }
    };

    const handleDropRow = (targetKey: React.Key) => {
        if (!dragRowKey || dragRowKey === targetKey) return;

        setData((prev) => {
            const sourceIndex = prev.findIndex((item) => item.key === dragRowKey);
            const targetIndex = prev.findIndex((item) => item.key === targetKey);
            if (sourceIndex < 0 || targetIndex < 0) return prev;

            const learnNumbers = prev
                .map((item) => Number(item.learn_number))
                .sort((left, right) => left - right);
            const next = [...prev];
            if (reorderStrategy === "swap") {
                [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
            } else {
                const [moved] = next.splice(sourceIndex, 1);
                next.splice(targetIndex, 0, moved);
            }
            const movedPastLesson = next.some((item, index) => (
                Number(item.past_scheduled_count || 0) > 0
                && item.key !== prev[index]?.key
            ));
            if (movedPastLesson) {
                api.warning({
                    message: "Không thể sắp xếp qua bài đã dạy",
                    description: "Thứ tự của bài đã dạy phải được giữ nguyên.",
                });
                return prev;
            }
            return next.map((item, index) => ({
                ...item,
                learn_number: learnNumbers[index],
            }));
        });
        setDragRowKey(null);
    };

    const handleSaveReorder = async () => {
        if (!filterValues.subject_code) return;
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
                grade: filterValues.grade === undefined ? undefined : Number(filterValues.grade),
                subject_code: String(filterValues.subject_code),
                mode: reorderStrategy,
                ordered_ids: data.map((item) => item.id),
            });
            api.success({ message: "Đã lưu thứ tự bài học" });
            setReorderMode(false);
            if (hasSearched) {
                await refreshLessons();
            }
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
        const programCode = String(submittedFilterValues.subject_code || "").trim();
        if (!programCode) {
            api.warning({ message: "Vui lòng chọn Chương trình trước khi tải file mẫu" });
            return;
        }
        try {
            const blob = await downloadLessonTemplate(format, programCode);
            downloadBlob(blob, `lessons-import-template.${format}`);
        } catch (error: any) {
            api.error({
                message: "Tải file mẫu thất bại",
                description: error.message || "Không thể tải file mẫu.",
            });
        }
    };

    const handleImport = async (file: File, mode: LessonImportMode) => {
        const programCode = String(submittedFilterValues.subject_code || "").trim();
        if (!programCode) {
            api.warning({ message: "Vui lòng chọn Chương trình trước khi import" });
            setOpenImportModal(false);
            setOpenFilterDrawer(true);
            return;
        }
        try {
            setImporting(true);
            setImportErrors([]);
            const response: any = await importLessonsFile(file, mode, programCode);
            api.success({
                message: "Import thành công",
                description: `Đã xử lý ${response?.data?.total ?? 0} dòng: tạo mới ${response?.data?.created ?? 0}, cập nhật ${response?.data?.updated ?? 0}, bỏ qua ${response?.data?.skipped ?? 0}.`,
            });
            setOpenImportModal(false);
            if (hasSearched) {
                await refreshLessons();
            }
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
        <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, overflow: "hidden" }}>
            {contextHolder}
            <Modal
                open={!secondaryChecking && !secondaryUnlocked && secondaryPromptOpen}
                title="Xác thực bảo mật Đề cương"
                closable
                maskClosable
                keyboard
                okText="Xác thực"
                cancelText="Để sau"
                confirmLoading={secondaryLoading}
                okButtonProps={{ disabled: !secondaryPassword }}
                onOk={() => void handleSecondaryAuth()}
                onCancel={() => {
                    setSecondaryPassword("");
                    setSecondaryPromptOpen(false);
                }}
            >
                <p>Nhập mật khẩu cấp 2 để truy cập phân hệ Quản lý đề cương.</p>
                <Input.Password
                    autoFocus
                    value={secondaryPassword}
                    placeholder="Mật khẩu cấp 2"
                    onChange={(event) => setSecondaryPassword(event.target.value)}
                    onPressEnter={() => {
                        if (secondaryPassword && !secondaryLoading) void handleSecondaryAuth();
                    }}
                />
            </Modal>
            <div
                style={{
                    border: "1px solid #d6e4ff",
                    background: "#f6fbff",
                    borderRadius: 8,
                    padding: showPageInfo ? "10px 12px" : "8px 12px",
                    marginBottom: 10,
                }}
            >
                <div className="responsive-page-info-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <InfoCircleOutlined style={{ color: "#1677ff", fontSize: 16 }} />
                        <span style={{ fontWeight: 600 }}>Quản lý đề cương</span>
                        {submittedFilterValues.subject_code && (
                            <Tag color="blue">
                                Chương trình: {submittedFilterValues.subject_code}{submittedFilterValues.subject ? ` — ${submittedFilterValues.subject}` : ""}
                            </Tag>
                        )}
                        <Button
                            size="small"
                            type={secondaryUnlocked ? "default" : "primary"}
                            onClick={() => setSecondaryPromptOpen(true)}
                            loading={secondaryChecking}
                            disabled={secondaryChecking}
                        >
                            {secondaryChecking ? "Đang kiểm tra" : secondaryUnlocked ? "Xác thực lại" : "Xác thực cấp 2"}
                        </Button>
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
            {secondaryChecking && !secondaryUnlocked ? (
                <div style={{ padding: "48px 24px", textAlign: "center" }}>
                    <Spin tip="Đang kiểm tra phiên xác thực cấp 2..." />
                </div>
            ) : secondaryUnlocked ? (
                <>
            <LessonActions
                canCreate={canCreate}
                canEdit={canEdit}
                selectedCount={selectedRowKeys.length}
                reorderMode={reorderMode}
                reorderStrategy={reorderStrategy}
                savingReorder={savingReorder}
                onSearch={handleSearch}
                onCreate={handleOpenCreate}
                onCreateProgram={() => setOpenProgramModal(true)}
                onImportProgram={() => {
                    setImportErrors([]);
                    setOpenProgramImportModal(true);
                }}
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
                    if (hasSearched) void refreshLessons();
                }}
                canManageCourseIds={Boolean(submittedFilterValues.subject_code)}
                onManageCourseIds={() => setOpenCourseMappingModal(true)}
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
                canEditTitle={canEditTitle}
                canDelete={canDelete}
                editingLessonId={editingLessonId}
                editingLessonName={editingLessonName}
                savingInlineName={savingInlineName}
                visibleFormFieldCodes={[...visibleFormFieldCodes, "updated_at"]}
                hasSearched={hasSearched}
                onSelectionChange={setSelectedRowKeys}
                onPageChange={(page, size) => {
                    if (!hasSearched) return;
                    setCurrentPage(page);
                    setPageSize(size);
                    replaceLessonUrl(submittedFilterValues, size !== pageSize ? 1 : page);
                }}
                onSortChange={(sorter) => {
                    if (!hasSearched) return;
                    setSortState(sorter);
                    setCurrentPage(1);
                    replaceLessonUrl(submittedFilterValues);
                }}
                onDragStart={setDragRowKey}
                onDrop={handleDropRow}
                onStartEditTitle={handleStartEditTitle}
                onChangeEditTitle={setEditingLessonName}
                onSaveEditTitle={handleSaveEditTitle}
                onCancelEditTitle={() => {
                    setEditingLessonId(null);
                    setEditingLessonName("");
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
                programContext={{
                    grade: submittedFilterValues.grade,
                    subject_code: submittedFilterValues.subject_code,
                    subject_name: submittedFilterValues.subject,
                }}
                onClose={() => {
                    setOpenFormModal(false);
                    setSelectedRecord(null);
                }}
                onSubmit={handleSubmit}
            />
            <ProgramCreateModal
                open={openProgramModal}
                loading={saving}
                onClose={() => setOpenProgramModal(false)}
                onSubmit={handleCreateProgram}
            />
            <ProgramImportModal
                open={openProgramImportModal}
                loading={importing}
                onClose={() => setOpenProgramImportModal(false)}
                onSubmit={handleImportProgram}
                onDownloadTemplate={handleDownloadProgramTemplate}
                errors={importErrors}
            />
            <LessonImportModal
                open={openImportModal}
                loading={importing}
                errors={importErrors}
                programName={String(submittedFilterValues.subject || submittedFilterValues.subject_code || "")}
                onClose={() => setOpenImportModal(false)}
                onSubmit={handleImport}
                onDownloadTemplate={handleDownloadTemplate}
            />
            <LessonCourseMappingModal
                open={openCourseMappingModal}
                programCode={String(submittedFilterValues.subject_code || "")}
                selectedLessonIds={selectedRowKeys.map(String)}
                onClose={() => setOpenCourseMappingModal(false)}
            />
                </>
            ) : (
                <div
                    style={{
                        border: "1px dashed #91caff",
                        borderRadius: 8,
                        padding: "40px 24px",
                        textAlign: "center",
                        color: "rgba(0, 0, 0, 0.65)",
                    }}
                >
                    <p style={{ marginBottom: 16 }}>
                        Xác thực cấp 2 để sử dụng tìm kiếm, thêm, import, export và chỉnh sửa đề cương.
                    </p>
                    <Button type="primary" onClick={() => setSecondaryPromptOpen(true)}>
                        Xác thực cấp 2
                    </Button>
                </div>
            )}
        </div>
    );
};

export default Page;
