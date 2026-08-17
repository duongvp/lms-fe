"use client";

import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Grid,
  Pagination,
  Select,
  Space,
  Spin,
  Table,
  Typography,
} from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import type { GetProp, TableProps } from "antd";

type ColumnsType<T extends object> = GetProp<TableProps<T>, "columns">;

interface CustomTableProps<T extends object> extends TableProps<T> {
  columns: ColumnsType<T>;
  dataSource: T[];
  /** Có thể tắt card responsive cho bảng có layout đặc thù. */
  responsiveCards?: boolean;
  /** Tiêu đề ngắn gọn hiển thị trên mỗi thẻ ở màn hình nhỏ. */
  responsiveCardTitle?: (record: T, index: number) => React.ReactNode;
}

const flattenColumns = <T extends object,>(columns: ColumnsType<T>): any[] => (
  (columns || []).flatMap((column: any) => (
    Array.isArray(column?.children) ? flattenColumns(column.children) : [column]
  ))
);

const renderedValue = <T extends object,>(
  column: any,
  record: T,
  index: number
) => {
  const raw = column.dataIndex === undefined
    ? undefined
    : Array.isArray(column.dataIndex)
      ? column.dataIndex.reduce((value: any, key: string | number) => value?.[key], record)
      : (record as any)[column.dataIndex];
  const rendered = typeof column.render === "function"
    ? column.render(raw, record, index)
    : raw;
  if (rendered && typeof rendered === "object" && !React.isValidElement(rendered) && "children" in rendered) {
    return rendered.children;
  }
  return rendered === undefined || rendered === null || rendered === "" ? "-" : rendered;
};

function CustomTable<T extends object>({
  columns,
  dataSource,
  responsiveCards = true,
  responsiveCardTitle,
  pagination,
  rowSelection,
  expandable,
  loading,
  rowKey,
  onRow,
  onChange,
  scroll,
  ...rest
}: CustomTableProps<T>) {
  const screens = Grid.useBreakpoint();
  const useCards = responsiveCards && !screens.lg;
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(10);
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<React.Key[]>([]);
  const [internalExpandedKeys, setInternalExpandedKeys] = useState<React.Key[]>([]);
  const [mobileSortKey, setMobileSortKey] = useState<string>();
  const [mobileSortOrder, setMobileSortOrder] = useState<"ascend" | "descend">("ascend");

  const leafColumns = useMemo(() => flattenColumns(columns), [columns]);
  const displayColumns = leafColumns.filter((column) => (
    column
    && column.title !== undefined
    && column.title !== ""
    && column.key !== "drag"
    && column.className !== "responsive-card-hidden"
  ));
  const sortableColumns = displayColumns.filter((column) => Boolean(column.sorter));
  const paginationConfig = pagination && typeof pagination === "object" ? pagination : {};
  const paginationEnabled = pagination !== false;
  const controlledPagination = paginationConfig.current !== undefined;
  const current = Number(paginationConfig.current ?? internalPage);
  const pageSize = Number(paginationConfig.pageSize ?? internalPageSize);
  const total = Number(paginationConfig.total ?? dataSource.length);
  const pageRows = paginationEnabled && !controlledPagination
    ? dataSource.slice((current - 1) * pageSize, current * pageSize)
    : dataSource;

  const getKey = (record: T, index: number): React.Key => {
    if (typeof rowKey === "function") return rowKey(record);
    const field = typeof rowKey === "string" ? rowKey : "key";
    return (record as any)[field] ?? index;
  };

  const selectedKeys = (rowSelection?.selectedRowKeys as React.Key[] | undefined)
    ?? internalSelectedKeys;
  const expandedKeys = (expandable?.expandedRowKeys as React.Key[] | undefined)
    ?? internalExpandedKeys;

  const updateSelection = (key: React.Key, record: T, checked: boolean) => {
    const nextKeys = checked
      ? Array.from(new Set([...selectedKeys, key]))
      : selectedKeys.filter((item) => item !== key);
    if (!rowSelection?.selectedRowKeys) setInternalSelectedKeys(nextKeys);
    const selectedRecords = dataSource.filter((item, index) => nextKeys.includes(getKey(item, index)));
    rowSelection?.onSelect?.(record, checked, selectedRecords, {} as any);
    rowSelection?.onChange?.(nextKeys, selectedRecords, { type: "single" });
  };

  const updateExpanded = (key: React.Key, record: T) => {
    const expanded = expandedKeys.includes(key);
    const nextKeys = expanded
      ? expandedKeys.filter((item) => item !== key)
      : [...expandedKeys, key];
    if (!expandable?.expandedRowKeys) setInternalExpandedKeys(nextKeys);
    expandable?.onExpand?.(!expanded, record);
    expandable?.onExpandedRowsChange?.(nextKeys);
  };

  const handlePageChange = (page: number, size: number) => {
    if (!controlledPagination) {
      setInternalPage(page);
      setInternalPageSize(size);
    }
    paginationConfig.onChange?.(page, size);
  };

  const applyMobileSort = (field: string, order = mobileSortOrder) => {
    setMobileSortKey(field);
    setMobileSortOrder(order);
    const column = sortableColumns.find((item) => String(item.dataIndex ?? item.key) === field);
    onChange?.(
      paginationConfig as any,
      {},
      { column, field, columnKey: column?.key ?? field, order } as any,
      { action: "sort", currentDataSource: dataSource } as any
    );
  };

  if (!useCards) {
    return (
      <Table<T>
        columns={columns}
        dataSource={dataSource}
        pagination={pagination}
        rowSelection={rowSelection}
        expandable={expandable}
        loading={loading}
        rowKey={rowKey}
        onRow={onRow}
        onChange={onChange}
        scroll={scroll ?? { x: "max-content" }}
        {...rest}
      />
    );
  }

  return (
    <Spin
      spinning={Boolean(loading)}
      wrapperClassName="responsive-table-spin"
      style={{ width: "100%", height: "100%" }}
    >
      <div className="responsive-table-scroll" style={{ width: "100%", minWidth: 0, height: "100%", overflowY: "auto", paddingRight: 2 }}>
        {sortableColumns.length > 0 && (
          <Space.Compact block style={{ marginBottom: 10 }}>
            <Select
              value={mobileSortKey}
              style={{ flex: 1 }}
              placeholder="Sắp xếp theo"
              options={sortableColumns.map((column) => ({
                value: String(column.dataIndex ?? column.key),
                label: column.title,
              }))}
              onChange={(value) => applyMobileSort(value)}
            />
            <Button
              disabled={!mobileSortKey}
              icon={mobileSortOrder === "ascend" ? <UpOutlined /> : <DownOutlined />}
              onClick={() => {
                if (!mobileSortKey) return;
                applyMobileSort(mobileSortKey, mobileSortOrder === "ascend" ? "descend" : "ascend");
              }}
            >
              {mobileSortOrder === "ascend" ? "Tăng" : "Giảm"}
            </Button>
          </Space.Compact>
        )}

        {!pageRows.length && !loading ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            {pageRows.map((record, index) => {
              const key = getKey(record, index);
              const checkboxProps = rowSelection?.getCheckboxProps?.(record) ?? {};
              const isExpanded = expandedKeys.includes(key);
              const rowProps = onRow?.(record, index) ?? {};
              return (
                <div key={key} {...(rowProps as any)} style={{ minWidth: 0, ...(rowProps.style || {}) }}>
                  <Card
                    className="responsive-table-card"
                    size="small"
                    styles={{ body: { padding: screens.md ? 14 : 12 } }}
                    title={rowSelection ? (
                      <Checkbox
                        checked={selectedKeys.includes(key)}
                        disabled={checkboxProps.disabled}
                        title={checkboxProps.title}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => updateSelection(key, record, event.target.checked)}
                      >
                        {responsiveCardTitle?.(record, index) || (
                          <Typography.Text strong>Bản ghi {Number((current - 1) * pageSize) + index + 1}</Typography.Text>
                        )}
                      </Checkbox>
                    ) : responsiveCardTitle?.(record, index)}
                  >
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: screens.md ? "repeat(2, minmax(0, 1fr))" : "minmax(0, 1fr)",
                      gap: "10px 16px",
                    }}>
                      {displayColumns.map((column, columnIndex) => (
                        <div key={String(column.key ?? column.dataIndex ?? columnIndex)} style={{ minWidth: 0 }}>
                          <Typography.Text type="secondary" style={{ display: "block", fontSize: 12, marginBottom: 2 }}>
                            {column.title}
                          </Typography.Text>
                          <div style={{ overflowWrap: "anywhere" }}>
                            {renderedValue(column, record, index)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {expandable?.expandedRowRender && (
                      <div style={{ marginTop: 10 }}>
                        <Button
                          type="link"
                          size="small"
                          style={{ paddingInline: 0 }}
                          onClick={(event) => {
                            event.stopPropagation();
                            updateExpanded(key, record);
                          }}
                        >
                          {isExpanded ? "Ẩn chi tiết" : "Xem chi tiết"}
                        </Button>
                        {isExpanded && (
                          <div style={{ marginTop: 8, paddingTop: 10, borderTop: "1px solid #f0f0f0" }}>
                            {expandable.expandedRowRender(record, index, 0, true)}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                </div>
              );
            })}
          </Space>
        )}

        {paginationEnabled && total > 0 && (
          <Pagination
            size="small"
            current={current}
            pageSize={pageSize}
            total={total}
            showSizeChanger={screens.md && paginationConfig.showSizeChanger !== false}
            pageSizeOptions={paginationConfig.pageSizeOptions}
            showTotal={paginationConfig.showTotal}
            onChange={handlePageChange}
            responsive
            style={{ marginTop: 14, display: "flex", justifyContent: screens.md ? "flex-end" : "center", flexWrap: "wrap" }}
          />
        )}
      </div>
    </Spin>
  );
}

export default CustomTable;
