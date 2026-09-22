"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Avatar, Button, Card, Col, Descriptions, Form, Image, Input, Modal, Popconfirm, Radio, Row, Select, Space, Spin, Switch, Table, Tag, Tooltip, Typography, Upload, message } from 'antd';
import { CheckCircleOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, ExportOutlined, FileExcelOutlined, InboxOutlined, LinkOutlined, PlusOutlined, ReloadOutlined, UploadOutlined, InfoCircleOutlined, WarningOutlined, PictureOutlined, ExpandOutlined, CloseOutlined } from '@ant-design/icons';
import { createProgramTeacherBanner, deleteProgramTeacherBanner, downloadProgramTeacherBannerTemplate, exportProgramTeacherBanners, getProgramTeacherBannerOptions, getProgramTeacherBanners, importProgramTeacherBanners, ProgramTeacherBanner, ProgramTeacherBannerPayload, updateProgramTeacherBanner } from '@/services/programTeacherBannerService';
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
  const [exporting, setExporting] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  // Nhiều request options có thể hoàn tất không theo thứ tự (lúc mở modal,
  // sau đó người dùng chọn Chương trình). Chỉ response mới nhất được phép
  // thay danh sách Select, tránh danh sách tổng ghi đè danh sách đã lọc.
  const optionsRequestRef = useRef(0);
  const canCreate = useAuthStore(s => s.hasPermission(PermissionKey.PROGRAM_TEACHER_BANNER_CREATE));
  const canUpdate = useAuthStore(s => s.hasPermission(PermissionKey.PROGRAM_TEACHER_BANNER_EDIT));
  const canDelete = useAuthStore(s => s.hasPermission(PermissionKey.PROGRAM_TEACHER_BANNER_DELETE));
  const canImport = useAuthStore(s => s.hasPermission(PermissionKey.PROGRAM_TEACHER_BANNER_IMPORT));
  const bannerUrl = Form.useWatch('banner_url', form);
  const selectedProgramCode = Form.useWatch('program_code', form);

  useEffect(() => {
    setPreviewError(false);
    const normalizedUrl = String(bannerUrl || '').trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      setPreviewUrl('');
      return;
    }
    const timer = window.setTimeout(() => setPreviewUrl(normalizedUrl), 500);
    return () => window.clearTimeout(timer);
  }, [bannerUrl]);

  const load = useCallback(async (page = pagination.current, pageSize = pagination.pageSize, searchValue = search) => {
    setLoading(true);
    try {
      const response: any = await getProgramTeacherBanners({ page, limit: pageSize, search: searchValue });
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
  useEffect(() => { loadInitialOptions(); }, []);
  const showForm = (row?: ProgramTeacherBanner) => {
    setEditing(row || null);
    setPreviewError(false);
    form.resetFields();
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
  const closeForm = () => {
    if (saving) return;
    optionsRequestRef.current += 1;
    setOpen(false);
  };
  const save = async () => {
    if (saving) return;
    try {
      const values = await form.validateFields();
      setSaving(true);
      const response: any = editing
        ? await updateProgramTeacherBanner(editing.id, values)
        : await createProgramTeacherBanner(values);
      const saved = response?.data as ProgramTeacherBanner | undefined;
      if (saved) {
        if (editing) {
          setRows(current => current.map(row => row.id === saved.id ? saved : row));
        } else if (pagination.current === 1) {
          setRows(current => [saved, ...current].slice(0, pagination.pageSize));
          setPagination(current => ({ ...current, total: current.total + 1 }));
        }
      }
      message.success(editing ? 'Đã cập nhật banner' : 'Đã thêm banner');
      setOpen(false);
      form.resetFields();
      // Chỉ tải lại khi bản ghi mới không thuộc trang hiện tại. Cập nhật/sửa
      // bình thường dùng ngay dữ liệu API trả về, tránh thêm một request chờ.
      if (!saved || (!editing && pagination.current !== 1)) void load(editing ? pagination.current : 1);
    } catch (e: any) { if (!e?.errorFields) message.error(e?.message || 'Không thể lưu banner'); }
    finally { setSaving(false); }
  };
  const downloadTemplate = async () => {
    try { const blob: Blob = await downloadProgramTeacherBannerTemplate() as any; const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'mau-import-banner.xlsx'; anchor.click(); URL.revokeObjectURL(url); }
    catch (e: any) { message.error(e?.message || 'Không thể tải file mẫu'); }
  };
  const exportBanners = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const blob = await exportProgramTeacherBanners(search) as Blob;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `banner-chuong-trinh-giao-vien-${new Date().toISOString().slice(0, 10)}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
      message.success(search.trim() ? 'Đã export dữ liệu theo bộ lọc' : 'Đã export toàn bộ banner');
    } catch (e: any) {
      message.error(e?.message || 'Không thể export banner');
    } finally {
      setExporting(false);
    }
  };
  const submitImport = async () => {
    if (!importFile) return message.warning('Vui lòng chọn file CSV hoặc XLSX');
    setImporting(true);
    try { const response: any = await importProgramTeacherBanners(importFile, importMode); const result = response?.data || {}; message.success(`Đã thêm ${result.created || 0}, cập nhật ${result.updated || 0}, bỏ qua ${result.skipped || 0}`); setImportOpen(false); setImportFile(null); await load(1); }
    catch (e: any) { const errors = e?.detail?.errors; message.error(Array.isArray(errors) && errors.length ? `Dòng ${errors[0].row}: ${errors[0].message}` : e?.message || 'Import thất bại'); }
    finally { setImporting(false); }
  };
  return <div>
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0, fontSize: 26 }}>Banner chương trình – giáo viên</Typography.Title>
          <Typography.Text type="secondary">Quản lý hình ảnh hiển thị theo từng chương trình và giáo viên</Typography.Text>
        </div>
        <Space wrap>
          {canImport && <Button icon={<ExportOutlined />} loading={exporting} onClick={() => void exportBanners()}>Export</Button>}
          {canImport && <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>Import</Button>}
          {canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={() => showForm()}>Thêm banner</Button>}
        </Space>
      </div>
      <Card styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Input.Search
            allowClear
            enterButton="Tìm kiếm"
            placeholder="Tìm theo mã chương trình, tên hoặc tài khoản giáo viên"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onSearch={value => { setSearch(value); void load(1, pagination.pageSize, value); }}
            style={{ width: 'min(100%, 520px)' }}
          />
          <Space>
            <Typography.Text type="secondary">{pagination.total.toLocaleString('vi-VN')} banner</Typography.Text>
            <Tooltip title="Tải lại danh sách"><Button icon={<ReloadOutlined />} onClick={() => void load()} /></Tooltip>
          </Space>
        </div>
      </Card>
      <Card styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          scroll={{ x: 980 }}
          pagination={{ ...pagination, showSizeChanger: true, showTotal: total => `Tổng ${total} banner`, pageSizeOptions: [10, 20, 50, 100] }}
          onChange={p => void load(p.current, p.pageSize)}
          columns={[
            { title: 'Chương trình', dataIndex: 'program_code', width: 260, render: (code: string) => <Typography.Text strong copyable={{ text: code }}>{code}</Typography.Text> },
            { title: 'Giáo viên', width: 300, render: (_: unknown, r: ProgramTeacherBanner) => <Space size={10}><Avatar style={{ background: '#e6f4ff', color: '#1677ff' }}>{(r.display_name || r.username || 'G').trim().charAt(0).toUpperCase()}</Avatar><div><Typography.Text strong>{r.display_name || r.username}</Typography.Text><br/><Typography.Text type="secondary">{r.username}</Typography.Text></div></Space> },
            { title: 'Banner', dataIndex: 'banner_url', width: 440, render: (url: string) => <Space size={12}><Image width={112} height={56} style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #f0f0f0' }} src={url} fallback="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" /><div style={{ minWidth: 0 }}><Typography.Text ellipsis={{ tooltip: url }} style={{ display: 'block', maxWidth: 260 }}>{url}</Typography.Text><Typography.Link href={url} target="_blank"><LinkOutlined /> Mở ảnh gốc</Typography.Link></div></Space> },
            { title: 'Trạng thái', dataIndex: 'status', width: 130, align: 'center' as const, render: (v: number) => <Tag color={v ? 'success' : 'default'}>{v ? 'Hoạt động' : 'Đã tắt'}</Tag> },
            { title: 'Thao tác', width: 110, fixed: 'right' as const, align: 'center' as const, render: (_: unknown, r: ProgramTeacherBanner) => <Space size={4}>{canUpdate && <Tooltip title="Chỉnh sửa"><Button type="text" icon={<EditOutlined />} onClick={() => showForm(r)} /></Tooltip>}{canDelete && <Popconfirm title="Xóa banner?" description="Cấu hình này sẽ bị xóa khỏi hệ thống." okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={async () => { await deleteProgramTeacherBanner(r.id); message.success('Đã xóa banner'); void load(); }}><Tooltip title="Xóa"><Button danger type="text" icon={<DeleteOutlined />} /></Tooltip></Popconfirm>}</Space> },
          ]}
        />
      </Card>
    </Space>
    <Modal
      title={editing ? 'Cập nhật banner' : 'Thêm banner'}
      open={open}
      onCancel={closeForm}
      onOk={save}
      confirmLoading={saving}
      cancelButtonProps={{ disabled: saving }}
      okText={editing ? 'Lưu thay đổi' : 'Thêm banner'}
      width={600}
      destroyOnClose
    >
      <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 16 }}>
        <Alert
          showIcon
          type="info"
          message="Mẹo: Chọn chương trình trước để lọc giáo viên chính xác hơn."
          style={{ marginBottom: 16, padding: '8px 12px' }}
        />

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="program_code" label="Chương trình" rules={[{ required: true, message: 'Vui lòng chọn chương trình' }]}>
              <Select allowClear showSearch optionFilterProp="label" placeholder="Tìm theo tên/mã" loading={loadingPrograms} disabled={saving} notFoundContent={loadingPrograms ? <Space><Spin size="small" /> Đang tải...</Space> : 'Không có dữ liệu'} options={programs.map(p => ({ value: p.code, label: p.subject_name && p.subject_name !== p.code ? `${p.subject_name} (${p.code})` : p.code }))} onChange={(code?: string) => { form.setFieldValue('teacher_profile_id', undefined); if (code) void loadTeachersForProgram(code); else setTeachers(allTeachers); }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="teacher_profile_id" label="Giáo viên" rules={[{ required: true, message: 'Vui lòng chọn giáo viên' }]}>
              <Select allowClear showSearch optionFilterProp="label" placeholder={selectedProgramCode ? 'Tìm giáo viên' : 'Chọn chương trình trước'} loading={loadingTeachers} disabled={saving || loadingTeachers || !selectedProgramCode} notFoundContent={loadingTeachers ? <Space><Spin size="small" /> Đang tải...</Space> : 'Không có dữ liệu'} options={teachers.map(t => ({ value: t.id, label: `${t.display_name || t.username} (${t.username})` }))} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="banner_url" label="Đường dẫn hình ảnh (URL)" extra="Sử dụng đường dẫn HTTPS trực tiếp tới ảnh." rules={[{ required: true, type: 'url', message: 'Vui lòng nhập URL hợp lệ' }]}>
          <Input prefix={<LinkOutlined style={{ color: '#bfbfbf' }} />} placeholder="https://example.com/banner.jpg" disabled={saving} onChange={() => setPreviewError(false)} allowClear />
        </Form.Item>

        <div style={{ marginBottom: 20 }}>
          {previewUrl ? (
            previewError ? (
              <Alert showIcon type="error" message="Không thể tải ảnh" description="Đường dẫn không hợp lệ hoặc không có quyền truy cập." />
            ) : (
              <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 8, background: '#fafafa', position: 'relative' }}>
                <Image src={previewUrl} style={{ width: '100%', height: 180, objectFit: 'contain' }} preview={false} onError={() => setPreviewError(true)} />
                <Button size="small" type="default" icon={<ExpandOutlined />} href={previewUrl} target="_blank" style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.85)' }}>Mở ảnh gốc</Button>
              </div>
            )
          ) : (
            <div style={{ height: 160, border: '1px dashed #d9d9d9', borderRadius: 8, background: '#fafafa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#bfbfbf' }}>
              <PictureOutlined style={{ fontSize: 32, marginBottom: 8 }} />
              <span>Ảnh xem trước</span>
            </div>
          )}
        </div>

        <Form.Item name="status" label="Trạng thái hoạt động" valuePropName="checked" getValueFromEvent={(checked: boolean) => checked ? 1 : 0} getValueProps={(value: number) => ({ checked: value !== 0 })} style={{ marginBottom: 0 }}>
          <Switch disabled={saving} checkedChildren="Bật" unCheckedChildren="Tắt" />
        </Form.Item>
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
