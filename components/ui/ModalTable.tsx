"use client";

import { Grid, Table, type TableProps } from "antd";
import CustomTable from "./Table";

/** Use labeled cards below 768px and preserve the original table elsewhere. */
export default function ModalTable<T extends object>(props: TableProps<T>) {
    const screens = Grid.useBreakpoint();
    if (screens.md !== false) return <Table<T> {...props} />;

    return <CustomTable<T>
        {...props}
        columns={props.columns || []}
        dataSource={props.dataSource ? [...props.dataSource] : []}
        responsiveCardBreakpoint="md"
    />;
}
