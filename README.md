# Miaozi — HSK (luyện viết + kiểm tra)

PWA luyện viết chữ Hán theo bài HSK 1 / HSK 2 và kiểm tra, giao diện tiếng Việt. Live: https://tieuly1370-hub.github.io/
**Tài liệu kiến trúc cho người / AI làm tiếp: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).**

## 2.4.0 — bản gọn: Bài học · Kiểm tra · Cài đặt, thêm HSK 2, chấm viết chặt
- **Điều hướng gọn:** trang chính là HSK 1 / HSK 2 / HSK 3 (Sắp có) dạng xổ → bấm bài → màn Viết của bài. Thanh dưới chỉ 3 tab:
  Bài học, Kiểm tra, Cài đặt. Không khoá bài. Các phần cũ (lộ trình, 6 mục, luyện thêm, bộ thủ, giáo trình…) ẩn khỏi điều hướng, code vẫn giữ.
- **Ẩn** streak, chế độ (Công ty / Nhà), giờ nhắc học, thưởng tuần. Xưng hô chủ/cậu vẫn đổi trong Cài đặt.
- **Màn Viết sắp lại:** thẻ chữ = chữ + **Nghe** (chạm lại trong 4 giây → nghe chậm) + "Nghe <từ>" + Khó; dưới ô viết là hàng công cụ
  (Hoàn tác · Viết lại · Xem mẫu · Ẩn mẫu); hàng chuyển từ riêng (‹ Trước / Từ tiếp ›); PDF và Ghi chú tay là link nhỏ ở cuối;
  nút "Đánh dấu đã học xong bài".
- **Kiểm tra:** chọn cấp + tuần (3 bài xong gần nhất) / tháng / từng bài; **chỉ lấy bài đã học xong**; các dạng: nghe chọn chữ (chữ dễ nhầm),
  nghe/đọc xếp câu, chọn nghĩa, viết. Không có câu Nói.
- **Chấm viết chặt** khi Ẩn mẫu và trong Kiểm tra: từng nét phải đúng vùng, các thành phần của chữ đúng vị trí và tỉ lệ
  (`src/v2/strictGrade.ts`). Viết có mẫu vẫn khoan dung như cũ.
- **HSK 2** (theo HSK Standard Course 2, 15 bài = bài toàn cục 20–34): 172 từ, 45 câu, 101 chữ mới (Hán Việt, cấu tạo, mẹo nhớ, nét),
  âm thanh edge-tts + audit Whisper. Từ vựng: [joelypoley/hsk_standard_course_vocab](https://github.com/joelypoley/hsk_standard_course_vocab);
  nghĩa tiếng Việt và câu ví dụ do Miaozi tự soạn; mẹo nhớ HSK 2 sinh theo mẫu từ cấu tạo Make Me a Hanzi.
- Sửa âm 很 (trước bị đọc như 哼). Dữ liệu cũ trong IndexedDB `lohan` giữ nguyên; thêm `v2.doneLessons` (gộp kiểu hợp khi đồng bộ).
- Kiểm thử: `python3 scripts/test_v24.py` (Playwright) + `node --experimental-strip-types tests/*.test.ts` (xem docs).

Web app (PWA) học tiếng Trung HSK1 cùng gia sư mèo **Miao**. Học trên Nhai HSK, tổng hợp – ôn – kiểm tra – kỷ luật ở Miaozi. Tiếng Việt, chạy trên máy, miễn phí.

## 2.1.0 — sửa theo góp ý: 3 chế độ, không chờ thi lại, Streak, Luyện thêm, đồng bộ Drive

- **Bài nghe trợ từ (吗 呢 吧 了 的 们 上):** âm đọc cả cụm (好吗, 你呢…) nên câu hỏi và phương án cũng là cả cụm, chỉ khác đúng chữ cần nghe (`CARRIER` trong `src/gate.ts`, khớp `public/audio/index.json` trường `c`). Không bắt nói riêng một trợ từ.
- **Chế độ:** chỉ còn 🏢 Công ty (giao diện bình thường, gợi ý mục 2/3/6A, tự phát cách 2 s + ẩn pinyin), 🔋 Cạn pin (3 lượt/tuần, reset thứ Hai) và 🛌 Xin nghỉ. Không chọn → tự gợi ý mục tiếp theo. Ngày đã chọn Tiêu chuẩn/Bứt phá được chuyển thành "không chọn".
- **Xin nghỉ:** không đứt chuỗi; lần mở app sau đó sinh chép phạt: chưa có phạt → 5 từ của bài gần nhất; đang có phạt → thêm 5 từ; tổng ≤ số từ mới của bài (`offPenaltyWords` trong `src/v2/queue.ts`).
- **Không làm mờ mục;** mục gợi ý lấp lánh (tắt hiệu ứng khi máy bật giảm chuyển động).
- **Bỏ mọi thời gian chờ thi lại** (mục 3, 6A/6B, tuần, tháng, thi vượt bài).
- **Thanh dưới:** Hôm nay · Viết · BÀI HỌC (nút giữa) · Luyện thêm · Cài đặt. Luyện thêm = shadowing Nhai, dịch, đọc hiểu, kiểm tra.
- **Streak** (`#/streak`, mở từ chuỗi ở Hôm nay hoặc Cài đặt): chỉ lịch ngày học / xin nghỉ / bỏ lỡ + chuỗi hiện tại, dài nhất.
- **Bộ phát chung** (`src/audio.ts`): một âm tại một thời điểm, thanh nổi Tạm dừng/Tiếp/Dừng, chuỗi tự phát dừng được.
- **Nói:** nghe liên tục tới khi im 2,5 s sau khi nói (không dừng trước 3 s, tối đa 15 s) hoặc bấm "Xong"; Android tự kết thúc thì mở lại (`src/v2/speakTiming.ts`, `src/v2/listen.ts`).
- **Báo cáo điểm yếu** thứ Hai ở Hôm nay: chữ sai nhiều nhất 7 ngày, kỹ năng yếu nhất (từ bài 6A/6B/tuần/tháng); Miao giao chép phạt ≤ 5 chữ sai nhiều nhất.
- **Tải nhanh:** các trang tải lười; gói đầu 717.74 kB (gzip 277.74) → ~206 kB (gzip ~67).
- **Đồng bộ Google Drive** (`src/sync/`): Google Identity Services + Drive REST, phạm vi `drive.appdata`, file `miaozi-sync.json` trong thư mục ẩn của app. Gộp: từng bản ghi bản mới hơn thắng, chuỗi/lịch sử hợp lại, mục đã xong giữ xong. Client ID ở `src/sync/config.ts`; origin được phép: `https://tieuly1370-hub.github.io`, `http://localhost:5173`. Không có máy chủ nên token sống ~1 giờ; hết hạn thì bấm "Đồng bộ ngay".
- Kiểm thử: `node --experimental-strip-types tests/{queue,speak_timing,merge}.test.ts`; `npx esbuild tests/carrier.test.ts --bundle --platform=node --format=esm --outfile=/tmp/c.mjs && node /tmp/c.mjs`; Playwright `scripts/test_v21.py` (thay `test_v2.py`).

## 2.0.0 — Miaozi: 6 mục / bài, 4 chế độ, Smart Queue

- Đổi tên Lò Hán → **Miaozi**, gia sư Miêu → **Miao** (mèo SVG tự vẽ, icon PWA tạo từ SVG). Dữ liệu IndexedDB giữ nguyên tên cũ `lohan` để không mất tiến độ.
- Mỗi bài 6 mục cố định (S1 0%, S2 25%, S3 25%, S4 20%, S5 15%, 6A 7,5%, 6B 7,5%), mục sáng/mờ theo chế độ, nút “Đánh dấu hoàn thành” chỉ bật khi đạt điều kiện (ghi rõ trên từng mục), thanh 6 ô + thanh %.
- 4 chế độ: Công ty (xám/trắng, không mèo, chỉ mục 2/3/6A, phát audio tự động 2 giây, ẩn/hiện pinyin), Cạn pin (3 lượt/tuần, reset thứ Hai), Tiêu chuẩn, Bứt phá (+ dịch, bài đọc, shadowing chung).
- Bỏ qua mục → “nợ” hạn Chủ nhật; quá hạn → chép phạt + khóa bài sau. Hôm nay bận (2 lần/tuần, không đứt chuỗi). Thi vượt bài (≥ 85%). Kiểm tra tuần (Chủ nhật) + tháng (tuần cuối tháng, toàn bộ từ đầu HSK1). Lịch tháng có màu chế độ, phút học, ghi chú ngày.
- Bài đọc tự soạn theo cấp (`src/data/reading.ts`, kiểm bằng `scripts/v2/check_reading.mjs`), phân tích 278 chữ HSK1 (`src/data/hanziInfo.ts`) + link Nhai `/hanzi/<chữ>`, chấm câu theo luật (`src/v2/grader.ts`).
- Sửa chấm nói (`src/v2/speakScore.ts`, `src/v2/listen.ts`): so pinyin không dấu có căn chỉnh, chấp nhận phồn thể/dấu câu/số/đồng âm, hiện chữ máy nghe được; thanh điệu đo bằng YIN chỉ để tham khảo. Android: không thu âm song song với nhận giọng.
- Viết: cho sai tối đa 5 nét/chữ, nút Ẩn nét mẫu, trạng thái viết lưu trong store (sang Ghi chú tay không mất). Chép phạt không bắt PDF, có ẩn/hiện chữ mẫu. Thi lại sau 10 phút.
- Test: `node --experimental-strip-types tests/{queue,grader,speech,yin_tts,yin_words}.test.ts`, `scripts/test_v2.py` (cần `npx vite preview --port 4173`).


## 1.2.0 — Lộ trình + gia sư, học trên Nhai HSK, cổng 4 kỹ năng

- Nội dung học dẫn sang Nhai HSK (https://nhaihsk.com): từ vựng/ngữ pháp HSK1 (`/course/hsk1?skill=vocab|grammar`), phân tích chữ (`/hanzi`), bài khoá (`/reading`), shadowing (`/shadowing`), ôn tập (`/review`), pinyin (`/pinyin`), bộ thủ (`/radicals`), thi chứng chỉ (`/certificate-test`). Có ô ghim link đúng bài Nhai cho từng bài.
- Bước Nhai trong Hôm nay: phải mở link và ở lại ≥ nửa thời gian mới bấm được "Đã học xong".
- Cổng qua bài (`src/gate.ts`, `src/pages/exam.tsx`): Nghe, Đọc, Nói, Viết thi riêng; mỗi kỹ năng ≥ 80% đúng ngay lần đầu; Viết = viết lại toàn bộ từ của bài từ trí nhớ (không pinyin, không nét mờ, không gợi ý; sai > 1 nét/chữ = trượt câu), đúng 100%, sai 2 lần → chép phạt 10 lần + thi lại ngày mai; có bốc ngẫu nhiên từ bài cũ. Phương án gài: chữ na ná, cùng âm khác thanh; ghép câu có mảnh gài; giới hạn thời gian và số lần nghe; câu sai quay lại sau, không làm lại ngay. Nói chỉ hiện tiếng Việt, cần Chrome/Edge (không có nhận giọng nói thì "đang chờ", không bỏ qua được).
- Ca học chỉ được tính khi kiểm tra cuối ca đạt (`/check/morning`, `/check/evening`, `/check/weekly`). Ngày học của bài chỉ sang ngày tiếp khi cả hai kiểm tra ca đạt.
- Chuyển dữ liệu: cổng bài cũ bị đặt lại (điểm cũ lưu ở `legacyPassed`), thẻ ôn/sổ lỗi/chuỗi giữ nguyên.
- Miao nói giọng gắt, ngắn, chỉ khen khi đạt.
- Test: `scripts/test_v12.py` (cần `npx vite preview --port 4173`).

## Dùng

- Mở trang, cài ra màn hình chính trên điện thoại / tablet.
- Trên máy công ty: mở bằng trình duyệt, bật **Chế độ công ty**.
- Xuất/nhập JSON để chuyển tiến độ giữa các máy.
- Lần đầu nên bấm **Tải dữ liệu ngoại tuyến** (trong Thêm) để lưu âm thanh và nét chữ.

## Lộ trình

1. Tuần 0 — Nền móng (pinyin, thanh điệu, 8 nét, bộ thủ).
2. Mỗi bài 3 ngày: xem video + từ mới → luyện chữ → câu + kiểm tra.
3. Bài sau chỉ mở khi kiểm tra ≥ 80%, có phần nhận mặt chữ **không pinyin**.
4. Hết 15 bài: tuần ôn + 2 đề thi thử (nghe + đọc).

## Lịch mặc định

- T2–T6 sáng: nghe + đọc, tối thiểu 30 phút (tối đa 120).
- T2–T6 21:00–21:30: nói + viết (tablet).
- T7: học bù / ôn nhẹ 15 phút nếu không nợ bài.
- CN: nghỉ, tối 20:00 kiểm tra tuần 20 phút.

Chuỗi ngày: ngày nghỉ không phá chuỗi; học bù trong 48 giờ vẫn giữ chuỗi. Buổi chỉ tính khi làm đủ thời gian thật (không idle) và đúng ≥ 70%.

## Phát triển

```bash
npm install
npm run dev
npm run build
npm run preview
```

Tạo lại audio: `python3 scripts/gen_audio.py` rồi `python3 scripts/gen_audio2.py` (cần `edge-tts`).

Pinyin + Giáo trình: sửa `scripts/textbook_src.py`, chạy `python3 -c "import json,sys; sys.path.insert(0,'scripts'); import textbook_src as t; json.dump(t.T, open('scripts/textbook-src.json','w'), ensure_ascii=False)"` rồi `node --experimental-strip-types scripts/build_content.mjs`.

Font PDF (`public/fonts`): Noto Sans (tiếng Việt) + Noto Sans CJK SC cắt theo chữ dùng trong app, chỉ tải khi xuất PDF.

## 1.1.0

- Sửa pinyin câu (thanh nhẹ, 儿化, biến điệu 一/不), âm đơn chữ đa âm / trợ từ.
- Viết: mỗi chữ một ô, có Viết lại / Xem mẫu.
- PDF: font tiếng Việt + chữ Hán vẽ từ dữ liệu nét, hộp chọn kiểu ô / số ô / chữ mờ / thứ tự nét.
- Tự phát âm khi sang từ/câu mới (tắt trong Cài đặt).
- Chép phạt làm lại; sửa lỗi chọn 1 bị chọn cả 4.
- Giáo trình 15 bài, tra từ HSK1, kế hoạch hôm nay từng bước.
- Có bản mới → hiện nút “Tải lại”.
