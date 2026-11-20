# Miaozi v2.2 — kế hoạch (chờ chủ chốt)

Phiên bản sống: 2.1.0 (commit a9a5687). Đây là kế hoạch khảo sát, **chưa sửa app**. Làm sau khi chủ chốt.

Ưu tiên: đỡ tốn usage, chỉ đụng phần cần, giao diện sạch, chủ yếu dùng trên Xiaomi Pad 8.

---

## 1. Nút chức năng bị lặp

Thanh dưới (giữ nguyên thứ tự): Hôm nay · Viết · **Bài học** · Luyện thêm · Cài đặt.

### Gỡ / gộp (lặp thật)

| Chỗ | Việc gì | Đề xuất |
|---|---|---|
| **Hôm nay** | Chip «🔥 Chuỗi N ngày» *và* nút «🔥 Streak» ngay dưới cùng trang, cùng vào `/streak` | **Gỡ nút dưới.** Giữ chip (đúng chỗ đã chốt). |
| **Hôm nay + Luyện thêm** | Cả hai trang đều có cặp nút «Kiểm tra tuần / tháng» | **Giữ ở Hôm nay** (đúng nhịp tuần). **Gỡ khỏi Luyện thêm.** |
| **Cài đặt + Luyện thêm** | Nút «Bài đọc» trong Cài đặt mở `/reading` — cùng nội dung đã nằm trong Luyện thêm | **Gỡ nút Bài đọc ở Cài đặt.** |
| **Header + Hôm nay + Cài đặt** | Công ty đang có 3 chỗ: icon ☕/▣ trên header (mọi màn), nút «Chế độ Công ty» ở Hôm nay, và công tắc trong Cài đặt | **Gỡ icon header** (dễ bấm nhầm, trùng nút Hôm nay). **Giữ nút 3 chế độ ở Hôm nay** + công tắc trong Cài đặt. Header vẫn ghi «🏢 Công ty ·» khi đang bật. |

### Giữ (không phải lặp nav)

| Chỗ | Việc gì | Lý do giữ |
|---|---|---|
| Chip Streak ở Hôm nay **và** nút Streak trong Cài đặt | Vào lịch chuỗi | Streak **không** nằm trên thanh dưới — đây là lối phụ đã chốt, không giống vụ 2 nút Lịch trước đây. |
| Nút «Vào bài N» ở Hôm nay **và** tab Bài học | Cùng vào bài hiện tại | Tab là lối toàn app; nút là hành động chính của thẻ bài. **Giữ cả hai.** Thanh 6 mục vẫn là lối tắt vào đúng mục. |
| Nút «Lộ trình 19 bài» ở Hôm nay | Không có trên thanh dưới | **Giữ.** |
| «Chép phạt» ở Cài đặt, Mục 1 của bài, và thẻ «Đang nợ» | Nhiều lối vào cùng việc phạt | Mỗi chỗ đúng ngữ cảnh. **Giữ.** |
| «Ôn thẻ», «Luyện nói», «Tra từ», «Sổ lỗi», «Tuần 0» trong Cài đặt | Không có trên thanh dưới | **Giữ** các mục này ở Cài đặt. Có thể *thêm* lối «Ôn thẻ» vào Luyện thêm nếu chủ muốn, không bắt buộc. |

Trang cũ v1 (`/today/morning`, `/lesson-old`…) vẫn còn trong mã nhưng không hiện trên nav v2 — không đụng ở v2.2.

---

## 2. Ôn bộ thủ (bài riêng + bộ hay gặp)

### Đã có

- Tuần 0, mục 4: đúng **30 bộ** (`人口女子女日月水火木土心手言食金丝艹竹刀力又辶门雨山目田贝车马`), có biến thể (亻 氵 灬 忄…) và 3 chữ ví dụ. Chỉ là danh sách đọc, bấm «Xong» là xong — **không có ôn / thẻ / quiz riêng**.
- Phân tích chữ (Mục 2): 278 chữ HSK1 có `parts` + nghĩa Hán Việt + mẹo ngắn (`hanziInfo.ts`). `PART_VI` có 85 mảnh.
- Kiểm tra Nền móng: 6 câu «Bộ thủ này nghĩa / tên là gì?» (氵 亻 讠 口 木 心).
- Link 214 bộ trên Nhai (`nhaihsk.com/radicals`) chỉ nằm ở kế hoạch tuần cũ (v1), **chưa hiện trên trang Tuần 0 v2**.

### Đề xuất: mục «Ôn bộ thủ» trong **Luyện thêm**

Ba phần:

1. **Danh sách ~50 bộ hay gặp** — mặt bộ, pinyin, Hán Việt, biến thể (亻/人, 氵/水, 忄/心, 扌/手, 讠/言…), nghĩa ngắn, vài chữ HSK1 ví dụ.
2. **Thẻ ôn** — tái dùng SRS sẵn có (`srs.ts`, kiểu SM-2 như «Ôn thẻ»). Chấm Lại / Khó / Tốt / Dễ. Lưu tiến độ theo bộ (`radical::口::recognize`).
3. **Quiz** (trắc nghiệm):
   - Bộ → nghĩa
   - Chữ → chọn đúng bộ
   - Tìm chữ cùng bộ
   Ghi số bộ đã thuộc, chuỗi ôn (nhẹ, trong dữ liệu sẵn).

Tuần 0 giữ nguyên 30 bộ (bài nhập môn). Ôn bộ thủ là chỗ luyện lâu dài. Thêm link Nhai 214 bộ ở cuối danh sách (bản đủ, không nhét 214 bộ vào app).

### Dữ liệu «bộ hay gặp» — không cần bộ dữ liệu ngoài

Đếm mảnh trong 278 chữ (đã gộp biến thể): **70 bộ** xuất hiện; **50 bộ** gặp ≥ 2 lần.

Hay gặp nhất: 口 (28), 人/亻 (19), 木 (14), 言/讠 (11), 女 (10), 日 (10), 月 (9), 水/氵 (7), 土 (7), 宀 (6), 手/扌 (6), 子/心/又/辶 (5)…

Trong 30 bộ Tuần 0, **山 không xuất hiện** ở HSK1. Thiếu so với 30 nhưng hay gặp: **宀, 一, 十, 八, 见, 夕, 王 (ngọc), 大, 囗, 小, 斤, 欠, 阝**.

Đề xuất danh sách 50 = 29 bộ Tuần 0 (bỏ 山, hoặc để 山 ở nhóm phụ) + các bộ thiếu ở trên + bộ còn lại có tần suất ≥ 2 (食 金 丝 竹 车 马 广 彳 走 疒…). Tự soạn từ dữ liệu đã có + `PART_VI`. File khoảng **10–15 KB**. Không cần bộ 214.

Lưu ý: `parts` là chiết tự, không phải bộ thủ Kangxi chuẩn 100%. Đủ cho HSK1; vài chữ sẽ ghi chú nếu bộ «chính» khác mảnh đứng đầu.

---

## 3. Tối ưu tablet (Xiaomi Pad 8)

Màn ~11.2", 3200×2136, DPR ~2.5 → khung CSS khoảng **1280×853 ngang** / **853×1280 dọc**.

### Hiện tại (chủ yếu cho điện thoại)

- Nội dung `max-width: 980px`, canh giữa — bản ngang còn hai lề trống, trang vẫn xếp **một cột**.
- Thanh dưới luôn cố định; nút Bài học tròn đè lên thanh.
- Ô viết hanzi-writer **260px** (thu 220px khi hẹp) — hơi nhỏ cho bút.
- Có media `880px` + cao ≤ 850px («landscape tablet») nhưng chỉ áp cho `.grid.today` của trang v1, **trang Hôm nay v2 không dùng**.
- Nút 44px, chữ Hán 56px — tạm được, chưa tận dụng màn lớn.
- Lưới 2/3 cột không nới thêm khi màn rộng.

### Đề xuất (giữ màu nền/chủ đề mèo; màu mới nếu chốt mục 5)

Mốc: **≥768** (dọc tablet), **≥1024** (ngang). Điện thoại không đổi bố cục.

- Nới `max-width` ~1120–1200px; tăng cỡ chữ Hán (~72px), nút ~48–52px, ô quiz.
- **Hai cột** khi ngang:
  - Hôm nay: trái = chế độ + bài + 6 mục; phải = kiểm tra + đang nợ + lộ trình.
  - Luyện thêm: trái = shadowing + dịch; phải = đọc hiểu (+ ôn bộ thủ).
  - Bài học: lưới từ vựng 2 cột; Tuần 0 / bộ thủ 3–4 cột.
- **Thanh điều hướng:** dọc = giữ thanh dưới. **Ngang (≥1024): thanh bên trái** (icon + chữ), nội dung bên phải — khỏi mất chiều cao, đỡ đè thanh loa. Đây là thay đổi bố cục lớn nhất, cần thử trên Pad 8.
- Ô viết / hanzi-writer: `min(420px, 45vmin)`, giữ `touch-action: none` và lực nhấn (canvas ghi chú đã có). Lưới nhiều chữ 2–3 ô/hàng khi ngang.

Không làm giao diện riêng cho từng máy, không đổi luồng học.

---

## 4. «Mẹo nhớ nhanh» (câu chuyện chiết tự)

**Không gọi AI trong app** (đã chốt): soạn sẵn, đóng vào app, bấm là hiện, chạy khi mất mạng, không cần khóa API.

### Hiện tại

- 278/278 chữ HSK1 đã có mẹo ngắn (`hanziInfo.note`), dài 13–86 chữ, trung vị 30. Kiểu «mảnh + nghĩa», thơ, dễ nhớ vừa phải — **chưa phải câu chuyện hài**.
- Hiện luôn khi mở thẻ từ ở Mục 2 (cùng bộ thủ / Hán Việt / link Nhai). Không có nút riêng.
- Trường `mnemonic` trong giáo trình **đều trống** (428 chỗ). Không dùng.
- Ví dụ chủ đưa (赢) là chữ **HSK4**, chưa có trong app.

### Đề xuất

- Nút **«Mẹo nhớ nhanh»** trên thẻ chữ (Mục 2, có thể thêm ở ôn thẻ / phân tích). Bấm ra: các bộ/mảnh + **câu chuyện ngắn, vui, tiếng Việt** (2–4 câu).
- Giữ dòng mẹo ngắn hiện có; chuyện dài nằm sau nút, khỏi rối thẻ.
- **Viết chuyện cho cả 278 chữ** cho đều tay (phần tốn usage nhất của v2.2). Nếu chủ muốn tiết kiệm hơn: chỉ viết ~150–180 chữ ghép (nhiều mảnh), chữ tượng hình giữ mẹo ngắn.
- HSK2–4: soạn kèm khi làm bài, cùng định dạng, đóng vào app — không gọi AI lúc học. 赢 sẽ có khi tới HSK4.

Dung lượng: ~278 × 80–150 chữ ≈ 30–50 KB.

---

## 5. Đổi màu: hồng pastel + xanh dương

### Màu đang dùng

Hầu hết nằm ở biến CSS trong `:root` (`styles.css`): nền kem `#FFF8EC`, nhấn hồng-cam `#B64E5C`, vàng chip, đào, cam lấp lánh `#E0874F` / `#F4B860` (thanh tiến trình, mục gợi ý, nút Bài học).

Còn khoảng **40 mã hex rải** trong CSS (lịch Streak, báo cáo, thanh loa, sáu mục…) và vài chỗ trong mã (mèo cam, nét viết, biểu đồ thanh điệu). Chế độ Công ty **không** còn theme xám — không đụng lại.

### Pallete đề xuất (dễ đọc, không dùng pastel làm chữ)

| Vai trò | Mã | Ghi chú tương phản |
|---|---|---|
| Nền | `#F7F3F8` | hồng-tím rất nhạt |
| Thẻ | `#FFFBFD` | |
| Chữ chính | `#2F2430` | AAA trên nền (~13.5) |
| Chữ phụ | `#5E4B58` | đậm hơn muted hiện tại, AAA (~7.3) |
| Hồng pastel (nền chip / chế độ đang bật) | `#F6D0DE` | chữ vẫn `#2F2430` |
| Xanh pastel (nút phụ, thẻ phụ) | `#D4E5F7` | chữ xanh đậm `#245A86` (AA) |
| Nút chính / link | `#B02E56` | chữ trắng, AA+ (~6.2) — không dùng hồng nhạt cho nút |
| Xanh đậm (phụ) | `#286496` | chữ trắng (~6.3) |
| Đạt | nền xanh nhạt giữ; **chữ** `#1E5A36` (đậm hơn, dễ đọc) | |
| Sai | giữ `#C4473A` | |
| Lấp lánh / mục gợi ý | viền + ✦ màu `#B02E56` | bỏ cam `#E0874F` kẻo lệch theme |
| Thanh tiến trình + nút Bài học | gradient **hồng → xanh** `#E890B0` → `#6FA3D0` / `#5B8FBF` | |

Vàng chip / đào nút mặc định đổi sang hồng pastel. Xanh–đỏ đúng/sai **giữ vai trò**, chỉ đậm chữ «Đạt».

Mèo (SVG cam) và logo kem: **chờ chủ** — giữ cam cho nổi, hoặc nhuộm hồng-kem cho khớp theme.

Việc làm: đổi `:root`, gom các hex cam/vàng rải vào biến, chỉnh mèo nếu chốt. Rẻ, không đụng luồng học. Công ty vẫn dùng pallete thường.

**Bản xem trước tĩnh** (chưa đổi app): `shots/v22/palette-preview.png`.

---

## Ước lượng usage (cả 5 mục, sau khi chốt)

So với v2.0 / v2.1 (~16% usage tuần):

| Mục | Ước lượng | Ghi chú |
|---|---|---|
| 1. Gỡ nút lặp | ~2% | Ít, an toàn |
| 2. Ôn bộ thủ | ~8–10% | Trang mới + dữ liệu 50 bộ + quiz + SRS |
| 3. Tablet | ~6–8% | CSS + vài bố cục; thử ngang/dọc |
| 4. Mẹo nhớ 278 chuyện | ~12–16% | **Nặng nhất** (soạn nội dung) |
| 5. Đổi màu | ~3–4% | Chủ yếu CSS |
| **Tổng** | **~30–40%** | |

Nếu mục 4 chỉ viết chuyện cho chữ ghép (~150–180 chữ): tổng khoảng **~25–30%**.

Làm theo thứ tự: (1) nút lặp → (5) màu → (3) tablet → (2) bộ thủ → (4) mẹo nhớ, để phần nội dung nặng để sau.

---

## Rủi ro và câu hỏi cho chủ

**Rủi ro**

- Thanh bên lúc ngang là thay đổi lớn — phải thử thật trên Pad 8 (bút, thanh loa, nút Bài học).
- `parts` không phải bộ Kangxi chuẩn từng chữ; vài chữ sẽ có chú thích.
- Soạn 278 chuyện tốn usage; chất lượng cần vui nhưng đúng mảnh, không bịa sai bộ.
- Đổi màu còn hex rải; nếu sót cam, theme sẽ lệch — sẽ rà một lượt.

**Hỏi chủ trước khi làm**

1. Chốt cả 5 mục, hay bớt / hoãn mục nào (mẹo nhớ nặng nhất)?
2. Mẹo nhớ: viết **cả 278** hay chỉ chữ ghép?
3. Thanh điều hướng lúc **ngang**: đồng ý chuyển sang **thanh trái**? (Dọc vẫn thanh dưới.)
4. Mèo: **giữ cam** hay nhuộm hồng-kem?
5. Pallete trong `shots/v22/palette-preview.png`: chốt vậy, hay muốn hồng/xanh đậm hơn / nhạt hơn?

Không đụng Drive, chấm nói, đồng bộ, hay tính năng khác. Chốt rồi em mới bắt tay vào làm.
