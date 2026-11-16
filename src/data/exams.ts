import { ALL_WORDS, ALL_SENTENCES, LESSONS, type Word, type Sentence } from "./curriculum";

export type QKind = "listen-choice" | "listen-tf" | "listen-tone" | "read-meaning" | "read-tf" | "recog" | "write";

export interface Question {
  id: string;
  kind: QKind;
  prompt: string;
  hanzi?: string;
  audioId?: string;
  options: { id: string; text: string; hanzi?: string }[];
  answer: string;
  explain?: string;
  noPinyin: boolean;
}

function mulberry(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[], n: number, rnd: () => number, ok?: (t: T) => boolean): T[] {
  const pool = shuffle(ok ? arr.filter(ok) : arr, rnd);
  return pool.slice(0, n);
}

function distractors(word: Word, all: Word[], n: number, rnd: () => number): Word[] {
  return pick(all, n, rnd, (w) => w.id !== word.id && w.hanzi !== word.hanzi);
}

export function lessonTest(lesson: number, seed = lesson * 99): Question[] {
  const rnd = mulberry(seed);
  const words = LESSONS.find((l) => l.id === lesson)!.words;
  const prev = ALL_WORDS.filter((w) => w.lesson <= lesson);
  const sents = ALL_SENTENCES.filter((s) => s.lesson === lesson);
  const qs: Question[] = [];
  let i = 0;
  // 4 listening: audio -> hanzi
  for (const w of pick(words, Math.min(4, words.length), rnd)) {
    const d = distractors(w, prev, 3, rnd);
    const opts = shuffle([w, ...d], rnd).map((x) => ({ id: x.id, text: x.hanzi, hanzi: x.hanzi }));
    qs.push({
      id: `l${lesson}-q${++i}`,
      kind: "listen-choice",
      prompt: "Nghe và chọn chữ đúng (không có pinyin).",
      audioId: w.id,
      hanzi: w.hanzi,
      options: opts,
      answer: w.id,
      noPinyin: true,
    });
  }
  // 2 tone
  for (const w of pick(words.filter((w) => w.pinyinNum.replace(/[5]/g, "").length > 0), 2, rnd)) {
    const tones = ["1", "2", "3", "4"];
    const first = w.pinyinNum.trim().split(/\s+/)[0];
    const t = (first.match(/[1-5]/) || ["1"])[0];
    qs.push({
      id: `l${lesson}-q${++i}`,
      kind: "listen-tone",
      prompt: `Nghe từ ${w.hanzi} — thanh điệu của âm tiết đầu là?`,
      audioId: w.id,
      hanzi: w.hanzi,
      options: tones.map((x) => ({ id: x, text: "Thanh " + x })),
      answer: t === "5" ? "1" : t,
      noPinyin: true,
    });
  }
  // 4 recognize hanzi -> meaning, NO pinyin (gating section)
  for (const w of pick(words, Math.min(6, words.length), rnd)) {
    const d = distractors(w, prev, 3, rnd);
    const opts = shuffle([w, ...d], rnd).map((x) => ({ id: x.id, text: x.vi }));
    qs.push({
      id: `l${lesson}-q${++i}`,
      kind: "recog",
      prompt: "Chữ này nghĩa là gì? (không hiện pinyin)",
      hanzi: w.hanzi,
      options: opts,
      answer: w.id,
      noPinyin: true,
    });
  }
  // 3 reading sentences
  for (const s of pick(sents, Math.min(3, sents.length), rnd)) {
    const others = pick(ALL_SENTENCES.filter((x) => x.id !== s.id && x.lesson <= lesson), 3, rnd);
    const opts = shuffle([s, ...others], rnd).map((x) => ({ id: x.id, text: x.vi }));
    qs.push({
      id: `l${lesson}-q${++i}`,
      kind: "read-meaning",
      prompt: "Câu này nghĩa là gì?",
      hanzi: s.hanzi,
      options: opts,
      answer: s.id,
      noPinyin: true,
    });
  }
  // 2 write (character id)
  for (const w of pick(words.filter((w) => w.hanzi.length === 1), Math.min(2, words.length), rnd)) {
    qs.push({
      id: `l${lesson}-q${++i}`,
      kind: "write",
      prompt: `Viết chữ: ${w.vi}`,
      hanzi: w.hanzi,
      options: [{ id: w.hanzi, text: w.hanzi }],
      answer: w.hanzi,
      noPinyin: true,
    });
  }
  return qs;
}

export function week0Test(seed = 7): Question[] {
  const rnd = mulberry(seed);
  const qs: Question[] = [];
  const tones = [
    { id: "1", text: "Thanh 1 — bằng cao" },
    { id: "2", text: "Thanh 2 — bah lên" },
    { id: "3", text: "Thanh 3 — ngã" },
    { id: "4", text: "Thanh 4 — đổ xuống" },
  ];
  const drills = [
    { audioId: "tone-1", ans: "1", hanzi: "妈" },
    { audioId: "tone-2", ans: "2", hanzi: "麻" },
    { audioId: "tone-3", ans: "3", hanzi: "马" },
    { audioId: "tone-4", ans: "4", hanzi: "骂" },
  ];
  let i = 0;
  for (const d of drills) {
    qs.push({
      id: `w0-${++i}`,
      kind: "listen-tone",
      prompt: "Nghe và chọn thanh điệu (không nhìn pinyin).",
      audioId: d.audioId,
      hanzi: d.hanzi,
      options: tones,
      answer: d.ans,
      noPinyin: true,
    });
  }
  const radicals = [
    { ch: "氵", vi: "nước (ba chấm)" },
    { ch: "亻", vi: "người (bên trái)" },
    { ch: "讠", vi: "lời nói" },
    { ch: "口", vi: "miệng" },
    { ch: "木", vi: "cây, gỗ" },
    { ch: "心", vi: "tim, lòng" },
  ];
  for (const r of radicals) {
    const d = pick(radicals, 3, rnd, (x) => x.ch !== r.ch);
    qs.push({
      id: `w0-${++i}`,
      kind: "recog",
      prompt: "Bộ thủ này nghĩa / tên là gì?",
      hanzi: r.ch,
      options: shuffle([r, ...d], rnd).map((x) => ({ id: x.ch, text: x.vi })),
      answer: r.ch,
      noPinyin: true,
    });
  }
  const strokes = [
    { q: "Nét từ trái sang phải, hơi nâng cuối nét, gọi là?", a: "Nét ngang (横)" },
    { q: "Nét từ trên xuống thẳng gọi là?", a: "Nét sổ (竖)" },
    { q: "Quy tắc: viết phần nào trước?", a: "Trên trước, dưới sau" },
    { q: "Khi viết chữ 十, nét nào viết trước?", a: "Nét ngang trước, sổ sau" },
  ];
  const wrongs = ["Nét mác (捺)", "Nét phẩy (撇)", "Dưới trước, trên sau", "Sổ trước, ngang sau", "Nét chấm"];
  for (const s of strokes) {
    const opts = shuffle([s.a, ...pick(wrongs.filter((w) => w !== s.a), 3, rnd)], rnd);
    qs.push({
      id: `w0-${++i}`,
      kind: "recog",
      prompt: s.q,
      options: opts.map((t) => ({ id: t, text: t })),
      answer: s.a,
      noPinyin: true,
    });
  }
  return qs;
}

export function mockExam(which: 1 | 2): { listening: Question[]; reading: Question[] } {
  const rnd = mulberry(which * 2026 + 15);
  const words = ALL_WORDS;
  const sents = ALL_SENTENCES;
  const listening: Question[] = [];
  let i = 0;
  for (const w of pick(words, 8, rnd)) {
    const d = distractors(w, words, 3, rnd);
    listening.push({
      id: `m${which}-l${++i}`,
      kind: "listen-choice",
      prompt: "Nghe và chọn chữ đúng.",
      audioId: w.id,
      options: shuffle([w, ...d], rnd).map((x) => ({ id: x.id, text: x.hanzi, hanzi: x.hanzi })),
      answer: w.id,
      noPinyin: true,
    });
  }
  for (const s of pick(sents, 6, rnd)) {
    const others = pick(sents, 3, rnd, (x) => x.id !== s.id);
    listening.push({
      id: `m${which}-l${++i}`,
      kind: "listen-choice",
      prompt: "Nghe câu và chọn nghĩa đúng.",
      audioId: s.id,
      options: shuffle([s, ...others], rnd).map((x) => ({ id: x.id, text: x.vi })),
      answer: s.id,
      noPinyin: true,
    });
  }
  for (const w of pick(words, 6, rnd)) {
    const first = w.pinyinNum.trim().split(/\s+/)[0];
    const t = (first.match(/[1-5]/) || ["1"])[0];
    listening.push({
      id: `m${which}-l${++i}`,
      kind: "listen-tone",
      prompt: "Nghe và chọn thanh điệu của âm tiết đầu.",
      audioId: w.id,
      options: ["1", "2", "3", "4"].map((x) => ({ id: x, text: "Thanh " + x })),
      answer: t === "5" ? "1" : t,
      noPinyin: true,
    });
  }
  const reading: Question[] = [];
  let r = 0;
  for (const w of pick(words, 10, rnd)) {
    const d = distractors(w, words, 3, rnd);
    reading.push({
      id: `m${which}-r${++r}`,
      kind: "recog",
      prompt: "Chữ/từ này nghĩa là gì?",
      hanzi: w.hanzi,
      options: shuffle([w, ...d], rnd).map((x) => ({ id: x.id, text: x.vi })),
      answer: w.id,
      noPinyin: true,
    });
  }
  for (const s of pick(sents, 10, rnd)) {
    const others = pick(sents, 3, rnd, (x) => x.id !== s.id);
    reading.push({
      id: `m${which}-r${++r}`,
      kind: "read-meaning",
      prompt: "Đọc câu và chọn nghĩa đúng.",
      hanzi: s.hanzi,
      options: shuffle([s, ...others], rnd).map((x) => ({ id: x.id, text: x.vi })),
      answer: s.id,
      noPinyin: true,
    });
  }
  return { listening, reading };
}

export function weeklyTest(unlockedLesson: number, seed: number): Question[] {
  const cap = Math.max(1, unlockedLesson);
  const rnd = mulberry(seed);
  const words = ALL_WORDS.filter((w) => w.lesson <= cap);
  const sents = ALL_SENTENCES.filter((s) => s.lesson <= cap);
  const qs: Question[] = [];
  let i = 0;
  for (const w of pick(words, Math.min(8, words.length), rnd)) {
    const d = distractors(w, words, 3, rnd);
    qs.push({
      id: `wk-${++i}`,
      kind: "recog",
      prompt: "Nhận mặt chữ — nghĩa là gì?",
      hanzi: w.hanzi,
      options: shuffle([w, ...d], rnd).map((x) => ({ id: x.id, text: x.vi })),
      answer: w.id,
      noPinyin: true,
    });
  }
  for (const w of pick(words, Math.min(4, words.length), rnd)) {
    const d = distractors(w, words, 3, rnd);
    qs.push({
      id: `wk-${++i}`,
      kind: "listen-choice",
      prompt: "Nghe và chọn chữ đúng.",
      audioId: w.id,
      options: shuffle([w, ...d], rnd).map((x) => ({ id: x.id, text: x.hanzi })),
      answer: w.id,
      noPinyin: true,
    });
  }
  for (const s of pick(sents, Math.min(4, sents.length), rnd)) {
    const others = pick(sents, 3, rnd, (x) => x.id !== s.id);
    qs.push({
      id: `wk-${++i}`,
      kind: "read-meaning",
      prompt: "Câu này nghĩa là gì?",
      hanzi: s.hanzi,
      options: shuffle([s, ...others], rnd).map((x) => ({ id: x.id, text: x.vi })),
      answer: s.id,
      noPinyin: true,
    });
  }
  return qs;
}
