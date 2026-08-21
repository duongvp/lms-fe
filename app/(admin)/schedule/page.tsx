"use client";
import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CustomTable from "@/components/ui/Table";
import type { ColumnsType } from "antd/es/table";
import type { SorterResult } from "antd/es/table/interface";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import { notification, Alert, Form, Input, Select, Button, Space, Modal, Row, Col, DatePicker, TimePicker, Drawer, Empty, FloatButton, Grid, Tooltip, Descriptions, Tabs, Dropdown, Typography, Calendar as AntCalendar, Badge, Segmented, Tag, Progress } from "antd";
import type { TabsProps } from "antd";
import { EditOutlined, SaveOutlined, CloseOutlined, CopyOutlined, DeleteOutlined, CalendarOutlined, ReloadOutlined, DownOutlined, InfoCircleOutlined, UpOutlined, DownloadOutlined, FilterOutlined, MoreOutlined, FileExcelOutlined, FileTextOutlined } from "@ant-design/icons";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import viLocale from "@fullcalendar/core/locales/vi";
import ScheduleModal from "./components/Modal/ScheduleModal";
import CopyScheduleModal from "./components/Modal/CopyScheduleModal";
import ScheduleImportModal, { type ScheduleImportError } from "./components/Modal/ScheduleImportModal";
import { useAuthStore } from "@/stores/authStore";
import { PermissionKey } from "@/types/permissions";
import {
    deleteLivestream,
    downloadLivestreamImportTemplate,
    exportLivestreams,
    importLivestreamsFile,
    syncMissingTeachingUsers,
    updateLivestreamsFile,
    updateLivestream,
} from "@/services/livestreamService";
import dayjs, { Dayjs } from "dayjs";
import type { ModuleField, ResolvedFieldPermission } from "@/types/fieldPolicy";
import { canEditAnyField, resolveModuleFieldPermissions, sanitizeEditablePayload } from "@/helper/fieldPolicy";
import { useLmsCache, useModuleFieldsQuery, useSchedulesQuery, useSchedulingProgramsQuery, useTeachingStaffQuery } from "@/hooks/useLmsQueries";
import type { LivestreamListParams } from "@/services/livestreamService";
import TeachingStaffSelect from "@/components/shared/TeachingStaffSelect";

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
    system_type?: Array<"topclass" | "topuni">;
    time_status?: Array<"upcoming" | "ongoing" | "completed">;
    date_range?: [Dayjs, Dayjs];
}

interface ScheduleSortItem {
    field: string;
    order: "ascend" | "descend";
}

type ScheduleSortState = ScheduleSortItem[];

const DEFAULT_MODULE_FIELDS: ModuleField[] = [
    { fieldCode: "learn_number", fieldLabel: "Bài học", fieldType: "number", sortOrder: 1 },
    { fieldCode: "lesson_name", fieldLabel: "Tên bài học", fieldType: "text", sortOrder: 2 },
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
const parseCalendarWallTime = (value: unknown) => dayjs(String(value || "").replace(/Z$/, ""));
const LIVE_WEEKDAY_LABELS = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
const liveWeekdayLabel = (value: unknown) => {
    const date = parseCalendarWallTime(value);
    return date.isValid() ? LIVE_WEEKDAY_LABELS[date.day()] : "-";
};

const mapScheduleRows = (rows: any[]): ScheduleDataType[] => rows.map((item: any) => ({
    ...item,
    key: item.id?.toString() || item.key,
    id: item.id?.toString(),
    code: item.code,
    class_name: item.class_name || item.code,
    start_time: item.start_time ? parseCalendarWallTime(item.start_time).format("YYYY-MM-DDTHH:mm") : "",
    end_time: item.end_time ? parseCalendarWallTime(item.end_time).format("YYYY-MM-DDTHH:mm") : "",
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
    "lesson_name",
    "subject",
]);

const cleanFilterValues = (values: ScheduleFilterValues): ScheduleFilterValues => {
    const cleaned: ScheduleFilterValues = {};

    Object.entries(values).forEach(([key, value]) => {
        // RangePicker có thể trả về null hoặc mảng [null, null] sau khi người
        // dùng bấm xoá. Chỉ giữ khoảng ngày khi có đủ hai ngày hợp lệ, để URL
        // không giữ lại from/to của lần lọc trước.
        if (key === "date_range") {
            const [from, to] = Array.isArray(value) ? value : [];
            if (dayjs.isDayjs(from) && from.isValid() && dayjs.isDayjs(to) && to.isValid()) {
                cleaned.date_range = [from, to];
            }
            return;
        }
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

const buildScheduleUrl = (values: ScheduleFilterValues, targetPage = 1) => {
    // Đây là lớp bảo vệ cuối cùng trước khi ghi URL. Không phụ thuộc việc
    // caller đã làm sạch form hay chưa, nên thao tác clear ở bất kỳ filter nào
    // cũng không thể giữ lại params của lần tìm kiếm trước.
    const cleaned = cleanFilterValues(values);
    const params = new URLSearchParams();
    const program = String(cleaned.code || "").trim();
    const keyword = String(cleaned.keyword || "").trim();
    const teacher = String(cleaned.teacher || "").trim();
    if (program) params.set("program", program);
    if (keyword) params.set("q", keyword);
    if (teacher) params.set("teacher", teacher);
    if (cleaned.system_type?.length) params.set("system_type", cleaned.system_type.join(","));
    if (cleaned.time_status?.length) params.set("status", cleaned.time_status.join(","));
    if (cleaned.date_range?.[0]?.isValid() && cleaned.date_range[1]?.isValid()) {
        params.set("from", cleaned.date_range[0].format("YYYY-MM-DD"));
        params.set("to", cleaned.date_range[1].format("YYYY-MM-DD"));
    }
    if (targetPage > 1) params.set("page", String(targetPage));
    return params.size ? `/schedule?${params.toString()}` : "/schedule";
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
    allowFilterWithoutProgram,
}: {
    open: boolean;
    value: ScheduleFilterValues;
    loading: boolean;
    onSearch: (values: ScheduleFilterValues) => void;
    onReset: () => void;
    onClose: () => void;
    programOptions: Array<{ value: string; label: string }>;
    loadingPrograms: boolean;
    allowFilterWithoutProgram: boolean;
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
            width="min(92vw, 400px)"
            footer={
                <Space className="responsive-modal-footer" style={{ width: "100%", justifyContent: "flex-end" }}>
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
                        rules={allowFilterWithoutProgram ? [] : [{ required: true, message: "Vui lòng chọn Chương trình" }]}
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
                    {allowFilterWithoutProgram && (
                        <Alert
                            type="info"
                            showIcon
                            message="Admin có thể lọc theo thời gian mà không cần chọn Chương trình"
                            style={{ marginTop: -8, marginBottom: 16 }}
                        />
                    )}
                    <Form.Item name="teacher" label="Giáo viên">
                        <TeachingStaffSelect
                            teacherType={1}
                            allowQuickCreate={false}
                            allowClear
                            showSearch
                            placeholder="Chọn giáo viên"
                        />
                    </Form.Item>
                    <Form.Item name="system_type" label="Hệ thống">
                        <Select
                            mode="multiple"
                            maxTagCount="responsive"
                            allowClear
                            placeholder="Tất cả hệ thống"
                            options={[
                                { value: "topclass", label: "Topclass" },
                                { value: "topuni", label: "Topuni" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item name="time_status" label="Trạng thái buổi học">
                        <Select
                            mode="multiple"
                            maxTagCount="responsive"
                            allowClear
                            placeholder="Tất cả trạng thái"
                            options={[
                                { value: "upcoming", label: "Chưa bắt đầu" },
                                { value: "ongoing", label: "Đang diễn ra" },
                                { value: "completed", label: "Đã kết thúc" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item
                        name="date_range"
                        label="Khoảng ngày"
                        normalize={(value) => {
                            const [from, to] = Array.isArray(value) ? value : [];
                            return dayjs.isDayjs(from) && from.isValid() && dayjs.isDayjs(to) && to.isValid()
                                ? [from, to]
                                : undefined;
                        }}
                    >
                        <RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                    </Form.Item>
                </Form>
            </div>
        </Drawer>
    );
};

const Page = () => {
    const pageScrollRef = useRef<HTMLDivElement>(null);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const { fieldPolicy, permissions, roles } = useAuthStore((state) => state.user);
    const isAdmin = permissions.includes("*") || roles?.some((role: any) => String(role?.code || role?.name || role).toLowerCase() === "admin");
    const hasPermission = useAuthStore(state => state.hasPermission);
    const can = useAuthStore(state => state.can);
    const [data, setData] = useState<ScheduleDataType[]>(MOCK_SCHEDULES);
    const [filteredData, setFilteredData] = useState<ScheduleDataType[]>(MOCK_SCHEDULES);
    const [searchText, setSearchText] = useState("");
    const [editingKey, setEditingKey] = useState<string>("");
    const [savingKey, setSavingKey] = useState<string>("");
    const [moduleFields, setModuleFields] = useState<ModuleField[]>(DEFAULT_MODULE_FIELDS);
    const [form] = Form.useForm();
    const [api, contextHolder] = notification.useNotification({ duration: 2.5 });
    const router = useRouter();
    const searchParams = useSearchParams();
    // router.replace là bất đồng bộ. Lưu cả URL đích (không chỉ program) để
    // searchParams cũ không ghi đè những điều kiện lọc người dùng vừa chọn.
    const filterRevisionRef = useRef(0);
    const pendingScheduleUrlRef = useRef<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [openImportModal, setOpenImportModal] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importErrors, setImportErrors] = useState<ScheduleImportError[]>([]);
    const [importMode, setImportMode] = useState<"create" | "update">("create");
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<ScheduleDataType | null>(null);
    const [copySource, setCopySource] = useState<ScheduleDataType | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    // Khởi tạo thu gọn để không chớp phần hướng dẫn trước khi đọc thiết lập
    // localStorage. Nếu người dùng chọn hiển thị, effect bên dưới sẽ mở ra.
    const [showPageInfo, setShowPageInfo] = useState(false);
    const [pageInfoReady, setPageInfoReady] = useState(false);
    const [syncingTeachingUsers, setSyncingTeachingUsers] = useState(false);

    // Đồng bộ trước khi browser vẽ frame đầu tiên; đồng thời giữ transition
    // tắt cho lần đồng bộ này để trạng thái đã lưu không bị animate.
    useLayoutEffect(() => {
        setShowPageInfo(window.localStorage.getItem('lms:page-info:schedule') !== 'hidden');
    }, []);
    useEffect(() => {
        // Chờ một frame đã được vẽ với transition = none trước khi bật lại
        // animation. Nếu bật ngay trong effect, React có thể gộp với cập nhật
        // state phía trên và vẫn tạo hiệu ứng đóng → mở.
        let secondFrame = 0;
        const firstFrame = window.requestAnimationFrame(() => {
            secondFrame = window.requestAnimationFrame(() => setPageInfoReady(true));
        });
        return () => {
            window.cancelAnimationFrame(firstFrame);
            if (secondFrame) window.cancelAnimationFrame(secondFrame);
        };
    }, []);
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; created: number; failed: number; errors: Array<{ calendar_id: number; message: string }> } | null>(null);

    const replaceScheduleUrl = useCallback((values: ScheduleFilterValues, targetPage = 1) => {
        const program = String(values.code || "").trim();
        const nextUrl = buildScheduleUrl(values, targetPage);
        pendingScheduleUrlRef.current = nextUrl;
        if (program) useAuthStore.getState().setCurrentProgram(program);
        // Admin bỏ chọn chương trình là thao tác chủ động chuyển sang ngữ cảnh
        // liên chương trình; cũng phải xoá shared context để trang Câu hỏi và
        // các trang khác không nhận lại mã chương trình cũ.
        else if (isAdmin) useAuthStore.getState().setCurrentProgram(null);
        router.replace(nextUrl, { scroll: false });
    }, [isAdmin, router]);

    useEffect(() => {
        const urlProgram = String(searchParams.get("program") || "").trim();
        const currentUrl = searchParams.size
            ? `/schedule?${searchParams.toString()}`
            : "/schedule";
        // Trong lúc Next.js chưa áp dụng router.replace mới nhất, hook vẫn có
        // thể trả về params của URL trước đó. Không đồng bộ URL cũ ngược lại
        // vào state form, vì như vậy các filter vừa chọn sẽ bị mất.
        if (
            pendingScheduleUrlRef.current !== null
            && currentUrl !== pendingScheduleUrlRef.current
        ) return;
        pendingScheduleUrlRef.current = null;
        const sharedProgram = String(useAuthStore.getState().currentProgram || "").trim();
        // Admin có thể chủ động bỏ chọn chương trình để lọc liên chương trình.
        // Không fallback về sharedProgram ở trường hợp này, nếu không mã cũ sẽ
        // bị tự thêm lại sau khi URL/state được đồng bộ.
        const program = urlProgram || (isAdmin ? "" : sharedProgram);
        const hasDateFilter = Boolean(searchParams.get("from") || searchParams.get("to"));
        const hasOtherFilter = Boolean(
            searchParams.get("q") || searchParams.get("teacher") || searchParams.get("system_type") || searchParams.get("status")
        );
        // Admin được phép xem liên chương trình theo thời gian, nên URL không
        // có `program` vẫn phải được khôi phục đầy đủ sau khi tải lại trang.
        if (!program && (!isAdmin || (!hasDateFilter && !hasOtherFilter))) {
            setOpenFilterDrawer(true);
            return;
        }
        if (program) {
            useAuthStore.getState().setCurrentProgram(program);
            if (!urlProgram) {
                const params = new URLSearchParams(searchParams.toString());
                params.set("program", program);
                const nextUrl = `/schedule?${params.toString()}`;
                pendingScheduleUrlRef.current = nextUrl;
                router.replace(nextUrl, { scroll: false });
            }
        }
        const from = dayjs(searchParams.get("from"));
        const to = dayjs(searchParams.get("to"));
        const values: ScheduleFilterValues = cleanFilterValues({
            code: program,
            keyword: String(searchParams.get("q") || "").trim(),
            teacher: String(searchParams.get("teacher") || "").trim(),
            system_type: String(searchParams.get("system_type") || "")
                .split(",")
                .filter((system): system is "topclass" | "topuni" => (
                    ["topclass", "topuni"].includes(system)
                )),
            time_status: String(searchParams.get("status") || "")
                .split(",")
                .filter((status): status is "upcoming" | "ongoing" | "completed" => (
                    ["upcoming", "ongoing", "completed"].includes(status)
                )),
            date_range: from.isValid() && to.isValid() ? [from, to] : undefined,
        });
        setFilterValues(values);
        setSubmittedFilterValues(values);
        setSearchText(String(values.keyword || ""));
        setCurrentPage(Math.max(1, Number(searchParams.get("page")) || 1));
        setHasSearched(true);
    }, [searchParams, isAdmin, router]);

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

    const handleCopySchedule = (record: ScheduleDataType) => {
        if (!record.end_time || !dayjs(record.end_time).isBefore(dayjs())) {
            api.warning({ message: "Chỉ sao chép nhanh những buổi học đã kết thúc" });
            return;
        }
        setCopySource(record);
    };

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [totalItems, setTotalItems] = useState(0);
    const [filterValues, setFilterValues] = useState<ScheduleFilterValues>({});
    const [submittedFilterValues, setSubmittedFilterValues] = useState<ScheduleFilterValues>({});
    const [hasSearched, setHasSearched] = useState(false);
    const [sortState, setSortState] = useState<ScheduleSortState>([]);
    const [columnProgramFilter, setColumnProgramFilter] = useState<string | undefined>();
    const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
    const [calendarMounted, setCalendarMounted] = useState(false);
    const [calendarData, setCalendarData] = useState<ScheduleDataType[]>([]);
    const [calendarDetail, setCalendarDetail] = useState<ScheduleDataType | null>(null);
    const calendarRef = useRef<FullCalendar>(null);
    const screens = Grid.useBreakpoint();
    const isDesktop = Boolean(screens.lg);

    useEffect(() => {
        // Content của AdminLayout đã là vùng cuộn chính. Không tạo thêm vùng
        // cuộn ở trang này, nếu không sẽ xuất hiện hai thanh cuộn dọc.
        const scrollContainer = pageScrollRef.current?.closest(".ant-layout-content") as HTMLElement | null;
        const updateBackToTopVisibility = () => {
            setShowBackToTop(Math.max(scrollContainer?.scrollTop ?? 0, window.scrollY) > 320);
        };

        scrollContainer?.addEventListener("scroll", updateBackToTopVisibility, { passive: true });
        window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });
        updateBackToTopVisibility();
        return () => {
            scrollContainer?.removeEventListener("scroll", updateBackToTopVisibility);
            window.removeEventListener("scroll", updateBackToTopVisibility);
        };
    }, []);

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
        return rows.map((program: any) => {
            const code = String(program.code ?? "").trim();
            const subjectName = String(program.subject_name ?? "").trim();
            return {
                value: code,
                // Dữ liệu cũ có thể đã lưu subject_name bằng chính mã chương trình.
                // Không lặp lại mã trong nhãn chọn để tránh gây hiểu nhầm.
                label: subjectName && subjectName !== code ? `${code} · ${subjectName}` : code,
            };
        });
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
    const activeProgramCode = String(submittedFilterValues.code || "").trim() || undefined;
    const canCreateSchedule = can(PermissionKey.SCHEDULE_CREATE, activeProgramCode);
    const canEditSchedule = can(PermissionKey.SCHEDULE_EDIT, activeProgramCode);
    const canDeleteSchedule = can(PermissionKey.SCHEDULE_DELETE, activeProgramCode);
    const canImportSchedule = can(PermissionKey.SCHEDULE_IMPORT, activeProgramCode);
    const canExportSchedule = can(PermissionKey.SCHEDULE_EXPORT, activeProgramCode);
    const canEditTeachingAssignment = can(PermissionKey.CALENDAR_TEACHER_MANAGE, activeProgramCode);

    const isEditing = (record: ScheduleDataType) => record.key === editingKey;

    // ✅ Hàm thực sự submit search (được debounce)
    const doSearch = useCallback((keyword: string, revision: number) => {
        if (!hasSearched || revision !== filterRevisionRef.current) return;
        const nextValues = cleanFilterValues({ ...submittedFilterValues, keyword });
        setSubmittedFilterValues(nextValues);
        setCurrentPage(1);
        replaceScheduleUrl(nextValues);
    }, [hasSearched, replaceScheduleUrl, submittedFilterValues]);

    // ✅ Debounce hàm doSearch với 500ms
    const debouncedDoSearch = useDebounce(doSearch, 500);

    // ✅ Handle search với debounce
    const handleSearch = useCallback(async (value: string) => {
        setSearchText(value);
        setFilterValues((prev) => cleanFilterValues({ ...prev, keyword: value }));
        setCurrentPage(1);

        debouncedDoSearch(value, filterRevisionRef.current);
    }, [debouncedDoSearch]);

    const handleScheduleFilter = (values: ScheduleFilterValues) => {
        // Hủy hiệu lực mọi lần tìm kiếm keyword đang debounce với bộ lọc cũ.
        filterRevisionRef.current += 1;
        if (!String(values.code || "").trim() && !isAdmin) {
            api.warning({
                message: "Vui lòng chọn Chương trình",
                description: "Bạn cần chọn Chương trình trong bộ lọc trước khi tìm kiếm lịch học.",
            });
            return;
        }
        const cleaned = cleanFilterValues({ ...values, keyword: searchText });
        setFilterValues(cleaned);
        setSubmittedFilterValues(cleaned);
        setHasSearched(true);
        setCurrentPage(1);
        replaceScheduleUrl(cleaned);
        setOpenFilterDrawer(false);
    };

    const handleResetScheduleFilter = () => {
        filterRevisionRef.current += 1;
        const cleaned = cleanFilterValues({ keyword: "" });
        setSearchText("");
        setFilterValues(cleaned);
        setSubmittedFilterValues(cleaned);
        setHasSearched(false);
        setCurrentPage(1);
        replaceScheduleUrl(cleaned);
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
        if (!submittedFilterValues.code) {
            api.warning({
                message: "Vui lòng chọn Chương trình",
                description: "Chọn Chương trình trong bộ lọc trước khi thêm lịch học.",
            });
            setOpenFilterDrawer(true);
            return;
        }
        setIsModalOpen(true);
        setIsEditMode(false)
    };

    // ... (giữ nguyên các hàm xử lý danh sách, import, cập nhật, chỉnh sửa và xóa lịch)

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

    const handleSyncMissingTeachingUsers = () => {
        const targetIds = selectedRowKeys.map(String).map(Number).filter(id => !isNaN(id));
        if (targetIds.length === 0) {
            api.warning({
                message: "Chưa chọn lịch",
                description: "Vui lòng chọn ít nhất 1 lịch để quét user nhân sự.",
            });
            return;
        }

        Modal.confirm({
            title: "Quét user giáo viên và trợ giảng",
            content: `Hệ thống sẽ quét ${targetIds.length} lịch đã chọn và chỉ thêm các user nhân sự còn thiếu. Lịch học và user đã có sẽ không bị thay đổi.`,
            okText: "Bắt đầu quét",
            cancelText: "Hủy",
            onOk: async () => {
                setSyncingTeachingUsers(true);
                setSyncProgress({ current: 0, total: targetIds.length, created: 0, failed: 0, errors: [] });
                setIsSyncModalOpen(true);
                try {
                    let totalCreated = 0;
                    let totalFailed = 0;
                    let totalScanned = 0;
                    const allErrors: Array<{ calendar_id: number; message: string }> = [];
                    const chunkSize = 10;
                    for (let i = 0; i < targetIds.length; i += chunkSize) {
                        const chunk = targetIds.slice(i, i + chunkSize);
                        const response: any = await syncMissingTeachingUsers(chunk);
                        const result = response?.data ?? response ?? {};
                        totalScanned += Number(result.scanned ?? 0);
                        totalCreated += Number(result.created ?? 0);
                        totalFailed += Number(result.failed ?? 0);
                        if (Array.isArray(result.errors)) {
                            allErrors.push(...result.errors);
                        }

                        setSyncProgress({
                            current: Math.min(i + chunkSize, targetIds.length),
                            total: targetIds.length,
                            created: totalCreated,
                            failed: totalFailed,
                            errors: allErrors
                        });
                    }
                    api.success({
                        message: "Đã quét user nhân sự",
                        description: `Đã quét ${totalScanned} lịch, tạo ${totalCreated} user mới${totalFailed ? `; ${totalFailed} lịch chưa xử lý được` : ''}.`,
                        duration: 6,
                    });
                } catch (error: any) {
                    api.error({
                        message: "Quét user nhân sự thất bại",
                        description: error?.message || "Không thể hoàn tất quét dữ liệu.",
                    });
                } finally {
                    setSyncingTeachingUsers(false);
                }
            },
        });
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

    const handleImportSchedule = async (file: File | undefined, sheetUrl?: string) => {
        const programCode = String(submittedFilterValues.code || "").trim();
        if (!isAdmin && !programCode) {
            api.warning({
                message: "Chưa chọn Chương trình",
                description: "Tài khoản không phải Admin phải lọc đúng Chương trình trước khi import hoặc cập nhật.",
            });
            setOpenImportModal(false);
            setOpenFilterDrawer(true);
            return;
        }
        try {
            setImporting(true);
            setImportErrors([]);
            const isUpdate = importMode === "update";
            const response: any = isUpdate
                ? await updateLivestreamsFile(file, programCode || undefined, sheetUrl)
                : await importLivestreamsFile(file, programCode || undefined, sheetUrl);
            api.success({
                message: isUpdate ? "Cập nhật thành công" : "Import thành công",
                description: isUpdate
                    ? `Đã cập nhật ${response?.data?.count ?? 0} lịch học; bỏ qua ${response?.data?.unchangedRows ?? 0} lịch không thay đổi.`
                    : `Đã tạo ${response?.data?.count ?? 0} lịch học.`,
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
                message: importMode === "update" ? "Cập nhật thất bại" : "Import thất bại",
                description: error.message || "File có dữ liệu không hợp lệ.",
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
            // Hai thời điểm này được gộp thành ba cột đọc nhanh: Thứ, Ngày live
            // và Khung giờ. Vẫn giữ nguyên dữ liệu start_time/end_time khi lưu.
            && !["start_time", "end_time"].includes(item.field.fieldCode)
            && !HIDDEN_SCHEDULE_LIST_FIELDS.has(item.field.fieldCode)
            && (item.visible || item.editable)
    );
    // Luôn để tên bài ngay cạnh số bài, kể cả khi thứ tự field được trả về từ
    // cấu hình cũ trong DB khác với thứ tự hiển thị của bảng lịch.
    const lessonNameIndex = visibleFieldPermissions.findIndex(
        (item) => item.field.fieldCode === "lesson_name"
    );
    const learnNumberIndex = visibleFieldPermissions.findIndex(
        (item) => item.field.fieldCode === "learn_number"
    );
    if (lessonNameIndex >= 0 && learnNumberIndex >= 0 && lessonNameIndex !== learnNumberIndex + 1) {
        const [lessonNameField] = visibleFieldPermissions.splice(lessonNameIndex, 1);
        const updatedLearnNumberIndex = visibleFieldPermissions.findIndex(
            (item) => item.field.fieldCode === "learn_number"
        );
        visibleFieldPermissions.splice(updatedLearnNumberIndex + 1, 0, lessonNameField);
    }
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
            className: ["learn_number", "lesson_name"].includes(fieldCode)
                ? "responsive-card-hidden"
                : undefined,
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
                                    teacherValueMode="displayName"
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
                    if (Number(record.lesson_status) === 1) {
                        return <Tag color="red">Nghỉ học</Tag>;
                    }
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

    const liveTimeColumns: ColumnsType<ScheduleDataType> = [
        {
            title: "Thứ",
            key: "live_weekday",
            dataIndex: "start_time",
            width: 92,
            fixed: "left",
            render: (value: unknown) => liveWeekdayLabel(value),
        },
        {
            title: "Ngày live",
            dataIndex: "start_time",
            key: "live_date",
            width: 118,
            fixed: "left",
            sorter: { multiple: visibleFieldPermissions.length + 2 },
            sortOrder: sortState.find((item) => item.field === "start_time")?.order,
            render: (value: unknown, record: ScheduleDataType) => {
                if (isEditing(record) && editableFieldCodes.includes("start_time")) {
                    return (
                        <Form.Item noStyle shouldUpdate>
                            {() => {
                                const start = form.getFieldValue("start_time") as Dayjs | null;
                                const end = form.getFieldValue("end_time") as Dayjs | null;
                                return (
                                    <DatePicker
                                        size="small"
                                        value={start}
                                        format="DD/MM/YYYY"
                                        placeholder="DD/MM/YYYY"
                                        style={{ width: "100%" }}
                                        onChange={(date) => {
                                            if (!date) return;
                                            const keepTime = (current: Dayjs | null) => current
                                                ? date.hour(current.hour()).minute(current.minute()).second(0).millisecond(0)
                                                : date.startOf("day");
                                            form.setFieldsValue({
                                                start_time: keepTime(start),
                                                end_time: keepTime(end),
                                            });
                                        }}
                                    />
                                );
                            }}
                        </Form.Item>
                    );
                }
                const date = parseCalendarWallTime(value);
                return date.isValid() ? date.format("DD/MM/YYYY") : "-";
            },
        },
        {
            title: "Khung giờ",
            key: "live_time_range",
            width: 132,
            fixed: "left",
            render: (_: unknown, record: ScheduleDataType) => {
                const canEditStart = editableFieldCodes.includes("start_time");
                const canEditEnd = editableFieldCodes.includes("end_time");
                if (isEditing(record) && (canEditStart || canEditEnd)) {
                    return (
                        <Space size={4} wrap={false}>
                            {canEditStart ? (
                                <Form.Item name="start_time" noStyle rules={[{ required: true, message: "Nhập thời gian bắt đầu" }]}>
                                    <TimePicker size="small" format="HH:mm" style={{ width: 68 }} />
                                </Form.Item>
                            ) : null}
                            <span>-</span>
                            {canEditEnd ? (
                                <Form.Item
                                    name="end_time"
                                    noStyle
                                    dependencies={["start_time"]}
                                    rules={[
                                        { required: true, message: "Nhập thời gian kết thúc" },
                                        {
                                            validator: (_rule: unknown, value: Dayjs | null) => {
                                                const startTime = form.getFieldValue("start_time") as Dayjs | null;
                                                if (!value || !startTime || value.isAfter(startTime)) return Promise.resolve();
                                                return Promise.reject(new Error("Giờ kết thúc phải sau giờ bắt đầu"));
                                            },
                                        },
                                    ]}
                                >
                                    <TimePicker size="small" format="HH:mm" style={{ width: 68 }} />
                                </Form.Item>
                            ) : null}
                        </Space>
                    );
                }
                const start = parseCalendarWallTime(record.start_time);
                const end = parseCalendarWallTime(record.end_time);
                if (!start.isValid() && !end.isValid()) return "-";
                return `${start.isValid() ? start.format("HH:mm") : "--:--"} - ${end.isValid() ? end.format("HH:mm") : "--:--"}`;
            },
        },
    ];
    columns.unshift(...liveTimeColumns);

    // Khi admin xem lịch của nhiều chương trình, mã chương trình là ngữ cảnh
    // bắt buộc để tránh cập nhật nhầm lịch giữa các chương trình.
    if (isAdmin) {
        columns.splice(liveTimeColumns.length, 0, {
            title: "Chương trình",
            dataIndex: "code",
            key: "program_code",
            className: "responsive-card-hidden",
            width: 180,
            fixed: "left",
            filters: Array.from(new Set(
                data.map((record) => String(record.code || '').trim()).filter(Boolean)
            )).sort((left, right) => left.localeCompare(right, 'vi')).map((code) => ({
                text: code,
                value: code,
            })),
            filterMultiple: false,
            filteredValue: columnProgramFilter ? [columnProgramFilter] : null,
            onFilter: (value: React.Key | boolean, record: ScheduleDataType) => (
                String(record.code || '') === String(value)
            ),
            render: (code: string, record: ScheduleDataType) => (
                <Space direction="vertical" size={0} style={{ lineHeight: 1.25 }}>
                    <Tag color="blue" style={{ width: "fit-content", marginInlineEnd: 0 }}>
                        {code || "Chưa xác định"}
                    </Tag>
                    {record.class_name && record.class_name !== code && (
                        <Typography.Text type="secondary" ellipsis style={{ maxWidth: 160, fontSize: 12 }}>
                            {record.class_name}
                        </Typography.Text>
                    )}
                </Space>
            ),
        });
    }

    if ((canEditSchedule && editableFieldCodes.length > 0) || canDeleteSchedule || canCreateSchedule) {
        columns.push({
            title: "Thao tác",
            key: "action",
            fixed: "right",
            width: 156,
            render: (_: any, record: ScheduleDataType) => {
                const editing = isEditing(record);
                const canModify = canModifySchedule(record);
                const canCopy = Boolean(
                    record.end_time
                    && dayjs(record.end_time).isBefore(dayjs())
                    && can(PermissionKey.SCHEDULE_CREATE, record.code)
                    && can(PermissionKey.CALENDAR_TEACHER_MANAGE, record.code)
                    && canEditAnyField(moduleFields, fieldPolicy, SCHEDULE_MODULE_CODE)
                );
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
                        {canCopy && (
                            <Tooltip title="Sao chép thành lịch mới">
                                <Button
                                    type="link"
                                    aria-label="Sao chép lịch"
                                    disabled={editingKey !== ""}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        handleCopySchedule(record);
                                    }}
                                    icon={<CopyOutlined />}
                                    size="small"
                                />
                            </Tooltip>
                        )}
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

    const handleOpenAutoSchedule = () => {
        const params = new URLSearchParams({
            program: String(submittedFilterValues.code),
            returnTo: buildScheduleUrl(submittedFilterValues, currentPage),
        });
        router.push(`/schedule/auto?${params.toString()}`);
    };

    const handleOpenBulkEdit = () => {
        const requestedRows = data.filter((item) => selectedRowKeys.map(String).includes(String(item.id)));
        const selectedPrograms = Array.from(new Set(
            requestedRows.map((item) => String(item.code || "").trim()).filter(Boolean)
        ));
        if (selectedPrograms.length > 1) {
            api.warning({
                message: "Nhiều Chương trình được chọn",
                description: "Sửa hàng loạt chỉ áp dụng cho một Chương trình. Hãy lọc hoặc chỉ chọn các lịch cùng Chương trình trước khi tiếp tục.",
            });
            return;
        }
        const selectedRows = requestedRows.filter(canModifySchedule);
        if (!selectedRows.length) {
            api.warning({
                message: "Không có lịch nào được chọn",
                description: "Lịch đã bắt đầu hoặc đã nghỉ không thể chỉnh sửa. Hãy chọn ít nhất một lịch chưa diễn ra.",
            });
            return;
        }
        if (selectedRows.length < requestedRows.length) {
            api.info({
                message: "Đã bỏ qua một số lịch",
                description: "Chỉ mở trang chỉnh sửa cho các lịch chưa bắt đầu. Các lịch đã diễn ra hoặc đã nghỉ bị bỏ qua.",
            });
        }
        sessionStorage.setItem("schedule:auto-edit:rows", JSON.stringify(selectedRows));
        const params = new URLSearchParams({
            ids: selectedRows.map((item) => String(item.id)).join(","),
            program: String(submittedFilterValues.code || ""),
            returnTo: buildScheduleUrl(submittedFilterValues, currentPage),
        });
        router.push(`/schedule/auto-edit?${params.toString()}`);
    };

    return (
        <div ref={pageScrollRef} style={{
            display: "flex",
            flexDirection: "column",
            flex: viewMode === "calendar" && isDesktop ? "1 1 0" : "0 0 auto",
            height: viewMode === "calendar" && isDesktop ? "100%" : "auto",
            minHeight: 0,
            overflowX: "hidden",
            overflowY: viewMode === "calendar" && isDesktop ? "hidden" : "visible",
            WebkitOverflowScrolling: "touch",
        }}>
            {contextHolder}
            {showBackToTop && (
                <FloatButton
                    tooltip="Lên đầu trang"
                    icon={<UpOutlined />}
                    onClick={() => {
                        const scrollContainer = pageScrollRef.current?.closest(".ant-layout-content") as HTMLElement | null;
                        scrollContainer?.scrollTo({ top: 0, behavior: "smooth" });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                />
            )}
            {viewMode === "table" && <>
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
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                            <InfoCircleOutlined style={{ color: "#1677ff", fontSize: 16 }} />
                            <span style={{ fontWeight: 600 }}>Quản lý lịch học</span>
                        </div>
                        <Button
                            type="link"
                            size="small"
                            icon={showPageInfo ? <UpOutlined /> : <DownOutlined />}
                            onClick={() => setShowPageInfo((value) => {
                                const next = !value;
                                window.localStorage.setItem('lms:page-info:schedule', next ? 'visible' : 'hidden');
                                return next;
                            })}
                        >
                            {showPageInfo ? "Ẩn thông tin" : "Hiện thông tin"}
                        </Button>
                    </div>
                    <div
                        style={{
                            display: "grid",
                            gridTemplateRows: showPageInfo ? "1fr" : "0fr",
                            transition: pageInfoReady ? "grid-template-rows 0.3s ease-in-out" : "none",
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
                    placeholder="Tìm kiếm theo chương trình, bài học, giáo viên, phòng học..."
                    handleAddBtn={canCreateSchedule ? handleAddBtn : undefined}
                    handleImportClick={(canImportSchedule || canEditSchedule) ? () => {
                        setImportErrors([]);
                        setImportMode(canImportSchedule ? "create" : "update");
                        setOpenImportModal(true);
                    } : undefined}
                    actionClassName="schedule-action-buttons"
                    secondaryActions={
                        isDesktop ? <>
                            <div className="schedule-workflow-actions">
                                {canCreateSchedule && (
                                    <Button
                                        icon={<CalendarOutlined />}
                                        disabled={!submittedFilterValues.code}
                                        onClick={handleOpenAutoSchedule}
                                    >
                                        Tạo lịch tự động
                                    </Button>
                                )}
                                {canEditSchedule && (
                                    <Button
                                        type="primary"
                                        icon={<EditOutlined />}
                                        onClick={handleOpenBulkEdit}
                                    >
                                        Sửa hàng loạt
                                    </Button>
                                )}
                            </div>
                            <div className="schedule-utility-actions">
                                <Button
                                    icon={<ReloadOutlined />}
                                    loading={syncingTeachingUsers}
                                    onClick={handleSyncMissingTeachingUsers}
                                >
                                    Quét user nhân sự
                                </Button>
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
                                    aria-label="Làm mới danh sách"
                                    title="Làm mới danh sách"
                                    icon={<ReloadOutlined />}
                                    onClick={() => {
                                        if (hasSearched) void refreshSchedules();
                                    }}
                                />
                                <Button
                                    aria-label="Lọc lịch học"
                                    title="Lọc lịch học"
                                    icon={<FilterOutlined />}
                                    onClick={() => setOpenFilterDrawer(true)}
                                />
                            </div>
                        </> : <div className="schedule-mobile-actions">
                            <Dropdown
                                trigger={["click"]}
                                menu={{
                                    items: [
                                        ...(canCreateSchedule ? [{ key: "auto", icon: <CalendarOutlined />, label: "Tạo lịch tự động", disabled: !submittedFilterValues.code }] : []),
                                        ...(canEditSchedule ? [{ key: "bulk-edit", icon: <EditOutlined />, label: "Sửa hàng loạt" }] : []),
                                        { key: "sync-teaching-users", icon: <ReloadOutlined />, label: "Quét user nhân sự" },
                                        ...(canExportSchedule ? [{ key: "xlsx", icon: <FileExcelOutlined />, label: `Xuất Excel${selectedRowKeys.length ? ` (${selectedRowKeys.length})` : ""}` }, { key: "csv", icon: <FileTextOutlined />, label: "Xuất CSV" }] : []),
                                        { key: "reload", icon: <ReloadOutlined />, label: "Làm mới" },
                                    ],
                                    onClick: ({ key }) => {
                                        if (key === "auto") handleOpenAutoSchedule();
                                        if (key === "bulk-edit") handleOpenBulkEdit();
                                        if (key === "sync-teaching-users") handleSyncMissingTeachingUsers();
                                        if (key === "xlsx" || key === "csv") handleExportSchedule(key);
                                        if (key === "reload" && hasSearched) void refreshSchedules();
                                    },
                                }}
                            >
                                <Button icon={<MoreOutlined />}>Thao tác khác</Button>
                            </Dropdown>
                            <Button icon={<FilterOutlined />} onClick={() => setOpenFilterDrawer(true)}>Lọc</Button>
                        </div>
                    }
                />
            </>}

            <style>{`
                @keyframes schedule-view-controls-enter {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .schedule-view-controls-enter {
                    animation: schedule-view-controls-enter 180ms ease-out;
                }
                @media (prefers-reduced-motion: reduce) {
                    .schedule-view-controls-enter { animation: none; }
                }
            `}</style>
            <div
                key={viewMode}
                className="responsive-schedule-view-toolbar schedule-view-controls-enter"
                style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: viewMode === "calendar" ? "space-between" : "flex-end", alignItems: "center", marginBottom: 12 }}
            >
                {viewMode === "calendar" && (
                    <div className="responsive-calendar-legend" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px' }}>
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
                    // Bảng đi theo luồng của trang; chỉ lịch cần một khung cao cố định.
                    flex: viewMode === "calendar" && isDesktop ? "1 1 0" : "0 0 auto",
                    height: viewMode === "calendar" && !isDesktop ? "65dvh" : undefined,
                    minHeight: viewMode === "calendar" ? (isDesktop ? 0 : 420) : 0,
                    overflow: viewMode === "calendar" ? "hidden" : "visible",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div style={{
                    flex: viewMode === "calendar" ? "1 1 0" : "0 0 auto",
                    minHeight: 0,
                    overflow: viewMode === "calendar" ? "hidden" : "visible",
                }}>
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
                                pointer-events: none;
                                transition: opacity 180ms ease;
                                will-change: opacity;
                            }
                            .schedule-view-pane-active {
                                opacity: 1;
                                pointer-events: auto;
                                z-index: 1;
                            }
                            @keyframes schedule-view-content-enter {
                                from { opacity: 0; }
                                to { opacity: 1; }
                            }
                            .schedule-view-pane-active {
                                animation: schedule-view-content-enter 200ms ease-out;
                            }
                            .schedule-view-stage-table {
                                height: auto;
                                overflow: visible;
                            }
                            .schedule-view-stage-table .schedule-view-pane {
                                position: static;
                                display: none;
                            }
                            .schedule-view-stage-table .schedule-view-pane-active {
                                display: block;
                            }
                            /* globals.css áp overflow-y: auto cho mọi Ant Table.
                               Lịch học dùng thanh cuộn của AdminLayout nên không được
                               tạo thêm scrollbar trong phần body của bảng. */
                            .schedule-data-table .ant-table-body,
                            .schedule-data-table .ant-table-content {
                                max-height: none !important;
                                overflow-y: hidden !important;
                            }
                            @media (prefers-reduced-motion: reduce) {
                                .schedule-view-pane {
                                    transition: none;
                                }
                                .schedule-view-pane-active {
                                    animation: none;
                                }
                            }
                        `}</style>
                            <div className={`schedule-view-stage${viewMode === "table" ? " schedule-view-stage-table" : ""}`}>
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
                                        // Khi admin xem nhiều chương trình, các lịch trùng giờ có
                                        // thể rất dày. Giới hạn stack để event còn đủ rộng để đọc;
                                        // các lịch còn lại nằm trong liên kết "+ thêm" của FullCalendar.
                                        eventMaxStack={isAdmin && !activeProgramCode ? 3 : undefined}
                                        moreLinkClick="popover"
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
                                        className="schedule-data-table"
                                        responsiveCardTitle={(record) => (
                                            <Space size={6} style={{ maxWidth: "100%" }}>
                                                {record.code && <Tag color="blue" style={{ marginInlineEnd: 0 }}>{record.code}</Tag>}
                                                <Typography.Text strong ellipsis style={{ maxWidth: 190 }}>
                                                    Bài {record.learn_number || "-"}{record.lesson_name ? ` · ${record.lesson_name}` : ""}
                                                </Typography.Text>
                                            </Space>
                                        )}
                                        columns={columns}
                                        dataSource={filteredData}
                                        loading={loading}
                                        rowSelection={rowSelection}
                                        pagination={{
                                            current: currentPage,
                                            pageSize: pageSize,
                                            total: totalItems,
                                            showSizeChanger: true,
                                            pageSizeOptions: ["25", "50", "100", "200", "300"],
                                            position: ["bottomRight"],
                                            showTotal: (total) => `Tổng ${total} buổi học`,
                                            onChange: (page, size) => {
                                                if (!hasSearched) return;
                                                setCurrentPage(page);
                                                setPageSize(size);
                                                replaceScheduleUrl(submittedFilterValues, size !== pageSize ? 1 : page);
                                            }
                                        }}
                                        size="middle"
                                        onChange={(_, filters, sorter, extra) => {
                                            if (extra.action === "filter") {
                                                const selectedProgram = filters.program_code?.[0];
                                                // Filter cột chỉ áp dụng trên dữ liệu đang hiển thị,
                                                // không gọi lại API hay làm gián đoạn thao tác của admin.
                                                setColumnProgramFilter(selectedProgram ? String(selectedProgram) : undefined);
                                                return;
                                            }
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
                                            replaceScheduleUrl(submittedFilterValues);
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
                                        sticky={{
                                            offsetHeader: 0,
                                            getContainer: () => (
                                                pageScrollRef.current?.closest(".ant-layout-content") as HTMLElement | null
                                            ) ?? window,
                                        }}
                                        scroll={{ x: "max-content" }}
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
                    allowFilterWithoutProgram={Boolean(isAdmin)}
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
                    programCode={isEditMode ? undefined : String(submittedFilterValues.code || "").trim() || undefined}
                />
                <CopyScheduleModal
                    open={Boolean(copySource)}
                    source={copySource}
                    onClose={() => setCopySource(null)}
                    onSuccess={() => {
                        setCopySource(null);
                        if (hasSearched) void refreshSchedules();
                        api.success({
                            message: "Sao chép lịch học thành công",
                            description: "Buổi học mới đã được tạo và giữ nguyên thông tin bài học từ lịch cũ.",
                        });
                    }}
                />
                <ScheduleImportModal
                    open={openImportModal}
                    loading={importing}
                    errors={importErrors}
                    mode={importMode}
                    allowCreateImport={canImportSchedule}
                    allowUpdateImport={canEditSchedule}
                    onClose={() => {
                        setOpenImportModal(false);
                        setImportErrors([]);
                    }}
                    onSubmit={handleImportSchedule}
                    onModeChange={(mode) => {
                        setImportMode(mode);
                        setImportErrors([]);
                    }}
                    onDownloadTemplate={handleDownloadImportTemplate}
                />
                <Modal
                    title="Tiến trình quét user nhân sự"
                    open={isSyncModalOpen}
                    footer={
                        <Button
                            type="primary"
                            onClick={() => setIsSyncModalOpen(false)}
                            disabled={syncingTeachingUsers}
                        >
                            Đóng
                        </Button>
                    }
                    closable={!syncingTeachingUsers}
                    maskClosable={!syncingTeachingUsers}
                    onCancel={() => {
                        if (!syncingTeachingUsers) setIsSyncModalOpen(false);
                    }}
                >
                    {syncProgress && (
                        <div style={{ padding: '20px 0', textAlign: 'center' }}>
                            <Progress
                                type="circle"
                                percent={Math.round((syncProgress.current / syncProgress.total) * 100)}
                                status={syncProgress.current === syncProgress.total ? "success" : "active"}
                            />
                            <div style={{ marginTop: 24, textAlign: 'left', background: '#f5f5f5', padding: '12px 16px', borderRadius: 8 }}>
                                <Typography.Text strong>Trạng thái chi tiết:</Typography.Text>
                                <br />
                                <Typography.Text>Đã quét: {syncProgress.current} / {syncProgress.total} lịch</Typography.Text>
                                <br />
                                <Typography.Text type="success">Đã tạo mới: {syncProgress.created} user</Typography.Text>
                                {syncProgress.failed > 0 && (
                                    <>
                                        <br />
                                        <Typography.Text type="danger">Lỗi: {syncProgress.failed} lịch</Typography.Text>
                                        <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8, padding: 8, background: '#fff', border: '1px solid #d9d9d9', borderRadius: 4 }}>
                                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                                                {syncProgress.errors.map((err, idx) => (
                                                    <li key={idx} style={{ fontSize: 13, marginBottom: 4 }}>
                                                        <Typography.Text type="danger">Lịch ID {err.calendar_id}: {err.message}</Typography.Text>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </Modal>
            </Form>
        </div>
    );
};

export default Page;
