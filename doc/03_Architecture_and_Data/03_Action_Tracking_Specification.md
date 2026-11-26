# 03. Đặc tả Cơ chế Lưu vết Hành động (Action Tracking Specification)

Đây là thành phần cốt lõi đáp ứng yêu cầu: **“Lưu được từng hành động của từng người làm quiz và đánh giá được kết quả”** trên **Supabase (PostgreSQL)** mà vẫn mượt trên điện thoại ở xưởng và chống mất dữ liệu khi rớt mạng.

---

## 1. Danh mục Sự kiện Cần Ghi nhận (Event Taxonomy)

| Mã sự kiện (`event_type`) | Thời điểm kích hoạt | Dữ liệu trong `event_payload` | Ý nghĩa phân tích |
| :--- | :--- | :--- | :--- |
| `SESSION_START` | Người dùng bấm **“BẮT ĐẦU KHÁM PHÁ”** | `{"userAgent": "...", "screen": "390x844", "quizMode": "Set_A"}` | Ghi nhận thiết bị (Mobile/Desktop) và thời điểm vào bài. |
| `STAGE_ENTER` | Vào màn hình chặng (`LOOK`, `THINK`, `CONNECT`) | `{"stage": "LOOK", "questionCount": 5}` | Đo thời gian chuyển chặng và tổng thời gian mỗi chặng. |
| `QUESTION_VIEW` | Câu hỏi hiển thị lên màn hình | `{"questionIndex": 3, "shuffledOrder": ["B","A","C"]}` | Mốc bắt đầu tính `time_spent_ms` cho câu hỏi. |
| `OPTION_SELECT` | Chọn đáp án lần đầu tiên trên câu đó | `{"selected": ["B"]}` | Biết phản xạ lựa chọn đầu tiên của nhân viên. |
| `OPTION_CHANGE` | Đổi từ đáp án này sang đáp án khác | `{"from": ["B"], "to": ["A"], "changeCount": 1}` | Phát hiện câu hỏi gây phân vân hoặc nhân viên tự sửa lại suy nghĩ. |
| `ANSWER_SUBMIT` | Bấm **“Câu tiếp theo”** hoặc **“Hoàn thành”** | `{"finalSelected": ["A"]}` | Chốt đáp án câu + tổng `time_spent_ms` trên câu đó. |
| `TAB_BLUR` / `TAB_FOCUS` | Rời khỏi trình duyệt/tab rồi quay lại | `{"awayMs": 14500}` | Hỗ trợ Admin phát hiện bất thường (rời tab lâu để tra tài liệu). |
| `QUIZ_SUBMIT` | Hệ thống hoàn tất chấm điểm bài thi | `{"score": 14, "durationSeconds": 482}` | Đánh dấu hoàn thành trọn vẹn bài thi. |
| `EXPLANATION_VIEW` | Người dùng mở/lọc xem giải thích câu sai ở màn kết quả | `{"filterMode": "wrong_only", "viewedCode": "A08"}` | Đo mức độ tương tác học tập sau khi thi xong. |

---

## 2. Cơ chế LocalStorage Buffer & Batch Flush lên Supabase

Để giao diện không bao giờ bị giật lag khi chờ mạng và tránh gửi quá nhiều request thừa:

1. **Tầng Client Buffer (`localStorage`)**:
   - Mọi sự kiện được đẩy vào mảng `actionQueue` trong bộ nhớ + lưu xuống `localStorage` (`diva_quiz_queue_{attemptId}`) ngay lập tức (< 1ms).
   - Mỗi event được đánh số thứ tự tăng dần `client_seq` (`1, 2, 3...`) và timestamp ISO.
2. **Kích hoạt Flush theo Cột mốc (Milestone Batching)**:
   - Không bắn HTTP request sau từng cú chạm màn hình.
   - Chỉ gọi PostgreSQL RPC **`flush_quiz_actions`** mỗi khi người dùng bấm **“Câu tiếp theo”** (gửi toàn bộ ~3–5 events của câu vừa rồi trong 1 mảng JSONB) và gọi **`submit_quiz_attempt`** khi bấm **“Hoàn thành”**.
3. **Chống trùng lặp (Idempotency) & Retry**:
   - Bảng `quiz_action_logs` có ràng buộc `UNIQUE (attempt_id, client_seq)`.
   - Trong RPC `flush_quiz_actions`, câu lệnh `INSERT INTO quiz_action_logs ... ON CONFLICT (attempt_id, client_seq) DO NOTHING` đảm bảo dù mạng chập chờn khiến client gửi lại cùng 1 batch nhiều lần, log không bao giờ bị nhân đôi.
4. **Cập nhật Realtime cho Admin**:
   - Khi người chơi hoàn thành bài thi (`quiz_attempts` chuyển sang `Completed`), **Supabase Realtime** tự động đẩy sự kiện về Dashboard Admin để cập nhật ngay bảng xếp hạng & tỷ lệ phòng ban.

---

## 3. Ví dụ Timeline Minh họa trong Admin Action Inspector

Khi Admin bấm vào lượt làm bài của nhân viên **Nguyễn Văn A (`MMV0452` — Bộ phận Lắp ráp)**, hệ thống tái dựng lại dòng thời gian như sau:

```text
[12:15:02] SESSION_START    — Bắt đầu bài thi trên Mobile (390x844)
[12:15:04] STAGE_ENTER      — Vào Chặng 1: LOOK (5 câu)
[12:15:05] QUESTION_VIEW    — Xem câu A01 (Nhận diện Mascot)
[12:15:11] OPTION_SELECT    — Chọn "A: Tắc kè hoa" (sau 6.0s)
[12:15:13] ANSWER_SUBMIT    — Chốt câu A01 | Đúng | Thời gian: 8.2s
...
[12:17:40] QUESTION_VIEW    — Xem câu A08 (Agility & Gritty Joy)
[12:17:58] OPTION_SELECT    — Chọn "A" (sau 18.0s)
[12:18:10] OPTION_CHANGE    — Đổi từ "A" -> "C" (sau +12.0s)
[12:18:14] ANSWER_SUBMIT    — Chốt câu A08 | Đúng | Thời gian: 34.0s | 1 lần đổi ý
...
[12:23:15] QUIZ_SUBMIT      — Hoàn thành 15/15 câu | Điểm: 14/15 | Tổng thời gian: 493s | Hợp lệ
[12:23:28] EXPLANATION_VIEW — Xem giải thích câu làm sai (A11)
```
