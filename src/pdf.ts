import { jsPDF } from "jspdf";

/** Giấy luyện viết A4: chữ Hán vẽ từ dữ liệu nét (hanzi-writer), chữ Việt + pinyin bằng font nhúng (tải khi xuất). */

export type GridKind = "tian" | "mi" | "plain";
export interface SheetItem { hanzi: string; pinyin?: string; vi?: string }
export interface SheetOptions {
  title: string;
  subtitle?: string;
  items: SheetItem[];
  grid: GridKind;
  perRow: number;        // ô mỗi hàng
  rowsPerChar: number;   // số hàng cho mỗi chữ
  solidFirst: boolean;   // ô đầu chữ mẫu đậm
  faded: number;         // số ô chữ mờ để tô
  showPinyin: boolean;
  showMeaning: boolean;
  showStrokes: boolean;  // hàng thứ tự nét
  footer?: string;
}
export interface ProofOptions { title: string; subtitle?: string; attempts: { char: string; images: string[] }[] }

type CharData = { strokes: string[] };
let fontsB64: Record<string, string> | null = null;

async function b64(url: string): Promise<string> {
  const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(s);
}

async function newDoc(): Promise<jsPDF> {
  if (!fontsB64) {
    const [r, b, c] = await Promise.all([b64("./fonts/vn-Regular.ttf"), b64("./fonts/vn-Bold.ttf"), b64("./fonts/cjk-sc.ttf")]);
    fontsB64 = { r, b, c };
  }
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.addFileToVFS("vn-Regular.ttf", fontsB64.r);
  doc.addFileToVFS("vn-Bold.ttf", fontsB64.b);
  doc.addFileToVFS("cjk-sc.ttf", fontsB64.c);
  doc.addFont("vn-Regular.ttf", "vn", "normal");
  doc.addFont("vn-Bold.ttf", "vn", "bold");
  doc.addFont("cjk-sc.ttf", "cjk", "normal");
  doc.setFont("vn", "normal");
  return doc;
}

const isHan = (c: string) => /[\u3400-\u9fff\u3000-\u303f\uff00-\uffef]/.test(c);

/** Viết một dòng có lẫn chữ Việt và chữ Hán (đổi font theo từng đoạn). */
function mixedText(doc: jsPDF, text: string, x: number, y: number, size: number, bold = false, align: "left" | "right" = "left") {
  const runs: { han: boolean; t: string }[] = [];
  for (const ch of text) {
    const h = isHan(ch);
    if (runs.length && runs[runs.length - 1].han === h) runs[runs.length - 1].t += ch;
    else runs.push({ han: h, t: ch });
  }
  doc.setFontSize(size);
  const widthOf = (r: { han: boolean; t: string }) => { doc.setFont(r.han ? "cjk" : "vn", r.han ? "normal" : bold ? "bold" : "normal"); return doc.getTextWidth(r.t); };
  const total = runs.reduce((a, r) => a + widthOf(r), 0);
  let cx = align === "right" ? x - total : x;
  for (const r of runs) {
    const w = widthOf(r);
    doc.text(r.t, cx, y);
    cx += w;
  }
  doc.setFont("vn", "normal");
  return total;
}

function drawGrid(doc: jsPDF, kind: GridKind, x: number, y: number, s: number) {
  doc.setDrawColor(196, 160, 140);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([], 0);
  doc.rect(x, y, s, s);
  if (kind === "plain") return;
  doc.setDrawColor(225, 200, 185);
  doc.setLineWidth(0.15);
  doc.setLineDashPattern([0.8, 0.8], 0);
  doc.line(x + s / 2, y, x + s / 2, y + s);
  doc.line(x, y + s / 2, x + s, y + s / 2);
  if (kind === "mi") {
    doc.line(x, y, x + s, y + s);
    doc.line(x + s, y, x, y + s);
  }
  doc.setLineDashPattern([], 0);
}

/** Path SVG của hanzi-writer (hệ 1024, trục y lật, gốc 900) → path jsPDF. */
function strokeOps(path: string, x: number, y: number, s: number) {
  const k = (s * 0.86) / 1024;
  const ox = x + s * 0.07, oy = y + s * 0.07;
  const P = (px: number, py: number) => [ox + px * k, oy + (900 - py) * k];
  const tok = path.match(/[MLQCZ]|-?\d*\.?\d+/g) || [];
  const ops: { op: string; c: number[] }[] = [];
  let i = 0, cmd = "", cur = [0, 0];
  const num = () => Number(tok[i++]);
  while (i < tok.length) {
    if (/[MLQCZ]/.test(tok[i])) cmd = tok[i++];
    if (cmd === "M") { const p = [num(), num()]; cur = p; ops.push({ op: "m", c: P(p[0], p[1]) }); cmd = "L"; }
    else if (cmd === "L") { const p = [num(), num()]; cur = p; ops.push({ op: "l", c: P(p[0], p[1]) }); }
    else if (cmd === "Q") {
      const q = [num(), num()], e = [num(), num()];
      const c1 = [cur[0] + (2 / 3) * (q[0] - cur[0]), cur[1] + (2 / 3) * (q[1] - cur[1])];
      const c2 = [e[0] + (2 / 3) * (q[0] - e[0]), e[1] + (2 / 3) * (q[1] - e[1])];
      ops.push({ op: "c", c: [...P(c1[0], c1[1]), ...P(c2[0], c2[1]), ...P(e[0], e[1])] });
      cur = e;
    } else if (cmd === "C") {
      const a = [num(), num()], b = [num(), num()], e = [num(), num()];
      ops.push({ op: "c", c: [...P(a[0], a[1]), ...P(b[0], b[1]), ...P(e[0], e[1])] });
      cur = e;
    } else if (cmd === "Z") { ops.push({ op: "h", c: [] }); cmd = ""; }
    else i++;
  }
  return ops;
}

function drawChar(doc: jsPDF, data: CharData | null, ch: string, x: number, y: number, s: number, rgb: [number, number, number], upto?: number, highlightLast = false) {
  if (!data) {
    doc.setTextColor(...rgb);
    doc.setFont("cjk", "normal");
    doc.setFontSize((s / 25.4) * 72 * 0.8);
    doc.text(ch, x + s / 2, y + s * 0.8, { align: "center" });
    doc.setFont("vn", "normal");
    return;
  }
  const n = upto ?? data.strokes.length;
  data.strokes.slice(0, n).forEach((p, idx) => {
    const c: [number, number, number] = highlightLast && idx === n - 1 ? [182, 78, 92] : rgb;
    doc.setFillColor(...c);
    doc.path(strokeOps(p, x, y, s));
    doc.fill();
  });
}

async function loadData(ch: string): Promise<CharData | null> {
  try {
    const r = await fetch("./hanzi-data/" + encodeURIComponent(ch) + ".json");
    return r.ok ? ((await r.json()) as CharData) : null;
  } catch { return null; }
}

function header(doc: jsPDF, title: string, subtitle: string | undefined, footer: string, W: number, H: number, m: number) {
  doc.setFillColor(255, 250, 242);
  doc.rect(0, 0, W, H, "F");
  doc.setTextColor(58, 47, 42);
  mixedText(doc, title, m, 15, 15, true);
  if (subtitle) { doc.setTextColor(122, 106, 98); mixedText(doc, subtitle, m, 21, 9.5); }
  doc.setTextColor(150, 135, 125);
  mixedText(doc, footer, m, H - 7, 7.5);
  mixedText(doc, new Date().toLocaleDateString("vi-VN"), W - m, H - 7, 7.5, false, "right");
}

export async function buildSheetPdf(o: SheetOptions): Promise<Blob> {
  const doc = await newDoc();
  const W = 210, H = 297, m = 12;
  const footer = o.footer || "Lò Hán — giấy luyện viết";
  const cell = (W - m * 2) / o.perRow;
  let page = 1;
  header(doc, o.title, o.subtitle, footer + " · trang " + page, W, H, m);
  let y = o.subtitle ? 27 : 22;
  const newPage = () => { doc.addPage(); page++; header(doc, o.title, undefined, footer + " · trang " + page, W, H, m); y = 20; };
  const faint: [number, number, number] = [222, 205, 195];

  for (const it of o.items) {
    const chars = [...it.hanzi].filter((c) => /[\u3400-\u9fff]/.test(c));
    // Dòng tiêu đề của từ
    const labelH = 7;
    const strokeRowH = o.showStrokes ? Math.min(9, cell * 0.6) + 2 : 0;
    const blockH = labelH + chars.length * (strokeRowH + o.rowsPerChar * cell + 2);
    if (y + Math.min(blockH, labelH + strokeRowH + cell * o.rowsPerChar) > H - 12) newPage();
    doc.setTextColor(58, 47, 42);
    let lx = m;
    lx += mixedText(doc, it.hanzi, lx, y + 5, 13) + 3;
    if (o.showPinyin && it.pinyin) { doc.setTextColor(62, 138, 85); lx += mixedText(doc, it.pinyin, lx, y + 5, 10.5) + 3; }
    if (o.showMeaning && it.vi) { doc.setTextColor(122, 106, 98); mixedText(doc, "— " + it.vi, lx, y + 5, 9.5); }
    y += labelH;
    for (const ch of chars) {
      const data = await loadData(ch);
      if (o.showStrokes && data) {
        const ss = Math.min(9, cell * 0.6);
        if (y + ss + 2 + cell > H - 12) newPage();
        const max = Math.floor((W - m * 2) / (ss + 1));
        const n = Math.min(data.strokes.length, max);
        for (let k = 1; k <= n; k++) {
          const sx = m + (k - 1) * (ss + 1);
          doc.setDrawColor(230, 215, 205); doc.setLineWidth(0.1); doc.rect(sx, y, ss, ss);
          drawChar(doc, data, ch, sx, y, ss, [90, 80, 75], k, true);
        }
        y += ss + 2;
      }
      for (let r = 0; r < o.rowsPerChar; r++) {
        if (y + cell > H - 12) newPage();
        for (let c = 0; c < o.perRow; c++) {
          const x = m + c * cell;
          drawGrid(doc, o.grid, x, y, cell);
          if (r === 0) {
            const idx = o.solidFirst ? c - 1 : c;
            if (o.solidFirst && c === 0) drawChar(doc, data, ch, x, y, cell, [58, 47, 42]);
            else if (idx >= 0 && idx < o.faded) drawChar(doc, data, ch, x, y, cell, faint);
          }
        }
        y += cell;
      }
      y += 2;
    }
    y += 3;
  }
  return doc.output("blob");
}

/** Bài chép phạt viết trong app: in các ô đã viết ra PDF để lưu làm bằng. */
export async function buildProofPdf(o: ProofOptions): Promise<Blob> {
  const doc = await newDoc();
  const W = 210, H = 297, m = 12, cell = 22, gap = 2;
  header(doc, o.title, o.subtitle, "Lò Hán — bài chép phạt đã nộp", W, H, m);
  let y = 30;
  for (const att of o.attempts) {
    if (y > H - 50) { doc.addPage(); header(doc, o.title, undefined, "Lò Hán — bài chép phạt đã nộp", W, H, m); y = 22; }
    doc.setTextColor(58, 47, 42);
    mixedText(doc, att.char + "  ·  " + att.images.filter(Boolean).length + " lần", m, y + 5, 12, true);
    y += 9;
    let x = m;
    for (const img of att.images) {
      if (x + cell > W - m) { x = m; y += cell + gap; }
      if (y + cell > H - 14) { doc.addPage(); header(doc, o.title, undefined, "Lò Hán", W, H, m); y = 22; x = m; }
      drawGrid(doc, "mi", x, y, cell);
      try { if (img) doc.addImage(img, "PNG", x, y, cell, cell); } catch { /* bỏ qua */ }
      x += cell + gap;
    }
    y += cell + 8;
  }
  return doc.output("blob");
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}
