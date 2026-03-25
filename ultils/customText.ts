export const convertStatusToText = (status: boolean): string => {
    if (status) {
        return 'Đang hoạt động';
    } else {
        return 'Ngừng hoạt động';
    }
};

export const formatNumber = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined || value === '') return '';
    const num = Number(value);
    if (isNaN(num)) return '';
    return num.toLocaleString('vi-VN');
};