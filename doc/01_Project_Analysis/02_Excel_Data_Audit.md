# 02. Rà soát & Kiểm toán Dữ liệu Excel (`MMV_Vision_Quiz_2_Bo_De_Xuat_Bo_Sung_Concept (1).xlsx`)

Tài liệu kiểm toán chi tiết toàn bộ 6 sheet trong [MMV_Vision_Quiz_2_Bo_De_Xuat_Bo_Sung_Concept (1).xlsx](../../MMV_Vision_Quiz_2_Bo_De_Xuat_Bo_Sung_Concept%20(1).xlsx) để chuẩn bị dữ liệu đầu vào sạch trước khi import lên **Supabase (`questions` & Storage `quiz-assets`)**.

---

## 1. Tổng hợp Cấu trúc 6 Sheets

| STT | Tên Sheet | Số dòng dữ liệu | Nội dung | Trạng thái hiện tại |
| :-: | :--- | :---: | :--- | :--- |
| 1 | `Bo A - Vision Explorer` | 15 câu (`A01`–`A15`) | 5 LOOK + 6 THINK + 4 CONNECT | 15/15 `Chưa duyệt`; câu `A05` có `A*` |
| 2 | `Bo B - Think and Act` | 15 câu (`B01`–`B15`) | 5 LOOK + 6 THINK + 4 CONNECT | 15/15 `Chưa duyệt`; câu `B05` có `A*` |
| 3 | `Huong dan review` | 8 mục | Hướng dẫn chung chương trình, nguồn PPTX | Tài liệu tham chiếu |
| 4 | `Concept & Trải nghiệm` | 6 mục | Tên chương trình & 3 lớp trải nghiệm | Tài liệu định hướng UX |
| 5 | `8 Concepts` | 8 concepts | Phân loại dạng câu hỏi & độ khó | Khung thiết kế UI câu hỏi |
| 6 | `Thiết kế & Giải thưởng` | 11 hạng mục | Quy mô, thời lượng, thiết bị, giải thưởng | Quy tắc nghiệp vụ cốt lõi |

---

## 2. Danh mục Chi tiết 30 Câu hỏi Hiện có

### 2.1. Bộ A — `Vision Explorer` (`A01`–`A15`)

| Mã | Chặng | Concept | Tóm tắt nội dung câu hỏi | Đáp án | Yêu cầu Hình ảnh / Lưu ý | Review |
| :-: | :-: | :--- | :--- | :-: | :--- | :---: |
| `A01` | LOOK | Nhận diện hình | Linh vật đại diện cho tinh thần linh hoạt và đổi mới của MMV | `A` | Mascot gốc | Chưa duyệt |
| `A02` | LOOK | Điền khuyết | Hoàn thành: *“Linh hoạt để đổi mới – …”* | `A` | Che cụm từ trên poster | Chưa duyệt |
| `A03` | LOOK | Nhận diện hình | Trong 3 hình DX, FX, GX, hình nào là chuyển đổi kỹ thuật số | `A` | Cắt hình DX, FX, GX gốc | Chưa duyệt |
| `A04` | LOOK | Nhận diện hình | Biểu tượng bắt tay trong 3C with I thể hiện giá trị nào | `A` | Xác nhận icon trên poster | Chưa duyệt |
| `A05` | LOOK | Tìm điểm khác biệt | Hai hình Vision, hình nào đủ 4 giá trị 3C with I | `A*` | **Cần dựng hình B thiếu 1 giá trị; khóa đáp án sau kiểm tra** | Chưa duyệt |
| `A06` | THINK | Company of Choice | MMV mong muốn trở thành công ty được những ai tin chọn | `B` | — | Chưa duyệt |
| `A07` | THINK | Think Twice | Sản phẩm chất lượng tốt đã đủ thành “Sự tin chọn cho tương lai” chưa | `B` | — | Chưa duyệt |
| `A08` | THINK | Find Connection | Điểm chung quan trọng nhất giữa Agility và Gritty Joy | `C` | — | Chưa duyệt |
| `A09` | THINK | Which Does Not Fit | Nhận định CHƯA phù hợp với Localization trong DiVA | `B` | — | Chưa duyệt |
| `A10` | THINK | Find Connection | Vai trò của CX đối với BX, DX, FX và GX | `C` | — | Chưa duyệt |
| `A11` | THINK | Which Does Not Fit | Nhận định CHƯA phản ánh đúng tinh thần Collaboration | `B` | — | Chưa duyệt |
| `A12` | CONNECT | Tình huống GX | Phát hiện dấu hiệu bất thường ảnh hưởng chất lượng sản phẩm | `B` | Có thể gắn hình minh họa tình huống | Chưa duyệt |
| `A13` | CONNECT | Tình huống Commitment | Vấn đề phát sinh liên quan đến nhiều bộ phận | `C` | Có thể gắn hình minh họa tình huống | Chưa duyệt |
| `A14` | CONNECT | Tình huống Gritty Joy | Nhóm gặp khó khăn khi cải tiến và chưa đạt kết quả | `B` | Có thể gắn hình minh họa tình huống | Chưa duyệt |
| `A15` | CONNECT | Final Challenge | Hành động đưa MMV thành “Sự tin chọn cho tương lai” | `B` | Có thể gắn hình minh họa tình huống | Chưa duyệt |

### 2.2. Bộ B — `Think and Act` (`B01`–`B15`)

| Mã | Chặng | Concept | Tóm tắt nội dung câu hỏi | Đáp án | Yêu cầu Hình ảnh / Lưu ý | Review |
| :-: | :-: | :--- | :--- | :-: | :--- | :---: |
| `B01` | LOOK | Điền khuyết | Hoàn thành: *“MMV, sự tin chọn cho …”* | `B` | Poster Vision | Chưa duyệt |
| `B02` | LOOK | Missing Piece | Trong 5X, chữ nào còn thiếu: `BX – CX – DX – FX – …` | `A` | Sơ đồ 5X | Chưa duyệt |
| `B03` | LOOK | Nhận diện hình | Chữ X xuất hiện giữa các trục thể hiện sự kết nối | `B` | Sơ đồ 5X gốc | Chưa duyệt |
| `B04` | LOOK | Nhận diện hình | Hình ảnh nhà máy, cây xanh và cơ sở hạ tầng gắn với trục nào | `A` | Hình FX gốc | Chưa duyệt |
| `B05` | LOOK | Nhận diện hình | Trong biểu tượng 3C with I, hình nào thể hiện Challenge | `A*` | **Cần xác nhận biểu tượng Challenge trên hình chính thức** | Chưa duyệt |
| `B06` | THINK | DiVA | Điểm đặc biệt nhất trong quá trình xây dựng MMV Vision 2035 | `B` | — | Chưa duyệt |
| `B07` | THINK | Vision nhất quán | Vì sao MMV cần Vision dài hạn và nhất quán khi lãnh đạo thay đổi | `A` | — | Chưa duyệt |
| `B08` | THINK | Decode Message | “Vươn xa không giới hạn” có nghĩa là thay đổi liên tục không mục tiêu? | `B` | — | Chưa duyệt |
| `B09` | THINK | Think Twice GX | Genba tự chủ xử lý công việc đã đủ thực hiện GX chưa | `C` | — | Chưa duyệt |
| `B10` | THINK | Challenge | Điều nào thể hiện đúng nhất tinh thần Challenge | `A` | — | Chưa duyệt |
| `B11` | THINK | Commitment | Điều nào thể hiện đầy đủ nhất tinh thần Commitment | `B` | — | Chưa duyệt |
| `B12` | CONNECT | Ý tưởng mới | Đồng nghiệp đề xuất cách làm mới khác nhóm hiện tại | `A` | — | Chưa duyệt |
| `B13` | CONNECT | Integrity | Phát hiện số liệu sai sót nhưng sửa có thể làm KPI thấp hơn | `B` | — | Chưa duyệt |
| `B14` | CONNECT | CX | Hai bộ phận có ý kiến khác nhau về cách giải quyết vấn đề | `C` | — | Chưa duyệt |
| `B15` | CONNECT | DiVA | Nhân viên địa phương đủ thông tin giải quyết vấn đề trong thẩm quyền | `A` | — | Chưa duyệt |

---

## 3. Các Vấn đề Dữ liệu Cần Xử lý Trước khi Go-Live

1. **Hoàn thiện asset ảnh gốc (10 câu LOOK + ảnh tình huống CONNECT)**:
   - Trích xuất từ `Giải thích tầm nhìn MMV 2035 (VN).pptx` hoặc e-Document Vision 2035 chính thức (không tự vẽ lại icon cho câu nhận diện), nén về WebP/PNG nhẹ trước khi upload lên bucket `quiz-assets` trên Supabase Storage.
   - Thiết kế thêm hình B thiếu 1 giá trị cho câu `A05` và xác minh biểu tượng Challenge cho câu `B05`.
2. **Thiên lệch phân bố đáp án (`A` / `B` / `C`)**:
   - Trong Bộ A, toàn bộ 5 câu `A01`–`A05` đều có đáp án đúng là `A`. Nếu đưa nguyên lên web mà không trộn lựa chọn, người làm sẽ dễ đoán theo quy luật.
   - **Giải pháp hệ thống**: Hỗ trợ cột `shuffle_options = true` cho từng câu (tắt cờ này đối với các câu cố định theo nhãn hình như *“Hình A / Hình B / Cả hai”* ở `A05`).
3. **Đồng bộ thêm câu hỏi từ Mockup UI**:
   - Mockup [diva_quiz_ui_mockup.png](../../assets/diva_quiz_ui_mockup.png) minh họa dạng **Chặng 2 THINK — điền nhiều chỗ trống (A–F)** và **Chặng 1 LOOK — chọn trực tiếp thẻ hình A/B/C**. Schema PostgreSQL trên Supabase đã thiết kế sẵn JSONB cho các dạng này để mở rộng ngân hàng câu hỏi lên 30–40 câu.
