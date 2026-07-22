Hiện tại ở trang Schedule cần bổ sung một số chức năng và cập nhật UI như sau:

1. Bổ sung chức năng sửa lịch

Hiện tại page Schedule chưa có nút Sửa cho từng lịch học.

Yêu cầu:

Thêm nút Sửa tại mỗi lịch học.
Khi click Sửa, mở lại ScheduleModal.
Modal sẽ được fill toàn bộ dữ liệu của lịch học đang chọn.
Sau khi chỉnh sửa, gọi API cập nhật lịch (PUT /livestreams/:id).
2. Cập nhật chức năng "Thêm nhiều lịch tự động"

File cần chỉnh sửa:

app/(admin)/schedule/components/Modal/ScheduleModal.tsx

Hiện tại phần Cấu hình lịch tự động chỉ cho phép cấu hình một khung giờ dùng chung cho tất cả các ngày được chọn.

Cần bổ sung thêm 2 chế độ cấu hình:

Chế độ 1 - Cấu hình giống nhau (mặc định)

Một cấu hình sẽ được áp dụng cho tất cả các ngày đã chọn.

Ví dụ:

Thứ 2
Thứ 4
Thứ 6

↓

08:00 - 10:00
Giáo viên A

Tất cả các ngày đều sử dụng chung cấu hình trên.

Chế độ 2 - Cấu hình riêng theo từng ngày

Cho phép mỗi ngày trong tuần có cấu hình riêng.

Ví dụ:

Thứ	Giờ bắt đầu	Giờ kết thúc	Giáo viên
Thứ 2	08:00	10:00	Giáo viên A
Thứ 3	13:30	15:30	Giáo viên B
Thứ 5	19:00	21:00	Giáo viên C

Mỗi ngày có thể thiết lập:

Giờ bắt đầu
Giờ kết thúc
Giáo viên

độc lập với các ngày khác.

3. UI

Trong modal "Thêm nhiều lịch tự động", bổ sung lựa chọn:

(•) Dùng chung cấu hình cho tất cả các ngày

( ) Cấu hình riêng theo từng ngày
Khi chọn Dùng chung cấu hình, giữ nguyên UI hiện tại.
Khi chọn Cấu hình riêng theo từng ngày, hiển thị danh sách các ngày đã chọn, mỗi ngày có form cấu hình riêng.
Mục tiêu

Người dùng có thể lựa chọn:

Một cấu hình áp dụng cho tất cả các ngày học trong tuần.
Hoặc cấu hình khác nhau cho từng ngày học, đáp ứng các lớp có lịch học và giáo viên không cố định theo từng buổi.


dựa vào cấu trúc api  được mô tả trong file  livestreamApi.md và trong .env . Trong  modal ScheduleModal.tsx khi submit sẽ phải convert giá trị time giống với phần body  và  hãy tính hợp api tạo mới trong folder service (endpoint).


phần thêm mới lịch học: thêm 1 buổi hoặc thêm nhiều lịch tự động sẽ làm thêm 1 modal preview để người dùng dễ hình dung khi thêm mới lịch nó sẽ như nào
+ đối với thêm nhiều tự động sẽ không cần đến ngày kết thúc thay vào đó là số buổi học
ví dụ người dùng chọn ngày bắt đầu là 22/7 và số buổi người dùng chọn 5 buổi , phần các ngày trong tuần tick thứ 3 thứ 5 thứ 6 .thì lịch nó sẽ như sau thứ 5(22/7) thứ 6 (23/7) , thứ 3(28/7) tiếp theo là thứ 5(29/7) nhưng vì ngày đó ngày nghỉ nên là 2 thứ tiếp theo là thứ 6 (30/7) và thứ 3 (4/8). bổ sung thêm phần ui để người dùng chọn thứ 5 (29/7) bỏ qua.

tương tự với phần sửa lịch , dời lịch cũng phải hiện modal preview để người dùng tiện theo dõi trước khi save 

