"use client";

import { PlusOutlined, SyncOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Checkbox, DatePicker, Empty, Form, Grid, Input, InputNumber, message, Modal, Progress, Select, Space, Spin, Table, TimePicker, Typography } from "antd";
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
import HmoMappingSelect from "@/components/shared/HmoMappingSelect";
import { buildGroupedHmoOptions, hmoOptionKey, summarizeHmoOptions } from "@/helper/hmoOptions";
import {
    hmoCourseMatchSummary,
    matchHmoLessonsByCourse,
    normalizeLessonTitle,
} from "@/helper/hmoLessonMatching";
import { useLessonProgramOptions } from "@/hooks/useLessonSubjectOptions";

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
type CreateProgress = {
    total: number;
    completed: number;
    percent: number;
    message: string;
};

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
const uniqueHmoOptions = (options: HocmaiSectionOption[]) => Array.from(new Map(
    options.map((option) => [hmoOptionKey(option), option])
).values());

const renderLessonNamePattern = (pattern: unknown, occurrence: number) => (
    String(pattern || "").replaceAll("{n}", String(occurrence))
);

const getCalendarLessonName = (lesson: any, occurrence: number, values: any) => {
    const masterLessonName = String(lesson.lesson_name || "");
    const perLessonPrefix = String(lesson.lesson_name_prefix || "");
    const perLessonSuffix = String(lesson.lesson_name_suffix || "");
    if (perLessonPrefix || perLessonSuffix) {
        return `${perLessonPrefix}${masterLessonName}${perLessonSuffix}`.slice(0, 400);
    }
    if (!values.customize_lesson_names || occurrence <= 1) return masterLessonName;

    const lessonRule = (values.lesson_name_rules || []).find((rule: any) => (
        Number(lesson.learn_number) >= Number(rule?.from_learn_number)
        && Number(lesson.learn_number) <= Number(rule?.to_learn_number)
    ));
    const prefix = lessonRule?.prefix ?? values.lesson_name_prefix;
    const suffix = lessonRule?.suffix ?? values.lesson_name_suffix;
    return `${renderLessonNamePattern(prefix, occurrence)}${masterLessonName}${renderLessonNamePattern(suffix, occurrence)}`.slice(0, 400);
};

const sortHmoOptionsByLessonId = (left: HocmaiSectionOption, right: HocmaiSectionOption) => (
    String(left.lesson_id).localeCompare(String(right.lesson_id), "vi", { numeric: true })
);

const previewWeekdayLabel = (value?: string) => {
    const day = dayjs(String(value || "").replace(/Z$/, "")).day();
    return day === 0 ? "Chủ nhật" : `Thứ ${day + 1}`;
};

const weekdayFromDate = (value: unknown) => {
    const date = dayjs(value as string | number | Date | Dayjs | null | undefined);
    if (!date.isValid()) return 1;
    return date.day() === 0 ? 7 : date.day();
};

const previewLessonIds = (row: any) => {
    if (row.auto_schedule?.preview_holiday || row.preview_only_holiday) return "-";
    const lessonIds = (row.package_lesson_mappings || [])
        .flatMap((mapping: any) => mapping.lesson_ids || [])
        .map((lessonId: unknown) => String(lessonId).trim())
        .filter(Boolean);
    return Array.from(new Set(lessonIds)).join(", ") || row.auto_schedule?.hmo_section_id || "-";
};

const isHolidayPreviewRow = (row: any) => Boolean(
    row?.auto_schedule?.preview_holiday || row?.preview_only_holiday
);

const addSkippedHolidayPreviewRows = (calendars: any[], payload: AutoSchedulePayload) => {
    const skippedHolidays = (payload.holiday_rules || [])
        .filter((rule) => rule.handling === "next_session")
        .map((rule) => rule.date);
    if (!calendars.length || !skippedHolidays.length) return calendars;
    const weekdays = new Set(payload.blocks.flatMap((block) => block.lessons.flatMap(
        (lesson) => lesson.sessions.map((session) => Number(session.weekday))
    )));
    const firstDate = dayjs(payload.start_date).startOf("day");
    const lastDate = calendars.reduce((latest, row) => {
        const value = dayjs(String(row.start_time || "").replace(/Z$/, ""));
        return value.isValid() && value.isAfter(latest) ? value : latest;
    }, firstDate);
    const holidayRows = skippedHolidays.flatMap((holiday) => {
        const date = dayjs(holiday, "YYYY-MM-DD", true);
        const weekday = date.day() === 0 ? 7 : date.day();
        if (!date.isValid() || date.isBefore(firstDate) || date.isAfter(lastDate, "day") || !weekdays.has(weekday)) return [];
        return [{
            preview_only_holiday: true,
            start_time: `${holiday}T00:00:00.000Z`,
            end_time: `${holiday}T00:00:00.000Z`,
            lesson_name: "Ngày nghỉ – buổi học được chuyển sang ngày kế tiếp",
        }];
    });
    return [...calendars, ...holidayRows].sort((left, right) => (
        String(left.start_time).localeCompare(String(right.start_time))
    ));
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

const singleSessionTemplate = (template: any[]) => (
    cloneScheduleTemplate(template).slice(0, 1).length
        ? cloneScheduleTemplate(template).slice(0, 1)
        : buildSessions(0).slice(0, 1)
);

const normalizeHolidayDates = (value: unknown) => String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
        const parsed = dayjs(item, ["DD/MM/YYYY", "YYYY-MM-DD"], true);
        if (!parsed.isValid()) throw new Error(`Ngày nghỉ ${item} không hợp lệ. Dùng định dạng DD/MM/YYYY`);
        return parsed.format("YYYY-MM-DD");
    });

const normalizeHolidayPeriods = (periods: any[]) => {
    const rules = new Map<string, "create_canceled" | "next_session">();
    (periods || []).forEach((period, index) => {
        const range = period?.date_range;
        const start = Array.isArray(range) ? dayjs(range[0]).startOf("day") : null;
        const end = Array.isArray(range) ? dayjs(range[1]).startOf("day") : null;
        if (!start?.isValid() || !end?.isValid() || end.isBefore(start)) {
            throw new Error(`Đợt nghỉ ${index + 1} chưa có khoảng ngày hợp lệ`);
        }
        const handling = period?.handling === "next_session" ? "next_session" : "create_canceled";
        for (let cursor = start; !cursor.isAfter(end); cursor = cursor.add(1, "day")) {
            rules.set(cursor.format("YYYY-MM-DD"), handling);
        }
    });
    return [...rules].sort(([left], [right]) => left.localeCompare(right))
        .map(([date, handling]) => ({ date, handling }));
};

const buildTopuniTemplateSequence = (
    startDate: Dayjs | null | undefined,
    holidaysValue: unknown,
    templates: any[],
    count: number,
    weekInterval = 1
) => {
    const normalizedTemplates = cloneScheduleTemplate(templates);
    const byWeekday = new Map(normalizedTemplates.map((item) => [Number(item.weekday), item]));
    if (!startDate?.isValid() || !byWeekday.size || count <= 0) return [];
    const holidays = new Set(
        String(holidaysValue || "").split(",").map((item) => item.trim()).filter(Boolean)
            .map((item) => dayjs(item, ["DD/MM/YYYY", "YYYY-MM-DD"], true))
            .filter((item) => item.isValid())
            .map((item) => item.format("YYYY-MM-DD"))
    );
    const sequence: any[] = [];
    let cursor = startDate.startOf("day");
    let anchorWeek: Dayjs | null = null;
    for (let attempts = 0; sequence.length < count && attempts < 3660; attempts += 1) {
        const weekday = cursor.day() === 0 ? 7 : cursor.day();
        const template = byWeekday.get(weekday);
        const isHoliday = holidays.has(cursor.format("YYYY-MM-DD"));
        if (!anchorWeek && template && !isHoliday) {
            anchorWeek = cursor.subtract(weekday - 1, "day").startOf("day");
        }
        const candidateWeek = cursor.subtract(weekday - 1, "day").startOf("day");
        const weeksFromAnchor = anchorWeek ? candidateWeek.diff(anchorWeek, "week") : 0;
        const isActiveWeek = !anchorWeek
            || (weeksFromAnchor >= 0 && weeksFromAnchor % Math.max(1, Number(weekInterval) || 1) === 0);
        if (template && !isHoliday && isActiveWeek) {
            sequence.push({ ...template, assistant_teachers: [...(template.assistant_teachers || [])] });
        }
        cursor = cursor.add(1, "day");
    }
    return sequence;
};

const AutoScheduleModal = ({ open, programCode, onClose, onSuccess, fullscreen = false }: Props) => {
    const screens = Grid.useBreakpoint();
    const isDesktopPreview = Boolean(screens.md);
    const [form] = Form.useForm();
    const [lessons, setLessons] = useState<SchedulingLesson[]>([]);
    const [preview, setPreview] = useState<any[]>([]);
    const [payload, setPayload] = useState<AutoSchedulePayload | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingLessons, setLoadingLessons] = useState(false);
    const [loadedLessonsProgramCode, setLoadedLessonsProgramCode] = useState<string | null>(null);
    const [blockSize, setBlockSize] = useState<1 | 2>(2);
    const [lessonLimit, setLessonLimit] = useState(0);
    const [visibleBlockCount, setVisibleBlockCount] = useState(8);
    const [commitProgress, setCommitProgress] = useState<CreateProgress | null>(null);
    const [previewError, setPreviewError] = useState("");
    const [hmoOptions, setHmoOptions] = useState<Record<string, HocmaiSectionOption[]>>({});
    const [loadingHmoLessonIds, setLoadingHmoLessonIds] = useState<Set<string>>(new Set());
    const [syncingHmoLessonIds, setSyncingHmoLessonIds] = useState(false);
    const [hmoSyncNotes, setHmoSyncNotes] = useState<Record<string, { type: "success" | "warning"; message: string }>>({});
    const hmoSyncNameSource = Form.useWatch("hmo_sync_name_source", form) || "lesson";
    const requestedHmoLessonIds = useRef(new Set<string>());
    const hmoOptionsRef = useRef<Record<string, HocmaiSectionOption[]>>({});
    const hmoRequestPromises = useRef(new Map<string, Promise<HocmaiSectionOption[]>>());
    const previewRef = useRef<HTMLDivElement>(null);
    const previewErrorRef = useRef<HTMLDivElement>(null);

    // Lấy system_type từ Chương trình đã chọn
    const lessonPrograms = useLessonProgramOptions(Boolean(open && programCode));
    const selectedProgram = lessonPrograms.find((p) => p.subject_code === programCode);
    // Lịch tự động phải ưu tiên system_type trả về cùng đề cương đang tạo lịch.
    // Danh sách option chương trình có thể chưa tải xong hoặc bị giới hạn quyền,
    // nhưng lessons đã là nguồn dữ liệu bắt buộc của màn hình này.
    const programLessonsReady = loadedLessonsProgramCode === programCode;
    const programSystemType = programLessonsReady
        ? lessons.find((lesson) => lesson.system_type === "topuni")?.system_type
            || lessons.find((lesson) => lesson.system_type === "topclass")?.system_type
            || selectedProgram?.system_type
            || "topclass"
        : null;
    const selectedSystemType = Form.useWatch("system_type", form);
    const isTopuni = selectedSystemType === "topuni" || programSystemType === "topuni";

    const templateHolidayDates = () => {
        try {
            return normalizeHolidayPeriods(form.getFieldValue("holiday_periods") || [])
                .filter((rule) => rule.handling === "next_session")
                .map((rule) => rule.date)
                .join(",");
        } catch {
            return "";
        }
    };

    useEffect(() => {
        if (!preview.length) return;
        const frame = requestAnimationFrame(() => {
            previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return () => cancelAnimationFrame(frame);
    }, [preview.length]);

    useEffect(() => {
        if (!previewError) return;
        const frame = requestAnimationFrame(() => {
            previewErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        return () => cancelAnimationFrame(frame);
    }, [previewError]);

    // Việc tạo lịch được lưu đồng thời sau khi backend xử lý xong. Trong lúc
    // chờ, thanh tiến trình tăng dần và dừng ở 92% cho tới khi có kết quả thật.
    useEffect(() => {
        if (!commitProgress || commitProgress.completed > 0) return;
        const timer = window.setInterval(() => {
            setCommitProgress((current) => {
                if (!current || current.completed > 0 || current.percent >= 92) return current;
                const increment = current.percent < 55 ? 4 : current.percent < 78 ? 2 : 1;
                return { ...current, percent: Math.min(92, current.percent + increment) };
            });
        }, 650);
        return () => window.clearInterval(timer);
    }, [commitProgress?.completed, commitProgress?.total]);


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
        if (form.getFieldValue("system_type") === "topuni") {
            const selectedWeekdays = new Set<number>(
                (form.getFieldValue("topuni_weekdays") || []).map(Number)
            );
            const template = cloneScheduleTemplate(form.getFieldValue("schedule_template") || [])
                .filter((item) => selectedWeekdays.has(Number(item.weekday)));
            return template.length ? template : singleSessionTemplate([]);
        }
        const mode = form.getFieldValue("template_mode") === "within_block" ? "within_block" : "common";
        const fieldName = mode === "within_block"
                ? (lessonIndex % 2 === 0 ? "first_lesson_schedule_template" : "second_lesson_schedule_template")
                : "schedule_template";
        const template = cloneScheduleTemplate(form.getFieldValue(fieldName) || []);
        const sessions = template.length ? template : null;
        return sessions;
    };

    const syncTopuniScheduleWeekdays = (checked: Array<number | string>) => {
        const weekdays = Array.from(new Set(checked.map(Number)))
            .filter((value) => Number.isInteger(value) && value >= 1 && value <= 7)
            .sort((left, right) => left - right);
        const current = cloneScheduleTemplate(form.getFieldValue("schedule_template") || []);
        const fallback = current[0] || buildSessions(0)[0];
        const scheduleTemplate = weekdays.map((weekday) => (
            current.find((item) => Number(item.weekday) === weekday)
            || { ...fallback, weekday, assistant_teachers: [...(fallback.assistant_teachers || [])] }
        ));
        form.setFieldsValue({ topuni_weekdays: weekdays, schedule_template: scheduleTemplate });
        setPreview([]);
        setPreviewError("");
        setPayload(null);
    };

    const divideIntoBlocks = (source: SchedulingLesson[], size: 1 | 2, requestedLimit = lessonLimit) => {
        const currentBlocks = form.getFieldValue("blocks") || [];
        const mappingKeysByLesson = new Map<string, string[][]>();
        currentBlocks.forEach((block: any) => (block.lessons || []).forEach((lesson: any) => {
            mappingKeysByLesson.set(
                String(lesson.session_id || lesson.learn_number),
                (lesson.sessions || []).map((session: any) => session.hmo_mapping_keys || [])
            );
        }));
        const remaining = source.filter((lesson) => Number(lesson.scheduled_count || 0) === 0);
        const topuni = form.getFieldValue("system_type") === "topuni";
        const normalizedLimit = Math.min(
            remaining.length,
            topuni ? remaining.length : Math.max(0, Number(requestedLimit) || 0)
        );
        const available = remaining.slice(0, normalizedLimit);
        const blocks = [];
        const effectiveSize = topuni ? 1 : size;
        const topuniSequence = topuni
            ? buildTopuniTemplateSequence(
                form.getFieldValue("start_date"),
                templateHolidayDates(),
                getScheduleTemplate(0, 0) || [],
                available.length,
                Number(form.getFieldValue("topuni_week_interval") || 1)
            )
            : [];
        for (let index = 0; index < available.length; index += effectiveSize) {
            const blockLessons = available.slice(index, index + effectiveSize);
            blocks.push({
                block_name: `Block ${blocks.length + 1}`,
                lessons: blockLessons.map((lesson, lessonIndex) => ({
                    learn_number: lesson.learn_number,
                    session_id: lesson.id,
                    lesson_name: lesson.lesson_name,
                    sessions: (topuni
                        ? [topuniSequence[index + lessonIndex] || buildSessions(lessonIndex)[0]]
                        : getScheduleTemplate(blocks.length, lessonIndex) || buildSessions(lessonIndex)
                    ).map((session: any, sessionIndex: number) => ({
                        ...session,
                        hmo_mapping_keys: mappingKeysByLesson
                            .get(String(lesson.id || lesson.learn_number))?.[sessionIndex] || session.hmo_mapping_keys || [],
                    })),
                })),
            });
        }
        form.setFieldValue("blocks", blocks);
        setHmoSyncNotes({});
        setPreview([]);
        setPreviewError("");
        setPayload(null);
    };

    const applyScheduleTemplateToAllLessons = async () => {
        try {
            const mode = form.getFieldValue("template_mode") === "within_block" ? "within_block" : "common";
            await form.validateFields(mode === "within_block"
                    ? ["first_lesson_schedule_template", "second_lesson_schedule_template"]
                    : ["schedule_template"]);
            const blocks = form.getFieldValue("blocks") || [];
            const topuni = form.getFieldValue("system_type") === "topuni";
            const topuniSequence = topuni
                ? buildTopuniTemplateSequence(
                    form.getFieldValue("start_date"),
                    templateHolidayDates(),
                    form.getFieldValue("schedule_template") || [],
                    blocks.reduce((total: number, block: any) => total + (block.lessons || []).length, 0),
                    Number(form.getFieldValue("topuni_week_interval") || 1)
                )
                : [];
            let topuniLessonIndex = 0;
            form.setFieldValue("blocks", blocks.map((block: any, blockIndex: number) => ({
                ...block,
                lessons: (block.lessons || []).map((lesson: any, lessonIndex: number) => {
                    if (!topuni) {
                        return {
                            ...lesson,
                            sessions: cloneScheduleTemplate(getScheduleTemplate(blockIndex, lessonIndex) || []),
                        };
                    }
                    const currentMappingKeys = lesson.sessions?.[0]?.hmo_mapping_keys || [];
                    const session = topuniSequence[topuniLessonIndex++] || buildSessions(0)[0];
                    return {
                        ...lesson,
                        sessions: [{ ...session, hmo_mapping_keys: currentMappingKeys }],
                    };
                }),
            })));
            setHmoSyncNotes({});
            setPreview([]);
            setPayload(null);
            message.success(topuni
                ? "Đã áp dụng lịch tuần cho toàn bộ bài TopUni"
                : "Đã áp dụng lịch mẫu cho toàn bộ nhóm bài");
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
                setLoadedLessonsProgramCode(programCode);
                setLessonLimit(remainingCount);
                setVisibleBlockCount(8);
                setHmoOptions({});
                hmoOptionsRef.current = {};
                setHmoSyncNotes({});
                requestedHmoLessonIds.current.clear();
                const initialBlockSize: 1 | 2 = programSystemType === "topuni" ? 1 : 2;
                setBlockSize(initialBlockSize);
                divideIntoBlocks(rows, initialBlockSize, remainingCount);
            })
            .catch((error: any) => {
                if (!active) return;
                setLessons([]);
                setLoadedLessonsProgramCode(programCode);
                message.error(error?.message || "Không thể tải bài học của chương trình");
            })
            .finally(() => active && setLoadingLessons(false));
        return () => { active = false; };
        // form ổn định trong suốt vòng đời component.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, programCode]);

    // Tự động fill system_type từ Chương trình đã chọn
    useEffect(() => {
        if (!open || !programSystemType) return;
        form.setFieldValue("system_type", programSystemType);

        if (programSystemType === "topuni") {
            const remaining = lessons.filter((lesson) => Number(lesson.scheduled_count || 0) === 0).length;
            const startDate = form.getFieldValue("start_date");
            const weekday = weekdayFromDate(startDate);
            const currentTemplates = cloneScheduleTemplate(form.getFieldValue("schedule_template") || []);
            const fallback = currentTemplates[0] || buildSessions(0)[0];
            const configuredWeekdays = (form.getFieldValue("topuni_weekdays") || [])
                .map(Number)
                .filter((value: number) => Number.isInteger(value) && value >= 1 && value <= 7);
            const selectedWeekdays = configuredWeekdays.length ? configuredWeekdays : [weekday];
            form.setFieldsValue({
                strategy: "by_block",
                template_mode: "common",
                schedule_template: selectedWeekdays.map((selectedWeekday: number) => (
                    currentTemplates.find((item) => Number(item.weekday) === selectedWeekday)
                    || { ...fallback, weekday: selectedWeekday, assistant_teachers: [...(fallback.assistant_teachers || [])] }
                )),
                topuni_weekdays: selectedWeekdays,
            });
            setBlockSize(1);
            setLessonLimit(remaining);
            if (lessons.length) divideIntoBlocks(lessons, 1, remaining);
            setPreview([]);
            setPayload(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, programCode, programSystemType, lessons, form]);

    useEffect(() => {
        if (!open || !programCode) return;
        const visibleLessons = (form.getFieldValue("blocks") || [])
            .slice(0, visibleBlockCount)
            .flatMap((block: any) => block.lessons || []);
        let cancelled = false;
        let nextIndex = 0;
        const worker = async () => {
            while (!cancelled && nextIndex < visibleLessons.length) {
                const lesson = visibleLessons[nextIndex++];
                const lessonId = String(lesson.session_id || "");
                if (!lessonId || requestedHmoLessonIds.current.has(lessonId)) continue;
                try {
                    await loadHmoOptions(lessonId);
                } catch (error: any) {
                    if (!cancelled) {
                        message.error(error?.message || `Không thể tải Lesson ID HMO cho bài ${lesson.learn_number}`);
                    }
                }
            }
        };
        void Promise.all(Array.from(
            { length: Math.min(4, visibleLessons.length) },
            () => worker()
        ));
        return () => { cancelled = true; };
        // loadHmoOptions dùng cache/ref nội bộ để tránh gọi trùng API.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lessonLimit, lessons, open, programCode, visibleBlockCount]);

    const handleSyncHmoLessonIds = async () => {
        const blocks = form.getFieldValue("blocks") || [];
        const blockLessons = blocks.flatMap((block: any) => block.lessons || []);
        const syncNameSource = form.getFieldValue("hmo_sync_name_source") === "calendar"
            ? "calendar"
            : "lesson";
        if (!blockLessons.length) {
            message.warning("Chưa có bài học để đồng bộ Lesson ID HMO");
            return;
        }

        setSyncingHmoLessonIds(true);
        try {
            const optionsByLesson = new Map<string, HocmaiSectionOption[]>();
            const failedLessonIds = new Set<string>();
            let nextLessonIndex = 0;
            const loadWorker = async () => {
                while (nextLessonIndex < blockLessons.length) {
                    const lesson = blockLessons[nextLessonIndex++];
                    const lessonId = String(lesson.session_id || "");
                    if (!lessonId) continue;
                    try {
                        optionsByLesson.set(lessonId, await loadHmoOptions(lessonId));
                    } catch (error: any) {
                        failedLessonIds.add(lessonId);
                        optionsByLesson.set(lessonId, []);
                    }
                }
            };
            await Promise.all(Array.from(
                { length: Math.min(4, blockLessons.length) },
                () => loadWorker()
            ));

            let syncedCount = 0;
            let syncedSessionCount = 0;
            const notes: Record<string, { type: "success" | "warning"; message: string }> = {};
            const formValues = form.getFieldsValue();
            const nextBlocks = blocks.map((block: any) => ({
                ...block,
                lessons: (block.lessons || []).map((lesson: any) => {
                    const lessonId = String(lesson.session_id || "");
                    const availableOptions = uniqueHmoOptions(optionsByLesson.get(lessonId) || [])
                        .sort(sortHmoOptionsByLessonId);
                    const sessions = lesson.sessions || [];
                    const matchingRows = sessions.map((session: any, sessionIndex: number) => ({
                        key: String(sessionIndex),
                        title: syncNameSource === "calendar"
                            ? getCalendarLessonName(lesson, sessionIndex + 1, formValues)
                            : lesson.lesson_name,
                        teacher: session.teacher,
                    }));
                    const matching = matchHmoLessonsByCourse(availableOptions, matchingRows);
                    const courseIds = matching.courseIds;

                    if (failedLessonIds.has(lessonId)) {
                        notes[lessonId] = {
                            type: "warning",
                            message: "Không thể tải danh sách Lesson ID HMO của bài này. Hệ thống không thay đổi dữ liệu hiện tại; vui lòng thử đồng bộ lại.",
                        };
                        return lesson;
                    }

                    if (syncNameSource === "calendar") {
                        const syncErrors: string[] = [];
                        let assignedCount = 0;
                        const nextSessions = sessions.map((session: any, sessionIndex: number) => {
                            const calendarLessonName = getCalendarLessonName(lesson, sessionIndex + 1, formValues);
                            const rowMatches = matching.matchesByRow.get(String(sessionIndex));
                            const matchedCourseIds = courseIds.filter((courseId) => rowMatches?.has(courseId));

                            if (!normalizeLessonTitle(calendarLessonName)) {
                                syncErrors.push(`buổi ${sessionIndex + 1} chưa có tên lịch`);
                                return session;
                            }
                            if (!matchedCourseIds.length) {
                                syncErrors.push(`buổi ${sessionIndex + 1}: ${hmoCourseMatchSummary(matching)}`);
                                return session;
                            }

                            const selectedOptions = matchedCourseIds.flatMap((courseId) => (
                                rowMatches!.get(courseId)!.options
                            ));
                            assignedCount += 1;
                            syncedSessionCount += 1;
                            if (matchedCourseIds.length !== courseIds.length) {
                                syncErrors.push(`buổi ${sessionIndex + 1} chỉ gán ${matchedCourseIds.length}/${courseIds.length} Course; chưa gán: ${hmoCourseMatchSummary(matching, courseIds.filter((courseId) => !matchedCourseIds.includes(courseId)))}`);
                            }
                            return { ...session, hmo_mapping_keys: selectedOptions.map(hmoOptionKey) };
                        });

                        if (assignedCount > 0) syncedCount += 1;
                        notes[lessonId] = syncErrors.length
                            ? {
                                type: "warning",
                                message: `Đã gán ${assignedCount}/${sessions.length} lịch theo tên lịch học. ${syncErrors.join("; ")}.`,
                            }
                            : {
                                type: "success",
                                message: `Đã gán Lesson ID HMO theo tên cho ${assignedCount} lịch, không dùng thứ tự tăng dần.`,
                            };
                        return { ...lesson, sessions: nextSessions };
                    }

                    const matchedCourseIds = courseIds.filter(
                        (courseId) => matching.matchedRowCountByCourse.get(courseId) === sessions.length
                    );
                    if (matchedCourseIds.length > 0 && sessions.length > 0) {
                        syncedCount += 1;
                        syncedSessionCount += sessions.length;
                        notes[lessonId] = {
                            type: matchedCourseIds.length === courseIds.length ? "success" : "warning",
                            message: matchedCourseIds.length === courseIds.length
                                ? `Đã gán ${sessions.length} lịch theo tên bài và giáo viên trong từng Course.`
                                : `Đã gán ${sessions.length} lịch cho ${matchedCourseIds.length}/${courseIds.length} Course. Chưa gán: ${hmoCourseMatchSummary(matching, courseIds.filter((courseId) => !matchedCourseIds.includes(courseId)))}.`,
                        };
                        return {
                            ...lesson,
                            sessions: sessions.map((session: any, index: number) => ({
                                ...session,
                                hmo_mapping_keys: matchedCourseIds.flatMap((courseId) => {
                                    return matching.matchesByRow.get(String(index))!
                                        .get(courseId)!.options.map(hmoOptionKey);
                                }),
                            })),
                        };
                    }

                    notes[lessonId] = {
                        type: "warning",
                        message: `Bài có ${sessions.length} lịch. Đối chiếu theo từng Course: ${hmoCourseMatchSummary(matching)}. Mỗi Course cần ghép đủ ${sessions.length} Lesson ID không trùng nhau.`,
                    };
                    return lesson;
                }),
            }));

            form.setFieldsValue({ blocks: nextBlocks });
            form.setFields(nextBlocks.flatMap((block: any, blockIndex: number) => (
                (block.lessons || []).flatMap((lesson: any, lessonIndex: number) => (
                    (lesson.sessions || []).map((session: any, sessionIndex: number) => ({
                        name: ["blocks", blockIndex, "lessons", lessonIndex, "sessions", sessionIndex, "hmo_mapping_keys"],
                        value: session.hmo_mapping_keys || [],
                    }))
                ))
            )));
            setHmoSyncNotes(notes);
            setPreview([]);
            setPayload(null);
            if (syncedCount) {
                message.success(syncNameSource === "calendar"
                    ? `Đã đồng bộ Lesson ID HMO theo tên lịch học cho ${syncedSessionCount} lịch`
                    : `Đã đồng bộ Lesson ID HMO cho ${syncedCount}/${blockLessons.length} bài`);
            } else {
                message.warning("Không có bài nào đủ điều kiện tự đồng bộ Lesson ID HMO");
            }
        } finally {
            setSyncingHmoLessonIds(false);
        }
    };

    const buildPayload = async (): Promise<AutoSchedulePayload> => {
        const values = await form.validateFields();
        const topuniWeekdays: number[] = Array.from(new Set<number>(
            ((values.topuni_weekdays || []) as unknown[]).map((value) => Number(value))
        ))
            .filter((value) => Number.isInteger(value) && value >= 1 && value <= 7);
        const topuniWeekInterval = Number(values.topuni_week_interval || 1);
        if (values.system_type === "topuni" && ![1, 2].includes(topuniWeekInterval)) {
            throw new Error("Nhịp học TopUni chỉ hỗ trợ hàng tuần hoặc cách tuần.");
        }
        if (values.system_type === "topuni" && !topuniWeekdays.length) {
            throw new Error("Vui lòng chọn ít nhất một thứ học hàng tuần cho TopUni.");
        }
        const topuniSessions = values.system_type === "topuni"
            ? (values.schedule_template || []).filter(
                (session: any) => topuniWeekdays.includes(Number(session.weekday))
            )
            : [];
        if (values.system_type === "topuni" && topuniSessions.length !== topuniWeekdays.length) {
            throw new Error("Mỗi thứ học TopUni phải có đúng một khung giờ.");
        }
        if (values.system_type === "topuni") {
            const missingTeacher = topuniSessions.find(
                (session: any) => !String(session.teacher || "").trim()
            );
            if (missingTeacher) {
                const label = WEEKDAYS.find((item) => item.value === Number(missingTeacher.weekday))?.label;
                throw new Error(`Vui lòng chọn Giáo viên cho ${label || "ngày học TopUni"}.`);
            }
        }
        // Kiểm tra trực tiếp toàn bộ dữ liệu để mọi buổi của mọi bài đều có GV.
        for (const block of values.blocks || []) {
            for (const lesson of block.lessons || []) {
                const sessions = lesson.sessions || [];
                const missingTeacherIndex = sessions.findIndex(
                    (session: any) => !String(session.teacher || "").trim()
                );
                if (missingTeacherIndex >= 0) {
                    throw new Error(
                        `Vui lòng chọn Giáo viên cho Bài ${lesson.learn_number}, buổi ${missingTeacherIndex + 1}.`
                    );
                }
            }
        }
        const configuredTopuniLessons = new Map<string, any>(
            (values.blocks || []).flatMap((block: any) => block.lessons || [])
                .map((lesson: any) => [String(lesson.session_id), lesson])
        );
        const sourceBlocks = values.system_type === "topuni"
            ? [{
                block_name: "TopUni",
                lessons: lessons
                    .filter((lesson) => Number(lesson.scheduled_count || 0) === 0)
                    .map((lesson) => ({
                        learn_number: lesson.learn_number,
                        session_id: lesson.id,
                        lesson_name: lesson.lesson_name,
                        lesson_name_prefix: configuredTopuniLessons.get(String(lesson.id))?.lesson_name_prefix || "",
                        lesson_name_suffix: configuredTopuniLessons.get(String(lesson.id))?.lesson_name_suffix || "",
                        sessions: configuredTopuniLessons.get(String(lesson.id))?.sessions || [],
                    })),
            }]
            : (values.blocks || []);
        const holidayRules = normalizeHolidayPeriods(values.holiday_periods || []);
        return {
            program_code: programCode,
            system_type: values.system_type,
            strategy: values.system_type === "topuni" ? "by_block" : values.strategy,
            start_date: values.start_date.format("YYYY-MM-DD"),
            ...(values.system_type === "topuni" ? { topuni_weekdays: topuniWeekdays } : {}),
            ...(values.system_type === "topuni" ? { topuni_per_lesson_schedule: true } : {}),
            ...(values.system_type === "topuni" ? { topuni_week_interval: topuniWeekInterval } : {}),
            holidays: holidayRules.map((rule) => rule.date),
            holiday_rules: holidayRules,
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
            blocks: sourceBlocks.map((block: any, blockIndex: number) => ({
                block_name: block.block_name || `Block ${blockIndex + 1}`,
                lessons: (block.lessons || []).map((lesson: any) => ({
                    learn_number: Number(lesson.learn_number),
                    session_id: lesson.session_id,
                    lesson_name: lesson.lesson_name,
                    lesson_name_prefix: String(lesson.lesson_name_prefix || "").slice(0, 100),
                    lesson_name_suffix: String(lesson.lesson_name_suffix || "").slice(0, 100),
                    sessions: (lesson.sessions || [])
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
        setPreviewError("");
        try {
            const nextPayload = await buildPayload();
            const response: any = await previewAutoSchedule(nextPayload);
            setPayload(nextPayload);
            setPreview(addSkippedHolidayPreviewRows(response?.data?.calendars || [], nextPayload));
        } catch (error: any) {
            const firstError = Array.isArray(error?.errorFields) ? error.errorFields[0] : null;
            if (firstError?.name) {
                requestAnimationFrame(() => form.scrollToField(firstError.name, {
                    block: "center",
                    behavior: "smooth",
                }));
                message.error(firstError.errors?.[0] || "Vui lòng kiểm tra lại thông tin chưa hợp lệ");
            } else {
                setPreviewError(error?.message || "Không thể tạo bản xem trước");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCommit = async () => {
        if (!payload) return;
        setLoading(true);
        // Dòng ngày nghỉ chỉ phục vụ xem trước, không tính vào số lịch gửi tạo.
        const total = preview.filter((row) => !row.preview_only_holiday).length;
        setCommitProgress({
            total,
            completed: 0,
            percent: 6,
            message: `Hệ thống đang tạo ${total} lịch học...`,
        });
        try {
            const response: any = await commitAutoSchedule(payload);
            const completed = Array.isArray(response?.data?.calendars)
                ? response.data.calendars.length
                : total;
            setCommitProgress({
                total,
                completed,
                percent: 96,
                message: "Đã lưu lịch học. Đang tải lại danh sách...",
            });
            setPreview([]);
            setPayload(null);
            await onSuccess();
            setCommitProgress({
                total,
                completed,
                percent: 100,
                message: "Đã hoàn tất tạo lịch học.",
            });
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            onClose();
        } catch (error: any) {
            message.error(error?.message || "Không thể tạo lịch tự động");
        } finally {
            setLoading(false);
            setCommitProgress(null);
        }
    };

    const pastCount = lessons.filter((lesson) => Number(lesson.past_scheduled_count || 0) > 0).length;
    const assignedCount = lessons.filter((lesson) => Number(lesson.scheduled_count || 0) > 0).length;
    const remainingCount = Math.max(0, lessons.length - assignedCount);

    const renderTemplateFields = (name: string, title: string, lockToOneSession = false) => (
        <Card size="small" title={title} style={{ marginBottom: 10 }}>
            <Form.List name={name}>
                {(fields, { add, remove }) => (
                    <Space direction="vertical" style={{ width: "100%" }}>
                        {fields.map((field, index) => (
                            <Space key={field.key} align="start" wrap>
                                {lockToOneSession ? (
                                    <Form.Item label="Thứ học">
                                        <Typography.Text strong style={{ display: "inline-block", minWidth: 72, paddingTop: 5 }}>
                                            {WEEKDAYS.find((item) => item.value === Number(
                                                form.getFieldValue([name, field.name, "weekday"])
                                            ))?.label || `Ngày ${index + 1}`}
                                        </Typography.Text>
                                    </Form.Item>
                                ) : (
                                    <Form.Item name={[field.name, "weekday"]} label={`Buổi mẫu ${index + 1}`} rules={[{ required: true, message: "Chọn thứ học" }]}>
                                        <Select style={{ width: 125 }} options={WEEKDAYS} />
                                    </Form.Item>
                                )}
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
                                <Form.Item
                                    name={[field.name, "teacher"]}
                                    label="Giáo viên"
                                    rules={lockToOneSession ? [{ required: true, message: "Chọn giáo viên" }] : undefined}
                                >
                                    <TeachingStaffSelect
                                        teacherType={1}
                                        teacherValueMode="displayName"
                                        knownValues={(form.getFieldValue(name) || []).map((session: any) => session.teacher)}
                                        allowClear
                                        placeholder="Chọn giáo viên"
                                        style={{ width: 220 }}
                                    />
                                </Form.Item>
                                <Form.Item name={[field.name, "assistant_teachers"]} label="Trợ giảng">
                                    <TeachingStaffSelect
                                        teacherType={0}
                                        knownValues={(form.getFieldValue(name) || []).flatMap((session: any) => session.assistant_teachers || [])}
                                        mode="multiple"
                                        allowClear
                                        placeholder="Chọn một hoặc nhiều trợ giảng"
                                        style={{ width: 360 }}
                                        popupMatchSelectWidth={480}
                                        maxTagCount="responsive"
                                    />
                                </Form.Item>
                                {!lockToOneSession && fields.length > 1 && <Button danger type="text" onClick={() => remove(field.name)} style={{ marginTop: 30 }}>Xóa</Button>}
                            </Space>
                        ))}
                        {!lockToOneSession && (
                            <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => add({ weekday: 1, start_time: dayjs("19:00", "HH:mm"), end_time: dayjs("20:30", "HH:mm"), assistant_teachers: [] })}>
                                Thêm buổi vào mẫu
                            </Button>
                        )}
                    </Space>
                )}
            </Form.List>
        </Card>
    );

    return (
        <>
        <Modal
            rootClassName="schedule-responsive-modal"
            open={open}
            title={`Tạo lịch học tự động · ${programCode}`}
            width={fullscreen ? "100%" : 1100}
            style={fullscreen ? { top: 0, maxWidth: "none", paddingBottom: 0 } : undefined}
            styles={fullscreen ? { content: { height: "100dvh", display: "flex", flexDirection: "column" }, body: { flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" } } : undefined}
            onCancel={loading ? undefined : onClose}
            closable={!loading}
            maskClosable={!loading}
            footer={[
                <Button key="cancel" onClick={onClose} disabled={loading}>Đóng</Button>,
                <Button key="preview" loading={loading} disabled={!programSystemType || loadingLessons || remainingCount === 0} onClick={() => void handlePreview()}>Xem trước</Button>,
                <Button key="commit" type="primary" disabled={!preview.length} loading={loading} onClick={() => void handleCommit()}>
                    Xác nhận tạo {preview.length || ""} lịch
                </Button>,
            ]}
        >
            {!programSystemType ? (
                <div style={{ minHeight: fullscreen ? "calc(100dvh - 130px)" : 320, display: "grid", placeItems: "center" }}>
                    <Spin size="large" tip={`Đang xác định hệ thống của Chương trình ${programCode}...`}>
                        <div style={{ width: 360, height: 120 }} />
                    </Spin>
                </div>
            ) : <Spin spinning={loadingLessons}>
                <Form
                    className="responsive-modal-form responsive-schedule-form"
                    form={form}
                    layout="vertical"
                    initialValues={{
                        system_type: programSystemType,
                        strategy: "interleaved",
                        start_date: dayjs(),
                        topuni_weekdays: [],
                        topuni_week_interval: 1,
                        topuni_gap_weeks: 0,
                        holiday_handling: "create_canceled",
                        holiday_periods: [],
                        customize_lesson_names: false,
                        hmo_sync_name_source: "lesson",
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
                    onValuesChange={() => {
                        if (Object.keys(hmoSyncNotes).length) setHmoSyncNotes({});
                        if (preview.length) setPreview([]);
                        if (previewError) setPreviewError("");
                        if (payload) setPayload(null);
                    }}
                >
                    <Space align="start" wrap>
                        <Form.Item
                            name="system_type"
                            label="Hệ thống"
                            rules={[{ required: true }]}
                            tooltip={`Hệ thống được xác định tự động từ Chương trình ${programCode}`}
                        >
                            <Select
                                style={{ width: 150 }}
                                options={[{ value: "topclass", label: "Topclass" }, { value: "topuni", label: "Topuni" }]}
                                disabled
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
                        {!isTopuni && (
                            <>
                                <Form.Item name="strategy" label="Thứ tự lên lịch" rules={[{ required: true }]}>
                                    <Select style={{ width: 280 }} options={[{ value: "interleaved", label: "Xen kẽ hai bài trong từng nhóm" }, { value: "by_block", label: "Hoàn thành từng bài lần lượt" }]} />
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
                            </>
                        )}
                        <Form.Item name="start_date" label="Ngày bắt đầu" rules={[{ required: true }]}>
                            <DatePicker format="DD/MM/YYYY" />
                        </Form.Item>
                        {isTopuni && (
                            <>
                                <Form.Item
                                    name="topuni_weekdays"
                                    label="Thứ học"
                                    rules={[{ required: true, type: "array", min: 1, message: "Chọn ít nhất một thứ học" }]}
                                >
                                    <Checkbox.Group
                                        options={WEEKDAYS.map(({ value, label }) => ({
                                            value,
                                            label: label.replace("Thứ ", "T").replace("Chủ nhật", "CN"),
                                        }))}
                                        onChange={(checked) => syncTopuniScheduleWeekdays(checked as Array<number | string>)}
                                    />
                                </Form.Item>
                                <Form.Item
                                    name="topuni_gap_weeks"
                                    label="Số tuần nghỉ giữa hai lần học"
                                    tooltip="Nhập 0 để học hằng tuần; nhập 1 để nghỉ một tuần rồi học tuần kế tiếp."
                                >
                                    <InputNumber
                                        min={0}
                                        max={51}
                                        precision={0}
                                        addonAfter="tuần"
                                        style={{ width: 180 }}
                                        onChange={(value) => {
                                            form.setFieldValue("topuni_week_interval", Math.max(1, Number(value ?? 0) + 1));
                                            divideIntoBlocks(lessons, 1, lessons.filter(
                                                (lesson) => Number(lesson.scheduled_count || 0) === 0
                                            ).length);
                                        }}
                                    />
                                </Form.Item>
                            </>
                        )}
                    </Space>

                    <Card size="small" title="Các đợt nghỉ" style={{ marginBottom: 12 }}>
                            <Form.List name="holiday_periods">
                                {(fields, { add, remove }) => (
                                    <Space direction="vertical" size={8} style={{ width: "100%" }}>
                                        {fields.map((field, index) => (
                                            <Space key={field.key} wrap align="start">
                                                <Form.Item
                                                    name={[field.name, "date_range"]}
                                                    label={`Đợt ${index + 1}`}
                                                    rules={[{ required: true, message: "Chọn ngày hoặc khoảng ngày nghỉ" }]}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <DatePicker.RangePicker
                                                        format="DD/MM/YYYY"
                                                        allowEmpty={[false, false]}
                                                        placeholder={["Từ ngày", "Đến ngày"]}
                                                    />
                                                </Form.Item>
                                                <Form.Item
                                                    name={[field.name, "handling"]}
                                                    label="Cách xử lý"
                                                    initialValue="create_canceled"
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <Select
                                                        style={{ width: 330 }}
                                                        options={[
                                                            { value: "create_canceled", label: "Tạo lịch ngày nghỉ và đánh dấu Nghỉ" },
                                                            { value: "next_session", label: "Không tạo ngày nghỉ, giữ nguyên thứ tự bài" },
                                                        ]}
                                                    />
                                                </Form.Item>
                                                <Button danger type="text" onClick={() => remove(field.name)} style={{ marginTop: 30 }}>
                                                    Xóa
                                                </Button>
                                            </Space>
                                        ))}
                                        <Button
                                            type="dashed"
                                            icon={<PlusOutlined />}
                                            onClick={() => add({ date_range: null, handling: "create_canceled" })}
                                            style={{ alignSelf: "flex-start" }}
                                        >
                                            Thêm ngày hoặc đợt nghỉ
                                        </Button>
                                        <Typography.Text type="secondary">
                                            Chọn cùng ngày ở hai đầu để tạo nghỉ một ngày; chọn một khoảng để nhập nhanh nhiều ngày liên tiếp.
                                        </Typography.Text>
                                    </Space>
                                )}
                            </Form.List>
                    </Card>

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
                        title={isTopuni ? "Lịch học hằng tuần" : "Thiết lập lịch cho từng nhóm bài"}
                        extra={<Typography.Text type="secondary">{isTopuni ? "Một buổi áp dụng cho mỗi bài" : "Gồm thời gian và nhân sự giảng dạy"}</Typography.Text>}
                        style={{ marginBottom: 12 }}
                    >
                        {isTopuni ? (
                            <>
                                <Typography.Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                                    Mỗi thứ đã chọn có thể dùng khung giờ và nhân sự riêng. Các bài sẽ lần lượt chạy theo lịch tuần này, mỗi bài đúng một buổi.
                                </Typography.Text>
                                {renderTemplateFields("schedule_template", "Khung giờ theo thứ", true)}
                            </>
                        ) : (
                            <>
                                <Form.Item name="template_mode" label="Cách áp dụng lịch mẫu" initialValue="common" style={{ marginBottom: 12 }}>
                                    <Select style={{ width: 300 }} options={[
                                        { value: "common", label: "Dùng chung cho tất cả nhóm bài" },
                                        { value: "within_block", label: "Đặt riêng cho hai bài trong nhóm" },
                                    ]} />
                                </Form.Item>
                                <Form.Item noStyle shouldUpdate={(previous, current) => previous.template_mode !== current.template_mode}>
                                    {({ getFieldValue }) => getFieldValue("template_mode") === "within_block" ? (
                                        <>
                                            {renderTemplateFields("first_lesson_schedule_template", "Lịch mẫu cho bài thứ nhất (ví dụ Thứ 2, Thứ 7)")}
                                            {renderTemplateFields("second_lesson_schedule_template", "Lịch mẫu cho bài thứ hai (ví dụ Thứ 3, Thứ 5)")}
                                        </>
                                    ) : renderTemplateFields("schedule_template", "Mẫu chung")}
                                </Form.Item>
                            </>
                        )}
                        <Button type="primary" onClick={() => void applyScheduleTemplateToAllLessons()} disabled={remainingCount === 0}>
                            {isTopuni ? "Áp dụng lịch tuần cho tất cả bài" : "Áp dụng lịch mẫu cho tất cả nhóm bài"}
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
                        <div className="auto-schedule-sync-controls" style={{ width: "100%", marginBottom: 12 }}>
                            <Space wrap align="end">
                                <Form.Item name="hmo_sync_name_source" label="Đồng bộ theo" style={{ marginBottom: 0, minWidth: 280 }}>
                                    <Select options={[
                                        { value: "calendar", label: "Tên lịch học (calendar)" },
                                        { value: "lesson", label: "Tên bài học (lessons)" },
                                    ]} />
                                </Form.Item>
                                <Button
                                    type="primary"
                                    ghost
                                    icon={<SyncOutlined spin={syncingHmoLessonIds} />}
                                    loading={syncingHmoLessonIds}
                                    onClick={() => void handleSyncHmoLessonIds()}
                                >
                                    Đồng bộ Lesson ID HMO
                                </Button>
                            </Space>
                            <Typography.Text type="secondary" style={{ display: "block", marginTop: 6 }}>
                                {hmoSyncNameSource === "calendar"
                                    ? "Theo tên lịch học: hệ thống lấy tên hiển thị của từng buổi sắp tạo (bao gồm tiền tố, hậu tố và số thứ tự nếu có), rồi chỉ gán khi tìm thấy đúng một Lesson ID HMO cùng tên."
                                    : "Theo tên bài học: hệ thống dùng tên bài trong Quản lý đề cương, sắp Lesson ID HMO theo thứ tự tăng dần và gán lần lượt. Chỉ tự gán khi số Lesson ID khớp với số buổi của bài."}
                            </Typography.Text>
                        </div>
                    )}

                    {isTopuni && (
                        <Form.List name="blocks">
                            {(blockFields) => blockFields.length ? (
                                <Space direction="vertical" style={{ width: "100%" }}>
                                    {blockFields.slice(0, visibleBlockCount).map((blockField) => {
                                        const firstLesson = form.getFieldValue([
                                            "blocks", blockField.name, "lessons", 0,
                                        ]) || {};
                                        return (
                                        <Card
                                            key={blockField.key}
                                            size="small"
                                            title={`Bài ${firstLesson.learn_number || Number(blockField.name) + 1}${firstLesson.lesson_name ? ` - ${firstLesson.lesson_name}` : ""}`}
                                        >
                                        <Form.List name={[blockField.name, "lessons"]}>
                                            {(lessonFields) => lessonFields.map((lessonField) => {
                                                const lessonId = String(form.getFieldValue([
                                                    "blocks", blockField.name, "lessons", lessonField.name, "session_id",
                                                ]) || "");
                                                const outlineOptions = hmoOptions[lessonId] || [];
                                                return (
                                                    <div
                                                        key={lessonField.key}
                                                    >
                                                        <Form.Item name={[lessonField.name, "session_id"]} hidden><Input /></Form.Item>
                                                        <Form.Item name={[lessonField.name, "learn_number"]} hidden><Input /></Form.Item>
                                                        <Form.Item name={[lessonField.name, "lesson_name"]} hidden><Input /></Form.Item>
                                                        <Space wrap align="start" size={16} style={{ width: "100%" }}>
                                                            <Form.Item
                                                                name={[lessonField.name, "lesson_name_prefix"]}
                                                                label="Tiền tố"
                                                                rules={[{ max: 100, message: "Tiền tố tối đa 100 ký tự" }]}
                                                                style={{ marginBottom: 0 }}
                                                            >
                                                                <Input style={{ width: 200 }} maxLength={100} placeholder="VD: [Lịch riêng] - " />
                                                            </Form.Item>
                                                            <Form.Item
                                                                name={[lessonField.name, "lesson_name_suffix"]}
                                                                label="Hậu tố"
                                                                rules={[{ max: 100, message: "Hậu tố tối đa 100 ký tự" }]}
                                                                style={{ marginBottom: 0 }}
                                                            >
                                                                <Input style={{ width: 200 }} maxLength={100} placeholder="VD: - Buổi bổ sung" />
                                                            </Form.Item>
                                                        </Space>
                                                        {hmoSyncNotes[lessonId] && (
                                                            <Alert
                                                                showIcon
                                                                type={hmoSyncNotes[lessonId].type}
                                                                message={hmoSyncNotes[lessonId].message}
                                                                style={{ marginTop: 8 }}
                                                            />
                                                        )}
                                                        <Form.List name={[lessonField.name, "sessions"]}>
                                                            {(sessionFields) => sessionFields.slice(0, 1).map((sessionField) => (
                                                                <Space key={sessionField.key} align="start" wrap style={{ width: "100%", marginTop: 8 }}>
                                                                    <Form.Item name={[sessionField.name, "weekday"]} label="Thứ" rules={[{ required: true, message: "Chọn thứ học" }]}>
                                                                        <Select style={{ width: 125 }} options={WEEKDAYS} />
                                                                    </Form.Item>
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
                                                                                    />
                                                                                </Form.Item>
                                                                            );
                                                                        }}
                                                                    </Form.Item>
                                                                    <Form.Item name={[sessionField.name, "teacher"]} label="Giáo viên" rules={[{ required: true, message: "Chọn giáo viên" }]}>
                                                                        <TeachingStaffSelect teacherType={1} teacherValueMode="displayName" allowClear placeholder="Chọn giáo viên" style={{ width: 220 }} />
                                                                    </Form.Item>
                                                                    <Form.Item name={[sessionField.name, "assistant_teachers"]} label="Trợ giảng">
                                                                        <TeachingStaffSelect
                                                                            teacherType={0}
                                                                            mode="multiple"
                                                                            allowClear
                                                                            placeholder="Chọn một hoặc nhiều trợ giảng"
                                                                            style={{ width: 300 }}
                                                                            popupMatchSelectWidth={480}
                                                                            maxTagCount="responsive"
                                                                        />
                                                                    </Form.Item>
                                                                    <Form.Item name={[sessionField.name, "hmo_mapping_keys"]} label="Lesson ID HMO" style={{ width: 600, maxWidth: "100%" }}>
                                                                        <HmoMappingSelect
                                                                            allowClear
                                                                            showSearch
                                                                            loading={loadingHmoLessonIds.has(lessonId)}
                                                                            style={{ width: "100%" }}
                                                                            popupMatchSelectWidth={680}
                                                                            listHeight={420}
                                                                            placeholder={outlineOptions.length
                                                                                ? "Chọn Lesson ID từ HMO"
                                                                                : "Bài chưa có Course ID hoặc HMO không có Lesson ID"}
                                                                            options={buildGroupedHmoOptions(outlineOptions)}
                                                                            optionFilterProp="label"
                                                                        />
                                                                    </Form.Item>
                                                                </Space>
                                                            ))}
                                                        </Form.List>
                                                        {!!outlineOptions.length && (
                                                            <Typography.Text type="secondary" style={{ display: "block", marginTop: 4, fontSize: 12 }}>
                                                                {summarizeHmoOptions(outlineOptions)} — danh sách được nhóm theo Package/Course.
                                                            </Typography.Text>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </Form.List>
                                        </Card>
                                        );
                                    })}
                                    {blockFields.length > visibleBlockCount && (
                                        <Button
                                            block
                                            type="dashed"
                                            onClick={() => setVisibleBlockCount((count) => Math.min(blockFields.length, count + 8))}
                                        >
                                            Hiển thị thêm {Math.min(8, blockFields.length - visibleBlockCount)} bài
                                        </Button>
                                    )}
                                </Space>
                            ) : <Empty description={remainingCount === 0 ? "Tất cả bài đã được gán lịch" : "Chưa có bài để tạo lịch"} />}
                        </Form.List>
                    )}

                    {!isTopuni && <Form.List name="blocks">
                        {(blockFields) => blockFields.length ? (
                            <Space direction="vertical" style={{ width: "100%" }}>
                                {blockFields.slice(0, visibleBlockCount).map((blockField) => {
                                    const blockIndex = blockField.name;
                                    return (
                                    <Card
                                        key={blockField.key}
                                        size="small"
                                        title={`Nhóm ${blockIndex + 1}: ${(form.getFieldValue(["blocks", blockIndex, "lessons"]) || [])
                                            .map((lesson: any) => `Bài ${lesson.learn_number}`)
                                            .join(" và ")}`}
                                    >
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
                                                                                <Form.Item
                                                                                    name={[sessionField.name, "teacher"]}
                                                                                    label="Giáo viên"
                                                                                    rules={[{ required: true, message: "Chọn giáo viên" }]}
                                                                                >
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
                                                                                        <HmoMappingSelect
                                                                                            allowClear
                                                                                            showSearch
                                                                                            loading={loadingHmoLessonIds.has(lessonId)}
                                                                                            style={{ width: "100%" }}
                                                                                            popupMatchSelectWidth={680}
                                                                                            listHeight={420}
                                                                                            placeholder={outlineOptions.length
                                                                                                ? "Chọn Lesson ID từ HMO"
                                                                                                : "Bài chưa có Course ID hoặc HMO không có Lesson ID"}
                                                                                            options={buildGroupedHmoOptions(outlineOptions)}
                                                                                            optionFilterProp="label"
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
                                {blockFields.length > visibleBlockCount && (
                                    <Button
                                        block
                                        type="dashed"
                                        onClick={() => setVisibleBlockCount((count) => Math.min(blockFields.length, count + 8))}
                                    >
                                        Hiển thị thêm {Math.min(8, blockFields.length - visibleBlockCount)} nhóm bài
                                    </Button>
                                )}
                            </Space>
                        ) : <Empty description={remainingCount === 0 ? "Tất cả bài đã được gán lịch" : "Chưa có nhóm bài để tạo lịch"} />}
                    </Form.List>}
                </Form>
            </Spin>}

            {previewError && (
                <div ref={previewErrorRef} style={{ scrollMarginTop: 16 }}>
                    <Alert
                        showIcon
                        type="error"
                        message="Chưa thể tạo bản xem trước"
                        description={previewError}
                        style={{ marginTop: 16 }}
                    />
                </div>
            )}

            {preview.length > 0 && (
                <div ref={previewRef} style={{ scrollMarginTop: 16 }}>
                    <Typography.Title level={5} style={{ marginTop: 16 }}>
                        Xem trước {preview.filter((row) => !row.preview_only_holiday).length} lịch
                    </Typography.Title>
                    <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
                        Dòng màu đỏ có bài học sẽ được lưu ở trạng thái Nghỉ; dòng ghi “buổi học được chuyển” chỉ để xem và không được tạo.
                    </Typography.Text>
                    {isDesktopPreview ? <div className="auto-schedule-preview-desktop">
                        <Table size="small" rowKey={(_, index) => String(index)} pagination={false} scroll={{ x: "max-content" }} dataSource={preview} rowClassName={(row) => isHolidayPreviewRow(row) ? "auto-schedule-holiday-row" : ""} columns={[
                            { title: "Thứ", dataIndex: "start_time", render: (value, row) => `${isHolidayPreviewRow(row) ? "Nghỉ - " : ""}${previewWeekdayLabel(value)}` },
                            { title: "Ngày live", dataIndex: "start_time", render: (value) => dayjs(String(value).replace(/Z$/, "")).format("DD/MM/YYYY") },
                            {
                                title: "Khung giờ",
                                render: (_value, row) => row.preview_only_holiday ? "-" : `${dayjs(String(row.start_time).replace(/Z$/, "")).format("HH:mm")}–${dayjs(String(row.end_time).replace(/Z$/, "")).format("HH:mm")}`,
                            },
                            { title: "Bài", dataIndex: "learn_number" },
                            { title: "Tên bài", dataIndex: "lesson_name" },
                            { title: "Giáo viên", dataIndex: "teacher", render: (value) => value || "-" },
                            { title: "Trợ giảng", dataIndex: "assistant_teacher", render: (value) => value || "-" },
                            { title: "Lesson ID", render: (_value, row) => previewLessonIds(row) },
                        ]} />
                    </div> : <div className="auto-schedule-preview-mobile">
                        {preview.map((row, index) => (
                            <Card
                                key={`${row.id || row.start_time}-${index}`}
                                size="small"
                                style={isHolidayPreviewRow(row) ? { background: "#fff1f0", borderColor: "#ff7875" } : undefined}
                                title={<Typography.Text strong type={isHolidayPreviewRow(row) ? "danger" : undefined}>{row.lesson_name || `Bài ${row.learn_number}`}</Typography.Text>}
                                extra={!row.preview_only_holiday && <Typography.Text type="secondary">Bài {row.learn_number}</Typography.Text>}
                            >
                                <Space direction="vertical" size={6} style={{ width: "100%" }}>
                                    <Typography.Text type={isHolidayPreviewRow(row) ? "danger" : undefined}><Typography.Text type="secondary">Thời gian: </Typography.Text>{isHolidayPreviewRow(row) ? "Nghỉ - " : ""}{previewWeekdayLabel(row.start_time)} · {dayjs(String(row.start_time).replace(/Z$/, "")).format(row.preview_only_holiday ? "DD/MM/YYYY" : "DD/MM/YYYY HH:mm")}{!row.preview_only_holiday && ` – ${dayjs(String(row.end_time).replace(/Z$/, "")).format("HH:mm")}`}</Typography.Text>
                                    {!isHolidayPreviewRow(row) && <>
                                        <Typography.Text><Typography.Text type="secondary">Lesson ID HMO: </Typography.Text>{previewLessonIds(row)}</Typography.Text>
                                        <Typography.Text><Typography.Text type="secondary">Giáo viên: </Typography.Text>{row.teacher || "-"}</Typography.Text>
                                        <Typography.Text><Typography.Text type="secondary">Trợ giảng: </Typography.Text>{row.assistant_teacher || "-"}</Typography.Text>
                                    </>}
                                </Space>
                            </Card>
                        ))}
                    </div>}
                </div>
            )}
            <style jsx global>{`
                .auto-schedule-holiday-row > td {
                    background: #fff1f0 !important;
                    color: #cf1322 !important;
                }
            `}</style>
        </Modal>
        <Modal
            title="Tiến trình tạo lịch học"
            open={Boolean(commitProgress)}
            footer={null}
            closable={false}
            maskClosable={false}
            keyboard={false}
            width={520}
            zIndex={1200}
        >
            {commitProgress && (
                <div style={{ padding: "20px 4px 8px" }}>
                    <Typography.Text strong style={{ display: "block", marginBottom: 12 }}>
                        {commitProgress.message}
                    </Typography.Text>
                    <Progress
                        percent={commitProgress.percent}
                        status={commitProgress.percent === 100 ? "success" : "active"}
                    />
                    <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 8, background: "#f5f5f5" }}>
                        {commitProgress.completed > 0 ? (
                            <Typography.Text strong>
                                Đã tạo {commitProgress.completed}/{commitProgress.total} lịch học
                            </Typography.Text>
                        ) : (
                            <>
                                <Typography.Text>Đang tạo: {commitProgress.total} lịch học</Typography.Text>
                                <br />
                                <Typography.Text type="secondary">
                                    Vui lòng chờ trong giây lát. Hệ thống sẽ tự động lưu lịch khi hoàn tất.
                                </Typography.Text>
                            </>
                        )}
                    </div>
                </div>
            )}
        </Modal>
        </>
    );
};

export default AutoScheduleModal;
