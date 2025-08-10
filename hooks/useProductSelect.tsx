// hooks/useProductSelect.ts
import { useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import { getProductsByPage, ProductApiResponse } from '@/services/productService';
import { Flex, Image, Tag, Typography } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import useProductStore from '@/stores/productStore';

const { Text } = Typography;

const LIMIT = 50; // Số lượng sản phẩm mỗi lần gọi API

interface ProductOption {
    value: string;
    labelText: string;
    disabled: boolean;
    data: ProductApiResponse;
    label: React.ReactNode;
}

export default function useProductSelect(
    searchTerm: string,
    isViewPurchasePrice: boolean,
    isSelectOption: boolean,
    listIdProducts: number[]
) {
    const [data, setData] = useState<ProductApiResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [options, setOptions] = useState<ProductOption[]>([]);
    const { warehouseId } = useAuthStore((state) => state.user)
    const { shouldReload, setShouldReload } = useProductStore()

    const fetchProducts = async (skip: number, filter: any = {}) => {
        setLoading(true);
        try {
            const result = await getProductsByPage(LIMIT, skip, filter);
            setData(prev => skip === 0 ? result.data : [...prev, ...result.data]);
            setHasMore(result.data.length === LIMIT);
        } catch (error) {
            console.error("Fetch error:", error);
        }
        setLoading(false);
    };

    // useEffect(() => {
    //     fetchProducts(0); // Initial fetch
    // }, []);  
    console.log("searchTerm", searchTerm);

    useEffect(() => {
        if (warehouseId === -1) return
        const delaySearch = debounce(() => {
            fetchProducts(0, { search: searchTerm, warehouse_id: warehouseId, is_active: 1, listIdProducts });
        }, 300);
        delaySearch();
        return () => delaySearch.cancel();
    }, [searchTerm, warehouseId, listIdProducts]);

    useEffect(() => {
        if (data.length > 0) {
            const newOptions = data.map((item, index) => ({
                value: item.product_code + '-' + index, // Add index for uniqueness
                labelText: item.product_name,
                disabled: !!(item.stock <= 0 && !isSelectOption),
                data: item,
                label: (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 4 }}>
                        <Image
                            width={48}
                            height={48}
                            style={{ borderRadius: 4, objectFit: "cover" }}
                            // src={item.image_url || "error"}
                            src={'error'}
                            alt={item.product_name}
                            preview={false}
                            fallback="data:image/png;base64,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"
                        />
                        <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                            <Flex align='center'>
                                {/* <strong style={{ fontWeight: 600 }}>{item.product_name}</strong>{" "} */}
                                {/* <Text ellipsis style={{ width: 200, display: 'inline-block', fontWeight: 600, fontSize: 13 }}>
                                    {item.product_name}
                                </Text>
                                <span style={{ color: "#888" }}>{item.unit_name}</span> */}
                                <Flex style={{ maxWidth: 300, gap: 4 }} align='center'>
                                    <Text
                                        ellipsis
                                        style={{
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            fontWeight: 600,
                                            fontSize: 13,
                                            minWidth: 0, // BẮT BUỘC để flex co lại
                                            flex: 1
                                        }}
                                    >
                                        {item.product_name}
                                    </Text>
                                    <span style={{ color: "#888", flexShrink: 0 }}>{item.unit_name}</span>
                                </Flex>


                                {item.stock <= 0 && (
                                    <Tag
                                        icon={<WarningOutlined />}
                                        color="error"
                                        style={{ marginLeft: 8, verticalAlign: "middle" }}
                                    >
                                        Hết hàng
                                    </Tag>
                                )}
                            </Flex>
                            <div style={{ color: "#444" }}>
                                {
                                    !isViewPurchasePrice ? (
                                        <span>
                                            {item.product_code} - Giá: <strong style={{ color: "#1677ff" }}>{Number(item.selling_price).toLocaleString()}</strong>
                                        </span>
                                    ) : (
                                        <span>
                                            {item.product_code} - Giá nhập: <strong style={{ color: "#1677ff" }}>{Number(item.purchase_price).toLocaleString()}</strong>
                                        </span>
                                    )
                                }
                            </div>
                            <div style={{ fontSize: 12, color: item.stock <= 0 ? "#f5222d" : "#999" }}>
                                {item.stock <= 0 ? "Tạm hết hàng" : `Tồn: ${item.stock}`}
                            </div>
                        </div>
                    </div>
                )
            }));
            setOptions(newOptions);
        } else {
            setOptions([]);
        }
    }, [data]);

    useEffect(() => {
        const handleApiResponse = async () => {
            if (shouldReload) {
                fetchProducts(0, { search: searchTerm, warehouse_id: warehouseId, is_active: 1 });
                setShouldReload(false);
            }
        }
        handleApiResponse();
    }, [shouldReload])

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollTop + clientHeight >= scrollHeight - 30 && hasMore && !loading) {
            fetchProducts(data.length, { search: searchTerm, warehouse_id: warehouseId, is_active: 1 });
        }
    };

    return {
        options,
        loading,
        handleScroll,
    };
}
