import { fetchInstance } from "@/ultils/fetchInstance";
const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/products`;

// Đây là kiểu dữ liệu API trả về
export interface ProductApiResponse {
    product_id: number;
    warehouse_id: number;
    product_code: string;
    barcode: string;
    category_id: number;
    category_name: string;
    unit_id: number;
    unit_name: string;
    product_name: string;
    purchase_price: string;
    selling_price: string;
    min_stock: number;
    max_stock: number;
    stock: number;
    total_stock: number;
    is_active: number;
    created_at: Date;
    updated_at: Date;
}

export interface GetAllProductsResponse {
    data: ProductApiResponse[];
    total: number;
}

export const getAllProducts = async (): Promise<ProductApiResponse[]> => {
    const url = `${API_BASE_URL}`;
    return await fetchInstance(url);
};

export const getProductsByPage = async (limit: number, skip: number, filter: any): Promise<GetAllProductsResponse> => {
    return await fetchInstance(`${API_BASE_URL}/search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit, skip, filter }),
    });
};

export const getProductByIdForInventory = async (id: string): Promise<any> => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url);
};

export const importProductsFromExcel = async (formatData: any): Promise<any> => {
    return await fetchInstance(`${API_BASE_URL}/import`, {
        method: "POST",
        body: formatData,
    });
    // fetch(`${API_BASE_URL}/import`, {
    //     method: "POST",
    //     body: formatData, // KHÔNG dùng JSON.stringify
    //     // KHÔNG thêm headers: { 'Content-Type': 'application/json' }
    // });
    // return await fetchInstance(`${API_BASE_URL}/import`, {
    //     method: 'POST',
    //     body: formatData,
    // });
};

// productExport.service.ts
// export const exportProducts = async (productIds: Array<string | number>, warehouseId?: number): Promise<Blob> => {
//     const response = await fetch(`${API_BASE_URL}/export`, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//             productIds,
//             warehouseId
//         }),
//     });

//     if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.message || 'Failed to export products');
//     }

//     return await response.blob();
// };

export const exportProducts = async (
    productIds: Array<string | number>,
    warehouseId?: number,
    filters: any = {}
): Promise<Blob> => {
    console.log("Exporting products with filters:", filters);
    const response = await fetchInstance(`${API_BASE_URL}/export`, {
        method: 'POST',
        body: JSON.stringify({ productIds, warehouseId, ...filters }),
    }, 'blob');

    return response;
};

export const createProduct = async (productData: any) => {
    const url = `${API_BASE_URL}`;
    return await fetchInstance(url, {
        method: 'POST',
        body: JSON.stringify(productData),
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

export const updateProduct = async (id: number, productData: any) => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url, {
        method: 'PUT',
        body: JSON.stringify(productData),
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

export const toggleProductStatus = async (id: number, payload: { status: 1 | 0 }) => {
    const url = `${API_BASE_URL}/toggle/${id}`;
    const options = {
        method: 'PUT',
        body: JSON.stringify(payload),
        headers: {
            'Content-Type': 'application/json',
        },
    };
    return await fetchInstance(url, options);
};

export const deleteProduct = async (id: number) => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url, {
        method: 'DELETE',
    });
};
