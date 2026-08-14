'use client';
import { Alert, Modal, Input, Row, Col, Form, Button, Typography, Select, Radio, Checkbox, Card, TimePicker, DatePicker, message, Space, Tooltip, type SelectProps } from 'antd';
import { CloseCircleOutlined, EyeFilled, PlusOutlined } from '@ant-design/icons';
import React, { useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import {
    createLivestream,
    createLivestreamBulk,
    getHocmaiSectionsForSchedulingLesson,
    getProgramLessonsForScheduling,
    updateLivestream,
    rescheduleLivestream
} from '@/services/livestreamService';
import type { HocmaiSectionOption } from '@/services/livestreamService';
import { buildGroupedHmoOptions, summarizeHmoOptions } from '@/helper/hmoOptions';
import SchedulePreviewModal from './SchedulePreviewModal';
import type { ModuleField } from '@/types/fieldPolicy';
import { resolveFieldRule } from '@/helper/fieldPolicy';
import { GRADE_OPTIONS } from '@/constants/subjects';
import { useLessonProgramOptions, useLessonSubjectOptions } from '@/hooks/useLessonSubjectOptions';
import { createLesson, type LessonApiResponse, type LessonListParams } from '@/services/lessonService';
import { buildLessonSubjectCode, formatLessonScheduleOption, getSuggestedSchoolYear } from '@/helper/lesson';
import { useAuthStore } from '@/stores/authStore';
import { PermissionKey } from '@/types/permissions';
import { useLessonsQuery, useLmsCache, usePackageCoursesQuery, useSchedulesQuery } from '@/hooks/useLmsQueries';
import TeachingStaffSelect from '@/components/shared/TeachingStaffSelect';

const { Text, Title } = Typography;

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

const hmoKeysToMappings = (keys: string[] = []) => keys
    .map((key) => {
        const [packageId, courseId, lessonId] = String(key).split('::');
        if (!packageId || !courseId || !lessonId) return null;
        return {
            package_id: packageId,
            course_id: courseId,
            lesson_ids: [lessonId],
        };
    })
    .filter(Boolean);

export const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => {
    return (
        <fieldset
            style={{
                border: `1px solid rgba(0, 0, 0, 0.1)`,
                borderRadius: 6,
                padding: "20px 16px 16px 16px",
                marginBottom: 24,
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
                    color: "#000"
                }}
            >
                {title}
            </legend>
            {children}
        </fieldset>
    );
};

interface ScheduleModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: (values: any) => void;
    initialData?: any;
    title?: string;
    isEdit?: boolean;
    moduleFields?: ModuleField[];
    fieldPolicy?: any;
    moduleCode?: string;
    programCode?: string;
}

const DAYS_OPTIONS = [
    { label: 'Thứ 2', value: 2 },
    { label: 'Thứ 3', value: 3 },
    { label: 'Thứ 4', value: 4 },
    { label: 'Thứ 5', value: 5 },
    { label: 'Thứ 6', value: 6 },
    { label: 'Thứ 7', value: 7 },
    { label: 'Chủ Nhật', value: 1 },
];

const getScheduleSubmitError = (error: any) => {
    const detailErrors = error?.detail?.errors;
    if (Array.isArray(detailErrors) && detailErrors.length > 0) {
        return detailErrors
            .map((item: any, index: number) => (
                item?.message || item?.error || `Lỗi ${index + 1}`
            ))
            .join('; ');
    }

    return error?.detail?.message
        || error?.message
        || 'Không thể lưu lịch học. Vui lòng kiểm tra lại dữ liệu.';
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

const inferCourseCadenceDays = (rows: any[]) => {
    const dates = Array.from(new Set(
        rows
            .map((row) => dayjs(row.start_time))
            .filter((date) => date.isValid())
            .map((date) => date.startOf('day').valueOf())
    )).sort((left, right) => left - right);
    if (dates.length < 2) return undefined;

    const intervals = dates.slice(1)
        .map((date, index) => dayjs(date).diff(dayjs(dates[index]), 'day'))
        .filter((days) => days > 0);
    if (!intervals.length) return undefined;

    const frequencies = new Map<number, number>();
    intervals.forEach((days) => frequencies.set(days, (frequencies.get(days) ?? 0) + 1));
    return intervals.reduce((best, days) => (
        (frequencies.get(days) ?? 0) >= (frequencies.get(best) ?? 0) ? days : best
    ), intervals[0]);
};

const ScheduleModal: React.FC<ScheduleModalProps> = ({
    open,
    onClose,
    onSuccess,
    initialData,
    title,
    isEdit,
    moduleFields = [],
    fieldPolicy,
    moduleCode = 'calendar',
    programCode,
}) => {
    const [form] = Form.useForm();
    const usesProgramContext = !isEdit && Boolean(programCode);
    const [loading, setLoading] = useState(false);

    // For Add
    const [addMode, setAddMode] = useState<"single" | "bulk">("single");
    const [bulkConfigMode, setBulkConfigMode] = useState<"common" | "separate">("common");
    const needsManualProgramOptions = open && (isEdit || !usesProgramContext || addMode === 'bulk');
    const subjectOptions = useLessonSubjectOptions(needsManualProgramOptions);
    const lessonPrograms = useLessonProgramOptions(needsManualProgramOptions);
    const selectedProgram = lessonPrograms.find((program) => program.subject_code === programCode);

    // For Update
    const [updateMode, setUpdateMode] = useState<"current" | "makeup" | "following" | "cancel">("following");

    const selectedDays = Form.useWatch('days_of_week', form) || [];
    const selectedGrade = Form.useWatch('grade', form);
    const selectedSubject = Form.useWatch('subject_name', form);
    const selectedSubjectCode = Form.useWatch('subject_code', form);
    const contextProgramCode = usesProgramContext ? String(programCode).trim() : selectedSubjectCode;
    const selectedCourseCode = Form.useWatch('class_code', form);
    const selectedLessonId = Form.useWatch('lesson_id', form);
    const selectedBulkGrade = Form.useWatch('bulk_grade', form);
    const selectedBulkSubject = Form.useWatch('bulk_subject_name', form);
    const selectedBulkSubjectCode = Form.useWatch('bulk_subject_code', form);
    const selectedBulkCourseCode = Form.useWatch('bulk_code', form);
    const newSessionStartTime = Form.useWatch(['new_session', 'start_time'], form) as Dayjs | undefined;
    const newSessionDate = Form.useWatch(['new_session', 'date'], form) as Dayjs | undefined;
    const singleStartTime = Form.useWatch('start_time', form) as Dayjs | undefined;
    const bulkStartTime = Form.useWatch('bulk_start_time', form) as Dayjs | undefined;
    const [lessonOptions, setLessonOptions] = useState<LessonApiResponse[]>([]);
    const [hmoOptions, setHmoOptions] = useState<HocmaiSectionOption[]>([]);
    const [loadingHmoOptions, setLoadingHmoOptions] = useState(false);
    const [loadingProgramLessons, setLoadingProgramLessons] = useState(false);
    const [bulkLessonOptions, setBulkLessonOptions] = useState<LessonApiResponse[]>([]);
    const [quickLessonOpen, setQuickLessonOpen] = useState(false);
    const [creatingLesson, setCreatingLesson] = useState(false);
    const [courseEndDate, setCourseEndDate] = useState<Dayjs | null>(null);
    const [courseLastStartTime, setCourseLastStartTime] = useState<Dayjs | null>(null);
    const [courseCadenceDays, setCourseCadenceDays] = useState<number | undefined>();
    const [quickLessonForm] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();
    const hasPermission = useAuthStore((state) => state.hasPermission);
    const canCreateLesson = hasPermission(PermissionKey.LESSON_CREATE);
    const canAssignTeachingStaff = hasPermission(PermissionKey.CALENDAR_TEACHER_MANAGE);
    usePackageCoursesQuery();
    const singleLessonParams: LessonListParams | null = (
        open && !isEdit && addMode === 'single' && contextProgramCode && !usesProgramContext
    ) ? {
        page: 1,
        limit: 100,
        grade: selectedGrade || undefined,
        subject_code: contextProgramCode,
        course_code: selectedCourseCode?.trim() || undefined,
        sort_by: 'learn_number',
        sort_order: 'asc',
    } : null;
    const bulkLessonParams: LessonListParams | null = (
        open && !isEdit && addMode === 'bulk' && selectedBulkGrade && selectedBulkSubjectCode
    ) ? {
        page: 1,
        limit: 100,
        grade: selectedBulkGrade,
        subject_code: selectedBulkSubjectCode,
        course_code: selectedBulkCourseCode?.trim() || undefined,
        sort_by: 'learn_number',
        sort_order: 'asc',
    } : null;
    const singleLessonsQuery = useLessonsQuery(singleLessonParams);
    const bulkLessonsQuery = useLessonsQuery(bulkLessonParams);
    const courseCode = initialData?.code || initialData?.class_code;
    const courseEndQuery = useSchedulesQuery(
        open && isEdit && courseCode ? {
            page: 1,
            limit: 100,
            code_exact: courseCode,
            system_type: initialData?.system_type,
            sort_by: 'start_time',
            sort_order: 'desc',
        } : null
    );
    const loadingLessons = loadingProgramLessons || singleLessonsQuery.isLoading || singleLessonsQuery.isValidating;
    const loadingBulkLessons = bulkLessonsQuery.isLoading || bulkLessonsQuery.isValidating;
    const { refreshLessons } = useLmsCache();
    const getProgramOptions = (grade?: number, subjectName?: string) => lessonPrograms
        .filter((program) => (
            Number(program.grade) === Number(grade)
            && program.subject_name === subjectName
        ))
        .map((program) => ({
            value: program.subject_code,
            label: program.subject_code,
        }));

    React.useEffect(() => {
        if (!open || !usesProgramContext || !contextProgramCode || addMode !== 'single') return;
        let active = true;
        setLoadingProgramLessons(true);
        getProgramLessonsForScheduling(contextProgramCode)
            .then((response: any) => {
                if (!active) return;
                setLessonOptions((Array.isArray(response?.data) ? response.data : []).map((lesson: any) => ({
                    ...lesson,
                    id: String(lesson.id),
                    subject_code: contextProgramCode,
                    learn_number: Number(lesson.learn_number),
                    lesson_name: String(lesson.lesson_name || ''),
                    scheduled_count: Number(lesson.scheduled_count || 0),
                })));
            })
            .catch((error: any) => {
                if (active) messageApi.error(error?.message || 'Không thể tải bài học của Chương trình');
            })
            .finally(() => active && setLoadingProgramLessons(false));
        return () => { active = false; };
    }, [addMode, contextProgramCode, messageApi, open, usesProgramContext]);

    React.useEffect(() => {
        if (usesProgramContext) return;
        setLessonOptions(singleLessonsQuery.data?.data?.data ?? []);
    }, [singleLessonsQuery.data, usesProgramContext]);

    React.useEffect(() => {
        if (!open || isEdit || addMode !== 'single' || !contextProgramCode || !selectedLessonId) {
            setHmoOptions([]);
            return;
        }
        let active = true;
        setLoadingHmoOptions(true);
        getHocmaiSectionsForSchedulingLesson(contextProgramCode, selectedLessonId)
            .then((response: any) => {
                if (active) setHmoOptions(Array.isArray(response?.data) ? response.data : []);
            })
            .catch((error: any) => {
                if (active) {
                    setHmoOptions([]);
                    messageApi.error(error?.message || 'Không thể tải Lesson ID HMO');
                }
            })
            .finally(() => active && setLoadingHmoOptions(false));
        return () => { active = false; };
    }, [addMode, contextProgramCode, isEdit, messageApi, open, selectedLessonId]);

    React.useEffect(() => {
        const rows: LessonApiResponse[] = bulkLessonsQuery.data?.data?.data ?? [];
        setBulkLessonOptions(rows);
        if (!rows.length) return;
        const scheduledLessons = rows.filter(
            (lesson) => Number(lesson.scheduled_count ?? 0) > 0
        );
        const latestScheduledLesson = scheduledLessons.at(-1);
        const suggestedLesson = latestScheduledLesson
            ? rows.find((lesson) => lesson.learn_number > latestScheduledLesson.learn_number)
            : rows[0];
        form.setFieldValue(
            'bulk_learn_number',
            suggestedLesson?.learn_number ?? latestScheduledLesson?.learn_number
        );
    }, [bulkLessonsQuery.data, form]);

    const scheduledBulkLessons = bulkLessonOptions.filter(
        (lesson) => Number(lesson.scheduled_count ?? 0) > 0
    );
    const latestScheduledBulkLesson = scheduledBulkLessons.at(-1);
    const suggestedBulkLesson = latestScheduledBulkLesson
        ? bulkLessonOptions.find(
            (lesson) => lesson.learn_number > latestScheduledBulkLesson.learn_number
        )
        : bulkLessonOptions[0];

    const isFieldEditable = (fieldCode: string) => {
        if (
            (fieldCode === 'teacher' || fieldCode === 'assistant_teacher')
            && !canAssignTeachingStaff
        ) {
            return false;
        }
        if (!moduleFields.length) return true;
        return resolveFieldRule(fieldPolicy, moduleCode, fieldCode).editable;
    };

    const requiredWhenEditable = (fieldCode: string, message: string) =>
        isFieldEditable(fieldCode) ? [{ required: true, message }] : [];

    const newSessionMinDate = updateMode === 'following'
        ? courseEndDate?.startOf('day')
        : initialData?.start_time
            ? dayjs(initialData.start_time).startOf('day')
            : undefined;

    const validateNewSessionDate = (_: unknown, selectedDate?: Dayjs | null) => {
        if (!selectedDate || !newSessionMinDate) return Promise.resolve();
        return selectedDate.startOf('day').isBefore(newSessionMinDate)
            ? Promise.reject(new Error(
                updateMode === 'following'
                    ? 'Ngày buổi mới không được trước ngày kết thúc khóa'
                    : 'Ngày học bù không được trước ngày của buổi học hiện tại'
            ))
            : Promise.resolve();
    };

    const validateNewSessionEndTime = (_: unknown, endTime?: Dayjs | null) => {
        const startTime = form.getFieldValue(['new_session', 'start_time']) as Dayjs | undefined;
        return isEndAfterStart(startTime, endTime)
            ? Promise.resolve()
            : Promise.reject(new Error('Thời gian kết thúc phải sau thời gian bắt đầu'));
    };

    const validateNewSessionStartTime = (_: unknown, startTime?: Dayjs | null) => {
        if (
            updateMode !== 'following'
            || !newSessionDate
            || !startTime
            || !courseLastStartTime
            || !newSessionDate.isSame(courseLastStartTime, 'day')
        ) return Promise.resolve();

        const selectedMinutes = startTime.hour() * 60 + startTime.minute();
        const lastStartMinutes = courseLastStartTime.hour() * 60 + courseLastStartTime.minute();
        return selectedMinutes > lastStartMinutes
            ? Promise.resolve()
            : Promise.reject(new Error(
                `Giờ bắt đầu phải sau ${courseLastStartTime.format('HH:mm')} của buổi cuối khóa`
            ));
    };

    const getNewSessionStartDisabledTime = () => {
        if (
            updateMode !== 'following'
            || !newSessionDate
            || !courseLastStartTime
            || !newSessionDate.isSame(courseLastStartTime, 'day')
        ) return {};

        const lastHour = courseLastStartTime.hour();
        const lastMinute = courseLastStartTime.minute();
        return {
            disabledHours: () => Array.from({ length: lastHour }, (_, hour) => hour),
            disabledMinutes: (selectedHour: number) => (
                selectedHour === lastHour
                    ? Array.from({ length: lastMinute + 1 }, (_, minute) => minute)
                    : []
            ),
        };
    };

    const validateEndTimeAfter = (startFieldName: string | (string | number)[], message = 'Thời gian kết thúc phải sau thời gian bắt đầu') => (
        _: unknown,
        endTime?: Dayjs | null
    ) => {
        if (!endTime || !isFieldEditable('end_time')) return Promise.resolve();

        const startTime = form.getFieldValue(startFieldName) as Dayjs | undefined;
        if (!startTime) {
            return Promise.reject(new Error('Vui lòng nhập thời gian bắt đầu trước'));
        }

        return isEndAfterStart(startTime, endTime)
            ? Promise.resolve()
            : Promise.reject(new Error(message));
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

    const handleClose = () => {
        form.resetFields();
        setAddMode("single");
        setBulkConfigMode("common");
        setSubmitError(null);
        // setUpdateMode("current");
        setUpdateMode("following");
        onClose();
    };

    const handleCreateQuickLesson = async ({
        lesson_name,
        subject_code,
    }: {
        lesson_name: string;
        subject_code: string;
    }) => {
        try {
            setCreatingLesson(true);
            // Luôn lấy tên môn từ danh sách Chương trình theo mã đã chọn.
            // Không dùng trực tiếp giá trị form vì một số luồng đặt field đó
            // bằng mã Chương trình, dẫn tới subject_name bị lưu sai trong DB.
            const program = lessonPrograms.find((item) => item.subject_code === subject_code);
            const subjectName = program?.subject_name || selectedSubject;
            const response: any = await createLesson({
                grade: Number(selectedGrade),
                subject_code,
                subject_name: subjectName || selectedSubject || subject_code,
                lesson_name,
            });
            const created = response?.data as LessonApiResponse | undefined;
            if (!created) throw new Error('Không nhận được dữ liệu bài học vừa tạo.');

            const lessonWithCount = { ...created, scheduled_count: 0 };
            setLessonOptions((current) => (
                [...current.filter((item) => String(item.id) !== String(created.id)), lessonWithCount]
                    .sort((a, b) => a.learn_number - b.learn_number)
            ));
            form.setFieldsValue({
                lesson_id: String(created.id),
                learn_number: created.learn_number,
                master_lesson_name: created.lesson_name,
                lesson_name: created.lesson_name,
                hmo_mapping_keys: [],
            });
            messageApi.success(`Đã tạo Bài ${created.learn_number}: ${created.lesson_name}`);
            await refreshLessons();
            setQuickLessonOpen(false);
        } catch (error: any) {
            messageApi.error(error.message || 'Không thể tạo nhanh bài học.');
        } finally {
            setCreatingLesson(false);
        }
    };

    // --- Preview State ---
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewValues, setPreviewValues] = useState<any>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleFinish = async (values: any) => {
        let finalValues = { ...values };
        if (!isEdit) {
            finalValues.addMode = addMode;
            if (addMode === 'bulk') {
                finalValues.bulkConfigMode = bulkConfigMode;
            } else {
                finalValues.package_lesson_mappings = hmoKeysToMappings(values.hmo_mapping_keys || []);
            }
        } else {
            finalValues.update_mode = updateMode;
            if (updateMode === 'cancel') {
                finalValues.lesson_status = 1;
            } else if (updateMode === 'makeup' || updateMode === 'following') {
                finalValues.lesson_status = 1;
            }
        }

        // Thay vì gọi API luôn, mở Preview Modal và lưu trữ giá trị form lại
        setSubmitError(null);
        setPreviewValues(finalValues);
        setPreviewOpen(true);
    };

    const handleConfirmPreview = async (finalPayload: any, payloadType: 'bulk' | 'single' | 'update_current' | 'update_makeup' | 'update_following' | 'update_cancel') => {
        try {
            setLoading(true);
            setSubmitError(null);
            if (payloadType === 'bulk') {
                await createLivestreamBulk(finalPayload);
            } else if (payloadType === 'single') {
                await createLivestream(finalPayload);
            } else {
                const id = initialData?.id || initialData?.key;
                if (payloadType === 'update_cancel' || payloadType === 'update_makeup' || payloadType === 'update_following') {
                    await rescheduleLivestream(id, finalPayload);
                } else {
                    await updateLivestream(id, finalPayload);
                }
            }

            // Gọi onSuccess với một mảng chuẩn hóa hoặc giá trị phù hợp
            onSuccess(finalPayload);
            setPreviewOpen(false);
            handleClose();
        } catch (error) {
            console.error('Lỗi submit:', error);
            const errorMessage = getScheduleSubmitError(error);
            setSubmitError(errorMessage);
            messageApi.error({
                content: errorMessage,
                duration: 7,
            });
        } finally {
            setLoading(false);
        }
    };


    React.useEffect(() => {
        if (open) {
            if (isEdit) {
                form.setFieldsValue({
                    ...initialData,
                    assistant_teacher: String(initialData?.assistant_teacher || '')
                        .split(',')
                        .map((username) => username.trim())
                        .filter(Boolean),
                    new_session: {
                        ...(initialData?.new_session || {}),
                        teacher: initialData?.teacher,
                        assistant_teacher: String(initialData?.assistant_teacher || '')
                            .split(',')
                            .map((username) => username.trim())
                            .filter(Boolean),
                    },
                    update_mode: 'following',
                });
                setUpdateMode("following");
            } else {
                form.resetFields();
                setAddMode("single");
                setBulkConfigMode("common");
                if (programCode) {
                    const inferredGrade = Number(String(programCode).match(/-(\d{1,2})-/)?.[1]) || undefined;
                    form.setFieldsValue({
                        grade: selectedProgram?.grade || inferredGrade,
                        subject_name: selectedProgram?.subject_name || String(programCode),
                        subject_code: String(programCode),
                        class_code: String(programCode),
                    });
                }
            }
        }
    }, [open, initialData, form, isEdit, programCode, selectedProgram]);

    React.useEffect(() => {
        const rows: any[] = courseEndQuery.data?.data?.data ?? [];
        const starts = rows
            .map((row) => dayjs(row.start_time))
            .filter((date) => date.isValid())
            .sort((left, right) => left.valueOf() - right.valueOf());
        const lastStart = starts.at(-1) ?? null;
        const cadenceDays = inferCourseCadenceDays(rows);
        setCourseEndDate(lastStart?.startOf('day') ?? null);
        setCourseLastStartTime(lastStart);
        setCourseCadenceDays(cadenceDays);

        if (
            updateMode === 'following'
            && lastStart
            && cadenceDays
            && !form.getFieldValue(['new_session', 'date'])
        ) {
            form.setFieldValue(['new_session', 'date'], lastStart.add(cadenceDays, 'day'));
        }
    }, [courseEndQuery.data, form, updateMode]);

    return (
        <>
            {contextHolder}
            <Modal
                rootClassName="schedule-responsive-modal"
                title={
                    <>
                        <Title level={5} style={{ marginBottom: 4 }}>
                            {title || (isEdit ? 'Cập nhật Lịch học' : 'Thêm mới Lịch học')}
                        </Title>
                        <Text type="secondary" style={{ marginBottom: 0, fontSize: 13, fontWeight: 500 }}>
                            {isEdit ? 'Chỉnh sửa thông tin hoặc dời lịch học.' : 'Điền thông tin chi tiết để tạo lịch học mới.'}
                        </Text>
                    </>
                }
                open={open}
                onCancel={handleClose}
                onOk={() => form.submit()}
                width={900}
                centered
                styles={{
                    content: {
                        maxHeight: 'calc(100dvh - 32px)',
                        display: 'flex',
                        flexDirection: 'column',
                    },
                    body: {
                        flex: 1,
                        minHeight: 0,
                        maxHeight: 'calc(100dvh - 200px)',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        paddingRight: 8,
                    },
                }}
                footer={[
                    <Button key="back" onClick={handleClose} icon={<CloseCircleOutlined />}>
                        Huỷ
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        onClick={() => form.submit()}
                        icon={<EyeFilled />}
                        loading={loading}
                    >
                        Xem trước
                    </Button>,
                ]}
            >
                {isEdit && (
                    <div style={{ marginBottom: 24 }}>
                        <Radio.Group
                            value={updateMode}
                            onChange={(e) => {
                                const nextMode = e.target.value as typeof updateMode;
                                setUpdateMode(nextMode);
                                form.setFieldValue('update_mode', nextMode);
                                if (nextMode === 'following' && courseLastStartTime && courseCadenceDays) {
                                    form.setFieldValue(
                                        ['new_session', 'date'],
                                        courseLastStartTime.add(courseCadenceDays, 'day')
                                    );
                                }
                            }}
                            buttonStyle="solid"
                        >
                            <Radio.Button value="makeup">Nghỉ học & Tạo lịch bù</Radio.Button>
                            <Radio.Button value="following">Nghỉ học & Dời chuỗi</Radio.Button>
                            <Radio.Button value="cancel">Nghỉ học (Không dời)</Radio.Button>
                        </Radio.Group>
                    </div>
                )}

                <Form className="responsive-modal-form responsive-schedule-form" layout="vertical" form={form} onFinish={handleFinish}>

                    {isEdit && (
                        <FormSection title="Lý do thay đổi">
                            <Form.Item
                                label="Lý do"
                                name="change_reason"
                                rules={[
                                    {
                                        required: true,
                                        whitespace: true,
                                        message: "Vui lòng nhập lý do thay đổi lịch học",
                                    },
                                    {
                                        max: 500,
                                        message: "Lý do không được vượt quá 500 ký tự",
                                    },
                                ]}
                            >
                                <Input.TextArea
                                    rows={3}
                                    maxLength={500}
                                    showCount
                                    placeholder="Nhập lý do nghỉ học, tạo lịch bù hoặc dời chuỗi..."
                                />
                            </Form.Item>
                        </FormSection>
                    )}

                    {/* Form fields for Single Add and Current Update */}
                    {((!isEdit && addMode === 'single') || (isEdit && updateMode === 'current')) && (
                        <>
                            <FormSection title="Thông tin lớp học">
                                {usesProgramContext && (
                                    <>
                                        <Form.Item name="grade" hidden><Input /></Form.Item>
                                        <Form.Item name="subject_name" hidden><Input /></Form.Item>
                                        <Form.Item name="subject_code" hidden><Input /></Form.Item>
                                        <Form.Item name="class_code" hidden><Input /></Form.Item>
                                    </>
                                )}
                                {!usesProgramContext && <Row gutter={24}>
                                    <Col span={8}>
                                        <Form.Item label="Khối" name="grade" rules={[{ required: true, message: 'Chọn khối' }]}>
                                            <Select
                                                options={GRADE_OPTIONS}
                                                placeholder="Chọn khối"
                                                onChange={() => form.setFieldsValue({
                                                    subject_code: undefined,
                                                    lesson_id: undefined,
                                                    learn_number: undefined,
                                                    master_lesson_name: undefined,
                                                    lesson_name: undefined,
                                                })}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item label="Môn học" name="subject_name" rules={requiredWhenEditable('subject', 'Chọn môn học')}>
                                            <Select
                                                options={subjectOptions}
                                                placeholder="Chọn môn học"
                                                showSearch
                                                optionFilterProp="label"
                                                disabled={!isFieldEditable('subject')}
                                                onChange={() => form.setFieldsValue({
                                                    subject_code: undefined,
                                                    lesson_id: undefined,
                                                    learn_number: undefined,
                                                    master_lesson_name: undefined,
                                                    lesson_name: undefined,
                                                })}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item label="Mã môn học" name="subject_code" rules={[{ required: true, message: 'Chọn mã môn học' }]}>
                                            <Select
                                                options={getProgramOptions(selectedGrade, selectedSubject)}
                                                placeholder="Chọn chương trình"
                                                showSearch
                                                disabled={!selectedGrade || !selectedSubject}
                                                onChange={(subjectCode) => {
                                                    form.setFieldsValue({
                                                        lesson_id: undefined,
                                                        learn_number: undefined,
                                                        master_lesson_name: undefined,
                                                        lesson_name: undefined,
                                                    });
                                                    if (!form.isFieldTouched('class_code')) {
                                                        form.setFieldValue('class_code', subjectCode);
                                                    }
                                                }}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>}
                                {!usesProgramContext && <Row gutter={24}>
                                    <Col span={12}>
                                        <Form.Item label="Mã khóa học / Lớp" name="class_code" rules={requiredWhenEditable('code', 'Nhập mã khóa học')}>
                                            <Input placeholder="Tự đề xuất theo mã môn học" disabled={!isFieldEditable('code')} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label="Tên bài học" required>
                                            <Space.Compact style={{ width: '100%' }}>
                                                <Form.Item
                                                    name="lesson_id"
                                                    noStyle
                                                    rules={[{ required: true, message: 'Chọn bài học' }]}
                                                >
                                                    <Select
                                                        placeholder={
                                                            contextProgramCode
                                                                ? 'Chọn bài học'
                                                                : 'Chọn Khối và Môn học trước'
                                                        }
                                                        loading={loadingLessons}
                                                        disabled={!selectedSubjectCode}
                                                        showSearch
                                                        optionFilterProp="label"
                                                        popupMatchSelectWidth={480}
                                                        options={lessonOptions.map((lesson) => ({
                                                            value: String(lesson.id),
                                                            label: formatLessonScheduleOption(lesson),
                                                        }))}
                                                        onChange={(lessonId) => {
                                                            const lesson = lessonOptions.find(
                                                                (item) => String(item.id) === String(lessonId)
                                                            );
                                                            const scheduledCount = Number(
                                                                lesson?.scheduled_count ?? 0
                                                            );
                                                            form.setFieldsValue({
                                                                learn_number: lesson?.learn_number,
                                                                master_lesson_name: lesson?.lesson_name,
                                                                lesson_name: lesson?.lesson_name,
                                                                lesson_scheduled_count: scheduledCount,
                                                                hmo_mapping_keys: [],
                                                            });
                                                        }}
                                                        notFoundContent={
                                                            selectedGrade && selectedSubjectCode && !loadingLessons
                                                                ? 'Chưa có bài học'
                                                                : undefined
                                                        }
                                                        style={{ width: 'calc(100% - 32px)' }}
                                                    />
                                                </Form.Item>
                                                <Tooltip title={canCreateLesson ? 'Tạo nhanh bài học' : 'Bạn không có quyền tạo bài học'}>
                                                    <Button
                                                        icon={<PlusOutlined />}
                                                        disabled={!selectedGrade || !selectedSubject || !selectedSubjectCode || !canCreateLesson}
                                                        onClick={() => {
                                                            quickLessonForm.resetFields();
                                                            quickLessonForm.setFieldValue(
                                                                'subject_code',
                                                                selectedSubjectCode || buildLessonSubjectCode(
                                                                    selectedSubject,
                                                                    Number(selectedGrade),
                                                                    getSuggestedSchoolYear()
                                                                )
                                                            );
                                                            setQuickLessonOpen(true);
                                                        }}
                                                    />
                                                </Tooltip>
                                            </Space.Compact>
                                        </Form.Item>
                                    </Col>
                                    <Col span={24} style={{ display: 'none' }}>
                                        <Form.Item
                                            label="Tên bài học hiển thị trên lịch"
                                            name="lesson_name"
                                            rules={[
                                                { required: true, whitespace: true, message: 'Nhập tên bài học hiển thị' },
                                                { max: 400, message: 'Tên bài học không được vượt quá 400 ký tự' },
                                            ]}
                                        >
                                            <Input
                                                placeholder="Có thể thêm tiền tố hoặc hậu tố, ví dụ: [Lịch 2] - Tên bài học"
                                                maxLength={400}
                                                showCount
                                                disabled={!selectedLessonId}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>}
                                {usesProgramContext && <Row gutter={24}>
                                    <Col span={usesProgramContext ? 24 : 12}>
                                        <Form.Item label="Tên bài học" required>
                                            <Space.Compact style={{ width: '100%' }}>
                                                <Form.Item
                                                    name="lesson_id"
                                                    noStyle
                                                    rules={[{ required: true, message: 'Chọn bài học' }]}
                                                >
                                                    <Select
                                                        placeholder={
                                                            selectedGrade && selectedSubjectCode
                                                                ? 'Chọn bài học'
                                                                : 'Đang tải danh sách bài học'
                                                        }
                                                        loading={loadingLessons}
                                                        disabled={!contextProgramCode}
                                                        showSearch
                                                        optionFilterProp="label"
                                                        popupMatchSelectWidth={480}
                                                        options={lessonOptions.map((lesson) => ({
                                                            value: String(lesson.id),
                                                            label: formatLessonScheduleOption(lesson),
                                                        }))}
                                                        onChange={(lessonId) => {
                                                            const lesson = lessonOptions.find((item) => String(item.id) === String(lessonId));
                                                            const scheduledCount = Number(lesson?.scheduled_count ?? 0);
                                                            form.setFieldsValue({
                                                                learn_number: lesson?.learn_number,
                                                                master_lesson_name: lesson?.lesson_name,
                                                                lesson_name: lesson?.lesson_name,
                                                                lesson_scheduled_count: scheduledCount,
                                                                hmo_mapping_keys: [],
                                                            });
                                                        }}
                                                        notFoundContent={contextProgramCode && !loadingLessons ? 'Chưa có bài học' : undefined}
                                                        style={{ width: 'calc(100% - 32px)' }}
                                                    />
                                                </Form.Item>
                                                <Tooltip title={canCreateLesson ? 'Tạo nhanh bài học' : 'Bạn không có quyền tạo bài học'}>
                                                    <Button icon={<PlusOutlined />} disabled={!selectedGrade || !selectedSubject || !selectedSubjectCode || !canCreateLesson} onClick={() => {
                                                        quickLessonForm.resetFields();
                                                        quickLessonForm.setFieldValue('subject_code', selectedSubjectCode || buildLessonSubjectCode(selectedSubject, Number(selectedGrade), getSuggestedSchoolYear()));
                                                        setQuickLessonOpen(true);
                                                    }} />
                                                </Tooltip>
                                            </Space.Compact>
                                        </Form.Item>
                                    </Col>
                                    <Col span={24} style={{ display: 'none' }}>
                                        <Form.Item
                                            label="Tên bài học hiển thị trên lịch"
                                            name="lesson_name"
                                            rules={[
                                                { required: true, whitespace: true, message: 'Nhập tên bài học hiển thị' },
                                                { max: 400, message: 'Tên bài học không được vượt quá 400 ký tự' },
                                            ]}
                                        >
                                            <Input
                                                placeholder="Có thể thêm tiền tố hoặc hậu tố, ví dụ: [Lịch 2] - Tên bài học"
                                                maxLength={400}
                                                showCount
                                                disabled={!selectedLessonId}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>}
                                <Form.Item name="learn_number" hidden><Input /></Form.Item>
                                <Form.Item name="master_lesson_name" hidden><Input /></Form.Item>
                                <Form.Item name="lesson_scheduled_count" hidden><Input /></Form.Item>
                                {!isEdit && <Form.Item
                                    name="hmo_mapping_keys"
                                    label="Lesson ID HMO"
                                    extra={hmoOptions.length
                                        ? `${summarizeHmoOptions(hmoOptions)} — danh sách được nhóm theo Package/Course.`
                                        : undefined}
                                >
                                    <Select
                                        mode="multiple"
                                        allowClear
                                        showSearch
                                        optionFilterProp="label"
                                        loading={loadingHmoOptions}
                                        disabled={!selectedLessonId}
                                        listHeight={420}
                                        popupMatchSelectWidth={680}
                                        placeholder={!selectedLessonId
                                            ? 'Chọn bài học trước'
                                            : hmoOptions.length
                                                ? 'Chọn Lesson ID HMO'
                                                : 'Bài chưa có Course ID hoặc HMO không có Lesson ID'}
                                        options={buildGroupedHmoOptions(hmoOptions)}
                                        tagRender={renderHmoSelectedTag}
                                        maxTagCount="responsive"
                                    />
                                </Form.Item>}
                            </FormSection>

                            <FormSection title="Chi tiết thời gian">
                                <Row gutter={24}>
                                    <Col span={8}>
                                        <Form.Item label="Ngày học" name="date" rules={requiredWhenEditable('start_time', 'Nhập ngày học')}>
                                            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="DD/MM/YYYY" disabled={!isFieldEditable('start_time')} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item label="Thời gian bắt đầu" name="start_time" rules={requiredWhenEditable('start_time', 'Nhập giờ bắt đầu')}>
                                            <TimePicker
                                                format="HH:mm"
                                                style={{ width: '100%' }}
                                                placeholder="HH:mm"
                                                disabled={!isFieldEditable('start_time')}
                                                onChange={(value) => revalidateOrClearEndTime('end_time', value)}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item
                                            label="Thời gian kết thúc"
                                            name="end_time"
                                            rules={[
                                                ...requiredWhenEditable('end_time', 'Nhập giờ kết thúc'),
                                                { validator: validateEndTimeAfter('start_time') },
                                            ]}
                                        >
                                            <TimePicker
                                                format="HH:mm"
                                                style={{ width: '100%' }}
                                                placeholder="Nhập giờ bắt đầu trước"
                                                disabledTime={() => getEndDisabledTime(singleStartTime)}
                                                defaultOpenValue={singleStartTime}
                                                disabled={!isFieldEditable('end_time') || !singleStartTime}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </FormSection>

                            <FormSection title="Thông tin quản lý">
                                <Row gutter={24}>
                                    <Col span={8}>
                                        <Form.Item label="Giáo viên" name="teacher" rules={requiredWhenEditable('teacher', 'Chọn giáo viên')}>
                                            <TeachingStaffSelect teacherType={1} showSearch optionFilterProp="label" placeholder="Chọn giáo viên" disabled={!isFieldEditable('teacher')} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item label="Trợ giảng" name="assistant_teacher">
                                            <TeachingStaffSelect
                                                teacherType={0}
                                                mode="multiple"
                                                showSearch
                                                optionFilterProp="label"
                                                placeholder="Chọn một hoặc nhiều trợ giảng"
                                                disabled={!isFieldEditable('assistant_teacher')}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item label="Hệ thống" name="system_type" rules={[{ required: true, message: 'Chọn hệ thống' }]}>
                                            <Select
                                                options={[
                                                    { value: 'topclass', label: 'topclass' },
                                                    { value: 'topuni', label: 'topuni' },
                                                ]}
                                                placeholder="Chọn hệ thống"
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </FormSection>
                        </>
                    )}

                    {/* Form fields for Bulk Add */}
                    {!isEdit && addMode === 'bulk' && (
                        <>
                            <FormSection title="Cấu hình lịch tự động">
                                <Row gutter={24}>
                                    <Col span={12}>
                                        <Form.Item label="Ngày bắt đầu" name="bulk_start_date" rules={[{ required: true, message: 'Chọn ngày bắt đầu' }]}>
                                            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="DD/MM/YYYY" minDate={dayjs()} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label="Số buổi học" name="number_of_sessions" rules={[{ required: true, message: 'Nhập số buổi học' }]}>
                                            <Input type="number" min={1} placeholder="Ví dụ: 5" style={{ width: '100%' }} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={24}>
                                        <Form.Item
                                            label={
                                                <div >
                                                    <Checkbox
                                                        indeterminate={
                                                            selectedDays.length > 0 && selectedDays.length < DAYS_OPTIONS.length
                                                        }
                                                        onChange={(e) => {
                                                            const allValues = DAYS_OPTIONS.map((d) => d.value);
                                                            form.setFieldsValue({
                                                                days_of_week: e.target.checked ? allValues : [],
                                                            });
                                                        }}
                                                        checked={
                                                            selectedDays.length === DAYS_OPTIONS.length && DAYS_OPTIONS.length > 0
                                                        }
                                                    >
                                                        <span>Các ngày học trong tuần (Chọn tất cả)</span>
                                                    </Checkbox>
                                                </div>
                                            }
                                            required
                                            style={{ marginBottom: 8 }}
                                        >
                                            <Form.Item
                                                name="days_of_week"
                                                noStyle
                                                rules={[{ required: true, message: 'Chọn ít nhất 1 ngày' }]}
                                            >
                                                <Checkbox.Group options={DAYS_OPTIONS} style={{ marginLeft: 11 }} />
                                            </Form.Item>
                                        </Form.Item>
                                    </Col>
                                    {/* <Col span={24}>
                                    <Form.Item label="Các ngày học trong tuần" name="days_of_week" rules={[{ required: true, message: 'Chọn ít nhất 1 ngày' }]}>
                                        <Checkbox.Group options={DAYS_OPTIONS} />
                                    </Form.Item>
                                </Col> */}
                                </Row>
                                <Row gutter={24}>
                                    <Col span={24}>
                                        <Form.Item label="Hệ thống" name="bulk_system_type" rules={[{ required: true, message: 'Chọn hệ thống' }]}>
                                            <Select
                                                options={[
                                                    { value: 'topclass', label: 'topclass' },
                                                    { value: 'topuni', label: 'topuni' },
                                                ]}
                                                placeholder="Chọn hệ thống"
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={6}>
                                        <Form.Item label="Khối" name="bulk_grade" rules={[{ required: true, message: 'Chọn khối' }]}>
                                            <Select
                                                options={GRADE_OPTIONS}
                                                placeholder="Chọn khối"
                                                onChange={() => form.setFieldsValue({
                                                    bulk_subject_code: undefined,
                                                    bulk_learn_number: undefined,
                                                })}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={6}>
                                        <Form.Item label="Môn học" name="bulk_subject_name" rules={requiredWhenEditable('subject', 'Chọn môn học')}>
                                            <Select
                                                options={subjectOptions}
                                                placeholder="Chọn môn học"
                                                showSearch
                                                optionFilterProp="label"
                                                disabled={!isFieldEditable('subject')}
                                                onChange={() => form.setFieldsValue({
                                                    bulk_subject_code: undefined,
                                                    bulk_learn_number: undefined,
                                                })}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={6}>
                                        <Form.Item label="Mã môn học" name="bulk_subject_code" rules={[{ required: true, message: 'Chọn mã môn học' }]}>
                                            <Select
                                                options={getProgramOptions(selectedBulkGrade, selectedBulkSubject)}
                                                placeholder="Chọn chương trình"
                                                showSearch
                                                disabled={!selectedBulkGrade || !selectedBulkSubject}
                                                onChange={(subjectCode) => {
                                                    form.setFieldValue('bulk_learn_number', undefined);
                                                    if (!form.isFieldTouched('bulk_code')) {
                                                        form.setFieldValue('bulk_code', subjectCode);
                                                    }
                                                }}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={6}>
                                        <Form.Item label="Mã khóa học / Lớp" name="bulk_code" rules={requiredWhenEditable('code', 'Nhập mã khóa học')}>
                                            <Input placeholder="Tự đề xuất theo mã môn học" disabled={!isFieldEditable('code')} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Row gutter={24}>
                                    <Col span={12}>
                                        <Form.Item label="Bài học bắt đầu" name="bulk_learn_number" rules={requiredWhenEditable('learn_number', 'Chọn bài học bắt đầu')}>
                                            <Select
                                                placeholder={
                                                    selectedBulkGrade && selectedBulkSubjectCode
                                                        ? 'Chọn bài học bắt đầu'
                                                        : 'Chọn Khối và Môn học trước'
                                                }
                                                loading={loadingBulkLessons}
                                                disabled={
                                                    !isFieldEditable('learn_number') ||
                                                    !selectedBulkGrade ||
                                                    !selectedBulkSubjectCode
                                                }
                                                showSearch
                                                optionFilterProp="label"
                                                popupMatchSelectWidth={480}
                                                options={bulkLessonOptions.map((lesson) => ({
                                                    value: lesson.learn_number,
                                                    label: formatLessonScheduleOption(lesson),
                                                }))}
                                                notFoundContent={
                                                    selectedBulkGrade &&
                                                        selectedBulkSubjectCode &&
                                                        !loadingBulkLessons
                                                        ? 'Chưa có bài học'
                                                        : undefined
                                                }
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                {selectedBulkCourseCode &&
                                    selectedBulkGrade &&
                                    selectedBulkSubjectCode &&
                                    !loadingBulkLessons &&
                                    bulkLessonOptions.length > 0 && (
                                        <Alert
                                            type="info"
                                            showIcon
                                            style={{ marginBottom: 16 }}
                                            message={
                                                latestScheduledBulkLesson
                                                    ? `Khóa ${selectedBulkCourseCode} đã xếp lịch đến Bài ${latestScheduledBulkLesson.learn_number}: ${latestScheduledBulkLesson.lesson_name}`
                                                    : `Khóa ${selectedBulkCourseCode} chưa có lịch học`
                                            }
                                            description={
                                                latestScheduledBulkLesson
                                                    ? (
                                                        suggestedBulkLesson
                                                            ? `Bài ${latestScheduledBulkLesson.learn_number} đã được dạy ${Number(latestScheduledBulkLesson.scheduled_count)} buổi. Gợi ý bắt đầu từ Bài ${suggestedBulkLesson.learn_number}: ${suggestedBulkLesson.lesson_name}.`
                                                            : `Bài ${latestScheduledBulkLesson.learn_number} đã được dạy ${Number(latestScheduledBulkLesson.scheduled_count)} buổi. Chưa có bài học tiếp theo trong danh mục; bạn có thể chọn lại một bài hoặc tạo thêm tại bước xem trước.`
                                                    )
                                                    : (
                                                        suggestedBulkLesson
                                                            ? `Gợi ý bắt đầu từ Bài ${suggestedBulkLesson.learn_number}: ${suggestedBulkLesson.lesson_name}.`
                                                            : 'Chưa có bài học để xếp lịch.'
                                                    )
                                            }
                                        />
                                    )}

                                <div style={{ marginBottom: 16 }}>
                                    <Radio.Group value={bulkConfigMode} onChange={(e) => setBulkConfigMode(e.target.value)}>
                                        <Radio value="common">Dùng chung cấu hình cho tất cả các ngày</Radio>
                                        <Radio value="separate">Cấu hình riêng theo từng ngày</Radio>
                                    </Radio.Group>
                                </div>

                                {bulkConfigMode === 'common' && (
                                    <Card size="small" title="Cấu hình chung" style={{ background: '#fafafa', marginBottom: 16 }}>
                                        <div style={{ marginBottom: 12, padding: '4px 4px 0 4px' }}>
                                            <Text type="secondary" style={{ fontSize: '12.5px', fontStyle: 'italic', display: 'block' }}>
                                                * Cấu hình chung (Giờ bắt đầu, Giờ kết thúc, Giáo viên) sẽ được tự động áp dụng đồng loạt cho tất cả các ngày được chọn ở trên.
                                            </Text>
                                        </div>
                                        <Row gutter={24}>
                                            <Col span={12}>
                                                <Form.Item label="Giờ bắt đầu" name="bulk_start_time" rules={requiredWhenEditable('start_time', 'Nhập giờ bắt đầu')}>
                                                    <TimePicker
                                                        format="HH:mm"
                                                        style={{ width: '100%' }}
                                                        placeholder="HH:mm"
                                                        disabled={!isFieldEditable('start_time')}
                                                        onChange={(value) => revalidateOrClearEndTime('bulk_end_time', value)}
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item
                                                    label="Giờ kết thúc"
                                                    name="bulk_end_time"
                                                    rules={[
                                                        ...requiredWhenEditable('end_time', 'Nhập giờ kết thúc'),
                                                        { validator: validateEndTimeAfter('bulk_start_time') },
                                                    ]}
                                                >
                                                    <TimePicker
                                                        format="HH:mm"
                                                        style={{ width: '100%' }}
                                                        placeholder="Nhập giờ bắt đầu trước"
                                                        disabledTime={() => getEndDisabledTime(bulkStartTime)}
                                                        defaultOpenValue={bulkStartTime}
                                                        disabled={!isFieldEditable('end_time') || !bulkStartTime}
                                                    />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item label="Giáo viên" name="bulk_teacher" rules={requiredWhenEditable('teacher', 'Chọn giáo viên')}>
                                                    <TeachingStaffSelect teacherType={1} showSearch optionFilterProp="label" placeholder="Chọn giáo viên" disabled={!isFieldEditable('teacher')} />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12}>
                                                <Form.Item label="Trợ giảng" name="bulk_assistant_teacher">
                                                    <TeachingStaffSelect teacherType={0} mode="multiple" showSearch optionFilterProp="label" placeholder="Chọn trợ giảng" disabled={!isFieldEditable('assistant_teacher')} />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    </Card>
                                )}

                                {bulkConfigMode === 'separate' && (
                                    <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, border: '1px solid #f0f0f0' }}>
                                        <Text strong style={{ display: 'block', marginBottom: 16 }}>Cấu hình riêng cho từng ngày</Text>
                                        {selectedDays && selectedDays.length > 0 ? (
                                            selectedDays.map((dayValue: number) => {
                                                const dayLabel = DAYS_OPTIONS.find(d => d.value === dayValue)?.label;
                                                return (
                                                    <Row gutter={24} key={dayValue} style={{ marginBottom: 8, alignItems: 'center' }}>
                                                        <Col span={4}>
                                                            <Text strong>{dayLabel}</Text>
                                                        </Col>
                                                        <Col span={6}>
                                                            <Form.Item name={['separate_config', dayValue, 'start_time']} rules={requiredWhenEditable('start_time', 'Nhập giờ bắt đầu')} style={{ marginBottom: 8 }}>
                                                                <TimePicker
                                                                    format="HH:mm"
                                                                    placeholder="Giờ bắt đầu HH:mm"
                                                                    style={{ width: '100%' }}
                                                                    disabled={!isFieldEditable('start_time')}
                                                                    onChange={(value) => revalidateOrClearEndTime(['separate_config', dayValue, 'end_time'], value)}
                                                                />
                                                            </Form.Item>
                                                        </Col>
                                                        <Col span={6}>
                                                            <Form.Item noStyle dependencies={[['separate_config', dayValue, 'start_time']]}>
                                                                {({ getFieldValue }) => {
                                                                    const separateStartTime = getFieldValue(['separate_config', dayValue, 'start_time']) as Dayjs | undefined;
                                                                    return (
                                                                        <Form.Item
                                                                            name={['separate_config', dayValue, 'end_time']}
                                                                            rules={[
                                                                                ...requiredWhenEditable('end_time', 'Nhập giờ kết thúc'),
                                                                                { validator: validateEndTimeAfter(['separate_config', dayValue, 'start_time']) },
                                                                            ]}
                                                                            style={{ marginBottom: 8 }}
                                                                        >
                                                                            <TimePicker
                                                                                format="HH:mm"
                                                                                placeholder="Nhập giờ bắt đầu trước"
                                                                                style={{ width: '100%' }}
                                                                                disabledTime={() => getEndDisabledTime(separateStartTime)}
                                                                                defaultOpenValue={separateStartTime}
                                                                                disabled={!isFieldEditable('end_time') || !separateStartTime}
                                                                            />
                                                                        </Form.Item>
                                                                    );
                                                                }}
                                                            </Form.Item>
                                                        </Col>
                                                        <Col span={4}>
                                                            <Form.Item name={['separate_config', dayValue, 'teacher']} rules={requiredWhenEditable('teacher', 'Chọn giáo viên')} style={{ marginBottom: 8 }}>
                                                                <TeachingStaffSelect teacherType={1} showSearch optionFilterProp="label" placeholder="Giáo viên" disabled={!isFieldEditable('teacher')} />
                                                            </Form.Item>
                                                        </Col>
                                                        <Col span={4}>
                                                            <Form.Item name={['separate_config', dayValue, 'assistant_teacher']} style={{ marginBottom: 8 }}>
                                                                <TeachingStaffSelect teacherType={0} mode="multiple" showSearch optionFilterProp="label" placeholder="Trợ giảng" disabled={!isFieldEditable('assistant_teacher')} />
                                                            </Form.Item>
                                                        </Col>
                                                    </Row>
                                                );
                                            })
                                        ) : (
                                            <Text type="secondary">Vui lòng chọn ít nhất 1 ngày học trong tuần ở trên.</Text>
                                        )}
                                    </div>
                                )}

                            </FormSection>
                        </>
                    )}

                    {/* Form fields for Update Makeup / Following */}
                    {isEdit && (updateMode === 'makeup' || updateMode === 'following') && (
                        <>
                            <FormSection title="Thông tin buổi học sẽ nghỉ">
                                <Row gutter={24}>
                                    <Col span={12}>
                                        <Form.Item label="Mã khóa học">
                                            <Input disabled value={initialData?.code || initialData?.class_code || '---'} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label="Giáo viên">
                                            <Input disabled value={initialData?.teacher || 'Nguyễn Văn A'} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <div style={{ padding: '12px 16px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, marginBottom: 16 }}>
                                    <Text type="warning">
                                        {updateMode === 'following'
                                            ? 'Lưu ý: Hành động này sẽ đánh dấu buổi học hiện tại là Nghỉ học, dời toàn bộ đề cương của khóa học xuống các buổi tiếp theo và tạo thêm 1 buổi mới ở cuối khóa.'
                                            : 'Lưu ý: Hành động này sẽ đánh dấu buổi học hiện tại là Nghỉ học và tạo thêm một buổi học bù cho cùng bài học. Các buổi sau không bị thay đổi.'}
                                    </Text>
                                </div>
                            </FormSection>

                            <FormSection title={updateMode === 'following' ? 'Thông tin buổi mới ở cuối khóa' : 'Thông tin buổi học bù'}>
                                <Row gutter={24}>
                                    <Col span={8}>
                                        <Form.Item
                                            label={updateMode === 'following' ? 'Ngày buổi mới' : 'Ngày học bù'}
                                            name={['new_session', 'date']}
                                            rules={[
                                                ...requiredWhenEditable(
                                                    'start_time',
                                                    updateMode === 'following' ? 'Nhập ngày buổi mới' : 'Nhập ngày học bù'
                                                ),
                                                { validator: validateNewSessionDate },
                                            ]}
                                            extra={newSessionMinDate
                                                ? `${courseCadenceDays && updateMode === 'following'
                                                    ? `Đề xuất theo nhịp ${courseCadenceDays} ngày/lần. `
                                                    : ''}Ngày sớm nhất: ${newSessionMinDate.format('DD/MM/YYYY')}`
                                                : updateMode === 'following'
                                                    ? 'Đang xác định ngày kết thúc khóa...'
                                                    : undefined}
                                        >
                                            <DatePicker
                                                format="DD/MM/YYYY"
                                                style={{ width: '100%' }}
                                                placeholder="DD/MM/YYYY"
                                                minDate={newSessionMinDate}
                                                disabled={!isFieldEditable('start_time')}
                                                onChange={() => {
                                                    void form
                                                        .validateFields([['new_session', 'start_time']])
                                                        .catch(() => undefined);
                                                }}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item
                                            label="Thời gian bắt đầu"
                                            name={['new_session', 'start_time']}
                                            rules={[
                                                ...requiredWhenEditable('start_time', 'Nhập giờ bắt đầu'),
                                                { validator: validateNewSessionStartTime },
                                            ]}
                                        >
                                            <TimePicker
                                                format="HH:mm"
                                                style={{ width: '100%' }}
                                                placeholder="HH:mm"
                                                disabled={!isFieldEditable('start_time')}
                                                disabledTime={getNewSessionStartDisabledTime}
                                                onChange={(value) => revalidateOrClearEndTime(['new_session', 'end_time'], value)}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item
                                            label="Thời gian kết thúc"
                                            name={['new_session', 'end_time']}
                                            rules={[
                                                ...requiredWhenEditable('end_time', 'Nhập giờ kết thúc'),
                                                { validator: validateNewSessionEndTime },
                                            ]}
                                        >
                                            <TimePicker
                                                format="HH:mm"
                                                style={{ width: '100%' }}
                                                placeholder="Nhập giờ bắt đầu trước"
                                                disabledTime={() => getEndDisabledTime(newSessionStartTime)}
                                                defaultOpenValue={newSessionStartTime}
                                                disabled={!isFieldEditable('end_time') || !newSessionStartTime}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label="Giáo viên dạy bù" name={['new_session', 'teacher']} rules={requiredWhenEditable('teacher', 'Chọn giáo viên')}>
                                            <TeachingStaffSelect teacherType={1} showSearch optionFilterProp="label" placeholder="Chọn giáo viên" disabled={!isFieldEditable('teacher')} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label="Trợ giảng" name={['new_session', 'assistant_teacher']}>
                                            <TeachingStaffSelect teacherType={0} mode="multiple" showSearch optionFilterProp="label" placeholder="Chọn trợ giảng" disabled={!isFieldEditable('assistant_teacher')} />
                                        </Form.Item>
                                    </Col>
                                    {/* <Col span={12}>
                                        <Form.Item label="Phòng/Kênh học" name={['new_session', 'channel_name']}>
                                            <Input placeholder="Ví dụ: Phòng Online" />
                                        </Form.Item>
                                    </Col> */}
                                </Row>
                            </FormSection>
                        </>
                    )}

                    {/* Form fields for Update Cancel */}
                    {isEdit && updateMode === 'cancel' && (
                        <>
                            <FormSection title="Xác nhận nghỉ học">
                                <div style={{ padding: '12px 16px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 6 }}>
                                    <Text type="danger">
                                        Lưu ý: Hành động này chỉ đánh dấu buổi học hiện tại là Nghỉ/Hủy. Sẽ không dời đề cương và không ảnh hưởng đến các buổi học sau.
                                    </Text>
                                </div>
                            </FormSection>
                        </>
                    )}

                </Form>
            </Modal>

            {previewOpen && previewValues && (
                <SchedulePreviewModal
                    open={previewOpen}
                    onClose={() => {
                        setPreviewOpen(false);
                        setSubmitError(null);
                    }}
                    onConfirm={handleConfirmPreview}
                    formValues={previewValues}
                    isEdit={isEdit || false}
                    initialData={initialData}
                    loading={loading}
                    errorMessage={submitError}
                />
            )}

            <Modal
                title="Tạo nhanh bài học"
                open={quickLessonOpen}
                centered
                width={520}
                onCancel={() => setQuickLessonOpen(false)}
                onOk={() => quickLessonForm.submit()}
                okText="Tạo bài học"
                cancelText="Hủy"
                confirmLoading={creatingLesson}
                destroyOnClose
            >
                <Alert
                    type="info"
                    showIcon
                    message={`${selectedSubject || '-'} - Lớp ${selectedGrade || '-'}`}
                    description="Số thứ tự bài sẽ được hệ thống tự động tạo liên tiếp."
                    style={{ marginBottom: 16 }}
                />
                <Form
                    form={quickLessonForm}
                    layout="vertical"
                    onFinish={handleCreateQuickLesson}
                >
                    <Form.Item
                        name="subject_code"
                        hidden
                        rules={[
                            { required: true, whitespace: true, message: 'Nhập mã môn học' },
                            { max: 100, message: 'Mã môn học không được vượt quá 100 ký tự' },
                        ]}
                    ><Input /></Form.Item>
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

export default ScheduleModal;
