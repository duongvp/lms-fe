import React, { useEffect, useState } from 'react';
import { Drawer, Form, Button, Radio, DatePicker, Select, Space } from 'antd';
import { useAuthStore } from '@/stores/authStore';
import dayjs from 'dayjs';

interface FilterDrawerProps {
    open: boolean;
    onClose: () => void;
    handleSearch: (value: any) => void;
}

const initialValues = {
    dateRange: [dayjs().startOf('month'), dayjs().endOf('month')],
    branch: 'all',
    reportType: 'sales',
    displayType: 'report',
};

const ReportFilterDrawer: React.FC<FilterDrawerProps> = ({ open, onClose, handleSearch }) => {
    const [form] = Form.useForm();
    const { warehouseId } = useAuthStore((state) => state.user || {});
    const [formValueBeforeClose, setFormValueBeforeClose] = useState(initialValues);

    const onFinish = (values: any) => {
        const filter = Object.fromEntries(
            Object.entries(values).filter(([_, value]) => {
                if (value == null) return false;
                if (Array.isArray(value) && value.length === 0) return false;
                if (typeof value === 'string' && value.trim() === '') return false;
                return true;
            })
        );

        if (filter.dateRange) {
            const [from, to] = filter.dateRange as [dayjs.Dayjs, dayjs.Dayjs];
            filter.fromDate = dayjs(from).format('YYYY-MM-DD');
            filter.toDate = dayjs(to).format('YYYY-MM-DD');
            delete filter.dateRange;
        }

        setFormValueBeforeClose(values);
        handleSearch({ ...filter, warehouse_id: warehouseId });
        onClose();
    };

    const onReset = () => {
        form.resetFields();
        setFormValueBeforeClose(initialValues);
    };



    useEffect(() => {
        if (open) {
            form.setFieldsValue(formValueBeforeClose);
        }
    }, [open, formValueBeforeClose, form]);

    return (
        <Drawer
            title="Bộ lọc báo cáo"
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
            >
                <Form.Item label="Khoảng thời gian" name="dateRange">
                    <DatePicker.RangePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item label="Loại báo cáo" name="reportType">
                    <Radio.Group>
                        <Space direction="vertical">
                            <Radio value="sales">Bán hàng</Radio>
                            <Radio value="profit">Lợi nhuận</Radio>
                            <Radio value="inventory">Xuất nhập tồn</Radio>
                        </Space>
                    </Radio.Group>
                </Form.Item>

                <Form.Item label="Kiểu hiển thị" name="displayType">
                    <Radio.Group>
                        <Space direction="vertical">
                            <Radio value="chart">Biểu đồ</Radio>
                            <Radio value="report">Báo cáo</Radio>
                        </Space>
                    </Radio.Group>
                </Form.Item>


            </Form>
        </Drawer>
    );
};

export default ReportFilterDrawer;
