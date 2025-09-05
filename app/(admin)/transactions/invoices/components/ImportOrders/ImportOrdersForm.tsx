import { useEffect, useState } from 'react';
import { Form, Typography, Button, Flex, Input, Empty, Alert } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import CustomInput from '@/components/ui/Inputs'; // bạn nhớ tạo cho chuẩn nhé
import SelectWithButton from '@/components/ui/Selects/SelectWithButton';
import { IInvoiceDetail, ITypeImportInvoice } from '@/types/invoice';
import useCustomerSelect from '@/hooks/useCustomerSelect';
import CustomerModal from '@/app/(admin)/partners/customers/components/Modal/CustomerModal';
import useCustomerStore from '@/stores/customerStore';
import { InvoiceStatus } from '@/enums/invoice';
import HeaderForm from '@/components/shared/HeaderForm';
import { ActionType } from '@/enums/action';
import { showErrorMessage, showSuccessMessage, showWarningMessage } from '@/ultils/message';
import { createInvoice, updateInvoice } from '@/services/invoiceService';
import dayjs from 'dayjs';
import { useAuthStore } from '@/stores/authStore';
import { isEmpty } from 'lodash';
import { IDataTypeProductSelect } from '@/types/productSelect';
import { PermissionKey } from '@/types/permissions';
import useProductStore from '@/stores/productStore';
import { useTabStore } from '@/stores/tabStore';

const { Text } = Typography;

interface ImportOrdersFormProps {
    subtotal: number;
    setSubtotal: React.Dispatch<number>;
    type: ITypeImportInvoice;
    invoiceDetails: Partial<IInvoiceDetail>;
    invoiceSummary: any;
    dataSource: IDataTypeProductSelect[]
    setDataSource: React.Dispatch<React.SetStateAction<IDataTypeProductSelect[]>>;
}

export default function ImportOrdersForm({ subtotal, setSubtotal, type, invoiceDetails, invoiceSummary, dataSource, setDataSource }: ImportOrdersFormProps) {
    const [form] = Form.useForm();
    const [discountAmount, setDiscountAmount] = useState<number>(0);
    const [VAT, setVAT] = useState<number>(0);
    const [customerPayment, setCustomerPayment] = useState<number>(0);
    const { setModal } = useCustomerStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const { warehouseId, userId } = useAuthStore(state => state.user);
    const [userIdSelected, setUserIdSelected] = useState<number>(userId);
    const { options, handleScroll } = useCustomerSelect(searchTerm, form, invoiceDetails)
    const { hasPermission } = useAuthStore();
    const { setShouldReload } = useProductStore()
    const { closeTab } = useTabStore();

    const resetForm = () => {
        setDataSource([])
        setSubtotal(0)
        setVAT(0)
        setDiscountAmount(0)
        form.resetFields();
    }

    const handleFinish = async (values: any) => {
        try {
            setLoadingSubmit(true);
            await handleCreateInvoice(values);
        } finally {
            setLoadingSubmit(false);
        }
    };

    const handleCreateInvoice = async (values: any) => {
        if (warehouseId === -1) return
        if (dataSource.length === 0) {
            showWarningMessage('Hoá đơn chỉ được tạo khi có tối thiểu 1 sản phẩm được chọn')
            return
        }
        try {
            const details = dataSource.map((item: any) => ({
                product_id: item.id,
                quantity: item.quantity,
                discount: item.discount,
                unit_price: item.unitPrice,
                total_price: item.totalPrice
            }))
            const newValues = {
                customer_id: values.customer_id,
                user_id: userIdSelected,
                warehouse_id: warehouseId,
                subtotal,
                discount_amount: discountAmount,
                total_amount: calculateTotal(),
                amount_paid: customerPayment,
                debt_amount: calculateDebt(),
                VAT: VAT,
                // invoice_date: dateTimeSelected?.format('YYYY-MM-DD HH:mm:ss'),
                invoice_date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                status: InvoiceStatus.RECEIVED,
                notes: values.notes,
                details
            }
            if (type === 'edit') {
                await updateInvoice(invoiceDetails.invoice_id ?? 0, newValues);
                showSuccessMessage('Cập nhật hoá đơn thành công')
                setShouldReload(true);
                closeTab('update');
            } else {
                await createInvoice(newValues);
                showSuccessMessage('Tạo hoá đơn thành công')
                setShouldReload(true);
                if (type === 'copy') closeTab('copy');
                resetForm();
            }
        } catch (error: any) {
            showErrorMessage(error.message || 'Tạo hoá đơn thất bại')
        }
    }

    const calculateTotal = () => {
        const total = (subtotal - discountAmount) * (1 + VAT / 100);
        return total >= 0 ? Math.round(total) : 0;
    };

    const calculateDebt = () => {
        const total = customerPayment - calculateTotal();
        return total;
    };

    const handleAddCustomer = () => {
        setModal({ open: true, type: ActionType.CREATE, customer: null })
    };

    useEffect(() => {
        if (!isEmpty(invoiceDetails) && !isEmpty(invoiceSummary)) {
            form.setFieldsValue({
                customer_id: invoiceDetails?.customer_id,
                invoice_code: invoiceDetails?.invoice_code
            });
            setUserIdSelected(invoiceDetails?.user_id as number);
            // setDateTimeSelected(dayjs(invoiceDetails?.invoice_date));
            setDiscountAmount(invoiceSummary?.discount_amount);
            setVAT(invoiceSummary?.VAT);
            setCustomerPayment(invoiceSummary?.amount_paid);
        }
    }, [invoiceDetails, type, invoiceSummary])

    useEffect(() => {
        if (userId !== -1) setUserIdSelected(userId)
    }, [userId])

    useEffect(() => {
        if (type == "create") {
            console.log("calculateTotal()", calculateTotal());
            setCustomerPayment(calculateTotal())
        }
    }, [subtotal, discountAmount, type, VAT])


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
                    <Form.Item name="customer_id">
                        <SelectWithButton
                            options={options}
                            style={{ width: '100%' }}
                            styleWrapSelect={{ borderBottom: '1px solid #d9d9d9' }}
                            placeholder="Tìm khách hàng"
                            onSearch={setSearchTerm}
                            onAddClick={hasPermission(PermissionKey.CUSTOMER_CREATE) ? handleAddCustomer : undefined}
                            onPopupScroll={handleScroll}
                            notFoundContent={
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="Không có kết quả phù hợp"
                                />
                            }
                        />
                    </Form.Item>

                    <Flex justify='space-between' style={{ marginBottom: 8 }}>
                        <Text>Tổng số hàng đặt</Text>
                        <Text>{subtotal.toLocaleString()}</Text>
                    </Flex>

                    {/* Tổng tiền */}
                    <Flex justify='space-between' style={{ marginBottom: 8 }}>
                        <Text strong >Tổng thành tiền</Text>
                        <Text>{subtotal.toLocaleString()}</Text>
                    </Flex>

                    {/* Giảm giá */}
                    <CustomInput
                        label="Giảm giá"
                        name="discount_amount"
                        isNumber
                        lablelStyle={{ width: "70%" }}
                        inputNumberProps={{
                            min: 0,
                            value: discountAmount,
                            formatter: (val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
                            parser: (val) => val?.replace(/,/g, '') || '0',
                            onChange: (value) => setDiscountAmount(Number(value) || 0),
                        }}
                    />
                    <div style={{ marginTop: 8 }}>
                        <CustomInput
                            label="VAT(%)"
                            name="VAT"
                            isNumber
                            lablelStyle={{ width: "70%" }}
                            inputNumberProps={{
                                min: 0,
                                value: VAT,
                                formatter: (val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
                                parser: (val) => val?.replace(/,/g, '') || '0',
                                onChange: (value) => setVAT(Number(value) || 0),
                            }}
                        />
                    </div>
                    {/* <Flex justify="space-between" style={{ marginBottom: 16, marginTop: 12 }}>
                        <Text strong>Tổng cộng</Text>
                        <Text>{calculateTotal().toLocaleString()}</Text>
                    </Flex> */}
                    {/* Cần trả */}
                    <Flex justify="space-between" style={{ marginBottom: 16, marginTop: 12 }}>
                        <Text strong>Khách cần trả</Text>
                        <Text>{calculateTotal().toLocaleString()}</Text>
                    </Flex>

                    <CustomInput
                        label="Khách thanh toán"
                        name="amount_paid"
                        isNumber
                        lablelStyle={{ width: "70%" }}
                        inputNumberProps={{
                            min: 0,
                            value: customerPayment,
                            formatter: (val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
                            parser: (val) => val?.replace(/,/g, '') || '0',
                            onChange: (value) => setCustomerPayment(Number(value) || 0),
                        }}
                    />

                    <Flex justify="space-between" style={{ marginBottom: 16, marginTop: 12 }}>
                        <Text strong>Tính vào công nợ</Text>
                        <Text>{calculateDebt().toLocaleString()}</Text>
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


                <Flex gap={8}>
                    <Button
                        type='primary'
                        htmlType="submit"
                        style={{ flex: 1 }}
                        icon={<CheckOutlined />}
                        loading={loadingSubmit}
                    >
                        {
                            type === "create" ? "Hoàn thành" : "Cập nhật"
                        }
                    </Button>
                </Flex>
            </Flex>
            <CustomerModal />
        </Form>
    );
}
