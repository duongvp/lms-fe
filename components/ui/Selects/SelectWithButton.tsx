import { PlusOutlined } from "@ant-design/icons";
import { Button, Empty, Select, Space } from "antd";
import type { SelectProps } from "antd";

interface SelectWithButtonProps extends SelectProps<string | number> {
    styleWrapSelect?: React.CSSProperties;
    onAddClick?: () => void;
}

const SelectWithButton = ({
    options = [],
    placeholder,
    onAddClick,
    styleWrapSelect,
    value,
    onChange,
    onSearch, // nhận onSearch nếu có
    ...restProps
}: SelectWithButtonProps) => {
    return (
        <Space.Compact
            style={{
                display: 'flex',
                ...(styleWrapSelect ? styleWrapSelect : {
                    border: '1px solid #d9d9d9',
                    borderRadius: 6
                }),
            }}
        >
            <Select
                allowClear
                showSearch
                placeholder={placeholder}
                options={options}
                popupMatchSelectWidth={false}
                optionLabelProp="labelText"
                variant="borderless"
                value={value}
                // onChange={onChange}
                onChange={(val, option) => {
                    if (val === undefined || val === null) {
                        // Khi clear chọn
                        onSearch?.(''); // gọi lại để reset searchTerm
                    }
                    onChange?.(val, option);
                }}
                onSearch={onSearch} // dùng nếu được truyền
                notFoundContent={
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Không có dữ liệu"
                    />
                }
                filterOption={onSearch ? false : (input, option) =>
                    (option as any).labelText?.toLowerCase().includes(input.toLowerCase())
                }
                {...restProps}
            />
            {
                onAddClick && (
                    <Button
                        type="text"
                        icon={<PlusOutlined />}
                        onClick={onAddClick}
                        style={{
                            borderTopLeftRadius: 0,
                            borderBottomLeftRadius: 0,
                        }}
                    />
                )
            }
        </Space.Compact>
    );
};

export default SelectWithButton;
