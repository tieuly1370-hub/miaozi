# Lò Hán v2: user spec (2026-11-19), verbatim intent, translated where useful

ROLE: Nhai HSK is where the user LEARNS. Lò Hán SUMMARISES, REVIEWS, GUIDES, and enforces DISCIPLINE: it plays the supervising teacher.

## Carry-over requirements (from 1.3 brief, still valid)
- Lessons and vocab match Nhai 100% (source: /workspace/hsk/nhai_map.md).
- Every step links to the exact Nhai lesson + exact function. If no precise per-lesson link exists for a function, make it a separate standalone entry (one global link) rather than a wrong link.
- Each lesson opens with Miêu stating the lesson goals.
- Early exam to skip lessons already known.
- No hand copying in the office/morning mode.
- "Hôm nay bận" button to shift a session.
- Clearly show what's needed to be allowed to take the lesson-passing exam, and the completion condition of EVERY section (user: "unclear what completes sections 2, 4, 5, 6").

## New bug/UX feedback
- Stroke writing: add a "hide model strokes" toggle (write without the outline).
- Tablet + stylus are sometimes not sensitive: allow up to 5 mistakes per character in writing (was ~1).
- BUG: while practising stroke writing, switching to "Ghi chú tay" (handwritten notes) resets ALL writing progress. Preserve state.
- Penalty submission must NOT require a PDF export (in-app writing is enough; PDF optional).
- Penalty copying: show the model, with an option to hide it and write from memory.
- Speaking check is broken: tested with own voice AND Google Translate's voice, both marked wrong. Fix it (investigate: recognition result to pinyin comparison, tone YIN scoring too strict or buggy, sandhi, traditional vs simplified output, punctuation, numbers; log/display what was recognized; tolerance). Google Translate's voice must pass.
- Shadowing link for HSK1 lesson 3 goes straight to an HSK3 video: wrong. Verify every shadowing/reading link; if per-lesson shadowing isn't mappable, use one standalone entry.
- Retry wait: 20 min becomes 10 min (evenings are short).
- User can pick any section to study, not forced order.
- Sections can be SKIPPED when conditions don't allow (mic broken, no headphones, stylus issue): mark as "nợ" (owed) and they must be completed within the same week.
- Weekly test every Sunday + a MONTHLY test covering everything from the start of the current HSK level.
- Monthly calendar: each study day noted with the mode used (colour-coded) and minutes studied.
- Add graded READING COMPREHENSION passages by level (because the goal of learning a language is to understand). Original passages using only learned vocab, with questions.

## Lesson structure: 6 FIXED SECTIONS per lesson (always all visible, fixed order)
15 HSK1 lessons. (User asked for full detail for lessons 1–3 and a frame for 4–15; we have Nhai data for all 15, so fill all where possible.)
1. Khởi động (warm-up): penalty copying (if any) + fix previous mistakes. Auto-pull words/grammar the user got wrong in the previous test. Large 田字格 canvas (stylus/mouse), Undo stroke, Clear, Next character; copy each wrong character 3–5 times; button "Xác nhận đã chép phạt xong". If no mistakes: "Không có lỗi phạt, sẵn sàng học bài mới!".
2. Nạp từ (input): vocab (pinyin, meaning, example, zh-CN audio), dialogue text (with audio), CHARACTER ANALYSIS (radicals/components; Lò Hán must write its own analysis for each character, or link Nhai's /hanzi page for that character if it exists; both is best), and a prominent card "📺 Xem video bài giảng chi tiết tại NhaiHSK" linking to the exact Nhai lesson (new tab) + a tick "Đã xem xong video bài giảng".
3. Ngữ pháp & Đọc hiểu: key grammar structures of the lesson (link Nhai grammar pages) + a short reading passage + 5 multiple-choice questions.
4. Thực hành viết & Đặt câu: A) stroke-writing practice for every new word (canvas). B) sentence building, "AI" graded: show required keyword(s), text input, button "Chấm điểm câu". Must be free and on-device: implement a rule-based checker (contains keyword, only known vocab, matches the lesson grammar pattern templates, word order rules like time before verb, 吗 at end, etc.) with Vietnamese feedback.
5. Luyện nói: list of model sentences, play-standard-voice button, mic button (Web Speech API zh-CN), show the recognized text + % accuracy.
6. Kiểm tra, 2 independent tests:
   6A Đọc + Nghe: multiple choice (audio→meaning, hanzi→pinyin/meaning). Wrong items go to the "Lỗi sai" store, which triggers Section 1 next session.
   6B Viết + Nói: write hanzi on canvas from pinyin/meaning + record reading sentences by mic.
   (Keep the strict anti-guessing rules from 1.2 where compatible; the passing bar stays high: the user wants real knowledge.)

## Visual logic: never hide a section; ACTIVE (full brightness, highlighted border) vs DIMMED (opacity ~0.45–0.5, still clickable)
Each section has a "Đánh dấu hoàn thành" (mark complete) button, but completion must be EARNED: the button enables only when that section's condition is met (show the condition). Per-section progress persisted. A new lesson unlocks only when the current lesson reaches 100%.

## 4 modes
- 🏢 Chế độ Công ty (toggle in the top bar): stealth UI (white/grey, document-like). Highlights only unfinished SILENT sections: 2, 3, test 6A (max 57.5%). "Phát Audio tự động toàn bài" (2 s gap between sentences) + "Ẩn/Hiện Pinyin". Dims 1, 4, 5, 6B. Unlimited, 10–20 min.
- 🔋 Cạn pin (15 min; listening + flashcard review): highlight section 1 if there are penalties + exactly 1 next unfinished section (e.g. if the office did 2 and 3, the evening lights section 4 for light writing). Max 3 per week: lowEnergyCount + the week's start (Monday); button shows "🔋 Cạn pin 15p (Còn X/3 lượt tuần này)"; when used up, disabled with message "Bạn đã dùng hết 3 lượt Cạn pin tuần này, hãy chọn Tiêu chuẩn hoặc Chế độ Công ty nhé!"; resets Monday.
- ⚡ Tiêu chuẩn (45 min): section 1 if needed + the next 2 unfinished sections.
- 🔥 Bứt phá (90 min): all remaining sections of the current lesson (1 → 6B) to reach 100%; plus extras: translation practice, graded reading, short videos suitable for the current HSK level.
Modes are a CHOICE, not forced minutes; passing tests is the goal.

## Progress weights (sum 100%)
S1 0% (mandatory if there are mistakes) | S2 25% | S3 25% | S4 20% | S5 15% | S6 15% (6A 7.5% + 6B 7.5%).
A percent bar at the top of each lesson + a 6-cell segmented bar (green when done) to see where you stopped.
Streak counter + optional Pomodoro timer (15/45/60 min).

## Smart Queue across days
Progress accumulates; switching mode on another day keeps the earned %, skips completed sections, and lights the next unfinished ones per the new mode's quota.
Scenario 1: today Cạn pin, finish S2 (25%, Cạn pin 2/3 left); tomorrow Tiêu chuẩn lights S3 + S4, ending at 70%.
Scenario 2: office lunch does S2 + S3 (50%); evening Cạn pin lights S4 (writing), reaching 70%, streak kept.
Scenario 3: Tiêu chuẩn at 85%, 6A with 2 wrong words goes to penalties; tomorrow Bứt phá lights S1 (copy the 2 words) + 6B; done = 100%, the next lesson unlocks.
