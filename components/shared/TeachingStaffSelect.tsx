"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Form, message, Select, Space, Tooltip, type SelectProps } from "antd";
import { useState } from "react";
import TeacherProfileFormModal from "@/app/(admin)/teacher-profiles/components/TeacherProfileFormModal";
import {
    createTeacherProfile,
    type TeacherProfilePayload,
    type TeacherType,
} from "@/services/teacherProfileService";
import { useTeachingStaffQuery } from "@/hooks/useLmsQueries";
import { useAuthStore } from "@/stores/authStore";
import { PermissionKey } from "@/types/permissions";

type TeachingStaffSelectProps = Omit<SelectProps, "options"> & {
    teacherType: TeacherType;
};

const TeachingStaffSelect = ({ teacherType, disabled, loading, onChange, ...props }: TeachingStaffSelectProps) => {
    const [form] = Form.useForm<TeacherProfilePayload>();
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();
    const staffQuery = useTeachingStaffQuery(teacherType);
    const canCreate = useAuthStore((state) => state.hasPermission(PermissionKey.TEACHER_PROFILE_CREATE));

    const openCreate = () => {
        form.resetFields();
        form.setFieldsValue({
            username: "",
            display_name: "",
            teacher_type: teacherType,
            status: 1,
        });
        setModalOpen(true);
    };

    const handleCreate = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            await createTeacherProfile({ ...values, teacher_type: teacherType, status: 1 });
            await staffQuery.mutate();

            const value = teacherType === 1
                ? String(values.display_name || values.username).trim()
                : String(values.username).trim();
            const nextValue = props.mode === "multiple"
                ? Array.from(new Set([...(Array.isArray(props.value) ? props.value : []), value]))
                : value;
            onChange?.(nextValue as never, { value, label: value } as never);
            setModalOpen(false);
            messageApi.success(teacherType === 1 ? "Đã thêm giáo viên" : "Đã thêm trợ giảng");
        } catch (error: any) {
            if (error?.errorFields) return;
            messageApi.error(error?.message || "Không thể thêm nhân sự giảng dạy");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {contextHolder}
            <Space.Compact style={{ width: "100%" }}>
                <Select
                    {...props}
                    disabled={disabled}
                    loading={Boolean(loading || staffQuery.isLoading || staffQuery.isValidating)}
                    onChange={onChange}
                    options={staffQuery.data ?? []}
                    style={{ width: canCreate && !disabled ? "calc(100% - 32px)" : "100%", ...props.style }}
                />
                {canCreate && !disabled && (
                    <Tooltip title={teacherType === 1 ? "Thêm nhanh giáo viên" : "Thêm nhanh trợ giảng"}>
                        <Button aria-label="Thêm nhanh nhân sự" icon={<PlusOutlined />} onClick={openCreate} />
                    </Tooltip>
                )}
            </Space.Compact>
            <TeacherProfileFormModal
                open={modalOpen}
                loading={saving}
                editing={null}
                form={form}
                fixedTeacherType={teacherType}
                onSubmit={handleCreate}
                onClose={() => setModalOpen(false)}
            />
        </>
    );
};

export default TeachingStaffSelect;
