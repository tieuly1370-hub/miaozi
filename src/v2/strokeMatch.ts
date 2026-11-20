/** Chấm nét khoan dung: đúng loại nét (ngang, sổ, phẩy, mác, chấm…) theo đúng thứ tự thì tính đạt, lệch vị trí/hình một chút cũng được. */
export type StrokeKind = "heng" | "shu" | "pie" | "na" | "dian" | "ti" | "gou" | "zhe";
export type Pt = { x: number; y: number };

export const KIND_VI: Record<StrokeKind, string> = {
  heng: "ngang", shu: "sổ", pie: "phẩy", na: "mác", dian: "chấm", ti: "háy", gou: "móc", zhe: "gập",
};

/** Tùy chọn hanzi-writer: leniency > 1 = châm chước hơn (mặc định thư viện là 1). */
export const WRITE_QUIZ_BASE = {
  leniency: 2.6,
  acceptBackwardsStrokes: false as const,
  averageDistanceThreshold: 450,
};

function len(pts: Pt[]): number {
  let n = 0;
  for (let i = 1; i < pts.length; i++) n += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return n;
}

function corners(pts: Pt[]): number {
  if (pts.length < 3) return 0;
  let n = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const ax = pts[i].x - pts[i - 1].x, ay = pts[i].y - pts[i - 1].y;
    const bx = pts[i + 1].x - pts[i].x, by = pts[i + 1].y - pts[i].y;
    const da = Math.hypot(ax, ay), db = Math.hypot(bx, by);
    if (da < 8 || db < 8) continue;
    const dot = (ax * bx + ay * by) / (da * db);
    if (dot < 0.25) n += 1; // rẽ >= ~75°
  }
  return n;
}

/** Phân loại nét từ đường trung bình (toạ độ chữ, y hướng lên như Make Me a Hanzi) hoặc nét vừa viết. */
export function strokeKind(pts: Pt[]): StrokeKind {
  if (pts.length < 2) return "dian";
  const start = pts[0], end = pts[pts.length - 1];
  const dx = end.x - start.x, dy = end.y - start.y;
  const dist = Math.hypot(dx, dy);
  const path = len(pts);
  const turns = corners(pts);
  // Chấm: nét rất ngắn
  if (path < 90 && dist < 80) return "dian";
  // Gập / móc: có góc gãy
  if (turns >= 2) return "zhe";
  if (turns === 1) {
    // móc: đoạn cuối ngắn, đổi hướng; gập: hai cạnh dài hơn
    const mid = Math.max(1, Math.floor(pts.length * 0.7));
    const tail = len(pts.slice(mid));
    if (tail < path * 0.28) return "gou";
    return "zhe";
  }
  const ang = Math.atan2(dy, dx); // y lên: 0 = sang phải, π/2 = lên
  const a = Math.abs(ang);
  if (a < 0.4 || a > Math.PI - 0.4) return "heng"; // ngang
  if (Math.abs(a - Math.PI / 2) < 0.4 || Math.abs(a + Math.PI / 2) < 0.4) return "shu"; // sổ (y-up: xuống là −π/2)
  if (ang < 0 && ang > -Math.PI + 0.2) {
    // xuống (y giảm trong hệ y-up)
    return dx < 0 ? "pie" : "na";
  }
  // lên: háy (móc lên sang phải) hoặc phẩy ngược
  return dx >= 0 ? "ti" : "pie";
}

export function kindsMatch(expected: StrokeKind, got: StrokeKind): boolean {
  if (expected === got) return true;
  const soft = (a: StrokeKind, b: StrokeKind) =>
    (a === "dian" && (b === "na" || b === "pie" || b === "ti" || b === "heng")) ||
    (a === "gou" && (b === "shu" || b === "heng" || b === "zhe")) ||
    (a === "zhe" && b === "gou") ||
    (a === "na" && b === "ti") ||
    (a === "ti" && b === "na");
  return soft(expected, got) || soft(got, expected);
}

export function typeAccepts(expected: Pt[], drawn: Pt[]): boolean {
  if (expected.length < 2 || drawn.length < 2) return false;
  return kindsMatch(strokeKind(expected), strokeKind(drawn));
}

export function mediansToPts(medians: number[][][], i: number): Pt[] {
  return (medians[i] || []).map(([x, y]) => ({ x, y }));
}
