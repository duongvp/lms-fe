"use client";
import React, { useState, useEffect } from "react";
import CustomTable from "@/components/ui/Table";
import type { ColumnsType } from "antd/es/table";
// import SearchAndActionsBar from "./components/SearchAndActionsBar";
import DecriptionRow from "./components/DecriptionRow";
import useSupplierStore from "@/stores/supplierStore";  // Thay đổi từ customerStore sang supplierStore
import { SupplierApiResponse, exportSuppliers, getSuppliersByPage, importSuppliersFromExcel } from "@/services/supplierService";  // Sử dụng API của nhà cung cấp
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import SupplierModal from "./components/Modal/SupplierModal";  // Thay đổi từ CustomerModal sang SupplierModal
import { ActionType } from "@/enums/action";
import ImportModal from "@/components/shared/ImportModal";
import GenericExportButton from "@/components/shared/GenericExportButton";
import { useAuthStore } from "@/stores/authStore";
import { PermissionKey } from "@/types/permissions";
import { notification } from "antd";

interface Pagination {
    current?: number;
    pageSize?: number;
}

// Đây là kiểu dữ liệu cho Table (thêm key + description)
interface DataType extends SupplierApiResponse {
    key: number;
    description: React.ReactNode;
}

// Columns hiển thị
const columns: ColumnsType<DataType> = [
    {
        title: "Mã nhà cung cấp",
        dataIndex: "supplier_code",
    },
    {
        title: "Tên nhà cung cấp",
        dataIndex: "supplier_name",
    },
    {
        title: "Điện thoại",
        dataIndex: "phone",
    },
    {
        title: "Email",
        dataIndex: "email",
    },
    {
        title: "Trạng thái",
        dataIndex: "is_active",
        render: (value) => {
            return <span>{value ? "Hoạt động" : "Ngừng hoạt động"}</span>;
        }
    },
];

const Page = () => {
    const [data, setData] = useState<DataType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ current: 1, pageSize: 10 });
    const [total, setTotal] = useState<number>(0);
    const [filters, setFilters] = useState<any>({});
    const { setModal } = useSupplierStore();  // Sử dụng store của nhà cung cấp
    const [openImportModal, setOpenImportModal] = useState(false);
    const { shouldReload, setShouldReload } = useSupplierStore();  // Cập nhật store để reload dữ liệu khi cần
    const { hasPermission } = useAuthStore();
    const [api, contextHolder] = notification.useNotification();

    const fetchData = async (params: Pagination = {}) => {
        setLoading(true);
        try {
            const { current = 1, pageSize = 10 } = params;
            const skip = (current - 1) * pageSize;
            const response = await getSuppliersByPage(pageSize, skip, { ...filters, includeGuest: true });

            const tableData: DataType[] = response.data.map((item) => ({
                ...item,
                key: item.supplier_id,
                description: <DecriptionRow record={item} />,
            }));

            setData(tableData);
            setTotal(response.total);
            setPagination({
                current,
                pageSize,
            });
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu:", error);
            api.error({
                message: "Lỗi khi tải dữ liệu",
                description: "Không thể tải danh sách nhà cung cấp. Vui lòng thử lại sau.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (record: DataType) => {
        const key = record.key;
        setExpandedRowKeys((prevKeys) =>
            prevKeys.includes(key) ? prevKeys.filter((k) => k !== key) : [...prevKeys, key]
        );
    };

    const handleTableChange = (newPagination: any) => {
        fetchData({
            current: newPagination.current,
            pageSize: newPagination.pageSize
        });
    };

    const handleSearch = async (values: any) => {
        setFilters({ ...filters, search: values });
    };

    useEffect(() => {
        fetchData();
    }, [filters.search]);

    useEffect(() => {
        if (shouldReload) {
            fetchData();
            setShouldReload(false);
        }
    }, [shouldReload]);

    const handleAddBtn = () => {
        setModal({ open: true, type: ActionType.CREATE, suppliers: null });
    };

    const handleImportClick = () => {
        setOpenImportModal(true);
    };

    return (
        <>
            {contextHolder}
            <SearchAndActionsBar
                onSearch={handleSearch}
                placeholder="Theo tên, số điện thoại nhà cung cấp"
                titleBtnAdd="Nhà cung cấp"
                handleAddBtn={hasPermission(PermissionKey.SUPPLIER_CREATE) ? handleAddBtn : undefined}
                handleImportClick={hasPermission(PermissionKey.SUPPLIER_IMPORT) ? handleImportClick : undefined}
                extraExportButton={
                    hasPermission(PermissionKey.SUPPLIER_EXPORT) && (
                        <GenericExportButton
                            exportService={exportSuppliers}  // Sử dụng hàm exportSuppliers
                            fileNamePrefix="Danh_sach_nha_cung_cap"
                        />
                    )
                }
            />
            <CustomTable<DataType>
                columns={columns}
                dataSource={data}
                loading={loading}
                scroll={{ x: "max-content" }}
                expandable={{
                    expandedRowRender: (record) => record.description,
                    expandedRowKeys: expandedRowKeys,
                    onExpandedRowsChange: (keys) => setExpandedRowKeys([...keys]),
                }}
                onRow={(record) => ({
                    onClick: () => handleRowClick(record),
                })}
                pagination={{
                    ...pagination,
                    total,
                    showSizeChanger: true,
                    position: ["bottomRight"],
                }}
                onChange={handleTableChange}
            />
            <SupplierModal /> {/* Thay đổi từ CustomerModal sang SupplierModal */}
            <ImportModal
                open={openImportModal}
                title="Tạo nhà cung cấp từ file dữ liệu"
                onClose={() => setOpenImportModal(false)}
                notes={[
                    'Hệ thống cho phép import tối đa 500 dòng mỗi lần.',
                    'Hệ thống sẽ kiểm tra nếu nhà cung cấp chưa có sẽ được tạo mới.',
                ]}
                importApiFn={importSuppliersFromExcel}  // Sử dụng API của nhà cung cấp
                linkExcel="/files/danh_sach_nha_cung_cap_mau.xlsx"
                setShouldReload={setShouldReload}
            />
        </>
    );
};

export default Page;
