"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import CustomTable from "@/components/ui/Table";
import type { ColumnsType } from "antd/es/table";
import type { SorterResult } from "antd/es/table/interface";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import { notification, Form, Input, Select, Button, Space, Modal, Row, Col, DatePicker, Drawer, Empty, Grid, Tooltip, Descriptions, Tabs, Dropdown, Typography, Calendar as AntCalendar, Badge, Segmented, Tag } from "antd";
import type { TabsProps } from "antd";
import { EditOutlined, SaveOutlined, CloseOutlined, DeleteOutlined, CalendarOutlined, ReloadOutlined, DownOutlined, InfoCircleOutlined, UpOutlined, DownloadOutlined, FilterOutlined } from "@ant-design/icons";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import viLocale from "@fullcalendar/core/locales/vi";
import ScheduleModal from "./components/Modal/ScheduleModal";
import BulkEditModal from "./components/Modal/BulkEditModal";
import ScheduleImportModal, { type ScheduleImportError } from "./components/Modal/ScheduleImportModal";
import AutoScheduleModal from "./components/Modal/AutoScheduleModal";
import { useAuthStore } from "@/stores/authStore";
import { PermissionKey } from "@/types/permissions";
import {
    deleteLivestream,
    downloadLivestreamImportTemplate,
    exportLivestreams,
    importLivestreamMappings,
    importLivestreamsFile,
    previewLivestreamMappingImport,
    updateLivestream,
    updateLivestreamBulk,
} from "@/services/livestreamService";
import dayjs, { Dayjs } from "dayjs";
import type { ModuleField, ResolvedFieldPermission } from "@/types/fieldPolicy";
import { canEditAnyField, resolveModuleFieldPermissions, sanitizeEditablePayload } from "@/helper/fieldPolicy";
import { useLmsCache, useModuleFieldsQuery, useSchedulesQuery, useSchedulingProgramsQuery, useTeachingStaffQuery } from "@/hooks/useLmsQueries";
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
    cancel_reason?: string | null;
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
    time_status?: "upcoming" | "ongoing" | "completed";
    date_range?: [Dayjs, Dayjs];
}

interface ScheduleSortItem {
    field: string;
    order: "ascend" | "descend";
}

type ScheduleSortState = ScheduleSortItem[];

const DEFAULT_MODULE_FIELDS: ModuleField[] = [
    { fieldCode: "lesson_name", fieldLabel: "Tên bài học", fieldType: "text", sortOrder: 1 },
    { fieldCode: "learn_number", fieldLabel: "Bài học", fieldType: "number", sortOrder: 2 },
    { fieldCode: "teacher", fieldLabel: "Giáo viên", fieldType: "text", sortOrder: 3 },
    { fieldCode: "assistant_teacher", fieldLabel: "Trợ giảng", fieldType: "select", sortOrder: 4 },
    { fieldCode: "start_time", fieldLabel: "Bắt đầu", fieldType: "date", sortOrder: 5 },
    { fieldCode: "end_time", fieldLabel: "Kết thúc", fieldType: "date", sortOrder: 6 },
];

// Các thông tin này vẫn được lưu/cấu hình cho từng lịch, nhưng không cần nằm
// trong bảng quản lý lịch học. Danh sách bao gồm mã cũ để cấu hình field động
// từ DB không làm các cột này xuất hiện trở lại.
const HIDDEN_SCHEDULE_LIST_FIELDS = new Set([
    "code",
    "class_code",
    "course",
    "course_code",
    "course_name",
    "class_name",
    "subject",
    "lesson_link",
    "evg_stream",
    "stream",
]);

const MOCK_SCHEDULES: ScheduleDataType[] = [];
const CALENDAR_PLUGINS = [dayGridPlugin, timeGridPlugin, interactionPlugin];

const mapScheduleRows = (rows: any[]): ScheduleDataType[] => rows.map((item: any) => ({
    ...item,
    key: item.id?.toString() || item.key,
    id: item.id?.toString(),
    code: item.code,
    class_name: item.class_name || item.code,
    start_time: item.start_time ? dayjs(item.start_time).format("YYYY-MM-DDTHH:mm") : "",
    end_time: item.end_time ? dayjs(item.end_time).format("YYYY-MM-DDTHH:mm") : "",
    room: item.room || item.channel_name || "Phòng Online",
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
    "start_time",
    "end_time",
]);
const QUICK_EDIT_LOCKED_FIELDS = new Set([
    "code",
    "learn_number",
    "subject",
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
        start_time: date_range?.[0]?.startOf("day").format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
        end_time: date_range?.[1]?.endOf("day").format("YYYY-MM-DDTHH:mm:ss.SSS[Z]"),
    };
};

const lessonStatusText = (
    startTime?: string,
    endTime?: string
) => {
    if (!startTime || !endTime) return "-";

    const now = dayjs();
    const start = dayjs(startTime);
    const end = dayjs(endTime);

    if (now.isBefore(start)) {
        return "Chưa bắt đầu";
    }

    if (now.isAfter(end)) {
        return "Đã kết thúc";
    }

    return "Đang diễn ra";
};

const canModifySchedule = (record: ScheduleDataType) => {
    if (Number(record.lesson_status) === 1) return false;
    if (!record.start_time) {
        return record.can_modify === true;
    }

    const startTime = dayjs(record.start_time);

    return startTime.isValid() && startTime.isAfter(dayjs());
};

const ScheduleDetailRow = ({ record }: { record: ScheduleDataType }) => {
    const rows = [
        { label: "Chương trình", value: record.code || "-" },
        { label: "Tên lớp", value: record.class_name || "-" },
        { label: "Bài học", value: record.lesson_name || "-" },
        { label: "Bài học", value: record.learn_number ?? "-" },
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
        { label: "Trạng thái", value: Number(record.lesson_status) === 1 ? "Nghỉ học" : lessonStatusText(record.start_time, record.end_time) },
        ...(Number(record.lesson_status) === 1
            ? [{ label: "Lý do nghỉ", value: record.cancel_reason || "Chưa có lý do" }]
            : []),
        { label: "Link học", value: record.lesson_link || "-" },
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

const ScheduleFilterDrawer = ({
    open,
    value,
    loading,
    onSearch,
    onReset,
    onClose,
    programOptions,
    loadingPrograms,
}: {
    open: boolean;
    value: ScheduleFilterValues;
    loading: boolean;
    onSearch: (values: ScheduleFilterValues) => void;
    onReset: () => void;
    onClose: () => void;
    programOptions: Array<{ value: string; label: string }>;
    loadingPrograms: boolean;
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
                    <Button onClick={handleReset}>Xóa lọc</Button>
                    <Button type="primary" onClick={() => filterForm.submit()} loading={loading}>
                        Tìm kiếm
                    </Button>
                </Space>
            }
        >
            <div>
                <Form form={filterForm} layout="vertical" onFinish={(values) => onSearch(cleanFilterValues(values))}>
                    <Form.Item
                        name="code"
                        label="Chương trình"
                        rules={[{ required: true, message: "Vui lòng chọn Chương trình" }]}
                    >
                        <Select
                            allowClear
                            showSearch
                            loading={loadingPrograms}
                            options={programOptions}
                            optionFilterProp="label"
                            placeholder="Chọn Chương trình"
                            notFoundContent={loadingPrograms ? "Đang tải..." : "Không có Chương trình"}
                        />
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
                    <Form.Item name="time_status" label="Trạng thái buổi học">
                        <Select
                            allowClear
                            placeholder="Tất cả trạng thái"
                            options={[
                                { value: "upcoming", label: "Chưa bắt đầu" },
                                { value: "ongoing", label: "Đang diễn ra" },
                                { value: "completed", label: "Đã kết thúc" },
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
    const [savingKey, setSavingKey] = useState<string>("");
    const [moduleFields, setModuleFields] = useState<ModuleField[]>(DEFAULT_MODULE_FIELDS);
    const [form] = Form.useForm();
    const [api, contextHolder] = notification.useNotification();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [openBulkEditModal, setOpenBulkEditModal] = useState(false);
    const [openImportModal, setOpenImportModal] = useState(false);
    const [openAutoScheduleModal, setOpenAutoScheduleModal] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importErrors, setImportErrors] = useState<ScheduleImportError[]>([]);
    const [importMode, setImportMode] = useState<"create" | "mapping">("create");
    const [importMappingPreview, setImportMappingPreview] = useState<any | null>(null);
    const [pendingMappingFile, setPendingMappingFile] = useState<File | null>(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<ScheduleDataType | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showPageInfo, setShowPageInfo] = useState(true);

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

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [filterValues, setFilterValues] = useState<ScheduleFilterValues>({});
    const [submittedFilterValues, setSubmittedFilterValues] = useState<ScheduleFilterValues>({});
    const [hasSearched, setHasSearched] = useState(false);
    const [sortState, setSortState] = useState<ScheduleSortState>([]);
    const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
    const [calendarMounted, setCalendarMounted] = useState(false);
    const [calendarData, setCalendarData] = useState<ScheduleDataType[]>([]);
    const [calendarDetail, setCalendarDetail] = useState<ScheduleDataType | null>(null);
    const calendarRef = useRef<FullCalendar>(null);
    const screens = Grid.useBreakpoint();
    const isDesktop = Boolean(screens.lg);

    const scheduleParams = useMemo<LivestreamListParams>(() => {
        if (!hasSearched) return {} as LivestreamListParams;

        return {
            page: currentPage,
            limit: pageSize,
            ...buildScheduleApiParams(submittedFilterValues),
            sort_by: sortState.length
                ? sortState.map((item) => item.field).join(",")
                : undefined,
            sort_order: sortState.length
                ? sortState.map((item) => item.order === "descend" ? "desc" : "asc").join(",")
                : undefined,
        };
    }, [currentPage, pageSize, submittedFilterValues, sortState, hasSearched]);

    const calendarParams = useMemo<LivestreamListParams | null>(() => {
        if (!hasSearched || !calendarMounted) return null;
        return {
            page: 1,
            limit: 100,
            ...buildScheduleApiParams(submittedFilterValues),
            sort_by: "start_time",
            sort_order: "asc",
        };
    }, [calendarMounted, hasSearched, submittedFilterValues]);

    // ✅ Chỉ fetch khi đã bấm Lọc
    const schedulesQuery = useSchedulesQuery(hasSearched ? scheduleParams : null);
    const calendarSchedulesQuery = useSchedulesQuery(calendarParams);
    const moduleFieldsQuery = useModuleFieldsQuery(SCHEDULE_MODULE_CODE);
    const assistantsQuery = useTeachingStaffQuery(0);
    const programsQuery = useSchedulingProgramsQuery();
    const { refreshSchedules } = useLmsCache();
    const loading = schedulesQuery.isLoading || schedulesQuery.isValidating;
    const assistantOptions = assistantsQuery.data ?? [];
    const programOptions = useMemo(() => {
        const rows = Array.isArray(programsQuery.data?.data) ? programsQuery.data.data : [];
        return rows.map((program: any) => ({
            value: String(program.code),
            label: `${program.code}${program.subject_name ? ` · ${program.subject_name}` : ""}`,
        }));
    }, [programsQuery.data]);

    useEffect(() => {
        if (!hasSearched) {
            setData([]);
            setFilteredData([]);
            setTotalItems(0);
            return;
        }

        const response: any = schedulesQuery.data;
        if (!response?.data) return;
        const mappedData = mapScheduleRows(response.data.data ?? []);
        setData(mappedData);
        setFilteredData(mappedData);
        setTotalItems(response.data.total || 0);
    }, [schedulesQuery.data, hasSearched]);

    useEffect(() => {
        if (!hasSearched) {
            setCalendarData([]);
            return;
        }
        const response: any = calendarSchedulesQuery.data;
        if (!response?.data) return;
        setCalendarData(mapScheduleRows(response.data.data ?? []));
    }, [calendarSchedulesQuery.data, hasSearched]);

    useEffect(() => {
        if (viewMode !== "calendar") return;
        const frame = requestAnimationFrame(() => calendarRef.current?.getApi().updateSize());
        return () => cancelAnimationFrame(frame);
    }, [viewMode, isDesktop]);

    const calendarEvents = useMemo(() => {
        const now = dayjs();
        return calendarData.filter((item) => item.start_time).map((item) => {
            const start = dayjs(item.start_time);
            const end = item.end_time ? dayjs(item.end_time) : start.add(1, "hour");
            const styleType = Number(item.lesson_status) === 1
                ? "cancelled"
                : now.isAfter(end)
                    ? "completed"
                    : now.isAfter(start) && now.isBefore(end)
                        ? "ongoing"
                        : "upcoming";
            return {
                id: String(item.key),
                title: item.lesson_name || `Bài ${item.learn_number}`,
                start: start.toDate(),
                end: end.toDate(),
                extendedProps: { record: item, styleType },
            };
        });
    }, [calendarData]);

    const calendarHeaderToolbar = useMemo(() => isDesktop ? ({
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay",
    }) : ({
        left: "prev,next",
        center: "title",
        right: "timeGridDay,dayGridMonth",
    }), [isDesktop]);

    const renderCalendarEvent = useCallback((eventInfo: any) => {
        const styleType = eventInfo.event.extendedProps.styleType;
        const visual = styleType === "cancelled"
            ? { background: "#fff1f0", color: "#cf1322", border: "3px solid #ff4d4f" }
            : styleType === "completed"
                ? { background: "#f6ffed", color: "#389e0d", border: "3px solid #52c41a" }
                : styleType === "ongoing"
                    ? { background: "#fff2e8", color: "#d4380d", border: "3px solid #fa541c" }
                    : { background: "#e6f4ff", color: "#0958d9", border: "3px solid #1677ff" };
        return (
            <div style={{
                backgroundColor: visual.background,
                color: visual.color,
                borderLeft: visual.border,
                padding: "4px 6px",
                height: "100%",
                width: "100%",
                borderRadius: 4,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
            }}>
                <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{eventInfo.timeText}</div>
                {styleType === "cancelled" && (
                    <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>NGHỈ HỌC</div>
                )}
                <div style={{ fontSize: 12, whiteSpace: "normal", lineHeight: 1.3, marginTop: 2, fontWeight: 500 }}>
                    {eventInfo.event.title}
                </div>
            </div>
        );
    }, []);

    const handleCalendarEventClick = useCallback((info: any) => {
        setCalendarDetail(info.event.extendedProps.record);
    }, []);

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
    const can = useAuthStore(state => state.can);
    const activeProgramCode = String(submittedFilterValues.code || "").trim() || undefined;
    const canCreateSchedule = can(PermissionKey.SCHEDULE_CREATE, activeProgramCode);
    const canEditSchedule = can(PermissionKey.SCHEDULE_EDIT, activeProgramCode);
    const canDeleteSchedule = can(PermissionKey.SCHEDULE_DELETE, activeProgramCode);
    const canImportSchedule = can(PermissionKey.SCHEDULE_IMPORT, activeProgramCode);
    const canExportSchedule = can(PermissionKey.SCHEDULE_EXPORT, activeProgramCode);
    const canEditTeachingAssignment = can(PermissionKey.CALENDAR_TEACHER_EDIT, activeProgramCode);

    const isEditing = (record: ScheduleDataType) => record.key === editingKey;

    // ✅ Hàm thực sự submit search (được debounce)
    const doSearch = useCallback((keyword: string) => {
        if (!hasSearched) return;

        setSubmittedFilterValues((prev) =>
            cleanFilterValues({
                ...prev,
                keyword: keyword,
            })
        );
        setCurrentPage(1);
    }, [hasSearched]);

    // ✅ Debounce hàm doSearch với 500ms
    const debouncedDoSearch = useDebounce(doSearch, 500);

    // ✅ Handle search với debounce
    const handleSearch = useCallback(async (value: string) => {
        setSearchText(value);
        setFilterValues((prev) => cleanFilterValues({ ...prev, keyword: value }));
        setCurrentPage(1);

        debouncedDoSearch(value);
    }, [debouncedDoSearch]);

    const handleScheduleFilter = (values: ScheduleFilterValues) => {
        if (!String(values.code || "").trim()) {
            api.warning({ message: "Vui lòng chọn Chương trình" });
            return;
        }
        const cleaned = cleanFilterValues({ ...values, keyword: searchText });
        setFilterValues(cleaned);
        setSubmittedFilterValues(cleaned);
        setHasSearched(true);
        setCurrentPage(1);
        setOpenFilterDrawer(false);
    };

    const handleResetScheduleFilter = () => {
        const cleaned = cleanFilterValues({ keyword: "" });
        setSearchText("");
        setFilterValues(cleaned);
        setSubmittedFilterValues(cleaned);
        setHasSearched(false);
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

    // ... (giữ nguyên tất cả các hàm còn lại: handleExportSchedule, handleDownloadImportTemplate, handleImportSchedule, handleConfirmMappingImport, handleModalSuccess, edit, cancel, handleDelete, save)

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
        const programCode = String(submittedFilterValues.code || "").trim();
        if (!programCode) {
            api.warning({ message: "Vui lòng chọn Chương trình trước khi import" });
            setOpenImportModal(false);
            setOpenFilterDrawer(true);
            return;
        }
        if (importMode === "mapping") {
            try {
                setImporting(true);
                setImportErrors([]);
                setPendingMappingFile(file);
                const response: any = await previewLivestreamMappingImport(file, programCode);
                setImportMappingPreview(response?.data ?? null);
            } catch (error: any) {
                api.error({
                    message: "Xem trước thất bại",
                    description: error.message || "Không thể xem trước dữ liệu import.",
                });
            } finally {
                setImporting(false);
            }
            return;
        }

        try {
            setImporting(true);
            setImportErrors([]);
            const response: any = await importLivestreamsFile(file, programCode);
            const summary = response?.data?.summary;
            api.success({
                message: "Import thành công",
                description: `Đã tạo ${response?.data?.count ?? 0} lịch học${summary?.hmoRequests !== undefined
                    ? `, kiểm tra ${summary.hmoRequests} cặp Package/Course qua HMO`
                    : ""
                    }.`,
            });
            setOpenImportModal(false);
            setSelectedRowKeys([]);
            if (hasSearched) {
                await refreshSchedules();
            }
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

    const handleConfirmMappingImport = async () => {
        if (!pendingMappingFile) return;
        try {
            setImporting(true);
            const programCode = String(submittedFilterValues.code || "").trim();
            if (!programCode) {
                api.warning({ message: "Vui lòng chọn Chương trình trước khi import" });
                return;
            }
            const response: any = await importLivestreamMappings({
                program_code: programCode,
                updates: importMappingPreview?.updates ?? [],
            });
            api.success({
                message: "Cập nhật mapping thành công",
                description: `Đã ghi đè mapping cho ${response?.data?.updated ?? importMappingPreview?.count ?? 0} buổi học.`,
            });
            setOpenImportModal(false);
            setImportMappingPreview(null);
            setPendingMappingFile(null);
            setSelectedRowKeys([]);
            if (hasSearched) {
                await refreshSchedules();
            }
        } catch (error: any) {
            api.error({
                message: "Cập nhật thất bại",
                description: error.message || "Không thể ghi đè mapping.",
            });
        } finally {
            setImporting(false);
        }
    };

    const handleModalSuccess = (_values: any) => {
        if (hasSearched) {
            void refreshSchedules();
        }
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
            start_time: record.start_time ? dayjs(record.start_time) : null,
            end_time: record.end_time ? dayjs(record.end_time) : null,
            assistant_teacher: String(record.assistant_teacher || '')
                .split(',')
                .map((username) => username.trim())
                .filter(Boolean),
        });
        setEditingKey(record.key);
    };

    const cancel = () => {
        if (savingKey) return;
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
                    if (hasSearched) {
                        await refreshSchedules();
                    }
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
        if (savingKey) return;
        setSavingKey(key);
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

                QUICK_EDIT_LOCKED_FIELDS.forEach((fieldCode) => {
                    delete sanitizedRow[fieldCode];
                });

                ["start_time", "end_time"].forEach((fieldCode) => {
                    const value = sanitizedRow[fieldCode];
                    if (dayjs.isDayjs(value)) {
                        sanitizedRow[fieldCode] = value
                            .second(0)
                            .millisecond(0)
                            .format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
                    }
                });

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
                if (hasSearched) {
                    await refreshSchedules();
                }
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
        } finally {
            setSavingKey("");
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
            && item.field.fieldCode !== "lesson_document"
            && !HIDDEN_SCHEDULE_LIST_FIELDS.has(item.field.fieldCode)
            && (item.visible || item.editable)
    );
    const editableFieldCodes = fieldPermissions
        .filter((item) => (
            item.field.fieldCode !== "id"
            && item.editable
            && !["lesson_status", "cancel_reason"].includes(item.field.fieldCode)
            && !QUICK_EDIT_LOCKED_FIELDS.has(item.field.fieldCode)
            && (
                !["teacher", "assistant_teacher"].includes(item.field.fieldCode)
                || canEditTeachingAssignment
            )
        ))
        .map((item) => item.field.fieldCode);

    const columns: ColumnsType<ScheduleDataType> = visibleFieldPermissions.map(({ field }, columnIndex) => {
        const fieldCode = field.fieldCode;
        const activeSort = sortState.find((item) => item.field === fieldCode);
        return {
            title: fieldCode === "lesson_status" ? "Tiến độ" : (field.fieldLabel || fieldCode),
            dataIndex: fieldCode,
            key: fieldCode,
            width:
                fieldCode === "lesson_name" ? 250
                    : fieldCode === "lesson_document" ? 280
                        : fieldCode === "lesson_link" ? 200
                            : fieldCode === "teacher" ? 220
                                : fieldCode === "assistant_teacher" ? 260
                                    : ["start_time", "end_time"].includes(fieldCode) ? 190
                                        : fieldCode === "learn_number" ? 120
                                            : fieldCode === "class_code" ? 120
                                                : fieldCode === "subject" ? 120
                                                    : 150,
            sorter: SORTABLE_FIELDS.has(fieldCode)
                ? { multiple: visibleFieldPermissions.length - columnIndex }
                : false,
            sortOrder: activeSort?.order,
            render: (text: any, record: ScheduleDataType) => {
                console.log("text", text, "record", record);
                const editing = isEditing(record);
                const editable = editableFieldCodes.includes(fieldCode);

                if (editing && editable) {
                    if (fieldCode === "teacher") {
                        return (
                            <Form.Item
                                name={fieldCode}
                                style={{ margin: 0 }}
                            >
                                <TeachingStaffSelect
                                    teacherType={1}
                                    size="small"
                                    showSearch
                                    optionFilterProp="label"
                                    style={{ width: "100%" }}
                                />
                            </Form.Item>
                        );
                    }
                    if (fieldCode === "assistant_teacher") {
                        return (
                            <Form.Item name={fieldCode} style={{ margin: 0 }}>
                                <TeachingStaffSelect
                                    teacherType={0}
                                    mode="multiple"
                                    size="small"
                                    showSearch
                                    optionFilterProp="label"
                                    style={{ width: "100%" }}
                                />
                            </Form.Item>
                        );
                    }
                    if (fieldCode === "start_time" || fieldCode === "end_time") {
                        return (
                            <Form.Item
                                name={fieldCode}
                                style={{ margin: 0 }}
                                dependencies={fieldCode === "end_time" ? ["start_time"] : undefined}
                                rules={[
                                    { required: true, message: `Nhập ${field.fieldLabel}!` },
                                    ...(fieldCode === "end_time" ? [{
                                        validator: (_rule: unknown, value: Dayjs | null) => {
                                            const startTime = form.getFieldValue("start_time") as Dayjs | null;
                                            if (!value || !startTime || value.isAfter(startTime)) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject(new Error("Thời gian kết thúc phải sau thời gian bắt đầu"));
                                        },
                                    }] : []),
                                ]}
                            >
                                <DatePicker
                                    size="small"
                                    showTime={{ format: "HH:mm" }}
                                    format="DD/MM/YYYY HH:mm"
                                    placeholder="DD/MM/YYYY HH:mm"
                                    style={{ width: "100%" }}
                                />
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
                    return (
                        <span>
                            {lessonStatusText(record.start_time, record.end_time)}
                        </span>
                    );
                }
                return <span>{text}</span>;
            },
        };
    });

    const progressColumnIndex = columns.findIndex((column) => column.key === "lesson_status");
    if (progressColumnIndex >= 0) {
        columns.splice(progressColumnIndex + 1, 0,
            {
                title: "Nghỉ học",
                key: "is_cancelled",
                width: 110,
                align: "center",
                render: (_value: unknown, record: ScheduleDataType) => (
                    Number(record.lesson_status) === 1
                        ? <Tag color="red">Nghỉ học</Tag>
                        : <Tag>Không</Tag>
                ),
            },
        );
    }

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
                                loading={savingKey === record.key}
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
                                disabled={savingKey === record.key}
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
        <div style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            minHeight: 0,
            overflowX: "hidden",
            overflowY: isDesktop ? "hidden" : "auto",
            WebkitOverflowScrolling: "touch",
        }}>
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
                            Theo dõi các buổi học theo lớp, giáo viên và khung giờ. Bạn có thể thêm lịch,
                            dời lịch, nghỉ học, sửa nhanh từng dòng hoặc sửa hàng loạt những buổi chưa diễn ra.
                        </div>
                    </div>
                </div>
            </div>

            <SearchAndActionsBar
                onSearch={handleSearch}
                placeholder="Tìm kiếm theo khóa học, bài học, giáo viên, phòng học..."
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
                        {canCreateSchedule && (
                            <Button
                                icon={<CalendarOutlined />}
                                disabled={!submittedFilterValues.code}
                                onClick={() => setOpenAutoScheduleModal(true)}
                            >
                                Tạo lịch tự động
                            </Button>
                        )}
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => {
                                if (hasSearched) void refreshSchedules();
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

            <div style={{ display: "flex", justifyContent: viewMode === "calendar" ? "space-between" : "flex-end", alignItems: "center", marginBottom: 12 }}>
                {viewMode === "calendar" && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: 12, height: 12, borderRadius: 2, background: '#e6f4ff', borderLeft: '3px solid #1677ff' }} />
                            <span style={{ fontSize: 13, color: '#555' }}>Sắp diễn ra</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: 12, height: 12, borderRadius: 2, background: '#fff2e8', borderLeft: '3px solid #fa541c' }} />
                            <span style={{ fontSize: 13, color: '#555' }}>Đang diễn ra</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: 12, height: 12, borderRadius: 2, background: '#f6ffed', borderLeft: '3px solid #52c41a' }} />
                            <span style={{ fontSize: 13, color: '#555' }}>Đã kết thúc</span>
                        </div>
                    </div>
                )}
                <Segmented
                    value={viewMode}
                    options={[
                        { label: "Dạng bảng", value: "table" },
                        { label: "Dạng lịch", value: "calendar" },
                    ]}
                    onChange={(value) => {
                        const nextMode = value as "table" | "calendar";
                        if (nextMode === "calendar") setCalendarMounted(true);
                        setViewMode(nextMode);
                    }}
                />
            </div>

            <Form
                form={form}
                component={false}
                style={{
                    flex: isDesktop ? "1 1 0" : "0 0 auto",
                    height: isDesktop ? undefined : "65dvh",
                    minHeight: isDesktop ? 0 : 420,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div ref={tableContainerRef} style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden" }}>
                    {!hasSearched ? (
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
                        <>
                        <style>{`
                            .schedule-view-stage {
                                position: relative;
                                height: 100%;
                                min-height: 0;
                                overflow: hidden;
                            }
                            .schedule-view-pane {
                                position: absolute;
                                inset: 0;
                                min-height: 0;
                                opacity: 0;
                                transform: translateY(8px);
                                pointer-events: none;
                                transition:
                                    opacity 180ms ease,
                                    transform 180ms ease;
                                will-change: opacity, transform;
                            }
                            .schedule-view-pane-active {
                                opacity: 1;
                                transform: translateY(0);
                                pointer-events: auto;
                                z-index: 1;
                            }
                            @media (prefers-reduced-motion: reduce) {
                                .schedule-view-pane {
                                    transition: none;
                                    transform: none;
                                }
                            }
                        `}</style>
                        <div className="schedule-view-stage">
                        <div
                            className={`schedule-view-pane custom-calendar-wrapper${viewMode === "calendar" ? " schedule-view-pane-active" : ""}`}
                            aria-hidden={viewMode !== "calendar"}
                            style={{ height: "100%", padding: "16px", background: "#fff", borderRadius: "8px" }}
                        >
                            <style>{`
                                .custom-calendar-wrapper .fc {
                                    font-family: inherit;
                                }
                                .custom-calendar-wrapper .fc-theme-standard td,
                                .custom-calendar-wrapper .fc-theme-standard th {
                                    border-color: #f0f0f0;
                                }
                                .custom-calendar-wrapper .fc-col-header-cell-cushion {
                                    padding: 8px 4px;
                                    color: #1f1f1f;
                                    font-weight: 600;
                                }
                                .custom-calendar-wrapper .fc-event {
                                    border-radius: 4px;
                                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                                    border: none !important;
                                    padding: 0;
                                    background: transparent !important;
                                    transition: transform 0.1s ease;
                                }
                                .custom-calendar-wrapper .fc-event:hover {
                                    transform: translateY(-1px);
                                    box-shadow: 0 2px 5px rgba(0,0,0,0.15);
                                    z-index: 5 !important;
                                }
                                .custom-calendar-wrapper .fc-timegrid-event-harness > .fc-timegrid-event {
                                    box-shadow: none;
                                }
                                .custom-calendar-wrapper .fc-timegrid-slot-label-cushion {
                                    font-size: 13px;
                                    color: #8c8c8c;
                                }
                                .custom-calendar-wrapper .fc-daygrid-event-harness {
                                    margin-bottom: 2px !important;
                                }
                                .custom-calendar-wrapper .fc .fc-button-primary {
                                    background-color: #ffffff;
                                    border-color: #d9d9d9;
                                    color: rgba(0, 0, 0, 0.88);
                                    background-image: none;
                                    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.02);
                                    text-shadow: none;
                                    text-transform: capitalize;
                                    transition: all 0.2s cubic-bezier(0.645, 0.045, 0.355, 1);
                                }
                                .custom-calendar-wrapper .fc .fc-button-primary:hover {
                                    color: #4096ff;
                                    border-color: #4096ff;
                                    background-color: #ffffff;
                                }
                                .custom-calendar-wrapper .fc .fc-button-primary:focus,
                                .custom-calendar-wrapper .fc .fc-button-primary:active,
                                .custom-calendar-wrapper .fc .fc-button-primary:focus:active {
                                    box-shadow: none !important;
                                    outline: none !important;
                                }
                                .custom-calendar-wrapper .fc .fc-button-primary:not(:disabled):active,
                                .custom-calendar-wrapper .fc .fc-button-primary:not(:disabled).fc-button-active {
                                    color: #1677ff;
                                    border-color: #1677ff;
                                    background-color: #ffffff;
                                }
                            `}</style>
                            {calendarMounted && <FullCalendar
                                ref={calendarRef}
                                plugins={CALENDAR_PLUGINS}
                                initialView={isDesktop ? "timeGridWeek" : "timeGridDay"}
                                locale={viLocale}
                                headerToolbar={calendarHeaderToolbar}
                                events={calendarEvents}
                                eventContent={renderCalendarEvent}
                                eventClick={handleCalendarEventClick}
                                height="100%"
                                allDaySlot={false}
                                slotMinTime="06:00:00"
                                slotMaxTime="23:00:00"
                            />}
                        </div>
                        <div
                            className={`schedule-view-pane${viewMode === "table" ? " schedule-view-pane-active" : ""}`}
                            aria-hidden={viewMode !== "table"}
                            style={{ height: "100%", minHeight: 0 }}
                        >
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
                                showTotal: (total) => `Tổng ${total} buổi học`,
                                onChange: (page, size) => {
                                    if (!hasSearched) return;
                                    setCurrentPage(page);
                                    setPageSize(size);
                                }
                            }}
                            onChange={(_, __, sorter, extra) => {
                                if (extra.action !== "sort") return;
                                if (!hasSearched) return;
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
                        </div>
                        </>
                    )}
                </div>
                <ScheduleFilterDrawer
                    open={openFilterDrawer}
                    onClose={() => setOpenFilterDrawer(false)}
                    value={filterValues}
                    loading={loading}
                    programOptions={programOptions}
                    loadingPrograms={programsQuery.isLoading || programsQuery.isValidating}
                    onSearch={handleScheduleFilter}
                    onReset={handleResetScheduleFilter}
                />
                <Modal
                    open={Boolean(calendarDetail)}
                    title={calendarDetail?.lesson_name || "Chi tiết buổi học"}
                    footer={null}
                    width={900}
                    onCancel={() => setCalendarDetail(null)}
                >
                    {calendarDetail && <ScheduleDetailRow record={calendarDetail} />}
                </Modal>
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
                    mode={importMode}
                    preview={importMappingPreview}
                    onClose={() => {
                        setOpenImportModal(false);
                        setImportMappingPreview(null);
                        setPendingMappingFile(null);
                        setImportErrors([]);
                    }}
                    onSubmit={handleImportSchedule}
                    onModeChange={(mode) => {
                        setImportMode(mode);
                        setImportMappingPreview(null);
                        setPendingMappingFile(null);
                        setImportErrors([]);
                    }}
                    onConfirmPreview={handleConfirmMappingImport}
                    onDownloadTemplate={handleDownloadImportTemplate}
                />
                <AutoScheduleModal
                    open={openAutoScheduleModal}
                    programCode={String(submittedFilterValues.code || "")}
                    onClose={() => setOpenAutoScheduleModal(false)}
                    onSuccess={async () => {
                        api.success({ message: "Đã tạo lịch tự động" });
                        await refreshSchedules();
                    }}
                />
                <BulkEditModal
                    open={openBulkEditModal}
                    selectedRowKeys={selectedRowKeys}
                    selectedRows={data.filter((item) => selectedRowKeys.map(String).includes(String(item.id)))}
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

                            if (modalPayload.operation === 'cancel' || modalPayload.operation === 'makeup') {
                                await updateLivestreamBulk({
                                    ids: targetIds,
                                    operation: modalPayload.operation,
                                    reason: modalPayload.reason,
                                    offset_days: modalPayload.offset_days,
                                });
                                api.success({
                                    message: "Thành công",
                                    description: modalPayload.operation === 'cancel'
                                        ? `Đã đánh dấu nghỉ ${targetIds.length} lịch học.`
                                        : `Đã đánh dấu nghỉ và tạo ${targetIds.length} lịch bù.`,
                                });
                                setSelectedRowKeys([]);
                                if (hasSearched) await refreshSchedules();
                                return;
                            }

                            let update_data: any = {};
                            let apiConfigMode = modalPayload.config_mode;

                            if (modalPayload.config_mode === 'common') {
                                const commonUpdate = {
                                    teacher: modalPayload.common_config.teacher,
                                    assistant_teacher: modalPayload.common_config.assistant_teacher,
                                    room: modalPayload.common_config.room,
                                    start_time: modalPayload.common_config.start_time,
                                    end_time: modalPayload.common_config.end_time,
                                };
                                const mappingUpdates = modalPayload.common_config.mapping_updates;
                                if (mappingUpdates) {
                                    apiConfigMode = 'separate';
                                    update_data = targetIds.map((id) => ({
                                        id,
                                        ...commonUpdate,
                                        package_lesson_mappings: mappingUpdates[String(id)] || [],
                                    }));
                                } else {
                                    update_data = commonUpdate;
                                }
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
                                        ...('package_lesson_mappings' in config
                                            ? { package_lesson_mappings: config.package_lesson_mappings || [] }
                                            : {}),
                                    }
                                });
                            }

                            const apiPayload = {
                                ids: targetIds,
                                config_mode: apiConfigMode,
                                update_data: update_data
                            };

                            await updateLivestreamBulk(apiPayload);

                            api.success({ message: "Thành công", description: `Đã cập nhật hàng loạt ${targetIds.length} bài học.` });

                            setSelectedRowKeys([]);
                            if (hasSearched) {
                                await refreshSchedules();
                            }

                        } catch (error: any) {
                            console.error(error);
                            api.error({ message: "Cập nhật thất bại", description: error.message || "Đã xảy ra lỗi" });
                            throw error;
                        }
                    }}
                />
            </Form>
        </div>
    );
};

export default Page;
