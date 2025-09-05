"use client";
import { DatePicker, Empty, Flex, Typography } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
import SelectWithButton from '../ui/Selects/SelectWithButton';
import useUserSelect from '@/hooks/useUserSelect';

const { Text } = Typography;

interface IHeaderFormProps {
    userIdSelected: number;
    setUserIdSelected: React.Dispatch<React.SetStateAction<number>>;
}

const HeaderForm: React.FC<IHeaderFormProps> = ({ userIdSelected, setUserIdSelected }) => {
    const { options } = useUserSelect();
    const [dateTime, setDateTime] = useState<dayjs.Dayjs | null | undefined>(dayjs());

    // ⏰ Cập nhật liên tục theo thời gian thực
    useEffect(() => {
        const timer = setInterval(() => {
            setDateTime(dayjs());
        }, 1000); // update mỗi giây
        return () => clearInterval(timer);
    }, [setDateTime]);


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

            <Text>
                {dateTime ? dateTime.format("DD/MM/YYYY HH:mm") : "--/--/---- --:--:--"}
            </Text>
            {/* <DatePicker
                showTime={{ format: 'HH:mm' }}
                defaultValue={dateTime}
                format="DD/MM/YYYY HH:mm"
                minDate={minDateTime}
                value={dateTime}
                onChange={(value) => setDateTime(value)}
                allowClear={false}
                disabled
                suffixIcon={null}
                size="small"
                variant="borderless"
                className="custom-datepicker"
            /> */}
        </Flex>
    );
}

export default HeaderForm;
