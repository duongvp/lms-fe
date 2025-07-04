import React, { useEffect, useState } from 'react';
import CustomTable from '@/components/ui/Table';
import { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '@/stores/authStore';
import { getStockCard } from '@/services/stockCard';
import dayjs from 'dayjs';
import { Typography } from 'antd';

const { Text } = Typography;

// Sửa lại prop nhận vào cho StockCard
interface TableWithActionsProps {
    data: any;
}

const StockCard: React.FC<TableWithActionsProps> = ({ data }) => {
    const [dataSource, setDataSource] = React.useState<any[]>([]);
    const { warehouseId } = useAuthStore((state) => state.user);
    const [total, setTotal] = useState<number>(0);
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });

    const columns: ColumnsType = [
        {
            title: 'Chứng từ',
            dataIndex: 'document_code',
            key: 'document_code',
            render: (value: any) => {
                return (
                    <Text copyable>
                        {value}
                    </Text>
                )
            }
        },
        {
            title: 'Thời gian',
            dataIndex: 'transaction_date',
            key: 'transaction_date',
            render: (value: any) => {
                return dayjs(value).format("DD/MM/YY HH:mm")
            }
        },
        { title: 'Loại giao dịch', dataIndex: 'transaction_type', key: 'transaction_type', width: 200 },
        {
            title: 'Giá GD',
            dataIndex: 'unit_price',
            key: 'unit_price',
            render: (value: any) => {
                if (value === null) return ''
                return Number(value).toLocaleString();
            }
        },
        {
            title: 'Giá vốn',
            dataIndex: 'unit_cost',
            key: 'unit_cost',
            render: (value: any) => {
                return Number(value).toLocaleString();
            }
        },
        {
            title: 'Số lượng',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (value: any) => {
                return Number(value).toLocaleString();
            }
        },
        {
            title: 'Tồn cuối',
            dataIndex: 'ending_balance',
            key: 'ending_balance',
            render: (value: any) => {
                return Number(value).toLocaleString();
            }
        },
    ];

    const fetchData = async () => {
        try {
            const { current, pageSize } = pagination;
            const skip = (current - 1) * pageSize;
            const { data: apiData, total } = await getStockCard(data.product_id, warehouseId, pageSize, skip);
            const newDataSource = apiData.map((item: any) => ({
                ...item,
                key: item.stock_card_id
            }))
            setTotal(total)
            setDataSource(newDataSource ?? []);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    const handleTableChange = (paginationInfo: any) => {
        setPagination({
            current: paginationInfo.current,
            pageSize: paginationInfo.pageSize,
        });
    };

    useEffect(() => {
        if (warehouseId === -1) return
        fetchData()
    }, [warehouseId, data, pagination])

    return (
        <div>
            <CustomTable
                bordered={true}
                dataSource={dataSource}
                columns={columns}
                pagination={{
                    position: ["bottomRight"],
                    showSizeChanger: true,
                    total,
                    pageSizeOptions: ["10", "20", "50", "100"],
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                }}
                onChange={handleTableChange}
                size='small'
            />
        </div>
    );
};

export default StockCard;

