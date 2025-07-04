"use client";
import dayjs from "dayjs";
import React, { useState, useEffect, useCallback, use } from "react";
import CustomTable from "@/components/ui/Table";
import type { ColumnsType } from "antd/es/table";
import { notification } from "antd";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import FilterDrawer from "@/components/shared/FilterModal";
import { isEmpty } from "lodash";
import { useRouter } from "next/navigation";
import { exportInventoryChecks, getInventoryChecksByPage, importInventoryChecksFromExcel, InventoryCheckApiResponse } from "@/services/inventoryCheckService"; // <-- bạn cần tạo file service này
import DecriptionTable from "./components/DecriptionRow";
import ImportModal from "@/components/shared/ImportModal";
import { getInventoryCheckStatusLabel, Status } from "@/enums/status";
import GenericExportButton from "@/components/shared/GenericExportButton";
import { exportInvoices } from "@/services/invoiceService";
import { useAuthStore } from "@/stores/authStore";
import useInventoryCheckStore from "@/stores/inventoryCheckStore";
import { PermissionKey } from "@/types/permissions";

interface DataType extends InventoryCheckApiResponse {
    key: number;
    description?: React.ReactNode;
}

const columns: ColumnsType<DataType> = [
    {
        title: "Mã kiểm kho",
        dataIndex: "stock_take_code",
    },
    {
        title: "Thời gian khởi tạo",
        dataIndex: "start_date",
        render: (value) => dayjs(value).format("DD/MM/YY HH:mm"),
    },
    {
        title: "SL thực tế",
        dataIndex: "total_actual_quantity",
    },
    {
        title: "Giá trị lệch",
        dataIndex: "total_value_variance",
        render: (value) => Number(value).toLocaleString(),
    },
    {
        title: "Tổng chênh lệch",
        dataIndex: "total_variance",
    },
    {
        title: "SL lệch tăng",
        dataIndex: "quantity_increased",
    },
    {
        title: "SL lệch giảm",
        dataIndex: "quantity_decreased",
    },
    {
        title: "Trạng thái",
        dataIndex: "status",
    },
];

const Page = () => {
    const router = useRouter();
    const [data, setData] = useState<DataType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
    const [openFilterDrawer, setOpenFilterDrawer] = useState(false);
    const [api, contextHolder] = notification.useNotification();
    const [total, setTotal] = useState<number>(0);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

    const hasPermission = useAuthStore(state => state.hasPermission);
    const { warehouseId } = useAuthStore((state) => state.user)
    const [filter, setFilter] = useState<Record<string, any>>({ warehouse_id: warehouseId });
    const { shouldReload, setShouldReload } = useInventoryCheckStore();

    const fetchData = useCallback(async () => {
        if (warehouseId === -1) return
        try {
            setLoading(true);
            const { current, pageSize } = pagination;
            const skip = (current - 1) * pageSize;
            const { data: apiData, total } = await getInventoryChecksByPage(pageSize, skip, { ...filter, warehouse_id: warehouseId });

            const tableData: DataType[] = apiData.map((item) => ({
                ...item,
                key: item.stock_take_id,
                status: getInventoryCheckStatusLabel(item.status as Status),
                description: <DecriptionTable data={item} />,
            }));

            setData(tableData);
            setTotal(total);
        } catch (error) {
            api.error({
                message: "Lỗi khi tải dữ liệu",
                description: "Không thể tải danh sách kiểm kho. Vui lòng thử lại sau.",
            });
            console.error("Lỗi fetch API:", error);
        } finally {
            setLoading(false);
        }
    }, [pagination, filter, api]);

    const handleRowClick = (record: DataType) => {
        const key = record.key;
        setExpandedRowKeys((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [key]
        );
    };

    const handleTableChange = (paginationInfo: any) => {
        setPagination({
            current: paginationInfo.current,
            pageSize: paginationInfo.pageSize,
        });
    };

    const handleSearch = async (value: string) => {
        setFilter({ ...filter, stock_take_code: value });
    };

    const handleFilter = (values: any) => {
        if (isEmpty(values)) {
            setFilter({ stock_take_code: filter.stock_take_code });
            return;
        }
        setFilter({ stock_take_code: filter.stock_take_code, ...values });
    };

    const handleAddBtn = () => {
        router.push("/transactions/inventory-checks/create");
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (shouldReload) {
            fetchData();
            setShouldReload(false);
        }
    }, [shouldReload]);

    return (
        <>
            {contextHolder}
            <SearchAndActionsBar
                onSearch={handleSearch}
                placeholder="Theo mã kiểm kho"
                titleBtnAdd="Kiểm kho"
                handleAddBtn={hasPermission(PermissionKey.STOCK_CHECK_CREATE) ? handleAddBtn : undefined}
                handleFilterBtn={() => setOpenFilterDrawer(true)}
                extraExportButton={
                    hasPermission(PermissionKey.STOCK_CHECK_EXPORT) && (
                        <GenericExportButton
                            exportService={exportInventoryChecks}
                            serviceParams={[[], warehouseId, filter]}
                            fileNamePrefix="Danh_sach_kiem_kho"
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
                    showSizeChanger: true,
                    total,
                    pageSizeOptions: ["10", "20", "50", "100"],
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                }}
                onChange={handleTableChange}
                scroll={{ x: "max-content" }}
                expandable={{
                    expandedRowRender: (record) => record.description ?? null,
                    expandedRowKeys,
                    onExpand: (expanded, record) => {
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
                rowClassName={() => "expandable-row"}
            />

            <FilterDrawer
                title='Bộ lọc phiếu kiểm kho'
                open={openFilterDrawer}
                onClose={() => setOpenFilterDrawer(false)}
                handleSearch={handleFilter}
            />
        </>
    );
};

export default Page;
