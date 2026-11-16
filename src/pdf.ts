import { jsPDF } from "jspdf";

/** Ô mễ (rice-character) practice sheet, optional faint tracing glyphs, or penalty submission. */

export interface SheetOpts {
  title: string;
  subtitle?: string;
  chars: string[];
  rowsPerChar?: number;
  trace?: boolean;
  attempts?: { char: string; images: string[] }[]; // dataURL pngs
  footer?: string;
}

export async function buildPracticePdf(opts: SheetOpts): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const margin = 14;
  doc.setFillColor(255, 248, 236);
  doc.rect(0, 0, W, H, "F");
  doc.setTextColor(58, 47, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(opts.title, margin, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (opts.subtitle) doc.text(opts.subtitle, margin, 22);
  doc.setFontSize(8);
  doc.setTextColor(122, 106, 98);
  doc.text(opts.footer || "Lò Hán — nộp bài / giấy luyện viết", margin, H - 8);
  doc.text(new Date().toLocaleString("vi-VN"), W - margin, H - 8, { align: "right" });

  let y = 28;
  const cell = 16;
  const gap = 2;
  const cols = Math.floor((W - margin * 2 + gap) / (cell + gap));

  if (opts.attempts && opts.attempts.length) {
    for (const att of opts.attempts) {
      if (y > H - 50) { doc.addPage(); y = 18; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(58, 47, 42);
      doc.text(att.char, margin, y + 8);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Chép phạt", margin + 16, y + 6);
      y += 14;
      let x = margin;
      for (const img of att.images) {
        if (x + cell > W - margin) { x = margin; y += cell + gap; }
        if (y + cell > H - 16) { doc.addPage(); y = 18; x = margin; }
        drawRice(doc, x, y, cell);
        try { if (img) doc.addImage(img, "PNG", x, y, cell, cell); } catch { /* empty */ }
        x += cell + gap;
      }
      y += cell + 8;
    }
    return doc.output("blob");
  }

  const rowsPer = opts.rowsPerChar ?? 2;
  for (const ch of opts.chars) {
    const need = 10 + rowsPer * (cell + gap);
    if (y + need > H - 14) { doc.addPage(); y = 18; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(58, 47, 42);
    doc.text(ch, margin, y + 6);
    y += 10;
    for (let r = 0; r < rowsPer; r++) {
      for (let c = 0; c < cols; c++) {
        const x = margin + c * (cell + gap);
        drawRice(doc, x, y, cell);
        if (opts.trace && c === 0) {
          doc.setTextColor(200, 180, 160);
          doc.setFontSize(cell * 1.8);
          doc.text(ch, x + cell / 2, y + cell * 0.78, { align: "center" });
        }
      }
      y += cell + gap;
    }
    y += 4;
  }
  return doc.output("blob");
}

function drawRice(doc: jsPDF, x: number, y: number, s: number) {
  doc.setDrawColor(220, 200, 180);
  doc.setLineWidth(0.3);
  doc.rect(x, y, s, s);
  doc.setDrawColor(236, 220, 200);
  doc.setLineWidth(0.15);
  doc.line(x, y, x + s, y + s);
  doc.line(x + s, y, x, y + s);
  doc.line(x + s / 2, y, x + s / 2, y + s);
  doc.line(x, y + s / 2, x + s, y + s / 2);
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function canvasToPng(cvs: HTMLCanvasElement): string {
  return cvs.toDataURL("image/png");
}
