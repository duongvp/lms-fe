'use client';
import { Alert, Modal, Input, Row, Col, Form, Button, Typography, Select, Radio, Checkbox, Card, TimePicker, DatePicker, message, Space, Tooltip } from 'antd';
import { CloseCircleOutlined, EyeFilled, PlusOutlined } from '@ant-design/icons';
import React, { useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import {
    createLivestream,
    createLivestreamBulk,
    getLivestreams,
    updateLivestream,
    rescheduleLivestream
} from '@/services/livestreamService';
import SchedulePreviewModal from './SchedulePreviewModal';
import type { ModuleField } from '@/types/fieldPolicy';
import { resolveFieldRule } from '@/helper/fieldPolicy';
import { GRADE_OPTIONS, SUBJECT_OPTIONS } from '@/constants/subjects';
import { createLesson, getLessons, type LessonApiResponse } from '@/services/lessonService';
import { formatLessonScheduleOption } from '@/helper/lesson';
import { useAuthStore } from '@/stores/authStore';
import { PermissionKey } from '@/types/permissions';

const { Text, Title } = Typography;

const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => {
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

const TEACHER_OPTIONS = [
    { value: "Nguyễn Văn A", label: "Nguyễn Văn A" },
    { value: "Trần Thị B", label: "Trần Thị B" },
    { value: "Lê Hoàng C", label: "Lê Hoàng C" },
    { value: "Phạm Thảo D", label: "Phạm Thảo D" },
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
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // For Add
    const [addMode, setAddMode] = useState<"single" | "bulk">("single");
    const [bulkConfigMode, setBulkConfigMode] = useState<"common" | "separate">("common");

    // For Update
    const [updateMode, setUpdateMode] = useState<"current" | "makeup" | "following" | "cancel">("following");

    const selectedDays = Form.useWatch('days_of_week', form) || [];
    const selectedGrade = Form.useWatch('grade', form);
    const selectedSubject = Form.useWatch('subject_name', form);
    const selectedCourseCode = Form.useWatch('class_code', form);
    const selectedLessonId = Form.useWatch('lesson_id', form);
    const selectedBulkGrade = Form.useWatch('bulk_grade', form);
    const selectedBulkSubject = Form.useWatch('bulk_subject_name', form);
    const selectedBulkCourseCode = Form.useWatch('bulk_code', form);
    const newSessionStartTime = Form.useWatch(['new_session', 'start_time'], form) as Dayjs | undefined;
    const [lessonOptions, setLessonOptions] = useState<LessonApiResponse[]>([]);
    const [loadingLessons, setLoadingLessons] = useState(false);
    const [bulkLessonOptions, setBulkLessonOptions] = useState<LessonApiResponse[]>([]);
    const [loadingBulkLessons, setLoadingBulkLessons] = useState(false);
    const [quickLessonOpen, setQuickLessonOpen] = useState(false);
    const [creatingLesson, setCreatingLesson] = useState(false);
    const [courseEndDate, setCourseEndDate] = useState<Dayjs | null>(null);
    const [quickLessonForm] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();
    const hasPermission = useAuthStore((state) => state.hasPermission);
    const canCreateLesson = hasPermission(PermissionKey.LESSON_CREATE);

    React.useEffect(() => {
        let active = true;

        if (!open || isEdit || addMode !== 'single' || !selectedGrade || !selectedSubject) {
            setLessonOptions([]);
            return () => {
                active = false;
            };
        }

        const timer = window.setTimeout(() => {
            setLoadingLessons(true);
            getLessons({
                page: 1,
                limit: 100,
                grade: selectedGrade,
                subject: selectedSubject,
                course_code: selectedCourseCode?.trim() || undefined,
                sort_by: 'learn_number',
                sort_order: 'asc',
            })
                .then((response: any) => {
                    if (active) setLessonOptions(response?.data?.data ?? []);
                })
                .catch(() => {
                    if (active) setLessonOptions([]);
                })
                .finally(() => {
                    if (active) setLoadingLessons(false);
                });
        }, 300);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [addMode, isEdit, open, selectedCourseCode, selectedGrade, selectedSubject]);

    React.useEffect(() => {
        let active = true;

        if (
            !open ||
            isEdit ||
            addMode !== 'bulk' ||
            !selectedBulkGrade ||
            !selectedBulkSubject
        ) {
            setBulkLessonOptions([]);
            return () => {
                active = false;
            };
        }

        const timer = window.setTimeout(() => {
            setLoadingBulkLessons(true);
            getLessons({
                page: 1,
                limit: 100,
                grade: selectedBulkGrade,
                subject: selectedBulkSubject,
                course_code: selectedBulkCourseCode?.trim() || undefined,
                sort_by: 'learn_number',
                sort_order: 'asc',
            })
                .then((response: any) => {
                    if (!active) return;

                    const rows: LessonApiResponse[] = response?.data?.data ?? [];
                    setBulkLessonOptions(rows);

                    const scheduledLessons = rows.filter(
                        (lesson) => Number(lesson.scheduled_count ?? 0) > 0
                    );
                    const latestScheduledLesson = scheduledLessons.at(-1);
                    const suggestedLesson = latestScheduledLesson
                        ? rows.find(
                            (lesson) => lesson.learn_number > latestScheduledLesson.learn_number
                        )
                        : rows[0];

                    form.setFieldValue(
                        'bulk_learn_number',
                        suggestedLesson?.learn_number ?? latestScheduledLesson?.learn_number
                    );
                })
                .catch(() => {
                    if (active) setBulkLessonOptions([]);
                })
                .finally(() => {
                    if (active) setLoadingBulkLessons(false);
                });
        }, 300);

        return () => {
            active = false;
            window.clearTimeout(timer);
        };
    }, [
        addMode,
        form,
        isEdit,
        open,
        selectedBulkCourseCode,
        selectedBulkGrade,
        selectedBulkSubject,
    ]);

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
        if (!startTime || !endTime) return Promise.resolve();

        const startMinutes = startTime.hour() * 60 + startTime.minute();
        const endMinutes = endTime.hour() * 60 + endTime.minute();
        return endMinutes > startMinutes
            ? Promise.resolve()
            : Promise.reject(new Error('Thời gian kết thúc phải sau thời gian bắt đầu'));
    };

    const getNewSessionEndDisabledTime = () => {
        if (!newSessionStartTime) return {};

        const startHour = newSessionStartTime.hour();
        const startMinute = newSessionStartTime.minute();
        return {
            disabledHours: () => Array.from({ length: startHour }, (_, hour) => hour),
            disabledMinutes: (selectedHour: number) => (
                selectedHour === startHour
                    ? Array.from({ length: startMinute + 1 }, (_, minute) => minute)
                    : []
            ),
        };
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

    const handleCreateQuickLesson = async ({ lesson_name }: { lesson_name: string }) => {
        try {
            setCreatingLesson(true);
            const response: any = await createLesson({
                grade: Number(selectedGrade),
                subject_name: selectedSubject,
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
            });
            messageApi.success(`Đã tạo Bài ${created.learn_number}: ${created.lesson_name}`);
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
                    update_mode: 'following',
                });
                setUpdateMode("following");
            } else {
                form.resetFields();
                setAddMode("single");
                setBulkConfigMode("common");
            }
        }
    }, [open, initialData, form, isEdit]);

    React.useEffect(() => {
        let active = true;
        const code = initialData?.code || initialData?.class_code;

        if (!open || !isEdit || !code) {
            setCourseEndDate(null);
            return () => {
                active = false;
            };
        }

        getLivestreams({
            page: 1,
            limit: 1,
            code_exact: code,
            system_type: initialData?.system_type,
            sort_by: 'end_time',
            sort_order: 'desc',
        })
            .then((response: any) => {
                if (!active) return;
                const lastSession = response?.data?.data?.[0];
                setCourseEndDate(lastSession?.end_time ? dayjs(lastSession.end_time) : null);
            })
            .catch(() => {
                if (active) setCourseEndDate(null);
            });

        return () => {
            active = false;
        };
    }, [
        initialData?.class_code,
        initialData?.code,
        initialData?.system_type,
        isEdit,
        open,
    ]);

    return (
        <>
            {contextHolder}
            <Modal
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
                {!isEdit && (
                    <div style={{ marginBottom: 24 }}>
                        <Radio.Group
                            value={addMode}
                            onChange={(e) => setAddMode(e.target.value)}
                            buttonStyle="solid"
                        >
                            <Radio.Button value="single">Thêm 1 buổi</Radio.Button>
                            <Radio.Button value="bulk">Thêm nhiều lịch tự động</Radio.Button>
                        </Radio.Group>
                    </div>
                )}

                {isEdit && (
                    <div style={{ marginBottom: 24 }}>
                        <Radio.Group
                            value={updateMode}
                            onChange={(e) => {
                                setUpdateMode(e.target.value);
                                form.setFieldValue('update_mode', e.target.value);
                            }}
                            buttonStyle="solid"
                        >
                            <Radio.Button value="makeup">Nghỉ học & Tạo lịch bù</Radio.Button>
                            <Radio.Button value="following">Nghỉ học & Dời chuỗi</Radio.Button>
                            <Radio.Button value="cancel">Nghỉ học (Không dời)</Radio.Button>
                        </Radio.Group>
                    </div>
                )}

                <Form layout="vertical" form={form} onFinish={handleFinish} initialValues={{ status: "Chưa bắt đầu" }}>

                    {/* Form fields for Single Add and Current Update */}
                    {((!isEdit && addMode === 'single') || (isEdit && updateMode === 'current')) && (
                        <>
                            <FormSection title="Thông tin lớp học">
                                <Row gutter={24}>
                                    <Col span={12}>
                                        <Form.Item label="Mã khóa học" name="class_code" rules={requiredWhenEditable('code', 'Nhập mã khóa học')}>
                                            <Input placeholder="Ví dụ: toan-6" disabled={!isFieldEditable('code')} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label="Tên lớp" name="class_name" rules={[{ required: true, message: 'Nhập tên lớp' }]}>
                                            <Input placeholder="Ví dụ: Lớp ReactJS Basic" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item label="Khối" name="grade" rules={[{ required: true, message: 'Chọn khối' }]}>
                                            <Select
                                                options={GRADE_OPTIONS}
                                                placeholder="Chọn khối"
                                                onChange={() => form.setFieldsValue({
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
                                                options={SUBJECT_OPTIONS}
                                                placeholder="Chọn môn học"
                                                showSearch
                                                optionFilterProp="label"
                                                disabled={!isFieldEditable('subject')}
                                                onChange={() => form.setFieldsValue({
                                                    lesson_id: undefined,
                                                    learn_number: undefined,
                                                    master_lesson_name: undefined,
                                                    lesson_name: undefined,
                                                })}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item label="Tên bài học" required>
                                            <Space.Compact style={{ width: '100%' }}>
                                                <Form.Item
                                                    name="lesson_id"
                                                    noStyle
                                                    rules={[{ required: true, message: 'Chọn bài học' }]}
                                                >
                                                    <Select
                                                        placeholder={
                                                            selectedGrade && selectedSubject
                                                                ? 'Chọn bài học'
                                                                : 'Chọn Khối và Môn học trước'
                                                        }
                                                        loading={loadingLessons}
                                                        disabled={!selectedGrade || !selectedSubject}
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
                                                                lesson_name: lesson
                                                                    ? (
                                                                        scheduledCount > 0
                                                                            ? `[Lịch ${scheduledCount + 1}] - ${lesson.lesson_name}`
                                                                            : lesson.lesson_name
                                                                    )
                                                                    : undefined,
                                                            });
                                                        }}
                                                        notFoundContent={
                                                            selectedGrade && selectedSubject && !loadingLessons
                                                                ? 'Chưa có bài học'
                                                                : undefined
                                                        }
                                                        style={{ width: 'calc(100% - 32px)' }}
                                                    />
                                                </Form.Item>
                                                <Tooltip title={canCreateLesson ? 'Tạo nhanh bài học' : 'Bạn không có quyền tạo bài học'}>
                                                    <Button
                                                        icon={<PlusOutlined />}
                                                        disabled={!selectedGrade || !selectedSubject || !canCreateLesson}
                                                        onClick={() => {
                                                            quickLessonForm.resetFields();
                                                            setQuickLessonOpen(true);
                                                        }}
                                                    />
                                                </Tooltip>
                                            </Space.Compact>
                                        </Form.Item>
                                    </Col>
                                    <Col span={24}>
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
                                </Row>
                                <Form.Item name="learn_number" hidden><Input /></Form.Item>
                                <Form.Item name="master_lesson_name" hidden><Input /></Form.Item>
                            </FormSection>

                            <FormSection title="Chi tiết thời gian & địa điểm">
                                <Row gutter={24}>
                                    <Col span={8}>
                                        <Form.Item label="Ngày học" name="date" rules={requiredWhenEditable('start_time', 'Nhập ngày học')}>
                                            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="DD/MM/YYYY" disabled={!isFieldEditable('start_time')} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item label="Thời gian bắt đầu" name="start_time" rules={requiredWhenEditable('start_time', 'Nhập giờ bắt đầu')}>
                                            <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="HH:mm" disabled={!isFieldEditable('start_time')} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item label="Thời gian kết thúc" name="end_time" rules={requiredWhenEditable('end_time', 'Nhập giờ kết thúc')}>
                                            <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="HH:mm" disabled={!isFieldEditable('end_time')} />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </FormSection>

                            <FormSection title="Thông tin quản lý">
                                <Row gutter={24}>
                                    <Col span={8}>
                                        <Form.Item label="Giáo viên" name="teacher" rules={requiredWhenEditable('teacher', 'Chọn giáo viên')}>
                                            <Select options={TEACHER_OPTIONS} placeholder="Chọn giáo viên" disabled={!isFieldEditable('teacher')} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item label="Hệ thống" name="system_type" rules={[{ required: true, message: 'Nhập hệ thống' }]}>
                                            <Input placeholder="Ví dụ: topclass" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item label="Trạng thái" name="status" rules={[{ required: true, message: 'Chọn trạng thái' }]}>
                                            <Select options={[
                                                { value: "Chưa bắt đầu", label: "Chưa bắt đầu" },
                                                { value: "Đang diễn ra", label: "Đang diễn ra" },
                                                { value: "Đã kết thúc", label: "Đã kết thúc" },
                                            ]} placeholder="Chọn trạng thái" />
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
                                            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="DD/MM/YYYY" />
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
                                    <Col span={8}>
                                        <Form.Item label="Mã khóa học / Lớp" name="bulk_code" rules={requiredWhenEditable('code', 'Nhập mã khóa học')}>
                                            <Input placeholder="Ví dụ: toan-6" disabled={!isFieldEditable('code')} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item label="Hệ thống" name="bulk_system_type" rules={[{ required: true, message: 'Nhập hệ thống' }]}>
                                            <Input placeholder="Ví dụ: topclass" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item label="Bài học bắt đầu" name="bulk_learn_number" rules={requiredWhenEditable('learn_number', 'Chọn bài học bắt đầu')}>
                                            <Select
                                                placeholder={
                                                    selectedBulkGrade && selectedBulkSubject
                                                        ? 'Chọn bài học bắt đầu'
                                                        : 'Chọn Khối và Môn học trước'
                                                }
                                                loading={loadingBulkLessons}
                                                disabled={
                                                    !isFieldEditable('learn_number') ||
                                                    !selectedBulkGrade ||
                                                    !selectedBulkSubject
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
                                                    selectedBulkSubject &&
                                                    !loadingBulkLessons
                                                        ? 'Chưa có bài học'
                                                        : undefined
                                                }
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item label="Khối" name="bulk_grade" rules={[{ required: true, message: 'Chọn khối' }]}>
                                            <Select
                                                options={GRADE_OPTIONS}
                                                placeholder="Chọn khối"
                                                onChange={() => form.setFieldValue('bulk_learn_number', undefined)}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item label="Môn học" name="bulk_subject_name" rules={requiredWhenEditable('subject', 'Chọn môn học')}>
                                            <Select
                                                options={SUBJECT_OPTIONS}
                                                placeholder="Chọn môn học"
                                                showSearch
                                                optionFilterProp="label"
                                                disabled={!isFieldEditable('subject')}
                                                onChange={() => form.setFieldValue('bulk_learn_number', undefined)}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>

                                {selectedBulkCourseCode &&
                                    selectedBulkGrade &&
                                    selectedBulkSubject &&
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
                                        <Row gutter={24}>
                                            <Col span={8}>
                                                <Form.Item label="Giờ bắt đầu" name="bulk_start_time" rules={requiredWhenEditable('start_time', 'Nhập giờ bắt đầu')}>
                                                    <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="HH:mm" disabled={!isFieldEditable('start_time')} />
                                                </Form.Item>
                                            </Col>
                                            <Col span={8}>
                                                <Form.Item label="Giờ kết thúc" name="bulk_end_time" rules={requiredWhenEditable('end_time', 'Nhập giờ kết thúc')}>
                                                    <TimePicker format="HH:mm" style={{ width: '100%' }} placeholder="HH:mm" disabled={!isFieldEditable('end_time')} />
                                                </Form.Item>
                                            </Col>
                                            <Col span={8}>
                                                <Form.Item label="Giáo viên" name="bulk_teacher" rules={requiredWhenEditable('teacher', 'Chọn giáo viên')}>
                                                    <Select options={TEACHER_OPTIONS} placeholder="Chọn giáo viên" disabled={!isFieldEditable('teacher')} />
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
                                                                {/* <Input type="time" placeholder="Giờ bắt đầu" /> */}
                                                                <DatePicker
                                                                    format="HH:mm"
                                                                    picker="time"
                                                                    placeholder="Giờ bắt đầu HH:mm"
                                                                    style={{ width: '100%' }}
                                                                    disabled={!isFieldEditable('start_time')}
                                                                />
                                                            </Form.Item>
                                                        </Col>
                                                        <Col span={6}>
                                                            <Form.Item name={['separate_config', dayValue, 'end_time']} rules={requiredWhenEditable('end_time', 'Nhập giờ kết thúc')} style={{ marginBottom: 8 }}>
                                                                {/* <Input type="time" placeholder="Giờ kết thúc" /> */}
                                                                <DatePicker
                                                                    format="HH:mm"
                                                                    picker="time"
                                                                    placeholder="Giờ kết thúc HH:mm"
                                                                    style={{ width: '100%' }}
                                                                    disabled={!isFieldEditable('end_time')}
                                                                />
                                                            </Form.Item>
                                                        </Col>
                                                        <Col span={8}>
                                                            <Form.Item name={['separate_config', dayValue, 'teacher']} rules={requiredWhenEditable('teacher', 'Chọn giáo viên')} style={{ marginBottom: 8 }}>
                                                                <Select options={TEACHER_OPTIONS} placeholder="Giáo viên" disabled={!isFieldEditable('teacher')} />
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
                                                ? `Ngày sớm nhất: ${newSessionMinDate.format('DD/MM/YYYY')}`
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
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item label="Thời gian bắt đầu" name={['new_session', 'start_time']} rules={requiredWhenEditable('start_time', 'Nhập giờ bắt đầu')}>
                                            <TimePicker
                                                format="HH:mm"
                                                style={{ width: '100%' }}
                                                placeholder="HH:mm"
                                                disabled={!isFieldEditable('start_time')}
                                                onChange={() => {
                                                    if (form.getFieldValue(['new_session', 'end_time'])) {
                                                        void form.validateFields([['new_session', 'end_time']]);
                                                    }
                                                }}
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
                                                placeholder="HH:mm"
                                                disabledTime={getNewSessionEndDisabledTime}
                                                disabled={!isFieldEditable('end_time')}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label="Giáo viên dạy bù" name={['new_session', 'teacher']} rules={requiredWhenEditable('teacher', 'Chọn giáo viên')}>
                                            <Select options={TEACHER_OPTIONS} placeholder="Chọn giáo viên" disabled={!isFieldEditable('teacher')} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item label="Phòng/Kênh học" name={['new_session', 'channel_name']}>
                                            <Input placeholder="Ví dụ: Phòng Online" />
                                        </Form.Item>
                                    </Col>
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
