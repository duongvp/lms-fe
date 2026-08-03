export const GRADE_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
    value: index + 1,
    label: `Lớp ${index + 1}`,
}));

export const SUBJECT_OPTIONS = [
    { value: "Toán", label: "Toán", subjectCode: "TOAN" },
    { value: "Ngữ văn", label: "Ngữ văn", subjectCode: "VAN" },
    { value: "Tiếng Anh", label: "Tiếng Anh", subjectCode: "ANH" },
    { value: "Vật lí", label: "Vật lí", subjectCode: "LY" },
    { value: "Hóa học", label: "Hóa học", subjectCode: "HOA" },
    { value: "Sinh học", label: "Sinh học", subjectCode: "SINH" },
    { value: "Lịch sử", label: "Lịch sử", subjectCode: "SU" },
    { value: "Địa lý", label: "Địa lý", subjectCode: "DIA" },
    { value: "GDCD", label: "GDCD", subjectCode: "GDCD" },
    { value: "Tin học", label: "Tin học", subjectCode: "TIN" },
    { value: "Công nghệ", label: "Công nghệ", subjectCode: "CONGNGHE" },
];
