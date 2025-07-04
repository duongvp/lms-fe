"use client";
import dayjs from "dayjs";
import React, { useState, useEffect, useCallback } from "react";
import CustomTable from "@/components/ui/Table";
import type { ColumnsType } from "antd/es/table";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import { exportPurchaseOrders, getPurchaseOrdersByPage, importPurchaseOrdersFromExcel, PurchaseOrderApiResponse } from "@/services/purchaseOrderService";
import { notification } from "antd";
import FilterDrawer from "@/components/shared/FilterModal";
import { isEmpty } from "lodash";
import DecriptionTable from "./components/DecriptionRow";
import ImportModal from "@/components/shared/ImportModal";
import GenericExportButton from "@/components/shared/GenericExportButton";
import { useAuthStore } from "@/stores/authStore";
import usePurchaseOrderStore from "@/stores/purchaseOrderStore";
import { PurchaseOrderStatus } from "@/enums/status";
import { useRouter } from "next/navigation";
import { PermissionKey } from "@/types/permissions";

interface DataType extends Partial<PurchaseOrderApiResponse> {
    key: number;
    description?: React.ReactNode;
}

const columns: ColumnsType<DataType> = [
    {
        title: "Mã nhập hàng",
        dataIndex: "po_code",
    },
    {
        title: "Thời gian khởi tạo",
        dataIndex: "order_date",
        render: (value) => {
            if (!value) return '';
            return dayjs(value).format("DD/MM/YYYY HH:mm")
        },
    },
    {
        title: "Nhà cung cấp",
        dataIndex: "supplier_name",
    },
    {
        title: "Tổng tiền",
        dataIndex: "total_amount",
        render: (value) => Number(value).toLocaleString(),
    },
    {
        title: "Trạng thái",
        dataIndex: "status",
        render: (value) => {
            if (!value) return
            return (value === PurchaseOrderStatus.RECEIVED ? "Đã nhập hàng" : (value === PurchaseOrderStatus.DRAFT ? 'Phiếu tạm' : 'Đã huỷ'))
        }
    },
];

const Page = () => {
    const summaryRow: DataType = {
        key: -1, // key đặc biệt để phân biệt
        po_code: "",
        supplier_name: "",
        total_amount: "0",
        description: null
    };
    const [data, setData] = useState<DataType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
    const [openFilterDrawer, setOpenFilterDrawer] = useState(false);
    const [api, contextHolder] = notification.useNotification();
    const [total, setTotal] = useState<number>(0);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
    const [openImportModal, setOpenImportModal] = useState(false);
    const hasPermission = useAuthStore(state => state.hasPermission);
    const { warehouseId } = useAuthStore((state) => state.user)
    const [filter, setFilter] = useState<Record<string, any>>({ warehouse_id: warehouseId, status: PurchaseOrderStatus.RECEIVED });
    const { setShouldReload, shouldReload } = usePurchaseOrderStore()
    const router = useRouter();

    const fetchData = useCallback(async () => {
        if (warehouseId === -1) return
        try {
            setLoading(true);
            const { current, pageSize } = pagination;
            const skip = (current - 1) * pageSize;
            const { data: apiData, total, grand_total } = await getPurchaseOrdersByPage(pageSize, skip, { ...filter, warehouse_id: warehouseId });

            const tableData: DataType[] = apiData.map((item) => ({
                ...item,
                key: item.po_id,
                description: <DecriptionTable data={item} />,
            }));

            summaryRow.total_amount = grand_total.toLocaleString();
            setData([summaryRow, ...tableData]);
            setTotal(total);
        } catch (error) {
            api.error({
                message: "Lỗi khi tải dữ liệu",
                description: "Không thể tải danh sách phiếu nhập. Vui lòng thử lại sau.",
            });
            console.error("Lỗi fetch API:", error);
        } finally {
            setLoading(false);
        }
    }, [api, pagination, filter]);

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
            return;
        }
        setFilter({ search_text: filter.search_text, ...values });
    };

    const handleAddBtn = () => {
        router.push("/transactions/purchase-orders/create");
    };

    const handleImportClick = () => {
        setOpenImportModal(true);
    };

    useEffect(() => {
        fetchData();
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
                placeholder="Tìm theo mã phiếu nhập, mã NCC, tên NCC, sđt NCC"
                titleBtnAdd="Phiếu nhập"
                handleAddBtn={hasPermission(PermissionKey.IMPORT_CREATE) ? handleAddBtn : undefined}
                handleImportClick={hasPermission(PermissionKey.IMPORT_IMPORT) ? handleImportClick : undefined}
                handleFilterBtn={() => setOpenFilterDrawer(true)}
                extraExportButton={
                    hasPermission(PermissionKey.IMPORT_EXPORT) && (
                        <GenericExportButton
                            exportService={exportPurchaseOrders}
                            serviceParams={[[], warehouseId, filter]}
                            fileNamePrefix="Danh_sach_phieu_nhap_hang"
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
                rowClassName={() => "expandable-row"}
            />

            <FilterDrawer
                open={openFilterDrawer}
                onClose={() => setOpenFilterDrawer(false)}
                handleSearch={handleFilterOrder}
                title="Bộ lọc phiếu nhập hàng"
                isPurchaseOrder={true}
            />

            <ImportModal
                open={openImportModal}
                onClose={() => setOpenImportModal(false)}
                title="Nhập hàng hóa từ file dữ liệu"
                notes={[
                    'Mã hóa đơn luôn bắt đầu bằng cụm từ “NHIP”. Nếu bạn không nhập, hệ thống sẽ tự động thêm vào.',
                    'Hệ thống cho phép import tối đa 500 dòng mỗi lần.',
                    'Đảm bảo mã phiếu nhập không trùng với mã phiếu nhập được import trước đó. Hoặc không cần nhập mã phiếu hệ thống sẽ tự cung cấp',
                ]}
                importApiFn={importPurchaseOrdersFromExcel}
                linkExcel="/files/danh_sach_phieu_nhap_hang_mau.xlsx"
                setShouldReload={setShouldReload}
            />
        </>
    );
};

export default Page;
