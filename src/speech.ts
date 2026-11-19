/** Strict speaking scorer: initials/finals from Web Speech API + tone from pitch contour. */
import { pinyin } from "pinyin-pro";

export type Syllable = { raw: string; initial: string; final: string; tone: number };

const INITIALS = ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s", "y", "w"];

const MARKS: Record<string, [string, number]> = {
  ā: ["a", 1], á: ["a", 2], ǎ: ["a", 3], à: ["a", 4],
  ē: ["e", 1], é: ["e", 2], ě: ["e", 3], è: ["e", 4],
  ī: ["i", 1], í: ["i", 2], ǐ: ["i", 3], ì: ["i", 4],
  ō: ["o", 1], ó: ["o", 2], ǒ: ["o", 3], ò: ["o", 4],
  ū: ["u", 1], ú: ["u", 2], ǔ: ["u", 3], ù: ["u", 4],
  ǖ: ["ü", 1], ǘ: ["ü", 2], ǚ: ["ü", 3], ǜ: ["ü", 4],
};

export function parsePinyin(input: string): Syllable[] {
  const s = input.trim().replace(/[.,!?。，！？、]/g, " ");
  const parts = s.split(/\s+/).filter(Boolean);
  const out: Syllable[] = [];
  for (const part of parts) {
    let tone = 5;
    let letters = "";
    for (const ch of part) {
      const m = MARKS[ch];
      if (m) {
        letters += m[0];
        tone = m[1];
      } else letters += ch;
    }
    const tm = letters.match(/^(.*?)([0-5])$/);
    if (tm) {
      letters = tm[1];
      tone = Number(tm[2]) === 0 ? 5 : Number(tm[2]);
    }
    letters = letters.replace(/v/g, "ü").replace(/ü/g, "ü").toLowerCase();
    let initial = "";
    let final = letters;
    for (const ini of INITIALS) {
      if (letters.startsWith(ini) && letters.length > ini.length) {
        initial = ini;
        final = letters.slice(ini.length);
        break;
      }
    }
    // y/w are initials already; jqx + u -> ü
    if ((initial === "j" || initial === "q" || initial === "x") && final.startsWith("u") && !final.startsWith("ü")) {
      final = "ü" + final.slice(1);
    }
    out.push({ raw: part, initial, final, tone });
  }
  return out;
}

export function hanziToPinyinNum(hanzi: string): string {
  const arr = pinyin(hanzi, { toneType: "num", type: "array", nonZh: "removed" }) as string[];
  return arr
    .map((x) => x.replace(/v/g, "ü").replace(/5$/, "5").replace(/0$/, "5"))
    .join(" ");
}

export function speechAvailable(): boolean {
  const w = window as unknown as { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown };
  return typeof w.SpeechRecognition === "function" || typeof w.webkitSpeechRecognition === "function";
}

export function recognizeOnce(lang = "zh-CN", maxMs = 8000): Promise<string> {
  return recognizeAlts(lang, maxMs).then((a) => a[0] || "");
}

/** Nhận giọng nói, trả về tối đa 5 phương án máy nghe được (để chấm phương án tốt nhất). */
export function recognizeAlts(lang = "zh-CN", maxMs = 8000): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as {
      webkitSpeechRecognition?: new () => SpeechRec;
      SpeechRecognition?: new () => SpeechRec;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      reject(new Error("no-asr"));
      return;
    }
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    rec.continuous = false;
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      try { rec.stop(); } catch { /* ignore */ }
      reject(new Error("timeout"));
    }, maxMs);
    rec.onresult = (ev: unknown) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      const e = ev as { results: { length: number; [i: number]: { [j: number]: { transcript: string } } } };
      const alts: string[] = [];
      const list = e.results[e.results.length - 1];
      for (let i = 0; i < 5; i++) if (list[i]?.transcript) alts.push(list[i].transcript.trim());
      resolve(alts);
    };
    rec.onerror = (ev: unknown) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      const err = ev as { error?: string };
      reject(new Error(err.error || "asr-error"));
    };
    rec.onend = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      reject(new Error("empty"));
    };
    rec.start();
  });
}

interface SpeechRec {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: unknown) => void) | null;
  onerror: ((ev: unknown) => void) | null;
  onend: (() => void) | null;
}

export type SylScore = {
  expected: Syllable;
  got?: Syllable;
  initialOk: boolean;
  finalOk: boolean;
  toneOk: boolean;
  toneFrom: "pitch" | "asr" | "none";
  pitchTone?: number;
};

export type SpeakScore = {
  pass: boolean;
  asrText?: string;
  asrAvailable: boolean;
  asrUsed: boolean;
  syllables: SylScore[];
  message: string;
};

function normFinal(f: string): string {
  return f.replace(/ü/g, "v").replace(/ue/g, "ve").replace(/iu/g, "iou").replace(/ui/g, "uei").replace(/un/g, "uen");
}

export function scoreUtterance(
  expectedPinyinNum: string,
  asrText: string | null,
  pitchTones: (number | undefined)[] | null,
): SpeakScore {
  const expected = parsePinyin(expectedPinyinNum);
  let asrSyls: Syllable[] | null = null;
  if (asrText) {
    if (/[\u4e00-\u9fff]/.test(asrText)) asrSyls = parsePinyin(hanziToPinyinNum(asrText));
    else asrSyls = parsePinyin(asrText);
  }
  const syllables: SylScore[] = expected.map((exp, i) => {
    const got = asrSyls?.[i];
    const pitchTone = pitchTones?.[i];
    const initialOk = got ? got.initial === exp.initial : !asrText;
    const finalOk = got ? normFinal(got.final) === normFinal(exp.final) : !asrText;
    let toneOk = false;
    let toneFrom: SylScore["toneFrom"] = "none";
    if (pitchTone) {
      toneFrom = "pitch";
      toneOk = tonesMatch(exp.tone, pitchTone);
    } else if (got && asrText && !pitchTones) {
      // ASR tones come from dictionary reading of recognized characters — NOT spoken tones.
      // Do not trust them for pass/fail.
      toneFrom = "asr";
      toneOk = false;
    }
    return { expected: exp, got, initialOk, finalOk, toneOk, toneFrom, pitchTone };
  });

  const asrUsed = !!asrText;
  const havePitch = !!(pitchTones && pitchTones.some((t) => t));
  let pass = false;
  let message = "";
  if (asrUsed && havePitch) {
    pass = syllables.every((s) => s.initialOk && s.finalOk && s.toneOk);
    if (!pass) {
      const bad = syllables.filter((s) => !s.initialOk || !s.finalOk || !s.toneOk);
      message = "Chưa đạt: " + bad.map((s) => {
        const bits: string[] = [];
        if (!s.initialOk || !s.finalOk) bits.push("âm tiết không khớp");
        if (!s.toneOk) bits.push(`thanh điệu kỳ vọng ${s.expected.tone} (đo được ${s.pitchTone ?? "?"} )`);
        return `${s.expected.raw}: ${bits.join(", ")}`;
      }).join("; ");
    } else message = "Đạt — phụ âm, nguyên âm và thanh điệu đều khớp.";
  } else if (havePitch && !asrUsed) {
    pass = syllables.every((s) => s.toneOk);
    message = pass
      ? "Thanh điệu đạt. Máy này không nhận lời nói nên chưa kiểm tra được phụ âm/nguyên âm."
      : "Thanh điệu chưa đúng. Máy này không nhận lời nói (cần Chrome/Edge và mạng cho bước nhận lời); hiện chỉ chấm thanh bằng đường cao độ.";
  } else if (asrUsed && !havePitch) {
    const mid = syllables.every((s) => s.initialOk && s.finalOk);
    pass = false; // cannot pass without tone check — this is the Duolingo trap
    message = mid
      ? "Âm tiết nhận ra đúng chữ, nhưng chưa đo được thanh điệu. Hãy đọc lại gần mic hơn, rõ từng chữ."
      : "Chữ nhận ra không khớp. Hãy đọc chậm, đúng từng âm tiết.";
  } else {
    pass = false;
    message = "Không thu được giọng. Cho phép mic rồi đọc lại.";
  }
  return { pass, asrText: asrText || undefined, asrAvailable: speechAvailable(), asrUsed, syllables, message };
}

function tonesMatch(expected: number, got: number): boolean {
  if (expected === 5) return got === 5 || got === 3 || got === 1; // neutral is short/mid, be slightly lenient
  return expected === got;
}

/* ---------- Pitch: YIN-ish autocorrelation ---------- */

export function pitchContour(input: Float32Array, sampleRate: number): { times: number[]; hz: number[] } {
  const frame = 1024;
  const hop = 256;
  const fMin = 70;
  const fMax = 500;
  const tauMin = Math.floor(sampleRate / fMax);
  const tauMax = Math.min(Math.floor(sampleRate / fMin), frame - 1);
  const times: number[] = [];
  const hz: number[] = [];
  for (let start = 0; start + frame < input.length; start += hop) {
    const f0 = yinFrame(input, start, frame, tauMin, tauMax, sampleRate);
    times.push((start + frame / 2) / sampleRate);
    hz.push(f0);
  }
  return { times, hz };
}

function yinFrame(buf: Float32Array, start: number, frame: number, tauMin: number, tauMax: number, sr: number): number {
  const diff = new Float32Array(tauMax + 1);
  for (let tau = tauMin; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < frame - tau; i++) {
      const d = buf[start + i] - buf[start + i + tau];
      sum += d * d;
    }
    diff[tau] = sum;
  }
  const cmnd = new Float32Array(tauMax + 1);
  let running = 0;
  cmnd[0] = 1;
  let bestTau = -1;
  const thresh = 0.12;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += diff[tau];
    cmnd[tau] = diff[tau] * tau / (running || 1);
    if (tau >= tauMin && cmnd[tau] < thresh) {
      // last local min past threshold
      while (tau + 1 <= tauMax && cmnd[tau + 1] < cmnd[tau]) tau++;
      bestTau = tau;
      break;
    }
  }
  if (bestTau < 0) {
    let min = 1;
    for (let tau = tauMin; tau <= tauMax; tau++) {
      if (cmnd[tau] < min) { min = cmnd[tau]; bestTau = tau; }
    }
    if (min > 0.35) return 0;
  }
  // parabolic interpolation
  const s0 = cmnd[bestTau - 1] || cmnd[bestTau];
  const s1 = cmnd[bestTau];
  const s2 = cmnd[bestTau + 1] || cmnd[bestTau];
  const denom = 2 * (2 * s1 - s2 - s0);
  const shift = denom === 0 ? 0 : (s2 - s0) / denom;
  const tau = bestTau + shift;
  return sr / tau;
}

export function segmentSyllables(hz: number[], times: number[], expectedCount: number): { start: number; end: number; hz: number[] }[] {
  const voiced = hz.map((h) => h >= 70 && h <= 500);
  // energy-like: voiced runs
  const runs: { s: number; e: number }[] = [];
  let i = 0;
  while (i < voiced.length) {
    if (!voiced[i]) { i++; continue; }
    let j = i;
    while (j < voiced.length && voiced[j]) j++;
    if (j - i >= 3) runs.push({ s: i, e: j });
    i = j;
  }
  // merge tiny gaps
  const merged: { s: number; e: number }[] = [];
  for (const r of runs) {
    if (merged.length && r.s - merged[merged.length - 1].e <= 3) merged[merged.length - 1].e = r.e;
    else merged.push({ ...r });
  }
  // split/merge to expectedCount
  let segs = merged;
  if (segs.length > expectedCount && expectedCount > 0) {
    // keep the longest expectedCount
    segs = [...segs].sort((a, b) => (b.e - b.s) - (a.e - a.s)).slice(0, expectedCount).sort((a, b) => a.s - b.s);
  }
  if (segs.length === 1 && expectedCount > 1) {
    const r = segs[0];
    const len = r.e - r.s;
    segs = [];
    for (let k = 0; k < expectedCount; k++) {
      const s = r.s + Math.floor((len * k) / expectedCount);
      const e = r.s + Math.floor((len * (k + 1)) / expectedCount);
      segs.push({ s, e });
    }
  }
  return segs.map((r) => ({
    start: times[r.s] ?? 0,
    end: times[Math.max(r.s, r.e - 1)] ?? 0,
    hz: hz.slice(r.s, r.e).filter((h) => h > 0),
  }));
}

export function classifyTone(hzSeq: number[]): number | undefined {
  const seq = hzSeq.filter((h) => h > 70 && h < 500);
  if (seq.length < 3) return undefined;
  const log = seq.map((h) => Math.log2(h));
  const n = log.length;
  const first = median(log.slice(0, Math.max(1, Math.floor(n * 0.25))));
  const last = median(log.slice(Math.floor(n * 0.75)));
  const mid = median(log.slice(Math.floor(n * 0.35), Math.ceil(n * 0.65)));
  const min = Math.min(...log);
  const max = Math.max(...log);
  const mean = log.reduce((a, b) => a + b, 0) / n;
  const range = max - min; // in octaves; 1 semitone = 1/12
  const st = range * 12;
  const slope = (last - first) * 12;
  const dip = (Math.min(first, last) - min) * 12;
  const dur = n; // frames
  // short + small range -> neutral
  if (dur < 5 && st < 3) return 5;
  // tone 3: clear dip, often low
  if (dip >= 2.2 && min < first - 0.08 && (last > min + 0.06 || mid < first - 0.08)) return 3;
  // tone 2: rising
  if (slope >= 2.2 && last > first) return 2;
  // tone 4: falling
  if (slope <= -2.2 && last < first) return 4;
  // tone 1: level, relatively high, small range
  if (st < 3.2) return 1;
  // fallback by slope
  if (slope >= 1.4) return 2;
  if (slope <= -1.4) return 4;
  if (dip >= 1.5) return 3;
  return 1;
}

function median(a: number[]): number {
  if (!a.length) return 0;
  const b = [...a].sort((x, y) => x - y);
  const m = Math.floor(b.length / 2);
  return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
}

export async function recordMic(maxMs = 4000): Promise<{ samples: Float32Array; sampleRate: number; blob: Blob }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  const recChunks: BlobPart[] = [];
  const media = new MediaRecorder(stream);
  media.ondataavailable = (e) => { if (e.data.size) recChunks.push(e.data); };
  const mute = ctx.createGain();
  mute.gain.value = 0;
  src.connect(proc);
  proc.connect(mute);
  mute.connect(ctx.destination);
  proc.onaudioprocess = (e) => {
    chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  };
  media.start();
  await sleep(maxMs);
  media.stop();
  proc.disconnect();
  src.disconnect();
  stream.getTracks().forEach((t) => t.stop());
  const blob: Blob = await new Promise((resolve) => {
    media.onstop = () => resolve(new Blob(recChunks, { type: media.mimeType || "audio/webm" }));
  });
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const samples = new Float32Array(total);
  let o = 0;
  for (const c of chunks) { samples.set(c, o); o += c.length; }
  const sr = ctx.sampleRate;
  await ctx.close();
  return { samples, sampleRate: sr, blob };
}

export async function recordUntilSilent(opts?: { maxMs?: number; minMs?: number }): Promise<{ samples: Float32Array; sampleRate: number }> {
  const maxMs = opts?.maxMs ?? 5000;
  const minMs = opts?.minMs ?? 600;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const ctx = new AudioContext();
  const src = ctx.createMediaStreamSource(stream);
  const proc = ctx.createScriptProcessor(2048, 1, 1);
  const chunks: Float32Array[] = [];
  const mute = ctx.createGain();
  mute.gain.value = 0;
  src.connect(proc);
  proc.connect(mute);
  mute.connect(ctx.destination);
  const started = ctx.currentTime;
  let lastLoud = started;
  let resolveFn: () => void;
  const done = new Promise<void>((r) => { resolveFn = r; });
  proc.onaudioprocess = (e) => {
    const data = new Float32Array(e.inputBuffer.getChannelData(0));
    chunks.push(data);
    let peak = 0;
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    const t = ctx.currentTime;
    if (peak > 0.04) lastLoud = t;
    if (t - started >= maxMs / 1000) resolveFn();
    else if (t - started >= minMs / 1000 && t - lastLoud > 0.55) resolveFn();
  };
  await done;
  proc.disconnect();
  src.disconnect();
  stream.getTracks().forEach((t) => t.stop());
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const samples = new Float32Array(total);
  let o = 0;
  for (const c of chunks) { samples.set(c, o); o += c.length; }
  const sr = ctx.sampleRate;
  await ctx.close();
  return { samples, sampleRate: sr };
}

export async function pitchFromAudioUrl(url: string): Promise<{ times: number[]; hz: number[] }> {
  const res = await fetch(url);
  const arr = await res.arrayBuffer();
  const ctx = new AudioContext();
  const buf = await ctx.decodeAudioData(arr);
  const data = buf.getChannelData(0);
  const contour = pitchContour(data, buf.sampleRate);
  await ctx.close();
  return contour;
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

export function tonesFromRecording(samples: Float32Array, sampleRate: number, expectedCount: number): {
  contour: { times: number[]; hz: number[] };
  segs: { start: number; end: number; hz: number[] }[];
  tones: (number | undefined)[];
} {
  const contour = pitchContour(samples, sampleRate);
  const segs = segmentSyllables(contour.hz, contour.times, expectedCount);
  const tones = segs.map((s) => classifyTone(s.hz));
  return { contour, segs, tones };
}
