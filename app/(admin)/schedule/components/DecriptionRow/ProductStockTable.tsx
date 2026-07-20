import React, { useEffect } from 'react';
import CustomTable from '@/components/ui/Table';
import { ColumnsType } from 'antd/es/table';
import { getProductByIdForInventory } from '@/services/productService';

// Sửa lại prop nhận vào cho ProductStockTable
interface TableWithActionsProps {
    data: any;
}

const ProductStockTable: React.FC<TableWithActionsProps> = ({ data }) => {
    const [dataSource, setDataSource] = React.useState<any[]>([]);

    const columns: ColumnsType = [
        { title: 'Chi nhánh', dataIndex: 'warehouse_name', key: 'warehouse_name' },
        { title: 'Tồn kho', dataIndex: 'stock', key: 'stock', width: 100 },
        { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 200 },
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await getProductByIdForInventory(data.product_id);
                let newData = response?.map((item: any) => ({
                    key: item.warehouse_id,
                    warehouse_name: item.warehouse_name,
                    stock: item.quantity,
                    status: 'Đang kinh doanh',
                }));
                newData = [{
                    key: '0',
                    warehouse_name: '',
                    stock: data?.total_stock,
                    status: '',
                }, ...newData]
                setDataSource(newData ?? []);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }
        fetchData()
    }, [])

    return (
        <div>
            <CustomTable
                bordered={true}
                dataSource={dataSource}
                columns={columns}
                pagination={false}
                size='small'
            />
        </div>
    );
};

export default ProductStockTable;

