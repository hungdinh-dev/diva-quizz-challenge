# 02. Đặc tả Chức năng Quản trị & Phân quyền (Admin, Reviewer & HR Portal)

Trang quản trị (`/admin`) được thiết kế giao diện sạch sẽ, chuyên nghiệp (Admin Dashboard Layout), phân tách menu tự động theo **Role** của người đăng nhập qua Supabase Auth + RLS.

---

## 1. Module 1: Dashboard Tổng quan & Giải thưởng (`/admin/dashboard`)
*Quyền truy cập: `admin`, `hr_viewer`*

- **Thẻ KPI Realtime (Supabase Realtime)**:
  - Tổng nhân viên mục tiêu / Số nhân viên đã hoàn thành hợp lệ / **Tỷ lệ tham gia toàn công ty (%)** (tự cập nhật khi có người nộp bài).
  - Điểm trung bình toàn công ty & điểm trung bình theo 3 chặng (`LOOK`, `THINK`, `CONNECT`) — giúp HR/DiVA Team nhận diện phần nội dung Vision nào nhân viên hay hiểu nhầm nhất.
  - Phân bố thiết bị (`Mobile %` vs `Desktop %`).
- **Tab Bảng Xếp hạng Giải thưởng**:
  - **Vision Engagement Award (Theo Bộ phận)**: Bảng + Biểu đồ cột xếp hạng `% Tham gia hợp lệ` từ cao xuống thấp, hiển thị rõ `(Đã hoàn thành / Tổng nhân sự Active)`.
  - **Vision Champion Award (Theo Cá nhân)**: Danh sách Top thí sinh hợp lệ sắp xếp theo `score DESC, duration_seconds ASC, submitted_at ASC`.
- **Xuất Báo cáo & Đồng bộ Google Sheet**:
  - Nút **Export Excel (.xlsx)** 1 click gồm 4 sheet (`Summary_Department`, `Champion_Ranking`, `All_Attempts`, `Question_Difficulty`).
  - *(Tùy chọn)* Cấu hình **Google Sheet Webhook** để đẩy tự động từng dòng kết quả tổng hợp sang Google Sheet cho HR xem song song.

---

## 2. Module 2: Ngân hàng Câu hỏi & Quy trình Duyệt (`/admin/questions`)
*Quyền truy cập: `admin`, `reviewer`*

- **Danh sách & Bộ lọc thông minh**:
  - Lọc theo Bộ (`Bo_A`, `Bo_B`, `Bo_Sung`), Chặng (`LOOK`, `THINK`, `CONNECT`), Concept (8 concepts), Trạng thái (`Chua_duyet`, `Can_chinh_sua`, `Da_duyet`, `Archived`), hoặc lọc riêng các câu có dấu `*` / thiếu ảnh.
- **Trình Soạn thảo & Upload Ảnh (`QuestionEditorDrawer`)**:
  - Chỉnh sửa nội dung câu hỏi, chọn `question_type`, nhập các phương án A–C hoặc A–F, đánh dấu đáp án đúng, nhập giải thích, chọn pose DiVA.
  - Upload trực tiếp ảnh cắt từ Poster Vision 2035 (tự động nén WebP ở client trước khi đẩy lên **Supabase Storage `quiz-assets`**).
  - **Chế độ Live Preview (Mobile Frame)**: Xem ngay câu hỏi hiển thị thực tế cùng Mascot DiVA ở góc phải màn hình soạn thảo.
- **Quy trình Duyệt (`Review Workflow`)**:
  - Reviewer xem câu hỏi → Bấm **“Phê duyệt (Đã duyệt)”** hoặc **“Yêu cầu chỉnh sửa”** kèm `reviewer_note`.
  - **Import / Export Excel**: Hỗ trợ nạp trực tiếp file Excel cấu trúc tương tự `Bo A` / `Bo B` lên bảng `questions` để khởi tạo nhanh 30+ câu hỏi.

---

## 3. Module 3: Trình Soi Hành động Chi tiết (`/admin/actions`)
*Quyền truy cập: `admin`, `hr_viewer` (HR xem toàn công ty hoặc theo phòng ban tùy cấu hình)*

- **Tra cứu Lượt thi & Action Timeline**:
  - Tìm kiếm theo `employee_code`, `full_name`, `department`, hoặc lọc các lượt **Nghi vấn bất thường** (thời gian quá ngắn, rời tab nhiều lần).
  - Bấm vào 1 dòng `attempt` để mở **Timeline Chi tiết** từ bảng `quiz_action_logs`:
    - Hiển thị từng bước thao tác của người làm từ lúc bấm *Bắt đầu* đến *Xem giải thích*.
    - Highlight những câu người dùng **đổi đáp án nhiều lần (`OPTION_CHANGE`)** hoặc dừng suy nghĩ lâu bất thường.
  - Admin có nút **“Hủy tư cách hợp lệ (`Invalidate`)”** hoặc **“Khôi phục hợp lệ”** (bắt buộc nhập lý do, ghi vào `admin_audit_logs`).
- **Thống kê Hành vi theo Câu hỏi (Question Analytics)**:
  - Câu nào tỷ lệ trả lời đúng thấp nhất?
  - Câu nào có tỷ lệ `OPTION_CHANGE` cao nhất (câu hỏi gây phân vân)?
  - Thời gian trung bình trả lời mỗi câu (giây).

---

## 4. Module 4: Quản lý Chiến dịch & Phân quyền (`/admin/settings`)
*Quyền truy cập: Chỉ `admin`*

- **Cấu hình Chiến dịch (`Campaign Manager`)**:
  - Tạo/Sửa đợt Quiz, chuyển trạng thái `Draft` → `Active` → `Closed`.
  - Chọn chế độ đề (`Set_A`, `Set_B`, `Random_Pool_15`), số lượt tối đa, ngưỡng giây tối thiểu (`min_valid_seconds`), bật/tắt `show_leaderboard`.
  - **Sinh mã QR in poster dán tại xưởng Genba** dẫn thẳng tới link chiến dịch.
- **Quản lý Nhân sự & RBAC (`Users & Roles`)**:
  - Import danh sách nhân sự toàn công ty từ Excel (`employee_code`, `full_name`, `department`, `employee_type`, `email`).
  - Tìm nhân viên và cấp/thu hồi Role (`employee`, `reviewer`, `hr_viewer`, `admin`) — đồng bộ chặt chẽ với Supabase Auth & RLS.
- **Nhật ký Quản trị (`Audit Logs`)**:
  - Xem lịch sử mọi thao tác nhạy cảm của Admin & Reviewer (`actor_email`, `action_type`, `target_id`, `changes_json`, `created_at`).
