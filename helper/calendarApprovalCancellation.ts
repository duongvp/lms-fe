export class CalendarApprovalCancelledError extends Error {
 constructor(){super('Đã hủy gửi yêu cầu duyệt.');this.name='CalendarApprovalCancelledError';}
}
export const isCalendarApprovalCancelled=(error:unknown)=>error instanceof Error&&error.name==='CalendarApprovalCancelledError';
