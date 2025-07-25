'use client';
import React, { useEffect } from 'react';
import { Tabs } from 'antd';
import type { TabsProps } from 'antd';
import ProductDetail from './ProductDetail';
import { ProductApiResponse } from '@/services/productService';
import ProductStockTable from './ProductStockTable';
import StockCard from './StockCard';

interface DecriptionRowProps {
    record: ProductApiResponse;
}

const DecriptionRow: React.FC<DecriptionRowProps> = ({ record }) => {
    const onChange = (key: string) => {
        console.log('Tab switched to:', key);
    };

    useEffect(() => {
        console.log('Mounted');
        return () => {
            console.log('Unmounted');
        };
    }, [])

    const items: TabsProps['items'] = [
        {
            key: '1',
            label: 'Thông tin',
            children: <ProductDetail record={record} />,
        },
        // {
        //     key: '2',
        //     label: 'Tồn kho',
        //     children: <ProductStockTable data={record} />,
        // },
        {
            key: '3',
            label: 'Thẻ kho',
            children: <StockCard data={record} />,
        },
    ];

    return <Tabs defaultActiveKey="1" items={items} onChange={onChange} />;
};

export default DecriptionRow;
