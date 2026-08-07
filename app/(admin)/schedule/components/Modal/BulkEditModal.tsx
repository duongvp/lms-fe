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
import { usePackageCoursesQuery } from '@/hooks/useLmsQueries';

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
    const packageCoursesQuery = usePackageCoursesQuery();
    const packageCourses = packageCoursesQuery.data?.data ?? [];
    const courseOptions = React.useMemo(() => Array.from(
        packageCourses.reduce((groups: Map<string, any>, item: any) => {
            const current = groups.get(item.course_id) ?? {
                course_id: item.course_id,
                course_name: item.course_name,
                package_ids: [] as string[],
            };
            if (!current.package_ids.includes(item.package_id)) current.package_ids.push(item.package_id);
            groups.set(item.course_id, current);
            return groups;
        }, new Map<string, any>()).values()
    ).map((item: any) => ({
        value: item.course_id,
        label: `${item.course_id}${item.course_name ? ` - ${item.course_name}` : ''} (Gói ${item.package_ids.join(', ')})`,
    })), [packageCourses]);

    // Form Watchers
    const configMode = Form.useWatch('config_mode', form) || 'common';
    const selectedLessons = Form.useWatch('selected_lessons', form) || selectedRowKeys;
    const commonStartTime = Form.useWatch('common_start_time', form) as Dayjs | undefined;

    // Tự động set giá trị mặc định khi mở Modal
    useEffect(() => {
        if (open) {
            const separateConfig: Record<string, any> = {};
            selectedRows.forEach((row) => {
                let mappings = row.package_lesson_mappings || [];
                if (mappings.length === 0) {
                    mappings = [{ lesson_ids: [] }];
                } else {
                    mappings = mappings.map((m: any) => ({
                        course_id: m.course_id,
                        lesson_ids: m.lesson_ids || (m.lesson_id ? [m.lesson_id] : []),
                    }));
                }
                
                separateConfig[row.id] = {
                    start_time: row.start_time ? dayjs(row.start_time, 'HH:mm') : undefined,
                    end_time: row.end_time ? dayjs(row.end_time, 'HH:mm') : undefined,
                    teacher: row.teacher?.username,
                    assistant_teacher: Array.isArray(row.assistant_teacher) 
                        ? row.assistant_teacher.map((a: any) => a.username) 
                        : (row.assistant_teacher?.username ? [row.assistant_teacher.username] : []),
                    room: row.room,
                    package_lesson_mappings: mappings,
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

                // If exactly 1 row is selected, prefill mapping too
                if (selectedRows.length === 1) {
                    commonConfig.common_package_lesson_mappings = separateConfig[firstRow.id]?.package_lesson_mappings;
                }
            }

            form.setFieldsValue({
                config_mode: 'common',
                selected_lessons: selectedRowKeys,
                separate_config: separateConfig,
                ...commonConfig,
            });
            setPreviewRows([]);
        }
    }, [open, selectedRowKeys, selectedRows, form]);

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

    const normalizeMappings = (mappings: any[] = []) => mappings
        .map((mapping) => ({
            course_id: String(mapping?.course_id ?? '').trim(),
            lesson_ids: (mapping?.lesson_ids ?? [])
                .map((lessonId: unknown) => String(lessonId).trim())
                .filter(Boolean),
        }))
        .filter((mapping) => mapping.course_id && mapping.lesson_ids.length > 0);

    const formatMappings = (mappings: any[] = []) => {
        const rows = mappings.flatMap((mapping) => {
            const packageText = mapping.package_id ? `Package ${mapping.package_id} → ` : '';
            const courseId = mapping.course_id || '-';
            const lessonIds = mapping.lesson_ids ?? (mapping.lesson_id ? [mapping.lesson_id] : []);
            return lessonIds.map((lessonId: string) => `${packageText}Course ${courseId} → Lesson ${lessonId}`);
        });
        return rows.length ? rows.join('; ') : 'Chưa mapping';
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
                    formattedSeparateConfig[key] = {
                        ...config,
                        start_time: config.start_time ? dayjs(config.start_time).format('HH:mm') : undefined,
                        end_time: config.end_time ? dayjs(config.end_time).format('HH:mm') : undefined,
                        package_lesson_mappings: normalizeMappings(config.package_lesson_mappings),
                    };
                });
            }

            if (previewRows.length === 0) {
                setPreviewRows((selectedLessons as (string | number)[]).map((lessonKey) => {
                    const record = selectedRows.find((item) => String(item.id) === String(lessonKey));
                    const nextMappings = values.config_mode === 'separate'
                        ? normalizeMappings(values.separate_config?.[lessonKey]?.package_lesson_mappings)
                        : normalizeMappings(values.common_package_lesson_mappings);
                    const isMappingUnchanged = values.config_mode === 'common' && !values.enable_mapping;
                    
                    return {
                        id: lessonKey,
                        label: record?.learn_number ? `Buổi ${record.learn_number}` : `ID ${lessonKey}`,
                        current: formatMappings(record?.package_lesson_mappings || []),
                        next: isMappingUnchanged ? 'Giữ nguyên' : (nextMappings.length ? formatMappings(nextMappings) : 'Xóa toàn bộ mapping'),
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
                    package_lesson_mappings: values.enable_mapping ? normalizeMappings(values.common_package_lesson_mappings) : undefined,
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
                                    <Checkbox><Text strong>Đổi Mapping</Text></Checkbox>
                                </Form.Item>
                                <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                                    Nếu nhập, mapping mới sẽ ghi đè cho tất cả bài đã chọn.
                                </Text>
                            </Col>
                            <Col span={16}>
                                <Form.Item noStyle dependencies={['enable_mapping']}>
                                    {({ getFieldValue }) => {
                                        const enabled = getFieldValue('enable_mapping');
                                        return (
                                            <div style={{ opacity: enabled ? 1 : 0.5, pointerEvents: enabled ? 'auto' : 'none' }}>
                                                <Form.List name="common_package_lesson_mappings" initialValue={[{ lesson_ids: [] }]}>
                                                    {(fields, { add, remove }) => (
                                                        <Space direction="vertical" style={{ width: '100%' }}>
                                                            {fields.map((field, index) => (
                                                                <div key={field.key} style={{ background: '#fff', padding: '12px', border: '1px solid #d9d9d9', borderRadius: '6px', position: 'relative' }}>
                                                                    <Row gutter={12}>
                                                                        <Col span={12}>
                                                                            <Form.Item label="Course ID" name={[field.name, 'course_id']} style={{ marginBottom: 0 }}>
                                                                                <Select options={courseOptions} showSearch optionFilterProp="label" placeholder="Chọn Course ID" disabled={!enabled} popupMatchSelectWidth={false} />
                                                                            </Form.Item>
                                                                        </Col>
                                                                        <Col span={12}>
                                                                            <Form.Item label="Lesson ID" name={[field.name, 'lesson_ids']} style={{ marginBottom: 0 }}>
                                                                                <Select mode="tags" tokenSeparators={[',', ' ']} placeholder="Nhập Lesson ID" disabled={!enabled} />
                                                                            </Form.Item>
                                                                        </Col>
                                                                    </Row>
                                                                    <Button 
                                                                        type="text" 
                                                                        danger 
                                                                        icon={<CloseCircleOutlined />} 
                                                                        onClick={() => remove(field.name)} 
                                                                        disabled={fields.length === 1 || !enabled} 
                                                                        style={{ position: 'absolute', top: 4, right: 4 }}
                                                                    />
                                                                </div>
                                                            ))}
                                                            <Button type="dashed" onClick={() => add({ lesson_ids: [] })} block disabled={!enabled}>+ Thêm Course ID</Button>
                                                        </Space>
                                                    )}
                                                </Form.List>
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
                                    <Form.List name={['separate_config', lessonKey, 'package_lesson_mappings']} initialValue={[{ lesson_ids: [] }]}>
                                        {(fields, { add, remove }) => (
                                            <div style={{ marginTop: 12, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
                                                <Text strong style={{ display: 'block', marginBottom: 8 }}>Mapping Package / Course / Lesson</Text>
                                                <Space direction="vertical" style={{ width: '100%' }}>
                                                    {fields.map((field) => (
                                                        <div key={field.key} style={{ background: '#fff', padding: '12px', border: '1px solid #d9d9d9', borderRadius: '6px', position: 'relative' }}>
                                                            <Row gutter={12}>
                                                                <Col span={12}>
                                                                    <Form.Item label="Course ID" name={[field.name, 'course_id']} style={{ marginBottom: 0 }}>
                                                                        <Select options={courseOptions} showSearch optionFilterProp="label" placeholder="Chọn Course ID" popupMatchSelectWidth={false} />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col span={12}>
                                                                    <Form.Item label="Lesson ID" name={[field.name, 'lesson_ids']} style={{ marginBottom: 0 }}>
                                                                        <Select mode="tags" tokenSeparators={[',', ' ']} placeholder="Nhập Lesson ID" />
                                                                    </Form.Item>
                                                                </Col>
                                                            </Row>
                                                            <Button 
                                                                type="text" 
                                                                danger 
                                                                icon={<CloseCircleOutlined />} 
                                                                onClick={() => remove(field.name)} 
                                                                disabled={fields.length === 1} 
                                                                style={{ position: 'absolute', top: 4, right: 4 }}
                                                            />
                                                        </div>
                                                    ))}
                                                    <Button type="dashed" onClick={() => add({ lesson_ids: [] })} block>+ Thêm Course ID</Button>
                                                </Space>
                                            </div>
                                        )}
                                    </Form.List>
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
