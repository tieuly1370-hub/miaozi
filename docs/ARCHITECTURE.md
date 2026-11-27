# Miaozi — kiến trúc (cho người / AI làm tiếp)

Miaozi là PWA luyện **viết chữ Hán theo bài HSK** và **kiểm tra**, dành cho người Việt (giao diện tiếng Việt).
Thiết bị chính: máy tính bảng Android (Xiaomi Pad) và điện thoại Android, Chrome. Không có backend: dữ liệu học nằm trong
IndexedDB của trình duyệt, đồng bộ tuỳ chọn qua Google Drive (appDataFolder).

## 1. Stack

| Phần | Dùng |
|---|---|
| Build | Vite 7 + TypeScript (`tsc -b && vite build`) |
| UI | Preact 10 (hàm + hooks), CSS thuần `src/styles.css` |
| Router | hash router tự viết trong `src/app.tsx` (`parse()`), trang tải lười (`import()`) |
| Lưu trữ | IndexedDB, DB tên **`lohan`** (`src/db.ts`, `src/store.ts`) — **không bao giờ xoá / đổi tên** khi nâng cấp |
| Viết | `hanzi-writer` (quiz nét) + dữ liệu nét Make Me a Hanzi (`public/hanzi-data/<chữ>.json`, chép từ `hanzi-writer-data`) |
| Âm thanh | file mp3 tạo sẵn bằng edge-tts (giọng `zh-CN-XiaoxiaoNeural`) trong `public/audio/` |
| Offline | `public/sw.js` (service worker tự viết: `VERSION`, `DATA_CACHE`) |
| PDF giấy luyện | jsPDF (`src/pdf.ts`) |

## 2. Thư mục

```
src/
  app.tsx            khung app: header, thanh dưới 3 tab (Bài học / Kiểm tra / Cài đặt), router, debug window.__miaozi
  pages/
    slim.tsx         TRANG CHÍNH v2.4: HSK 1 / HSK 2 / HSK 3 dạng xổ (accordion) → bấm bài → màn Viết
    write.tsx        MÀN VIẾT: WriteBox (1 chữ), WriteWord (cả từ), WritePage (danh sách từ + thẻ chữ + Nghe)
    tests.tsx        KIỂM TRA v2.4: chọn cấp, tuần / tháng / từng bài, chỉ từ bài đã xong
    exam.tsx         ExamRunner: chạy một đề (các dạng câu hỏi, gồm WriteView chấm chặt)
    settings.tsx     Cài đặt (xưng hô chủ/cậu, nét bút, đồng bộ, offline, đặt lại…)
    home*.tsx, lesson*.tsx, practice.tsx, radicals.tsx, skills.tsx, textbook.tsx, week0.tsx
                     các phần CŨ đã ẩn khỏi điều hướng ở v2.4 (giữ code, không xoá — có thể bật lại qua router)
  data/
    curriculum.ts    LESSONS = [...HSK1_LESSONS, ...HSK2_LESSONS]; kiểu Lesson / Word / Sentence
    hsk2.ts          HSK2_LESSONS (TỰ SINH — đừng sửa tay)
    hanziInfo.ts     thông tin từng chữ (Hán Việt, cấu tạo, mẹo nhớ) HSK1 + nạp HANZI_INFO2 (hanziInfo2.ts, tự sinh)
    compGroups.ts    nhóm thành phần của từng nét (tự sinh từ MMAH `matches`) — dùng cho chấm chặt
  v2/
    levels.ts        LEVELS (hsk1 bài 1–19, hsk2 bài 20–34, hsk3 "Sắp có"), levelOf, lessonLabel ("HSK 2 · Bài 1")
    state2.ts        trạng thái học v2 (write.done, doneLessons, isLessonCompleted, markLessonDone…)
    strictGrade.ts   chấm viết chặt (vùng nét + tỉ lệ thành phần)
    strokeMatch.ts   so loại nét (ngang / sổ / phẩy / mác…) dùng cho chế độ khoan dung
  gate.ts            sinh câu hỏi: levelTestItems (Kiểm tra v2.4), v2Items, LOOK_GROUPS (chữ dễ nhầm)
  sync/merge.ts      gộp dữ liệu 2 thiết bị; sync/drive.ts đồng bộ Google Drive
  ttsPron.ts         TTS_TEXT / TTS_CUT: sửa cách đọc của edge-tts cho từ đa âm / đọc sai
public/
  audio/             w4-<id>.mp3, w4-<id>-slow.mp3 (từ), s4-<id>.mp3 / -slow (câu), index.json
  hanzi-data/        <chữ>.json (strokes + medians, toạ độ 1024, y hướng lên)
  sw.js              service worker
scripts/
  hsk2/              nguồn + bộ sinh dữ liệu HSK 2 (xem §4)
  audit_audio.py     kiểm âm bằng Whisper (BẮT BUỘC, xem §5)
  build_comp_groups.py  sinh src/data/compGroups.ts
  test_v24.py        Playwright cho v2.4 (các test_v2*.py cũ cho phần đã ẩn)
tests/*.test.ts      unit test chạy bằng `node --experimental-strip-types`
```

## 3. Định dạng dữ liệu theo cấp

**Số bài là toàn cục** (không reset theo cấp) để id không đụng nhau và tiến độ cũ không bị hỏng:

| Cấp | Bài toàn cục | Nguồn |
|---|---|---|
| HSK 1 | 1–19 | Nhai HSK1 3.0 (15 bài chính + 4 mở rộng, 430 từ) |
| HSK 2 | 20–34 | HSK Standard Course 2, bài 1–15 (`levelLesson` 1–15) |
| HSK 3 | (dự kiến 35–54) | chưa có — `LEVELS` để `coming: true` |

```ts
interface Lesson { id: number; titleZh: string; titleVi: string; grammarNote: string;
                   level?: number; levelLesson?: number; words: Word[]; sentences: Sentence[] }
interface Word   { id: "nLL-NN"; lesson: number; hanzi: string; pinyin: "juéde"; pinyinNum: "jue2 de5";
                   vi: string; pos: string; decomps: []; mnemonic: string }
interface Sentence { id: "sLL-NN"; lesson: number; hanzi: string; pinyin: string; vi: string; ... }
```
- `pinyinNum`: số thanh, thanh nhẹ = 5, `ü` = `v`/`ü`, 儿化 = âm `r5` riêng (vd 玩儿 → `wan2 r5`).
- Lưu ý: ở HSK 1 có câu mang id `s15-..` nằm trong bài 1 (dữ liệu cũ) — **đừng suy ra bài từ id câu**, hãy dùng `lesson.sentences`.
- `hanziInfo` cho mỗi chữ: `{ hv: "ca", parts: [...], note: "mẹo nhớ" }`.

## 4. Thêm HSK 3+ (làm theo đúng mẫu HSK 2)

1. Tạo `scripts/hsk3/hsk3_src.py` giống `scripts/hsk2/hsk2_src.py`: `LESSONS` = danh sách
   `(titleZh, titleVi, [(hanzi, pinyin dấu, nghĩa Việt)], [(câu Hán, nghĩa Việt)])` và `SENT_PY` (pinyin câu **gõ tay** —
   pinyin-pro sai nhiều ở câu). Nguồn từ vựng HSK 2 dùng: `joelypoley/hsk_standard_course_vocab` (`hsk_2.csv`).
   **Không bịa dữ liệu**: nghĩa / câu ví dụ phải tự kiểm; ghi rõ nguồn trong README.
2. Sửa `scripts/hsk2/build_hsk2.mjs` (hoặc nhân bản) với `FIRST_ID = 35`, `level: 3` → sinh `src/data/hsk3.ts`;
   nối vào `LESSONS` trong `curriculum.ts` (import có đuôi `.ts` để unit test chạy được bằng node).
3. `scripts/hsk2/build_hanzi2.py` → thông tin chữ mới (Hán Việt dùng bảng tay, **không** dùng Unihan kVietnamese vì lẫn âm Nôm)
   và chép dữ liệu nét từ `node_modules/hanzi-writer-data` vào `public/hanzi-data/`.
4. `python3 scripts/build_comp_groups.py` (nhóm thành phần cho chấm chặt).
5. `src/v2/levels.ts`: thêm `{ id: "hsk3", from: 35, to: 54 }`, bỏ `coming`.
6. `gate.ts` → `LOOK_GROUPS`: thêm nhóm chữ dễ nhầm của cấp mới.
7. Audio (§5) **và audit**. 8. Tăng `DATA_CACHE` trong `sw.js`, tăng phiên bản, chạy test, deploy.

## 5. Âm thanh (pipeline + audit bắt buộc)

- Sinh: `scripts/hsk2/gen_audio_hsk2.py` (venv `/workspace/venv-audit` có `edge-tts`, `faster-whisper`, `pypinyin`).
  Từ: rate `-10%` (thường) và `-35%` (chậm) → `w4-<id>.mp3`, `w4-<id>-slow.mp3`. Câu: `+0%` / `-30%` → `s4-<id>…`.
  Ghi vào `public/audio/index.json` dạng `{ "<id>": { "n": "<file thường>", "s": "<file chậm>" } }`.
- Sửa cách đọc (`src/ttsPron.ts`):
  - `TTS_TEXT[id] = "chữ đồng âm"` — đọc chữ khác cùng âm (vd 很 → 狠, 长 zhǎng → 掌, 还 hái → 孩, 常 cho 长 cháng).
  - `TTS_CUT[id] = ["cụm ngữ cảnh", "âm cần lấy"]` — đọc cả cụm rồi cắt đúng âm tiết theo WordBoundary bằng ffmpeg
    (đặt `-ss` **trước** `-i`, nếu không afade lệch → im lặng). Dùng cho trợ từ thanh nhẹ: 着 (看着), 得 (跑得).
  - Tạo lại: `gen_audio_hsk2.py --force n32-05,…`; clip HSK 1: `--hsk1 n02-12` (giữ tên file cũ).
- **Audit (BẮT BUỘC sau mỗi lần sinh / sửa audio):**
  `/workspace/venv-audit/bin/python scripts/audit_audio.py n2 n30 n31 s2 s30 … [--ids n02-12]`
  - Vòng 1: Whisper `small` (CPU int8) nghe clip thường, đổi ra pinyin (pypinyin TONE3) và so với `pinyinNum`.
  - Vòng 2: clip 1 âm tiết bị cờ → nghe lại bằng `medium`, cả bản thường lẫn chậm; một bản khớp → bỏ cờ, cả hai sai → `confirmed`.
  - Báo cáo: `scripts/audit/<ngày>-report.json`. Clip `confirmed` → nghe bằng tai, sửa bằng TTS_TEXT/TTS_CUT, tạo lại, audit lại.
  - Kiểm chứng (2026-11-27): Whisper `medium` nghe sai 23/40 clip 1 âm tiết HSK 1 vốn đúng (我→哇, 你→咪…), và nghe 很 thành 哼
    kể cả khi 很 được cắt từ 很大 / 很高 → cờ trên clip 1 âm tiết **chỉ là gợi ý nghe lại bằng tai**, không phải bằng chứng lỗi.
    Bản chậm (-35%) cũng hay bị nghe sai (公斤→空间, 宾馆→冰块) trong khi bản thường đúng.
  - Giới hạn: Whisper yếu với âm tiết đứng riêng; không so thanh nhẹ và biến điệu 一/不. Bộ phân loại thanh YIN đã thử và bỏ (báo sai nhiều).
- Âm thanh được cache bởi `DATA_CACHE` trong `sw.js` → **đổi file audio phải tăng `DATA_CACHE`**.

## 6. Chấm viết (`src/v2/strictGrade.ts`, `src/pages/write.tsx`, `src/pages/exam.tsx`)

- **Có mẫu (khoan dung)**: hanzi-writer quiz + so loại nét (`strokeMatch.ts`: nét đúng loại vẫn nhận dù hơi lệch); cho sai ≤ 5 nét/chữ.
- **Ẩn mẫu và trong Kiểm tra (chặt)**, toạ độ chữ MMAH 0–1024, y hướng lên (`drawnPath.points` của hanzi-writer đã ở hệ này):
  1. Ngay khi viết từng nét: đầu, cuối, trọng tâm nét lệch so với median mẫu ≤ `STRICT.stroke` (230) — sai → tính lỗi, viết lại nét đó.
  2. Xong chữ: chuẩn hoá cả chữ theo khung bao (co giãn đều + dời — viết nhỏ / lệch cả chữ vẫn đạt), rồi
     - từng nét lệch ≤ `STRICT.final` (175), cho phép 1 nét lệch nếu chữ ≥ 6 nét;
     - từng thành phần (nhóm nét theo MMAH `matches`, `compGroups.ts`, vd 哥 = 可 trên + 可 dưới): tâm lệch ≤ `compCenter` (150),
       rộng/cao so với mẫu trong `[0.6, 1.65]`;
     - vị trí tương đối giữa từng cặp thành phần (vector tâm–tâm) lệch ≤ `compRel` (120) — bắt trường hợp một phần lệch
       mà chuẩn hoá khung chia đôi sai lệch.
  - Thử trên 335 chữ: rung tay ±35 → 0 chữ bị đánh trượt; mỗi thành phần lệch ±60 → ~3% trượt.
- Test: `tests/strict_grade.test.ts` (哥 gọn đạt, 哥 cẩu thả / lệch / sai tỉ lệ trượt, 好 đổi chỗ trượt…), Playwright vẽ nét thật bằng chuột.

## 7. Sinh đề Kiểm tra (`levelTestItems` trong `gate.ts`, `pages/tests.tsx`)

- Chỉ lấy **bài đã học xong** (`isLessonCompleted(n)`: đánh dấu "Đã học xong bài" → `v2.doneLessons[n]`, hoặc viết xong mọi từ
  của bài, hoặc hoàn thành 6 mục của bản cũ). Chưa có bài nào xong → lời nhắc thân thiện.
- Chọn cấp (HSK 1 / 2), rồi: **tuần** = 3 bài xong gần nhất, **tháng** = mọi bài xong của cấp, hoặc **từng bài**.
- Mỗi đề (k = 1 tuần / bài, 2 tháng): 5k nghe chọn chữ (gồm chữ dễ nhầm `LOOK_GROUPS`), k nghe xếp câu, 5k chọn nghĩa,
  k đọc xếp câu, 4k viết (chấm chặt). Ưu tiên ⅓ từ đã sai. **Không có câu Nói.**
- Kết quả: `recordTest("<cấp>:<loại>:<các bài>")`, `logSkills`.

## 8. Đồng bộ — luật gộp (`src/sync/merge.ts`)

- Bản ghi có `updatedAt` / `at`: **bản mới hơn thắng**.
- Tập hợp (ngày học, sao "Khó", từ đã viết `write.done`, `doneLessons`, lỗi sai…): **hợp (union)**.
- **Đã xong thì giữ xong** (mục, bài, phạt) — không bao giờ quay lại chưa xong vì thiết bị kia cũ hơn.
- `resetAt`: khi người dùng "Đặt lại tiến độ", dữ liệu học cũ hơn `resetAt` của bên kia bị bỏ; lấy `max(resetAt)`.
- Nâng cấp phiên bản **không được xoá IndexedDB**; trường mới phải tuỳ chọn (`doneLessons?`) và có giá trị mặc định khi đọc.

## 9. Build / deploy / test

```bash
npm ci
npm run build                      # dist/
npx vite preview --port 4173 &     # cho Playwright
python3 scripts/test_v24.py        # Playwright (cần: python3 -m playwright install chromium-headless-shell)
for t in leave_guard merge miao queue speak_timing speech strict_grade stroke_match tts_pron grader rad_quiz; do
  node --experimental-strip-types tests/$t.test.ts; done
npx esbuild tests/carrier.test.ts --bundle --platform=node --format=esm --outfile=/tmp/c.mjs && node /tmp/c.mjs
```
- Phiên bản: `package.json`, `public/sw.js` (`VERSION`; đổi dữ liệu/audio → tăng `DATA_CACHE`), mục README.
- Deploy GitHub Pages: repo `tieuly1370-hub/tieuly1370-hub.github.io` — chép **nội dung** `dist/` vào gốc repo, giữ `.nojekyll`
  (`find . -mindepth 1 -maxdepth 1 ! -name .git ! -name .nojekyll -exec rm -rf {} +; cp -r dist/. .`), commit, push;
  kiểm `https://tieuly1370-hub.github.io/sw.js` có `VERSION` mới và tên file asset trùng `dist/assets`.
- Debug trong trình duyệt: `window.__miaozi` (getState, reset, debugSeed, levelTestItems, isLessonCompleted…).
