import { Skeleton } from 'antd';

export default function Loading() {
    return <div aria-label="Đang tải hướng dẫn"><Skeleton active paragraph={{ rows: 6 }} /></div>;
}
