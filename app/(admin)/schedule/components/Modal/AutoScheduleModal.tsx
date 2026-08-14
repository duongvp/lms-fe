"use client";

import { PlusOutlined, SyncOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Checkbox, DatePicker, Empty, Form, Input, InputNumber, message, Modal, Pagination, Select, Space, Spin, Table, TimePicker, Typography, type SelectProps } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import {
    commitAutoSchedule,
    getProgramLessonsForScheduling,
    getHocmaiSectionsForSchedulingLesson,
    previewAutoSchedule,
    type AutoSchedulePayload,
    type SchedulingLesson,
    type HocmaiSectionOption,
} from "@/services/livestreamService";
import { useEffect, useRef, useState } from "react";
import TeachingStaffSelect from "@/components/shared/TeachingStaffSelect";
import { buildGroupedHmoOptions, hmoOptionKey, summarizeHmoOptions } from "@/helper/hmoOptions";

type Props = {
    open: boolean;
    programCode: string;
    onClose: () => void;
    onSuccess: () => void | Promise<void>;
    fullscreen?: boolean;
};

const WEEKDAYS = [
    { value: 1, label: "Thứ 2" }, { value: 2, label: "Thứ 3" },
    { value: 3, label: "Thứ 4" }, { value: 4, label: "Thứ 5" },
    { value: 5, label: "Thứ 6" }, { value: 6, label: "Thứ 7" },
    { value: 7, label: "Chủ nhật" },
];
const BLOCKS_PER_PAGE = 3;

const getEndTimeDisabledTime = (startTime?: Dayjs | null) => {
    if (!startTime) return {};

    const startHour = startTime.hour();
    const startMinute = startTime.minute();
    return {
        disabledHours: () => Array.from({ length: startHour }, (_, hour) => hour),
        disabledMinutes: (hour: number) => hour === startHour
            ? Array.from({ length: startMinute + 1 }, (_, minute) => minute)
            : [],
    };
};

const isEndTimeInvalid = (startTime?: Dayjs | null, endTime?: Dayjs | null) => (
    !!startTime && !!endTime && !endTime.isAfter(startTime)
);
const normalizeLessonTitle = (value: unknown) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .replace(/^bai\s*\d+\s*[:.\-–—]*\s*/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const sortHmoOptionsByLessonId = (left: HocmaiSectionOption, right: HocmaiSectionOption) => (
    String(left.lesson_id).localeCompare(String(right.lesson_id), "vi", { numeric: true })
);

const previewWeekdayLabel = (value?: string) => {
    const day = dayjs(String(value || "").replace(/Z$/, "")).day();
    return day === 0 ? "Chủ nhật" : `Thứ ${day + 1}`;
};

const previewLessonIds = (row: any) => {
    const lessonIds = (row.package_lesson_mappings || [])
        .flatMap((mapping: any) => mapping.lesson_ids || [])
        .map((lessonId: unknown) => String(lessonId).trim())
        .filter(Boolean);
    return Array.from(new Set(lessonIds)).join(", ") || row.auto_schedule?.hmo_section_id || "-";
};

const renderHmoSelectedTag: SelectProps["tagRender"] = ({ value, closable, onClose }) => {
    const lessonId = String(value || "").split("::").at(-1) || String(value || "");
    return (
        <span className="ant-select-selection-item" style={{ marginInlineEnd: 4 }}>
            <span className="ant-select-selection-item-content">{lessonId}</span>
            {closable && <span className="ant-select-selection-item-remove" onMouseDown={(event) => event.preventDefault()} onClick={onClose}>×</span>}
        </span>
    );
};

const buildSessions = (position: number) => [
    {
        weekday: position === 0 ? 1 : 2,
        start_time: dayjs("19:00", "HH:mm"),
        end_time: dayjs("20:30", "HH:mm"),
        hmo_mapping_keys: [],
        assistant_teachers: [],
    },
    {
        weekday: 6,
        start_time: dayjs(position === 0 ? "19:00" : "20:30", "HH:mm"),
        end_time: dayjs(position === 0 ? "20:30" : "22:00", "HH:mm"),
        hmo_mapping_keys: [],
        assistant_teachers: [],
    },
];

const cloneScheduleTemplate = (template: any[]) => template
    .filter((item) => item?.weekday && item?.start_time && item?.end_time)
    .map((item) => ({
        weekday: Number(item.weekday),
        start_time: dayjs(item.start_time),
        end_time: dayjs(item.end_time),
        hmo_mapping_keys: [],
        teacher: item.teacher,
        assistant_teachers: Array.isArray(item.assistant_teachers)
            ? item.assistant_teachers
            : String(item.assistant_teacher || "").split(",").map((value) => value.trim()).filter(Boolean),
    }));

const normalizeHolidayDates = (value: unknown) => String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
        const parsed = dayjs(item, ["DD/MM/YYYY", "YYYY-MM-DD"], true);
        if (!parsed.isValid()) throw new Error(`Ngày nghỉ ${item} không hợp lệ. Dùng định dạng DD/MM/YYYY`);
        return parsed.format("YYYY-MM-DD");
    });

const AutoScheduleModal = ({ open, programCode, onClose, onSuccess, fullscreen = false }: Props) => {
    const [form] = Form.useForm();
    const [lessons, setLessons] = useState<SchedulingLesson[]>([]);
    const [preview, setPreview] = useState<any[]>([]);
    const [payload, setPayload] = useState<AutoSchedulePayload | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingLessons, setLoadingLessons] = useState(false);
    const [blockSize, setBlockSize] = useState<1 | 2>(1);
    const [lessonLimit, setLessonLimit] = useState(0);
    const [blockPage, setBlockPage] = useState(1);
    const [hmoOptions, setHmoOptions] = useState<Record<string, HocmaiSectionOption[]>>({});
    const [loadingHmoLessonIds, setLoadingHmoLessonIds] = useState<Set<string>>(new Set());
    const [syncingHmoLessonIds, setSyncingHmoLessonIds] = useState(false);
    const [hmoSyncNotes, setHmoSyncNotes] = useState<Record<string, { type: "success" | "warning"; message: string }>>({});
    const requestedHmoLessonIds = useRef(new Set<string>());
    const hmoOptionsRef = useRef<Record<string, HocmaiSectionOption[]>>({});
    const hmoRequestPromises = useRef(new Map<string, Promise<HocmaiSectionOption[]>>());


    const loadHmoOptions = (lessonId: string): Promise<HocmaiSectionOption[]> => {
        if (Object.prototype.hasOwnProperty.call(hmoOptionsRef.current, lessonId)) {
            return Promise.resolve(hmoOptionsRef.current[lessonId]);
        }
        const pending = hmoRequestPromises.current.get(lessonId);
        if (pending) return pending;

        requestedHmoLessonIds.current.add(lessonId);
        setLoadingHmoLessonIds((current) => new Set(current).add(lessonId));
        const request = getHocmaiSectionsForSchedulingLesson(programCode, lessonId)
            .then((response: any) => {
                const options = Array.isArray(response?.data) ? response.data : [];
                hmoOptionsRef.current = { ...hmoOptionsRef.current, [lessonId]: options };
                setHmoOptions(hmoOptionsRef.current);
                return options;
            })
            .catch((error: any) => {
                requestedHmoLessonIds.current.delete(lessonId);
                throw error;
            })
            .finally(() => {
                hmoRequestPromises.current.delete(lessonId);
                setLoadingHmoLessonIds((current) => {
                    const next = new Set(current);
                    next.delete(lessonId);
                    return next;
                });
            });
        hmoRequestPromises.current.set(lessonId, request);
        return request;
    };

    const getScheduleTemplate = (blockIndex = 0, lessonIndex = 0) => {
        const mode = form.getFieldValue("template_mode") || "common";
        const fieldName = mode === "odd_even"
            ? (blockIndex % 2 === 0 ? "odd_schedule_template" : "even_schedule_template")
            : mode === "within_block"
                ? (lessonIndex % 2 === 0 ? "first_lesson_schedule_template" : "second_lesson_schedule_template")
                : "schedule_template";
        const template = cloneScheduleTemplate(form.getFieldValue(fieldName) || []);
        const sessions = template.length ? template : null;
        return form.getFieldValue("system_type") === "topuni"
            ? sessions?.slice(0, 1) || buildSessions(lessonIndex).slice(0, 1)
            : sessions;
    };

    const divideIntoBlocks = (source: SchedulingLesson[], size: 1 | 2, requestedLimit = lessonLimit) => {
        const remaining = source.filter((lesson) => Number(lesson.scheduled_count || 0) === 0);
        const normalizedLimit = Math.min(
            remaining.length,
            Math.max(0, Number(requestedLimit) || 0)
        );
        const available = remaining.slice(0, normalizedLimit);
        const blocks = [];
        for (let index = 0; index < available.length; index += size) {
            const blockLessons = available.slice(index, index + size);
            blocks.push({
                block_name: `Block ${blocks.length + 1}`,
                lessons: blockLessons.map((lesson, lessonIndex) => ({
                    learn_number: lesson.learn_number,
                    session_id: lesson.id,
                    lesson_name: lesson.lesson_name,
                    sessions: getScheduleTemplate(blocks.length, lessonIndex)
                        || (form.getFieldValue("system_type") === "topuni"
                            ? buildSessions(lessonIndex).slice(0, 1)
                            : buildSessions(lessonIndex)),
                })),
            });
        }
        form.setFieldValue("blocks", blocks);
        setBlockPage(1);
        setHmoSyncNotes({});
        setPreview([]);
        setPayload(null);
    };

    const applyScheduleTemplateToAllLessons = async () => {
        try {
            const mode = form.getFieldValue("template_mode") || "common";
            await form.validateFields(mode === "odd_even"
                ? ["odd_schedule_template", "even_schedule_template"]
                : mode === "within_block"
                    ? ["first_lesson_schedule_template", "second_lesson_schedule_template"]
                    : ["schedule_template"]);
            const blocks = form.getFieldValue("blocks") || [];
            form.setFieldValue("blocks", blocks.map((block: any, blockIndex: number) => ({
                ...block,
                lessons: (block.lessons || []).map((lesson: any, lessonIndex: number) => ({
                    ...lesson,
                    sessions: cloneScheduleTemplate(getScheduleTemplate(blockIndex, lessonIndex) || []),
                })),
            })));
            setHmoSyncNotes({});
            setPreview([]);
            setPayload(null);
            message.success("Đã áp dụng mẫu lịch cho toàn bộ Block đã chọn");
        } catch {
            // Ant Design đã hiển thị lỗi ngay tại dòng mẫu không hợp lệ.
        }
    };

    useEffect(() => {
        if (!open || !programCode) return;
        let active = true;
        setLoadingLessons(true);
        getProgramLessonsForScheduling(programCode)
            .then((response: any) => {
                if (!active) return;
                const rows = Array.isArray(response?.data) ? response.data : [];
                const remainingCount = rows.filter(
                    (lesson: SchedulingLesson) => Number(lesson.scheduled_count || 0) === 0
                ).length;
                setLessons(rows);
                setLessonLimit(remainingCount);
                setHmoOptions({});
                hmoOptionsRef.current = {};
                setHmoSyncNotes({});
                requestedHmoLessonIds.current.clear();
                divideIntoBlocks(rows, 1, remainingCount);
            })
            .catch((error: any) => message.error(error?.message || "Không thể tải bài học của chương trình"))
            .finally(() => active && setLoadingLessons(false));
        return () => { active = false; };
        // form ổn định trong suốt vòng đời component.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, programCode]);

    useEffect(() => {
        if (!open || !programCode) return;
        const available = lessons
            .filter((lesson) => Number(lesson.scheduled_count || 0) === 0)
            .slice(0, lessonLimit);
        const firstLessonIndex = (blockPage - 1) * BLOCKS_PER_PAGE * blockSize;
        const visibleLessons = available.slice(
            firstLessonIndex,
            firstLessonIndex + BLOCKS_PER_PAGE * blockSize
        );
        visibleLessons.forEach((lesson) => {
            const lessonId = String(lesson.id);
            if (requestedHmoLessonIds.current.has(lessonId)) return;
            void loadHmoOptions(lessonId)
                .catch((error: any) => {
                    message.error(error?.message || `Không thể tải Lesson ID HMO cho bài ${lesson.learn_number}`);
                });
        });
        // loadHmoOptions dùng cache/ref nội bộ để tránh gọi trùng API.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blockPage, blockSize, lessonLimit, lessons, open, programCode]);

    const handleSyncHmoLessonIds = async () => {
        const blocks = form.getFieldValue("blocks") || [];
        const blockLessons = blocks.flatMap((block: any) => block.lessons || []);
        if (!blockLessons.length) {
            message.warning("Chưa có bài học để đồng bộ Lesson ID HMO");
            return;
        }

        setSyncingHmoLessonIds(true);
        try {
            const optionsByLesson = new Map<string, HocmaiSectionOption[]>();
            const failedLessonIds = new Set<string>();
            await Promise.all(blockLessons.map(async (lesson: any) => {
                const lessonId = String(lesson.session_id || "");
                if (!lessonId) return;
                try {
                    optionsByLesson.set(lessonId, await loadHmoOptions(lessonId));
                } catch (error: any) {
                    failedLessonIds.add(lessonId);
                    optionsByLesson.set(lessonId, []);
                }
            }));

            let syncedCount = 0;
            const notes: Record<string, { type: "success" | "warning"; message: string }> = {};
            const nextBlocks = blocks.map((block: any) => ({
                ...block,
                lessons: (block.lessons || []).map((lesson: any) => {
                    const lessonId = String(lesson.session_id || "");
                    const lessonTitle = normalizeLessonTitle(lesson.lesson_name);
                    const seenLessonIds = new Set<string>();
                    const matchedOptions = (optionsByLesson.get(lessonId) || [])
                        .filter((option) => normalizeLessonTitle(option.lesson_name) === lessonTitle)
                        .sort(sortHmoOptionsByLessonId)
                        .filter((option) => {
                            const key = String(option.lesson_id);
                            if (seenLessonIds.has(key)) return false;
                            seenLessonIds.add(key);
                            return true;
                        });
                    const sessions = lesson.sessions || [];

                    if (failedLessonIds.has(lessonId)) {
                        notes[lessonId] = {
                            type: "warning",
                            message: "Không thể tải danh sách Lesson ID HMO của bài này. Hệ thống không thay đổi dữ liệu hiện tại; vui lòng thử đồng bộ lại.",
                        };
                        return lesson;
                    }

                    if (matchedOptions.length === sessions.length && sessions.length > 0) {
                        syncedCount += 1;
                        notes[lessonId] = {
                            type: "success",
                            message: `Đã gán ${sessions.length} Lesson ID theo thứ tự tăng dần: ${matchedOptions.map((option) => option.lesson_id).join(", ")}.`,
                        };
                        return {
                            ...lesson,
                            sessions: sessions.map((session: any, index: number) => ({
                                ...session,
                                hmo_mapping_keys: [hmoOptionKey(matchedOptions[index])],
                            })),
                        };
                    }

                    notes[lessonId] = {
                        type: "warning",
                        message: matchedOptions.length
                            ? `Bài có ${sessions.length} lịch nhưng tìm thấy ${matchedOptions.length} Lesson ID khớp tên (${matchedOptions.map((option) => option.lesson_id).join(", ")}). Hệ thống không tự gán; vui lòng chọn thủ công.`
                            : "Không tìm thấy Lesson ID HMO có tên khớp với tên bài. Hệ thống không tự gán.",
                    };
                    return lesson;
                }),
            }));

            form.setFieldValue("blocks", nextBlocks);
            setHmoSyncNotes(notes);
            setPreview([]);
            setPayload(null);
            if (syncedCount) {
                message.success(`Đã đồng bộ Lesson ID HMO cho ${syncedCount}/${blockLessons.length} bài`);
            } else {
                message.warning("Không có bài nào đủ điều kiện tự đồng bộ Lesson ID HMO");
            }
        } finally {
            setSyncingHmoLessonIds(false);
        }
    };

    const buildPayload = async (): Promise<AutoSchedulePayload> => {
        const values = await form.validateFields();
        return {
            program_code: programCode,
            system_type: values.system_type,
            strategy: values.strategy,
            start_date: values.start_date.format("YYYY-MM-DD"),
            holidays: normalizeHolidayDates(values.holidays),
            customize_lesson_names: Boolean(values.customize_lesson_names),
            lesson_name_prefix: values.customize_lesson_names ? String(values.lesson_name_prefix || "") : "",
            lesson_name_suffix: values.customize_lesson_names ? String(values.lesson_name_suffix || "") : "",
            lesson_name_rules: values.customize_lesson_names
                ? (values.lesson_name_rules || []).map((rule: any) => ({
                    from_learn_number: Number(rule.from_learn_number),
                    to_learn_number: Number(rule.to_learn_number),
                    prefix: String(rule.prefix || ""),
                    suffix: String(rule.suffix || ""),
                }))
                : [],
            blocks: values.blocks.map((block: any, blockIndex: number) => ({
                block_name: block.block_name || `Block ${blockIndex + 1}`,
                lessons: block.lessons.map((lesson: any) => ({
                    learn_number: Number(lesson.learn_number),
                    session_id: lesson.session_id,
                    lesson_name: lesson.lesson_name,
                    sessions: lesson.sessions
                        .slice(0, values.system_type === "topuni" ? 1 : undefined)
                        .map((session: any) => ({
                        weekday: Number(session.weekday),
                        start_time: session.start_time.format("HH:mm"),
                        end_time: session.end_time.format("HH:mm"),
                        teacher: String(session.teacher || "").trim() || undefined,
                        assistant_teacher: Array.from(new Set(
                            (Array.isArray(session.assistant_teachers)
                                ? session.assistant_teachers
                                : String(session.assistant_teacher || "").split(",")
                            ).map((value: unknown) => String(value).trim()).filter(Boolean)
                        )).join(",") || undefined,
                        hmo_mappings: (session.hmo_mapping_keys || [])
                            .map((key: string) => (hmoOptions[String(lesson.session_id)] || [])
                                .find((option) => hmoOptionKey(option) === key))
                            .filter(Boolean),
                    })),
                })),
            })),
        };
    };

    const handlePreview = async () => {
        setLoading(true);
        try {
            const nextPayload = await buildPayload();
            const response: any = await previewAutoSchedule(nextPayload);
            setPayload(nextPayload);
            setPreview(response?.data?.calendars || []);
        } catch (error: any) {
            message.error(error?.message || "Không thể tạo bản xem trước");
        } finally {
            setLoading(false);
        }
    };

    const handleCommit = async () => {
        if (!payload) return;
        setLoading(true);
        try {
            await commitAutoSchedule(payload);
            setPreview([]);
            setPayload(null);
            await onSuccess();
            onClose();
        } catch (error: any) {
            message.error(error?.message || "Không thể tạo lịch tự động");
        } finally {
            setLoading(false);
        }
    };

    const pastCount = lessons.filter((lesson) => Number(lesson.past_scheduled_count || 0) > 0).length;
    const assignedCount = lessons.filter((lesson) => Number(lesson.scheduled_count || 0) > 0).length;
    const remainingCount = Math.max(0, lessons.length - assignedCount);

    const renderTemplateFields = (name: string, title: string) => (
        <Card size="small" title={title} style={{ marginBottom: 10 }}>
            <Form.List name={name}>
                {(fields, { add, remove }) => (
                    <Space direction="vertical" style={{ width: "100%" }}>
                        {fields.map((field, index) => (
                            <Space key={field.key} align="start" wrap>
                                <Form.Item name={[field.name, "weekday"]} label={`Buổi mẫu ${index + 1}`} rules={[{ required: true, message: "Chọn thứ học" }]}>
                                    <Select style={{ width: 125 }} options={WEEKDAYS} />
                                </Form.Item>
                                <Form.Item name={[field.name, "start_time"]} label="Bắt đầu" rules={[{ required: true }]}>
                                    <TimePicker
                                        format="HH:mm"
                                        onChange={(startTime) => {
                                            const endName = [name, field.name, "end_time"];
                                            if (isEndTimeInvalid(startTime, form.getFieldValue(endName))) form.setFieldValue(endName, undefined);
                                        }}
                                    />
                                </Form.Item>
                                <Form.Item noStyle shouldUpdate>
                                    {({ getFieldValue }) => {
                                        const startTime = getFieldValue([name, field.name, "start_time"]);
                                        return (
                                            <Form.Item name={[field.name, "end_time"]} label="Kết thúc" rules={[{ required: true }]}>
                                                <TimePicker
                                                    format="HH:mm"
                                                    disabled={!startTime}
                                                    disabledTime={() => getEndTimeDisabledTime(startTime)}
                                                    defaultOpenValue={startTime || undefined}
                                                />
                                            </Form.Item>
                                        );
                                    }}
                                </Form.Item>
                                <Form.Item name={[field.name, "teacher"]} label="Giáo viên">
                                    <TeachingStaffSelect teacherType={1} teacherValueMode="displayName" allowClear placeholder="Chọn giáo viên" style={{ width: 220 }} />
                                </Form.Item>
                                <Form.Item name={[field.name, "assistant_teachers"]} label="Trợ giảng">
                                    <TeachingStaffSelect
                                        teacherType={0}
                                        mode="multiple"
                                        allowClear
                                        placeholder="Chọn một hoặc nhiều trợ giảng"
                                        style={{ width: 360 }}
                                        popupMatchSelectWidth={480}
                                        maxTagCount="responsive"
                                    />
                                </Form.Item>
                                {fields.length > 1 && <Button danger type="text" onClick={() => remove(field.name)} style={{ marginTop: 30 }}>Xóa</Button>}
                            </Space>
                        ))}
                        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add({ weekday: 1, start_time: dayjs("19:00", "HH:mm"), end_time: dayjs("20:30", "HH:mm"), assistant_teachers: [] })}>
                            Thêm buổi vào mẫu
                        </Button>
                    </Space>
                )}
            </Form.List>
        </Card>
    );

    return (
        <Modal
            rootClassName="schedule-responsive-modal"
            open={open}
            title={`Tạo lịch tự động · ${programCode}`}
            width={fullscreen ? "100%" : 1100}
            style={fullscreen ? { top: 0, maxWidth: "none", paddingBottom: 0 } : undefined}
            styles={fullscreen ? { content: { height: "100dvh", display: "flex", flexDirection: "column" }, body: { flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" } } : undefined}
            onCancel={onClose}
            footer={[
                <Button key="cancel" onClick={onClose}>Đóng</Button>,
                <Button key="preview" loading={loading} disabled={loadingLessons || remainingCount === 0} onClick={() => void handlePreview()}>Xem trước</Button>,
                <Button key="commit" type="primary" disabled={!preview.length} loading={loading} onClick={() => void handleCommit()}>
                    Xác nhận tạo {preview.length || ""} lịch
                </Button>,
            ]}
        >
            <Spin spinning={loadingLessons}>
                <Form
                    className="responsive-modal-form responsive-schedule-form"
                    form={form}
                    layout="vertical"
                    initialValues={{
                        system_type: "topclass",
                        strategy: "interleaved",
                        start_date: dayjs(),
                        customize_lesson_names: false,
                        lesson_name_prefix: "[Lịch {n}] - ",
                        lesson_name_suffix: "",
                        lesson_name_rules: [],
                        schedule_template: [
                            { weekday: 1, start_time: dayjs("19:00", "HH:mm"), end_time: dayjs("20:30", "HH:mm") },
                            { weekday: 6, start_time: dayjs("19:00", "HH:mm"), end_time: dayjs("20:30", "HH:mm") },
                        ],
                        odd_schedule_template: [
                            { weekday: 1, start_time: dayjs("19:00", "HH:mm"), end_time: dayjs("20:30", "HH:mm"), assistant_teachers: [] },
                            { weekday: 6, start_time: dayjs("19:00", "HH:mm"), end_time: dayjs("20:30", "HH:mm"), assistant_teachers: [] },
                        ],
                        even_schedule_template: [
                            { weekday: 2, start_time: dayjs("19:00", "HH:mm"), end_time: dayjs("20:30", "HH:mm"), assistant_teachers: [] },
                            { weekday: 6, start_time: dayjs("20:30", "HH:mm"), end_time: dayjs("22:00", "HH:mm"), assistant_teachers: [] },
                        ],
                        first_lesson_schedule_template: [
                            { weekday: 1, start_time: dayjs("19:00", "HH:mm"), end_time: dayjs("20:30", "HH:mm"), assistant_teachers: [] },
                            { weekday: 6, start_time: dayjs("19:00", "HH:mm"), end_time: dayjs("20:30", "HH:mm"), assistant_teachers: [] },
                        ],
                        second_lesson_schedule_template: [
                            { weekday: 2, start_time: dayjs("19:00", "HH:mm"), end_time: dayjs("20:30", "HH:mm"), assistant_teachers: [] },
                            { weekday: 4, start_time: dayjs("19:00", "HH:mm"), end_time: dayjs("20:30", "HH:mm"), assistant_teachers: [] },
                        ],
                        blocks: [],
                    }}
                    onValuesChange={() => { setHmoSyncNotes({}); setPreview([]); setPayload(null); }}
                >
                    <Space align="start" wrap>
                        <Form.Item name="system_type" label="Hệ thống" rules={[{ required: true }]}>
                            <Select
                                style={{ width: 150 }}
                                options={[{ value: "topclass", label: "Topclass" }, { value: "topuni", label: "Topuni" }]}
                                onChange={(value) => {
                                    if (value === "topuni") {
                                        const blocks = form.getFieldValue("blocks") || [];
                                        form.setFieldValue("blocks", blocks.map((block: any) => ({
                                            ...block,
                                            lessons: (block.lessons || []).map((lesson: any) => ({
                                                ...lesson,
                                                sessions: (lesson.sessions || []).slice(0, 1),
                                            })),
                                        })));
                                        message.info("Topuni chỉ tạo một buổi cho mỗi bài");
                                    }
                                    setPreview([]);
                                    setPayload(null);
                                }}
                            />
                        </Form.Item>
                        <Form.Item name="strategy" label="Cách xếp" rules={[{ required: true }]}>
                            <Select style={{ width: 230 }} options={[{ value: "interleaved", label: "Xen kẽ trong Block" }, { value: "by_block", label: "Lần lượt từng bài" }]} />
                        </Form.Item>
                        <Form.Item label="Chia Block">
                            <Space.Compact>
                                <Select value={blockSize} style={{ width: 160 }} onChange={(value: 1 | 2) => setBlockSize(value)} options={[{ value: 1, label: "1 bài / Block" }, { value: 2, label: "2 bài / Block" }]} />
                                <Button disabled={remainingCount === 0} onClick={() => divideIntoBlocks(lessons, blockSize)}>Chia lại</Button>
                            </Space.Compact>
                        </Form.Item>
                        <Form.Item label="Số bài muốn tạo">
                            <InputNumber
                                min={remainingCount > 0 ? 1 : 0}
                                max={remainingCount}
                                value={lessonLimit}
                                disabled={remainingCount === 0}
                                style={{ width: 150 }}
                                onChange={(value) => {
                                    const nextValue = Math.min(
                                        remainingCount,
                                        Math.max(remainingCount > 0 ? 1 : 0, Number(value) || 0)
                                    );
                                    setLessonLimit(nextValue);
                                    divideIntoBlocks(lessons, blockSize, nextValue);
                                }}
                            />
                        </Form.Item>
                        <Form.Item name="start_date" label="Ngày bắt đầu" rules={[{ required: true }]}>
                            <DatePicker format="DD/MM/YYYY" />
                        </Form.Item>
                        <Form.Item name="holidays" label="Ngày nghỉ (DD/MM/YYYY, cách nhau dấu phẩy)">
                            <Input style={{ width: 320 }} placeholder="19/12/2026, 01/01/2027" />
                        </Form.Item>
                    </Space>

                    <Card size="small" style={{ marginBottom: 12, background: "#fafafa" }}>
                        <Form.Item name="customize_lesson_names" valuePropName="checked" style={{ marginBottom: 0 }}>
                            <Checkbox>Tạo tên hiển thị theo mẫu cho toàn bộ danh sách</Checkbox>
                        </Form.Item>
                        <Form.Item noStyle shouldUpdate={(previous, current) => (
                            previous.customize_lesson_names !== current.customize_lesson_names
                        )}>
                            {({ getFieldValue }) => getFieldValue("customize_lesson_names") && (
                                <>
                                    <Space wrap align="end" size={12} style={{ display: "flex", marginTop: 12 }}>
                                        <Form.Item
                                            name="lesson_name_prefix"
                                            label="Đoạn phía trước"
                                            rules={[{ max: 100, message: "Đoạn phía trước không được quá 100 ký tự" }]}
                                            style={{ flex: "1 1 260px", marginBottom: 0 }}
                                        >
                                            <Input placeholder="Ví dụ: [Lịch {n}] - " maxLength={100} />
                                        </Form.Item>
                                        <Form.Item
                                            name="lesson_name_suffix"
                                            label="Đoạn phía sau"
                                            rules={[{ max: 100, message: "Đoạn phía sau không được quá 100 ký tự" }]}
                                            style={{ flex: "1 1 260px", marginBottom: 0 }}
                                        >
                                            <Input placeholder="Ví dụ: - Lần {n}" maxLength={100} />
                                        </Form.Item>
                                    </Space>
                                    <Typography.Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                                        Dùng <Typography.Text code>{"{n}"}</Typography.Text> để tự tăng theo số lần của từng bài:
                                        lần đầu giữ nguyên tên, từ lần 2 mới áp dụng mẫu.
                                    </Typography.Text>
                                    <Form.List name="lesson_name_rules">
                                        {(fields, { add, remove }) => (
                                            <Card size="small" title="Mẫu tên theo khoảng bài" style={{ marginTop: 12 }}>
                                                <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                                                    Từ buổi thứ 2: bài trong khoảng dùng mẫu riêng, bài ngoài khoảng dùng mẫu chung phía trên. Buổi đầu tiên luôn giữ nguyên tên bài. Các khoảng không được chồng lấn.
                                                </Typography.Text>
                                                <Space direction="vertical" style={{ width: "100%" }} size={8}>
                                                    {fields.map((field, index) => (
                                                        <Space key={field.key} align="end" wrap style={{ width: "100%" }}>
                                                            <Form.Item name={[field.name, "from_learn_number"]} label="Từ bài" rules={[{ required: true, message: "Nhập bài bắt đầu" }]} style={{ marginBottom: 0 }}>
                                                                <InputNumber min={1} precision={0} style={{ width: 100 }} />
                                                            </Form.Item>
                                                            <Form.Item name={[field.name, "to_learn_number"]} label="Đến bài" dependencies={[["lesson_name_rules", field.name, "from_learn_number"]]} rules={[
                                                                { required: true, message: "Nhập bài kết thúc" },
                                                                ({ getFieldValue }) => ({
                                                                    validator: (_, value) => Number(value) >= Number(getFieldValue(["lesson_name_rules", field.name, "from_learn_number"]))
                                                                        ? Promise.resolve()
                                                                        : Promise.reject(new Error("Phải lớn hơn hoặc bằng bài bắt đầu")),
                                                                }),
                                                            ]} style={{ marginBottom: 0 }}>
                                                                <InputNumber min={1} precision={0} style={{ width: 100 }} />
                                                            </Form.Item>
                                                            <Form.Item name={[field.name, "prefix"]} label="Tiền tố" rules={[{ max: 100 }]} style={{ flex: "1 1 180px", marginBottom: 0 }}>
                                                                <Input placeholder="Ví dụ: [Lịch {n}] - " maxLength={100} />
                                                            </Form.Item>
                                                            <Form.Item name={[field.name, "suffix"]} label="Hậu tố" rules={[{ max: 100 }]} style={{ flex: "1 1 180px", marginBottom: 0 }}>
                                                                <Input placeholder="Ví dụ: - Nhóm A" maxLength={100} />
                                                            </Form.Item>
                                                            <Button danger type="text" onClick={() => remove(field.name)}>Xóa</Button>
                                                        </Space>
                                                    ))}
                                                    <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({})}>Thêm khoảng bài</Button>
                                                </Space>
                                            </Card>
                                        )}
                                    </Form.List>
                                </>
                            )}
                        </Form.Item>
                    </Card>

                    <Card
                        size="small"
                        title="Mẫu lịch theo Block"
                        extra={<Typography.Text type="secondary">Gồm thời gian và nhân sự giảng dạy</Typography.Text>}
                        style={{ marginBottom: 12 }}
                    >
                        <Form.Item name="template_mode" label="Cách dùng mẫu" initialValue="common" style={{ marginBottom: 12 }}>
                            <Select style={{ width: 300 }} options={[
                                { value: "common", label: "Một mẫu cho mọi Block" },
                                { value: "odd_even", label: "Mẫu Block lẻ và Block chẵn khác nhau" },
                                { value: "within_block", label: "Xen kẽ Bài 1/Bài 2 khi Block có 2 bài" },
                            ]} />
                        </Form.Item>
                        <Form.Item noStyle shouldUpdate={(previous, current) => previous.template_mode !== current.template_mode}>
                            {({ getFieldValue }) => getFieldValue("template_mode") === "odd_even" ? (
                                <>
                                    {renderTemplateFields("odd_schedule_template", "Mẫu Block lẻ (Block 1, 3, 5...)")}
                                    {renderTemplateFields("even_schedule_template", "Mẫu Block chẵn (Block 2, 4, 6...)")}
                                </>
                            ) : getFieldValue("template_mode") === "within_block" ? (
                                <>
                                    {renderTemplateFields("first_lesson_schedule_template", "Mẫu Bài 1 trong Block (ví dụ Thứ 2, Thứ 7)")}
                                    {renderTemplateFields("second_lesson_schedule_template", "Mẫu Bài 2 trong Block (ví dụ Thứ 3, Thứ 5)")}
                                </>
                            ) : renderTemplateFields("schedule_template", "Mẫu chung")}
                        </Form.Item>
                        <Button type="primary" onClick={() => void applyScheduleTemplateToAllLessons()} disabled={remainingCount === 0}>
                            Áp dụng mẫu cho tất cả Block
                        </Button>
                    </Card>

                    {!!lessons.length && (
                        <Alert
                            showIcon
                            type={remainingCount > 0 ? "info" : "warning"}
                            style={{ marginBottom: 12 }}
                            message={`Chương trình có ${lessons.length} bài · ${assignedCount} bài đã được gán lịch · ${remainingCount} bài chưa có lịch`}
                            description={remainingCount > 0
                                ? `Hệ thống chỉ tạo cho bài chưa có lịch. Trong đó có ${pastCount} bài đã diễn ra; lần này đang chọn ${lessonLimit}/${remainingCount} bài còn lại.`
                                : "Tất cả bài đã được gán lịch nên không còn bài nào để tạo tự động."}
                        />
                    )}

                    {!!remainingCount && (
                        <Space wrap align="center" style={{ width: "100%", marginBottom: 12 }}>
                            <Button
                                type="primary"
                                ghost
                                icon={<SyncOutlined spin={syncingHmoLessonIds} />}
                                loading={syncingHmoLessonIds}
                                onClick={() => void handleSyncHmoLessonIds()}
                            >
                                Đồng bộ Lesson ID HMO
                            </Button>
                            <Typography.Text type="secondary">
                                Khớp theo tên bài, sắp Lesson ID tăng dần và gán lần lượt từ lịch trên xuống dưới. Chỉ tự gán khi số Lesson ID bằng đúng số lịch của bài.
                            </Typography.Text>
                        </Space>
                    )}

                    <Form.List name="blocks">
                        {(blockFields) => blockFields.length ? (
                            <Space direction="vertical" style={{ width: "100%" }}>
                                {blockFields
                                    .slice((blockPage - 1) * BLOCKS_PER_PAGE, blockPage * BLOCKS_PER_PAGE)
                                    .map((blockField) => {
                                    const blockIndex = blockField.name;
                                    return (
                                    <Card key={blockField.key} size="small" title={`Block ${blockIndex + 1}`}>
                                        <Form.List name={[blockField.name, "lessons"]}>
                                            {(lessonFields) => (
                                                <Space direction="vertical" style={{ width: "100%" }}>
                                                    {lessonFields.map((lessonField) => {
                                                        const lessonId = String(form.getFieldValue([
                                                            "blocks", blockField.name, "lessons", lessonField.name, "session_id",
                                                        ]) || "");
                                                        const outlineOptions = hmoOptions[lessonId] || [];
                                                        return (
                                                        <Card key={lessonField.key} type="inner" size="small">
                                                            <Form.Item name={[lessonField.name, "session_id"]} hidden><Input /></Form.Item>
                                                            <Space wrap>
                                                                <Form.Item name={[lessonField.name, "learn_number"]} label="Bài"><Input disabled style={{ width: 70 }} /></Form.Item>
                                                                <Form.Item name={[lessonField.name, "lesson_name"]} label="Tên bài"><Input disabled style={{ width: 360 }} /></Form.Item>
                                                            </Space>
                                                            {hmoSyncNotes[lessonId] && (
                                                                <Alert
                                                                    showIcon
                                                                    type={hmoSyncNotes[lessonId].type}
                                                                    message={hmoSyncNotes[lessonId].message}
                                                                    style={{ marginBottom: 12 }}
                                                                />
                                                            )}
                                                            <Form.List name={[lessonField.name, "sessions"]}>
                                                                {(sessionFields, { add, remove }) => (
                                                                    <Space direction="vertical" style={{ width: "100%" }}>
                                                                        {sessionFields.map((sessionField, sessionIndex) => (
                                                                            <Space key={sessionField.key} align="start" wrap>
                                                                                <Form.Item name={[sessionField.name, "weekday"]} label={`Buổi ${sessionIndex + 1}`} rules={[{ required: true }]}><Select style={{ width: 125 }} options={WEEKDAYS} /></Form.Item>
                                                                                <Form.Item name={[sessionField.name, "start_time"]} label="Bắt đầu" rules={[{ required: true }]}>
                                                                                    <TimePicker
                                                                                        format="HH:mm"
                                                                                        onChange={(startTime) => {
                                                                                            const endName = ["blocks", blockField.name, "lessons", lessonField.name, "sessions", sessionField.name, "end_time"];
                                                                                            if (isEndTimeInvalid(startTime, form.getFieldValue(endName))) form.setFieldValue(endName, undefined);
                                                                                        }}
                                                                                    />
                                                                                </Form.Item>
                                                                                <Form.Item noStyle shouldUpdate>
                                                                                    {({ getFieldValue }) => {
                                                                                        const startTime = getFieldValue(["blocks", blockField.name, "lessons", lessonField.name, "sessions", sessionField.name, "start_time"]);
                                                                                        return (
                                                                                            <Form.Item name={[sessionField.name, "end_time"]} label="Kết thúc" rules={[{ required: true }]}>
                                                                                                <TimePicker
                                                                                                    format="HH:mm"
                                                                                                    disabled={!startTime}
                                                                                                    disabledTime={() => getEndTimeDisabledTime(startTime)}
                                                                                                    defaultOpenValue={startTime || undefined}
                                                                                                />
                                                                                            </Form.Item>
                                                                                        );
                                                                                    }}
                                                                                </Form.Item>
                                                                                <Form.Item name={[sessionField.name, "teacher"]} label="Giáo viên">
                                                                                    <TeachingStaffSelect teacherType={1} teacherValueMode="displayName" allowClear placeholder="Chọn giáo viên" style={{ width: 220 }} />
                                                                                </Form.Item>
                                                                                <Form.Item name={[sessionField.name, "assistant_teachers"]} label="Trợ giảng">
                                                                                    <TeachingStaffSelect
                                                                                        teacherType={0}
                                                                                        mode="multiple"
                                                                                        allowClear
                                                                                        placeholder="Chọn một hoặc nhiều trợ giảng"
                                                                                        style={{ width: 360 }}
                                                                                        popupMatchSelectWidth={480}
                                                                                        maxTagCount="responsive"
                                                                                    />
                                                                                </Form.Item>
                                                                                <Form.Item name={[sessionField.name, "hmo_mapping_keys"]} label="Lesson ID HMO">
                                                                                    <Space direction="vertical" size={2} style={{ width: 520, maxWidth: "100%" }}>
                                                                                        <Select
                                                                                            mode="multiple"
                                                                                            allowClear
                                                                                            showSearch
                                                                                            loading={loadingHmoLessonIds.has(lessonId)}
                                                                                            style={{ width: "100%" }}
                                                                                            popupMatchSelectWidth={680}
                                                                                            listHeight={420}
                                                                                            placeholder={outlineOptions.length
                                                                                                ? "Chọn section lesson_id từ HMO"
                                                                                                : "Bài chưa có Course ID hoặc HMO không có section"}
                                                                                            options={buildGroupedHmoOptions(outlineOptions)}
                                                                                            tagRender={renderHmoSelectedTag}
                                                                                            optionFilterProp="label"
                                                                                            maxTagCount="responsive"
                                                                                        />
                                                                                        {!!outlineOptions.length && (
                                                                                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                                                                                {summarizeHmoOptions(outlineOptions)} — danh sách được nhóm theo Package/Course.
                                                                                            </Typography.Text>
                                                                                        )}
                                                                                    </Space>
                                                                                </Form.Item>
                                                                                {sessionFields.length > 1 && <Button danger type="text" onClick={() => remove(sessionField.name)} style={{ marginTop: 30 }}>Xóa</Button>}
                                                                            </Space>
                                                                        ))}
                                                                        <Form.Item noStyle shouldUpdate={(previous, current) => previous.system_type !== current.system_type}>
                                                                            {({ getFieldValue }) => getFieldValue("system_type") !== "topuni" && (
                                                                                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add({ weekday: 1, start_time: dayjs("19:00", "HH:mm"), end_time: dayjs("20:30", "HH:mm"), hmo_mapping_keys: [], assistant_teachers: [] })}>Thêm buổi cho bài này</Button>
                                                                            )}
                                                                        </Form.Item>
                                                                    </Space>
                                                                )}
                                                            </Form.List>
                                                        </Card>
                                                        );
                                                    })}
                                                </Space>
                                            )}
                                        </Form.List>
                                    </Card>
                                    );
                                })}
                                {blockFields.length > BLOCKS_PER_PAGE && (
                                    <Pagination
                                        current={blockPage}
                                        pageSize={BLOCKS_PER_PAGE}
                                        total={blockFields.length}
                                        showSizeChanger={false}
                                        onChange={setBlockPage}
                                        showTotal={(total) => `${total} Block · chỉ render ${BLOCKS_PER_PAGE} Block/trang`}
                                    />
                                )}
                            </Space>
                        ) : <Empty description={remainingCount === 0 ? "Tất cả bài đã được gán lịch" : "Chưa chọn bài để tạo Block"} />}
                    </Form.List>
                </Form>
            </Spin>

            {preview.length > 0 && (
                <>
                    <Typography.Title level={5} style={{ marginTop: 16 }}>Xem trước {preview.length} lịch</Typography.Title>
                    <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                        Hiển thị toàn bộ để kiểm tra trước khi xác nhận, không chia thành các trang.
                    </Typography.Text>
                    <Table size="small" rowKey={(_, index) => String(index)} pagination={false} scroll={{ x: "max-content" }} dataSource={preview} columns={[
                        { title: "Block", render: (_value, row) => Number(row.auto_schedule?.block_index ?? 0) + 1 },
                        { title: "Bài", dataIndex: "learn_number" },
                        { title: "Tên bài", dataIndex: "lesson_name" },
                        { title: "Lesson ID", render: (_value, row) => previewLessonIds(row) },
                        { title: "Giáo viên", dataIndex: "teacher", render: (value) => value || "-" },
                        { title: "Trợ giảng", dataIndex: "assistant_teacher", render: (value) => value || "-" },
                        { title: "Thứ", dataIndex: "start_time", render: (value) => previewWeekdayLabel(value) },
                        { title: "Bắt đầu", dataIndex: "start_time", render: (value) => dayjs(String(value).replace(/Z$/, "")).format("DD/MM/YYYY HH:mm") },
                        { title: "Kết thúc", dataIndex: "end_time", render: (value) => dayjs(String(value).replace(/Z$/, "")).format("DD/MM/YYYY HH:mm") },
                    ]} />
                </>
            )}
        </Modal>
    );
};

export default AutoScheduleModal;
