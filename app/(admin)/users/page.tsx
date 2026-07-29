"use client";
import dayjs from "dayjs";
import React, { useState, useEffect } from "react";
import CustomTable from "@/components/ui/Table";
import type { ColumnsType } from "antd/es/table";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import { getUsers, UserApiResponse } from "@/services/userService";
import UserModal from "./components/UserModal";
import useUserStore from "@/stores/userStore";
import DecriptionRow from "./components/DecriptionRow";
import RoleModal from "../member-roles/components/RoleModal";
import { ActionType } from "@/enums/action";
import BranchModal from "./components/BranchModal";
import { useAuthStore } from "@/stores/authStore";
import { PermissionKey } from "@/types/permissions";
import { notification } from "antd";


// Đây là kiểu dữ liệu cho Table (thêm key + description)
interface DataType extends UserApiResponse {
    key: number;
    description: React.ReactNode;
}

// Columns hiển thị
const columns: ColumnsType<DataType> = [
    {
        title: "Tên đăng nhập",
        dataIndex: "username",
    },
    {
        title: "Tên người dùng",
        dataIndex: "name",
    },
    {
        title: "Thời gian khởi tạo",
        dataIndex: "created_at",
        render: (value) => dayjs(value).format("DD/MM/YY HH:mm"),
        sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
        title: "Thời gian cập nhật",
        dataIndex: "updated_at",
        render: (value) => dayjs(value).format("DD/MM/YY HH:mm"),
        sorter: (a, b) => dayjs(a.updated_at).unix() - dayjs(b.updated_at).unix(),
    },
    {
        title: "Trạng thái",
        dataIndex: "is_active",
        render: (value) => (value ? "Đang hoạt động" : "Ngừng hoạt động"),
    },
];

const Page = () => {
    const [data, setData] = useState<DataType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
    const { shouldReload, setModal, setShouldReload } = useUserStore();
    const hasPermission = useAuthStore(state => state.hasPermission);
    const [api, contextHolder] = notification.useNotification();

    const fetchUsers = async () => {
        try {
            const apiData = await getUsers();
            console.log("apiData", apiData)

            // map lại dữ liệu cho Table
            const tableData: DataType[] = apiData?.data.map((item) => ({
                ...item,
                key: item.id,
                description: (
                    <DecriptionRow record={item} /> // truyền data xuống component DecriptionTable
                ),
            }));

            setData(tableData);
        } catch (error) {
            console.log("error", error)
            console.error("Lỗi fetch API:", error);
            api.error({
                message: "Lỗi khi tải dữ liệu",
                description: "Không thể tải danh sách quản trị viên. Vui lòng thử lại sau.",
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
        setModal({ open: true, type: ActionType.CREATE, user: null });
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (shouldReload) {
            fetchUsers();
            setShouldReload(false); // reset lại
        }
    }, [shouldReload]);

    return (
        <>
            {contextHolder}
            <SearchAndActionsBar
                placeholder="Tên đăng nhập, người dùng"
                titleBtnAdd="Người dùng"
                onSearch={async (value) => console.log(value)}
                handleAddBtn={hasPermission(PermissionKey.USER_CREATE) ? handleAddBtn : undefined}
            />
            <CustomTable<DataType>
                columns={columns}
                dataSource={data}
                loading={loading}
                pagination={{ position: ["bottomRight"] }}
                scroll={{ x: "max-content" }}
                expandable={{
                    expandedRowRender: (record) => record.description,
                    expandedRowKeys: expandedRowKeys,
                    onExpandedRowsChange: (keys) => setExpandedRowKeys([...keys]),
                }}
                onRow={(record) => ({
                    onClick: () => handleRowClick(record),
                })}
            />
            <UserModal />
            <RoleModal />
            <BranchModal />
        </>
    );
};

export default Page;
