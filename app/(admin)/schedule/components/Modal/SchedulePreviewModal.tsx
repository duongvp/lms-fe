import React, { useEffect, useState } from 'react';
import {
    Alert,
    Button,
    Checkbox,
    Collapse,
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
    DeleteOutlined,
    InfoCircleOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import {
    getLivestreams,
    toLivestreamPayload,
    toRescheduleLivestreamPayload,
    toUpdateLivestreamPayload,
} from '@/services/livestreamService';
import {
    createLesson,
    type LessonApiResponse,
    type LessonListParams,
} from '@/services/lessonService';
import { combineDateTime } from '@/helper/convertDate';
import { useAuthStore } from '@/stores/authStore';
import { PermissionKey } from '@/types/permissions';
import { formatLessonScheduleOption } from '@/helper/lesson';
import {
    type PackageCourseOption,
} from '@/services/packageCourseService';
import { useLessonsQuery, useLmsCache, usePackageCoursesQuery } from '@/hooks/useLmsQueries';
import TeachingStaffSelect from '@/components/shared/TeachingStaffSelect';

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
    assistant_teacher?: string[];
    lesson_id?: string;
    master_lesson_name?: string;
    lesson_name?: string;
    learn_number?: number;
    isSkipped: boolean;
    isGenerated: boolean;
    isEditable?: boolean;
    preview_action?: 'cancel' | 'shift' | 'create';
    original_learn_number?: number;
    original_lesson_name?: string;
    package_lesson_mappings?: PackageLessonMappingInput[];
}

interface PackageLessonMappingInput {
    course_id?: string;
    lesson_ids: string[];
}

const parseAssistantTeachers = (value: unknown): string[] => (
    Array.isArray(value) ? value : String(value ?? '').split(',')
).map((item) => String(item).trim()).filter(Boolean);

const SchedulePreviewModal: React.FC<SchedulePreviewModalProps> = ({
    open,
    onClose,
    onConfirm,
    formValues,
    isEdit,
    initialData,
    loading,
    errorMessage,
}) => {
    const [sessions, setSessions] = useState<PreviewSession[]>([]);
    const [requiredSessions, setRequiredSessions] = useState(0);
    const [lessons, setLessons] = useState<LessonApiResponse[]>([]);
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
    const isFollowingPreview = isEdit && formValues?.update_mode === 'following';
    const [loadingFollowingPreview, setLoadingFollowingPreview] = useState(false);
    const [followingPreviewError, setFollowingPreviewError] = useState<string | null>(null);
    const packageCoursesQuery = usePackageCoursesQuery();
    const packageCourses: PackageCourseOption[] = packageCoursesQuery.data?.data ?? [];
    const loadingPackageCourses = packageCoursesQuery.isLoading || packageCoursesQuery.isValidating;
    const { refreshLessons } = useLmsCache();
    const previewLessonParams: LessonListParams | null = (
        open && isBulkCreate && formValues?.bulk_grade && formValues?.bulk_subject_name
    ) ? {
        page: 1,
        limit: 100,
        grade: formValues.bulk_grade,
        subject: formValues.bulk_subject_name,
        course_code: formValues.bulk_code,
        sort_by: 'learn_number',
        sort_order: 'asc',
    } : null;
    const lessonsQuery = useLessonsQuery(previewLessonParams);
    const loadingLessons = lessonsQuery.isLoading || lessonsQuery.isValidating;

    const courseOptions = React.useMemo(() => Array.from(
        packageCourses.reduce((groups, item) => {
            const current = groups.get(item.course_id) ?? {
                course_id: item.course_id,
                course_name: item.course_name,
                package_ids: [] as string[],
            };
            if (!current.package_ids.includes(item.package_id)) {
                current.package_ids.push(item.package_id);
            }
            groups.set(item.course_id, current);
            return groups;
        }, new Map<string, {
            course_id: string;
            course_name?: string;
            package_ids: string[];
        }>()).values()
    ).map((item) => ({
        value: item.course_id,
        label: `${item.course_id}${item.course_name ? ` - ${item.course_name}` : ''} (Gói ${item.package_ids.join(', ')})`,
    })), [packageCourses]);

    const formatPreviewLesson = (learnNumber?: number, lessonName?: string) => {
        if (!learnNumber && !lessonName) return '-';
        return `${learnNumber ? `Bài ${learnNumber}` : 'Bài'}${lessonName ? `: ${lessonName}` : ''}`;
    };

    const toPreviewDate = (session: any, field: 'start_time' | 'end_time') => {
        const value = session?.[field];
        return value ? dayjs(value) : dayjs();
    };

    const buildNewSessionPreview = React.useCallback((
        sourceSession: any,
        index = 1
    ): PreviewSession => ({
        key: 'new_session',
        index,
        date: formValues.new_session?.date,
        start_time: formValues.new_session?.start_time,
        end_time: formValues.new_session?.end_time,
        teacher: formValues.new_session?.teacher,
        assistant_teacher: parseAssistantTeachers(formValues.new_session?.assistant_teacher),
        learn_number: Number(sourceSession?.learn_number),
        lesson_name: sourceSession?.lesson_name || undefined,
        isSkipped: false,
        isGenerated: true,
        isEditable: true,
        preview_action: isFollowingPreview ? 'create' : undefined,
    }), [formValues?.new_session, isFollowingPreview]);

    const buildFollowingPreviewSessions = React.useCallback((
        calendarRows: any[]
    ): PreviewSession[] => {
        const currentStart = initialData?.start_time
            ? dayjs(initialData.start_time)
            : null;
        const currentId = initialData?.id;
        const currentSession = calendarRows.find(
            (row) => String(row.id) === String(currentId)
        ) || initialData;

        if (!currentSession) {
            return [buildNewSessionPreview(initialData, 1)];
        }

        const followingRows = calendarRows
            .filter((row) => {
                if (String(row.id) === String(currentId)) return false;
                if (!currentStart || !row.start_time) return false;
                return dayjs(row.start_time).isAfter(currentStart)
                    && Number(row.lesson_status ?? 0) !== 1;
            })
            .sort((a, b) => {
                const timeDiff = dayjs(a.start_time).valueOf() - dayjs(b.start_time).valueOf();
                return timeDiff || Number(a.id ?? 0) - Number(b.id ?? 0);
            });

        const syllabusSources = [currentSession, ...followingRows];
        const previewRows: PreviewSession[] = [
            {
                key: `cancel_${currentSession.id ?? 'current'}`,
                index: 1,
                date: toPreviewDate(currentSession, 'start_time'),
                start_time: toPreviewDate(currentSession, 'start_time'),
                end_time: toPreviewDate(currentSession, 'end_time'),
                teacher: currentSession.teacher,
                assistant_teacher: parseAssistantTeachers(currentSession.assistant_teacher),
                original_learn_number: Number(currentSession.learn_number),
                original_lesson_name: currentSession.lesson_name || undefined,
                isSkipped: false,
                isGenerated: false,
                isEditable: false,
                preview_action: 'cancel',
            },
        ];

        followingRows.forEach((targetSession, index) => {
            const sourceSession = syllabusSources[index];
            previewRows.push({
                key: `shift_${targetSession.id}`,
                index: index + 2,
                date: toPreviewDate(targetSession, 'start_time'),
                start_time: toPreviewDate(targetSession, 'start_time'),
                end_time: toPreviewDate(targetSession, 'end_time'),
                teacher: sourceSession?.teacher ?? targetSession.teacher,
                assistant_teacher: parseAssistantTeachers(
                    sourceSession?.assistant_teacher ?? targetSession.assistant_teacher
                ),
                learn_number: Number(sourceSession?.learn_number),
                lesson_name: sourceSession?.lesson_name || undefined,
                original_learn_number: Number(targetSession.learn_number),
                original_lesson_name: targetSession.lesson_name || undefined,
                isSkipped: false,
                isGenerated: false,
                isEditable: false,
                preview_action: 'shift',
            });
        });

        previewRows.push(buildNewSessionPreview(
            syllabusSources[syllabusSources.length - 1],
            previewRows.length + 1
        ));

        return previewRows;
    }, [buildNewSessionPreview, initialData]);

    const loadFollowingPreview = React.useCallback(async () => {
        const code = initialData?.code || initialData?.class_code;
        const currentStart = initialData?.start_time ? dayjs(initialData.start_time) : null;

        if (!code || !currentStart) {
            setFollowingPreviewError('Không đủ dữ liệu buổi học hiện tại để dựng xem trước dời chuỗi.');
            setSessions(buildFollowingPreviewSessions([]));
            return;
        }

        try {
            setLoadingFollowingPreview(true);
            setFollowingPreviewError(null);

            let page = 1;
            let total = 0;
            const rows: any[] = [];

            do {
                const response: any = await getLivestreams({
                    page,
                    limit: 100,
                    code_exact: code,
                    system_type: initialData?.system_type,
                    start_time: currentStart.subtract(1, 'second').toISOString(),
                    sort_by: 'start_time,id',
                    sort_order: 'asc,asc',
                });
                const pageRows = response?.data?.data ?? [];
                total = Number(response?.data?.total ?? pageRows.length);
                rows.push(...pageRows);
                page += 1;
            } while (rows.length < total && page <= 20);

            setSessions(buildFollowingPreviewSessions(rows));
        } catch (error: any) {
            setFollowingPreviewError(error.message || 'Không thể tải danh sách lịch để xem trước dời chuỗi.');
            setSessions(buildFollowingPreviewSessions([]));
        } finally {
            setLoadingFollowingPreview(false);
        }
    }, [buildFollowingPreviewSessions, initialData]);

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

    useEffect(() => {
        setLessons(lessonsQuery.data?.data?.data ?? []);
    }, [lessonsQuery.data]);

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
                assistant_teacher: parseAssistantTeachers(formValues.assistant_teacher),
                lesson_id: String(formValues.lesson_id),
                master_lesson_name: formValues.master_lesson_name || formValues.lesson_name,
                lesson_name: formValues.lesson_name,
                learn_number: Number(formValues.learn_number),
                package_lesson_mappings: [{ lesson_ids: [] }],
                isSkipped: false,
                isGenerated: true,
            }]);
            setRequiredSessions(1);
            return;
        }

        if (isEdit && formValues.update_mode === 'following') {
            void loadFollowingPreview();
        } else if (isEdit && formValues.update_mode === 'makeup') {
            setFollowingPreviewError(null);
            setSessions([buildNewSessionPreview(initialData, 1)]);
        } else if (isEdit && formValues.update_mode === 'current') {
            setFollowingPreviewError(null);
            setSessions([{
                key: 'current',
                index: 1,
                date: formValues.date,
                start_time: formValues.start_time,
                end_time: formValues.end_time,
                teacher: formValues.teacher,
                assistant_teacher: parseAssistantTeachers(formValues.assistant_teacher),
                isSkipped: false,
                isGenerated: true,
                isEditable: true,
            }]);
        } else {
            setFollowingPreviewError(null);
            setSessions([]);
            setRequiredSessions(0);
        }
    }, [
        buildNewSessionPreview,
        formValues,
        initialData,
        isBulkCreate,
        isEdit,
        loadFollowingPreview,
        open,
    ]);

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
                assistant_teacher: parseAssistantTeachers(
                    config?.assistant_teacher || commonFormValues.bulk_assistant_teacher
                ),
            };
        }
        return {
            start_time: commonFormValues.bulk_start_time,
            end_time: commonFormValues.bulk_end_time,
            teacher: commonFormValues.bulk_teacher,
            assistant_teacher: parseAssistantTeachers(commonFormValues.bulk_assistant_teacher),
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
                    assistant_teacher: config.assistant_teacher,
                    learn_number: learnNumber,
                    lesson_id: lesson ? String(lesson.id) : undefined,
                    master_lesson_name: lesson?.lesson_name,
                    lesson_name: lesson?.lesson_name,
                    package_lesson_mappings: [{ lesson_ids: [] }],
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

    const updateSessionMapping = (
        sessionKey: string,
        mappingIndex: number,
        field: keyof PackageLessonMappingInput,
        value: string | string[]
    ) => {
        setSessions((current) => current.map((session) => {
            if (session.key !== sessionKey) return session;
            const mappings = [...(session.package_lesson_mappings ?? [{ lesson_ids: [] }])];
            mappings[mappingIndex] = {
                ...mappings[mappingIndex],
                [field]: value,
            };
            return { ...session, package_lesson_mappings: mappings };
        }));
    };

    const addSessionMapping = (sessionKey: string) => {
        setSessions((current) => current.map((session) => (
            session.key === sessionKey
                ? {
                    ...session,
                    package_lesson_mappings: [
                        ...(session.package_lesson_mappings ?? []),
                        { lesson_ids: [] },
                    ],
                }
                : session
        )));
    };

    const removeSessionMapping = (sessionKey: string, mappingIndex: number) => {
        setSessions((current) => current.map((session) => {
            if (session.key !== sessionKey) return session;
            const mappings = (session.package_lesson_mappings ?? [])
                .filter((_, index) => index !== mappingIndex);
            return {
                ...session,
                package_lesson_mappings: mappings.length
                    ? mappings
                    : [{ lesson_ids: [] }],
            };
        }));
    };

    const normalizeSessionMappings = (session: PreviewSession) => (
        (session.package_lesson_mappings ?? []).map((mapping) => ({
            course_id: String(mapping.course_id ?? '').trim(),
            lesson_ids: (mapping.lesson_ids ?? [])
                .map((lessonId) => String(lessonId).trim())
                .filter(Boolean),
        }))
    );

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
            await refreshLessons();
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

        if (isFollowingPreview && loadingFollowingPreview) {
            messageApi.warning('Đang tải lịch dời chuỗi, vui lòng chờ trong giây lát.');
            return;
        }

        if (!isEdit) {
            if (loadingPackageCourses) {
                messageApi.warning('Đang tải danh sách Course ID, vui lòng chờ trong giây lát.');
                return;
            }

            const invalidMappingSession = sessions
                .filter((session) => !session.isSkipped)
                .find((session) => {
                    const mappings = normalizeSessionMappings(session);
                    return mappings.length === 0 || mappings.some(
                        (mapping) => !mapping.course_id || mapping.lesson_ids.length === 0
                    );
                });
            if (invalidMappingSession) {
                messageApi.error(
                    `Buổi ${invalidMappingSession.index}: Vui lòng chọn Course ID và nhập ít nhất một Lesson ID.`
                );
                return;
            }

            const duplicatedCourseSession = sessions
                .filter((session) => !session.isSkipped)
                .find((session) => {
                    const courseIds = normalizeSessionMappings(session)
                        .map((mapping) => mapping.course_id);
                    return new Set(courseIds).size !== courseIds.length;
                });
            if (duplicatedCourseSession) {
                messageApi.error(
                    `Buổi ${duplicatedCourseSession.index}: Một Course ID chỉ nên xuất hiện một lần.`
                );
                return;
            }
        }

        if (isEdit) {
            if (formValues.update_mode === 'cancel') {
                payloadType = 'update_cancel';
                finalPayload = toRescheduleLivestreamPayload({
                    ...formValues,
                    update_mode: 'cancel',
                });
            } else if (formValues.update_mode === 'following' || formValues.update_mode === 'makeup') {
                payloadType = formValues.update_mode === 'following'
                    ? 'update_following'
                    : 'update_makeup';
                const session = formValues.update_mode === 'following'
                    ? sessions.find((item) => item.preview_action === 'create') || sessions[sessions.length - 1]
                    : sessions[0];
                finalPayload = toRescheduleLivestreamPayload({
                    ...formValues,
                    new_session: {
                        teacher: session.teacher,
                        assistant_teacher: session.assistant_teacher,
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
                    assistant_teacher: session.assistant_teacher,
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
                    assistant_teacher: session.assistant_teacher?.join(','),
                    lesson_id: session.lesson_id,
                    grade: Number(formValues.bulk_grade),
                    subject_name: formValues.bulk_subject_name,
                    learn_number: Number(session.learn_number),
                    lesson_name: session.lesson_name?.trim(),
                    start_time: combineDateTime(session.date, session.start_time)!,
                    end_time: combineDateTime(session.date, session.end_time)!,
                    lesson_status: 0,
                    package_lesson_mappings: normalizeSessionMappings(session),
                })),
            };
        } else {
            payloadType = 'single';
            const session = sessions[0];
            finalPayload = toLivestreamPayload({
                ...formValues,
                teacher: session.teacher,
                assistant_teacher: session.assistant_teacher,
                start_time: session.start_time,
                end_time: session.end_time,
                date: session.date,
                package_lesson_mappings: normalizeSessionMappings(session),
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
                        disabled={record.isSkipped || (isEdit && record.isEditable === false)}
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
                        disabled={record.isSkipped || (isEdit && record.isEditable === false)}
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
                <TeachingStaffSelect
                    teacherType={1}
                    value={value}
                    onChange={(nextValue) => updateSessionField(record.key, 'teacher', nextValue)}
                    disabled={record.isSkipped || (isEdit && record.isEditable === false)}
                    size="small"
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Trợ giảng',
            dataIndex: 'assistant_teacher',
            width: 220,
            render: (value: string[] | undefined, record: PreviewSession) => (
                <TeachingStaffSelect
                    teacherType={2}
                    mode="multiple"
                    value={value ?? []}
                    onChange={(nextValue) => updateSessionField(record.key, 'assistant_teacher', nextValue)}
                    disabled={record.isSkipped || (isEdit && record.isEditable === false)}
                    size="small"
                    maxTagCount="responsive"
                    style={{ width: '100%' }}
                />
            ),
        },
    ];

    if (isFollowingPreview) {
        columns.push(
            {
                title: 'Đề cương hiện tại',
                key: 'original_lesson',
                width: 300,
                render: (_: any, record: PreviewSession) => (
                    <Text type="secondary">
                        {record.preview_action === 'create'
                            ? 'Buổi mới ở cuối khóa'
                            : formatPreviewLesson(record.original_learn_number, record.original_lesson_name)}
                    </Text>
                ),
            },
            {
                title: 'Đề cương sau dời',
                key: 'shifted_lesson',
                width: 330,
                render: (_: any, record: PreviewSession) => {
                    if (record.preview_action === 'cancel') {
                        return <Text type="danger">Nghỉ học, bỏ trống đề cương</Text>;
                    }

                    return (
                        <Text strong={record.preview_action === 'create'}>
                            {formatPreviewLesson(record.learn_number, record.lesson_name)}
                        </Text>
                    );
                },
            },
        );
    }

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
            if (isFollowingPreview) {
                if (record.preview_action === 'cancel') {
                    return <Text type="danger">Nghỉ học</Text>;
                }
                if (record.preview_action === 'shift') {
                    return <Text type="warning">Nhận bài trước</Text>;
                }
                return <Text type="success">Buổi mới</Text>;
            }

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
                centered
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
                        disabled={loadingFollowingPreview || (!isEdit && loadingPackageCourses)}
                        icon={<CheckCircleOutlined />}
                    >
                        Xác nhận Lưu
                    </Button>,
                ]}
                styles={{
                    content: {
                        maxHeight: 'calc(100vh - 32px)',
                        display: 'flex',
                        flexDirection: 'column',
                    },
                    body: {
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                    },
                }}
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

                {isFollowingPreview && (
                    <Alert
                        type={followingPreviewError ? 'warning' : 'info'}
                        showIcon
                        message="Xem trước dời chuỗi"
                        description={
                            followingPreviewError
                                ? followingPreviewError
                                : 'Danh sách bên dưới hiển thị tuần tự lịch sau khi lưu: buổi hiện tại nghỉ học, các buổi sau nhận đề cương của buổi liền trước, và buổi mới ở cuối khóa nhận đề cương cuối cùng.'
                        }
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
                    loading={loadingFollowingPreview}
                    scroll={{ x: isFollowingPreview ? 1720 : 1320, y: 400 }}
                    size="small"
                    rowClassName={(record) => {
                        if (record.isSkipped) return 'skipped-row';
                        if (record.preview_action === 'cancel') return 'cancel-preview-row';
                        if (record.preview_action === 'create') return 'created-preview-row';
                        if (record.preview_action === 'shift') return 'shift-preview-row';
                        return '';
                    }}
                />

                {!isEdit && (
                    <div style={{ marginTop: 16 }}>
                        <Space direction="vertical" size={4} style={{ marginBottom: 12 }}>
                            <Text strong>Mapping Package / Course / Lesson theo từng buổi</Text>
                            <Text type="secondary">
                                Chọn Course ID từ Google Sheet; Package ID được hệ thống tự xác định.
                                Mỗi Course ID có thể nhập nhiều Lesson ID.
                            </Text>
                        </Space>

                        {!loadingPackageCourses && courseOptions.length === 0 && (
                            <Alert
                                type="warning"
                                showIcon
                                message="Chưa tải được danh sách Course ID từ Google Sheet"
                                style={{ marginBottom: 12 }}
                            />
                        )}

                        <Collapse
                            size="small"
                            defaultActiveKey={sessions
                                .filter((session) => !session.isSkipped)
                                .slice(0, 1)
                                .map((session) => session.key)}
                            items={sessions
                                .filter((session) => !session.isSkipped)
                                .map((session) => {
                                    const mappings = session.package_lesson_mappings
                                        ?? [{ lesson_ids: [] }];
                                    const completedMappings = normalizeSessionMappings(session)
                                        .filter((mapping) => (
                                            mapping.course_id && mapping.lesson_ids.length > 0
                                        )).length;

                                    return {
                                        key: session.key,
                                        label: (
                                            <Space wrap>
                                                <Text strong>Buổi {session.index}</Text>
                                                <Text type="secondary">
                                                    {session.date?.format('DD/MM/YYYY')}
                                                </Text>
                                                <Text type={completedMappings ? 'success' : 'warning'}>
                                                    {completedMappings
                                                        ? `${completedMappings} Course ID đã mapping`
                                                        : 'Chưa mapping'}
                                                </Text>
                                            </Space>
                                        ),
                                        children: (
                                            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                                {mappings.map((mapping, mappingIndex) => {
                                                    const selectedByOtherRows = new Set(
                                                        mappings
                                                            .filter((_, index) => index !== mappingIndex)
                                                            .map((item) => item.course_id)
                                                            .filter(Boolean)
                                                    );

                                                    return (
                                                        <div
                                                            key={`${session.key}_${mappingIndex}`}
                                                            style={{
                                                                display: 'grid',
                                                                gridTemplateColumns: 'minmax(260px, 1fr) minmax(260px, 1fr) 36px',
                                                                gap: 12,
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                            <Select
                                                                value={mapping.course_id}
                                                                loading={loadingPackageCourses}
                                                                options={courseOptions.map((option) => ({
                                                                    ...option,
                                                                    disabled: selectedByOtherRows.has(option.value),
                                                                }))}
                                                                showSearch
                                                                optionFilterProp="label"
                                                                placeholder={`Chọn Course ID ${mappingIndex + 1}`}
                                                                popupMatchSelectWidth={600}
                                                                onChange={(value) => updateSessionMapping(
                                                                    session.key,
                                                                    mappingIndex,
                                                                    'course_id',
                                                                    value
                                                                )}
                                                            />
                                                            <Select
                                                                mode="tags"
                                                                value={mapping.lesson_ids}
                                                                tokenSeparators={[',', ' ']}
                                                                placeholder="Nhập Lesson ID rồi nhấn Enter"
                                                                maxTagCount="responsive"
                                                                onChange={(value) => updateSessionMapping(
                                                                    session.key,
                                                                    mappingIndex,
                                                                    'lesson_ids',
                                                                    value
                                                                )}
                                                            />
                                                            <Tooltip title="Xóa Course ID">
                                                                <Button
                                                                    type="text"
                                                                    danger
                                                                    icon={<DeleteOutlined />}
                                                                    disabled={mappings.length === 1}
                                                                    onClick={() => removeSessionMapping(
                                                                        session.key,
                                                                        mappingIndex
                                                                    )}
                                                                />
                                                            </Tooltip>
                                                        </div>
                                                    );
                                                })}
                                                <Button
                                                    type="dashed"
                                                    icon={<PlusOutlined />}
                                                    onClick={() => addSessionMapping(session.key)}
                                                    block
                                                >
                                                    Thêm Course ID cho buổi {session.index}
                                                </Button>
                                            </Space>
                                        ),
                                    };
                                })}
                        />
                    </div>
                )}

                <style dangerouslySetInnerHTML={{ __html: `
                    .skipped-row {
                        background-color: #f5f5f5;
                        opacity: 0.7;
                    }
                    .cancel-preview-row {
                        background-color: #fff1f0;
                    }
                    .shift-preview-row {
                        background-color: #fffbe6;
                    }
                    .created-preview-row {
                        background-color: #f6ffed;
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
