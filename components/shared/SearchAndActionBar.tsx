'use client'
import { Button, Row, Col, Flex, Dropdown, Menu } from 'antd';
import { CaretDownOutlined, FilterOutlined, MoreOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import CustomSearchInput from '@/components/ui/Inputs/CustomSearchInput';
import React from 'react';

interface SearchAndActionsBarProps {
    showSearch?: boolean;
    titleBtnAdd?: string;
    onSearch: (value: string) => Promise<any>;
    handleAddBtn?: React.MouseEventHandler<HTMLElement>;
    handleFilterBtn?: React.MouseEventHandler<HTMLElement>;
    handlePrintBarcode?: () => void;
    placeholder?: string;
    extraButtons?: React.ReactNode;
    extraExportButton?: React.ReactNode;
    handleImportClick?: React.MouseEventHandler<HTMLElement>;
}

export default function SearchAndActionsBar({
    showSearch = true,
    onSearch,
    titleBtnAdd = "Thêm mới",
    handleAddBtn,
    placeholder = 'Tìm kiếm...',
    extraButtons,
    extraExportButton,
    handleFilterBtn,
    handleImportClick,
    handlePrintBarcode
}: Partial<SearchAndActionsBarProps>) {

    const menu = (
        <Menu
            items={[
                { key: '1', label: 'In tem mã' },
                { key: '2', label: 'Xóa hàng hóa' },
            ]}
            onClick={(e) => {
                if (e.key === '1' && handlePrintBarcode) {
                    handlePrintBarcode();
                }
            }}
        />
    );

    return (
        <Row style={{ width: '100%', marginBottom: '16px' }} gutter={[16, 8]}>
            <Col xxl={6} lg={8} md={12} sm={24} xs={24}>
                {showSearch && (
                    <CustomSearchInput
                        placeholder={placeholder}
                        fetchApi={onSearch}
                    />
                )}
            </Col>
            <Col xxl={18} lg={16} md={12} sm={24} xs={24}>
                <Flex
                    vertical
                    align='stretch'
                    justify='end'
                    style={{ gap: 8 }} // dùng style thay vì prop gap nếu cần độ tương thích cao
                >
                    <Flex wrap="wrap" justify="end" gap={8}>
                        {
                            handlePrintBarcode && (
                                <Dropdown overlay={menu} trigger={['click']}>
                                    <Button type="primary" icon={<MoreOutlined />}>
                                        Thao tác <CaretDownOutlined />
                                    </Button>
                                </Dropdown>
                            )
                        }
                        {
                            handleAddBtn && (
                                <Button type="primary" onClick={handleAddBtn} icon={<PlusOutlined />}>
                                    {titleBtnAdd}
                                    <CaretDownOutlined />
                                </Button>
                            )
                        }
                        {handleImportClick && (
                            <Button
                                type="primary"
                                icon={<UploadOutlined />}
                                onClick={handleImportClick}
                            >
                                Import
                            </Button>
                        )}

                        {extraExportButton}

                        {handleFilterBtn && (
                            <Button type="default" onClick={handleFilterBtn} icon={<FilterOutlined />} />
                        )}
                    </Flex>
                </Flex>
            </Col>

            {extraButtons}
        </Row>
    );
}