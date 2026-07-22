import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Table, Button, Typography, Checkbox, Select, Space, Alert, TimePicker, InputNumber } from 'antd';
import { CheckCircleOutlined, InfoCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { toBulkLivestreamPayload, toLivestreamPayload, toUpdateLivestreamPayload } from '@/services/livestreamService';
import { combineDateTime } from '@/helper/convertDate';

const { Text, Title } = Typography;

interface SchedulePreviewModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (payload: any, type: 'bulk' | 'single' | 'update_current' | 'update_following' | 'update_cancel') => void;
    formValues: any;
    isEdit: boolean;
    initialData?: any;
    loading?: boolean;
}

interface PreviewSession {
    key: string;
    index: number;
    date: Dayjs;
    start_time: Dayjs;
    end_time: Dayjs;
    teacher: string;
    isSkipped: boolean;
    isGenerated: boolean;
}

const TEACHER_OPTIONS = [
    { value: "Nguyễn Văn A", label: "Nguyễn Văn A" },
    { value: "Trần Thị B", label: "Trần Thị B" },
    { value: "Lê Hoàng C", label: "Lê Hoàng C" },
    { value: "Phạm Thảo D", label: "Phạm Thảo D" },
];

const SchedulePreviewModal: React.FC<SchedulePreviewModalProps> = ({
    open,
    onClose,
    onConfirm,
    formValues,
    isEdit,
    initialData,
    loading
}) => {
    const [sessions, setSessions] = useState<PreviewSession[]>([]);
    const [requiredSessions, setRequiredSessions] = useState(0);

    // Compute initial sessions
    useEffect(() => {
        if (open && formValues) {
            if (!isEdit && formValues.addMode === 'bulk') {
                const numSessions = parseInt(formValues.number_of_sessions || '1', 10);
                setRequiredSessions(numSessions);
                generateSessions(formValues.bulk_start_date, formValues.days_of_week || [], numSessions, formValues, []);
            } else if (!isEdit && formValues.addMode === 'single') {
                setSessions([{
                    key: 'single',
                    index: 1,
                    date: formValues.date,
                    start_time: formValues.start_time,
                    end_time: formValues.end_time,
                    teacher: formValues.teacher,
                    isSkipped: false,
                    isGenerated: true
                }]);
                setRequiredSessions(1);
            } else if (isEdit) {
                // Update mode
                if (formValues.update_mode === 'following') {
                    setSessions([{
                        key: 'new_session',
                        index: 1,
                        date: formValues.new_session?.date,
                        start_time: formValues.new_session?.start_time,
                        end_time: formValues.new_session?.end_time,
                        teacher: formValues.new_session?.teacher,
                        isSkipped: false,
                        isGenerated: true
                    }]);
                } else if (formValues.update_mode === 'current') {
                    setSessions([{
                        key: 'current',
                        index: 1,
                        date: formValues.date,
                        start_time: formValues.start_time,
                        end_time: formValues.end_time,
                        teacher: formValues.teacher,
                        isSkipped: false,
                        isGenerated: true
                    }]);
                }
            }
        }
    }, [open, formValues, isEdit]);

    const getConfigForDay = (date: Dayjs, bulkConfigMode: string, separateConfig: any, commonFormValues: any) => {
        if (bulkConfigMode === 'separate') {
            const dayValue = date.day() === 0 ? 1 : date.day() + 1; // 1 for Sunday, 2 for Monday
            const config = separateConfig?.[dayValue];
            return {
                start_time: config?.start_time || commonFormValues.bulk_start_time,
                end_time: config?.end_time || commonFormValues.bulk_end_time,
                teacher: config?.teacher || commonFormValues.bulk_teacher
            };
        }
        return {
            start_time: commonFormValues.bulk_start_time,
            end_time: commonFormValues.bulk_end_time,
            teacher: commonFormValues.bulk_teacher
        };
    };

    const generateSessions = (startDate: Dayjs, daysOfWeek: number[], count: number, formVals: any, existingSessions: PreviewSession[]) => {
        if (!startDate || daysOfWeek.length === 0 || count <= 0) return;

        let current = startDate.startOf('day');
        // If we are appending, start from the day after the last session
        if (existingSessions.length > 0) {
            const lastSessionDate = existingSessions[existingSessions.length - 1].date;
            current = lastSessionDate.add(1, 'day').startOf('day');
        }

        const newSessions: PreviewSession[] = [];
        let generated = 0;
        let startIndex = existingSessions.length;

        // Prevent infinite loop if something goes wrong
        let iterations = 0;
        const MAX_ITERATIONS = 365; // Max 1 year search

        while (generated < count && iterations < MAX_ITERATIONS) {
            const currentDayValue = current.day() === 0 ? 1 : current.day() + 1;
            if (daysOfWeek.includes(currentDayValue)) {
                const config = getConfigForDay(current, formVals.bulkConfigMode, formVals.separate_config, formVals);
                
                newSessions.push({
                    key: `gen_${startIndex + generated}`,
                    index: startIndex + generated + 1,
                    date: current.clone(),
                    start_time: config.start_time,
                    end_time: config.end_time,
                    teacher: config.teacher,
                    isSkipped: false,
                    isGenerated: true
                });
                generated++;
            }
            current = current.add(1, 'day');
            iterations++;
        }

        setSessions([...existingSessions, ...newSessions]);
    };

    const toggleSkip = (key: string) => {
        setSessions(sessions.map(s => s.key === key ? { ...s, isSkipped: !s.isSkipped } : s));
    };

    const updateSessionField = (key: string, field: string, value: any) => {
        setSessions(sessions.map(s => s.key === key ? { ...s, [field]: value } : s));
    };

    const activeSessionsCount = sessions.filter(s => !s.isSkipped).length;
    const needMoreSessions = !isEdit && formValues?.addMode === 'bulk' && activeSessionsCount < requiredSessions;

    const handleGenerateMore = () => {
        const missingCount = requiredSessions - activeSessionsCount;
        if (missingCount > 0) {
            generateSessions(formValues.bulk_start_date, formValues.days_of_week || [], missingCount, formValues, sessions);
        }
    };

    const handleConfirm = () => {
        let finalPayload: any;
        let payloadType: 'bulk' | 'single' | 'update_current' | 'update_following' | 'update_cancel';

        if (isEdit) {
            if (formValues.update_mode === 'cancel') {
                payloadType = 'update_cancel';
                finalPayload = { lesson_status: 1 };
            } else if (formValues.update_mode === 'following') {
                payloadType = 'update_following';
                const s = sessions[0];
                finalPayload = {
                    ...formValues,
                    new_session: {
                        teacher: s.teacher,
                        start_time: s.start_time,
                        end_time: s.end_time,
                        date: s.date
                    }
                };
                finalPayload = toUpdateLivestreamPayload(finalPayload);
            } else {
                payloadType = 'update_current';
                const s = sessions[0];
                finalPayload = {
                    ...formValues,
                    teacher: s.teacher,
                    start_time: s.start_time,
                    end_time: s.end_time,
                    date: s.date
                };
                finalPayload = toUpdateLivestreamPayload(finalPayload);
            }
        } else {
            if (formValues.addMode === 'bulk') {
                payloadType = 'bulk';
                // Lọc những buổi không bị skip
                const activeSessions = sessions.filter(s => !s.isSkipped);
                const calendars = activeSessions.map((s, idx) => ({
                    system_type: formValues.bulk_system_type,
                    code: formValues.bulk_code,
                    teacher: s.teacher,
                    learn_number: Number(formValues.bulk_learn_number ?? 1),
                    lesson_count: idx,
                    start_time: combineDateTime(s.date, s.start_time)!,
                    end_time: combineDateTime(s.date, s.end_time)!,
                    lesson_status: 0,
                }));
                finalPayload = { calendars };
            } else {
                payloadType = 'single';
                const s = sessions[0];
                finalPayload = toLivestreamPayload({
                    ...formValues,
                    teacher: s.teacher,
                    start_time: s.start_time,
                    end_time: s.end_time,
                    date: s.date
                });
            }
        }

        onConfirm(finalPayload, payloadType);
    };

    const columns = [
        {
            title: 'STT',
            dataIndex: 'index',
            width: 60,
            render: (text: any, record: PreviewSession, index: number) => {
                const activeIdx = sessions.filter(s => !s.isSkipped).findIndex(s => s.key === record.key);
                return record.isSkipped ? '-' : activeIdx + 1;
            }
        },
        {
            title: 'Ngày',
            dataIndex: 'date',
            render: (val: Dayjs, record: PreviewSession) => (
                <Space direction="vertical" size={0}>
                    <Text delete={record.isSkipped}>{val?.format('DD/MM/YYYY')}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {val?.day() === 0 ? 'Chủ Nhật' : `Thứ ${val?.day() + 1}`}
                    </Text>
                </Space>
            )
        },
        {
            title: 'Thời gian',
            key: 'time',
            width: 250,
            render: (_: any, record: PreviewSession) => (
                <Space>
                    <TimePicker 
                        format="HH:mm" 
                        value={record.start_time} 
                        onChange={(v) => updateSessionField(record.key, 'start_time', v)}
                        disabled={record.isSkipped}
                        size="small"
                        style={{ width: 90 }}
                        allowClear={false}
                    />
                    <span>-</span>
                    <TimePicker 
                        format="HH:mm" 
                        value={record.end_time} 
                        onChange={(v) => updateSessionField(record.key, 'end_time', v)}
                        disabled={record.isSkipped}
                        size="small"
                        style={{ width: 90 }}
                        allowClear={false}
                    />
                </Space>
            )
        },
        {
            title: 'Giáo viên',
            dataIndex: 'teacher',
            width: 180,
            render: (val: string, record: PreviewSession) => (
                <Select 
                    value={val}
                    onChange={(v) => updateSessionField(record.key, 'teacher', v)}
                    options={TEACHER_OPTIONS}
                    disabled={record.isSkipped}
                    size="small"
                    style={{ width: '100%' }}
                />
            )
        },
        {
            title: 'Trạng thái',
            key: 'action',
            render: (_: any, record: PreviewSession) => {
                if (isEdit && formValues.update_mode !== 'following' && formValues.update_mode !== 'current') {
                    return <Text type="danger">Hủy/Nghỉ học</Text>;
                }
                return (
                    <Checkbox 
                        checked={!record.isSkipped} 
                        onChange={() => toggleSkip(record.key)}
                    >
                        {record.isSkipped ? <Text type="danger">Đã bỏ qua</Text> : <Text type="success">Sắp tạo</Text>}
                    </Checkbox>
                );
            }
        }
    ];

    return (
        <Modal
            open={open}
            title={
                <Space>
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                    <span>Xác nhận thông tin Lịch học</span>
                </Space>
            }
            width={850}
            onCancel={onClose}
            footer={[
                <Button key="back" onClick={onClose} icon={<CloseCircleOutlined />}>
                    Quay lại chỉnh sửa
                </Button>,
                <Button key="submit" type="primary" onClick={handleConfirm} loading={loading} icon={<CheckCircleOutlined />}>
                    Xác nhận Lưu
                </Button>
            ]}
        >
            <div style={{ marginBottom: 16 }}>
                <Text type="secondary">
                    Vui lòng kiểm tra lại danh sách các buổi học sẽ được {isEdit ? 'cập nhật' : 'tạo mới'}. 
                    Bạn có thể <strong>Sửa nhanh</strong> giờ học, giáo viên trực tiếp trên bảng hoặc <strong>Bỏ qua (Skip)</strong> những buổi không phù hợp.
                </Text>
            </div>

            {needMoreSessions && (
                <Alert
                    message="Thiếu số buổi học yêu cầu"
                    description={
                        <Space direction="vertical">
                            <span>
                                Bạn đã bỏ qua (skip) một số buổi, hiện tại số buổi học khả dụng ({activeSessionsCount}) đang nhỏ hơn cấu hình yêu cầu ({requiredSessions}).
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
                scroll={{ y: 400 }}
                size="small"
                rowClassName={(record) => record.isSkipped ? 'skipped-row' : ''}
            />

            <style dangerouslySetInnerHTML={{__html: `
                .skipped-row {
                    background-color: #f5f5f5;
                    opacity: 0.7;
                }
            `}} />
        </Modal>
    );
};

export default SchedulePreviewModal;
