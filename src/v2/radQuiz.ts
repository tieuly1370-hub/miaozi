/** Sinh câu trắc nghiệm ôn bộ thủ: chỉ hỏi chữ HSK1 có bộ thủ nằm bên trong (không hỏi chữ = bộ), đáp án nhiễu không phải mảnh của chữ đó. */
import { RADICALS, type Radical } from "../data/radicals.ts";
import { HANZI_COMPS, HANZI_PY } from "../data/hanziComps.ts";
import { ALL_WORDS } from "../data/curriculum.ts";
import { HANZI_INFO } from "../data/hanziInfo.ts";

export type RadQ = { kind: "meaning" | "which" | "find"; r: Radical; prompt: string; show: string; hint?: string; opts: string[]; ans: string };

export const shuffle = <T,>(a: T[], rand: () => number = Math.random): T[] => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
};

export const formsOf = (r: Radical): string[] => [r.k, r.f, ...r.v].filter((x, i, a) => a.indexOf(x) === i);
export const face = (r: Radical) => [r.f, ...r.v.filter((v) => v !== r.f)].join(" ");
export const isSelfChar = (c: string, r: Radical) => formsOf(r).includes(c);
export const hostChars = (r: Radical) => r.ex.filter((c) => !isSelfChar(c, r));
export const compsOf = (c: string) => new Set(HANZI_COMPS[c] || "");
export const radicalInChar = (r: Radical, c: string) => isSelfChar(c, r) || formsOf(r).some((f) => compsOf(c).has(f));

/** Nhóm nghĩa gần nhau — không để chung một câu hỏi nghĩa. */
const GROUP: Record<string, string> = {
  辵: "move", 彳: "move", 走: "move",
  水: "water", 雨: "water", 冫: "water",
  木: "plant", 艸: "plant", 竹: "plant",
  手: "hand", 又: "hand",
  见: "see", 目: "see",
  宀: "house", 广: "house", 门: "house",
  人: "person", 儿: "person",
  土: "earth", 阜: "earth",
};
const STOP = new Set(["cái"]);
const viWords = (s: string) => s.toLowerCase().split(/[,;，、/ ]+/).map((x) => x.trim()).filter((x) => x.length >= 2 && !STOP.has(x));
export function meaningClash(a: Radical, b: Radical): boolean {
  if (a.vi === b.vi) return true;
  if (GROUP[a.k] && GROUP[a.k] === GROUP[b.k]) return true;
  const A = new Set(viWords(a.vi));
  return viWords(b.vi).some((w) => A.has(w));
}

function lessonRank(c: string): number {
  let best = 900;
  for (const w of ALL_WORDS) {
    if (w.hanzi === c) return w.lesson;
    if (w.hanzi.includes(c)) best = Math.min(best, w.lesson + 50);
  }
  return best;
}
export function pickHost(r: Radical, rand: () => number = Math.random): string | undefined {
  const hs = hostChars(r);
  if (!hs.length) return;
  const ranked = [...hs].sort((a, b) => lessonRank(a) - lessonRank(b) || a.localeCompare(b));
  const top = ranked.slice(0, Math.max(2, Math.ceil(ranked.length / 2)));
  return top[Math.floor(rand() * top.length)];
}

export function meaningOf(c: string): string {
  const w = ALL_WORDS.find((x) => x.hanzi === c);
  if (w) return w.vi;
  const note = HANZI_INFO[c]?.note || "";
  const m = note.split("—");
  return m.length > 1 ? m[m.length - 1].replace(/[.。]\s*$/, "").trim() : "";
}

export function pickDistractorRads(r: Radical, c: string | undefined, kind: RadQ["kind"], rand: () => number = Math.random): Radical[] {
  let pool = RADICALS.filter((x) => x.k !== r.k);
  if (kind === "meaning") {
    const out: Radical[] = [];
    for (const x of shuffle(pool.filter((x) => !meaningClash(r, x)), rand)) {
      if (out.length >= 3) break;
      if (out.some((y) => meaningClash(x, y))) continue;
      out.push(x);
    }
    return out;
  }
  if ((kind === "which" || kind === "find") && c) pool = pool.filter((x) => !radicalInChar(x, c));
  return shuffle(pool, rand).slice(0, 3);
}

export function pickDistractorChars(r: Radical, rand: () => number = Math.random): string[] {
  const out: string[] = [];
  for (const x of shuffle(RADICALS.filter((x) => x.k !== r.k), rand)) {
    if (out.length >= 3) break;
    const cs = hostChars(x).filter((c) => !radicalInChar(r, c) && !out.includes(c));
    if (!cs.length) continue;
    const ranked = [...cs].sort((a, b) => lessonRank(a) - lessonRank(b));
    const top = ranked.slice(0, Math.max(1, Math.ceil(ranked.length / 2)));
    out.push(top[Math.floor(rand() * top.length)]);
  }
  return out;
}

function makeOne(kind: RadQ["kind"], r: Radical, rand: () => number): RadQ | null {
  if (kind === "meaning") {
    const others = pickDistractorRads(r, undefined, "meaning", rand);
    if (others.length < 3) return null;
    const hints = [...hostChars(r)].sort((a, b) => lessonRank(a) - lessonRank(b)).slice(0, 2);
    const hint = hints.length ? "vd. " + hints.map((c) => (HANZI_PY[c] ? `${c} ${HANZI_PY[c]}` : c)).join(", ") : undefined;
    return { kind, r, prompt: "Bộ này nghĩa là gì?", show: face(r), hint, opts: shuffle([r, ...others].map((x) => x.vi), rand), ans: r.vi };
  }
  if (kind === "which") {
    const c = pickHost(r, rand);
    if (!c) return null;
    const others = pickDistractorRads(r, c, "which", rand);
    if (others.length < 3) return null;
    const hint = [HANZI_PY[c] || "", meaningOf(c)].filter(Boolean).join(" — ");
    return { kind, r, prompt: `Chữ ${c} thuộc bộ nào?`, show: c, hint, opts: shuffle([r, ...others].map((x) => x.f), rand), ans: r.f };
  }
  const c = pickHost(r, rand);
  if (!c) return null;
  const dchars = pickDistractorChars(r, rand);
  if (dchars.length < 3) return null;
  return { kind, r, prompt: `Chữ nào có bộ ${r.f} (${r.hv})?`, show: r.f, opts: shuffle([c, ...dchars], rand), ans: c };
}

export function makeQuiz(n = 10, rand: () => number = Math.random): RadQ[] {
  const out: RadQ[] = [];
  const kinds: RadQ["kind"][] = ["meaning", "which", "find"];
  for (const r of shuffle(RADICALS, rand)) {
    if (out.length >= n) break;
    const q = makeOne(kinds[out.length % 3], r, rand);
    if (q) out.push(q);
  }
  if (out.length < n) {
    for (const r of shuffle(RADICALS, rand)) {
      if (out.length >= n) break;
      for (const kind of kinds) {
        const q = makeOne(kind, r, rand);
        if (q) { out.push(q); break; }
      }
    }
  }
  return out;
}
