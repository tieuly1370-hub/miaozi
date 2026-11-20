/** Các trình độ trong lộ trình. Thêm HSK 3… = thêm một phần tử (id, title, from–to hoặc coming). Không đổi số bài / tiến độ. */
import { LESSON_COUNT } from "./lessons.ts";

export type Level = { id: string; title: string; from?: number; to?: number; coming?: boolean };

export const LEVELS: Level[] = [
  { id: "hsk1", title: "HSK 1", from: 1, to: LESSON_COUNT },
  { id: "hsk2", title: "HSK 2", coming: true },
];

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
