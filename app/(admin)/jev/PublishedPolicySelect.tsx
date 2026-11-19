'use client';
import responsive from './responsive.module.css';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Button, Select, Space } from 'antd';
import { jevRequest, type JevPolicy } from '@/services/jevService';

export default function PublishedPolicySelect({ value, onChange }: { value?: number; onChange?: (value: number) => void }) {
  const [rows, setRows] = useState<JevPolicy[]>([]);
  const [page, setPage] = useState(0), [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const generation = useRef(0);
  const load = async (next: number, token: number) => {
    setLoading(true); setError('');
    try {
      const result = await jevRequest(`/policies?page=${next}&limit=100`);
      if (generation.current !== token) return;
      setRows(previous => [...new Map([...previous, ...result.data.rows].map(row => [row.id, row])).values()]);
      setPage(next); setTotal(result.data.total);
    } catch (e: any) { if (generation.current === token) setError(e.message || 'Không tải được bộ cấu hình'); }
    finally { if (generation.current === token) setLoading(false); }
  };
  useEffect(() => {
    const token = ++generation.current;
    void load(1, token);
    return () => { generation.current++; };
  }, []);
  useEffect(() => {
    if (!value) return;
    let cancelled = false;
    void jevRequest(`/policies/${value}`).then(result => {
      if (!cancelled) setRows(previous => [...new Map([...previous, result.data].map(row => [row.id, row])).values()]);
    }).catch(() => { if (!cancelled) setError('Không tải được bộ cấu hình đã chọn. Vui lòng chọn lại hoặc tải lại danh sách.'); });
    return () => { cancelled = true; };
  }, [value]);
  return <Space direction="vertical" style={{ width: '100%' }}>
    <Select popupClassName={responsive.dropdown} aria-label="Bộ cấu hình kiểm duyệt" style={{ width: '100%' }} value={value ?? undefined} onChange={onChange} showSearch optionFilterProp="label" loading={loading}
      placeholder="Chọn bộ cấu hình đã phát hành" options={rows.filter(row => row.status === 'PUBLISHED').map(row => ({ value: row.id, label: `${row.policy_key} · Phiên bản ${row.revision}` }))}
      notFoundContent={loading ? 'Đang tải…' : 'Chưa có bộ cấu hình đã phát hành trong danh sách đã tải'}
      dropdownRender={menu => <>{menu}{page * 100 < total && <Button block type="text" loading={loading} onMouseDown={event => event.preventDefault()} onClick={() => void load(page + 1, generation.current)}>Tải thêm bộ cấu hình</Button>}</>} />
    {error && <Alert type="warning" message={error} action={<Button onClick={() => void load(page || 1, generation.current)}>Tải lại</Button>} />}
  </Space>;
}
