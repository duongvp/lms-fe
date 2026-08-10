'use client';

import React, { useEffect } from 'react';
import {
    Modal,
    Form,
    Radio,
    Select,
    TimePicker,
    Checkbox,
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
    Table,
} from 'antd';
import { EditOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import TeachingStaffSelect from '@/components/shared/TeachingStaffSelect';
import {
    getHocmaiSectionsForSchedulingLesson,
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

const hmoOptionKey = (option: HocmaiSectionOption) => (
    `${option.package_id}::${option.course_id}::${option.lesson_id}`
);

const mappingKeyFromCalendarMapping = (mapping: any) => (
    `${String(mapping?.package_id || '')}::${String(mapping?.course_id || '')}::${String(mapping?.lesson_id || '')}`
);

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
    onSuccess: (updatedData: any) => void | Promise<void>;
    selectedRowKeys?: React.Key[]; // Danh sách ID/Bài học đã chọn từ Bảng
    selectedRows?: any[];
}

export const BulkEditModal: React.FC<BulkEditModalProps> = ({
    open,
    onClose,
    onSuccess,
    selectedRowKeys = [],
    selectedRows = [],
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = React.useState(false);
    const [previewRows, setPreviewRows] = React.useState<any[]>([]);
    const [hmoOptionsByLesson, setHmoOptionsByLesson] = React.useState<Record<string, HocmaiSectionOption[]>>({});
    const [loadingHmoLessons, setLoadingHmoLessons] = React.useState<Set<string>>(new Set());

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
    const selectedLessons = Form.useWatch('selected_lessons', form) || selectedRowKeys;
    const commonStartTime = Form.useWatch('common_start_time', form) as Dayjs | undefined;

    // Tự động set giá trị mặc định khi mở Modal
    useEffect(() => {
        if (open) {
            const separateConfig: Record<string, any> = {};
            selectedRows.forEach((row) => {
                const hmoMappingKeys = (row.package_lesson_mappings || [])
                    .map(mappingKeyFromCalendarMapping)
                    .filter((key: string) => !key.startsWith('::') && !key.endsWith('::'));
                
                separateConfig[row.id] = {
                    start_time: row.start_time ? dayjs(row.start_time, 'HH:mm') : undefined,
                    end_time: row.end_time ? dayjs(row.end_time, 'HH:mm') : undefined,
                    teacher: row.teacher?.username,
                    assistant_teacher: Array.isArray(row.assistant_teacher) 
                        ? row.assistant_teacher.map((a: any) => a.username) 
                        : (row.assistant_teacher?.username ? [row.assistant_teacher.username] : []),
                    room: row.room,
                    hmo_mapping_keys: hmoMappingKeys,
                };
            });

            let commonConfig: Record<string, any> = {};
            if (selectedRows.length > 0) {
                const firstRow = selectedRows[0];
                const allSameTeacher = selectedRows.every(r => r.teacher?.username === firstRow.teacher?.username);
                const allSameRoom = selectedRows.every(r => r.room === firstRow.room);
                const allSameStartTime = selectedRows.every(r => r.start_time === firstRow.start_time);
                const allSameEndTime = selectedRows.every(r => r.end_time === firstRow.end_time);

                if (allSameTeacher) {
                    commonConfig.common_teacher = firstRow.teacher?.username;
                }
                if (allSameRoom) {
                    commonConfig.common_room = firstRow.room;
                }
                if (allSameStartTime && firstRow.start_time) {
                    commonConfig.common_start_time = dayjs(firstRow.start_time, 'HH:mm');
                }
                if (allSameEndTime && firstRow.end_time) {
                    commonConfig.common_end_time = dayjs(firstRow.end_time, 'HH:mm');
                }

                const firstAssistant = Array.isArray(firstRow.assistant_teacher) 
                        ? firstRow.assistant_teacher.map((a: any) => a.username).sort().join(',') 
                        : (firstRow.assistant_teacher?.username || '');
                const allSameAssistant = selectedRows.every(r => {
                    const ast = Array.isArray(r.assistant_teacher) 
                        ? r.assistant_teacher.map((a: any) => a.username).sort().join(',') 
                        : (r.assistant_teacher?.username || '');
                    return ast === firstAssistant;
                });
                
                if (allSameAssistant) {
                    commonConfig.common_assistant_teacher = Array.isArray(firstRow.assistant_teacher) 
                        ? firstRow.assistant_teacher.map((a: any) => a.username) 
                        : (firstRow.assistant_teacher?.username ? [firstRow.assistant_teacher.username] : []);
                }

                commonConfig.common_hmo_mapping_keys_by_lesson = Object.fromEntries(
                    lessonContexts.map((context) => {
                        const firstLessonRow = selectedRows.find(
                            (row) => String(row.session_id || '') === context.lessonId
                        );
                        return [
                            context.lessonId,
                            (firstLessonRow?.package_lesson_mappings || [])
                                .map(mappingKeyFromCalendarMapping)
                                .filter((key: string) => !key.startsWith('::') && !key.endsWith('::')),
                        ];
                    })
                );
            }

            form.setFieldsValue({
                config_mode: 'common',
                selected_lessons: selectedRowKeys,
                separate_config: separateConfig,
                ...commonConfig,
            });
            setPreviewRows([]);
        }
    }, [open, selectedRowKeys, selectedRows, form, lessonContexts]);

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

    const handleFinish = async (values: any) => {
        try {
            setLoading(true);

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
                        start_time: config.start_time ? dayjs(config.start_time).format('HH:mm') : undefined,
                        end_time: config.end_time ? dayjs(config.end_time).format('HH:mm') : undefined,
                        ...(mappingTouched
                            ? { package_lesson_mappings: mappingKeysToPayload(config.hmo_mapping_keys) }
                            : {}),
                    };
                    delete formattedSeparateConfig[key].hmo_mapping_keys;
                });
            }

            if (previewRows.length === 0) {
                setPreviewRows((selectedLessons as (string | number)[]).map((lessonKey) => {
                    const record = selectedRows.find((item) => String(item.id) === String(lessonKey));
                    const internalLessonId = String(record?.session_id || '');
                    const nextKeys = values.config_mode === 'separate'
                        ? values.separate_config?.[lessonKey]?.hmo_mapping_keys || []
                        : values.common_hmo_mapping_keys_by_lesson?.[internalLessonId] || [];
                    const isMappingUnchanged = values.config_mode === 'common'
                        ? !values.enable_mapping
                        : !form.isFieldTouched([
                            'separate_config',
                            String(lessonKey),
                            'hmo_mapping_keys',
                        ]);
                    
                    return {
                        id: lessonKey,
                        label: record?.learn_number ? `Buổi ${record.learn_number}` : `ID ${lessonKey}`,
                        current: formatMappings(record?.package_lesson_mappings || []),
                        next: isMappingUnchanged
                            ? 'Giữ nguyên'
                            : (nextKeys.length ? formatMappingKeys(nextKeys, internalLessonId) : 'Xóa toàn bộ Lesson ID'),
                    };
                }));
                return;
            }

            const payload = {
                scope: {
                    type: 'selected_rows',
                    selected_lessons: values.selected_lessons,
                },
                config_mode: values.config_mode,
                common_config: values.config_mode === 'common' ? {
                    teacher: values.enable_teacher ? values.common_teacher : undefined,
                    assistant_teacher: values.enable_assistant
                        ? values.common_assistant_teacher
                        : undefined,
                    room: values.enable_room ? values.common_room : undefined,
                    start_time: values.enable_time && values.common_start_time ? dayjs(values.common_start_time).format('HH:mm') : undefined,
                    end_time: values.enable_time && values.common_end_time ? dayjs(values.common_end_time).format('HH:mm') : undefined,
                    mapping_updates: values.enable_mapping
                        ? Object.fromEntries((selectedLessons as (string | number)[]).map((calendarId) => {
                            const record = selectedRows.find((item) => String(item.id) === String(calendarId));
                            const internalLessonId = String(record?.session_id || '');
                            const keys = values.common_hmo_mapping_keys_by_lesson?.[internalLessonId] || [];
                            return [String(calendarId), mappingKeysToPayload(keys)];
                        }))
                        : undefined,
                } : undefined,
                separate_config: formattedSeparateConfig,
            };

            await onSuccess(payload);
            handleClose();
        } catch (err) {
            console.error("Lỗi cập nhật hàng loạt:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={
                <div>
                    <Title level={5} style={{ marginBottom: 4, color: '#1890ff' }}>Cập Nhật Lịch Học Hàng Loạt</Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        Điều chỉnh Giáo viên, Khung giờ và Phòng học cho nhiều bài học cùng lúc.
                    </Text>
                </div>
            }
            open={open}
            onCancel={handleClose}
            width={850}
            centered
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
                >
                    {previewRows.length ? 'Xác nhận cập nhật' : 'Xem trước'}
                </Button>
            ]}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
                initialValues={{
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
                                {selectedRowKeys.length} bài học đã chọn
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

                {/* Chọn chế độ cấu hình */}
                <div style={{ marginBottom: 20 }}>
                    <Form.Item name="config_mode" style={{ marginBottom: 0 }}>
                        <Radio.Group buttonStyle="solid" style={{ width: '100%' }}>
                            <Radio.Button value="common" style={{ width: '50%', textAlign: 'center', height: '38px', lineHeight: '36px' }}>
                                Dùng chung cấu hình cho tất cả bài đã chọn
                            </Radio.Button>
                            <Radio.Button value="separate" style={{ width: '50%', textAlign: 'center', height: '38px', lineHeight: '36px' }}>
                                Cấu hình riêng cho từng bài đã chọn
                            </Radio.Button>
                        </Radio.Group>
                    </Form.Item>
                </div>

                {/* CHẾ ĐỘ 1: CẤU HÌNH CHUNG */}
                {configMode === 'common' && (
                    <Card size="small" style={{ background: '#fafafa', borderRadius: 8, border: '1px solid #e8e8e8', padding: '8px 12px' }}>
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
                                                teacherType={2}
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
                                    Course ID và Package ID được tự lấy từ từng bài trong Đề cương.
                                </Text>
                            </Col>
                            <Col span={16}>
                                <Form.Item noStyle dependencies={['enable_mapping']}>
                                    {({ getFieldValue }) => {
                                        const enabled = getFieldValue('enable_mapping');
                                        return (
                                            <div style={{ opacity: enabled ? 1 : 0.5, pointerEvents: enabled ? 'auto' : 'none' }}>
                                                <Space direction="vertical" style={{ width: '100%' }}>
                                                    {lessonContexts.map((context) => {
                                                        const options = hmoOptionsByLesson[context.lessonId] || [];
                                                        return (
                                                            <Form.Item
                                                                key={context.lessonId}
                                                                name={['common_hmo_mapping_keys_by_lesson', context.lessonId]}
                                                                label={context.label}
                                                                style={{ marginBottom: 8 }}
                                                            >
                                                                <Select
                                                                    mode="multiple"
                                                                    allowClear
                                                                    showSearch
                                                                    optionFilterProp="label"
                                                                    loading={loadingHmoLessons.has(context.lessonId)}
                                                                    disabled={!enabled}
                                                                    placeholder={options.length
                                                                        ? 'Chọn Lesson ID HMO'
                                                                        : 'Bài chưa có Course ID hoặc HMO không có Lesson ID'}
                                                                    options={options.map((option) => ({
                                                                        value: hmoOptionKey(option),
                                                                        label: `${option.lesson_id}${option.lesson_name ? ` · ${option.lesson_name}` : ''}`,
                                                                    }))}
                                                                    maxTagCount="responsive"
                                                                />
                                                            </Form.Item>
                                                        );
                                                    })}
                                                    {!lessonContexts.length && (
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

                {/* CHẾ ĐỘ 2: CẤU HÌNH RIÊNG CHO TỪNG BÀI */}
                {configMode === 'separate' && (
                    <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, border: '1px solid #e8e8e8', maxHeight: '400px', overflowY: 'auto' }}>
                        <Text strong style={{ display: 'block', marginBottom: 16 }}>
                            Điền cấu hình điều chỉnh chi tiết cho từng bài học:
                        </Text>

                        {Array.isArray(selectedLessons) && selectedLessons.length > 0 ? (
                            (selectedLessons as (string | number)[]).map((lessonKey) => (
                                <Card
                                    key={lessonKey}
                                    size="small"
                                    title={<Tag color="blue" style={{ fontSize: 13, padding: '2px 8px' }}>Bài số {lessonKey}</Tag>}
                                    style={{ marginBottom: 12, borderRadius: 6, border: '1px solid #f0f0f0' }}
                                >
                                    <Row gutter={12}>
                                        <Col span={6}>
                                            <Form.Item
                                                label="Giờ bắt đầu"
                                                name={['separate_config', lessonKey, 'start_time']}
                                                style={{ marginBottom: 0 }}
                                            >
                                                <TimePicker
                                                    format="HH:mm"
                                                    style={{ width: '100%' }}
                                                    placeholder="HH:mm"
                                                    onChange={(value) => revalidateOrClearEndTime(['separate_config', lessonKey, 'end_time'], value)}
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={6}>
                                            <Form.Item noStyle dependencies={[['separate_config', lessonKey, 'start_time']]}>
                                                {({ getFieldValue }) => {
                                                    const separateStartTime = getFieldValue(['separate_config', lessonKey, 'start_time']) as Dayjs | undefined;
                                                    return (
                                                        <Form.Item
                                                            label="Giờ kết thúc"
                                                            name={['separate_config', lessonKey, 'end_time']}
                                                            style={{ marginBottom: 0 }}
                                                            rules={[{ validator: validateEndTimeAfter(['separate_config', lessonKey, 'start_time']) }]}
                                                        >
                                                            <TimePicker
                                                                format="HH:mm"
                                                                style={{ width: '100%' }}
                                                                placeholder="Nhập giờ bắt đầu trước"
                                                                disabledTime={() => getEndDisabledTime(separateStartTime)}
                                                                disabled={!separateStartTime}
                                                            />
                                                        </Form.Item>
                                                    );
                                                }}
                                            </Form.Item>
                                        </Col>
                                        <Col span={6}>
                                            <Form.Item
                                                label="Giáo viên"
                                                name={['separate_config', lessonKey, 'teacher']}
                                                style={{ marginBottom: 0 }}
                                            >
                                                <TeachingStaffSelect teacherType={1} showSearch optionFilterProp="label" placeholder="Chọn giáo viên" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={6}>
                                            <Form.Item
                                                label="Phòng học"
                                                name={['separate_config', lessonKey, 'room']}
                                                style={{ marginBottom: 0 }}
                                            >
                                                <Select options={ROOM_OPTIONS} placeholder="Chọn phòng" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Form.Item
                                        label="Trợ giảng"
                                        name={['separate_config', lessonKey, 'assistant_teacher']}
                                        style={{ marginTop: 12, marginBottom: 0 }}
                                    >
                                        <TeachingStaffSelect teacherType={2} mode="multiple" showSearch optionFilterProp="label" placeholder="Chọn trợ giảng" />
                                    </Form.Item>
                                    {(() => {
                                        const record = selectedRows.find(
                                            (item) => String(item.id) === String(lessonKey)
                                        );
                                        const internalLessonId = String(record?.session_id || '');
                                        const options = hmoOptionsByLesson[internalLessonId] || [];
                                        return (
                                            <div style={{ marginTop: 12, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
                                                <Form.Item
                                                    label="Lesson ID HMO"
                                                    name={['separate_config', lessonKey, 'hmo_mapping_keys']}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <Select
                                                        mode="multiple"
                                                        allowClear
                                                        showSearch
                                                        optionFilterProp="label"
                                                        loading={loadingHmoLessons.has(internalLessonId)}
                                                        disabled={!internalLessonId}
                                                        placeholder={!internalLessonId
                                                            ? 'Lịch chưa gắn bài học nội bộ'
                                                            : options.length
                                                                ? 'Chọn Lesson ID HMO'
                                                                : 'Bài chưa có Course ID hoặc HMO không có Lesson ID'}
                                                        options={options.map((option) => ({
                                                            value: hmoOptionKey(option),
                                                            label: `${option.lesson_id}${option.lesson_name ? ` · ${option.lesson_name}` : ''}`,
                                                        }))}
                                                        maxTagCount="responsive"
                                                    />
                                                </Form.Item>
                                                <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>
                                                    Course ID và Package ID được tự lấy từ bài học trong Đề cương.
                                                </Text>
                                            </div>
                                        );
                                    })()}
                                </Card>
                            ))
                        ) : (
                            <Text type="secondary">Vui lòng chọn ít nhất 1 bài học từ Bảng ở trên.</Text>
                        )}
                    </div>
                )}
                {previewRows.length > 0 && (
                    <Alert
                        type="info"
                        showIcon
                        style={{ marginTop: 16 }}
                        message="Preview mapping trước khi cập nhật"
                        description={
                            <Table
                                size="small"
                                pagination={false}
                                rowKey="id"
                                dataSource={previewRows}
                                columns={[
                                    { title: 'Buổi', dataIndex: 'label', width: 120 },
                                    { title: 'Mapping hiện tại', dataIndex: 'current' },
                                    { title: 'Mapping mới', dataIndex: 'next' },
                                ]}
                            />
                        }
                    />
                )}
            </Form>
        </Modal>
    );
};

export default BulkEditModal;
