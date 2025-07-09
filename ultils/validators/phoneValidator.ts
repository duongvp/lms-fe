import { RuleObject } from "antd/es/form";

export const vietnamPhoneValidator = (_: RuleObject, value: string) => {
    if (!value) return Promise.resolve();

    const normalized = value.startsWith("0") ? value : "0" + value;

    const vietnamPhoneRegex = /^0(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-5]|9[0-9])[0-9]{7}$/;

    return vietnamPhoneRegex.test(normalized)
        ? Promise.resolve()
        : Promise.reject("Số điện thoại không hợp lệ!");
};
