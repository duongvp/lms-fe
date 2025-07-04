import { fetchInstance } from "@/ultils/fetchInstance";
const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/suppliers`;

// Đây là kiểu dữ liệu API trả về cho nhà cung cấp
export interface SupplierApiResponse {
    supplier_id: number;
    supplier_code: string;
    supplier_name: string;
    contact_name: string;
    email: string;
    phone: string;
    address: string;
    created_at: Date;
    updated_at: Date;
}

export interface GetAllSupplierResponse {
    data: SupplierApiResponse[];
    total: number;
}

// Lấy tất cả nhà cung cấp
export const getAllSuppliers = async (search: string = ''): Promise<SupplierApiResponse[]> => {
    const url = `${API_BASE_URL}?search=${search}`;
    return await fetchInstance(url);
};

// Lấy danh sách nhà cung cấp theo trang
export const getSuppliersByPage = async (limit: number, skip: number, filter: any): Promise<GetAllSupplierResponse> => {
    const url = `${API_BASE_URL}?limit=${limit}&skip=${skip}&filter=${JSON.stringify(filter)}`;
    return await fetchInstance(url);
};

// Lấy thông tin nhà cung cấp theo id
export const getSupplierById = async (id: string): Promise<SupplierApiResponse> => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url);
};

// Tạo mới nhà cung cấp
export const createSupplier = async (supplierData: any) => {
    const url = `${API_BASE_URL}`;
    return await fetchInstance(url, {
        method: 'POST',
        body: JSON.stringify(supplierData),
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

// Cập nhật thông tin nhà cung cấp
export const updateSupplier = async (id: number, supplierData: any) => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url, {
        method: 'PUT',
        body: JSON.stringify(supplierData),
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

// Thay đổi trạng thái nhà cung cấp (kích hoạt / vô hiệu hóa)
export const toggleSupplierStatus = async (id: number, payload: { status: 1 | 0 }) => {
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

// Xóa nhà cung cấp
export const deleteSupplier = async (id: number) => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url, {
        method: 'DELETE',
    });
};

// Nhập nhà cung cấp từ Excel
export const importSuppliersFromExcel = async (formatData: any): Promise<any> => {
    return await fetchInstance(`${API_BASE_URL}/import`, {
        method: "POST",
        body: formatData,
    });
};

// Xuất nhà cung cấp
export const exportSuppliers = async (): Promise<Blob> => {
    const response = await fetchInstance(`${API_BASE_URL}/export`, {
        method: 'POST',
    }, 'blob');

    return response;
};