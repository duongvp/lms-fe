"use client";
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
import { formatVietnamDateTime } from "@/helper/convertDate";


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
        render: (value) => formatVietnamDateTime(value),
        sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
        title: "Thời gian cập nhật",
        dataIndex: "updated_at",
        render: (value) => formatVietnamDateTime(value),
        sorter: (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
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
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalItems, setTotalItems] = useState(0);
    const [searchText, setSearchText] = useState("");
    const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
    const { shouldReload, setModal, setShouldReload } = useUserStore();
    const hasPermission = useAuthStore(state => state.hasPermission);
    const [api, contextHolder] = notification.useNotification();

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const apiData = await getUsers({
                page: currentPage,
                limit: pageSize,
                keyword: searchText || undefined,
            });
            const responseData = apiData?.data;

            // map lại dữ liệu cho Table
            const tableData: DataType[] = (responseData?.data || []).map((item) => ({
                ...item,
                key: item.id,
                description: (
                    <DecriptionRow record={item} /> // truyền data xuống component DecriptionTable
                ),
            }));

            setData(tableData);
            setTotalItems(responseData?.total || 0);
            setExpandedRowKeys([]);
        } catch (error) {
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
        void fetchUsers();
    }, [currentPage, pageSize, searchText]);

    useEffect(() => {
        if (shouldReload) {
            void fetchUsers();
            setShouldReload(false); // reset lại
        }
    }, [shouldReload]);

    return (
        <>
            {contextHolder}
            <SearchAndActionsBar
                placeholder="Tên đăng nhập, người dùng"
                titleBtnAdd="Người dùng"
                onSearch={async (value) => {
                    setSearchText(value.trim());
                    setCurrentPage(1);
                }}
                handleAddBtn={hasPermission(PermissionKey.USER_CREATE) ? handleAddBtn : undefined}
            />
            <CustomTable<DataType>
                columns={columns}
                dataSource={data}
                loading={loading}
                pagination={{
                    position: ["bottomRight"],
                    current: currentPage,
                    pageSize,
                    total: totalItems,
                    showSizeChanger: true,
                    onChange: (page, size) => {
                        setCurrentPage(page);
                        setPageSize(size);
                    },
                }}
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
