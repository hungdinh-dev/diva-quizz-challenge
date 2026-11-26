# 02. Thiết kế Schema PostgreSQL, Index, RLS & RPC (Supabase)

## 1. Storage Bucket: `quiz-assets`
- Chứa ảnh gốc cắt từ Poster / e-Document Vision 2035 (`questions/bo-a/`, `questions/bo-b/`, `questions/connect/`).
- Cấu hình Public Read (kèm tên file khó đoán hoặc cache CDN) cho ảnh đề thi đã duyệt; chỉ Role `reviewer` và `admin` mới có quyền Upload/Delete thông qua Storage Policy.
- *(Gợi ý tiết kiệm Egress Free Tier: Ảnh Mascot DiVA cố định và nền UI đóng gói trực tiếp trong `public/assets/` của Frontend Vercel/Cloudflare CDN).*

---

## 2. Thiết kế 6 Bảng PostgreSQL

### 2.1. `users_roles` (Nhân sự & Phân quyền)
| Cột | Kiểu dữ liệu | Ràng buộc / Index | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, `default gen_random_uuid()` | ID nội bộ |
| `auth_user_id` | `uuid` | `UNIQUE`, FK -> `auth.users(id)` | Liên kết Supabase Auth (cho Admin/HR/Reviewer/Văn phòng) |
| `employee_code` | `text` | `UNIQUE NOT NULL`, Index | Mã nhân viên (VD: `MMV0123`) |
| `full_name` | `text` | `NOT NULL` | Họ và tên |
| `email` | `text` | `UNIQUE` (nullable cho Genba) | Email công ty |
| `department` | `text` | `NOT NULL`, Index | Phòng ban / Xưởng |
| `employee_type` | `text` | `CHECK IN ('Genba','Office','Management')` | Nhóm nhân sự |
| `role` | `text` | `CHECK IN ('employee','reviewer','hr_viewer','admin')` | Vai trò phân quyền |
| `verify_pin` | `text` | Nullable | Mã phụ Genba (VD: 4 số `ddmm` ngày sinh nếu bật) |
| `is_active` | `boolean` | `DEFAULT true`, Index | Trạng thái làm việc (mẫu số Engagement) |
| `created_at` | `timestamptz` | `DEFAULT now()` | Ngày tạo |

### 2.2. `campaigns` (Cấu hình Đợt Quiz)
| Cột | Kiểu dữ liệu | Ràng buộc / Index | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK | ID chiến dịch |
| `campaign_code` | `text` | `UNIQUE NOT NULL` | Mã chiến dịch (`VISION2026`) |
| `title` | `text` | `NOT NULL` | Tên hiển thị |
| `quiz_mode` | `text` | `CHECK IN ('Set_A','Set_B','Random_Pool_15')` | Chế độ phát đề |
| `stage_mix` | `jsonb` | `DEFAULT '{"LOOK":5,"THINK":6,"CONNECT":4}'` | Cơ cấu số câu mỗi chặng |
| `max_attempts` | `int` | `DEFAULT 0` | Số lượt tối đa (0 = ôn tập thoải mái, tính giải ở lượt 1) |
| `min_valid_seconds` | `int` | `DEFAULT 60` | Ngưỡng giây tối thiểu tính lượt hợp lệ |
| `suggested_minutes` | `int` | `DEFAULT 10` | Thời lượng gợi ý |
| `start_at` | `timestamptz` | `NOT NULL` | Thời gian mở |
| `end_at` | `timestamptz` | `NOT NULL` | Thời gian đóng |
| `status` | `text` | `CHECK IN ('Draft','Active','Closed')`, Index | Trạng thái |
| `show_leaderboard` | `boolean` | `DEFAULT true` | Bật/tắt bảng xếp hạng cho nhân viên |
| `google_sheet_webhook` | `text` | Nullable | URL Webhook Apps Script nếu bật sync kết quả sang Sheet |

### 2.3. `questions` (Ngân hàng Câu hỏi)
| Cột | Kiểu dữ liệu | Ràng buộc / Index | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK | ID câu hỏi |
| `question_code` | `text` | `UNIQUE NOT NULL`, Index | `A01`–`A15`, `B01`–`B15`, ... |
| `source_set` | `text` | `CHECK IN ('Bo_A','Bo_B','Bo_Sung')`, Index | Nguồn bộ đề |
| `stage` | `text` | `CHECK IN ('LOOK','THINK','CONNECT')`, Index | Chặng |
| `concept` | `text` | `NOT NULL` | Thuộc 8 concepts |
| `question_type` | `text` | `CHECK IN ('SINGLE_CHOICE','IMAGE_CHOICE','MULTI_FILL_BLANK','TRUE_FALSE','SPOT_DIFFERENCE')` | Kiểu hiển thị câu hỏi |
| `prompt_text` | `text` | `NOT NULL` | Nội dung câu hỏi (có `{{blank_1}}` nếu điền khuyết) |
| `options_json` | `jsonb` | `NOT NULL` | `[{"key":"A","text":"...","imageUrl":"..."}]` |
| `correct_answer_json` | `jsonb` | `NOT NULL` | `{"keys":["A"]}` hoặc `{"blanks":["Linh hoạt","Hiệu quả","Bền vững"]}` |
| `explanation` | `text` | `NOT NULL` | Giải thích đáp án sau khi nộp |
| `media_urls_json` | `jsonb` | `DEFAULT '[]'` | Danh sách URL ảnh trong `quiz-assets` |
| `shuffle_options` | `boolean` | `DEFAULT true` | Có trộn thứ tự lựa chọn hay không |
| `mascot_pose` | `text` | `DEFAULT 'pointing'` | Pose DiVA gợi ý |
| `review_status` | `text` | `CHECK IN ('Chua_duyet','Can_chinh_sua','Da_duyet','Archived')`, Index | Trạng thái duyệt |
| `reviewer_note` | `text` | Nullable | Ghi chú review (`A05*`, `B05*`, ...) |
| `approved_by` | `uuid` | FK -> `users_roles(id)` | Người duyệt |
| `approved_at` | `timestamptz` | Nullable | Thời gian duyệt |

### 2.4. `quiz_attempts` (Kết quả từng Lượt làm bài)
| Cột | Kiểu dữ liệu | Ràng buộc / Index | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK (AttemptId) | ID lượt làm bài |
| `campaign_id` | `uuid` | FK -> `campaigns(id)`, Index | Chiến dịch |
| `employee_code` | `text` | `NOT NULL`, Index | Mã nhân viên |
| `full_name` | `text` | `NOT NULL` | Snapshot tên |
| `department` | `text` | `NOT NULL`, Index | Snapshot phòng ban |
| `attempt_number` | `int` | `NOT NULL` | Lượt thứ mấy (`1`, `2`, ...) |
| `status` | `text` | `CHECK IN ('InProgress','Completed','Abandoned')`, Index | Trạng thái |
| `selected_questions_json` | `jsonb` | `NOT NULL` | Danh sách 15 `question_code` + thứ tự trộn của lượt này |
| `draft_answers_json` | `jsonb` | `DEFAULT '{}'` | Đáp án tạm để khôi phục khi F5/rớt mạng |
| `final_answers_json` | `jsonb` | Nullable | Đáp án chốt + đúng/sai từng câu |
| `score` | `int` | `DEFAULT 0`, Index | Tổng điểm (0–15) |
| `score_by_stage` | `jsonb` | Nullable | `{"LOOK":5,"THINK":5,"CONNECT":4}` |
| `duration_seconds` | `int` | Nullable, Index | Thời gian làm bài server-side (giây) |
| `tab_switch_count` | `int` | `DEFAULT 0` | Số lần rời tab |
| `started_at` | `timestamptz` | `DEFAULT now()` | Giờ bắt đầu (Server) |
| `submitted_at` | `timestamptz` | Nullable, Index | Giờ nộp bài (Server) |
| `is_valid_for_award` | `boolean` | `DEFAULT false`, Index | Hợp lệ xét giải (`true` ở lượt 1 hợp lệ) |
| `invalid_reason` | `text` | Nullable | Lý do hủy/không hợp lệ |
| `device_type` | `text` | `DEFAULT 'Mobile'` | `Mobile` / `Desktop` |

### 2.5. `quiz_action_logs` (Lưu TỪNG HÀNH ĐỘNG của người dùng)
| Cột | Kiểu dữ liệu | Ràng buộc / Index | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `bigint` | PK (`GENERATED ALWAYS AS IDENTITY`) | ID tự tăng |
| `attempt_id` | `uuid` | FK -> `quiz_attempts(id) ON DELETE CASCADE`, Index | Lượt làm bài |
| `client_seq` | `int` | `NOT NULL` | Số thứ tự sự kiện trong phiên (`UNIQUE(attempt_id, client_seq)`) |
| `employee_code` | `text` | `NOT NULL`, Index | Mã nhân viên |
| `question_code` | `text` | Nullable, Index | Mã câu hỏi (`A01`–`B15`) |
| `stage` | `text` | `NOT NULL` | `INTRO` / `LOOK` / `THINK` / `CONNECT` / `RESULT` |
| `event_type` | `text` | `NOT NULL`, Index | `SESSION_START`, `STAGE_ENTER`, `QUESTION_VIEW`, `OPTION_SELECT`, `OPTION_CHANGE`, `ANSWER_SUBMIT`, `TAB_BLUR`, `TAB_FOCUS`, `QUIZ_SUBMIT`, `EXPLANATION_VIEW` |
| `event_payload` | `jsonb` | `DEFAULT '{}'` | Chi tiết (`{"from":"B","to":"A"}`) |
| `time_spent_ms` | `int` | `DEFAULT 0` | Thời gian dừng trên câu hỏi (ms) |
| `event_time` | `timestamptz` | `NOT NULL`, Index | Thời điểm phát sinh thao tác |

### 2.6. `admin_audit_logs` (Nhật ký thao tác Quản trị)
| Cột | Kiểu dữ liệu | Ràng buộc / Index | Mô tả |
| :--- | :--- | :--- | :--- |
| `id` | `bigint` | PK (`GENERATED ALWAYS AS IDENTITY`) | ID tự tăng |
| `actor_id` | `uuid` | FK -> `users_roles(id)` | Người thao tác |
| `actor_email` | `text` | `NOT NULL` | Email người thao tác |
| `action_type` | `text` | `NOT NULL`, Index | `QUESTION_EDIT`, `QUESTION_APPROVE`, `CAMPAIGN_UPDATE`, `ROLE_CHANGE`, `ATTEMPT_INVALIDATE`, `DATA_EXPORT` |
| `target_id` | `text` | `NOT NULL` | Đối tượng bị tác động |
| `changes_json` | `jsonb` | `DEFAULT '{}'` | Dữ liệu trước & sau |
| `created_at` | `timestamptz` | `DEFAULT now()`, Index | Thời điểm thao tác |

---

## 3. Chính sách RLS & Các Hàm RPC Cốt lõi

- **RLS Policies**:
  - `questions`: Chỉ `reviewer` và `admin` được `SELECT / INSERT / UPDATE`. Role `employee` và `anon` bị chặn hoàn toàn.
  - `quiz_attempts` & `quiz_action_logs`: Chỉ `hr_viewer` và `admin` được `SELECT` toàn bảng; người chơi không đọc được bài của người khác.
  - `admin_audit_logs` & `users_roles` (ghi): Chỉ `admin`.
- **PostgreSQL RPC Functions (`SECURITY DEFINER`)**:
  1. `genba_verify_employee(p_employee_code, p_verify_pin)` → Kiểm tra hợp lệ trong `users_roles` và trả thông tin chiến dịch.
  2. `start_quiz_attempt(p_campaign_id, p_employee_code, p_device_type)` → Nếu có lượt `InProgress` thì trả lại để Resume; nếu chưa thì rút 15 câu `Da_duyet` (`5 LOOK + 6 THINK + 4 CONNECT`), tạo dòng `quiz_attempts` và trả đề thi **đã cắt bỏ `correct_answer_json` & `explanation`**.
  3. `flush_quiz_actions(p_attempt_id, p_events_jsonb, p_draft_answers)` → Ghi hàng loạt vào `quiz_action_logs` với `ON CONFLICT (attempt_id, client_seq) DO NOTHING` (chống trùng tuyệt đối) và cập nhật `draft_answers_json`.
  4. `submit_quiz_attempt(p_attempt_id, p_events_jsonb, p_final_answers)` → Flush batch cuối, khóa dòng `quiz_attempts`, đối chiếu bảng `questions` để chấm điểm, tính `duration_seconds = EXTRACT(EPOCH FROM (now() - started_at))`, gán `is_valid_for_award`, rồi trả toàn bộ kết quả + đáp án đúng + giải thích về cho người chơi.
