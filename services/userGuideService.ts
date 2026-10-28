export type GuideStatus = 'draft' | 'published' | 'hidden';

export interface GuideRichNode {
    type: string;
    text?: string;
    attrs?: Record<string, unknown>;
    marks?: { type: string; attrs?: Record<string, unknown> }[];
    content?: GuideRichNode[];
}

export const isSafeGuideLink = (value: string) => {
    if (/^\/user-guide\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return true;
    try { return ['https:', 'http:', 'mailto:'].includes(new URL(value).protocol); } catch { return false; }
};

export interface GuideCategory {
    id: string;
    name: string;
    description: string;
    order: number;
}

export interface GuideSection {
    id: string;
    title: string;
    text: string;
    richText?: GuideRichNode;
    steps: string[];
    imageUrl?: string;
    imageCaption?: string;
    table?: { columns: string[]; rows: string[][] };
    notice?: string;
    blocks?: GuideBlock[];
}

export type GuideBlock = { id: string } & (
    | { type: 'text'; text: string; richText?: GuideRichNode }
    | { type: 'steps'; steps: string[] }
    | { type: 'table'; table: { columns: string[]; rows: string[][] } }
    | { type: 'notice'; notice: string }
    | { type: 'image'; imageUrl: string; imageCaption?: string }
);

// Adapt existing library articles without rewriting their content or source data.
export function getGuideBlocks(section: GuideSection): GuideBlock[] {
    if (section.blocks !== undefined) return section.blocks;
    const blocks: GuideBlock[] = [];
    if (section.text || section.richText) blocks.push({ id: `${section.id}-text`, type: 'text', text: section.text, richText: section.richText });
    if (section.steps.length) blocks.push({ id: `${section.id}-steps`, type: 'steps', steps: section.steps });
    if (section.table) blocks.push({ id: `${section.id}-table`, type: 'table', table: section.table });
    if (section.notice !== undefined) blocks.push({ id: `${section.id}-notice`, type: 'notice', notice: section.notice });
    if (section.imageUrl !== undefined) blocks.push({ id: `${section.id}-image`, type: 'image', imageUrl: section.imageUrl, imageCaption: section.imageCaption });
    return blocks;
}

export function guideRichHasImage(node?: GuideRichNode): boolean {
    return !!node && ((node.type === 'image' && typeof node.attrs?.src === 'string' && isSafeGuideImage(node.attrs.src)) || !!node.content?.some(guideRichHasImage));
}

export function guideSectionText(section: GuideSection): string {
    return [section.title, ...getGuideBlocks(section).map(block => {
        switch (block.type) {
            case 'text': return block.text;
            case 'steps': return block.steps.join(' ');
            case 'table': return [...block.table.columns, ...block.table.rows.flat()].join(' ');
            case 'notice': return block.notice;
            case 'image': return block.imageCaption || '';
        }
    })].join(' ');
}

export interface GuideArticle {
    id: string;
    slug: string;
    categoryId: string;
    title: string;
    description: string;
    order: number;
    status: GuideStatus;
    featured: boolean;
    updatedAt: string;
    requiredPermission?: string;
    audience?: string;
    prerequisites?: string[];
    sections: GuideSection[];
}

export interface GuideData {
    categories: GuideCategory[];
    articles: GuideArticle[];
}

// Curated content adapted from Huong_dan_su_dung.docx and checked against the LMS.
// Editing remains session-only until authenticated persistence APIs are available.
export const userGuideService = {
    source: 'builtin' as const,
    async load(): Promise<GuideData> {
        const { userGuideContent } = await import('@/constants/userGuideContent');
        return structuredClone(userGuideContent);
    },
};

export const normalizeGuideSearch = (value: string) => value
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLocaleLowerCase('vi').trim();

export const isSafeGuideImage = (value?: string) => {
    if (!value) return false;
    try { return new URL(value).protocol === 'https:'; } catch { return false; }
};

export const guideDate = (value: string) => new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh',
}).format(new Date(value));
