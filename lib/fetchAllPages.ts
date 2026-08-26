type FetchAllPagesOptions<T> = {
    total: number;
    pageSize: number;
    fetchPage: (page: number, pageSize: number) => Promise<T[]>;
    concurrency?: number;
};

/**
 * Tải toàn bộ các trang của một danh sách phân trang mà không tạo quá nhiều
 * request đồng thời. Dùng cho các thao tác cần biết toàn bộ bản ghi như
 * checkbox "chọn tất cả" của bảng phân trang phía server.
 */
export const fetchAllPages = async <T>({
    total,
    pageSize,
    fetchPage,
    concurrency = 4,
}: FetchAllPagesOptions<T>): Promise<T[]> => {
    const pageCount = Math.ceil(Math.max(0, total) / pageSize);
    if (!pageCount) return [];

    const pages = Array.from({ length: pageCount }, () => [] as T[]);
    let nextPage = 1;

    const worker = async () => {
        while (nextPage <= pageCount) {
            const page = nextPage++;
            pages[page - 1] = await fetchPage(page, pageSize);
        }
    };

    await Promise.all(
        Array.from(
            { length: Math.min(Math.max(1, concurrency), pageCount) },
            () => worker()
        )
    );

    return pages.flat();
};
