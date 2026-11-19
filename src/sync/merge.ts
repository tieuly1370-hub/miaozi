/**
 * v2.1 — Gộp dữ liệu 2 máy (thuần, có unit test). Không có máy chủ: mỗi máy tải file trên Drive, gộp với bản trên máy rồi ghi lại.
 * Quy tắc: từng bản ghi — bản mới hơn thắng; chuỗi ngày / lịch sử — hợp lại (union); đã xong thì giữ xong.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type O = Record<string, any>;
export interface SyncDoc { app: "miaozi"; v: 1; at: number; data: O }

const isObj = (x: unknown): x is O => !!x && typeof x === "object" && !Array.isArray(x);
const uniq = <T,>(a: T[]) => [...new Set(a)];
function unionBy<T>(a: T[] = [], b: T[] = [], key: (x: T) => string, pick: (x: T, y: T) => T = (x) => x): T[] {
  const m = new Map<string, T>();
  for (const x of a) m.set(key(x), x);
  for (const y of b) { const k = key(y); const x = m.get(k); m.set(k, x ? pick(x, y) : y); }
  return [...m.values()];
}
function recMerge(a: O = {}, b: O = {}, f: (x: any, y: any, k: string) => any): O {
  const out: O = { ...a };
  for (const [k, y] of Object.entries(b)) out[k] = k in a ? f(a[k], y, k) : y;
  return out;
}
/** Gộp sâu "OR": mảng → hợp, boolean → OR, số → max, object → đệ quy; còn lại ưu tiên bản mới (newer). */
export function deepOr(x: any, y: any, newerIsY: boolean): any {
  if (Array.isArray(x) && Array.isArray(y)) {
    if (x.every((v) => typeof v !== "object") && y.every((v) => typeof v !== "object")) return uniq([...x, ...y]);
    return newerIsY ? y : x;
  }
  if (typeof x === "boolean" || typeof y === "boolean") return !!x || !!y;
  if (typeof x === "number" && typeof y === "number") return Math.max(x, y);
  if (isObj(x) && isObj(y)) {
    if ("at" in x && "at" in y && typeof x.at === "number") return (y.at > x.at ? y : x);
    return recMerge(x, y, (a, b) => deepOr(a, b, newerIsY));
  }
  if (x === undefined || x === null) return y;
  if (y === undefined || y === null) return x;
  return newerIsY ? y : x;
}

export function mergeV2(a: O = {}, b: O = {}, newerIsB: boolean): O {
  const n = (x: O, y: O) => (newerIsB ? y : x);
  const out: O = { ...n(a, b) };
  out.lesson = Math.max(a.lesson || 1, b.lesson || 1);
  // mục: xong thắng; nợ giữ nếu chưa xong
  out.sec = recMerge(a.sec, b.sec, (x: O, y: O) => recMerge(x, y, (r1: O, r2: O) => {
    const done = r1?.done || r2?.done;
    const r = { ...(n(r1, r2) || {}) };
    if (done) { r.done = true; r.at = Math.min(r1?.at ?? Infinity, r2?.at ?? Infinity); if (!isFinite(r.at)) delete r.at; delete r.owed; }
    return r;
  }));
  out.sub = recMerge(a.sub, b.sub, (x, y) => deepOr(x, y, newerIsB));
  out.days = recMerge(a.days, b.days, (x: O, y: O) => ({
    modes: uniq([...(x.modes || []), ...(y.modes || [])]), ms: Math.max(x.ms || 0, y.ms || 0),
    secs: uniq([...(x.secs || []), ...(y.secs || [])]), tests: uniq([...(x.tests || []), ...(y.tests || [])]), note: n(x, y).note ?? x.note ?? y.note,
  }));
  out.modeByDay = { ...(newerIsB ? a.modeByDay : b.modeByDay), ...(newerIsB ? b.modeByDay : a.modeByDay) };
  out.busy = uniq([...(a.busy || []), ...(b.busy || [])]).sort();
  out.offApplied = { ...(a.offApplied || {}), ...(b.offApplied || {}) };
  out.owedPenalized = { ...(a.owedPenalized || {}), ...(b.owedPenalized || {}) };
  out.report = recMerge(a.report, b.report, (x, y) => deepOr(x, y, newerIsB));
  out.tests = recMerge(a.tests, b.tests, (x: O, y: O) => ({ ...n(x, y), pass: !!(x.pass || y.pass), score: Math.max(x.score || 0, y.score || 0), tries: Math.max(x.tries || 0, y.tries || 0) }));
  const la = a.low || {}, lb = b.low || {};
  out.low = la.week === lb.week ? { ...la, days: uniq([...(la.days || []), ...(lb.days || [])]) } : ((la.week || "") > (lb.week || "") ? la : lb);
  out.skillLog = unionBy(a.skillLog, b.skillLog, (l: O) => `${l.at}|${l.source}|${l.skill}`).sort((p: O, q: O) => p.at - q.at).slice(-600);
  if (a.legacy || b.legacy) out.legacy = (a.legacy?.count || 0) >= (b.legacy?.count || 0) ? a.legacy : b.legacy;
  out.write = n(a.write || {}, b.write || {}) && { ...n(a.write || {}, b.write || {}), done: { ...(a.write?.done || {}), ...(b.write?.done || {}) } };
  out.retry = {};
  return out;
}

export function mergeData(a: O, b: O, aAt: number, bAt: number): O {
  const newerIsB = bAt > aAt;
  const n = (x: any, y: any) => (newerIsB ? (y ?? x) : (x ?? y));
  const out: O = {};
  out.settings = n(a.settings, b.settings);
  out.progress = n(a.progress, b.progress);
  out.onboarded = !!(a.onboarded || b.onboarded);
  const sa = a.streak || {}, sb = b.streak || {};
  out.streak = { ...n(sa, sb), count: Math.max(sa.count || 0, sb.count || 0), best: Math.max(sa.best || 0, sb.best || 0) };
  out.srs = recMerge(a.srs, b.srs, (x: O, y: O) => ((y.last || 0) > (x.last || 0) ? y : (y.last || 0) < (x.last || 0) ? x : (y.reps || 0) > (x.reps || 0) ? y : x));
  out.mistakes = unionBy(a.mistakes, b.mistakes, (m: O) => m.id, (x: O, y: O) => ({ ...(y.at > x.at ? y : x), times: Math.max(x.times || 0, y.times || 0) }));
  out.sessions = unionBy(a.sessions, b.sessions, (s: O) => s.id || JSON.stringify(s)).slice(-400);
  out.notes = recMerge(a.notes, b.notes, (x: O, y: O) => ((y.updatedAt || 0) > (x.updatedAt || 0) ? y : x));
  out.penalties = unionBy(a.penalties, b.penalties, (p: O) => p.id, (x: O, y: O) => {
    const written: O = { ...(x.written || {}) };
    for (const [k, v] of Object.entries(y.written || {})) written[k] = Math.max(written[k] || 0, v as number);
    return { ...x, ...y, done: !!(x.done || y.done), written, proof: x.proof || y.proof };
  });
  out.v2 = mergeV2(a.v2, b.v2, newerIsB);
  return out;
}

export function mergeDocs(local: SyncDoc, remote: SyncDoc | null): SyncDoc {
  if (!remote || remote.app !== "miaozi") return local;
  return { app: "miaozi", v: 1, at: Math.max(local.at, remote.at), data: mergeData(local.data, remote.data, local.at, remote.at) };
}
