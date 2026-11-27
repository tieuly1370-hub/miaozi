/**
 * v2.4 — Chấm viết CHẶT (khi Ẩn mẫu và trong Kiểm tra). Viết có mẫu vẫn khoan dung như cũ (strokeMatch.ts).
 * Toạ độ: hệ chữ của Make Me a Hanzi / hanzi-writer (0–1024, y hướng lên) — cả medians lẫn drawnPath.points.
 * 1) Từng nét (ngay khi viết): đầu, cuối, trọng tâm nét phải nằm trong vùng quanh nét mẫu (STRICT.stroke).
 * 2) Cả chữ (khi xong): chuẩn hoá cả chữ (dời + co giãn đều theo khung bao) rồi:
 *    - từng nét: đầu / cuối / trọng tâm lệch ≤ STRICT.final;
 *    - từng thành phần (nhóm nét theo Make Me a Hanzi, vd 哥 = 可 trên + 可 dưới): tâm lệch ≤ STRICT.compCenter,
 *      rộng / cao so với mẫu trong khoảng STRICT.compSize.
 */
export type Pt = { x: number; y: number };

export const STRICT = {
  /** vùng cho phép của từng nét lúc viết (đơn vị 1024) */
  stroke: 230,
  /** sau chuẩn hoá cả chữ */
  final: 175,
  compCenter: 150,
  /** vị trí tương đối giữa hai thành phần (vector tâm–tâm) lệch so với mẫu ≤ compRel */
  compRel: 120,
  compSize: [0.6, 1.65] as [number, number],
};

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Trọng tâm theo độ dài (không phụ thuộc mật độ điểm). */
export function centroid(pts: Pt[]): Pt {
  if (pts.length < 2) return pts[0] || { x: 0, y: 0 };
  let sx = 0, sy = 0, L = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = dist(pts[i - 1], pts[i]);
    sx += ((pts[i - 1].x + pts[i].x) / 2) * l; sy += ((pts[i - 1].y + pts[i].y) / 2) * l; L += l;
  }
  return L > 0 ? { x: sx / L, y: sy / L } : pts[0];
}

export function strokeDev(exp: Pt[], drawn: Pt[]): number {
  if (!exp.length || !drawn.length) return Infinity;
  return Math.max(dist(exp[0], drawn[0]), dist(exp[exp.length - 1], drawn[drawn.length - 1]), dist(centroid(exp), centroid(drawn)));
}

/** Nét vừa viết có nằm trong vùng của nét mẫu không. */
export function strokeZoneOk(exp: Pt[], drawn: Pt[], tol = STRICT.stroke): boolean {
  return strokeDev(exp, drawn) <= tol;
}

type Box = { x0: number; y0: number; x1: number; y1: number };
function bbox(strokes: Pt[][]): Box {
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (const s of strokes) for (const p of s) { b.x0 = Math.min(b.x0, p.x); b.y0 = Math.min(b.y0, p.y); b.x1 = Math.max(b.x1, p.x); b.y1 = Math.max(b.y1, p.y); }
  return b;
}
const cx = (b: Box): Pt => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 });

/** Dời + co giãn đều nét viết cho khớp khung bao của chữ mẫu (viết nhỏ/lệch cả chữ nhưng đúng tỉ lệ vẫn đạt). */
export function normalize(ref: Pt[][], drawn: Pt[][]): Pt[][] {
  const rb = bbox(ref), db = bbox(drawn);
  const rs = Math.max(rb.x1 - rb.x0, rb.y1 - rb.y0, 1), ds = Math.max(db.x1 - db.x0, db.y1 - db.y0, 1);
  const k = rs / ds, rc = cx(rb), dc = cx(db);
  return drawn.map((s) => s.map((p) => ({ x: rc.x + (p.x - dc.x) * k, y: rc.y + (p.y - dc.y) * k })));
}

export interface StrictResult { ok: boolean; badStrokes: number[]; badParts: number[]; reason: string }

/**
 * Chấm cả chữ. `ref` = medians của từng nét, `drawn` = nét đã viết (cùng thứ tự), `groups` = chuỗi nhóm thành phần
 * (vd "0000011111"; 'x' = nét không thuộc thành phần nào) — không có thì chỉ chấm từng nét.
 */
export function gradeStrict(ref: Pt[][], drawn: Pt[][], groups?: string): StrictResult {
  const n = Math.min(ref.length, drawn.length);
  if (!n || drawn.length < ref.length) return { ok: false, badStrokes: [], badParts: [], reason: "Thiếu nét." };
  const R = ref.slice(0, n), D = normalize(R, drawn.slice(0, n));
  const badStrokes: number[] = [];
  for (let i = 0; i < n; i++) if (strokeDev(R[i], D[i]) > STRICT.final) badStrokes.push(i);
  const badParts: number[] = [];
  if (groups && groups.length === ref.length) {
    const ids = [...new Set(groups.split("").filter((g) => g !== "x"))];
    if (ids.length >= 2) {
      const centers: Pt[] = [], rcenters: Pt[] = [];
      ids.forEach((g, gi) => {
        const idx = [...groups].map((c, i) => (c === g ? i : -1)).filter((i) => i >= 0 && i < n);
        const rb = bbox(idx.map((i) => R[i])), db = bbox(idx.map((i) => D[i]));
        const rw = Math.max(rb.x1 - rb.x0, 80), rh = Math.max(rb.y1 - rb.y0, 80);
        const dw = Math.max(db.x1 - db.x0, 80), dh = Math.max(db.y1 - db.y0, 80);
        const [lo, hi] = STRICT.compSize;
        const off = dist(cx(rb), cx(db)) > STRICT.compCenter;
        const size = dw / rw < lo || dw / rw > hi || dh / rh < lo || dh / rh > hi;
        rcenters[gi] = cx(rb); centers[gi] = cx(db);
        if (off || size) badParts.push(gi);
      });
      // vị trí tương đối giữa các thành phần (chuẩn hoá theo khung cả chữ chia đều sai lệch cho hai bên → kiểm tra cặp)
      for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
        const rv = { x: rcenters[b].x - rcenters[a].x, y: rcenters[b].y - rcenters[a].y };
        const dv = { x: centers[b].x - centers[a].x, y: centers[b].y - centers[a].y };
        if (dist(rv, dv) > STRICT.compRel) { if (!badParts.includes(a)) badParts.push(a); if (!badParts.includes(b)) badParts.push(b); }
      }
    }
  }
  // cho lệch tối đa 1 nét nhỏ nếu các thành phần vẫn đúng chỗ, đúng tỉ lệ
  const ok = badParts.length === 0 && badStrokes.length <= (n >= 6 ? 1 : 0);
  const reason = ok ? "" : badParts.length ? "Các phần của chữ lệch vị trí hoặc sai tỉ lệ." : `Có ${badStrokes.length} nét lệch chỗ.`;
  return { ok, badStrokes, badParts, reason };
}
