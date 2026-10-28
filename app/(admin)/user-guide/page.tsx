"use client";

import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import { ArrowRightOutlined, BookOutlined, CalendarOutlined, FileTextOutlined, QuestionCircleOutlined, ReadOutlined, SearchOutlined, SettingOutlined, StarOutlined, TeamOutlined, SafetyCertificateOutlined, VideoCameraOutlined, PictureOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, Input, Tag } from 'antd';
import { guideSectionText, normalizeGuideSearch, type GuideArticle } from '@/services/userGuideService';
import { useGuides } from './components/GuideProvider';
import styles from './user-guide.module.css';

const categoryIcons: Record<string, React.ReactNode> = {
    'getting-started': <ReadOutlined />, curriculum: <BookOutlined />, schedule: <CalendarOutlined />,
    quiz: <QuestionCircleOutlined />, rooms: <SettingOutlined />, staff: <TeamOutlined />,
    administration: <SafetyCertificateOutlined />, operations: <VideoCameraOutlined />, banners: <PictureOutlined />,
};

export default function UserGuidePage() {
    const { data, readable, canManage } = useGuides();
    const [query, setQuery] = useState('');
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const search = normalizeGuideSearch(useDeferredValue(query));
    const categories = [...data.categories].sort((a, b) => a.order - b.order);
    const results = useMemo(() => readable.filter(a => {
        const category = data.categories.find(c => c.id === a.categoryId);
        const text = [a.title, a.description, a.audience, ...(a.prerequisites || []), category?.name, ...a.sections.map(guideSectionText)].join(' ');
        return (!categoryId || a.categoryId === categoryId) && normalizeGuideSearch(text).includes(search);
    }).sort((a, b) => a.order - b.order), [readable, data.categories, categoryId, search]);
    const featured = readable.filter(a => a.featured).sort((a, b) => a.order - b.order).slice(0, 3);
    const activeCategory = categories.find(c => c.id === categoryId);
    const articleRow = (article: GuideArticle) => <Link className={styles.articleRow} key={article.id} href={`/user-guide/${article.slug}`}>
        <span className={styles.fileIcon}><FileTextOutlined /></span>
        <span className={styles.rowText}><strong>{article.title}</strong><span>{article.description}</span></span>
        <ArrowRightOutlined className={styles.rowArrow} />
    </Link>;

    return <div className={styles.home}>
        <section className={styles.hero}>
            <div className={styles.heroTop}><span className={styles.eyebrow}><BookOutlined /> TRUNG TÂM HƯỚNG DẪN</span>
                {canManage && <Link href="/user-guide/manage"><Button icon={<SettingOutlined />}>Quản lý tài liệu</Button></Link>}
            </div>
            <h1>Hướng dẫn sử dụng</h1>
            <p>Tìm câu trả lời, làm quen với tính năng và thực hiện công việc hằng ngày trên LMS.</p>
            <Input size="large" prefix={<SearchOutlined />} allowClear value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm tài liệu, ví dụ: lịch học, đề cương…" aria-label="Tìm kiếm tài liệu hướng dẫn" className={styles.search} />
            <div className={styles.heroFoot}><span>{readable.length} bài hướng dẫn dành cho bạn</span><Tag color="blue">LMS STREAM · Hướng dẫn nội bộ</Tag></div>
        </section>

        {!search && !categoryId && featured.length > 0 && <section className={styles.featured} aria-labelledby="featured-guides">
            <div className={styles.sectionHeading}><h2 id="featured-guides"><StarOutlined /> Bắt đầu từ đây</h2><span>Một vài hướng dẫn hữu ích để làm quen</span></div>
            <div className={styles.featuredGrid}>{featured.map(a => <Link key={a.id} href={`/user-guide/${a.slug}`} className={styles.featuredCard}>
                <span className={styles.categoryLabel}>{categories.find(c => c.id === a.categoryId)?.name}</span>
                <h3>{a.title}</h3><p>{a.description}</p><span className={styles.readLink}>Đọc hướng dẫn <ArrowRightOutlined /></span>
            </Link>)}</div>
        </section>}

        <div className={styles.browse}>
            <aside className={styles.sidebar} aria-label="Danh mục hướng dẫn">
                <h2>Danh mục tài liệu</h2>
                <button className={`${styles.categoryButton} ${!categoryId ? styles.selected : ''}`} aria-pressed={!categoryId} onClick={() => setCategoryId(null)}><span><BookOutlined /> Tất cả hướng dẫn</span><span>{readable.length}</span></button>
                {categories.map(c => {
                    const count = readable.filter(a => a.categoryId === c.id).length;
                    if (!count && !canManage) return null;
                    return <button className={`${styles.categoryButton} ${categoryId === c.id ? styles.selected : ''}`} aria-pressed={categoryId === c.id} key={c.id} onClick={() => setCategoryId(c.id)}>
                        <span>{categoryIcons[c.id] || <BookOutlined />} {c.name}</span><span>{count}</span>
                    </button>;
                })}
                <div className={styles.sidebarNote}><QuestionCircleOutlined /><strong>Chưa tìm được nội dung?</strong><p>Thử một từ khóa ngắn hơn hoặc chọn danh mục phù hợp với công việc của bạn.</p></div>
            </aside>
            <section className={styles.results} aria-label="Danh sách bài hướng dẫn" aria-live="polite">
                <div className={styles.sectionHeading}><h2>{search ? 'Kết quả tìm kiếm' : activeCategory?.name || 'Khám phá hướng dẫn'}</h2><span>{results.length} bài viết</span></div>
                {activeCategory && <p className={styles.muted}>{activeCategory.description}</p>}
                {results.length ? categories.filter(c => results.some(a => a.categoryId === c.id)).map(c => <section key={c.id} className={styles.categoryGroup}>
                    {!categoryId && <div className={styles.groupHeading}><h3>{c.name}</h3><p>{c.description}</p></div>}
                    <div>{results.filter(a => a.categoryId === c.id).map(articleRow)}</div>
                </section>) : <div className={styles.empty}><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={search ? `Chưa tìm thấy tài liệu phù hợp với “${query}”.` : 'Danh mục này chưa có bài viết được xuất bản dành cho bạn.'} /><Button onClick={() => { setQuery(''); setCategoryId(null); }}>Xem tất cả hướng dẫn</Button></div>}
            </section>
        </div>
    </div>;
}
