# 01. Đặc tả Chức năng Phân hệ Người làm Quiz (Player Features)

## 1. Luồng Trải nghiệm Chính (Player Journey)

1. **Xác thực & Chào mừng (`WelcomeScreen`)**:
   - Hiển thị nhận diện **DiVA Vision Explorer** (giống Slide 1 của ảnh mockup UI).
   - Tự động nhận diện phiên M365 hoặc hiển thị ô nhập nhanh **Mã nhân viên** (dành cho Genba quét QR).
   - Hiển thị thông tin tóm tắt: Tên nhân viên, Bộ phận, Số câu hỏi (`15 câu — 3 chặng`), Thời lượng gợi ý (`8–10 phút`), Trạng thái lượt thi (`Lượt 1 — Tính giải thưởng` hoặc `Lượt ôn tập`).
   - Nếu có bài thi làm dở (`InProgress`), hiển thị nút **“TIẾP TỤC BÀI ĐANG LÀM (Câu X/15)”**.

2. **Màn hình Chuyển chặng (`StageTransitionModal`)**:
   - Hiển thị ngắn gọn khi bước vào mỗi chặng:
     - **Chặng 1: LOOK — Nhìn và nhận diện** (5 câu) — DiVA tư thế *Explore* (ống nhòm).
     - **Chặng 2: THINK — Hiểu ý nghĩa** (6 câu) — DiVA tư thế *Thinking* (dấu hỏi).
     - **Chặng 3: CONNECT — Liên hệ công việc** (4 câu) — DiVA tư thế *Pointing / Determined*.

3. **Các Dạng Câu hỏi Tương tác (`QuestionRenderer`)**:
   - **`IMAGE_CHOICE` / `Vision Detective` / `Choose the Picture`**:
     - Hiển thị 3–4 thẻ hình ảnh lớn (A, B, C, D) kèm viền sáng khi được chọn. Hỗ trợ nhấn giữ/bấm icon kính lúp để phóng to ảnh trên màn hình điện thoại nhỏ.
   - **`SPOT_DIFFERENCE` (`A05*`)**:
     - Hiển thị 2 ảnh Hình A và Hình B cạnh nhau (trên Mobile xếp trên–dưới + nút chuyển tab đối chiếu nhanh A/B để soi rõ chi tiết khác biệt).
   - **`MULTI_FILL_BLANK` (như Mockup Chặng 2 THINK)**:
     - Hiển thị thẻ giấy cuộn với các ô trống đánh số `[ 1 ]`, `[ 2 ]`, `[ 3 ]`.
     - Người dùng bấm vào các thẻ từ A–F bên dưới để điền lần lượt vào ô trống; bấm lại vào ô trống để gỡ từ ra chọn lại.
   - **`SINGLE_CHOICE` & `TRUE_FALSE` (`THINK` & `CONNECT`)**:
     - Bong bóng thoại DiVA + ảnh minh họa tình huống (nếu có) + các thanh lựa chọn bo tròn dễ bấm trên Mobile (`min-height: 52px`).

4. **Thanh Tiến độ & Điều hướng**:
   - Thanh ruy-băng hiển thị tên chặng hiện tại + các chấm tròn tiến độ (`Câu X / 5`, `Câu 6 / 11`, `Câu 12 / 15`) + bộ đếm thời gian nhẹ nhàng (không gây áp lực đếm ngược gắt, chỉ nhắc nếu quá 10 phút).
   - Nút **“Câu tiếp theo”** chỉ kích hoạt khi người chơi đã chọn/điền đáp án cho câu hiện tại (chống bấm nhầm bỏ sót câu).

5. **Màn hình Kết quả & Giải thích Học tập (`ResultReviewScreen`)**:
   - DiVA ăn mừng theo mức điểm (`>= 12/15`: *Cheering/Excited*; `< 12/15`: *Determined/Happy* động viên).
   - Thẻ điểm tổng + điểm từng chặng (`LOOK`, `THINK`, `CONNECT`) + tổng thời gian (`mm:ss`).
   - Thông báo rõ lượt thi này có được tính là **Lượt hợp lệ xét giải (`Vision Champion` & `Engagement`)** hay không.
   - **Phần Review 15 câu**: Hiển thị lại câu hỏi, đáp án bạn đã chọn, đáp án đúng, và khung **Giải thích từ DiVA**; có nút lọc nhanh *“Tất cả (15)”* / *“Câu chưa đúng”*.
   - Nút **“Xem Bảng xếp hạng”** (nếu Admin bật `ShowLeaderboard`).
