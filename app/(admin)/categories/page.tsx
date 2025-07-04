"use client";
import React, { useState, useEffect } from "react";
import CustomTable from "@/components/ui/Table";
import type { ColumnsType } from "antd/es/table";
import { CategoryApiResponse, deleteCategory, getCategoriesByPage } from "@/services/categoryService";
import SearchAndActionsBar from "@/components/shared/SearchAndActionBar";
import CategoryModal from "./components/SearchAndActionsBar/CategoryModal";
import useCategoryStore from "@/stores/categoryStore";
import { ActionType } from "@/enums/action";
import { notification, Space } from "antd";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { DeleteOutlined, EditFilled } from "@ant-design/icons";
import ActionButton from "@/components/ui/ActionButton";
import { useAuthStore } from "@/stores/authStore";
import { PermissionKey } from "@/types/permissions";

// Đây là kiểu dữ liệu cho Table (thêm key + description)
interface DataType extends CategoryApiResponse {
    key: number;
}

// Columns hiển thị
const columns: ColumnsType<DataType> = [
    {
        title: "Mã nhóm hàng",
        dataIndex: "category_id",
    },
    {
        title: "Tên nhóm",
        dataIndex: "category_name",
    },
    {
        title: "Tương tác",
        dataIndex: "action",
        width: 100,
    },
];

const Page = () => {
    const [data, setData] = useState<DataType[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const { setModal, shouldReload, setShouldReload } = useCategoryStore();
    const [api, contextHolder] = notification.useNotification();
    const [filters, setFilters] = useState<any>({ search: "" });
    const hasPermission = useAuthStore(state => state.hasPermission);
    const handleDetete = async (id: number) => {
        await deleteCategory(id);
    }

    const fetchApi = async () => {
        try {
            const apiData = await getCategoriesByPage(filters);

            // map lại dữ liệu cho Table
            const tableData: DataType[] = apiData.map((item) => ({
                ...item,
                key: Number(item.category_id), // dùng product_id làm key
                action: (
                    <Space>
                        {
                            hasPermission(PermissionKey.CATEGORY_EDIT) && (
                                <ActionButton
                                    type='primary'
                                    color='orange'
                                    variant='solid'
                                    icon={<EditFilled />}
                                    onClick={() => setModal({ open: true, type: ActionType.UPDATE, category: item })}
                                />
                            )
                        }
                        {
                            hasPermission(PermissionKey.CATEGORY_DELETE) && (
                                <ConfirmButton
                                    customColor="red"
                                    icon={<DeleteOutlined />}
                                    onConfirm={() => handleDetete(item.category_id)}
                                    confirmMessage="Bạn có chắc chắn muốn xoá nhóm hàng này? Hành động này sẽ không thể hoàn tác"
                                    messageWhenSuccess="Xoá thành công"
                                    messageWhenError="Có lỗi xảy ra khi xoá"
                                    setShouldReload={() => setShouldReload(true)}
                                />
                            )
                        }
                    </Space>
                )
            }));

            setData(tableData);
        } catch (error) {
            console.error("Lỗi fetch API:", error);
            api.error({
                message: "Lỗi khi tải dữ liệu",
                description: "Không thể tải danh sách nhóm hàng. Vui lòng thử lại sau.",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApi();
    }, [filters]);

    useEffect(() => {
        if (shouldReload) {
            fetchApi();
            setShouldReload(false);
        }
    }, [shouldReload]);

    const handleSearch = async (values: any) => {
        setFilters({ search: values });
    }

    const handleAddBtn = () => {
        setModal({ open: true, type: ActionType.CREATE, category: null });
    }

    return (
        <>
            {contextHolder}
            <SearchAndActionsBar
                onSearch={handleSearch}
                placeholder="Theo tên nhóm hàng"
                titleBtnAdd="Nhóm hàng"
                handleAddBtn={hasPermission(PermissionKey.CATEGORY_CREATE) ? handleAddBtn : undefined}
            />
            <CustomTable<DataType>
                columns={columns}
                dataSource={data}
                loading={loading}
                pagination={{ position: ["bottomRight"] }}
                scroll={{ x: "max-content" }}
            />
            <CategoryModal />
        </>
    );
};

export default Page;
