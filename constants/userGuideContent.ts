import type { GuideData } from '@/services/userGuideService';

// Adapted from Huong_dan_su_dung.docx v2.0 (20/08/2026).
// Labels, scope, constraints and current workflows reconciled on 28/10/2026.
// This is the built-in reading library; management changes remain session-only.
export const userGuideContent: GuideData = {
    "categories": [
        {
            "id": "getting-started",
            "name": "Bắt đầu sử dụng",
            "description": "Làm quen với LMS, đăng nhập và hiểu cách phối hợp các màn hình trong công việc hằng ngày.",
            "order": 1
        },
        {
            "id": "curriculum",
            "name": "Chương trình & đề cương",
            "description": "Chuẩn bị chương trình, danh sách bài và liên kết khóa học trước khi lập lịch hoặc soạn câu hỏi.",
            "order": 2
        },
        {
            "id": "quiz",
            "name": "Ngân hàng câu hỏi",
            "description": "Tạo câu hỏi và đáp án theo bài, kiểm tra cách hiển thị, sắp xếp và nhập/xuất dữ liệu.",
            "order": 3
        },
        {
            "id": "schedule",
            "name": "Lịch học & điều chỉnh",
            "description": "Tạo, tìm và cập nhật buổi học; phân biệt rõ nghỉ học, học bù và dời chuỗi.",
            "order": 4
        },
        {
            "id": "rooms",
            "name": "Cấu hình phòng học",
            "description": "Thiết lập tính năng phòng trực tuyến theo chương trình và bài học.",
            "order": 5
        },
        {
            "id": "staff",
            "name": "Giáo viên & trợ giảng",
            "description": "Chuẩn bị hồ sơ nhân sự, quản lý trạng thái, đồng bộ HMID và nhập/xuất danh sách.",
            "order": 6
        },
        {
            "id": "administration",
            "name": "Tài khoản & phân quyền",
            "description": "Quản lý tài khoản vận hành, vai trò, quyền thao tác và phạm vi chương trình.",
            "order": 7
        },
        {
            "id": "operations",
            "name": "Vận hành lớp & báo cáo",
            "description": "Đồng bộ học viên, chia lớp, chuẩn bị EVG và kiểm tra kết quả tham gia học.",
            "order": 8
        },
        {
            "id": "banners",
            "name": "Banner lịch học",
            "description": "Quản lý hình ảnh theo cặp chương trình và giáo viên, dùng đường dẫn ảnh đã chuẩn bị.",
            "order": 9
        }
    ],
    "articles": [
        {
            "id": "guide-navigation",
            "slug": "lam-quen-voi-lms",
            "categoryId": "getting-started",
            "title": "Làm quen với các khu vực trong LMS",
            "description": "Hiểu hệ thống, chọn đúng màn hình và thực hiện công việc theo đúng trình tự.",
            "audience": "Nhân viên vận hành, quản lý đào tạo và người quản trị hệ thống.",
            "prerequisites": [
                "Đã có tài khoản được cấp quyền truy cập LMS."
            ],
            "sections": [
                {
                    "id": "overview",
                    "title": "LMS STREAM hỗ trợ những công việc gì?",
                    "text": "LMS STREAM hỗ trợ chuẩn bị chương trình và đề cương, xây dựng câu hỏi theo bài, lập lịch, phân công nhân sự, cấu hình phòng và theo dõi hoạt động học. Tùy vai trò, bạn chỉ thấy những khu vực được phân quyền.",
                    "steps": []
                },
                {
                    "id": "navigation",
                    "title": "Chọn đúng khu vực làm việc",
                    "text": "",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Khu vực",
                            "Công việc chính"
                        ],
                        "rows": [
                            [
                                "Tổng quan",
                                "Xem số liệu, lịch sắp diễn ra, các lượt đồng bộ và những mục cần kiểm tra."
                            ],
                            [
                                "Quản lý đề cương",
                                "Chuẩn bị chương trình, bài học, thứ tự và liên kết gói/khóa học."
                            ],
                            [
                                "Quản lý câu hỏi",
                                "Soạn câu hỏi, đáp án và sắp xếp theo từng bài học."
                            ],
                            [
                                "Quản lý lịch học → Lịch học",
                                "Tạo lịch, phân công, xử lý nghỉ/bù và vận hành lớp."
                            ],
                            [
                                "Quản lý lịch học → Banner lịch học",
                                "Quản lý ảnh theo chương trình và giáo viên."
                            ],
                            [
                                "Cấu hình phòng học",
                                "Thiết lập tính năng phòng theo chương trình và bài."
                            ],
                            [
                                "Giáo viên & Trợ giảng",
                                "Quản lý hồ sơ nhân sự giảng dạy."
                            ],
                            [
                                "Quản trị viên / Vai trò thành viên",
                                "Quản lý tài khoản vận hành và quyền sử dụng."
                            ]
                        ]
                    }
                },
                {
                    "id": "workflow",
                    "title": "Quy trình làm việc khuyến nghị",
                    "text": "",
                    "steps": [
                        "Tạo hoặc kiểm tra chương trình; chuẩn bị đầy đủ danh sách bài học và thứ tự.",
                        "Chuẩn bị hồ sơ giáo viên, trợ giảng và cấu hình phòng nếu cần.",
                        "Soạn câu hỏi theo bài và kiểm tra các liên kết gói/khóa học.",
                        "Tạo lịch, xem trước, kiểm tra ngày giờ và nhân sự rồi xác nhận.",
                        "Đồng bộ học viên, chia lớp và chuẩn bị EVG khi chương trình sử dụng các chức năng này.",
                        "Trong quá trình vận hành, dùng đúng thao tác sửa, nghỉ, học bù hoặc dời chuỗi; sau buổi, đọc báo cáo và kiểm tra trạng thái học."
                    ]
                },
                {
                    "id": "context",
                    "title": "Giữ đúng chương trình khi chuyển màn hình",
                    "text": "Quản lý đề cương, Quản lý câu hỏi và Lịch học dùng chung lựa chọn chương trình. Khi chuyển màn hình, kiểm tra lại Chương trình, Nguồn lịch và bộ lọc được ghi nhớ. Trên điện thoại, mở menu ở thanh đầu trang.",
                    "steps": [],
                    "notice": "Không phải màn hình nào cũng xem được tất cả chương trình khi xóa lựa chọn. Đề cương và câu hỏi cần chọn chương trình; người quản trị có quyền phù hợp có thể rà lịch theo thời gian mà không chọn riêng chương trình."
                }
            ],
            "status": "published",
            "featured": true,
            "order": 1,
            "updatedAt": "2026-10-28T02:00:00Z"
        },
        {
            "id": "guide-dang-nhap-va-ket-thuc-phien",
            "slug": "dang-nhap-va-ket-thuc-phien",
            "categoryId": "getting-started",
            "title": "Đăng nhập và kết thúc phiên làm việc",
            "description": "Truy cập LMS bằng tài khoản được cấp và đăng xuất khi hoàn tất công việc.",
            "audience": "Người dùng đã được cấp tài khoản quản trị LMS.",
            "prerequisites": [
                "Có tên đăng nhập, mật khẩu và vai trò đang hoạt động."
            ],
            "sections": [
                {
                    "id": "login",
                    "title": "Đăng nhập hệ thống",
                    "text": "",
                    "steps": [
                        "Mở trang Đăng nhập của LMS.",
                        "Nhập Tên đăng nhập và Mật khẩu.",
                        "Chọn Duy trì đăng nhập nếu cần duy trì phiên làm việc.",
                        "Bấm Đăng nhập. Hệ thống mở màn hình đầu tiên mà tài khoản được phép truy cập."
                    ]
                },
                {
                    "id": "access",
                    "title": "Khi đăng nhập nhưng không vào được màn hình",
                    "text": "Nếu thấy thông báo không có quyền, hãy liên hệ quản trị viên để kiểm tra vai trò đang hoạt động, quyền xem và phạm vi chương trình. Việc có hồ sơ Giáo viên & Trợ giảng không tự cấp quyền sử dụng màn quản trị.",
                    "steps": []
                },
                {
                    "id": "password",
                    "title": "Khi cần hỗ trợ mật khẩu",
                    "text": "Liên hệ quản trị viên để được hỗ trợ thông tin đăng nhập. Không dùng màn tạo Quản trị viên để đặt mật khẩu: màn này quản lý thông tin tài khoản, vai trò và phạm vi truy cập.",
                    "steps": [],
                    "notice": "Liên kết Quên mật khẩu? đang có trên giao diện, nhưng luồng khôi phục mật khẩu/OTP chưa được backend hỗ trợ. Không tiếp tục các bước này như một quy trình đã dùng được."
                },
                {
                    "id": "logout",
                    "title": "Đăng xuất sau khi làm việc",
                    "text": "",
                    "steps": [
                        "Hoàn tất và lưu các thay đổi đang nhập.",
                        "Chọn Đăng xuất trong menu hoặc menu tài khoản ở thanh đầu trang.",
                        "Kiểm tra hệ thống đã quay về trang Đăng nhập."
                    ],
                    "notice": "Khi đăng nhập lại, khu vực đề cương có thể yêu cầu xác thực cấp 2 lại."
                }
            ],
            "status": "published",
            "featured": false,
            "order": 2,
            "updatedAt": "2026-10-28T02:00:00Z"
        },
        {
            "id": "guide-thao-tac-chung-va-xu-ly-loi",
            "slug": "thao-tac-chung-va-xu-ly-loi",
            "categoryId": "getting-started",
            "title": "Thao tác chung và xử lý vấn đề thường gặp",
            "description": "Hiểu bộ lọc, quyền sử dụng, bản xem trước và các thông báo cần kiểm tra.",
            "audience": "Tất cả người dùng vận hành.",
            "prerequisites": [
                "Đã đăng nhập và mở được màn hình cần làm việc."
            ],
            "sections": [
                {
                    "id": "controls",
                    "title": "Sử dụng các thành phần trên màn hình",
                    "text": "",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Thành phần",
                            "Cách sử dụng"
                        ],
                        "rows": [
                            [
                                "Tìm kiếm và Lọc",
                                "Chọn đúng chương trình và điều kiện rồi tìm kiếm. Xóa từng điều kiện hoặc dùng nút xóa lọc khi màn hình có cung cấp."
                            ],
                            [
                                "Bảng danh sách",
                                "Mở rộng dòng để xem chi tiết; dùng ô chọn khi cần xử lý nhóm. Kiểm tra số bản ghi trước khi thao tác."
                            ],
                            [
                                "Chọn tất cả",
                                "Ở những bảng hỗ trợ nhiều trang, đợi tải xong lựa chọn và đối chiếu tổng số bản ghi."
                            ],
                            [
                                "Xem trước",
                                "Đối chiếu phạm vi, tên bài, ngày giờ, nhân sự và các thay đổi trước khi xác nhận. Xem trước chưa đồng nghĩa đã lưu."
                            ]
                        ]
                    }
                },
                {
                    "id": "permissions",
                    "title": "Không thấy nút hoặc không sửa được một ô",
                    "text": "Quyền xem màn hình, quyền thêm/sửa/xóa/nhập/xuất, quyền xem/sửa từng trường và phạm vi chương trình được kiểm tra riêng. Khi một ô bị ẩn hoặc khóa, hãy nhờ quản trị viên kiểm tra đủ các lớp quyền. Phân công giáo viên/trợ giảng còn cần quyền phân công riêng.",
                    "steps": []
                },
                {
                    "id": "issues",
                    "title": "Các tình huống cần xử lý",
                    "text": "",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Tình huống",
                            "Cách kiểm tra"
                        ],
                        "rows": [
                            [
                                "Danh sách trống",
                                "Kiểm tra chương trình, nguồn lịch, khoảng ngày/khoảng bài và trạng thái đang lọc."
                            ],
                            [
                                "Xem trước báo lỗi",
                                "Đọc trường hoặc dòng được báo; hoàn tất thông tin bắt buộc rồi xem trước lại."
                            ],
                            [
                                "Trùng thời gian",
                                "Đối chiếu lịch đã có và nhân sự liên quan, sửa đúng khung giờ được hệ thống chỉ ra."
                            ],
                            [
                                "Không xác định được Lesson ID HMO",
                                "Kiểm tra gói/khóa, tên bài và chọn kết quả thủ công khi chưa khớp duy nhất."
                            ],
                            [
                                "Đã gửi yêu cầu nhưng chưa có kết quả",
                                "Theo dõi tiến trình từng lịch/chương trình. Được tiếp nhận không có nghĩa dịch vụ ngoài đã hoàn tất."
                            ]
                        ]
                    }
                },
                {
                    "id": "locked",
                    "title": "Khi dữ liệu đã được sử dụng",
                    "text": "Bài đã được dạy bị chặn sửa; bài đang gắn lịch bị chặn xóa. Lịch đã diễn ra hoặc đã nghỉ không được sửa thông thường, nhưng có cơ chế riêng cho liên kết HMO. Hồ sơ nhân sự đang dùng trong lịch có thể bị chặn đổi loại hoặc xóa.",
                    "steps": [],
                    "notice": "Đọc đúng thông báo của từng thao tác; không thử xóa hoặc đổi liên kết chỉ để vượt qua điều kiện bảo vệ dữ liệu."
                }
            ],
            "status": "published",
            "featured": false,
            "order": 3,
            "updatedAt": "2026-10-28T02:00:00Z"
        },
        {
            "id": "guide-lessons",
            "slug": "tim-bai-trong-de-cuong",
            "categoryId": "curriculum",
            "title": "Tìm bài học trong đề cương",
            "description": "Xác thực cấp 2 và lọc đúng bài theo chương trình, nguồn lịch, khoảng bài.",
            "audience": "Người được xem đề cương trong chương trình được giao.",
            "prerequisites": [
                "Có quyền xem đề cương.",
                "Có mật khẩu cấp 2 do người phụ trách cung cấp."
            ],
            "sections": [
                {
                    "id": "reauth",
                    "title": "Mở khu vực đề cương",
                    "text": "",
                    "steps": [
                        "Chọn Quản lý đề cương trong menu.",
                        "Nếu hiện Xác thực bảo mật Đề cương, nhập Mật khẩu cấp 2.",
                        "Bấm Xác thực; sau thông báo thành công, tiếp tục tìm hoặc thao tác bài."
                    ],
                    "notice": "Mật khẩu cấp 2 là lớp bảo vệ riêng. Xác thực thành công không thay thế quyền thêm, sửa, nhập hoặc xuất."
                },
                {
                    "id": "filter",
                    "title": "Tra cứu bài học",
                    "text": "",
                    "steps": [
                        "Bấm Lọc để mở Bộ lọc đề cương.",
                        "Chọn Nguồn lịch: Livestream hoặc Feed, sau đó chọn Chương trình.",
                        "Nhập Khoảng bài bằng Từ bài và Đến bài nếu chỉ muốn kiểm tra một đoạn đề cương.",
                        "Bấm Tìm kiếm.",
                        "Dùng Tìm theo tên bài học... để thu hẹp danh sách; mở rộng dòng khi cần xem thông tin bổ sung."
                    ]
                },
                {
                    "id": "check",
                    "title": "Khi không có kết quả",
                    "text": "Kiểm tra đúng nguồn và chương trình. Thử bỏ Khoảng bài hoặc xóa từ khóa tên bài rồi tìm lại. Nếu không thấy chương trình được giao, nhờ quản trị kiểm tra phạm vi của tài khoản.",
                    "steps": []
                },
                {
                    "id": "result",
                    "title": "Kết quả và bước tiếp theo",
                    "text": "Khi tìm đúng bài, bạn có thể soạn câu hỏi, kiểm tra liên kết khóa hoặc lập lịch theo quyền được cấp. Trước khi chuyển màn hình, ghi nhận chương trình đang chọn để tránh thao tác sang chương trình khác.",
                    "steps": []
                }
            ],
            "status": "published",
            "featured": false,
            "order": 1,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "lessons.view"
        },
        {
            "id": "guide-tao-chuong-trinh",
            "slug": "tao-chuong-trinh",
            "categoryId": "curriculum",
            "title": "Tạo chương trình mới",
            "description": "Thiết lập chương trình Topclass hoặc Topuni và nguồn lịch phù hợp.",
            "audience": "Người có quyền tạo đề cương trong phạm vi chương trình.",
            "prerequisites": [
                "Đã xác thực cấp 2.",
                "Đã thống nhất hệ thống, môn, năm học và mã chương trình chưa tồn tại."
            ],
            "sections": [
                {
                    "id": "open",
                    "title": "Mở cửa sổ tạo chương trình",
                    "text": "",
                    "steps": [
                        "Trong Quản lý đề cương, chọn Chương trình → Tạo chương trình.",
                        "Trong Tạo Chương trình mới, chọn Hệ thống: Topclass hoặc Topuni.",
                        "Điền các trường hiển thị tương ứng với hệ thống đã chọn."
                    ]
                },
                {
                    "id": "fields",
                    "title": "Thông tin cần điền",
                    "text": "",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Thông tin",
                            "Cách sử dụng"
                        ],
                        "rows": [
                            [
                                "Topclass",
                                "Chọn Khối, Môn học và Năm kết thúc."
                            ],
                            [
                                "Topuni",
                                "Chọn Giai đoạn, Kỳ thi, Lộ trình khi xuất hiện và Năm học (năm kết thúc)."
                            ],
                            [
                                "Nguồn lịch",
                                "Chọn Livestream hoặc Feed theo chương trình thực tế."
                            ],
                            [
                                "Mã chương trình",
                                "Kiểm tra mã được đề xuất; chỉ dùng chữ không dấu, số, gạch ngang hoặc gạch dưới."
                            ],
                            [
                                "Tên bài học đầu tiên",
                                "Nhập tên khi muốn chuẩn bị bài mở đầu cùng bước tạo chương trình."
                            ]
                        ]
                    }
                },
                {
                    "id": "save",
                    "title": "Kiểm tra và tạo",
                    "text": "",
                    "steps": [
                        "Rà hệ thống, môn học và nguồn lịch; không lấy bộ trường Topclass áp dụng cho Topuni.",
                        "Kiểm tra mã chương trình, đặc biệt tiền tố của nguồn Feed.",
                        "Bấm Tạo Chương trình.",
                        "Tìm và chọn chương trình mới trong bộ lọc để tiếp tục hoàn thiện đề cương."
                    ],
                    "notice": "Mã Feed có giới hạn 30 ký tự gồm tiền tố feed-. Nếu báo chương trình đã tồn tại, tìm mã hiện có trước khi chọn mã khác."
                },
                {
                    "id": "rename",
                    "title": "Khi cần chỉnh tên môn hoặc mã",
                    "text": "Chọn đúng chương trình rồi dùng Đổi tên môn học hoặc Đổi tên chương trình. Cửa sổ đổi tên chương trình có trường Mã chương trình; kiểm tra cả mã và tên môn trước khi Lưu thay đổi. Với việc đổi mã, cần rà các liên kết ngoài LMS cùng người phụ trách.",
                    "steps": []
                }
            ],
            "status": "published",
            "featured": false,
            "order": 2,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "lessons.view"
        },
        {
            "id": "guide-them-sua-sap-xep-bai",
            "slug": "them-sua-sap-xep-bai",
            "categoryId": "curriculum",
            "title": "Thêm, sửa và sắp xếp bài học",
            "description": "Bổ sung bài vào chương trình, chỉnh tên và quản lý trình tự đề cương.",
            "audience": "Người có quyền tạo/sửa/xóa đề cương tương ứng.",
            "prerequisites": [
                "Đã chọn đúng chương trình và xác thực cấp 2.",
                "Các bài cần chỉnh chưa bị khóa do đã được dạy."
            ],
            "sections": [
                {
                    "id": "add",
                    "title": "Thêm bài học",
                    "text": "",
                    "steps": [
                        "Trong Quản lý đề cương, tìm và chọn đúng chương trình.",
                        "Bấm Bài học để mở Thêm bài học.",
                        "Nhập Tên bài học rồi bấm Lưu.",
                        "Kiểm tra bài vừa được thêm vào đề cương."
                    ],
                    "notice": "Số thứ tự bài mới được hệ thống quản lý. Không hướng dẫn nhập số thứ tự thủ công trong form thêm bài; việc đổi thứ tự thực hiện bằng công cụ sắp xếp."
                },
                {
                    "id": "edit",
                    "title": "Sửa tên hoặc xóa bài chưa sử dụng",
                    "text": "",
                    "steps": [
                        "Tại dòng bài cần đổi tên, bấm Sửa tên bài học.",
                        "Sửa tên rồi bấm Lưu; dùng Hủy nếu muốn bỏ nội dung đang nhập.",
                        "Nếu cần loại bài, kiểm tra các lịch liên quan rồi dùng Xóa và đọc xác nhận."
                    ],
                    "notice": "Bài đã được dạy không sửa được. Máy chủ cũng chặn xóa bài đang gắn với bất kỳ lịch nào, kể cả lịch chưa diễn ra."
                },
                {
                    "id": "reorder",
                    "title": "Sắp xếp đề cương",
                    "text": "",
                    "steps": [
                        "Bấm Sắp xếp thứ tự.",
                        "Chọn Chèn vị trí để chèn bài và dịch các bài ở giữa, hoặc Đổi chỗ để đổi trực tiếp hai vị trí.",
                        "Kéo bài đến vị trí mong muốn.",
                        "Nếu cần đánh số liên tục theo thứ tự mới, bấm Đánh lại số bài; dùng Khôi phục số bài để bỏ lựa chọn này.",
                        "Bấm Lưu thứ tự; dùng Hủy sắp xếp nếu không muốn áp dụng."
                    ]
                },
                {
                    "id": "check",
                    "title": "Kiểm tra sau khi lưu",
                    "text": "Tải lại danh sách nếu cần và đối chiếu tên, thứ tự, chương trình. Thao tác sắp xếp cần toàn bộ danh sách bài phù hợp; không chỉ các dòng đang chọn. Tên trong đề cương và tên hiển thị của từng lịch có thể khác nhau do tiền tố/hậu tố.",
                    "steps": []
                }
            ],
            "status": "published",
            "featured": false,
            "order": 3,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "lessons.view"
        },
        {
            "id": "guide-nhap-xuat-de-cuong",
            "slug": "nhap-xuat-de-cuong",
            "categoryId": "curriculum",
            "title": "Nhập và xuất danh sách bài học",
            "description": "Dùng file mẫu để bổ sung đề cương hoặc tải dữ liệu kiểm tra.",
            "audience": "Người có quyền nhập/xuất đề cương; nút nhập còn phụ thuộc quyền tạo.",
            "prerequisites": [
                "Đã chọn chương trình và xác thực cấp 2.",
                "File nhập đúng mẫu, không vượt 5 MB và 500 dòng."
            ],
            "sections": [
                {
                    "id": "import",
                    "title": "Nhập bài theo mẫu",
                    "text": "",
                    "steps": [
                        "Mở Import trong Quản lý đề cương và tải mẫu CSV hoặc Excel.",
                        "Điền Số thứ tự bài, Tên bài học và Trạng thái đúng các cột trong mẫu.",
                        "Chọn Ghi đè hoặc Bỏ qua khi trùng số bài trong chương trình.",
                        "Chọn file rồi bấm Import.",
                        "Đọc Dòng, Trường và Nội dung lỗi; sửa file theo thông báo trước khi nhập lại."
                    ]
                },
                {
                    "id": "rules",
                    "title": "Ý nghĩa dữ liệu nhập",
                    "text": "",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Thông tin",
                            "Quy tắc"
                        ],
                        "rows": [
                            [
                                "Số thứ tự bài",
                                "Nếu để trống, hệ thống sinh bài tiếp theo. Khi đã có số bài trùng, chế độ nhập quyết định ghi đè hay bỏ qua."
                            ],
                            [
                                "Trạng thái",
                                "1: hoạt động; 0: ngừng dùng."
                            ],
                            [
                                "Chương trình",
                                "Lấy từ bộ lọc hiện tại, cần chọn trước khi nhập."
                            ]
                        ]
                    },
                    "notice": "Giao diện có thể cho chọn tệp đến 10 MB, nhưng máy chủ hiện giới hạn 5 MB cho nhập đề cương. Dùng giới hạn 5 MB để tránh file được chọn nhưng bị từ chối khi gửi."
                },
                {
                    "id": "export",
                    "title": "Xuất danh sách để kiểm tra",
                    "text": "",
                    "steps": [
                        "Chọn đúng chương trình và điều kiện lọc.",
                        "Mở Export; chọn Excel theo bộ lọc hoặc CSV theo bộ lọc.",
                        "Nếu chỉ xuất một nhóm, đánh dấu các bài rồi chọn Excel bản ghi đã chọn hoặc CSV bản ghi đã chọn.",
                        "Khi cần, chọn phạm vi toàn bộ được hệ thống cho phép.",
                        "Mở file tải về, kiểm tra chương trình và số lượng bài."
                    ]
                },
                {
                    "id": "result",
                    "title": "Lưu ý trước khi nhập lại",
                    "text": "Giữ đúng cấu trúc mẫu và chỉ dùng Ghi đè khi muốn cập nhật những bài đã có. Xuất theo bộ lọc, xuất dòng đã chọn và xuất toàn bộ là ba phạm vi khác nhau; cần kiểm tra trước khi dùng file cho công việc tiếp theo.",
                    "steps": []
                }
            ],
            "status": "published",
            "featured": false,
            "order": 4,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "lessons.view"
        },
        {
            "id": "guide-lien-ket-khoa-hoc-va-hmo",
            "slug": "lien-ket-khoa-hoc-va-hmo",
            "categoryId": "curriculum",
            "title": "Liên kết Package/Course và đối chiếu HMO",
            "description": "Thiết lập khóa học theo bài và kiểm tra dữ liệu đồng bộ với HOCMAI.",
            "audience": "Người có quyền sửa đề cương và các liên kết trong chương trình.",
            "prerequisites": [
                "Đã chọn chương trình, xác thực cấp 2.",
                "Nguồn danh sách Package/Course đã được cấu hình và tải được."
            ],
            "sections": [
                {
                    "id": "terms",
                    "title": "Hiểu các mã liên kết",
                    "text": "Package ID là mã gói; Course ID là mã khóa trong gói. Lesson ID HMO xác định bài bên HOCMAI được liên kết với nội dung/buổi học. Tên gần giống nhau chưa đủ để khẳng định đã chọn đúng bài.",
                    "steps": []
                },
                {
                    "id": "mapping",
                    "title": "Thêm hoặc gỡ khóa theo bài",
                    "text": "",
                    "steps": [
                        "Chọn chương trình; đánh dấu bài nếu chỉ xử lý một nhóm.",
                        "Bấm Course ID theo bài.",
                        "Chọn Thao tác: Thêm hoặc Xóa; chọn Phạm vi: các bài đã chọn hoặc Toàn bộ Chương trình.",
                        "Chọn Package ID và Course ID tương ứng.",
                        "Bấm Thực hiện rồi đối chiếu Mapping hiện tại."
                    ],
                    "notice": "Xóa chọn chỉ làm trống lựa chọn trên form. Muốn gỡ liên kết phải chọn Thao tác Xóa và bấm Thực hiện."
                },
                {
                    "id": "sheets",
                    "title": "Đồng bộ từ Google Sheets",
                    "text": "",
                    "steps": [
                        "Mở Đồng bộ → Đồng bộ từ Google Sheets.",
                        "Chọn Đồng bộ tên bài giảng hoặc Đồng bộ Course ID/Package ID theo bài theo nhu cầu.",
                        "Kiểm tra nguồn sheet và chương trình nhận dữ liệu rồi bấm Xem trước.",
                        "Rà các thay đổi, sau đó xác nhận cập nhật/đồng bộ và theo dõi kết quả từng lượt."
                    ]
                },
                {
                    "id": "hocmai",
                    "title": "Đối chiếu tên SCORM từ HOCMAI",
                    "text": "",
                    "steps": [
                        "Chọn Đồng bộ → Đồng bộ tên SCORM từ HOCMAI, rồi Tạo bản xem trước.",
                        "Lọc Package/Course/Lesson và kiểm tra kết quả.",
                        "Nếu cần xử lý thủ công, chọn đúng session và Lesson; nhập Lesson ID thì dùng Kiểm tra Lesson ID trước khi Áp dụng vào preview.",
                        "Rà lại toàn bộ thay đổi rồi bấm Xác nhận cập nhật … bài."
                    ],
                    "notice": "Với Lesson ID HMO trên từng lịch, dùng các lựa chọn tại form lịch hoặc đồng bộ trong Sửa hàng loạt. Khi chưa xác định duy nhất bài đúng trong từng khóa, cần chọn thủ công thay vì chấp nhận theo tên gần giống."
                }
            ],
            "status": "published",
            "featured": false,
            "order": 5,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "lessons.view"
        },
        {
            "id": "guide-quiz",
            "slug": "tim-cau-hoi-theo-bai",
            "categoryId": "quiz",
            "title": "Tìm câu hỏi theo bài học",
            "description": "Tra cứu theo chương trình, bài, loại câu hỏi và trạng thái sử dụng.",
            "audience": "Người có quyền xem câu hỏi trong chương trình được giao.",
            "prerequisites": [
                "Chương trình và bài học đã có trong đề cương."
            ],
            "sections": [
                {
                    "id": "search",
                    "title": "Tìm câu hỏi",
                    "text": "",
                    "steps": [
                        "Mở Quản lý câu hỏi.",
                        "Chọn Chương trình; chọn Bài học nếu muốn thu hẹp kết quả.",
                        "Lọc thêm Loại câu hỏi hoặc Trạng thái khi cần.",
                        "Dùng Tìm kiếm câu hỏi... để tìm theo nội dung."
                    ]
                },
                {
                    "id": "types",
                    "title": "Phân biệt loại và trạng thái",
                    "text": "",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Thông tin",
                            "Giá trị đang sử dụng"
                        ],
                        "rows": [
                            [
                                "Loại câu hỏi",
                                "Trắc nghiệm, Điền từ và Tự luận."
                            ],
                            [
                                "Đã hoàn thiện",
                                "Câu hỏi đang được sử dụng theo trạng thái của ngân hàng câu hỏi."
                            ],
                            [
                                "Đã vô hiệu hóa",
                                "Câu ngừng sử dụng; cần khôi phục trước khi chỉnh sửa theo giao diện."
                            ]
                        ]
                    }
                },
                {
                    "id": "preview",
                    "title": "Kiểm tra nội dung câu hỏi",
                    "text": "Khi thấy biểu tượng Xem trước, mở để kiểm tra nội dung và đáp án rồi Đóng. Nút này trên bảng còn phụ thuộc quyền sửa hoặc vô hiệu hóa; tài khoản chỉ có quyền xem có thể không thấy.",
                    "steps": []
                },
                {
                    "id": "empty",
                    "title": "Khi chưa tìm được câu hỏi",
                    "text": "Thử bỏ lọc Bài học, Loại câu hỏi hoặc chuyển Trạng thái để kiểm tra. Không dùng một chương trình khác chỉ vì số bài giống nhau; câu hỏi được gắn theo chương trình và bài.",
                    "steps": []
                }
            ],
            "status": "published",
            "featured": false,
            "order": 1,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "quiz.view"
        },
        {
            "id": "guide-soan-va-cap-nhat-cau-hoi",
            "slug": "soan-va-cap-nhat-cau-hoi",
            "categoryId": "quiz",
            "title": "Soạn và cập nhật câu hỏi, đáp án",
            "description": "Tạo trắc nghiệm, điền từ hoặc tự luận và kiểm tra trước khi lưu.",
            "audience": "Người có quyền tạo hoặc sửa câu hỏi và các trường liên quan.",
            "prerequisites": [
                "Đã chọn chương trình; bài học đích đã tồn tại."
            ],
            "sections": [
                {
                    "id": "create",
                    "title": "Nhập thông tin câu hỏi",
                    "text": "",
                    "steps": [
                        "Bấm Thêm câu hỏi hoặc biểu tượng Thêm mới câu hỏi.",
                        "Chọn Chương trình và Bài học; kiểm tra Thứ tự.",
                        "Nhập Nội dung câu hỏi, chọn Loại câu hỏi.",
                        "Điền đáp án phù hợp với loại; chọn Cách tính điểm và Thời gian trả lời.",
                        "Bấm Xem trước để kiểm tra rồi lưu bằng nút lưu trong cửa sổ."
                    ]
                },
                {
                    "id": "answers",
                    "title": "Cách nhập đáp án theo từng loại",
                    "text": "",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Loại",
                            "Thông tin cần chuẩn bị"
                        ],
                        "rows": [
                            [
                                "Trắc nghiệm",
                                "Ít nhất hai lựa chọn và ít nhất một đáp án đúng. Có thể chọn nhiều đáp án đúng; mỗi lựa chọn tối đa 500 ký tự."
                            ],
                            [
                                "Điền từ",
                                "Nhập gợi ý/vị trí cần điền và đáp án được chấp nhận. Gợi ý tối đa 200 ký tự; nội dung đáp án tối đa 1.000 ký tự."
                            ],
                            [
                                "Tự luận",
                                "Nhập đúng một Đáp án mẫu để đối chiếu/chấm bài; tối đa 2.000 ký tự."
                            ]
                        ]
                    }
                },
                {
                    "id": "settings",
                    "title": "Thời gian, điểm và thứ tự",
                    "text": "Nội dung câu hỏi tối đa 500 ký tự. Thời gian trả lời từ 1 đến 3.600 giây. Cách tính điểm có Tính điểm toàn câu và Tính điểm theo ý. Nếu đổi Thứ tự và nhận cảnh báo trùng, đối chiếu câu đang có trước khi xác nhận Ghi đè.",
                    "steps": []
                },
                {
                    "id": "edit",
                    "title": "Sửa, vô hiệu hóa hoặc khôi phục",
                    "text": "",
                    "steps": [
                        "Tìm câu và bấm Chỉnh sửa để cập nhật các trường được phép.",
                        "Khi đổi Loại câu hỏi, nhập lại đáp án theo loại mới rồi xem trước.",
                        "Nếu muốn ngừng dùng, bấm Vô hiệu hóa và xác nhận.",
                        "Muốn dùng lại, lọc Đã vô hiệu hóa rồi bấm Khôi phục với quyền sửa."
                    ],
                    "notice": "Vô hiệu hóa không phải xóa vĩnh viễn. Không suy ra quy trình chấm tự động của lớp live chỉ từ lựa chọn cách tính điểm trên màn soạn câu hỏi."
                }
            ],
            "status": "published",
            "featured": false,
            "order": 2,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "quiz.view"
        },
        {
            "id": "guide-sap-xep-nhap-xuat-cau-hoi",
            "slug": "sap-xep-nhap-xuat-cau-hoi",
            "categoryId": "quiz",
            "title": "Sắp xếp, nhập và xuất câu hỏi",
            "description": "Đổi trình tự trong một bài và cập nhật hàng loạt bằng file đúng mẫu.",
            "audience": "Người có quyền sửa, nhập hoặc xuất câu hỏi tương ứng.",
            "prerequisites": [
                "Đã chọn đúng chương trình; khi sắp xếp cần chọn một bài cụ thể."
            ],
            "sections": [
                {
                    "id": "order",
                    "title": "Sắp xếp câu hỏi",
                    "text": "",
                    "steps": [
                        "Lọc đến một chương trình và một bài học.",
                        "Mở Thao tác khác → Sắp xếp câu hỏi hoặc Sắp xếp theo bố cục màn hình.",
                        "Kéo thả câu đến vị trí cần dùng.",
                        "Bấm Lưu thứ tự; dùng Hủy để bỏ các vị trí vừa đổi."
                    ]
                },
                {
                    "id": "import",
                    "title": "Nhập câu hỏi theo mẫu",
                    "text": "",
                    "steps": [
                        "Chọn Import câu hỏi, tải mẫu và đọc sheet Hướng dẫn.",
                        "Điền dữ liệu tại sheet Nhập câu hỏi; không cần cột mã chương trình vì lấy từ bộ lọc.",
                        "Chọn An toàn – bỏ qua câu đã tồn tại khi thêm mới, hoặc Cập nhật – ghi đè câu đã tồn tại khi cập nhật theo Mã quiz.",
                        "Chọn file tối đa 5 MB và 5.000 dòng, bấm Kiểm tra và nhập dữ liệu.",
                        "Nếu có lỗi, sửa đúng dòng trong file rồi nhập lại."
                    ],
                    "notice": "Bài học trong file phải tồn tại. Có lỗi thì hệ thống không lưu file. Câu mới không có Mã quiz được nối cuối từng bài; giữ đúng Mã quiz khi muốn cập nhật câu cũ."
                },
                {
                    "id": "export",
                    "title": "Xuất câu hỏi để rà soát",
                    "text": "",
                    "steps": [
                        "Lọc dữ liệu và đánh dấu riêng các câu nếu chỉ cần một nhóm.",
                        "Mở menu nhập/xuất rồi chọn Export Excel.",
                        "Mở file tải về, đối chiếu chương trình, bài và số lượng.",
                        "Nếu sẽ nhập lại để cập nhật, giữ nguyên Mã quiz."
                    ]
                },
                {
                    "id": "check",
                    "title": "Kiểm tra kết quả",
                    "text": "Sau khi sắp xếp hoặc nhập file, tìm lại đúng bài và đối chiếu trình tự, loại, đáp án, thời gian. Đừng chỉ dựa vào số dòng trong file để kết luận mọi câu đã đúng nội dung.",
                    "steps": []
                }
            ],
            "status": "published",
            "featured": false,
            "order": 3,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "quiz.view"
        },
        {
            "id": "guide-schedule",
            "slug": "tra-cuu-lich-hoc",
            "categoryId": "schedule",
            "title": "Tra cứu lịch học",
            "description": "Tìm buổi học theo chương trình, thời gian và nhân sự; chuyển giữa dạng bảng và dạng lịch.",
            "audience": "Người có quyền xem lịch trong phạm vi được giao.",
            "prerequisites": [
                "Đã được cấp quyền xem chương trình cần tra cứu."
            ],
            "sections": [
                {
                    "id": "filter",
                    "title": "Lọc lịch theo công việc",
                    "text": "",
                    "steps": [
                        "Mở Quản lý lịch học → Lịch học.",
                        "Bấm Lọc, chọn Chương trình, Nguồn lịch và khoảng thời gian cần kiểm tra.",
                        "Thực hiện tìm kiếm để tải dữ liệu.",
                        "Dùng tìm kiếm theo chương trình, bài học, giáo viên hoặc phòng học để thu hẹp kết quả.",
                        "Chuyển Dạng bảng hoặc Dạng lịch tùy nhu cầu; mở Chi tiết buổi học để kiểm tra."
                    ]
                },
                {
                    "id": "status",
                    "title": "Đọc trạng thái buổi học",
                    "text": "",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Trạng thái",
                            "Ý nghĩa khi tra cứu"
                        ],
                        "rows": [
                            [
                                "Sắp diễn ra",
                                "Buổi chưa bắt đầu theo thời gian trên lịch. Một số bố cục dùng nhãn Sắp live."
                            ],
                            [
                                "Đang diễn ra",
                                "Thời điểm hiện tại nằm trong khung giờ buổi học."
                            ],
                            [
                                "Đã kết thúc",
                                "Đã qua thời gian kết thúc trên lịch."
                            ],
                            [
                                "Nghỉ học",
                                "Buổi đã được đánh dấu nghỉ; khác với việc hết thời gian."
                            ]
                        ]
                    }
                },
                {
                    "id": "scope",
                    "title": "Xem liên chương trình và giữ bộ lọc",
                    "text": "Người quản trị có quyền phù hợp có thể lọc theo thời gian mà không chọn riêng chương trình. Các tài khoản khác cần chọn chương trình theo phạm vi được giao. Khi chuyển từ đề cương hoặc câu hỏi, kiểm tra lại chương trình và nguồn lịch được ghi nhớ.",
                    "steps": []
                },
                {
                    "id": "check",
                    "title": "Kiểm tra khi danh sách trống",
                    "text": "Trang có thể chưa hiển thị dữ liệu nếu chưa tìm kiếm. Kiểm tra lại khoảng ngày, nguồn Livestream/Feed, chương trình và từ khóa trước khi kết luận thiếu lịch. Dùng làm mới danh sách sau khi các bước xử lý nền hoàn tất.",
                    "steps": []
                }
            ],
            "status": "published",
            "featured": true,
            "order": 1,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "calendar.view"
        },
        {
            "id": "guide-tao-mot-lich-hoc",
            "slug": "tao-mot-lich-hoc",
            "categoryId": "schedule",
            "title": "Tạo một lịch học",
            "description": "Chọn bài từ đề cương, phân công nhân sự và kiểm tra buổi trước khi xác nhận.",
            "audience": "Người có quyền tạo lịch; gán giáo viên/trợ giảng cần quyền phân công.",
            "prerequisites": [
                "Chương trình và bài đã có trong đề cương.",
                "Hồ sơ giáo viên/trợ giảng cần dùng đã được chuẩn bị."
            ],
            "sections": [
                {
                    "id": "open",
                    "title": "Chọn chương trình và bài",
                    "text": "",
                    "steps": [
                        "Mở Lịch học, chọn đúng chương trình và bấm nút thêm mới.",
                        "Kiểm tra thông tin lớp/chương trình khi form yêu cầu, sau đó chọn Tên bài học trong danh sách.",
                        "Kiểm tra Tên bài học hiển thị trên lịch; thêm tiền tố/hậu tố khi cần phân biệt các lần học.",
                        "Nếu có Lesson ID HMO, chọn đúng bài tương ứng theo từng khóa."
                    ]
                },
                {
                    "id": "time",
                    "title": "Nhập thời gian và phân công",
                    "text": "",
                    "steps": [
                        "Chọn Ngày học.",
                        "Nhập Thời gian bắt đầu và Thời gian kết thúc.",
                        "Chọn Giáo viên, chọn một hoặc nhiều Trợ giảng khi cần.",
                        "Rà hệ thống Topclass/Topuni và các trường được phép cấu hình."
                    ],
                    "notice": "Giờ kết thúc phải sau giờ bắt đầu. Buổi mới không được nằm trong quá khứ; nếu tạo cho hôm nay, giờ bắt đầu cần sau thời điểm hiện tại. Bài và lịch phải cùng nguồn Livestream hoặc Feed."
                },
                {
                    "id": "preview",
                    "title": "Xem trước và xác nhận",
                    "text": "",
                    "steps": [
                        "Bấm Xem trước.",
                        "Đối chiếu tên bài, chương trình, ngày giờ, giáo viên, trợ giảng và Course/Lesson đã chọn.",
                        "Sửa các dòng hoặc trường được báo lỗi, rồi kiểm tra lại.",
                        "Bấm Xác nhận Lưu; sau thông báo thành công, tìm buổi trong danh sách."
                    ]
                },
                {
                    "id": "quick-create",
                    "title": "Nếu chưa có bài học trong danh sách",
                    "text": "Kiểm tra chương trình trước. Khi nút Tạo nhanh bài học được cung cấp và bạn có quyền, mở cửa sổ, nhập Tên bài học rồi Tạo bài học; sau đó chọn bài vào lịch. Xác thực cấp 2 cho đề cương vẫn có thể được yêu cầu.",
                    "steps": [],
                    "notice": "Tạo nhanh bài chỉ bổ sung đề cương. Lịch chưa được tạo cho đến khi bạn xác nhận lưu lịch."
                }
            ],
            "status": "published",
            "featured": false,
            "order": 2,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "calendar.view"
        },
        {
            "id": "guide-tao-lich-tu-dong",
            "slug": "tao-lich-tu-dong",
            "categoryId": "schedule",
            "title": "Tạo lịch tự động theo đề cương",
            "description": "Chọn khoảng bài, cấu hình lịch mẫu, hiểu thứ tự lên lịch Topclass và cách xử lý ngày nghỉ trước khi xác nhận tạo lịch.",
            "audience": "Người có quyền tạo lịch và phân công nhân sự.",
            "prerequisites": [
                "Đã chọn chương trình và có đầy đủ bài trong khoảng cần tạo.",
                "Đã thống nhất ngày bắt đầu, tần suất, khung giờ và các đợt nghỉ."
            ],
            "sections": [
                {
                    "id": "start",
                    "title": "Mở màn hình và chọn khoảng bài",
                    "text": "",
                    "steps": [
                        "Vào menu Quản lý lịch học. Trên trang Lịch học, chọn chương trình ở bộ lọc, sau đó bấm Tạo lịch tự động.",
                        "Trong cửa sổ Tạo lịch học tự động, kiểm tra Hệ thống. Trường này được xác định từ chương trình và không chỉnh trực tiếp tại đây.",
                        "Nhập Từ bài và Đến bài để giới hạn các bài cần tạo lịch. Đọc thông báo số bài chưa có lịch trong khoảng đã chọn; hệ thống chỉ tạo cho bài chưa có lịch.",
                        "Chọn Ngày bắt đầu. Đây là ngày sớm nhất để bắt đầu tìm ngày học; buổi đầu tiên được xếp vào ngày phù hợp với thứ học đã cấu hình, không nhất thiết trùng ngày này."
                    ]
                },
                {
                    "id": "templates",
                    "title": "Thiết lập lịch mẫu theo hệ thống",
                    "text": "",
                    "steps": [
                        "Với Topclass, mở Thiết lập lịch cho từng nhóm bài và chọn Cách áp dụng lịch mẫu. Dùng chung cho tất cả nhóm bài áp dụng một bộ buổi mẫu cho các bài; Đặt riêng cho hai bài trong nhóm cho phép đặt lịch khác nhau cho bài thứ nhất và bài thứ hai.",
                        "Trong từng Buổi mẫu, chọn thứ học, nhập Bắt đầu và Kết thúc, chọn Giáo viên và Trợ giảng nếu cần. Đối chiếu lại các Buổi trong từng nhóm bài phía dưới, nhất là những bài có giờ hoặc nhân sự riêng.",
                        "Với Topuni, chọn Thứ học và Tần suất học: Hàng tuần lặp lại sau 1 tuần, Cách tuần sau 2 tuần, Tùy chọn cho phép nhập Lặp lại mỗi … tuần. Trong Lịch học hằng tuần, thiết lập khung giờ và nhân sự cho các thứ đã chọn; mỗi bài được tạo một buổi.",
                        "Kiểm tra Lesson ID HMO của từng buổi. Đây là bài học được liên kết trên HMO; nếu dùng chức năng đồng bộ, vẫn cần rà lại những buổi chưa chọn được hoặc chọn chưa đúng."
                    ],
                    "notice": "Lịch mẫu quyết định thứ học, giờ và nhân sự; Thứ tự lên lịch quyết định bài/buổi nào được xếp trước. Hai thiết lập này cùng ảnh hưởng đến ngày trong bản xem trước."
                },
                {
                    "id": "strategy",
                    "title": "Topclass: chọn Thứ tự lên lịch",
                    "text": "Một bài có thể có nhiều buổi. Trong một nhóm gồm Bài 1 và Bài 2, giả sử mỗi bài có hai buổi, hai lựa chọn cho kết quả như sau:",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Thứ tự lên lịch",
                            "Chuỗi bài/buổi được xếp",
                            "Dùng khi"
                        ],
                        "rows": [
                            [
                                "Xen kẽ hai bài trong từng nhóm",
                                "Bài 1 – buổi 1 → Bài 2 – buổi 1 → Bài 1 – buổi 2 → Bài 2 – buổi 2.",
                                "Muốn hai bài trong nhóm được triển khai xen kẽ, rồi mới sang nhóm tiếp theo."
                            ],
                            [
                                "Hoàn thành từng bài lần lượt",
                                "Bài 1 – buổi 1 → Bài 1 – buổi 2 → Bài 2 – buổi 1 → Bài 2 – buổi 2.",
                                "Muốn xếp đủ các buổi của bài thứ nhất trước khi chuyển sang bài thứ hai."
                            ]
                        ]
                    },
                    "notice": "Đây là thứ tự xếp lịch, không phải chờ người học hoàn thành bài trên hệ thống. Ngày học vẫn phải phù hợp với lịch mẫu; đổi lựa chọn có thể làm thay đổi cả ngày kết thúc chuỗi."
                },
                {
                    "id": "strategy-details",
                    "title": "Ví dụ ngày học cho hai lựa chọn Topclass",
                    "text": "",
                    "steps": [],
                    "blocks": [
                        {
                            "id": "strategy-details-link",
                            "type": "text",
                            "text": "Xem ví dụ Bài 1 học Thứ 2/Thứ 5, Bài 2 học Thứ 3/Thứ 6, kèm bảng đối chiếu ngày của từng buổi: Chọn thứ tự lên lịch Topclass: xen kẽ hay lần lượt",
                            "richText": {
                                "type": "doc",
                                "content": [
                                    {
                                        "type": "paragraph",
                                        "content": [
                                            {
                                                "type": "text",
                                                "text": "Xem ví dụ Bài 1 học Thứ 2/Thứ 5, Bài 2 học Thứ 3/Thứ 6, kèm bảng đối chiếu ngày của từng buổi: "
                                            },
                                            {
                                                "type": "text",
                                                "text": "Chọn thứ tự lên lịch Topclass: xen kẽ hay lần lượt",
                                                "marks": [
                                                    {
                                                        "type": "link",
                                                        "attrs": {
                                                            "href": "/user-guide/thu-tu-len-lich-topclass"
                                                        }
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    ]
                },
                {
                    "id": "holiday",
                    "title": "Khai báo Các đợt nghỉ",
                    "text": "",
                    "steps": [
                        "Trong Các đợt nghỉ, bấm Thêm ngày hoặc đợt nghỉ.",
                        "Chọn Từ ngày và Đến ngày trong dòng Đợt vừa thêm. Nghỉ một ngày thì chọn cùng ngày ở hai đầu; nghỉ liên tiếp thì chọn cả khoảng, bao gồm ngày đầu và ngày cuối.",
                        "Chọn Cách xử lý cho chính đợt đó. Tạo lịch ngày nghỉ và đánh dấu Nghỉ vẫn tạo lịch của bài/buổi rơi vào ngày nghỉ, nhưng đánh dấu Nghỉ; chuỗi tiếp tục sang bài/buổi kế tiếp, không tự thêm buổi bù.",
                        "Nếu cần dời nội dung chưa học sang ngày học kế tiếp, chọn Không tạo ngày nghỉ, giữ nguyên thứ tự bài. Ngày nghỉ không có lịch học được tạo; bài/buổi đang chờ sẽ được xếp sang ngày học hợp lệ tiếp theo.",
                        "Lặp lại thao tác thêm đợt nếu có nhiều khoảng nghỉ. Mỗi đợt có Cách xử lý riêng; rà để tránh các khoảng ngày chồng lấn."
                    ],
                    "notice": "Ví dụ chỉ học Thứ 6, Bài 1 dự kiến ngày 01/01/2027 và Bài 2 ngày 08/01/2027: chọn tạo lịch Nghỉ thì Bài 1 vẫn ở 01/01, Bài 2 ở 08/01; chọn không tạo ngày nghỉ thì Bài 1 sang 08/01, Bài 2 sang 15/01."
                },
                {
                    "id": "holiday-details",
                    "title": "Ví dụ và cách kiểm tra ngày nghỉ",
                    "text": "",
                    "steps": [],
                    "blocks": [
                        {
                            "id": "holiday-details-link",
                            "type": "text",
                            "text": "Đối chiếu bảng ngày trước/sau và phân biệt dòng nhắc ngày nghỉ trong bản xem trước với lịch thực sự được tạo: Xử lý các đợt nghỉ khi tạo lịch tự động",
                            "richText": {
                                "type": "doc",
                                "content": [
                                    {
                                        "type": "paragraph",
                                        "content": [
                                            {
                                                "type": "text",
                                                "text": "Đối chiếu bảng ngày trước/sau và phân biệt dòng nhắc ngày nghỉ trong bản xem trước với lịch thực sự được tạo: "
                                            },
                                            {
                                                "type": "text",
                                                "text": "Xử lý các đợt nghỉ khi tạo lịch tự động",
                                                "marks": [
                                                    {
                                                        "type": "link",
                                                        "attrs": {
                                                            "href": "/user-guide/xu-ly-dot-nghi-khi-tao-lich-tu-dong"
                                                        }
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    ]
                },
                {
                    "id": "names",
                    "title": "Đặt tên hiển thị nếu cần",
                    "text": "Nếu không cần đổi tên, giữ nguyên tên bài trong đề cương.",
                    "steps": [
                        "Muốn đặt mẫu cho các buổi tiếp theo của mỗi bài, bật Tạo tên hiển thị theo mẫu cho toàn bộ danh sách.",
                        "Nhập Đoạn phía trước hoặc Đoạn phía sau. Ký hiệu {n} là số lần xếp buổi của chính bài đó; ví dụ Đoạn phía sau là “ - Lần {n}” thì buổi thứ hai của Bài 1 có tên “Bài 1 - Lần 2”. Buổi đầu tiên giữ nguyên tên bài.",
                        "Nếu một khoảng bài cần tên khác, dùng Mẫu tên theo khoảng bài với Từ bài, Đến bài, Tiền tố và Hậu tố. Các khoảng không được chồng lấn; bài ngoài khoảng dùng mẫu chung.",
                        "Đọc lại tên hiển thị của từng dòng trong bản xem trước, đặc biệt khi vừa thay đổi thứ tự lên lịch hoặc ngày nghỉ."
                    ]
                },
                {
                    "id": "preview",
                    "title": "Xem trước, đối chiếu rồi xác nhận",
                    "text": "",
                    "steps": [
                        "Bấm Xem trước … lịch. Chưa có lịch nào được tạo ở bước này.",
                        "Đọc từng dòng theo thời gian: kiểm tra bài nào đứng trước, ngày và thứ có đúng lịch mẫu, giờ học, giáo viên, trợ giảng và Lesson ID HMO.",
                        "Đối chiếu các ngày thuộc đợt nghỉ. Với cách tạo lịch Nghỉ, phải thấy bài/buổi đúng ngày và trạng thái nghỉ; với cách không tạo ngày nghỉ, kiểm tra bài đó đã chuyển sang ngày học kế tiếp, không bị mất khỏi chuỗi.",
                        "Nếu đổi Thứ tự lên lịch, ngày nghỉ, lịch mẫu hoặc nhân sự, bấm Xem trước … lịch lại để xem kết quả mới. Đọc chi tiết lỗi và sửa trước khi tiếp tục.",
                        "Khi kết quả đúng, bấm Xác nhận tạo … lịch. Theo dõi tiến trình đến khi hoàn tất, rồi tra lại chương trình trên Lịch học để kiểm tra các lịch vừa tạo."
                    ],
                    "notice": "Đừng xác nhận chỉ dựa vào tổng số lịch: cần rà cả thứ tự bài, các dòng nghỉ và ngày cuối chuỗi. Nếu có xung đột hoặc liên kết bài HMO chưa đúng, sửa và xem trước lại."
                }
            ],
            "status": "published",
            "featured": true,
            "order": 3,
            "updatedAt": "2026-10-28T07:50:00Z",
            "requiredPermission": "calendar.view"
        },
        {
            "id": "guide-sua-va-hoan-doi-lich",
            "slug": "sua-va-hoan-doi-lich",
            "categoryId": "schedule",
            "title": "Sửa nhanh hoặc hoán đổi thời gian hai lịch",
            "description": "Điều chỉnh buổi chưa diễn ra hoặc đổi thời gian giữa hai lịch đủ điều kiện.",
            "audience": "Người có quyền sửa lịch và các trường liên quan; sửa nhân sự cần quyền phân công.",
            "prerequisites": [
                "Buổi cần chỉnh chưa diễn ra, chưa nghỉ.",
                "Đã kiểm tra tác động đến nhân sự và các buổi liên quan."
            ],
            "sections": [
                {
                    "id": "quick",
                    "title": "Sửa nhanh trên dòng lịch",
                    "text": "",
                    "steps": [
                        "Tìm đúng lịch và bấm Sửa nhanh.",
                        "Chỉnh các ô được mở như tên hiển thị, thời gian, giáo viên hoặc trợ giảng.",
                        "Kiểm tra ngày, giờ và nhân sự rồi lưu bằng thao tác lưu của dòng.",
                        "Tải lại hoặc tìm lại buổi để đối chiếu kết quả."
                    ],
                    "notice": "Không dùng sửa nhanh để đổi chương trình/số bài bị khóa hoặc đánh dấu nghỉ trực tiếp. Buổi đã diễn ra/nghỉ chỉ có cơ chế chỉnh liên kết Package/Course/Lesson ID riêng."
                },
                {
                    "id": "swap",
                    "title": "Hoán đổi thời gian hai lịch",
                    "text": "",
                    "steps": [
                        "Trên lịch A, bấm Hoán đổi với lịch khác.",
                        "Trong Hoán đổi lịch học, chọn Chương trình và Lịch B.",
                        "Đối chiếu tên bài, giáo viên và thời gian hai lịch; nhập Lý do nếu cần.",
                        "Bấm Hoán đổi. Nếu có xung đột, dùng Chỉnh giờ lịch A/B theo chỉ dẫn và kiểm tra lại."
                    ]
                },
                {
                    "id": "meaning",
                    "title": "Phân biệt hoán đổi với thay đổi nội dung",
                    "text": "Hoán đổi là đổi thời gian giữa hai lịch, không phải đổi toàn bộ bài học hoặc nhân sự. Hai lịch phải khác nhau và đủ điều kiện thay đổi. Lý do ở cửa sổ hoán đổi là không bắt buộc.",
                    "steps": []
                },
                {
                    "id": "delete",
                    "title": "Khi cần xóa lịch",
                    "text": "Nếu lịch đủ điều kiện và bạn có quyền xóa, dùng Xóa trên dòng hoặc chọn nhóm rồi Xóa, đọc xác nhận và kiểm tra số lượng. Nếu mục đích là ghi nhận một buổi nghỉ kèm lý do, dùng quy trình Dời lịch thay vì xóa.",
                    "steps": []
                }
            ],
            "status": "published",
            "featured": false,
            "order": 4,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "calendar.view"
        },
        {
            "id": "guide-nghi-hoc-hoc-bu-doi-chuoi",
            "slug": "nghi-hoc-hoc-bu-doi-chuoi",
            "categoryId": "schedule",
            "title": "Nghỉ học, tạo lịch bù và dời chuỗi",
            "description": "Chọn đúng phương án thay đổi, nhập lý do và kiểm tra các buổi bị ảnh hưởng.",
            "audience": "Người có quyền sửa lịch, trạng thái và phân công nhân sự khi cần.",
            "prerequisites": [
                "Buổi xử lý chưa diễn ra và chưa nghỉ, trừ trường hợp tạo bù sau nghỉ đủ điều kiện.",
                "Đã thống nhất phương án học và thời gian thay thế."
            ],
            "sections": [
                {
                    "id": "choose",
                    "title": "Chọn phương án phù hợp",
                    "text": "",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Chế độ trong Dời lịch",
                            "Khi nào dùng",
                            "Kết quả"
                        ],
                        "rows": [
                            [
                                "Nghỉ học & Tạo lịch bù",
                                "Buổi nghỉ nhưng cần học lại riêng vào ngày khác.",
                                "Buổi hiện tại thành nghỉ; thêm một buổi bù cùng bài. Các buổi sau giữ nguyên."
                            ],
                            [
                                "Nghỉ học & Dời chuỗi",
                                "Cần dịch nội dung xuống những buổi tiếp theo.",
                                "Buổi hiện tại nghỉ; nội dung đề cương dịch xuống các buổi sau và thêm buổi mới cuối khóa."
                            ],
                            [
                                "Nghỉ học (Không dời)",
                                "Chỉ ghi nhận nghỉ, không có buổi thay thế.",
                                "Buổi hiện tại thành nghỉ; không tạo buổi mới và không dời các buổi sau."
                            ]
                        ]
                    }
                },
                {
                    "id": "steps",
                    "title": "Thực hiện thay đổi",
                    "text": "",
                    "steps": [
                        "Tại dòng lịch, bấm Dời lịch rồi chọn chế độ phù hợp.",
                        "Nhập Lý do thay đổi, tối đa 500 ký tự.",
                        "Với học bù, điền Ngày học bù, giờ và Giáo viên dạy bù/Trợ giảng. Với dời chuỗi, nhập thông tin buổi mới ở cuối khóa.",
                        "Kiểm tra Tiền tố/Hậu tố của tên buổi nghỉ và tên buổi mới; điều chỉnh theo cách gọi của chương trình.",
                        "Kiểm tra lựa chọn gửi thông báo nếu có.",
                        "Bấm Xem trước; rà cả buổi nghỉ, buổi mới và các buổi trong chuỗi trước khi Xác nhận Lưu."
                    ]
                },
                {
                    "id": "conditions",
                    "title": "Các điều kiện cần kiểm tra",
                    "text": "Thời gian buổi mới phải hợp lệ và không nằm trong quá khứ. Dời chuỗi cần còn buổi tiếp theo phù hợp; cần kiểm tra ngày cuối khóa và các buổi chưa bắt đầu. Không dùng thao tác chỉnh trạng thái trực tiếp để bỏ qua bước ghi lý do.",
                    "steps": [],
                    "notice": "Dời chuỗi dịch nội dung trong kế hoạch; không nên hiểu là tự đẩy mọi khung giờ của các buổi sau sang một ngày khác. Hãy kiểm tra từng dòng trong bản xem trước."
                },
                {
                    "id": "after-cancel",
                    "title": "Nếu buổi đã được cho nghỉ trước đó",
                    "text": "Khi lịch nghỉ còn đủ điều kiện, mở Dời lịch để Tạo lịch bù; Dời chuỗi chỉ xuất hiện khi được phép và buổi tiếp theo chưa bắt đầu. Buổi đã có phương án bù/dời chuỗi hoặc không có lịch sử nghỉ hợp lệ sẽ bị chặn.",
                    "steps": [],
                    "notice": "Không khẳng định có thao tác khôi phục buổi nghỉ thành buổi thường. Với buổi đã nghỉ, chỉ dùng những lựa chọn đang được giao diện cung cấp."
                }
            ],
            "status": "published",
            "featured": false,
            "order": 5,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "calendar.view"
        },
        {
            "id": "guide-cap-nhat-lich-hang-loat",
            "slug": "cap-nhat-lich-hang-loat",
            "categoryId": "schedule",
            "title": "Cập nhật lịch học hàng loạt",
            "description": "Áp dụng cấu hình chung hoặc riêng cho nhiều buổi trong một chương trình.",
            "audience": "Người có quyền sửa lịch; phân công nhân sự cần quyền riêng.",
            "prerequisites": [
                "Các lịch được chọn thuộc cùng chương trình.",
                "Mỗi lượt tối đa 100 lịch theo giới hạn xử lý hiện tại."
            ],
            "sections": [
                {
                    "id": "select",
                    "title": "Chọn lịch và thao tác",
                    "text": "",
                    "steps": [
                        "Lọc và đánh dấu các buổi cần xử lý trên bảng.",
                        "Đợi hoàn tất tải lựa chọn nếu dùng Chọn tất cả; kiểm tra tổng số buổi.",
                        "Chọn Sửa hoặc Sửa hàng loạt theo bố cục.",
                        "Ở Thao tác hàng loạt, chọn Cập nhật lịch, Nghỉ hẳn hoặc Nghỉ & thêm lịch bù."
                    ]
                },
                {
                    "id": "common",
                    "title": "Đặt cấu hình chung hoặc riêng",
                    "text": "Chọn Dùng chung cho tất cả lịch khi muốn áp dụng cùng giá trị, hoặc Cấu hình riêng từng lịch để rà từng buổi. Chỉ bật các trường cần cập nhật. Có thể tự điền ngày theo ngày bắt đầu, thứ học, khung giờ và các đợt nghỉ. Với tên buổi, dùng tiền tố/hậu tố hoặc Mẫu tên theo khoảng bài khi cần.",
                    "steps": []
                },
                {
                    "id": "hmo",
                    "title": "Đồng bộ Lesson ID HMO",
                    "text": "Trong phần Lesson ID HMO, chọn Đồng bộ theo Tên lịch học (calendar) hoặc Tên bài học (lessons). Kiểm tra kết quả theo từng Course; nếu chưa có lựa chọn chắc chắn, chọn thủ công. Một tên bài ở nhiều khóa cần được kiểm tra trong đúng từng khóa.",
                    "steps": [],
                    "notice": "Bài học nội bộ cần có liên kết Package/Course. Không dùng sửa ngày giờ đồng thời với thao tác liên kết dành riêng cho lịch đã diễn ra hoặc đã nghỉ."
                },
                {
                    "id": "confirm",
                    "title": "Xem trước và xác nhận",
                    "text": "",
                    "steps": [
                        "Với nghỉ/bù, nhập lý do và thông tin buổi bù, kiểm tra tiền tố/hậu tố riêng cho buổi nghỉ và buổi mới.",
                        "Bấm Xem trước.",
                        "Rà tên, ngày giờ, giáo viên, trợ giảng và Lesson HMO ở từng dòng.",
                        "Xác nhận cập nhật và theo dõi tiến trình đến khi hoàn tất.",
                        "Tìm lại các lịch để kiểm tra kết quả."
                    ],
                    "notice": "Có lịch đã diễn ra/nghỉ sẽ khóa một số thao tác như nghỉ/bù hoặc tự điền ngày. Nếu báo khác chương trình hoặc quá giới hạn, chia nhóm phù hợp rồi xử lý lại."
                }
            ],
            "status": "published",
            "featured": false,
            "order": 6,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "calendar.view"
        },
        {
            "id": "guide-nhap-xuat-sao-chep-lich",
            "slug": "nhap-xuat-sao-chep-lich",
            "categoryId": "schedule",
            "title": "Nhập, xuất và sao chép lịch học",
            "description": "Làm việc với file/Google Sheets đúng phạm vi và tạo lịch mới từ một buổi đã có.",
            "audience": "Người có quyền nhập, sửa, xuất hoặc tạo lịch tương ứng.",
            "prerequisites": [
                "Đã chọn chương trình và chuẩn bị bài trong đề cương.",
                "File lịch không quá 10 MB hoặc 300 lịch mỗi lượt theo giao diện."
            ],
            "sections": [
                {
                    "id": "create-import",
                    "title": "Nhập lịch mới",
                    "text": "",
                    "steps": [
                        "Bấm Import → Import tạo lịch.",
                        "Tải File mẫu CSV hoặc File mẫu Excel; có thể Mở Google Sheet mẫu.",
                        "Điền số bài, tên hiển thị, ngày giờ và nhân sự theo mẫu.",
                        "Chọn Dùng file CSV/Excel hoặc Dùng link Google Sheets; với sheet, dùng link có quyền xem phù hợp.",
                        "Bấm Import tạo lịch và đọc kết quả từng dòng."
                    ],
                    "notice": "Package/Course lấy theo đề cương. Lesson ID HMO chưa được gán ở bước nhập tạo lịch; cần đối chiếu/đồng bộ sau đó. Nếu có một dòng không hợp lệ, không lịch nào trong file được tạo."
                },
                {
                    "id": "update-import",
                    "title": "Cập nhật lịch bằng file",
                    "text": "Chọn Import → Cập nhật lịch. Giữ đúng số bài và số lần của buổi trong chương trình. Chế độ Bỏ qua dữ liệu đã có chỉ bổ sung trường trống; Ghi đè dùng giá trị file để cập nhật trường đã có. Ô trống giữ nguyên dữ liệu, không dùng để xóa. Lịch đã diễn ra hoặc đã nghỉ không được cập nhật theo luồng này.",
                    "steps": []
                },
                {
                    "id": "export",
                    "title": "Chọn đúng kiểu xuất",
                    "text": "",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Lựa chọn Export",
                            "Dùng khi nào"
                        ],
                        "rows": [
                            [
                                "Xuất Excel (.xlsx) / Xuất CSV (.csv)",
                                "Tải lịch theo phạm vi lọc/lựa chọn đang dùng."
                            ],
                            [
                                "Excel để bổ sung trợ giảng",
                                "Chuẩn bị file để nhập lại bằng Cập nhật lịch."
                            ],
                            [
                                "Excel toàn bộ chương trình (theo mẫu gốc)",
                                "Lấy bộ dữ liệu theo phạm vi toàn bộ chương trình."
                            ],
                            [
                                "Google Sheets toàn bộ chương trình",
                                "Làm mới hai bảng tính đích Topclass/Topuni theo cấu hình."
                            ]
                        ]
                    },
                    "notice": "Xuất Google Sheets toàn bộ thay các tab cũ ở hai bảng tính đích, gồm tab sai hệ và bản có hậu tố LMS. Kiểm tra liên kết đích và thống nhất với người phụ trách trước khi Xuất vào sheet."
                },
                {
                    "id": "copy",
                    "title": "Sao chép thành lịch mới",
                    "text": "",
                    "steps": [
                        "Trên lịch nguồn, bấm Sao chép thành lịch mới hoặc Sao chép lịch.",
                        "Chọn Ngày học mới, Bắt đầu và Kết thúc.",
                        "Kiểm tra Giáo viên, Trợ giảng và Lesson ID HMO; không giữ nhầm bài của lần học khác.",
                        "Xác nhận sao chép và tìm lại buổi mới trong danh sách."
                    ]
                }
            ],
            "status": "published",
            "featured": false,
            "order": 7,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "calendar.view"
        },
        {
            "id": "guide-cau-hinh-phong-hoc",
            "slug": "cau-hinh-phong-hoc",
            "categoryId": "rooms",
            "title": "Tra cứu, tạo và nhập cấu hình phòng học",
            "description": "Quản lý Camera, Microphone, bảng xếp hạng và các thiết lập theo từng bài.",
            "audience": "Người có quyền xem, tạo/sửa hoặc nhập cấu hình phòng tương ứng.",
            "prerequisites": [
                "Đã xác định đúng chương trình và số bài.",
                "Thông tin EVG/Stream Key hoặc cấu hình nâng cao được người phụ trách cung cấp nếu cần."
            ],
            "sections": [
                {
                    "id": "find",
                    "title": "Tìm và kiểm tra cấu hình",
                    "text": "",
                    "steps": [
                        "Mở Cấu hình phòng học.",
                        "Tìm mã lớp hoặc người cập nhật; lọc Bài thứ khi cần.",
                        "Bấm Xem chi tiết cấu hình trên dòng.",
                        "Đối chiếu mã lớp, bài, người cập nhật và thời gian cập nhật lần cuối."
                    ]
                },
                {
                    "id": "save",
                    "title": "Tạo hoặc chỉnh sửa",
                    "text": "",
                    "steps": [
                        "Mở cửa sổ tạo cấu hình hoặc Chỉnh sửa cấu hình trên dòng có sẵn.",
                        "Chọn Mã lớp và Bài thứ.",
                        "Bật/tắt Camera, Microphone, Leaderboard và Chia sẻ màn hình theo yêu cầu vận hành.",
                        "Nhập EVG và Stream Key khi có thông tin được cấp.",
                        "Bấm Lưu Cấu Hình; mở lại chi tiết để kiểm tra."
                    ]
                },
                {
                    "id": "fields",
                    "title": "Ý nghĩa các lựa chọn",
                    "text": "",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Lựa chọn",
                            "Mục đích"
                        ],
                        "rows": [
                            [
                                "Camera / Microphone",
                                "Thiết lập tính năng camera và micro của phòng."
                            ],
                            [
                                "Leaderboard",
                                "Thiết lập bảng xếp hạng."
                            ],
                            [
                                "Chia sẻ màn hình",
                                "Thiết lập tính năng chia sẻ màn hình."
                            ],
                            [
                                "Nội dung Raw JSON",
                                "Cấu hình nâng cao, chỉ dùng khi có nội dung hợp lệ do người phụ trách cung cấp."
                            ]
                        ]
                    },
                    "notice": "Không đưa Stream Key vào tài liệu dùng chung hoặc chia sẻ ngoài người được cấp quyền. Lưu cấu hình trên LMS không tự chứng minh mọi phòng bên ngoài đã cập nhật tức thời."
                },
                {
                    "id": "import",
                    "title": "Nhập nhiều cấu hình",
                    "text": "",
                    "steps": [
                        "Mở Import Cấu hình Phòng học từ Excel.",
                        "Chọn Chương trình trước khi đọc file và dùng mẫu trong cửa sổ.",
                        "Chuẩn bị mỗi dòng cho một bài; các dòng cùng chương trình, không trùng số bài, tối đa 1.000 dòng.",
                        "Đọc bản xem trước và sửa các dòng báo lỗi.",
                        "Bấm Import rồi kiểm tra kết quả; dùng Làm mới để tải lại danh sách."
                    ]
                }
            ],
            "status": "published",
            "featured": false,
            "order": 1,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "room_config.view"
        },
        {
            "id": "guide-them-cap-nhat-nhan-su",
            "slug": "them-cap-nhat-nhan-su",
            "categoryId": "staff",
            "title": "Thêm và cập nhật giáo viên, trợ giảng",
            "description": "Quản lý đúng hồ sơ và loại nhân sự dùng khi phân công lịch.",
            "audience": "Người được xem và tạo/sửa nhân sự giảng dạy.",
            "prerequisites": [
                "Có tên đăng nhập và thông tin nhân sự chính xác."
            ],
            "sections": [
                {
                    "id": "find",
                    "title": "Tra cứu trước khi thêm",
                    "text": "Mở Giáo viên & Trợ giảng; tìm theo Tên đăng nhập hoặc họ tên. Lọc Loại nhân sự và Trạng thái để tránh tạo trùng hồ sơ ngừng hoạt động.",
                    "steps": []
                },
                {
                    "id": "create",
                    "title": "Thêm hồ sơ mới",
                    "text": "",
                    "steps": [
                        "Bấm Thêm nhân sự.",
                        "Nhập Tên đăng nhập và Họ và tên.",
                        "Chọn Loại nhân sự: Giáo viên hoặc Trợ giảng.",
                        "Chọn Trạng thái rồi bấm Lưu.",
                        "Tìm lại hồ sơ để kiểm tra tên và loại trước khi phân công."
                    ]
                },
                {
                    "id": "fields",
                    "title": "Quy tắc thông tin",
                    "text": "",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Trường",
                            "Cần lưu ý"
                        ],
                        "rows": [
                            [
                                "Tên đăng nhập",
                                "Tối đa 120 ký tự; chỉ chữ, số và các ký tự . _ @ -. Đây là mã nhân sự được dùng trong lịch."
                            ],
                            [
                                "Họ và tên",
                                "Tối đa 100 ký tự; kiểm tra tên hiển thị để chọn đúng người khi phân công."
                            ],
                            [
                                "Loại nhân sự",
                                "Phân biệt Giáo viên với Trợ giảng; không phải vai trò quản trị LMS."
                            ],
                            [
                                "Trạng thái",
                                "Hoạt động hoặc Ngừng hoạt động."
                            ]
                        ]
                    }
                },
                {
                    "id": "update",
                    "title": "Cập nhật hoặc ngừng hoạt động",
                    "text": "Dùng Sửa trên dòng để chỉnh những trường được mở. Tên đăng nhập bị khóa khi sửa. Hồ sơ đang dùng trong lịch có thể không được đổi loại hoặc xóa. Khi cần ngừng sử dụng, chuyển sang Ngừng hoạt động nếu phù hợp.",
                    "steps": [],
                    "notice": "Ngừng hoạt động hồ sơ không mặc định hủy các lịch đã phân công. Tạo hồ sơ giảng dạy cũng không tự cấp tài khoản truy cập màn quản trị."
                }
            ],
            "status": "published",
            "featured": false,
            "order": 1,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "teacher_profile.view"
        },
        {
            "id": "guide-dong-bo-hmid-nhap-xuat-nhan-su",
            "slug": "dong-bo-hmid-nhap-xuat-nhan-su",
            "categoryId": "staff",
            "title": "Đồng bộ HMID và nhập/xuất nhân sự",
            "description": "Đối chiếu nhân sự với HOCMAI và xử lý nhiều hồ sơ bằng file mẫu.",
            "audience": "Người có quyền sửa, nhập hoặc xuất nhân sự tương ứng.",
            "prerequisites": [
                "Tên đăng nhập hồ sơ đã được xác minh.",
                "File nhập theo mẫu, tối đa 5 MB/2.000 dòng."
            ],
            "sections": [
                {
                    "id": "hmid",
                    "title": "Đồng bộ mã định danh",
                    "text": "",
                    "steps": [
                        "Tìm hồ sơ trong Giáo viên & Trợ giảng.",
                        "Đánh dấu người cần đối chiếu và bấm Đồng bộ HMID đã chọn; hoặc dùng Đồng bộ HMID trên từng dòng.",
                        "Chờ kết quả rồi đọc nhãn trạng thái của từng hồ sơ."
                    ]
                },
                {
                    "id": "states",
                    "title": "Đọc kết quả đối chiếu",
                    "text": "",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Trạng thái",
                            "Hướng kiểm tra"
                        ],
                        "rows": [
                            [
                                "Đã đồng bộ",
                                "HMID đã được đối chiếu; kiểm tra đúng hồ sơ cần dùng."
                            ],
                            [
                                "Không tìm thấy",
                                "Xác minh tên đăng nhập bên HOCMAI với người phụ trách."
                            ],
                            [
                                "Lỗi",
                                "Đọc thông tin lỗi, kiểm tra nguồn hoặc kết nối trước khi thử lại."
                            ],
                            [
                                "Chờ đồng bộ",
                                "Chưa có kết quả hoàn tất."
                            ]
                        ]
                    }
                },
                {
                    "id": "import",
                    "title": "Nhập file nhân sự",
                    "text": "",
                    "steps": [
                        "Bấm Nhập file; tải File mẫu Excel hoặc File mẫu CSV.",
                        "Điền tài khoản, họ tên, loại và trạng thái theo mẫu.",
                        "Chọn chế độ bỏ qua hoặc ghi đè khi trùng hồ sơ.",
                        "Chọn file, bấm Bắt đầu nhập rồi đọc các dòng lỗi và số xử lý thành công."
                    ]
                },
                {
                    "id": "export",
                    "title": "Xuất danh sách hiện có",
                    "text": "Dùng Xuất file → Xuất Excel hoặc Xuất CSV; trên điện thoại có thể thấy hai nút riêng. Kiểm tra bộ lọc trước khi xuất. Khi nhập lại, giữ đúng mã nhân sự và loại; không dùng file để đổi mã đang được lịch học sử dụng.",
                    "steps": []
                }
            ],
            "status": "published",
            "featured": false,
            "order": 2,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "teacher_profile.view"
        },
        {
            "id": "guide-quan-tri-vien-va-pham-vi",
            "slug": "quan-tri-vien-va-pham-vi",
            "categoryId": "administration",
            "title": "Quản trị viên và phạm vi chương trình",
            "description": "Tạo hoặc cập nhật tài khoản vận hành và chọn đúng chương trình được phép truy cập.",
            "audience": "Người có quyền quản lý tài khoản; tạo/xóa và gán vai trò/phạm vi cần admin.",
            "prerequisites": [
                "Đã thống nhất nhiệm vụ, vai trò đang hoạt động và chương trình giao cho tài khoản."
            ],
            "sections": [
                {
                    "id": "create",
                    "title": "Tạo tài khoản quản trị",
                    "text": "",
                    "steps": [
                        "Mở Quản trị viên và chọn nút thêm tài khoản.",
                        "Nhập Tên đăng nhập, Email, Tên người dùng và Điện thoại khi có.",
                        "Chọn ít nhất một Vai trò đang hoạt động.",
                        "Trong Phạm vi chương trình, chọn mức phù hợp; nếu giới hạn, chọn Chương trình được phép.",
                        "Bấm Lưu, mở lại tài khoản để đối chiếu vai trò và phạm vi."
                    ]
                },
                {
                    "id": "scope",
                    "title": "Chọn đúng phạm vi",
                    "text": "",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Phạm vi",
                            "Ý nghĩa"
                        ],
                        "rows": [
                            [
                                "Tất cả chương trình",
                                "Tài khoản được áp dụng các quyền nghiệp vụ đã cấp trên mọi chương trình thuộc phạm vi hệ thống."
                            ],
                            [
                                "Chỉ chương trình đã chọn",
                                "Chọn ít nhất một chương trình trong Chương trình được phép."
                            ],
                            [
                                "Không truy cập",
                                "Không được làm việc với dữ liệu chương trình theo phạm vi này."
                            ]
                        ]
                    },
                    "notice": "Phạm vi chương trình được cấu hình riêng trên tài khoản; vai trò quyết định quyền thao tác và quyền dữ liệu. Tài khoản mang vai trò admin được hệ thống cấp quyền toàn bộ; không dùng phạm vi hẹp để kỳ vọng giới hạn admin."
                },
                {
                    "id": "update",
                    "title": "Cập nhật thông tin hoặc thu hồi quyền",
                    "text": "Mở tài khoản cần sửa, chỉnh thông tin được phép rồi Lưu. Chỉ admin được gán vai trò/phạm vi; ô vai trò của chính tài khoản đăng nhập bị khóa. Khi xóa quyền quản trị, kiểm tra đúng người và đọc xác nhận; không thể xóa chính tài khoản đang đăng nhập.",
                    "steps": []
                },
                {
                    "id": "credentials",
                    "title": "Thông tin đăng nhập và dữ liệu liên quan",
                    "text": "Form tạo tài khoản không đặt mật khẩu. Việc xác thực tài khoản phụ thuộc cấu hình đăng nhập của hệ thống; phối hợp người phụ trách để cấp đúng thông tin. Xóa quyền quản trị sẽ thu hồi phiên và vai trò theo xử lý hệ thống; không khẳng định thao tác này xóa toàn bộ dữ liệu học viên liên quan.",
                    "steps": []
                }
            ],
            "status": "published",
            "featured": false,
            "order": 1,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "users.view"
        },
        {
            "id": "guide-vai-tro-quyen-thao-tac-du-lieu",
            "slug": "vai-tro-quyen-thao-tac-du-lieu",
            "categoryId": "administration",
            "title": "Thiết lập vai trò và quyền dữ liệu",
            "description": "Cấp quyền làm việc trên từng màn hình và từng trường, theo nhiệm vụ thực tế.",
            "audience": "Người có quyền xem và tạo/sửa vai trò.",
            "prerequisites": [
                "Đã có danh sách thao tác và dữ liệu được phép cho nhóm người dùng."
            ],
            "sections": [
                {
                    "id": "role",
                    "title": "Tạo hoặc mở vai trò",
                    "text": "",
                    "steps": [
                        "Mở Vai trò thành viên.",
                        "Bấm Vai trò để thêm mới, hoặc mở chi tiết một vai trò rồi Cập nhật.",
                        "Nhập Vai trò và Mô tả.",
                        "Nếu cần tái sử dụng cấu hình, mở chi tiết vai trò nguồn rồi Sao chép; đổi tên có hậu tố - Bản sao trước khi lưu."
                    ]
                },
                {
                    "id": "actions",
                    "title": "Quyền thao tác",
                    "text": "Trong Quyền thao tác, mở từng nhóm và đánh dấu các quyền cần có. Xem, tạo, sửa, xóa, nhập, xuất là các quyền riêng khi nhóm có hỗ trợ; không tự coi có quyền xem là được làm mọi thao tác.",
                    "steps": []
                },
                {
                    "id": "fields",
                    "title": "Quyền xem và sửa trường",
                    "text": "",
                    "steps": [
                        "Mở tab Quyền dữ liệu (Field-Level).",
                        "Mở nhóm màn hình cần cấu hình.",
                        "Đánh dấu Xem cho trường được nhìn thấy; đánh dấu Sửa cho trường được chỉnh.",
                        "Dùng Tất cả ở đầu cột khi muốn chọn nhanh mọi trường trong nhóm.",
                        "Rà lại rồi bấm Lưu."
                    ],
                    "notice": "Quyền Sửa bao gồm việc nhìn thấy trường. Bỏ Xem sẽ đồng thời bỏ Sửa. Có quyền sửa màn hình vẫn có thể bị chặn nếu thiếu quyền sửa trường hoặc ngoài phạm vi chương trình."
                },
                {
                    "id": "account",
                    "title": "Gán vai trò cho người dùng",
                    "text": "Vai trò mới không tự được gán cho tài khoản nào. Admin mở Quản trị viên để gán Vai trò và đặt Phạm vi chương trình riêng trên tài khoản. Không mặc định tên “quản lý” hay “nhân viên” có một tập quyền cố định; kiểm tra cấu hình thực tế.",
                    "steps": []
                },
                {
                    "id": "delete",
                    "title": "Khi cần xóa vai trò",
                    "text": "Mở chi tiết vai trò và dùng Xoá khi nút được cung cấp. Vai trò admin không có nút xóa trên giao diện. Máy chủ chặn xóa vai trò đang gán cho người dùng; cần điều chỉnh phân công trước khi thử lại.",
                    "steps": []
                }
            ],
            "status": "published",
            "featured": false,
            "order": 2,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "roles.view"
        },
        {
            "id": "guide-chuan-bi-lop-va-evg",
            "slug": "chuan-bi-lop-va-evg",
            "categoryId": "operations",
            "title": "Chuẩn bị lớp: học viên, chia phòng và EVG",
            "description": "Thực hiện đúng thứ tự từ danh sách đăng ký đến phòng học trực tuyến.",
            "audience": "Nhân viên vận hành có quyền sửa lịch; quét nhân sự cần thêm quyền phân công.",
            "prerequisites": [
                "Lịch đã tồn tại và có liên kết Package/Course phù hợp.",
                "Nhân sự đã được phân công, nguồn tích hợp đã được cấu hình."
            ],
            "sections": [
                {
                    "id": "workflow",
                    "title": "Mở quy trình trên những lịch đã chọn",
                    "text": "",
                    "steps": [
                        "Lọc và đánh dấu các lịch cần chuẩn bị.",
                        "Mở Đồng bộ → Quy trình tạo lớp và EVG.",
                        "Thực hiện Đồng bộ học viên, sau đó chia lớp và tạo/đồng bộ EVG theo các bước bên dưới."
                    ],
                    "notice": "Quy trình theo dõi đúng tập lịch đang chọn. Khi đổi lựa chọn, kiểm tra lại các bước; không coi trạng thái của nhóm cũ là đã chuẩn bị cho nhóm mới."
                },
                {
                    "id": "students",
                    "title": "Đồng bộ học viên",
                    "text": "",
                    "steps": [
                        "Chọn Đồng bộ học viên.",
                        "Chọn Đồng bộ toàn bộ học viên để rà đủ đăng ký, hoặc Chỉ học viên đăng ký hôm nay nếu đúng mục đích.",
                        "Bấm Bắt đầu đồng bộ.",
                        "Đọc tiến độ từng chương trình, số thêm mới, giữ nguyên, không có mapping và thất bại."
                    ],
                    "notice": "Luồng này chỉ bổ sung người mới; người đã có được giữ nguyên phòng/lớp và trạng thái học. Không có mapping thì cần kiểm tra liên kết gói/khóa trước."
                },
                {
                    "id": "rooms",
                    "title": "Xem trước rồi chia lớp",
                    "text": "",
                    "steps": [
                        "Chọn đúng một lịch và mở Đồng bộ → Xem trước & chia 1 lịch để kiểm tra phương án.",
                        "Chọn Chỉ cập nhật học sinh chưa học hoặc Cập nhật tất cả học sinh.",
                        "Với TopUni, kiểm tra Giới hạn sĩ số TopUni; thay giới hạn thì Tải lại xem trước.",
                        "Rà số học sinh, số giữ nguyên, số phòng và Kết quả dự kiến theo từng phòng.",
                        "Bấm Xác nhận chia lớp. Khi cần xử lý nhiều buổi, dùng Tự động chia lớp đã chọn và đọc kết quả từng dòng."
                    ]
                },
                {
                    "id": "evg",
                    "title": "Tạo/đồng bộ EVG và theo dõi",
                    "text": "Sau chia lớp, chọn Tạo/đồng bộ EVG hoặc bước tương ứng trong cửa sổ quy trình. Chờ tiến trình, kiểm tra Tạo mới, Đã có/bỏ qua, Thất bại theo từng lịch. Được tiếp nhận yêu cầu chưa chứng minh luồng phát đã hoạt động.",
                    "steps": []
                },
                {
                    "id": "staff",
                    "title": "Quét user nhân sự và gửi lại HMO",
                    "text": "Quét user nhân sự đối soát tài khoản theo phân công và phạm vi chương trình; cần quyền sửa lịch và phân công. Đây không phải thao tác thêm hồ sơ nhân sự. Nếu cần Gửi lại HMO, sửa dữ liệu sai trước rồi theo dõi kết quả gửi lại, tránh lặp cùng lỗi.",
                    "steps": []
                }
            ],
            "status": "published",
            "featured": false,
            "order": 1,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "calendar.view"
        },
        {
            "id": "guide-chuyen-can-va-trang-thai-hoc",
            "slug": "chuyen-can-va-trang-thai-hoc",
            "categoryId": "operations",
            "title": "Cập nhật hoặc đặt lại trạng thái học",
            "description": "Ghi nhận đã học theo dữ liệu tham gia và điều chỉnh đúng những học viên được chọn.",
            "audience": "Người có quyền sửa lịch trong phạm vi được giao.",
            "prerequisites": [
                "Có lịch đã kết thúc và dữ liệu tham gia cần kiểm tra."
            ],
            "sections": [
                {
                    "id": "update",
                    "title": "Cập nhật trạng thái học theo khoảng ngày",
                    "text": "",
                    "steps": [
                        "Mở Đồng bộ → Cập nhật trạng thái học.",
                        "Chọn Khoảng ngày cần kiểm tra; đối chiếu Phạm vi chương trình hiển thị.",
                        "Bấm Xem trước và kiểm tra số lịch, học viên dự kiến cập nhật.",
                        "Dùng Chọn lại ngày nếu phạm vi chưa đúng.",
                        "Bấm Xác nhận cập nhật rồi theo dõi kết quả từng chương trình."
                    ],
                    "notice": "Cửa sổ dùng khoảng ngày riêng, không tự lấy toàn bộ lịch đang hiển thị hay chỉ các dòng đang chọn. Chỉ lịch đã kết thúc trong khoảng mới được đưa vào xem trước."
                },
                {
                    "id": "threshold",
                    "title": "Điều kiện ghi nhận",
                    "text": "Học viên có mặt ít nhất 10 phút trong giờ học được ghi nhận đã học theo luồng này. Trạng thái đã học trước đó được giữ nguyên, không bị chuyển ngược về chưa học chỉ vì lượt đồng bộ mới không đủ dữ liệu.",
                    "steps": []
                },
                {
                    "id": "reset",
                    "title": "Đặt lại cho đúng học viên",
                    "text": "",
                    "steps": [
                        "Mở Đồng bộ → Đặt lại trạng thái học.",
                        "Chọn Chương trình và Lịch học đã kết thúc.",
                        "Tìm, đánh dấu đúng học viên đang được ghi nhận đã học cần điều chỉnh.",
                        "Kiểm tra số người rồi bấm Đặt lại cho … học viên.",
                        "Tải lại để đối chiếu trạng thái."
                    ],
                    "notice": "Trạng thái học dùng chung theo bài. Khi một bài có nhiều lịch, việc đặt lại có thể ảnh hưởng cách trạng thái được nhìn thấy ở các lịch của cùng bài; không chọn tất cả nếu chỉ cần sửa một nhóm."
                },
                {
                    "id": "missing",
                    "title": "Đối chiếu đăng ký còn thiếu hôm qua",
                    "text": "Khi lọc đúng khoảng ngày hôm qua theo ngày Việt Nam và chọn 1–50 lịch, mục Kiểm tra học viên thiếu hôm qua có thể xuất hiện trong Đồng bộ. Bấm Kiểm tra để đọc số đăng ký, tài khoản riêng biệt, lượt đã có và còn thiếu. Đây là đối chiếu; muốn bổ sung dùng Đồng bộ học viên.",
                    "steps": []
                }
            ],
            "status": "published",
            "featured": false,
            "order": 2,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "calendar.view"
        },
        {
            "id": "guide-bao-cao-lop-va-hoat-dong",
            "slug": "bao-cao-lop-va-hoat-dong",
            "categoryId": "operations",
            "title": "Đọc báo cáo lớp và hoạt động học sinh",
            "description": "Từ báo cáo chương trình/buổi đến chi tiết chuyên cần, phòng và hoạt động cá nhân.",
            "audience": "Người có quyền xem lịch; báo cáo chi tiết, xuất file, chat và kiểm duyệt cần quyền bổ sung.",
            "prerequisites": [
                "Đã tìm kiếm lịch theo phạm vi cần báo cáo.",
                "Được cấp quyền xem các trường thông tin và nguồn dữ liệu cần đọc."
            ],
            "sections": [
                {
                    "id": "summary",
                    "title": "Mở báo cáo lớp",
                    "text": "",
                    "steps": [
                        "Bấm Báo cáo lớp học hoặc Export → Báo cáo lớp học theo chương trình/buổi.",
                        "Chọn Tổng hợp tất cả room hoặc Chi tiết từng room; lọc phòng khi cần.",
                        "Đối chiếu thời gian Theo lịch với giờ Live thực tế khi có dữ liệu.",
                        "Dùng Tải lại dữ liệu EVG nếu cần kiểm tra nguồn giờ phát.",
                        "Nếu có quyền, bấm Xuất Excel toàn bộ kết quả lọc."
                    ]
                },
                {
                    "id": "detail",
                    "title": "Tra cứu chi tiết một buổi",
                    "text": "",
                    "steps": [
                        "Bấm liên kết chương trình/buổi trong báo cáo để mở Báo cáo chi tiết buổi học.",
                        "Kiểm tra Ngày học, Theo lịch, Live thực tế và Giáo viên / Trợ giảng.",
                        "Ở Học sinh, tìm theo tên, tài khoản hoặc mã; lọc phòng và chuyên cần.",
                        "Dùng bộ lọc chat/kiểm duyệt khi thẻ được cung cấp.",
                        "Nếu cần, Xuất học sinh theo bộ lọc hoặc mở Nhật ký buổi."
                    ]
                },
                {
                    "id": "attendance",
                    "title": "Hiểu đúng nhãn chuyên cần",
                    "text": "",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Nhãn",
                            "Cách đọc"
                        ],
                        "rows": [
                            [
                                "Đủ chuyên cần",
                                "Ghi nhận tham gia đáp ứng quy định chuyên cần của báo cáo."
                            ],
                            [
                                "Chưa đủ chuyên cần",
                                "Có ghi nhận tham gia nhưng chưa đáp ứng điều kiện."
                            ],
                            [
                                "Chưa ghi nhận tham gia",
                                "Chưa tìm được dữ liệu trong phạm vi buổi; chưa đủ kết luận học sinh chắc chắn vắng."
                            ]
                        ]
                    }
                },
                {
                    "id": "individual",
                    "title": "Xem hoạt động cá nhân",
                    "text": "Chọn học sinh để mở Tổng quan và Lịch sử tham gia. Tin nhắn chat, Hạn chế chat và kiểm duyệt hoặc Hoạt động khác phụ thuộc quyền và nguồn được hỗ trợ. Đọc Lưu ý dữ liệu trước khi kết luận; thời gian luyện tập được tính riêng với thời gian học.",
                    "steps": [],
                    "notice": "Chưa có lịch sử camera, micro hoặc mất kết nối đầy đủ. Bản ghi hạn chế chat hiện lưu có thể thuộc ngày khác và chưa đủ kết luận trạng thái hạn chế hiện tại."
                },
                {
                    "id": "access",
                    "title": "Nếu không mở hoặc không xuất được báo cáo",
                    "text": "Quyền xem lịch thông thường chưa đủ để mở báo cáo chi tiết. Nhờ quản trị kiểm tra quyền báo cáo chi tiết, quyền xem trường và phạm vi chương trình; xuất file còn cần quyền xuất báo cáo riêng. Nếu lỗi tải dữ liệu, dùng Làm mới/Thử lại và ghi nhận đúng buổi cần kiểm tra.",
                    "steps": []
                }
            ],
            "status": "published",
            "featured": false,
            "order": 3,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "calendar.view"
        },
        {
            "id": "guide-banner-theo-chuong-trinh-giao-vien",
            "slug": "banner-theo-chuong-trinh-giao-vien",
            "categoryId": "banners",
            "title": "Thêm, sao chép và nhập banner lịch học",
            "description": "Thiết lập đúng ảnh cho giáo viên của chương trình và kiểm tra trước khi lưu.",
            "audience": "Người có quyền xem và tạo/sửa/nhập banner tương ứng.",
            "prerequisites": [
                "Có chương trình, giáo viên và đường dẫn ảnh có thể truy cập."
            ],
            "sections": [
                {
                    "id": "create",
                    "title": "Tạo hoặc cập nhật banner",
                    "text": "",
                    "steps": [
                        "Mở Quản lý lịch học → Banner lịch học.",
                        "Bấm Thêm banner, hoặc Chỉnh sửa trên cấu hình có sẵn.",
                        "Chọn Chương trình trước để lọc, rồi chọn Giáo viên.",
                        "Nhập Đường dẫn hình ảnh (URL), kiểm tra ảnh hoặc dùng Mở ảnh gốc.",
                        "Đặt Trạng thái hoạt động; bấm Thêm banner hoặc Lưu thay đổi."
                    ],
                    "notice": "Form sử dụng đường dẫn ảnh, không tải ảnh từ máy lên LMS. Theo gợi ý giao diện, dùng URL HTTPS trực tiếp tới ảnh."
                },
                {
                    "id": "copy",
                    "title": "Sao chép sang chương trình khác",
                    "text": "",
                    "steps": [
                        "Ở dòng banner nguồn, bấm Sao chép để tạo banner.",
                        "Kiểm tra giáo viên được giữ cố định; chọn Chương trình đích.",
                        "Rà URL, trạng thái rồi bấm Thêm banner."
                    ],
                    "notice": "Nếu không còn chương trình để chọn, kiểm tra chương trình/phân công của giáo viên. Không dùng sao chép để đổi sang giáo viên khác."
                },
                {
                    "id": "file",
                    "title": "Nhập, xuất hoặc ngừng dùng",
                    "text": "Mở Import, tải mẫu rồi điền chương trình, giáo viên và URL theo các cột mẫu. File CSV/XLSX tối đa 5 MB. Chọn Giữ dữ liệu hiện có hoặc Cập nhật URL banner khi cặp trùng, rồi Bắt đầu import. Export hiện dùng cùng quyền nhập banner. Muốn tắt một banner, sửa Trạng thái hoạt động; muốn xóa cấu hình, dùng Xóa và đọc xác nhận.",
                    "steps": []
                },
                {
                    "id": "image",
                    "title": "Khi ảnh chưa hiển thị",
                    "text": "Mở ảnh gốc để kiểm tra URL và quyền đọc nguồn ảnh. Xác minh đúng cặp chương trình–giáo viên; không kết luận đã tải ảnh vào LMS chỉ vì URL được lưu.",
                    "steps": []
                }
            ],
            "status": "published",
            "featured": false,
            "order": 1,
            "updatedAt": "2026-10-28T02:00:00Z",
            "requiredPermission": "program_teacher_banner.view"
        },
        {
            "categoryId": "schedule",
            "audience": "Người có quyền tạo lịch và phân công nhân sự.",
            "requiredPermission": "calendar.view",
            "status": "published",
            "featured": false,
            "updatedAt": "2026-10-28T07:50:00Z",
            "id": "guide-thu-tu-len-lich-topclass",
            "slug": "thu-tu-len-lich-topclass",
            "title": "Chọn thứ tự lên lịch Topclass: xen kẽ hay lần lượt",
            "description": "So sánh hai lựa chọn Thứ tự lên lịch bằng chuỗi bài/buổi và ví dụ ngày học cụ thể.",
            "order": 8,
            "prerequisites": [
                "Đã mở Tạo lịch tự động cho chương trình thuộc Topclass.",
                "Đã xác định mỗi bài cần bao nhiêu buổi và thứ học của từng buổi."
            ],
            "sections": [
                {
                    "id": "terms",
                    "title": "Phân biệt bài, buổi và nhóm bài",
                    "text": "Bài là nội dung trong đề cương. Buổi là một lần xếp lịch cho bài đó; một bài Topclass có thể có nhiều buổi. Nhóm bài là cặp bài được hiển thị cùng nhau trong Thiết lập lịch cho từng nhóm bài, ví dụ Nhóm 1: Bài 1 và Bài 2. Thứ tự lên lịch cho biết nên xếp buổi nào của bài nào trước.",
                    "steps": [],
                    "notice": "Thứ tự lên lịch chỉ xuất hiện với Topclass. Topuni dùng lịch tuần và mỗi bài một buổi, không có hai lựa chọn này trên màn hình."
                },
                {
                    "id": "choose",
                    "title": "Chọn một trong hai cách xếp",
                    "text": "",
                    "steps": [
                        "Tìm trường Thứ tự lên lịch ở đầu cửa sổ Tạo lịch học tự động.",
                        "Chọn Xen kẽ hai bài trong từng nhóm nếu muốn xếp buổi đầu của cả hai bài trước, rồi đến buổi thứ hai của cả hai bài. Hoàn tất nhóm hiện tại rồi mới chuyển sang nhóm tiếp theo.",
                        "Chọn Hoàn thành từng bài lần lượt nếu muốn xếp toàn bộ các buổi của một bài trước, sau đó mới xếp các buổi của bài kế tiếp."
                    ],
                    "table": {
                        "columns": [
                            "Lựa chọn",
                            "Ví dụ mỗi bài có hai buổi"
                        ],
                        "rows": [
                            [
                                "Xen kẽ hai bài trong từng nhóm",
                                "Bài 1/buổi 1 → Bài 2/buổi 1 → Bài 1/buổi 2 → Bài 2/buổi 2 → nhóm tiếp theo."
                            ],
                            [
                                "Hoàn thành từng bài lần lượt",
                                "Bài 1/buổi 1 → Bài 1/buổi 2 → Bài 2/buổi 1 → Bài 2/buổi 2 → nhóm tiếp theo."
                            ]
                        ]
                    },
                    "notice": "“Hoàn thành từng bài” ở đây nghĩa là xếp đủ các buổi của bài đó trong chuỗi lịch. Hệ thống không đợi người học hoàn thành bài mới xếp bài tiếp theo."
                },
                {
                    "id": "setup",
                    "title": "Thiết lập ví dụ để so sánh",
                    "text": "Ví dụ minh họa: chỉ xét nhóm Bài 1 và Bài 2, mỗi bài hai buổi; bắt đầu từ 02/11/2026, không có ngày nghỉ. Các ngày dưới đây là kết quả của đúng lịch mẫu này, không phải ngày cố định cho mọi chương trình.",
                    "steps": [
                        "Đặt Ngày bắt đầu là 02/11/2026.",
                        "Trong Thiết lập lịch cho từng nhóm bài, chọn Cách áp dụng lịch mẫu là Đặt riêng cho hai bài trong nhóm.",
                        "Ở Lịch mẫu cho bài thứ nhất, cấu hình buổi 1 là Thứ 2 và buổi 2 là Thứ 5; Bắt đầu 19:00, Kết thúc 20:30 cho cả hai buổi.",
                        "Ở Lịch mẫu cho bài thứ hai, cấu hình buổi 1 là Thứ 3 và buổi 2 là Thứ 6, cùng khung giờ 19:00–20:30. Chọn nhân sự phù hợp cho từng buổi."
                    ]
                },
                {
                    "id": "compare",
                    "title": "Kết quả Xem trước theo từng lựa chọn",
                    "text": "",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Vị trí trong chuỗi",
                            "Xen kẽ hai bài trong từng nhóm",
                            "Hoàn thành từng bài lần lượt"
                        ],
                        "rows": [
                            [
                                "1",
                                "Bài 1 – buổi 1: Thứ 2, 02/11/2026",
                                "Bài 1 – buổi 1: Thứ 2, 02/11/2026"
                            ],
                            [
                                "2",
                                "Bài 2 – buổi 1: Thứ 3, 03/11/2026",
                                "Bài 1 – buổi 2: Thứ 5, 05/11/2026"
                            ],
                            [
                                "3",
                                "Bài 1 – buổi 2: Thứ 5, 05/11/2026",
                                "Bài 2 – buổi 1: Thứ 3, 10/11/2026"
                            ],
                            [
                                "4",
                                "Bài 2 – buổi 2: Thứ 6, 06/11/2026",
                                "Bài 2 – buổi 2: Thứ 6, 13/11/2026"
                            ]
                        ]
                    },
                    "notice": "Ở cách lần lượt, khi xếp xong Bài 1 ngày 05/11 thì Thứ 3 ngày 03/11 đã qua. Vì vậy, buổi đầu Bài 2 được xếp vào Thứ 3 kế tiếp là 10/11; hệ thống không quay lại xếp ngày trước đó."
                },
                {
                    "id": "check",
                    "title": "Chọn cách phù hợp và rà trước khi tạo",
                    "text": "",
                    "steps": [
                        "Nếu muốn hai bài tiến triển song song trong nhóm, dùng Xen kẽ hai bài trong từng nhóm; nếu cần xếp hết các buổi của bài trước rồi mới bắt đầu bài sau, dùng Hoàn thành từng bài lần lượt.",
                        "Bấm Xem trước … lịch và đối chiếu thứ tự các dòng với mục tiêu của bạn. So sánh cả ngày đầu, ngày cuối và khoảng cách giữa các buổi.",
                        "Nếu một bài ít buổi hơn bài còn lại, khi hết buổi của bài đó thì chỉ các buổi còn lại được xếp tiếp; không tự thêm buổi cho đủ cặp.",
                        "Nếu mỗi bài chỉ có một buổi, hai cách cho cùng thứ tự bài trong nhóm; khác biệt thể hiện khi bài có nhiều buổi.",
                        "Sau khi đổi lựa chọn hoặc lịch mẫu, xem trước lại rồi mới bấm Xác nhận tạo … lịch."
                    ]
                }
            ]
        },
        {
            "categoryId": "schedule",
            "audience": "Người có quyền tạo lịch và phân công nhân sự.",
            "requiredPermission": "calendar.view",
            "status": "published",
            "featured": false,
            "updatedAt": "2026-10-28T07:50:00Z",
            "id": "guide-xu-ly-dot-nghi-tu-dong",
            "slug": "xu-ly-dot-nghi-khi-tao-lich-tu-dong",
            "title": "Xử lý các đợt nghỉ khi tạo lịch tự động",
            "description": "Hiểu rõ hai cách xử lý ngày nghỉ, ảnh hưởng đến bài/buổi và cách kiểm tra trước khi tạo lịch.",
            "order": 9,
            "prerequisites": [
                "Đã mở Tạo lịch tự động và cấu hình các ngày học.",
                "Đã có ngày bắt đầu và kết thúc của từng đợt nghỉ."
            ],
            "sections": [
                {
                    "id": "add",
                    "title": "Thêm một ngày hoặc một khoảng nghỉ",
                    "text": "",
                    "steps": [
                        "Trong cửa sổ Tạo lịch học tự động, tìm Các đợt nghỉ rồi bấm Thêm ngày hoặc đợt nghỉ.",
                        "Ở dòng Đợt 1, chọn Từ ngày và Đến ngày. Ví dụ nghỉ riêng ngày 01/01/2027 thì chọn 01/01/2027 ở cả hai đầu.",
                        "Nghỉ liên tiếp nhiều ngày thì chọn ngày đầu và ngày cuối của đợt; cả hai ngày đều thuộc khoảng nghỉ.",
                        "Trong Cách xử lý của dòng đó, chọn phương án phù hợp theo bảng bên dưới. Dòng mới mặc định là Tạo lịch ngày nghỉ và đánh dấu Nghỉ, vì vậy cần kiểm tra trước khi tạo.",
                        "Nếu có đợt khác, bấm Thêm ngày hoặc đợt nghỉ lần nữa và chọn Cách xử lý riêng cho đợt mới. Dùng Xóa trên dòng đợt để bỏ đợt nhập sai."
                    ],
                    "notice": "Nên nhập các đợt không chồng lấn. Chỉ những ngày trùng với ngày được xếp lịch mới ảnh hưởng đến bài/buổi; khai báo ngày nghỉ không có nghĩa là tạo lịch học cho mọi ngày trong khoảng."
                },
                {
                    "id": "handling",
                    "title": "Hai lựa chọn Cách xử lý khác nhau thế nào?",
                    "text": "",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Cách xử lý",
                            "Ngày nghỉ có lịch được tạo?",
                            "Bài/buổi dự kiến vào ngày đó đi đâu?",
                            "Chọn khi"
                        ],
                        "rows": [
                            [
                                "Tạo lịch ngày nghỉ và đánh dấu Nghỉ",
                                "Có, nếu một bài/buổi được xếp trúng ngày nghỉ; lịch đó được đánh dấu Nghỉ.",
                                "Vẫn nằm ở ngày nghỉ và chiếm một vị trí trong chuỗi; các bài/buổi sau tiếp tục. Không tự xếp lại buổi đó sang ngày khác.",
                                "Cần lưu lịch nghỉ trong danh sách và sẽ xử lý lịch bù riêng nếu cần."
                            ],
                            [
                                "Không tạo ngày nghỉ, giữ nguyên thứ tự bài",
                                "Không tạo lịch học cho ngày nghỉ.",
                                "Giữ lại bài/buổi đang chờ, chuyển sang ngày học hợp lệ tiếp theo; các bài/buổi sau được xếp tiếp sau đó.",
                                "Muốn dời nội dung chưa học sang buổi kế tiếp, không mất bài trong chuỗi."
                            ]
                        ]
                    },
                    "notice": "Hai cách không chỉ khác màu hiển thị. Cách thứ nhất giữ lịch Nghỉ của bài đó; cách thứ hai giữ nội dung cần học để xếp sang ngày khác."
                },
                {
                    "id": "example",
                    "title": "Ví dụ: nghỉ Thứ 6 ngày 01/01/2027",
                    "text": "Giả sử lịch chỉ học Thứ 6, 19:00–20:30; Ngày bắt đầu là 01/01/2027; có Bài 1 và Bài 2, mỗi bài đúng một buổi. Chỉ khai báo một ngày nghỉ 01/01/2027, không có đợt nghỉ nào khác.",
                    "steps": [],
                    "table": {
                        "columns": [
                            "Ngày",
                            "Nếu không khai báo ngày nghỉ",
                            "Tạo lịch ngày nghỉ và đánh dấu Nghỉ",
                            "Không tạo ngày nghỉ, giữ nguyên thứ tự bài"
                        ],
                        "rows": [
                            [
                                "Thứ 6, 01/01/2027",
                                "Bài 1 học bình thường.",
                                "Bài 1 được tạo và đánh dấu Nghỉ.",
                                "Không tạo lịch học; Bài 1 vẫn chờ được xếp."
                            ],
                            [
                                "Thứ 6, 08/01/2027",
                                "Bài 2.",
                                "Bài 2. Không tự thêm một buổi bù cho Bài 1.",
                                "Bài 1."
                            ],
                            [
                                "Thứ 6, 15/01/2027",
                                "Không còn bài trong ví dụ.",
                                "Không còn bài trong ví dụ.",
                                "Bài 2."
                            ]
                        ]
                    },
                    "notice": "Nếu muốn Bài 1 vẫn được học sau đợt nghỉ trong chuỗi đang tạo, chọn Không tạo ngày nghỉ, giữ nguyên thứ tự bài. Nếu chọn tạo lịch Nghỉ, cần xử lý buổi bù riêng sau đó nếu có nhu cầu."
                },
                {
                    "id": "next-date",
                    "title": "Ngày học kế tiếp không nhất thiết là ngày hôm sau",
                    "text": "Ngày học hợp lệ là ngày phù hợp với các thứ học và tần suất đã cấu hình, đồng thời không thuộc đợt được chọn bỏ qua. Trong ví dụ chỉ học Thứ 6, bỏ ngày 01/01 thì ngày kế tiếp là 08/01, không phải 02/01.",
                    "steps": [
                        "Nếu toàn bộ các ngày học trong một đợt đều được chọn Không tạo ngày nghỉ, giữ nguyên thứ tự bài, nội dung tiếp tục được giữ lại cho đến ngày học hợp lệ sau đợt đó.",
                        "Với Topclass, khi dùng cách bỏ qua ngày nghỉ, buổi có thể chuyển sang thứ học kế tiếp trong lịch tuần, không nhất thiết chờ đúng thứ cũ. Ví dụ lịch có Thứ 6 và Chủ nhật: buổi đang chờ có thể chuyển từ Thứ 6 nghỉ sang Chủ nhật nếu ngày đó hợp lệ.",
                        "Rà lại Bắt đầu, Kết thúc, Giáo viên và Trợ giảng của buổi chuyển ngày vì khung giờ và nhân sự có thể theo thứ học mới.",
                        "Với Topuni, kiểm tra thêm Tần suất học để bảo đảm ngày sau đợt nghỉ vẫn đúng chu kỳ đã chọn."
                    ]
                },
                {
                    "id": "preview",
                    "title": "Phân biệt dòng nhắc ngày nghỉ và lịch được tạo",
                    "text": "",
                    "steps": [
                        "Bấm Xem trước … lịch sau khi khai báo Các đợt nghỉ.",
                        "Với Tạo lịch ngày nghỉ và đánh dấu Nghỉ, tìm dòng của bài/buổi rơi vào ngày nghỉ và kiểm tra trạng thái nghỉ. Xem tiếp các dòng sau để biết chuỗi đã chuyển sang bài/buổi nào.",
                        "Với Không tạo ngày nghỉ, giữ nguyên thứ tự bài, bản xem trước có thể chèn dòng “Ngày nghỉ – buổi học được chuyển sang ngày kế tiếp” để nhắc mốc nghỉ. Dòng này không phải lịch học sẽ được tạo và không tính vào số lịch xác nhận.",
                        "Tìm lại bài/buổi đáng lẽ học vào ngày nghỉ: phải thấy nó ở ngày học hợp lệ tiếp theo, rồi mới đến bài/buổi kế tiếp trong chuỗi.",
                        "Kiểm tra tên bài, ngày giờ, nhân sự và ngày cuối chuỗi. Nếu sửa đợt nghỉ hoặc Cách xử lý, xem trước lại; chỉ bấm Xác nhận tạo … lịch khi kết quả đúng."
                    ]
                }
            ]
        }
    ]
};
