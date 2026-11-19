// Read error bodies as text first: reverse proxies may return HTML instead of
// the API's JSON envelope. Never display that HTML as an application error.
export const readJsonResponse = async (response: Response) => {
    const contentType = response.headers.get('content-type') || 'không có';
    const requestId = response.headers.get('x-request-id') || response.headers.get('x-correlation-id');
    const diagnostic = [
        `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`,
        response.url ? `URL: ${response.url}` : '',
        `Content-Type: ${contentType}`,
        requestId ? `Request ID: ${requestId}` : '',
    ].filter(Boolean).join('\n');
    const body = await response.text();
    let data: any;
    try {
        data = JSON.parse(body);
    } catch {
        const description = response.status === 504
            ? 'Máy chủ hết thời gian chờ phản hồi (HTTP 504). Kết quả thao tác chưa được xác nhận.'
            : response.status === 502 || response.status === 503
                ? `Dịch vụ tạm thời không khả dụng (HTTP ${response.status}). Vui lòng thử lại sau.`
                : `Máy chủ trả về dữ liệu không hợp lệ (HTTP ${response.status}), không phải JSON.`;
        throw Object.assign(new Error(description), {
            status: response.status,
            diagnostic,
            detail: { status: response.status, contentType, requestId },
        });
    }
    if (!response.ok) {
        const message = typeof data?.message === 'string' && data.message.trim()
            ? data.message
            : `Yêu cầu thất bại (HTTP ${response.status}). Vui lòng thử lại.`;
        throw Object.assign(new Error(message), { status: response.status, detail: data, diagnostic });
    }
    return data;
};
