# Task: Refactor Schedule Page Layout & Implement Filter API

## Context
Hiện tại trang `Schedule` đang sử dụng `Drawer` của Ant Design để hiển thị phần bộ lọc.

Tôi muốn thay đổi layout của trang và triển khai đầy đủ chức năng lọc từ Frontend đến Backend.

**Lưu ý:** Không thay đổi business logic hiện có, chỉ mở rộng để hỗ trợ bộ lọc.

---

## 1. Refactor Layout

### Layout
- Sử dụng `Row` của Ant Design.
- Tổng layout là `24`.
- Chia thành:
  - `Col span={6}`: Sidebar chứa bộ lọc.
  - `Col span={18}`: Nội dung chính.
- Không sử dụng `Drawer` nữa trên Desktop.
- Responsive:
  - Desktop: Sidebar luôn hiển thị.
  - Mobile/Tablet: Có thể chuyển Sidebar thành Drawer hoặc Collapse.

---

## 2. Filter Sidebar

Phân tích dữ liệu và nghiệp vụ hiện có của trang Schedule để xây dựng bộ lọc phù hợp.

Ví dụ:
- Course
- Teacher
- Classroom
- Session Status
- Date Range
- Keyword
- Các bộ lọc khác nếu hệ thống đã có dữ liệu.

**Không thêm bộ lọc không có trong nghiệp vụ.**

Các filter phải:
- Có nút Search.
- Có nút Reset.
- Đồng bộ với URL query nếu project đang sử dụng.
- Hiển thị loading khi đang tìm kiếm.

---

## 3. Frontend

Triển khai đầy đủ:
- Form filter.
- Gọi API với các query parameters.
- Debounce nếu có ô tìm kiếm.
- Phân trang vẫn hoạt động.
- Sort vẫn hoạt động.
- Filter và pagination hoạt động cùng nhau.

Không làm ảnh hưởng các chức năng hiện có.

---

## 4. Backend

Triển khai luôn Backend để hỗ trợ bộ lọc.

Yêu cầu:
- Phân tích cấu trúc project hiện tại.
- Mở rộng API hiện có thay vì tạo API mới nếu phù hợp.
- Thêm các query parameters cần thiết.
- Validate dữ liệu đầu vào.
- Chỉ áp dụng điều kiện filter khi người dùng truyền giá trị.
- Kết hợp nhiều điều kiện filter cùng lúc.
- Giữ nguyên phân trang.
- Giữ nguyên sort.
- Tối ưu query để tránh filter dư thừa.

---

## 5. Response

Đảm bảo response API vẫn giữ nguyên format hiện tại để Frontend không bị ảnh hưởng.

---

## 6. Constraints

- Không thay đổi business logic.
- Không thay đổi response hiện tại nếu không cần thiết.
- Không tạo code trùng lặp.
- Tuân theo coding convention của project.
- Tái sử dụng service, repository và component hiện có.
- Chỉ bổ sung những phần cần thiết.

---

## 7. Deliverables

Hoàn thành toàn bộ chức năng gồm:
- Refactor layout.
- Component Filter.
- Frontend gọi API.
- Backend xử lý filter.
- Kiểm tra hoạt động với nhiều điều kiện lọc cùng lúc.
- Đảm bảo filter, sort và pagination hoạt động đồng thời.