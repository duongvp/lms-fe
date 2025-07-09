// hooks/useSupplierSelect.ts
import { useEffect, useState } from 'react';
import { debounce } from 'lodash';

const LIMIT = 50; // Số lượng nhà cung cấp mỗi lần gọi API

interface SupplierOption {
    value: number;
    labelText: string;
    disabled?: boolean;
    data: SupplierApiResponse;
    label: React.ReactNode;
}

import React from 'react';
import { SupplierApiResponse, getSuppliersByPage } from '@/services/supplierService';
import useSupplierStore from '@/stores/supplierStore';
import { FormInstance } from 'antd';

export default function useSupplierSelect(searchTerm: string, form?: FormInstance<any>) {
    const [data, setData] = useState<SupplierApiResponse[]>([]);  // Sử dụng SupplierApiResponse thay vì CustomerApiResponse
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [options, setOptions] = useState<SupplierOption[]>([]);  // Sử dụng SupplierOption thay vì CustomerOption
    const { shouldReload, setShouldReload } = useSupplierStore();

    const fetchSuppliers = async (skip: number, filter: any = {}) => {  // Thay đổi tên từ fetchProducts thành fetchSuppliers
        setLoading(true);
        try {
            const result = await getSuppliersByPage(LIMIT, skip, filter);  // Sử dụng getSuppliersByPage thay vì getCustomersByPage
            setData(prev => skip === 0 ? result.data : [...prev, ...result.data]);
            setHasMore(result.data.length === LIMIT);
            return result.data;
        } catch (error) {
            console.error("Fetch error:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        const delaySearch = debounce(() => {
            fetchSuppliers(0, { search: searchTerm });  // Sử dụng fetchSuppliers
        }, 300);
        delaySearch();
        return () => delaySearch.cancel();
    }, [searchTerm]);

    useEffect(() => {
        if (data.length > 0) {
            const newOptions = data.map((item, index) => {
                let labelText = (item.phone ? `${item.supplier_name} - ${item.phone}` : `${item.supplier_name}`)
                return {
                    value: item.supplier_id,  // Thay đổi từ customer_id sang supplier_id
                    labelText,  // Chỉnh sửa theo thông tin nhà cung cấp
                    // disabled: item.max_stock <= 0, // Nếu có trạng thái disabled thì xử lý tại đây
                    data: item,
                    label: labelText,  // Hiển thị thông tin tên và điện thoại nhà cung cấp
                }
            });
            setOptions(newOptions);
        } else {
            setOptions([]);
        }
    }, [data]);

    useEffect(() => {
        const handleApiResponse = async () => {
            if (shouldReload) {
                const dataFromApi = await fetchSuppliers(0, { search: searchTerm });
                if (form && dataFromApi && dataFromApi.length > 0) {
                    form.setFieldsValue({ supplier_id: dataFromApi[0]?.supplier_id });
                }
                setShouldReload(false);
            }
        }
        handleApiResponse();
    }, [shouldReload])

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollTop + clientHeight >= scrollHeight - 30 && hasMore && !loading) {
            fetchSuppliers(data.length, { search: searchTerm });  // Gọi lại API khi scroll
        }
    };

    return {
        options,
        loading,
        handleScroll,
    };
}
