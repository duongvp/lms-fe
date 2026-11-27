"use client";
import styles from './RoleModal.module.css';
import ApprovalPolicyEditor from '@/components/approval-policy/ApprovalPolicyEditor';
import {useAuthStore} from '@/stores/authStore';
import {refreshApprovalViews} from '@/services/calendarApprovalService';
import useSWR from 'swr';
import {getApprovalPolicyModules,type ApprovalModule,type ModulePolicyMap} from '@/services/approvalPolicyService';
import Table from "@/components/ui/ModalTable";
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
    Alert,
    Skeleton,
    TableProps,
} from "antd";
import React, { useEffect, useState, useCallback, useRef } from "react";
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
    const hasPermission=useAuthStore(s=>s.hasPermission);
    const userId=useAuthStore(s=>s.user.userId),session=useAuthStore(s=>s.authSessionVersion);
    const {data:policyModules,error:policyError,isLoading:policyLoading,mutate:reloadPolicyModules}=useSWR(modal.open?['approval-policy-modules',userId,session]:null,getApprovalPolicyModules);
    const supportedModules:ApprovalModule[]=policyModules?.data||[];
    const canManagePolicy=supportedModules.some(module=>hasPermission(module.managePermission));
    const [approvalPolicy,setApprovalPolicy]=useState<ModulePolicyMap>({});
    useEffect(()=>{if(modal.open)setApprovalPolicy(modal.role?.approvalPolicy||{});},[modal.open,modal.role]);
    const [loadingModalVisible, setLoadingModalVisible] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<{ [key: string]: boolean }>({});
    const [checkedGroups, setCheckedGroups] = useState<{ [key: string]: string[] }>({});
    const [fieldPolicy, setFieldPolicy] = useState<FieldPolicyFE>({});
    const [modulesStructure, setModulesStructure] = useState<ModuleStructure[]>([]);
    const [permissionsStructure, setPermissionsStructure] = useState<PermissionStructure>({});
    const [structuresLoaded, setStructuresLoaded] = useState(false);
    const [structuresError, setStructuresError] = useState<string | null>(null);

    // 🆕 Fetch ngầm ngay khi component mount lần đầu
    const hasFetchedInitially = useRef(false);

    useEffect(() => {
        if (hasFetchedInitially.current) return; // Chỉ fetch 1 lần duy nhất
        hasFetchedInitially.current = true;

        const fetchStructures = async () => {
            try {
                setStructuresLoaded(false);
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
                setModulesStructure(modulesArray);

                // Permissions
                let permissionsObj: PermissionStructure = {};
                if (typeof permissionsResponse === "object" && !Array.isArray(permissionsResponse)) {
                    permissionsObj = permissionsResponse as PermissionStructure;
                } else {
                    console.warn("Permissions structure không đúng định dạng", permissionsResponse);
                }
                setPermissionsStructure(permissionsObj);
                setStructuresLoaded(true);
                setStructuresError(null);
            } catch (error) {
                console.error("Lỗi lấy cấu trúc phân quyền:", error);
                setStructuresError("Không thể tải cấu trúc phân quyền.");
                setStructuresLoaded(true); // Vẫn set true để không bị treo Skeleton vĩnh viễn
            }
        };

        void fetchStructures();
    }, []); // ⚠️ Dependency rỗng → chỉ chạy 1 lần khi mount

    // Đóng modal, reset state form nhưng giữ nguyên cấu trúc đã load
    const onCloseModal = () => {
        resetModal();
        form.resetFields();
        setCheckedGroups({});
        setExpandedGroups({});
        setFieldPolicy({});
    };

    const toggleGroup = (key: string) => {
        setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
    };

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

    const setModuleFieldPermissions = (
        moduleCode: string,
        fieldCodes: string[],
        permission: 'visible' | 'editable',
        checked: boolean,
    ) => {
        setFieldPolicy((prev) => {
            const modulePolicy = prev[moduleCode] || {
                visible_fields: [],
                editable_fields: [],
            };
            const fieldCodeSet = new Set(fieldCodes);
            let visibleFields = modulePolicy.visible_fields.filter(Boolean);
            let editableFields = modulePolicy.editable_fields.filter(Boolean);

            if (permission === 'visible') {
                visibleFields = checked
                    ? Array.from(new Set([...visibleFields, ...fieldCodes]))
                    : visibleFields.filter((fieldCode) => !fieldCodeSet.has(fieldCode));
                // Không cho phép một field có quyền sửa nhưng không có quyền xem.
                if (!checked) {
                    editableFields = editableFields.filter((fieldCode) => !fieldCodeSet.has(fieldCode));
                }
            } else {
                editableFields = checked
                    ? Array.from(new Set([...editableFields, ...fieldCodes]))
                    : editableFields.filter((fieldCode) => !fieldCodeSet.has(fieldCode));
                if (checked) {
                    visibleFields = Array.from(new Set([...visibleFields, ...fieldCodes]));
                }
            }

            return {
                ...prev,
                [moduleCode]: {
                    visible_fields: visibleFields,
                    editable_fields: editableFields,
                },
            };
        });
    };

    // Khi modal mở với role có sẵn (edit), load dữ liệu role
    useEffect(() => {
        if (
            !modal.open ||
            !modal.role ||
            Object.keys(permissionsStructure).length === 0 ||
            modulesStructure.length === 0
        )
            return;

        form.setFieldsValue({
            roleName: modal.type === ActionType.CREATE
                ? `${modal.role.name} - Bản sao`
                : modal.role.name,
            description: modal.role.description,
        });

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

    const handleFormSubmit = async (values: any) => {
        try {
            setLoadingModalVisible(true);

            const permissions = convertFormPermissionsToApi(form.getFieldValue("permissions") || {});
            const fieldPolicyBE = convertFieldPolicyToBE(fieldPolicy, modulesStructure);

            const roleData = {
                ...(canManagePolicy?{approvalPolicy:Object.fromEntries(supportedModules.filter(module=>hasPermission(module.managePermission)).map(module=>[module.key,approvalPolicy[module.key]||{}]))}:{}),
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
            refreshApprovalViews();
            onCloseModal();
        } catch (error: any) {
            console.error("Lỗi submit:", error);
            showErrorMessage(error?.message || `${modal.title} thất bại!`);
        } finally {
            setLoadingModalVisible(false);
        }
    };

    // Chỉ hiện Skeleton khi chưa load xong VÀ modal đang mở
    if (modal.open && !structuresLoaded) {
        return (
            <Modal className="admin-responsive-modal"
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
            <Modal className="admin-responsive-modal"
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
            <Modal className="admin-responsive-modal"
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
                <div style={{ maxHeight: "calc(100dvh - 220px)", overflowY: "auto", overflowX: "hidden", paddingRight: 8 }}>
                    <Form className="responsive-modal-form" form={form} onFinish={handleFormSubmit} {...formItemLayout} labelAlign="left">
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
                            <Tabs.TabPane tab="Quyền thao tác" key="1">
                                <Title level={5}>Phân quyền thao tác</Title>
                                <Row gutter={[24, 16]}>
                                    {Object.entries(permissionsStructure).map(([groupName, groupItems]) => (
                                        <Col xs={24} lg={12} key={groupName}>
                                            <p style={{ fontWeight: 500, marginBottom: 12 }}>{groupName}</p>
                                            {Object.keys(groupItems).map((itemName) => {
                                                const isExpanded = expandedGroups[itemName] ?? false;
                                                const currentChecked = checkedGroups[itemName] || [];
                                                const itemData = getItemData(itemName);
                                                const approvalOrder=['approval.view','submit_approval','approve','reject','history.view','workflow.manage'];
                                                const choices=(itemData?.actions||[]).map((label,index)=>({label,key:itemData!.keys[index],approvalRank:approvalOrder.indexOf(itemData!.keys[index].split('.').slice(1).join('.'))}));
                                                const permissionSections=[
                                                    {title:'Nghiệp vụ',items:choices.filter(choice=>choice.approvalRank<0)},
                                                    {title:'Phê duyệt',items:choices.filter(choice=>choice.approvalRank>=0).sort((a,b)=>a.approvalRank-b.approvalRank)},
                                                ].filter(section=>section.items.length);

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
                                                                style={{ marginTop: 12, marginLeft: 24 }}
                                                                labelCol={{span:0}} wrapperCol={{span:24}}
                                                            >
                                                                <Checkbox.Group
                                                                    className={styles.permissionGroup}
                                                                    value={currentChecked}
                                                                    onChange={(checked) =>
                                                                        onChildCheck(itemName, checked as string[])
                                                                    }
                                                                >
                                                                    {permissionSections.map(section=><div className={styles.permissionSection} key={section.title}>
                                                                        {permissionSections.length>1&&<div className={styles.permissionSectionTitle}>{section.title}</div>}
                                                                        <div className={styles.permissionChoices}>{section.items.map(choice=><Checkbox key={choice.key} value={choice.label}>{choice.label}</Checkbox>)}</div>
                                                                    </div>)}
                                                                </Checkbox.Group>
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
                                <Collapse defaultActiveKey={modulesStructure.map((m) => m.code)}>
                                    {modulesStructure.map((module) => {
                                        const dataSource = module.fields.map((f) => ({
                                            ...f,
                                            key: f.fieldCode,
                                        }));
                                        const fieldCodes = dataSource.map((field) => field.fieldCode);
                                        const visibleFields = fieldPolicy[module.code]?.visible_fields || [];
                                        const editableFields = fieldPolicy[module.code]?.editable_fields || [];
                                        const visibleCount = fieldCodes.filter((fieldCode) => visibleFields.includes(fieldCode)).length;
                                        const editableCount = fieldCodes.filter((fieldCode) => editableFields.includes(fieldCode)).length;
                                        const isAllVisible = fieldCodes.length > 0 && visibleCount === fieldCodes.length;
                                        const isAllEditable = fieldCodes.length > 0 && editableCount === fieldCodes.length;
                                        const columns: TableProps<any>['columns'] = [
                                            {
                                                title: "Trường dữ liệu",
                                                dataIndex: "fieldLabel",
                                                key: "fieldLabel",
                                                render:(label:string,record:any)=>record.isSelectAll?<Typography.Text style={{color:'#1677ff',fontWeight:600}}>Chọn tất cả</Typography.Text>:label,
                                            },
                                            {
                                                title: "Xem",
                                                key: "view",
                                                align: "center",
                                                width: 100,
                                                render: (_: any, record: any) => {
                                                    if(record.isSelectAll)return <Checkbox aria-label="Chọn tất cả quyền xem" checked={isAllVisible} indeterminate={visibleCount>0&&!isAllVisible} onChange={event=>setModuleFieldPermissions(module.code,fieldCodes,'visible',event.target.checked)}/>;
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
                                                align: "center",
                                                width: 100,
                                                render: (_: any, record: any) => {
                                                    if(record.isSelectAll)return <Checkbox aria-label="Chọn tất cả quyền sửa" checked={isAllEditable} indeterminate={editableCount>0&&!isAllEditable} onChange={event=>setModuleFieldPermissions(module.code,fieldCodes,'editable',event.target.checked)}/>;
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
                                                    dataSource={[{key:'__select_all_fields__',fieldCode:'__select_all_fields__',fieldLabel:'Chọn tất cả',isSelectAll:true},...dataSource]}
                                                    onRow={(record:any)=>record.isSelectAll?{style:{background:'#f3f7ff'}}:{}}
                                                    columns={columns}
                                                    pagination={false}
                                                    size="small"
                                                    scroll={{ x: "max-content" }}
                                                />
                                            </Collapse.Panel>
                                        );
                                    })}
                                </Collapse>
                            </Tabs.TabPane>
                            <Tabs.TabPane tab="Phê duyệt" key="approval">
                                <Alert type="info" showIcon message="Chính sách phê duyệt mặc định theo vai trò" description="Chính sách phê duyệt không thay thế quyền thao tác. Chính sách được cấu hình riêng cho từng thao tác trong từng chức năng quản lý. Khi tài khoản có nhiều vai trò và đang kế thừa cấu hình, chỉ cần một vai trò yêu cầu phê duyệt thì thao tác đó phải được gửi duyệt trước khi áp dụng. Thiết lập riêng của tài khoản được ưu tiên hơn cấu hình từ vai trò." style={{marginBottom:12}}/>
                                {policyError?<Alert type="error" message="Không tải được danh sách chức năng hỗ trợ phê duyệt" action={<Button onClick={()=>void reloadPolicyModules()}>Thử lại</Button>}/>:policyLoading?<Skeleton active/>:supportedModules.length?<ApprovalPolicyEditor mode="role" modules={supportedModules} value={approvalPolicy} onChange={setApprovalPolicy} canEdit={module=>hasPermission(module.managePermission)}/>:<Typography.Text type="secondary">Chưa có chức năng hỗ trợ quy định phê duyệt.</Typography.Text>}
                            </Tabs.TabPane>
                        </Tabs>
                    </Form>
                </div>
            </Modal>
        </>
    );
};

export default RoleModal;
