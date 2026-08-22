'use client'
import { Button, Row, Col, Flex, Dropdown, Menu, Grid } from 'antd';
import { CaretDownOutlined, FilterOutlined, MoreOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import CustomSearchInput from '@/components/ui/Inputs/CustomSearchInput';
import React from 'react';

interface SearchAndActionsBarProps {
    showSearch?: boolean;
    titleBtnAdd?: string;
    titleBtnImport?: string;
    onSearch: (value: string) => Promise<any>;
    handleAddBtn?: React.MouseEventHandler<HTMLElement>;
    handleFilterBtn?: React.MouseEventHandler<HTMLElement>;
    filterLabel?: string;
    handlePrintBarcode?: () => void;
    handleDeleteProducts?: () => void;
    placeholder?: string;
    extraButtons?: React.ReactNode;
    extraExportButton?: React.ReactNode;
    secondaryActions?: React.ReactNode;
    actionClassName?: string;
    handleImportClick?: React.MouseEventHandler<HTMLElement>;
    importBtnStyle?: React.CSSProperties;
}

export default function SearchAndActionsBar({
    showSearch = true,
    onSearch,
    titleBtnAdd = "Thêm mới",
    titleBtnImport = "Import",
    handleAddBtn,
    placeholder = 'Tìm kiếm...',
    extraButtons,
    extraExportButton,
    secondaryActions,
    actionClassName,
    handleFilterBtn,
    filterLabel,
    handleImportClick,
    handlePrintBarcode,
    handleDeleteProducts,
    importBtnStyle,
}: Partial<SearchAndActionsBarProps>) {
    const screens = Grid.useBreakpoint();
    const compact = !screens.md;

    const menu = (
        <Menu
            items={[
                { key: '1', label: 'In tem mã' },
                // { key: '2', label: 'Xóa hàng hóa' },
            ]}
            onClick={(e) => {
                if (e.key === '1' && handlePrintBarcode) {
                    handlePrintBarcode();
                } else if (e.key === '2' && handleDeleteProducts) {
                    handleDeleteProducts();
                }
            }}
        />
    );

    return (
        <Row className="responsive-search-actions" style={{ width: '100%', marginBottom: '16px' }} gutter={[16, 8]}>
            <Col xxl={6} lg={8} md={10} sm={24} xs={24}>
                {showSearch && (
                    <CustomSearchInput
                        placeholder={placeholder}
                        fetchApi={onSearch}
                    />
                )}
            </Col>
            <Col xxl={18} lg={16} md={14} sm={24} xs={24}>
                <Flex
                    vertical
                    align='stretch'
                    justify='end'
                    style={{ gap: 8 }} // dùng style thay vì prop gap nếu cần độ tương thích cao
                >
                    <Flex className={`responsive-action-buttons ${actionClassName || ''}`.trim()} wrap="wrap" justify={compact ? "start" : "end"} gap={8}>
                        {
                            (handlePrintBarcode || handleDeleteProducts) && (
                                <Dropdown menu={{ items: menu.props.items, onClick: menu.props.onClick }} trigger={['click']}>
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
                                style={importBtnStyle}
                            >
                                {titleBtnImport}
                            </Button>
                        )}

                        {secondaryActions ? (
                            <div className="responsive-secondary-actions">
                                {secondaryActions}
                            </div>
                        ) : (
                            <>
                                {extraExportButton}
                                {handleFilterBtn && (
                                    <Button type="default" onClick={handleFilterBtn} icon={<FilterOutlined />}>
                                        {filterLabel}
                                    </Button>
                                )}
                            </>
                        )}
                    </Flex>
                </Flex>
            </Col>

            {extraButtons && <Col span={24}>{extraButtons}</Col>}
        </Row>
    );
}
