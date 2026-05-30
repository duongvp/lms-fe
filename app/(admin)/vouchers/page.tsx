"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, Space, Switch, Tag, notification } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import CustomTable from "@/components/ui/Table";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import ActionButton from "@/components/ui/ActionButton";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { DeleteOutlined, EditFilled } from "@ant-design/icons";
import { createVoucher, deleteVoucher, getVouchers, updateVoucher, VoucherApiResponse, VoucherPayload } from "@/services/voucherService";
import { useAuthStore } from "@/stores/authStore";
import { PermissionKey } from "@/types/permissions";

interface VoucherRow extends VoucherApiResponse {
    key: number;
    action?: React.ReactNode;
}

const money = (value: number | string | null | undefined) => Number(value || 0).toLocaleString("vi-VN");

const VoucherPage = () => {
    const [data, setData] = useState<VoucherRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ search: "" });
    const [modalOpen, setModalOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState<VoucherApiResponse | null>(null);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();
    const [api, contextHolder] = notification.useNotification();
    const hasPermission = useAuthStore(state => state.hasPermission);

    const fetchData = async () => {
        try {
            setLoading(true);
            const vouchers = await getVouchers(filters);
            setData(vouchers.map(item => ({
                ...item,
                key: item.voucher_id,
                action: (
                    <Space>
                        {hasPermission(PermissionKey.VOUCHER_EDIT) && (
                            <ActionButton
                                type="primary"
                                color="orange"
                                variant="solid"
                                icon={<EditFilled />}
                                onClick={() => openEditModal(item)}
                            />
                        )}
                        {hasPermission(PermissionKey.VOUCHER_DELETE) && (
                            <ConfirmButton
                                customColor="red"
                                icon={<DeleteOutlined />}
                                onConfirm={async () => { await deleteVoucher(item.voucher_id); }}
                                confirmMessage="Bạn có chắc chắn muốn xoá voucher này?"
                                messageWhenSuccess="Xoá voucher thành công"
                                messageWhenError="Có lỗi xảy ra khi xoá voucher"
                                setShouldReload={(value) => { if (value) fetchData(); }}
                            />
                        )}
                    </Space>
                )
            })));
        } catch (error: any) {
            api.error({
                message: "Lỗi khi tải voucher",
                description: error?.message || "Không thể tải danh sách voucher.",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters.search]);

    const openCreateModal = () => {
        setEditingVoucher(null);
        form.resetFields();
        form.setFieldsValue({
            discount_type: "percentage",
            min_order_value: 0,
            is_active: true,
        });
        setModalOpen(true);
    };

    const openEditModal = (voucher: VoucherApiResponse) => {
        setEditingVoucher(voucher);
        form.setFieldsValue({
            code: voucher.code,
            discount_type: voucher.discount_type,
            discount_value: Number(voucher.discount_value || 0),
            max_discount: voucher.max_discount == null ? null : Number(voucher.max_discount),
            min_order_value: Number(voucher.min_order_value || 0),
            expiry_date: voucher.expiry_date ? dayjs(voucher.expiry_date) : null,
            usage_limit: voucher.usage_limit,
            is_active: Boolean(voucher.is_active),
        });
        setModalOpen(true);
    };

    const handleSubmit = async (values: any) => {
        try {
            setSaving(true);
            const payload: VoucherPayload = {
                code: values.code,
                discount_type: values.discount_type,
                discount_value: Number(values.discount_value || 0),
                max_discount: values.max_discount == null ? null : Number(values.max_discount),
                min_order_value: Number(values.min_order_value || 0),
                expiry_date: values.expiry_date ? values.expiry_date.format("YYYY-MM-DD") : null,
                usage_limit: values.usage_limit == null ? null : Number(values.usage_limit),
                is_active: Boolean(values.is_active),
            };

            if (editingVoucher) {
                await updateVoucher(editingVoucher.voucher_id, payload);
            } else {
                await createVoucher(payload);
            }

            api.success({ message: editingVoucher ? "Cập nhật voucher thành công" : "Tạo voucher thành công" });
            setModalOpen(false);
            fetchData();
        } catch (error: any) {
            api.error({
                message: "Lưu voucher thất bại",
                description: error?.message || "Vui lòng kiểm tra lại thông tin voucher.",
            });
        } finally {
            setSaving(false);
        }
    };

    const columns: ColumnsType<VoucherRow> = useMemo(() => [
        { title: "Mã voucher", dataIndex: "code", render: (value) => <b>{value}</b> },
        {
            title: "Loại",
            dataIndex: "discount_type",
            render: (value) => value === "percentage" ? <Tag color="blue">Phần trăm</Tag> : <Tag color="green">Cố định</Tag>
        },
        {
            title: "Giá trị",
            render: (_, record) => record.discount_type === "percentage" ? `${Number(record.discount_value)}%` : `${money(record.discount_value)}đ`
        },
        { title: "Giảm tối đa", dataIndex: "max_discount", render: (value) => value == null ? "-" : `${money(value)}đ` },
        { title: "Đơn tối thiểu", dataIndex: "min_order_value", render: (value) => `${money(value)}đ` },
        { title: "Hạn dùng", dataIndex: "expiry_date", render: (value) => value ? dayjs(value).format("DD/MM/YYYY") : "-" },
        { title: "Lượt dùng", render: (_, record) => `${record.usage_count || 0}${record.usage_limit ? ` / ${record.usage_limit}` : ""}` },
        { title: "Trạng thái", dataIndex: "is_active", render: (value) => Boolean(value) ? <Tag color="success">Đang bật</Tag> : <Tag>Đã tắt</Tag> },
        { title: "Tương tác", dataIndex: "action", width: 110 },
    ], [hasPermission]);

    return (
        <>
            {contextHolder}
            <SearchAndActionsBar
                onSearch={async (value) => setFilters({ search: value })}
                placeholder="Theo mã voucher"
                titleBtnAdd="Voucher"
                handleAddBtn={hasPermission(PermissionKey.VOUCHER_CREATE) ? openCreateModal : undefined}
            />
            <CustomTable<VoucherRow>
                columns={columns}
                dataSource={data}
                loading={loading}
                pagination={{ position: ["bottomRight"] }}
                scroll={{ x: "max-content" }}
            />

            <Modal
                title={editingVoucher ? "Cập nhật voucher" : "Thêm voucher"}
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={() => form.submit()}
                confirmLoading={saving}
                width={640}
                okText="Lưu"
                cancelText="Huỷ"
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="code" label="Mã voucher" rules={[{ required: true, message: "Vui lòng nhập mã voucher" }]}>
                        <Input placeholder="VD: GOLF10" style={{ textTransform: "uppercase" }} />
                    </Form.Item>
                    <Space size={16} style={{ width: "100%" }} align="start">
                        <Form.Item name="discount_type" label="Loại giảm giá" rules={[{ required: true }]} style={{ width: 180 }}>
                            <Select
                                options={[
                                    { value: "percentage", label: "Phần trăm" },
                                    { value: "fixed", label: "Cố định" },
                                ]}
                            />
                        </Form.Item>
                        <Form.Item name="discount_value" label="Giá trị giảm" rules={[{ required: true, message: "Nhập giá trị giảm" }]} style={{ width: 180 }}>
                            <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item name="max_discount" label="Giảm tối đa" style={{ width: 180 }}>
                            <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                    </Space>
                    <Space size={16} style={{ width: "100%" }} align="start">
                        <Form.Item name="min_order_value" label="Đơn tối thiểu" style={{ width: 180 }}>
                            <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item name="expiry_date" label="Hạn dùng" style={{ width: 180 }}>
                            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                        </Form.Item>
                        <Form.Item name="usage_limit" label="Giới hạn lượt" style={{ width: 180 }}>
                            <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                    </Space>
                    <Form.Item name="is_active" label="Kích hoạt" valuePropName="checked">
                        <Switch />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default VoucherPage;
