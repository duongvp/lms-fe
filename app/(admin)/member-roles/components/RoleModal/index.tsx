"use client";
import {
    Modal,
    Form,
    Input,
    Button,
    Row,
    Col,
    Checkbox,
    Typography,
    Tabs,
    Collapse,
    Table
} from "antd";
import React, { useEffect, useState } from "react";
import {
    CloseCircleOutlined,
    SaveOutlined,
    CaretRightFilled,
    CaretDownFilled,
} from "@ant-design/icons";
import CustomSpin from "@/components/ui/Spins";
import { showErrorMessage, showSuccessMessage } from "@/ultils/message";
import useRoleStore from "@/stores/roleStore";
import { ActionType } from "@/enums/action";
import { createRole, updateRole } from "@/services/roleService";

const { Title, Text } = Typography;

const formItemLayout = {
    labelCol: { span: 8 },
    wrapperCol: { span: 16 },
};

const MOCK_MODULES = [
    {
        code: 'schedule_summary',
        name: 'Tổng quan lịch học',
        fields: [
            { fieldCode: 'date', fieldLabel: 'Ngày học' },
            { fieldCode: 'time', fieldLabel: 'Giờ học' },
            { fieldCode: 'class_name', fieldLabel: 'Tên lớp' },
            { fieldCode: 'room', fieldLabel: 'Phòng học' }
        ]
    },
    {
        code: 'schedule_detail',
        name: 'Chi tiết lịch học',
        fields: [
            { fieldCode: 'date', fieldLabel: 'Ngày học' },
            { fieldCode: 'time', fieldLabel: 'Giờ học' },
            { fieldCode: 'class_name', fieldLabel: 'Tên lớp' },
            { fieldCode: 'room', fieldLabel: 'Phòng học' },
            { fieldCode: 'subject', fieldLabel: 'Môn học' }
        ]
    },
    {
        code: 'class_list',
        name: 'Danh sách lớp',
        fields: [
            { fieldCode: 'class_name', fieldLabel: 'Tên lớp' },
            { fieldCode: 'grade', fieldLabel: 'Khối' },
            { fieldCode: 'room', fieldLabel: 'Phòng học' }
        ]
    },
    {
        code: 'student_list',
        name: 'Danh sách học viên',
        fields: [
            { fieldCode: 'student_code', fieldLabel: 'Mã học viên' },
            { fieldCode: 'full_name', fieldLabel: 'Họ và tên' },
            { fieldCode: 'class_name', fieldLabel: 'Tên lớp' }
        ]
    }
];

// Cấu trúc permission chi tiết với các action có sẵn cho từng mục
const permissionsStructure = {
    "Hệ thống": {
        "Người dùng": {
            actions: ["Xem DS", "Thêm mới", "Cập nhật", "Xoá"],
            keys: ["user_view", "user_create", "user_edit", "user_delete"]
        },
        "Chi nhánh": {
            actions: ["Xem DS", "Thêm mới", "Cập nhật", "Xoá"],
            keys: ["branch_view", "branch_create", "branch_edit", "branch_delete"]
        },
        "Tổng quan": {
            actions: ["Xem DS"],
            keys: ["dashboard_view"]
        },
        "Báo cáo": {
            actions: ["Xem DS"],
            keys: ["report_view"]
        }
    },
    "Hàng hóa": {
        "Sản phẩm": {
            actions: ["Xem DS", "Thêm mới", "Cập nhật", "Xoá", "Import excel", "Xuất excel"],
            keys: ["product_view", "product_create", "product_edit", "product_delete", "product_import", "product_export"]
        },
        "Nhóm hàng": {
            actions: ["Xem DS", "Thêm mới", "Cập nhật", "Xoá"],
            keys: ["category_view", "category_create", "category_edit", "category_delete"]
        },
        "Kiểm kho": {
            actions: ["Xem DS", "Điều chỉnh", "Huỷ", "Cập nhật", "Xuất excel"],
            keys: ["stock_check_view", "stock_check_create", "stock_check_edit", "stock_check_delete", "stock_check_export"]
        }
    },
    "Giao dịch": {
        "Hóa đơn": {
            actions: ["Xem DS", "Tạo mới", "Hủy", "Cập nhật", "Import excel", "Xuất excel", "In hóa đơn"],
            keys: ["invoice_view", "invoice_create", "invoice_edit", "invoice_void", "invoice_import", "invoice_export", "invoice_print"]
        },
        "Trả hàng": {
            actions: ["Xem DS", "Xử lý", "Hủy", "Cập nhật", "Xuất excel", "In trả hàng"],
            keys: ["return_view", "return_process", "return_void", "return_edit", "return_export", "return_print"]
        },
        "Nhập hàng": {
            actions: ["Xem DS", "Tạo mới", "Hủy", "Cập nhật", "Import excel", "Xuất excel", "In phiếu nhập"],
            keys: ["import_view", "import_create", "import_void", "import_edit", "import_import", "import_export", "import_print"]
        },
        "Voucher": {
            actions: ["Xem DS", "Thêm mới", "Cập nhật", "Xoá"],
            keys: ["voucher_view", "voucher_create", "voucher_edit", "voucher_delete"]
        }
    },
    "Đối tác": {
        "Khách hàng": {
            actions: ["Xem DS", "Thêm mới", "Cập nhật", "Xoá", "Import excel", "Xuất excel"],
            keys: ["customer_view", "customer_create", "customer_edit", "customer_delete", "customer_import", "customer_export"]
        },
        "Nhà cung cấp": {
            actions: ["Xem DS", "Thêm mới", "Cập nhật", "Xoá", "Import excel", "Xuất excel"],
            keys: ["supplier_view", "supplier_create", "supplier_edit", "supplier_delete", "supplier_import", "supplier_export"]
        }
    },
    "Golf": {
        "Golf Simulator": {
            actions: ["Xem DS", "Quản lý", "Checkout", "Membership", "Báo cáo", "Quản lý Line"],
            keys: ["golf_view", "golf_manage", "golf_checkout", "golf_membership", "golf_report", "golf_line_manage"]
        }
    }
};

const RoleModal = () => {
    const [form] = Form.useForm();
    const { modal, resetModal, setShouldReload } = useRoleStore();
    const [loadingModalVisible, setLoadingModalVisible] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
    const [checkedGroups, setCheckedGroups] = useState<{ [key: string]: string[] }>({});
    const [fieldPolicy, setFieldPolicy] = useState<Record<string, { visible_fields: string[], editable_fields: string[] }>>({});

    const onCloseModal = () => {
        resetModal();
        form.resetFields();
        setCheckedGroups({});
        setExpandedGroups({});
        setFieldPolicy({});
    };

    const toggleGroup = (key: string) => {
        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const onParentCheck = (key: string, checked: boolean) => {
        // Lấy danh sách actions có sẵn cho item này
        let itemActions: string[] = [];
        Object.values(permissionsStructure).forEach(group => {
            if (key in group) {
                itemActions = (group[key as keyof typeof group] as { actions: string[] }).actions;
            }
        });

        const actions = checked ? itemActions : [];
        setCheckedGroups(prev => ({ ...prev, [key]: actions }));
        form.setFieldValue(['permissions', key], actions);
    };

    const onChildCheck = (key: string, values: string[]) => {
        setCheckedGroups(prev => ({ ...prev, [key]: values }));
        // form.setFieldValue(['permissions', key], values);
    };

    const handleFormSubmit = async (values: any) => {
        try {
            setLoadingModalVisible(true);

            // Chuyển đổi dữ liệu từ form sang dạng API cần
            const permissions = convertFormPermissionsToApi(form.getFieldValue('permissions') || {});

            const roleData = {
                role_name: values.roleName,
                description: values.description || "",
                permissions,
                fieldPolicy
            };

            // Gọi API ở đây
            console.log('Data to submit:', roleData);
            console.log('Modal type:', modal);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            if (modal.type === ActionType.CREATE) {
                await createRole(roleData);
            } else if (modal.type === ActionType.UPDATE) {
                await updateRole(modal.role?.role_id || 0, roleData);
            }

            showSuccessMessage(`${modal.title} thành công!`);
            setShouldReload(true);
            onCloseModal();
        } catch (error) {
            console.error("Lỗi submit:", error);
            showErrorMessage(`${modal.title} thất bại!`);
        } finally {
            setLoadingModalVisible(false);
        }
    };

    const convertFormPermissionsToApi = (
        formPermissions: Record<string, string[]> = {}
    ): Array<{ key: string, name: string }> => {
        console.log('🚀 ~ convertFormPermissionsToApi ~ formPermissions:', formPermissions);
        const result: Array<{ key: string, name: string }> = [];

        Object.entries(permissionsStructure).forEach(([groupName, groupItems]) => {
            Object.entries(groupItems).forEach(([itemName, itemData]) => {
                const { actions, keys } = itemData;
                const formActions = formPermissions?.[itemName] || [];

                actions.forEach((action, index) => {
                    if (formActions.includes(action)) {
                        const key = keys[index];
                        const permission = modal.role?.permissions.find(p => p.key === key) || {
                            key,
                            name: `${itemName} ${key.split('_').pop()}`
                        };
                        result.push({
                            key: permission.key,
                            name: permission.name,
                        });
                    }
                });
            });
        });

        return result;
    };


    // Hàm kiểm tra xem một item có được chọn toàn bộ hay không
    const isAllChecked = (itemName: string) => {
        const itemData = getItemData(itemName);
        if (!itemData) return false;

        return checkedGroups[itemName]?.length === itemData.actions.length;
    };

    // Hàm kiểm tra xem một item có được chọn một phần hay không
    const isIndeterminate = (itemName: string) => {
        const itemData = getItemData(itemName);
        if (!itemData) return false;

        const checkedCount = checkedGroups[itemName]?.length || 0;
        return checkedCount > 0 && checkedCount < itemData.actions.length;
    };

    // Hàm lấy dữ liệu item
    const getItemData = (itemName: string): { actions: string[]; keys: string[] } | null => {
        for (const group of Object.values(permissionsStructure)) {
            if (group[itemName as keyof typeof group]) {
                return group[itemName as keyof typeof group] as { actions: string[]; keys: string[] };
            }
        }
        return null;
    };

    useEffect(() => {
        if (!modal.open) return;
        if (modal.role) {
            // Đặt giá trị cơ bản
            form.setFieldsValue({
                roleName: modal.role.role_name,
                description: modal.role.description
            });

            // Xử lý permissions từ API
            const initialChecked: { [key: string]: string[] } = {};

            const apiPermissions = new Set(modal.role.permissions.map(p => p.key));

            // Duyệt qua cấu trúc permissions để map đúng checkbox
            Object.entries(permissionsStructure).forEach(([groupName, groupItems]) => {
                Object.entries(groupItems).forEach(([itemName, itemData]) => {
                    const { actions, keys } = itemData;
                    const itemActions: string[] = [];

                    keys.forEach((key, index) => {
                        if (apiPermissions.has(key)) {
                            itemActions.push(actions[index]);
                        }
                    });

                    if (itemActions.length > 0) {
                        initialChecked[itemName] = itemActions;
                    }
                });
            });

            setCheckedGroups(initialChecked);
            form.setFieldValue('permissions', initialChecked);

            if (modal.role.fieldPolicy) {
                setFieldPolicy(modal.role.fieldPolicy);
            } else {
                setFieldPolicy({});
            }

            // // Mở rộng tất cả các nhóm khi là chỉnh sửa
            // const allGroups = Object.values(permissionsStructure).flatMap(group => Object.keys(group));
            // const expandedState = allGroups.reduce((acc, group) => ({ ...acc, [group]: true }), {});
            // setExpandedGroups(expandedState);
        } else {
            // Nếu là thêm mới, reset tất cả
            form.resetFields();
            setCheckedGroups({});
            setExpandedGroups({});
            setFieldPolicy({});
        }
    }, [modal.role, form, modal.open]);

    return (
        <>
            <CustomSpin openSpin={loadingModalVisible} />
            <Modal
                title={modal.title}
                open={modal.open}
                onCancel={onCloseModal}
                width={900}
                centered
                footer={[
                    <Button
                        key="back"
                        onClick={onCloseModal}
                        icon={<CloseCircleOutlined />}
                    >
                        Huỷ
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        onClick={() => form.submit()}
                        icon={<SaveOutlined />}
                    >
                        Lưu
                    </Button>,
                ]}
            >
                <div style={{ maxHeight: 568, overflowY: 'auto', overflowX: 'hidden', paddingRight: 8 }}>
                    <Form
                        form={form}
                        onFinish={handleFormSubmit}
                        {...formItemLayout}
                        labelAlign="left"
                    >
                        <Form.Item
                            name="roleName"
                            label="Vai trò"
                            rules={[{ required: true, message: "Vui lòng nhập tên vai trò!" }]}
                        >
                            <Input placeholder="Nhập tên vai trò" />
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label="Mô tả"
                        >
                            <Input.TextArea placeholder="Nhập mô tả" rows={3} />
                        </Form.Item>

                        {
                            modal.role?.role_id === 1 && (
                                <Text type="danger">Chú ý: vì là vai trò {form.getFieldValue("roleName")} nên mặc định 3 quyền Người dùng, Chi nhánh và Tổng quan sẽ không thể sửa</Text>
                            )
                        }

                        <Tabs defaultActiveKey="1" style={{ marginTop: 16 }}>
                            <Tabs.TabPane tab="Quyền thao tác" key="1">
                                <Title level={5}>Phân quyền thao tác</Title>
                                <Row gutter={[24, 16]}>
                                    {Object.entries(permissionsStructure).map(([groupName, groupItems]) => (
                                        <Col xs={24} sm={12} md={8} key={groupName}>
                                            <p style={{ fontWeight: 500, marginBottom: 12 }}>{groupName}</p>
                                            {Object.keys(groupItems).map((itemName) => {
                                                const isExpanded = expandedGroups[itemName] ?? false;
                                                const currentChecked = checkedGroups[itemName] || [];
                                                const itemData = getItemData(itemName);
                                                const actionsToShow = itemData?.actions || [];

                                                return (
                                                    <div
                                                        key={itemName}
                                                        style={{
                                                            paddingBottom: 8,
                                                            marginBottom: 8,
                                                            borderBottom: '1px solid #f0f0f0'
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: 4,
                                                            }}
                                                        >
                                                            <span
                                                                onClick={() => toggleGroup(itemName)}
                                                                style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                                                            >
                                                                {isExpanded ? <CaretDownFilled style={{ color: 'rgb(107 102 102)' }} /> : <CaretRightFilled style={{ color: 'rgb(107 102 102)' }} />}
                                                            </span>
                                                            <Checkbox
                                                                checked={isAllChecked(itemName)}
                                                                indeterminate={isIndeterminate(itemName)}
                                                                onChange={(e) => onParentCheck(itemName, e.target.checked)}
                                                                disabled={modal.role?.role_id === 1 && (itemName === "Người dùng" || itemName === "Chi nhánh" || itemName == "Tổng quan")}
                                                            >
                                                                {itemName}
                                                            </Checkbox>
                                                        </div>

                                                        {isExpanded && itemData && (
                                                            <Form.Item
                                                                name={['permissions', itemName]}
                                                                style={{ marginTop: 8, marginLeft: 40 }}
                                                            >
                                                                <Checkbox.Group
                                                                    style={{ display: 'flex', flexDirection: 'column' }}
                                                                    options={actionsToShow}
                                                                    value={currentChecked}
                                                                    onChange={(checked) =>
                                                                        onChildCheck(itemName, checked as string[])
                                                                    }
                                                                    disabled={modal.role?.role_id === 1 && (itemName === "Người dùng" || itemName === "Chi nhánh" || itemName == "Tổng quan")}
                                                                />
                                                            </Form.Item>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </Col>
                                    ))}
                                </Row>
                            </Tabs.TabPane>

                            <Tabs.TabPane tab="Quyền dữ liệu (Field-Level)" key="2">
                                <Title level={5}>Cấu hình quyền trên trường dữ liệu</Title>
                                <Collapse defaultActiveKey={MOCK_MODULES.map(m => m.code)}>
                                    {MOCK_MODULES.map(module => {
                                        const dataSource = module.fields.map(f => ({ ...f, key: f.fieldCode }));
                                        const columns = [
                                            { title: 'Trường dữ liệu', dataIndex: 'fieldLabel', key: 'fieldLabel' },
                                            {
                                                title: 'Xem',
                                                key: 'view',
                                                render: (_: any, record: any) => {
                                                    const isChecked = fieldPolicy[module.code]?.visible_fields?.includes(record.fieldCode) || false;
                                                    return (
                                                        <Checkbox
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setFieldPolicy(prev => {
                                                                    const modulePolicy = prev[module.code] || { visible_fields: [], editable_fields: [] };
                                                                    let newVisible = [...(modulePolicy.visible_fields || [])];
                                                                    let newEditable = [...(modulePolicy.editable_fields || [])];

                                                                    if (checked) {
                                                                        if (!newVisible.includes(record.fieldCode)) newVisible.push(record.fieldCode);
                                                                    } else {
                                                                        newVisible = newVisible.filter(f => f !== record.fieldCode);
                                                                        newEditable = newEditable.filter(f => f !== record.fieldCode);
                                                                    }

                                                                    return {
                                                                        ...prev,
                                                                        [module.code]: { ...modulePolicy, visible_fields: newVisible, editable_fields: newEditable }
                                                                    };
                                                                });
                                                            }}
                                                        />
                                                    );
                                                }
                                            },
                                            {
                                                title: 'Sửa',
                                                key: 'edit',
                                                render: (_: any, record: any) => {
                                                    const isChecked = fieldPolicy[module.code]?.editable_fields?.includes(record.fieldCode) || false;
                                                    return (
                                                        <Checkbox
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setFieldPolicy(prev => {
                                                                    const modulePolicy = prev[module.code] || { visible_fields: [], editable_fields: [] };
                                                                    let newVisible = [...(modulePolicy.visible_fields || [])];
                                                                    let newEditable = [...(modulePolicy.editable_fields || [])];

                                                                    if (checked) {
                                                                        if (!newEditable.includes(record.fieldCode)) newEditable.push(record.fieldCode);
                                                                        if (!newVisible.includes(record.fieldCode)) newVisible.push(record.fieldCode);
                                                                    } else {
                                                                        newEditable = newEditable.filter(f => f !== record.fieldCode);
                                                                    }

                                                                    return {
                                                                        ...prev,
                                                                        [module.code]: { ...modulePolicy, visible_fields: newVisible, editable_fields: newEditable }
                                                                    };
                                                                });
                                                            }}
                                                        />
                                                    );
                                                }
                                            }
                                        ];
                                        return (
                                            <Collapse.Panel header={module.name} key={module.code}>
                                                <Table
                                                    dataSource={dataSource}
                                                    columns={columns}
                                                    pagination={false}
                                                    size="small"
                                                />
                                            </Collapse.Panel>
                                        );
                                    })}
                                </Collapse>
                            </Tabs.TabPane>
                        </Tabs>
                    </Form>
                </div>
            </Modal>
        </>
    );
};

export default RoleModal;
