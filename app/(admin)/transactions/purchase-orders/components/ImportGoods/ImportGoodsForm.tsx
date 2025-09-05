import { useEffect, useState } from 'react';
import { Form, Typography, Button, Flex, Input, Empty } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import CustomInput from '@/components/ui/Inputs'; // bạn nhớ tạo cho chuẩn nhé
import SelectWithButton from '@/components/ui/Selects/SelectWithButton';
import SupplierModal from '@/app/(admin)/partners/suppliers/components/Modal/SupplierModal';
import useSupplierStore from '@/stores/supplierStore';
import HeaderForm from '@/components/shared/HeaderForm';
import { createPurchaseOrder, IPurchaseOrderBase, IPurchaseOrderSummary, updatePurchaseOrder } from '@/services/purchaseOrderService';
import { isEmpty } from 'lodash';
import { ActionType } from '@/enums/action';
import { showErrorMessage, showSuccessMessage } from '@/ultils/message';
import { PurchaseOrderStatus } from '@/enums/status';
import dayjs from 'dayjs';
import { useAuthStore } from '@/stores/authStore';
import { ITypeImportInvoice } from '@/types/invoice';
import { IDataTypeProductSelect } from '@/types/productSelect';
import { useRouter } from 'next/navigation';
import useSupplierSelect from '@/hooks/useSupplierSelect';
import useProductStore from '@/stores/productStore';
import { PermissionKey } from '@/types/permissions';

const { Text } = Typography;

interface ImportGoodsFormProps {
    subtotal: number;
    poInfos: Partial<IPurchaseOrderBase>;
    poSummary?: Partial<IPurchaseOrderSummary>;
    type?: ITypeImportInvoice;
    dataSource: IDataTypeProductSelect[]
    setDataSource: React.Dispatch<React.SetStateAction<IDataTypeProductSelect[]>>;

}

export default function ImportGoodsForm({ subtotal, poInfos, poSummary, type, dataSource, setDataSource }: ImportGoodsFormProps) {
    const [form] = Form.useForm();
    const [discountAmount, setDiscountAmount] = useState<number>(0);
    const [paymentToSupplier, setPaymentToSupplier] = useState<number>(0);
    const [debt, setDebt] = useState<number>(0);
    const { setModal } = useSupplierStore();
    const [searchTerm, setSearchTerm] = useState('');
    const { options, handleScroll } = useSupplierSelect(searchTerm, form, poInfos);
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const { warehouseId, userId } = useAuthStore(state => state.user);
    const [userIdSelected, setUserIdSelected] = useState<number>(userId);
    // const [dateTimeSelected, setDateTimeSelected] = useState<dayjs.Dayjs | null | undefined>(dayjs());
    const { setShouldReload } = useProductStore();
    const { hasPermission } = useAuthStore();

    const router = useRouter()

    const resetForm = () => {
        form.resetFields();
        setDataSource([]);
    }

    const calculateTotal = () => {
        const total = subtotal - discountAmount;
        return total >= 0 ? total : 0;
    };

    const calculateDebt = () => {
        const total = paymentToSupplier - calculateTotal();
        setDebt(total);
    };

    const handleFinish = async (values: any) => {
        try {
            setLoadingSubmit(true);
            await handleCreatePurchaseOrder(values);
        } finally {
            setLoadingSubmit(false);
        }
    };

    const handleCreatePurchaseOrder = async (values: any) => {
        try {
            if (dataSource.length === 0) return
            const details = dataSource.map((item: any) => ({
                product_id: item.id,
                quantity: item.quantity,
                discount: item.discount,
                unit_price: item.unitPrice,
                total_price: item.totalPrice
            }))
            const newValues = {
                supplier_id: values.supplier_id,
                user_id: userIdSelected,
                warehouse_id: warehouseId,
                subtotal,
                discount_amount: discountAmount,
                total_amount: calculateTotal(),
                amount_paid: paymentToSupplier,
                debt_amount: debt,
                order_date: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                status: PurchaseOrderStatus.RECEIVED,
                details
            }
            console.log('newValues', newValues);
            if (type === 'edit') {
                await updatePurchaseOrder(poInfos.po_id ?? 0, newValues);
                showSuccessMessage('Cập nhật phiếu nhập thành công')
                router.push('/transactions/purchase-orders');

            } else {
                await createPurchaseOrder(newValues);
                showSuccessMessage('Tạo phiếu nhập thành công')
                resetForm();
            }
            setShouldReload(true);
        } catch (error) {
            console.error('error', error);
            if (type === 'edit') {
                showErrorMessage('Cập nhật phiếu nhập thất bại')
            } else {
                showErrorMessage('Tạo phiếu nhập thất bại')
            }
        }
    }

    const handleAddSupplier = () => {
        setModal({ open: true, type: ActionType.CREATE, suppliers: null });
    }

    useEffect(() => {
        if (!isEmpty(poInfos)) {
            form.setFieldsValue({ supplier_id: poInfos?.supplier_id });
            if (type === 'edit') {
                form.setFieldsValue({ po_code: poInfos?.po_code });
            }
            setUserIdSelected(poInfos?.user_id as number);
            if (poSummary) {
                setDiscountAmount(Number(poSummary?.discount_amount) || 0);
                setPaymentToSupplier(Number(poSummary?.amount_paid) || 0);
            }
        }
    }, [poInfos, type, poSummary])

    useEffect(() => {
        calculateDebt();
    }, [subtotal, discountAmount, paymentToSupplier]);

    useEffect(() => {
        if (userId !== -1) setUserIdSelected(userId)
    }, [userId])

    useEffect(() => {
        if (type == "create") {
            setPaymentToSupplier(calculateTotal())
        }
    }, [subtotal, discountAmount, type])

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

                    <Form.Item name="supplier_id">
                        <SelectWithButton
                            options={options}
                            style={{ width: '100%' }}
                            styleWrapSelect={{ borderBottom: '1px solid #d9d9d9' }}
                            placeholder="Tìm nhà cung cấp"
                            onSearch={setSearchTerm}
                            onAddClick={hasPermission(PermissionKey.SUPPLIER_CREATE) ? handleAddSupplier : undefined}
                            onPopupScroll={handleScroll}
                            notFoundContent={
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="Không có kết quả phù hợp"
                                />
                            }
                        />
                    </Form.Item>

                    {/* Tổng tiền */}
                    <Flex justify='space-between' style={{ marginBottom: 8 }}>
                        <Text strong >Tổng thành tiền</Text>
                        <Text>{subtotal.toLocaleString()}</Text>
                    </Flex>

                    {/* Giảm giá */}
                    <CustomInput
                        label="Giảm giá"
                        name="discountAmount"
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

                    {/* Cần trả */}
                    <Flex justify="space-between" style={{ marginBottom: 16, marginTop: 12 }}>
                        <Text strong>Cần trả nhà cung cấp</Text>
                        <Text>{calculateTotal().toLocaleString()}</Text>
                    </Flex>

                    <CustomInput
                        label="Tiền trả NCC"
                        name="paymentToSupplier"
                        isNumber
                        lablelStyle={{ width: "70%" }}
                        inputNumberProps={{
                            min: 0,
                            value: paymentToSupplier,
                            formatter: (val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
                            parser: (val) => val?.replace(/,/g, '') || '0',
                            onChange: (value) => setPaymentToSupplier(Number(value) || 0),
                        }}
                    />

                    <Flex justify="space-between" style={{ marginBottom: 16, marginTop: 12 }}>
                        <Text strong>Tính vào công nợ</Text>
                        <Text>{debt.toLocaleString()}</Text>
                    </Flex>

                    {/* Ghi chú */}
                    <Form.Item name="note">
                        <Input.TextArea
                            placeholder="Ghi chú"
                            autoSize={{ minRows: 3 }}
                            style={{ borderRadius: 8 }}
                        />
                    </Form.Item>
                </div>

                {/* Các nút thao tác */}
                <Flex>
                    <Button
                        type="primary"
                        htmlType="submit"
                        style={{ flex: 1 }}
                        icon={<CheckOutlined />}
                        loading={loadingSubmit}
                    >
                        {type === "create" ? "Hoàn thành" : "Cập nhật"}
                    </Button>
                </Flex>
            </Flex>
            <SupplierModal />
        </Form>
    );
}
