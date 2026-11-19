/** Kế hoạch hôm nay: từng bước cụ thể — học trên Nhai HSK, kiểm tra trên Miaozi. */
import { LESSONS, TOTAL_LESSONS, YT_WATCH } from "./data/curriculum";
import { getState, dueReview, checkRec, gateRec, gateBlockedUntil, openMakeups, weekKey } from "./store";
import { isOffDay } from "./schedule";
import { NHAI, nhaiUnitLink } from "./nhai";
import { GSKILLS, SKILL_VI, type GSkill } from "./gate";

export type StepShift = "sáng" | "tối" | "";
export interface Step {
  id: string;
  title: string;
  detail: string;
  shift: StepShift;
  minutes: number;
  done: boolean;
  /** Đường dẫn trong app. */
  to?: string;
  /** Link ngoài (Nhai HSK) — học xong bấm "Đã học xong" (phải ở lại đủ nửa thời gian). */
  url?: string;
  /** Link phụ tuỳ chọn (ví dụ video thầy Thành Luân). */
  alt?: { label: string; url: string };
  cta: string;
  /** Không bấm được (ví dụ chờ đến ngày mai). */
  blocked?: string;
  source?: "nhai" | "lohan";
}

const fmtD = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

export function todayPlan(now = new Date()): { heading: string; steps: Step[] } {
  const s = getState();
  const steps: Step[] = [];
  const due = dueReview().length;
  const stepDone = (id: string) => s.today.steps?.[id] === true;
  const openPen = s.penalties.filter((p) => !p.done && p.copies > 0);
  const chk = (k: "morning" | "evening" | "weeklyTest") => !!checkRec(k, now)?.pass;
  const nhai = (id: string, title: string, url: string, detail: string, minutes: number, shift: StepShift, alt?: Step["alt"]): Step =>
    ({ id, title: "Nhai HSK · " + title, url, detail, minutes, shift, done: stepDone(id), cta: "Mở trên Nhai HSK", alt, source: "nhai" });
  const check = (k: "morning" | "evening"): Step => ({
    id: "chk-" + k, title: k === "morning" ? "Kiểm tra ca sáng (nghe + đọc) — ca chỉ tính khi đạt" : "Kiểm tra ca tối (viết + nói) — ca chỉ tính khi đạt",
    detail: k === "morning" ? "≈ 9 câu: nghe chọn chữ gài, nghe ghép câu, nhìn chữ đoán nghĩa, dịch câu. Mỗi kỹ năng ≥ 80%." : "Viết 5 từ từ trí nhớ (không sai chữ nào 2 lần) + nói 3 từ chỉ nhìn tiếng Việt.",
    shift: k === "morning" ? "sáng" : "tối", minutes: 6, done: chk(k), to: "/check/" + k, cta: "Làm kiểm tra", source: "lohan",
  });
  let heading = "";

  if (openPen.length) {
    steps.push({ id: "penalty", title: `Nộp chép phạt (${openPen.length} bài) — nộp xong mới được thi`, detail: openPen.map((p) => p.dueChars.join("")).join(", ") + " — viết trong app hoặc ra giấy rồi chụp ảnh.", shift: "", minutes: 10, done: false, to: "/penalty", cta: "Làm chép phạt", source: "lohan" });
  }

  const makeups = openMakeups();
  if (now.getDay() === 0) {
    heading = "Chủ nhật — nghỉ, tối kiểm tra tuần";
    steps.push(nhai("sun-review", "Ôn tập ngắt quãng", NHAI.review, "Ôn hết thẻ đến hạn trên Nhai trước khi thi tuần.", 15, ""));
    steps.push({ id: "weekly", title: "Kiểm tra tuần — 4 kỹ năng, bốc ngẫu nhiên từ mọi bài đã qua", detail: "Nghe, đọc, viết 8 từ cũ từ trí nhớ, nói 3 từ. Mỗi kỹ năng ≥ 80%, viết không sai chữ nào 2 lần.", shift: "tối", minutes: 20, done: !!s.progress.weekly[weekKey(now)]?.done, to: "/check/weekly", cta: "Làm kiểm tra tuần", source: "lohan" });
    return { heading, steps };
  }

  if (!s.progress.week0Passed) {
    heading = "Tuần 0 — Nền móng (pinyin, thanh, nét, bộ thủ)";
    const parts = s.progress.week0Parts;
    steps.push(nhai("w0-nhai-pinyin", "Bảng pinyin", NHAI.pinyin, "Nghe hết thanh mẫu, vận mẫu và 4 thanh. Đọc to theo từng ô.", 30, "sáng"));
    steps.push({ id: "w0-pinyin", title: "Miaozi · Luyện thanh mẫu & vận mẫu", detail: "Làm hết phần luyện trong trang.", shift: "sáng", minutes: 15, done: !!parts.pinyin, to: "/week0/pinyin", cta: "Mở phần này", source: "lohan" });
    steps.push({ id: "w0-tones", title: "Miaozi · Bốn thanh + thanh nhẹ", detail: "Nghe, đọc, làm bài nghe thanh.", shift: "sáng", minutes: 15, done: !!parts.tones, to: "/week0/tones", cta: "Mở phần này", source: "lohan" });
    steps.push(nhai("w0-nhai-radicals", "214 bộ thủ", NHAI.radicals, "Học các bộ thủ hay gặp ở HSK1 (亻 女 口 日 月 木 氵 讠 心 宀…).", 20, "tối"));
    steps.push({ id: "w0-strokes", title: "Miaozi · Tám nét cơ bản (viết bằng bút)", detail: "Viết theo đúng thứ tự nét.", shift: "tối", minutes: 15, done: !!parts.strokes, to: "/week0/strokes", cta: "Mở phần này", source: "lohan" });
    steps.push({ id: "w0-radicals", title: "Miaozi · Ba mươi bộ thủ", detail: "Nhận mặt bộ thủ.", shift: "tối", minutes: 15, done: !!parts.radicals, to: "/week0/radicals", cta: "Mở phần này", source: "lohan" });
    steps.push({ id: "w0-test", title: "Kiểm tra Nền móng (≥ 80%)", detail: "Đạt thì mở Bài 1.", shift: "tối", minutes: 10, done: s.progress.week0Passed, to: "/week0/test", cta: "Làm kiểm tra", source: "lohan" });
  } else if (s.progress.unlockedLesson > TOTAL_LESSONS) {
    heading = "Xong 15 bài — thi thử HSK1";
    steps.push(nhai("cert", "Luyện thi chứng chỉ HSK1", NHAI.exam, "Làm 1 đề HSK1 trên Nhai, ghi lại điểm từng phần.", 40, "sáng"));
    steps.push({ id: "mock1", title: "Miaozi · Đề thi thử 1", detail: "Nghe + đọc dạng HSK1.", shift: "tối", minutes: 40, done: !!s.progress.mocks[1], to: "/mock/1", cta: "Làm đề 1", source: "lohan" });
    steps.push({ id: "mock2", title: "Miaozi · Đề thi thử 2", detail: "Làm sau đề 1.", shift: "tối", minutes: 40, done: !!s.progress.mocks[2], to: "/mock/2", cta: "Làm đề 2", source: "lohan" });
    steps.push(check("morning"), check("evening"));
  } else {
    const n = Math.max(1, s.progress.unlockedLesson);
    const curDay = (s.progress.lessonDay[n] || 1) as 1 | 2 | 3;
    const key = s.today.planFor && s.today.planFor.split(":")[0] === String(n) ? s.today.planFor : `${n}:${curDay}`;
    const day = Number(key.split(":")[1]) as 1 | 2 | 3;
    const les = LESSONS[n - 1];
    const words = les.words.map((w) => w.hanzi).join(" ");
    const dayName = day === 1 ? "từ mới" : day === 2 ? "ngữ pháp + bài khoá" : "THI QUA BÀI (4 kỹ năng)";
    heading = `Bài ${n} · ngày ${day}/3 — ${dayName} · ${les.titleVi}`;
    const speak: Step = { id: "speak", title: "Miaozi · Luyện nói 5 từ", detail: "Nghe mẫu rồi đọc, chấm thanh điệu từng chữ.", shift: "tối", minutes: 10, done: (s.today.speakCount || 0) >= 5, to: "/speak", cta: "Luyện nói", source: "lohan" };
    const practice: Step = { id: `practice-${n}`, title: "Miaozi · Luyện viết các từ của bài", detail: `Viết theo nét trên tablet: ${words}. Viết đến khi không cần nhìn.`, shift: "tối", minutes: 15, done: chk("evening"), to: `/lesson/${n}/practice`, cta: "Luyện viết", source: "lohan" };
    const yt = les.lecture ? { label: "Tuỳ chọn: video thầy Thành Luân bài " + n, url: YT_WATCH(les.lecture.id, 0) } : undefined;
    if (day === 1) {
      steps.push(nhai(`n-vocab-${n}`, `Từ vựng bài ${n}`, nhaiUnitLink(n, "vocab"), `Vào HSK1 › Từ vựng, học đủ các từ: ${words}. Làm lần lượt Flashcard → Quiz → Gõ pinyin; nghe mỗi từ ≥ 3 lần.`, 30, "sáng", yt));
      steps.push(nhai(`n-hanzi-${n}`, "Phân tích chữ Hán", NHAI.hanzi, `Tra từng chữ của bài: thứ tự nét, bộ thủ, cấu tạo. Chép tay mỗi chữ 5 lần ra giấy.`, 15, "sáng"));
      steps.push(check("morning"));
      steps.push(practice, speak, check("evening"));
    } else if (day === 2) {
      steps.push(nhai(`n-grammar-${n}`, `Ngữ pháp bài ${n}`, nhaiUnitLink(n, "grammar"), `Học mẫu câu: ${les.grammarNote} Đọc to mọi câu ví dụ.`, 20, "sáng"));
      steps.push(nhai(`n-reading-${n}`, "Bài khoá HSK1", NHAI.reading, "Chọn 1 bài khoá HSK1, nghe audio rồi đọc đuổi (chữ sáng tới đâu đọc tới đó). Không nhìn pinyin.", 15, "sáng"));
      steps.push(check("morning"));
      steps.push(nhai(`n-shadow-${n}`, "Shadowing", NHAI.shadowing, "Mục chung (Nhai không có shadowing theo từng bài): Tiếng Trung Sơ Cấp · An Khả Hy HSK1-3. Chọn 1 video, nói đuổi từng câu.", 10, "tối"));
      steps.push(practice, speak, check("evening"));
    } else {
      steps.push(nhai(`n-review-${n}`, "Ôn tập trước khi thi", NHAI.review, `Ôn thẻ đến hạn, rồi tự viết ra giấy cả ${les.words.length} từ chỉ nhìn nghĩa.`, 15, "sáng"));
      const g = (k: GSkill, shift: StepShift): Step => {
        const r = gateRec(n, k);
        const until = gateBlockedUntil(n, k);
        return {
          id: `gate-${n}-${k}`, title: `Cổng bài ${n} · thi ${SKILL_VI[k]}`, shift, minutes: k === "write" ? 15 : 8, done: !!r?.pass,
          detail: r?.pass ? `Đạt ${Math.round(r.score * 100)}%.` : until ? `Đã trượt (${(r?.why || []).join(" ")}). Ôn lại các chữ: ${(r?.failed || []).join(", ") || "—"}.` : k === "write" ? `Viết lại cả ${les.words.length} từ từ trí nhớ + từ bài cũ. Phải đúng 100%.` : "≥ 80% đúng ngay lần đầu, có giới hạn thời gian.",
          to: `/gate/${n}/${k}`, cta: "Vào thi", blocked: until ? `Thi lại từ ${fmtD(until)}` : undefined, source: "lohan",
        };
      };
      steps.push(g("listen", "sáng"), g("read", "sáng"), check("morning"));
      steps.push(g("write", "tối"), g("speak", "tối"), check("evening"));
      const failed = GSKILLS.flatMap((k) => (gateRec(n, k)?.pass ? [] : gateRec(n, k)?.failed || []));
      if (failed.length) steps.splice(openPen.length ? 1 : 0, 0, nhai(`n-redo-${n}`, "Học lại chữ trượt", nhaiUnitLink(n, "vocab"), `Ôn kỹ: ${[...new Set(failed)].join(", ")} — flashcard + viết tay 10 lần mỗi chữ.`, 20, ""));
    }
  }
  if (makeups.length) {
    for (const m of makeups) {
      const k = m.kind === "evening" ? "evening" : "morning";
      if (!steps.some((x) => x.id === "chk-" + k)) steps.push({ ...check(k), id: "mk-" + m.id, title: `Học bù ca ${k === "morning" ? "sáng" : "tối"} ngày ${fmtD(m.missedDate)} — làm kiểm tra ca`, done: false });
    }
  }
  if (due > 0) {
    steps.push({ id: "review", title: `Miaozi · Ôn thẻ đến hạn (${due} thẻ)`, detail: "Lật thẻ, tự chấm. Pinyin ẩn.", shift: "", minutes: Math.max(5, Math.round(due / 3)), done: false, to: "/review", cta: "Ôn thẻ", source: "lohan" });
  }
  if (isOffDay(now, s.settings) && now.getDay() === 6) heading = "Thứ Bảy — học bù / ôn · " + heading;
  return { heading, steps };
}
