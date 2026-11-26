# Bộ Tài liệu Dự án: DiVA Vision Explorer Quiz (MMV Vision 2035)

Thư mục `doc/` chứa toàn bộ tài liệu phân tích, đặc tả yêu cầu phần mềm (SRS), kiến trúc **Supabase (Free Tier)**, thiết kế chức năng & UI/UX, và kế hoạch kiểm thử cho dự án.

---

## Cấu trúc Tài liệu

### 00. Tổng quan Nhanh (Executive Plan)
- [implementation_plan.md](./implementation_plan.md) — Bản kế hoạch tổng hợp (đã chuyển sang Supabase + so sánh Supabase vs Google Sheets) & các điểm cần chốt.

### 01. Phân tích Dự án (`01_Project_Analysis/`)
- [01_Project_Overview_and_Context.md](./01_Project_Analysis/01_Project_Overview_and_Context.md) — Bối cảnh MMV Vision 2035, phân tích đối tượng Genba vs Văn phòng, so sánh Web App + Supabase vs MS Forms / Google Sheets.
- [02_Excel_Data_Audit.md](./01_Project_Analysis/02_Excel_Data_Audit.md) — Kiểm toán chi tiết 6 sheet & danh sách 30 câu hỏi (`A01`–`A15`, `B01`–`B15`), các câu `A05*`/`B05*` và hình ảnh cần bổ sung.
- [03_Risk_Analysis_and_Mitigation.md](./01_Project_Analysis/03_Risk_Analysis_and_Mitigation.md) — Đánh giá rủi ro (Supabase Free 7-day pause, giới hạn 500MB/5GB Egress, Genba không có email, rớt mạng, gian lận) & giải pháp.

### 02. Đặc tả Yêu cầu Phần mềm — SRS (`02_SRS/`)
- [01_SRS_Functional_Requirements.md](./02_SRS/01_SRS_Functional_Requirements.md) — Danh mục yêu cầu chức năng (`FR-AUTH`, `FR-QUIZ`, `FR-LOG`, `FR-REVIEW`, `FR-ADMIN`, `FR-REPORT`).
- [02_SRS_Non_Functional_and_Security.md](./02_SRS/02_SRS_Non_Functional_and_Security.md) — Yêu cầu hiệu năng Mobile, bảo mật đáp án bằng PostgreSQL RLS/RPC & Ma trận phân quyền RBAC.
- [03_Business_Rules_and_Scoring.md](./02_SRS/03_Business_Rules_and_Scoring.md) — Quy tắc cấu trúc đề `5-6-4`, chấm điểm, điều kiện lượt hợp lệ & công thức xét giải *Vision Champion* / *Vision Engagement*.

### 03. Kiến trúc & Cơ sở Dữ liệu Supabase (`03_Architecture_and_Data/`)
- [01_System_Architecture.md](./03_Architecture_and_Data/01_System_Architecture.md) — So sánh chi tiết **Supabase Free vs Google Sheets Realtime**, kiến trúc tổng thể, Sequence Diagram & tùy chọn Sync kết quả sang Google Sheet.
- [02_Supabase_Database_Schema_and_RLS.md](./03_Architecture_and_Data/02_Supabase_Database_Schema_and_RLS.md) — Thiết kế chi tiết 6 bảng PostgreSQL, Index, RLS Policies, Storage Bucket `quiz-assets` & RPC Functions.
- [03_Action_Tracking_Specification.md](./03_Architecture_and_Data/03_Action_Tracking_Specification.md) — Đặc tả lưu từng hành động (`EventTaxonomy`, LocalStorage Buffer & Batch Sync qua RPC).

### 04. Chức năng Phát triển & Thiết kế UI/UX (`04_Features_and_UIUX/`)
- [01_Player_Quiz_Features.md](./04_Features_and_UIUX/01_Player_Quiz_Features.md) — Chi tiết 3 chặng `LOOK – THINK – CONNECT`, 5 dạng câu hỏi tương tác & màn hình giải thích học tập.
- [02_Admin_and_RBAC_Features.md](./04_Features_and_UIUX/02_Admin_and_RBAC_Features.md) — Chi tiết Cổng quản trị: Realtime Dashboard, Ngân hàng câu hỏi + Live Preview, Action Timeline Inspector, Campaign & RBAC.
- [03_UIUX_DiVA_Design_System.md](./04_Features_and_UIUX/03_UIUX_DiVA_Design_System.md) — Design System trích xuất từ 3 ảnh DiVA (Color Tokens, Typography, Mascot State Machine, Layout Mobile-first).

### 05. Lộ trình & Kiểm thử (`05_Delivery_and_QA/`)
- [01_Implementation_Roadmap.md](./05_Delivery_and_QA/01_Implementation_Roadmap.md) — Lộ trình 4 giai đoạn triển khai với Supabase & Vercel/Cloudflare.
- [02_UAT_and_Test_Plan.md](./05_Delivery_and_QA/02_UAT_and_Test_Plan.md) — Kịch bản kiểm thử chức năng, kiểm thử RLS/Action Log & UAT thực tế tại xưởng Genba.
