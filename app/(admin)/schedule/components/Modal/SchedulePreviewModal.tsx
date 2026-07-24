import React, { useEffect, useState } from 'react';
import {
    Alert,
    Button,
    Checkbox,
    Form,
    Input,
    message,
    Modal,
    Select,
    Space,
    Table,
    TimePicker,
    Tooltip,
    Typography,
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    InfoCircleOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import { Dayjs } from 'dayjs';
import {
    toLivestreamPayload,
    toRescheduleLivestreamPayload,
    toUpdateLivestreamPayload,
} from '@/services/livestreamService';
import {
    createLesson,
    getLessons,
    type LessonApiResponse,
} from '@/services/lessonService';
import { combineDateTime } from '@/helper/convertDate';
import { useAuthStore } from '@/stores/authStore';
import { PermissionKey } from '@/types/permissions';
import { formatLessonScheduleOption } from '@/helper/lesson';

const { Text } = Typography;

interface SchedulePreviewModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (
        payload: any,
        type: 'bulk' | 'single' | 'update_current' | 'update_following' | 'update_makeup' | 'update_cancel'
    ) => void;
    formValues: any;
    isEdit: boolean;
    initialData?: any;
    loading?: boolean;
    errorMessage?: string | null;
}

interface PreviewSession {
    key: string;
    index: number;
    date: Dayjs;
    start_time: Dayjs;
    end_time: Dayjs;
    teacher: string;
    lesson_id?: string;
    master_lesson_name?: string;
    lesson_name?: string;
    learn_number?: number;
    isSkipped: boolean;
    isGenerated: boolean;
}

const TEACHER_OPTIONS = [
    { value: 'Nguyễn Văn A', label: 'Nguyễn Văn A' },
    { value: 'Trần Thị B', label: 'Trần Thị B' },
    { value: 'Lê Hoàng C', label: 'Lê Hoàng C' },
    { value: 'Phạm Thảo D', label: 'Phạm Thảo D' },
];

const SchedulePreviewModal: React.FC<SchedulePreviewModalProps> = ({
    open,
    onClose,
    onConfirm,
    formValues,
    isEdit,
    loading,
    errorMessage,
}) => {
    const [sessions, setSessions] = useState<PreviewSession[]>([]);
    const [requiredSessions, setRequiredSessions] = useState(0);
    const [lessons, setLessons] = useState<LessonApiResponse[]>([]);
    const [loadingLessons, setLoadingLessons] = useState(false);
    const [quickLessonOpen, setQuickLessonOpen] = useState(false);
    const [quickLessonTarget, setQuickLessonTarget] = useState<string | null>(null);
    const [creatingLesson, setCreatingLesson] = useState(false);
    const [customizeLessonNames, setCustomizeLessonNames] = useState(false);
    const [lessonNamePrefix, setLessonNamePrefix] = useState('[Lịch {n}] - ');
    const [lessonNameSuffix, setLessonNameSuffix] = useState('');
    const [quickLessonForm] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();
    const hasPermission = useAuthStore((state) => state.hasPermission);
    const canCreateLesson = hasPermission(PermissionKey.LESSON_CREATE);
    const isBulkCreate = !isEdit && formValues?.addMode === 'bulk';

    const renderNamePattern = (pattern: string, occurrence: number) =>
        pattern.replaceAll('{n}', String(occurrence));

    const buildDynamicLessonNames = React.useCallback((
        currentSessions: PreviewSession[],
        prefix = lessonNamePrefix,
        suffix = lessonNameSuffix
    ) => {
        const previewCounts = new Map<string, number>();

        return currentSessions.map((session) => {
            if (!session.lesson_id) return session;

            const lesson = lessons.find(
                (item) => String(item.id) === String(session.lesson_id)
            );
            const lessonKey = String(session.lesson_id);
            const previousPreviewCount = previewCounts.get(lessonKey) ?? 0;
            const occurrence = Number(lesson?.scheduled_count ?? 0) + previousPreviewCount + 1;

            if (!session.isSkipped) {
                previewCounts.set(lessonKey, previousPreviewCount + 1);
            }

            const masterName = session.master_lesson_name
                || lesson?.lesson_name
                || session.lesson_name
                || '';

            return {
                ...session,
                master_lesson_name: masterName,
                lesson_name: occurrence === 1
                    ? masterName
                    : `${renderNamePattern(prefix, occurrence)}${masterName}${renderNamePattern(suffix, occurrence)}`.slice(0, 400),
            };
        });
    }, [lessonNamePrefix, lessonNameSuffix, lessons]);

    const loadLessons = React.useCallback(async () => {
        if (!isBulkCreate || !formValues?.bulk_grade || !formValues?.bulk_subject_name) {
            setLessons([]);
            return [];
        }

        try {
            setLoadingLessons(true);
            const response: any = await getLessons({
                page: 1,
                limit: 100,
                grade: formValues.bulk_grade,
                subject: formValues.bulk_subject_name,
                course_code: formValues.bulk_code,
                sort_by: 'learn_number',
                sort_order: 'asc',
            });
            const rows = response?.data?.data ?? [];
            setLessons(rows);
            return rows as LessonApiResponse[];
        } catch (error: any) {
            setLessons([]);
            messageApi.error(error.message || 'Không thể tải danh sách bài học.');
            return [];
        } finally {
            setLoadingLessons(false);
        }
    }, [
        formValues?.bulk_grade,
        formValues?.bulk_subject_name,
        formValues?.bulk_code,
        isBulkCreate,
        messageApi,
    ]);

    useEffect(() => {
        if (open && isBulkCreate) loadLessons();
    }, [isBulkCreate, loadLessons, open]);

    useEffect(() => {
        if (!open || !formValues) return;

        if (isBulkCreate) {
            const numSessions = parseInt(formValues.number_of_sessions || '1', 10);
            setRequiredSessions(numSessions);
            generateSessions(
                formValues.bulk_start_date,
                formValues.days_of_week || [],
                numSessions,
                formValues,
                []
            );
            return;
        }

        if (!isEdit && formValues.addMode === 'single') {
            setSessions([{
                key: 'single',
                index: 1,
                date: formValues.date,
                start_time: formValues.start_time,
                end_time: formValues.end_time,
                teacher: formValues.teacher,
                lesson_id: String(formValues.lesson_id),
                master_lesson_name: formValues.master_lesson_name || formValues.lesson_name,
                lesson_name: formValues.lesson_name,
                learn_number: Number(formValues.learn_number),
                isSkipped: false,
                isGenerated: true,
            }]);
            setRequiredSessions(1);
            return;
        }

        if (isEdit && (formValues.update_mode === 'following' || formValues.update_mode === 'makeup')) {
            setSessions([{
                key: 'new_session',
                index: 1,
                date: formValues.new_session?.date,
                start_time: formValues.new_session?.start_time,
                end_time: formValues.new_session?.end_time,
                teacher: formValues.new_session?.teacher,
                isSkipped: false,
                isGenerated: true,
            }]);
        } else if (isEdit && formValues.update_mode === 'current') {
            setSessions([{
                key: 'current',
                index: 1,
                date: formValues.date,
                start_time: formValues.start_time,
                end_time: formValues.end_time,
                teacher: formValues.teacher,
                isSkipped: false,
                isGenerated: true,
            }]);
        } else {
            setSessions([]);
            setRequiredSessions(0);
        }
    }, [formValues, isBulkCreate, isEdit, open]);

    useEffect(() => {
        if (!lessons.length) return;

        setSessions((current) => {
            const hydratedSessions = current.map((session) => {
            if (session.lesson_id || session.learn_number === undefined) return session;
            const lesson = lessons.find(
                (item) => Number(item.learn_number) === Number(session.learn_number)
            );
            return lesson ? {
                ...session,
                lesson_id: String(lesson.id),
                master_lesson_name: lesson.lesson_name,
                lesson_name: lesson.lesson_name,
                learn_number: lesson.learn_number,
            } : session;
            });

            return customizeLessonNames
                ? buildDynamicLessonNames(hydratedSessions)
                : hydratedSessions;
        });
    }, [buildDynamicLessonNames, customizeLessonNames, lessons]);

    const getConfigForDay = (
        date: Dayjs,
        bulkConfigMode: string,
        separateConfig: any,
        commonFormValues: any
    ) => {
        if (bulkConfigMode === 'separate') {
            const dayValue = date.day() === 0 ? 1 : date.day() + 1;
            const config = separateConfig?.[dayValue];
            return {
                start_time: config?.start_time || commonFormValues.bulk_start_time,
                end_time: config?.end_time || commonFormValues.bulk_end_time,
                teacher: config?.teacher || commonFormValues.bulk_teacher,
            };
        }
        return {
            start_time: commonFormValues.bulk_start_time,
            end_time: commonFormValues.bulk_end_time,
            teacher: commonFormValues.bulk_teacher,
        };
    };

    function generateSessions(
        startDate: Dayjs,
        daysOfWeek: number[],
        count: number,
        formVals: any,
        existingSessions: PreviewSession[]
    ) {
        if (!startDate || daysOfWeek.length === 0 || count <= 0) return;

        let current = startDate.startOf('day');
        if (existingSessions.length > 0) {
            current = existingSessions[existingSessions.length - 1].date.add(1, 'day').startOf('day');
        }

        const newSessions: PreviewSession[] = [];
        let generated = 0;
        const startIndex = existingSessions.length;
        let iterations = 0;

        while (generated < count && iterations < 365) {
            const currentDayValue = current.day() === 0 ? 1 : current.day() + 1;
            if (daysOfWeek.includes(currentDayValue)) {
                const config = getConfigForDay(
                    current,
                    formVals.bulkConfigMode,
                    formVals.separate_config,
                    formVals
                );
                const learnNumber = Number(formVals.bulk_learn_number ?? 1) + startIndex + generated;
                const lesson = lessons.find(
                    (item) => Number(item.learn_number) === learnNumber
                );

                newSessions.push({
                    key: `gen_${startIndex + generated}`,
                    index: startIndex + generated + 1,
                    date: current.clone(),
                    start_time: config.start_time,
                    end_time: config.end_time,
                    teacher: config.teacher,
                    learn_number: learnNumber,
                    lesson_id: lesson ? String(lesson.id) : undefined,
                    master_lesson_name: lesson?.lesson_name,
                    lesson_name: lesson?.lesson_name,
                    isSkipped: false,
                    isGenerated: true,
                });
                generated += 1;
            }
            current = current.add(1, 'day');
            iterations += 1;
        }

        const nextSessions = [...existingSessions, ...newSessions];
        setSessions(
            customizeLessonNames
                ? buildDynamicLessonNames(nextSessions)
                : nextSessions
        );
    }

    const toggleSkip = (key: string) => {
        setSessions((current) => {
            const nextSessions = current.map(
            (session) => session.key === key
                ? { ...session, isSkipped: !session.isSkipped }
                : session
            );
            return customizeLessonNames
                ? buildDynamicLessonNames(nextSessions)
                : nextSessions;
        });
    };

    const updateSessionField = (key: string, field: string, value: any) => {
        setSessions((current) => current.map(
            (session) => session.key === key ? { ...session, [field]: value } : session
        ));
    };

    const updateSessionLesson = (key: string, lessonId?: string) => {
        const lesson = lessons.find((item) => String(item.id) === String(lessonId));
        setSessions((current) => {
            const nextSessions = current.map((session) => (
                session.key === key
                    ? {
                        ...session,
                        lesson_id: lesson ? String(lesson.id) : undefined,
                        master_lesson_name: lesson?.lesson_name,
                        lesson_name: lesson?.lesson_name,
                        learn_number: lesson?.learn_number,
                    }
                    : session
            ));

            return customizeLessonNames
                ? buildDynamicLessonNames(nextSessions)
                : nextSessions;
        });
    };

    const handleToggleLessonNameTemplate = (checked: boolean) => {
        setCustomizeLessonNames(checked);
        setSessions((current) => (
            checked
                ? buildDynamicLessonNames(current)
                : current.map((session) => ({
                    ...session,
                    lesson_name: session.master_lesson_name || session.lesson_name,
                }))
        ));
    };

    const activeSessionsCount = sessions.filter((session) => !session.isSkipped).length;
    const needMoreSessions = isBulkCreate && activeSessionsCount < requiredSessions;

    const handleGenerateMore = () => {
        const missingCount = requiredSessions - activeSessionsCount;
        if (missingCount > 0) {
            generateSessions(
                formValues.bulk_start_date,
                formValues.days_of_week || [],
                missingCount,
                formValues,
                sessions
            );
        }
    };

    const handleOpenQuickLesson = (sessionKey: string) => {
        setQuickLessonTarget(sessionKey);
        quickLessonForm.resetFields();
        setQuickLessonOpen(true);
    };

    const handleCreateQuickLesson = async ({ lesson_name }: { lesson_name: string }) => {
        try {
            setCreatingLesson(true);
            const response: any = await createLesson({
                grade: Number(formValues.bulk_grade),
                subject_name: formValues.bulk_subject_name,
                lesson_name,
            });
            const created = response?.data as LessonApiResponse | undefined;

            if (!created) throw new Error('Không nhận được dữ liệu bài học vừa tạo.');

            const lessonWithCount = { ...created, scheduled_count: 0 };
            setLessons((current) => (
                [...current.filter((item) => String(item.id) !== String(created.id)), lessonWithCount]
                    .sort((a, b) => a.learn_number - b.learn_number)
            ));
            if (quickLessonTarget) {
                setSessions((current) => {
                    const nextSessions = current.map((session) => (
                        session.key === quickLessonTarget
                            ? {
                                ...session,
                                lesson_id: String(created.id),
                                master_lesson_name: created.lesson_name,
                                lesson_name: created.lesson_name,
                                learn_number: created.learn_number,
                            }
                            : session
                    ));
                    return customizeLessonNames
                        ? buildDynamicLessonNames(nextSessions)
                        : nextSessions;
                });
            }

            messageApi.success(`Đã tạo Bài ${created.learn_number}: ${created.lesson_name}`);
            setQuickLessonOpen(false);
            setQuickLessonTarget(null);
        } catch (error: any) {
            messageApi.error(error.message || 'Không thể tạo nhanh bài học.');
        } finally {
            setCreatingLesson(false);
        }
    };

    const handleConfirm = () => {
        let finalPayload: any;
        let payloadType: 'bulk' | 'single' | 'update_current' | 'update_following' | 'update_makeup' | 'update_cancel';
        const invalidTimeSession = sessions
            .filter((session) => !session.isSkipped)
            .find((session) => {
                if (!session.start_time || !session.end_time) return true;
                const startMinutes = session.start_time.hour() * 60 + session.start_time.minute();
                const endMinutes = session.end_time.hour() * 60 + session.end_time.minute();
                return endMinutes <= startMinutes;
            });

        if (formValues.update_mode !== 'cancel' && invalidTimeSession) {
            messageApi.error(
                invalidTimeSession.start_time && invalidTimeSession.end_time
                    ? `Buổi ${invalidTimeSession.index}: Thời gian kết thúc phải sau thời gian bắt đầu.`
                    : `Buổi ${invalidTimeSession.index}: Vui lòng nhập đủ thời gian bắt đầu và kết thúc.`
            );
            return;
        }

        if (isEdit) {
            if (formValues.update_mode === 'cancel') {
                payloadType = 'update_cancel';
                finalPayload = toRescheduleLivestreamPayload({ update_mode: 'cancel' });
            } else if (formValues.update_mode === 'following' || formValues.update_mode === 'makeup') {
                payloadType = formValues.update_mode === 'following'
                    ? 'update_following'
                    : 'update_makeup';
                const session = sessions[0];
                finalPayload = toRescheduleLivestreamPayload({
                    ...formValues,
                    new_session: {
                        teacher: session.teacher,
                        channel_name: formValues.new_session?.channel_name,
                        start_time: session.start_time,
                        end_time: session.end_time,
                        date: session.date,
                    },
                });
            } else {
                payloadType = 'update_current';
                const session = sessions[0];
                finalPayload = toUpdateLivestreamPayload({
                    ...formValues,
                    teacher: session.teacher,
                    start_time: session.start_time,
                    end_time: session.end_time,
                    date: session.date,
                });
            }
        } else if (isBulkCreate) {
            payloadType = 'bulk';
            const activeSessions = sessions.filter((session) => !session.isSkipped);
            const missingLesson = activeSessions.find((session) => !session.lesson_id);
            if (missingLesson) {
                messageApi.error(`Vui lòng chọn tên bài học cho buổi ${missingLesson.index}.`);
                return;
            }
            const missingDisplayName = activeSessions.find(
                (session) => !session.lesson_name?.trim()
            );
            if (missingDisplayName) {
                messageApi.error(`Vui lòng nhập tên hiển thị cho buổi ${missingDisplayName.index}.`);
                return;
            }

            finalPayload = {
                calendars: activeSessions.map((session) => ({
                    system_type: formValues.bulk_system_type,
                    code: formValues.bulk_code,
                    teacher: session.teacher,
                    lesson_id: session.lesson_id,
                    grade: Number(formValues.bulk_grade),
                    subject_name: formValues.bulk_subject_name,
                    learn_number: Number(session.learn_number),
                    lesson_name: session.lesson_name?.trim(),
                    start_time: combineDateTime(session.date, session.start_time)!,
                    end_time: combineDateTime(session.date, session.end_time)!,
                    lesson_status: 0,
                })),
            };
        } else {
            payloadType = 'single';
            const session = sessions[0];
            finalPayload = toLivestreamPayload({
                ...formValues,
                teacher: session.teacher,
                start_time: session.start_time,
                end_time: session.end_time,
                date: session.date,
            });
        }

        onConfirm(finalPayload, payloadType);
    };

    const columns: any[] = [
        {
            title: 'STT',
            dataIndex: 'index',
            width: 60,
            render: (_: any, record: PreviewSession) => {
                const activeIdx = sessions
                    .filter((session) => !session.isSkipped)
                    .findIndex((session) => session.key === record.key);
                return record.isSkipped ? '-' : activeIdx + 1;
            },
        },
        {
            title: 'Ngày',
            dataIndex: 'date',
            width: 120,
            render: (value: Dayjs, record: PreviewSession) => (
                <Space direction="vertical" size={0}>
                    <Text delete={record.isSkipped}>{value?.format('DD/MM/YYYY')}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {value?.day() === 0 ? 'Chủ Nhật' : `Thứ ${value?.day() + 1}`}
                    </Text>
                </Space>
            ),
        },
        {
            title: 'Thời gian',
            key: 'time',
            width: 220,
            render: (_: any, record: PreviewSession) => (
                <Space>
                    <TimePicker
                        format="HH:mm"
                        value={record.start_time}
                        onChange={(value) => updateSessionField(record.key, 'start_time', value)}
                        disabled={record.isSkipped}
                        size="small"
                        style={{ width: 88 }}
                        allowClear={false}
                    />
                    <span>-</span>
                    <TimePicker
                        format="HH:mm"
                        value={record.end_time}
                        onChange={(value) => updateSessionField(record.key, 'end_time', value)}
                        disabledTime={() => {
                            if (!record.start_time) return {};
                            const startHour = record.start_time.hour();
                            const startMinute = record.start_time.minute();
                            return {
                                disabledHours: () => Array.from(
                                    { length: startHour },
                                    (_, hour) => hour
                                ),
                                disabledMinutes: (selectedHour: number) => (
                                    selectedHour === startHour
                                        ? Array.from(
                                            { length: startMinute + 1 },
                                            (_, minute) => minute
                                        )
                                        : []
                                ),
                            };
                        }}
                        disabled={record.isSkipped}
                        size="small"
                        style={{ width: 88 }}
                        allowClear={false}
                    />
                </Space>
            ),
        },
        {
            title: 'Giáo viên',
            dataIndex: 'teacher',
            width: 170,
            render: (value: string, record: PreviewSession) => (
                <Select
                    value={value}
                    onChange={(nextValue) => updateSessionField(record.key, 'teacher', nextValue)}
                    options={TEACHER_OPTIONS}
                    disabled={record.isSkipped}
                    size="small"
                    style={{ width: '100%' }}
                />
            ),
        },
    ];

    if (!isEdit) {
        columns.push({
            title: 'Bài học gốc',
            key: 'lesson',
            width: isBulkCreate ? 330 : 260,
            render: (_: any, record: PreviewSession) => (
                isBulkCreate ? (
                    <Space.Compact style={{ width: '100%' }}>
                        <Select
                            value={record.lesson_id}
                            onChange={(lessonId) => updateSessionLesson(record.key, lessonId)}
                            options={lessons.map((lesson) => ({
                                value: String(lesson.id),
                                label: formatLessonScheduleOption(lesson),
                            }))}
                            loading={loadingLessons}
                            disabled={record.isSkipped}
                            showSearch
                            optionFilterProp="label"
                            popupMatchSelectWidth={480}
                            placeholder="Chọn bài học"
                            style={{ width: 'calc(100% - 32px)' }}
                        />
                        <Tooltip title={canCreateLesson ? 'Tạo nhanh bài học' : 'Bạn không có quyền tạo bài học'}>
                            <Button
                                icon={<PlusOutlined />}
                                disabled={record.isSkipped || !canCreateLesson}
                                onClick={() => handleOpenQuickLesson(record.key)}
                            />
                        </Tooltip>
                    </Space.Compact>
                ) : (
                    <Text>{record.master_lesson_name || record.lesson_name || '-'}</Text>
                )
            ),
        });
        columns.push({
            title: 'Tên hiển thị trên lịch',
            key: 'display_lesson_name',
            width: 330,
            render: (_: any, record: PreviewSession) => (
                <Input
                    value={record.lesson_name}
                    onChange={(event) => updateSessionField(
                        record.key,
                        'lesson_name',
                        event.target.value
                    )}
                    disabled={record.isSkipped || !record.lesson_id}
                    maxLength={400}
                    placeholder="Nhập tên hiển thị trên lịch"
                />
            ),
        });
    }

    columns.push({
        title: 'Trạng thái',
        key: 'action',
        width: 135,
        render: (_: any, record: PreviewSession) => {
            if (
                isEdit &&
                formValues.update_mode !== 'following' &&
                formValues.update_mode !== 'makeup' &&
                formValues.update_mode !== 'current'
            ) {
                return <Text type="danger">Hủy/Nghỉ học</Text>;
            }
            return (
                <Checkbox
                    checked={!record.isSkipped}
                    onChange={() => toggleSkip(record.key)}
                    disabled={isEdit}
                >
                    {record.isSkipped
                        ? <Text type="danger">Đã bỏ qua</Text>
                        : <Text type="success">{isEdit ? 'Bắt buộc' : 'Sắp tạo'}</Text>}
                </Checkbox>
            );
        },
    });

    return (
        <>
            {contextHolder}
            <Modal
                open={open}
                title={
                    <Space>
                        <InfoCircleOutlined style={{ color: '#1890ff' }} />
                        <span>Xác nhận thông tin Lịch học</span>
                    </Space>
                }
                width={1280}
                onCancel={onClose}
                footer={[
                    <Button key="back" onClick={onClose} icon={<CloseCircleOutlined />}>
                        Quay lại chỉnh sửa
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        onClick={handleConfirm}
                        loading={loading}
                        icon={<CheckCircleOutlined />}
                    >
                        Xác nhận Lưu
                    </Button>,
                ]}
            >
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">
                        {isEdit
                            ? <>Kiểm tra thông tin buổi học sẽ cập nhật. Có thể sửa nhanh giờ học và giáo viên trên bảng.</>
                            : <>Kiểm tra các buổi sẽ tạo. Có thể sửa nhanh giờ học, giáo viên, bài học hoặc bỏ qua buổi không phù hợp.</>}
                    </Text>
                </div>

                {isBulkCreate && (
                    <div
                        style={{
                            padding: 12,
                            marginBottom: 16,
                            border: '1px solid #d9d9d9',
                            borderRadius: 6,
                            background: '#fafafa',
                        }}
                    >
                        <Checkbox
                            checked={customizeLessonNames}
                            onChange={(event) => handleToggleLessonNameTemplate(event.target.checked)}
                        >
                            Tạo tên hiển thị theo mẫu cho toàn bộ danh sách
                        </Checkbox>
                        {customizeLessonNames && (
                            <Space
                                wrap
                                align="end"
                                size={12}
                                style={{ display: 'flex', marginTop: 12 }}
                            >
                                <div style={{ flex: '1 1 260px' }}>
                                    <Text strong>Đoạn phía trước</Text>
                                    <Input
                                        value={lessonNamePrefix}
                                        onChange={(event) => setLessonNamePrefix(event.target.value)}
                                        placeholder="Ví dụ: [Lịch {n}] - "
                                        maxLength={100}
                                        style={{ marginTop: 6 }}
                                    />
                                </div>
                                <div style={{ flex: '1 1 260px' }}>
                                    <Text strong>Đoạn phía sau</Text>
                                    <Input
                                        value={lessonNameSuffix}
                                        onChange={(event) => setLessonNameSuffix(event.target.value)}
                                        placeholder="Ví dụ: - Lần {n}"
                                        maxLength={100}
                                        style={{ marginTop: 6 }}
                                    />
                                </div>
                                <Button
                                    type="primary"
                                    onClick={() => setSessions((current) => (
                                        buildDynamicLessonNames(current)
                                    ))}
                                >
                                    Áp dụng
                                </Button>
                            </Space>
                        )}
                        {customizeLessonNames && (
                            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                                Dùng <Text code>{'{n}'}</Text> để tự tăng theo số lần bài học được gán:
                                lần đầu giữ nguyên tên, từ Lịch 2, Lịch 3, Lịch 4... mới áp dụng mẫu.
                            </Text>
                        )}
                    </div>
                )}

                {isBulkCreate && lessons.length === 0 && !loadingLessons && (
                    <Alert
                        type="warning"
                        showIcon
                        message={`Chưa có bài học cho ${formValues.bulk_subject_name} - Lớp ${formValues.bulk_grade}`}
                        description={canCreateLesson
                            ? 'Dùng nút + tại từng dòng để tạo nhanh bài học rồi tiếp tục.'
                            : 'Bạn cần quyền tạo bài học hoặc nhờ người quản trị bổ sung Lesson trước khi tiếp tục.'}
                        style={{ marginBottom: 16 }}
                    />
                )}

                {errorMessage && (
                    <Alert
                        type="error"
                        showIcon
                        closable={false}
                        message="Không thể lưu lịch học"
                        description={errorMessage}
                        style={{ marginBottom: 16 }}
                    />
                )}

                {needMoreSessions && (
                    <Alert
                        message="Thiếu số buổi học yêu cầu"
                        description={
                            <Space direction="vertical">
                                <span>
                                    Số buổi khả dụng ({activeSessionsCount}) nhỏ hơn cấu hình ({requiredSessions}).
                                </span>
                                <Button type="primary" size="small" onClick={handleGenerateMore}>
                                    Tự động sinh thêm buổi học để bù
                                </Button>
                            </Space>
                        }
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}

                <Table
                    columns={columns}
                    dataSource={sessions}
                    pagination={false}
                    scroll={{ x: 1320, y: 400 }}
                    size="small"
                    rowClassName={(record) => record.isSkipped ? 'skipped-row' : ''}
                />

                <style dangerouslySetInnerHTML={{ __html: `
                    .skipped-row {
                        background-color: #f5f5f5;
                        opacity: 0.7;
                    }
                ` }} />
            </Modal>

            <Modal
                title="Tạo nhanh bài học"
                open={quickLessonOpen}
                centered
                width={520}
                onCancel={() => {
                    setQuickLessonOpen(false);
                    setQuickLessonTarget(null);
                }}
                onOk={() => quickLessonForm.submit()}
                okText="Tạo bài học"
                cancelText="Hủy"
                confirmLoading={creatingLesson}
                destroyOnClose
            >
                <Alert
                    type="info"
                    showIcon
                    message={`${formValues?.bulk_subject_name || '-'} - Lớp ${formValues?.bulk_grade || '-'}`}
                    description="Số thứ tự bài sẽ được hệ thống tự động tạo liên tiếp."
                    style={{ marginBottom: 16 }}
                />
                <Form
                    form={quickLessonForm}
                    layout="vertical"
                    onFinish={handleCreateQuickLesson}
                >
                    <Form.Item
                        name="lesson_name"
                        label="Tên bài học"
                        rules={[
                            { required: true, whitespace: true, message: 'Nhập tên bài học' },
                            { max: 400, message: 'Tên bài học không được vượt quá 400 ký tự' },
                        ]}
                    >
                        <Input placeholder="Nhập tên bài học" maxLength={400} showCount />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default SchedulePreviewModal;
