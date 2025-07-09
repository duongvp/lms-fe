import React, { useEffect, useState } from 'react';
import { Drawer, Form, Checkbox, Button, Row, Col, Radio } from 'antd';
import type { CheckboxChangeEvent } from 'antd/es/checkbox';
import useCategoryStore from '@/stores/categoryStore';
import { useAuthStore } from '@/stores/authStore';

interface FilterDrawerProps {
    open: boolean;
    onClose: () => void;
    handleSearch: (value: any) => void;
}

const initialValues = {
    is_active: 'all',
    stock: 'all',
    categoryIds: [],
}

const FilterProductDrawer: React.FC<FilterDrawerProps> = ({ open, onClose, handleSearch }) => {
    const [form] = Form.useForm();
    const [allChecked, setAllChecked] = useState(false);
    const [indeterminate, setIndeterminate] = useState(false);
    const { optionsCategory } = useCategoryStore();
    const { warehouseId } = useAuthStore((state) => state.user)
    const [formValueBeforeClose, setFormValueBeforeClose] = useState(initialValues)

    const onFinish = async (values: any) => {
        if (values.is_active === 'all') {
            delete values.is_active;
        }

        if (values.stock === 'all') {
            delete values.stock;
        }

        setFormValueBeforeClose(values)
        console.log("filter", values);

        const filter = Object.fromEntries(
            Object.entries(values).filter(([_, value]) => {
                if (value == null) return false;
                if (Array.isArray(value) && value.length === 0) return false;
                if (typeof value === 'string' && value.trim() === '') return false;
                return true;
            })
        );

        // Gọi callback truyền ra bên ngoài
        handleSearch({ ...filter, warehouse_id: warehouseId });
        onClose();
    };

    const onReset = () => {
        form.resetFields();
        setAllChecked(false);
        setIndeterminate(false);
        setFormValueBeforeClose(initialValues)
    };

    // Cập nhật trạng thái checkbox cha khi giá trị categoryIds thay đổi
    const onCategoryChange = (checkedValues: any[]) => {
        const total = optionsCategory.length;
        const checkedCount = checkedValues.length;
        setAllChecked(checkedCount === total && total > 0);
        setIndeterminate(checkedCount > 0 && checkedCount < total);
    };

    // Xử lý khi checkbox cha được click
    const onCheckAllChange = (e: CheckboxChangeEvent) => {
        const checked = e.target.checked;
        const values = checked ? optionsCategory.map((item) => item.value) : [];
        form.setFieldsValue({ categoryIds: values });
        setAllChecked(checked);
        setIndeterminate(false);
    };

    useEffect(() => {
        if (open) {
            form.setFieldsValue(formValueBeforeClose)
        }
    }, [open, formValueBeforeClose])

    return (
        <Drawer
            title="Bộ lọc sản phẩm"
            placement="right"
            onClose={onClose}
            open={open}
            footer={
                <div style={{ textAlign: 'right' }}>
                    <Button onClick={onReset} style={{ marginRight: 8 }}>
                        Đặt lại
                    </Button>
                    <Button type="primary" onClick={() => form.submit()}>
                        Áp dụng
                    </Button>
                </div>
            }
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={initialValues}
                onValuesChange={(changedValues, allValues) => {
                    if (changedValues.categoryIds !== undefined) {
                        onCategoryChange(allValues.categoryIds || []);
                    }
                }}
            >
                <Form.Item
                    label={
                        <Checkbox
                            indeterminate={indeterminate}
                            onChange={onCheckAllChange}
                            checked={allChecked}
                        >
                            <span style={{ fontWeight: 600, color: '#222' }}>Nhóm hàng</span>
                        </Checkbox>
                    }
                    style={{ marginBottom: 16 }}
                // Không đặt name cho Form.Item này vì checkbox cha không phải field
                >
                    <Form.Item name="categoryIds" noStyle>
                        <Checkbox.Group style={{ width: '100%' }} onChange={onCategoryChange}>
                            <Row gutter={[0, 8]}>
                                {optionsCategory.map((item, index) => (
                                    <Col span={24} key={index}>
                                        <Checkbox value={item.value}>{item.label}</Checkbox>
                                    </Col>
                                ))}
                            </Row>
                        </Checkbox.Group>
                    </Form.Item>
                </Form.Item>

                <Form.Item
                    label={<span style={{ fontWeight: 600, color: '#222' }}>Trạng thái</span>}
                    name="is_active"
                    style={{ marginBottom: 16 }}
                >
                    <Radio.Group style={{ width: '100%' }}>
                        <Row gutter={[0, 8]}>
                            <Col span={24}><Radio value="all">Tất cả</Radio></Col>
                            <Col span={24}><Radio value="1">Đang kinh doanh</Radio></Col>
                            <Col span={24}><Radio value="0">Ngừng kinh doanh</Radio></Col>
                        </Row>
                    </Radio.Group>
                </Form.Item>

                <Form.Item
                    label={<span style={{ fontWeight: 600, color: '#222' }}>Tồn kho</span>}
                    name="stock"
                    style={{ marginBottom: 16 }}
                >
                    <Radio.Group style={{ width: '100%' }}>
                        <Row gutter={[0, 8]}>
                            <Col span={24}><Radio value="all">Tất cả</Radio></Col>
                            <Col span={24}><Radio value="1">Còn hàng trong kho</Radio></Col>
                            <Col span={24}><Radio value="0">Hết hàng trong kho</Radio></Col>
                        </Row>
                    </Radio.Group>
                </Form.Item>
            </Form>
        </Drawer>
    );
};

export default FilterProductDrawer;
