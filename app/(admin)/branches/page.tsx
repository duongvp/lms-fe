"use client";
import React, { useState, useEffect } from "react";
import CustomTable from "@/components/ui/Table";
import type { ColumnsType } from "antd/es/table";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import useRoleStore from "@/stores/roleStore";
import { ActionType } from "@/enums/action";
import { getWarehouses, WarehouseApiResponse } from "@/services/branchService";
import DecriptionRow from "./components/DecriptionRow";
import BranchModal from "./components/BranchModal";
import useBranchStore from "@/stores/branchStore";
import { convertStatusToText } from "@/ultils/customText";
import { useAuthStore } from "@/stores/authStore";
import { PermissionKey } from "@/types/permissions";
import { notification } from "antd";


// Đây là kiểu dữ liệu cho Table (thêm key + description)
interface DataType extends WarehouseApiResponse {
    key: number;
    description_row: React.ReactNode;
}

// Columns hiển thị
const columns: ColumnsType<DataType> = [
    {
        title: "Tên chi nhánh",
        dataIndex: "warehouse_name",
    },
    {
        title: "Địa chỉ",
        dataIndex: "address",
    },
    {
        title: "Điện thoại",
        dataIndex: "phone",
    },
    {
        title: "SL người dùng",
        dataIndex: "total_users",
    },
    {
        title: "Trạng thái",
        dataIndex: "is_active",
        render: (value) => convertStatusToText(value),
    }
];

const Page = () => {
    const [data, setData] = useState<DataType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
    const { modal, setModal, shouldReload, setShouldReload } = useBranchStore();
    const hasPermission = useAuthStore(state => state.hasPermission);
    const [api, contextHolder] = notification.useNotification();


    const fetchWarehouses = async () => {
        try {
            const apiData = await getWarehouses();

            // map lại dữ liệu cho Table
            const tableData: DataType[] = apiData.map((item) => ({
                ...item,
                key: item.warehouse_id,
                description_row: (
                    <DecriptionRow record={item} /> // truyền data xuống component DecriptionTable
                ),
            }));

            setData(tableData);
        } catch (error) {
            console.error("Lỗi fetch API:", error);
            api.error({
                message: "Lỗi khi tải dữ liệu",
                description: "Không thể tải danh sách chi nhánh. Vui lòng thử lại sau.",
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

    const handleAddBtn = () => {
        setModal({ open: true, type: ActionType.CREATE, warehouse: null });
    };

    useEffect(() => {
        fetchWarehouses();
    }, []);

    useEffect(() => {
        if (shouldReload) {
            fetchWarehouses();
            setShouldReload(false); // reset lại
        }
    }, [shouldReload]);

    return (
        <>
            {contextHolder}
            <SearchAndActionsBar
                showSearch={false}
                titleBtnAdd="Chi nhánh"
                onSearch={async (value) => console.log(value)}
                handleAddBtn={hasPermission(PermissionKey.BRANCH_CREATE) ? handleAddBtn : undefined}
            />
            {/* <SearchAndActionsBar /> */}
            <CustomTable<DataType>
                columns={columns}
                dataSource={data}
                loading={loading}
                pagination={{ position: ["bottomRight"] }}
                scroll={{ x: "max-content" }}
                expandable={{
                    expandedRowRender: (record) => record.description_row,
                    expandedRowKeys: expandedRowKeys,
                    onExpandedRowsChange: (keys) => setExpandedRowKeys([...keys]),
                }}
                // rowSelection={{}}
                // title={() => "Danh sách sản phẩm"}
                onRow={(record) => ({
                    onClick: () => handleRowClick(record),
                })}
            />
            <BranchModal />
        </>
    );
};

export default Page;
