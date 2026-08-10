'use client';

import React from 'react';
import {
    Button,
    Popconfirm,
    Space,
    Switch,
    Tag,
} from 'antd';
import CustomTable from '@/components/ui/Table';
import {
    DeleteOutlined,
    EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { TeacherProfile } from '@/services/teacherProfileService';

interface TeacherProfileTableProps {
    rows: TeacherProfile[];
    loading: boolean;

    canChangeStatus: boolean;
    canUpdate: boolean;
    canDelete: boolean;

    updatingStatusId: number | null;

    pagination: {
        current: number;
        pageSize: number;
        total: number;
    };

    onPageChange: (
        page: number,
        pageSize: number
    ) => void;

    onChangeStatus: (
        record: TeacherProfile,
        active: boolean
    ) => Promise<void>;

    onEdit: (
        record: TeacherProfile
    ) => void;

    onDelete: (
        record: TeacherProfile
    ) => Promise<void>;
}

const TeacherProfileTable = ({
    rows,
    loading,
    canChangeStatus,
    canUpdate,
    canDelete,
    updatingStatusId,
    pagination,
    onPageChange,
    onChangeStatus,
    onEdit,
    onDelete,
}: TeacherProfileTableProps) => {
    const containerRef =
        React.useRef<HTMLDivElement>(null);
    const [tableScrollY, setTableScrollY] =
        React.useState(240);

    React.useEffect(() => {
        const container =
            containerRef.current;
        if (!container) return;

        const updateTableHeight = () => {
            // Reserve space for the table header and pagination.
            setTableScrollY(
                Math.max(
                    80,
                    container.clientHeight -
                        112
                )
            );
        };

        updateTableHeight();

        const observer =
            new ResizeObserver(
                updateTableHeight
            );
        observer.observe(container);

        return () =>
            observer.disconnect();
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                flex: '1 1 0',
                minHeight: 0,
                overflow: 'hidden',
            }}
        >
            <CustomTable<TeacherProfile>
                rowKey={(record) =>
                    String(record.id)
                }
                loading={loading}
                dataSource={rows}
                pagination={{
                    ...pagination,
                    showSizeChanger: true,
                    onChange: (
                        page,
                        pageSize
                    ) =>
                        onPageChange(
                            page,
                            pageSize
                        ),
                }}
                scroll={{
                    x: 900,
                    y: tableScrollY,
                }}
                columns={[
                {
                    title: 'Mã nhân sự',
                    dataIndex: 'username',
                    width: 180,
                },

                {
                    title: 'Họ và tên',
                    dataIndex: 'display_name',
                    width: 220,
                    render: (value) =>
                        value || '-',
                },

                {
                    title: 'Loại',
                    dataIndex: 'teacher_type',
                    width: 140,
                    render: (value) =>
                        value === 2 ? (
                            <Tag color="blue">
                                Trợ giảng
                            </Tag>
                        ) : (
                            <Tag color="green">
                                Giáo viên
                            </Tag>
                        ),
                },

                {
                    title: 'Trạng thái',
                    dataIndex: 'status',
                    width: 150,

                    render: (
                        value,
                        record
                    ) =>
                        canChangeStatus ? (
                            <Switch
                                checked={
                                    record.status ===
                                    1
                                }
                                checkedChildren="Bật"
                                unCheckedChildren="Tắt"
                                loading={
                                    updatingStatusId ===
                                    record.id
                                }
                                onChange={(
                                    checked
                                ) =>
                                    void onChangeStatus(
                                        record,
                                        checked
                                    )
                                }
                            />
                        ) : value === 1 ? (
                            <Tag color="success">
                                Hoạt động
                            </Tag>
                        ) : (
                            <Tag>
                                Ngừng hoạt động
                            </Tag>
                        ),
                },

                {
                    title: 'Ngày tạo',
                    dataIndex: 'created_at',
                    width: 160,
                    render: (value) =>
                        value
                            ? dayjs(
                                  value
                              ).format(
                                  'DD/MM/YYYY HH:mm'
                              )
                            : '-',
                },

                {
                    title: 'Thao tác',
                    key: 'actions',
                    fixed: 'right',
                    width: 130,

                    render: (
                        _,
                        record
                    ) => (
                        <Space>
                            {canUpdate && (
                                <Button
                                    type="text"
                                    icon={
                                        <EditOutlined />
                                    }
                                    aria-label="Sửa"
                                    onClick={() =>
                                        onEdit(
                                            record
                                        )
                                    }
                                />
                            )}

                            {canDelete && (
                                <Popconfirm
                                    title="Xóa nhân sự này?"
                                    description="Chỉ xóa được khi chưa được sử dụng trong lịch."
                                    okText="Xóa"
                                    cancelText="Hủy"
                                    onConfirm={() =>
                                        void onDelete(
                                            record
                                        )
                                    }
                                >
                                    <Button
                                        type="text"
                                        danger
                                        icon={
                                            <DeleteOutlined />
                                        }
                                        aria-label="Xóa"
                                    />
                                </Popconfirm>
                            )}
                        </Space>
                    ),
                },
                ]}
            />
        </div>
    );
};

export default TeacherProfileTable;
