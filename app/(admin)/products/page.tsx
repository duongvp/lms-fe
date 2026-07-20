"use client";
import dayjs from "dayjs";
import React, { useState, useEffect } from "react";
import CustomTable from "@/components/ui/Table";
import type { ColumnsType } from "antd/es/table";
import { exportProducts, getProductsByPage, ProductApiResponse, deleteMultipleProducts } from "@/services/productService";
import DecriptionRow from "./components/DecriptionRow";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import ProductModal from "./components/Modal/ProductModal";
import FilterProductDrawer from "./components/FilterProductDrawer";
import ImportProductModal from "./components/Modal/ImportProductModal";
import GenericExportButton from "@/components/shared/GenericExportButton";
import useProductStore from "@/stores/productStore";
import { ActionType } from "@/enums/action";
import { useAuthStore } from "@/stores/authStore";
import { PermissionKey } from "@/types/permissions";
import { Checkbox, notification } from "antd";
import PrintBarcodeModal from "@/components/shared/PrintBarcodeModal";

// Đây là kiểu dữ liệu cho Table (thêm key + description)
interface DataType extends ProductApiResponse {
    key: number;
    // description: React.ReactNode;
}

interface Pagination {
    current?: number;
    pageSize?: number;
}

// Columns hiển thị
const columns: ColumnsType<DataType> = [
    {
        title: "Mã",
        dataIndex: "product_code",
    },
    {
        title: "Buổi",
        dataIndex: "product_name",
    },
    {
        title: "Môn / Tiêu đề",
        dataIndex: "category_name",
    },
    {
        title: "Giá bán",
        dataIndex: "selling_price",
        render: (value) => {
            return <span>{Number(value).toLocaleString()}</span>
        },
        sorter: (a, b) => Number(a.selling_price) - Number(b.selling_price),
    },
    {
        title: "Giá vốn",
        dataIndex: "purchase_price",
        render: (value) => {
            return <span>{Number(value).toLocaleString()}</span>
        },
        sorter: (a, b) => Number(a.selling_price) - Number(b.selling_price),
    },
    {
        title: "Tồn kho",
        dataIndex: "stock",
        render: (value) => {
            return <span>{Number(value).toLocaleString()}</span>
        },
    },
    {
        title: "Thời gian khởi tạo",
        dataIndex: "created_at",
        render: (value) => dayjs(value).format("DD/MM/YY HH:mm"),
        responsive: ['lg']
    },
    {
        title: "Trạng thái",
        dataIndex: "is_active",
        render: (value) => {
            return <span>{value ? "Hoạt động" : "Ngừng hoạt động"}</span>
        }
    },
];


const Page = () => {
    const [data, setData] = useState<DataType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
    const [pagination, setPagination] = useState<Pagination>({ current: 1, pageSize: 1 });
    const [total, setTotal] = useState<number>(0);
    const [openFilterDrawer, setOpenFilterDrawer] = useState(false);
    const [api, contextHolder] = notification.useNotification();
    const [openImportModal, setOpenImportModal] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Array<string | number>>([1, 2, 3]);
    const hasPermission = useAuthStore(state => state.hasPermission);
    const { warehouseId } = useAuthStore((state) => state.user)
    const [filters, setFilters] = useState<any>({ warehouse_id: warehouseId });

    const [openPrintModal, setOpenPrintModal] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
    const [allSelectedRows, setAllSelectedRows] = useState<DataType[]>([]);
    const [isSelectAll, setIsSelectAll] = useState<boolean>(false);

    const [dataSource, setDataSource] = useState<DataType[]>([]);


    const { setModal, shouldReload, setShouldReload } = useProductStore();

    const fetchData = async (params: Pagination = {}) => {
        if (warehouseId === -1) return
        setLoading(true);
        try {
            const { current = 1, pageSize = 10 } = params;
            const skip = (current - 1) * pageSize;
            const response = await getProductsByPage(pageSize, skip, { ...filters, warehouse_id: warehouseId });

            const tableData: DataType[] = response.data.map((item) => ({
                ...item,
                key: item.product_id,
                // description: <DecriptionRow record={item} />,
            }));
            setData(tableData);
            setTotal(response.total);
            setPagination({
                current,
                pageSize,
            });
        } catch (error) {
            api.error({
                message: "Lỗi khi tải dữ liệu",
                description: "Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.",
            });
            console.error("Lỗi khi lấy dữ liệu:", error);
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

    const handleFilterOrder = (values: any) => {
        setFilters({ search: filters.search, ...values });
    };

    const handleAddBtn = () => {
        setModal({ open: true, type: ActionType.CREATE, product: null });
    }

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

    const handleDeleteProducts = async () => {
        if (allSelectedRows.length === 0) {
            api.warning({
                message: "Chưa chọn sản phẩm",
                description: "Vui lòng chọn ít nhất một sản phẩm để xóa.",
            });
            return;
        }

        try {
            setLoading(true);
            const ids = allSelectedRows.map(row => row.product_id);
            await deleteMultipleProducts(ids);

            api.success({
                message: "Xóa sản phẩm thành công",
                description: `Đã xóa ${allSelectedRows.length} sản phẩm.`,
            });

            // Reset selections and reload data
            setSelectedRowKeys([]);
            setAllSelectedRows([]);
            setIsSelectAll(false);
            setShouldReload(true);
        } catch (error) {
            api.error({
                message: "Lỗi khi xóa sản phẩm",
                description: "Không thể xóa sản phẩm. Vui lòng thử lại sau.",
            });
            console.error("Lỗi khi xóa sản phẩm:", error);
        } finally {
            setLoading(false);
        }
    }

    const handleImportClick = () => setOpenImportModal(true);

    const handleSelectAllSystem = async (selected: boolean) => {
        if (selected) {
            // Select all products from the entire system
            try {
                setLoading(true);
                const response = await getProductsByPage(total, 0, { ...filters, warehouse_id: warehouseId });
                const allProducts: DataType[] = response.data.map((item) => ({
                    ...item,
                    key: item.product_id,
                }));
                const allKeys = allProducts.map(item => item.key);
                setSelectedRowKeys(allKeys);
                setAllSelectedRows(allProducts);
                setIsSelectAll(true);
            } catch (error) {
                api.error({
                    message: "Lỗi khi chọn tất cả",
                    description: "Không thể tải toàn bộ danh sách sản phẩm. Vui lòng thử lại sau.",
                });
                console.error("Lỗi khi chọn tất cả sản phẩm:", error);
            } finally {
                setLoading(false);
            }
        } else {
            // Unselect all products
            setSelectedRowKeys([]);
            setAllSelectedRows([]);
            setIsSelectAll(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [api, filters])

    useEffect(() => {
        if (shouldReload) {
            fetchData();
            setShouldReload(false);
        }
    }, [shouldReload]);

    const rowSelection = {
        selectedRowKeys,
        preserveSelectedRowKeys: true,
        columnTitle: (
            <Checkbox
                indeterminate={selectedRowKeys.length > 0 && selectedRowKeys.length < total}
                checked={total > 0 && selectedRowKeys.length === total}
                onChange={(e) => handleSelectAllSystem(e.target.checked)}
            />
        ),
        onChange: (keys: React.Key[], selectedRows: DataType[]) => {
            setSelectedRowKeys(keys);

            if (isSelectAll) {
                // Nếu đang ở trạng thái select all, loại bỏ items đã bỏ chọn
                const keySet = new Set(keys);
                const newAllSelected = allSelectedRows.filter(row => keySet.has(row.key));
                setAllSelectedRows(newAllSelected);

                // Nếu số lượng selected ít hơn total, không còn ở trạng thái select all
                if (keys.length < total) {
                    setIsSelectAll(false);
                }
            } else {
                // Logic thông thường: merge selected rows
                const keySet = new Set(keys);
                const newAllSelected = allSelectedRows
                    .filter(row => keySet.has(row.key))
                    .concat(selectedRows.filter(row => !allSelectedRows.some(r => r.key === row.key)));
                setAllSelectedRows(newAllSelected);
            }
        },
        onSelectAll: async (selected: boolean, selectedRows: DataType[], changeRows: DataType[]) => {
            await handleSelectAllSystem(selected);
        },
    };

    return (
        <>
            {contextHolder}
            <SearchAndActionsBar
                onSearch={handleSearch}
                placeholder="Theo mã hàng, tên hàng, mã vạch"
                handleAddBtn={hasPermission(PermissionKey.PRODUCT_CREATE) ? handleAddBtn : undefined}
                handleFilterBtn={() => setOpenFilterDrawer(true)}
                handleImportClick={hasPermission(PermissionKey.PRODUCT_IMPORT) ? handleImportClick : undefined}
                handlePrintBarcode={hasPermission(PermissionKey.PRODUCT_IMPORT) ? handlePrintBtn : undefined}
                handleDeleteProducts={hasPermission(PermissionKey.PRODUCT_CREATE) ? handleDeleteProducts : undefined}
                extraExportButton={
                    hasPermission(PermissionKey.PRODUCT_EXPORT) && (
                        <GenericExportButton
                            exportService={exportProducts}
                            serviceParams={[[], warehouseId, filters]}
                            fileNamePrefix="Danh_sach_san_pham"
                        />
                    )
                }
            />
            <CustomTable<DataType>
                columns={columns}
                dataSource={data}
                loading={loading}
                rowSelection={rowSelection}
                pagination={{
                    ...pagination,
                    total,
                    showSizeChanger: true,
                    position: ["bottomRight"],

                    // pageSize: 1, // Sets the default number of items per page
                    // defaultPageSize: 1, // Alternative for the initial page size
                    // pageSizeOptions: ['1', '10', '20', '50'],

                }}
                scroll={{ x: "max-content" }}
                expandable={{
                    expandedRowRender: (record) => <DecriptionRow record={record} />,
                    expandedRowKeys: expandedRowKeys,
                    onExpandedRowsChange: (keys) => setExpandedRowKeys([...keys]),
                }}
                onRow={(record) => ({
                    onClick: () => handleRowClick(record),
                })}
                onChange={handleTableChange}
            />
            <FilterProductDrawer open={openFilterDrawer} onClose={() => { setOpenFilterDrawer(false) }} handleSearch={handleFilterOrder} />
            <ImportProductModal
                open={openImportModal}
                onClose={() => setOpenImportModal(false)}
            />
            <ProductModal />
            <PrintBarcodeModal open={openPrintModal} onClose={() => setOpenPrintModal(false)} initialData={selectedProducts} />
        </>
    );
};

export default Page;
