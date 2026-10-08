// Quy tắc Tổng ôn từ sheet chương trình Topuni; vact-v được đổi thành vact.
import { getTopuniSubjectCode } from "@/helper/lesson";

const TOPUNI_PATHWAYS_BY_EXAM_SUBJECT: Record<string, Record<string, string[]>> = {
    tc: { toan: ["v"] },
    tsa: { toan: ["v"], dochieu: ["v"], vatli: ["v"], hoahoc: ["v"], sinhhoc: ["v"] },
    hsa: {
        dinhluong: ["v"], dinhtinh: ["v"], tienganh: ["v"], vatli: ["v"],
        hoahoc: ["v"], sinhhoc: ["v"], lichsu: ["v"], diali: ["v"],
    },
    tnthpt: { toan: ["v"], nguvan: ["v"], tienganh: ["v"] },
    hv: { tienganh: ["v"] },
    ht: { vatli: ["v"], hoahoc: ["v"], sinhhoc: ["v"] },
    vact: {
        toan: ["a"], tienganh: ["v", "s"], tiengviet: ["v", "s"],
        slkh: ["v"], lgptsl: ["v"], khoahoc: ["s"],
    },
};

export const getTopuniPathwayOptions = (exam?: string, subjectName?: string) => {
    const examCode = String(exam || "").trim().toLowerCase();
    const subjects = TOPUNI_PATHWAYS_BY_EXAM_SUBJECT[examCode === "vact-v" ? "vact" : examCode];
    if (!subjects) return [];
    const values = subjectName?.trim()
        ? subjects[getTopuniSubjectCode(subjectName)] || ["v", "a", "s"]
        : Array.from(new Set(Object.values(subjects).flat()));
    return values.map((value) => ({ value, label: value.toUpperCase() }));
};

export const TOPUNI_PHASE_OPTIONS = [{ value: "tongon", label: "Tổng ôn" }];
export const TOPUNI_EXAM_OPTIONS = [
    { value: "tsa", label: "TSA" },
    { value: "vact", label: "VACT" },
    { value: "hsa", label: "HSA" },
    { value: "tnthpt", label: "TN THPT" },
    { value: "hv", label: "HV" },
    { value: "ht", label: "HT" },
    { value: "tc", label: "TC" },
];
export const TOPUNI_SUBJECT_OPTIONS = [
    "Toán", "Đọc hiểu", "Vật lí", "Hóa học", "Sinh học", "Tiếng Anh",
    "Tiếng Việt", "SLKH", "LGPTSL", "Khoa học", "Định lượng", "Định tính", "Lịch sử", "Địa lí", "Ngữ văn",
].map((label) => ({ value: label, label }));
