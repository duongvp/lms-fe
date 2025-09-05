import { useEffect, useState } from 'react';
import { Form, Typography, Button, Flex, Input, Divider } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import CustomInput from '@/components/ui/Inputs';
import CustomerModal from '@/app/(admin)/partners/customers/components/Modal/CustomerModal';
import useCustomerStore from '@/stores/customerStore';
import HeaderForm from '@/components/shared/HeaderForm';
import { showErrorMessage, showSuccessMessage } from '@/ultils/message';
import { createReturnOrder, updateReturnOrder } from '@/services/returnService';
import { ActionType } from '@/enums/action';
import { useAuthStore } from '@/stores/authStore';
import dayjs from 'dayjs';
import { isEmpty } from 'lodash';

import { ITypeImportInvoice } from '@/types/invoice';
import { IDataTypeProductSelect } from '@/types/productSelect';
import { useRouter } from 'next/navigation';

const { Text } = Typography;

interface ImportOrdersFormProps {
    subtotal: number;
    type?: ITypeImportInvoice;
    returnOrderDetails?: any;
    returnOrderSummary?: any;
    dataSource: IDataTypeProductSelect[]
}

export default function ReturnOrdersForm({ subtotal, type, returnOrderDetails, returnOrderSummary, dataSource }: ImportOrdersFormProps) {
    console.log("🚀 ~ ReturnOrdersForm ~ dataSource:", dataSource)
    console.log("🚀 ~ ReturnOrdersForm ~ returnOrderDetails:", returnOrderDetails)
    const [form] = Form.useForm();
    const [discount, setDiscount] = useState<number>(0);
    const [VAT, setVAT] = useState<number>(0);
    const [totalAmount, setTotalAmount] = useState<number>(0);
    const [customerPayment, setCustomerPayment] = useState<number>(0);
    const [returnFee, setReturnFee] = useState<number>(0);
    const { setModal } = useCustomerStore();
    const { userId } = useAuthStore(state => state.user);
    const [userIdSelected, setUserIdSelected] = useState<number>(userId);
    const router = useRouter();

    const calculateTotal = () => {
        const total = customerPayment - returnFee - totalAmount;
        return total >= 0 ? total : 0;
    };

    const handleFinish = async (values: any) => {
        // TODO: Xử lý lưu dữ liệu ở đây
        // const data = {
        //     "return_order": {
        //         "return_code": "",                            // Optional: để trống nếu muốn BE tự sinh mã THxxxxxx
        //         "warehouse_id": 1,                            // ID của kho trả hàng
        //         "invoice_id": 12,                             // Optional: ID hóa đơn mua hàng gốc (nếu có)
        //         "customer_id": 5,                             // Optional: ID khách hàng (nếu cần lưu)
        //         "note": "Khách trả hàng do lỗi sản phẩm",     // Ghi chú
        //         "status": "completed",                        // "draft" hoặc "completed"
        //         "created_by": 3                               // ID người tạo
        //     },
        //     "items": [
        //         {
        //             "product_id": 101,
        //             "quantity": 2,
        //             "unit_price": 50000                         // Optional: nếu không truyền sẽ dùng giá bán hiện tại trong DB
        //         },
        //         {
        //             "product_id": 102,
        //             "quantity": 1
        //             // unit_price có thể bỏ nếu muốn backend lấy từ sản phẩm
        //         }
        //     ]
        // }
        console.log("dataSource", dataSource);
        const details = dataSource.map((item: any) => ({
            product_id: item.id,
            quantity: item.quantity,
            unit_price: Number(String(item.unitPrice).replace(/,/g, '')),
            discount: Number(String(item.discount).replace(/,/g, '')),
            max_quantity: item.maxQuantity || item.quantity, // Sử dụng maxQuantity nếu có, ngược lại dùng quantity
        }))
        const newData = {
            "return_order": {
                return_code: "",                            // Optional: để trống nếu muốn BE tự sinh mã THxxxxxx
                warehouse_id: returnOrderDetails?.warehouse_id,
                user_id: userIdSelected,                              // ID người tạo
                invoice_id: returnOrderDetails?.invoice_id, // Optional: ID hóa đơn mua hàng gốc (nếu có)
                return_date: dayjs().format("YYYY-MM-DD HH:mm:ss"), // Ngày trả hàng
                customer_id: returnOrderDetails?.customer_id, // Optional: ID khách hàng (nếu cần lưu)
                notes: values.notes,
                status: "completed", // "draft" hoặc "completed"
                return_fee: returnFee,
                VAT: VAT,
                refund_amount: calculateTotal(),
                amount_paid: customerPayment,
                discount_total: discount,
                total_amount: totalAmount
            },
            items: details
        }
        try {
            if (type == "edit") {
                await updateReturnOrder(returnOrderDetails?.return_id, newData)
                showSuccessMessage(`Cập nhật phiếu trả thành công!`);
                router.push('/transactions/returns');
            } else {
                await createReturnOrder(newData)
                showSuccessMessage(`Tạo mới phiếu trả thành công!`);
                router.push('/transactions/returns');
            };
        } catch (error) {
            if (type == "edit") {
                showErrorMessage(`Cập nhật phiếu trả thất bại!`);
            } else {
                showErrorMessage(`Tạo mới phiếu trả thất bại!`);
            };
        }
    };

    const handleAddCustomer = () => {
        setModal({ open: true, type: ActionType.CREATE, customer: null })
    };

    useEffect(() => {
        if (!isEmpty(returnOrderDetails) && !isEmpty(returnOrderSummary)) {
            form.setFieldsValue({
                customer_id: returnOrderDetails?.customer_id,
                invoice_code: returnOrderDetails?.invoice_code
            });
            setDiscount(returnOrderSummary?.discount_amount)
            setVAT(returnOrderSummary?.VAT)
            setCustomerPayment(returnOrderSummary?.amount_paid)
        }
    }, [returnOrderDetails, type, returnOrderSummary])

    useEffect(() => {
        if (userId !== -1) {
            setUserIdSelected(userId)
        }
    }, [userId])

    useEffect(() => {
        setTotalAmount((subtotal - discount) * (1 + VAT / 100));
    }, [VAT, discount, subtotal])

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            style={{ height: '100%' }}
        >
            <Flex vertical justify="space-between" style={{ height: '100%' }}>
                {/* Nội dung form */}
                <div>
                    {/* Header */}
                    <HeaderForm
                        userIdSelected={userIdSelected}
                        setUserIdSelected={setUserIdSelected}
                    />

                    {/* Khách hàng */}
                    <Flex justify='space-between' style={{ marginBottom: 8 }}>
                        <Text strong >Tên khách hàng</Text>
                        <Text>{returnOrderDetails?.customer_name}</Text>
                    </Flex>
                    <Divider />
                    {/* Tổng tiền */}
                    <Flex justify='space-between' style={{ marginBottom: 8 }}>
                        <Text strong >Tổng thành tiền</Text>
                        <Text>{subtotal.toLocaleString()}</Text>
                    </Flex>

                    {/* Giảm giá */}
                    <Flex justify='space-between' style={{ marginBottom: 8 }}>
                        <Text strong >Giảm giá</Text>
                        <Text>{Number(discount).toLocaleString()}</Text>
                    </Flex>
                    <Flex justify='space-between' style={{ marginBottom: 8 }}>
                        <Text strong >VAT({Number(VAT)}%)</Text>
                        <Text>{((Number(subtotal) - Number(discount)) * (Number(VAT) / 100)).toLocaleString()}</Text>
                    </Flex>
                    <Flex justify='space-between' style={{ marginBottom: 8 }}>
                        <Text strong >Tổng cộng</Text>
                        <Text>{totalAmount.toLocaleString()}</Text>
                    </Flex>
                    <Flex justify='space-between' style={{ marginBottom: 8 }}>
                        <Text strong >Khách đã thanh toán</Text>
                        <Text>{Number(customerPayment).toLocaleString()}</Text>
                    </Flex>
                    <CustomInput
                        label="Phí trả hàng"
                        name="return_fee"
                        isNumber
                        lablelStyle={{ width: "70%" }}
                        inputNumberProps={{
                            min: 0,
                            value: returnFee,
                            formatter: (val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
                            parser: (val) => val?.replace(/,/g, '') || '0',
                            onChange: (value) => setReturnFee(Number(value) || 0),
                        }}
                    />

                    {/* Cần trả */}
                    <Flex justify="space-between" style={{ marginBottom: 16, marginTop: 12 }}>
                        <Text strong>Cần trả khách</Text>
                        <Text>{calculateTotal().toLocaleString()}</Text>
                    </Flex>

                    {/* Ghi chú */}
                    <Form.Item name="notes">
                        <Input.TextArea
                            placeholder="Ghi chú"
                            autoSize={{ minRows: 3 }}
                            style={{ borderRadius: 8 }}
                        />
                    </Form.Item>
                </div>

                {/* Các nút thao tác */}
                <Flex gap={8}>
                    <Button type="primary" htmlType="submit" style={{ flex: 1 }} icon={<CheckOutlined />}>
                        Trả hàng
                    </Button>
                </Flex>
            </Flex>
            <CustomerModal />
        </Form>
    );
}

