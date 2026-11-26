# 02. Kế hoạch Kiểm thử & Nghiệm thu (UAT & Test Plan)

## 1. Kiểm thử Chức năng & Bảo mật Cốt lõi (Functional & RLS Test Cases)

| ID | Kịch bản kiểm thử | Kết quả mong đợi |
| :-: | :--- | :--- |
| **TC-01** | Đăng nhập Quản trị (Supabase Auth) & Genba (Mã NV + QR) | Admin/Reviewer/HR vào đúng Role trong `users_roles`; Genba chỉ vào được màn làm bài (`employee`), bị chặn nếu truy cập `/admin` hoặc gọi bảng quản trị. |
| **TC-02** | Rút đề & Tỷ lệ câu hỏi (`start_quiz_attempt`) | Mỗi lượt rút ngẫu nhiên phải có đúng **5 `LOOK` + 6 `THINK` + 4 `CONNECT`**, không có câu nào ở trạng thái `Chua_duyet`. |
| **TC-03** | Bảo mật đáp án & RLS (Anti-F12) | 1. Kiểm tra Network tab: response từ `start_quiz_attempt` **không chứa** `correct_answer_json` và `explanation`.<br>2. Thử gọi trực tiếp `supabase.from('questions').select('*')` bằng anon/employee key → Bị RLS từ chối (0 rows / 403). |
| **TC-04** | Ghi nhận từng hành động (`quiz_action_logs`) | Mở câu `A08`, chọn `A`, đổi sang `C`, chuyển tab 5 giây, bấm Tiếp theo → PostgreSQL ghi đủ `QUESTION_VIEW`, `OPTION_SELECT`, `OPTION_CHANGE (A->C)`, `TAB_BLUR/FOCUS`, `ANSWER_SUBMIT` kèm `time_spent_ms` chính xác; gửi trùng batch không tạo bản ghi lặp. |
| **TC-05** | Mất mạng & F5 giữa bài (Auto-Resume) | Tắt Wi-Fi ở câu 7/15, chọn đáp án, F5 hoặc bật mạng lại → Bài thi khôi phục đúng câu 7, không mất đáp án và không mất Action Logs trước đó. |
| **TC-06** | Chấm điểm Server-side & Giải thích (`submit_quiz_attempt`) | Nộp câu 15/15 → Điểm tổng & điểm từng chặng chính xác; không cho phép gọi submit lần 2 cho cùng `attempt_id`; xem giải thích ghi nhận `EXPLANATION_VIEW`. |
| **TC-07** | Quy tắc Giải thưởng (`Champion` & `Engagement`) | Làm lại lần 2 điểm cao hơn lần 1 → Bảng xếp hạng vẫn giữ kết quả **Lượt hợp lệ đầu tiên**; 2 người cùng `15/15` thì người có `duration_seconds` nhỏ hơn xếp trên; phòng 5 người đủ 5/5 đạt `100%` Engagement. |
| **TC-08** | Quy trình Reviewer, Admin & Export | Reviewer duyệt câu `Chua_duyet` → `Da_duyet`; Admin hủy tư cách 1 lượt thi → Realtime Dashboard cập nhật lại, đồng thời ghi 1 dòng vào `admin_audit_logs`; Export `.xlsx` đúng số liệu. |

---

## 2. Kiểm thử Phi chức năng & Thực tế Xưởng (Genba UAT & Free Tier Check)

1. **Kiểm thử Thiết bị Mobile Đa dạng**:
   - Kiểm tra trên iOS Safari (iPhone màn nhỏ ~375px), Android Chrome, và trình duyệt tích hợp trong Zalo / Microsoft Teams khi quét mã QR.
   - Đảm bảo không bị vỡ chữ tiếng Việt, không bị tràn ngang, nút bấm đủ lớn cho công nhân thao tác bằng một tay.
2. **Kiểm thử Đo Thời lượng Thực tế**:
   - Mời 5–10 nhân viên (gồm cả Genba và Văn phòng) làm thử trọn vẹn 15 câu.
   - Kiểm tra thời gian trung bình trên `quiz_attempts` có nằm trong mục tiêu **8–10 phút** hay không để điều chỉnh độ dài câu chữ nếu cần.
3. **Kiểm thử Dung lượng & Egress Supabase Free Tier**:
   - Kiểm tra tổng dung lượng 1 lượt tải đề (HTML/JS + ảnh WebP câu hỏi) để ước lượng Egress cho 500–1.000 nhân viên nằm gọn trong hạn mức **5 GB/tháng** của Supabase Free.
   - Kiểm tra cron ping giữ project không bị pause sau 7 ngày không hoạt động.
