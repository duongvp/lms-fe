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
    type SelectProps,
} from 'antd';
import { EditOutlined, CloseCircleOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import TeachingStaffSelect from '@/components/shared/TeachingStaffSelect';
import { buildGroupedHmoOptions, hmoOptionKey, summarizeHmoOptions } from '@/helper/hmoOptions';
import {
    getHocmaiSectionsForSchedulingLesson,
    updateLivestreamBulk,
    type HocmaiSectionOption,
} from '@/services/livestreamService';

const { Text, Title } = Typography;

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

const ROOM_OPTIONS = [
    { label: "Phòng 101 - Lý Thuyết", value: "Phòng 101" },
    { label: "Phòng 202 - Lab Máy Tính", value: "Phòng 202" },
    { label: "Phòng Online - Zoom 01", value: "Zoom 01" },
];

const renderHmoSelectedTag: SelectProps['tagRender'] = ({ value, closable, onClose }) => {
    const lessonId = String(value || '').split('::').at(-1) || String(value || '');
    return (
        <span className="ant-select-selection-item" style={{ marginInlineEnd: 4 }}>
            <span className="ant-select-selection-item-content">{lessonId}</span>
            {closable && (
                <span
                    className="ant-select-selection-item-remove"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={onClose}
                >
                    ×
                </span>
            )}
        </span>
    );
};

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
    const [selectedRows, setSelectedRows] = React.useState<any[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = React.useState<React.Key[]>([]);
    const [previewRows, setPreviewRows] = React.useState<any[]>([]);
    const [hmoOptionsByLesson, setHmoOptionsByLesson] = React.useState<Record<string, HocmaiSectionOption[]>>({});
    const [loadingHmoLessons, setLoadingHmoLessons] = React.useState<Set<string>>(new Set());
    const [syncingHmoLessonIds, setSyncingHmoLessonIds] = React.useState(false);
    const [hmoSyncNotes, setHmoSyncNotes] = React.useState<Record<string, { type: 'success' | 'warning'; message: string }>>({});
    const previewRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!previewRows.length) return;
        const frame = requestAnimationFrame(() => {
            previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        return () => cancelAnimationFrame(frame);
    }, [previewRows.length]);

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

    useEffect(() => {
        if (!open) return;
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
    }, [lessonContexts, open]);

    // Form Watchers
    const configMode = Form.useWatch('config_mode', form) || 'common';
    const operation = Form.useWatch('operation', form) || 'update';
    const selectedLessons = Form.useWatch('selected_lessons', form) || selectedRowKeys;
    const commonStartTime = Form.useWatch('common_start_time', form) as Dayjs | undefined;

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
                const allSameRoom = selectedRows.every(r => r.room === firstRow.room);

                if (allSameTeacher) {
                    commonConfig.common_teacher = teacherValue(firstRow.teacher);
                }
                if (allSameRoom) {
                    commonConfig.common_room = firstRow.room;
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
                selected_lessons: selectedRowKeys,
                separate_config: separateConfig,
                ...commonConfig,
            });
            setPreviewRows([]);
        }
    }, [open, selectedRowKeys, selectedRows, form, lessonContexts, calendarContexts]);

    const handleClose = () => {
        form.resetFields();
        setPreviewRows([]);
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
        const rows = mappings.flatMap((mapping) => {
            const lessonIds = mapping.lesson_ids ?? (mapping.lesson_id ? [mapping.lesson_id] : []);
            return lessonIds.map((lessonId: string) => `Lesson ${lessonId}`);
        });
        return rows.length ? rows.join('; ') : 'Chưa mapping';
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
        const labels = keys.map((key) => {
            const option = optionByKey.get(key);
            const externalLessonId = option?.lesson_id || String(key).split('::')[2];
            return option?.lesson_name
                ? `Lesson ${externalLessonId}: ${option.lesson_name}`
                : `Lesson ${externalLessonId}`;
        });
        return labels.length ? labels.join('; ') : 'Chưa mapping';
    };

    const handleSyncHmoLessonIds = async () => {
        const targetIds = (form.getFieldValue('selected_lessons') || selectedRowKeys).map(String);
        const rows = selectedRows.filter((row) => targetIds.includes(String(row.id)));
        if (!rows.length) {
            message.warning('Chưa chọn lịch học để đồng bộ Lesson ID HMO');
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
                const seenOptionIds = new Set<string>();
                const title = normalizeLessonTitle(lessonRows[0]?.lesson_name);
                const matchedOptions = (optionsByLesson.get(lessonId) || [])
                    .filter((option) => normalizeLessonTitle(option.lesson_name) === title)
                    .sort((left, right) => String(left.lesson_id).localeCompare(String(right.lesson_id), 'vi', { numeric: true }))
                    .filter((option) => {
                        const optionId = String(option.lesson_id);
                        if (seenOptionIds.has(optionId)) return false;
                        seenOptionIds.add(optionId);
                        return true;
                    });
                const orderedRows = [...lessonRows].sort((left, right) => dayjs(left.start_time).valueOf() - dayjs(right.start_time).valueOf());

                if (matchedOptions.length === orderedRows.length && orderedRows.length > 0) {
                    orderedRows.forEach((row, index) => {
                        nextMappings[String(row.id)] = [hmoOptionKey(matchedOptions[index])];
                    });
                    syncedCount += orderedRows.length;
                    orderedRows.forEach((row) => {
                        notes[String(row.id)] = { type: 'success', message: `Đã gán Lesson ID theo thứ tự tăng dần: ${String(nextMappings[String(row.id)][0]).split('::').at(-1)}.` };
                    });
                    return;
                }

                orderedRows.forEach((row) => {
                    notes[String(row.id)] = {
                        type: 'warning',
                        message: `Có ${orderedRows.length} lịch nhưng chỉ tìm thấy ${matchedOptions.length} Lesson ID trùng tên. Hệ thống không tự gán.`,
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
            setHmoSyncNotes(notes);
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
                        };
                    }));
                    return;
                }
                const targetIds = (values.selected_lessons || []).map(String);
                await updateLivestreamBulk({
                    ids: targetIds,
                    operation: values.operation,
                    reason: String(values.reason || '').trim(),
                    offset_days: values.operation === 'makeup' ? Number(values.offset_days) : undefined,
                });
                sessionStorage.removeItem("schedule:auto-edit:rows");
                await onSuccess();
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
                        ...(mappingTouched
                            ? { package_lesson_mappings: mappingKeysToPayload(config.hmo_mapping_keys) }
                            : {}),
                    };
                    delete formattedSeparateConfig[key].hmo_mapping_keys;
                });
            }

            const selectedIds = (values.selected_lessons || []).map(String);
            const lessonNameByCalendarId = new Map<string, string>();
            if (values.config_mode === 'common' && values.enable_lesson_name_pattern) {
                const nameRules = (values.lesson_name_rules || []).map((rule: any, index: number) => {
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
                        if (occurrence > 1 || applyToFirstSession) {
                            lessonNameByCalendarId.set(
                                String(record.id),
                                `${renderNamePattern(rule?.prefix ?? values.lesson_name_prefix, occurrence)}${String(record.lesson_name || '')}${renderNamePattern(rule?.suffix ?? values.lesson_name_suffix, occurrence)}`.slice(0, 400)
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
                                `${renderNamePattern(config.lesson_name_prefix, occurrence)}${String(record.lesson_name || '')}${renderNamePattern(config.lesson_name_suffix, occurrence)}`.slice(0, 400)
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
                    if (values.enable_room && values.common_room && values.common_room !== record.room) update.room = values.common_room;
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
                        : !form.isFieldTouched([
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
            await updateLivestreamBulk({ ids: targetIds, config_mode: 'separate', update_data: changedUpdates });
            sessionStorage.removeItem("schedule:auto-edit:rows");
            await onSuccess();
            handleClose();
        } catch (err) {
            console.error("Lỗi cập nhật hàng loạt:", err);
            message.error({
                content: getErrorMessage(err),
                duration: 8,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            rootClassName="schedule-responsive-modal"
            title="Cập Nhật Lịch Học Hàng Loạt"
            open={open}
            onCancel={handleClose}
            width={fullscreen ? "100%" : 1100}
            style={fullscreen ? { top: 0, maxWidth: "none", paddingBottom: 0 } : undefined}
            styles={fullscreen ? { content: { height: "100dvh", display: "flex", flexDirection: "column" }, body: { flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" } } : undefined}
            footer={[
                <Button key="cancel" onClick={handleClose} icon={<CloseCircleOutlined />}>
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
                onValuesChange={() => {
                    if (previewRows.length) setPreviewRows([]);
                }}
                initialValues={{
                    operation: 'update',
                    config_mode: 'common',
                    enable_teacher: true,
                    enable_assistant: false,
                    enable_time: true,
                    enable_room: false,
                    enable_mapping: false,
                }}
            >
                {/* Banner thông tin phạm vi áp dụng */}
                <Alert
                    type="info"
                    showIcon
                    message={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <Text>Thay đổi chỉ áp dụng cho các dòng đã tích chọn.</Text>
                            <Tag color="blue" style={{ marginRight: 0, fontWeight: 500 }}>
                                {selectedRowKeys.length} lịch học đã chọn
                            </Tag>
                        </div>
                    }
                    style={{ marginBottom: 20 }}
                />

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
                    <Card size="small" style={{borderRadius: 8, border: '1px solid #e8e8e8', padding: '8px 12px' }}>
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
                            <Col span={8}>
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
                                                    style={{ width: '100%' }}
                                                    placeholder="Giờ bắt đầu"
                                                    disabled={!enabled}
                                                    onChange={(value) => revalidateOrClearEndTime('common_end_time', value)}
                                                />
                                            </Form.Item>
                                        );
                                    }}
                                </Form.Item>
                            </Col>
                            <Col span={8}>
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
                                                    style={{ width: '100%' }}
                                                    placeholder="Nhập giờ bắt đầu trước"
                                                    disabledTime={() => getEndDisabledTime(commonStartTime)}
                                                    disabled={!enabled || !commonStartTime}
                                                />
                                            </Form.Item>
                                        );
                                    }}
                                </Form.Item>
                            </Col>
                        </Row>
                        <Divider style={{ margin: '12px 0' }} />

                        <Row gutter={16} align="top" style={{ marginBottom: 8 }}>
                            <Col span={8}>
                                <Form.Item name="enable_lesson_name_pattern" valuePropName="checked" style={{ marginBottom: 0 }}>
                                    <Checkbox><Text strong>Thêm tiền tố / hậu tố tên bài</Text></Checkbox>
                                </Form.Item>
                                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                                    Dùng <Text code>{'{n}'}</Text> để chèn số lần diễn ra của từng bài. Ví dụ tiền tố “Lịch {'{n}'} - ” với tên “Bài 1” sẽ thành “Lịch 1 - Bài 1”. Mặc định mẫu chỉ áp dụng từ buổi thứ hai; tích chọn bên phải để áp dụng ngay từ buổi đầu.
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
                                                <Form.Item name="apply_name_pattern_to_first_session" valuePropName="checked" style={{ marginBottom: 0, paddingTop: 30 }}>
                                                    <Checkbox disabled={!enabled}>Áp dụng cả buổi đầu tiên</Checkbox>
                                                </Form.Item>
                                            </Space>
                                        );
                                    }}
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item noStyle dependencies={['enable_lesson_name_pattern']}>
                            {({ getFieldValue }) => getFieldValue('enable_lesson_name_pattern') && (
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

                        {/* Tùy chọn Phòng học */}
                        <Row gutter={16} align="middle" style={{ marginBottom: 8 }}>
                            <Col span={8}>
                                <Form.Item name="enable_room" valuePropName="checked" style={{ marginBottom: 0 }}>
                                    <Checkbox><Text strong>Đổi Phòng học</Text></Checkbox>
                                </Form.Item>
                            </Col>
                            <Col span={16}>
                                <Form.Item noStyle dependencies={['enable_room']}>
                                    {({ getFieldValue }) => {
                                        const enabled = getFieldValue('enable_room');
                                        return (
                                            <Form.Item
                                                name="common_room"
                                                style={{ marginBottom: 0 }}
                                                rules={[{ required: enabled, message: 'Vui lòng chọn phòng học' }]}
                                            >
                                                <Select
                                                    placeholder="Chọn phòng học"
                                                    options={ROOM_OPTIONS}
                                                    disabled={!enabled}
                                                />
                                            </Form.Item>
                                        );
                                    }}
                                </Form.Item>
                            </Col>
                        </Row>
                        <Divider style={{ margin: '12px 0' }} />
                        <Row gutter={16} align="top" style={{ marginBottom: 8 }}>
                            <Col span={8}>
                                <Form.Item name="enable_mapping" valuePropName="checked" style={{ marginBottom: 0 }}>
                                    <Checkbox><Text strong>Đổi Lesson ID HMO</Text></Checkbox>
                                </Form.Item>
                                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                                    Chọn riêng Lesson ID cho từng lịch. Course ID và Package ID được lấy từ bài học của lịch đó.
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
                                                                <Select
                                                                    mode="multiple"
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
                                                                    tagRender={renderHmoSelectedTag}
                                                                    maxTagCount="responsive"
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
                                <Space direction="vertical" size={4} style={{ marginBottom: 12 }}>
                                    <Button
                                        type="primary"
                                        ghost
                                        icon={<SyncOutlined spin={syncingHmoLessonIds} />}
                                        loading={syncingHmoLessonIds}
                                        onClick={() => void handleSyncHmoLessonIds()}
                                    >
                                        Đồng bộ Lesson ID HMO cho các lịch đã chọn
                                    </Button>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Chỉ tự gán khi số Lesson ID trùng tên khớp chính xác số lịch của mỗi bài.
                                    </Text>
                                </Space>
                                {(selectedLessons as (string | number)[]).map((lessonKey) => (
                                    <Card
                                        key={lessonKey}
                                        size="small"
                                        title={<Text style={{fontSize: 14 }}>
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
                                                    <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
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
                                                    <TeachingStaffSelect teacherType={1} showSearch optionFilterProp="label" placeholder="Chọn giáo viên" />
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
                                            <Col xs={24} xl={7}>
                                                <Form.Item noStyle dependencies={[["separate_config", lessonKey, "enable_lesson_name_pattern"]]}>
                                                    {({ getFieldValue }) => {
                                                        const enabled = getFieldValue(['separate_config', lessonKey, 'enable_lesson_name_pattern']);
                                                        return (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, minHeight: 32 }}>
                                                                <Form.Item name={['separate_config', lessonKey, 'enable_lesson_name_pattern']} valuePropName="checked" style={{ marginBottom: 0 }}>
                                                                    <Checkbox><Text strong>Thêm tiền tố / hậu tố tên bài</Text></Checkbox>
                                                                </Form.Item>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, opacity: enabled ? 1 : 0.5 }}>
                                                                    <Form.Item name={['separate_config', lessonKey, 'lesson_name_prefix']} style={{ marginBottom: 0 }} rules={[{ max: 100 }]}>
                                                                        <Input disabled={!enabled} maxLength={100} placeholder="Tiền tố: [Lịch {n}] - " style={{ width: 220 }} />
                                                                    </Form.Item>
                                                                    <Form.Item name={['separate_config', lessonKey, 'lesson_name_suffix']} style={{ marginBottom: 0 }} rules={[{ max: 100 }]}>
                                                                        <Input disabled={!enabled} maxLength={100} placeholder="Hậu tố: - Lần {n}" style={{ width: 190 }} />
                                                                    </Form.Item>
                                                                </div>
                                                            </div>
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
                                                <Col xs={24} xl={7}>
                                                    <Form.Item
                                                        label={<Text>Lesson ID HMO</Text>}
                                                        name={['separate_config', lessonKey, 'hmo_mapping_keys']}
                                                        extra={options.length
                                                            ? `${summarizeHmoOptions(options)} — danh sách được nhóm theo Package/Course.`
                                                            : undefined}
                                                        style={{ marginBottom: 0 }}
                                                    >
                                                        <Select
                                                            mode="multiple"
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
                                                            tagRender={renderHmoSelectedTag}
                                                            maxTagCount="responsive"
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
    );
};

export default BulkEditModal;
