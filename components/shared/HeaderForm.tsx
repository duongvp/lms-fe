"use client";
import { DatePicker, Empty, Flex, Typography } from 'antd';
import dayjs from 'dayjs';
import React from 'react';
import SelectWithButton from '../ui/Selects/SelectWithButton';
import useUserSelect from '@/hooks/useUserSelect';

const { Text } = Typography;

interface IHeaderFormProps {
    userIdSelected: number;
    setUserIdSelected: React.Dispatch<React.SetStateAction<number>>;
    dateTime: dayjs.Dayjs | null | undefined
    setDateTime: React.Dispatch<React.SetStateAction<dayjs.Dayjs | null | undefined>>
    minDateTime?: dayjs.Dayjs;
}

const HeaderForm: React.FC<IHeaderFormProps> = ({ userIdSelected, setUserIdSelected, dateTime, setDateTime, minDateTime }) => {
    const { options } = useUserSelect();

    return (
        <Flex align="center" justify="space-between" style={{ marginBottom: 16 }}>
            <Flex align="center">
                <Text strong>👤</Text>
                <SelectWithButton
                    options={options}
                    style={{ width: '100%' }}
                    styleWrapSelect={{ borderBottom: 'none' }}
                    placeholder="người tạo"
                    value={userIdSelected} // <-- dùng state
                    onChange={(value) => setUserIdSelected(Number(value))}
                    allowClear={false}
                    notFoundContent={
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="Không có kết quả phù hợp"
                        />
                    }
                />
            </Flex>
            <DatePicker
                showTime={{ format: 'HH:mm' }}
                defaultValue={dateTime}
                format="DD/MM/YYYY HH:mm"
                minDate={minDateTime}
                value={dateTime}
                onChange={(value) => setDateTime(value)}
                allowClear={false}
                suffixIcon={null}
                size="small"
                variant="borderless"
                className="custom-datepicker"
            />
        </Flex>
    );
}

export default HeaderForm;
