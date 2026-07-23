"use client";
import React, { useState, useEffect, useCallback } from "react";
import CustomTable from "@/components/ui/Table";
import type { ColumnsType } from "antd/es/table";
import type { SorterResult } from "antd/es/table/interface";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import { notification, Form, Input, Select, Button, Space, Modal, Row, Col, DatePicker, Drawer, Grid } from "antd";
import { EditOutlined, SaveOutlined, CloseOutlined, DeleteOutlined, CalendarOutlined } from "@ant-design/icons";
import ScheduleModal from "./components/Modal/ScheduleModal";
import { useAuthStore } from "@/stores/authStore";
import { PermissionKey } from "@/types/permissions";
import { getLivestreams, updateLivestreamBulk } from "@/services/livestreamService";
import dayjs, { Dayjs } from "dayjs";
import BulkEditModal from "./components/Modal/BulkEditModal";
import { getModuleFields } from "@/services/roleService";
import type { ModuleField, ResolvedFieldPermission } from "@/types/fieldPolicy";
import { canEditAnyField, resolveModuleFieldPermissions, sanitizeEditablePayload } from "@/helper/fieldPolicy";

const SCHEDULE_MODULE_CODE = "calendar";
const { RangePicker } = DatePicker;

// Define Schedule Data Type
interface ScheduleDataType {
    key: string;
    id?: string;
    code?: string;
    subject?: string;
    teacher?: string;
    end_time?: string;
    start_time?: string;
    lesson_link?: string;
    lesson_name?: string;
    learn_number?: number;
    lesson_status?: string;
    system_type?: string;
    class_name?: string;
    room?: string;
    [key: string]: any;
}

interface ScheduleFilterValues {
    keyword?: string;
    code?: string;
    teacher?: string;
    lesson_status?: string | number;
    date_range?: [Dayjs, Dayjs];
}

interface ScheduleSortState {
    sort_by?: string;
    sort_order?: "ascend" | "descend";
}

const DEFAULT_MODULE_FIELDS: ModuleField[] = [
    { fieldCode: "code", fieldLabel: "Mã lớp", fieldType: "text", sortOrder: 1 },
    { fieldCode: "lesson_name", fieldLabel: "Tên bài học", fieldType: "text", sortOrder: 2 },
    { fieldCode: "learn_number", fieldLabel: "Buổi học", fieldType: "number", sortOrder: 3 },
    { fieldCode: "subject", fieldLabel: "Môn học", fieldType: "text", sortOrder: 4 },
    { fieldCode: "teacher", fieldLabel: "Giáo viên", fieldType: "text", sortOrder: 5 },
    { fieldCode: "start_time", fieldLabel: "Bắt đầu", fieldType: "date", sortOrder: 6 },
    { fieldCode: "end_time", fieldLabel: "Kết thúc", fieldType: "date", sortOrder: 7 },
    { fieldCode: "lesson_link", fieldLabel: "Link học", fieldType: "text", sortOrder: 8 },
];

const MOCK_SCHEDULES: ScheduleDataType[] = [];
const SORTABLE_FIELDS = new Set([
    "code",
    "learn_number",
    "subject",
    "teacher",
    "start_time",
    "end_time",
    "lesson_status",
    "system_type",
]);

const cleanFilterValues = (values: ScheduleFilterValues): ScheduleFilterValues => {
    const cleaned: ScheduleFilterValues = {};

    Object.entries(values).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        if (Array.isArray(value) && value.length === 0) return;
        (cleaned as any)[key] = typeof value === "string" ? value.trim() : value;
    });

    return cleaned;
};

const buildScheduleApiParams = (values: ScheduleFilterValues) => {
    const cleaned = cleanFilterValues(values);
    const { date_range, ...rest } = cleaned;

    return {
        ...rest,
        start_time: date_range?.[0]?.startOf("day").toISOString(),
        end_time: date_range?.[1]?.endOf("day").toISOString(),
    };
};

const lessonStatusText = (status?: number | null) => {
    if (status === 1) return "Nghỉ học";
    if (status === 2) return "Đang diễn ra";
    return "Chưa bắt đầu";
};

const ScheduleFilterSidebar = ({
    value,
    loading,
    onSearch,
    onReset,
}: {
    value: ScheduleFilterValues;
    loading: boolean;
    onSearch: (values: ScheduleFilterValues) => void;
    onReset: () => void;
}) => {
    const [filterForm] = Form.useForm();

    useEffect(() => {
        filterForm.setFieldsValue(value);
    }, [filterForm, value]);

    const handleReset = () => {
        filterForm.resetFields();
        onReset();
    };

    return (
        <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 16, background: "#fff" }}>
            <Form form={filterForm} layout="vertical" onFinish={(values) => onSearch(cleanFilterValues(values))}>
                <Form.Item name="code" label="Mã lớp">
                    <Input allowClear placeholder="VD: TOPC01" />
                </Form.Item>
                <Form.Item name="teacher" label="Giáo viên">
                    <Input allowClear placeholder="Tên giáo viên" />
                </Form.Item>
                <Form.Item name="lesson_status" label="Trạng thái buổi học">
                    <Select
                        allowClear
                        placeholder="Tất cả trạng thái"
                        options={[
                            { value: 0, label: "Chưa bắt đầu" },
                            { value: 2, label: "Đang diễn ra" },
                            { value: 1, label: "Nghỉ học" },
                        ]}
                    />
                </Form.Item>
                <Form.Item name="date_range" label="Khoảng ngày">
                    <RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                </Form.Item>
                <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                    <Button onClick={handleReset}>Reset</Button>
                    <Button type="primary" htmlType="submit" loading={loading}>Search</Button>
                </Space>
            </Form>
        </div>
    );
};

const Page = () => {
    const [data, setData] = useState<ScheduleDataType[]>(MOCK_SCHEDULES);
    const [filteredData, setFilteredData] = useState<ScheduleDataType[]>(MOCK_SCHEDULES);
    const [searchText, setSearchText] = useState("");
    const [editingKey, setEditingKey] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [moduleFields, setModuleFields] = useState<ModuleField[]>(DEFAULT_MODULE_FIELDS);
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
    const [filterValues, setFilterValues] = useState<ScheduleFilterValues>({});
    const [sortState, setSortState] = useState<ScheduleSortState>({});
    const screens = Grid.useBreakpoint();
    const isDesktop = Boolean(screens.lg);

    const fetchData = useCallback(async (
        page = 1,
        limit = 10,
        filtersValue: ScheduleFilterValues = {},
        sorter: ScheduleSortState = {}
    ) => {
        try {
            setLoading(true);
            const response: any = await getLivestreams({
                page,
                limit,
                ...buildScheduleApiParams(filtersValue),
                sort_by: sorter.sort_by,
                sort_order: sorter.sort_by ? (sorter.sort_order === "descend" ? "desc" : "asc") : undefined,
            });
            if (response && response.data) {
                const mappedData: ScheduleDataType[] = response.data.data.map((item: any) => ({
                    key: item.id?.toString() || item.key,
                    id: item.id?.toString(),
                    code: item.code,
                    class_name: item.class_name || item.code,
                    start_time: item.start_time ? dayjs(item.start_time).format('YYYY-MM-DDTHH:mm') : "",
                    end_time: item.end_time ? dayjs(item.end_time).format('YYYY-MM-DDTHH:mm') : "",
                    room: item.room || item.channel_name || 'Phòng Online',
                    subject: item.subject || item.lesson_name || `Bài ${item.learn_number}`,
                    lesson_name: item.lesson_name || `Bài ${item.learn_number}`,
                    learn_number: item.learn_number,
                    lesson_link: item.lesson_link || item.link || "",
                    teacher: item.teacher,
                    system_type: item.system_type,
                    lesson_status: lessonStatusText(item.lesson_status),
                }));
                setData(mappedData);
                setFilteredData(mappedData);
                setTotalItems(response.data.total || 0);
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
    }, []);

    useEffect(() => {
        fetchData(currentPage, pageSize, filterValues, sortState);
    }, [currentPage, pageSize, filterValues, sortState, fetchData]);

    useEffect(() => {
        const fetchModuleFields = async () => {
            try {
                const moduleStructure = await getModuleFields(SCHEDULE_MODULE_CODE);
                if (moduleStructure?.fields?.length) {
                    setModuleFields(
                        [...moduleStructure.fields].sort(
                            (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
                        )
                    );
                }
            } catch (error) {
                console.error("Không thể tải ModuleField calendar:", error);
                api.warning({
                    message: "Không thể tải cấu hình cột",
                    description: "Đang dùng cấu hình lịch học mặc định.",
                });
            }
        };

        fetchModuleFields();
    }, [api]);

    const [openFilterDrawer, setOpenFilterDrawer] = useState(false);
    const { fieldPolicy } = useAuthStore((state) => state.user)
    const hasPermission = useAuthStore(state => state.hasPermission);
    const canCreateSchedule = hasPermission(PermissionKey.SCHEDULE_CREATE);
    const canEditSchedule = hasPermission(PermissionKey.SCHEDULE_EDIT);
    const canDeleteSchedule = hasPermission(PermissionKey.SCHEDULE_DELETE);


    const isEditing = (record: ScheduleDataType) => record.key === editingKey;

    // Handle search filter locally
    const handleSearch = async (value: string) => {
        setSearchText(value);
        setFilterValues((prev) => cleanFilterValues({ ...prev, keyword: value }));
        setCurrentPage(1);
    };

    const handleScheduleFilter = (values: ScheduleFilterValues) => {
        setFilterValues(cleanFilterValues({ ...values, keyword: searchText }));
        setCurrentPage(1);
        setOpenFilterDrawer(false);
    };

    const handleResetScheduleFilter = () => {
        setFilterValues(cleanFilterValues({ keyword: searchText }));
        setCurrentPage(1);
        setOpenFilterDrawer(false);
    };

    const handleAddBtn = () => {
        if (!canCreateSchedule) {
            api.warning({
                message: "Không có quyền",
                description: "Vai trò hiện tại không có quyền thêm lịch học.",
            });
            return;
        }

        if (!canEditAnyField(moduleFields, fieldPolicy, SCHEDULE_MODULE_CODE)) {
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
        fetchData(currentPage, pageSize, filterValues, sortState);
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
                const sanitizedRow = sanitizeEditablePayload(
                    row,
                    moduleFields,
                    fieldPolicy,
                    SCHEDULE_MODULE_CODE
                );

                if (Object.keys(sanitizedRow).length === 0) {
                    api.warning({
                        message: "Không có quyền",
                        description: "Không có trường nào trong dòng này được phép chỉnh sửa.",
                    });
                    return;
                }

                newData.splice(index, 1, {
                    ...item,
                    ...sanitizedRow,
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

    const fieldPermissions: ResolvedFieldPermission[] = resolveModuleFieldPermissions(
        moduleFields,
        fieldPolicy,
        SCHEDULE_MODULE_CODE
    );
    const visibleFieldPermissions = fieldPermissions.filter((item) => item.visible);
    const editableFieldCodes = fieldPermissions
        .filter((item) => item.editable)
        .map((item) => item.field.fieldCode);

    // Build dynamic columns based on ModuleField and fieldPolicy from current role.
    const columns: ColumnsType<ScheduleDataType> = visibleFieldPermissions.map(({ field }) => {
        const fieldCode = field.fieldCode;
        return {
            title: field.fieldLabel || fieldCode,
            dataIndex: fieldCode,
            key: fieldCode,
            sorter: SORTABLE_FIELDS.has(fieldCode),
            sortOrder: sortState.sort_by === fieldCode ? sortState.sort_order : undefined,
            render: (text: any, record: ScheduleDataType) => {
                const editing = isEditing(record);
                const editable = editableFieldCodes.includes(fieldCode);

                if (editing && editable) {
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
                    if (fieldCode === "lesson_status") {
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
                    if (fieldCode === "start_time" || fieldCode === "end_time") {
                        return (
                            <Form.Item
                                name={fieldCode}
                                style={{ margin: 0 }}
                                rules={[{ required: true, message: `Nhập ${field.fieldLabel}!` }]}
                            >
                                <Input size="small" type="datetime-local" style={{ width: 180 }} />
                            </Form.Item>
                        );
                    }
                    return (
                        <Form.Item
                            name={fieldCode}
                            style={{ margin: 0 }}
                            rules={[{ required: true, message: `Nhập ${field.fieldLabel || fieldCode}!` }]}
                        >
                            <Input size="small" style={{ width: 150 }} />
                        </Form.Item>
                    );
                }

                if ((fieldCode === "start_time" || fieldCode === "end_time") && text) {
                    return <span>{dayjs(text).format('YYYY-MM-DD HH:mm')}</span>;
                }

                // If not editing or not editable, display plain text
                return <span>{text}</span>;
            },
        };
    });

    // Append Action columns if role has edit permissions
    if ((canEditSchedule && editableFieldCodes.length > 0) || canDeleteSchedule) {
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
                        {canEditSchedule && editableFieldCodes.length > 0 && (
                            <>
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
                            </>
                        )}
                        {canDeleteSchedule && (
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
                        )}
                    </Space>
                );
            },
        });
    }

    return (
        <>
            {contextHolder}

            <SearchAndActionsBar
                onSearch={handleSearch}
                placeholder="Tìm kiếm theo mã lớp, tên lớp, giáo viên, phòng học..."
                handleAddBtn={canCreateSchedule ? handleAddBtn : undefined}
                handleFilterBtn={() => setOpenFilterDrawer(true)}
                extraExportButton={
                    canEditSchedule && (
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={() => setOpenBulkEditModal(true)}
                        >
                            Sửa hàng loạt
                        </Button>
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
                            onChange={(_, __, sorter, extra) => {
                                if (extra.action !== "sort") return;
                                const activeSorter = Array.isArray(sorter)
                                    ? sorter[0]
                                    : sorter as SorterResult<ScheduleDataType>;
                                setSortState({
                                    sort_by: activeSorter?.field ? String(activeSorter.field) : undefined,
                                    sort_order: activeSorter?.order || undefined,
                                });
                                setCurrentPage(1);
                            }}
                            scroll={{ x: "max-content" }}
                        />
                <Drawer
                    title="Bộ lọc lịch học"
                    placement="right"
                    open={openFilterDrawer}
                    onClose={() => setOpenFilterDrawer(false)}
                    width={360}
                >
                    <ScheduleFilterSidebar
                        value={filterValues}
                        loading={loading}
                        onSearch={handleScheduleFilter}
                        onReset={handleResetScheduleFilter}
                    />
                </Drawer>
                <ScheduleModal
                    open={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={handleModalSuccess}
                    isEdit={isEditMode}
                    initialData={selectedRecord}
                    moduleFields={moduleFields}
                    fieldPolicy={fieldPolicy}
                    moduleCode={SCHEDULE_MODULE_CODE}
                />
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
                                    filteredData = filteredData.filter(item => Number(item.learn_number ?? 0) >= modalPayload.scope.start_lesson);
                                } else if (modalPayload.scope.type === 'range') {
                                    filteredData = filteredData.filter(item =>
                                        Number(item.learn_number ?? 0) >= modalPayload.scope.start_lesson &&
                                        Number(item.learn_number ?? 0) <= modalPayload.scope.end_lesson
                                    );
                                } else if (modalPayload.scope.type === 'pattern') {
                                    filteredData = filteredData.filter(item =>
                                        modalPayload.scope.pattern_type === 'even'
                                            ? Number(item.learn_number ?? 0) % 2 === 0
                                            : Number(item.learn_number ?? 0) % 2 !== 0
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
                            fetchData(currentPage, pageSize, filterValues, sortState);

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
