"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Form, message, Select, Space, Tooltip, type SelectProps } from "antd";
import { useMemo, useState } from "react";
import TeacherProfileFormModal from "@/app/(admin)/teacher-profiles/components/TeacherProfileFormModal";
import {
    createTeacherProfile,
    formatTeachingStaffLabel,
    type TeacherProfilePayload,
    type CanViewStreamKey,
} from "@/services/teacherProfileService";
import { useTeachingStaffQuery } from "@/hooks/useLmsQueries";
import { useAuthStore } from "@/stores/authStore";
import { PermissionKey } from "@/types/permissions";

type TeachingStaffSelectProps = Omit<SelectProps, "options"> & {
    teacherType: CanViewStreamKey;
    allowQuickCreate?: boolean;
    teacherValueMode?: "username" | "displayName";
};

const normalizeSearchText = (value: unknown) => String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi-VN")
    .trim();

const TeachingStaffSelect = ({
    teacherType,
    allowQuickCreate = true,
    teacherValueMode = "username",
    disabled,
    loading,
    onChange,
    style,
    ...props
}: TeachingStaffSelectProps) => {
    const [form] = Form.useForm<TeacherProfilePayload>();
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [messageApi, contextHolder] = message.useMessage();
    const staffQuery = useTeachingStaffQuery(teacherType);
    const canCreate = useAuthStore((state) => state.hasPermission(PermissionKey.TEACHER_PROFILE_CREATE));
    const options = useMemo(() => {
        const availableOptions = (staffQuery.data ?? []).map((option) => ({
            ...option,
            value: teacherType === 1 && teacherValueMode === "displayName"
                ? option.displayName
                : option.username,
        }));
        const selectedValues = (Array.isArray(props.value) ? props.value : [props.value])
            .map((value) => String(value ?? "").trim())
            .filter(Boolean);
        selectedValues.forEach((value) => {
            if (!availableOptions.some((option) => option.value === value)) {
                availableOptions.unshift({
                    value,
                    label: value,
                    username: value,
                    displayName: value,
                });
            }
        });
        return availableOptions;
    }, [props.value, staffQuery.data, teacherType, teacherValueMode]);
    const filteredOptions = useMemo(() => {
        const normalizedSearch = normalizeSearchText(searchText);
        if (!normalizedSearch) return options;
        return options.filter((option) => normalizeSearchText(
            `${String(option.label ?? "")} ${String(option.value ?? "")}`
        ).includes(normalizedSearch));
    }, [options, searchText]);
    const showQuickCreate = allowQuickCreate && canCreate && !disabled;

    const openCreate = () => {
        form.resetFields();
        form.setFieldsValue({
            username: "",
            display_name: "",
            can_view_stream_key: teacherType,
            status: 1,
        });
        setModalOpen(true);
    };

    const handleCreate = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            await createTeacherProfile({ ...values, can_view_stream_key: teacherType, status: 1 });
            await staffQuery.mutate();

            const value = teacherType === 1 && teacherValueMode === "displayName"
                ? String(values.display_name || values.username).trim()
                : String(values.username).trim();
            const label = formatTeachingStaffLabel(values.display_name, values.username);
            const nextValue = props.mode === "multiple"
                ? Array.from(new Set([...(Array.isArray(props.value) ? props.value : []), value]))
                : value;
            onChange?.(nextValue as never, { value, label } as never);
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
            <Space.Compact style={{ width: "100%", ...style }}>
                <Select
                    {...props}
                    showSearch
                    filterOption={false}
                    onSearch={setSearchText}
                    onDropdownVisibleChange={(open: boolean) => {
                        if (!open) setSearchText("");
                    }}
                    disabled={disabled}
                    loading={Boolean(loading || staffQuery.isLoading || staffQuery.isValidating)}
                    onChange={(value, option) => {
                        setSearchText("");
                        onChange?.(value, option);
                    }}
                    options={filteredOptions}
                    style={{ width: showQuickCreate ? "calc(100% - 32px)" : "100%" }}
                />
                {showQuickCreate && (
                    <Tooltip title={teacherType === 1 ? "Thêm nhanh giáo viên" : "Thêm nhanh trợ giảng"}>
                        <Button
                            aria-label="Thêm nhanh nhân sự"
                            icon={<PlusOutlined />}
                            size={props.size}
                            onClick={openCreate}
                        />
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
