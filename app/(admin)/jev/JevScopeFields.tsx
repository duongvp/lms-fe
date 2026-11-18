'use client';
import React, { useEffect, useState } from 'react';
import { Alert, Button, Form, Select, Space, Typography, type FormInstance } from 'antd';
import { jevRequest, type JevCalendar } from '@/services/jevService';

// Calendar timestamps represent the schedule's wall time, as on the schedule screen.
const dateTime = (value: string) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}:\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}` : 'Chưa xếp giờ';
};
export function jevCalendarLabel(row: JevCalendar) {
  return `Buổi ${row.learn_number}${row.lesson_name ? ` · ${row.lesson_name}` : ''} · ${dateTime(row.start_time)}${row.end_time ? ` – ${row.end_time.slice(11, 16)}` : ''}`;
}

export default function JevScopeFields({ form, locked, initialCalendarId }: {
  form: FormInstance; locked: boolean; initialCalendarId?: string;
}) {
  const scopeType = Form.useWatch('scopeType', form);
  const programCode = Form.useWatch('programCode', form);
  const scopeKey = Form.useWatch('scopeKey', form);
  const [programSearch, setProgramSearch] = useState('');
  const [programs, setPrograms] = useState<string[]>([]);
  const [programLoading, setProgramLoading] = useState(false);
  const [programError, setProgramError] = useState('');
  const [calendarSearch, setCalendarSearch] = useState('');
  const [calendars, setCalendars] = useState<JevCalendar[]>([]);
  const [page, setPage] = useState(1), [hasMore, setHasMore] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState('');
  const [currentCalendar, setCurrentCalendar] = useState<JevCalendar | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!locked || !initialCalendarId) return;
    let cancelled = false;
    setCalendarLoading(true); setCalendarError('');
    void jevRequest(`/scope/calendars/${encodeURIComponent(initialCalendarId)}`).then(result => {
      if (cancelled) return;
      setCurrentCalendar(result.data); form.setFieldValue('programCode', result.data.code);
    }).catch(error => { if (!cancelled) setCalendarError(error.message || 'Không tải được lịch đã chọn'); })
      .finally(() => { if (!cancelled) setCalendarLoading(false); });
    return () => { cancelled = true; };
  }, [locked, initialCalendarId, form, retry]);

  useEffect(() => {
    if (locked || !scopeType || scopeType === 'GLOBAL') return;
    let cancelled = false;
    setProgramLoading(true); setProgramError('');
    const timer = setTimeout(() => {
      void jevRequest(`/scope/programs?q=${encodeURIComponent(programSearch.trim())}`).then(result => {
        if (!cancelled) setPrograms(result.data.map((row: { code: string }) => row.code));
      }).catch(error => { if (!cancelled) { setPrograms([]); setProgramError(error.message || 'Không tải được chương trình'); } })
        .finally(() => { if (!cancelled) setProgramLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [locked, scopeType, programSearch, retry]);

  useEffect(() => {
    if (locked || scopeType !== 'CALENDAR' || !programCode) return;
    let cancelled = false;
    setCalendarLoading(true); setCalendarError('');
    const timer = setTimeout(() => {
      const query = new URLSearchParams({ code: programCode, q: calendarSearch.trim(), page: String(page) });
      void jevRequest(`/scope/calendars?${query}`).then(result => {
        if (cancelled) return;
        setCalendars(previous => page === 1 ? result.data.rows : [...new Map([...previous, ...result.data.rows].map(row => [row.id, row])).values()]);
        setHasMore(result.data.hasMore);
      }).catch(error => { if (!cancelled) setCalendarError(error.message || 'Không tải được lịch học'); })
        .finally(() => { if (!cancelled) setCalendarLoading(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [locked, scopeType, programCode, calendarSearch, page, retry]);

  const selectedCode = scopeType === 'CODE' ? scopeKey : programCode;
  const programOptions = [...new Set([...(selectedCode ? [selectedCode] : []), ...programs])].map(code => ({ value: code, label: code }));
  const selectedCalendar = currentCalendar ?? calendars.find(row => String(row.id) === String(scopeKey));
  const calendarOptions = [...new Map([...(selectedCalendar ? [selectedCalendar] : []), ...calendars].map(row => [row.id, row])).values()]
    .map(row => ({ value: String(row.id), label: jevCalendarLabel(row) }));
  const resetCalendar = () => {
    form.setFieldValue('scopeKey', undefined); setCalendars([]); setCurrentCalendar(null); setCalendarSearch(''); setPage(1); setHasMore(false); setCalendarError('');
  };
  return <>
    <Form.Item name="scopeType" label="Loại phạm vi" rules={[{ required: true }]}>
      <Select aria-label="Loại phạm vi" disabled={locked} onChange={value => {
        resetCalendar(); form.setFieldValue('programCode', undefined); setProgramSearch(''); setProgramError('');
        if (value === 'GLOBAL') { form.setFieldValue('scopeKey', '*'); if (form.getFieldValue('mode') === 'inherit') form.setFieldValue('mode', 'off'); }
      }} options={[{ value: 'GLOBAL', label: 'Policy mặc định' }, { value: 'CODE', label: 'Theo chương trình' }, { value: 'CALENDAR', label: 'Theo lịch học' }]} />
    </Form.Item>
    {scopeType && scopeType !== 'GLOBAL' && <Form.Item name={scopeType === 'CODE' ? 'scopeKey' : 'programCode'} label="Mã chương trình" rules={[{ required: true, message: 'Chọn mã chương trình' }]}>
      <Select aria-label="Mã chương trình" showSearch disabled={locked} placeholder="Nhập mã để tìm chương trình" filterOption={false} loading={programLoading} onSearch={setProgramSearch}
        onChange={() => { if (scopeType === 'CALENDAR') resetCalendar(); }} options={programOptions}
        notFoundContent={programLoading ? 'Đang tìm…' : programError ? 'Không tải được chương trình' : 'Không tìm thấy chương trình'} />
    </Form.Item>}
    {programError && scopeType !== 'GLOBAL' && <Alert style={{ marginBottom: 16 }} type="error" message={programError} action={<Button size="small" onClick={() => setRetry(value => value + 1)}>Thử lại</Button>} />}
    {scopeType === 'CALENDAR' && <Form.Item name="scopeKey" label="Lịch học" rules={[{ required: true, message: 'Chọn lịch học cần áp dụng' }]}>
      <Select aria-label="Lịch học" showSearch disabled={locked || !programCode} placeholder={programCode ? 'Tìm theo số buổi hoặc tên bài học' : 'Chọn chương trình trước'}
        filterOption={false} loading={calendarLoading} options={calendarOptions} onSearch={value => { if (value === calendarSearch) return; setCalendarSearch(value); setCalendars([]); setPage(1); setHasMore(false); }}
        onChange={value => setCurrentCalendar(calendars.find(row => String(row.id) === value) ?? null)}
        optionLabelProp="label" popupMatchSelectWidth={false} dropdownStyle={{ maxWidth: 'calc(100vw - 32px)' }}
        optionRender={option => <span style={{ display: 'block', maxWidth: 640, whiteSpace: 'normal' }}>{option.label}</span>}
        notFoundContent={calendarLoading ? 'Đang tải lịch…' : calendarError ? 'Không tải được lịch học' : 'Không có lịch phù hợp'}
        dropdownRender={menu => <>{menu}{hasMore && <Button type="text" block loading={calendarLoading} onMouseDown={event => event.preventDefault()} onClick={() => setPage(value => value + 1)}>Tải thêm lịch học</Button>}</>} />
    </Form.Item>}
    {calendarError && scopeType === 'CALENDAR' && <Alert style={{ marginBottom: 16 }} type="error" message={calendarError} action={<Button size="small" onClick={() => setRetry(value => value + 1)}>Thử lại</Button>} />}
    {scopeType === 'CALENDAR' && <Space direction="vertical" size={4} style={{ marginBottom: 20 }}>
      <Typography.Text type="secondary">Mỗi lựa chọn là một lịch học cụ thể. Hệ thống tự xác định lịch, bạn không cần nhập ID.</Typography.Text>
      {selectedCalendar && <Typography.Text>{selectedCalendar.code} · {jevCalendarLabel(selectedCalendar)}</Typography.Text>}
    </Space>}
  </>;
}
