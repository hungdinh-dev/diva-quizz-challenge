# Kế hoạch Triển khai Web App: DiVA Vision Explorer Quiz (MMV Vision 2035)

Tài liệu này tổng hợp kiến trúc và kế hoạch xây dựng hệ thống Web Quiz **DiVA Vision Explorer** sử dụng **Supabase (Free Tier)** làm Backend/Database/Auth/Storage thay cho SharePoint, dựa trên [MMV_Vision_Quiz_2_Bo_De_Xuat_Bo_Sung_Concept (1).xlsx](../MMV_Vision_Quiz_2_Bo_De_Xuat_Bo_Sung_Concept%20(1).xlsx) và 3 bản thiết kế Mascot / UI trong workspace.

---

## 1. Phân tích & Hiểu biết từ File Excel + Bộ ảnh Thiết kế

### 1.1. Nội dung từ file Excel (`MMV_Vision_Quiz_2_Bo_De_Xuat_Bo_Sung_Concept (1).xlsx`)
File gồm 6 sheet định nghĩa đầy đủ chương trình **“Khám phá Vision 2035 – Hiểu Vision, vui cùng MMV!”**:
- **Ngân hàng câu hỏi hiện có (30 câu chia làm 2 bộ, hiện ở trạng thái `Chưa duyệt`)**:
  - **Bộ A (`Vision Explorer`)**: 15 câu (`A01`–`A15`).
  - **Bộ B (`Vision Think & Act`)**: 15 câu (`B01`–`B15`).
  - Mỗi bộ có cấu trúc chuẩn **15 câu** chia làm **3 chặng**:
    - **Chặng 1 — LOOK (5 câu)**: Nhìn và nhận diện hình ảnh, biểu tượng (5X: BX, CX, DX, FX, GX), 3C with I, linh vật Tắc kè hoa DiVA, điền khuyết thông điệp, tìm điểm khác biệt.
    - **Chặng 2 — THINK (6 câu)**: Hiểu ý nghĩa Vision 2035, Localization (*DiVA = Discover Vietnam Autonomously*), *Agility*, *Gritty Joy*, *Company of Choice*, *Beyond All Growth*, *Challenge*, *Commitment*.
    - **Chặng 3 — CONNECT (4 câu)**: Tình huống công việc thực tế gắn với GX, CX, Integrity, Commitment, Gritty Joy, DiVA.
  - **Điểm cần lưu ý trong dữ liệu**: Câu `A05` (đáp án `A*` – cần dựng hình B thiếu một giá trị rồi khóa đáp án) và câu `B05` (đáp án `A*` – cần xác nhận biểu tượng Challenge trên hình chính thức). Chi tiết xem tại [02_Excel_Data_Audit.md](./01_Project_Analysis/02_Excel_Data_Audit.md).
- **8 Concept dạng câu hỏi (`8 Concepts`)**: *Vision Detective*, *Missing Piece*, *Match the Vision*, *Vision at Work*, *Spot the Difference*, *Vision Myth Buster*, *Choose the Picture*, *Vision Final Challenge*.
- **Trải nghiệm, thiết bị & giải thưởng**:
  - Thời lượng: **8–10 phút / 15 câu**. Ngôn ngữ: **Tiếng Việt**. **Ưu tiên Mobile** (tiếp cận dễ dàng cho cả nhân viên Genba & văn phòng).
  - Sau khi hoàn thành phải **hiển thị đáp án đúng + giải thích** để biến quiz thành công cụ học Vision.
  - Hình ảnh nhận diện trong câu hỏi **bắt buộc dùng ảnh gốc từ Poster / e-Document Vision 2035**.
  - **2 hạng mục giải thưởng**:
    - **Vision Champion Award**: Điểm số cao nhất; nếu đồng điểm thì xét thời gian làm bài nhanh hơn.
    - **Vision Engagement Award**: **Tỷ lệ (%) tham gia hợp lệ theo từng bộ phận**, công bằng giữa phòng ban lớn và nhỏ.

### 1.2. Thiết kế Giao diện & Mascot từ 3 file ảnh
- **Mascot DiVA** ([diva_character_blueprint.png](../assets/diva_character_blueprint.png) & [diva_emotion_expressions.png](../assets/diva_emotion_expressions.png)): Tắc kè hoa đội nón lá đỏ sao vàng, bảng màu chuẩn (`#8BC34A`, `#FFD54F`, `#FF8A00`, `#E53935`, `#FFEB3B`, `#42A5F5`, `#AB47BC`, `#FF6F91`, `#212121`), cùng bộ 8–11 biểu cảm/tư thế.
- **Mockup UI 4 màn hình** ([diva_quiz_ui_mockup.png](../assets/diva_quiz_ui_mockup.png)): Phong cách thẻ bài truyện tranh nền giấy parchment ấm, ruy-băng đỏ chữ vàng, tiến độ chấm tròn, và màn hình Chặng 2 THINK dạng điền nhiều chỗ trống (A–F).

---

## 2. So sánh Công nghệ Lưu trữ: Supabase (Free) vs Google Sheets Realtime

| Tiêu chí | Supabase (Free Tier) — **Khuyên dùng** | Google Sheets (Realtime / Apps Script) |
| :--- | :--- | :--- |
| **Lưu từng hành động (Action Logs)** | **Rất tốt**: PostgreSQL xử lý hàng chục nghìn dòng (`15 câu × ~5 events/câu × 500 người = 37.500+ dòng`) cực nhanh, có Index & Batch Insert. | **Kém**: Vượt vài nghìn dòng bắt đầu chậm; giới hạn API (~60 req/phút/user) dễ nghẽn khi nhiều nhân viên bấm cùng lúc. |
| **Phân quyền (Admin, Reviewer, HR, Employee)** | **Chuẩn thực tế**: Có sẵn **Supabase Auth + Row Level Security (RLS)** bảo vệ quyền truy cập ở tầng Database. | **Rất hạn chế**: Không có RBAC thực thụ; dễ xung đột hoặc lộ cấu trúc nếu gọi từ frontend. |
| **Bảo mật đáp án khi đang thi (F12)** | **Tuyệt đối**: Dùng **PostgreSQL RPC Function** chỉ trả đề thi (không kèm đáp án), chấm điểm hoàn toàn phía server khi bấm Nộp bài. | **Khó bảo mật** nếu đọc trực tiếp từ web; phải qua Apps Script trung gian vốn có độ trễ cao (1.5–3s/call). |
| **Lưu ảnh gốc Vision 2035 & Mascot** | Có sẵn **Supabase Storage (1 GB)** + CDN tải ảnh nhanh trên Mobile. | Không có Storage (phải nhúng link Google Drive dễ lỗi hiển thị/chậm trên Mobile). |
| **Báo cáo & Realtime cho HR** | Có **Supabase Realtime** cập nhật Dashboard trực tiếp + nút **Export Excel** chuẩn nhiều sheet (hoặc đẩy 1 chiều kết quả tổng hợp sang Google Sheet nếu HR thích xem trên Sheet). | HR xem trực tiếp trên Sheet quen thuộc, nhưng dễ bị sửa nhầm công thức/dữ liệu thô. |
| **Chi phí & Giới hạn Free** | **0đ**: 500 MB DB, 1 GB Storage, 50.000 MAU, 5 GB Egress/tháng. *(Lưu ý: tự sleep nếu 7 ngày không có truy cập — tránh bằng cron ping nhẹ hoặc unpause trước đợt thi)*. | **0đ**, không sleep, nhưng quota API thấp & không phù hợp làm backend web có RBAC. |

> **Kết luận**: Chọn **Supabase (Free Tier)** làm nền tảng chính cho toàn bộ Web App. Nếu bộ phận HR vẫn muốn xem bảng kết quả tổng hợp nhảy số realtime trên Google Sheets, có thể bổ sung **1 Webhook/Edge Function đẩy 1 chiều dòng kết quả cuối (`quiz_attempts`) sang Google Sheet** như một màn hình báo cáo phụ.

---

## 3. Kiến trúc Hệ thống & Thiết kế Dữ liệu Supabase

### 3.1. Stack Công nghệ Đề xuất
- **Frontend**: **React + TypeScript + Vite + Tailwind CSS** (host miễn phí trên **Vercel** hoặc **Cloudflare Pages** — tải cực nhanh trên Mobile khi công nhân Genba quét mã QR).
- **Backend / Database / Auth / Storage**: **Supabase (Free Tier)**:
  - **PostgreSQL + RLS + RPC Functions**: Lưu trữ dữ liệu, kiểm soát phân quyền và chấm điểm phía server.
  - **Supabase Auth**: Đăng nhập Email/Password hoặc Google/Microsoft OAuth cho Admin, Reviewer, HR; kết hợp **luồng xác thực nhanh bằng Mã nhân viên (`EmployeeCode`)** qua RPC/Edge Function cho khối Genba không có email công ty.
  - **Supabase Storage (`quiz-assets` bucket)**: Lưu ảnh Mascot DiVA & ảnh cắt từ Poster Vision 2035 (định dạng WebP tối ưu dung lượng).
  - **Supabase Realtime**: Cập nhật KPI, tỷ lệ % phòng ban và bảng xếp hạng trên Dashboard Admin theo thời gian thực.

### 3.2. Thiết kế 6 Bảng PostgreSQL Chính
1. `users_roles`: Danh sách nhân sự toàn công ty (`employee_code`, `full_name`, `email`, `department`, `employee_type`: `Genba`/`Office`/`Management`, `role`: `employee`/`reviewer`/`hr_viewer`/`admin`, `is_active`).
2. `campaigns`: Cấu hình đợt thi (`quiz_mode`, `stage_mix`, `max_attempts`, `min_valid_seconds`, `start_at`, `end_at`, `status`, `show_leaderboard`).
3. `questions`: Ngân hàng câu hỏi (`question_code`, `source_set`, `stage`, `concept`, `question_type`, `prompt_text`, `options_json`, `correct_answer_json`, `explanation`, `media_urls_json`, `shuffle_options`, `mascot_pose`, `review_status`, `reviewer_note`).
4. `quiz_attempts`: Tổng hợp từng lượt thi (`attempt_id`, `campaign_id`, `employee_code`, `department`, `attempt_number`, `status`, `selected_questions_json`, `draft_answers_json`, `final_answers_json`, `score`, `score_by_stage`, `duration_seconds`, `tab_switch_count`, `is_valid_for_award`, `device_type`).
5. `quiz_action_logs`: **Lưu từng hành động của từng người** (`attempt_id`, `employee_code`, `question_code`, `stage`, `event_type`, `event_payload`, `time_spent_ms`, `event_time`, `client_seq`) — đồng bộ theo **Batch** qua RPC khi chuyển câu/nộp bài + buffer `localStorage` chống rớt mạng.
6. `admin_audit_logs`: Nhật ký mọi thao tác quản trị của Admin & Reviewer (`actor_id`, `action_type`, `target_id`, `changes_json`, `created_at`).

---

## 4. Giao diện, Phân quyền & Chức năng Thực tế

- **Phân hệ Người làm Quiz (Mobile-First + DiVA Comic UI)**:
  - Màn hình Chào → Chặng 1 `LOOK` (5 câu) → Chặng 2 `THINK` (6 câu) → Chặng 3 `CONNECT` (4 câu) → Kết quả & Xem lại 15 câu kèm Giải thích chi tiết.
  - Hỗ trợ đầy đủ 5 kiểu câu hỏi (`SINGLE_CHOICE`, `IMAGE_CHOICE`, `MULTI_FILL_BLANK`, `TRUE_FALSE`, `SPOT_DIFFERENCE`).
  - Mascot DiVA đổi biểu cảm theo ngữ cảnh (`Presenting`, `Explore`, `Thinking`, `Curious`, `Cheering`...).
- **Phân hệ Quản trị (`/admin` — RBAC 4 Vai trò)**:
  - `Employee`: Làm quiz, xem lịch sử & giải thích sau nộp bài.
  - `Reviewer`: Quản lý ngân hàng câu hỏi, upload ảnh lên Storage, xem Live Preview trên khung Mobile, duyệt câu (`Chưa duyệt` → `Đã duyệt`), Import/Export Excel.
  - `HR_Viewer`: Xem Dashboard Realtime, bảng xét giải **Vision Champion** & **Vision Engagement (%)**, xuất báo cáo Excel, xem hành vi làm bài theo phòng ban.
  - `Admin`: Toàn quyền quản lý chiến dịch, sinh QR code cho xưởng Genba, phân quyền user, soi **Action Timeline từng giây** của từng nhân viên, duyệt/hủy tư cách lượt thi (`is_valid_for_award`), xem `admin_audit_logs`, và tùy chọn bật sync kết quả tổng hợp sang Google Sheet.

---

## 5. Lộ trình Triển khai (~2.5 – 3 tuần)
1. **Giai đoạn 1 (2–3 ngày)**: Khởi tạo Supabase Project + chạy SQL Schema/RLS/RPC, chuẩn hóa 30 câu Excel (xử lý `A05*`, `B05*`, gom ảnh gốc Poster Vision 2035 & tách sprite DiVA).
2. **Giai đoạn 2 (4–5 ngày)**: Dựng Frontend React/TS/Tailwind, tích hợp Auth (Email/OAuth + Mã NV Genba), Action Buffer & Batch Sync lên `quiz_action_logs`, cơ chế Auto-Resume chống rớt mạng.
3. **Giai đoạn 3 (4–5 ngày)**: Hoàn thiện giao diện Quiz 3 chặng DiVA Vision Explorer, 5 dạng câu hỏi, màn hình kết quả + giải thích, tối ưu Mobile.
4. **Giai đoạn 4 (3–4 ngày)**: Hoàn thiện Admin Portal (Realtime Dashboard, Question Bank + Excel Import/Export, Action Timeline Inspector, RBAC) & chạy UAT thử nghiệm với nhân viên Genba/Văn phòng.

---

## 6. Các điểm cần bạn chốt trước khi bắt tay code

1. **Cách vào làm bài cho khối Genba**: Nhân viên xưởng chỉ cần nhập **Mã nhân viên** (hoặc thêm 4 số cuối ngày sinh để tránh nhập nhầm mã người khác) là vào làm ngay, đúng không?
2. **Có cần đồng bộ thêm sang Google Sheet không**: Bạn muốn dùng hoàn toàn Dashboard + nút Export Excel trên Web Admin (đủ và sạch nhất), hay muốn kết nối thêm Webhook đẩy dòng kết quả tổng hợp sang một file Google Sheet cho HR xem song song?
3. **Nguồn ảnh gốc**: Các ảnh cắt từ `Giải thích tầm nhìn MMV 2035 (VN).pptx` (5X, 3C with I, hình tình huống) khi nào có thể bổ sung để đưa vào `quiz-assets`?
4. **Quy tắc làm lại**: Cho phép nhân viên làm nhiều lần để học lại Vision nhưng **chỉ tính điểm lượt đầu tiên** vào bảng xét giải, hay khóa chỉ cho làm 1 lượt?
