'use client';

import React from 'react';
import {
    Button,
    Checkbox,
    Popconfirm,
    Space,
    Switch,
    Tag,
} from 'antd';
import CustomTable from '@/components/ui/Table';
import {
    DeleteOutlined,
    EditOutlined,
    SyncOutlined,
} from '@ant-design/icons';
import { formatVietnamDateTime } from '@/helper/convertDate';
import type { TeacherProfile } from '@/services/teacherProfileService';

interface TeacherProfileTableProps {
    rows: TeacherProfile[];
    loading: boolean;

    canChangeStatus: boolean;
    canUpdate: boolean;
    canDelete: boolean;

    updatingStatusId: number | null;
    syncingHmidId: number | null;

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
    onSyncHmid: (
        record: TeacherProfile
    ) => Promise<void>;
    selectedRowKeys: React.Key[];
    onSelectedRowKeysChange: (keys: React.Key[]) => void;
    onSelectAllAcrossPages: (selected: boolean) => void;
    totalRowCount: number;
    selectingAll: boolean;
}

const TeacherProfileTable = ({
    rows,
    loading,
    canChangeStatus,
    canUpdate,
    canDelete,
    updatingStatusId,
    syncingHmidId,
    pagination,
    onPageChange,
    onChangeStatus,
    onEdit,
    onDelete,
    onSyncHmid,
    selectedRowKeys,
    onSelectedRowKeysChange,
    onSelectAllAcrossPages,
    totalRowCount,
    selectingAll,
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
                rowSelection={{
                    selectedRowKeys,
                    preserveSelectedRowKeys: true,
                    onChange: (keys) => onSelectedRowKeysChange(keys.map(String)),
                    columnTitle: (
                        <Checkbox
                            aria-label="Chọn toàn bộ nhân sự ở tất cả các trang"
                            checked={totalRowCount > 0 && selectedRowKeys.length >= totalRowCount}
                            indeterminate={selectedRowKeys.length > 0 && selectedRowKeys.length < totalRowCount}
                            disabled={selectingAll || totalRowCount === 0}
                            onChange={(event) => onSelectAllAcrossPages(event.target.checked)}
                        />
                    ),
                }}
                pagination={{
                    ...pagination,
                    showSizeChanger: true,
                    showTotal: (total) => `Tổng số: ${total} nhân sự`,
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
                    x: 1180,
                    y: tableScrollY,
                }}
                columns={[
                {
                    title: 'Tên đăng nhập',
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
                    dataIndex: 'can_view_stream_key',
                    width: 140,
                    render: (value) =>
                        value === 0 ? (
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
                    title: 'HMID',
                    dataIndex: 'student_hmid',
                    width: 130,
                    render: (value) => value || '-',
                },

                {
                    title: 'Đồng bộ HMID',
                    dataIndex: 'hmid_sync_status',
                    width: 150,
                    render: (value, record) => {
                        const status = value || 'pending';
                        const config = status === 'synced'
                            ? { color: 'success', label: 'Đã đồng bộ' }
                            : status === 'not_found'
                                ? { color: 'warning', label: 'Không tìm thấy' }
                                : status === 'failed'
                                    ? { color: 'error', label: 'Lỗi' }
                                    : { color: 'default', label: 'Chờ đồng bộ' };
                        return (
                            <Tag color={config.color} title={record.hmid_sync_error || undefined}>
                                {config.label}
                            </Tag>
                        );
                    },
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
                        formatVietnamDateTime(
                            value,
                            'DD/MM/YYYY HH:mm'
                        ),
                },

                {
                    title: 'Thao tác',
                    key: 'actions',
                    fixed: 'right',
                    width: 175,

                    render: (
                        _,
                        record
                    ) => (
                        <Space>
                            {canUpdate && (
                                <Button
                                    type="text"
                                    icon={<SyncOutlined spin={syncingHmidId === record.id} />}
                                    aria-label="Đồng bộ HMID"
                                    title="Đồng bộ HMID từ HOCMAI"
                                    disabled={syncingHmidId !== null}
                                    onClick={() => void onSyncHmid(record)}
                                />
                            )}
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
