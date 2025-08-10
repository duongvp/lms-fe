"use client";
import dayjs from "dayjs";
import React, { useState, useEffect, useCallback } from "react";
import CustomTable from "@/components/ui/Table";
import type { ColumnsType } from "antd/es/table";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import DecriptionTable from "./components/DecriptionRow";
import { notification } from "antd";
import { getInvoiceStatusLabel, InvoiceStatus } from "@/enums/invoice";
import FilterDrawer from "@/components/shared/FilterModal";
import { isEmpty } from "lodash";
import ReturnInvoiceModal from "./components/ReturnInvoiceModal";
import { exportReturnOrders, getReturnOrdersByPage, ReturnOrderApiResponse } from "@/services/returnService";
import GenericExportButton from "@/components/shared/GenericExportButton";
import { useAuthStore } from "@/stores/authStore";
import { PermissionKey } from "@/types/permissions";
import useReturnStore from "@/stores/returnStore";
import { Status } from "@/enums/status";

interface DataType extends Partial<ReturnOrderApiResponse> {
    key: number;
    description: React.ReactNode;
}

const columns: ColumnsType<DataType> = [
    {
        title: "Mã trả hàng",
        dataIndex: "return_code",
    },
    {
        title: "Người tạo",
        dataIndex: "created_by",
        ellipsis: true,
    },
    {
        title: "Thời gian khởi tạo",
        dataIndex: "return_date",
        render: (value) => {
            if (!value) return '';
            return dayjs(value).format("DD/MM/YYYY HH:mm")
        },
    },
    {
        title: "Khách hàng",
        dataIndex: "customer_name",
        ellipsis: true,
        render: (value) => {
            if (!value) return '';
            return value
        }
    },
    {
        title: "Tổng tiền hàng trả",
        dataIndex: "total_amount",
        render: (value) => {
            if (!value) return '0';
            return Number(value).toLocaleString()
        },
    },
    {
        title: "Trạng thái",
        dataIndex: "status",
        render: (value) => (
            <span className={`status-${value.toLowerCase()}`}>
                {value}
            </span>
        ),
    },
];

interface IReturnFilter {
    search_text: string;
    [key: string]: any;
}

const Page = () => {
    const summaryRow: DataType = {
        key: -1, // key đặc biệt để phân biệt
        return_order_code: "",
        supplier_name: "",
        status: "",
        total_amount: "0",
        description: null
    };
    const [data, setData] = useState<DataType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
    const [openFilterDrawer, setOpenFilterDrawer] = useState(false);
    const [api, contextHolder] = notification.useNotification();
    const [total, setTotal] = useState<number>(0);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 11 });
    const [modalVisible, setModalVisible] = useState(false);
    const hasPermission = useAuthStore(state => state.hasPermission);
    const { warehouseId } = useAuthStore((state) => state.user)
    const { shouldReload, setShouldReload } = useReturnStore()
    const [filter, setFilter] = useState<IReturnFilter>({ search_text: "", status: Status.RECEIVED });

    const fetchData = useCallback(async () => {
        if (warehouseId === -1) return
        try {
            setLoading(true);
            let { current, pageSize } = pagination;
            pageSize = pageSize - 1;
            const skip = (current - 1) * pageSize;
            const { data: apiData, total, grand_total } = await getReturnOrdersByPage(pageSize, skip, { ...filter, warehouse_id: warehouseId });

            setTotal(total);

            const tableData: DataType[] = apiData.map((item) => ({
                ...item,
                key: item.return_id,
                status: getInvoiceStatusLabel(item.status as InvoiceStatus),
                description: <DecriptionTable data={item} />,
            }));

            summaryRow.total_amount = grand_total.toLocaleString();
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

    const handleAddBtn = () => {
        setModalVisible(true);
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (shouldReload) {
            fetchData()
            setShouldReload(false)
        }
    }, [shouldReload])

    return (
        <>
            {contextHolder}
            <SearchAndActionsBar
                onSearch={handleSearch}
                placeholder="Tìm theo mã phiếu trả, mã hoá đơn, mã KH, tên KH, sđt KH"
                titleBtnAdd="Trả hàng"
                handleAddBtn={hasPermission(PermissionKey.RETURN_PROCESS) ? handleAddBtn : undefined}
                handleFilterBtn={() => setOpenFilterDrawer(true)}
                extraExportButton={
                    hasPermission(PermissionKey.RETURN_EXPORT) && (
                        <GenericExportButton
                            exportService={exportReturnOrders}
                            serviceParams={[[], warehouseId, filter]}
                            fileNamePrefix="Danh_sach_phiếu trả hàng"
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

            <FilterDrawer open={openFilterDrawer} onClose={() => { setOpenFilterDrawer(false) }} handleSearch={handleFilterOrder} />
            <ReturnInvoiceModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
            />
        </>
    );
};

export default Page;