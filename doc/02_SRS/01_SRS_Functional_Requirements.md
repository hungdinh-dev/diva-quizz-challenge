# 01. Đặc tả Yêu cầu Chức năng (SRS — Functional Requirements)

## 1. Phân hệ Xác thực & Định danh (`FR-AUTH`)

| Mã | Tên chức năng | Mô tả chi tiết | Đầu vào / Điều kiện | Đầu ra kỳ vọng |
| :--- | :--- | :--- | :--- | :--- |
| **FR-AUTH-01** | Đăng nhập Quản trị & Văn phòng (Supabase Auth) | Dành cho `Admin`, `Reviewer`, `HR_Viewer` và nhân viên Văn phòng bằng Email/Password hoặc OAuth trên Supabase Auth. | Tài khoản đã đăng ký & liên kết với bảng `users_roles`. | Cấp JWT Session của Supabase Auth, tự động kích hoạt chính sách RLS theo đúng `role`. |
| **FR-AUTH-02** | Xác thực nhanh Genba (QR / Mã NV) | Cho phép nhân viên xưởng quét mã QR → nhập `employee_code` + xác nhận `department` (hoặc 4 số cuối ngày sinh nếu bật) qua RPC/Edge Function. | `employee_code` tồn tại trong `users_roles` và `is_active = true`. | Cấp phiên làm bài với Role cố định là `employee` (không bao giờ cấp quyền quản trị qua luồng này). |
| **FR-AUTH-03** | Kiểm soát phân quyền (RBAC Guard + RLS) | Mọi route `/admin/*` kiểm tra Role trên Frontend, đồng thời mọi truy vấn PostgreSQL/Storage bị chặn bởi **Row Level Security (RLS)** ở tầng Database. | User có Role phù hợp (`reviewer`, `hr_viewer`, `admin`). | Từ chối truy cập (`403` / RLS Policy Reject) nếu vượt quyền. |

---

## 2. Phân hệ Làm bài Quiz (`FR-QUIZ`)

| Mã | Tên chức năng | Mô tả chi tiết |
| :--- | :--- | :--- |
| **FR-QUIZ-01** | Màn hình Chào & Thông tin Chiến dịch | Hiển thị tên chương trình, thời lượng gợi ý (`8–10 phút`), cơ cấu `15 câu (5 LOOK + 6 THINK + 4 CONNECT)`, số lượt còn lại của user, nút **“BẮT ĐẦU KHÁM PHÁ”**. |
| **FR-QUIZ-02** | Khởi tạo & Rút đề qua Server RPC | Gọi PostgreSQL RPC `start_quiz_attempt` hỗ trợ 3 chế độ: (1) Bộ A cố định, (2) Bộ B cố định, (3) Rút ngẫu nhiên từ ngân hàng câu `Da_duyet` đúng tỷ lệ `5 LOOK + 6 THINK + 4 CONNECT`. Trả đề thi **không kèm đáp án**. |
| **FR-QUIZ-03** | Điều hướng theo 3 Chặng & Mascot DiVA | Chia luồng bài thi thành 3 chặng rõ ràng (`LOOK` → `THINK` → `CONNECT`). Hiển thị banner chuyển chặng với pose DiVA tương ứng. |
| **FR-QUIZ-04** | Hiển thị Đa dạng 5 Kiểu Câu hỏi | Hỗ trợ: `SINGLE_CHOICE` (A/B/C), `IMAGE_CHOICE` (chọn thẻ hình), `MULTI_FILL_BLANK` (chọn nhiều từ điền vào chỗ trống A–F), `TRUE_FALSE` (Đúng/Chưa đúng), `SPOT_DIFFERENCE` (so sánh 2 ảnh có zoom trên Mobile). |
| **FR-QUIZ-05** | Lưu Nháp & Khôi phục Phiên (Auto-Resume) | Tự động lưu đáp án hiện tại và câu đang làm vào `localStorage` + cập nhật `draft_answers_json` trên `quiz_attempts` (`status = InProgress`). Nếu rớt mạng hoặc F5, mở lại cho phép tiếp tục đúng câu đang dở. |
| **FR-QUIZ-06** | Nộp bài & Phản hồi Học tập (Learning Review) | Khi bấm **“Hoàn thành”**, gọi RPC `submit_quiz_attempt` để chấm điểm tại PostgreSQL, trả về tổng điểm, điểm theo từng chặng, thời gian làm bài, và danh sách toàn bộ 15 câu kèm **đáp án đúng + giải thích** (có bộ lọc *“Chỉ xem câu sai”*). |
| **FR-QUIZ-07** | Lịch sử Làm bài Cá nhân | Nhân viên có thể xem lại các lượt đã làm trước đó của chính mình (chỉ xem đáp án chi tiết khi lượt đã `Completed`). |

---

## 3. Phân hệ Lưu vết Hành động (`FR-LOG`)

| Mã | Tên chức năng | Mô tả chi tiết |
| :--- | :--- | :--- |
| **FR-LOG-01** | Ghi nhận Toàn bộ Sự kiện Tương tác | Tự động ghi nhận: `SESSION_START`, `STAGE_ENTER`, `QUESTION_VIEW`, `OPTION_SELECT`, `OPTION_CHANGE` (lưu lựa chọn cũ → mới), `ANSWER_SUBMIT`, `TAB_BLUR`, `TAB_FOCUS`, `QUIZ_SUBMIT`, `EXPLANATION_VIEW`. |
| **FR-LOG-02** | Đo Thời gian Từng Câu & Từng Chặng | Tính chính xác `time_spent_ms` từ lúc câu hỏi xuất hiện (`QUESTION_VIEW`) đến khi người dùng chuyển câu/nộp (`ANSWER_SUBMIT`). |
| **FR-LOG-03** | Hàng đợi Đồng bộ Batch & Retry | Lưu buffer vào `localStorage`, đẩy lên bảng `quiz_action_logs` qua RPC theo batch khi chuyển câu/chặng/nộp bài. Nếu mạng lỗi, tự động retry khi có mạng lại trước khi kết thúc phiên. |

---

## 4. Phân hệ Quản trị, Duyệt nội dung & Báo cáo (`FR-ADMIN`, `FR-REVIEW`, `FR-REPORT`)

| Mã | Tên chức năng | Quyền sử dụng | Mô tả chi tiết |
| :--- | :--- | :--- | :--- |
| **FR-REVIEW-01** | CRUD Ngân hàng Câu hỏi & Upload Ảnh | `reviewer`, `admin` | Tạo/sửa câu hỏi, chọn Concept (1–8), chọn Stage, upload ảnh gốc (nén WebP) lên Supabase Storage bucket `quiz-assets`. |
| **FR-REVIEW-02** | Quy trình Duyệt & Live Preview | `reviewer`, `admin` | Xem trước câu hỏi hiển thị trên khung Mobile có DiVA; chuyển trạng thái `Chua_duyet` → `Can_chinh_sua` → `Da_duyet` → `Archived`. Chỉ câu `Da_duyet` mới vào pool phát đề. |
| **FR-REVIEW-03** | Import / Export Excel Câu hỏi | `reviewer`, `admin` | Upload file `.xlsx` theo mẫu chuẩn (`Bo A`, `Bo B`) để tạo/cập nhật hàng loạt câu hỏi vào PostgreSQL và xuất ngược ra Excel. |
| **FR-ADMIN-01** | Quản lý Chiến dịch (Campaigns) | `admin` | Tạo đợt thi mới, hẹn giờ mở/đóng (`start_at`, `end_at`), chọn bộ đề/cơ cấu câu hỏi, cấu hình `max_attempts`, bật/tắt `show_leaderboard`, sinh mã QR cho xưởng Genba. |
| **FR-ADMIN-02** | Quản lý Nhân sự & Phân quyền (RBAC) | `admin` | Import danh sách nhân sự từ Excel (`employee_code`, `full_name`, `department`, `employee_type`, `email`), gán/thu hồi Role (`employee`, `reviewer`, `hr_viewer`, `admin`), kích hoạt/vô hiệu hóa tài khoản. |
| **FR-ADMIN-03** | Trình Soi Hành động Chi tiết (Action Inspector) | `admin`, `hr_viewer` *(theo cấu hình)* | Tìm theo nhân viên/lượt thi, hiển thị dòng thời gian từng thao tác từ đầu đến cuối bài, xem số lần đổi đáp án và thời gian dừng ở mỗi câu. |
| **FR-ADMIN-04** | Đánh dấu Lượt Hợp lệ & Xử lý Nghi vấn | `admin` | Tự động gắn cờ các lượt bất thường (thời gian quá ngắn < ngưỡng, chuyển tab quá nhiều); Admin có quyền duyệt hoặc hủy `is_valid_for_award` (có ghi `admin_audit_logs`). |
| **FR-REPORT-01** | Realtime Dashboard & Phân tích Câu hỏi | `hr_viewer`, `admin` | Nhận cập nhật **Supabase Realtime** về tỷ lệ tham gia theo phòng ban, phân bố điểm theo 3 chặng `LOOK/THINK/CONNECT`, top câu hỏi hay sai nhất / hay bị đổi đáp án nhất. |
| **FR-REPORT-02** | Bảng Xét giải Champion & Engagement | `hr_viewer`, `admin` | Tự động tính xếp hạng **Vision Champion Award** (Điểm + Duration tie-break) và **Vision Engagement Award** (`% tham gia hợp lệ / tổng nhân sự phòng`). |
| **FR-REPORT-03** | Xuất Báo cáo Excel / Sync Google Sheet (Tùy chọn) | `hr_viewer`, `admin` | Xuất file `.xlsx` nhiều sheet (Tổng hợp, Phòng ban, Xếp hạng, Action Logs thô); tùy chọn cấu hình Webhook đẩy dòng kết quả tổng hợp sang Google Sheet để HR xem song song. |
