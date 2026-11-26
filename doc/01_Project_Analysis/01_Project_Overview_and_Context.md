# 01. Phân tích Bối cảnh & Tổng quan Dự án (Project Overview & Context)

## 1. Bối cảnh & Mục tiêu Chương trình
Dự án xây dựng nền tảng Web Form Quiz **“DiVA Vision Explorer — Khám phá Vision 2035 – Hiểu Vision, vui cùng MMV!”** nhằm truyền thông và lan tỏa **MMV Vision 2035** đến toàn thể cán bộ công nhân viên (CBCNV) tại công ty.

- **Tên nội bộ**: *VISION DISCOVERY CHALLENGE* (DiVA Team – bản đề cử V1).
- **Ý nghĩa cốt lõi của DiVA**: *Discover Vietnam Autonomously* — Khám phá nội lực Việt, dẫn dắt hành trình đổi mới (lần đầu tiên Vision được chính đội ngũ địa phương chủ động suy nghĩ, thảo luận và xây dựng với sự hỗ trợ từ đồng nghiệp Nhật).
- **Triết lý thiết kế trải nghiệm**: Không biến bài kiểm tra thành hình thức thi cử áp lực (*“Bạn có nhớ Vision không?”*), mà tạo hành trình khám phá gần gũi để nhân viên tự nhận ra: *“À, hóa ra công việc mình đang làm hằng ngày cũng liên quan trực tiếp đến Vision!”*.

---

## 2. Phân tích Đối tượng Người dùng (Stakeholders & Personas)

| Nhóm đối tượng | Đặc điểm môi trường làm việc | Nhu cầu & Khó khăn thực tế | Yêu cầu thiết kế đáp ứng |
| :--- | :--- | :--- | :--- |
| **Nhân viên Trực tiếp (Genba / Xưởng)** | Làm việc theo ca tại xưởng, ít sử dụng máy tính công ty, chủ yếu dùng điện thoại cá nhân, có thể chưa có email công ty. | Dễ bỏ cuộc nếu form dài, chữ nhỏ, bắt đăng nhập phức tạp hoặc mạng Wi-Fi/4G chập chờn. | **Mobile-first UI**, quét QR nhập nhanh Mã nhân viên, nút bấm lớn, thời lượng 8–10 phút, lưu nháp chống mất bài khi rớt mạng. |
| **Nhân viên Gián tiếp (Văn phòng)** | Sử dụng laptop/PC hằng ngày. | Cần giao diện đẹp, trực quan, làm được cả trên PC lẫn Mobile; muốn xem giải thích sâu về 5X, 3C with I, DiVA. | Responsive cả Desktop lẫn Mobile; hiển thị đáp án + giải thích ngay sau khi hoàn thành. |
| **Cấp Quản lý / HR** | Cần theo dõi tỷ lệ tham gia theo từng phòng ban, thúc đẩy engagement công bằng giữa phòng to và phòng nhỏ. | Khó tổng hợp dữ liệu thủ công nếu dùng Google Forms/Sheet thuần túy (khó tính `%` theo danh sách nhân sự, dễ sai công thức, không xem được hành vi làm bài). | Dashboard **Realtime** theo bộ phận, tự động tính `% tham gia hợp lệ`, xuất Excel chỉ 1 click (kèm tùy chọn đồng bộ 1 chiều ra Google Sheet). |
| **Ban Tổ chức / Reviewer / Admin** | Quản lý ngân hàng câu hỏi, duyệt nội dung từ Excel, gắn ảnh gốc Vision 2035, kiểm tra tính công bằng khi xét giải *Vision Champion*. | Cần quy trình duyệt câu hỏi an toàn, xem trước giao diện thật, và kiểm tra chi tiết từng hành động của người thi khi có tranh chấp hoặc đồng điểm. | Trang Admin với RBAC đầy đủ (`Supabase Auth + RLS`), Action Timeline Inspector, Workflow duyệt câu hỏi, Audit Log. |

---

## 3. Phân tích Lựa chọn Nền tảng: Supabase (Free) vs Google Sheets

1. **Lưu vết từng hành động (Granular Action Telemetry)**:
   - Mỗi người làm 15 câu phát sinh khoảng 50–70 sự kiện (`QUESTION_VIEW`, `OPTION_SELECT`, `OPTION_CHANGE`, `ANSWER_SUBMIT`, `TAB_BLUR`, `EXPLANATION_VIEW`). Với 300–500 nhân viên, tổng log lên tới **15.000–35.000+ dòng**.
   - **Supabase (PostgreSQL)** xử lý khối lượng này trong vài mili-giây nhờ Index & Batch RPC, trong khi **Google Sheets** dễ bị chậm, nghẽn quota API (60 req/phút/user) và lock file khi nhiều người nộp bài cùng lúc.
2. **Trải nghiệm Gamification & Tải ảnh nhanh trên Mobile**:
   - Web App tải ảnh Mascot DiVA và ảnh câu hỏi `LOOK` trực tiếp từ **Supabase Storage CDN**, đảm bảo tốc độ mượt hơn hẳn việc nhúng ảnh từ Google Drive.
3. **Phân quyền (RBAC) & Bảo mật Đáp án**:
   - **Supabase RLS + PostgreSQL RPC** đảm bảo người thi không thể mở F12 xem trước đáp án đúng, và chỉ Admin/Reviewer/HR mới truy cập được dữ liệu quản trị.
   - Đồng thời, Admin vẫn có thể xuất file `.xlsx` hoặc bật đồng bộ kết quả tổng hợp 1 chiều sang Google Sheet nếu HR muốn theo dõi thêm trên Sheet.

---

## 4. Phạm vi Sản phẩm (Project Scope)

### Trong phạm vi (In-Scope — V1)
- Web App responsive (Mobile-first + Desktop) gồm 2 phân hệ: **Cổng làm Quiz (Player)** và **Cổng Quản trị (Admin/Reviewer/HR)**.
- Backend toàn diện trên **Supabase (Free Tier)**: PostgreSQL, Auth, Storage, Realtime, RPC Functions & RLS.
- Hỗ trợ 5 kiểu câu hỏi từ 8 Concepts (`SINGLE_CHOICE`, `IMAGE_CHOICE`, `MULTI_FILL_BLANK`, `TRUE_FALSE`, `SPOT_DIFFERENCE`).
- Hệ thống ghi nhận từng hành động (`quiz_action_logs`) + đồng bộ Batch an toàn.
- Phân quyền 4 vai trò (`employee`, `reviewer`, `hr_viewer`, `admin`).
- Import ngân hàng câu hỏi từ Excel / Export báo cáo kết quả ra Excel (tùy chọn Webhook đẩy kết quả tổng hợp sang Google Sheet).

### Ngoài phạm vi (Out-of-Scope — Có thể mở rộng V2)
- Hệ thống chat/bình luận trực tiếp giữa các nhân viên.
- Đa ngôn ngữ (V1 tập trung **100% Tiếng Việt** theo đặc tả; V2 có thể mở rộng Tiếng Nhật/Tiếng Anh nếu cần).
- Ứng dụng mobile native (iOS/Android App Store) — sử dụng Web App qua trình duyệt/QR là tối ưu nhất.
