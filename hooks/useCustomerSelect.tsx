import { useEffect, useState } from 'react';
import { debounce } from 'lodash';

const LIMIT = 50; // Số lượng sản phẩm mỗi lần gọi API

interface CustomerOption {
    value: number;
    labelText: string;
    disabled?: boolean;
    data: CustomerApiResponse;
    label: React.ReactNode;
}

import React from 'react';
import { CustomerApiResponse, getCustomersByPage } from '@/services/customerService';
import useCustomerStore from '@/stores/customerStore';
import { FormInstance } from 'antd';

export default function useCustomerSelect(searchTerm: string, form?: FormInstance<any>) {
    const [data, setData] = useState<CustomerApiResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [options, setOptions] = useState<CustomerOption[]>([]);
    const { shouldReload, setShouldReload } = useCustomerStore();

    const fetchCustomers = async (skip: number, filter: any = {}) => {
        setLoading(true);
        try {
            const result = await getCustomersByPage(LIMIT, skip, filter);
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
            fetchCustomers(0, { search: searchTerm });
        }, 300);
        delaySearch();
        return () => delaySearch.cancel();
    }, [searchTerm]);

    useEffect(() => {
        if (data.length > 0) {
            const newOptions = data.map((item, index) => {
                let labelText = (item.phone ? `${item.customer_name} - ${item.phone}` : `${item.customer_name}`)
                return {
                    value: item.customer_id,
                    labelText: labelText,
                    // disabled: item.max_stock <= 0,
                    data: item,
                    label: labelText
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
                const dataFromApi = await fetchCustomers(0, { search: searchTerm });
                if (form && dataFromApi && dataFromApi.length > 0) {
                    form.setFieldsValue({ customer_id: dataFromApi[0]?.customer_id });
                }
                setShouldReload(false);
            }
        }
        handleApiResponse();
    }, [shouldReload])

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollTop + clientHeight >= scrollHeight - 30 && hasMore && !loading) {
            fetchCustomers(data.length, { search: searchTerm });
        }
    };

    return {
        options,
        loading,
        handleScroll,
    };
}
