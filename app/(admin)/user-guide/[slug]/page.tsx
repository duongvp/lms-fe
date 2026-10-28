"use client";

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeftOutlined, ArrowRightOutlined, FileTextOutlined } from '@ant-design/icons';
import { Alert, Breadcrumb, Button, Result } from 'antd';
import GuideArticleContent from '../components/GuideArticleContent';
import { useGuides } from '../components/GuideProvider';
import styles from '../user-guide.module.css';

export default function GuideArticlePage() {
    const { slug } = useParams<{ slug: string }>();
    const searchParams = useSearchParams();
    const { data, readable, canManage } = useGuides();
    const isPreview = searchParams.get('preview') === '1' && canManage;
    const article = (isPreview ? data.articles : readable).find(a => a.slug === slug);
    if (!article) return <Result status="404" title="Chưa tìm thấy tài liệu" subTitle="Bài viết có thể chưa xuất bản, đã được ẩn hoặc không thuộc quyền truy cập của bạn." extra={<Link href="/user-guide"><Button type="primary">Về trang hướng dẫn</Button></Link>} />;
    const category = data.categories.find(c => c.id === article.categoryId);
    const related = readable.filter(a => a.id !== article.id && a.categoryId === article.categoryId).sort((a, b) => a.order - b.order).slice(0, 3);

    return <>
        <Breadcrumb className={styles.breadcrumb} items={[
            { title: <Link href="/user-guide">Hướng dẫn sử dụng</Link> },
            { title: category?.name || 'Tài liệu' },
            { title: article.title },   
        ]} />
        {isPreview && <Alert type="warning" showIcon className={styles.demoNote} message="Xem trước bài hướng dẫn" description="Bản nháp và bài ẩn chỉ hiển thị ở chế độ xem trước dành cho quản trị viên. Thay đổi quản lý hiện chỉ giữ tạm trong phiên xem thử." action={<Link href="/user-guide/manage"><Button>Về quản lý</Button></Link>} />}
        <div className={styles.readingLayout}>
            <article className={styles.article}>
                <GuideArticleContent article={article} categoryName={category?.name} />
                <footer className={styles.articleFooter}>
                    <Link href="/user-guide"><Button icon={<ArrowLeftOutlined />}>Về tất cả hướng dẫn</Button></Link></footer>
                {related.length > 0 && <section className={styles.related} aria-labelledby="related-guides-title">
                    <h2 id="related-guides-title">Bài viết cùng danh mục</h2>
                    <div className={styles.relatedList}>{related.map(a => <Link key={a.id} href={`/user-guide/${a.slug}`} className={styles.relatedCard}>
                        <span className={styles.fileIcon}><FileTextOutlined /></span>
                        <span className={styles.relatedText}><strong>{a.title}</strong><span>{a.description}</span></span>
                        <ArrowRightOutlined className={styles.rowArrow} />
                    </Link>)}</div>
                </section>}
            </article>
            <aside className={styles.toc} aria-label="Mục lục bài viết">
                <span className={styles.eyebrow}>TRONG BÀI VIẾT NÀY</span>
                {article.sections.map((s, index) => <a key={s.id} href={`#section-${s.id}`} title={s.title}><span className={styles.tocNumber}>{index + 1}.</span><span className={styles.tocLabel}>{s.title}</span></a>)}
                <div className={styles.sidebarNote}><FileTextOutlined /><p>Nội dung được chia theo từng bước để bạn dễ tra cứu khi làm việc.</p></div>
            </aside>
        </div>
    </>;
}
