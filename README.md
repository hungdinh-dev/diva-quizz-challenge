# DiVA Vision Explorer Quiz — MMV Vision 2035

Ứng dụng Web Form Quiz nội bộ công ty tích hợp **React + TypeScript + Tailwind CSS + shadcn/ui** và **Supabase (PostgreSQL + RLS + RPC + Storage + Realtime)**.

## Tính năng chính
- **Giao diện Quiz DiVA (Mobile-first)**:
  - 3 chặng trải nghiệm: **LOOK (5 câu) → THINK (6 câu) → CONNECT (4 câu)** cùng linh vật Tắc kè hoa **DiVA** đổi biểu cảm theo ngữ cảnh.
  - LOOK dùng bộ ảnh lựa chọn, THINK dùng câu hỏi trắc nghiệm, CONNECT cho phép kéo thả hoặc chạm để lập kế hoạch hành động.
  - Lưu nháp & tự khôi phục bài thi khi mất mạng/F5 (`Auto-Resume`).
  - Hiển thị kết quả từng chặng, đáp án đúng & giải thích ngay sau khi nộp bài.
- **Lưu vết từng hành động (Action Telemetry)**:
  - Ghi nhận `SESSION_START`, `STAGE_ENTER`, `QUESTION_VIEW`, `OPTION_SELECT`, `OPTION_CHANGE`, `ANSWER_SUBMIT`, `TAB_BLUR`/`TAB_FOCUS`, `QUIZ_SUBMIT`, `EXPLANATION_VIEW` kèm `time_spent_ms`.
- **Cổng Quản trị & Phân quyền RBAC (`/admin`)**:
  - 4 vai trò: `employee`, `reviewer`, `hr_viewer`, `admin`.
  - Theo dõi nhân sự theo chiến dịch, gồm số người đã xác nhận mã, chưa bắt đầu, đang làm và hoàn thành, cùng điểm, thời lượng, số lần thử lại và nhật ký xác nhận.
  - Dashboard KPI & bảng xét giải **Vision Champion Award** / **Vision Engagement Award (%)**, xuất Excel 3 sheet.
  - Ngân hàng 15 câu hỏi có xem trước giao diện và quy trình duyệt nội dung.
  - Xuất Excel toàn bộ lượt đã nộp theo chiến dịch tại **Theo dõi nhân sự → Xuất kết quả Excel**.
  - Action Inspector soi Timeline từng thao tác của từng nhân viên + Admin Audit Logs + QR Code cho xưởng Genba.
- **Cổng Đăng nhập Bí mật (`/secret-login`)**:
  - Cho phép Admin/HR/Reviewer đăng nhập Supabase Auth hoặc chuyển đổi nhanh các Role ở chế độ Demo Local (mã mở khóa mặc định: `DIVA2035`).

## Chạy thử ngay trên máy (Local Demo Mode)
Chạy Vite ở chế độ phát triển với hai biến Supabase để trống để thử 15 câu hỏi bằng dữ liệu mẫu.
```bash
npm install
npm run dev
```
- Trang làm Quiz: `http://localhost:5173/` (mã NV thử: `MMV0101`, `MMV0102`, `MMV0201`)
- Cổng Đăng nhập Bí mật: `http://localhost:5173/secret-login` (mã mở khóa: `DIVA2035`)

## Kết nối Supabase (Production)
1. Tạo project miễn phí trên [Supabase](https://supabase.com).
2. Áp dụng các migration trong `supabase/migrations/` theo thứ tự phiên bản. Với dự án hiện có, kiểm tra lịch sử migration trước khi chạy tiếp. Triển khai frontend mới cùng migration `20261128114336_employee_quiz.sql` vì migration này khóa RPC bắt đầu bài cũ.
3. Copy `.env.example` thành `.env` và điền `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Tạo user Admin trong **Supabase Auth → Users**, sau đó gắn `auth_user_id` của user đó vào dòng `MMV0001` trong bảng `users_roles`.
5. Đảm bảo có một chiến dịch `Active`. Với cơ sở dữ liệu mới, có thể dùng `supabase/seed.sql` để tạo dữ liệu mẫu trước khi thiết lập tài khoản Admin.
6. Trong **Quản trị → Theo dõi nhân sự**, đăng nhập Admin và tải tệp Excel nhân sự có bốn cột **STT**, **Mã nhân viên**, **Họ và tên**, **Mã công ty**. Hệ thống lưu mã dưới dạng văn bản để giữ các số 0 ở đầu. Admin và HR có quyền xem báo cáo. Chỉ Admin được nhập danh sách.

**Đã vào** đếm số người xác nhận mã thành công ở chiến dịch đang xem. **Chưa làm**, **Đang làm** và **Hoàn thành** dựa trên các lượt làm bài. Mỗi mã nhân viên có một lượt khảo sát duy nhất. Nhân viên có thể tiếp tục lượt đang làm và xem đúng hoặc sai sau khi xác nhận từng câu. Các lượt thử lại từ những đợt trước vẫn có trong báo cáo.

## Tài liệu dự án
Xem đầy đủ phân tích, SRS, thiết kế DB & kế hoạch QA tại thư mục [`doc/`](./doc/README.md).
