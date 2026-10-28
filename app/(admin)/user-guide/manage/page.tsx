"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Breadcrumb, Button, Form, Input, InputNumber, Modal, Popconfirm, Result, Select, Space, Table, Tabs, Tag, message } from 'antd';
import type { GuideArticle, GuideCategory, GuideStatus } from '@/services/userGuideService';
import { guideDate, normalizeGuideSearch } from '@/services/userGuideService';
import { useGuides } from '../components/GuideProvider';
import GuideArticleEditor from '../components/GuideArticleEditor';
import styles from '../user-guide.module.css';

const statusLabels: Record<GuideStatus, string> = { draft: 'Bản nháp', published: 'Đã xuất bản', hidden: 'Đã ẩn' };
const statusColors: Record<GuideStatus, string> = { draft: 'default', published: 'green', hidden: 'orange' };
const newId = () => crypto.randomUUID();

export default function GuideManagementPage() {
    const { data, update, canManage } = useGuides();
    const [query, setQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>();
    const [statusFilter, setStatusFilter] = useState<GuideStatus>();
    const [articleOpen, setArticleOpen] = useState(false);
    const [editingArticle, setEditingArticle] = useState<GuideArticle | null>(null);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<GuideCategory | null>(null);
    const [dirty, setDirty] = useState(false);
    const [categoryForm] = Form.useForm<GuideCategory>();
    const [notice, contextHolder] = message.useMessage();
    const [modal, modalContext] = Modal.useModal();
    const categories = [...data.categories].sort((a, b) => a.order - b.order);
    const articles = useMemo(() => data.articles.filter(a => (
        (!categoryFilter || a.categoryId === categoryFilter)
        && (!statusFilter || a.status === statusFilter)
        && normalizeGuideSearch(`${a.title} ${a.description}`).includes(normalizeGuideSearch(query))
    )).sort((a, b) => a.order - b.order), [data.articles, query, categoryFilter, statusFilter]);

    if (!canManage) return <Result status="403" title="Bạn chưa có quyền quản lý tài liệu" subTitle="Khu vực quản lý hiện dành cho tài khoản quản trị hệ thống." extra={<Link href="/user-guide"><Button>Về trang hướng dẫn</Button></Link>} />;

    const closeEditor = (close: () => void) => {
        if (!dirty) { close(); return; }
        modal.confirm({ title: 'Bỏ thay đổi chưa lưu?', content: 'Các nội dung vừa chỉnh sửa trong cửa sổ này sẽ không được giữ lại.', okText: 'Bỏ thay đổi', cancelText: 'Tiếp tục chỉnh sửa', onOk: () => { setDirty(false); close(); } });
    };
    const openArticle = (article?: GuideArticle) => {
        setEditingArticle(article || null);
        setArticleOpen(true);
    };
    const openCategory = (category?: GuideCategory) => {
        setEditingCategory(category || null);
        categoryForm.resetFields();
        categoryForm.setFieldsValue(category || { name: '', description: '', order: categories.length + 1 });
        setDirty(false); setCategoryOpen(true);
    };
    const saveCategory = async () => {
        try {
            const values = await categoryForm.validateFields();
            if (data.categories.some(c => c.id !== editingCategory?.id && normalizeGuideSearch(c.name) === normalizeGuideSearch(values.name))) {
                categoryForm.setFields([{ name: 'name', errors: ['Tên danh mục đã tồn tại.'] }]); return;
            }
            const category = { ...values, id: editingCategory?.id || newId(), name: values.name.trim(), description: values.description.trim() };
            update({ ...data, categories: editingCategory ? data.categories.map(c => c.id === category.id ? category : c) : [...data.categories, category] });
            setCategoryOpen(false); setDirty(false); notice.success('Đã lưu danh mục trong bản xem thử.');
        } catch { /* Form displays validation errors. */ }
    };

    return <>
        {contextHolder}{modalContext}
        <Breadcrumb items={[{ title: <Link href="/user-guide">Hướng dẫn sử dụng</Link> }, { title: 'Quản lý tài liệu' }]} />
        <div className={styles.managementHeading}><div><h1>Quản lý tài liệu</h1><p className={styles.muted}>Tổ chức nội dung để người dùng tìm và đọc hướng dẫn dễ dàng hơn.</p></div><Link href="/user-guide"><Button icon={<ArrowLeftOutlined />}>Trang hướng dẫn</Button></Link></div>
        <Alert type="warning" showIcon className={styles.demoNote} message="Thay đổi quản lý hiện chỉ được lưu tạm" description="Bạn đang chỉnh bản làm việc trong khu vực Hướng dẫn. Tải lại trang hoặc rời khu vực này sẽ khôi phục thư viện đã biên soạn. Các chỉnh sửa chưa được lưu lâu dài." />
        <Tabs items={[
            { key: 'articles', label: `Bài viết (${data.articles.length})`, children: <>
                <div className={styles.managementToolbar}>
                    <Input.Search aria-label="Tìm bài viết trong quản lý" placeholder="Tìm bài viết…" value={query} onChange={e => setQuery(e.target.value)} allowClear />
                    <Select aria-label="Lọc danh mục bài viết" placeholder="Tất cả danh mục" allowClear value={categoryFilter} onChange={setCategoryFilter} options={categories.map(c => ({ value: c.id, label: c.name }))} />
                    <Select aria-label="Lọc trạng thái bài viết" placeholder="Tất cả trạng thái" allowClear value={statusFilter} onChange={setStatusFilter} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} />
                    <Button type="primary" icon={<PlusOutlined />} disabled={!categories.length} onClick={() => openArticle()}>Tạo bài viết</Button>
                </div>
                {!categories.length && <Alert type="info" message="Tạo danh mục trước khi thêm bài viết." />}
                <Table<GuideArticle> rowKey="id" dataSource={articles} scroll={{ x: 920 }} pagination={{ pageSize: 10, hideOnSinglePage: true }} locale={{ emptyText: 'Chưa có bài viết phù hợp.' }} columns={[
                    { title: 'Bài viết', dataIndex: 'title', width: 300, render: (title, a) => <div><strong>{title}</strong><div className={styles.muted}>{categories.find(c => c.id === a.categoryId)?.name}</div></div> },
                    { title: 'Trạng thái', dataIndex: 'status', width: 140, render: (status: GuideStatus) => <Tag color={statusColors[status]}>{statusLabels[status]}</Tag> },
                    { title: 'Thứ tự', dataIndex: 'order', width: 80 },
                    { title: 'Cập nhật', dataIndex: 'updatedAt', width: 110, render: guideDate },
                    { title: 'Thao tác', width: 270, render: (_, a) => <Space wrap size={4}>
                        <Link href={`/user-guide/${a.slug}?preview=1`}><Button size="small" icon={<EyeOutlined />}>Xem trước</Button></Link>
                        <Button size="small" icon={<EditOutlined />} onClick={() => openArticle(a)}>Sửa</Button>
                        {a.status === 'published' && <Button size="small" onClick={() => { update({ ...data, articles: data.articles.map(row => row.id === a.id ? { ...row, status: 'hidden', updatedAt: new Date().toISOString() } : row) }); notice.success('Đã ẩn bài trong bản xem thử.'); }}>Ẩn</Button>}
                        <Popconfirm title="Xóa bài viết khỏi bản làm việc tạm?" okText="Xóa" cancelText="Hủy" onConfirm={() => update({ ...data, articles: data.articles.filter(row => row.id !== a.id) })}><Button size="small" danger aria-label={`Xóa ${a.title}`} icon={<DeleteOutlined />} /></Popconfirm>
                    </Space> },
                ]} />
            </> },
            { key: 'categories', label: `Danh mục (${categories.length})`, children: <>
                <div className={styles.managementToolbar}><p className={styles.muted}>Thứ tự nhỏ hơn được hiển thị trước. Chỉ xóa được danh mục chưa có bài viết.</p><Button type="primary" icon={<PlusOutlined />} onClick={() => openCategory()}>Thêm danh mục</Button></div>
                <Table<GuideCategory> rowKey="id" dataSource={categories} pagination={false} scroll={{ x: 650 }} locale={{ emptyText: 'Chưa có danh mục.' }} columns={[
                    { title: 'Danh mục', dataIndex: 'name', width: 220 }, { title: 'Mô tả', dataIndex: 'description' },
                    { title: 'Thứ tự', dataIndex: 'order', width: 80 },
                    { title: 'Bài viết', width: 85, render: (_, c) => data.articles.filter(a => a.categoryId === c.id).length },
                    { title: 'Thao tác', width: 130, render: (_, c) => <Space><Button aria-label={`Sửa danh mục ${c.name}`} icon={<EditOutlined />} onClick={() => openCategory(c)} /><Popconfirm title="Xóa danh mục này?" okText="Xóa" cancelText="Hủy" disabled={data.articles.some(a => a.categoryId === c.id)} onConfirm={() => update({ ...data, categories: data.categories.filter(row => row.id !== c.id) })}><Button danger aria-label={`Xóa danh mục ${c.name}`} disabled={data.articles.some(a => a.categoryId === c.id)} icon={<DeleteOutlined />} /></Popconfirm></Space> },
                ]} />
            </> },
        ]} />

        {articleOpen && <GuideArticleEditor initialArticle={editingArticle} categories={categories} articles={data.articles}
            onClose={() => setArticleOpen(false)}
            onSave={article => {
                update({ ...data, articles: editingArticle ? data.articles.map(a => a.id === article.id ? article : a) : [...data.articles, article] });
                setArticleOpen(false);
                notice.success(article.status === 'published' ? 'Đã lưu bài trong phiên làm việc.' : 'Đã lưu bản nháp trong phiên làm việc.');
            }} />}
        <Modal title={editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'} open={categoryOpen} onCancel={() => closeEditor(() => setCategoryOpen(false))} onOk={() => void saveCategory()} okText="Lưu danh mục" cancelText="Hủy" maskClosable={false}>
            <Form form={categoryForm} layout="vertical" onValuesChange={() => setDirty(true)}>
                <Form.Item name="name" label="Tên danh mục" rules={[{ required: true, whitespace: true, message: 'Nhập tên danh mục.' }, { max: 100 }]}><Input maxLength={100} /></Form.Item>
                <Form.Item name="description" label="Mô tả ngắn" rules={[{ required: true, whitespace: true, message: 'Nhập mô tả danh mục.' }, { max: 400 }]}><Input.TextArea rows={3} maxLength={400} /></Form.Item>
                <Form.Item name="order" label="Thứ tự hiển thị" rules={[{ required: true, message: 'Nhập thứ tự.' }]}><InputNumber min={1} precision={0} /></Form.Item>
            </Form>
        </Modal>
    </>;
}
