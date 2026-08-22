'use client';

import React, { useEffect } from 'react';
import {
    Modal,
    Form,
    Radio,
    Select,
    TimePicker,
    Checkbox,
    DatePicker,
    Row,
    Col,
    Button,
    Typography,
    Space,
    Alert,
    Divider,
    Tag,
    Card,
    Input,
    InputNumber,
    Table,
    Segmented,
    Tooltip,
    message,
    Progress,
} from 'antd';
import { EditOutlined, CloseCircleOutlined, PlusOutlined, SyncOutlined, CalendarOutlined, ThunderboltOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import TeachingStaffSelect from '@/components/shared/TeachingStaffSelect';
import HmoMappingSelect from '@/components/shared/HmoMappingSelect';
import {
    buildGroupedHmoOptions,
    hmoOptionKey,
    summarizeHmoOptions,
    summarizeSelectedHmoMappings,
} from '@/helper/hmoOptions';
import {
    getHocmaiSectionsForSchedulingLesson,
    getProgramLessonsForScheduling,
    updateLivestreamBulk,
    type HocmaiSectionOption,
} from '@/services/livestreamService';

const { Text, Title } = Typography;

type SubmitProgress = {
    total: number;
    completed: number;
    percent: number;
    message: string;
};

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <fieldset
        style={{
            border: `1px solid rgba(0, 0, 0, 0.1)`,
            borderRadius: 6,
            padding: "20px 16px 16px 16px",
            marginBottom: 20,
            backgroundColor: "transparent",
        }}
    >
        <legend
            style={{
                padding: "0 8px",
                marginLeft: 12,
                fontSize: 14,
                fontWeight: 500,
                width: "auto",
                borderBottom: "none",
                marginBottom: 0,
                color: "#1890ff"
            }}
        >
            {title}
        </legend>
        {children}
    </fieldset>
);

const mappingKeyFromCalendarMapping = (mapping: any) => (
    `${String(mapping?.package_id || mapping?.package_ids?.[0] || '')}::${String(mapping?.course_id || '')}::${String(mapping?.lesson_id || mapping?.lesson_ids?.[0] || '')}`
);

const teacherValue = (value: unknown) => {
    if (value && typeof value === 'object') {
        const staff = value as { username?: unknown; display_name?: unknown; displayName?: unknown };
        return String(staff.username || staff.display_name || staff.displayName || '').trim() || undefined;
    }
    return String(value || '').trim() || undefined;
};

const assistantValues = (value: unknown) => {
    const values = Array.isArray(value) ? value : String(value || '').split(',');
    return Array.from(new Set(values
        .map((item: any) => teacherValue(item))
        .filter((item): item is string => Boolean(item))));
};

const normalizedMappingKeys = (mappings: any[] = []) => mappings
    .map(mappingKeyFromCalendarMapping)
    .filter((key: string) => !key.startsWith('::') && !key.endsWith('::'))
    .sort();

const sameStringArray = (left: string[] = [], right: string[] = []) => (
    [...left].sort().join('\u0000') === [...right].sort().join('\u0000')
);

const renderNamePattern = (pattern: unknown, occurrence: number) => (
    String(pattern || '').replaceAll('{n}', String(occurrence))
);

const DEFAULT_CANCELED_LESSON_PREFIX = '[Nghỉ] ';
const DEFAULT_MAKEUP_LESSON_PREFIX = '[Học Bù] ';

const formatRescheduledLessonName = (
    lessonName: unknown,
    prefix: unknown,
    suffix: unknown,
) => `${String(prefix ?? '')}${String(lessonName ?? '').trim()}${String(suffix ?? '')}`.trim();

const formatWeekday = (value: unknown) => {
    const date = dayjs(value as string | number | Date | Dayjs | null | undefined);
    if (!date.isValid()) return '-';
    return date.day() === 0 ? 'Chủ Nhật' : `Thứ ${date.day() + 1}`;
};

const renderPreviewChange = (current: unknown, next: unknown) => {
    const currentText = String(current || '-');
    const nextText = String(next || '-');
    if (currentText === nextText) return <Text>{currentText}</Text>;
    return (
        <Space direction="vertical" size={0} style={{ lineHeight: 1.35 }}>
            <Text delete type="secondary">{currentText}</Text>
            <Text strong style={{ color: '#1677ff' }}>{nextText}</Text>
        </Space>
    );
};

const renderMappingItems = (value: unknown, color?: string) => {
    const text = String(value || 'Chưa mapping');
    if (text === 'Chưa mapping' || text === 'Giữ nguyên' || text === 'Xóa toàn bộ Lesson ID') {
        return <Text style={color ? { color } : undefined}>{text}</Text>;
    }
    const items = text.split('; ').filter(Boolean);
    return (
        <Space direction="vertical" size={2} style={{ maxWidth: 320 }}>
            {items.map((item, index) => {
                const [lessonId, ...nameParts] = item.split(': ');
                const lessonName = nameParts.join(': ');
                return (
                    <Tooltip key={`${lessonId}-${index}`} title={lessonName || lessonId}>
                        <Tag color={color ? 'blue' : undefined} style={{ marginInlineEnd: 0, maxWidth: '100%', whiteSpace: 'normal' }}>
                            {lessonId}{lessonName ? ` · ${lessonName}` : ''}
                        </Tag>
                    </Tooltip>
                );
            })}
        </Space>
    );
};

const renderMappingPreviewChange = (current: unknown, next: unknown) => {
    const currentText = String(current || 'Chưa mapping');
    const nextText = String(next || 'Giữ nguyên');
    if (currentText === 'Chưa mapping' && nextText === 'Giữ nguyên') return <Text>Chưa mapping</Text>;
    if (currentText === nextText) return renderMappingItems(currentText);
    return (
        <Space direction="vertical" size={4} style={{ lineHeight: 1.35 }}>
            <div style={{ textDecoration: 'line-through', opacity: 0.62 }}>{renderMappingItems(currentText)}</div>
            <div>{renderMappingItems(nextText, '#1677ff')}</div>
        </Space>
    );
};

const normalizeLessonTitle = (value: unknown) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/^bai\s*\d+\s*[:.\-–—]*\s*/, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const uniqueHmoOptions = (options: HocmaiSectionOption[]) => Array.from(new Map(
    options.map((option) => [hmoOptionKey(option), option])
).values());

const hmoTitleMatchesByCourse = (
    options: HocmaiSectionOption[],
    normalizedTitle: string
) => {
    const matches = new Map<string, Map<string, HocmaiSectionOption[]>>();
    uniqueHmoOptions(options).forEach((option) => {
        if (normalizeLessonTitle(option.lesson_name) !== normalizedTitle) return;
        const byLessonId = matches.get(String(option.course_id)) || new Map<string, HocmaiSectionOption[]>();
        const lessonId = String(option.lesson_id);
        byLessonId.set(lessonId, [...(byLessonId.get(lessonId) || []), option]);
        matches.set(String(option.course_id), byLessonId);
    });
    return matches;
};

const hmoCourseIds = (options: HocmaiSectionOption[]) => Array.from(new Set(
    uniqueHmoOptions(options).map((option) => String(option.course_id))
));

const courseMatchSummary = (courseIds: string[], matches: Map<string, Map<string, HocmaiSectionOption[]>>) => (
    courseIds.map((courseId) => `Course ${courseId}: ${matches.get(courseId)?.size || 0} Lesson ID`).join('; ')
);

const getErrorMessage = (error: unknown) => {
    if (error && typeof error === 'object') {
        const detail = (error as { detail?: { message?: unknown } }).detail;
        const messageText = (error as { message?: unknown }).message;
        return String(detail?.message || messageText || 'Không thể cập nhật lịch học. Vui lòng thử lại.');
    }
    return 'Không thể cập nhật lịch học. Vui lòng thử lại.';
};

const getTimeMinutes = (time?: Dayjs | null) => {
    if (!time) return undefined;
    return time.hour() * 60 + time.minute();
};

const isEndAfterStart = (startTime?: Dayjs | null, endTime?: Dayjs | null) => {
    const startMinutes = getTimeMinutes(startTime);
    const endMinutes = getTimeMinutes(endTime);
    if (startMinutes === undefined || endMinutes === undefined) return true;
    return endMinutes > startMinutes;
};

const getEndDisabledTime = (startTime?: Dayjs | null) => {
    if (!startTime) return {};

    const startHour = startTime.hour();
    const startMinute = startTime.minute();
    return {
        disabledHours: () => Array.from({ length: startHour }, (_, hour) => hour),
        disabledMinutes: (selectedHour: number) => (
            selectedHour === startHour
                ? Array.from({ length: startMinute + 1 }, (_, minute) => minute)
                : []
        ),
    };
};

interface BulkEditModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void | Promise<void>;
    requestedIds?: string[];
    fullscreen?: boolean;
}

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
    open,
    onClose,
    onSuccess,
    requestedIds = [],
    fullscreen = false,
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = React.useState(false);
    // Hiển thị form trước, rồi mới bắt đầu các request HMO theo từng bài học.
    // Khi chọn nhiều lịch, việc này tránh làm frame mở modal bị nghẽn.
    const [loadRelatedData, setLoadRelatedData] = React.useState(false);
    const [submitProgress, setSubmitProgress] = React.useState<SubmitProgress | null>(null);
    const [selectedRows, setSelectedRows] = React.useState<any[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = React.useState<React.Key[]>([]);
    const [previewRows, setPreviewRows] = React.useState<any[]>([]);
    const [hmoOptionsByLesson, setHmoOptionsByLesson] = React.useState<Record<string, HocmaiSectionOption[]>>({});
    const [loadingHmoLessons, setLoadingHmoLessons] = React.useState<Set<string>>(new Set());
    const [syncingHmoLessonIds, setSyncingHmoLessonIds] = React.useState(false);
    const [hmoSyncNotes, setHmoSyncNotes] = React.useState<Record<string, { type: 'success' | 'warning'; message: string }>>({});
    // setFieldValue không đánh dấu field là touched. Lưu riêng các lịch được
    // đồng bộ tự động để chúng vẫn được đưa vào payload preview/submit.
    const [autoSyncedSeparateMappingIds, setAutoSyncedSeparateMappingIds] = React.useState<Set<string>>(new Set());
    const [sourceLessonNames, setSourceLessonNames] = React.useState<Map<string, string>>(new Map());
    const [loadingSourceLessonNames, setLoadingSourceLessonNames] = React.useState(false);
    const [autoFillStartDate, setAutoFillStartDate] = React.useState<Dayjs | null>(null);
    const [autoFillWeekdays, setAutoFillWeekdays] = React.useState<number[]>([]);
    const [autoFillHolidays, setAutoFillHolidays] = React.useState<string>("");
    const previewRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        setLoadRelatedData(false);
        if (!open) return;
        const timer = window.setTimeout(() => setLoadRelatedData(true), 180);
        return () => window.clearTimeout(timer);
    }, [open]);

    useEffect(() => {
        if (!previewRows.length) return;
        const frame = requestAnimationFrame(() => {
            previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return () => cancelAnimationFrame(frame);
    }, [previewRows.length]);

    // Bulk update được commit trong một transaction nên backend không thể báo
    // từng dòng đã hoàn tất trước khi commit. Thanh này tiến dần để thể hiện
    // request vẫn đang chạy, nhưng dừng ở 92% cho tới khi có kết quả thật.
    useEffect(() => {
        if (!submitProgress || submitProgress.completed > 0) return;
        const timer = window.setInterval(() => {
            setSubmitProgress((current) => {
                if (!current || current.completed > 0 || current.percent >= 92) return current;
                const increment = current.percent < 55 ? 4 : current.percent < 78 ? 2 : 1;
                return { ...current, percent: Math.min(92, current.percent + increment) };
            });
        }, 650);
        return () => window.clearInterval(timer);
    }, [submitProgress?.completed, submitProgress?.total]);

    useEffect(() => {
        if (!open) {
            setSelectedRows([]);
            setSelectedRowKeys([]);
            return;
        }
        try {
            const savedRows = JSON.parse(sessionStorage.getItem("schedule:auto-edit:rows") || "[]");
            const rows = Array.isArray(savedRows) ? savedRows : [];
            const requestedSet = new Set(requestedIds);
            const filtered = rows.filter((row) => requestedSet.has(String(row.id)));
            setSelectedRows(filtered);
            setSelectedRowKeys(filtered.map((row) => String(row.id)));
        } catch {
            setSelectedRows([]);
            setSelectedRowKeys([]);
        }
    }, [open, requestedIds]);

    useEffect(() => {
        if (!open || !fullscreen) return;
        const htmlOverflow = document.documentElement.style.overflow;
        const bodyOverflow = document.body.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        return () => {
            document.documentElement.style.overflow = htmlOverflow;
            document.body.style.overflow = bodyOverflow;
        };
    }, [open, fullscreen]);

    const lessonContexts = React.useMemo(() => {
        const contexts = new Map<string, { lessonId: string; code: string; label: string }>();
        selectedRows.forEach((row) => {
            const lessonId = String(row.session_id || '').trim();
            if (!lessonId || contexts.has(lessonId)) return;
            contexts.set(lessonId, {
                lessonId,
                code: String(row.code || '').trim(),
                label: `Bài ${row.learn_number || '-'}${row.lesson_name ? `: ${row.lesson_name}` : ''}`,
            });
        });
        return Array.from(contexts.values());
    }, [selectedRows]);

    const calendarContexts = React.useMemo(() => selectedRows
        .filter((row) => row.id !== undefined && row.id !== null)
        .map((row) => {
            const scheduleTime = row.start_time && row.end_time
                ? `${dayjs(row.start_time).format('DD/MM/YYYY HH:mm')} - ${dayjs(row.end_time).format('HH:mm')}`
                : row.start_time ? dayjs(row.start_time).format('DD/MM/YYYY HH:mm') : 'Chưa xếp giờ';
            return {
                calendarId: String(row.id),
                internalLessonId: String(row.session_id || '').trim(),
                label: `Bài ${row.learn_number || '-'}${row.lesson_name ? `: ${row.lesson_name}` : ''} · ${scheduleTime}`,
            };
        }), [selectedRows]);

    // lesson_name trong calendar có thể đã được thêm tiền tố/hậu tố từ một lần
    // cập nhật trước. Luôn lấy tên chuẩn từ bảng lessons để lần cập nhật sau
    // thay thế hoàn toàn mẫu tên cũ, không ghép chồng các tiền tố/hậu tố.
    useEffect(() => {
        if (!open || !loadRelatedData || !selectedRows.length) {
            setSourceLessonNames(new Map());
            return;
        }
        let active = true;
        const programCodes = Array.from(new Set(
            selectedRows.map((row) => String(row.code || '').trim()).filter(Boolean)
        ));
        setLoadingSourceLessonNames(true);
        void Promise.all(programCodes.map(async (programCode) => {
            const response: any = await getProgramLessonsForScheduling(programCode);
            return {
                programCode,
                lessons: Array.isArray(response?.data) ? response.data : [],
            };
        })).then((groups) => {
            if (!active) return;
            const next = new Map<string, string>();
            groups.forEach(({ programCode, lessons }) => {
                lessons.forEach((lesson: any) => {
                    const name = String(lesson?.lesson_name || '').trim();
                    const id = String(lesson?.id || '').trim();
                    const learnNumber = Number(lesson?.learn_number);
                    if (id && name) next.set(id, name);
                    if (Number.isInteger(learnNumber) && name) {
                        next.set(`${programCode}::${learnNumber}`, name);
                    }
                });
            });
            setSourceLessonNames(next);
        }).catch(() => {
            if (active) setSourceLessonNames(new Map());
        }).finally(() => {
            if (active) setLoadingSourceLessonNames(false);
        });
        return () => { active = false; };
    }, [open, loadRelatedData, selectedRows]);

    const getSourceLessonName = React.useCallback((record: any) => {
        const sessionId = String(record?.session_id || '').trim();
        const byId = sessionId ? sourceLessonNames.get(sessionId) : undefined;
        if (byId) return byId;
        return sourceLessonNames.get(
            `${String(record?.code || '').trim()}::${Number(record?.learn_number)}`
        );
    }, [sourceLessonNames]);

    useEffect(() => {
        if (!open || !loadRelatedData) return;
        let active = true;
        setHmoOptionsByLesson({});
        setLoadingHmoLessons(new Set(lessonContexts.map((item) => item.lessonId)));
        void Promise.all(lessonContexts.map(async (context) => {
            try {
                const response: any = await getHocmaiSectionsForSchedulingLesson(
                    context.code,
                    context.lessonId
                );
                if (!active) return;
                const options = Array.isArray(response?.data) ? response.data : [];
                setHmoOptionsByLesson((current) => ({
                    ...current,
                    [context.lessonId]: options,
                }));
            } catch {
                if (!active) return;
                setHmoOptionsByLesson((current) => ({
                    ...current,
                    [context.lessonId]: [],
                }));
            } finally {
                if (!active) return;
                setLoadingHmoLessons((current) => {
                    const next = new Set(current);
                    next.delete(context.lessonId);
                    return next;
                });
            }
        }));
        return () => { active = false; };
    }, [lessonContexts, loadRelatedData, open]);

    // Form Watchers
    const configMode = Form.useWatch('config_mode', form) || 'common';
    const operation = Form.useWatch('operation', form) || 'update';
    const selectedLessons = Form.useWatch('selected_lessons', form) || selectedRowKeys;
    const commonStartTime = Form.useWatch('common_start_time', form) as Dayjs | undefined;
    const hasSingleSelectedLesson = React.useMemo(() => {
        const selectedIds = new Set((selectedLessons as Array<string | number>).map(String));
        const lessonNumbers = new Set(selectedRows
            .filter((record) => selectedIds.has(String(record.id)))
            .map((record) => Number(record.learn_number))
            .filter((learnNumber) => Number.isInteger(learnNumber) && learnNumber > 0));
        return lessonNumbers.size === 1;
    }, [selectedLessons, selectedRows]);

    // Tự động set giá trị mặc định khi mở Modal
    useEffect(() => {
        if (open) {
            const separateConfig: Record<string, any> = {};
            selectedRows.forEach((row) => {
                const hmoMappingKeys = normalizedMappingKeys(row.package_lesson_mappings || []);

                separateConfig[row.id] = {
                    start_date: row.start_time ? dayjs(row.start_time) : undefined,
                    start_time: row.start_time ? dayjs(row.start_time).startOf('minute') : undefined,
                    end_time: row.end_time ? dayjs(row.end_time).startOf('minute') : undefined,
                    teacher: teacherValue(row.teacher),
                    assistant_teacher: assistantValues(row.assistant_teacher),
                    hmo_mapping_keys: hmoMappingKeys,
                };
            });

            let commonConfig: Record<string, any> = {};
            if (selectedRows.length > 0) {
                const firstRow = selectedRows[0];
                const allSameTeacher = selectedRows.every((row) => teacherValue(row.teacher) === teacherValue(firstRow.teacher));
                if (allSameTeacher) {
                    commonConfig.common_teacher = teacherValue(firstRow.teacher);
                }
                // Cập nhật chung nhiều lịch không tự lấy giờ của một dòng bất kỳ.
                // Chỉ khi chọn đúng một lịch mới điền cặp giờ hiện có để chỉnh nhanh.
                if (selectedRows.length === 1 && firstRow.start_time) {
                    commonConfig.common_start_time = dayjs(firstRow.start_time).startOf('minute');
                }
                if (selectedRows.length === 1 && firstRow.end_time) {
                    commonConfig.common_end_time = dayjs(firstRow.end_time).startOf('minute');
                }

                const firstAssistant = assistantValues(firstRow.assistant_teacher).sort().join(',');
                const allSameAssistant = selectedRows.every((row) => (
                    assistantValues(row.assistant_teacher).sort().join(',') === firstAssistant
                ));

                if (allSameAssistant) {
                    commonConfig.common_assistant_teacher = assistantValues(firstRow.assistant_teacher);
                }

                commonConfig.common_hmo_mapping_keys_by_calendar = Object.fromEntries(
                    calendarContexts.map((context) => {
                        const calendarRow = selectedRows.find(
                            (row) => String(row.id) === context.calendarId
                        );
                        return [
                            context.calendarId,
                            (calendarRow?.package_lesson_mappings || [])
                                .map(mappingKeyFromCalendarMapping)
                                .filter((key: string) => !key.startsWith('::') && !key.endsWith('::')),
                        ];
                    })
                );
            }

            form.setFieldsValue({
                operation: 'update',
                config_mode: 'common',
                hmo_sync_name_source: 'lesson',
                canceled_lesson_name_prefix: DEFAULT_CANCELED_LESSON_PREFIX,
                canceled_lesson_name_suffix: '',
                new_lesson_name_prefix: DEFAULT_MAKEUP_LESSON_PREFIX,
                new_lesson_name_suffix: '',
                selected_lessons: selectedRowKeys,
                separate_config: separateConfig,
                ...commonConfig,
            });
            setPreviewRows([]);
        }
    }, [open, selectedRowKeys, selectedRows, form, lessonContexts, calendarContexts]);

    const handleAutoFillDates = () => {
        if (!autoFillStartDate) {
            message.warning("Vui lòng chọn ngày bắt đầu.");
            return;
        }
        if (!autoFillWeekdays.length) {
            message.warning("Vui lòng chọn ít nhất 1 thứ trong tuần.");
            return;
        }
        const holidayList = autoFillHolidays.split(',').map(d => d.trim()).filter(Boolean);
        const validHolidays: Dayjs[] = [];
        for (const d of holidayList) {
            const parsed = dayjs(d, "DD/MM/YYYY", true);
            if (!parsed.isValid()) {
                message.error(`Ngày nghỉ ${d} không hợp lệ. Dùng định dạng DD/MM/YYYY`);
                return;
            }
            validHolidays.push(parsed.startOf('day'));
        }

        let currentDate = autoFillStartDate.clone().startOf('day');
        const newDates: Record<string, Dayjs> = {};
        const selectedKeys = Array.isArray(selectedLessons) ? selectedLessons : [];

        const keysToProcess = [...selectedKeys];

        for (const key of keysToProcess) {
            let attempts = 0;
            while (attempts < 365) {
                const isHoliday = validHolidays.some(h => h.isSame(currentDate, 'day'));
                const currentDayNum = currentDate.day() === 0 ? 7 : currentDate.day();
                const isMatchWeekday = autoFillWeekdays.includes(currentDayNum);
                if (!isHoliday && isMatchWeekday) {
                    newDates[String(key)] = currentDate.clone();
                    currentDate = currentDate.add(1, 'day');
                    break;
                }
                currentDate = currentDate.add(1, 'day');
                attempts++;
            }
        }

        const currentConfig = form.getFieldValue('separate_config') || {};
        for (const key of keysToProcess) {
            const strKey = String(key);
            if (!currentConfig[strKey]) currentConfig[strKey] = {};
            currentConfig[strKey].start_date = newDates[strKey];
        }
        form.setFieldValue('separate_config', { ...currentConfig });
        message.success("Đã điền tự động ngày học.");
    };

    const handleClose = () => {
        form.resetFields();
        setPreviewRows([]);
        setAutoSyncedSeparateMappingIds(new Set());
        onClose();
    };

    const validateEndTimeAfter = (startFieldName: string | (string | number)[]) => (
        _: unknown,
        endTime?: Dayjs | null
    ) => {
        if (!endTime) return Promise.resolve();

        const startTime = form.getFieldValue(startFieldName) as Dayjs | undefined;
        if (!startTime) {
            return Promise.reject(new Error('Vui lòng nhập thời gian bắt đầu trước'));
        }

        return isEndAfterStart(startTime, endTime)
            ? Promise.resolve()
            : Promise.reject(new Error('Thời gian kết thúc phải sau thời gian bắt đầu'));
    };

    const revalidateOrClearEndTime = (
        endFieldName: string | (string | number)[],
        startTime?: Dayjs | null
    ) => {
        const endTime = form.getFieldValue(endFieldName) as Dayjs | undefined;
        if (!endTime) return;

        if (!startTime || !isEndAfterStart(startTime, endTime)) {
            form.setFieldValue(endFieldName, undefined);
            return;
        }

        void form.validateFields([endFieldName]);
    };

    const mappingKeysToPayload = (keys: string[] = []) => keys
        .map((key) => {
            const [packageId, courseId, lessonId] = String(key).split('::');
            if (!packageId || !courseId || !lessonId) return null;
            return {
                package_ids: [packageId],
                course_id: courseId,
                lesson_ids: [lessonId],
            };
        })
        .filter(Boolean);

    const formatMappings = (mappings: any[] = []) => {
        const lessonIds = mappings.flatMap((mapping) => {
            const lessonIds = mapping.lesson_ids ?? (mapping.lesson_id ? [mapping.lesson_id] : []);
            return lessonIds.map((lessonId: string) => String(lessonId));
        });
        if (!lessonIds.length) return 'Chưa mapping';
        const counts = new Map<string, number>();
        lessonIds.forEach((lessonId) => {
            counts.set(lessonId, (counts.get(lessonId) || 0) + 1);
        });
        return Array.from(counts.entries()).map(([lessonId, count]) => (
            `Lesson ${lessonId}${count > 1 ? ` (${count} mapping Package/Course)` : ''}`
        )).join('; ');
    };

    const formatScheduleDateTime = (record: any) => (
        record?.start_time && record?.end_time
            ? `${dayjs(record.start_time).format('DD/MM/YYYY HH:mm')} - ${dayjs(record.end_time).format('HH:mm')}`
            : 'Chưa xếp lịch'
    );

    const formatMappingKeys = (keys: string[] = [], lessonId: string) => {
        const optionByKey = new Map(
            (hmoOptionsByLesson[lessonId] || []).map((option) => [hmoOptionKey(option), option])
        );
        const grouped = new Map<string, { names: Set<string>; count: number }>();
        keys.forEach((key) => {
            const option = optionByKey.get(key);
            const externalLessonId = option?.lesson_id || String(key).split('::')[2];
            const current = grouped.get(String(externalLessonId)) || { names: new Set<string>(), count: 0 };
            if (option?.lesson_name) current.names.add(option.lesson_name);
            current.count += 1;
            grouped.set(String(externalLessonId), current);
        });
        const labels = Array.from(grouped.entries()).map(([externalLessonId, detail]) => {
            const names = Array.from(detail.names);
            const mappingSummary = detail.count > 1
                ? ` (${detail.count} mapping Package/Course)`
                : '';
            return `Lesson ${externalLessonId}${names.length ? `: ${names.join(' / ')}` : ''}${mappingSummary}`;
        });
        return labels.length ? labels.join('; ') : 'Chưa mapping';
    };

    const handleSyncHmoLessonIds = async () => {
        const targetIds = (form.getFieldValue('selected_lessons') || selectedRowKeys).map(String);
        const rows = selectedRows.filter((row) => targetIds.includes(String(row.id)));
        const syncNameSource = form.getFieldValue('hmo_sync_name_source') === 'calendar'
            ? 'calendar'
            : 'lesson';
        const syncModeLabel = configMode === 'common'
            ? 'Dùng chung cho tất cả lịch'
            : 'Cấu hình riêng từng lịch';
        if (!rows.length) {
            message.warning('Chưa chọn lịch học để đồng bộ Lesson ID HMO');
            return;
        }
        if (syncNameSource === 'lesson' && loadingSourceLessonNames) {
            message.warning('Đang tải tên bài học từ Quản lý đề cương, vui lòng thử lại sau giây lát.');
            return;
        }

        setSyncingHmoLessonIds(true);
        try {
            const optionsByLesson = new Map<string, HocmaiSectionOption[]>();
            const contexts = lessonContexts.filter((context) => rows.some(
                (row) => String(row.session_id || '') === context.lessonId
            ));
            await Promise.all(contexts.map(async (context) => {
                const cachedOptions = hmoOptionsByLesson[context.lessonId];
                if (cachedOptions) {
                    optionsByLesson.set(context.lessonId, cachedOptions);
                    return;
                }
                const response: any = await getHocmaiSectionsForSchedulingLesson(context.code, context.lessonId);
                optionsByLesson.set(context.lessonId, Array.isArray(response?.data) ? response.data : []);
            }));

            const nextMappings: Record<string, string[]> = {};
            const notes: Record<string, { type: 'success' | 'warning'; message: string }> = {};
            let syncedCount = 0;
            const rowsByLesson = new Map<string, any[]>();
            rows.forEach((row) => {
                const lessonId = String(row.session_id || '');
                rowsByLesson.set(lessonId, [...(rowsByLesson.get(lessonId) || []), row]);
            });

            rowsByLesson.forEach((lessonRows, lessonId) => {
                // Một Lesson nội bộ có thể thuộc nhiều Course HMO. Chỉ coi là
                // trùng khi cùng Course có nhiều Lesson ID cùng tên; trùng tên
                // ở Course khác là mapping hợp lệ và phải được gán đồng thời.
                const availableOptions = uniqueHmoOptions(optionsByLesson.get(lessonId) || [])
                    .sort((left, right) => String(left.lesson_id).localeCompare(String(right.lesson_id), 'vi', { numeric: true }))
                const courseIds = hmoCourseIds(availableOptions);
                const orderedRows = [...lessonRows].sort((left, right) => dayjs(left.start_time).valueOf() - dayjs(right.start_time).valueOf());

                if (syncNameSource === 'calendar') {
                    const claimedCourseLessonIds = new Set<string>();
                    orderedRows.forEach((row) => {
                        const title = normalizeLessonTitle(row.lesson_name);
                        const matchesByCourse = hmoTitleMatchesByCourse(availableOptions, title);
                        const matchedCourseIds = courseIds.filter(
                            (courseId) => matchesByCourse.get(courseId)?.size === 1
                        );

                        if (!title) {
                            notes[String(row.id)] = {
                                type: 'warning',
                                message: 'Lịch chưa có tên bài học nên không thể tự gán Lesson ID HMO.',
                            };
                            return;
                        }
                        if (!matchedCourseIds.length) {
                            notes[String(row.id)] = {
                                type: 'warning',
                                message: `Không thể tự gán Lesson ID HMO cho “${row.lesson_name}”: ${courseMatchSummary(courseIds, matchesByCourse)}. Mỗi Course cần đúng 1 Lesson ID trùng tên.`,
                            };
                            return;
                        }

                        const selectedOptions = matchedCourseIds.flatMap((courseId) => (
                            Array.from(matchesByCourse.get(courseId)!.values())[0]
                        ));
                        const selectedCourseLessonIds = matchedCourseIds.map((courseId) => (
                            `${courseId}::${Array.from(matchesByCourse.get(courseId)!.keys())[0]}`
                        ));
                        if (selectedCourseLessonIds.some((identity) => claimedCourseLessonIds.has(identity))) {
                            notes[String(row.id)] = {
                                type: 'warning',
                                message: 'Lesson ID HMO đã được dùng cho một lịch khác trong cùng Course; hệ thống không tự gán.',
                            };
                            return;
                        }
                        selectedCourseLessonIds.forEach((identity) => claimedCourseLessonIds.add(identity));
                        nextMappings[String(row.id)] = selectedOptions.map(hmoOptionKey);
                        syncedCount += 1;
                        notes[String(row.id)] = {
                            type: matchedCourseIds.length === courseIds.length ? 'success' : 'warning',
                            message: matchedCourseIds.length === courseIds.length
                                ? `Đã gán Lesson ID HMO theo tên lịch trong ${courseIds.length} Course.`
                                : `Đã gán Lesson ID HMO trong ${matchedCourseIds.length}/${courseIds.length} Course. Chưa gán: ${courseMatchSummary(courseIds.filter((courseId) => !matchedCourseIds.includes(courseId)), matchesByCourse)}.`,
                        };
                    });
                    return;
                }

                const sourceLessonName = getSourceLessonName(lessonRows[0]);
                const title = normalizeLessonTitle(sourceLessonName);
                const matchesByCourse = hmoTitleMatchesByCourse(availableOptions, title);

                if (!title) {
                    orderedRows.forEach((row) => {
                        notes[String(row.id)] = {
                            type: 'warning',
                            message: 'Không tìm thấy tên bài học trong Quản lý đề cương. Hệ thống không tự gán.',
                        };
                    });
                    return;
                }

                const matchedCourseIds = courseIds.filter(
                    (courseId) => matchesByCourse.get(courseId)?.size === orderedRows.length
                );
                if (matchedCourseIds.length > 0 && orderedRows.length > 0) {
                    orderedRows.forEach((row, index) => {
                        nextMappings[String(row.id)] = matchedCourseIds.flatMap((courseId) => {
                            const byLessonId = matchesByCourse.get(courseId)!;
                            const lessonId = Array.from(byLessonId.keys())
                                .sort((left, right) => left.localeCompare(right, 'vi', { numeric: true }))[index];
                            return byLessonId.get(lessonId)!.map(hmoOptionKey);
                        });
                    });
                    syncedCount += orderedRows.length;
                    orderedRows.forEach((row) => {
                        notes[String(row.id)] = {
                            type: matchedCourseIds.length === courseIds.length ? 'success' : 'warning',
                            message: matchedCourseIds.length === courseIds.length
                                ? `Đã gán ${summarizeSelectedHmoMappings(nextMappings[String(row.id)])} cho lịch này theo thứ tự các lịch của cùng bài.`
                                : `Đã gán Lesson ID cho ${matchedCourseIds.length}/${courseIds.length} Course. Chưa gán: ${courseMatchSummary(courseIds.filter((courseId) => !matchedCourseIds.includes(courseId)), matchesByCourse)}.`,
                        };
                    });
                    return;
                }

                orderedRows.forEach((row) => {
                    notes[String(row.id)] = {
                        type: 'warning',
                        message: `Có ${orderedRows.length} lịch. Đối chiếu theo từng Course cho “${sourceLessonName}”: ${courseMatchSummary(courseIds, matchesByCourse)}. Mỗi Course cần đúng ${orderedRows.length} Lesson ID.`,
                    };
                });
            });

            if (configMode === 'separate') {
                const currentConfig = form.getFieldValue('separate_config') || {};
                form.setFieldValue('separate_config', {
                    ...currentConfig,
                    ...Object.fromEntries(Object.entries(nextMappings).map(([calendarId, mappingKeys]) => [
                        calendarId,
                        { ...(currentConfig[calendarId] || {}), hmo_mapping_keys: mappingKeys },
                    ])),
                });
                setAutoSyncedSeparateMappingIds((current) => new Set([
                    ...current,
                    ...Object.keys(nextMappings),
                ]));
            } else {
                form.setFieldsValue({
                    config_mode: 'common',
                    enable_mapping: true,
                    common_hmo_mapping_keys_by_calendar: {
                        ...(form.getFieldValue('common_hmo_mapping_keys_by_calendar') || {}),
                        ...nextMappings,
                    },
                });
            }
            setHmoSyncNotes(Object.fromEntries(
                Object.entries(notes).map(([calendarId, note]) => [
                    calendarId,
                    {
                        ...note,
                        message: `Kết quả đồng bộ ở tab “${syncModeLabel}”: ${note.message}`,
                    },
                ])
            ));
            setPreviewRows([]);
            syncedCount
                ? message.success(`Đã đồng bộ Lesson ID HMO cho ${syncedCount} lịch`)
                : message.warning('Không có lịch nào đủ điều kiện tự đồng bộ; vui lòng chọn thủ công.');
        } catch (error: any) {
            message.error(error?.message || 'Không thể đồng bộ Lesson ID HMO');
        } finally {
            setSyncingHmoLessonIds(false);
        }
    };

    const handleFinish = async (values: any) => {
        try {
            setLoading(true);

            if (values.operation !== 'update') {
                if (previewRows.length === 0) {
                    const offsetDays = Number(values.offset_days || 0);
                    setPreviewRows((selectedLessons as (string | number)[]).map((calendarId) => {
                        const record = selectedRows.find(
                            (item) => String(item.id) === String(calendarId)
                        );
                        const currentStart = record?.start_time ? dayjs(record.start_time) : null;
                        const currentEnd = record?.end_time ? dayjs(record.end_time) : null;
                        const currentText = currentStart && currentEnd
                            ? `${currentStart.format('DD/MM/YYYY HH:mm')} - ${currentEnd.format('HH:mm')}`
                            : 'Không xác định';
                        const sourceLessonName = String(record?.lesson_name || '').trim() || '(Chưa có tên bài)';
                        const canceledLessonName = formatRescheduledLessonName(
                            sourceLessonName,
                            values.canceled_lesson_name_prefix || DEFAULT_CANCELED_LESSON_PREFIX,
                            values.canceled_lesson_name_suffix,
                        );
                        const makeupLessonName = formatRescheduledLessonName(
                            sourceLessonName,
                            values.new_lesson_name_prefix || DEFAULT_MAKEUP_LESSON_PREFIX,
                            values.new_lesson_name_suffix,
                        );
                        const nextText = values.operation === 'cancel'
                            ? 'Nghỉ học, không tạo lịch thay thế'
                            : currentStart && currentEnd
                                ? `Nghỉ học và tạo lịch bù: ${currentStart.add(offsetDays, 'day').format('DD/MM/YYYY HH:mm')} - ${currentEnd.add(offsetDays, 'day').format('HH:mm')}`
                                : 'Không xác định được thời gian lịch bù';
                        return {
                            id: calendarId,
                            label: record?.learn_number ? `Bài ${record.learn_number}` : `ID ${calendarId}`,
                            current: currentText,
                            next: nextText,
                            current_lesson_name: sourceLessonName,
                            next_lesson_name: values.operation === 'cancel'
                                ? canceledLessonName
                                : `Buổi nghỉ: ${canceledLessonName}\nBuổi học bù: ${makeupLessonName}`,
                        };
                    }));
                    return;
                }
                const targetIds = (values.selected_lessons || []).map(String);
                setSubmitProgress({
                    total: targetIds.length,
                    completed: 0,
                    percent: 6,
                    message: `Hệ thống đang cập nhật ${targetIds.length} lịch học...`,
                });
                const response = await updateLivestreamBulk({
                    ids: targetIds,
                    operation: values.operation,
                    reason: String(values.reason || '').trim(),
                    offset_days: values.operation === 'makeup' ? Number(values.offset_days) : undefined,
                    canceled_lesson_name_prefix: values.canceled_lesson_name_prefix,
                    canceled_lesson_name_suffix: values.canceled_lesson_name_suffix,
                    new_lesson_name_prefix: values.operation === 'makeup' ? values.new_lesson_name_prefix : undefined,
                    new_lesson_name_suffix: values.operation === 'makeup' ? values.new_lesson_name_suffix : undefined,
                });
                const committedCount = Array.isArray(response?.data)
                    ? response.data.length
                    : Number(response?.data?.count) || targetIds.length;
                setSubmitProgress({
                    total: targetIds.length,
                    completed: committedCount,
                    percent: 96,
                    message: 'Đã lưu thay đổi. Đang tải lại danh sách lịch học...',
                });
                sessionStorage.removeItem("schedule:auto-edit:rows");
                await onSuccess();
                setSubmitProgress({
                    total: targetIds.length,
                    completed: committedCount,
                    percent: 100,
                    message: 'Đã hoàn tất cập nhật lịch học.',
                });
                await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
                handleClose();
                return;
            }

            // Chuẩn hóa separate_config (Format TimePicker dayjs -> "HH:mm")
            let formattedSeparateConfig = values.separate_config;
            if (values.config_mode === 'separate' && values.separate_config) {
                formattedSeparateConfig = {};
                Object.keys(values.separate_config).forEach(key => {
                    const config = values.separate_config[key];
                    const mappingTouched = form.isFieldTouched([
                        'separate_config',
                        key,
                        'hmo_mapping_keys',
                    ]);
                    formattedSeparateConfig[key] = {
                        ...config,
                        start_date: config.start_date ? dayjs(config.start_date).format('YYYY-MM-DD') : undefined,
                        start_time: config.start_time ? dayjs(config.start_time).format('HH:mm') : undefined,
                        end_time: config.end_time ? dayjs(config.end_time).format('HH:mm') : undefined,
                        ...(mappingTouched || autoSyncedSeparateMappingIds.has(String(key))
                            ? { package_lesson_mappings: mappingKeysToPayload(config.hmo_mapping_keys) }
                            : {}),
                    };
                    delete formattedSeparateConfig[key].hmo_mapping_keys;
                });
            }

            const selectedIds = (values.selected_lessons || []).map(String);
            const selectedLessonNumbers = new Set(selectedRows
                .filter((record) => selectedIds.includes(String(record.id)))
                .map((record) => Number(record.learn_number))
                .filter((learnNumber) => Number.isInteger(learnNumber) && learnNumber > 0));
            const isSingleLessonSelection = selectedLessonNumbers.size === 1;
            const lessonNameByCalendarId = new Map<string, string>();
            const isChangingLessonName = values.config_mode === 'common'
                ? Boolean(values.enable_lesson_name_pattern)
                : selectedRows.some((record) => (
                    selectedIds.includes(String(record.id))
                    && values.separate_config?.[String(record.id)]?.enable_lesson_name_pattern
                ));
            if (isChangingLessonName && loadingSourceLessonNames) {
                throw new Error('Đang tải tên bài học chuẩn, vui lòng thử lại sau giây lát');
            }
            const requireSourceLessonName = (record: any) => {
                const name = getSourceLessonName(record);
                if (!name) {
                    throw new Error(`Không xác định được tên bài học chuẩn của Bài ${record?.learn_number || '-'} từ Quản lý đề cương`);
                }
                return name;
            };
            if (values.config_mode === 'common' && values.enable_lesson_name_pattern) {
                const nameRules = (isSingleLessonSelection ? [] : values.lesson_name_rules || []).map((rule: any, index: number) => {
                    const from = Number(rule?.from_learn_number);
                    const to = Number(rule?.to_learn_number);
                    if (!Number.isInteger(from) || from <= 0 || !Number.isInteger(to) || to < from) {
                        throw new Error(`Khoảng bài thứ ${index + 1} không hợp lệ`);
                    }
                    return {
                        from,
                        to,
                        prefix: String(rule?.prefix || '').slice(0, 100),
                        suffix: String(rule?.suffix || '').slice(0, 100),
                        applyToFirstSession: Boolean(rule?.apply_to_first_session),
                    };
                }).sort((left: any, right: any) => left.from - right.from);
                for (let index = 1; index < nameRules.length; index += 1) {
                    if (nameRules[index].from <= nameRules[index - 1].to) {
                        throw new Error('Các khoảng bài áp dụng tiền tố/hậu tố không được chồng lấn');
                    }
                }
                const selectedLearnNumbers = new Set(selectedRows
                    .filter((record) => selectedIds.includes(String(record.id)))
                    .map((record) => Number(record.learn_number))
                    .filter((learnNumber) => Number.isInteger(learnNumber) && learnNumber > 0));
                nameRules.forEach((rule: any) => {
                    const missingLessons: number[] = [];
                    for (let learnNumber = rule.from; learnNumber <= rule.to; learnNumber += 1) {
                        if (!selectedLearnNumbers.has(learnNumber)) missingLessons.push(learnNumber);
                    }
                    if (missingLessons.length) {
                        const displayMissing = missingLessons.slice(0, 8).join(', ');
                        const suffix = missingLessons.length > 8 ? ` và ${missingLessons.length - 8} bài khác` : '';
                        throw new Error(`Khoảng bài ${rule.from}–${rule.to} không khớp dữ liệu đang chọn: thiếu bài ${displayMissing}${suffix}`);
                    }
                });
                const occurrencesByLesson = new Map<string, number>();
                selectedRows
                    .filter((record) => selectedIds.includes(String(record.id)))
                    .sort((left, right) => dayjs(left.start_time).valueOf() - dayjs(right.start_time).valueOf())
                    .forEach((record) => {
                        const lessonKey = String(record.session_id || record.learn_number || record.id);
                        const occurrence = (occurrencesByLesson.get(lessonKey) || 0) + 1;
                        occurrencesByLesson.set(lessonKey, occurrence);
                        const rule = nameRules.find((item: any) => (
                            Number(record.learn_number) >= item.from && Number(record.learn_number) <= item.to
                        ));
                        const applyToFirstSession = rule
                            ? rule.applyToFirstSession
                            : Boolean(values.apply_name_pattern_to_first_session);
                        // Khi người dùng chỉ chọn một bài, thao tác này có ý
                        // nghĩa áp dụng trực tiếp cho bài đó; không yêu cầu
                        // thêm lựa chọn "Áp dụng cả buổi đầu tiên".
                        if (isSingleLessonSelection || occurrence > 1 || applyToFirstSession) {
                            lessonNameByCalendarId.set(
                                String(record.id),
                                `${renderNamePattern(rule?.prefix ?? values.lesson_name_prefix, occurrence)}${requireSourceLessonName(record)}${renderNamePattern(rule?.suffix ?? values.lesson_name_suffix, occurrence)}`.slice(0, 400)
                            );
                        }
                    });
            }
            if (values.config_mode === 'separate') {
                const occurrencesByLesson = new Map<string, number>();
                selectedRows
                    .filter((record) => selectedIds.includes(String(record.id)))
                    .sort((left, right) => dayjs(left.start_time).valueOf() - dayjs(right.start_time).valueOf())
                    .forEach((record) => {
                        const lessonKey = String(record.session_id || record.learn_number || record.id);
                        const occurrence = (occurrencesByLesson.get(lessonKey) || 0) + 1;
                        occurrencesByLesson.set(lessonKey, occurrence);
                        const config = values.separate_config?.[String(record.id)] || {};
                        if (config.enable_lesson_name_pattern) {
                            lessonNameByCalendarId.set(
                                String(record.id),
                                `${renderNamePattern(config.lesson_name_prefix, occurrence)}${requireSourceLessonName(record)}${renderNamePattern(config.lesson_name_suffix, occurrence)}`.slice(0, 400)
                            );
                        }
                    });
            }
            const changedUpdates: Array<Record<string, unknown>> = selectedIds.flatMap((id: string) => {
                const record = selectedRows.find((item) => String(item.id) === id);
                if (!record) return [];
                const update: Record<string, unknown> = { id };

                if (values.config_mode === 'common') {
                    const nextTeacher = teacherValue(values.common_teacher);
                    const nextAssistants = assistantValues(values.common_assistant_teacher);
                    const nextStart = values.common_start_time ? dayjs(values.common_start_time).format('HH:mm') : undefined;
                    const nextEnd = values.common_end_time ? dayjs(values.common_end_time).format('HH:mm') : undefined;
                    if (values.enable_teacher && nextTeacher !== teacherValue(record.teacher)) update.teacher = nextTeacher;
                    if (values.enable_assistant && !sameStringArray(nextAssistants, assistantValues(record.assistant_teacher))) {
                        update.assistant_teacher = nextAssistants;
                    }
                    if (values.enable_time && nextStart && nextStart !== dayjs(record.start_time).format('HH:mm')) update.start_time = nextStart;
                    if (values.enable_time && nextEnd && nextEnd !== dayjs(record.end_time).format('HH:mm')) update.end_time = nextEnd;
                    const nextLessonName = lessonNameByCalendarId.get(id);
                    if (nextLessonName && nextLessonName !== String(record.lesson_name || '')) {
                        update.lesson_name = nextLessonName;
                    }
                    if (values.enable_mapping) {
                        const nextKeys = values.common_hmo_mapping_keys_by_calendar?.[id] || [];
                        const currentKeys = normalizedMappingKeys(record.package_lesson_mappings || []);
                        if (!sameStringArray(nextKeys, currentKeys)) {
                            update.package_lesson_mappings = mappingKeysToPayload(nextKeys);
                        }
                    }
                } else {
                    const config = formattedSeparateConfig?.[id] || {};
                    const nextTeacher = teacherValue(config.teacher);
                    const nextAssistants = assistantValues(config.assistant_teacher);
                    if (nextTeacher !== teacherValue(record.teacher)) update.teacher = nextTeacher;
                    if (!sameStringArray(nextAssistants, assistantValues(record.assistant_teacher))) {
                        update.assistant_teacher = nextAssistants;
                    }
                    if (config.start_date && config.start_date !== dayjs(record.start_time).format('YYYY-MM-DD')) update.start_date = config.start_date;
                    if (config.start_time && config.start_time !== dayjs(record.start_time).format('HH:mm')) update.start_time = config.start_time;
                    if (config.end_time && config.end_time !== dayjs(record.end_time).format('HH:mm')) update.end_time = config.end_time;
                    const nextLessonName = lessonNameByCalendarId.get(id);
                    if (nextLessonName && nextLessonName !== String(record.lesson_name || '')) {
                        update.lesson_name = nextLessonName;
                    }
                    if ('package_lesson_mappings' in config) {
                        const nextKeys = values.separate_config?.[id]?.hmo_mapping_keys || [];
                        const currentKeys = normalizedMappingKeys(record.package_lesson_mappings || []);
                        if (!sameStringArray(nextKeys, currentKeys)) {
                            update.package_lesson_mappings = config.package_lesson_mappings || [];
                        }
                    }
                }

                return Object.keys(update).length > 1 ? [update] : [];
            });

            if (!changedUpdates.length) {
                message.info('Không có thay đổi nào cần cập nhật.');
                setPreviewRows([]);
                return;
            }

            if (previewRows.length === 0) {
                const changedIds = new Set(changedUpdates.map((item) => String(item.id)));
                setPreviewRows((selectedLessons as (string | number)[]).filter(
                    (lessonKey) => changedIds.has(String(lessonKey))
                ).map((lessonKey) => {
                    const record = selectedRows.find((item) => String(item.id) === String(lessonKey));
                    const update = changedUpdates.find((item) => String(item.id) === String(lessonKey)) || {};
                    const applyDateTimeUpdate = (source: Dayjs | null, time?: unknown, date?: unknown) => {
                        if (!source) return null;
                        let next = source;
                        if (date) {
                            const parsedDate = dayjs(String(date));
                            if (parsedDate.isValid()) next = next.year(parsedDate.year()).month(parsedDate.month()).date(parsedDate.date());
                        }
                        if (time) {
                            const [hour, minute] = String(time).split(':').map(Number);
                            if (Number.isInteger(hour) && Number.isInteger(minute)) next = next.hour(hour).minute(minute).second(0);
                        }
                        return next;
                    };
                    const updatedStart = applyDateTimeUpdate(record?.start_time ? dayjs(record.start_time) : null, update.start_time, update.start_date);
                    const updatedEnd = applyDateTimeUpdate(record?.end_time ? dayjs(record.end_time) : null, update.end_time, update.start_date);
                    const internalLessonId = String(record?.session_id || '');
                    const nextKeys = values.config_mode === 'separate'
                        ? values.separate_config?.[lessonKey]?.hmo_mapping_keys || []
                        : values.common_hmo_mapping_keys_by_calendar?.[lessonKey] || [];
                    const isMappingUnchanged = values.config_mode === 'common'
                        ? !values.enable_mapping
                        : !autoSyncedSeparateMappingIds.has(String(lessonKey))
                            && !form.isFieldTouched([
                                'separate_config',
                                String(lessonKey),
                                'hmo_mapping_keys',
                            ]);

                    return {
                        id: lessonKey,
                        label: record?.learn_number ? `Bài ${record.learn_number}` : `ID ${lessonKey}`,
                        current_schedule: formatScheduleDateTime(record),
                        next_schedule: updatedStart && updatedEnd
                            ? `${updatedStart.format('DD/MM/YYYY HH:mm')} - ${updatedEnd.format('HH:mm')}`
                            : formatScheduleDateTime(record),
                        current_weekday: formatWeekday(record?.start_time),
                        next_weekday: formatWeekday(updatedStart ?? record?.start_time),
                        current: formatMappings(record?.package_lesson_mappings || []),
                        current_lesson_name: record?.lesson_name || '-',
                        next_lesson_name: (update.lesson_name as string | undefined) || record?.lesson_name || '-',
                        current_teacher: teacherValue(record?.teacher) || '-',
                        next_teacher: update.teacher !== undefined ? String(update.teacher || '-') : (teacherValue(record?.teacher) || '-'),
                        current_assistant: assistantValues(record?.assistant_teacher).join(', ') || '-',
                        next_assistant: update.assistant_teacher !== undefined
                            ? assistantValues(update.assistant_teacher).join(', ') || '-'
                            : (assistantValues(record?.assistant_teacher).join(', ') || '-'),
                        next: isMappingUnchanged
                            ? 'Giữ nguyên'
                            : (nextKeys.length ? formatMappingKeys(nextKeys, internalLessonId) : 'Xóa toàn bộ Lesson ID'),
                    };
                }));
                return;
            }

            const targetIds = changedUpdates.map((item) => String(item.id));
            setSubmitProgress({
                total: targetIds.length,
                completed: 0,
                percent: 6,
                    message: `Hệ thống đang cập nhật ${targetIds.length} lịch học...`,
            });
            const response = await updateLivestreamBulk({
                ids: targetIds,
                config_mode: 'separate',
                update_data: changedUpdates,
            });
            const committedCount = Array.isArray(response?.data)
                ? response.data.length
                : Number(response?.data?.count) || targetIds.length;
            setSubmitProgress({
                total: targetIds.length,
                completed: committedCount,
                percent: 96,
                message: 'Đã lưu thay đổi. Đang tải lại danh sách lịch học...',
            });
            sessionStorage.removeItem("schedule:auto-edit:rows");
            await onSuccess();
            setSubmitProgress({
                total: targetIds.length,
                completed: committedCount,
                percent: 100,
                message: 'Đã hoàn tất cập nhật lịch học.',
            });
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            handleClose();
        } catch (err) {
            console.error("Lỗi cập nhật hàng loạt:", err);
            message.error({
                content: getErrorMessage(err),
                duration: 8,
            });
        } finally {
            setLoading(false);
            setSubmitProgress(null);
        }
    };

    return (
        <>
        <Modal
            rootClassName="schedule-responsive-modal"
            title={
                <Space size={8} align="center">
                    <span>Cập Nhật Lịch Học Hàng Loạt</span>
                    <Tag color="blue" style={{ marginRight: 0, fontWeight: 500 }}>
                        {selectedRowKeys.length} lịch học đã chọn
                    </Tag>
                </Space>
            }
            open={open}
            onCancel={loading ? undefined : handleClose}
            closable={!loading}
            maskClosable={!loading}
            width={fullscreen ? "100%" : 1100}
            style={fullscreen ? { top: 0, maxWidth: "none", paddingBottom: 0 } : undefined}
            styles={fullscreen ? { content: { height: "100dvh", display: "flex", flexDirection: "column" }, body: { flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" } } : undefined}
            footer={[
                <Button key="cancel" onClick={handleClose} icon={<CloseCircleOutlined />} disabled={loading}>
                    Hủy
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    onClick={() => form.submit()}
                    loading={loading}
                    icon={<EditOutlined />}
                    style={!previewRows.length ? { background: '#52c41a', borderColor: '#52c41a' } : undefined}
                >
                    {previewRows.length
                        ? (operation === 'update' ? 'Xác nhận cập nhật' : 'Xác nhận thực hiện')
                        : 'Xem trước'}
                </Button>
            ]}
        >
            {(!loadRelatedData || loadingSourceLessonNames || loadingHmoLessons.size > 0) && (
                <Alert
                    showIcon
                    type="info"
                    message={!loadRelatedData ? 'Đang mở trình chỉnh sửa' : 'Đang tải dữ liệu liên kết'}
                    description={!loadRelatedData
                        ? 'Biểu mẫu đã sẵn sàng. Dữ liệu bài học và Lesson ID HMO sẽ được nạp ở nền để không làm đơ cửa sổ.'
                        : `Bạn có thể chỉnh sửa ngay. Đang hoàn tất dữ liệu cho ${loadingHmoLessons.size} bài học${loadingSourceLessonNames ? ' và tên bài học chuẩn' : ''}.`}
                    style={{ marginBottom: 16 }}
                />
            )}
            <Form
                className="responsive-modal-form responsive-schedule-form"
                form={form}
                layout="vertical"
                onFinish={handleFinish}
                onFinishFailed={({ errorFields }) => {
                    const firstError = errorFields[0];
                    if (!firstError) return;
                    // Ant Design tìm đúng scroll container của modal fullscreen.
                    requestAnimationFrame(() => form.scrollToField(firstError.name, {
                        block: 'center',
                        behavior: 'smooth',
                    }));
                }}
                onValuesChange={(changedValues) => {
                    if (previewRows.length) setPreviewRows([]);
                    // Ghi chú chỉ mô tả lần đồng bộ ở tab hiện tại. Khi đổi
                    // chế độ, mapping vẫn được giữ trong form nhưng không
                    // hiển thị lại kết quả của tab trước để tránh gây nhiễu.
                    if (Object.prototype.hasOwnProperty.call(changedValues, 'config_mode')) {
                        setHmoSyncNotes({});
                    }
                }}
                initialValues={{
                    operation: 'update',
                    config_mode: 'common',
                    enable_teacher: true,
                    enable_assistant: false,
                    enable_time: true,
                    enable_mapping: false,
                    canceled_lesson_name_prefix: DEFAULT_CANCELED_LESSON_PREFIX,
                    canceled_lesson_name_suffix: '',
                    new_lesson_name_prefix: DEFAULT_MAKEUP_LESSON_PREFIX,
                    new_lesson_name_suffix: '',
                }}
            >
                <Form.Item
                    name="selected_lessons"
                    hidden
                    rules={[
                        {
                            type: 'array',
                            min: 1,
                            message: 'Vui lòng chọn ít nhất 1 lịch học trên bảng!',
                        },
                    ]}
                >
                    <Input type="hidden" />
                </Form.Item>

                <Form.Item name="operation" label="Thao tác hàng loạt">
                    <Radio.Group
                        buttonStyle="solid"
                        onChange={() => setPreviewRows([])}
                        style={{ display: 'flex', flexWrap: 'wrap' }}
                        options={[
                            { value: 'update', label: 'Cập nhật lịch' },
                            { value: 'cancel', label: 'Nghỉ hẳn' },
                            { value: 'makeup', label: 'Nghỉ & thêm lịch bù' },
                        ]}
                        optionType="button"
                    />
                </Form.Item>

                {operation === 'update' && (
                    <>
                        {/* Chọn chế độ cấu hình */}
                        <div className="responsive-config-mode" style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, background: '#f8f9fa', padding: '12px 16px', borderRadius: 8, border: '1px solid #f0f0f0' }}>
                            <Text strong style={{ whiteSpace: 'nowrap', color: '#595959' }}>Cách cấu hình:</Text>
                            <Form.Item name="config_mode" style={{ marginBottom: 0 }}>
                                <Segmented
                                    options={[
                                        { label: 'Dùng chung cho tất cả lịch', value: 'common' },
                                        { label: 'Cấu hình riêng từng lịch', value: 'separate' }
                                    ]}
                                    size="middle"
                                />
                            </Form.Item>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                {configMode === 'common' ? 'Áp dụng các trường đã chọn cho toàn bộ lịch.' : 'Tùy chỉnh độc lập từng lịch.'}
                            </Text>
                        </div>

                        {/* CHẾ ĐỘ 1: CẤU HÌNH CHUNG */}
                        {configMode === 'common' && (
                            <Card size="small" style={{ borderRadius: 8, border: '1px solid #e8e8e8', padding: '8px 12px' }}>
                                <div style={{ marginBottom: 16, padding: '4px 4px 0 4px' }}>
                                    <Text type="secondary" style={{ fontSize: '12.5px', fontStyle: 'italic', display: 'block' }}>
                                        * Chỉ những thông tin được tích chọn mới được cập nhật ghi đè. Các thông tin không tích chọn sẽ giữ nguyên giá trị cũ.
                                    </Text>
                                </div>

                                {/* Tùy chọn Giáo viên */}
                                <Row gutter={16} align="middle" style={{ marginBottom: 16, marginTop: 8 }}>
                                    <Col span={8}>
                                        <Form.Item name="enable_teacher" valuePropName="checked" style={{ marginBottom: 0 }}>
                                            <Checkbox><Text strong>Đổi Giáo viên</Text></Checkbox>
                                        </Form.Item>
                                    </Col>
                                    <Col span={16}>
                                        <Form.Item noStyle dependencies={['enable_teacher']}>
                                            {({ getFieldValue }) => {
                                                const enabled = getFieldValue('enable_teacher');
                                                return (
                                                    <Form.Item
                                                        name="common_teacher"
                                                        style={{ marginBottom: 0 }}
                                                        rules={[{ required: enabled, message: 'Vui lòng chọn giáo viên mới' }]}
                                                    >
                                                        <TeachingStaffSelect
                                                            teacherType={1}
                                                            teacherValueMode="displayName"
                                                            placeholder="Chọn giáo viên mới"
                                                            disabled={!enabled}
                                                        />
                                                    </Form.Item>
                                                );
                                            }}
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Divider style={{ margin: '12px 0' }} />

                                <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
                                    <Col span={8}>
                                        <Form.Item name="enable_assistant" valuePropName="checked" style={{ marginBottom: 0 }}>
                                            <Checkbox><Text strong>Đổi Trợ giảng</Text></Checkbox>
                                        </Form.Item>
                                    </Col>
                                    <Col span={16}>
                                        <Form.Item noStyle dependencies={['enable_assistant']}>
                                            {({ getFieldValue }) => (
                                                <Form.Item name="common_assistant_teacher" style={{ marginBottom: 0 }}>
                                                    <TeachingStaffSelect
                                                        teacherType={0}
                                                        mode="multiple"
                                                        showSearch
                                                        optionFilterProp="label"
                                                        placeholder="Chọn trợ giảng (có thể để trống để gỡ)"
                                                        disabled={!getFieldValue('enable_assistant')}
                                                    />
                                                </Form.Item>
                                            )}
                                        </Form.Item>
                                    </Col>
                                </Row>

                                <Divider style={{ margin: '12px 0' }} />

                                {/* Tùy chọn Khung giờ */}
                                <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
                                    <Col span={8}>
                                        <Form.Item name="enable_time" valuePropName="checked" style={{ marginBottom: 0 }}>
                                            <Checkbox><Text strong>Đổi Khung giờ</Text></Checkbox>
                                        </Form.Item>
                                    </Col>
                                    <Col span={16}>
                                        <Space size={8}>
                                            <Form.Item noStyle dependencies={['enable_time']}>
                                                {({ getFieldValue }) => {
                                                    const enabled = getFieldValue('enable_time');
                                                    return (
                                                        <Form.Item
                                                            name="common_start_time"
                                                            style={{ marginBottom: 0 }}
                                                            rules={[{ required: enabled, message: 'Chọn giờ bắt đầu' }]}
                                                        >
                                                            <TimePicker
                                                                format="HH:mm"
                                                                style={{ width: 140 }}
                                                                placeholder="Giờ bắt đầu"
                                                                disabled={!enabled}
                                                                onChange={(value) => revalidateOrClearEndTime('common_end_time', value)}
                                                            />
                                                        </Form.Item>
                                                    );
                                                }}
                                            </Form.Item>
                                            <Form.Item noStyle dependencies={['enable_time']}>
                                                {({ getFieldValue }) => {
                                                    const enabled = getFieldValue('enable_time');
                                                    return (
                                                        <Form.Item
                                                            name="common_end_time"
                                                            style={{ marginBottom: 0 }}
                                                            rules={[
                                                                { required: enabled, message: 'Chọn giờ kết thúc' },
                                                                { validator: validateEndTimeAfter('common_start_time') },
                                                            ]}
                                                        >
                                                            <TimePicker
                                                                format="HH:mm"
                                                                style={{ width: 140 }}
                                                                placeholder="Giờ kết thúc"
                                                                disabledTime={() => getEndDisabledTime(commonStartTime)}
                                                                defaultOpenValue={commonStartTime}
                                                                disabled={!enabled || !commonStartTime}
                                                            />
                                                        </Form.Item>
                                                    );
                                                }}
                                            </Form.Item>
                                        </Space>
                                    </Col>
                                </Row>
                                <Divider style={{ margin: '12px 0' }} />

                                <Row gutter={16} align="top" style={{ marginBottom: 8 }}>
                                    <Col span={8}>
                                        <Form.Item name="enable_lesson_name_pattern" valuePropName="checked" style={{ marginBottom: 0 }}>
                                            <Checkbox><Text strong>Thêm tiền tố / hậu tố tên bài</Text></Checkbox>
                                        </Form.Item>
                                        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                                            Dùng <Text code>{'{n}'}</Text> để chèn số lần diễn ra của từng bài. Ví dụ tiền tố “Lịch {'{n}'} - ” với tên “Bài 1” sẽ thành “Lịch 1 - Bài 1”. {!hasSingleSelectedLesson && 'Mặc định mẫu chỉ áp dụng từ buổi thứ hai; tích chọn bên phải để áp dụng ngay từ buổi đầu.'}
                                        </Text>
                                    </Col>
                                    <Col span={16}>
                                        <Form.Item noStyle dependencies={['enable_lesson_name_pattern']}>
                                            {({ getFieldValue }) => {
                                                const enabled = getFieldValue('enable_lesson_name_pattern');
                                                return (
                                                    <Space wrap align="start" style={{ width: '100%', opacity: enabled ? 1 : 0.5 }}>
                                                        <Form.Item
                                                            name="lesson_name_prefix"
                                                            label="Tiền tố"
                                                            rules={[{ max: 100, message: 'Tiền tố không được quá 100 ký tự' }]}
                                                            style={{ minWidth: 220, marginBottom: 0 }}
                                                        >
                                                            <Input disabled={!enabled} maxLength={100} placeholder="Ví dụ: [Lịch {n}] - " />
                                                        </Form.Item>
                                                        <Form.Item
                                                            name="lesson_name_suffix"
                                                            label="Hậu tố"
                                                            rules={[{ max: 100, message: 'Hậu tố không được quá 100 ký tự' }]}
                                                            style={{ minWidth: 220, marginBottom: 0 }}
                                                        >
                                                            <Input disabled={!enabled} maxLength={100} placeholder="Ví dụ: - Lần {n}" />
                                                        </Form.Item>
                                                        {!hasSingleSelectedLesson && (
                                                            <Form.Item name="apply_name_pattern_to_first_session" valuePropName="checked" style={{ marginBottom: 0, paddingTop: 30 }}>
                                                                <Checkbox disabled={!enabled}>Áp dụng cả buổi đầu tiên</Checkbox>
                                                            </Form.Item>
                                                        )}
                                                    </Space>
                                                );
                                            }}
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Form.Item noStyle dependencies={['enable_lesson_name_pattern']}>
                                    {({ getFieldValue }) => getFieldValue('enable_lesson_name_pattern') && !hasSingleSelectedLesson && (
                                        <Form.List name="lesson_name_rules">
                                            {(fields, { add, remove }) => (
                                                <Card size="small" title="Mẫu tên theo khoảng bài" style={{ margin: '0 0 12px 33.333%' }}>
                                                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                                                        Bài trong khoảng dùng mẫu riêng và có lựa chọn áp dụng buổi đầu riêng; bài ngoài khoảng dùng mẫu chung. Các khoảng không được chồng lấn.
                                                    </Text>
                                                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                                        {fields.map((field) => (
                                                            <Space key={field.key} align="end" wrap style={{ width: '100%' }}>
                                                                <Form.Item name={[field.name, 'from_learn_number']} label="Từ bài" rules={[{ required: true, message: 'Nhập bài bắt đầu' }]} style={{ marginBottom: 0 }}>
                                                                    <InputNumber min={1} precision={0} style={{ width: 100 }} />
                                                                </Form.Item>
                                                                <Form.Item name={[field.name, 'to_learn_number']} label="Đến bài" dependencies={[["lesson_name_rules", field.name, "from_learn_number"]]} rules={[
                                                                    { required: true, message: 'Nhập bài kết thúc' },
                                                                    ({ getFieldValue }) => ({
                                                                        validator: (_, value) => Number(value) >= Number(getFieldValue(['lesson_name_rules', field.name, 'from_learn_number']))
                                                                            ? Promise.resolve()
                                                                            : Promise.reject(new Error('Phải lớn hơn hoặc bằng bài bắt đầu')),
                                                                    }),
                                                                ]} style={{ marginBottom: 0 }}>
                                                                    <InputNumber min={1} precision={0} style={{ width: 100 }} />
                                                                </Form.Item>
                                                                <Form.Item name={[field.name, 'prefix']} label="Tiền tố" rules={[{ max: 100 }]} style={{ flex: '1 1 180px', marginBottom: 0 }}>
                                                                    <Input maxLength={100} placeholder="Ví dụ: [Lịch {n}] - " />
                                                                </Form.Item>
                                                                <Form.Item name={[field.name, 'suffix']} label="Hậu tố" rules={[{ max: 100 }]} style={{ flex: '1 1 180px', marginBottom: 0 }}>
                                                                    <Input maxLength={100} placeholder="Ví dụ: - Nhóm A" />
                                                                </Form.Item>
                                                                <Form.Item name={[field.name, 'apply_to_first_session']} valuePropName="checked" style={{ marginBottom: 0 }}>
                                                                    <Checkbox>Áp dụng buổi đầu</Checkbox>
                                                                </Form.Item>
                                                                <Button danger type="text" onClick={() => remove(field.name)}>Xóa</Button>
                                                            </Space>
                                                        ))}
                                                        <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ apply_to_first_session: false })}>Thêm khoảng bài</Button>
                                                    </Space>
                                                </Card>
                                            )}
                                        </Form.List>
                                    )}
                                </Form.Item>
                                <Divider style={{ margin: '12px 0' }} />

                                <Row gutter={16} align="top" style={{ marginBottom: 8 }}>
                                    <Col span={8}>
                                        <Form.Item name="enable_mapping" valuePropName="checked" style={{ marginBottom: 0 }}>
                                            <Checkbox><Text strong>Đổi Lesson ID HMO</Text></Checkbox>
                                        </Form.Item>
                                        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                                            Chọn riêng Lesson ID cho từng lịch. Course ID và Package ID được lấy từ bài học của lịch đó.
                                        </Text>
                                        <Form.Item name="hmo_sync_name_source" label="Đồng bộ theo" style={{ margin: '10px 0 0' }}>
                                            <Select
                                                options={[
                                                    { value: 'calendar', label: 'Tên lịch học (calendar)' },
                                                    { value: 'lesson', label: 'Tên bài học (lessons)' },
                                                ]}
                                            />
                                        </Form.Item>
                                        <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                            Theo tên lịch sẽ so khớp từng lịch với Lesson ID HMO cùng tên, không gán lần lượt theo thứ tự tăng dần.
                                        </Text>
                                        <Button
                                            type="primary"
                                            ghost
                                            size="small"
                                            icon={<SyncOutlined spin={syncingHmoLessonIds} />}
                                            loading={syncingHmoLessonIds}
                                            onClick={() => void handleSyncHmoLessonIds()}
                                            style={{ marginTop: 10 }}
                                        >
                                            Đồng bộ Lesson ID HMO
                                        </Button>
                                    </Col>
                                    <Col span={16}>
                                        <Form.Item noStyle dependencies={['enable_mapping']}>
                                            {({ getFieldValue }) => {
                                                const enabled = getFieldValue('enable_mapping');
                                                return (
                                                    <div style={{ opacity: enabled ? 1 : 0.5, pointerEvents: enabled ? 'auto' : 'none' }}>
                                                        <Space direction="vertical" style={{ width: '100%' }}>
                                                            {calendarContexts.map((context) => {
                                                                const options = hmoOptionsByLesson[context.internalLessonId] || [];
                                                                return (
                                                                    <React.Fragment key={context.calendarId}>
                                                                        <Form.Item
                                                                            name={['common_hmo_mapping_keys_by_calendar', context.calendarId]}
                                                                            label={context.label}
                                                                            extra={options.length
                                                                                ? `${summarizeHmoOptions(options)} — danh sách được nhóm theo Package/Course.`
                                                                                : undefined}
                                                                            style={{ marginBottom: 8 }}
                                                                        >
                                                                            <HmoMappingSelect
                                                                                allowClear
                                                                                showSearch
                                                                                optionFilterProp="label"
                                                                                loading={loadingHmoLessons.has(context.internalLessonId)}
                                                                                disabled={!enabled}
                                                                                listHeight={420}
                                                                                popupMatchSelectWidth={680}
                                                                                placeholder={options.length
                                                                                    ? 'Chọn Lesson ID HMO'
                                                                                    : 'Bài chưa có Course ID hoặc HMO không có Lesson ID'}
                                                                                options={buildGroupedHmoOptions(options)}
                                                                            />
                                                                        </Form.Item>
                                                                        {hmoSyncNotes[context.calendarId] && (
                                                                            <Alert
                                                                                showIcon
                                                                                type={hmoSyncNotes[context.calendarId].type}
                                                                                message={hmoSyncNotes[context.calendarId].message}
                                                                                style={{ marginTop: -4, marginBottom: 8 }}
                                                                            />
                                                                        )}
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                            {!calendarContexts.length && (
                                                                <Alert type="warning" showIcon message="Lịch đã chọn chưa gắn bài học nội bộ" />
                                                            )}
                                                        </Space>
                                                    </div>
                                                );
                                            }}
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Card>
                        )}

                        {/* CHẾ ĐỘ 2: CẤU HÌNH RIÊNG CHO TỪNG LỊCH */}
                        {configMode === 'separate' && (
                            <div>
                                {Array.isArray(selectedLessons) && selectedLessons.length > 0 ? (
                                    <>
                                        <div style={{ marginBottom: 16 }}>
                                            <Space wrap size={16} align="end">
                                                <Form.Item name="hmo_sync_name_source" label="Đồng bộ theo" style={{ marginBottom: 0 }}>
                                                    <Select
                                                        style={{ width: 220 }}
                                                        options={[
                                                            { value: 'calendar', label: 'Tên lịch học (calendar)' },
                                                            { value: 'lesson', label: 'Tên bài học (lessons)' },
                                                        ]}
                                                    />
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
                                            <div style={{ marginTop: 4 }}>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    Theo tên lịch: so khớp từng lịch với Lesson ID HMO cùng tên. Theo tên bài học: chỉ tự gán khi số Lesson ID trùng tên khớp chính xác số lịch của mỗi bài.
                                                </Text>
                                            </div>
                                        </div>
                                        <div style={{ padding: '16px 20px', backgroundColor: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 8, marginBottom: 24, boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                                                <CalendarOutlined style={{ fontSize: 18, color: '#1677ff', marginRight: 8 }} />
                                                <Text strong style={{ fontSize: 15, color: '#1677ff' }}>Công cụ tự động điền ngày học</Text>
                                            </div>
                                            <Row gutter={[24, 16]} align="bottom">
                                                <Col xs={24} md={8} xl={5}>
                                                    <div style={{ marginBottom: 8 }}><Text strong style={{ fontSize: 13 }}>Ngày bắt đầu</Text></div>
                                                    <DatePicker
                                                        format="DD/MM/YYYY"
                                                        style={{ width: '100%' }}
                                                        value={autoFillStartDate}
                                                        onChange={setAutoFillStartDate}
                                                        placeholder="Chọn ngày bắt đầu"
                                                    />
                                                </Col>
                                                <Col xs={24} md={16} xl={10}>
                                                    <div style={{ marginBottom: 8 }}><Text strong style={{ fontSize: 13 }}>Lịch học hàng tuần</Text></div>
                                                    <Checkbox.Group
                                                        options={[
                                                            { label: 'T2', value: 1 },
                                                            { label: 'T3', value: 2 },
                                                            { label: 'T4', value: 3 },
                                                            { label: 'T5', value: 4 },
                                                            { label: 'T6', value: 5 },
                                                            { label: 'T7', value: 6 },
                                                            { label: 'CN', value: 7 },
                                                        ]}
                                                        value={autoFillWeekdays}
                                                        onChange={checked => setAutoFillWeekdays(checked as number[])}
                                                    />
                                                </Col>
                                                <Col xs={24} xl={6}>
                                                    <div style={{ marginBottom: 8 }}>
                                                        <Text strong style={{ fontSize: 13 }}>Ngày nghỉ</Text>{' '}
                                                        <Text type="secondary" style={{ fontSize: 12 }}>(Cách nhau dấu phẩy)</Text>
                                                    </div>
                                                    <Input
                                                        placeholder="VD: 30/04/2027, 01/05/2027"
                                                        value={autoFillHolidays}
                                                        onChange={e => setAutoFillHolidays(e.target.value)}
                                                    />
                                                </Col>
                                                <Col xs={24} xl={3} style={{ textAlign: 'right' }}>
                                                    <Button type="primary" onClick={handleAutoFillDates} style={{ width: '100%' }}>Áp dụng</Button>
                                                </Col>
                                            </Row>
                                        </div>
                                        {(selectedLessons as (string | number)[]).map((lessonKey) => (
                                            <Card
                                                key={lessonKey}
                                                size="small"
                                                title={<Text style={{ fontSize: 14 }}>
                                                    {calendarContexts.find((item) => item.calendarId === String(lessonKey))?.label || `Lịch ${lessonKey}`}
                                                </Text>}
                                                style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #e8e8e8' }}
                                                headStyle={{ borderBottom: '1px solid #e8e8e8', padding: '10px 16px' }}
                                                bodyStyle={{ padding: '16px' }}
                                            >
                                                <Row gutter={[16, 16]} align="top">
                                                    <Col xs={24} md={8} xl={3}>
                                                        <Form.Item
                                                            label={<Text>Ngày học</Text>}
                                                            name={['separate_config', lessonKey, 'start_date']}
                                                            style={{ marginBottom: 0 }}
                                                        >
                                                            <DatePicker format="dddd - DD/MM/YYYY" style={{ width: '100%' }} />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={12} md={8} xl={2}>
                                                        <Form.Item
                                                            label={<Text>Bắt đầu</Text>}
                                                            name={['separate_config', lessonKey, 'start_time']}
                                                            style={{ marginBottom: 0 }}
                                                        >
                                                            <TimePicker
                                                                format="HH:mm"
                                                                style={{ width: '100%' }}
                                                                onChange={(value) => revalidateOrClearEndTime(['separate_config', lessonKey, 'end_time'], value)}
                                                            />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={12} md={8} xl={2}>
                                                        <Form.Item noStyle dependencies={[['separate_config', lessonKey, 'start_time']]}>
                                                            {({ getFieldValue }) => {
                                                                const separateStartTime = getFieldValue(['separate_config', lessonKey, 'start_time']) as Dayjs | undefined;
                                                                return (
                                                                    <Form.Item
                                                                        label={<Text>Kết thúc</Text>}
                                                                        name={['separate_config', lessonKey, 'end_time']}
                                                                        style={{ marginBottom: 0 }}
                                                                        rules={[{ validator: validateEndTimeAfter(['separate_config', lessonKey, 'start_time']) }]}
                                                                    >
                                                                        <TimePicker
                                                                            format="HH:mm"
                                                                            style={{ width: '100%' }}
                                                                            disabledTime={() => getEndDisabledTime(separateStartTime)}
                                                                            defaultOpenValue={separateStartTime}
                                                                            disabled={!separateStartTime}
                                                                        />
                                                                    </Form.Item>
                                                                );
                                                            }}
                                                        </Form.Item>
                                                    </Col>

                                                    <Col xs={24} md={12} xl={4}>
                                                        <Form.Item
                                                            label={<Text>Giáo viên</Text>}
                                                            name={['separate_config', lessonKey, 'teacher']}
                                                            style={{ marginBottom: 0 }}
                                                        >
                                                            <TeachingStaffSelect teacherType={1} teacherValueMode="displayName" showSearch optionFilterProp="label" placeholder="Chọn giáo viên" />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={24} md={12} xl={6}>
                                                        <Form.Item
                                                            label={<Text>Trợ giảng</Text>}
                                                            name={['separate_config', lessonKey, 'assistant_teacher']}
                                                            style={{ marginBottom: 0 }}
                                                        >
                                                            <TeachingStaffSelect teacherType={0} mode="multiple" showSearch optionFilterProp="label" placeholder="Chọn trợ giảng" maxTagCount="responsive" />
                                                        </Form.Item>
                                                    </Col>
                                                    <Col xs={24} xl={8} style={{ order: 3 }}>
                                                        <Form.Item noStyle dependencies={[["separate_config", lessonKey, "enable_lesson_name_pattern"]]}>
                                                            {({ getFieldValue }) => {
                                                                const enabled = getFieldValue(['separate_config', lessonKey, 'enable_lesson_name_pattern']);
                                                                return (
                                                                    <Form.Item
                                                                        label={
                                                                            <Form.Item name={['separate_config', lessonKey, 'enable_lesson_name_pattern']} valuePropName="checked" noStyle>
                                                                                <Checkbox><Text>Thêm tiền tố / hậu tố tên bài</Text></Checkbox>
                                                                            </Form.Item>
                                                                        }
                                                                        style={{ marginBottom: 0 }}
                                                                    >
                                                                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, opacity: enabled ? 1 : 0.5 }}>
                                                                            <Form.Item name={['separate_config', lessonKey, 'lesson_name_prefix']} style={{ marginBottom: 0 }} rules={[{ max: 100 }]}>
                                                                                <Input disabled={!enabled} maxLength={100} placeholder="Tiền tố: [Lịch {n}] - " style={{ width: 220 }} />
                                                                            </Form.Item>
                                                                            <Form.Item name={['separate_config', lessonKey, 'lesson_name_suffix']} style={{ marginBottom: 0 }} rules={[{ max: 100 }]}>
                                                                                <Input disabled={!enabled} maxLength={100} placeholder="Hậu tố: - Lần {n}" style={{ width: 190 }} />
                                                                            </Form.Item>
                                                                        </div>
                                                                    </Form.Item>
                                                                );
                                                            }}
                                                        </Form.Item>
                                                    </Col>

                                                    {(() => {
                                                        const record = selectedRows.find(
                                                            (item) => String(item.id) === String(lessonKey)
                                                        );
                                                        const internalLessonId = String(record?.session_id || '');
                                                        const options = hmoOptionsByLesson[internalLessonId] || [];
                                                        return (
                                                                    <Col xs={24} xl={16} style={{ order: 2 }}>
                                                                        <Form.Item
                                                                    label={<Text>Lesson ID HMO</Text>}
                                                                    name={['separate_config', lessonKey, 'hmo_mapping_keys']}
                                                                    extra={options.length
                                                                        ? `${summarizeHmoOptions(options)} — danh sách được nhóm theo Package/Course.`
                                                                        : undefined}
                                                                    style={{ marginBottom: 0 }}
                                                                >
                                                                    <HmoMappingSelect
                                                                        allowClear
                                                                        showSearch
                                                                        optionFilterProp="label"
                                                                        loading={loadingHmoLessons.has(internalLessonId)}
                                                                        disabled={!internalLessonId}
                                                                        listHeight={420}
                                                                        popupMatchSelectWidth={680}
                                                                        placeholder={!internalLessonId
                                                                            ? 'Lịch chưa gắn bài học'
                                                                            : options.length
                                                                                ? 'Chọn Lesson ID HMO'
                                                                                : 'Bài chưa có Course ID / HMO không có Lesson ID'}
                                                                        options={buildGroupedHmoOptions(options)}
                                                                        style={{ width: '100%' }}
                                                                    />
                                                                </Form.Item>
                                                                {hmoSyncNotes[String(lessonKey)] && (
                                                                    <Alert
                                                                        showIcon
                                                                        type={hmoSyncNotes[String(lessonKey)].type}
                                                                        message={hmoSyncNotes[String(lessonKey)].message}
                                                                        style={{ marginTop: 8 }}
                                                                    />
                                                                )}
                                                            </Col>
                                                        );
                                                    })()}
                                                </Row>
                                            </Card>
                                        ))}
                                    </>
                                ) : (
                                    <Text type="secondary">Vui lòng chọn ít nhất 1 lịch học từ Bảng ở trên.</Text>
                                )}
                            </div>
                        )}
                    </>
                )}

                {operation !== 'update' && (
                    <FormSection title={operation === 'cancel' ? 'Xác nhận nghỉ học hàng loạt' : 'Cấu hình lịch bù hàng loạt'}>
                        <Alert
                            showIcon
                            type={operation === 'cancel' ? 'warning' : 'info'}
                            style={{ marginBottom: 16 }}
                            message={operation === 'cancel'
                                ? 'Các lịch đã chọn sẽ chuyển sang trạng thái Nghỉ học và không tạo lịch thay thế.'
                                : 'Mỗi lịch đã chọn sẽ được giữ lại dưới dạng lịch nghỉ và tạo một lịch bù mới có cùng nội dung.'}
                        />
                        {operation === 'makeup' && (
                            <Form.Item
                                name="offset_days"
                                label="Dịch lịch bù thêm bao nhiêu ngày"
                                initialValue={7}
                                rules={[{ required: true, message: 'Nhập số ngày dịch lịch bù' }]}
                            >
                                <InputNumber min={1} max={3650} precision={0} style={{ width: 220 }} addonAfter="ngày" />
                            </Form.Item>
                        )}

                        <Divider orientation="left" plain style={{ margin: '8px 0 16px' }}>
                            Tên bài hiển thị sau thao tác
                        </Divider>
                        <Row gutter={24}>
                            <Col flex={operation === 'makeup' ? '420px' : '100%'}>
                                <Text strong>Buổi nghỉ</Text>
                                <Row gutter={12} style={{ marginTop: 8 }}>
                                    <Col flex="180px">
                                        <Form.Item label="Tiền tố" name="canceled_lesson_name_prefix">
                                            <Input placeholder="[Nghỉ] " maxLength={100} style={{ width: '100%', maxWidth: 180 }} />
                                        </Form.Item>
                                    </Col>
                                    <Col flex="180px">
                                        <Form.Item label="Hậu tố" name="canceled_lesson_name_suffix">
                                            <Input placeholder="Để trống nếu không dùng" maxLength={100} style={{ width: '100%', maxWidth: 180 }} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Col>
                            {operation === 'makeup' && (
                                <Col flex="420px">
                                    <Text strong>Buổi học bù</Text>
                                    <Row gutter={12} style={{ marginTop: 8 }}>
                                        <Col flex="180px">
                                            <Form.Item label="Tiền tố" name="new_lesson_name_prefix">
                                                <Input placeholder="[Học Bù] " maxLength={100} style={{ width: '100%', maxWidth: 180 }} />
                                            </Form.Item>
                                        </Col>
                                        <Col flex="180px">
                                            <Form.Item label="Hậu tố" name="new_lesson_name_suffix">
                                                <Input placeholder="Để trống nếu không dùng" maxLength={100} style={{ width: '100%', maxWidth: 180 }} />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </Col>
                            )}
                        </Row>

                        <Form.Item
                            name="reason"
                            label="Lý do thay đổi"
                            rules={[
                                { required: true, whitespace: true, message: 'Nhập lý do thay đổi lịch học' },
                                { max: 500, message: 'Lý do không được quá 500 ký tự' },
                            ]}
                        >
                            <Input.TextArea rows={3} maxLength={500} showCount placeholder="Ví dụ: Nghỉ lễ theo thông báo của nhà trường" />
                        </Form.Item>
                    </FormSection>
                )}
                {previewRows.length > 0 && (
                    <div ref={previewRef} style={{ scrollMarginTop: 16 }}>
                        <Alert
                            type="info"
                            showIcon
                            style={{ marginTop: 16 }}
                            message={operation === 'update' ? 'Xem trước thay đổi trước khi cập nhật' : 'Xem trước thao tác hàng loạt'}
                            description={
                                <Table
                                    scroll={{ x: "max-content" }}
                                    size="small"
                                    pagination={false}
                                    rowKey="id"
                                    dataSource={previewRows}
                                    columns={[
                                        { title: 'Bài', dataIndex: 'label', width: 90 },
                                        {
                                            title: 'Tên bài',
                                            hidden: operation !== 'update',
                                            render: (_, row) => renderPreviewChange(row.current_lesson_name, row.next_lesson_name),
                                        },
                                        {
                                            title: 'Tên bài sau thao tác',
                                            hidden: operation === 'update',
                                            render: (_, row) => (
                                                <div style={{ whiteSpace: 'pre-line' }}>{row.next_lesson_name}</div>
                                            ),
                                        },
                                        {
                                            title: 'Giáo viên',
                                            hidden: operation !== 'update',
                                            render: (_, row) => renderPreviewChange(row.current_teacher, row.next_teacher),
                                        },
                                        {
                                            title: 'Trợ giảng',
                                            hidden: operation !== 'update',
                                            render: (_, row) => renderPreviewChange(row.current_assistant, row.next_assistant),
                                        },
                                        {
                                            title: 'Thứ',
                                            width: 100,
                                            hidden: operation !== 'update',
                                            render: (_, row) => renderPreviewChange(row.current_weekday, row.next_weekday),
                                        },
                                        {
                                            title: 'Thời gian',
                                            hidden: operation !== 'update',
                                            render: (_, row) => renderPreviewChange(row.current_schedule, row.next_schedule),
                                        },
                                        operation === 'update'
                                            ? {
                                                title: 'Lesson ID HMO',
                                                width: 340,
                                                render: (_: unknown, row: any) => renderMappingPreviewChange(row.current, row.next),
                                            }
                                            : { title: 'Lịch hiện tại', dataIndex: 'current' },
                                        ...(operation === 'update' ? [] : [{ title: 'Sau thao tác', dataIndex: 'next' }]),
                                    ]}
                                />
                            }
                        />
                    </div>
                )}
            </Form>
        </Modal>
        <Modal
            title="Tiến trình xử lý lịch học"
            open={Boolean(submitProgress)}
            footer={null}
            closable={false}
            maskClosable={false}
            keyboard={false}
            width={520}
            zIndex={1200}
        >
            {submitProgress && (
                <div style={{ padding: '20px 4px 8px' }}>
                    <Text strong style={{ display: 'block', marginBottom: 12 }}>
                        {submitProgress.message}
                    </Text>
                    <Progress
                        percent={submitProgress.percent}
                        status={submitProgress.percent === 100 ? 'success' : 'active'}
                        size="default"
                    />
                    <div style={{ marginTop: 12, padding: '12px 16px', borderRadius: 8, background: '#f5f5f5' }}>
                        {submitProgress.completed > 0 ? (
                            <Text strong>
                                Đã xử lý {submitProgress.completed}/{submitProgress.total} lịch học
                            </Text>
                        ) : (
                            <>
                                <Text>Đang xử lý: {submitProgress.total} lịch học</Text>
                                <br />
                                <Text type="secondary">
                                    Vui lòng chờ trong giây lát. Hệ thống sẽ tự động lưu toàn bộ thay đổi khi hoàn tất.
                                </Text>
                            </>
                        )}
                    </div>
                </div>
            )}
        </Modal>
        </>
    );  
};

export default BulkEditModal;
