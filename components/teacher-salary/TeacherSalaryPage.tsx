'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);
import { Alert, Button, Card, Col, Collapse, DatePicker, Drawer, Grid, Form, Input, InputNumber, Modal, Row, Select, Space, Statistic, Switch, Table, Tabs, Tag, Typography, message } from 'antd';
import { Column } from '@ant-design/charts';
import { useAuthStore } from '@/stores/authStore';
import { salaryGet, salaryWrite, salaryExport } from '@/services/teacherSalaryService';
const { Title, Text } = Typography;
const currency = (v: unknown) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(v ?? 0));
const statusLabels: Record<string, string> = { draft: 'Đang lập', pending_review: 'Chờ kiểm tra', approved: 'Đã chốt', paid: 'Đã thanh toán', confirmed: 'Đã xác nhận', unconfirmed: 'Chưa xác nhận', upcoming: 'Chưa diễn ra', ongoing: 'Đang diễn ra', ended: 'Đã hết giờ lịch', cancelled: 'Nghỉ / hủy', completed: 'Đã dạy', teacher_absent: 'Giáo viên nghỉ', not_held: 'Không diễn ra', regular: 'Học chính', makeup: 'Học bù', additional: 'Phát sinh', unknown: 'Cần đối soát' };
const tag = (s: string) => <Tag color={['paid', 'confirmed', 'completed'].includes(s) ? 'green' : ['pending_review', 'unconfirmed', 'unknown'].includes(s) ? 'orange' : 'blue'}>{statusLabels[s] ?? s}</Tag>;
const options = (values: string[]) => values.map(value => ({ value, label: statusLabels[value] ?? value }));
const dateText = (value: unknown) => value ? String(value).replace('T', ' ').slice(0, 16) : '—';
const instantText = (v: any) => v ? dayjs.utc(v).utcOffset(7).format('DD/MM/YYYY HH:mm') : '—';
const apiDate = (v: any) => v?.format('YYYY-MM-DDTHH:mm:ss[Z]');
const getError = (e: unknown) => e instanceof Error ? e.message : 'Không thực hiện được thao tác';
const field = (name: string, label: string, child: React.ReactNode, required = true) => <Form.Item name={name} label={label} rules={required ? [{ required: true, message: `Nhập ${label.toLowerCase()}` }] : []}>{child}</Form.Item>;
export default function TeacherSalaryPage({ mode }: {
    mode: 'report' | 'payroll' | 'rates';
}) {
    const screens=Grid.useBreakpoint();
    const [filterOpen,setFilterOpen]=useState<string[]>();
    const user = useAuthStore(s => s.user), session = useAuthStore(s => s.authSessionVersion), can = useAuthStore(s => s.hasPermission);
    const [query, setQuery] = useState<any>({ from: dayjs().startOf('month').format('YYYY-MM-DD'), to: dayjs().add(1, 'month').startOf('month').format('YYYY-MM-DD'), collection: 'sessions', page: 1, limit: 25 });
    const [filters] = Form.useForm(), [form] = Form.useForm();
    const [dialog, setDialog] = useState<{
        type: string;
        row?: any;
        version?: number;
        calculationHash?: string;
    } | null>(null), [busy, setBusy] = useState(false), [selected, setSelected] = useState<React.Key[]>([]), [periodId, setPeriodId] = useState<string>(), [teacherDetail, setTeacherDetail] = useState<any>(), [historyOpen, setHistoryOpen] = useState(false);
    const permission = mode === 'report' ? 'teaching_report.view' : mode === 'rates' ? 'salary.rate.manage' : 'salary.view';
    const permitted = can(permission);
    const namespace = `${user.userId}:${session}`;
    const { data: opts, error: optionError } = useSWR(permitted ? ['salary-options', namespace] : null, () => salaryGet('options'), { revalidateOnFocus: false });
    const { data, error, isLoading, mutate } = useSWR(permitted ? ['teacher-salary', namespace, mode, query] : null, () => salaryGet(mode === 'report' ? 'report' : mode === 'rates' ? 'rates' : 'periods', query), { revalidateOnFocus: false });
    const { data: salaryOverview, mutate: reloadOverview } = useSWR(mode === 'payroll' && permitted ? ['salary-overview', namespace] : null, () => salaryGet('overview'), { revalidateOnFocus: false });
    const { data: detail, error: detailError, mutate: reloadDetail } = useSWR(periodId ? ['salary-period', namespace, periodId] : null, () => salaryGet(`periods/${periodId}`), { revalidateOnFocus: false });
    const { data: history, error: historyError } = useSWR(historyOpen && periodId ? ['salary-history', namespace, periodId, detail?.period?.revision] : null, () => salaryGet(`periods/${periodId}/history`, { order: 'desc' }), { revalidateOnFocus: false });
    const teacherOptions = (opts?.teachers ?? []).map((t: any) => ({ value: t.id, label: `${t.display_name || t.username} · ${t.username}${t.status === 0 ? ' (ngừng hoạt động)' : ''}` }));
    const programOptions = (opts?.programs ?? []).map((code: string) => ({ value: code, label: code }));
    const groupOptions = (opts?.groups ?? []).map((g: any) => ({ value: g.id, label: `${g.code} · ${g.group_code} · ${g.name}` }));
    const open = (type: string, row?: any) => {
        form.resetFields();
        setDialog({ type, row, version: detail?.period?.revision, calculationHash: detail?.period?.calculation_hash });
        if (type === 'confirm' || type === 'revise') {
            const snap = row?.snapshot, first = type === 'revise' ? undefined : row;
            form.setFieldsValue({ calendar_ids: type === 'revise' ? snap.source_ids : selected.length ? selected.map(Number) : [row.id], role: row?.role ?? query.role ?? 'teacher', outcome: row?.outcome ?? 'completed', session_kind: row?.session_kind ?? 'unknown', teacher_profile_id: query.role==='assistant'&&!row?.role?undefined:row?.teacher_profile_id, billing_code: row?.billing_code ?? row?.code,
                actual_start_time: dayjs.utc(snap?.actual_start_time ?? first?.start_time), actual_end_time: dayjs.utc(snap?.actual_end_time ?? first?.end_time), replaces_calendar_id: snap?.replaces_calendar_id, planned_teacher_absent: snap?.planned_teacher_absent ?? false, shared_confirmed: snap?.shared_confirmed ?? false });
        }
        else if (type === 'rate' && row)
            form.setFieldsValue({ ...row, ...row.dimensions, valid_from: dayjs(row.valid_to), valid_to: dayjs(row.valid_to).add(1, 'year') });
        else if (type === 'rate')
            form.setFieldsValue({ pay_basis: 'session', duration_basis: 'actual', priority: 0, valid_from: dayjs().startOf('month'), valid_to: dayjs().add(1, 'year').startOf('month'), role: 'teacher' });
        else if (type === 'period')
            form.setFieldsValue({ name: `Lương tháng ${dayjs().format('MM/YYYY')}`, from: dayjs(query.from), to: dayjs(query.to) });
        else if (type === 'pay')
            form.setFieldsValue({ teacher_profile_id: row.id, amount: Number(row.unpaid) });
        else if (type === 'adjust')
            form.setFieldsValue({ kind: 'allowance', code: detail?.period?.scope?.[0], teacher_profile_id: row?.id });
    };
    const done = async () => { setDialog(null); setSelected([]); await Promise.all([mutate(), reloadDetail(), reloadOverview()]); };
    const submit = async (v: any) => {
        if (!dialog)
            return;
        setBusy(true);
        try {
            const p = detail?.period, version = { expected_version: dialog.version ?? p?.revision, calculation_hash: dialog.calculationHash ?? p?.calculation_hash, reason: v.reason };
            if (dialog.type === 'confirm' || dialog.type === 'revise') {
                v.calendar_ids = v.calendar_ids.map(Number);
                const sourceRows = data?.rows ?? [], source_hashes = Object.fromEntries(sourceRows.filter((r: any) => v.calendar_ids.includes(r.id)).map((r: any) => [String(r.id), r.source_hash]));
                await salaryWrite(dialog.type === 'revise' ? `teaching-records/${dialog.row.id}/revise` : 'teaching-records/confirm', { ...v, expected_version: dialog.row?.version, actual_start_time: v.outcome === 'completed' ? apiDate(v.actual_start_time) : undefined, actual_end_time: v.outcome === 'completed' ? apiDate(v.actual_end_time) : undefined, ...(dialog.type === 'confirm' && Object.keys(source_hashes).length === v.calendar_ids.length ? { source_hashes } : {}) });
            }
            else if (dialog.type === 'rate') {
                const dimensions = Object.fromEntries(['code', 'role', 'teacher_profile_id', 'subject', 'grade', 'group_id', 'session_kind', 'system_type', 'calendar_source', 'is_substitute'].filter(k => v[k] !== undefined && v[k] !== null && v[k] !== '').map(k => [k, v[k]]));
                await salaryWrite('rates', { ...v, dimensions, previous_id: dialog.row?.id, amount: String(v.amount), valid_from: v.valid_from.format('YYYY-MM-DD'), valid_to: v.valid_to.format('YYYY-MM-DD') });
            }
            else if (dialog.type === 'period') {
                const result = await salaryWrite('periods', { ...v, from: v.from.format('YYYY-MM-DD'), to: v.to.format('YYYY-MM-DD') });
                setPeriodId(String(result.id));
            }
            else if (dialog.type === 'adjust')
                await salaryWrite(`periods/${p.id}/adjustments`, { ...v, ...version, amount: String(v.amount) });
            else if (dialog.type === 'pay')
                await salaryWrite(`periods/${p.id}/payments`, { ...v, ...version, amount: String(v.amount), idempotency_key: dialog.row.requestKey ?? (dialog.row.requestKey = crypto.randomUUID()) });
            else if (dialog.type === 'release')
                await salaryWrite(`periods/${p.id}/items/${dialog.row.id}`, version, 'DELETE');
            else
                await salaryWrite(`periods/${p.id}/${dialog.type}`, version);
            message.success('Đã lưu thay đổi');
            await done();
        }
        catch (e) {
            message.error(getError(e));
        }
        finally {
            setBusy(false);
        }
    };
    const download = async (path: string) => { try {
        await salaryExport(path, mode === 'report' ? query : {});
    }
    catch (e) {
        message.error(getError(e));
    } };
    const pagination = { current: query.page, pageSize: query.limit, total: data?.pagination?.total ?? 0, showSizeChanger: true, onChange: (page: number, limit: number) => { setSelected([]); setQuery({ ...query, page, limit }); } };
    const drawerTitle = detail?.period ? `${detail.period.name} · v${detail.period.revision}` : 'Chi tiết kỳ lương';
    const stats = data?.summary;
    const sessionsColumns: any[] = [{ title: 'Ngày / bài', key: 'date', render: (_: any, r: any) => <><a href={`/schedule?program=${encodeURIComponent(r.code)}&calendar_id=${r.id}`} target='_blank' rel='noreferrer'>{dateText(r.start_time)}</a><div>{r.lesson_name}</div><Text type='secondary'>{r.code} · {r.group_label}</Text></> },
        { title: 'Giáo viên', dataIndex: 'teacher' }, { title: 'Giờ lịch', render: (_: any, r: any) => (r.scheduled_seconds / 3600).toFixed(2) },
        { title: 'Trạng thái', render: (_: any, r: any) => <>{tag(r.progress)}{tag(r.confirmation_status)}<div>{r.issues?.map((v: string) => <Text key={v} type='danger'>{v}<br /></Text>)}{r.shared_candidate_ids?.length > 0 && <Tag color='gold'>Cần đối soát lịch trùng</Tag>}</div></> },
        { title: 'Thao tác', render: (_: any, r: any) => can('teaching_record.confirm') && ['ended', 'cancelled'].includes(r.progress) ? <Space wrap>{!r.record_ids?.length && <Button onClick={() => open('confirm', r)}>Xác nhận công</Button>}<Button onClick={() => open('confirm', { ...r, role: 'assistant', teacher_profile_id: undefined })}>Xác nhận trợ giảng</Button></Space> : null }];
    const teacherColumns: any[] = [{ title: 'Giáo viên / trợ giảng', render: (_: any, r: any) => <Button type='link' onClick={() => { setTeacherDetail(r); setQuery({ ...query, teacher_id: r.id, collection: 'records', page: 1 }); }}>{r.name}</Button> }, { title: 'Mã', dataIndex: 'username' }, { title: 'Phân công', dataIndex: 'assigned' }, { title: 'Đã dạy', dataIndex: 'completed' }, { title: 'Giờ thực', dataIndex: 'actual_hours', render: (n: number) => n.toFixed(2) }, { title: 'Bù / thay', render: (_: any, r: any) => `${r.makeup} / ${r.substitute}` }];
    const recordColumns: any[] = [{ title: 'Người dạy thực tế', render: (_: any, r: any) => r.teacher?.name ?? r.teacher?.username ?? 'Chưa xác định' }, { title: 'Ngày', dataIndex: 'service_date', render: dateText }, { title: 'Kết quả', render: (_: any, r: any) => <>{tag(r.outcome)}{tag(r.session_kind)}{r.is_substitute && <Tag>Dạy thay</Tag>}{r.stale && <Tag color='red'>Lịch đã thay đổi</Tag>}</> }, { title: 'Thời lượng thực', render: (_: any, r: any) => `${(r.actual_seconds / 3600).toFixed(2)} giờ` }, { title: 'Nguồn', render: (_: any, r: any) => r.sources?.map((s: any) => <a key={s.calendar_id} style={{ marginRight: 8 }} target='_blank' rel='noreferrer' href={`/schedule?program=${encodeURIComponent(s.code)}&calendar_id=${s.calendar_id}`}>#{s.calendar_id}</a>) }, { title: '', render: (_: any, r: any) => can('teaching_record.revise') ? <Button onClick={() => open('revise', r)}>Đối soát / sửa công</Button> : null }];
    if (!permitted)
        return <Alert type='warning' showIcon message='Bạn không có quyền xem trang này'/>;
    return <main style={{ padding: 16, maxWidth: 1600, margin: '0 auto' }}>
  <Space wrap style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}><div><Title level={3} style={{ margin: 0 }}>{mode === 'report' ? 'Báo cáo giảng dạy' : mode === 'rates' ? 'Đơn giá giảng dạy' : 'Bảng lương giáo viên'}</Title><Text type='secondary'>{mode === 'report' ? 'Phân biệt lịch phân công và công đã được xác nhận.' : 'Số liệu theo kỳ, có snapshot và lịch sử đối soát.'}</Text></div>
   <Space wrap><Button onClick={() => mutate()}>Làm mới</Button>{mode === 'report' && can('teaching_report.export') && <Button onClick={() => download('report/export')}>Xuất Excel</Button>}{mode === 'rates' && <Button type='primary' onClick={() => open('rate')}>Thêm phiên bản đơn giá</Button>}{mode === 'payroll' && can('salary.period.create') && <Button type='primary' onClick={() => open('period')}>Tạo kỳ lương</Button>}{mode === 'payroll' && can('salary.rate.manage') && <Button href='/teacher-salary/rates'>Cấu hình đơn giá</Button>}</Space></Space>
  {(error || optionError) && <Alert type='error' showIcon message={getError(error || optionError)} style={{ marginBottom: 16 }}/>}
  {mode === 'report' && <>
   <Collapse style={{marginBottom:16}} activeKey={filterOpen??(screens.md?['filters']:[])} onChange={keys=>setFilterOpen(Array.isArray(keys)?keys:[keys])} items={[{key:'filters',label:'Bộ lọc báo cáo',forceRender:true,children:<Card size='small'><Form form={filters} layout='vertical' onFinish={v => { setSelected([]); const values = { ...v, from: v.range?.[0]?.format('YYYY-MM-DD') ?? query.from, to: v.range?.[1]?.add(1, 'day').format('YYYY-MM-DD') ?? query.to }; delete values.range; setQuery({ ...query, ...values, page: 1 }); }} initialValues={{ range: [dayjs(query.from), dayjs(query.to).subtract(1, 'day')] }}>
    <Row gutter={12}><Col xs={24} md={8}>{field('range', 'Khoảng ngày', <DatePicker.RangePicker format='DD/MM/YYYY' style={{ width: '100%' }} presets={[
                    { label: 'Hôm nay', value: [dayjs(), dayjs()] }, { label: 'Tuần này', value: [dayjs().startOf('week'), dayjs().endOf('week')] }, { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs().endOf('month')] }, { label: 'Quý này', value: [dayjs().month(Math.floor(dayjs().month() / 3) * 3).startOf('month'), dayjs().month(Math.floor(dayjs().month() / 3) * 3 + 2).endOf('month')] }, { label: 'Năm nay', value: [dayjs().startOf('year'), dayjs().endOf('year')] }
                ]}/>)}</Col>
    <Col xs={24} md={8}>{field('code', 'Chương trình', <Select allowClear showSearch options={programOptions}/>, false)}</Col><Col xs={24} md={8}>{field('teacher_id', 'Giáo viên', <Select allowClear showSearch optionFilterProp='label' options={teacherOptions}/>, false)}</Col>
    <Col xs={24} md={6}>{field('assistant_id', 'Trợ giảng', <Select allowClear showSearch optionFilterProp='label' options={teacherOptions}/>, false)}</Col><Col xs={12} md={6}>{field('subject', 'Môn học', <Input allowClear/>, false)}</Col><Col xs={12} md={6}>{field('group_id', 'Nhóm học', <Select allowClear showSearch optionFilterProp='label' options={groupOptions} placeholder='Tất cả nhóm'/>, false)}</Col><Col xs={12} md={6}>{field('grade', 'Khối', <InputNumber min={1} max={12} style={{ width: '100%' }}/>, false)}</Col>
    <Col xs={12} md={6}>{field('progress', 'Tiến độ lịch', <Select allowClear options={options(['upcoming', 'ongoing', 'ended', 'cancelled'])}/>, false)}</Col><Col xs={12} md={6}>{field('confirmation_status', 'Xác nhận', <Select allowClear options={options(['unconfirmed', 'confirmed'])}/>, false)}</Col><Col xs={12} md={6}>{field('session_kind', 'Loại buổi', <Select allowClear options={options(['regular', 'makeup', 'additional', 'unknown'])}/>, false)}</Col><Col xs={12} md={6}>{field('role', 'Vai trò nhận công', <Select allowClear options={[{ value: 'teacher', label: 'Giáo viên' }, { value: 'assistant', label: 'Trợ giảng' }]}/>, false)}</Col></Row>
    <Space><Button type='primary' htmlType='submit'>Xem báo cáo</Button><Button onClick={() => { filters.resetFields(); setQuery({ from: dayjs().startOf('month').format('YYYY-MM-DD'), to: dayjs().add(1, 'month').startOf('month').format('YYYY-MM-DD'), collection: 'sessions', page: 1, limit: 25 }); setSelected([]); }}>Đặt lại</Button></Space>
   </Form></Card>}]} />
   {teacherDetail && <Alert closable onClose={() => setTeacherDetail(undefined)} message={`Chi tiết ${teacherDetail.name} · ${teacherDetail.groups} chương trình / nhóm · ${teacherDetail.subjects} môn`} style={{ marginBottom: 12 }}/>}
   <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>{[['Phân công', stats?.assigned], ['Đã xác nhận dạy', stats?.completed], ['Chưa diễn ra', stats?.upcoming], ['Nghỉ / hủy', stats?.cancelled], ['Cần xác nhận', stats?.needs_confirmation], ['Giờ thực dạy', Number(stats?.actual_hours ?? 0).toFixed(2)], ['Giờ theo lịch', Number(stats?.scheduled_hours ?? 0).toFixed(2)], ['Giáo viên nghỉ', stats?.teacher_absent], ['Học bù', stats?.makeup], ['Dạy thay', stats?.substitute]].map(([title, value]) => <Col xs={12} md={6} key={title}><Card size='small'><Statistic title={title} value={value ?? 0}/></Card></Col>)}</Row>
   {!!data?.charts?.daily?.length && <Card title='Lịch phân công theo ngày' style={{ marginBottom: 16 }}><Column data={data.charts.daily} xField='date' yField='assigned' height={220}/></Card>}
   <Tabs activeKey={query.collection} onChange={collection => { setQuery({ ...query, collection, page: 1, sort: undefined }); setSelected([]); }} items={[{ key: 'sessions', label: 'Lịch phân công' }, { key: 'teachers', label: 'Theo nhân sự' }, { key: 'records', label: 'Công xác nhận' }]}/>
   {query.collection === 'sessions' && selected.length > 0 && can('teaching_record.confirm') && <Alert type='info' message={`Đã chọn ${selected.length} lịch. Chỉ gộp thành một công nếu đây là cùng lần giảng thực tế.`} action={<Button onClick={() => open('confirm', data.rows.find((r: any) => r.id === selected[0]))}>Xác nhận dạy chung</Button>} style={{ marginBottom: 12 }}/>}
   <Table<any> rowKey='id' loading={isLoading} dataSource={data?.rows ?? []} columns={query.collection === 'teachers' ? teacherColumns : query.collection === 'records' ? recordColumns : sessionsColumns} pagination={pagination} scroll={{ x: 1000 }} rowSelection={query.collection === 'sessions' && can('teaching_record.confirm') ? { selectedRowKeys: selected, onChange: setSelected, getCheckboxProps: (r: any) => ({ disabled: !['ended', 'cancelled'].includes(r.progress) || r.record_ids?.length > 0 }) } : undefined}/>
  </>}
  {mode === 'rates' && <><Alert showIcon type='info' message='Đơn giá không sửa đè. Tạo phiên bản cho khoảng hiệu lực mới; trường hợp thiếu hoặc trùng ưu tiên sẽ chặn chốt lương.' style={{ marginBottom: 16 }}/><Table<any> rowKey='id' loading={isLoading} dataSource={data?.rows ?? []} pagination={pagination} scroll={{ x: 1000 }} columns={[
                { title: 'Tên', dataIndex: 'name' }, { title: 'Điều kiện', dataIndex: 'dimensions', render: v => <Text>{JSON.stringify(v)}</Text> }, { title: 'Đơn giá', dataIndex: 'amount', render: currency }, { title: 'Đơn vị', dataIndex: 'pay_basis', render: v => v === 'hour' ? 'Theo giờ' : 'Theo buổi' }, { title: 'Ưu tiên', dataIndex: 'priority' }, { title: 'Hiệu lực', render: (_, r) => `${String(r.valid_from).slice(0, 10)} đến trước ${String(r.valid_to).slice(0, 10)}` }, { title: '', render: (_: any, r: any) => <Button onClick={() => open('rate', r)}>Phiên bản kế tiếp</Button> }
            ]}/></>}
  {mode === 'payroll' && <>
   <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>{[['Lương dự kiến trong kỳ nháp', salaryOverview?.estimated], ['Lương đã chốt', salaryOverview?.confirmed], ['Chưa thanh toán', salaryOverview?.unpaid]].map(([label, value]) => <Col xs={24} md={8} key={label}><Card size='small'><Statistic title={label} value={currency(value)}/></Card></Col>)}</Row>
   {!!salaryOverview?.teachers?.length && <Card title='Tiền lương theo nhân sự trong các kỳ' style={{ marginBottom: 16 }}><Column data={salaryOverview.teachers} xField='name' yField='amount' height={220}/></Card>}
   <Alert showIcon type='info' message='Chỉ công đã xác nhận mới vào bảng tính. Kỳ đã chốt giữ snapshot; kỳ đã có thanh toán không mở lại trực tiếp.' style={{ marginBottom: 16 }}/><Table<any> rowKey='id' loading={isLoading} dataSource={data?.rows ?? []} pagination={pagination} scroll={{ x: 850 }} columns={[
                { title: 'Kỳ lương', dataIndex: 'name', render: (v, r) => <Button type='link' onClick={() => setPeriodId(String(r.id))}>{v}</Button> }, { title: 'Từ', dataIndex: 'from_date', render: v => String(v).slice(0, 10) }, { title: 'Đến trước', dataIndex: 'to_date', render: v => String(v).slice(0, 10) }, { title: 'Chương trình', dataIndex: 'scope', render: v => v.join(', ') }, { title: 'Trạng thái', dataIndex: 'status', render: tag }, { title: 'Tổng tiền', render: (_: any, r: any) => currency(salaryOverview?.periods?.find((p: any) => p.id === r.id)?.total) }, { title: 'Phiên bản', dataIndex: 'revision' }
            ]}/></>}
  <Drawer title={drawerTitle} open={!!periodId} onClose={() => { setPeriodId(undefined); setHistoryOpen(false); }} width='min(1200px, 100vw)'>
   {detailError && <Alert type='error' message={getError(detailError)}/>}
   {detail && <>
    <Space wrap style={{ marginBottom: 16 }}>{tag(detail.period.status)}<Text type='secondary'>Bản tính {detail.period.calculation_hash?.slice(0, 12) ?? 'chưa tính'} · giờ Việt Nam</Text></Space>
    <Row gutter={[12, 12]}>{[['Lương kỳ này', detail.total], ['Đã thanh toán', detail.paid], ['Còn phải trả', detail.unpaid]].map(([label, value]) => <Col xs={24} md={8} key={label}><Card size='small'><Statistic title={label} value={currency(value)}/></Card></Col>)}</Row>
    <Space wrap style={{ margin: '16px 0' }}>
     {detail.period.status === 'draft' && can('salary.period.calculate') && <Button type='primary' onClick={() => open('recalculate')}>Tính lại bảng lương</Button>}
     {detail.period.status === 'draft' && can('salary.adjust') && <Button onClick={() => open('adjust')}>Thêm khoản điều chỉnh</Button>}
     {detail.period.status === 'draft' && can('salary.review') && <Button onClick={() => open('submit')}>Gửi kiểm tra</Button>}
     {detail.period.status === 'pending_review' && can('salary.review') && <Button onClick={() => open('return')}>Trả về nháp</Button>}
     {detail.period.status === 'pending_review' && can('salary.approve') && <Button type='primary' onClick={() => open('approve')}>Duyệt và chốt</Button>}
     {detail.period.status === 'approved' && can('salary.reopen') && !detail.payments.length && <Button onClick={() => open('reopen')}>Mở lại để điều chỉnh</Button>}
     {can('salary.export') && <Button onClick={() => download(`periods/${periodId}/export`)}>Xuất Excel kỳ này</Button>}
     {can('salary.audit.view') && <Button onClick={() => setHistoryOpen(!historyOpen)}>Lịch sử thao tác</Button>}
    </Space>
    {!!detail.period.snapshot?.issues?.length && <Alert type='warning' message={`${detail.period.snapshot.issues.length} vấn đề cần đối soát trước khi chốt`} description={<ul>{detail.period.snapshot.issues.map((v: any, i: number) => <li key={i}>Lịch {v.calendar_id ?? ''} / công {v.record_id ?? ''}: {v.message}</li>)}</ul>} style={{ marginBottom: 12 }}/>}
    <Tabs items={[
                { key: 'teachers', label: 'Theo nhân sự', children: <Table<any> rowKey='id' dataSource={detail.teachers} scroll={{ x: 800 }} columns={[{ title: 'Người hưởng', dataIndex: 'name' }, { title: 'Công', dataIndex: 'sessions' }, { title: 'Cơ bản', dataIndex: 'base', render: currency }, { title: 'Điều chỉnh', dataIndex: 'adjustment', render: currency }, { title: 'Tổng', dataIndex: 'total', render: currency }, { title: 'Còn trả', dataIndex: 'unpaid', render: currency }, { title: '', render: (_, r) => detail.period.status === 'approved' && Number(r.unpaid) > 0 && can('salary.pay') ? <Button onClick={() => open('pay', r)}>Ghi nhận thanh toán</Button> : null }]}/> },
                { key: 'items', label: 'Công và đơn giá snapshot', children: <Table<any> rowKey='id' dataSource={detail.items} scroll={{ x: 900 }} columns={[{ title: 'Người hưởng', render: (_, r) => r.snapshot.teacher?.name ?? r.snapshot.teacher?.username }, { title: 'Bài', render: (_, r) => r.snapshot.lesson_name }, { title: 'Ngày', render: (_, r) => String(r.snapshot.service_date).slice(0, 10) }, { title: 'Giá đã áp', render: (_, r) => currency(r.snapshot.rate.amount) }, { title: 'Giờ thực', render: (_, r) => (r.snapshot.actual_seconds / 3600).toFixed(2) }, { title: 'Tiền', dataIndex: 'amount', render: currency }, { title: '', render: (_, r) => detail.period.status === 'draft' && can('salary.period.calculate') ? <Button danger onClick={() => open('release', r)}>Loại công để đối soát</Button> : null }]}/> },
                { key: 'adjustments', label: 'Phụ cấp / điều chỉnh', children: <Table<any> rowKey='id' dataSource={detail.adjustments} scroll={{ x: 700 }} columns={[{ title: 'Nhân sự', dataIndex: 'teacher_profile_id' }, { title: 'Loại', dataIndex: 'kind' }, { title: 'Số tiền', dataIndex: 'amount', render: currency }, { title: 'Lý do', dataIndex: 'reason' }, { title: 'Dòng lương gốc', dataIndex: 'source_item_id' }]}/> },
                { key: 'payments', label: 'Thanh toán', children: <Table<any> rowKey='id' dataSource={detail.payments} scroll={{ x: 650 }} columns={[{ title: 'Nhân sự', dataIndex: 'teacher_profile_id' }, { title: 'Số tiền', dataIndex: 'amount', render: currency }, { title: 'Chứng từ', dataIndex: 'reference' }, { title: 'Người ghi nhận', dataIndex: 'created_by' }, { title: 'Ngày', dataIndex: 'created_at', render: instantText }]}/> }
            ]}/>
    {historyOpen && <Card title='Lịch sử đối soát'>{historyError && <Alert type='error' message={getError(historyError)}/>}<Table<any> rowKey='id' dataSource={history?.rows ?? []} columns={[{ title: 'Thời gian', dataIndex: 'created_at', render: instantText }, { title: 'Thao tác', dataIndex: 'action' }, { title: 'Người thực hiện', dataIndex: 'actor_username' }, { title: 'Lý do', dataIndex: 'reason' }]} expandable={{ expandedRowRender: r => <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>{JSON.stringify({ before: r.before_data, after: r.after_data }, null, 2)}</pre> }}/></Card>}
   </>}
  </Drawer>
  <Modal open={!!dialog} title={dialog ? ({ confirm: 'Xác nhận công thực tế', revise: 'Đối soát công đã ghi', rate: 'Thêm phiên bản đơn giá', period: 'Tạo kỳ lương', adjust: 'Thêm khoản điều chỉnh', pay: 'Ghi nhận thanh toán', recalculate: 'Tính lại bảng lương', submit: 'Gửi kiểm tra', return: 'Trả về nháp', approve: 'Duyệt và chốt', reopen: 'Mở lại kỳ chưa trả', release: 'Loại công khỏi kỳ nháp' } as Record<string, string>)[dialog.type] : ''} onCancel={() => setDialog(null)} onOk={() => form.submit()} confirmLoading={busy} width={760} destroyOnClose>
   <Form form={form} layout='vertical' onFinish={submit}>
    {dialog && ['confirm', 'revise'].includes(dialog.type) && <>
     <Alert type='info' showIcon message='Xác nhận người thực dạy và khoảng thời gian theo giờ Việt Nam. Việc này không sửa lịch gốc.' style={{ marginBottom: 16 }}/>
     {field('calendar_ids', 'ID các lịch nguồn', <Select mode='tags' tokenSeparators={[',']} options={(data?.rows ?? []).filter((r: any) => r.calendar_id).map((r: any) => ({ value: r.id, label: `#${r.id} · ${r.code}` }))}/>)}
     <Row gutter={12}><Col xs={24} md={12}>{field('role', 'Vai trò', <Select options={[{ value: 'teacher', label: 'Giáo viên' }, { value: 'assistant', label: 'Trợ giảng' }]}/>)}</Col><Col xs={24} md={12}>{field('teacher_profile_id', 'Người thực dạy', <Select allowClear showSearch optionFilterProp='label' options={teacherOptions}/>, false)}</Col></Row>
     <Row gutter={12}><Col xs={24} md={12}>{field('outcome', 'Kết quả', <Select options={options(['completed', 'teacher_absent', 'not_held', 'cancelled'])}/>)}</Col><Col xs={24} md={12}>{field('session_kind', 'Loại buổi', <Select options={options(['regular', 'makeup', 'additional', 'unknown'])}/>)}</Col></Row>
     <Row gutter={12}><Col xs={24} md={12}>{field('actual_start_time', 'Bắt đầu thực dạy', <DatePicker showTime format='DD/MM/YYYY HH:mm' style={{ width: '100%' }}/>, false)}</Col><Col xs={24} md={12}>{field('actual_end_time', 'Kết thúc thực dạy', <DatePicker showTime format='DD/MM/YYYY HH:mm' style={{ width: '100%' }}/>, false)}</Col></Row>
     {field('replaces_calendar_id', 'ID lịch nghỉ gốc (học bù thiếu liên kết tự động)', <InputNumber min={1} style={{ width: '100%' }}/>, false)}
     {field('billing_code', 'Chương trình chịu chi phí', <Select showSearch options={programOptions}/>)}
     <Form.Item name='shared_confirmed' valuePropName='checked' label='Xác nhận các lịch trên là cùng một lần giảng thực tế'><Switch /></Form.Item>
     <Form.Item name='planned_teacher_absent' valuePropName='checked' label='Người được phân công ban đầu vắng'><Switch /></Form.Item>
     {field('identity_resolution', 'Căn cứ đối soát danh tính (khi lịch thiếu / trùng tên)', <Input.TextArea maxLength={500}/>, false)}
     {field('evidence', 'Căn cứ xác nhận công', <Input.TextArea maxLength={2000}/>)}
    </>}
    {dialog?.type === 'rate' && <>
     {field('name', 'Tên đơn giá', <Input maxLength={150}/>)}<Row gutter={12}><Col xs={24} md={12}>{field('amount', 'Số tiền VND', <InputNumber min={0} precision={0} style={{ width: '100%' }}/>)}</Col><Col xs={24} md={12}>{field('priority', 'Ưu tiên (số lớn ưu tiên hơn)', <InputNumber min={0} max={10000} style={{ width: '100%' }}/>)}</Col></Row>
     <Row gutter={12}><Col xs={24} md={12}>{field('pay_basis', 'Cách trả', <Select options={[{ value: 'session', label: 'Theo buổi' }, { value: 'hour', label: 'Theo giờ' }]}/>)}</Col><Col xs={24} md={12}>{field('duration_basis', 'Nguồn thời lượng', <Select options={[{ value: 'actual', label: 'Thực dạy đã xác nhận' }, { value: 'scheduled', label: 'Theo lịch đã xác nhận' }]}/>)}</Col></Row>
     <Row gutter={12}><Col xs={24} md={12}>{field('valid_from', 'Hiệu lực từ', <DatePicker format='DD/MM/YYYY' style={{ width: '100%' }}/>)}</Col><Col xs={24} md={12}>{field('valid_to', 'Hiệu lực đến trước', <DatePicker format='DD/MM/YYYY' style={{ width: '100%' }}/>)}</Col></Row>
     <Row gutter={12}><Col xs={24} md={12}>{field('code', 'Chương trình (trống: mặc định)', <Select allowClear showSearch options={programOptions}/>, false)}</Col><Col xs={24} md={12}>{field('teacher_profile_id', 'Nhân sự (trống: mọi người)', <Select allowClear showSearch optionFilterProp='label' options={teacherOptions}/>, false)}</Col></Row>
     <Row gutter={12}><Col xs={24} md={12}>{field('role', 'Vai trò', <Select allowClear options={[{ value: 'teacher', label: 'Giáo viên' }, { value: 'assistant', label: 'Trợ giảng' }]}/>, false)}</Col><Col xs={24} md={12}>{field('session_kind', 'Loại buổi', <Select allowClear options={options(['regular', 'makeup', 'additional'])}/>, false)}</Col></Row>
     <Row gutter={12}><Col xs={12} md={8}>{field('subject', 'Môn đúng nhãn lịch', <Input />, false)}</Col><Col xs={12} md={8}>{field('grade', 'Khối', <InputNumber min={1} max={12}/>, false)}</Col><Col xs={12} md={8}>{field('group_id', 'Nhóm học', <Select allowClear showSearch optionFilterProp='label' options={groupOptions}/>, false)}</Col></Row>
     {field('is_substitute', 'Điều kiện dạy thay', <Select allowClear options={[{ value: true, label: 'Chỉ dạy thay' }, { value: false, label: 'Không dạy thay' }]}/>, false)}
    </>}
    {dialog?.type === 'period' && <>{field('name', 'Tên kỳ', <Input maxLength={150}/>)}{field('codes', 'Chương trình trong kỳ', <Select mode='multiple' showSearch options={programOptions}/>)}<Row gutter={12}><Col xs={24} md={12}>{field('from', 'Ngày bắt đầu', <DatePicker format='DD/MM/YYYY' style={{ width: '100%' }}/>)}</Col><Col xs={24} md={12}>{field('to', 'Ngày kết thúc không bao gồm', <DatePicker format='DD/MM/YYYY' style={{ width: '100%' }}/>)}</Col></Row></>}
    {dialog?.type === 'adjust' && <>{field('teacher_profile_id', 'Người hưởng', <Select showSearch optionFilterProp='label' options={teacherOptions}/>)}{field('code', 'Chương trình', <Select options={(detail?.period.scope ?? []).map((c: string) => ({ value: c, label: c }))}/>)}{field('kind', 'Loại khoản', <Select options={[{ value: 'allowance', label: 'Phụ cấp' }, { value: 'bonus', label: 'Thưởng' }, { value: 'penalty', label: 'Phạt (nhập số dương)' }, { value: 'correction', label: 'Điều chỉnh (+/-)' }]}/>)}{field('amount', 'Số tiền VND', <InputNumber precision={0} style={{ width: '100%' }}/>)}{field('source_item_id', 'ID dòng lương kỳ đã chốt (nếu hồi tố)', <Input />, false)}</>}
    {dialog?.type === 'pay' && <><Alert showIcon message={`Ghi nhận tiền đã trả ngoài hệ thống cho ${dialog.row.name}. Còn phải trả: ${currency(dialog.row.unpaid)}`} style={{ marginBottom: 12 }}/><Form.Item name='teacher_profile_id' hidden><InputNumber /></Form.Item>{field('amount', 'Số tiền đã trả', <InputNumber min={1} max={Number(dialog.row.unpaid)} precision={0} style={{ width: '100%' }}/>)}{field('reference', 'Mã chứng từ / tham chiếu', <Input maxLength={150}/>)}</>}
    {dialog && ['recalculate', 'submit', 'approve', 'return', 'reopen', 'release'].includes(dialog.type) && <Alert type={dialog.type === 'approve' ? 'warning' : 'info'} showIcon style={{ marginBottom: 16 }} message={`${detail?.period.name} · v${detail?.period.revision} · ${detail?.teachers.length ?? 0} người · ${detail?.items.length ?? 0} công · ${currency(detail?.total)}`} description={dialog.type === 'approve' ? 'Chốt số liệu snapshot của bản tính đang xem.' : dialog.type === 'recalculate' ? 'Tính lại có thể thay đổi công và tiền nháp; các khoản điều chỉnh được giữ lại.' : 'Thao tác được lưu vào lịch sử đối soát.'}/>}
    {field('reason', 'Lý do thao tác', <Input.TextArea maxLength={500} showCount/>)}
   </Form>
  </Modal>
 </main>;
}
