import { fetchInstance } from "@/ultils/fetchInstance";
const API_BASE_URL = `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/api/customers`;

// Đây là kiểu dữ liệu API trả về
export interface CustomerApiResponse {
    customer_id: number;
    customer_code: string;
    customer_name: string;
    contact_name: string;
    email: string;
    phone: string;
    address: string;
    gender: string;
    birthday: string;
    created_at: Date;
    updated_at: Date;
}

export interface GetAllCustomerResponse {
    data: CustomerApiResponse[];
    total: number;
}

export const getAllCustomers = async (search: string = ''): Promise<CustomerApiResponse[]> => {
    const url = `${API_BASE_URL}?search=${search}`;
    return await fetchInstance(url);
};

export const getCustomersByPage = async (limit: number, skip: number, filter: any): Promise<GetAllCustomerResponse> => {
    const url = `${API_BASE_URL}?limit=${limit}&skip=${skip}&filter=${JSON.stringify(filter)}`;
    return await fetchInstance(url);
};

export const getCustomerById = async (id: string): Promise<CustomerApiResponse> => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url);
};

export const createCustomer = async (customerData: any) => {
    const url = `${API_BASE_URL}`;
    return await fetchInstance(url, {
        method: 'POST',
        body: JSON.stringify(customerData),
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

export const updateCustomer = async (id: number, customerData: any) => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url, {
        method: 'PUT',
        body: JSON.stringify(customerData),
        headers: {
            'Content-Type': 'application/json',
        },
    });
};

export const toggleCustomerStatus = async (id: number, payload: { status: 1 | 0 }) => {
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

export const deleteCustomer = async (id: number) => {
    const url = `${API_BASE_URL}/${id}`;
    return await fetchInstance(url, {
        method: 'DELETE',
    });
};

export const importCustomersFromExcel = async (formatData: any): Promise<any> => {
    return await fetchInstance(`${API_BASE_URL}/import`, {
        method: "POST",
        body: formatData,
    });
};


// export const exportCustomers = async (): Promise<Blob> => {
//     const response = await fetch(`${API_BASE_URL}/export`, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//     });

//     if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.message || 'Failed to export products');
//     }

//     return await response.blob();
// };
export const exportCustomers = async (): Promise<Blob> => {
    const response = await fetchInstance(`${API_BASE_URL}/export`, {
        method: 'POST',
    }, 'blob');

    return response;
};