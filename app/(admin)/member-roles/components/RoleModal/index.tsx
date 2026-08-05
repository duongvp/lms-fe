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
    Table,
    Alert,
    Skeleton,
} from "antd";
import React, { useEffect, useState, useCallback } from "react";
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
import {
    createRole,
    updateRole,
    getModules,
    getModuleFields,
    getRoleFieldPolicy,
    updateRoleFieldPolicy,
    getPermissionsStructure,
    type PermissionStructure,
} from "@/services/roleService";
import type { ModuleStructure } from "@/types/fieldPolicy";

const { Title } = Typography;

const formItemLayout = {
    labelCol: { span: 8 },
    wrapperCol: { span: 16 },
};

// ---------- Kiểu dữ liệu cho fieldPolicy ----------
// Định dạng BE (như trong seed)
interface FieldPolicyBE {
    modules: Record<
        string,
        {
            fields: Record<string, { visible: boolean; editable: boolean }>;
        }
    >;
}

// Định dạng FE dùng để quản lý state (phẳng hơn)
type FieldPolicyFE = Record<
    string,
    {
        visible_fields: string[];
        editable_fields: string[];
    }
>;

// ---------- Hàm chuyển đổi ----------

/**
 * Chuyển fieldPolicy từ BE sang FE.
 * Xử lý cả wildcard '*' và field cụ thể.
 */
const convertFieldPolicyFromBE = (
    bePolicy: any,
    modules: ModuleStructure[]
): FieldPolicyFE => {
    const fe: FieldPolicyFE = {};

    if (!bePolicy || !bePolicy.modules) return fe;
    const beModules = bePolicy.modules as Record<string, any>;

    for (const mod of modules) {
        const modCode = mod.code;
        const modPolicy = beModules[modCode]?.fields;
        if (!modPolicy) continue;

        const visibleFieldsSet = new Set<string>();
        const editableFieldsSet = new Set<string>();

        // Wildcard
        const wildcard = modPolicy["*"];
        if (wildcard) {
            for (const field of mod.fields) {
                if (wildcard.visible) visibleFieldsSet.add(field.fieldCode);
                if (wildcard.editable) editableFieldsSet.add(field.fieldCode);
            }
        }

        // Duyệt từng field cụ thể (ghi đè wildcard nếu có)
        for (const field of mod.fields) {
            const rule = modPolicy[field.fieldCode];
            if (rule) {
                if (rule.visible) {
                    visibleFieldsSet.add(field.fieldCode);
                } else {
                    visibleFieldsSet.delete(field.fieldCode);
                }
                if (rule.editable) {
                    editableFieldsSet.add(field.fieldCode);
                } else {
                    editableFieldsSet.delete(field.fieldCode);
                }
            }
        }

        if (visibleFieldsSet.size > 0 || editableFieldsSet.size > 0) {
            fe[modCode] = {
                visible_fields: Array.from(visibleFieldsSet),
                editable_fields: Array.from(editableFieldsSet),
            };
        }
    }

    return fe;
};

/**
 * Chuyển fieldPolicy từ FE sang BE.
 * Nếu tất cả field được chọn thì dùng wildcard cho gọn, ngược lại liệt kê từng field.
 */
const convertFieldPolicyToBE = (
    fePolicy: FieldPolicyFE,
    modules: ModuleStructure[]
): FieldPolicyBE => {
    const beModules: Record<string, any> = {};

    for (const mod of modules) {
        const modFe = fePolicy[mod.code];
        if (!modFe) continue;

        const allVisible = mod.fields.every((f) =>
            modFe.visible_fields?.includes(f.fieldCode)
        );
        const allEditable = mod.fields.every((f) =>
            modFe.editable_fields?.includes(f.fieldCode)
        );

        const fields: Record<string, { visible: boolean; editable: boolean }> = {};

        if (allVisible && allEditable) {
            fields["*"] = { visible: true, editable: true };
        } else {
            for (const field of mod.fields) {
                const visible = modFe.visible_fields?.includes(field.fieldCode) || false;
                const editable = modFe.editable_fields?.includes(field.fieldCode) || false;
                if (visible || editable) {
                    fields[field.fieldCode] = { visible, editable };
                }
            }
        }

        beModules[mod.code] = { fields };
    }

    return { modules: beModules };
};

const RoleModal = () => {
    const [form] = Form.useForm();
    const { modal, resetModal, setShouldReload } = useRoleStore();
    const [loadingModalVisible, setLoadingModalVisible] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
    const [checkedGroups, setCheckedGroups] = useState<{ [key: string]: string[] }>({});
    const [fieldPolicy, setFieldPolicy] = useState<FieldPolicyFE>({});
    const [modulesStructure, setModulesStructure] = useState<ModuleStructure[]>([]);
    const [permissionsStructure, setPermissionsStructure] = useState<PermissionStructure>({});
    const [structuresLoaded, setStructuresLoaded] = useState(false);
    const [structuresError, setStructuresError] = useState<string | null>(null);

    // Lấy cấu trúc modules và permissions từ API
    useEffect(() => {
        if (!modal.open) return;
        let cancelled = false;
        setStructuresLoaded(false);
        setStructuresError(null);
        setModulesStructure([]);
        setPermissionsStructure({});

        const fetchStructures = async () => {
            try {
                const [modulesResponse, permissionsResponse] = await Promise.all([
                    getModules(),
                    getPermissionsStructure(),
                ]);

                // Modules + ModuleField
                let modulesArray: ModuleStructure[] = [];
                if (Array.isArray(modulesResponse)) {
                    const moduleDetails = await Promise.all(
                        modulesResponse.map(async (module) => getModuleFields(module.code))
                    );
                    modulesArray = moduleDetails
                        .filter((module): module is ModuleStructure => Boolean(module))
                        .map((module) => ({
                            ...module,
                            fields: [...module.fields].sort(
                                (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
                            ),
                        }));
                } else {
                    console.warn("Modules response không đúng định dạng", modulesResponse);
                }
                if (cancelled) return;
                setModulesStructure(modulesArray);

                // Permissions
                let permissionsObj: PermissionStructure = {};
                if (typeof permissionsResponse === "object" && !Array.isArray(permissionsResponse)) {
                    permissionsObj = permissionsResponse as PermissionStructure;
                } else {
                    console.warn("Permissions structure không đúng định dạng", permissionsResponse);
                }
                setPermissionsStructure(permissionsObj);
            } catch (error) {
                if (cancelled) return;
                console.error("Lỗi lấy cấu trúc phân quyền:", error);
                setStructuresError("Không thể tải cấu trúc phân quyền. Vui lòng đóng và thử lại.");
            } finally {
                if (!cancelled) setStructuresLoaded(true);
            }
        };

        void fetchStructures();
        return () => {
            cancelled = true;
        };
    }, [modal.open]);

    // Đóng modal, reset state
    const onCloseModal = () => {
        resetModal();
        form.resetFields();
        setCheckedGroups({});
        setExpandedGroups({});
        setFieldPolicy({});
        setStructuresLoaded(false);
        setStructuresError(null);
    };

    const toggleGroup = (key: string) => {
        setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    // Lấy thông tin actions/keys của một item
    const getItemData = useCallback(
        (itemName: string): { actions: string[]; keys: string[] } | null => {
            for (const group of Object.values(permissionsStructure)) {
                if (group[itemName]) {
                    return group[itemName];
                }
            }
            return null;
        },
        [permissionsStructure]
    );

    const onParentCheck = (key: string, checked: boolean) => {
        const itemData = getItemData(key);
        if (!itemData) return;
        const actions = checked ? [...itemData.actions] : [];
        setCheckedGroups((prev) => ({ ...prev, [key]: actions }));
        form.setFieldValue(["permissions", key], actions);
    };

    const onChildCheck = (key: string, values: string[]) => {
        setCheckedGroups((prev) => ({ ...prev, [key]: values }));
    };

    // Chuyển dữ liệu form permissions thành mảng string keys
    const convertFormPermissionsToApi = (formPermissions: Record<string, string[]> = {}): string[] => {
        const result: string[] = [];
        Object.entries(permissionsStructure).forEach(([_, groupItems]) => {
            Object.entries(groupItems).forEach(([itemName, itemData]) => {
                const { actions, keys } = itemData;
                const formActions = formPermissions[itemName] || [];
                actions.forEach((action, index) => {
                    if (formActions.includes(action)) {
                        result.push(keys[index]);
                    }
                });
            });
        });
        return result;
    };

    const isAllChecked = (itemName: string) => {
        const itemData = getItemData(itemName);
        if (!itemData) return false;
        return (checkedGroups[itemName] || []).length === itemData.actions.length;
    };

    const isIndeterminate = (itemName: string) => {
        const itemData = getItemData(itemName);
        if (!itemData) return false;
        const checkedCount = (checkedGroups[itemName] || []).length;
        return checkedCount > 0 && checkedCount < itemData.actions.length;
    };

    // Khi modal mở với role có sẵn (edit), load dữ liệu
    useEffect(() => {
        if (
            !modal.open ||
            !modal.role ||
            Object.keys(permissionsStructure).length === 0 ||
            modulesStructure.length === 0
        )
            return;

        // Form cơ bản
        form.setFieldsValue({
            roleName: modal.role.name,
            description: modal.role.description,
        });

        // Permissions
        const apiPermissions = new Set(
            (modal.role.permissions || []).map((p: any) =>
                typeof p === "string" ? p : p.key
            )
        );
        const initialChecked: { [key: string]: string[] } = {};
        Object.entries(permissionsStructure).forEach(([_, groupItems]) => {
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
        form.setFieldValue("permissions", initialChecked);

        // Field policy: lấy từ API riêng để luôn đồng bộ với backend.
        const loadFieldPolicy = async () => {
            try {
                const rolePolicyResponse = await getRoleFieldPolicy(Number(modal.role?.id));
                const bePolicy = rolePolicyResponse?.fieldPolicy ?? modal.role?.fieldPolicy;
                const fePolicy = convertFieldPolicyFromBE(bePolicy, modulesStructure);
                setFieldPolicy(fePolicy);
            } catch (error) {
                console.error("Lỗi lấy fieldPolicy:", error);
                const fePolicy = convertFieldPolicyFromBE(modal.role?.fieldPolicy, modulesStructure);
                setFieldPolicy(fePolicy);
            }
        };

        loadFieldPolicy();
    }, [modal.role, form, modal.open, permissionsStructure, modulesStructure]);

    // Submit form
    const handleFormSubmit = async (values: any) => {
        try {
            setLoadingModalVisible(true);

            const permissions = convertFormPermissionsToApi(form.getFieldValue("permissions") || {});
            const fieldPolicyBE = convertFieldPolicyToBE(fieldPolicy, modulesStructure);

            const roleData = {
                role_name: values.roleName,
                description: values.description || "",
                permissions: permissions.map((code) => ({ code })),
            };

            if (modal.type === ActionType.CREATE) {
                await createRole({ ...roleData, fieldPolicy: fieldPolicyBE });
            } else if (modal.type === ActionType.UPDATE) {
                const roleId = Number(modal.role?.id || 0);
                await updateRole(roleId, roleData);
                try {
                    await updateRoleFieldPolicy(roleId, fieldPolicyBE);
                } catch (fieldPolicyError) {
                    console.warn("Không thể cập nhật fieldPolicy qua endpoint riêng, fallback update role:", fieldPolicyError);
                    await updateRole(roleId, { fieldPolicy: fieldPolicyBE });
                }
            }

            showSuccessMessage(`${modal.title} thành công!`);
            setShouldReload(true);
            onCloseModal();
        } catch (error: any) {
            console.error("Lỗi submit:", error);
            showErrorMessage(error?.message || `${modal.title} thất bại!`);
        } finally {
            setLoadingModalVisible(false);
        }
    };

    // Giữ modal ổn định trong lúc tải, tránh lớp spinner toàn màn hình chồng
    // lên modal rỗng ở lần mở đầu tiên.
    if (modal.open && !structuresLoaded) {
        return (
            <Modal
                title={modal.title}
                open={modal.open}
                onCancel={onCloseModal}
                width={900}
                centered
                footer={null}
            >
                <div style={{ padding: "16px 8px" }}>
                    <Skeleton active title paragraph={{ rows: 7 }} />
                </div>
            </Modal>
        );
    }

    if (modal.open && structuresError) {
        return (
            <Modal
                title={modal.title}
                open={modal.open}
                onCancel={onCloseModal}
                width={900}
                centered
                footer={[
                    <Button key="close" onClick={onCloseModal} icon={<CloseCircleOutlined />}>
                        Đóng
                    </Button>,
                ]}
            >
                <Alert type="error" showIcon message={structuresError} />
            </Modal>
        );
    }

    // ================== JSX chính ==================
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
                    <Button key="back" onClick={onCloseModal} icon={<CloseCircleOutlined />}>
                        Huỷ
                    </Button>,
                    <Button key="submit" type="primary" onClick={() => form.submit()} icon={<SaveOutlined />}>
                        Lưu
                    </Button>,
                ]}
            >
                <div style={{ maxHeight: 568, overflowY: "auto", overflowX: "hidden", paddingRight: 8 }}>
                    <Form form={form} onFinish={handleFormSubmit} {...formItemLayout} labelAlign="left">
                        <Form.Item
                            name="roleName"
                            label="Vai trò"
                            rules={[{ required: true, message: "Vui lòng nhập tên vai trò!" }]}
                        >
                            <Input placeholder="Nhập tên vai trò" />
                        </Form.Item>

                        <Form.Item name="description" label="Mô tả">
                            <Input.TextArea placeholder="Nhập mô tả" rows={3} />
                        </Form.Item>

                        <Tabs defaultActiveKey="1" style={{ marginTop: 16 }}>
                            {/* Tab Quyền thao tác */}
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
                                                            borderBottom: "1px solid #f0f0f0",
                                                        }}
                                                    >
                                                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                            <span
                                                                onClick={() => toggleGroup(itemName)}
                                                                style={{
                                                                    cursor: "pointer",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                }}
                                                            >
                                                                {isExpanded ? (
                                                                    <CaretDownFilled style={{ color: "rgb(107 102 102)" }} />
                                                                ) : (
                                                                    <CaretRightFilled style={{ color: "rgb(107 102 102)" }} />
                                                                )}
                                                            </span>
                                                            <Checkbox
                                                                checked={isAllChecked(itemName)}
                                                                indeterminate={isIndeterminate(itemName)}
                                                                onChange={(e) => onParentCheck(itemName, e.target.checked)}
                                                            >
                                                                {itemName}
                                                            </Checkbox>
                                                        </div>

                                                        {isExpanded && itemData && (
                                                            <Form.Item
                                                                name={["permissions", itemName]}
                                                                style={{ marginTop: 8, marginLeft: 40 }}
                                                            >
                                                                <Checkbox.Group
                                                                    style={{ display: "flex", flexDirection: "column" }}
                                                                    options={actionsToShow}
                                                                    value={currentChecked}
                                                                    onChange={(checked) =>
                                                                        onChildCheck(itemName, checked as string[])
                                                                    }
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

                            {/* Tab Quyền dữ liệu (Field-Level) */}
                            <Tabs.TabPane tab="Quyền dữ liệu (Field-Level)" key="2">
                                <Title level={5}>Cấu hình quyền trên trường dữ liệu</Title>
                                <Collapse defaultActiveKey={modulesStructure.map((m) => m.code)}>
                                    {modulesStructure.map((module) => {
                                        const dataSource = module.fields.map((f) => ({
                                            ...f,
                                            key: f.fieldCode,
                                        }));
                                        const columns = [
                                            {
                                                title: "Trường dữ liệu",
                                                dataIndex: "fieldLabel",
                                                key: "fieldLabel",
                                            },
                                            {
                                                title: "Xem",
                                                key: "view",
                                                render: (_: any, record: any) => {
                                                    const isChecked =
                                                        fieldPolicy[module.code]?.visible_fields?.includes(
                                                            record.fieldCode
                                                        ) || false;
                                                    return (
                                                        <Checkbox
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setFieldPolicy((prev) => {
                                                                    const modulePolicy = prev[module.code] || {
                                                                        visible_fields: [],
                                                                        editable_fields: [],
                                                                    };
                                                                    let newVisible = [...modulePolicy.visible_fields];
                                                                    let newEditable = [...modulePolicy.editable_fields];

                                                                    if (checked) {
                                                                        if (!newVisible.includes(record.fieldCode))
                                                                            newVisible.push(record.fieldCode);
                                                                    } else {
                                                                        newVisible = newVisible.filter(
                                                                            (f) => f !== record.fieldCode
                                                                        );
                                                                        newEditable = newEditable.filter(
                                                                            (f) => f !== record.fieldCode
                                                                        );
                                                                    }

                                                                    return {
                                                                        ...prev,
                                                                        [module.code]: {
                                                                            ...modulePolicy,
                                                                            visible_fields: newVisible,
                                                                            editable_fields: newEditable,
                                                                        },
                                                                    };
                                                                });
                                                            }}
                                                        />
                                                    );
                                                },
                                            },
                                            {
                                                title: "Sửa",
                                                key: "edit",
                                                render: (_: any, record: any) => {
                                                    const isChecked =
                                                        fieldPolicy[module.code]?.editable_fields?.includes(
                                                            record.fieldCode
                                                        ) || false;
                                                    return (
                                                        <Checkbox
                                                            checked={isChecked}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setFieldPolicy((prev) => {
                                                                    const modulePolicy = prev[module.code] || {
                                                                        visible_fields: [],
                                                                        editable_fields: [],
                                                                    };
                                                                    let newVisible = [...modulePolicy.visible_fields];
                                                                    let newEditable = [...modulePolicy.editable_fields];

                                                                    if (checked) {
                                                                        if (!newEditable.includes(record.fieldCode))
                                                                            newEditable.push(record.fieldCode);
                                                                        if (!newVisible.includes(record.fieldCode))
                                                                            newVisible.push(record.fieldCode);
                                                                    } else {
                                                                        newEditable = newEditable.filter(
                                                                            (f) => f !== record.fieldCode
                                                                        );
                                                                    }

                                                                    return {
                                                                        ...prev,
                                                                        [module.code]: {
                                                                            ...modulePolicy,
                                                                            visible_fields: newVisible,
                                                                            editable_fields: newEditable,
                                                                        },
                                                                    };
                                                                });
                                                            }}
                                                        />
                                                    );
                                                },
                                            },
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
