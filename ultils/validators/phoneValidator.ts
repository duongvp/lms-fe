import { RuleObject } from "antd/es/form";

export const phoneNumberValidator = (_: RuleObject, value: string) => {
    if (!value) return Promise.resolve();

    // Chuẩn hóa số điện thoại (bỏ khoảng trắng, dấu +)
    const normalized = value.replace(/\s+/g, '').replace(/^\+/, '');

    // Regex cho số Việt Nam
    const vietnamRegex = /^(0|84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-5]|9[0-9])[0-9]{7}$/;

    // Regex cho số Thái Lan
    const thailandRegex = /^(66|0)([689]\d{7,8}|2\d{7}|[13-9]\d{7})$/;

    if (vietnamRegex.test(normalized) || thailandRegex.test(normalized)) {
        return Promise.resolve();
    }

    return Promise.reject("Số điện thoại không hợp lệ! Định dạng hỗ trợ:\n- Việt Nam: 0xxxxxxxxx\n- Thái Lan: 0xxxxxxxx hoặc 66xxxxxxxx");
};