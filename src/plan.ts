/** Kế hoạch hôm nay: danh sách bước cụ thể, làm lần lượt — không phải tự nghĩ học gì. */
import { LESSONS, TOTAL_LESSONS, PASS_SCORE, YT_WATCH } from "./data/curriculum";
import { getState, dueReview } from "./store";
import { isOffDay } from "./schedule";

export type StepShift = "sáng" | "tối" | "";
export interface Step {
  id: string;
  title: string;
  detail: string;
  shift: StepShift;
  minutes: number;
  done: boolean;
  /** Đường dẫn trong app; hoặc url ngoài (chỉ video thầy Thành Luân). */
  to?: string;
  url?: string;
  urlLesson?: number;
  urlSegIndex?: number;
  cta: string;
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

export function lessonSegments(n: number) {
  const les = LESSONS[n - 1];
  const lec = les.lecture?.segments.map((s, i) => ({ vid: les.lecture!.id, s, label: `Bài giảng, đoạn ${i + 1}` })) || [];
  const wb = les.workbook?.segments.map((s, i) => ({ vid: les.workbook!.id, s, label: `Sách bài tập, đoạn ${i + 1}` })) || [];
  const all = [...lec, ...wb].map((x, i) => ({ ...x, idx: i + 1 }));
  const half = Math.ceil(lec.length / 2);
  return {
    all,
    byDay: { 1: all.slice(0, half), 2: all.slice(half, lec.length), 3: all.slice(lec.length) } as Record<1 | 2 | 3, typeof all>,
  };
}

export function todayPlan(now = new Date()): { heading: string; steps: Step[] } {
  const s = getState();
  const steps: Step[] = [];
  const due = dueReview().length;
  const doneStep = (id: string) => !!s.today.steps?.[id];
  const openPen = s.penalties.filter((p) => !p.done && p.copies > 0);
  let heading = "";

  if (openPen.length) {
    steps.push({ id: "penalty", title: `Nộp chép phạt (${openPen.length} bài)`, detail: openPen.map((p) => p.dueChars.join("")).join(", ") + " — viết trong app hoặc ra giấy rồi chụp ảnh.", shift: "", minutes: 10, done: false, to: "/penalty", cta: "Làm chép phạt" });
  }

  if (now.getDay() === 0) {
    heading = "Chủ nhật — nghỉ, tối kiểm tra tuần";
    steps.push({ id: "weekly", title: "Kiểm tra tuần (20 phút)", detail: "Nghe + đọc + chữ của các bài đã học. Đạt ≥ 70% là xong tuần.", shift: "tối", minutes: 20, done: !!s.progress.weekly[weekKeyLocal(now)]?.done, to: "/weekly", cta: "Làm kiểm tra tuần" });
    return { heading, steps };
  }

  if (!s.progress.week0Passed) {
    heading = "Tuần 0 — Nền móng";
    const parts = s.progress.week0Parts;
    const list: [string, string, string][] = [["pinyin", "Thanh mẫu & vận mẫu", "sáng"], ["tones", "Bốn thanh + thanh nhẹ", "sáng"], ["strokes", "Tám nét cơ bản (viết bằng bút)", "tối"], ["radicals", "Ba mươi bộ thủ", "tối"]];
    for (const [id, t, sh] of list) steps.push({ id: "w0-" + id, title: t, detail: "Nghe, nhìn, làm hết phần luyện trong trang.", shift: sh as StepShift, minutes: 20, done: !!parts[id], to: "/week0/" + id, cta: "Mở phần này" });
    steps.push({ id: "w0-test", title: "Kiểm tra Nền móng (≥ 80%)", detail: "Đạt thì mở Bài 1.", shift: "tối", minutes: 10, done: s.progress.week0Passed, to: "/week0/test", cta: "Làm kiểm tra" });
  } else if (s.progress.unlockedLesson > TOTAL_LESSONS) {
    heading = "Tuần ôn + đề thi thử";
    steps.push({ id: "mockvid", title: "Xem đề tổng hợp của thầy (1 đoạn ~18 phút)", detail: "Mở trang Tuần ôn, xem đoạn tiếp theo.", shift: "sáng", minutes: 18, done: false, to: "/review-week", cta: "Mở Tuần ôn" });
    steps.push({ id: "mock1", title: "Đề thi thử 1", detail: "Nghe + đọc dạng HSK1.", shift: "tối", minutes: 40, done: !!s.progress.mocks[1], to: "/mock/1", cta: "Làm đề 1" });
    steps.push({ id: "mock2", title: "Đề thi thử 2", detail: "Làm sau đề 1.", shift: "tối", minutes: 40, done: !!s.progress.mocks[2], to: "/mock/2", cta: "Làm đề 2" });
  } else {
    const n = Math.max(1, s.progress.unlockedLesson);
    const curDay = (s.progress.lessonDay[n] || 1) as 1 | 2 | 3;
    const key = s.today.planFor && s.today.planFor.split(":")[0] === String(n) ? s.today.planFor : `${n}:${curDay}`;
    const day = Number(key.split(":")[1]) as 1 | 2 | 3;
    const les = LESSONS[n - 1];
    heading = `Bài ${n} · ngày ${day}/3 — ${les.titleVi}`;
    const segs = lessonSegments(n).byDay[day];
    const watched = s.progress.watchSeg[n] || 0;
    for (const sg of segs) {
      const mins = Math.max(1, Math.round((sg.s.end - sg.s.start) / 60));
      steps.push({
        id: `vid-${n}-${sg.idx}`, title: `Xem video: ${sg.label}`,
        detail: `Phút ${fmt(sg.s.start)} → ${fmt(sg.s.end)} (khoảng ${mins} phút). Xem xong quay lại app.`,
        shift: "sáng", minutes: mins, done: watched >= sg.idx, url: YT_WATCH(sg.vid, sg.s.start), urlLesson: n, urlSegIndex: sg.idx, cta: "Mở đoạn video",
      });
    }
    if (day === 1) {
      steps.push({ id: `book-${n}`, title: `Đọc Giáo trình bài ${n}`, detail: "Mục tiêu, ngữ pháp, hội thoại — chạm chữ để nghe.", shift: "sáng", minutes: 15, done: !!s.progress.textbookRead?.[n], to: `/lesson/${n}/book`, cta: "Mở giáo trình" });
      steps.push({ id: `words-${n}`, title: `Học từ mới (${les.words.length} từ)`, detail: "Nghe, nhìn chữ, nhớ cách tách bộ.", shift: "sáng", minutes: 15, done: !!s.progress.dayDone[`${n}:1`], to: `/lesson/${n}/words`, cta: "Học từ mới" });
    } else if (day === 2) {
      steps.push({ id: `practice-${n}`, title: "Luyện chữ: nhận mặt chữ + viết theo nét", detail: "Viết bằng bút trên tablet, mỗi chữ một ô.", shift: "tối", minutes: 20, done: !!s.progress.dayDone[`${n}:2`], to: `/lesson/${n}/practice`, cta: "Luyện chữ" });
      steps.push({ id: "speak", title: "Luyện nói 5 từ", detail: "Nghe mẫu rồi đọc, chấm thanh điệu.", shift: "tối", minutes: 10, done: (s.today.speakCount || 0) >= 5, to: "/speak", cta: "Luyện nói" });
    } else {
      steps.push({ id: `sent-${n}`, title: `Luyện câu (${les.sentences.length} câu)`, detail: "Nghe câu, chọn nghĩa.", shift: "sáng", minutes: 10, done: !!s.progress.dayDone[`${n}:3`], to: `/lesson/${n}/sentences`, cta: "Luyện câu" });
      const passed = s.progress.lessonPassed[n];
      steps.push({ id: `test-${n}`, title: `Kiểm tra bài ${n} (cần ≥ 80%)`, detail: passed ? `Lần trước ${Math.round(passed.score * 100)}%.` : "Có phần nhận mặt chữ không pinyin. Đạt thì mở bài sau.", shift: "tối", minutes: 15, done: !!passed && passed.score >= PASS_SCORE, to: `/lesson/${n}/test`, cta: "Làm kiểm tra" });
    }
  }
  if (due > 0 || doneStep("review")) {
    steps.push({ id: "review", title: due ? `Ôn thẻ đến hạn (${due} thẻ)` : "Ôn thẻ đến hạn", detail: "Lật thẻ, tự chấm. Pinyin ẩn — chạm là gợi ý.", shift: "", minutes: Math.max(5, Math.round(due / 3)), done: due === 0, to: "/review", cta: "Ôn thẻ" });
  }
  if (isOffDay(now, s.settings) && now.getDay() === 6) heading = "Thứ Bảy — học bù / ôn nhẹ · " + heading;
  return { heading, steps };
}

function weekKeyLocal(d: Date): string {
  const tmp = new Date(d);
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
  const yearStart = new Date(tmp.getFullYear(), 0, 1);
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getFullYear()}-W${String(week).padStart(2, "0")}`;
}
