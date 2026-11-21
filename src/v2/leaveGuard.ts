/** Cảnh báo khi rời bài/thi đang làm dở — tiến độ trên màn hình sẽ mất. */
import { useEffect, useState } from "preact/hooks";

const busy = new Set<string>();
const subs = new Set<() => void>();
let pending: string | null = null; // hash muốn tới
let allow = false; // cho phép 1 lần chuyển (đã xác nhận)
let lastOk = "";

function emit() { subs.forEach((f) => f()); }

export function setWork(id: string, on: boolean) {
  if (on) busy.add(id); else busy.delete(id);
  emit();
}
export function hasWork(): boolean { return busy.size > 0; }

export function normHash(h: string): string {
  let s = (h || "").replace(/^#/, "") || "/";
  if (!s.startsWith("/")) s = "/" + s;
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s;
}
export function toHash(path: string): string {
  const p = path.startsWith("#") ? path.slice(1) : path;
  return "#" + (p.startsWith("/") ? p : "/" + p);
}

export function pendingLeave(): string | null { return pending; }
export function subscribeLeave(f: () => void): () => void { subs.add(f); return () => { subs.delete(f); }; }

export function useLeaveGuard() {
  const [, bump] = useState(0);
  useEffect(() => subscribeLeave(() => bump((n) => n + 1)), []);
  return { busy: hasWork(), pending };
}

export function markHash(h: string) { lastOk = toHash(normHash(h)); }

/** true = đi ngay; false = đang hỏi, chưa đổi trang. */
export function requestLeave(path: string): boolean {
  const dest = toHash(normHash(path));
  const cur = toHash(normHash(location.hash || lastOk || "/"));
  if (dest === cur) return true;
  if (!hasWork() || allow) { allow = false; return true; }
  pending = dest;
  emit();
  return false;
}

export function stayHere() {
  pending = null;
  emit();
}

export function leaveNow() {
  const dest = pending;
  pending = null;
  if (!dest) { emit(); return; }
  busy.clear();
  allow = true;
  emit();
  location.hash = dest;
}

/** Chặn hashchange (nút back / gán hash trực tiếp): hoàn tác ngay, hỏi trước khi rời. */
export function onHashChanging(): boolean {
  const next = toHash(normHash(location.hash || "/"));
  const cur = lastOk || toHash(normHash("/"));
  if (allow || !hasWork() || next === cur) {
    allow = false;
    lastOk = next;
    return false; // không giữ, cho phép đổi trang
  }
  pending = next;
  history.replaceState(null, "", location.pathname + location.search + cur);
  emit();
  return true; // đã hoàn tác, đừng cập nhật route
}
