"use client";
import React, { useState, useEffect, useMemo } from "react";
import CustomTable from "@/components/ui/Table";
import type { ColumnsType } from "antd/es/table";
import type { SorterResult } from "antd/es/table/interface";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import { notification, Form, Input, Select, Button, Space, Modal, Row, Col, DatePicker, Drawer, Grid, Tooltip, Descriptions, Tabs, Dropdown, Typography } from "antd";
import type { TabsProps } from "antd";
import { EditOutlined, SaveOutlined, CloseOutlined, DeleteOutlined, CalendarOutlined, ReloadOutlined, DownOutlined, InfoCircleOutlined, UpOutlined, DownloadOutlined } from "@ant-design/icons";
import ScheduleModal from "./components/Modal/ScheduleModal";
import BulkEditModal from "./components/Modal/BulkEditModal";
import ScheduleImportModal, { type ScheduleImportError } from "./components/Modal/ScheduleImportModal";
import { useAuthStore } from "@/stores/authStore";
import { PermissionKey } from "@/types/permissions";
import {
    deleteLivestream,
    downloadLivestreamImportTemplate,
    exportLivestreams,
    importLivestreamsFile,
    updateLivestream,
    updateLivestreamBulk,
} from "@/services/livestreamService";
import dayjs, { Dayjs } from "dayjs";
import type { ModuleField, ResolvedFieldPermission } from "@/types/fieldPolicy";
import { canEditAnyField, resolveModuleFieldPermissions, sanitizeEditablePayload } from "@/helper/fieldPolicy";
import { useLmsCache, useModuleFieldsQuery, useSchedulesQuery, useTeachingStaffQuery } from "@/hooks/useLmsQueries";
import type { LivestreamListParams } from "@/services/livestreamService";
import TeachingStaffSelect from "@/components/shared/TeachingStaffSelect";
import { useTableViewport } from "@/hooks/useTableViewport";

const SCHEDULE_MODULE_CODE = "calendar";
const { RangePicker } = DatePicker;

type ScheduleDocument = {
    url: string;
    label: string;
};

const parseScheduleDocuments = (value: unknown): ScheduleDocument[] => {
    if (value === undefined || value === null || value === "") return [];

    let documents: unknown = value;
    if (typeof value === "string") {
        const text = value.trim();
        if (!text) return [];
        try {
            documents = JSON.parse(text);
        } catch {
            documents = [text];
        }
    }

    const rows = Array.isArray(documents) ? documents : [documents];
    return rows.map((document, index) => {
        if (document && typeof document === "object") {
            const item = document as Record<string, unknown>;
            const url = String(item.url || item.link || item.href || "").trim();
            const label = String(
                item.label || item.title || item.name || `Tài liệu ${index + 1}`
            ).trim();
            return { url, label };
        }

        const text = String(document || "").trim();
        return {
            url: /^https?:\/\//i.test(text) ? text : "",
            label: /^https?:\/\//i.test(text) ? `Tài liệu ${index + 1}` : text,
        };
    }).filter((document) => document.url || document.label);
};

const renderScheduleDocuments = (value: unknown) => {
    const documents = parseScheduleDocuments(value);
    if (!documents.length) return <span>-</span>;

    return (
        <Space direction="vertical" size={2} style={{ maxWidth: 260 }}>
            {documents.map((document, index) => (
                document.url ? (
                    <Tooltip key={`${document.url}-${index}`} title={document.url}>
                        <Typography.Link
                            href={document.url}
                            target="_blank"
                            rel="noreferrer"
                            ellipsis
                            style={{ maxWidth: 250 }}
                            onClick={(event) => event.stopPropagation()}
                        >
                            {document.label || `Tài liệu ${index + 1}`}
                        </Typography.Link>
                    </Tooltip>
                ) : (
                    <Typography.Text key={`${document.label}-${index}`} ellipsis style={{ maxWidth: 250 }}>
                        {document.label}
                    </Typography.Text>
                )
            ))}
        </Space>
    );
};

const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
};

// Define Schedule Data Type
interface ScheduleDataType {
    key: string;
    id?: string;
    code?: string;
    subject?: string;
    teacher?: string;
    assistant_teacher?: string;
    end_time?: string;
    start_time?: string;
    lesson_link?: string;
    lesson_name?: string;
    learn_number?: number;
    lesson_status?: string | number;
    system_type?: string;
    class_name?: string;
    room?: string;
    can_modify?: boolean;
    [key: string]: any;
}

interface ScheduleFilterValues {
    keyword?: string;
    code?: string;
    teacher?: string;
    lesson_status?: string | number;
    date_range?: [Dayjs, Dayjs];
}

interface ScheduleSortItem {
    field: string;
    order: "ascend" | "descend";
}

type ScheduleSortState = ScheduleSortItem[];

const DEFAULT_MODULE_FIELDS: ModuleField[] = [
    { fieldCode: "code", fieldLabel: "Mã lớp", fieldType: "text", sortOrder: 1 },
    { fieldCode: "lesson_name", fieldLabel: "Tên bài học", fieldType: "text", sortOrder: 2 },
    { fieldCode: "learn_number", fieldLabel: "Buổi học", fieldType: "number", sortOrder: 3 },
    { fieldCode: "subject", fieldLabel: "Môn học", fieldType: "text", sortOrder: 4 },
    { fieldCode: "teacher", fieldLabel: "Giáo viên", fieldType: "text", sortOrder: 5 },
    { fieldCode: "assistant_teacher", fieldLabel: "Trợ giảng", fieldType: "select", sortOrder: 6 },
    { fieldCode: "start_time", fieldLabel: "Bắt đầu", fieldType: "date", sortOrder: 7 },
    { fieldCode: "end_time", fieldLabel: "Kết thúc", fieldType: "date", sortOrder: 8 },
    { fieldCode: "lesson_link", fieldLabel: "Link học", fieldType: "text", sortOrder: 9 },
];

const MOCK_SCHEDULES: ScheduleDataType[] = [];
const SORTABLE_FIELDS = new Set([
    "code",
    "learn_number",
    "subject",
    "teacher",
    "start_time",
    "end_time",
    "lesson_status",
    "system_type",
]);
const REQUIRED_QUICK_EDIT_FIELDS = new Set([
    "code",
    "learn_number",
    "start_time",
    "end_time",
]);

const cleanFilterValues = (values: ScheduleFilterValues): ScheduleFilterValues => {
    const cleaned: ScheduleFilterValues = {};

    Object.entries(values).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        if (Array.isArray(value) && value.length === 0) return;
        (cleaned as any)[key] = typeof value === "string" ? value.trim() : value;
    });

    return cleaned;
};

const buildScheduleApiParams = (values: ScheduleFilterValues) => {
    const cleaned = cleanFilterValues(values);
    const { date_range, ...rest } = cleaned;

    return {
        ...rest,
        start_time: date_range?.[0]?.startOf("day").toISOString(),
        end_time: date_range?.[1]?.endOf("day").toISOString(),
    };
};

const lessonStatusText = (status?: number | null) => {
    if (status === 1) return "Nghỉ học";
    if (status === 2) return "Đang diễn ra";
    return "Chưa bắt đầu";
};

const canModifySchedule = (record: ScheduleDataType) => {
    if (
        record.lesson_status === 1
        || record.lesson_status === "1"
        || record.lesson_status === "Nghỉ học"
    ) {
        return false;
    }

    if (record.start_time) {
        const startTime = dayjs(record.start_time);
        return startTime.isValid() && startTime.isAfter(dayjs());
    }

    // Fallback fail-closed khi Field-Level không cho trả start_time.
    return record.can_modify === true;
};

const ScheduleDetailRow = ({ record }: { record: ScheduleDataType }) => {
    const rows = [
        { label: "Mã lớp", value: record.code || "-" },
        { label: "Tên lớp", value: record.class_name || "-" },
        { label: "Bài học", value: record.lesson_name || "-" },
        { label: "Buổi học", value: record.learn_number ?? "-" },
        { label: "Môn học", value: record.subject || "-" },
        { label: "Giáo viên", value: record.teacher || "-" },
        {
            label: "Bắt đầu",
            value: record.start_time ? dayjs(record.start_time).format("DD/MM/YYYY HH:mm") : "-",
        },
        {
            label: "Kết thúc",
            value: record.end_time ? dayjs(record.end_time).format("DD/MM/YYYY HH:mm") : "-",
        },
        { label: "Phòng/Kênh học", value: record.room || "-" },
        { label: "Hệ thống", value: record.system_type || "-" },
        { label: "Trạng thái", value: record.lesson_status || "-" },
        { label: "Link học", value: record.lesson_link || "-" },
        { label: "Tài liệu", value: renderScheduleDocuments(record.lesson_document) },
    ];

    const items: TabsProps["items"] = [
        {
            key: "info",
            label: "Thông tin chi tiết",
            children: (
                <div style={{ padding: "8px 24px 24px", backgroundColor: "#fafafa" }}>
                    <Descriptions
                        bordered
                        size="small"
                        column={{ xxl: 3, xl: 3, lg: 2, md: 2, sm: 1, xs: 1 }}
                    >
                        {rows.map((item) => (
                            <Descriptions.Item key={item.label} label={item.label}>
                                {item.value}
                            </Descriptions.Item>
                        ))}
                    </Descriptions>
                </div>
            ),
        },
    ];

    return <Tabs defaultActiveKey="info" items={items} />;
};

const ScheduleFilterDrawer = ({
    open,
    value,
    loading,
    onSearch,
    onReset,
    onClose,
}: {
    open: boolean;
    value: ScheduleFilterValues;
    loading: boolean;
    onSearch: (values: ScheduleFilterValues) => void;
    onReset: () => void;
    onClose: () => void;
}) => {
    const [filterForm] = Form.useForm();
    useEffect(() => {
        filterForm.setFieldsValue(value);
    }, [filterForm, value]);

    const handleReset = () => {
        filterForm.resetFields();
        onReset();
    };

    return (
        <Drawer
            title="Bộ lọc lịch học"
            placement="right"
            open={open}
            onClose={onClose}
            width={360}
            footer={
                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                    <Button onClick={handleReset}>Reset</Button>
                    <Button type="primary" onClick={() => filterForm.submit()} loading={loading}>
                        Search
                    </Button>
                </Space>
            }
        >
            <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 16, background: "#fff" }}>
                <Form form={filterForm} layout="vertical" onFinish={(values) => onSearch(cleanFilterValues(values))}>
                    <Form.Item name="code" label="Mã lớp">
                        <Input allowClear placeholder="VD: TOPC01" />
                    </Form.Item>
                    <Form.Item name="teacher" label="Giáo viên">
                        <TeachingStaffSelect
                            teacherType={1}
                            allowQuickCreate={false}
                            allowClear
                            showSearch
                            placeholder="Chọn giáo viên"
                        />
                    </Form.Item>
                    <Form.Item name="lesson_status" label="Trạng thái buổi học">
                        <Select
                            allowClear
                            placeholder="Tất cả trạng thái"
                            options={[
                                { value: 0, label: "Chưa bắt đầu" },
                                { value: 2, label: "Đang diễn ra" },
                                { value: 1, label: "Nghỉ học" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item name="date_range" label="Khoảng ngày">
                        <RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                    </Form.Item>
                </Form>
            </div>
        </Drawer>
    );
};

const Page = () => {
    const { containerRef: tableContainerRef, scrollY: tableScrollY } = useTableViewport();
    const [data, setData] = useState<ScheduleDataType[]>(MOCK_SCHEDULES);
    const [filteredData, setFilteredData] = useState<ScheduleDataType[]>(MOCK_SCHEDULES);
    const [searchText, setSearchText] = useState("");
    const [editingKey, setEditingKey] = useState<string>("");
    const [moduleFields, setModuleFields] = useState<ModuleField[]>(DEFAULT_MODULE_FIELDS);
    const [form] = Form.useForm();
    const [api, contextHolder] = notification.useNotification();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [openBulkEditModal, setOpenBulkEditModal] = useState(false);
    const [openImportModal, setOpenImportModal] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importErrors, setImportErrors] = useState<ScheduleImportError[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<ScheduleDataType | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showPageInfo, setShowPageInfo] = useState(true);

    // Cấu hình Checkbox cho Bảng (Antd Row Selection)
    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys: React.Key[]) => {
            setSelectedRowKeys(newSelectedRowKeys);
        },
        getCheckboxProps: (record: ScheduleDataType) => ({
            disabled: !canModifySchedule(record),
            title: canModifySchedule(record)
                ? undefined
                : "Buổi học đã bắt đầu, không thể chọn để cập nhật",
        }),
        columnWidth: 32,
    };

    // Hàm mở modal để dời lịch (Sửa)
    const handleReschedule = (record: ScheduleDataType) => {
        if (!canModifySchedule(record)) {
            api.warning({
                message: "Không thể dời lịch",
                description: "Chỉ được dời những buổi học chưa diễn ra.",
            });
            return;
        }
        setSelectedRecord(record);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [filterValues, setFilterValues] = useState<ScheduleFilterValues>({});
    const [sortState, setSortState] = useState<ScheduleSortState>([]);
    const screens = Grid.useBreakpoint();
    const isDesktop = Boolean(screens.lg);

    const scheduleParams = useMemo<LivestreamListParams>(() => ({
        page: currentPage,
        limit: pageSize,
        ...buildScheduleApiParams(filterValues),
        sort_by: sortState.length
            ? sortState.map((item) => item.field).join(",")
            : undefined,
        sort_order: sortState.length
            ? sortState.map((item) => item.order === "descend" ? "desc" : "asc").join(",")
            : undefined,
    }), [currentPage, pageSize, filterValues, sortState]);
    const schedulesQuery = useSchedulesQuery(scheduleParams);
    const moduleFieldsQuery = useModuleFieldsQuery(SCHEDULE_MODULE_CODE);
    const assistantsQuery = useTeachingStaffQuery(2);
    const { refreshSchedules } = useLmsCache();
    const loading = schedulesQuery.isLoading || schedulesQuery.isValidating;
    const assistantOptions = assistantsQuery.data ?? [];

    useEffect(() => {
        const response: any = schedulesQuery.data;
        if (!response?.data) return;
        const mappedData: ScheduleDataType[] = (response.data.data ?? []).map((item: any) => ({
            ...item,
            key: item.id?.toString() || item.key,
            id: item.id?.toString(),
            code: item.code,
            class_name: item.class_name || item.code,
            start_time: item.start_time ? dayjs(item.start_time).format('YYYY-MM-DDTHH:mm') : "",
            end_time: item.end_time ? dayjs(item.end_time).format('YYYY-MM-DDTHH:mm') : "",
            room: item.room || item.channel_name || 'Phòng Online',
            subject: item.subject || item.lesson_name || `Bài ${item.learn_number}`,
            lesson_name: item.lesson_name || `Bài ${item.learn_number}`,
            learn_number: item.learn_number,
            lesson_link: item.lesson_link || item.link || "",
            teacher: item.teacher,
            assistant_teacher: item.assistant_teacher,
            system_type: item.system_type,
            lesson_status: item.lesson_status ?? 0,
            can_modify: item.can_modify === true,
        }));
        setData(mappedData);
        setFilteredData(mappedData);
        setTotalItems(response.data.total || 0);
    }, [schedulesQuery.data]);

    useEffect(() => {
        const fields = moduleFieldsQuery.data?.fields;
        if (fields?.length) {
            setModuleFields([...fields].sort(
                (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
            ));
        }
    }, [moduleFieldsQuery.data]);

    const [openFilterDrawer, setOpenFilterDrawer] = useState(false);
    const { fieldPolicy } = useAuthStore((state) => state.user)
    const hasPermission = useAuthStore(state => state.hasPermission);
    const canCreateSchedule = hasPermission(PermissionKey.SCHEDULE_CREATE);
    const canEditSchedule = hasPermission(PermissionKey.SCHEDULE_EDIT);
    const canDeleteSchedule = hasPermission(PermissionKey.SCHEDULE_DELETE);
    const canImportSchedule = hasPermission(PermissionKey.SCHEDULE_IMPORT);
    const canExportSchedule = hasPermission(PermissionKey.SCHEDULE_EXPORT);
    const canEditTeachingAssignment = hasPermission(PermissionKey.CALENDAR_TEACHER_EDIT);


    const isEditing = (record: ScheduleDataType) => record.key === editingKey;

    // Handle search filter locally
    const handleSearch = async (value: string) => {
        setSearchText(value);
        setFilterValues((prev) => cleanFilterValues({ ...prev, keyword: value }));
        setCurrentPage(1);
    };

    const handleScheduleFilter = (values: ScheduleFilterValues) => {
        setFilterValues(cleanFilterValues({ ...values, keyword: searchText }));
        setCurrentPage(1);
        setOpenFilterDrawer(false);
    };

    const handleResetScheduleFilter = () => {
        setFilterValues(cleanFilterValues({ keyword: searchText }));
        setCurrentPage(1);
        setOpenFilterDrawer(false);
    };

    const handleAddBtn = () => {
        if (!canCreateSchedule) {
            api.warning({
                message: "Không có quyền",
                description: "Vai trò hiện tại không có quyền thêm lịch học.",
            });
            return;
        }

        if (!canEditAnyField(moduleFields, fieldPolicy, SCHEDULE_MODULE_CODE)) {
            api.warning({
                message: "Không có quyền",
                description: "Vai trò hiện tại không có quyền chỉnh sửa/thêm dữ liệu.",
            });
            return;
        }
        setIsModalOpen(true);
        setIsEditMode(false)
    };

    const handleExportSchedule = async (format: "csv" | "xlsx") => {
        try {
            const selectedIds = selectedRowKeys.length
                ? selectedRowKeys.map(String)
                : undefined;
            const blob = await exportLivestreams(format, selectedIds);
            downloadBlob(
                blob,
                `calendar-${selectedIds?.length ? "selected" : "all"}.${format}`
            );
        } catch (error: any) {
            api.error({
                message: "Export thất bại",
                description: error.message || "Không thể xuất lịch học.",
            });
        }
    };

    const handleDownloadImportTemplate = async (format: "csv" | "xlsx") => {
        try {
            const blob = await downloadLivestreamImportTemplate(format);
            downloadBlob(blob, `calendar-import-template.${format}`);
        } catch (error: any) {
            api.error({
                message: "Tải file mẫu thất bại",
                description: error.message || "Không thể tải file mẫu.",
            });
        }
    };

    const handleImportSchedule = async (file: File) => {
        try {
            setImporting(true);
            setImportErrors([]);
            const response: any = await importLivestreamsFile(file);
            const summary = response?.data?.summary;
            api.success({
                message: "Import thành công",
                description: `Đã tạo ${response?.data?.count ?? 0} lịch học${
                    summary?.hmoRequests !== undefined
                        ? `, kiểm tra ${summary.hmoRequests} cặp Package/Course qua HMO`
                        : ""
                }.`,
            });
            setOpenImportModal(false);
            setSelectedRowKeys([]);
            await refreshSchedules();
        } catch (error: any) {
            const errors = error?.detail?.errors;
            if (Array.isArray(errors)) setImportErrors(errors);
            api.error({
                message: "Import thất bại",
                description: error.message || "File import có dữ liệu không hợp lệ.",
            });
        } finally {
            setImporting(false);
        }
    };

    const handleModalSuccess = (_values: any) => {
        void refreshSchedules();
        api.success({
            message: "Cập nhật thành công",
            description: "Đã cập nhật danh sách lịch học.",
        });
    };

    const edit = (record: ScheduleDataType) => {
        if (!canModifySchedule(record)) {
            api.warning({
                message: "Không thể sửa",
                description: "Chỉ được sửa những buổi học chưa diễn ra.",
            });
            return;
        }
        form.resetFields();
        form.setFieldsValue({
            ...record,
            assistant_teacher: String(record.assistant_teacher || '')
                .split(',')
                .map((username) => username.trim())
                .filter(Boolean),
        });
        setEditingKey(record.key);
    };

    const cancel = () => {
        setEditingKey("");
    };

    const handleDelete = (record: ScheduleDataType) => {
        if (!canModifySchedule(record)) {
            api.warning({
                message: "Không thể xóa",
                description: "Chỉ được xóa những buổi học chưa diễn ra.",
            });
            return;
        }

        Modal.confirm({
            title: 'Xác nhận xóa',
            content: 'Bạn có chắc chắn muốn xóa lịch học này không?',
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await deleteLivestream(record.key);
                    api.success({
                        message: "Xóa thành công",
                        description: "Đã xóa lịch học khỏi danh sách.",
                    });
                    setSelectedRowKeys((keys) =>
                        keys.filter((key) => String(key) !== String(record.key))
                    );
                    await refreshSchedules();
                } catch (error: any) {
                    api.error({
                        message: "Xóa thất bại",
                        description: error?.message || "Không thể xóa lịch học.",
                    });
                    throw error;
                }
            }
        });
    };

    const save = async (key: string) => {
        try {
            const row = await form.validateFields(editableFieldCodes);
            const index = data.findIndex((item) => key === item.key);
            if (index > -1) {
                const item = data[index];
                if (!canModifySchedule(item)) {
                    api.warning({
                        message: "Không thể sửa",
                        description: "Buổi học đã bắt đầu nên không thể cập nhật.",
                    });
                    setEditingKey("");
                    return;
                }
                const sanitizedRow = sanitizeEditablePayload(
                    row,
                    moduleFields,
                    fieldPolicy,
                    SCHEDULE_MODULE_CODE
                );

                if (sanitizedRow.learn_number !== undefined) {
                    sanitizedRow.learn_number = Number(sanitizedRow.learn_number);
                }

                if (Object.keys(sanitizedRow).length === 0) {
                    api.warning({
                        message: "Không có quyền",
                        description: "Không có trường nào trong dòng này được phép chỉnh sửa.",
                    });
                    return;
                }

                await updateLivestream(key, sanitizedRow);
                setEditingKey("");
                api.success({
                    message: "Cập nhật thành công",
                    description: "Đã lưu thay đổi nhanh của dòng.",
                });
                await refreshSchedules();
            }
        } catch (errInfo: any) {
            console.log("Validate Failed:", errInfo);
            const isValidationError = Array.isArray(errInfo?.errorFields);
            api.error({
                message: isValidationError ? "Lỗi kiểm tra dữ liệu" : "Cập nhật thất bại",
                description: isValidationError
                    ? errInfo.errorFields
                        .map((field: any) => field.errors?.[0])
                        .filter(Boolean)
                        .join("; ") || "Vui lòng kiểm tra lại các trường thông tin."
                    : errInfo?.message || "Không thể lưu thay đổi nhanh.",
            });
        }
    };

    const fieldPermissions: ResolvedFieldPermission[] = resolveModuleFieldPermissions(
        moduleFields,
        fieldPolicy,
        SCHEDULE_MODULE_CODE
    );
    const visibleFieldPermissions = fieldPermissions.filter(
        (item) =>
            item.field.fieldCode !== "id"
            && (item.visible || item.editable)
    );
    const editableFieldCodes = fieldPermissions
        .filter((item) => (
            item.field.fieldCode !== "id"
            && item.editable
            && (
                !["teacher", "assistant_teacher"].includes(item.field.fieldCode)
                || canEditTeachingAssignment
            )
        ))
        .map((item) => item.field.fieldCode);

    // Build dynamic columns based on ModuleField and fieldPolicy from current role.
    const columns: ColumnsType<ScheduleDataType> = visibleFieldPermissions.map(({ field }, columnIndex) => {
        const fieldCode = field.fieldCode;
        const activeSort = sortState.find((item) => item.field === fieldCode);
        return {
            title: field.fieldLabel || fieldCode,
            dataIndex: fieldCode,
            key: fieldCode,
            width:
                fieldCode === "lesson_name" ? 250
                    : fieldCode === "lesson_document" ? 280
                    : fieldCode === "lesson_link" ? 200
                        : fieldCode === "learn_number" ? 120
                            : fieldCode === "class_code" ? 120
                                : fieldCode === "subject" ? 120
                                    : 150,
            sorter: SORTABLE_FIELDS.has(fieldCode)
                ? { multiple: visibleFieldPermissions.length - columnIndex }
                : false,
            sortOrder: activeSort?.order,
            render: (text: any, record: ScheduleDataType) => {
                const editing = isEditing(record);
                const editable = editableFieldCodes.includes(fieldCode);

                if (editing && editable) {
                    if (fieldCode === "teacher") {
                        return (
                            <Form.Item
                                name={fieldCode}
                                style={{ margin: 0 }}
                            >
                                <TeachingStaffSelect teacherType={1} size="small" showSearch optionFilterProp="label" style={{ width: 180 }} />
                            </Form.Item>
                        );
                    }
                    if (fieldCode === "assistant_teacher") {
                        return (
                            <Form.Item name={fieldCode} style={{ margin: 0 }}>
                                <TeachingStaffSelect
                                    teacherType={2}
                                    mode="multiple"
                                    size="small"
                                    showSearch
                                    optionFilterProp="label"
                                    style={{ width: 220 }}
                                />
                            </Form.Item>
                        );
                    }
                    if (fieldCode === "lesson_status") {
                        return (
                            <Form.Item
                                name={fieldCode}
                                style={{ margin: 0 }}
                                rules={[{ required: true, message: "Chọn trạng thái!" }]}
                            >
                                <Select size="small" style={{ width: 130 }} options={[
                                    { value: 0, label: "Chưa bắt đầu" },
                                    { value: 1, label: "Nghỉ học" },
                                    { value: 2, label: "Đang diễn ra" },
                                ]} />
                            </Form.Item>
                        );
                    }
                    if (fieldCode === "start_time" || fieldCode === "end_time") {
                        return (
                            <Form.Item
                                name={fieldCode}
                                style={{ margin: 0 }}
                                rules={[{ required: true, message: `Nhập ${field.fieldLabel}!` }]}
                            >
                                <Input size="small" type="datetime-local" style={{ width: 180 }} />
                            </Form.Item>
                        );
                    }
                    return (
                        <Form.Item
                            name={fieldCode}
                            style={{ margin: 0 }}
                            rules={REQUIRED_QUICK_EDIT_FIELDS.has(fieldCode)
                                ? [{ required: true, message: `Nhập ${field.fieldLabel || fieldCode}!` }]
                                : undefined}
                        >
                            <Input
                                size="small"
                                type={field.fieldType === "number" ? "number" : "text"}
                                style={{ width: 150 }}
                            />
                        </Form.Item>
                    );
                }

                if ((fieldCode === "start_time" || fieldCode === "end_time") && text) {
                    return <span>{dayjs(text).format('YYYY-MM-DD HH:mm')}</span>;
                }

                if (fieldCode === "assistant_teacher") {
                    const labels = String(text || '')
                        .split(',')
                        .map((username) => assistantOptions.find(
                            (option) => option.value === username.trim()
                        )?.label || username.trim())
                        .filter(Boolean);
                    return <span>{labels.join(', ') || '-'}</span>;
                }

                if (fieldCode === "lesson_document") return renderScheduleDocuments(text);

                if (fieldCode === "lesson_status") {
                    return <span>{lessonStatusText(Number(text))}</span>;
                }

                // If not editing or not editable, display plain text
                return <span>{text}</span>;
            },
        };
    });

    // Append Action columns if role has edit permissions
    if ((canEditSchedule && editableFieldCodes.length > 0) || canDeleteSchedule) {
        columns.push({
            title: "Thao tác",
            key: "action",
            fixed: "right",
            width: 120,
            render: (_: any, record: ScheduleDataType) => {
                const editing = isEditing(record);
                const canModify = canModifySchedule(record);
                return editing ? (
                    <Space>
                        <Tooltip title="Lưu">
                            <Button
                                type="primary"
                                aria-label="Lưu"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    void save(record.key);
                                }}
                                icon={<SaveOutlined />}
                                size="small"
                            />
                        </Tooltip>
                        <Tooltip title="Hủy">
                            <Button
                                aria-label="Hủy"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    cancel();
                                }}
                                icon={<CloseOutlined />}
                                size="small"
                            />
                        </Tooltip>
                    </Space>
                ) : (
                    <Space>
                        {canModify && canEditSchedule && editableFieldCodes.length > 0 && (
                            <>
                                <Tooltip title="Dời lịch">
                                    <Button
                                        type="link"
                                        aria-label="Dời lịch"
                                        disabled={editingKey !== ""}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleReschedule(record);
                                        }}
                                        icon={<CalendarOutlined />}
                                        size="small"
                                    />
                                </Tooltip>
                                <Tooltip title="Sửa nhanh">
                                    <Button
                                        type="link"
                                        aria-label="Sửa nhanh"
                                        disabled={editingKey !== ""}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            edit(record);
                                        }}
                                        icon={<EditOutlined />}
                                        size="small"
                                    />
                                </Tooltip>
                            </>
                        )}
                        {canModify && canDeleteSchedule && (
                            <Tooltip title="Xóa">
                                <Button
                                    type="text"
                                    danger
                                    aria-label="Xóa"
                                    disabled={editingKey !== ""}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        handleDelete(record);
                                    }}
                                    icon={<DeleteOutlined />}
                                    size="small"
                                />
                            </Tooltip>
                        )}
                    </Space>
                );
            },
        });
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, overflow: "hidden" }}>
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
                        <span style={{ fontWeight: 600 }}>Quản lý lịch học</span>
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
                          Theo dõi các buổi học theo lớp, giáo viên và khung giờ. Bạn có thể thêm lịch,
                          dời lịch, nghỉ học, sửa nhanh từng dòng hoặc sửa hàng loạt những buổi chưa diễn ra.
                        </div>
                    </div>
                </div>
            </div>

            <SearchAndActionsBar
                onSearch={handleSearch}
                placeholder="Tìm kiếm theo mã lớp, tên lớp, giáo viên, phòng học..."
                handleAddBtn={canCreateSchedule ? handleAddBtn : undefined}
                handleImportClick={canImportSchedule ? () => {
                    setImportErrors([]);
                    setOpenImportModal(true);
                } : undefined}
                handleFilterBtn={() => setOpenFilterDrawer(true)}
                extraExportButton={
                    <>
                        {canExportSchedule && (
                            <Dropdown
                                trigger={["click"]}
                                menu={{
                                    items: [
                                        { key: "xlsx", label: "Xuất Excel (.xlsx)" },
                                        { key: "csv", label: "Xuất CSV (.csv)" },
                                    ],
                                    onClick: ({ key }) => handleExportSchedule(key as "csv" | "xlsx"),
                                }}
                            >
                                <Button icon={<DownloadOutlined />}>
                                    Export{selectedRowKeys.length ? ` (${selectedRowKeys.length})` : ""}
                                </Button>
                            </Dropdown>
                        )}
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => {
                                handleResetScheduleFilter();
                                void refreshSchedules();
                            }}
                        />
                        {canEditSchedule && (
                            <Button
                                type="primary"
                                icon={<EditOutlined />}
                                onClick={() => setOpenBulkEditModal(true)}
                            >
                                Sửa hàng loạt
                            </Button>
                        )}
                    </>
                }
            />

            <Form
                form={form}
                component={false}
                style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}
            >
                <div ref={tableContainerRef} style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden" }}>
                <CustomTable<ScheduleDataType>
                    columns={columns}
                    dataSource={filteredData}
                    loading={loading}
                    rowSelection={rowSelection}
                    pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        total: totalItems,
                        showSizeChanger: true,
                        position: ["bottomRight"],
                        onChange: (page, size) => {
                            setCurrentPage(page);
                            setPageSize(size);
                        }
                    }}
                    onChange={(_, __, sorter, extra) => {
                        if (extra.action !== "sort") return;
                        const sorterItems = (
                            Array.isArray(sorter) ? sorter : [sorter]
                        ) as SorterResult<ScheduleDataType>[];
                        setSortState(
                            sorterItems
                                .filter((item) => item.field && item.order)
                                .map((item) => ({
                                    field: String(item.field),
                                    order: item.order as "ascend" | "descend",
                                }))
                        );
                        setCurrentPage(1);
                    }}
                    expandable={{
                        expandedRowRender: (record) => <ScheduleDetailRow record={record} />,
                        expandedRowKeys,
                        onExpandedRowsChange: (keys) => setExpandedRowKeys([...keys]),
                        expandRowByClick: true,
                        columnWidth: 32,
                    }}
                    onRow={() => ({
                        style: { cursor: editingKey ? "default" : "pointer" },
                    })}
                    scroll={{ x: "max-content", y: filteredData?.length > 5 ? tableScrollY : undefined }}
                />
                </div>
                <ScheduleFilterDrawer
                    open={openFilterDrawer}
                    onClose={() => setOpenFilterDrawer(false)}
                    value={filterValues}
                    loading={loading}
                    onSearch={handleScheduleFilter}
                    onReset={handleResetScheduleFilter}
                />
                <ScheduleModal
                    open={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleModalSuccess}
                    isEdit={isEditMode}
                    initialData={selectedRecord}
                    moduleFields={moduleFields}
                    fieldPolicy={fieldPolicy}
                    moduleCode={SCHEDULE_MODULE_CODE}
                />
                <ScheduleImportModal
                    open={openImportModal}
                    loading={importing}
                    errors={importErrors}
                    onClose={() => setOpenImportModal(false)}
                    onSubmit={handleImportSchedule}
                    onDownloadTemplate={handleDownloadImportTemplate}
                />
                {/* Modal Sửa Hàng Loạt */}
                <BulkEditModal
                    open={openBulkEditModal}
                    selectedRowKeys={selectedRowKeys}
                    onClose={() => setOpenBulkEditModal(false)}
                    onSuccess={async (modalPayload) => {
                        try {
                            let targetIds: (string | number)[] =
                                modalPayload.scope.selected_lessons || [];

                            if (targetIds.length === 0) {
                                api.warning({ message: "Cảnh báo", description: "Không tìm thấy bài học nào phù hợp với điều kiện để cập nhật!" });
                                return;
                            }

                            const modifiableIds = new Set(
                                data
                                    .filter(canModifySchedule)
                                    .map((item) => String(item.key))
                            );
                            const requestedCount = targetIds.length;
                            targetIds = targetIds.filter((id) =>
                                modifiableIds.has(String(id))
                            );

                            if (targetIds.length === 0) {
                                api.warning({
                                    message: "Không thể cập nhật",
                                    description: "Các buổi được chọn đều đã bắt đầu.",
                                });
                                return;
                            }
                            if (targetIds.length < requestedCount) {
                                api.warning({
                                    message: "Đã bỏ qua lịch cũ",
                                    description: "Các buổi đã bắt đầu không được cập nhật.",
                                });
                            }

                            // 2. Chuẩn bị payload chuẩn gửi cho Backend
                            let update_data: any = {};

                            if (modalPayload.config_mode === 'common') {
                                update_data = {
                                    teacher: modalPayload.common_config.teacher,
                                    assistant_teacher: modalPayload.common_config.assistant_teacher,
                                    room: modalPayload.common_config.room,
                                    start_time: modalPayload.common_config.start_time,
                                    end_time: modalPayload.common_config.end_time,
                                };
                            } else if (modalPayload.config_mode === 'separate') {
                                update_data = targetIds.map(id => {
                                    const config = modalPayload.separate_config?.[id] || {};
                                    return {
                                        id: id,
                                        teacher: config.teacher,
                                        assistant_teacher: config.assistant_teacher,
                                        room: config.room,
                                        start_time: config.start_time,
                                        end_time: config.end_time,
                                    }
                                });
                            }

                            const apiPayload = {
                                ids: targetIds,
                                config_mode: modalPayload.config_mode,
                                update_data: update_data
                            };

                            // 3. Gọi Service API
                            await updateLivestreamBulk(apiPayload);

                            api.success({ message: "Thành công", description: `Đã cập nhật hàng loạt ${targetIds.length} bài học.` });

                            // Reset state & Reload bảng
                            setSelectedRowKeys([]);
                            await refreshSchedules();

                        } catch (error: any) {
                            console.error(error);
                            api.error({ message: "Cập nhật thất bại", description: error.message || "Đã xảy ra lỗi" });
                        }
                    }}
                />
            </Form>
        </div>
    );
};

export default Page;
