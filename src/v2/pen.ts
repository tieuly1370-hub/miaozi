import { useEffect, useRef } from "preact/hooks";
/** Nét bút máy (fountain pen): dày mỏng theo lực bút + tốc độ, hai đầu vuốt nhọn. Dùng chung cho ô viết, ghi chú tay, chép phạt. */
export interface PenPt { x: number; y: number; p: number; t?: number }
export const PEN_DEFAULT = 1.2;
export const PEN_MIN = 0.6, PEN_MAX = 2.4;
/** Bề rộng từng điểm (px) — tách riêng để test được. `base` = độ dày gốc (px) × hệ số người dùng chọn. */
export function penWidths(pts: { x: number; y: number; p: number; t?: number }[], base: number, W = 1, H = 1): number[] {
  const n = pts.length; const out: number[] = []; let prev = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[i];
    const dist = Math.hypot((b.x - a.x) * W, (b.y - a.y) * H);
    const dt = a.t !== undefined && b.t !== undefined ? Math.max(1, b.t - a.t) : 16;
    const v = dist / dt; // px / ms
    const vel = Math.min(1.15, Math.max(0.55, 1.2 - v * 0.18));
    const pr = 0.45 + Math.min(1, Math.max(0, b.p || 0.5)) * 1.0;
    let w = base * pr * vel;
    w = i ? prev * 0.55 + w * 0.45 : w * 0.6; // làm mượt
    prev = w;
    out.push(w);
  }
  const taper = Math.min(4, Math.floor(n / 3));
  for (let i = 0; i < taper; i++) { out[i] *= 0.45 + 0.55 * (i / taper); out[n - 1 - i] *= 0.3 + 0.7 * (i / taper); }
  return out;
}
export function drawPenStroke(ctx: CanvasRenderingContext2D, pts: PenPt[], base: number, color: string, W: number, H: number) {
  if (!pts.length) return;
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (pts.length === 1) { ctx.beginPath(); ctx.arc(pts[0].x * W, pts[0].y * H, base * 0.5, 0, Math.PI * 2); ctx.fill(); return; }
  const w = penWidths(pts, base, W, H);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const m0 = i > 1 ? { x: (pts[i - 2].x + a.x) / 2, y: (pts[i - 2].y + a.y) / 2 } : a;
    const m1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    ctx.lineWidth = Math.max(0.6, (w[i - 1] + w[i]) / 2);
    ctx.beginPath(); ctx.moveTo(m0.x * W, m0.y * H); ctx.quadraticCurveTo(a.x * W, a.y * H, m1.x * W, m1.y * H); ctx.stroke();
  }
  const l = pts[pts.length - 1], k = pts[pts.length - 2];
  ctx.lineWidth = Math.max(0.6, w[w.length - 1]);
  ctx.beginPath(); ctx.moveTo(((k.x + l.x) / 2) * W, ((k.y + l.y) / 2) * H); ctx.lineTo(l.x * W, l.y * H); ctx.stroke();
}
export const penPt = (e: PointerEvent, el: Element): PenPt => {
  const r = el.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, p: e.pressure || 0.5, t: e.timeStamp };
};

/** Mực bút máy đè lên ô hanzi-writer: nghe pointer (không chặn → hanzi-writer vẫn chấm nét). Nét vừa vẽ chờ chấm:
 *  `accept()` khi hanzi-writer báo đúng nét (giữ lại), `reject()` khi sai (xoá), `pop()` cho Hoàn tác, `clear()` khi viết lại. */
export function usePenInk(host: { current: HTMLElement | null }, ink: { current: HTMLCanvasElement | null }, active: boolean, width: number | undefined, deps: unknown[], color = "#2F2430") {
  const kept = useRef<PenPt[][]>([]);
  const pending = useRef<PenPt[] | null>(null);
  const cur = useRef<PenPt[] | null>(null);
  const penW = width ?? PEN_DEFAULT;
  const redraw = () => {
    const c = ink.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    const base = c.width * 0.026 * penW;
    for (const st of kept.current) drawPenStroke(ctx, st, base, color, c.width, c.height);
    if (pending.current) { ctx.globalAlpha = 0.5; drawPenStroke(ctx, pending.current, base, color, c.width, c.height); ctx.globalAlpha = 1; }
    if (cur.current) drawPenStroke(ctx, cur.current, base, color, c.width, c.height);
  };
  useEffect(() => {
    const el = host.current, c = ink.current;
    if (!el || !c || !active) return;
    const fit = () => { const r = el.getBoundingClientRect(); const d = window.devicePixelRatio || 1; c.width = Math.max(1, r.width * d); c.height = Math.max(1, r.height * d); redraw(); };
    fit();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const down = (e: PointerEvent) => { cur.current = [penPt(e, el)]; };
    const move = (e: PointerEvent) => { if (!cur.current) return; for (const ev of (e.getCoalescedEvents?.() || [e])) cur.current.push(penPt(ev, el)); redraw(); };
    const up = () => {
      if (!cur.current) return;
      pending.current = cur.current; cur.current = null; redraw();
      clearTimeout(timer); timer = setTimeout(() => { pending.current = null; redraw(); }, 450);
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { clearTimeout(timer); el.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  }, [active, penW, ...deps]);
  return {
    redraw,
    accept: () => { if (pending.current) { kept.current = [...kept.current, pending.current]; pending.current = null; redraw(); } },
    reject: () => { pending.current = null; redraw(); },
    pop: () => { kept.current = kept.current.slice(0, -1); redraw(); },
    clear: () => { kept.current = []; pending.current = null; cur.current = null; redraw(); },
    dropPending: () => { pending.current = null; },
  };
}
