'use client';

import CustomSearchInput from '@/components/ui/Inputs/CustomSearchInput';
import { Flex, Input, Select } from 'antd';

interface TeacherProfileFiltersProps {
    search: string;
    teacherType: 0 | 1 | undefined;
    status: 0 | 1 | undefined;
    onSearchChange: (value: string) => void;
    onTeacherTypeChange: (
        value: 0 | 1 | undefined
    ) => void;
    onStatusChange: (
        value: 0 | 1 | undefined
    ) => void;
}

const TeacherProfileFilters = ({
    search,
    teacherType,
    status,
    onSearchChange,
    onTeacherTypeChange,
    onStatusChange,
}: TeacherProfileFiltersProps) => {
    return (
        <Flex
            gap={12}
            wrap
            style={{ marginBottom: 16 }}
        >
            <Input.Search
                allowClear
                placeholder="Tìm mã nhân sự hoặc họ tên"
                style={{ width: 320 }}
                value={search}
                onSearch={onSearchChange}
                onChange={(event) => {
                    if (!event.target.value) {
                        onSearchChange('');
                    }
                }}
            />

            <Select
                allowClear
                placeholder="Loại nhân sự"
                style={{ width: 180 }}
                value={teacherType}
                onChange={onTeacherTypeChange}
                options={[
                    {
                        value: 1,
                        label: 'Giáo viên',
                    },
                    {
                        value: 0,
                        label: 'Trợ giảng',
                    },
                ]}
            />

            <Select
                allowClear
                placeholder="Trạng thái"
                style={{ width: 160 }}
                value={status}
                onChange={onStatusChange}
                options={[
                    {
                        value: 1,
                        label: 'Hoạt động',
                    },
                    {
                        value: 0,
                        label: 'Ngừng hoạt động',
                    },
                ]}
            />
        </Flex>
    );
};

export default TeacherProfileFilters;
