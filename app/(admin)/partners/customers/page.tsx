"use client";
import React, { useState, useEffect } from "react";
import CustomTable from "@/components/ui/Table";
import type { ColumnsType } from "antd/es/table";
// import SearchAndActionsBar from "./components/SearchAndActionsBar";
import DecriptionRow from "./components/DecriptionRow";
import useCustomerStore from "@/stores/customerStore";
import { CustomerApiResponse, exportCustomers, getCustomersByPage, importCustomersFromExcel } from "@/services/customerService";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import CustomerModal from "./components/Modal/CustomerModal";
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
interface DataType extends CustomerApiResponse {
    key: number;
    description: React.ReactNode;
}

// Columns hiển thị
const columns: ColumnsType<DataType> = [
    {
        title: "Mã khách hàng",
        dataIndex: "customer_code",
    },
    {
        title: "Tên khách hàng",
        dataIndex: "customer_name",
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
    const { setModal } = useCustomerStore()
    const [openImportModal, setOpenImportModal] = useState(false);
    const { shouldReload, setShouldReload } = useCustomerStore();
    const { hasPermission } = useAuthStore();
    const [api, contextHolder] = notification.useNotification();


    const fetchData = async (params: Pagination = {}) => {
        setLoading(true);
        try {
            const { current = 1, pageSize = 10 } = params;
            const skip = (current - 1) * pageSize;
            const response = await getCustomersByPage(pageSize, skip, { ...filters, includeGuest: true });

            const tableData: DataType[] = response.data.map((item) => ({
                ...item,
                key: item.customer_id,
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
                description: "Không thể tải danh sách khách hàng. Vui lòng thử lại sau.",
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
    }

    useEffect(() => {
        fetchData();
    }, [filters.search])

    useEffect(() => {
        if (shouldReload) {
            fetchData();
            setShouldReload(false);
        }
    }, [shouldReload])

    const handleAddBtn = () => {
        setModal({ open: true, type: ActionType.CREATE, customer: null })
    }

    const handleImportClick = () => {
        setOpenImportModal(true);
    }

    return (
        <>
            {contextHolder}
            <SearchAndActionsBar
                onSearch={handleSearch}
                placeholder="Theo tên, số điện thoại khách hàng"
                titleBtnAdd="Khách hàng"
                handleAddBtn={hasPermission(PermissionKey.CUSTOMER_CREATE) ? handleAddBtn : undefined}
                handleImportClick={hasPermission(PermissionKey.CUSTOMER_IMPORT) ? handleImportClick : undefined}
                extraExportButton={
                    hasPermission(PermissionKey.CUSTOMER_EXPORT) && (
                        <GenericExportButton
                            exportService={exportCustomers}
                            fileNamePrefix="Danh_sach_khach_hang"
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
            <CustomerModal />
            <ImportModal
                open={openImportModal}
                title="Tạo khách hàng từ file dữ liệu"
                onClose={() => setOpenImportModal(false)}
                notes={[
                    'Mã khách hàng luôn bắt đầu bằng cụm từ “KHIP”. Nếu bạn không nhập, hệ thống sẽ tự động thêm vào.',
                    'Hệ thống cho phép import tối đa 500 dòng mỗi lần.',
                    'Hệ thống sẽ kiểm tra nếu khách hàng chưa có sẽ được tạo mới khách hàng',
                ]}
                importApiFn={importCustomersFromExcel}
                linkExcel="/files/danh_sach_khach_hang_mau.xlsx"
                setShouldReload={setShouldReload}
            />
        </>
    );
};

export default Page;
