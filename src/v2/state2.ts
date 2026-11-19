/** Trạng thái v2 (6 mục / bài, chế độ, Cạn pin, lịch, nợ) + các thao tác. Lưu trong IndexedDB key "v2". */
import type { AppState } from "../store";
import { getState, touch, persistQuiet, addMistake } from "../store";
import { penaltyId, type Penalty } from "../schedule";
import { WORD_BY_ID } from "../data/curriculum";
import {
  SEC_ORDER, activeSections, lessonComplete, lowLeft, mondayOf, percent, streakFrom, sundayOf, unlocksNext, useLow, ymd,
  LOW_EMPTY_MSG, type LowEnergy, type Mode, type SecId, type SecMap,
} from "./queue";
import { LESSON_COUNT, lesson, speakNeed } from "./lessons";

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
export interface DayLog { modes: Mode[]; ms: number; secs: string[]; tests: string[]; note?: string }
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
}

export const DEFAULT_V2 = (): V2State => ({
  version: 2, lesson: 1, sec: {}, sub: {}, modeByDay: {}, days: {}, busy: [], legacy: null,
  write: { lesson: 1, idx: 0, hide: false, done: {} }, retry: {}, tests: {}, pomodoro: null, owedPenalized: {},
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
  v.retry = v.retry || {}; v.tests = v.tests || {}; v.owedPenalized = v.owedPenalized || {};
}

/** Mỗi lần mở app: mục nợ quá hạn → phạt + khóa lại (unlocksNext tự khóa). */
export function v2Rollover(st: AppState, now: Date) {
  const today = ymd(now);
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
export function chooseMode(m: Exclude<Mode, "company">): string | null {
  const v = S();
  if (m === "low") {
    const next = useLow(v.low, new Date());
    if (!next) return LOW_EMPTY_MSG;
    v.low = next;
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

export function retryLeftMs(key: string): number { return Math.max(0, (S().retry[key] || 0) - Date.now()); }
export function setRetry(key: string) { S().retry[key] = Date.now() + 10 * 60000; touch(); }

export function recordTest(key: string, pass: boolean, score: number) {
  const v = S();
  const prev = v.tests[key];
  v.tests[key] = { pass: pass || !!prev?.pass, score: Math.max(score, prev?.score || 0), at: Date.now(), tries: (prev?.tries || 0) + 1 };
  if (pass) { const d = day(); if (!d.tests.includes(key)) d.tests.push(key); }
  else setRetry("test:" + key);
  touch();
}

/** Kết quả 6A/6B: từ sai → Lỗi sai + chép phạt (Mục 1 sáng lên ở phiên sau). */
export function finishCheck(n: number, which: "s6a" | "s6b", pass: boolean, score: number, wrong: { hanzi: string; wordId?: string }[]) {
  const u = subOf(n);
  u[which] = { score, at: Date.now(), pass: pass || !!u[which]?.pass };
  for (const w of wrong) if (w.wordId && WORD_BY_ID[w.wordId]) addMistake(WORD_BY_ID[w.wordId], which === "s6a" ? "kiểm tra 6A" : "kiểm tra 6B");
  const chars = [...new Set(wrong.map((w) => w.hanzi))].slice(0, 8);
  if (chars.length) getState().penalties.push(mkPenalty(chars, `Sai ở ${which === "s6a" ? "6A" : "6B"} bài ${n}`));
  if (!pass) setRetry(`${which}:${n}`);
  touch();
}

export function finishS3(n: number, score: number) {
  patchSub(n, { s3: score >= 4 ? { score, at: Date.now() } : subOf(n).s3 || null });
  if (score < 4) setRetry(`s3:${n}`);
}

/** Hôm nay bận: dời buổi, không đứt chuỗi. Tối đa 2 lần/tuần. */
export function busyLeft(): number {
  const ws = mondayOf(new Date());
  return Math.max(0, 2 - S().busy.filter((d) => d >= ws).length);
}
export function markBusy(): string | null {
  const v = S(); const t = todayKey();
  if (v.busy.includes(t)) return null;
  if (busyLeft() <= 0) return "Tuần này đã dời 2 buổi rồi. Chọn Cạn pin hoặc Công ty để giữ chuỗi.";
  v.busy = [...v.busy, t];
  touch();
  return null;
}

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
