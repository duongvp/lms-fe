# Schedule Preview Feature

## Mục tiêu

Khi người dùng thao tác với lịch học (thêm mới, sửa lịch, dời lịch), trước khi lưu sẽ hiển thị một **Preview Modal** để người dùng xem trước toàn bộ các buổi học sẽ được tạo hoặc thay đổi.

---

# 1. Thêm mới lịch học

Có 2 chế độ:

- Thêm 1 buổi
- Thêm nhiều buổi tự động

## 1.1 Thêm 1 buổi

Sau khi người dùng nhập đầy đủ thông tin và nhấn **Tiếp tục**, hiển thị modal preview gồm:

- Ngày học
- Thời gian
- Giáo viên
- Phòng học
- Khóa học
- Trạng thái

Người dùng có thể:

- Xác nhận lưu
- Quay lại chỉnh sửa

---

## 1.2 Thêm nhiều buổi tự động

### Thay đổi form

Không sử dụng **Ngày kết thúc**.

Thay vào đó sử dụng:

- Ngày bắt đầu
- Số buổi học
- Các ngày trong tuần

Ví dụ:

Ngày bắt đầu:

22/07/2026

Số buổi:

5

Ngày trong tuần:

- Thứ 3
- Thứ 5
- Thứ 6

---

## Luật sinh lịch

Hệ thống sẽ sinh lần lượt các buổi học cho đến khi đủ số buổi.

Nếu một ngày thuộc danh sách ngày nghỉ thì bỏ qua và tìm ngày hợp lệ tiếp theo.

Ví dụ:

Ngày nghỉ:

29/07/2026

Kết quả sẽ là:

| STT | Ngày |
|-----|------|
|1|22/07/2026 (Thứ 5)|
|2|23/07/2026 (Thứ 6)|
|3|28/07/2026 (Thứ 3)|
|4|30/07/2026 (Thứ 6)|
|5|04/08/2026 (Thứ 3)|

Do:

29/07 là ngày nghỉ nên bị bỏ qua.

---

## Preview Modal

Sau khi hệ thống sinh lịch sẽ hiển thị modal.

Modal gồm:

- Danh sách tất cả buổi học sẽ được tạo.
- STT
- Ngày
- Thứ
- Giờ học
- Giáo viên
- Phòng học
- Trạng thái

Ngoài ra cho phép người dùng tùy chỉnh từng buổi.

Ví dụ:

☑ 22/07/2026

☑ 23/07/2026

☑ 28/07/2026

☑ ~~29/07/2026~~

☑ 30/07/2026

☑ 04/08/2026

Nếu một ngày nghỉ, UI sẽ hiển thị:

- Badge "Ngày nghỉ"
- Nút "Bỏ qua"
- hoặc checkbox để loại bỏ buổi đó.

Người dùng có thể:

- bỏ qua buổi
- giữ lại
- hoặc chỉnh sửa từng buổi trước khi lưu.

Chỉ khi người dùng nhấn **Xác nhận** thì mới gọi API tạo lịch.

---

# 2. Sửa lịch

Khi sửa thông tin của một hoặc nhiều buổi học, trước khi lưu cũng hiển thị Preview Modal.

Modal sẽ hiển thị:

- Dữ liệu cũ
- Dữ liệu mới
- Highlight những trường thay đổi

Ví dụ:

Ngày:

22/07
↓

23/07

Giờ:

18:00
↓

19:00

Giáo viên:

A
↓

B

Sau khi người dùng xác nhận mới gọi API.

---

# 3. Dời lịch

Tương tự phần sửa lịch.

Sau khi người dùng chọn ngày mới sẽ hiển thị Preview Modal.

Nếu có nhiều buổi bị ảnh hưởng thì hiển thị toàn bộ danh sách.

Ví dụ:

| Cũ | Mới |
|-----|------|
|22/07|23/07|
|29/07|30/07|

Người dùng xác nhận thì mới thực hiện lưu.

---

# UI Requirements

- Preview Modal chỉ hiển thị trước khi gọi API.
- Có thể cuộn nếu số lượng buổi lớn.
- Những ngày nghỉ hiển thị màu khác.
- Những buổi bị bỏ qua hiển thị trạng thái "Skipped".
- Highlight các thay đổi.
- Có nút:
  - Quay lại chỉnh sửa
  - Xác nhận lưu

---

# Business Rules

- Không sử dụng ngày kết thúc khi tạo lịch tự động.
- Chỉ nhập số buổi cần học.
- Sinh lịch dựa trên:
  - Ngày bắt đầu
  - Danh sách thứ trong tuần
  - Danh sách ngày nghỉ
- Khi gặp ngày nghỉ:
  - tự động bỏ qua
  - tiếp tục tìm ngày hợp lệ
- Luôn đảm bảo sinh đủ số buổi mà người dùng yêu cầu.
- Người dùng có thể loại bỏ từng buổi ngay trong Preview trước khi lưu.