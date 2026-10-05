"use client";

import React from "react";
import { Grid, Select as AntSelect, type SelectProps } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import type { RefSelectProps } from "antd/es/select";

// Single-value fields can be cleared on touch screens; desktop props stay intact.
const MobileSelect = React.forwardRef<RefSelectProps, SelectProps>((props, ref) => {
    const screens = Grid.useBreakpoint();
    const allowClear = screens.md === false && !props.mode
        ? props.allowClear || { clearIcon: <CloseOutlined aria-label="Xóa giá trị đã chọn" /> }
        : props.allowClear;

    return <AntSelect {...props} ref={ref} allowClear={allowClear} />;
}) as unknown as typeof AntSelect;

MobileSelect.Option = AntSelect.Option;
MobileSelect.OptGroup = AntSelect.OptGroup;

export default MobileSelect;
