# Lò Hán — HSK1

Web app (PWA) học tiếng Trung HSK1 theo **Giáo trình chuẩn HSK1** (15 bài) và playlist thầy Thành Luân. Tiếng Việt, học ngoại tuyến, không thu phí AI.

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

Tạo lại audio: `python3 scripts/gen_audio.py` (cần `edge-tts`).
