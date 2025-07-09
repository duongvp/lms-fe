"use client";
import dayjs from "dayjs";
import React, { useState, useEffect, useCallback } from "react";
import CustomTable from "@/components/ui/Table";
import type { ColumnsType } from "antd/es/table";
import { getInvoicesByPage, InvoiceApiResponse } from "@/services/invoiceService";
import { Button, Col, DatePicker, Modal, notification, Row, Space } from "antd";
import { getInvoiceStatusLabel, InvoiceStatus } from "@/enums/invoice";
import CustomSearchInput from "@/components/ui/Inputs/CustomSearchInput";
import { useAuthStore } from "@/stores/authStore";
import { Status } from "@/enums/status";
import { useRouter } from "next/navigation";
import useReturnStore from "@/stores/returnStore";
import { useBreakpoint } from "@ant-design/pro-components";

interface Props {
    visible: boolean;
    onClose: () => void;
}

interface DataType extends InvoiceApiResponse {
    key: number;
}

const formatCurrency = (value: number | string) => {
    return Number(value).toLocaleString()
};

interface InvoiceFilter {
    invoice_code?: string;
    [key: string]: any;
}

const ReturnInvoiceModal = ({ visible, onClose }: Props) => {
    const [data, setData] = useState<DataType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [api] = notification.useNotification();
    const [total, setTotal] = useState<number>(0);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
    const [filter, setFilter] = useState<InvoiceFilter>({ status: Status.RECEIVED, onlyReturnable: true });
    const [fromDate, setFromDate] = useState<dayjs.Dayjs | null>(null);
    const [toDate, setToDate] = useState<dayjs.Dayjs | null>(null);
    const { warehouseId } = useAuthStore((state) => state.user)
    const router = useRouter();
    const shouldReload = useReturnStore((state) => state.shouldReload);

    const screen = useBreakpoint();
    const isMobile = screen && ['sm', 'xs'].includes(screen);



    const onSelect = (record: DataType) => {
        router.push(`/transactions/returns/create/${record.invoice_id}`);
    }

    const columns: ColumnsType<DataType> = [
        {
            title: 'Mã hóa đơn',
            dataIndex: 'invoice_code',
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'invoice_date',
            render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm'),
        },
        {
            title: 'Nhân viên',
            dataIndex: 'created_by',
            key: 'created_by',
        },
        {
            title: 'Khách hàng',
            dataIndex: 'customer_name',
            key: 'customer_name',
        },
        {
            title: 'Tổng cộng',
            dataIndex: "total_amount", // Giả sử có trường này từ API
            render: formatCurrency,
            align: 'right',
        },
        {
            title: '',
            key: 'action',
            render: (_, record) => (
                <Button type="default" size="small" onClick={() => onSelect(record)}>
                    Chọn
                </Button>
            ),
        },
    ];

    const fetchData = useCallback(async () => {
        if (!filter.warehouse_id || filter.warehouse_id === -1) return
        try {
            setLoading(true);
            const { current, pageSize } = pagination;
            const skip = (current - 1) * pageSize;
            const { data: apiData, total } = await getInvoicesByPage(pageSize, skip, filter);

            setTotal(total);

            const tableData: DataType[] = apiData.map((item) => ({
                ...item,
                key: item.invoice_id,
                status: getInvoiceStatusLabel(item.status as InvoiceStatus),
            }));

            setData(tableData);
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


    const handleTableChange = (paginationInfo: any) => {
        setPagination({
            current: paginationInfo.current,
            pageSize: paginationInfo.pageSize,
        });
    };

    const handleSearchInvoiceCode = async (value: string) => {
        setFilter({ ...filter, invoice_code: value });
    };

    const handleSearchFollowCustomerName = async (value: string) => {
        setFilter({ ...filter, customer_name: value });
    };
    const handleSearchFollowProductCode = async (value: string) => {
        setFilter({ ...filter, product_code: value });
    };
    const handleSearchFollowProductName = async (value: string) => {
        setFilter({ ...filter, product_name: value });
    };

    const handleFromDateChange = (date: dayjs.Dayjs | null) => {
        const newFromDate = date?.startOf("day") || null;
        const newToDate = toDate?.endOf("day") || null;

        setFromDate(date);

        setFilter(prev => ({
            ...prev,
            invoice_date: newFromDate && newToDate
                ? [newFromDate.toISOString(), newToDate.toISOString()]
                : newFromDate
                    ? [newFromDate.toISOString(), undefined]
                    : newToDate
                        ? [undefined, newToDate.toISOString()]
                        : undefined,
        }));
    };

    const handleToDateChange = (date: dayjs.Dayjs | null) => {
        const newToDate = date?.endOf("day") || null;
        const newFromDate = fromDate?.startOf("day") || null;

        setToDate(date);

        setFilter(prev => ({
            ...prev,
            invoice_date: newFromDate && newToDate
                ? [newFromDate.toISOString(), newToDate.toISOString()]
                : newFromDate
                    ? [newFromDate.toISOString(), undefined]
                    : newToDate
                        ? [undefined, newToDate.toISOString()]
                        : undefined,
        }));
    };

    useEffect(() => {
        if (warehouseId === -1) return
        setFilter({ ...filter, warehouse_id: warehouseId });
    }, [warehouseId]);

    useEffect(() => {
        if (shouldReload) {
            fetchData();
        }
    }, [shouldReload])

    return (
        <div>
            <Modal
                title="Chọn hóa đơn trả hàng"
                open={visible}
                onCancel={onClose}
                footer={null}
                width={1000}
                centered={isMobile}
            >
                <Row gutter={16}>
                    <Col md={6} xs={24}>
                        <Space direction="vertical" style={{ width: '100%', height: '505px' }} >
                            <h4 style={{ fontWeight: 500 }}>Tìm kiếm</h4>
                            <CustomSearchInput
                                placeholder={"Theo mã hoá đơn"}
                                fetchApi={handleSearchInvoiceCode}
                                allowClear
                                hiddleIcon={true}
                            />
                            <CustomSearchInput
                                placeholder={"Theo mã vận đơn"}
                                fetchApi={handleSearchInvoiceCode}
                                allowClear
                                hiddleIcon={true}
                            />
                            <CustomSearchInput
                                placeholder={"Theo tên khách hàng"}
                                fetchApi={handleSearchFollowCustomerName}
                                allowClear
                                hiddleIcon={true}
                            />
                            <CustomSearchInput
                                placeholder={"Theo mã hàng"}
                                fetchApi={handleSearchFollowProductCode}
                                allowClear
                                hiddleIcon={true}
                            />
                            <CustomSearchInput
                                placeholder={"Theo tên hàng"}
                                fetchApi={handleSearchFollowProductName}
                                allowClear
                                hiddleIcon={true}
                            />
                            <div style={{ marginTop: 8 }}>
                                <h4 style={{ marginBottom: 8, fontWeight: 500 }}>Thời gian</h4>
                                <DatePicker
                                    style={{ width: '100%', marginBottom: 8 }}
                                    placeholder="Từ ngày"
                                    format="DD/MM/YYYY"
                                    value={fromDate}
                                    maxDate={toDate ?? dayjs()}
                                    onChange={handleFromDateChange}
                                />
                                <DatePicker
                                    style={{ width: '100%' }}
                                    placeholder="Đến ngày"
                                    format="DD/MM/YYYY"
                                    value={toDate}
                                    {...fromDate && { minDate: fromDate }}
                                    maxDate={dayjs()}
                                    onChange={handleToDateChange}
                                />
                            </div>
                        </Space>
                    </Col>
                    <Col md={18} xs={24}>
                        <CustomTable<DataType>
                            columns={columns}
                            dataSource={data}
                            loading={loading}
                            pagination={{
                                position: ["bottomRight"],
                                total,
                                current: pagination.current,
                                pageSize: pagination.pageSize,
                            }}
                            onChange={handleTableChange}
                            scroll={{ x: "max-content" }}
                            rowClassName={() => "expandable-row"}
                            size="small"
                        />
                    </Col>
                </Row>
            </Modal>

        </div>
    );
};

export default ReturnInvoiceModal;