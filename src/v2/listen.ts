/**
 * Nói → chấm (v2.1). Nghe liên tục (continuous + interim) cho tới khi im ≥ 2,5 s sau khi đã nói, tối đa 15 s,
 * hoặc bấm “Xong”. Android hay tự kết thúc sau mỗi câu → tự khởi động lại cho tới khi hết giờ.
 * Android chỉ chạy nhận giọng (thu song song tranh micro); máy khác thu thêm để đo cao độ (chỉ tham khảo).
 */
import { pitchContour, recordUntilSilent, speechAvailable, speechCtor } from "../speech";
import { gatedContour, scoreSpeech, sylls, tonesFromContour, type V2Score } from "./speakScore";
import { joinAlts, shouldStop } from "./speakTiming";

export const isAndroid = () => /Android/i.test(navigator.userAgent);
export { speechAvailable };

/** Cho Playwright: window.__miaoziAsr = ["你好"] để giả lập kết quả nhận giọng. */
declare global { interface Window { __miaoziAsr?: string[] | null } }

export interface ListenSession { stop: () => void; result: Promise<V2Score> }

export function startListening(expected: string, onInterim?: (text: string) => void): ListenSession {
  if (window.__miaoziAsr) {
    const alts = window.__miaoziAsr;
    return { stop: () => {}, result: Promise.resolve(scoreSpeech(expected, alts, null)) };
  }
  const Ctor = speechCtor();
  if (!Ctor) return { stop: () => {}, result: Promise.reject(new Error("no-asr")) };
  const t0 = performance.now();
  let hasSpeech = false, lastSpeech = t0, finished = false, fatal: string | null = null;
  const finals: string[][] = [];
  let sessionFinals: string[][] = [];
  let interim = "";
  let rec = new Ctor();
  let resolveDone!: () => void;
  const done = new Promise<void>((r) => { resolveDone = r; });
  const heard = () => { hasSpeech = true; lastSpeech = performance.now(); };
  const wire = (r: typeof rec) => {
    r.lang = "zh-CN"; r.continuous = true; r.interimResults = true; r.maxAlternatives = 5;
    r.onspeechstart = heard;
    r.onresult = (ev: unknown) => {
      const e = ev as { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; length: number; [j: number]: { transcript: string } } } };
      const fin: string[][] = []; let im = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) { const a: string[] = []; for (let j = 0; j < Math.min(5, res.length); j++) if (res[j]?.transcript) a.push(res[j].transcript.trim()); fin.push(a); }
        else im += res[0]?.transcript || "";
      }
      sessionFinals = fin; interim = im.trim();
      heard();
      onInterim?.(joinAlts([...finals, ...sessionFinals], interim)[0] || "");
    };
    r.onerror = (ev: unknown) => {
      const err = (ev as { error?: string }).error || "";
      if (err === "not-allowed" || err === "service-not-allowed" || err === "audio-capture") { fatal = err; finish(); }
    };
    r.onend = () => {
      finals.push(...sessionFinals); sessionFinals = [];
      if (finished) { resolveDone(); return; }
      // Android: tự kết thúc sau mỗi lượt → mở lại cho tới khi đủ điều kiện dừng.
      try { rec = new Ctor(); wire(rec); rec.start(); } catch { finish(); resolveDone(); }
    };
  };
  wire(rec);
  try { rec.start(); } catch (e) { return { stop: () => {}, result: Promise.reject(e) }; }
  const wantPitch = !isAndroid() && !!navigator.mediaDevices?.getUserMedia;
  const recP = wantPitch ? recordUntilSilent({ maxMs: 15500, minMs: 700, until: () => finished }).catch(() => null) : Promise.resolve(null);
  const tick = setInterval(() => {
    const now = performance.now();
    if (shouldStop({ elapsed: now - t0, hasSpeech, sinceLastSpeech: now - lastSpeech })) finish();
  }, 100);
  function finish() {
    if (finished) return;
    finished = true;
    clearInterval(tick);
    try { rec.stop(); } catch { resolveDone(); }
    setTimeout(resolveDone, 1200); // chờ kết quả cuối, không treo nếu onend không tới
  }
  const result = (async () => {
    await done;
    finals.push(...sessionFinals); sessionFinals = [];
    if (fatal) throw new Error(fatal);
    const alts = joinAlts(finals, interim);
    const r = await recP;
    let tones: (number | undefined)[] | null = null;
    if (r && r.samples.length) {
      try { tones = tonesFromContour(gatedContour(r.samples, r.sampleRate, pitchContour).hz, sylls(expected).length); } catch { tones = null; }
    }
    return scoreSpeech(expected, alts, tones);
  })();
  return { stop: finish, result };
}

/** Giữ API cũ. */
export function listenAndScore(expected: string): Promise<V2Score> { return startListening(expected).result; }
