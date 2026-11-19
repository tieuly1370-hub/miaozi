/** Dữ liệu từng bài cho v2: từ, câu, bài đọc, đề đặt câu, link Nhai, lời mở bài của Miao. Không phụ thuộc store. */
import { LESSONS, type Lesson, type Word } from "../data/curriculum";
import { NHAI_LESSONS } from "../data/nhaiCourse";
import { ALL_PASSAGES, LESSON_PASSAGES, EXTRA_PASSAGES, type Passage } from "../data/reading";
import { SENT_TASKS, type SentTask } from "./grader";
import type { SecId } from "./queue";

export const LESSON_COUNT = LESSONS.length; // 19 (15 bài chính + 4 bài từ vựng mở rộng của Nhai)
export const MAIN_LESSONS = 15;

export const NHAI_GENERAL = {
  grammar: "https://nhaihsk.com/course/hsk1?skill=grammar",
  vocab: "https://nhaihsk.com/course/hsk1?skill=vocab",
  /** Nhai không có shadowing theo từng bài HSK1 → một mục chung duy nhất (đúng nhai_map.md). */
  shadowing: "https://nhaihsk.com/shadowing#cat-HSK1-3",
  shadowingLabel: "Tiếng Trung Sơ Cấp · An Khả Hy HSK1-3",
  reading: "https://nhaihsk.com/reading#level-hsk1",
  certificate: "https://nhaihsk.com/certificate-test/hsk1",
};

export function lesson(n: number): Lesson { return LESSONS[Math.max(1, Math.min(LESSON_COUNT, n)) - 1]; }
export function nhaiLesson(n: number) { return NHAI_LESSONS.find((l) => l.id === n) || null; }
export function isExtended(n: number) { return n > MAIN_LESSONS; }

/** Bài đọc của Mục 3. */
export function passageFor(n: number): Passage {
  if (n <= MAIN_LESSONS) return LESSON_PASSAGES[n - 1];
  return [EXTRA_PASSAGES[0], EXTRA_PASSAGES[1], EXTRA_PASSAGES[2], LESSON_PASSAGES[14]][n - 16] || LESSON_PASSAGES[14];
}
export function passagesUpTo(n: number): Passage[] { return ALL_PASSAGES.filter((p) => p.upTo <= Math.min(n, MAIN_LESSONS)); }
export function sentTasks(n: number): SentTask[] { return SENT_TASKS[n] || SENT_TASKS[1]; }

export function knownChars(n: number): Set<string> {
  const s = new Set<string>();
  for (const l of LESSONS.slice(0, n)) { for (const w of l.words) for (const c of w.hanzi) s.add(c); for (const t of l.sentences) for (const c of t.hanzi) s.add(c); }
  return s;
}

/** Số câu nói tối thiểu để xong Mục 5. */
export function speakNeed(n: number): number { return Math.min(4, lesson(n).sentences.length); }

export const SEC_TITLE: Record<SecId, string> = {
  s1: "Khởi động — chép phạt & sửa lỗi",
  s2: "Nạp từ",
  s3: "Ngữ pháp & Đọc hiểu",
  s4: "Thực hành viết & Đặt câu",
  s5: "Luyện nói",
  s6a: "Kiểm tra 6A — Đọc + Nghe",
  s6b: "Kiểm tra 6B — Viết + Nói",
};
export const SEC_SHORT: Record<SecId, string> = { s1: "1", s2: "2", s3: "3", s4: "4", s5: "5", s6a: "6A", s6b: "6B" };

/** Điều kiện hoàn thành, hiện rõ trên từng mục. */
export function secRule(id: SecId, n: number): string {
  const L = lesson(n);
  switch (id) {
    case "s1": return "Chép mỗi chữ sai 3 lần trên ô 田 rồi bấm “Xác nhận đã chép phạt xong”. Không có lỗi phạt thì mục này tự xong (0%).";
    case "s2": return `Mở xem đủ ${L.words.length} từ (chạm từng thẻ), nghe hết hội thoại 1 lần, và tick “Đã xem xong video bài giảng” (sau khi mở link Nhai).`;
    case "s3": return "Đọc bài, làm 5 câu trắc nghiệm, đúng ≥ 4/5. Trượt thì làm lại ngay.";
    case "s4": return `Viết theo nét đủ ${L.words.length} từ (mỗi chữ cho phép sai tối đa 5 nét) + đặt 3 câu được Miao chấm “Đạt”.`;
    case "s5": return `Nói đạt ≥ 80% ít nhất ${speakNeed(n)} câu mẫu (máy hiện chữ nghe được và %).`;
    case "s6a": return "Nghe + đọc trắc nghiệm, đúng ngay lần đầu ≥ 80%. Từ sai chuyển sang chép phạt ở Mục 1.";
    case "s6b": return "Viết chữ từ trí nhớ (sai tối đa 5 nét/chữ) + nói câu, đúng ngay lần đầu ≥ 80%.";
  }
}

/** Lời mở bài của Miao (mục tiêu bài). */
export function introText(n: number): string {
  const L = lesson(n);
  const nl = nhaiLesson(n);
  const pats = (nl?.patterns || []).map((p) => p.name).slice(0, 3);
  const words = L.words.slice(0, 5).map((w) => w.hanzi).join("、");
  return `Bài ${n}: “${L.titleVi}”. Mục tiêu: nhớ mặt chữ, âm và nghĩa của ${L.words.length} từ (${words}…), đọc hiểu ${L.sentences.length} câu mẫu${pats.length ? `, dùng được mẫu ${pats.join(" / ")}` : ""}. Học trên Nhai, quay về đây chứng minh. Không đạt thì không qua.`;
}

export function wordsOf(n: number): Word[] { return lesson(n).words; }
