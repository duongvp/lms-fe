"use client";

import { Button, Result } from 'antd';

export default function GuideError({ reset }: { error: Error; reset: () => void }) {
    return <Result status="warning" title="Chưa mở được tài liệu" subTitle="Vui lòng thử lại để tiếp tục đọc hướng dẫn." extra={<Button type="primary" onClick={reset}>Thử lại</Button>} />;
}
