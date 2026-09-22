"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Descriptions, Form, Image, Input, Modal, Popconfirm, Radio, Select, Space, Spin, Switch, Table, Tag, Typography, Upload, message } from 'antd';
import { CheckCircleOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, FileExcelOutlined, InboxOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { createProgramTeacherBanner, deleteProgramTeacherBanner, downloadProgramTeacherBannerTemplate, getProgramTeacherBannerOptions, getProgramTeacherBanners, importProgramTeacherBanners, ProgramTeacherBanner, ProgramTeacherBannerPayload, updateProgramTeacherBanner } from '@/services/programTeacherBannerService';
import { useAuthStore } from '@/stores/authStore';
import { PermissionKey } from '@/types/permissions';

export default function ProgramTeacherBannersPage() {
  const [rows, setRows] = useState<ProgramTeacherBanner[]>([]);
  const [teachers, setTeachers] = useState<Array<{ id: number; username: string; display_name?: string | null }>>([]);
  const [programs, setPrograms] = useState<Array<{ code: string; subject_name?: string | null }>>([]);
  const [allTeachers, setAllTeachers] = useState<Array<{ id: number; username: string; display_name?: string | null }>>([]);
  const [allPrograms, setAllPrograms] = useState<Array<{ code: string; subject_name?: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProgramTeacherBanner | null>(null);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [form] = Form.useForm<ProgramTeacherBannerPayload>();
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'skip' | 'overwrite'>('skip');
  const [importing, setImporting] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  // Nhiều request options có thể hoàn tất không theo thứ tự (lúc mở modal,
  // sau đó người dùng chọn Chương trình). Chỉ response mới nhất được phép
  // thay danh sách Select, tránh danh sách tổng ghi đè danh sách đã lọc.
  const optionsRequestRef = useRef(0);
  const canCreate = useAuthStore(s => s.hasPermission(PermissionKey.PROGRAM_TEACHER_BANNER_CREATE));
  const canUpdate = useAuthStore(s => s.hasPermission(PermissionKey.PROGRAM_TEACHER_BANNER_EDIT));
  const canDelete = useAuthStore(s => s.hasPermission(PermissionKey.PROGRAM_TEACHER_BANNER_DELETE));
  const canImport = useAuthStore(s => s.hasPermission(PermissionKey.PROGRAM_TEACHER_BANNER_IMPORT));

  const load = useCallback(async (page = pagination.current, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const response: any = await getProgramTeacherBanners({ page, limit: pageSize, search });
      setRows(response?.data?.data || []);
      setPagination({ current: page, pageSize, total: Number(response?.data?.pagination?.total || 0) });
    } catch (e: any) { message.error(e?.message || 'Không thể tải danh sách banner'); }
    finally { setLoading(false); }
  }, [pagination.current, pagination.pageSize, search]);

  useEffect(() => { load(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const loadInitialOptions = async () => {
    const requestId = ++optionsRequestRef.current;
    setLoadingPrograms(true);
    setLoadingTeachers(true);
    try {
      const response: any = await getProgramTeacherBannerOptions();
      if (requestId !== optionsRequestRef.current) return;
      const nextPrograms = response?.data?.programs || [];
      const nextTeachers = response?.data?.teachers || [];
      setAllPrograms(nextPrograms);
      setAllTeachers(nextTeachers);
      setPrograms(nextPrograms);
      setTeachers(nextTeachers);
    }
    catch (e: any) { message.error(e?.message || 'Không thể tải chương trình và giáo viên'); }
    finally {
      if (requestId === optionsRequestRef.current) {
        setLoadingPrograms(false);
        setLoadingTeachers(false);
      }
    }
  };
  const loadTeachersForProgram = async (programCode: string) => {
    const requestId = ++optionsRequestRef.current;
    setTeachers([]);
    setLoadingTeachers(true);
    try {
      const response: any = await getProgramTeacherBannerOptions(programCode);
      if (requestId === optionsRequestRef.current) setTeachers(response?.data?.teachers || []);
    } catch (e: any) { message.error(e?.message || 'Không thể tải giáo viên'); }
    finally { if (requestId === optionsRequestRef.current) setLoadingTeachers(false); }
  };
  const loadProgramsForTeacher = async (teacherId: number) => {
    const requestId = ++optionsRequestRef.current;
    setPrograms([]);
    setLoadingPrograms(true);
    try {
      const response: any = await getProgramTeacherBannerOptions(undefined, teacherId);
      if (requestId === optionsRequestRef.current) setPrograms(response?.data?.programs || []);
    } catch (e: any) { message.error(e?.message || 'Không thể tải chương trình'); }
    finally { if (requestId === optionsRequestRef.current) setLoadingPrograms(false); }
  };
  useEffect(() => { loadInitialOptions(); }, []);
  const showForm = (row?: ProgramTeacherBanner) => {
    setEditing(row || null);
    form.setFieldsValue(row ? { program_code: row.program_code, teacher_profile_id: row.teacher_profile_id, banner_url: row.banner_url, status: row.status } : { status: 1 } as any);
    // Dữ liệu nền đã cache ở lúc vào trang; mở modal không gọi lại API.
    setPrograms(allPrograms);
    const currentTeacher = row ? {
      id: Number(row.teacher_profile_id),
      username: row.username,
      display_name: row.display_name,
    } : undefined;
    // Bản ghi cũ có thể gắn giáo viên đã ngừng hoạt động nên không nằm trong
    // danh sách mặc định. Vẫn giữ option này để Select hiển thị đúng tên.
    setTeachers(currentTeacher && !allTeachers.some((teacher) => teacher.id === currentTeacher.id)
      ? [currentTeacher, ...allTeachers]
      : allTeachers);
    setOpen(true);
  };
  const save = async () => {
    try {
      const values = await form.validateFields();
      if (editing) await updateProgramTeacherBanner(editing.id, values); else await createProgramTeacherBanner(values);
      message.success(editing ? 'Đã cập nhật banner' : 'Đã thêm banner');
      setOpen(false); form.resetFields(); await load(editing ? pagination.current : 1);
    } catch (e: any) { if (!e?.errorFields) message.error(e?.message || 'Không thể lưu banner'); }
  };
  const downloadTemplate = async () => {
    try { const blob: Blob = await downloadProgramTeacherBannerTemplate() as any; const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'mau-import-banner.xlsx'; anchor.click(); URL.revokeObjectURL(url); }
    catch (e: any) { message.error(e?.message || 'Không thể tải file mẫu'); }
  };
  const submitImport = async () => {
    if (!importFile) return message.warning('Vui lòng chọn file CSV hoặc XLSX');
    setImporting(true);
    try { const response: any = await importProgramTeacherBanners(importFile, importMode); const result = response?.data || {}; message.success(`Đã thêm ${result.created || 0}, cập nhật ${result.updated || 0}, bỏ qua ${result.skipped || 0}`); setImportOpen(false); setImportFile(null); await load(1); }
    catch (e: any) { const errors = e?.detail?.errors; message.error(Array.isArray(errors) && errors.length ? `Dòng ${errors[0].row}: ${errors[0].message}` : e?.message || 'Import thất bại'); }
    finally { setImporting(false); }
  };
  return <div style={{ padding: 24 }}>
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <div><Typography.Title level={3} style={{ margin: 0 }}>Banner chương trình – giáo viên</Typography.Title><Typography.Text type="secondary">Nguồn banner chuẩn dùng cho lịch học và stream</Typography.Text></div>
        <Space>{canImport && <><Button icon={<DownloadOutlined />} onClick={downloadTemplate}>File mẫu</Button><Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>Import</Button></>}{canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={() => showForm()}>Thêm banner</Button>}</Space>
      </Space>
      <Space.Compact style={{ maxWidth: 520, width: '100%' }}><Input.Search allowClear placeholder="Mã chương trình hoặc giáo viên" value={search} onChange={e => setSearch(e.target.value)} onSearch={() => load(1)} /><Button icon={<ReloadOutlined />} onClick={() => load()} /></Space.Compact>
      <Table rowKey="id" loading={loading} dataSource={rows} pagination={pagination} onChange={p => load(p.current, p.pageSize)} columns={[
        { title: 'Chương trình', dataIndex: 'program_code' },
        { title: 'Giáo viên', render: (_: unknown, r: ProgramTeacherBanner) => <>{r.display_name || r.username}<br/><Typography.Text type="secondary">{r.username}</Typography.Text></> },
        { title: 'Banner', dataIndex: 'banner_url', render: (url: string) => <Space><Image width={100} height={50} style={{ objectFit: 'cover' }} src={url} /><Typography.Link href={url} target="_blank" ellipsis style={{ maxWidth: 220 }}>{url}</Typography.Link></Space> },
        { title: 'Trạng thái', dataIndex: 'status', render: (v: number) => <Tag color={v ? 'green' : 'default'}>{v ? 'Hoạt động' : 'Tắt'}</Tag> },
        { title: 'Thao tác', width: 120, render: (_: unknown, r: ProgramTeacherBanner) => <Space>{canUpdate && <Button type="text" icon={<EditOutlined />} onClick={() => showForm(r)} />}{canDelete && <Popconfirm title="Xóa cấu hình banner này?" onConfirm={async () => { await deleteProgramTeacherBanner(r.id); message.success('Đã xóa banner'); load(); }}><Button danger type="text" icon={<DeleteOutlined />} /></Popconfirm>}</Space> },
      ]} />
    </Space>
    <Modal title={editing ? 'Cập nhật banner' : 'Thêm banner'} open={open} onCancel={() => setOpen(false)} onOk={save} destroyOnClose>
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item name="program_code" label="Chương trình" rules={[{ required: true, message: 'Chọn chương trình' }]}><Select allowClear showSearch optionFilterProp="label" placeholder="Chọn chương trình" loading={loadingPrograms} notFoundContent={loadingPrograms ? <Space><Spin size="small" /> Đang tải chương trình...</Space> : 'Không có chương trình'} options={programs.map(p => ({ value: p.code, label: p.subject_name && p.subject_name !== p.code ? `${p.subject_name} (${p.code})` : p.code }))} onChange={(code?: string) => { if (code) loadTeachersForProgram(code); else { form.setFieldValue('teacher_profile_id', undefined); setTeachers(allTeachers); } }} /></Form.Item>
        <Form.Item name="teacher_profile_id" label="Giáo viên" rules={[{ required: true, message: 'Chọn giáo viên' }]}><Select allowClear showSearch optionFilterProp="label" placeholder="Chọn giáo viên" loading={loadingTeachers} disabled={loadingTeachers} notFoundContent={loadingTeachers ? <Space><Spin size="small" /> Đang tải giáo viên...</Space> : 'Không có giáo viên phù hợp'} options={teachers.map(t => ({ value: t.id, label: `${t.display_name || t.username} (${t.username})` }))} onChange={(id?: number) => { const selectedProgram = form.getFieldValue('program_code'); if (id && selectedProgram) return; if (id) loadProgramsForTeacher(id); else { form.setFieldValue('program_code', undefined); setPrograms(allPrograms); } }} /></Form.Item>
        <Form.Item name="banner_url" label="URL banner" rules={[{ required: true, type: 'url', message: 'Nhập URL hợp lệ' }]}><Input maxLength={500} /></Form.Item>
        <Form.Item name="status" label="Hoạt động" valuePropName="checked" getValueFromEvent={(checked: boolean) => checked ? 1 : 0} getValueProps={(value: number) => ({ checked: value !== 0 })}><Switch /></Form.Item>
      </Form>
    </Modal>
    <Modal title="Import banner" open={importOpen} onCancel={() => setImportOpen(false)} onOk={submitImport} confirmLoading={importing} okText="Bắt đầu import" width={680} destroyOnClose>
      <Space direction="vertical" style={{ width: '100%' }} size={20}>
        <Alert showIcon type="info" message="Import theo file quản lý hiện tại" description={<span>Hỗ trợ <b>CSV</b> và <b>XLSX</b>, với ba cột: <Typography.Text code>code</Typography.Text>, <Typography.Text code>teacher</Typography.Text>, <Typography.Text code>banner_url</Typography.Text>.</span>} />
        <Upload.Dragger accept=".csv,.xlsx" maxCount={1} beforeUpload={(file) => { setImportFile(file); return false; }} onRemove={() => setImportFile(null)} fileList={importFile ? [{ uid: 'banner-import', name: importFile.name, status: 'done' }] : []} disabled={importing} style={{ padding: '8px 0' }}>
          <p className="ant-upload-drag-icon"><InboxOutlined style={{ color: '#1677ff' }} /></p>
          <p className="ant-upload-text">Kéo thả file vào đây hoặc bấm để chọn</p>
          <p className="ant-upload-hint">Dung lượng tối đa 5 MB · Chỉ nhận một file</p>
        </Upload.Dragger>
        <Card size="small" style={{ background: '#fafcff' }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
            <Space><FileExcelOutlined style={{ fontSize: 20, color: '#217346' }} /><div><Typography.Text strong>Chưa có đúng format?</Typography.Text><br /><Typography.Text type="secondary">Tải file mẫu rồi dán dữ liệu từ Google Sheet.</Typography.Text></div></Space>
            <Button type="link" icon={<DownloadOutlined />} onClick={downloadTemplate}>Tải file mẫu</Button>
          </Space>
        </Card>
        <div><Typography.Text strong>Nếu cặp Chương trình – Giáo viên đã tồn tại</Typography.Text><Radio.Group value={importMode} onChange={e => setImportMode(e.target.value)} style={{ width: '100%', marginTop: 10 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio value="skip"><b>Giữ dữ liệu hiện có</b><Typography.Text type="secondary"> — bỏ qua các dòng trùng.</Typography.Text></Radio>
            <Radio value="overwrite"><b>Cập nhật URL banner</b><Typography.Text type="secondary"> — ghi đè banner của cặp trùng.</Typography.Text></Radio>
          </Space>
        </Radio.Group></div>
        {importFile && <Descriptions size="small" column={1} bordered items={[{ key: 'file', label: 'File sẵn sàng', children: <Space><CheckCircleOutlined style={{ color: '#52c41a' }} />{importFile.name}</Space> }, { key: 'mode', label: 'Chế độ', children: importMode === 'skip' ? 'Giữ dữ liệu hiện có' : 'Cập nhật URL banner' }]} />}
      </Space>
    </Modal>
  </div>;
}
