"use client";
import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CustomTable from "@/components/ui/Table";
import type { ColumnsType } from "antd/es/table";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import { notification, Alert, Form, Input, InputNumber, Select, Button, Checkbox, Space, Modal, Row, Col, DatePicker, TimePicker, Drawer, Empty, FloatButton, Grid, Tooltip, Dropdown, Typography, Calendar as AntCalendar, Badge, Segmented, Tag, Progress, Table, Spin } from "antd";
import { EditOutlined, SaveOutlined, CloseOutlined, CopyOutlined, DeleteOutlined, CalendarOutlined, ReloadOutlined, DatabaseOutlined, DownOutlined, InfoCircleOutlined, UpOutlined, DownloadOutlined, UploadOutlined, FilterOutlined, MoreOutlined, ApartmentOutlined, CloudUploadOutlined } from "@ant-design/icons";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import viLocale from "@fullcalendar/core/locales/vi";
import ScheduleModal from "./components/Modal/ScheduleModal";
import CopyScheduleModal from "./components/Modal/CopyScheduleModal";
import ScheduleImportModal, { type ScheduleImportError } from "./components/Modal/ScheduleImportModal";
import ClassroomAssignmentModal from "./components/Modal/ClassroomAssignmentModal";
import { useAuthStore } from "@/stores/authStore";
import { PermissionKey } from "@/types/permissions";
import {
    applyStudentClassroomAssignment,
    deleteLivestream,
    downloadLivestreamImportTemplate,
    exportLivestreams,
    getLivestreams,
    importLivestreamsFile,
    resendLivestreamsToHocmai,
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
import { rememberProgramContextUrl } from "@/components/layouts/AdminLayout/SideMenu";
import { fetchAllPages } from "@/lib/fetchAllPages";

const SCHEDULE_MODULE_CODE = "calendar";
const { RangePicker } = DatePicker;

type ScheduleDocument = {
    url: string;
    label: string;
};

type ImmediateSelectAllCheckboxProps = {
    checked: boolean;
    indeterminate: boolean;
    busy: boolean;
    disabled: boolean;
    onChange: (checked: boolean) => void;
};

const ImmediateSelectAllCheckbox = React.memo(({
    checked,
    indeterminate,
    busy,
    disabled,
    onChange,
}: ImmediateSelectAllCheckboxProps) => {
    const [visualChecked, setVisualChecked] = useState(checked);
    const firstFrameRef = useRef<number | null>(null);
    const secondFrameRef = useRef<number | null>(null);

    useEffect(() => setVisualChecked(checked), [checked]);
    useEffect(() => () => {
        if (firstFrameRef.current !== null) cancelAnimationFrame(firstFrameRef.current);
        if (secondFrameRef.current !== null) cancelAnimationFrame(secondFrameRef.current);
    }, []);

    return (
        <Checkbox
            aria-label="Chọn tất cả lịch học"
            aria-busy={busy}
            checked={visualChecked}
            indeterminate={!visualChecked && indeterminate}
            title={busy ? "Đang chọn tất cả lịch học..." : undefined}
            disabled={disabled}
            onChange={(event) => {
                const nextChecked = event.target.checked;
                setVisualChecked(nextChecked);
                if (firstFrameRef.current !== null) cancelAnimationFrame(firstFrameRef.current);
                if (secondFrameRef.current !== null) cancelAnimationFrame(secondFrameRef.current);
                // Chờ browser vẽ dấu tick trước khi cập nhật selection của cả bảng.
                firstFrameRef.current = requestAnimationFrame(() => {
                    secondFrameRef.current = requestAnimationFrame(() => onChange(nextChecked));
                });
            }}
        />
    );
});
ImmediateSelectAllCheckbox.displayName = "ImmediateSelectAllCheckbox";

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
    classroom_assigned?: boolean;
    classroom_assigned_at?: string | null;
    [key: string]: any;
}

type BatchClassroomAssignmentItem = {
    calendarId: string;
    code: string;
    learnNumber?: number;
    lessonName?: string;
    startTime?: string;
    systemType?: string;
    status: "pending" | "running" | "success" | "skipped" | "error";
    movedCount?: number;
    message?: string;
};

interface ScheduleFilterValues {
    keyword?: string;
    code?: string;
    teacher?: string[];
    system_type?: Array<"topclass" | "topuni">;
    time_status?: Array<"upcoming" | "ongoing" | "completed">;
    date_range?: [Dayjs, Dayjs];
    weekdays?: number[];
    from_learn_number?: number;
    to_learn_number?: number;
}

type ScheduleModalControllerRef = {
    openCreate: (initialData: ScheduleDataType | null) => void;
    openEdit: (initialData: ScheduleDataType) => void;
};

type ScheduleModalControllerProps = {
    moduleFields: ModuleField[];
    fieldPolicy: any;
    programCode?: string;
    onSuccess: (values: any) => void;
    onDraftChange: (draft: {
        date?: Dayjs;
        start_time?: Dayjs;
        end_time?: Dayjs;
        lesson_name?: string;
        teacher?: string;
    }) => void;
    onCloseCleanup: () => void;
};

const ScheduleModalController = React.forwardRef<ScheduleModalControllerRef, ScheduleModalControllerProps>(({
    moduleFields,
    fieldPolicy,
    programCode,
    onSuccess,
    onDraftChange,
    onCloseCleanup,
}, ref) => {
    const [modalState, setModalState] = useState<{
        open: boolean;
        isEdit: boolean;
        initialData: ScheduleDataType | null;
    }>({ open: false, isEdit: false, initialData: null });

    React.useImperativeHandle(ref, () => ({
        openCreate: (initialData) => setModalState({ open: true, isEdit: false, initialData }),
        openEdit: (initialData) => setModalState({ open: true, isEdit: true, initialData }),
    }), []);

    return (
        <ScheduleModal
            open={modalState.open}
            onClose={() => {
                setModalState((current) => ({ ...current, open: false }));
                onCloseCleanup();
            }}
            onSuccess={onSuccess}
            onDraftChange={onDraftChange}
            isEdit={modalState.isEdit}
            initialData={modalState.initialData}
            moduleFields={moduleFields}
            fieldPolicy={fieldPolicy}
            moduleCode={SCHEDULE_MODULE_CODE}
            programCode={modalState.isEdit ? undefined : programCode}
        />
    );
});

ScheduleModalController.displayName = "ScheduleModalController";

const WEEKDAY_OPTIONS = [
    { value: 1, label: "Thứ 2" },
    { value: 2, label: "Thứ 3" },
    { value: 3, label: "Thứ 4" },
    { value: 4, label: "Thứ 5" },
    { value: 5, label: "Thứ 6" },
    { value: 6, label: "Thứ 7" },
    { value: 7, label: "Chủ nhật" },
];

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
    classroom_assigned: item.classroom_assigned === true,
    classroom_assigned_at: item.classroom_assigned_at || null,
}));
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
    const { date_range, teacher, ...rest } = cleaned;

    return {
        ...rest,
        teacher: teacher?.join(","),
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
    const teachers = Array.isArray(cleaned.teacher) ? cleaned.teacher : [];
    if (program) params.set("program", program);
    if (keyword) params.set("q", keyword);
    if (teachers.length) params.set("teacher", teachers.join(","));
    if (cleaned.system_type?.length) params.set("system_type", cleaned.system_type.join(","));
    if (cleaned.time_status?.length) params.set("status", cleaned.time_status.join(","));
    if (cleaned.weekdays?.length) params.set("weekdays", cleaned.weekdays.join(","));
    if (cleaned.from_learn_number !== undefined) params.set("from_learn_number", String(cleaned.from_learn_number));
    if (cleaned.to_learn_number !== undefined) params.set("to_learn_number", String(cleaned.to_learn_number));
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

// Checkbox còn phục vụ thao tác gửi lại HMO, vì vậy cho chọn cả buổi đang
// diễn ra. Buổi đã kết thúc và buổi đã đánh dấu nghỉ vẫn không được chọn.
const canSelectScheduleForSync = (record: ScheduleDataType) => {
    if (Number(record.lesson_status) === 1) return false;
    if (!record.end_time) return canModifySchedule(record);
    const endTime = dayjs(record.end_time);
    return endTime.isValid() && !endTime.isBefore(dayjs());
};

const ScheduleDetailRow = ({ record }: { record: ScheduleDataType }) => {
    const isCancelled = Number(record.lesson_status) === 1;
    const status = isCancelled ? "Nghỉ học" : lessonStatusText(record.start_time, record.end_time);
    const statusColor = isCancelled ? "error" : status === "Đã kết thúc" ? "success" : status === "Đang diễn ra" ? "warning" : "processing";
    const date = record.start_time ? dayjs(record.start_time).format("DD/MM/YYYY") : "-";
    const time = record.start_time && record.end_time
        ? `${dayjs(record.start_time).format("HH:mm")} – ${dayjs(record.end_time).format("HH:mm")}`
        : "Chưa có thời gian";
    const DetailItem = ({ label, children }: { label: string; children: React.ReactNode }) => (
        <div style={{ minWidth: 0 }}>
            <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 3 }}>
                {label}
            </Typography.Text>
            <div style={{ overflowWrap: "anywhere", lineHeight: 1.5 }}>{children || "-"}</div>
        </div>
    );

    return (
        <div style={{ padding: "4px 8px 8px" }}>
            <div style={{ padding: "4px 0 18px", borderBottom: "1px solid #f0f0f0", marginBottom: 18 }}>
                <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    <Typography.Text type="secondary">Bài {record.learn_number ?? "-"}</Typography.Text>
                    <Typography.Title level={4} style={{ margin: 0, lineHeight: 1.4 }}>
                        {record.lesson_name || "Chưa có tên bài học"}
                    </Typography.Title>
                    <Space size={[8, 8]} wrap>
                        <Tag color="blue">{date} · {time}</Tag>
                        <Tag color={statusColor}>{status}</Tag>
                        {!isCancelled && record.classroom_assigned && <Tag color="green">Đã chia lớp</Tag>}
                    </Space>
                </Space>
            </div>

            <Row gutter={[32, 18]}>
                <Col xs={24} sm={12}><DetailItem label="Chương trình"><Tag color="blue">{record.code || "-"}</Tag></DetailItem></Col>
                <Col xs={24} sm={12}><DetailItem label="Hệ thống">{record.system_type || "-"}</DetailItem></Col>
                <Col xs={24} sm={12}><DetailItem label="Lớp học">{record.class_name || "-"}</DetailItem></Col>
                <Col xs={24} sm={12}><DetailItem label="Môn học">{record.subject || "-"}</DetailItem></Col>
                <Col xs={24} sm={12}><DetailItem label="Giáo viên">{record.teacher || "-"}</DetailItem></Col>
                <Col xs={24} sm={12}><DetailItem label="Trợ giảng">{record.assistant_teacher || "-"}</DetailItem></Col>
                <Col xs={24} sm={12}><DetailItem label="Phòng/Kênh học">{record.room || "-"}</DetailItem></Col>
                {!isCancelled && (
                    <Col xs={24} sm={12}><DetailItem label="Trạng thái phân lớp">
                        {record.classroom_assigned ? (
                            <Space size={6} wrap>
                                <Tag color="green">Đã chia lớp</Tag>
                                {record.classroom_assigned_at && (
                                    <Typography.Text type="secondary">
                                        {dayjs(record.classroom_assigned_at).format("DD/MM/YYYY HH:mm")}
                                    </Typography.Text>
                                )}
                            </Space>
                        ) : <Tag>Chưa chia lớp</Tag>}
                    </DetailItem></Col>
                )}
                <Col xs={24} sm={12}><DetailItem label="Link học">
                    {record.lesson_link ? <Typography.Link href={record.lesson_link} target="_blank" rel="noreferrer">Mở liên kết buổi học</Typography.Link> : "-"}
                </DetailItem></Col>
                {isCancelled && <Col span={24}><DetailItem label="Lý do nghỉ">{record.cancel_reason || "Chưa có lý do"}</DetailItem></Col>}
            </Row>
        </div>
    );
};

// ✅ Hook debounce
function useDebounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const fnRef = useRef(fn);
    fnRef.current = fn;

    useEffect(() => {
        const cancel = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = null;
        };
        window.addEventListener("lms:route-navigation-start", cancel);
        return () => {
            window.removeEventListener("lms:route-navigation-start", cancel);
            cancel();
        };
    }, []);

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
        filterForm.resetFields();
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
                            mode="multiple"
                            maxTagCount="responsive"
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
                    <Form.Item name="weekdays" label="Thứ trong tuần">
                        <Select
                            mode="multiple"
                            maxTagCount="responsive"
                            allowClear
                            placeholder="Tất cả các thứ"
                            options={WEEKDAY_OPTIONS}
                        />
                    </Form.Item>
                    <Form.Item label="Khoảng bài">
                        <Space.Compact block>
                            <Form.Item name="from_learn_number" noStyle>
                                <InputNumber min={1} precision={0} placeholder="Từ bài" style={{ width: "50%" }} />
                            </Form.Item>
                            <Form.Item name="to_learn_number" noStyle>
                                <InputNumber min={1} precision={0} placeholder="Đến bài" style={{ width: "50%" }} />
                            </Form.Item>
                        </Space.Compact>
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

const ScheduleInlineFilters = ({
    value,
    loading,
    onSearch,
    onReset,
    programOptions,
    loadingPrograms,
    allowFilterWithoutProgram,
}: {
    value: ScheduleFilterValues;
    loading: boolean;
    onSearch: (values: ScheduleFilterValues) => void;
    onReset: () => void;
    programOptions: Array<{ value: string; label: string }>;
    loadingPrograms: boolean;
    allowFilterWithoutProgram: boolean;
}) => {
    const [filterForm] = Form.useForm();

    useEffect(() => {
        filterForm.resetFields();
        filterForm.setFieldsValue(value);
    }, [filterForm, value]);

    return (
        <div
            className="schedule-inline-filters"
            style={{
                marginBottom: 14,
                padding: "12px 16px 4px",
                border: "1px solid #e8e8e8",
                borderRadius: 8,
                background: "#fafafa",
            }}
        >
            <Form
                form={filterForm}
                layout="vertical"
                onFinish={(values) => onSearch(cleanFilterValues(values))}
            >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "0 12px" }}>
                    <Form.Item
                        name="code"
                        label="Chương trình"
                        style={{ flex: "1 1 250px", minWidth: 220, marginBottom: 10 }}
                        rules={allowFilterWithoutProgram ? [] : [{ required: true, message: "Chọn Chương trình" }]}
                    >
                        <Select
                            allowClear={allowFilterWithoutProgram}
                            showSearch
                            loading={loadingPrograms}
                            options={programOptions}
                            optionFilterProp="label"
                            placeholder={allowFilterWithoutProgram ? "Tất cả Chương trình" : "Chọn Chương trình"}
                            notFoundContent={loadingPrograms ? "Đang tải..." : "Không có Chương trình"}
                        />
                    </Form.Item>
                    <Form.Item name="teacher" label="Giáo viên" style={{ flex: "1 1 210px", minWidth: 190, marginBottom: 10 }}>
                        <TeachingStaffSelect
                            teacherType={1}
                            mode="multiple"
                            maxTagCount="responsive"
                            allowQuickCreate={false}
                            allowClear
                            showSearch
                            placeholder="Tất cả giáo viên"
                        />
                    </Form.Item>
                    <Form.Item
                        name="date_range"
                        label="Khoảng ngày"
                        style={{ flex: "1 1 235px", minWidth: 220, marginBottom: 10 }}
                        normalize={(range) => {
                            const [from, to] = Array.isArray(range) ? range : [];
                            return dayjs.isDayjs(from) && from.isValid() && dayjs.isDayjs(to) && to.isValid()
                                ? [from, to]
                                : undefined;
                        }}
                    >
                        <RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                    </Form.Item>
                    <Form.Item name="weekdays" label="Thứ" style={{ flex: "1 1 190px", minWidth: 180, marginBottom: 10 }}>
                        <Select
                            mode="multiple"
                            maxTagCount="responsive"
                            allowClear
                            placeholder="Tất cả các thứ"
                            options={WEEKDAY_OPTIONS}
                        />
                    </Form.Item>
                    <Form.Item label="Khoảng bài" style={{ flex: "1 1 190px", minWidth: 180, marginBottom: 10 }}>
                        <Space.Compact block>
                            <Form.Item name="from_learn_number" noStyle>
                                <InputNumber min={1} precision={0} placeholder="Từ bài" style={{ width: "50%" }} />
                            </Form.Item>
                            <Form.Item name="to_learn_number" noStyle>
                                <InputNumber min={1} precision={0} placeholder="Đến bài" style={{ width: "50%" }} />
                            </Form.Item>
                        </Space.Compact>
                    </Form.Item>
                    <Form.Item name="time_status" label="Trạng thái" style={{ flex: "1 1 175px", minWidth: 165, marginBottom: 10 }}>
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
                    <Form.Item name="system_type" label="Hệ thống" style={{ flex: "1 1 145px", minWidth: 140, marginBottom: 10 }}>
                        <Select
                            mode="multiple"
                            maxTagCount="responsive"
                            allowClear
                            placeholder="Tất cả"
                            options={[
                                { value: "topclass", label: "Topclass" },
                                { value: "topuni", label: "Topuni" },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item label=" " colon={false} style={{ flex: "0 0 auto", marginBottom: 10 }}>
                        <Space>
                            <Button onClick={() => {
                                filterForm.resetFields();
                                onReset();
                            }}>
                                Xóa lọc
                            </Button>
                            <Button type="primary" htmlType="submit" icon={<FilterOutlined />} loading={loading}>
                                Lọc
                            </Button>
                        </Space>
                    </Form.Item>
                </div>
            </Form>
            <style>{`
                .schedule-inline-filters .ant-form-item-explain,
                .schedule-inline-filters .ant-form-item-extra {
                    min-height: 22px;
                }
                .schedule-inline-filters .ant-form-item-explain:empty,
                .schedule-inline-filters .ant-form-item-extra:empty {
                    min-height: 0;
                }
            `}</style>
        </div>
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
    const scheduleModalRef = useRef<ScheduleModalControllerRef>(null);
    const [openImportModal, setOpenImportModal] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importErrors, setImportErrors] = useState<ScheduleImportError[]>([]);
    const [importMode, setImportMode] = useState<"create" | "update">("create");
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [allRowsSelected, setAllRowsSelected] = useState(false);
    const [selectingAllRows, setSelectingAllRows] = useState(false);
    const selectAllRequestRef = useRef(0);
    const selectedRowsCacheRef = useRef(new Map<string, ScheduleDataType>());
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
    // Bản nháp được vẽ trực tiếp trên lịch khi người dùng kéo/click để tạo lịch.
    // Nó chỉ tồn tại trong lúc modal tạo mới đang mở, không phải dữ liệu đã lưu.
    const [calendarDraftPreview, setCalendarDraftPreview] = useState<ScheduleDataType | null>(null);
    const [copySource, setCopySource] = useState<ScheduleDataType | null>(null);
    // Khởi tạo thu gọn để không chớp phần hướng dẫn trước khi đọc thiết lập
    // localStorage. Nếu người dùng chọn hiển thị, effect bên dưới sẽ mở ra.
    const [showPageInfo, setShowPageInfo] = useState(false);
    const [pageInfoReady, setPageInfoReady] = useState(false);
    const [syncingTeachingUsers, setSyncingTeachingUsers] = useState(false);
    const [resendingToHocmai, setResendingToHocmai] = useState(false);
    const [refreshingScheduleList, setRefreshingScheduleList] = useState(false);
    const [classroomAssignmentCalendarId, setClassroomAssignmentCalendarId] = useState<string | number | null>(null);
    const [classroomAssignmentSystemType, setClassroomAssignmentSystemType] = useState<"topclass" | "topuni" | null>(null);
    const [batchClassroomAssignmentOpen, setBatchClassroomAssignmentOpen] = useState(false);
    const [batchClassroomAssigning, setBatchClassroomAssigning] = useState(false);
    const [batchClassroomItems, setBatchClassroomItems] = useState<BatchClassroomAssignmentItem[]>([]);

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
    const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; created: number; updated: number; failed: number; errors: Array<{ calendar_id: number; message: string }> } | null>(null);

    const replaceScheduleUrl = useCallback((values: ScheduleFilterValues, targetPage = 1) => {
        const program = String(values.code || "").trim();
        const nextUrl = buildScheduleUrl(values, targetPage);
        pendingScheduleUrlRef.current = nextUrl;
        rememberProgramContextUrl(nextUrl);
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
            searchParams.get("q") || searchParams.get("teacher") || searchParams.get("system_type")
            || searchParams.get("status") || searchParams.get("weekdays")
            || searchParams.get("from_learn_number") || searchParams.get("to_learn_number")
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
            teacher: String(searchParams.get("teacher") || "")
                .split(",")
                .map((teacher) => teacher.trim())
                .filter(Boolean),
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
            weekdays: String(searchParams.get("weekdays") || "")
                .split(",")
                .map(Number)
                .filter((weekday) => Number.isInteger(weekday) && weekday >= 1 && weekday <= 7),
            from_learn_number: (() => {
                const parsed = Number(searchParams.get("from_learn_number"));
                return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
            })(),
            to_learn_number: (() => {
                const parsed = Number(searchParams.get("to_learn_number"));
                return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
            })(),
            date_range: from.isValid() && to.isValid() ? [from, to] : undefined,
        });
        if (values.from_learn_number !== undefined && values.to_learn_number !== undefined
            && values.from_learn_number > values.to_learn_number) {
            delete values.from_learn_number;
            delete values.to_learn_number;
        }
        setFilterValues(values);
        setSubmittedFilterValues(values);
        setSearchText(String(values.keyword || ""));
        const hydratedPage = Math.max(1, Number(searchParams.get("page")) || 1);
        setCurrentPage(hydratedPage);
        setHasSearched(true);
        const canonicalUrl = buildScheduleUrl(values, hydratedPage);
        if (canonicalUrl !== currentUrl) {
            pendingScheduleUrlRef.current = canonicalUrl;
            rememberProgramContextUrl(canonicalUrl);
            router.replace(canonicalUrl, { scroll: false });
        } else {
            rememberProgramContextUrl(currentUrl);
        }
    }, [searchParams, isAdmin, router]);

    const handleReschedule = (record: ScheduleDataType) => {
        if (!canModifySchedule(record)) {
            api.warning({
                message: "Không thể dời lịch",
                description: "Chỉ được dời những buổi học chưa diễn ra.",
            });
            return;
        }
        scheduleModalRef.current?.openEdit(record);
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
    const [tableColumnFilters, setTableColumnFilters] = useState<Record<string, React.Key[] | null>>({});
    const [hasSearched, setHasSearched] = useState(false);
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
        };
    }, [currentPage, pageSize, submittedFilterValues, hasSearched]);

    useEffect(() => {
        selectAllRequestRef.current += 1;
        setSelectedRowKeys([]);
        setAllRowsSelected(false);
        setSelectingAllRows(false);
        selectedRowsCacheRef.current.clear();
    }, [submittedFilterValues]);

    useEffect(() => {
        data.forEach((record) => {
            if (record.id !== undefined && record.id !== null) {
                selectedRowsCacheRef.current.set(String(record.id), record);
            }
        });
    }, [data]);

    const selectableRowKeys = useMemo(() => new Set(
        data.filter(canSelectScheduleForSync).map((record) => String(record.id))
    ), [data]);
    const selectedRowsAllModifiable = selectedRowKeys.length > 0 && selectedRowKeys.every((key) => {
        const record = selectedRowsCacheRef.current.get(String(key));
        return Boolean(record && canModifySchedule(record));
    });
    const handleRowSelectionChange = useCallback((newSelectedRowKeys: React.Key[], info?: { type?: string }) => {
        if (info?.type === "all") return;
        selectAllRequestRef.current += 1;
        setSelectingAllRows(false);
        setAllRowsSelected(false);
        setSelectedRowKeys(newSelectedRowKeys);
    }, []);
    const handleSelectAll = useCallback(async (selected: boolean) => {
        const requestId = ++selectAllRequestRef.current;
        if (!selected) {
            setSelectedRowKeys([]);
            setAllRowsSelected(false);
            setSelectingAllRows(false);
            return;
        }
        // Phản hồi checkbox ngay trước khi bắt đầu tải các trang còn lại.
        // Nếu chờ fetch hoàn tất mới set, người dùng có cảm giác click không ăn.
        setAllRowsSelected(true);
        setSelectingAllRows(true);
        const selectableKeysOnPage = data
            .filter(canSelectScheduleForSync)
            .map((record) => String(record.id));
        const nextVisibleSelection = (current: React.Key[]) => Array.from(new Set([
            ...current,
            ...selectableKeysOnPage,
        ]));
        setSelectedRowKeys(nextVisibleSelection);

        // Page hiện tại đã chứa toàn bộ kết quả, không gọi lại chính API đó.
        if (totalItems <= data.length) {
            setAllRowsSelected(selectableKeysOnPage.length > 0);
            setSelectingAllRows(false);
            return;
        }

        try {
            await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
            if (requestId !== selectAllRequestRef.current) return;
            const rows = await fetchAllPages<any>({
                total: totalItems,
                pageSize: 300,
                fetchPage: async (page, limit) => {
                    const response: any = await getLivestreams({
                        ...scheduleParams,
                        page,
                        limit,
                    });
                    return Array.isArray(response?.data?.data) ? response.data.data : [];
                },
            });
            if (requestId !== selectAllRequestRef.current) return;
            const selectableRows = mapScheduleRows(rows).filter(canSelectScheduleForSync);
            selectableRows.forEach((record) => {
                selectedRowsCacheRef.current.set(String(record.id), record);
            });
            setSelectedRowKeys(selectableRows.map((record) => String(record.id)));
            setAllRowsSelected(selectableRows.length > 0);
        } catch (error: any) {
            if (requestId !== selectAllRequestRef.current) return;
            setSelectedRowKeys([]);
            setAllRowsSelected(false);
            api.error({
                message: "Không thể chọn tất cả lịch học",
                description: error?.message || "Không thể tải toàn bộ danh sách lịch học.",
            });
        } finally {
            if (requestId === selectAllRequestRef.current) setSelectingAllRows(false);
        }
    }, [api, data, scheduleParams, totalItems]);
    const rowSelection = useMemo(() => ({
        selectedRowKeys,
        preserveSelectedRowKeys: true,
        onChange: (keys: React.Key[], _rows: ScheduleDataType[], info: { type?: string }) => (
            handleRowSelectionChange(keys, info)
        ),
        onSelectAll: (selected: boolean) => handleSelectAll(selected),
        columnTitle: () => (
            <ImmediateSelectAllCheckbox
                checked={allRowsSelected}
                indeterminate={!allRowsSelected && selectedRowKeys.length > 0}
                busy={selectingAllRows}
                disabled={totalItems <= 0 || (totalItems <= data.length && selectableRowKeys.size === 0)}
                onChange={(checked) => void handleSelectAll(checked)}
            />
        ),
        // Checkbox nằm trong row có expandRowByClick. Chặn bubble ngay tại ô
        // chọn để click lệch trong vùng checkbox không vô tình mở chi tiết.
        onCell: () => ({
            onClick: (event: React.MouseEvent) => event.stopPropagation(),
            onMouseDown: (event: React.MouseEvent) => event.stopPropagation(),
        }),
        getCheckboxProps: (record: ScheduleDataType) => {
            const canSelect = selectableRowKeys.has(String(record.id));
            return {
                disabled: !canSelect,
                title: canSelect
                    ? undefined
                    : "Buổi học đã kết thúc hoặc đã nghỉ, không thể chọn",
            };
        },
        columnWidth: 32,
    }), [allRowsSelected, data.length, handleRowSelectionChange, handleSelectAll, selectableRowKeys, selectedRowKeys, selectingAllRows, totalItems]);

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
    const assistantOptions = useMemo(() => assistantsQuery.data ?? [], [assistantsQuery.data]);
    const assistantLabelByUsername = useMemo(() => new Map(
        assistantOptions.map((option) => [String(option.value), String(option.label)])
    ), [assistantOptions]);
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
            const isDraft = item.key === "calendar-create-draft";
            const styleType = isDraft
                ? "draft"
                : Number(item.lesson_status) === 1
                ? "cancelled"
                : now.isAfter(end)
                    ? "completed"
                    : now.isAfter(start) && now.isBefore(end)
                        ? "ongoing"
                        : "upcoming";
            return {
                // FullCalendar giữ event theo id. Gắn nội dung bản nháp vào id
                // để khi người dùng chọn bài/giáo viên, event preview được render
                // mới ngay thay vì giữ title của lần kéo ban đầu.
                id: isDraft
                    ? `${item.key}-${item.start_time}-${item.end_time}-${item.lesson_name || ""}-${item.teacher || ""}`
                    : String(item.key),
                title: item.lesson_name || (isDraft ? "Lịch mới" : `Bài ${item.learn_number}`),
                start: start.toDate(),
                end: end.toDate(),
                extendedProps: { record: item, styleType, isDraft },
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
        const isDraft = Boolean(eventInfo.event.extendedProps.isDraft);
        const record = eventInfo.event.extendedProps.record as ScheduleDataType;
        const visual = styleType === "draft"
            ? { background: "#e6f4ff", color: "#0958d9", border: "3px solid #1677ff" }
            : styleType === "cancelled"
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
                {styleType !== "cancelled" && record.classroom_assigned && (
                    <div style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>ĐÃ CHIA LỚP</div>
                )}
                <div style={{ fontSize: 12, whiteSpace: "normal", lineHeight: 1.3, marginTop: 2, fontWeight: 500 }}>
                    {eventInfo.event.title}
                </div>
                {isDraft && record.teacher && (
                    <div style={{ fontSize: 11, whiteSpace: "normal", lineHeight: 1.25, marginTop: 2, opacity: 0.85 }}>
                        {record.teacher}
                    </div>
                )}
            </div>
        );
    }, []);

    const handleCalendarEventClick = useCallback((info: any) => {
        if (info.event.extendedProps.isDraft) return;
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
        if (values.from_learn_number !== undefined && values.to_learn_number !== undefined
            && Number(values.from_learn_number) > Number(values.to_learn_number)) {
            api.warning({
                message: "Khoảng bài không hợp lệ",
                description: "Bài bắt đầu phải nhỏ hơn hoặc bằng bài kết thúc.",
            });
            return;
        }
        const cleaned = cleanFilterValues({ ...values, keyword: searchText });
        setFilterValues(cleaned);
        setSubmittedFilterValues(cleaned);
        setTableColumnFilters({});
        setHasSearched(true);
        setCurrentPage(1);
        replaceScheduleUrl(cleaned);
        setOpenFilterDrawer(false);
    };

    const handleResetScheduleFilter = () => {
        filterRevisionRef.current += 1;
        const retainedProgram = isAdmin
            ? ""
            : String(
                filterValues.code
                || submittedFilterValues.code
                || useAuthStore.getState().currentProgram
                || ""
            ).trim();
        const cleaned = cleanFilterValues({ code: retainedProgram || undefined, keyword: "" });
        setSearchText("");
        setFilterValues(cleaned);
        setSubmittedFilterValues(cleaned);
        setTableColumnFilters({});
        setHasSearched(Boolean(retainedProgram));
        setCurrentPage(1);
        replaceScheduleUrl(cleaned);
        setOpenFilterDrawer(false);
    };

    const openCreateScheduleModal = (calendarDraft?: {
        date: Dayjs;
        start_time: Dayjs;
        end_time: Dayjs;
    }) => {
        if (!canCreateSchedule) {
            api.warning({
                message: "Không có quyền",
                description: "Vai trò hiện tại không có quyền thêm lịch học.",
            });
            return false;
        }

        if (!canEditAnyField(moduleFields, fieldPolicy, SCHEDULE_MODULE_CODE)) {
            api.warning({
                message: "Không có quyền",
                description: "Vai trò hiện tại không có quyền chỉnh sửa/thêm dữ liệu.",
            });
            return false;
        }
        if (!submittedFilterValues.code) {
            api.warning({
                message: "Vui lòng chọn Chương trình",
                description: "Chọn Chương trình trong bộ lọc trước khi thêm lịch học.",
            });
            setOpenFilterDrawer(true);
            return false;
        }
        const draft = calendarDraft ? {
            key: "calendar-create-draft",
            date: calendarDraft.date.format("YYYY-MM-DD"),
            start_time: calendarDraft.start_time.format("YYYY-MM-DDTHH:mm:ss"),
            end_time: calendarDraft.end_time.format("YYYY-MM-DDTHH:mm:ss"),
            lesson_name: "Lịch mới",
        } : null;
        setCalendarDraftPreview(draft);
        scheduleModalRef.current?.openCreate(draft);
        return true;
    };

    const handleCalendarDraftChange = useCallback((draft: {
        date?: Dayjs;
        start_time?: Dayjs;
        end_time?: Dayjs;
        lesson_name?: string;
        teacher?: string;
    }) => {
        setCalendarDraftPreview((previous) => {
            if (!previous) return previous;
            return {
                ...previous,
                ...(draft.date ? { date: draft.date.format("YYYY-MM-DD") } : {}),
                ...(draft.start_time ? { start_time: draft.start_time.format("YYYY-MM-DDTHH:mm:ss") } : {}),
                ...(draft.end_time ? { end_time: draft.end_time.format("YYYY-MM-DDTHH:mm:ss") } : {}),
                lesson_name: String(draft.lesson_name || "Lịch mới").trim() || "Lịch mới",
                teacher: String(draft.teacher || "").trim(),
            };
        });
    }, []);

    const handleAddBtn = () => {
        openCreateScheduleModal();
    };

    const handleCalendarDateClick = (info: any) => {
        const clicked = dayjs(info.date);
        if (clicked.isBefore(dayjs().startOf("day"))) {
            api.warning({ message: "Không thể tạo lịch học trong ngày đã qua" });
            return;
        }

        const start = info.allDay
            ? clicked.startOf("day").hour(19)
            : clicked.startOf("minute");
        const proposedEnd = start.add(90, "minute");
        const end = proposedEnd.isSame(start, "day")
            ? proposedEnd
            : start.endOf("day").second(0).millisecond(0);
        const opened = openCreateScheduleModal({
            date: start.startOf("day"),
            start_time: start,
            end_time: end,
        });
        if (!opened) info.view?.calendar?.unselect();
    };

    const handleCalendarSelect = (info: any) => {
        const start = dayjs(info.start).startOf("minute");
        const end = dayjs(info.end).startOf("minute");

        if (info.allDay || !start.isSame(end, "day")) {
            info.view?.calendar?.unselect();
            api.warning({
                message: "Vui lòng kéo chọn khung giờ trong cùng một ngày",
            });
            return;
        }
        if (start.isBefore(dayjs().startOf("day"))) {
            info.view?.calendar?.unselect();
            api.warning({ message: "Không thể tạo lịch học trong ngày đã qua" });
            return;
        }
        const opened = openCreateScheduleModal({
            date: start.startOf("day"),
            start_time: start,
            end_time: end,
        });
        if (!opened) info.view?.calendar?.unselect();
    };

    // ... (giữ nguyên các hàm xử lý danh sách, import, cập nhật, chỉnh sửa và xóa lịch)

    const handleExportSchedule = async (
        format: "csv" | "xlsx",
        purpose?: "update" | "all-programs"
    ) => {
        try {
            const selectedIds = purpose === "all-programs" ? undefined : selectedRowKeys.length
                ? selectedRowKeys.map(String)
                : undefined;
            const programCode = purpose === "all-programs"
                ? undefined
                : String(submittedFilterValues.code || "").trim() || undefined;
            if (purpose === "update" && !selectedIds?.length && !programCode) {
                api.warning({
                    message: "Vui lòng chọn Chương trình",
                    description: "Hãy lọc một chương trình hoặc chọn các lịch cần xuất trước khi tạo file bổ sung trợ giảng.",
                });
                return;
            }
            const blob = await exportLivestreams(format, selectedIds, { purpose, programCode });
            downloadBlob(
                blob,
                purpose === "all-programs"
                    ? "calendar-all-programs.xlsx"
                    : purpose === "update"
                    ? `calendar-update-assistants-${programCode || (selectedIds?.length ? "selected" : "all")}.xlsx`
                    : `calendar-${selectedIds?.length ? "selected" : programCode || "all"}.${format}`
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
            content: `Hệ thống sẽ quét ${targetIds.length} lịch đã chọn, thêm user nhân sự còn thiếu và bổ sung student_hmid hoặc sửa tên vai trò cho user hiện có khi cần. Lịch học không bị thay đổi.`,
            okText: "Bắt đầu quét",
            cancelText: "Hủy",
            onOk: async () => {
                setSyncingTeachingUsers(true);
                setSyncProgress({ current: 0, total: targetIds.length, created: 0, updated: 0, failed: 0, errors: [] });
                setIsSyncModalOpen(true);
                try {
                    let totalCreated = 0;
                    let totalUpdated = 0;
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
                        totalUpdated += Number(result.updated ?? 0);
                        totalFailed += Number(result.failed ?? 0);
                        if (Array.isArray(result.errors)) {
                            allErrors.push(...result.errors);
                        }

                        setSyncProgress({
                            current: Math.min(i + chunkSize, targetIds.length),
                            total: targetIds.length,
                            created: totalCreated,
                            updated: totalUpdated,
                            failed: totalFailed,
                            errors: allErrors
                        });
                    }
                    api.success({
                        message: "Đã quét user nhân sự",
                        description: `Đã quét ${totalScanned} lịch, tạo ${totalCreated} user mới và cập nhật ${totalUpdated} user${totalFailed ? `; ${totalFailed} lịch chưa xử lý được` : ''}.`,
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

    const handleResendToHocmai = () => {
        const targetIds = Array.from(new Set(
            selectedRowKeys.map(Number).filter((id) => Number.isInteger(id) && id > 0)
        ));
        if (!targetIds.length) {
            api.warning({
                message: "Chưa chọn lịch",
                description: "Vui lòng chọn ít nhất 1 lịch để gửi lại dữ liệu tới HMO.",
            });
            return;
        }

        Modal.confirm({
            title: `Gửi lại ${targetIds.length} lịch tới HMO?`,
            content: "Hệ thống sẽ tạo yêu cầu cập nhật từ thông tin hiện tại của các lịch đã chọn. Dữ liệu trong bảng lịch học không bị thay đổi.",
            okText: "Gửi lại HMO",
            cancelText: "Hủy",
            onOk: async () => {
                setResendingToHocmai(true);
                try {
                    let queued = 0;
                    let skipped = 0;
                    let missing = 0;
                    for (let index = 0; index < targetIds.length; index += 500) {
                        const response: any = await resendLivestreamsToHocmai(
                            targetIds.slice(index, index + 500)
                        );
                        const result = response?.data ?? response ?? {};
                        queued += Number(result.queued || 0);
                        skipped += Number(result.skipped || 0);
                        missing += Number(result.missing || 0);
                    }
                    if (queued) {
                        api.success({
                            message: `Đã đưa ${queued} lịch vào hàng đợi HMO`,
                            description: skipped || missing
                                ? `${skipped} lịch bị bỏ qua do chưa có Key hoặc Package/Lesson ID${missing ? `; ${missing} lịch không còn tồn tại` : ""}.`
                                : "HMO sẽ xử lý các yêu cầu cập nhật theo hàng đợi.",
                            duration: 6,
                        });
                    } else {
                        api.warning({
                            message: "Không có lịch nào được đưa vào hàng đợi",
                            description: `${skipped} lịch chưa có Key hoặc Package/Lesson ID${missing ? `; ${missing} lịch không còn tồn tại` : ""}.`,
                            duration: 6,
                        });
                    }
                } catch (error: any) {
                    api.error({
                        message: "Gửi lại HMO thất bại",
                        description: error?.message || "Không thể tạo hàng đợi đồng bộ HMO.",
                    });
                    throw error;
                } finally {
                    setResendingToHocmai(false);
                }
            },
        });
    };

    const handleOpenClassroomAssignment = () => {
        if (selectedRowKeys.length !== 1) {
            api.warning({
                message: selectedRowKeys.length ? "Đang chọn nhiều lịch" : "Chưa chọn lịch",
                description: "Vui lòng chọn đúng 1 lịch học để xem trước và chia lớp học sinh.",
            });
            return;
        }
        const selectedKey = String(selectedRowKeys[0]);
        const selectedSchedule = selectedRowsCacheRef.current.get(selectedKey)
            || data.find((record) => String(record.id) === selectedKey);
        if (!selectedSchedule || !canModifySchedule(selectedSchedule)) {
            api.warning({
                message: "Không thể chia lớp",
                description: "Lịch đang diễn ra chỉ có thể dùng thao tác Gửi lại HMO.",
            });
            return;
        }
        setClassroomAssignmentSystemType(
            selectedSchedule?.system_type === "topuni"
                ? "topuni"
                : selectedSchedule?.system_type === "topclass" ? "topclass" : null
        );
        setClassroomAssignmentCalendarId(selectedKey);
    };

    const runBatchClassroomAssignment = async (items: BatchClassroomAssignmentItem[]) => {
        setBatchClassroomItems(items);
        setBatchClassroomAssignmentOpen(true);
        setBatchClassroomAssigning(true);
        let successCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        for (const item of items) {
            setBatchClassroomItems((current) => current.map((row) => (
                row.calendarId === item.calendarId
                    ? { ...row, status: "running", message: "Đang tính toán và chia lớp..." }
                    : row
            )));
            try {
                // Endpoint apply tự dựng lại phương án ngay trong transaction,
                // vì vậy thuật toán giống hệt thao tác xác nhận ở modal đơn lẻ.
                const response: any = await applyStudentClassroomAssignment(item.calendarId);
                const result = response?.data ?? response;
                const totalStudents = Number(result?.total_students || 0);
                const movedCount = Number(result?.moved_count || 0);
                if (totalStudents === 0) {
                    skippedCount += 1;
                    setBatchClassroomItems((current) => current.map((row) => (
                        row.calendarId === item.calendarId
                            ? {
                                ...row,
                                status: "skipped",
                                movedCount: 0,
                                message: "Chưa có danh sách học sinh nên chưa thể chia lớp.",
                            }
                            : row
                    )));
                    continue;
                }
                successCount += 1;
                setBatchClassroomItems((current) => current.map((row) => (
                    row.calendarId === item.calendarId
                        ? {
                            ...row,
                            status: "success",
                            movedCount,
                            message: movedCount
                                ? `Đã cập nhật phân lớp cho ${movedCount.toLocaleString("vi-VN")} học sinh.`
                                : "Phân lớp hiện tại đã phù hợp, không cần thay đổi.",
                        }
                        : row
                )));
            } catch (requestError: any) {
                failedCount += 1;
                setBatchClassroomItems((current) => current.map((row) => (
                    row.calendarId === item.calendarId
                        ? {
                            ...row,
                            status: "error",
                            message: requestError?.message || "Không thể chia lớp cho lịch này.",
                        }
                        : row
                )));
            }
        }

        setBatchClassroomAssigning(false);
        try {
            await refreshSchedules();
        } catch {
            // Kết quả từng lịch vẫn được giữ trong modal nếu tải lại bảng lỗi.
        }
        api[failedCount || skippedCount ? "warning" : "success"]({
            message: "Đã hoàn tất tự động chia lớp",
            description: `Thành công ${successCount}/${items.length} lịch${skippedCount ? `, bỏ qua ${skippedCount} lịch chưa có học sinh` : ""}${failedCount ? `, lỗi ${failedCount} lịch` : ""}.`,
            duration: 6,
        });
    };

    const handleOpenBatchClassroomAssignment = () => {
        if (!selectedRowKeys.length) {
            api.warning({
                message: "Chưa chọn lịch",
                description: "Hãy tick các lịch cần tự động chia lớp trước khi thực hiện.",
            });
            return;
        }
        if (!selectedRowsAllModifiable) {
            api.warning({
                message: "Có lịch đã bắt đầu",
                description: "Lịch đang diễn ra chỉ có thể dùng thao tác Gửi lại HMO. Hãy bỏ chọn lịch đó trước khi chia lớp.",
            });
            return;
        }
        const items = selectedRowKeys.map((key) => {
            const calendarId = String(key);
            const row = selectedRowsCacheRef.current.get(calendarId);
            return {
                calendarId,
                code: String(row?.code || ""),
                learnNumber: row?.learn_number,
                lessonName: row?.lesson_name,
                startTime: row?.start_time,
                systemType: row?.system_type,
                status: "pending" as const,
            };
        }).sort((left, right) => {
            const leftTime = dayjs(left.startTime).valueOf();
            const rightTime = dayjs(right.startTime).valueOf();
            if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
                return leftTime - rightTime;
            }
            return left.calendarId.localeCompare(right.calendarId, "vi", { numeric: true });
        });

        Modal.confirm({
            title: `Tự động chia lớp cho ${items.length} lịch?`,
            icon: <ApartmentOutlined />,
            content: (
                <Space direction="vertical" size={8}>
                    <Typography.Text>
                        Hệ thống sẽ chia lần lượt theo thời gian: hoàn tất lịch trước rồi mới chuyển sang lịch tiếp theo.
                    </Typography.Text>
                    <Typography.Text type="secondary">
                        Thuật toán chia lớp hiện tại được giữ nguyên. Lịch TopUni dùng giới hạn mặc định 500 học sinh/phòng; lịch lỗi không làm dừng các lịch còn lại.
                    </Typography.Text>
                </Space>
            ),
            okText: "Bắt đầu chia lớp",
            cancelText: "Hủy",
            onOk: () => {
                void runBatchClassroomAssignment(items);
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

    const handleImportSchedule = async (
        file: File | undefined,
        sheetUrl?: string,
        existingDataMode: "skip" | "overwrite" = "skip"
    ) => {
        const programCode = String(submittedFilterValues.code || "").trim();
        if (!programCode) {
            api.warning({
                message: "Chưa chọn Chương trình",
                description: "Hãy lọc đúng một Chương trình trước khi import hoặc cập nhật lịch học.",
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
                ? await updateLivestreamsFile(
                    file,
                    programCode || undefined,
                    sheetUrl,
                    existingDataMode
                )
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

    const fieldPermissions: ResolvedFieldPermission[] = useMemo(() => (
        resolveModuleFieldPermissions(moduleFields, fieldPolicy, SCHEDULE_MODULE_CODE)
    ), [fieldPolicy, moduleFields]);
    const visibleFieldPermissions = useMemo(() => {
        const visibleFields = fieldPermissions.filter(
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
        const lessonNameIndex = visibleFields.findIndex(
            (item) => item.field.fieldCode === "lesson_name"
        );
        const learnNumberIndex = visibleFields.findIndex(
            (item) => item.field.fieldCode === "learn_number"
        );
        if (lessonNameIndex >= 0 && learnNumberIndex >= 0 && lessonNameIndex !== learnNumberIndex + 1) {
            const [lessonNameField] = visibleFields.splice(lessonNameIndex, 1);
            const updatedLearnNumberIndex = visibleFields.findIndex(
                (item) => item.field.fieldCode === "learn_number"
            );
            visibleFields.splice(updatedLearnNumberIndex + 1, 0, lessonNameField);
        }
        return visibleFields;
    }, [fieldPermissions]);
    const editableFieldCodes = useMemo(() => fieldPermissions
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
        .map((item) => item.field.fieldCode), [canEditTeachingAssignment, fieldPermissions]);
    const editableFieldCodeSet = useMemo(() => new Set(editableFieldCodes), [editableFieldCodes]);

    const getTableFilterValue = useCallback((fieldCode: string, record: ScheduleDataType) => {
        if (fieldCode === "live_weekday") return liveWeekdayLabel(record.start_time);
        if (fieldCode === "live_date") {
            const date = parseCalendarWallTime(record.start_time);
            return date.isValid() ? date.format("DD/MM/YYYY") : "-";
        }
        if (fieldCode === "lesson_status") {
            return Number(record.lesson_status) === 1
                ? "Nghỉ học"
                : lessonStatusText(record.start_time, record.end_time);
        }
        return String(record[fieldCode] ?? "-").trim() || "-";
    }, []);
    const filterableFieldCodes = useMemo(() => new Set([
        "learn_number", "subject", "teacher", "assistant_teacher", "system_type", "lesson_status",
    ]), []);
    const tableFiltersByField = useMemo(() => {
        const result = new Map<string, Array<{ text: string; value: string }>>();
        const fieldCodes = [...filterableFieldCodes, "live_weekday", "live_date"];
        fieldCodes.forEach((fieldCode) => {
            const values = Array.from(new Set(
                data.map((record) => getTableFilterValue(fieldCode, record))
            ));
            result.set(fieldCode, values
                .sort((left, right) => left.localeCompare(right, "vi"))
                .map((value) => ({ text: value, value })));
        });
        return result;
    }, [data, filterableFieldCodes, getTableFilterValue]);
    const getTableFilters = useCallback(
        (fieldCode: string) => tableFiltersByField.get(fieldCode) ?? [],
        [tableFiltersByField]
    );
    const previousEditingKeyRef = useRef(editingKey);
    const previousEditingKey = previousEditingKeyRef.current;
    const previousSavingKeyRef = useRef(savingKey);
    const previousSavingKey = previousSavingKeyRef.current;
    useEffect(() => {
        previousEditingKeyRef.current = editingKey;
    }, [editingKey]);
    useEffect(() => {
        previousSavingKeyRef.current = savingKey;
    }, [savingKey]);
    const shouldUpdateScheduleCell = useCallback((record: ScheduleDataType, previousRecord: ScheduleDataType) => (
        record !== previousRecord
        || record.key === editingKey
        || record.key === previousEditingKey
    ), [editingKey, previousEditingKey]);
    const shouldUpdateActionCell = useCallback((record: ScheduleDataType, previousRecord: ScheduleDataType) => (
        record !== previousRecord
        || editingKey !== previousEditingKey
        || savingKey !== previousSavingKey
    ), [editingKey, previousEditingKey, previousSavingKey, savingKey]);

    const columns: ColumnsType<ScheduleDataType> = visibleFieldPermissions.map(({ field }, columnIndex) => {
        const fieldCode = field.fieldCode;
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
            filters: filterableFieldCodes.has(fieldCode) ? getTableFilters(fieldCode) : undefined,
            filterMultiple: true,
            filteredValue: filterableFieldCodes.has(fieldCode)
                ? tableColumnFilters[fieldCode] ?? null
                : undefined,
            onFilter: filterableFieldCodes.has(fieldCode)
                ? (value: React.Key | boolean, record: ScheduleDataType) => (
                    getTableFilterValue(fieldCode, record) === String(value)
                )
                : undefined,
            // Nhãn trợ giảng phụ thuộc danh sách tải riêng, nên cột này vẫn cần
            // render khi options về. Các cột còn lại bỏ qua render khi chỉ tick row.
            shouldCellUpdate: fieldCode === "assistant_teacher"
                ? undefined
                : shouldUpdateScheduleCell,
            render: (text: any, record: ScheduleDataType) => {
                const editing = isEditing(record);
                const editable = editableFieldCodeSet.has(fieldCode);

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
                        .map((username) => assistantLabelByUsername.get(username.trim()) || username.trim())
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
            filters: getTableFilters("live_weekday"),
            filterMultiple: true,
            filteredValue: tableColumnFilters.live_weekday ?? null,
            onFilter: (value: React.Key | boolean, record: ScheduleDataType) => (
                getTableFilterValue("live_weekday", record) === String(value)
            ),
            shouldCellUpdate: shouldUpdateScheduleCell,
            render: (value: unknown) => liveWeekdayLabel(value),
        },
        {
            title: "Ngày live",
            dataIndex: "start_time",
            key: "live_date",
            width: 118,
            fixed: "left",
            filters: getTableFilters("live_date"),
            filterMultiple: true,
            filteredValue: tableColumnFilters.live_date ?? null,
            onFilter: (value: React.Key | boolean, record: ScheduleDataType) => (
                getTableFilterValue("live_date", record) === String(value)
            ),
            shouldCellUpdate: shouldUpdateScheduleCell,
            render: (value: unknown, record: ScheduleDataType) => {
                if (isEditing(record) && editableFieldCodeSet.has("start_time")) {
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
            shouldCellUpdate: shouldUpdateScheduleCell,
            render: (_: unknown, record: ScheduleDataType) => {
                const canEditStart = editableFieldCodeSet.has("start_time");
                const canEditEnd = editableFieldCodeSet.has("end_time");
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
            filteredValue: submittedFilterValues.code ? [submittedFilterValues.code] : null,
            onFilter: (value: React.Key | boolean, record: ScheduleDataType) => (
                String(record.code || '') === String(value)
            ),
            shouldCellUpdate: shouldUpdateScheduleCell,
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

    columns.push({
        title: "Phân lớp",
        key: "classroom_assignment_status",
        width: 130,
        className: "responsive-card-hidden",
        shouldCellUpdate: shouldUpdateScheduleCell,
        render: (_: unknown, record: ScheduleDataType) => {
            if (Number(record.lesson_status) === 1) return null;
            return record.classroom_assigned ? (
                <Tooltip title={record.classroom_assigned_at
                    ? `Lần chia gần nhất: ${dayjs(record.classroom_assigned_at).format("DD/MM/YYYY HH:mm")}`
                    : "Buổi học đã được chia lớp"}>
                    <Tag color="green">Đã chia lớp</Tag>
                </Tooltip>
            ) : <Tag>Chưa chia lớp</Tag>;
        },
    });

    if ((canEditSchedule && editableFieldCodes.length > 0) || canDeleteSchedule || canCreateSchedule) {
        columns.push({
            title: "Thao tác",
            key: "action",
            fixed: "right",
            width: 112,
            align: "center",
            shouldCellUpdate: shouldUpdateActionCell,
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
                    <Space size={4} wrap={false}>
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
                    <Space size={4} wrap={false}>
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

    const handleOpenBulkEdit = async () => {
        const selectedKeySet = new Set(selectedRowKeys.map(String));
        let requestedRows = selectedRowKeys
            .map((key) => selectedRowsCacheRef.current.get(String(key)))
            .filter((item): item is ScheduleDataType => Boolean(item));
        if (requestedRows.length < selectedKeySet.size) {
            try {
                const rows = await fetchAllPages<any>({
                    total: totalItems,
                    pageSize: 300,
                    fetchPage: async (page, limit) => {
                        const response: any = await getLivestreams({ ...scheduleParams, page, limit });
                        return Array.isArray(response?.data?.data) ? response.data.data : [];
                    },
                });
                requestedRows = mapScheduleRows(rows).filter((item) => selectedKeySet.has(String(item.id)));
                requestedRows.forEach((record) => selectedRowsCacheRef.current.set(String(record.id), record));
            } catch (error: any) {
                api.error({
                    message: "Không thể mở sửa hàng loạt",
                    description: error?.message || "Không thể tải đủ các lịch học đã chọn.",
                });
                return;
            }
        }
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

    const handleOpenScheduleImport = () => {
        if (!String(submittedFilterValues.code || "").trim()) {
            api.warning({
                message: "Chưa chọn Chương trình",
                description: "Hãy lọc đúng một Chương trình trước khi mở chức năng import lịch học.",
            });
            setOpenFilterDrawer(true);
            return;
        }
        setImportErrors([]);
        setImportMode(canImportSchedule ? "create" : "update");
        setOpenImportModal(true);
    };

    const handleRefreshScheduleList = async () => {
        if (!hasSearched || refreshingScheduleList) return;
        setRefreshingScheduleList(true);
        try {
            await refreshSchedules();
        } catch (error: any) {
            api.error({
                message: "Làm mới danh sách thất bại",
                description: error?.message || "Không thể tải lại dữ liệu lịch học.",
            });
        } finally {
            setRefreshingScheduleList(false);
        }
    };

    const exportMenu = {
        items: [
            { key: "all-programs", label: "Excel toàn bộ chương trình (theo mẫu gốc)" },
            { type: "divider" as const },
            { key: "xlsx", label: "Xuất Excel (.xlsx)" },
            { key: "csv", label: "Xuất CSV (.csv)" },
            { type: "divider" as const },
            { key: "update-assistants", label: "Excel để bổ sung trợ giảng" },
        ],
        onClick: ({ key }: { key: string }) => {
            if (key === "all-programs") {
                void handleExportSchedule("xlsx", "all-programs");
                return;
            }
            if (key === "update-assistants") {
                void handleExportSchedule("xlsx", "update");
                return;
            }
            void handleExportSchedule(key as "csv" | "xlsx");
        },
    };

    const syncMenu = {
        items: [
            {
                key: "sync-teaching-users",
                icon: <ReloadOutlined />,
                label: "Quét user nhân sự",
                disabled: syncingTeachingUsers,
            },
            ...(canEditSchedule ? [{
                key: "resend-to-hocmai",
                icon: <CloudUploadOutlined />,
                label: `Gửi lại HMO${selectedRowKeys.length ? ` (${selectedRowKeys.length})` : ""}`,
                disabled: !selectedRowKeys.length || resendingToHocmai,
            }, {
                key: "assign-student-classrooms",
                icon: <ApartmentOutlined />,
                label: "Xem trước & chia 1 lịch",
                disabled: batchClassroomAssigning || selectedRowKeys.length !== 1 || !selectedRowsAllModifiable,
            }, {
                key: "batch-assign-student-classrooms",
                icon: <ApartmentOutlined />,
                label: `Tự động chia lớp đã chọn${selectedRowKeys.length ? ` (${selectedRowKeys.length})` : ""}`,
                disabled: !selectedRowKeys.length || batchClassroomAssigning || !selectedRowsAllModifiable,
            }] : []),
        ],
        onClick: ({ key }: { key: string }) => {
            if (key === "sync-teaching-users") handleSyncMissingTeachingUsers();
            if (key === "resend-to-hocmai") handleResendToHocmai();
            if (key === "assign-student-classrooms") handleOpenClassroomAssignment();
            if (key === "batch-assign-student-classrooms") handleOpenBatchClassroomAssignment();
        },
    };
    const completedClassroomAssignments = batchClassroomItems.filter(
        (item) => ["success", "skipped", "error"].includes(item.status)
    ).length;
    const batchClassroomPercent = batchClassroomItems.length
        ? Math.round((completedClassroomAssignments / batchClassroomItems.length) * 100)
        : 0;

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
                {/* <div
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
                </div> */}

                <SearchAndActionsBar
                    onSearch={handleSearch}
                    searchValue={searchText}
                    placeholder="Tìm kiếm theo chương trình, bài học, giáo viên, phòng học..."
                    handleAddBtn={canCreateSchedule ? handleAddBtn : undefined}
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
                                        icon={<EditOutlined />}
                                        onClick={handleOpenBulkEdit}
                                    >
                                        Sửa hàng loạt
                                    </Button>
                                )}
                            </div>
                            <div className="schedule-utility-actions">
                                {(canImportSchedule || canEditSchedule || canExportSchedule) && (
                                    <Space.Compact className="schedule-file-actions">
                                        {(canImportSchedule || canEditSchedule) && (
                                            <Button icon={<UploadOutlined />} onClick={handleOpenScheduleImport}>
                                                Import
                                            </Button>
                                        )}
                                        {canExportSchedule && (
                                            <Dropdown trigger={["click"]} menu={exportMenu}>
                                                <Button icon={<DownloadOutlined />}>
                                                    Export{selectedRowKeys.length ? ` (${selectedRowKeys.length})` : ""}
                                                </Button>
                                            </Dropdown>
                                        )}
                                    </Space.Compact>
                                )}
                                <Dropdown trigger={["click"]} menu={syncMenu}>
                                    <Button icon={<DatabaseOutlined />} loading={syncingTeachingUsers || batchClassroomAssigning || resendingToHocmai}>
                                        Đồng bộ <DownOutlined />
                                    </Button>
                                </Dropdown>
                                <Button
                                    aria-label="Làm mới danh sách"
                                    title="Làm mới danh sách"
                                    icon={<ReloadOutlined />}
                                    loading={refreshingScheduleList}
                                    disabled={!hasSearched}
                                    onClick={() => void handleRefreshScheduleList()}
                                />
                            </div>
                        </> : <div className="schedule-mobile-actions">
                            {(canImportSchedule || canEditSchedule) && (
                                <Button icon={<UploadOutlined />} onClick={handleOpenScheduleImport}>Import</Button>
                            )}
                            {canExportSchedule && (
                                <Dropdown trigger={["click"]} menu={exportMenu}>
                                    <Button icon={<DownloadOutlined />}>
                                        Export{selectedRowKeys.length ? ` (${selectedRowKeys.length})` : ""}
                                    </Button>
                                </Dropdown>
                            )}
                            {(canCreateSchedule || canEditSchedule) && (
                                <Dropdown
                                    trigger={["click"]}
                                    menu={{
                                        items: [
                                            ...(canCreateSchedule ? [{ key: "auto", icon: <CalendarOutlined />, label: "Tạo lịch tự động", disabled: !submittedFilterValues.code }] : []),
                                            ...(canEditSchedule ? [{ key: "bulk-edit", icon: <EditOutlined />, label: "Sửa hàng loạt" }] : []),
                                        ],
                                        onClick: ({ key }) => {
                                            if (key === "auto") handleOpenAutoSchedule();
                                            if (key === "bulk-edit") handleOpenBulkEdit();
                                        },
                                    }}
                                >
                                    <Button icon={<MoreOutlined />}>Thao tác khác</Button>
                                </Dropdown>
                            )}
                            <Dropdown trigger={["click"]} menu={syncMenu}>
                                <Button icon={<DatabaseOutlined />} loading={syncingTeachingUsers || batchClassroomAssigning || resendingToHocmai}>
                                    Đồng bộ <DownOutlined />
                                </Button>
                            </Dropdown>
                            <Button
                                icon={<ReloadOutlined />}
                                loading={refreshingScheduleList}
                                disabled={!hasSearched}
                                onClick={() => void handleRefreshScheduleList()}
                            >
                                Làm mới
                            </Button>
                            <Button icon={<FilterOutlined />} onClick={() => setOpenFilterDrawer(true)}>Lọc</Button>
                        </div>
                    }
                />
                {isDesktop && (
                    <ScheduleInlineFilters
                        value={filterValues}
                        loading={loading}
                        programOptions={programOptions}
                        loadingPrograms={programsQuery.isLoading || programsQuery.isValidating}
                        allowFilterWithoutProgram={Boolean(isAdmin)}
                        onSearch={handleScheduleFilter}
                        onReset={handleResetScheduleFilter}
                    />
                )}
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
                                    className={`schedule-view-pane custom-calendar-wrapper${viewMode === "calendar" ? " schedule-view-pane-active" : ""}${canCreateSchedule && activeProgramCode ? " calendar-create-enabled" : ""}`}
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
                                    cursor: pointer;
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
                                .custom-calendar-wrapper.calendar-create-enabled .fc-timegrid-slot-lane,
                                .custom-calendar-wrapper.calendar-create-enabled .fc-daygrid-day-frame {
                                    cursor: crosshair;
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
                                        selectable={Boolean(canCreateSchedule && activeProgramCode)}
                                        // Dùng vùng chọn native của FullCalendar: hiển thị đúng
                                        // thời lượng đã kéo và không bị co khi lịch đang dày event.
                                        selectMirror
                                        selectMinDistance={5}
                                        unselectAuto={false}
                                        select={handleCalendarSelect}
                                        dateClick={handleCalendarDateClick}
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
                                                {Number(record.lesson_status) !== 1 && record.classroom_assigned && <Tag color="green" style={{ marginInlineEnd: 0 }}>Đã chia</Tag>}
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
                                        onChange={(_, filters, _sorter, extra) => {
                                            if (extra.action === "filter") {
                                                const nextColumnFilters: Record<string, React.Key[] | null> = {};
                                                Object.entries(filters).forEach(([key, values]) => {
                                                    if (key === "program_code") return;
                                                    nextColumnFilters[key] = values?.map((value) => value as React.Key) || null;
                                                });
                                                setTableColumnFilters(nextColumnFilters);

                                                // Ant Table gửi tất cả filter-enabled columns trong callback.
                                                // Vì vậy bấm "Đồng ý" ở Giáo viên vẫn có program_code; chỉ
                                                // đổi API/URL khi cột Chương trình thực sự đổi giá trị.
                                                if (filters.program_code === undefined) return;
                                                const currentProgramFilter = submittedFilterValues.code
                                                    ? [String(submittedFilterValues.code)]
                                                    : null;
                                                const nextProgramFilter = filters.program_code?.map(String) || null;
                                                if (JSON.stringify(nextProgramFilter) === JSON.stringify(currentProgramFilter)) {
                                                    return;
                                                }
                                                const selectedProgram = nextProgramFilter?.[0];
                                                const nextValues = cleanFilterValues({
                                                    ...submittedFilterValues,
                                                    code: selectedProgram ? String(selectedProgram) : undefined,
                                                });
                                                setFilterValues(nextValues);
                                                setSubmittedFilterValues(nextValues);
                                                setCurrentPage(1);
                                                setHasSearched(true);
                                                replaceScheduleUrl(nextValues);
                                                return;
                                            }
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
                {!isDesktop && (
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
                )}
                <Modal
                    open={Boolean(calendarDetail)}
                    title="Chi tiết buổi học"
                    footer={null}
                    width={760}
                    onCancel={() => setCalendarDetail(null)}
                >
                    {calendarDetail && <ScheduleDetailRow record={calendarDetail} />}
                </Modal>
                <ScheduleModalController
                    ref={scheduleModalRef}
                    onCloseCleanup={() => {
                        calendarRef.current?.getApi().unselect();
                        setCalendarDraftPreview(null);
                    }}
                    onSuccess={handleModalSuccess}
                    onDraftChange={handleCalendarDraftChange}
                    moduleFields={moduleFields}
                    fieldPolicy={fieldPolicy}
                    programCode={String(submittedFilterValues.code || "").trim() || undefined}
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
                <ClassroomAssignmentModal
                    open={Boolean(classroomAssignmentCalendarId)}
                    calendarId={classroomAssignmentCalendarId}
                    systemType={classroomAssignmentSystemType}
                    onClose={() => {
                        setClassroomAssignmentCalendarId(null);
                        setClassroomAssignmentSystemType(null);
                    }}
                    onApplied={() => {
                        void refreshSchedules();
                    }}
                />
                <Modal
                    title="Tiến trình tự động chia lớp"
                    open={batchClassroomAssignmentOpen}
                    width={960}
                    closable={!batchClassroomAssigning}
                    maskClosable={!batchClassroomAssigning}
                    onCancel={() => {
                        if (!batchClassroomAssigning) setBatchClassroomAssignmentOpen(false);
                    }}
                    footer={(
                        <Button
                            type="primary"
                            disabled={batchClassroomAssigning}
                            onClick={() => setBatchClassroomAssignmentOpen(false)}
                        >
                            Đóng
                        </Button>
                    )}
                >
                    <Space direction="vertical" size={16} style={{ width: "100%" }}>
                        <div>
                            <Space style={{ width: "100%", justifyContent: "space-between", marginBottom: 6 }}>
                                <Typography.Text strong>Tiến độ tổng</Typography.Text>
                                <Typography.Text>
                                    {completedClassroomAssignments}/{batchClassroomItems.length} lịch
                                </Typography.Text>
                            </Space>
                            <Progress
                                percent={batchClassroomPercent}
                                status={batchClassroomAssigning
                                    ? "active"
                                    : batchClassroomItems.some((item) => item.status === "error")
                                        ? "exception"
                                        : batchClassroomItems.some((item) => item.status === "skipped")
                                            ? "normal"
                                            : "success"}
                            />
                        </div>
                        <Table<BatchClassroomAssignmentItem>
                            rowKey="calendarId"
                            size="small"
                            pagination={false}
                            dataSource={batchClassroomItems}
                            scroll={{ x: 820, y: "min(52vh, 480px)" }}
                            columns={[
                                {
                                    title: "Lịch",
                                    key: "schedule",
                                    width: 270,
                                    render: (_, item) => (
                                        <Space direction="vertical" size={0} style={{ maxWidth: 250 }}>
                                            <Typography.Text strong ellipsis={{ tooltip: item.lessonName }}>
                                                {item.code || "Chưa có chương trình"} · Bài {item.learnNumber || "-"}
                                            </Typography.Text>
                                            <Typography.Text type="secondary" ellipsis={{ tooltip: item.lessonName }}>
                                                {item.lessonName || `Lịch ID ${item.calendarId}`}
                                            </Typography.Text>
                                            {item.startTime && (
                                                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                                    {dayjs(item.startTime).format("DD/MM/YYYY HH:mm")}
                                                </Typography.Text>
                                            )}
                                        </Space>
                                    ),
                                },
                                {
                                    title: "Hệ thống",
                                    dataIndex: "systemType",
                                    width: 100,
                                    render: (value) => value === "topuni"
                                        ? <Tag color="purple">TopUni</Tag>
                                        : value === "topclass" ? <Tag color="cyan">TopClass</Tag> : "-",
                                },
                                {
                                    title: "Phần trăm",
                                    key: "percent",
                                    width: 150,
                                    render: (_, item) => {
                                        const finished = ["success", "skipped", "error"].includes(item.status);
                                        return item.status === "running" ? (
                                            <Space size={8}><Spin size="small" /> <Typography.Text>Đang xử lý</Typography.Text></Space>
                                        ) : (
                                            <Progress
                                                percent={finished ? 100 : 0}
                                                size="small"
                                                status={item.status === "error"
                                                    ? "exception"
                                                    : item.status === "success" ? "success" : "normal"}
                                            />
                                        );
                                    },
                                },
                                {
                                    title: "Kết quả",
                                    key: "result",
                                    width: 300,
                                    render: (_, item) => (
                                        <Space direction="vertical" size={2}>
                                            {item.status === "pending" && <Tag>Chờ xử lý</Tag>}
                                            {item.status === "running" && <Tag color="processing">Đang chia lớp</Tag>}
                                            {item.status === "success" && <Tag color="success">Thành công</Tag>}
                                            {item.status === "skipped" && <Tag color="warning">Bỏ qua</Tag>}
                                            {item.status === "error" && <Tag color="error">Lỗi</Tag>}
                                            {item.message && (
                                                <Typography.Text type={item.status === "error" ? "danger" : "secondary"}>
                                                    {item.message}
                                                </Typography.Text>
                                            )}
                                        </Space>
                                    ),
                                },
                            ]}
                        />
                    </Space>
                </Modal>
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
                                <br />
                                <Typography.Text style={{ color: '#1677ff' }}>Đã bổ sung/chỉnh sửa: {syncProgress.updated} user</Typography.Text>
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
