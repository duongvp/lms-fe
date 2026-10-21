import type { DetailEvent, DetailOverview, DetailStudent, StudentReport } from '@/services/calendarDetailReportService';

// Presentation only. Unknown lifecycle events never become fabricated join/leave events.
export const attendanceLabels = { attended: 'Đủ chuyên cần', observed: 'Chưa đủ chuyên cần', unobserved: 'Chưa ghi nhận tham gia' };
export function attendancePresentation(value: DetailStudent['attendance'] | undefined) {
  if (value === 'attended') return { label: attendanceLabels.attended, color: 'success' as const, description: 'Các ghi nhận tham gia đáp ứng quy định chuyên cần của buổi học.' };
  if (value === 'observed') return { label: attendanceLabels.observed, color: 'warning' as const, description: 'Đã ghi nhận hoạt động tham gia, nhưng chưa đáp ứng quy định chuyên cần.' };
  if (value === 'unobserved') return { label: attendanceLabels.unobserved, color: 'info' as const, description: 'Chưa tìm thấy ghi nhận tham gia trong phạm vi buổi học. Chưa thể khẳng định học sinh vắng mặt.' };
  return { label: 'Chưa đủ dữ liệu để đánh giá', color: 'info' as const, description: 'Chưa thể xác định tình trạng chuyên cần từ dữ liệu hiện có.' };
}
export const eventLabels: Record<string, string> = { presence: 'Ghi nhận hoạt động tham gia', chat: 'Gửi tin nhắn', chat_hidden: 'Ẩn tin nhắn', chat_restored: 'Khôi phục tin nhắn', quiz_submission: 'Nộp bài luyện tập' };
export const roleLabel = (value: unknown) => ({ student: 'Học sinh', teacher: 'Giáo viên', assistant: 'Trợ giảng', assistant_teacher: 'Trợ giảng', system: 'Hệ thống' })[String(value).toLowerCase()] || 'Chưa xác định vai trò';
export const chatTypeLabel = (value: unknown) => ({ 1: 'Tin nhắn thường', 2: 'Trả lời tin nhắn', 3: 'Thông báo chung', 4: 'Bài luyện tập' })[Number(value)] || 'Loại tin nhắn chưa xác định';
export const chatStatusLabel = (value: unknown) => ({ sent: 'Đã gửi', active: 'Đã ghi nhận', deleted: 'Đã xóa', hidden: 'Đã ẩn' })[String(value).toLowerCase()] || 'Chưa xác định trạng thái tin nhắn';
export function reportRoomLabel(raw: string | null, calendar?: DetailOverview['calendar']) {
  if (!raw || !calendar) return 'Chưa xác định';
  const date = new Date(calendar.start_time);
  const serial = Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - Date.UTC(1899, 11, 30)) / 86400000);
  const prefix = `${calendar.code}${serial}${calendar.learn_number}`;
  if (!raw.startsWith(prefix)) return 'Chưa xác định';
  const suffix = raw.slice(prefix.length);
  return /^[1-9]\d*$/.test(suffix) && Number.isSafeInteger(Number(suffix)) ? `Phòng ${suffix}` : 'Chưa xác định';
}
export function eventDescription(event: DetailEvent) {
  if (event.source === 'presence') return 'Hệ thống ghi nhận hoạt động tham gia tại thời điểm này; chưa đủ căn cứ xác định đây là lần vào hoặc rời lớp.';
  if (event.source === 'chat') return event.content ?? 'Không còn nội dung tin nhắn được lưu để hiển thị.';
  if (event.source === 'quiz_submission') return `Đã ghi nhận bài nộp${event.metadata.score != null ? ` · Điểm: ${event.metadata.score}` : ''}${event.metadata.answer_seconds != null ? ` · Thời gian làm bài: ${event.metadata.answer_seconds} giây` : ''}.`;
  if (event.source === 'chat_hidden' || event.source === 'chat_restored') return event.content || 'Chưa lưu lý do cho thao tác này.';
  return event.content || 'Có hoạt động được ghi nhận; chưa đủ thông tin để mô tả chi tiết.';
}
export function studentAccuracyNotes(report: StudentReport) {
  const s = report.student, notes: string[] = [];
  if (s.duration_minutes == null || s.last_leave == null) notes.push('Chưa đủ thông tin về thời điểm kết thúc tham gia để xác định chính xác tổng thời gian học.');
  notes.push('Số lần vào lớp và kết nối lại chưa xác định. Các mốc hoạt động không thay thế thời điểm vào hoặc rời lớp.');
  if (s.attendance === 'unobserved') notes.push('Chưa có ghi nhận tham gia không đồng nghĩa học sinh chắc chắn vắng mặt.');
  notes.push('Phòng được phân bổ không chứng minh học sinh đã tham gia phòng đó. Danh sách học sinh phản ánh thông tin đang được lưu.');
  if (report.capabilities.chat) notes.push(s.chat_count == null ? 'Chưa xác định chắc chắn người gửi nên chưa thể tính số tin nhắn của học sinh này.' : 'Số tin nhắn chỉ gồm tin nhắn thường và trả lời có thể xác định người gửi; không gồm thông báo chung hoặc bài luyện tập.');
  if (report.capabilities.moderation) {
    notes.push('Thông tin hạn chế chat đang được lưu chưa phản ánh đầy đủ các lần thay đổi và chưa đủ để kết luận tình trạng chat tại buổi học này.');
    if (report.data_quality.hidden_rules_available === false) notes.push('Chưa có đủ dữ liệu về các thao tác ẩn và khôi phục tin nhắn.');
  }
  if (report.data_quality.overlapping_calendar_ids.length) notes.push('Có lịch cùng chương trình và buổi học trùng giờ; một số hoạt động chưa thể phân biệt chính xác giữa các lịch.');
  return notes;
}

export const canViewReportDiagnostics = (user?: { permissions?: string[]; roles?: Array<string | { code?: string }> }) => Boolean(user?.permissions?.includes('*') || user?.roles?.some(role => role === 'admin' || typeof role === 'object' && role?.code === 'admin'));

export function reportErrorMessage(error: unknown, fallback: string) {
  const e = error as { status?: number; name?: string } | null;
  if (e?.status === 404) return 'Không tìm thấy dữ liệu trong phạm vi buổi học đang chọn.';
  if (e?.status === 422) return 'Chưa thể xử lý phạm vi dữ liệu này. Vui lòng thu hẹp bộ lọc hoặc liên hệ quản trị viên.';
  if (e?.status === 503) return 'Hệ thống đang bận. Vui lòng thử lại sau ít giây.';
  if (e?.status === 403) return 'Bạn chưa được cấp quyền thực hiện thao tác này.';
  return fallback;
}
