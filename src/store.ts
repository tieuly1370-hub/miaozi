import * as db from "./db";
import { STORAGE_KEYS as K } from "./db";
import { type Card, cardId, newCard, review, dueCards, type Skill } from "./srs";
import {
  DEFAULT_SETTINGS, DEFAULT_STREAK, type Settings, type StreakState, type SessionLog,
  type Makeup, type Penalty, type PlannedSession, type SkillKind,
  sessionsOn, padDate, requiredSessions, penaltyId, sessionComplete, latePenalty, missedPenalty, twicePenalty, isOffDay, atHm,
} from "./schedule";
import { ALL_WORDS, type Word } from "./data/curriculum";
import { GSKILLS, type GSkill } from "./gate";

export interface Progress {
  week0Passed: boolean;
  week0Score: number | null;
  week0Parts: Record<string, boolean>;
  unlockedLesson: number; // 0 = week0 not passed; 1-15 available; 16 = all lessons passed
  lessonDay: Record<number, 1 | 2 | 3>;
  lessonPassed: Record<number, { score: number; at: number }>;
  dayDone: Record<string, boolean>; // `${lesson}:${day}`
  watchSeg: Record<number, number>;
  reviewWeekDone: boolean;
  mocks: Record<number, { score: number; at: number }>;
  weekly: Record<string, { done: boolean; rewardClaimed: boolean }>; // ISO week key
  /** Ngày bắt đầu dùng app — không phạt các ca trước ngày này. */
  startedOn: string;
  textbookRead: Record<number, boolean>;
  /** v1.2: cổng 4 kỹ năng riêng cho từng bài. */
  gate: Record<number, Partial<Record<GSkill, GateRec>>>;
  gateVersion: number;
  resetNotice?: boolean;
  /** Điểm "qua bài" kiểu cũ (v1.0–1.1), chỉ để xem lại. */
  legacyPassed?: Record<number, { score: number; at: number }>;
  /** Kiểm tra cuối ca: `${date}:${kind}`. */
  checks: Record<string, CheckRec>;
}

export interface GateRec {
  pass: boolean;
  score: number;
  at: number;
  tries: number;
  /** Ngày sớm nhất được thi lại (YYYY-MM-DD). */
  retryOn?: string;
  failed?: string[];
  why?: string[];
  inProgress?: number;
}

export interface CheckRec { pass: boolean; at: number; tries: number; retryAt?: number; score: number; why?: string[] }

export const DEFAULT_PROGRESS: Progress = {
  week0Passed: false,
  week0Score: null,
  week0Parts: {},
  unlockedLesson: 0,
  lessonDay: {},
  lessonPassed: {},
  dayDone: {},
  watchSeg: {},
  reviewWeekDone: false,
  mocks: {},
  weekly: {},
  startedOn: "",
  textbookRead: {},
  gate: {},
  gateVersion: 2,
  checks: {},
};

export interface Mistake {
  id: string;
  wordId?: string;
  hanzi: string;
  kind: string;
  note: string;
  at: number;
  times: number;
}

export interface NotePage {
  lesson: number;
  strokes: Stroke[];
  updatedAt: number;
}

export interface Stroke {
  pts: { x: number; y: number; p: number }[];
  color: string;
  width: number;
  eraser: boolean;
}

export interface TodayState {
  date: string;
  activeBySession: Record<string, number>;
  correct: number;
  total: number;
  lastInputAt: number;
  started: Record<string, number>;
  lateFlagged: Record<string, boolean>;
  wordWrongs: Record<string, number>;
  /** Bước trong kế hoạch hôm nay đã xong (id bước). */
  steps?: Record<string, boolean | number>;
  /** Bài/ngày được chốt cho kế hoạch hôm nay, ví dụ "3:2". */
  planFor?: string;
  speakCount?: number;
}

function defaultToday(d = new Date()): TodayState {
  return { date: padDate(d), activeBySession: {}, correct: 0, total: 0, lastInputAt: Date.now(), started: {}, lateFlagged: {}, wordWrongs: {} };
}

export interface AppState {
  settings: Settings;
  progress: Progress;
  streak: StreakState;
  srs: Record<string, Card>;
  mistakes: Mistake[];
  sessions: SessionLog[];
  notes: Record<string, NotePage>;
  penalties: Penalty[];
  today: TodayState;
  onboarded: boolean;
}

type Listener = () => void;
const listeners = new Set<Listener>();
let state: AppState | null = null;
let ready: Promise<void> | null = null;
let persistTimer = 0;

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState(): AppState {
  if (!state) throw new Error("store not ready");
  return state;
}

export function isReady(): boolean {
  return !!state;
}

function emit() {
  listeners.forEach((f) => f());
  schedulePersist();
}

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => { void persist(); }, 200);
}

async function persist() {
  if (!state) return;
  const s = state;
  await Promise.all([
    db.set(K.settings, s.settings),
    db.set(K.progress, s.progress),
    db.set(K.streak, s.streak),
    db.set(K.srs, s.srs),
    db.set(K.mistakes, s.mistakes),
    db.set(K.sessions, s.sessions.slice(-400)),
    db.set(K.notes, s.notes),
    db.set(K.penalties, s.penalties),
    db.set(K.today, s.today),
    db.set(K.onboarded, s.onboarded),
  ]);
}

export async function load(): Promise<AppState> {
  if (ready) { await ready; return state!; }
  ready = (async () => {
    const [settings, progress, streak, srs, mistakes, sessions, notes, penalties, today, onboarded] = await Promise.all([
      db.get<Settings>(K.settings),
      db.get<Progress>(K.progress),
      db.get<StreakState>(K.streak),
      db.get<Record<string, Card>>(K.srs),
      db.get<Mistake[]>(K.mistakes),
      db.get<SessionLog[]>(K.sessions),
      db.get<Record<string, NotePage>>(K.notes),
      db.get<Penalty[]>(K.penalties),
      db.get<TodayState>(K.today),
      db.get<boolean>(K.onboarded),
    ]);
    const todayDate = padDate(new Date());
    state = {
      settings: { ...DEFAULT_SETTINGS, ...(settings || {}) },
      progress: { ...DEFAULT_PROGRESS, ...(progress || {}) },
      streak: { ...DEFAULT_STREAK, ...(streak || {}), pendingMakeups: streak?.pendingMakeups || [] },
      srs: srs || {},
      mistakes: mistakes || [],
      sessions: sessions || [],
      notes: notes || {},
      penalties: penalties || [],
      today: today && today.date === todayDate ? today : defaultToday(),
      onboarded: !!onboarded,
    };
    migrate();
    rollover(new Date());
    ensureCards();
  })();
  await ready;
  emit();
  return state!;
}

/** v1.1: id phạt bị trùng (cùng mili-giây) và phạt cho các ngày trước khi cài app. */
function migrate() {
  if (!state) return;
  const st = state;
  const today = padDate(new Date());
  if (!st.progress.startedOn) {
    const first = st.sessions.map((l) => l.date).sort()[0];
    st.progress.startedOn = first && first < today ? first : today;
    // Bỏ học bù / chép phạt sinh ra cho những ngày trước khi bắt đầu dùng
    st.streak.pendingMakeups = st.streak.pendingMakeups.filter((m) => m.missedDate >= st.progress.startedOn);
    const keepMissed = st.streak.pendingMakeups.filter((m) => !m.done).length;
    let seen = 0;
    st.penalties = st.penalties.filter((p) => {
      if (p.type !== "missed" || p.done) return true;
      seen += 1;
      return seen <= keepMissed;
    });
  }
  st.progress.textbookRead = st.progress.textbookRead || {};
  st.progress.checks = st.progress.checks || {};
  // v1.2: cổng cũ quá dễ (qua nhờ nhớ pinyin) → reset cổng bài, giữ thống kê / thẻ / chuỗi.
  if (st.progress.gateVersion !== 2) {
    const hadLessons = Object.keys(st.progress.lessonPassed || {}).length > 0 || st.progress.unlockedLesson > 1;
    st.progress.legacyPassed = { ...(st.progress.legacyPassed || {}), ...(st.progress.lessonPassed || {}) };
    st.progress.lessonPassed = {};
    st.progress.gate = {};
    st.progress.lessonDay = {};
    st.progress.dayDone = {};
    if (st.progress.week0Passed) st.progress.unlockedLesson = Math.min(Math.max(st.progress.unlockedLesson, 1), 1);
    st.progress.gateVersion = 2;
    st.progress.resetNotice = hadLessons;
  }
  // Bài thi bỏ dở = trượt (không được thoát ra để làm lại cho dễ).
  const today2 = padDate(new Date());
  for (const [n, g] of Object.entries(st.progress.gate)) {
    for (const k of GSKILLS) {
      const r = g[k];
      if (r?.inProgress && Date.now() - r.inProgress > 3 * 3600000) {
        g[k] = { ...r, inProgress: undefined, pass: false, retryOn: tomorrow(), why: ["Bỏ dở bài thi giữa chừng — tính là trượt."] };
      }
    }
    void n;
  }
  void today2;
  const ids = new Set<string>();
  for (const p of st.penalties) {
    if (ids.has(p.id)) p.id = penaltyId(p.type);
    ids.add(p.id);
  }
}

function ensureCards() {
  if (!state) return;
  const maxLesson = Math.max(state.progress.unlockedLesson, 1);
  for (const w of ALL_WORDS) {
    if (w.lesson > maxLesson && !state.progress.week0Passed) continue;
    if (w.lesson > state.progress.unlockedLesson && w.lesson > 1) continue;
    for (const skill of ["recognize", "sound", "write"] as Skill[]) {
      const id = cardId(w.id, skill);
      if (!state.srs[id]) state.srs[id] = newCard(id);
    }
  }
}

function rollover(now: Date) {
  if (!state) return;
  // Mark missed required sessions from last 4 days (except today still in window)
  for (let back = 1; back <= 4; back++) {
    const d = new Date(now);
    d.setDate(d.getDate() - back);
    if (state.progress.startedOn && padDate(d) < state.progress.startedOn) continue;
    const planned = requiredSessions(d, state.settings);
    for (const p of planned) {
      const logs = state.sessions.filter((l) => l.sessionId === p.id);
      const done = sessionComplete(logs, p);
      const existing = state.streak.pendingMakeups.find((m) => m.sessionId === p.id);
      if (done) {
        if (existing && !existing.done) existing.done = true;
        continue;
      }
      if (existing) {
        if (!existing.done && now.getTime() > existing.dueBy) {
          // makeup expired — break streak
          state.streak.current = 0;
          state.streak.lastFulfilledDate = null;
        }
        continue;
      }
      const makeup: Makeup = {
        id: "mk-" + p.id,
        sessionId: p.id,
        kind: p.kind,
        missedDate: p.date,
        dueBy: p.end.getTime() + 48 * 3600000,
        done: false,
      };
      state.streak.pendingMakeups.push(makeup);
      const chars = pickPenaltyChars(3);
      const label = p.kind === "morning" ? "ca sáng" : p.kind === "evening" ? "ca tối" : "kiểm tra tuần";
      const [yy, mm, dd] = p.date.split("-");
      void yy;
      state.penalties.push(missedPenalty(chars, `Bỏ ${label} ngày ${dd}/${mm}`, p.id));
    }
  }
  // fulfill today if all required done — handled in markQualified
}

function pickPenaltyChars(n: number): string[] {
  const unlocked = state ? state.progress.unlockedLesson : 1;
  const pool = ALL_WORDS.filter((w) => w.lesson <= Math.max(1, unlocked) && w.hanzi.length <= 2);
  const pick: string[] = [];
  const used = new Set<string>();
  for (let i = 0; i < 40 && pick.length < n; i++) {
    const w = pool[Math.floor(Math.random() * Math.max(1, pool.length))];
    if (!w || used.has(w.hanzi)) continue;
    used.add(w.hanzi);
    pick.push(w.hanzi);
  }
  if (!pick.length) pick.push("你", "好", "我");
  return pick.slice(0, n);
}

export function patchSettings(p: Partial<Settings>) {
  const s = getState();
  s.settings = { ...s.settings, ...p };
  emit();
}

export function setOnboarded() {
  getState().onboarded = true;
  emit();
}

export function plannedToday(now = new Date()): PlannedSession[] {
  return sessionsOn(now, getState().settings);
}

export function openMakeups(): Makeup[] {
  return getState().streak.pendingMakeups.filter((m) => !m.done && m.dueBy >= Date.now());
}

export function expiredMakeups(): Makeup[] {
  return getState().streak.pendingMakeups.filter((m) => !m.done && m.dueBy < Date.now());
}

/** Idle-aware clock: call on user input and on a 1s tick while a lesson is open. */
const IDLE_MS = 60_000;
let tickingFor: string | null = null;
let tickHandle = 0;

export function noteInput() {
  const s = getState();
  s.today.lastInputAt = Date.now();
}

export function startActivity(session: PlannedSession | null, skill: SkillKind) {
  const s = getState();
  const now = Date.now();
  const sid = session?.id || padDate(new Date()) + ":free";
  if (!s.today.started[sid]) {
    s.today.started[sid] = now;
    if (session?.required) {
      const lateAfter = session.start.getTime() + 30 * 60000;
      if (now > lateAfter && now <= session.end.getTime() + 30 * 60000 && !s.today.lateFlagged[sid]) {
        s.today.lateFlagged[sid] = true;
        s.penalties.push(latePenalty(5));
        bumpDueCards(5);
      }
    }
  }
  tickingFor = sid;
  noteInput();
  if (tickHandle) clearInterval(tickHandle);
  tickHandle = window.setInterval(() => activityTick(sid, skill), 1000);
  emit();
}

function activityTick(sid: string, _skill: SkillKind) {
  const s = getState();
  if (Date.now() - s.today.lastInputAt > IDLE_MS) return;
  if (document.hidden) return;
  s.today.activeBySession[sid] = (s.today.activeBySession[sid] || 0) + 1000;
}

export function stopActivity() {
  if (tickHandle) clearInterval(tickHandle);
  tickHandle = 0;
  tickingFor = null;
}

export function recordAnswer(ok: boolean, word?: Word, kind?: string) {
  const s = getState();
  s.today.total += 1;
  if (ok) s.today.correct += 1;
  else if (word) {
    addMistake(word, kind || "luyện tập");
    s.today.wordWrongs[word.id] = (s.today.wordWrongs[word.id] || 0) + 1;
    if (s.today.wordWrongs[word.id] === 2) {
      s.penalties.push(twicePenalty(word.hanzi));
    }
  }
  emit();
}

export function addMistake(word: Word, kind: string, note?: string) {
  const s = getState();
  const exist = s.mistakes.find((m) => m.wordId === word.id && m.kind === kind);
  if (exist) {
    exist.times += 1;
    exist.at = Date.now();
    if (note) exist.note = note;
  } else {
    s.mistakes.unshift({
      id: "m-" + Date.now() + "-" + word.id,
      wordId: word.id,
      hanzi: word.hanzi,
      kind,
      note: note || word.vi,
      at: Date.now(),
      times: 1,
    });
  }
  emit();
}

export function srsReview(id: string, quality: number) {
  const s = getState();
  const card = s.srs[id] || newCard(id);
  s.srs[id] = review(card, quality);
  emit();
}

export function markIntroduced(wordId: string) {
  const s = getState();
  for (const skill of ["recognize", "sound", "write"] as Skill[]) {
    const id = cardId(wordId, skill);
    const c = s.srs[id] || newCard(id);
    if (!c.introduced) s.srs[id] = { ...c, introduced: true, last: Date.now() };
  }
  emit();
}

export function bumpDueCards(n: number) {
  const s = getState();
  const pool = Object.values(s.srs).filter((c) => c.introduced && c.due > Date.now());
  pool.sort((a, b) => a.due - b.due);
  for (const c of pool.slice(0, n)) {
    s.srs[c.id] = { ...c, due: Date.now() };
  }
  emit();
}

export function dueReview(): Card[] {
  const s = getState();
  return dueCards(s.srs).filter((c) => c.introduced);
}

export function finishSessionIfQualified(session: PlannedSession) {
  const s = getState();
  const now = Date.now();
  const activeMs = s.today.activeBySession[session.id] || 0;
  const log: SessionLog = {
    id: "log-" + now,
    sessionId: session.id,
    date: session.date,
    kind: session.kind,
    startedAt: s.today.started[session.id] || now,
    endedAt: now,
    activeMs,
    correct: s.today.correct,
    total: s.today.total,
    counted: false,
    late: !!s.today.lateFlagged[session.id],
    skills: session.skills,
  };
  const min = session.kind === "morning" ? Math.min(15, session.minMinutes) : session.minMinutes;
  // For morning, we accumulate; counted piece needs 15 min + 70%
  const accOk = s.today.total >= 3 && s.today.correct / s.today.total >= 0.7;
  const timeOk = activeMs / 60000 >= (session.kind === "morning" ? 15 : session.minMinutes);
  log.counted = accOk && timeOk;
  s.sessions.push(log);

  if (session.kind === "morning") {
    const logs = s.sessions.filter((l) => l.sessionId === session.id && l.counted);
    const sum = logs.reduce((a, l) => a + l.activeMs, 0) + (log.counted ? 0 : 0);
    if (sessionComplete([...logs, ...(log.counted ? [] : [])], session) || (sum >= session.minMinutes * 60000 && accOk)) {
      fulfill(session);
    }
  } else if (log.counted) {
    fulfill(session);
  }
  emit();
  return log;
}

function fulfill(session: PlannedSession) {
  const s = getState();
  // close matching makeup
  for (const m of s.streak.pendingMakeups) {
    if (!m.done && (m.sessionId === session.id || (m.kind === session.kind && Date.now() <= m.dueBy))) {
      if (m.kind === session.kind || m.sessionId === session.id) {
        m.done = true;
        m.doneAt = Date.now();
      }
    }
  }
  // If doing makeup of a past kind during saturday/free, mark oldest matching
  const open = s.streak.pendingMakeups.find((m) => !m.done && m.kind === session.kind);
  if (open && session.date !== open.missedDate) {
    open.done = true;
    open.doneAt = Date.now();
  }
  maybeAdvanceStreak(new Date());
}

function maybeAdvanceStreak(now: Date) {
  const s = getState();
  const today = padDate(now);
  const req = requiredSessions(now, s.settings);
  const allTodayDone = req.every((p) => sessionComplete(s.sessions.filter((l) => l.sessionId === p.id), p));
  if (req.length && !allTodayDone) return;
  if (s.streak.lastFulfilledDate === today) return;
  // off-day with no makeups finished still "keeps" streak (no increment needed if already counting through last required)
  if (!req.length) {
    // completing a makeup on an off day
    const justClosed = s.streak.pendingMakeups.filter((m) => m.done && m.doneAt && padDate(new Date(m.doneAt)) === today);
    if (!justClosed.length) return;
  }
  s.streak.current += 1;
  s.streak.best = Math.max(s.streak.best, s.streak.current);
  s.streak.lastFulfilledDate = today;
}

export function completeWeek0(score: number) {
  const s = getState();
  s.progress.week0Score = score;
  s.progress.week0Passed = score >= 0.8;
  if (s.progress.week0Passed && s.progress.unlockedLesson < 1) s.progress.unlockedLesson = 1;
  ensureCards();
  emit();
}

export function markWeek0Part(part: string) {
  getState().progress.week0Parts[part] = true;
  emit();
}

export function markDayDone(lesson: number, day: 1 | 2 | 3) {
  const s = getState();
  s.progress.dayDone[`${lesson}:${day}`] = true;
  const cur = s.progress.lessonDay[lesson] || 1;
  if (day >= cur && day < 3) s.progress.lessonDay[lesson] = (day + 1) as 1 | 2 | 3;
  emit();
}

export function passLesson(lesson: number, score: number) {
  const s = getState();
  s.progress.lessonPassed[lesson] = { score, at: Date.now() };
  if (score >= 0.8) {
    s.progress.unlockedLesson = Math.max(s.progress.unlockedLesson, lesson + 1);
    ensureCards();
  }
  emit();
}

export function saveNote(lesson: number, strokes: Stroke[]) {
  const s = getState();
  s.notes[String(lesson)] = { lesson, strokes, updatedAt: Date.now() };
  emit();
}

export function markPenaltyDone(id: string, proof?: Penalty["proof"]) {
  const s = getState();
  const p = s.penalties.find((x) => x.id === id);
  if (p) { p.done = true; if (proof) p.proof = proof; }
  emit();
}

export function setPenaltyWritten(id: string, char: string, n: number) {
  const p = getState().penalties.find((x) => x.id === id);
  if (!p) return;
  p.written = { ...(p.written || {}), [char]: n };
  emit();
}

export function markStep(stepId: string, done = true) {
  const s = getState();
  s.today.steps = { ...(s.today.steps || {}), [stepId]: done };
  emit();
}

export function markTextbookRead(lesson: number) {
  const s = getState();
  s.progress.textbookRead = { ...(s.progress.textbookRead || {}), [lesson]: true };
  emit();
}

export function markSegWatched(lesson: number, count: number) {
  const s = getState();
  s.progress.watchSeg[lesson] = Math.max(s.progress.watchSeg[lesson] || 0, count);
  emit();
}

export function weekKey(d = new Date()): string {
  const tmp = new Date(d);
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
  const yearStart = new Date(tmp.getFullYear(), 0, 1);
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function markWeekDone() {
  const s = getState();
  const k = weekKey();
  s.progress.weekly[k] = { done: true, rewardClaimed: false };
  emit();
}

export function claimReward() {
  const s = getState();
  const k = weekKey();
  s.progress.weekly[k] = { ...(s.progress.weekly[k] || { done: true, rewardClaimed: false }), rewardClaimed: true };
  emit();
}

export function passMock(n: number, score: number) {
  getState().progress.mocks[n] = { score, at: Date.now() };
  emit();
}

export function lessonUnlocked(n: number): boolean {
  const s = getState();
  if (n <= 0) return true;
  return s.progress.week0Passed && s.progress.unlockedLesson >= n;
}

export function exportPayload() {
  return db.exportAll();
}

export async function importPayload(data: { version?: number; data: Record<string, unknown> }) {
  await db.importAll(data);
  ready = null;
  state = null;
  await load();
}

/** Reset today's counters for tests / new day already handled. */
export function debugSeed(partial: Partial<AppState>) {
  const s = getState();
  Object.assign(s, partial);
  if (partial.progress) s.progress = { ...DEFAULT_PROGRESS, ...s.progress, ...partial.progress };
  ensureCards();
  emit();
}

export { atHm };

export function setPlanFor(key: string) {
  const s = getState();
  if (s.today.planFor) return;
  s.today.planFor = key;
  emit();
}

export function bumpSpeak() {
  const s = getState();
  s.today.speakCount = (s.today.speakCount || 0) + 1;
  emit();
}


export function tomorrow(d = new Date()): string {
  const x = new Date(d);
  x.setDate(x.getDate() + 1);
  return padDate(x);
}

export function gateRec(n: number, k: GSkill): GateRec | undefined {
  return getState().progress.gate[n]?.[k];
}

/** Kỹ năng này hôm nay có được thi không. */
export function gateBlockedUntil(n: number, k: GSkill): string | null {
  const r = gateRec(n, k);
  if (!r || r.pass || !r.retryOn) return null;
  return r.retryOn > padDate(new Date()) ? r.retryOn : null;
}

export function unitPassed(n: number): boolean {
  const g = getState().progress.gate[n];
  return !!g && GSKILLS.every((k) => g[k]?.pass);
}

export function startGate(n: number, k: GSkill) {
  const s = getState();
  const g = (s.progress.gate[n] = s.progress.gate[n] || {});
  const r = g[k] || { pass: false, score: 0, at: 0, tries: 0 };
  g[k] = { ...r, inProgress: Date.now() };
  emit();
}

export function abandonGate(n: number, k: GSkill) {
  const s = getState();
  const r = s.progress.gate[n]?.[k];
  if (!r?.inProgress) return;
  s.progress.gate[n]![k] = { ...r, inProgress: undefined, pass: false, tries: r.tries + 1, at: Date.now(), retryOn: tomorrow(), why: ["Bỏ dở bài thi giữa chừng — tính là trượt."] };
  emit();
}

export function finishGate(n: number, k: GSkill, pass: boolean, score: number, failed: string[], why: string[]) {
  const s = getState();
  const g = (s.progress.gate[n] = s.progress.gate[n] || {});
  const r = g[k] || { pass: false, score: 0, at: 0, tries: 0 };
  g[k] = { pass, score, at: Date.now(), tries: r.tries + 1, failed, why, retryOn: pass ? undefined : tomorrow() };
  if (unitPassed(n)) {
    const avg = GSKILLS.reduce((a, x) => a + (g[x]?.score || 0), 0) / 4;
    s.progress.lessonPassed[n] = { score: avg, at: Date.now() };
    s.progress.unlockedLesson = Math.max(s.progress.unlockedLesson, n + 1);
    ensureCards();
  }
  emit();
}

/** Phạt chép khi viết sai 2 lần trong bài thi: chép 10 lần mỗi chữ, thi lại ngày mai. */
export function gateWritePenalty(hanzi: string, why: string) {
  const s = getState();
  s.penalties.push({ ...twicePenalty(hanzi), copies: 10, reason: why, note: `Chép ${hanzi} 10 lần (mỗi chữ). Thi lại từ ngày mai.` });
  emit();
}

function checkKey(kind: string, d = new Date()) { return `${padDate(d)}:${kind}`; }

export function checkRec(kind: string, d = new Date()): CheckRec | undefined {
  return getState().progress.checks[checkKey(kind, d)];
}

/** Ca học chỉ được tính khi bài kiểm tra cuối ca đạt. */
export function completeSessionCheck(kind: "morning" | "evening" | "weeklyTest", pass: boolean, correct: number, total: number, why: string[]) {
  const s = getState();
  const now = new Date();
  const k = checkKey(kind, now);
  const prev = s.progress.checks[k];
  s.progress.checks[k] = { pass: pass || !!prev?.pass, at: Date.now(), tries: (prev?.tries || 0) + 1, score: total ? correct / total : 0, why, retryAt: pass ? undefined : Date.now() + 20 * 60000 };
  const planned = sessionsOn(now, s.settings).find((p) => p.kind === kind);
  const session: PlannedSession = planned || {
    id: `${padDate(now)}:makeup-${kind}`, date: padDate(now), kind, start: now, end: now, minMinutes: 0,
    skills: [], required: false, label: "Học bù",
  };
  s.sessions.push({
    id: "log-" + Date.now(), sessionId: session.id, date: session.date, kind: session.kind,
    startedAt: s.today.started[session.id] || Date.now(), endedAt: Date.now(),
    activeMs: pass ? Math.max(session.minMinutes * 60000, s.today.activeBySession[session.id] || 0) : 0,
    correct, total, counted: pass, late: !!s.today.lateFlagged[session.id], skills: session.skills,
  });
  if (pass) {
    // khép học bù cùng loại nếu đang nợ
    if (!planned) {
      const open = s.streak.pendingMakeups.find((m) => !m.done && m.kind === kind && Date.now() <= m.dueBy);
      if (open) { open.done = true; open.doneAt = Date.now(); }
      maybeAdvanceStreak(now);
    } else fulfill(session);
    advanceDayIfChecked();
  }
  emit();
}

/** Ngày học của bài chỉ sang ngày tiếp khi cả kiểm tra ca sáng và ca tối hôm đó đều đạt. */
function advanceDayIfChecked() {
  const s = getState();
  const n = Math.max(1, s.progress.unlockedLesson);
  if (!s.progress.week0Passed || n > 15) return;
  const day = (s.progress.lessonDay[n] || 1) as 1 | 2 | 3;
  if (day >= 3) return;
  if (checkRec("morning")?.pass && checkRec("evening")?.pass) {
    if (s.today.planFor && s.today.planFor !== `${n}:${day}`) return;
    markDayDone(n, day);
  }
}

export function setNhaiLink(key: string, url: string) {
  const s = getState();
  s.settings = { ...s.settings, nhaiUnit: { ...(s.settings.nhaiUnit || {}), [key]: url } };
  emit();
}

export function markStepOpened(id: string) {
  const s = getState();
  s.today.steps = { ...(s.today.steps || {}), [id + ":open"]: Date.now() as unknown as boolean };
  emit();
}

export function dismissResetNotice() {
  getState().progress.resetNotice = false;
  emit();
}

void GSKILLS;
