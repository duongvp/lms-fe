const categoryNames: Record<string, string> = {
  ABUSE_BULLYING: 'Xúc phạm, bắt nạt', OFF_TOPIC: 'Nói chuyện ngoài bài học',
  PII_EXTERNAL: 'Thông tin cá nhân, liên kết bên ngoài', SAFETY_DISTRESSED: 'Học sinh cần hỗ trợ an toàn',
  SAFETY_THREAT: 'Đe dọa an toàn', SPAM_DISRUPTION: 'Spam, làm gián đoạn lớp', VALID: 'Nội dung phù hợp',
};
const levelNames: Record<string, string> = { NONE: 'Không vi phạm', LOW: 'Nhẹ', MEDIUM: 'Trung bình', HIGH: 'Nặng', CRITICAL: 'Khẩn cấp' };
export const contextNames: Record<string, string> = { LECTURE: 'Đang học', LOBBY: 'Chờ bắt đầu', UNKNOWN: 'Chưa xác định' };
export const questionNames: Record<string, string> = { category: 'Nhận diện nhóm nội dung', severity: 'Đánh giá mức độ', threat: 'Nhận diện đe dọa an toàn', distress: 'Nhận diện học sinh cần hỗ trợ' };
export const categoryName = (code: string, label?: string) => label && label !== code ? label : categoryNames[code] ?? label ?? code;
export const levelName = (code: string, label?: string) => label && label !== code ? label : levelNames[code] ?? label ?? code;
export const templateKindName = (kind: string) => ({ SAFETY: 'Hỗ trợ an toàn', NUDGE: 'Nhắc nhở', ALERT: 'Cảnh báo' }[kind] ?? kind);
export function incidentLabel(min: number, max: number | null) {
  if (min === 0 && max === null) return 'Mọi lần';
  if (max === min) return `Lần thứ ${min + 1}`;
  if (max === null) return `Từ lần thứ ${min + 1}`;
  return `Lần thứ ${min + 1}–${max + 1}`;
}
