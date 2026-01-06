"use client";
import dayjs from "dayjs";
import React, { useState, useEffect, useCallback } from "react";
import CustomTable from "@/components/ui/Table";
import type { ColumnsType } from "antd/es/table";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import DecriptionTable from "./components/DecriptionRow";
import { exportInvoices, getInvoicesByPage, importInvoicesFromExcel, InvoiceApiResponse } from "@/services/invoiceService";
import { notification, Table } from "antd";
import { getInvoiceStatusLabel, InvoiceStatus } from "@/enums/invoice";
import FilterDrawer from "@/components/shared/FilterModal";
import { isEmpty } from "lodash";
import ImportModal from "@/components/shared/ImportModal";
import GenericExportButton from "@/components/shared/GenericExportButton";
import { useAuthStore } from "@/stores/authStore";
import { getUsersFollowWarehouse } from "@/services/userService";
import { PermissionKey } from "@/types/permissions";
import useInvoiceStore from "@/stores/invoiceStore";
import { Status } from "@/enums/status";

interface DataType extends Partial<InvoiceApiResponse> {
    key: number;
    description: React.ReactNode;
}

interface InvoiceFilter {
    search_text?: string;
    [key: string]: any;
}

const columns: ColumnsType<DataType> = [
    {
        title: "Mã hoá đơn",
        dataIndex: "invoice_code",
    },
    {
        title: "Thời gian khởi tạo",
        dataIndex: "invoice_date",
        render: (value) => {
            if (!value) return '';
            return dayjs(value).format("DD/MM/YYYY HH:mm")
        },
    },
    {
        title: "Khách hàng",
        dataIndex: "customer_name",
        ellipsis: true,
    },
    {
        title: "Tổng tiền",
        dataIndex: "total_amount",
        render: (value) => Number(value).toLocaleString(),
    },
    {
        title: "Tổng giá vốn",
        dataIndex: "total_cost",
        render: (value) => Number(value).toLocaleString(),
    },
    {
        title: "Lãi suất",
        dataIndex: "total_profit",
        render: (value) => Number(value).toLocaleString(),
    },
    {
        title: "Trạng thái",
        dataIndex: "status",
        width: 150,
        render: (value) => (
            <span className={`status-${value.toLowerCase()}`}>
                {value}
            </span>
        ),
    },
];

const Page = () => {
    const summaryRow: DataType = {
        key: -1, // key đặc biệt để phân biệt
        invoice_id: -1,
        warehouse_id: -1,
        customer_id: -1,
        user_id: -1,
        invoice_code: "",
        customer_name: "",
        status: "",
        total_amount: "0",
        total_cost: "0",
        total_profit: "0",
        description: null,
        // Add other missing properties from InvoiceApiResponse here with default values if needed
    };
    const [data, setData] = useState<DataType[]>([summaryRow]);
    const [loading, setLoading] = useState<boolean>(true);
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
    const [openFilterDrawer, setOpenFilterDrawer] = useState(false);
    const [api, contextHolder] = notification.useNotification();
    const [total, setTotal] = useState<number>(0);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 11 });
    const [openImportModal, setOpenImportModal] = useState(false);
    const { warehouseId } = useAuthStore((state) => state.user)
    const hasPermission = useAuthStore(state => state.hasPermission);
    const [filter, setFilter] = useState<InvoiceFilter>({ warehouse_id: warehouseId, status: Status.RECEIVED });
    const { setShouldReload, shouldReload } = useInvoiceStore()

    const handleRowClick = (record: DataType) => {
        const key = record.key;
        setExpandedRowKeys((prevKeys) =>
            prevKeys.includes(key)
                ? prevKeys.filter((k) => k !== key)
                : [...prevKeys, key]
        );
    };

    const handleTableChange = (paginationInfo: any) => {
        setPagination({
            current: paginationInfo.current,
            pageSize: paginationInfo.pageSize,
        });
    };

    const handleSearch = async (value: string) => {
        setFilter({ ...filter, search_text: value });
    };

    const handleFilterOrder = (values: any) => {
        if (isEmpty(values)) {
            setFilter({ search_text: filter.search_text });
            return
        }
        setFilter({ search_text: filter.search_text, ...values });
    };

    const handleCreateInvoice = () => window.open('/transactions/invoices/create', '_blank')

    const handleImportClick = () => setOpenImportModal(true);

    const fetchData = useCallback(async () => {
        if (warehouseId === -1) return
        try {
            setLoading(true);
            let { current, pageSize } = pagination;
            pageSize = pageSize - 1;
            const skip = (current - 1) * pageSize;
            const { data: apiData, total, grand_total, total_cost, total_profit } = await getInvoicesByPage(pageSize, skip, { ...filter, warehouse_id: warehouseId });

            setTotal(total);

            const tableData: DataType[] = apiData.map((item) => ({
                ...item,
                key: item.invoice_id,
                status: getInvoiceStatusLabel(item.status as InvoiceStatus),
                description: <DecriptionTable data={item} />,
            }));
            summaryRow.total_amount = grand_total.toLocaleString();
            summaryRow.total_cost = total_cost.toLocaleString();
            summaryRow.total_profit = total_profit.toLocaleString();
            setData([summaryRow, ...tableData]);
        } catch (error) {
            api.error({
                message: "Lỗi khi tải dữ liệu",
                description: "Không thể tải danh sách hóa đơn. Vui lòng thử lại sau.",
            });
            console.error("Lỗi fetch API:", error);
        } finally {
            setLoading(false);
        }
    }, [api, pagination, filter]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        // Reload khi tab được focus lại
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log("Tab active, reload invoices...");
                fetchData();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [fetchData]);

    useEffect(() => {
        if (shouldReload) {
            fetchData();
            setShouldReload(false);
        }
    }, [shouldReload])

    return (
        <>
            {contextHolder}
            <SearchAndActionsBar
                onSearch={handleSearch}
                placeholder="Tìm theo mã hoá đơn, mã khách hàng, tên khách hàng, sđt khách hàng"
                titleBtnAdd="Hoá đơn"
                handleImportClick={hasPermission(PermissionKey.INVOICE_CREATE) ? handleImportClick : undefined}
                handleAddBtn={hasPermission(PermissionKey.INVOICE_IMPORT) ? handleCreateInvoice : undefined}
                handleFilterBtn={() => setOpenFilterDrawer(true)}
                extraExportButton={
                    hasPermission(PermissionKey.INVOICE_EXPORT) && (
                        <GenericExportButton
                            exportService={exportInvoices}
                            serviceParams={[[], warehouseId, filter]}
                            fileNamePrefix="Danh_sach_hoa_don"
                        />
                    )
                }
            />

            <CustomTable<DataType>
                columns={columns}
                dataSource={data}
                loading={loading}
                pagination={{
                    position: ["bottomRight"],
                    showSizeChanger: false,
                    total,
                    // pageSizeOptions: ["10", "20", "50", "100"],
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    showTotal: (total, range) => {
                        if (total == 1) return ""
                        return `Hiển thị ${range[0] == 1 ? range[0] : range[0] - 1}-${range[1] == 11 ? 10 : range[1]} trên tổng số ${total} hóa đơn`;
                    }
                }}
                onChange={handleTableChange}
                scroll={{ x: "max-content" }}
                expandable={{
                    expandedRowRender: (record) =>
                        record.key === -1 ? null : record.description,
                    rowExpandable: (record) => record.key !== -1,
                    expandedRowKeys,
                    onExpand: (expanded, record) => {
                        if (record.key === -1) return;
                        if (expanded) {
                            setExpandedRowKeys([record.key]);
                        } else {
                            setExpandedRowKeys([]);
                        }
                    },
                }}
                onRow={(record) => ({
                    onClick: () => handleRowClick(record),
                    style: { cursor: "pointer" },
                })}
                rowClassName={(record) => record.key === -1 ? "summary-row" : "expandable-row"}
            />
            <FilterDrawer
                open={openFilterDrawer}
                onClose={() => { setOpenFilterDrawer(false) }}
                handleSearch={handleFilterOrder}
            />
            <ImportModal
                open={openImportModal}
                onClose={() => setOpenImportModal(false)}
                title="Tạo hóa đơn từ file dữ liệu"
                notes={[
                    'Mã hóa đơn luôn bắt đầu bằng cụm từ “HDIP”. Nếu bạn không nhập, hệ thống sẽ tự động thêm vào.',
                    'Hệ thống cho phép import tối đa 500 dòng mỗi lần.',
                    'Đảm bảo tồn kho của những hàng hóa liên quan vẫn đáp ứng đủ.',
                ]}
                importApiFn={importInvoicesFromExcel}
                linkExcel="/files/danh_sach_hoa_don_mau.xlsx"
                setShouldReload={setShouldReload}
            />
        </>
    );
};

export default Page;