"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Grid,
  Pagination,
  Space,
  Spin,
  Table,
  Typography,
} from "antd";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import type { GetProp, TableProps } from "antd";
import type { TableRef } from "antd/es/table";
import Select from "./MobileSelect";

type ColumnsType<T extends object> = GetProp<TableProps<T>, "columns">;
const MemoTable = React.memo(Table) as <T extends object>(
  props: TableProps<T> & React.RefAttributes<TableRef>
) => React.ReactElement;
const DEFAULT_SCROLL = { x: "max-content" };

interface CustomTableProps<T extends object> extends TableProps<T> {
  columns: ColumnsType<T>;
  dataSource: T[];
  /** Có thể tắt card responsive cho bảng có layout đặc thù. */
  responsiveCards?: boolean;
  /** Whether the current query already has cached data for pagination. */
  paginationDataCached?: boolean;
  /** Hide controls while a new result is loading, without changing table paging. */
  paginationVisible?: boolean;
  /** Paint pagination feedback before updating a large server-side table. */
  immediatePagination?: boolean;
  /** Tiêu đề ngắn gọn hiển thị trên mỗi thẻ ở màn hình nhỏ. */
  responsiveCardTitle?: (record: T, index: number) => React.ReactNode;
  responsiveCardExtra?: (record: T, index: number) => React.ReactNode;
  responsiveCardContent?: (record: T, index: number, controls: { expanded: boolean; toggleExpanded: () => void }) => React.ReactNode;
  responsiveCardBreakpoint?: "md" | "lg";
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
  paginationDataCached,
  paginationVisible = true,
  immediatePagination = false,
  responsiveCardTitle,
  responsiveCardExtra,
  responsiveCardContent,
  responsiveCardBreakpoint = "lg",
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
  const useCards = responsiveCards && (responsiveCardBreakpoint === "md" ? !screens.md : !screens.lg);
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(10);
  const [paginationFeedback, setPaginationFeedback] = useState<"visible" | "settling" | null>(null);
  const [paginationCacheMiss, setPaginationCacheMiss] = useState(false);
  const [optimisticPagination, setOptimisticPagination] = useState<{ current: number; pageSize: number }>();
  const paginationFrames = useRef<number[]>([]);
  const loadingOptions = typeof loading === "object" ? loading : {};
  const requestLoading = Boolean(typeof loading === "object" ? loading.spinning : loading);
  const cachedPagination = paginationDataCached ?? !requestLoading;
  const desktopTableRef = useRef<TableRef>(null);
  const mobileContentRef = useRef<HTMLDivElement>(null);
  const spinnerViewportCenter = useRef<number | null>(null);
  const [spinnerBounds, setSpinnerBounds] = useState<{ top: number; height: number }>();
  const [spinnerScreenPosition, setSpinnerScreenPosition] = useState<{ top: number; left: number }>();
  const tableLoading = {
    ...loadingOptions,
    delay: paginationFeedback ? 0 : loadingOptions.delay,
    spinning: paginationFeedback
      ? paginationFeedback === "visible" && cachedPagination && !paginationCacheMiss
      : requestLoading,
    style: { ...loadingOptions.style, ...spinnerBounds, maxHeight: "none" },
  };

  useLayoutEffect(() => {
    if (paginationFeedback && !cachedPagination) setPaginationCacheMiss(true);
  }, [paginationFeedback, cachedPagination]);

  useLayoutEffect(() => {
    if (!tableLoading.spinning) {
      spinnerViewportCenter.current = null;
      return;
    }
    const root = useCards
      ? mobileContentRef.current?.closest<HTMLElement>(".ant-spin-nested-loading")
      : desktopTableRef.current?.nativeElement.closest<HTMLElement>(".responsive-table-spin")
        ?? desktopTableRef.current?.nativeElement;
    if (!root) return;
    // Ant Spin normally sits within the first 400px of the entire table.
    // Center it in the visible part, including inside the admin scroll area.
    const updateBounds = () => {
      const rect = root.getBoundingClientRect();
      let top = Math.max(0, rect.top);
      let bottom = Math.min(window.innerHeight, rect.bottom);
      for (let parent = root.parentElement; parent; parent = parent.parentElement) {
        if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(parent).overflowY)) {
          const bounds = parent.getBoundingClientRect();
          top = Math.max(top, bounds.top + parent.clientTop);
          bottom = Math.min(bottom, bounds.top + parent.clientTop + parent.clientHeight);
        }
      }
      // Keep the screen coordinate from the first loading frame. Growing rows
      // changes the visible table bounds, but must not recenter the indicator.
      if (bottom > top) {
        spinnerViewportCenter.current = Math.max(top, Math.min(bottom,
          spinnerViewportCenter.current ?? (top + bottom) / 2));
      }
      const center = spinnerViewportCenter.current ?? top;
      const screenPosition = { top: center, left: rect.left + rect.width / 2 };
      setSpinnerScreenPosition(previous => previous?.top === screenPosition.top && previous.left === screenPosition.left ? previous : screenPosition);
      const height = Math.max(0, 2 * Math.min(center - top, bottom - center));
      const next = {
        top: Math.min(rect.height, Math.max(0, center - rect.top - height / 2)),
        height,
      };
      setSpinnerBounds(previous => previous?.top === next.top && previous.height === next.height ? previous : next);
    };
    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(root);
    window.addEventListener("scroll", updateBounds, true);
    window.addEventListener("resize", updateBounds);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateBounds, true);
      window.removeEventListener("resize", updateBounds);
    };
  }, [tableLoading.spinning, useCards, dataSource, pagination]);

  useEffect(() => {
    if (paginationFeedback !== "visible") return;
    // Start the duration after paint, including when a large cached table
    // needs more than one render to apply its rows.
    let timer: number | undefined;
    let paintedFrame: number | undefined;
    const frame = window.requestAnimationFrame(() => {
      paintedFrame = window.requestAnimationFrame(() => {
        timer = window.setTimeout(() => setPaginationFeedback("settling"), 400);
      });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (paintedFrame !== undefined) window.cancelAnimationFrame(paintedFrame);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [paginationFeedback, dataSource]);

  useEffect(() => {
    if (paginationFeedback === "settling" && !requestLoading) {
      setPaginationFeedback(null);
    }
  }, [paginationFeedback, requestLoading]);

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
  const hiddenPagination = useMemo(() => pagination === false ? false : {
    ...pagination,
    position: ["none"] as ["none"],
  }, [pagination]);
  useEffect(() => setOptimisticPagination(undefined), [current, pageSize]);
  useEffect(() => () => paginationFrames.current.forEach(window.cancelAnimationFrame), []);
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
    setPaginationCacheMiss(false);
    setPaginationFeedback("visible");
    if (!controlledPagination) {
      setInternalPage(page);
      setInternalPageSize(size);
    }
    paginationConfig.onChange?.(page, size);
  };

  const handleImmediatePageChange = (page: number, size: number) => {
    const nextPage = size !== pageSize ? 1 : page;
    // Only these lightweight controls and the overlay update on the click.
    // The memoized table keeps its existing rows until this feedback is painted.
    setOptimisticPagination({ current: nextPage, pageSize: size });
    setPaginationCacheMiss(false);
    setPaginationFeedback("visible");
    paginationFrames.current.forEach(window.cancelAnimationFrame);
    paginationFrames.current = [window.requestAnimationFrame(() => {
      paginationFrames.current.push(window.requestAnimationFrame(() => {
        paginationConfig.onChange?.(nextPage, size);
        if (!controlledPagination) {
          setInternalPage(nextPage);
          setInternalPageSize(size);
        }
      }));
    })];
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

  if (!useCards && immediatePagination) {
    return <div className={rest.className}>
      <div className="responsive-table-spin" style={{ position: "relative" }} aria-busy={tableLoading.spinning}>
        {/* Keep stale spinner coordinates from extending the page when rows shrink. */}
        {tableLoading.spinning && <div style={{ position: "absolute", inset: 0, overflow: "clip", zIndex: 4 }}><div style={{
          position: "fixed", ...spinnerScreenPosition, transform: "translate(-50%, -50%)",
        }}><Spin spinning indicator={loadingOptions.indicator} size={loadingOptions.size} /></div></div>}
        <div style={{ opacity: tableLoading.spinning ? 0.45 : 1, pointerEvents: tableLoading.spinning ? "none" : undefined }}>
          <MemoTable<T>
            {...rest}
            className={undefined}
            ref={desktopTableRef}
            columns={columns}
            dataSource={dataSource}
            pagination={hiddenPagination}
            rowSelection={rowSelection}
            expandable={expandable}
            loading={false}
            rowKey={rowKey}
            onRow={onRow}
            onChange={onChange}
            scroll={scroll ?? DEFAULT_SCROLL}
          />
        </div>
      </div>
      {paginationEnabled && paginationVisible && <Pagination
        {...paginationConfig}
        size="small"
        current={optimisticPagination?.current ?? current}
        pageSize={optimisticPagination?.pageSize ?? pageSize}
        total={total}
        onChange={handleImmediatePageChange}
        style={{ margin: "16px 0", display: "flex", justifyContent: "flex-end", flexWrap: "wrap" }}
      />}
    </div>;
  }

  if (!useCards) {
    return (
      <Table<T>
        ref={desktopTableRef}
        columns={columns}
        dataSource={dataSource}
        pagination={pagination === false ? false : {
          ...paginationConfig,
          onChange: (page, size) => {
            setPaginationCacheMiss(false);
            setPaginationFeedback("visible");
            paginationConfig.onChange?.(page, size);
          },
        }}
        rowSelection={rowSelection}
        expandable={expandable}
        loading={tableLoading}
        rowKey={rowKey}
        onRow={onRow}
        onChange={(...args) => {
          if (args[3].action === "paginate") setPaginationFeedback("visible");
          onChange?.(...args);
        }}
        scroll={scroll ?? { x: "max-content" }}
        {...rest}
      />
    );
  }

  return (
    <Spin
      {...tableLoading}
      wrapperClassName="responsive-table-spin"
    >
      <div ref={mobileContentRef} className="responsive-table-scroll" style={{ width: "100%", minWidth: 0, height: "100%", overflowY: "auto", paddingRight: 2 }}>
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
              onChange={(value) => {
                if (value === undefined) {
                  setMobileSortKey(undefined);
                  onChange?.(
                    paginationConfig as any,
                    {},
                    {},
                    { action: "sort", currentDataSource: dataSource }
                  );
                  return;
                }
                applyMobileSort(value);
              }}
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

        {!pageRows.length && !tableLoading.spinning ? (
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
                    extra={responsiveCardExtra?.(record, index)}
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
                    {responsiveCardContent ? responsiveCardContent(record, index, { expanded: isExpanded, toggleExpanded: () => updateExpanded(key, record) }) : <>
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
                    </>}
                  </Card>
                </div>
              );
            })}
          </Space>
        )}

        {paginationEnabled && paginationVisible && total > 0 && (
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
