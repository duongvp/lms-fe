// utils/message.ts
import { message } from 'antd';

// Cấu hình mặc định cho tất cả message
message.config({    // Cách top 80px (tuỳ chỉnh)
    duration: 3,       // Mặc định tự đóng sau 2s
    maxCount: 3,       // Tối đa 3 message cùng lúc
});

export const showSuccessMessage = (content: string) => {
    message.success({
        content,
        style: { textAlign: 'right' },
    });
};

export const showErrorMessage = (content: string) => {
    message.error({
        content,
        style: { textAlign: 'right', },
    });
};

export const showWarningMessage = (content: string) => {
    message.warning({
        content,
        style: { textAlign: 'right', },
    });
};


export const showLoadingMessage = (content: string) => {
    message.loading({
        content,
        style: { textAlign: 'right' },
    });
};
