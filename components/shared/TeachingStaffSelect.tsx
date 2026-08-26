"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Form, message, Select, Space, Tooltip, type SelectProps } from "antd";
import { useEffect, useMemo, useState } from "react";
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

type TeacherProfileQuickCreateProps = {
    teacherType: CanViewStreamKey;
    teacherValueMode: "username" | "displayName";
    mode?: SelectProps["mode"];
    selectedValue: unknown;
    onChange?: SelectProps["onChange"];
    refreshStaff: () => Promise<unknown>;
    onClose: () => void;
};

// Modal thêm nhanh chỉ được mount khi thực sự mở. Trước đây mỗi Select tạo sẵn
// một Form, message context và Modal ẩn; màn bulk 132 lịch vì thế tạo hàng trăm
// form phụ dù người dùng chưa bấm nút "+".
const TeacherProfileQuickCreate = ({
    teacherType,
    teacherValueMode,
    mode,
    selectedValue,
    onChange,
    refreshStaff,
    onClose,
}: TeacherProfileQuickCreateProps) => {
    const [form] = Form.useForm<TeacherProfilePayload>();
    const [saving, setSaving] = useState(false);
    const [messageApi, contextHolder] = message.useMessage();

    useEffect(() => {
        form.setFieldsValue({
            username: "",
            display_name: "",
            can_view_stream_key: teacherType,
            status: 1,
        });
    }, [form, teacherType]);

    const handleCreate = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            await createTeacherProfile({ ...values, can_view_stream_key: teacherType, status: 1 });
            await refreshStaff();

            const value = teacherType === 1 && teacherValueMode === "displayName"
                ? String(values.display_name || values.username).trim()
                : String(values.username).trim();
            const label = formatTeachingStaffLabel(values.display_name, values.username);
            const nextValue = mode === "multiple"
                ? Array.from(new Set([...(Array.isArray(selectedValue) ? selectedValue : []), value]))
                : value;
            onChange?.(nextValue as never, { value, label } as never);
            onClose();
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
            <TeacherProfileFormModal
                open
                loading={saving}
                editing={null}
                form={form}
                fixedTeacherType={teacherType}
                onSubmit={handleCreate}
                onClose={onClose}
            />
        </>
    );
};

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
    const [modalOpen, setModalOpen] = useState(false);
    const [searchText, setSearchText] = useState("");
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
    const staffTagRender: SelectProps["tagRender"] = (tag) => {
        const selected = options.find((option) => String(option.value) === String(tag.value));
        const shortLabel = selected?.displayName || String(tag.value || "");
        return (
            <span className="ant-select-selection-item" style={{ marginInlineEnd: 4 }}>
                <span className="ant-select-selection-item-content">{shortLabel}</span>
                {tag.closable && (
                    <span
                        className="ant-select-selection-item-remove"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={tag.onClose}
                    >
                        ×
                    </span>
                )}
            </span>
        );
    };
    const showQuickCreate = allowQuickCreate && canCreate && !disabled;

    return (
        <>
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
                    tagRender={props.mode === "multiple" ? staffTagRender : props.tagRender}
                    style={{ width: showQuickCreate ? "calc(100% - 32px)" : "100%" }}
                />
                {showQuickCreate && (
                    <Tooltip title={teacherType === 1 ? "Thêm nhanh giáo viên" : "Thêm nhanh trợ giảng"}>
                        <Button
                            aria-label="Thêm nhanh nhân sự"
                            icon={<PlusOutlined />}
                            size={props.size}
                            onClick={() => setModalOpen(true)}
                        />
                    </Tooltip>
                )}
            </Space.Compact>
            {modalOpen && (
                <TeacherProfileQuickCreate
                    teacherType={teacherType}
                    teacherValueMode={teacherValueMode}
                    mode={props.mode}
                    selectedValue={props.value}
                    onChange={onChange}
                    refreshStaff={staffQuery.mutate}
                    onClose={() => setModalOpen(false)}
                />
            )}
        </>
    );
};

export default TeachingStaffSelect;
