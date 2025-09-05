export interface IInvoice {
    invoice_id: number;
    customer_name: string;
    total_amount: string;
    created_at: Date;
    status: string;
}

export interface IInvoiceItem {
    product_id: number;
    quantity: number;
    unit_price: string;
    total_price: string;
    product_name: string;
}

export type ITypeImportInvoice = 'edit' | 'create' | 'copy' | null;

export interface IInvoiceTableData {
    key: number;
    invoice_detail_id: number;
    invoice_id: number;
    product_id: number;
    quantity: number;
    unit_price: string;
    total_price: string;
    product_name: string;
    product_code: string;
    barcode: string;
    selling_price: string;
    discount: number;
    line_total: number;
}

export interface IInvoiceDetail {
    invoice_id: number;
    warehouse_id: number;
    invoice_code: string;
    customer_id: number | null;
    customer_phone: string | null;
    customer_address: string | null;
    customer_name: string;
    user_id: number;
    invoice_date: string;
    total_amount: string;
    status: string;
    notes: string | null;
    return_id: number | null
    created_at: Date;
    updated_at: Date;
    created_by: string;
    username: string;
    user_email: string;
    user_phone: string;
    warehouse_name: string;
    warehouse_address: string;
    warehouse_phone: string;
    customer_deleted: number;
    return_code: string | null
}