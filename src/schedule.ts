/** Personal schedule, streak with makeup, rewards/penalties. Times are local (device). */

export type SkillKind = "listen" | "read" | "speak" | "write";
export type SessionKind = "morning" | "evening" | "weeklyTest" | "makeup" | "optional";

export interface Shift {
  enabled: boolean;
  days: number[]; // JS getDay(): 0 Sun .. 6 Sat
  start: string; // "09:00"
  end: string;
  minMinutes: number;
  maxMinutes?: number;
  skills: SkillKind[];
}

export interface Settings {
  displayName: string;
  companyMode: boolean;
  weeklyReward: string;
  notify: boolean;
  autoplay: boolean;
  morning: Shift;
  evening: Shift;
  saturdayMakeup: boolean;
  sundayWeeklyTest: Shift;
  /** Link bài Nhai HSK chủ tự ghim cho từng bài: "3:vocab" → url. */
  nhaiUnit?: Record<string, string>;
}

export const DEFAULT_SETTINGS: Settings = {
  displayName: "chủ",
  companyMode: false,
  weeklyReward: "trà sữa",
  notify: true,
  autoplay: true,
  morning: {
    enabled: true,
    days: [1, 2, 3, 4, 5],
    start: "09:00",
    end: "12:00",
    minMinutes: 30,
    maxMinutes: 120,
    skills: ["listen", "read"],
  },
  evening: {
    enabled: true,
    days: [1, 2, 3, 4, 5],
    start: "21:00",
    end: "21:30",
    minMinutes: 30,
    skills: ["speak", "write"],
  },
  saturdayMakeup: true,
  sundayWeeklyTest: {
    enabled: true,
    days: [0],
    start: "20:00",
    end: "20:30",
    minMinutes: 20,
    skills: ["listen", "read", "speak", "write"],
  },
};

export function padDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseHm(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}

export function atHm(day: Date, hm: string): Date {
  const { h, m } = parseHm(hm);
  const x = new Date(day);
  x.setHours(h, m, 0, 0);
  return x;
}

export function dayNameVi(d: number): string {
  return ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d];
}

export interface PlannedSession {
  id: string;
  date: string;
  kind: SessionKind;
  start: Date;
  end: Date;
  minMinutes: number;
  skills: SkillKind[];
  required: boolean;
  label: string;
}

export function sessionsOn(date: Date, settings: Settings): PlannedSession[] {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const dow = d.getDay();
  const dateStr = padDate(d);
  const out: PlannedSession[] = [];
  const push = (shift: Shift, kind: SessionKind, label: string, required: boolean) => {
    if (!shift.enabled || !shift.days.includes(dow)) return;
    out.push({
      id: `${dateStr}:${kind}`,
      date: dateStr,
      kind,
      start: atHm(d, shift.start),
      end: atHm(d, shift.end),
      minMinutes: shift.minMinutes,
      skills: shift.skills,
      required,
      label,
    });
  };
  push(settings.morning, "morning", "Ca sáng — nghe + đọc", true);
  push(settings.evening, "evening", "Ca tối — nói + viết", true);
  push(settings.sundayWeeklyTest, "weeklyTest", "Kiểm tra tuần", true);
  if (dow === 6 && settings.saturdayMakeup) {
    out.push({
      id: `${dateStr}:optional`,
      date: dateStr,
      kind: "optional",
      start: atHm(d, "10:00"),
      end: atHm(d, "11:00"),
      minMinutes: 15,
      skills: ["listen", "read"],
      required: false,
      label: "Thứ Bảy — ôn nhẹ / học bù",
    });
  }
  return out;
}

export function currentSession(now: Date, settings: Settings): PlannedSession | null {
  const list = sessionsOn(now, settings);
  for (const s of list) {
    const early = new Date(s.start.getTime() - 15 * 60000);
    const late = new Date(s.end.getTime() + 30 * 60000);
    if (now >= early && now <= late) return s;
  }
  return list[0] && sameDay(now, list[0].start) ? null : null;
}

export function sameDay(a: Date, b: Date): boolean {
  return padDate(a) === padDate(b);
}

export interface Makeup {
  id: string;
  sessionId: string;
  kind: SessionKind;
  missedDate: string;
  dueBy: number;
  done: boolean;
  doneAt?: number;
}

export interface StreakState {
  current: number;
  best: number;
  lastFulfilledDate: string | null;
  pendingMakeups: Makeup[];
}

export const DEFAULT_STREAK: StreakState = { current: 0, best: 0, lastFulfilledDate: null, pendingMakeups: [] };

export interface SessionLog {
  id: string;
  sessionId: string;
  date: string;
  kind: SessionKind;
  startedAt: number;
  endedAt?: number;
  activeMs: number;
  correct: number;
  total: number;
  counted: boolean;
  late: boolean;
  skills: SkillKind[];
}

export function accuracyOk(correct: number, total: number): boolean {
  if (total < 3) return false;
  return correct / total >= 0.7;
}

export function qualifies(log: SessionLog, minMinutes: number): boolean {
  const mins = log.activeMs / 60000;
  return log.total >= 3 && accuracyOk(log.correct, log.total) && mins + 0.01 >= Math.min(15, minMinutes);
}

export function morningComplete(logs: SessionLog[], minMinutes: number): boolean {
  const parts = logs.filter((l) => l.kind === "morning" && l.counted);
  const active = parts.reduce((s, l) => s + l.activeMs, 0);
  const correct = parts.reduce((s, l) => s + l.correct, 0);
  const total = parts.reduce((s, l) => s + l.total, 0);
  return active / 60000 >= minMinutes && accuracyOk(correct, Math.max(total, 3));
}

export function sessionComplete(logs: SessionLog[], planned: PlannedSession): boolean {
  const parts = logs.filter((l) => l.sessionId === planned.id && l.counted);
  if (planned.kind === "morning") return morningComplete(parts.length ? parts : logs.filter((l) => l.kind === "morning" && l.date === planned.date && l.counted), planned.minMinutes);
  const active = parts.reduce((s, l) => s + l.activeMs, 0);
  const correct = parts.reduce((s, l) => s + l.correct, 0);
  const total = parts.reduce((s, l) => s + l.total, 0);
  return active / 60000 >= planned.minMinutes && (total === 0 ? false : accuracyOk(correct, total));
}

/** A required day is fulfilled if every required session is done or has an open (not expired) or completed makeup. */
export function requiredSessions(date: Date, settings: Settings): PlannedSession[] {
  return sessionsOn(date, settings).filter((s) => s.required);
}

export function isOffDay(date: Date, settings: Settings): boolean {
  return requiredSessions(date, settings).length === 0;
}

export interface Penalty {
  id: string;
  type: "late" | "missed" | "wordTwice";
  createdAt: number;
  dueChars: string[];
  copies: number;
  done: boolean;
  extraReview: number;
  note: string;
  /** Lý do cụ thể, ví dụ "Bỏ ca tối 14/11". */
  reason?: string;
  sessionId?: string;
  /** Số lần đã viết trong app cho từng chữ. */
  written?: Record<string, number>;
  proof?: { kind: "app" | "upload"; at: number; name?: string; thumb?: string };
}

let penSeq = 0;
export function penaltyId(prefix: string): string {
  penSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${penSeq}-${Math.random().toString(36).slice(2, 7)}`;
}

export function latePenalty(n = 5): Penalty {
  return {
    id: penaltyId("late"),
    type: "late",
    createdAt: Date.now(),
    dueChars: [],
    copies: 0,
    done: true,
    extraReview: n,
    note: `Vào trễ hơn 30 phút: thêm ${n} thẻ ôn hôm nay.`,
  };
}

export function missedPenalty(chars: string[], reason?: string, sessionId?: string): Penalty {
  return {
    id: penaltyId("miss"),
    reason,
    sessionId,
    type: "missed",
    createdAt: Date.now(),
    dueChars: chars,
    copies: 5,
    done: false,
    extraReview: 0,
    note: `Chép ${chars.length} chữ, mỗi chữ 5 lần.`,
  };
}

export function twicePenalty(charWord: string): Penalty {
  return {
    id: penaltyId("twice"),
    reason: `Trả lời sai từ ${charWord} hai lần trong một ngày`,
    type: "wordTwice",
    createdAt: Date.now(),
    dueChars: [charWord],
    copies: 5,
    done: false,
    extraReview: 0,
    note: `Chép từ ${charWord} 5 lần.`,
  };
}
