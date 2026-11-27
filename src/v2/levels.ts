/** Các trình độ trong lộ trình. Thêm HSK 3… = thêm một phần tử (id, title, from–to hoặc coming). Không đổi số bài / tiến độ. */
import { LESSONS } from "../data/curriculum";

export type Level = { id: string; title: string; from?: number; to?: number; coming?: boolean };

/** Số bài toàn cục: HSK 1 = 1–19, HSK 2 = 20–34 (bài 1–15 của Giáo trình chuẩn HSK 2). HSK 3: thêm dữ liệu rồi đổi coming → from/to. */
export const LEVELS: Level[] = [
  { id: "hsk1", title: "HSK 1", from: 1, to: 19 },
  { id: "hsk2", title: "HSK 2", from: 20, to: 34 },
  { id: "hsk3", title: "HSK 3", coming: true },
];

export function levelOf(n: number): Level { return LEVELS.find((l) => l.from && l.to && n >= l.from && n <= l.to) || LEVELS[0]; }
export function levelLessonIds(l: Level): number[] {
  if (!l.from || !l.to) return [];
  return Array.from({ length: l.to - l.from + 1 }, (_, i) => l.from! + i).filter((n) => n <= LESSONS.length);
}
/** Số bài trong cấp (HSK 2 bài 1 = id 20). */
export function lessonNo(n: number): number { const l = levelOf(n); return n - (l.from || 1) + 1; }
export function lessonLabel(n: number): string { return `${levelOf(n).title} · Bài ${lessonNo(n)}`; }

const LS = "miaozi-level-open";
function readOpen(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(LS) || "{}") || {}; } catch { return {}; }
}
/** Mặc định: xổ nếu trình độ chưa xong. Đã bấm thì nhớ trạng thái. */
export function levelOpen(id: string, finished: boolean): boolean {
  const rec = readOpen();
  if (id in rec) return !!rec[id];
  return !finished;
}
export function setLevelOpen(id: string, open: boolean) {
  const rec = readOpen();
  rec[id] = open;
  try { localStorage.setItem(LS, JSON.stringify(rec)); } catch { /* */ }
}
