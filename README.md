# DiVA Vision Explorer Quiz — MMV Vision 2035

Ứng dụng Web Form Quiz nội bộ công ty tích hợp **React + TypeScript + Tailwind CSS + shadcn/ui** và **Supabase (PostgreSQL + RLS + RPC + Storage + Realtime)**.

## Tính năng chính
- **Giao diện Quiz DiVA (Mobile-first)**:
  - 3 chặng trải nghiệm: **LOOK (5 câu) → THINK (6 câu) → CONNECT (4 câu)** cùng linh vật Tắc kè hoa **DiVA** đổi biểu cảm theo ngữ cảnh.
  - Hỗ trợ 5 dạng câu hỏi: `SINGLE_CHOICE`, `IMAGE_CHOICE`, `MULTI_FILL_BLANK` (A–F), `TRUE_FALSE`, `SPOT_DIFFERENCE`.
  - Lưu nháp & tự khôi phục bài thi khi mất mạng/F5 (`Auto-Resume`).
  - Hiển thị kết quả từng chặng, đáp án đúng & giải thích ngay sau khi nộp bài.
- **Lưu vết từng hành động (Action Telemetry)**:
  - Ghi nhận `SESSION_START`, `STAGE_ENTER`, `QUESTION_VIEW`, `OPTION_SELECT`, `OPTION_CHANGE`, `ANSWER_SUBMIT`, `TAB_BLUR`/`TAB_FOCUS`, `QUIZ_SUBMIT`, `EXPLANATION_VIEW` kèm `time_spent_ms`.
- **Cổng Quản trị & Phân quyền RBAC (`/admin`)**:
  - 4 vai trò: `employee`, `reviewer`, `hr_viewer`, `admin`.
  - Dashboard KPI & bảng xét giải **Vision Champion Award** / **Vision Engagement Award (%)**, xuất Excel 3 sheet.
  - Ngân hàng câu hỏi + Live Preview Mobile + Quy trình duyệt + Import Excel.
  - Action Inspector soi Timeline từng thao tác của từng nhân viên + Admin Audit Logs + QR Code cho xưởng Genba.
- **Cổng Đăng nhập Bí mật (`/secret-login`)**:
  - Cho phép Admin/HR/Reviewer đăng nhập Supabase Auth hoặc chuyển đổi nhanh các Role ở chế độ Demo Local (mã mở khóa mặc định: `DIVA2035`).

## Chạy thử ngay trên máy (Local Demo Mode)
Không cần cấu hình Supabase vẫn chạy được đầy đủ tính năng với bộ 30 câu hỏi từ Excel:
```bash
npm install
npm run dev
```
- Trang làm Quiz: `http://localhost:5173/` (mã NV thử: `MMV0101`, `MMV0102`, `MMV0201`)
- Cổng Đăng nhập Bí mật: `http://localhost:5173/secret-login` (mã mở khóa: `DIVA2035`)

## Kết nối Supabase (Production)
1. Tạo project miễn phí trên [Supabase](https://supabase.com).
2. Vào **SQL Editor**, chạy lần lượt:
   - `supabase/migrations/001_init.sql` (6 bảng, RLS, 4 RPC functions, bucket `quiz-assets`)
   - `supabase/seed.sql` (chiến dịch mặc định, nhân sự mẫu & 30 câu hỏi từ Excel)
3. Copy `.env.example` thành `.env` và điền `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Tạo user Admin trong **Supabase Auth → Users**, sau đó gắn `auth_user_id` của user đó vào dòng `MMV0001` trong bảng `users_roles`.

## Tài liệu dự án
Xem đầy đủ phân tích, SRS, thiết kế DB & kế hoạch QA tại thư mục [`doc/`](./doc/README.md).
