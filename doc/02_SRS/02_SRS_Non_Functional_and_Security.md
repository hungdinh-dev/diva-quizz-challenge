# 02. Yêu cầu Phi chức năng, Bảo mật & Ma trận Phân quyền (NFR & Security)

## 1. Yêu cầu Phi chức năng (Non-Functional Requirements)

### 1.1. Hiệu năng & Giới hạn Supabase Free Tier (`NFR-PERF`)
- **Thời gian tải trang ban đầu (First Contentful Paint)**: ≤ 1.5 giây trên mạng 4G/Wi-Fi nội bộ nhờ Frontend host trên Edge CDN (Vercel/Cloudflare Pages).
- **Phản hồi thao tác UI**: ≤ 50ms khi chọn đáp án hoặc điền từ (ghi log vào `localStorage` trước, không bắt người dùng chờ mạng).
- **Khả năng chịu tải đồng thời**: PostgreSQL + Connection Pooling của Supabase xử lý mượt **300–500+ nhân viên** làm bài đồng thời vào giờ cao điểm mà không bị nghẽn lock file như Google Sheets.
- **Tối ưu Dung lượng & Băng thông Free Tier**:
  - Database Limit **500 MB**: 1.000 lượt thi × ~60 dòng Action Log = 60.000 dòng chỉ chiếm khoảng **~25–40 MB** (< 10% dung lượng Free).
  - Storage Limit **1 GB** & Egress **5 GB/tháng**: Nén toàn bộ ảnh câu hỏi xuống WebP (`< 100 KB/ảnh`), bật cache dài hạn (`max-age=86400`), và đóng gói asset tĩnh của khung UI/Mascot ngay trong Frontend CDN để tiết kiệm tối đa Egress của Supabase.

### 1.2. Tính Sẵn sàng & Tương thích Thiết bị (`NFR-COMP`)
- **Mobile-First**: Hiển thị chuẩn trên màn hình dọc `360px – 430px` (iOS Safari, Android Chrome, Zalo/Teams in-app browser khi quét QR) và Desktop `1280px+`.
- **Chống mất dữ liệu (Resilience)**: Khi mất mạng tạm thời tại xưởng, toàn bộ đáp án và Action Logs vẫn lưu an toàn tại `localStorage`; khi có mạng lại hoặc lúc nộp bài sẽ tự động đồng bộ bù qua RPC.
- **Khả năng tiếp cận cho Genba**: Cỡ chữ câu hỏi tối thiểu `16px`, vùng bấm đáp án cao tối thiểu `48px` (đạt chuẩn touch target trên điện thoại), tương phản màu sắc rõ ràng trên nền giấy parchment.
- **Chống Sleep sau 7 ngày không truy cập (Free Tier)**: Cài đặt cron ping nhẹ 3 ngày/lần hoặc kiểm tra trạng thái project trước mỗi đợt mở chiến dịch.

---

## 2. Yêu cầu Bảo mật & PostgreSQL RLS (`NFR-SEC`)

1. **Che giấu Đáp án đúng trong lúc thi (Anti-Inspect F12)**:
   - Bảng `questions` bật **RLS**: chỉ `reviewer` và `admin` được `SELECT` trực tiếp toàn bộ cột (bao gồm `correct_answer_json`, `explanation`).
   - Role `employee` **không được phép** `SELECT` thẳng bảng `questions`. Nhân viên chỉ nhận đề thi thông qua RPC `SECURITY DEFINER` (`start_quiz_attempt`), hàm này chỉ trả về `question_code`, `stage`, `prompt_text`, `options_json`, `media_urls_json`.
   - Việc chấm điểm và trả giải thích chỉ thực hiện bên trong RPC `submit_quiz_attempt` khi lượt làm bài chuyển trạng thái sang `Completed`.
2. **Bảo vệ Luồng Genba Không Cần Mật khẩu**:
   - Token cấp cho luồng nhập `employee_code` chỉ có phạm vi `employee` cho đúng `attempt` của mã nhân viên đó, tuyệt đối không nâng quyền lên `reviewer`/`hr_viewer`/`admin` (các quyền quản trị bắt buộc đăng nhập **Supabase Auth** thực thụ).
3. **Chống Submit Trùng & Giả mạo Thời gian**:
   - `started_at` và `submitted_at` được ghi bằng `NOW()` phía **PostgreSQL Server** (không tin cậy đồng hồ trên điện thoại).
   - Khóa chống submit nhiều lần cho cùng một `attempt_id` (kiểm tra `status = 'InProgress'` với `FOR UPDATE` trong transaction PostgreSQL).

---

## 3. Ma trận Phân quyền Chi tiết (RBAC Matrix)

| Nhóm tính năng | Chi tiết hành động | `employee` | `reviewer` | `hr_viewer` | `admin` |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Quiz (Player)** | Làm bài Quiz theo chiến dịch đang mở | ✅ | ✅ | ✅ | ✅ |
| | Xem kết quả, đáp án đúng & giải thích sau khi nộp | ✅ | ✅ | ✅ | ✅ |
| | Xem lịch sử các lượt làm bài của bản thân | ✅ | ✅ | ✅ | ✅ |
| **Question Bank** | Xem danh sách câu hỏi & trạng thái duyệt | ❌ | ✅ | ❌ | ✅ |
| | Tạo mới / Chỉnh sửa câu hỏi / Upload ảnh gốc | ❌ | ✅ | ❌ | ✅ |
| | Phê duyệt (`Da_duyet`) hoặc từ chối (`Can_chinh_sua`) | ❌ | ✅ | ❌ | ✅ |
| | Import / Export ngân hàng câu hỏi Excel | ❌ | ✅ | ❌ | ✅ |
| **Analytics & Logs** | Xem Realtime Dashboard tỷ lệ tham gia | ❌ | ❌ | ✅ | ✅ |
| | Xem bảng xếp hạng *Vision Champion* & *Engagement* | ❌ | ❌ | ✅ | ✅ |
| | Xem Action Timeline chi tiết của từng nhân viên | ❌ | ❌ | ◐ *(Chỉ phòng mình hoặc ẩn danh tùy cấu hình)* | ✅ |
| | Xuất báo cáo Excel tổng hợp / Cấu hình Google Sheet Sync | ❌ | ❌ | ✅ *(Export)* | ✅ |
| **System & Campaign** | Tạo / Mở / Đóng chiến dịch Quiz & chọn Bộ đề | ❌ | ❌ | ❌ | ✅ |
| | Hủy/Khôi phục `is_valid_for_award` của 1 lượt làm bài | ❌ | ❌ | ❌ | ✅ |
| | Import nhân sự, quản lý Phòng ban & gán Role | ❌ | ❌ | ❌ | ✅ |
| | Xem `admin_audit_logs` (Nhật ký quản trị) | ❌ | ❌ | ❌ | ✅ |
