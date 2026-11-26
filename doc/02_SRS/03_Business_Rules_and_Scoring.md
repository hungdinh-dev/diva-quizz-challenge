# 03. Quy tắc Nghiệp vụ & Công thức Đánh giá Kết quả (Business Rules & Scoring)

Tài liệu quy định chính xác toàn bộ quy tắc tính điểm, xác định lượt hợp lệ và xét 2 hạng mục giải thưởng dựa trên sheet `Thiết kế & Giải thưởng` và `Concept & Trải nghiệm`.

---

## 1. Quy tắc Cấu trúc Đề thi (`BR-QUIZ`)

1. **Cơ cấu chuẩn 1 lượt Quiz (15 câu)**:
   - Chặng 1 (`LOOK`): **5 câu**
   - Chặng 2 (`THINK`): **6 câu**
   - Chặng 3 (`CONNECT`): **4 câu**
2. **Điều kiện câu hỏi được đưa vào đề**:
   - Chỉ các câu có `ReviewStatus = Da_duyet` mới được xuất hiện trong đề thi chính thức.
   - Các câu đang ở trạng thái `Chua_duyet` hoặc `Can_chinh_sua` (bao gồm câu đánh dấu `*` như `A05*`, `B05*` trước khi kiểm tra xong) chỉ xem được ở chế độ **Preview** của Reviewer/Admin.
3. **Thứ tự hiển thị & Trộn phương án**:
   - Luôn giữ đúng thứ tự 3 chặng: `LOOK` → `THINK` → `CONNECT`.
   - Trong mỗi chặng, nếu bật chế độ `Random_Pool_15`, hệ thống bốc ngẫu nhiên đủ số lượng câu theo chặng từ ngân hàng 30–40 câu.
   - Các câu có `ShuffleOptions = true` sẽ đảo thứ tự phương án (A/B/C) theo từng phiên làm bài; các câu phụ thuộc nhãn cố định trên hình (`Hình A`, `Hình B`, `Cả hai`) giữ nguyên thứ tự.

---

## 2. Quy tắc Chấm điểm (`BR-SCORE`)

1. **Cách tính điểm từng câu**:
   - `SINGLE_CHOICE`, `IMAGE_CHOICE`, `TRUE_FALSE`, `SPOT_DIFFERENCE`: Đúng = **1 điểm**, Sai/Bỏ trống = **0 điểm**.
   - `MULTI_FILL_BLANK` (như màn hình Chặng 2 trong mockup có 3 ô trống chọn từ A–F):
     - Mặc định (V1 đề xuất): Đúng toàn bộ các vị trí trống mới tính **1 điểm** để đồng nhất thang **15 điểm / 15 câu** (có thể cấu hình tính điểm thành phần nếu Admin muốn, nhưng vẫn quy chuẩn tổng tối đa 15 điểm).
2. **Thang điểm hiển thị**:
   - Hiển thị đồng thời: **Số câu đúng / 15** (VD: `14 / 15`) và **Điểm quy đổi phần trăm** (VD: `93%`), kèm chi tiết từng chặng (`LOOK: 5/5`, `THINK: 5/6`, `CONNECT: 4/4`).
3. **Cách tính Thời gian làm bài (`duration_seconds`)**:
   - Tính từ thời điểm hệ thống tạo/bắt đầu phiên (`started_at` khi bấm *“BẮT ĐẦU KHÁM PHÁ”*) đến thời điểm người dùng bấm nộp bài cuối cùng (`submitted_at`), tính theo đồng hồ máy chủ PostgreSQL/Supabase (đơn vị: giây).

---

## 3. Quy tắc Lượt Hợp lệ & Làm lại (`BR-ATTEMPT`)

1. **Chính sách làm nhiều lần (configurable theo Campaign)**:
   - **Khuyến nghị mặc định**: Nhân viên có thể làm lại tối đa `N` lần (VD: 2–3 lần) để củng cố kiến thức Vision 2035, nhưng:
     - **Chỉ Lượt hợp lệ đầu tiên (`Attempt #1` hoàn thành)** được tính vào bảng xếp hạng **Vision Champion Award** và **Vision Engagement Award**.
     - Các lượt sau được gắn nhãn `Practice / Ôn tập` (`IsValidForAward = false`) để nhân viên học lại mà không làm sai lệch kết quả thi đua.
2. **Điều kiện của một Lượt Hợp lệ (`is_valid_for_award = true`)**:
   - Hoàn thành đủ **15 / 15 câu** trước khi chiến dịch đóng (`end_at`).
   - Nhân viên thuộc danh sách `users_roles` có `is_active = true`.
   - Thời gian làm bài hợp lý (VD: `duration_seconds >= min_valid_seconds`, mặc định đề xuất `60 giây` để lọc các trường hợp bấm bừa không đọc câu hỏi).
   - Không bị Admin thu hồi tư cách hợp lệ do phát hiện gian lận rõ ràng.

---

## 4. Công thức Xét Giải thưởng (`BR-AWARD`)

### 4.1. Giải Cá nhân — **Vision Champion Award**
- **Tiêu chí xếp hạng (theo thứ tự ưu tiên)**:
  1. `Score` (Tổng điểm của lượt hợp lệ đầu tiên) — **Cao hơn xếp trên**.
  2. `DurationSeconds` (Tổng thời gian hoàn thành bài thi) — **Thấp hơn (nhanh hơn) xếp trên** *(tie-breaker theo đúng hướng dẫn trong Excel)*.
  3. `SubmittedAt` (Thời điểm hoàn thành sớm hơn) — **Sớm hơn xếp trên** nếu vẫn trùng cả điểm và số giây.
- **Ví dụ minh họa**:
  - Nhân viên X: `15/15` trong `310 giây` → Xếp hạng 1.
  - Nhân viên Y: `15/15` trong `345 giây` → Xếp hạng 2.
  - Nhân viên Z: `14/15` trong `250 giây` → Xếp hạng 3.

### 4.2. Giải Tập thể — **Vision Engagement Award**
- **Mục tiêu**: Công bằng tuyệt đối giữa bộ phận ít người (VD: 8 người) và bộ phận đông người (VD: 150 người).
- **Công thức tính cho từng Bộ phận (`Department`)**:
  $$\text{Tỷ lệ tham gia (\%)} = \frac{\text{Số nhân viên duy nhất thuộc bộ phận có ít nhất 1 lượt hoàn thành hợp lệ}}{\text{Tổng số nhân viên Active của bộ phận trong danh sách chuẩn}} \times 100\%$$
- **Tiêu chí phụ khi các bộ phận cùng đạt 100% (Tie-breaker)**:
  1. Điểm trung bình của toàn bộ phận (`AvgScore`) cao hơn.
  2. Hoặc thời điểm bộ phận chạm mốc 100% sớm hơn (tính theo `SubmittedAt` của nhân viên cuối cùng hoàn thành trong bộ phận). *(Admin có thể cấu hình chọn tiêu chí phụ trước khi công bố).*
