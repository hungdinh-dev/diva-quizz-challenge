# 03. Hệ thống Thiết kế Giao diện DiVA (UI/UX Design System)

Thiết kế giao diện phân hệ người chơi bám sát 100% nhận diện từ 3 file ảnh trong workspace:
- [02bf1a05-c1e3-4f69-86ed-ab958ef0139f.png](../../02bf1a05-c1e3-4f69-86ed-ab958ef0139f.png) (DiVA Blueprint & Color Palette)
- [e2862e18-4ac3-435f-b8f0-797447ac7ff4.png](../../e2862e18-4ac3-435f-b8f0-797447ac7ff4.png) (DiVA Emotion Expression Sheet)
- [FFOxLAAAABklEQVQDABZOsBE3YU2tAAAAAElFTkSuQmCC.png](../../FFOxLAAAABklEQVQDABZOsBE3YU2tAAAAAElFTkSuQmCC.png) (4 Screen UI Mockups)

---

## 1. Design Tokens & Bảng Màu Chuẩn

### 1.1. Bảng màu Mascot DiVA (Từ Blueprint chính thức)
| Token | Mã Hex | Vai trò sử dụng |
| :--- | :---: | :--- |
| `--diva-green` | `#8BC34A` | Màu da chủ đạo Tắc kè DiVA, badge hoàn thành |
| `--diva-yellow` | `#FFD54F` | Màu nhấn nút CTA (*BẮT ĐẦU KHÁM PHÁ*), thẻ đáp án được chọn |
| `--diva-orange` | `#FF8A00` | Viền nổi bật nút, huy hiệu số thứ tự đáp án A/B/C |
| `--diva-red` | `#E53935` | Ruy-băng tiêu đề chặng (`Chặng 1: LOOK`), nón lá DiVA, nền màn chào |
| `--diva-star` | `#FFEB3B` | Điểm nhấn ánh sáng, sao vàng, hiệu ứng ăn mừng |
| `--diva-blue` | `#42A5F5` | Màu nhấn chặng 2 `THINK` / gai lưng DiVA |
| `--diva-purple` | `#AB47BC` | Màu nhấn đuôi DiVA, badge nâng cao |
| `--diva-pink` | `#FF6F91` | Điểm nhấn phụ đuôi DiVA |
| `--diva-ink` | `#212121` | Đường viền comic đậm (`2px–3px solid #212121`), chữ tiêu đề chính |
| `--diva-white` | `#FFFFFF` | Nền bong bóng thoại, thẻ đáp án |

### 1.2. Bảng màu Nền Giấy & Khung Giao diện (Từ UI Mockup)
- **Nền giấy da (Parchment Card)**: `#FDF6E3` / `#F7EBD3`
- **Nền trời/xưởng chuyển sắc dịu**: `#D7E2DC` → `#B8C7BE` (có bóng nhà máy MMV mờ phía chân trời như trong mockup Chặng 1)
- **Đỏ thẫm màn chào (Crimson Sunburst)**: `#8E1B1B` → `#B71C1C`
- **Bóng đổ kiểu Comic (Hard Shadow)**: `0 4px 0 #212121` cho nút CTA và thẻ đáp án, tạo cảm giác bấm nảy thực tế trên màn hình cảm ứng.

---

## 2. Typography & Khả năng đọc trên Mobile
- **Font tiêu đề / Ruy-băng chặng**: Font nét dày thân thiện, hỗ trợ đầy đủ dấu Tiếng Việt (đề xuất: **Baloo 2** hoặc **Be Vietnam Pro ExtraBold**).
- **Font nội dung câu hỏi & giải thích**: **Be Vietnam Pro** (Regular / SemiBold), tối ưu đọc tiếng Việt có dấu trên màn hình điện thoại nhỏ.
- **Kích thước chuẩn Mobile**:
  - Tiêu đề ruy-băng chặng: `20px–22px` Bold
  - Câu hỏi chính: `17px–18px` SemiBold, `line-height: 1.45`
  - Phương án trả lời: `15px–16px` Medium, vùng chạm tối thiểu `48px–56px`

---

## 3. Mascot State Machine (DiVA Phản ứng Theo Ngữ cảnh)

Thay vì đặt 1 hình tĩnh, Mascot DiVA tự động đổi tư thế/biểu cảm theo trạng thái phiên làm bài:

| Ngữ cảnh trong App | Pose / Biểu cảm DiVA | Lời thoại mẫu ngắn gọn |
| :--- | :--- | :--- |
| Màn hình Chào | `Presenting` | *"Cùng DiVA khám phá Tầm nhìn 2035 qua hành trình giải đố thú vị!"* |
| Vào Chặng 1: `LOOK` | `Explore` (ống nhòm) / `Pointing` | *"Hãy quan sát thật kỹ và chọn hình đúng tinh thần MMV nhé!"* |
| Vào Chặng 2: `THINK` | `Thinking` (với dấu `?`) | *"Cùng suy luận để hoàn thành thông điệp Vision 2035 nào!"* |
| Vào Chặng 3: `CONNECT` | `Determined` / `Wink` | *"Trong tình huống công việc này, bạn sẽ hành động thế nào?"* |
| Đang chọn đáp án | `Curious` → `Idea` | *(Chuyển biểu cảm nhẹ khi người chơi tap chọn phương án)* |
| Chờ lâu chưa chọn (> 45s) | `Confused` / `Sleepy` *(vui vẻ)* | *"Bí rồi à? Cứ bình tĩnh đọc kỹ gợi ý nhé!"* |
| Hoàn thành điểm cao (≥ 12/15) | `Cheering` / `Excited` | *"Tuyệt vời! Bạn hiểu rất rõ tinh thần Vision 2035 rồi đấy!"* |
| Hoàn thành điểm trung bình/thấp | `Happy` / `Determined` | *"Cố lên! Xem ngay phần giải thích bên dưới để khám phá thêm nhé!"* |

---

## 4. Responsive Layout: Mobile-First vs Desktop

- **Trên Mobile (`< 768px` — Ưu tiên hàng đầu cho Genba)**:
  - Khung câu hỏi full chiều rộng (`max-width: 480px`), loại bỏ chi tiết trang trí rườm rà che mất chữ.
  - DiVA thu nhỏ đặt gọn cạnh bong bóng thoại đề bài ở phía trên.
  - Các thẻ hình ảnh A/B/C hoặc các nút đáp án xếp dọc 1 cột (hoặc lưới 2 cột gọn cho A–F điền khuyết), luôn có nút **“Tiếp theo”** cố định dễ với tới bằng ngón tay cái ở đáy màn hình.
- **Trên Desktop / Tablet (`>= 768px`)**:
  - Hiển thị khung thẻ bài tỷ lệ `16:9` / `16:10` giống hệt bố cục 4 màn hình trong ảnh mockup:
    - Chặng 1 `LOOK`: DiVA chỉ tay bên trái, 3 thẻ hình A/B/C dàn ngang bên phải.
    - Chặng 2 `THINK`: DiVA suy nghĩ bên trái, bảng giấy cuộn + 6 nút A–F bên phải.
    - Chặng 3 `CONNECT`: Khung ảnh tình huống bên trái, 3 thanh đáp án bên phải + DiVA *Wink* ở góc.
- **Trên Trang Admin (`/admin`)**:
  - Sử dụng layout dashboard chuẩn hiện đại (Sidebar trái + Bảng dữ liệu rộng + Drawer xem timeline), ưu tiên sự rõ ràng và tốc độ thao tác của HR/Admin trên PC.
