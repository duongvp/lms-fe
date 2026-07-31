'use client';

import {
    Form,
    Input,
    Modal,
    Select,
} from 'antd';
import type {
    TeacherProfile,
    TeacherProfilePayload,
} from '@/services/teacherProfileService';

interface TeacherProfileFormModalProps {
    open: boolean;
    loading: boolean;
    editing: TeacherProfile | null;
    form: ReturnType<
        typeof Form.useForm<TeacherProfilePayload>
    >[0];
    onSubmit: () => Promise<void>;
    onClose: () => void;
}

const TeacherProfileFormModal = ({
    open,
    loading,
    editing,
    form,
    onSubmit,
    onClose,
}: TeacherProfileFormModalProps) => {
    return (
        <Modal
            open={open}
            title={
                editing
                    ? 'Cập nhật nhân sự giảng dạy'
                    : 'Thêm nhân sự giảng dạy'
            }
            okText="Lưu"
            cancelText="Hủy"
            confirmLoading={loading}
            onOk={() => void onSubmit()}
            onCancel={onClose}
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                preserve={false}
            >
                <Form.Item
                    label="Mã nhân sự"
                    name="username"
                    rules={[
                        {
                            required: !editing,
                            whitespace: true,
                            message:
                                'Nhập mã nhân sự',
                        },
                        {
                            max: 120,
                            message:
                                'Tối đa 120 ký tự',
                        },
                        {
                            pattern:
                                /^[a-zA-Z0-9._@-]+$/,
                            message:
                                'Mã nhân sự chứa ký tự không hợp lệ',
                        },
                    ]}
                >
                    <Input
                        disabled={Boolean(
                            editing
                        )}
                        placeholder="Ví dụ: ta01"
                    />
                </Form.Item>

                <Form.Item
                    label="Họ và tên"
                    name="display_name"
                    rules={[
                        {
                            max: 100,
                            message:
                                'Tối đa 100 ký tự',
                        },
                    ]}
                >
                    <Input placeholder="Ví dụ: Trần Văn B" />
                </Form.Item>

                <Form.Item
                    label="Loại nhân sự"
                    name="teacher_type"
                    rules={[
                        {
                            required: true,
                        },
                    ]}
                >
                    <Select
                        options={[
                            {
                                value: 1,
                                label: 'Giáo viên',
                            },
                            {
                                value: 2,
                                label: 'Trợ giảng',
                            },
                        ]}
                    />
                </Form.Item>

                {!editing && (
                    <Form.Item
                        label="Trạng thái"
                        name="status"
                        rules={[
                            {
                                required: true,
                            },
                        ]}
                    >
                        <Select
                            options={[
                                {
                                    value: 1,
                                    label: 'Hoạt động',
                                },
                                {
                                    value: 0,
                                    label: 'Ngừng hoạt động',
                                },
                            ]}
                        />
                    </Form.Item>
                )}
            </Form>
        </Modal>
    );
};

export default TeacherProfileFormModal;
