export interface ScheduleImportError {
    row: number;
    field: string;
    errorCode?: string;
    message: string;
    packageId?: string;
    courseId?: string;
    lessonId?: string;
    duplicateWithRow?: number;
    reasonCode?: string;
    suggestion?: string;
    currentValue?: string;
    importedValue?: string;
    calendar?: {
        key?: string;
        code?: string;
        learnNumber?: number;
        lessonCount?: number;
        lessonName?: string;
        startTime?: string;
    };
}

const fieldLabels: Record<string, string> = {
    key: "Mã định danh lịch", code: "Mã chương trình", subject: "Môn",
    learn_number: "Bài", lesson_count: "Lần học", system_type: "Hệ thống",
    teacher: "Tên GV", teacher_name: "Tên GV", teacher_email: "Tên GV",
    assistant_teacher: "Trợ giảng", assistant_name: "Trợ giảng", assistant_email: "Trợ giảng",
    start_time: "Ngày live / Khung giờ", end_time: "Khung giờ",
    live_date: "Ngày live", time_range: "Khung giờ", lesson_status: "Trạng thái buổi học",
    lesson_name: "Tên bài giảng", lesson_document: "Tài liệu live", lesson_baitap: "Nhiệm vụ học tập",
    package_ids: "ID gói học", course_ids: "ID khóa học", lesson_ids: "ID bài giảng",
    "id package": "ID gói học", "id course": "ID khóa học", "id bài giảng": "ID bài giảng",
    file: "File / Google Sheet", row: "Dữ liệu", calendar: "Lịch học", hmo: "Dữ liệu HMO",
};

export const importFieldLabel = (field: string) => {
    const value = String(field || "");
    return fieldLabels[value] || fieldLabels[value.toLowerCase()] || value || "Dữ liệu";
};

const suggestions: Record<string, string> = {
    INVALID_PACKAGE_ID: "Lấy đúng ID gói học trong quản lý nội dung. Chỉ nhập số; nhiều ID cách nhau bằng dấu phẩy.",
    INVALID_COURSE_ID: "Lấy đúng ID khóa học của bài trong quản lý nội dung. Chỉ nhập số; nhiều ID cách nhau bằng dấu phẩy.",
    INVALID_LESSON_ID: "Lấy đúng ID bài giảng trong khóa học HMO; không dùng ID nhóm nội dung (section).",
    PACKAGE_NOT_FOUND: "Kiểm tra ID gói học trên HMO và liên kết gói học–khóa học trong quản lý nội dung.",
    COURSE_NOT_FOUND: "Kiểm tra ID khóa học trên HMO; khóa học phải thuộc đúng gói học đã nhập.",
    LESSON_NOT_FOUND: "Kiểm tra ID bài giảng trên HMO và dùng bài giảng thuộc đúng khóa học, gói học của dòng này.",
    LESSON_NOT_IN_PACKAGE_COURSE: "Dùng ID bài giảng thuộc đúng cặp khóa học–gói học của bài trong quản lý nội dung.",
    DUPLICATE_SCHEDULE_IN_DATABASE: "Lịch này đã có trên hệ thống. Bỏ dòng trùng hoặc export lịch gốc rồi chọn Cập nhật lịch.",
    HMO_TIMEOUT: "HMO phản hồi quá chậm. Đợi một lúc rồi import lại; dữ liệu chưa được lưu.",
    HMO_BATCH_ERROR: "Chưa kiểm tra được dữ liệu trên HMO. Thử lại sau; nếu lỗi vẫn xảy ra, gửi thông báo này cho quản trị viên.",
    HMO_INVALID_RESPONSE: "HMO trả dữ liệu chưa đầy đủ hoặc không hợp lệ. Thử lại sau; không cần sửa ID nếu đã kiểm tra đúng.",
};

const fallbackSuggestion = (error: ScheduleImportError, field: string) => {
    if (error.reasonCode === "PAST_SCHEDULE" || /đã diễn ra|đã bắt đầu/.test(error.message)) {
        return "Giữ nguyên thông tin lịch đã qua hoặc bỏ dòng này khỏi file cập nhật. Chọn Tạo lịch mới nếu cần thêm buổi học khác.";
    }
    if (error.reasonCode === "CALENDAR_NOT_FOUND" || /Không tìm thấy lịch có key/.test(error.message)) {
        return "Kiểm tra chương trình đang chọn và dùng file export mới nhất; không tự sửa Mã định danh lịch.";
    }
    if (error.reasonCode === "IMMUTABLE_FIELD" || /Không được (đổi|thay đổi)|Giữ nguyên/.test(error.message)) {
        return `Khôi phục cột ${field} theo file export gốc rồi import lại.`;
    }
    if (error.errorCode === "DUPLICATE_SCHEDULE_IN_FILE") {
        return error.duplicateWithRow
            ? `Đối chiếu với dòng ${error.duplicateWithRow} và chỉ giữ một dòng cho cùng lịch học.`
            : "Kiểm tra các dòng bị lặp và chỉ giữ một dòng cho cùng lịch học.";
    }
    if (field === "Tên GV" || field === "Trợ giảng") {
        return /trùng nhiều/.test(error.message)
            ? `Nhập tài khoản vào cột ${field} để phân biệt những người trùng tên.`
            : `Dùng tên hoặc tài khoản ${field === "Tên GV" ? "giáo viên" : "trợ giảng"} đang hoạt động, đúng vai trò trong mục Giáo viên & Trợ giảng.`;
    }
    if (field === "Bài") return "Điền số bài đã có trong chương trình đang chọn; giữ nguyên Bài khi cập nhật lịch.";
    if (/không khớp mapping|chưa có mapping/.test(error.message)) return "Đối chiếu đúng bài trong quản lý nội dung và lấy ID khóa học, gói học đã liên kết với bài đó.";
    if (error.errorCode && suggestions[error.errorCode]) return suggestions[error.errorCode];
    if (/Google|quyền xem|công khai/.test(error.message)) return "Bật quyền xem bằng link, kiểm tra đúng tab Google Sheet và dùng cấu trúc của file mẫu.";
    return "Sửa dữ liệu được nêu trong thông báo rồi import lại. Nếu vẫn lỗi, gửi thông báo này cho quản trị viên.";
};

export const formatImportCalendarTime = (value: string) => {
    // Calendar timestamps contain Vietnam wall-clock values: do not add UTC+7.
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    return match ? `${match[4]}:${match[5]} ngày ${match[3]}/${match[2]}/${match[1]}` : value;
};

export const presentScheduleImportError = (error: ScheduleImportError) => {
    const field = error.reasonCode === "PAST_SCHEDULE" ? "Lịch đã bắt đầu" : importFieldLabel(error.field);
    const context = [
        error.calendar?.code ? `Chương trình: ${error.calendar.code}` : "",
        error.calendar?.learnNumber != null ? `Bài ${error.calendar.learnNumber}` : "",
        error.calendar?.lessonCount != null ? `Lần học ${error.calendar.lessonCount}` : "",
        error.calendar?.lessonName || "",
    ].filter(Boolean).join(" · ");
    const ids = [
        error.packageId ? `Gói học: ${error.packageId}` : "",
        error.courseId ? `Khóa học: ${error.courseId}` : "",
        error.lessonId ? `Bài giảng: ${error.lessonId}` : "",
    ].filter(Boolean).join(" · ");
    return {
        rowLabel: error.row > 1 ? String(error.row) : "Toàn bộ",
        field,
        message: error.message || "Dữ liệu không hợp lệ.",
        suggestion: error.suggestion || fallbackSuggestion(error, field),
        context,
        ids,
        originalTime: error.calendar?.startTime ? formatImportCalendarTime(error.calendar.startTime) : "",
    };
};
