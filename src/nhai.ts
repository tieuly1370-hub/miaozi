/** Nhai HSK (https://nhaihsk.com) — nguồn nội dung học. Lò Hán chỉ dẫn link, không chép nội dung. */
import { getState } from "./store";

export const NHAI = {
  home: "https://nhaihsk.com/",
  vocab: "https://nhaihsk.com/course/hsk1?skill=vocab",
  grammar: "https://nhaihsk.com/course/hsk1?skill=grammar",
  course: "https://nhaihsk.com/course/hsk1",
  pinyin: "https://nhaihsk.com/pinyin",
  radicals: "https://nhaihsk.com/radicals",
  soundRules: "https://nhaihsk.com/sound-rules",
  dictionary: "https://nhaihsk.com/dictionary",
  hanzi: "https://nhaihsk.com/hanzi",
  shadowing: "https://nhaihsk.com/shadowing",
  reading: "https://nhaihsk.com/reading",
  review: "https://nhaihsk.com/review",
  createFile: "https://nhaihsk.com/create-file",
  exam: "https://nhaihsk.com/certificate-test",
} as const;

/** Link bài Nhai chủ đã ghim cho bài n (nếu có), không thì về danh sách từ vựng HSK1. */
export function nhaiUnitLink(n: number, kind: "vocab" | "grammar" = "vocab"): string {
  const pinned = getState().settings.nhaiUnit?.[`${n}:${kind}`];
  if (pinned && isNhaiUrl(pinned)) return pinned;
  return kind === "vocab" ? NHAI.vocab : NHAI.grammar;
}

export function isNhaiUrl(u: string): boolean {
  return /^https:\/\/(www\.)?nhaihsk\.com\//.test(u.trim());
}
