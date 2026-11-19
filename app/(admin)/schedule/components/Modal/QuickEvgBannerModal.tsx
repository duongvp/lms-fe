"use client";

import { useEffect, useRef, useState } from 'react';
import { Alert, AutoComplete, Button, Col, Form, Image, Input, Modal, Row, Select, Space, Switch, Typography, message } from 'antd';
import { ExpandOutlined, LinkOutlined, PictureOutlined } from '@ant-design/icons';
import { createProgramTeacherBanner, getProgramTeacherBannerOptions, getProgramTeacherBanners, updateProgramTeacherBanner, type ProgramTeacherBanner } from '@/services/programTeacherBannerService';
import { useAuthStore } from '@/stores/authStore';
import { PermissionKey } from '@/types/permissions';
import { fetchAllPages } from '@/lib/fetchAllPages';

type Target = { code?: string; teacher?: string };
type Teacher = { id: number; username: string; display_name?: string | null };
const normalize = (value: unknown) => String(value || '').trim().toLocaleLowerCase();

export default function QuickEvgBannerModal({ target, onClose, onSaved }: {
    target: Target | null;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [form] = Form.useForm<{ teacher_profile_id: number; banner_url: string }>();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [banners, setBanners] = useState<ProgramTeacherBanner[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewError, setPreviewError] = useState(false);
    const [bannerOptionsOpen, setBannerOptionsOpen] = useState(false);
    const [optionsError, setOptionsError] = useState('');
    const [bannersError, setBannersError] = useState('');
    const [reload, setReload] = useState(0);
    const savingRef = useRef(false);
    const canCreate = useAuthStore(s => s.hasPermission(PermissionKey.PROGRAM_TEACHER_BANNER_CREATE));
    const canEdit = useAuthStore(s => s.hasPermission(PermissionKey.PROGRAM_TEACHER_BANNER_EDIT));
    const bannerUrl = Form.useWatch('banner_url', form);
    const teacherId = Form.useWatch('teacher_profile_id', form);
    const existing = banners.find(row => normalize(row.program_code) === normalize(target?.code) && row.teacher_profile_id === teacherId);

    useEffect(() => {
        if (target) { form.resetFields(); setPreviewUrl(''); setBannerOptionsOpen(false); }
    }, [target, form]);
    useEffect(() => {
        setPreviewError(false);
        const url = String(bannerUrl || '').trim();
        try {
            if (!['http:', 'https:'].includes(new URL(url).protocol)) throw new Error();
        } catch { setPreviewUrl(''); return; }
        const timer = window.setTimeout(() => setPreviewUrl(url), 400);
        return () => window.clearTimeout(timer);
    }, [bannerUrl]);
    useEffect(() => {
        if (!target) return;
        let active = true;
        setTeachers([]);
        setBanners([]);
        setLoading(true);
        setOptionsError('');
        setBannersError('');
        const loadBanners = async () => {
            const first: any = await getProgramTeacherBanners({ page: 1, limit: 100 });
            const rows: ProgramTeacherBanner[] = first?.data?.data || [];
            const total = Number(first?.data?.pagination?.total || rows.length);
            const rest = total > 100 ? await fetchAllPages<ProgramTeacherBanner>({
                total: total - 100, pageSize: 100, concurrency: 2,
                fetchPage: async (page, limit) => {
                    const response: any = await getProgramTeacherBanners({ page: page + 1, limit });
                    return response?.data?.data || [];
                },
            }) : [];
            return [...rows, ...rest];
        };
        void Promise.allSettled([getProgramTeacherBannerOptions(target.code), loadBanners()]).then(([options, saved]) => {
            if (!active) return;
            if (options.status === 'fulfilled') {
                const available: Teacher[] = (options.value as any)?.data?.teachers || [];
                const matches = available.filter(teacher => normalize(teacher.username) === normalize(target.teacher)
                    || normalize(teacher.display_name) === normalize(target.teacher));
                setTeachers(matches);
                if (matches.length === 1) form.setFieldValue('teacher_profile_id', Number(matches[0].id));
                if (!matches.length) setOptionsError('Không tìm thấy hồ sơ giáo viên khớp với lịch này. Kiểm tra lại giáo viên của lịch học.');
            } else setOptionsError(options.reason?.message || 'Không tải được giáo viên.');
            if (saved.status === 'fulfilled') setBanners(saved.value);
            else setBannersError('Không tải được banner có sẵn. Bạn vẫn có thể nhập URL ảnh mới.');
            setLoading(false);
        });
        return () => { active = false; };
    }, [target, reload, form]);

    const save = async () => {
        if (!target?.code || savingRef.current || loading || optionsError) return;
        savingRef.current = true;
        try {
            const values = await form.validateFields();
            if (existing ? !canEdit : !canCreate) return;
            setSaving(true);
            const payload = { ...values, program_code: target.code, banner_url: values.banner_url.trim(), status: 1 as const };
            if (existing) await updateProgramTeacherBanner(existing.id, payload);
            else await createProgramTeacherBanner(payload);
            message.success('Đã lưu banner. Bấm Thử lại để tiếp tục tạo EVG.');
            onSaved();
        } catch (error: any) {
            if (!error?.errorFields) message.error(error?.message || 'Không thể lưu banner.');
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };
    const urls = new Map<string, string>();
    banners.forEach(row => {
        if (!urls.has(row.banner_url)) urls.set(row.banner_url, `${row.display_name || row.username} · ${row.program_code}`);
    });
    return <Modal className="admin-responsive-modal" title="Tạo banner nhanh cho EVG" open={Boolean(target)} width={600}
        onCancel={() => { if (!savingRef.current) onClose(); }} keyboard={!saving} maskClosable={!saving} closable={!saving}
        footer={<Space><Button disabled={saving} onClick={onClose}>Hủy</Button>
            <Button type="primary" loading={saving} disabled={loading || Boolean(optionsError) || (existing ? !canEdit : !canCreate)} onClick={() => void save()}>
                {existing ? 'Cập nhật và bật banner' : 'Lưu banner'}
            </Button></Space>}>
        <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 16 }}>
            <Alert type="info" showIcon message="Lưu banner cho chương trình và giáo viên của lịch lỗi"
                description="Chọn lại đường dẫn ảnh từ banner có sẵn hoặc nhập URL mới. Sau khi lưu, bấm Thử lại trong tiến trình EVG." />
            {optionsError && <Alert type="error" showIcon message={optionsError} action={<Button size="small" onClick={() => setReload(value => value + 1)}>Tải lại</Button>} />}
            {bannersError && <Alert type="warning" showIcon message={bannersError} action={<Button size="small" onClick={() => setReload(value => value + 1)}>Tải lại</Button>} />}
            <Form form={form} layout="vertical">
                <Row gutter={16}>
                    <Col xs={24} sm={12}>
                        <Form.Item label="Chương trình" required>
                            <Select value={target?.code} disabled options={target?.code ? [{ value: target.code, label: target.code }] : []} />
                        </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Form.Item label="Giáo viên" name="teacher_profile_id" rules={[{ required: true, message: 'Chọn hồ sơ giáo viên của lịch học' }]}>
                            <Select loading={loading} disabled={saving || teachers.length === 1} placeholder={target?.teacher || 'Chọn hồ sơ giáo viên'}
                                options={teachers.map(teacher => ({ value: Number(teacher.id), label: `${teacher.display_name || teacher.username} (${teacher.username})` }))} />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item label="Đường dẫn hình ảnh (URL)" name="banner_url" rules={[
                    { required: true, whitespace: true, message: 'Chọn hoặc nhập URL ảnh' },
                    { validator: (_, value) => {
                        try {
                            const url = new URL(String(value || '').trim());
                            if (!['http:', 'https:'].includes(url.protocol) || String(value).trim().length > 500) throw new Error();
                            return Promise.resolve();
                        } catch { return Promise.reject(new Error('Nhập URL HTTP/HTTPS hợp lệ, tối đa 500 ký tự')); }
                    } },
                ]} extra="Gõ để tìm banner cũ theo giáo viên, chương trình, URL hoặc dán đường dẫn ảnh mới.">
                    <AutoComplete disabled={saving} allowClear
                        open={bannerOptionsOpen} onDropdownVisibleChange={setBannerOptionsOpen}
                        onFocus={() => setBannerOptionsOpen(true)} onBlur={() => setBannerOptionsOpen(false)}
                        options={[...urls].map(([value, label]) => ({ value, label: <div><div>{label}</div><Typography.Text type="secondary" ellipsis>{value}</Typography.Text></div>, searchText: `${label} ${value}` }))}
                        filterOption={(input, option) => normalize(option?.searchText).includes(normalize(input))}>
                        <Input prefix={<LinkOutlined style={{ color: '#bfbfbf' }} />} placeholder="Chọn banner có sẵn hoặc nhập URL ảnh mới" />
                    </AutoComplete>
                </Form.Item>
                {existing && <Alert type="warning" showIcon message="Cặp chương trình và giáo viên đã có banner. Lưu sẽ cập nhật ảnh và bật banner này."
                    description={!canEdit ? 'Bạn chưa có quyền sửa banner.' : undefined} />}
                <div style={{ marginTop: existing ? 16 : 0, marginBottom: 20 }}>
                    {previewUrl ? <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 8, background: '#fafafa', position: 'relative' }}>
                        {previewError
                            ? <Alert showIcon type="error" message="Không thể tải ảnh" description="Kiểm tra đường dẫn ảnh hoặc quyền truy cập." />
                            : <Image src={previewUrl} alt="Xem trước banner EVG" style={{ width: '100%', height: 180, objectFit: 'contain' }}
                                preview={false} onError={() => setPreviewError(true)} />}
                        <Button size="small" icon={<ExpandOutlined />} href={previewUrl} target="_blank" rel="noopener noreferrer"
                            style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.85)' }}>Mở ảnh gốc</Button>
                    </div> : <div style={{ border: '1px dashed #d9d9d9', borderRadius: 8, padding: 24, textAlign: 'center', background: '#fafafa' }}>
                        <PictureOutlined style={{ fontSize: 24, color: '#bfbfbf', marginBottom: 8 }} /><br />
                        <Typography.Text type="secondary">Chọn hoặc nhập URL để xem trước banner</Typography.Text>
                    </div>}
                </div>
                <Form.Item label="Trạng thái hoạt động" extra="Banner được bật khi lưu để dùng ngay cho EVG." style={{ marginBottom: 0 }}>
                    <Switch checked disabled checkedChildren="Bật" unCheckedChildren="Tắt" />
                </Form.Item>
            </Form>
        </Space>
    </Modal>;
}
