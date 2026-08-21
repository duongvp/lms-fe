'use client';

import React, { useEffect, useState } from 'react';
import { Alert, Button, Col, DatePicker, Form, message, Modal, Row, Tag, TimePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import TeachingStaffSelect from '@/components/shared/TeachingStaffSelect';
import HmoMappingSelect from '@/components/shared/HmoMappingSelect';
import { combineDateTime } from '@/helper/convertDate';
import { createLivestream, getHocmaiSectionsForSchedulingLesson, type HocmaiSectionOption } from '@/services/livestreamService';
import { buildGroupedHmoOptions, summarizeHmoOptions } from '@/helper/hmoOptions';

interface CopyScheduleModalProps {
    open: boolean;
    source: any | null;
    onClose: () => void;
    onSuccess: () => void;
}

interface CopyScheduleFormValues {
    date: Dayjs;
    start_time: Dayjs;
    end_time: Dayjs;
    teacher: string;
    assistant_teacher?: string[];
    hmo_mapping_keys?: string[];
}

const parseAssistants = (value: unknown) => (
    Array.isArray(value) ? value : String(value ?? '').split(',')
).map((item) => String(item).trim()).filter(Boolean);

const mappingKeysFromSource = (value: unknown) => {
    if (!Array.isArray(value)) return [];
    return value
        .flatMap((mapping: any) => {
            const packageId = String(mapping?.package_id ?? mapping?.package_ids?.[0] ?? '').trim();
            const courseId = String(mapping?.course_id ?? '').trim();
            const lessonIds = Array.isArray(mapping?.lesson_ids)
                ? mapping.lesson_ids
                : [mapping?.lesson_id];
            return lessonIds
                .map((lessonId: unknown) => String(lessonId ?? '').trim())
                .filter(Boolean)
                .map((lessonId: string) => `${packageId}::${courseId}::${lessonId}`);
        })
        .filter((key) => !key.startsWith('::') && !key.endsWith('::'));
};

const mappingKeysToPayload = (keys: string[] = []) => keys
    .flatMap((key) => {
        const [packageId, courseId, lessonId] = String(key).split('::');
        if (!packageId || !courseId || !lessonId) return [];
        return [{ package_id: packageId, course_id: courseId, lesson_ids: [lessonId] }];
    });

const formatSourceScheduleTime = (startTime?: string, endTime?: string) => {
    if (!startTime) return '-';
    const start = dayjs(startTime);
    if (!endTime) return start.format('DD/MM/YYYY HH:mm');

    const end = dayjs(endTime);
    return start.isSame(end, 'day')
        ? `${start.format('DD/MM/YYYY HH:mm')} – ${end.format('HH:mm')}`
        : `${start.format('DD/MM/YYYY HH:mm')} – ${end.format('DD/MM/YYYY HH:mm')}`;
};

const CopyScheduleModal: React.FC<CopyScheduleModalProps> = ({
    open,
    source,
    onClose,
    onSuccess,
}) => {
    const [form] = Form.useForm<CopyScheduleFormValues>();
    const [loading, setLoading] = useState(false);
    const [hmoOptions, setHmoOptions] = useState<HocmaiSectionOption[]>([]);
    const [loadingHmoOptions, setLoadingHmoOptions] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    const startTime = Form.useWatch('start_time', form) as Dayjs | undefined;

    useEffect(() => {
        if (!open || !source) return;
        form.resetFields();
        form.setFieldsValue({
            teacher: source.teacher || undefined,
            assistant_teacher: parseAssistants(source.assistant_teacher),
            date: undefined,
            start_time: undefined,
            end_time: undefined,
            hmo_mapping_keys: mappingKeysFromSource(source.package_lesson_mappings),
        });
        if (!source.code || !source.session_id) {
            setHmoOptions([]);
            return;
        }
        let active = true;
        setLoadingHmoOptions(true);
        getHocmaiSectionsForSchedulingLesson(source.code, source.session_id)
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
    }, [form, messageApi, open, source]);

    const handleSubmit = async (values: CopyScheduleFormValues) => {
        if (!source) return;
        try {
            setLoading(true);
            await createLivestream({
                system_type: source.system_type || 'topclass',
                code: source.code,
                teacher: values.teacher,
                assistant_teacher: values.assistant_teacher?.join(',') || undefined,
                learn_number: Number(source.learn_number),
                session_id: source.session_id ?? undefined,
                grade: source.grade ?? undefined,
                subject_name: source.subject || source.subject_name || undefined,
                lesson_name: source.lesson_name || undefined,
                channel_name: source.channel_name || source.room || undefined,
                start_time: combineDateTime(values.date, values.start_time)!,
                end_time: combineDateTime(values.date, values.end_time)!,
                lesson_status: 0,
                package_lesson_mappings: mappingKeysToPayload(values.hmo_mapping_keys),
            });
            onSuccess();
            form.resetFields();
        } catch (error: any) {
            messageApi.error(
                error?.detail?.message
                || error?.message
                || 'Không thể sao chép lịch học.'
            );
        } finally {
            setLoading(false);
        }
    };

    const validateEndTime = (_: unknown, endTime?: Dayjs | null) => {
        const startTime = form.getFieldValue('start_time');
        if (!startTime || !endTime) return Promise.resolve();
        const startMinutes = startTime.hour() * 60 + startTime.minute();
        const endMinutes = endTime.hour() * 60 + endTime.minute();
        return endMinutes > startMinutes
            ? Promise.resolve()
            : Promise.reject(new Error('Thời gian kết thúc phải sau thời gian bắt đầu'));
    };

    const disablePastDates = (date: Dayjs) => (
        date.startOf('day').isBefore(dayjs().startOf('day'))
    );

    const getEndDisabledTime = () => {
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

    const handleStartTimeChange = (nextStart?: Dayjs | null) => {
        const currentEnd = form.getFieldValue('end_time') as Dayjs | undefined;
        if (!currentEnd) return;
        if (!nextStart || !currentEnd.isAfter(nextStart)) {
            form.setFieldValue('end_time', undefined);
            return;
        }
        void form.validateFields(['end_time']);
    };

    return (
        <>
            {contextHolder}
            <Modal
                open={open}
                title="Sao chép lịch học"
                width={760}
                centered
                destroyOnClose
                onCancel={onClose}
                footer={[
                    <Button key="cancel" onClick={onClose}>Hủy</Button>,
                    <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
                        Tạo lịch sao chép
                    </Button>,
                ]}
            >
            <Alert
                type="info"
                showIcon
                message="Thông tin bài học được giữ nguyên từ lịch cũ"
                description="Vui lòng chọn ngày, khung giờ và kiểm tra lại giáo viên, trợ giảng cho buổi mới."
                style={{ marginBottom: 16 }}
            />
            <div
                style={{
                    marginBottom: 20,
                    padding: '12px 14px',
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                    background: '#fafafa',
                }}
            >
                <div style={{ marginBottom: 10, fontSize: 13, color: '#8c8c8c' }}>Thông tin được sao chép</div>
                <Row gutter={[16, 10]}>
                    <Col xs={24} md={8}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 3 }}>Chương trình</div>
                        <Tag color="blue" style={{ marginInlineEnd: 0 }}>{source?.code || '-'}</Tag>
                    </Col>
                    <Col xs={24} md={16}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 3 }}>Bài học</div>
                        <div>Bài {source?.learn_number ?? '-'}: {source?.lesson_name || '-'}</div>
                    </Col>
                    <Col xs={24} md={8}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 3 }}>Lịch cũ</div>
                        <div>{formatSourceScheduleTime(source?.start_time, source?.end_time)}</div>
                    </Col>
                    <Col xs={24} md={16}>
                        <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 3 }}>Hệ thống</div>
                        <div>{source?.system_type || '-'}</div>
                    </Col>
                </Row>
            </div>
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <Row gutter={16}>
                    <Col xs={24} md={8}>
                        <Form.Item name="date" label="Ngày học mới" rules={[{ required: true, message: 'Chọn ngày học mới' }]}>
                            <DatePicker
                                format="DD/MM/YYYY"
                                style={{ width: '100%' }}
                                disabledDate={disablePastDates}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item name="start_time" label="Bắt đầu" rules={[{ required: true, message: 'Chọn giờ bắt đầu' }]}>
                            <TimePicker
                                format="HH:mm"
                                style={{ width: '100%' }}
                                onChange={handleStartTimeChange}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                        <Form.Item
                            name="end_time"
                            label="Kết thúc"
                            rules={[
                                { required: true, message: 'Chọn giờ kết thúc' },
                                { validator: validateEndTime },
                            ]}
                        >
                            <TimePicker
                                format="HH:mm"
                                style={{ width: '100%' }}
                                disabled={!startTime}
                                disabledTime={getEndDisabledTime}
                                defaultOpenValue={startTime}
                                placeholder={startTime ? 'Chọn thời gian' : 'Chọn giờ bắt đầu trước'}
                            />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="teacher" label="Giáo viên" rules={[{ required: true, message: 'Chọn giáo viên' }]}>
                            <TeachingStaffSelect teacherType={1} teacherValueMode="displayName" showSearch optionFilterProp="label" placeholder="Chọn giáo viên" />
                        </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                        <Form.Item name="assistant_teacher" label="Trợ giảng">
                            <TeachingStaffSelect
                                teacherType={0}
                                mode="multiple"
                                showSearch
                                optionFilterProp="label"
                                placeholder="Chọn một hoặc nhiều trợ giảng"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item
                            name="hmo_mapping_keys"
                            label="Lesson ID HMO"
                            extra={hmoOptions.length
                                ? `${summarizeHmoOptions(hmoOptions)} — mapping cũ đã được chọn sẵn và có thể thay đổi.`
                                : undefined}
                        >
                            <HmoMappingSelect
                                allowClear
                                showSearch
                                optionFilterProp="label"
                                loading={loadingHmoOptions}
                                disabled={!source?.session_id}
                                listHeight={420}
                                popupMatchSelectWidth={680}
                                placeholder={!source?.session_id
                                    ? 'Lịch cũ chưa gắn bài học nội bộ'
                                    : hmoOptions.length
                                        ? 'Chọn Lesson ID HMO'
                                        : 'Bài chưa có Course ID hoặc HMO không có Lesson ID'}
                                options={buildGroupedHmoOptions(hmoOptions)}
                            />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
            </Modal>
        </>
    );
};

export default CopyScheduleModal;
