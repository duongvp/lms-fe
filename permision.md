# [TASK] Nâng cấp Hệ thống Phân quyền từ Action-Level lên Field-Level (Quyền trên từng cột/trường)

## 1. Bối cảnh & Mục tiêu
Hiện tại, hệ thống LMS của chúng ta đang phân quyền ở mức **Hành động (Action-level)** (Ví dụ: Xem DS, Thêm mới, Cập nhật, Xóa... như giao diện hiện tại). 

Bây giờ, hệ thống cần nâng cấp lên mức độ chi tiết hơn: **Phân quyền trên từng trường dữ liệu (Field-level security)**. Nghĩa là với mỗi Module (ví dụ: Sản phẩm), chúng ta có thể cấu hình xem một Vai trò (Role) có được **Xem (View)** hay **Sửa (Edit)** một cột/trường cụ thể nào đó hay không (Ví dụ: Giảng viên được xem "Giá khóa học" nhưng không được sửa, hoặc Trợ giảng không được xem "Giá vốn").

---

## 2. Cấu trúc Database (Prisma Schema) làm căn cứ
Dưới đây là DB hiện tại đã được thiết kế lại để phục vụ tính năng này. Hãy chú ý đến trường `fieldPolicy` trong bảng `Role` và hai bảng mới là `Module`, `ModuleField`.

```prisma
model Role {
  id           BigInt           @id @default(autoincrement()) @db.UnsignedBigInt
  code         String           @unique @db.VarChar(50)
  name         String           @db.VarChar(100)
  description  String?          @db.VarChar(255)
  isActive     Boolean          @default(true)
  fieldPolicy  Json?            // Chính sách hiển thị/sửa trường theo module (JSON)
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  userRoles    UserRole[]
  rolePermissions RolePermission[]  

  @@map("roles")
}

model Permission {
  id              BigInt           @id @default(autoincrement()) @db.UnsignedBigInt
  code            String           @unique @db.VarChar(100)
  name            String           @db.VarChar(100)        // Tên hiển thị tiếng Việt
  description     String?          @db.VarChar(255)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  rolePermissions RolePermission[]

  @@map("permissions")
}

/// ===============================================================
/// Bảng mới quản lý Module và Trường (để FE gọi API render dynamic UI)
/// ===============================================================

model Module {
  id        BigInt        @id @default(autoincrement()) @db.UnsignedBigInt
  code      String        @unique @db.VarChar(50) // Ví dụ: "PRODUCT", "INVOICE", "COURSE"
  name      String        @db.VarChar(100)        // Ví dụ: "Sản phẩm", "Hóa đơn", "Khóa học"
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt
  fields    ModuleField[]

  @@map("modules")
}

model ModuleField {
  id         BigInt   @id @default(autoincrement()) @db.UnsignedBigInt
  moduleId   BigInt   @db.UnsignedBigInt
  fieldCode  String   @db.VarChar(50)  // Ví dụ: "price", "cost", "student_list"
  fieldLabel String   @db.VarChar(100) // Tên tiếng Việt: "Giá bán", "Giá vốn", "Danh sách học viên"
  fieldType  String?  @db.VarChar(20)  // text, number, date...
  sortOrder  Int      @default(0)      
  module     Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  @@unique([moduleId, fieldCode])
  @@index([moduleId])
  @@map("module_fields")
}


dữ liệu mẫu fieldPolicy
{
  "schedule_summary": {
    "visible_fields": ["date", "time", "class_name", "room"],
    "editable_fields": []
  },
  "schedule_detail": {
    "visible_fields": ["date", "time", "class_name", "room", "subject"],
    "editable_fields": []
  },
  "class_list": {
    "visible_fields": ["class_name", "grade", "room"],
    "editable_fields": []
  },
  "student_list": {
    "visible_fields": ["student_code", "full_name", "class_name"],
    "editable_fields": []
  }
}
