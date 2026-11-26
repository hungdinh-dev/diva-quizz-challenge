# 01. Lộ trình Triển khai Chi tiết (Implementation Roadmap)

Tổng thời gian dự kiến: **~2 – 2.5 tuần (4 Sprint nhỏ)** cho phiên bản V1 hoàn chỉnh chạy trên **Supabase Free + Vercel/Cloudflare Pages**.

---

## Phase 1: Khởi tạo Supabase, Schema & Chuẩn hóa Dữ liệu (Ngày 1–2)
- [ ] Chốt hình thức xác thực khối Genba (Mã NV đơn thuần hay Mã NV + 4 số ngày sinh) và quyết định có bật đồng bộ phụ sang Google Sheet hay không.
- [ ] Tạo Project **Supabase Free**, chạy migration SQL tạo **6 bảng PostgreSQL**, Index, **RLS Policies**, **4 RPC Functions** (`genba_verify_employee`, `start_quiz_attempt`, `flush_quiz_actions`, `submit_quiz_attempt`) và bucket `quiz-assets`.
- [ ] Cắt/tách sprite Mascot DiVA (8–11 biểu cảm/poses) từ 2 file thiết kế, nén WebP nhẹ.
- [ ] Thu thập ảnh gốc từ `Giải thích tầm nhìn MMV 2035 (VN).pptx`, dựng hình B cho câu `A05*`, xác nhận icon Challenge cho `B05*`.

## Phase 2: Khung Ứng dụng, Auth & Action Telemetry Engine (Ngày 3–6)
- [ ] Khởi tạo dự án **React + TypeScript + Vite + Tailwind CSS** kết nối `@supabase/supabase-js`.
- [ ] Triển khai xác thực (Supabase Auth cho Admin/HR/Reviewer + Genba QR/EmployeeCode) và **RBAC Guard**.
- [ ] Xây dựng cơ chế **LocalStorage Action Buffer + Milestone Batch Sync + Retry** gọi RPC `flush_quiz_actions` và `submit_quiz_attempt`.
- [ ] Xây dựng cơ chế Auto-Resume khôi phục bài thi khi mất mạng hoặc F5.

## Phase 3: Giao diện Quiz DiVA Vision Explorer (Ngày 7–11)
- [ ] Xây dựng Design System DiVA (bảng màu chuẩn, nền parchment, ruy-băng đỏ, font tiếng Việt, hard shadow comic).
- [ ] Màn hình Chào, màn hình Chuyển chặng, Mascot State Machine đổi biểu cảm theo ngữ cảnh.
- [ ] Triển khai đầy đủ 5 loại component câu hỏi (`SINGLE_CHOICE`, `IMAGE_CHOICE`, `MULTI_FILL_BLANK`, `TRUE_FALSE`, `SPOT_DIFFERENCE`).
- [ ] Màn hình Kết quả, phân tích điểm 3 chặng, danh sách xem lại 15 câu kèm giải thích & bộ lọc câu sai.
- [ ] Tối ưu responsive Mobile-first (chạm mượt, phóng to ảnh câu `LOOK`).

## Phase 4: Cổng Quản trị, Báo cáo Giải thưởng & UAT (Ngày 12–16)
- [ ] Xây dựng **Realtime Dashboard** KPI, Bảng xếp hạng **Vision Champion** & **Vision Engagement (%)**, nút Export Excel (và tùy chọn Webhook Google Sheet).
- [ ] Xây dựng **Question Bank Manager** (Import/Export Excel, Upload ảnh nén WebP lên Storage, Live Preview, Review Workflow).
- [ ] Xây dựng **Action Timeline Inspector** & **Campaign / RBAC Manager** + `admin_audit_logs`.
- [ ] Thiết lập cron ping nhẹ giữ Supabase Free không sleep sau 7 ngày, chạy **UAT thực tế** với nhóm thử nghiệm Genba & Văn phòng (đo thời lượng mục tiêu 8–10 phút) trước khi Go-Live.
