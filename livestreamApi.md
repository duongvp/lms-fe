# Livestream Schedule API Documentation

**Base URL**

```text
http://localhost:5000/livestreams
```

---

# 1. Tạo một buổi học

### Endpoint

```http
POST /livestreams/single
```

### Request Body

```json
{
  "system_type": "topclass",
  "code": "toan-6",
  "teacher": "Nguyen Van A",
  "learn_number": 1,
  "lesson_count": 0,
  "start_time": "2026-07-22T08:00:00.000Z",
  "end_time": "2026-07-22T10:00:00.000Z",
  "lesson_status": 0
}
```

### Curl

```bash
curl --location 'http://localhost:5000/livestreams/single' \
--header 'Content-Type: application/json' \
--data '{
  "system_type": "topclass",
  "code": "toan-6",
  "teacher": "Nguyen Van A",
  "learn_number": 1,
  "lesson_count": 0,
  "start_time": "2026-07-22T08:00:00.000Z",
  "end_time": "2026-07-22T10:00:00.000Z",
  "lesson_status": 0
}'
```

### Mô tả

* Tạo một buổi học mới.
* `key` sẽ được Backend tự động sinh.
* FE không cần truyền `key`.

---

# 2. Tạo nhiều buổi học

### Endpoint

```http
POST /livestreams/bulk
```

### Request Body

```json
{
  "calendars": [
    {
      "system_type": "topclass",
      "code": "toan-6",
      "teacher": "Nguyen Van A",
      "learn_number": 1,
      "lesson_count": 0,
      "start_time": "2026-07-22T08:00:00.000Z",
      "end_time": "2026-07-22T10:00:00.000Z",
      "lesson_status": 0
    },
    {
      "system_type": "topclass",
      "code": "toan-6",
      "teacher": "Nguyen Van A",
      "learn_number": 1,
      "lesson_count": 1,
      "start_time": "2026-07-29T08:00:00.000Z",
      "end_time": "2026-07-29T10:00:00.000Z",
      "lesson_status": 0
    },
    {
      "system_type": "topclass",
      "code": "toan-6",
      "teacher": "Nguyen Van A",
      "learn_number": 1,
      "lesson_count": 2,
      "start_time": "2026-08-05T08:00:00.000Z",
      "end_time": "2026-08-05T10:00:00.000Z",
      "lesson_status": 0
    }
  ]
}
```

### Curl

```bash
curl --location 'http://localhost:5000/livestreams/bulk' \
--header 'Content-Type: application/json' \
--data '{
  "calendars": [
    {
      "system_type": "topclass",
      "code": "toan-6",
      "teacher": "Nguyen Van A",
      "learn_number": 1,
      "lesson_count": 0,
      "start_time": "2026-07-22T08:00:00.000Z",
      "end_time": "2026-07-22T10:00:00.000Z",
      "lesson_status": 0
    },
    {
      "system_type": "topclass",
      "code": "toan-6",
      "teacher": "Nguyen Van A",
      "learn_number": 1,
      "lesson_count": 1,
      "start_time": "2026-07-29T08:00:00.000Z",
      "end_time": "2026-07-29T10:00:00.000Z",
      "lesson_status": 0
    },
    {
      "system_type": "topclass",
      "code": "toan-6",
      "teacher": "Nguyen Van A",
      "learn_number": 1,
      "lesson_count": 2,
      "start_time": "2026-08-05T08:00:00.000Z",
      "end_time": "2026-08-05T10:00:00.000Z",
      "lesson_status": 0
    }
  ]
}'
```

### Mô tả

* Tạo nhiều buổi học cùng lúc.
* Backend sẽ tự sinh `key` cho từng buổi.

---

# 3. Cập nhật một buổi học

## Endpoint

```http
PUT /livestreams/:id
```

## Trường hợp 1 - Chỉ cập nhật buổi hiện tại

### Request Body

```json
{
  "update_mode": "current",
  "teacher": "Tran Van B",
  "start_time": "2026-07-22T09:00:00.000Z",
  "end_time": "2026-07-22T11:00:00.000Z"
}
```

### Curl

```bash
curl --location --request PUT 'http://localhost:5000/livestreams/1' \
--header 'Content-Type: application/json' \
--data '{
  "update_mode": "current",
  "teacher": "Tran Van B",
  "start_time": "2026-07-22T09:00:00.000Z",
  "end_time": "2026-07-22T11:00:00.000Z"
}'
```

### Mô tả

Chỉ cập nhật buổi có `id` tương ứng.

---

## Trường hợp 2 - Nghỉ học và dời đề cương

### Request Body

```json
{
  "update_mode": "following",
  "lesson_status": 1,
  "new_session": {
    "teacher": "Nguyen Van A",
    "start_time": "2026-08-12T08:00:00.000Z",
    "end_time": "2026-08-12T10:00:00.000Z"
  }
}
```

### Curl

```bash
curl --location --request PUT 'http://localhost:5000/livestreams/1' \
--header 'Content-Type: application/json' \
--data '{
  "update_mode": "following",
  "lesson_status": 1,
  "new_session": {
    "teacher": "Nguyen Van A",
    "start_time": "2026-08-12T08:00:00.000Z",
    "end_time": "2026-08-12T10:00:00.000Z"
  }
}'
```

---

## Backend xử lý khi `update_mode = "following"`

Backend sẽ thực hiện tuần tự:

1. Đánh dấu buổi hiện tại là nghỉ học (`lesson_status = 1`).
2. Xóa toàn bộ thông tin đề cương của buổi hiện tại.
3. Dời toàn bộ đề cương xuống các buổi tiếp theo.
4. Giữ nguyên `key` của các buổi hiện có.
5. Tạo thêm một buổi học mới ở cuối.
6. Sinh `key` mới cho buổi học mới.
7. Kiểm tra trùng lịch giáo viên của buổi học mới.

---

# 4. Nghỉ học (Không dời lịch)

### Endpoint

```http
PUT /livestreams/:id/cancel
```

### Curl

```bash
curl --location --request PUT 'http://localhost:5000/livestreams/1/cancel'
```

### Mô tả

* Chỉ cập nhật:

```json
{
  "lesson_status": 1
}
```

* Không tạo buổi học mới.
* Không dời đề cương.
* Không thay đổi các buổi phía sau.

---

# Quy ước dành cho Frontend

## update_mode

| Giá trị   | Ý nghĩa                                             |
| --------- | --------------------------------------------------- |
| current   | Chỉ cập nhật buổi hiện tại                          |
| following | Nghỉ học và dời toàn bộ đề cương xuống các buổi sau |

---

## lesson_status

| Giá trị | Ý nghĩa         |
| ------- | --------------- |
| 0       | Học bình thường |
| 1       | Nghỉ học        |

---

## Lưu ý

### Khi `update_mode = "current"`

Không cần gửi `new_session`.

---

### Khi `update_mode = "following"`

Frontend **bắt buộc** gửi thêm:

```json
{
  "new_session": {
    "teacher": "...",
    "start_time": "...",
    "end_time": "..."
  }
}
```

Nếu không gửi, Backend sẽ trả về lỗi:

```text
Vui lòng cung cấp data.new_session (start_time, end_time, teacher...) để tạo buổi học bù
```

---

## Những trường Backend tự xử lý

Frontend **không cần truyền**:

* `key`
* Các trường đề cương sau khi dời (`lesson_name`, `lesson_document`, `lesson_baitap`, `lesson_tomtat`, `lesson_phuongphap`, `lesson_luuy`, `lesson_ketqua`)
* `lesson_count` của buổi học bù (Backend tự tăng)
* `system_type`, `code`, `learn_number` của buổi học bù (Backend lấy từ buổi hiện tại)
