"use client";
import dayjs from "dayjs";
import React, { useState, useEffect } from "react";
import CustomTable from "@/components/ui/Table";
import type { ColumnsType } from "antd/es/table";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import DecriptionRow from "./components/DecriptionRow";
import { getRoles, RoleApiResponse } from "@/services/roleService";
import useRoleStore from "@/stores/roleStore";
import RoleModal from "./components/RoleModal";
import { ActionType } from "@/enums/action";
import { notification } from "antd";


// Đây là kiểu dữ liệu cho Table (thêm key + description)
interface DataType extends RoleApiResponse {
    key: number;
    description_row: React.ReactNode;
}

// Columns hiển thị
const columns: ColumnsType<DataType> = [
    {
        title: "Tên vai trò",
        dataIndex: "role_name",
    },
    {
        title: "Mô tả",
        dataIndex: "description",
    },
    {
        title: "Thời gian khởi tạo",
        dataIndex: "created_at",
        render: (value) => dayjs(value).format("DD/MM/YY HH:mm"),
        sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
];

const Page = () => {
    const [data, setData] = useState<DataType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
    const { setModal, shouldReload, setShouldReload } = useRoleStore();
    const [api, contextHolder] = notification.useNotification();

    const fetchRoles = async () => {
        try {
            const apiData = await getRoles();

            // map lại dữ liệu cho Table
            const tableData: DataType[] = apiData.map((item) => ({
                ...item,
                key: item.role_id,
                description_row: (
                    <DecriptionRow record={item} /> // truyền data xuống component DecriptionTable
                ),
            }));

            setData(tableData);
        } catch (error) {
            console.error("Lỗi fetch API:", error);
            api.error({
                message: "Lỗi khi tải dữ liệu",
                description: "Không thể tải danh sách vai trò thành viên. Vui lòng thử lại sau.",
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

    useEffect(() => {
        fetchRoles();
    }, []);

    useEffect(() => {
        if (shouldReload) {
            fetchRoles();
            setShouldReload(false); // reset lại
        }
    }, [shouldReload]);

    return (
        <>
            {contextHolder}
            <SearchAndActionsBar
                placeholder="Tên vai trò"
                titleBtnAdd="Vai trò"
                onSearch={async (value) => console.log(value)}
                handleAddBtn={() => setModal({ open: true, type: ActionType.CREATE, role: null })}
            />
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
            <RoleModal />
        </>
    );
};

export default Page;
