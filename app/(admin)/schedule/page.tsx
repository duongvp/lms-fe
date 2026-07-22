"use client";
import React, { useState, useEffect } from "react";
import CustomTable from "@/components/ui/Table";
import type { ColumnsType } from "antd/es/table";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import { notification, Form, Input, Select, Button, Space, Card, Radio, Modal } from "antd";
import { EditOutlined, SaveOutlined, CloseOutlined, DeleteOutlined, CalendarOutlined } from "@ant-design/icons";
import FilterProductDrawer from "./components/FilterProductDrawer";
import ImportProductModal from "./components/Modal/ImportProductModal";
import PrintBarcodeModal from "@/components/shared/PrintBarcodeModal";
import ScheduleModal from "./components/Modal/ScheduleModal";
import { useAuthStore } from "@/stores/authStore";
import GenericExportButton from "@/components/shared/GenericExportButton";
import { PermissionKey } from "@/types/permissions";
import { exportProducts } from "@/services/productService";
import { getLivestreams, updateLivestreamBulk } from "@/services/livestreamService";
import dayjs from "dayjs";
import BulkEditModal from "./components/Modal/BulkEditModal";


// Define Schedule Data Type
interface ScheduleDataType {
    key: string;
    class_code: string;
    class_name: string;
    date: string;
    time: string;
    room: string;
    subject: string;
    teacher: string;
    system: string;
    status: string;
}

// Role configurations and field policies (matching permision.md requirements)
const ROLES = [
    { code: "admin", name: "Quản trị viên" },
    { code: "teacher", name: "Giảng viên" },
    { code: "tutor", name: "Trợ giảng" },
    { code: "student", name: "Học viên" },
];

const FIELD_POLICIES: Record<string, { visible_fields: string[]; editable_fields: string[] }> = {
    admin: {
        visible_fields: ["class_code", "class_name", "date", "time", "room", "subject", "teacher", "system", "status"],
        editable_fields: ["class_code", "class_name", "date", "time", "room", "subject", "teacher", "system", "status"],
    },
    teacher: {
        visible_fields: ["class_code", "class_name", "date", "time", "room", "subject", "teacher", "status"],
        editable_fields: ["room", "subject", "teacher", "status"],
    },
    tutor: {
        visible_fields: ["class_name", "date", "time", "room", "subject", "teacher"],
        editable_fields: ["room", "teacher"],
    },
    student: {
        visible_fields: ["class_name", "date", "time", "room", "subject"],
        editable_fields: [],
    },
};

const FIELD_LABELS: Record<string, string> = {
    class_code: "Mã lớp",
    class_name: "Tên lớp",
    date: "Ngày học",
    time: "Giờ học",
    room: "Phòng học",
    subject: "Môn học",
    teacher: "Giáo viên",
    system: "Hệ thống",
    status: "Trạng thái",
};

const MOCK_SCHEDULES: ScheduleDataType[] = [];

const Page = () => {
    const [data, setData] = useState<ScheduleDataType[]>(MOCK_SCHEDULES);
    const [filteredData, setFilteredData] = useState<ScheduleDataType[]>(MOCK_SCHEDULES);
    const [searchText, setSearchText] = useState("");
    const [currentRole, setCurrentRole] = useState<string>("admin");
    const [editingKey, setEditingKey] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [form] = Form.useForm();
    const [api, contextHolder] = notification.useNotification();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [openBulkEditModal, setOpenBulkEditModal] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [selectedRecord, setSelectedRecord] = useState<ScheduleDataType | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    // Cấu hình Checkbox cho Bảng (Antd Row Selection)
    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys: React.Key[]) => {
            setSelectedRowKeys(newSelectedRowKeys);
        },
    };

    // Hàm mở modal để dời lịch (Sửa)
    const handleReschedule = (record: ScheduleDataType) => {
        setSelectedRecord(record);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const fetchData = async (page = 1, limit = 10, search = "") => {
        try {
            setLoading(true);
            const response: any = await getLivestreams({ page, limit, code: search });
            if (response && response.data) {
                const mappedData: ScheduleDataType[] = response.data.data.map((item: any) => ({
                    key: item.id?.toString() || item.key,
                    class_code: item.code,
                    class_name: item.class_name || item.code,
                    date: dayjs(item.start_time).format('YYYY-MM-DD'),
                    time: `${dayjs(item.start_time).format('HH:mm')} - ${dayjs(item.end_time).format('HH:mm')}`,
                    room: item.room || 'Phòng Online',
                    subject: item.lesson_name || `Bài ${item.learn_number}`,
                    teacher: item.teacher,
                    system: item.system_type,
                    status: item.lesson_status === 1 ? 'Nghỉ học' : (item.lesson_status === 0 ? 'Chưa bắt đầu' : 'Đang diễn ra'),
                }));
                setData(mappedData);
                setFilteredData(mappedData);
                setTotalItems(response.total || 0);
            } else {
                setData(MOCK_SCHEDULES);
                setFilteredData(MOCK_SCHEDULES);
            }
        } catch (error) {
            console.error("Failed to fetch schedules:", error);
            setData(MOCK_SCHEDULES);
            setFilteredData(MOCK_SCHEDULES);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(currentPage, pageSize, searchText);
    }, [currentPage, pageSize]);


    const [openImportModal, setOpenImportModal] = useState(false);
    const [openFilterDrawer, setOpenFilterDrawer] = useState(false);
    const [openPrintModal, setOpenPrintModal] = useState(false);
    const { warehouseId } = useAuthStore((state) => state.user)
    const [filters, setFilters] = useState<any>({ warehouse_id: warehouseId });
    const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
    const hasPermission = useAuthStore(state => state.hasPermission);
    const [allSelectedRows, setAllSelectedRows] = useState<any[]>([]);


    const handleFilterOrder = (values: any) => {
        setFilters({ search: filters.search, ...values });
    };

    const handleImportClick = () => setOpenImportModal(true);


    const handlePrintBtn = () => {
        setSelectedProducts(allSelectedRows.map(row => ({
            id: row.product_id,
            code: row.product_code,
            name: row.product_name,
            quantity: row.stock || 1,
            price: row.selling_price,
        })));
        setOpenPrintModal(true);
    }


    const isEditing = (record: ScheduleDataType) => record.key === editingKey;

    // Handle search filter locally
    const handleSearch = async (value: string) => {
        setSearchText(value);
        setCurrentPage(1);
        fetchData(1, pageSize, value);
    };

    const handleAddBtn = () => {
        const activePolicy = FIELD_POLICIES[currentRole] || FIELD_POLICIES.admin;
        if (activePolicy.editable_fields.length === 0) {
            api.warning({
                message: "Không có quyền",
                description: "Vai trò hiện tại không có quyền chỉnh sửa/thêm dữ liệu.",
            });
            return;
        }
        setIsModalOpen(true);
        setIsEditMode(false)
    };

    const handleModalSuccess = (values: any) => {
        fetchData(currentPage, pageSize, searchText);
        api.success({
            message: "Cập nhật thành công",
            description: "Đã cập nhật danh sách lịch học.",
        });
    };

    const edit = (record: ScheduleDataType) => {
        form.setFieldsValue({ ...record });
        setEditingKey(record.key);
    };

    const cancel = () => {
        setEditingKey("");
    };

    const handleDelete = (key: string) => {
        Modal.confirm({
            title: 'Xác nhận xóa',
            content: 'Bạn có chắc chắn muốn xóa lịch học này không?',
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: () => {
                const newData = data.filter(item => item.key !== key);
                setData(newData);
                api.success({
                    message: "Xóa thành công",
                    description: "Đã xóa lịch học khỏi danh sách.",
                });
            }
        });
    };

    const save = async (key: string) => {
        try {
            const row = await form.validateFields();
            const newData = [...data];
            const index = newData.findIndex((item) => key === item.key);
            if (index > -1) {
                const item = newData[index];
                newData.splice(index, 1, {
                    ...item,
                    ...row,
                });
                setData(newData);
                setEditingKey("");
                api.success({
                    message: "Cập nhật thành công",
                    description: "Đã lưu thay đổi nhanh của dòng.",
                });
            }
        } catch (errInfo) {
            console.log("Validate Failed:", errInfo);
            api.error({
                message: "Lỗi kiểm tra dữ liệu",
                description: "Vui lòng kiểm tra lại các trường thông tin.",
            });
        }
    };

    // Build dynamic columns based on field visibility and edit policies
    const activePolicy = FIELD_POLICIES[currentRole] || FIELD_POLICIES.admin;
    const visibleFields = activePolicy.visible_fields;
    const editableFields = activePolicy.editable_fields;

    const columns: ColumnsType<ScheduleDataType> = visibleFields.map((fieldCode) => {
        return {
            title: FIELD_LABELS[fieldCode] || fieldCode,
            dataIndex: fieldCode,
            key: fieldCode,
            render: (text: any, record: ScheduleDataType) => {
                const editing = isEditing(record);
                const editable = editableFields.includes(fieldCode);

                if (editing && editable) {
                    if (fieldCode === "room") {
                        return (
                            <Form.Item
                                name={fieldCode}
                                style={{ margin: 0 }}
                                rules={[{ required: true, message: "Chọn phòng học!" }]}
                            >
                                <Select size="small" style={{ width: 130 }} options={[
                                    { value: "Phòng 101", label: "Phòng 101" },
                                    { value: "Phòng 102", label: "Phòng 102" },
                                    { value: "Phòng 204", label: "Phòng 204" },
                                    { value: "Phòng Lab A", label: "Phòng Lab A" },
                                ]} />
                            </Form.Item>
                        );
                    }
                    if (fieldCode === "teacher") {
                        return (
                            <Form.Item
                                name={fieldCode}
                                style={{ margin: 0 }}
                                rules={[{ required: true, message: "Chọn giáo viên!" }]}
                            >
                                <Select size="small" style={{ width: 140 }} options={[
                                    { value: "Nguyễn Văn A", label: "Nguyễn Văn A" },
                                    { value: "Trần Thị B", label: "Trần Thị B" },
                                    { value: "Lê Hoàng C", label: "Lê Hoàng C" },
                                    { value: "Phạm Thảo D", label: "Phạm Thảo D" },
                                ]} />
                            </Form.Item>
                        );
                    }
                    if (fieldCode === "status") {
                        return (
                            <Form.Item
                                name={fieldCode}
                                style={{ margin: 0 }}
                                rules={[{ required: true, message: "Chọn trạng thái!" }]}
                            >
                                <Select size="small" style={{ width: 130 }} options={[
                                    { value: "Chưa bắt đầu", label: "Chưa bắt đầu" },
                                    { value: "Đang diễn ra", label: "Đang diễn ra" },
                                    { value: "Đã kết thúc", label: "Đã kết thúc" },
                                ]} />
                            </Form.Item>
                        );
                    }
                    if (fieldCode === "date") {
                        return (
                            <Form.Item
                                name={fieldCode}
                                style={{ margin: 0 }}
                                rules={[{ required: true, message: "Nhập ngày học!" }]}
                            >
                                <Input size="small" type="date" style={{ width: 140 }} />
                            </Form.Item>
                        );
                    }
                    return (
                        <Form.Item
                            name={fieldCode}
                            style={{ margin: 0 }}
                            rules={[{ required: true, message: `Nhập ${FIELD_LABELS[fieldCode]}!` }]}
                        >
                            <Input size="small" style={{ width: 150 }} />
                        </Form.Item>
                    );
                }

                // If not editing or not editable, display plain text
                return <span>{text}</span>;
            },
        };
    });

    // Append Action columns if role has edit permissions
    if (editableFields.length > 0) {
        columns.push({
            title: "Thao tác",
            key: "action",
            fixed: "right",
            width: 150,
            render: (_: any, record: ScheduleDataType) => {
                const editing = isEditing(record);
                return editing ? (
                    <Space>
                        <Button
                            type="primary"
                            onClick={() => save(record.key)}
                            icon={<SaveOutlined />}
                            size="small"
                        >
                            Lưu
                        </Button>
                        <Button
                            onClick={cancel}
                            icon={<CloseOutlined />}
                            size="small"
                        >
                            Hủy
                        </Button>
                    </Space>
                ) : (
                    <Space>
                        <Button
                            type="link"
                            disabled={editingKey !== ""}
                            onClick={() => handleReschedule(record)}
                            icon={<CalendarOutlined />}
                            size="small"
                        >
                            Dời lịch
                        </Button>
                        <Button
                            type="link"
                            disabled={editingKey !== ""}
                            onClick={() => edit(record)}
                            icon={<EditOutlined />}
                            size="small"
                        >
                            Sửa nhanh
                        </Button>
                        <Button
                            type="text"
                            danger
                            disabled={editingKey !== ""}
                            onClick={() => handleDelete(record.key)}
                            icon={<DeleteOutlined />}
                            size="small"
                        >
                            Xóa
                        </Button>
                    </Space>
                );
            },
        });
    }

    return (
        <>
            {contextHolder}

            {/* Simulation Header and Control */}
            <Card
                title={<span style={{ fontWeight: 600, fontSize: 16 }}>Mô phỏng Phân quyền Cấp trường (Field-Level Permissions)</span>}
                style={{ marginBottom: 16, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                styles={{ body: { padding: '12px 24px' } }}
            >
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div>
                        <span style={{ fontWeight: 500, marginRight: 12 }}>Chọn vai trò thử nghiệm:</span>
                        <Radio.Group
                            value={currentRole}
                            onChange={(e) => {
                                setCurrentRole(e.target.value);
                                setEditingKey(""); // Reset editing
                            }}
                            buttonStyle="solid"
                        >
                            {ROLES.map(role => (
                                <Radio.Button key={role.code} value={role.code}>
                                    {role.name}
                                </Radio.Button>
                            ))}
                        </Radio.Group>
                    </div>
                    <div style={{ background: '#f5f5f5', padding: '10px 16px', borderRadius: 6, fontSize: 13, border: '1px solid #e8e8e8' }}>
                        <div style={{ marginBottom: 6 }}>
                            <strong style={{ color: '#1890ff' }}>Cột được phép xem:</strong>{" "}
                            {visibleFields.map(f => FIELD_LABELS[f]).join(', ')}
                        </div>
                        <div>
                            <strong style={{ color: '#52c41a' }}>Trường được phép chỉnh sửa:</strong>{" "}
                            {editableFields.length > 0
                                ? editableFields.map(f => FIELD_LABELS[f]).join(', ')
                                : <span style={{ color: '#ff4d4f', fontStyle: 'italic' }}>Không có trường nào (Chỉ xem)</span>
                            }
                        </div>
                    </div>
                </Space>
            </Card>

            <SearchAndActionsBar
                onSearch={handleSearch}
                placeholder="Tìm kiếm theo mã lớp, tên lớp, giáo viên, phòng học..."
                handleAddBtn={!hasPermission(PermissionKey.PRODUCT_CREATE) ? handleAddBtn : undefined}
                handleFilterBtn={() => setOpenFilterDrawer(true)}
                handleImportClick={!hasPermission(PermissionKey.PRODUCT_IMPORT) ? handleImportClick : undefined}
                extraExportButton={
                    !hasPermission(PermissionKey.PRODUCT_EXPORT) && (
                        <>
                            <GenericExportButton
                                exportService={exportProducts}
                                serviceParams={[[], warehouseId, filters]}
                                fileNamePrefix="Danh_sach_san_pham"
                            />
                            <Button
                                type="primary"
                                icon={<EditOutlined />}
                                onClick={() => setOpenBulkEditModal(true)}

                            >
                                Sửa hàng loạt
                            </Button>
                        </>
                    )
                }
            />

            <Form form={form} component={false}>
                <CustomTable<ScheduleDataType>
                    columns={columns}
                    dataSource={filteredData}
                    loading={loading}
                    rowSelection={rowSelection}
                    pagination={{
                        current: currentPage,
                        pageSize: pageSize,
                        total: totalItems,
                        showSizeChanger: true,
                        position: ["bottomRight"],
                        onChange: (page, size) => {
                            setCurrentPage(page);
                            setPageSize(size);
                        }
                    }}
                    scroll={{ x: "max-content" }}
                />
                <FilterProductDrawer open={openFilterDrawer} onClose={() => { setOpenFilterDrawer(false) }} handleSearch={handleFilterOrder} />
                <ImportProductModal
                    open={openImportModal}
                    onClose={() => setOpenImportModal(false)}
                />
                <ScheduleModal
                    open={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleModalSuccess}
                    isEdit={isEditMode}
                    initialData={selectedRecord}
                />
                <PrintBarcodeModal open={openPrintModal} onClose={() => setOpenPrintModal(false)} initialData={selectedProducts} />
                {/* Modal Sửa Hàng Loạt */}
                <BulkEditModal
                    open={openBulkEditModal}
                    selectedRowKeys={selectedRowKeys}
                    onClose={() => setOpenBulkEditModal(false)}
                    onSuccess={async (modalPayload) => {
                        try {
                            // 1. Xác định mảng ID cần cập nhật dựa vào Rule của Modal
                            let targetIds: (string | number)[] = [];

                            if (modalPayload.scope.type === 'selected_rows') {
                                targetIds = modalPayload.scope.selected_lessons;
                            } else {
                                // Lọc data dựa vào `learn_number`
                                let filteredData = [...data];

                                if (modalPayload.scope.type === 'from_to_end') {
                                    filteredData = filteredData.filter(item => item.learn_number >= modalPayload.scope.start_lesson);
                                } else if (modalPayload.scope.type === 'range') {
                                    filteredData = filteredData.filter(item =>
                                        item.learn_number >= modalPayload.scope.start_lesson &&
                                        item.learn_number <= modalPayload.scope.end_lesson
                                    );
                                } else if (modalPayload.scope.type === 'pattern') {
                                    filteredData = filteredData.filter(item =>
                                        modalPayload.scope.pattern_type === 'even'
                                            ? item.learn_number % 2 === 0
                                            : item.learn_number % 2 !== 0
                                    );
                                }
                                targetIds = filteredData.map(item => item.key);
                            }

                            if (targetIds.length === 0) {
                                api.warning({ message: "Cảnh báo", description: "Không tìm thấy bài học nào phù hợp với điều kiện để cập nhật!" });
                                return;
                            }

                            // 2. Chuẩn bị payload chuẩn gửi cho Backend
                            let update_data: any = {};

                            if (modalPayload.config_mode === 'common') {
                                update_data = {
                                    teacher: modalPayload.common_config.teacher,
                                    room: modalPayload.common_config.room,
                                    start_time: modalPayload.common_config.start_time,
                                    end_time: modalPayload.common_config.end_time,
                                };
                            } else if (modalPayload.config_mode === 'separate') {
                                update_data = targetIds.map(id => {
                                    const config = modalPayload.separate_config?.[id] || {};
                                    return {
                                        id: id,
                                        teacher: config.teacher,
                                        room: config.room,
                                        start_time: config.start_time,
                                        end_time: config.end_time,
                                    }
                                });
                            }

                            const apiPayload = {
                                ids: targetIds,
                                config_mode: modalPayload.config_mode,
                                update_data: update_data
                            };

                            // 3. Gọi Service API
                            await updateLivestreamBulk(apiPayload);

                            api.success({ message: "Thành công", description: `Đã cập nhật hàng loạt ${targetIds.length} bài học.` });

                            // Reset state & Reload bảng
                            setSelectedRowKeys([]);
                            fetchData(currentPage, pageSize, searchText);

                        } catch (error: any) {
                            console.error(error);
                            api.error({ message: "Cập nhật thất bại", description: error.message || "Đã xảy ra lỗi" });
                        }
                    }}
                />
            </Form>
        </>
    );
};

export default Page;
