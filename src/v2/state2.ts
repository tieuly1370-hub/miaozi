/** Trạng thái v2 (6 mục / bài, chế độ, Cạn pin, lịch, nợ) + các thao tác. Lưu trong IndexedDB key "v2". */
import type { AppState } from "../store";
import { getState, touch, persistQuiet, addMistake } from "../store";
import { penaltyId, type Penalty } from "../schedule";
import { WORD_BY_ID } from "../data/curriculum";
import {
  SEC_ORDER, activeSections, lessonComplete, lowLeft, mondayOf, percent, streakFrom, sundayOf, unlocksNext, useLow, ymd, offPenaltyWords,
  LOW_EMPTY_MSG, type LowEnergy, type Mode, type SecId, type SecMap,
} from "./queue";
import { LESSON_COUNT, lesson, speakNeed } from "./lessons";
import { miaoEvent } from "./miaoBus";
import { canPinTrigger } from "./miao";
import { newCard, review, type Card } from "../srs";

export interface LessonSub {
  intro?: boolean;
  vocabSeen: string[];
  dialog?: boolean;
  videoOpened?: boolean;
  videoDone?: boolean;
  s3?: { score: number; at: number } | null;
  written: string[];
  sentOk: number[];
  sentText?: Record<number, string>;
  spoken: string[];
  s6a?: { score: number; at: number; pass: boolean };
  s6b?: { score: number; at: number; pass: boolean };
}
export interface DayLog { modes: string[]; ms: number; secs: string[]; tests: string[]; note?: string }
export interface SkillLog { at: number; date: string; source: string; skill: string; first: number; total: number }
export interface TestRec { pass: boolean; score: number; at: number; tries: number }
export interface V2State {
  version: 2;
  lesson: number;
  sec: Record<number, SecMap>;
  sub: Record<number, LessonSub>;
  modeByDay: Record<string, Mode>;
  low?: LowEnergy;
  days: Record<string, DayLog>;
  busy: string[];
  legacy?: { count: number; date: string } | null;
  write: { lesson: number; idx: number; hide: boolean; done: Record<string, boolean> };
  retry: Record<string, number>;
  tests: Record<string, TestRec>;
  pomodoro?: { end: number; mins: number } | null;
  owedPenalized: Record<string, boolean>;
  lastInput?: number;
  /** v2.1: ngày "Xin nghỉ" đã sinh chép phạt hôm sau. (Ngày nghỉ lưu ở `busy`.) */
  offApplied: Record<string, boolean>;
  /** v2.1: kết quả từng kỹ năng ở các bài kiểm tra (cho báo cáo điểm yếu). */
  skillLog: SkillLog[];
  /** v2.1: tuần đã xem / đã giao phạt báo cáo điểm yếu (key = thứ Hai). */
  report: Record<string, { seen?: boolean; penalized?: boolean }>;
  /** v2.2: chữ khó đã đánh dấu ⭐ (chữ → lúc đánh dấu). */
  stars: Record<string, number>;
  /** v2.2: thẻ ôn bộ thủ (SRS, khóa = bộ thủ) + thống kê quiz. */
  rad: Record<string, import("../srs").Card>;
  radQuiz: { right: number; total: number; days: string[] };
}

export const DEFAULT_V2 = (): V2State => ({
  version: 2, lesson: 1, sec: {}, sub: {}, modeByDay: {}, days: {}, busy: [], legacy: null,
  write: { lesson: 1, idx: 0, hide: false, done: {} }, retry: {}, tests: {}, pomodoro: null, owedPenalized: {},
  offApplied: {}, skillLog: [], report: {}, stars: {}, rad: {}, radQuiz: { right: 0, total: 0, days: [] },
});

/** Lên 2.0 từ 1.2: giữ chuỗi/lịch sử/phạt; bài hiện tại = bài đang mở khóa (chủ vẫn đang ở bài 1). */
export function migrateV2(st: AppState, fresh: boolean) {
  const v = st.v2;
  if (fresh) {
    v.lesson = Math.max(1, Math.min(LESSON_COUNT, st.progress.unlockedLesson || 1));
    if (st.streak.current > 0 && st.streak.lastFulfilledDate) v.legacy = { count: st.streak.current, date: st.streak.lastFulfilledDate };
    // lịch sử 1.2 → lịch tháng (phút học theo ngày)
    for (const l of st.sessions) {
      if (!l.date) continue;
      const d = (v.days[l.date] = v.days[l.date] || { modes: [], ms: 0, secs: [], tests: [] });
      d.ms += l.activeMs || 0;
      if (l.counted && !d.tests.includes("ca 1.2")) d.tests.push("ca 1.2");
    }
    v.write.lesson = v.lesson;
  }
  v.write = { ...DEFAULT_V2().write, ...(v.write || {}) };
  v.retry = {}; v.tests = v.tests || {}; v.owedPenalized = v.owedPenalized || {};
  v.offApplied = v.offApplied || {}; v.skillLog = v.skillLog || []; v.report = v.report || {};
  // v2.2: thêm trường mới (cộng thêm, không đụng dữ liệu cũ)
  v.stars = v.stars || {}; v.rad = v.rad || {}; v.radQuiz = v.radQuiz || { right: 0, total: 0, days: [] };
  // v2.1: bỏ Tiêu chuẩn / Bứt phá — ngày nào đã chọn 2 chế độ này coi như "không chọn" (app tự gợi ý).
  for (const [d, m] of Object.entries(v.modeByDay || {})) if (m !== "company" && m !== "low") delete v.modeByDay[d];
}

/** Bài gần nhất (để giao chép phạt khi Xin nghỉ): bài đang học nếu đã có tiến độ, không thì bài trước. */
export function recentLesson(st: AppState): number {
  const n = st.v2.lesson;
  return percent(st.v2.sec[n] || {}) > 0 || n <= 1 ? n : n - 1;
}

/** Hôm sau ngày Xin nghỉ: sinh chép phạt (case 1 / case 2, có trần). */
export function applyOffPenalties(st: AppState, now: Date, pick?: (a: string[]) => string[]) {
  const today = ymd(now);
  for (const d of [...st.v2.busy].sort()) {
    if (d >= today || st.v2.offApplied[d]) continue;
    st.v2.offApplied[d] = true;
    const words = lesson(recentLesson(st)).words.map((w) => w.hanzi);
    const pending = st.penalties.filter((p) => !p.done && p.copies > 0).flatMap((p) => p.dueChars);
    const add = offPenaltyWords(pending, words, pick || ((a) => a.slice().sort(() => Math.random() - 0.5)));
    if (add.length) st.penalties.push(mkPenalty(add, `Xin nghỉ ngày ${d.slice(8)}/${d.slice(5, 7)} — ${pending.length ? "thêm" : "chép"} ${add.length} từ của bài ${recentLesson(st)}`));
  }
}

/** Mỗi lần mở app: mục nợ quá hạn → phạt + khóa lại (unlocksNext tự khóa); phạt Xin nghỉ hôm trước. */
export function v2Rollover(st: AppState, now: Date) {
  const today = ymd(now);
  applyOffPenalties(st, now);
  maybeWeeklyReport(st, now);
  for (const [n, sec] of Object.entries(st.v2.sec)) {
    for (const id of SEC_ORDER) {
      const r = sec[id];
      if (!r?.owed || r.done || r.owed.due >= today) continue;
      const key = `${n}:${id}:${r.owed.due}`;
      if (st.v2.owedPenalized[key]) continue;
      st.v2.owedPenalized[key] = true;
      const chars = lesson(Number(n)).words.slice(0, 3).map((w) => w.hanzi);
      st.penalties.push(mkPenalty(chars, `Nợ Mục ${id.slice(1).toUpperCase()} bài ${n} quá hạn (hạn ${r.owed.due})`));
    }
  }
}

function mkPenalty(chars: string[], reason: string, copies = 3): Penalty {
  return { id: penaltyId("v2"), type: "wordTwice", reason, createdAt: Date.now(), dueChars: chars, copies, done: false, extraReview: 0, note: `Chép ${chars.join(" ")} — mỗi chữ ${copies} lần.` };
}

/* ---------------- đọc ---------------- */
const S = () => getState().v2;
export const todayKey = () => ymd(new Date());
export function secOf(n: number): SecMap { return (S().sec[n] = S().sec[n] || {}); }
export function subOf(n: number): LessonSub {
  const v = S();
  const cur = v.sub[n];
  if (!cur) v.sub[n] = { vocabSeen: [], written: [], sentOk: [], spoken: [] };
  return v.sub[n];
}
export function openPenalties(): Penalty[] { return getState().penalties.filter((p) => !p.done && p.copies > 0); }
export function hasPenalty(): boolean { return openPenalties().length > 0; }

export function currentMode(): Mode | null {
  if (getState().settings.companyMode) return "company";
  return S().modeByDay[todayKey()] || null;
}
export function lowLeftNow(): number { return lowLeft(S().low, new Date()); }

export function active(n: number): SecId[] {
  return activeSections(currentMode(), secOf(n), hasPenalty());
}

/** Điều kiện đã đạt chưa (để bật nút "Đánh dấu hoàn thành"). */
export function earned(n: number, id: SecId): boolean {
  const L = lesson(n), u = subOf(n);
  switch (id) {
    case "s1": return !hasPenalty();
    case "s2": return L.words.every((w) => u.vocabSeen.includes(w.id)) && !!u.dialog && !!u.videoDone;
    case "s3": return !!u.s3 && u.s3.score >= 4;
    case "s4": return L.words.every((w) => u.written.includes(w.id)) && u.sentOk.length >= 3;
    case "s5": return u.spoken.length >= speakNeed(n);
    case "s6a": return !!u.s6a?.pass;
    case "s6b": return !!u.s6b?.pass;
  }
}

export function lessonUnlockedV2(n: number): boolean {
  return n <= 1 || n <= S().lesson;
}

/* ---------------- ghi ---------------- */
function day(k = todayKey()): DayLog { const v = S(); return (v.days[k] = v.days[k] || { modes: [], ms: 0, secs: [], tests: [] }); }

/** Chọn chế độ hôm nay. Trả về thông báo lỗi nếu Cạn pin đã hết lượt. */
export function chooseMode(m: "low"): string | null {
  const v = S();
  if (m === "low") {
    const before = lowLeft(v.low, new Date());
    const next = useLow(v.low, new Date());
    if (!next) return LOW_EMPTY_MSG;
    v.low = next;
    if (canPinTrigger(before, lowLeft(next, new Date()))) miaoEvent("can_pin");
  }
  if (getState().settings.companyMode) getState().settings = { ...getState().settings, companyMode: false };
  v.modeByDay[todayKey()] = m;
  const d = day(); if (!d.modes.includes(m)) d.modes.push(m);
  touch();
  return null;
}
export function setCompany(on: boolean) {
  const s = getState();
  s.settings = { ...s.settings, companyMode: on };
  if (on) { const d = day(); if (!d.modes.includes("company")) d.modes.push("company"); }
  touch();
}

export function patchSub(n: number, p: Partial<LessonSub>) { Object.assign(subOf(n), p); touch(); }
export function addTo(n: number, key: "vocabSeen" | "written" | "spoken", id: string) {
  const u = subOf(n); if (!u[key].includes(id)) { u[key] = [...u[key], id]; touch(); }
}
export function sentPassed(n: number, i: number, text: string) {
  const u = subOf(n);
  if (!u.sentOk.includes(i)) u.sentOk = [...u.sentOk, i];
  u.sentText = { ...(u.sentText || {}), [i]: text };
  touch();
}

function logSection(n: number, id: SecId) { const d = day(); const k = `${n}:${id}`; if (!d.secs.includes(k)) d.secs.push(k); }

export function completeSection(n: number, id: SecId): boolean {
  // Mục 1: nút “Xác nhận đã chép phạt xong” chỉ bật khi đã chép đủ → đóng các bài phạt rồi mới tính.
  if (id === "s1") for (const p of openPenalties()) { p.done = true; p.proof = { kind: "app", at: Date.now() }; }
  if (!earned(n, id)) return false;
  const sec = secOf(n);
  sec[id] = { done: true, at: Date.now() };
  logSection(n, id);
  maybeAdvance(n);
  touch();
  miaoEvent("thanh_tich");
  return true;
}

function maybeAdvance(n: number) {
  const v = S();
  if (n === v.lesson && unlocksNext(secOf(n), todayKey()) && v.lesson < LESSON_COUNT) v.lesson = n + 1;
}

/** Bỏ qua mục (mic hỏng, không tai nghe…) → nợ, hạn Chủ nhật tuần này. */
export function oweSection(n: number, id: SecId, reason: string) {
  const sec = secOf(n);
  if (sec[id]?.done) return;
  sec[id] = { ...(sec[id] || {}), owed: { at: Date.now(), due: sundayOf(new Date()), reason } };
  maybeAdvance(n);
  touch();
}

/** Thi vượt bài đạt → mọi mục xong. */
export function passPlacement(n: number, score: number) {
  const sec = secOf(n);
  for (const id of SEC_ORDER) if (id !== "s1") sec[id] = { done: true, at: Date.now() };
  recordTest(`placement:${n}`, true, score);
  maybeAdvance(n);
  touch();
}

/** v2.1: bỏ toàn bộ thời gian chờ thi lại — làm lại ngay. */
export function retryLeftMs(_key: string): number { return 0; }

export function recordTest(key: string, pass: boolean, score: number) {
  const v = S();
  const prev = v.tests[key];
  v.tests[key] = { pass: pass || !!prev?.pass, score: Math.max(score, prev?.score || 0), at: Date.now(), tries: (prev?.tries || 0) + 1 };
  if (pass) { const d = day(); if (!d.tests.includes(key)) d.tests.push(key); }
  touch();
  if (pass) miaoEvent("thanh_tich");
}

/* ---------------- v2.2: chữ khó ⭐ + ôn bộ thủ ---------------- */
export function isStar(c: string): boolean { return !!S().stars?.[c]; }
export function toggleStar(c: string) { const v = S(); v.stars = { ...(v.stars || {}) }; if (v.stars[c]) delete v.stars[c]; else v.stars[c] = Date.now(); touch(); }
export function starList(): string[] { return Object.entries(S().stars || {}).sort((a, b) => a[1] - b[1]).map((x) => x[0]); }
/** Từ có chứa chữ khó → thẻ ôn quay lại sớm gấp đôi. */
export function starBoost(hanzi: string): boolean { const st = S().stars || {}; return [...hanzi].some((c) => !!st[c]); }
export function radReview(k: string, q: number) { const v = S(); v.rad = { ...(v.rad || {}), [k]: review(v.rad?.[k] || newCard(k), q) }; touch(); }
export function radCard(k: string): Card | undefined { return S().rad?.[k]; }
export function radQuizLog(ok: boolean) {
  const v = S(); const q = v.radQuiz || { right: 0, total: 0, days: [] };
  v.radQuiz = { right: q.right + (ok ? 1 : 0), total: q.total + 1, days: q.days.includes(todayKey()) ? q.days : [...q.days, todayKey()].slice(-60) };
  touch();
}

/** Kết quả 6A/6B: từ sai → Lỗi sai + chép phạt (Mục 1 sáng lên ở phiên sau). */
export function finishCheck(n: number, which: "s6a" | "s6b", pass: boolean, score: number, wrong: { hanzi: string; wordId?: string }[]) {
  const u = subOf(n);
  u[which] = { score, at: Date.now(), pass: pass || !!u[which]?.pass };
  for (const w of wrong) if (w.wordId && WORD_BY_ID[w.wordId]) addMistake(WORD_BY_ID[w.wordId], which === "s6a" ? "kiểm tra 6A" : "kiểm tra 6B");
  const chars = [...new Set(wrong.map((w) => w.hanzi))].slice(0, 8);
  if (chars.length) getState().penalties.push(mkPenalty(chars, `Sai ở ${which === "s6a" ? "6A" : "6B"} bài ${n}`));
  touch();
}

export function finishS3(n: number, score: number) {
  patchSub(n, { s3: score >= 4 ? { score, at: Date.now() } : subOf(n).s3 || null });
}

/** Xin nghỉ hôm nay: không đứt chuỗi, hôm sau có chép phạt (xem applyOffPenalties). */
export function markOff(): string | null {
  const v = S(); const t = todayKey();
  if (v.busy.includes(t)) return null;
  v.busy = [...v.busy, t];
  touch();
  return null;
}
export function isOffToday(): boolean { return S().busy.includes(todayKey()); }

export function studiedDays(): Set<string> {
  return new Set(Object.entries(S().days).filter(([, d]) => d.secs.length || d.tests.some((t) => t !== "ca 1.2")).map(([k]) => k));
}
export function streakNow(): number { return streakFrom(studiedDays(), new Set(S().busy), new Date(), S().legacy); }

export function setDayNote(k: string, note: string) { day(k).note = note; touch(); }

/* ---------------- bộ đếm phút học (chỉ khi tab đang mở + có thao tác trong 60 giây) ---------------- */
let ticker = 0;
export function noteActivity() { S().lastInput = Date.now(); }
export function startTicker() {
  if (ticker) return;
  const onInput = () => noteActivity();
  ["pointerdown", "keydown", "touchstart"].forEach((e) => window.addEventListener(e, onInput, { passive: true }));
  let n = 0;
  ticker = window.setInterval(() => {
    if (document.hidden) return;
    if (Date.now() - (S().lastInput || 0) > 60_000) return;
    day().ms += 1000;
    if (++n % 15 === 0) persistQuiet();
  }, 1000);
}

export function lessonPercent(n: number) { return percent(secOf(n)); }
export function lessonDone(n: number) { return lessonComplete(secOf(n)); }
export function owedList(): { n: number; id: SecId; due: string; reason: string; overdue: boolean }[] {
  const t = todayKey(); const out: { n: number; id: SecId; due: string; reason: string; overdue: boolean }[] = [];
  for (const [n, sec] of Object.entries(S().sec)) for (const id of SEC_ORDER) { const r = sec[id]; if (r?.owed && !r.done) out.push({ n: Number(n), id, due: r.owed.due, reason: r.owed.reason, overdue: r.owed.due < t }); }
  return out;
}

export function setWrite(p: Partial<V2State["write"]>) { S().write = { ...S().write, ...p }; touch(); }
export function setPomodoro(mins: number | null) { S().pomodoro = mins ? { end: Date.now() + mins * 60000, mins } : null; touch(); }

/* ---------------- Báo cáo điểm yếu hằng tuần (thứ Hai) ---------------- */
export function logSkills(source: string, items: { skill: string; key: string }[], firstOk: Record<string, boolean>) {
  const v = S(); const by: Record<string, { f: number; t: number }> = {};
  for (const i of items) { const r = (by[i.skill] = by[i.skill] || { f: 0, t: 0 }); r.t++; if (firstOk[i.key]) r.f++; }
  for (const [skill, r] of Object.entries(by)) v.skillLog.push({ at: Date.now(), date: todayKey(), source, skill, first: r.f, total: r.t });
  if (v.skillLog.length > 600) v.skillLog = v.skillLog.slice(-600);
  touch();
}
export const SKILL_NAME: Record<string, string> = { listen: "Nghe", read: "Đọc", write: "Viết", speak: "Nói" };
export interface WeakReport { week: string; words: { hanzi: string; times: number; vi: string }[]; skills: { skill: string; pct: number; total: number }[]; weakest: string | null }
export function weakReport(st: AppState, now = new Date()): WeakReport {
  const week = mondayOf(now);
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).getTime();
  const words = st.mistakes.filter((m) => m.at >= since).sort((a, b) => b.times - a.times || b.at - a.at)
    .filter((m, i, a) => a.findIndex((x) => x.hanzi === m.hanzi) === i).slice(0, 6).map((m) => ({ hanzi: m.hanzi, times: m.times, vi: m.note }));
  const agg: Record<string, { f: number; t: number }> = {};
  for (const l of st.v2.skillLog || []) if (l.at >= since) { const r = (agg[l.skill] = agg[l.skill] || { f: 0, t: 0 }); r.f += l.first; r.t += l.total; }
  const skills = Object.entries(agg).map(([skill, r]) => ({ skill, pct: Math.round((r.f / Math.max(1, r.t)) * 100), total: r.t })).sort((a, b) => a.pct - b.pct);
  return { week, words, skills, weakest: skills.length && skills[0].pct < 90 ? skills[0].skill : null };
}
/** Thứ Hai đầu tiên mở app: Miao giao chép phạt các chữ sai nhiều nhất tuần trước (≤ 5 từ, mỗi từ 3 lần). */
export function maybeWeeklyReport(st: AppState, now: Date) {
  if (now.getDay() !== 1) return;
  const r = weakReport(st, now);
  const rec = (st.v2.report[r.week] = st.v2.report[r.week] || {});
  if (rec.penalized) return;
  rec.penalized = true;
  const pending = new Set(st.penalties.filter((p) => !p.done && p.copies > 0).flatMap((p) => p.dueChars));
  const words = r.words.map((w) => w.hanzi).filter((h) => !pending.has(h)).slice(0, 5);
  if (words.length) st.penalties.push(mkPenalty(words, `Báo cáo tuần: chữ sai nhiều nhất tuần trước`));
}
export function dismissReport() { const w = mondayOf(new Date()); S().report[w] = { ...(S().report[w] || {}), seen: true }; touch(); }
