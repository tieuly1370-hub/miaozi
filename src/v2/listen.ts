/**
 * Nói → chấm (v2.1 / v2.3.1). Nghe tới khi im ≥ 2,5 s sau khi đã nói, tối đa 15 s, hoặc bấm “Xong”.
 * Android / máy tablet chế độ desktop: không thu song song (tranh micro → nhận giọng ra 0%),
 * continuous=false rồi tự mở lại; giữ cả bản interim để không mất chữ khi session kết thúc.
 * Lỗi mạng/micro là fatal sau vài lần thử; nếu đã nghe được chữ thì vẫn chấm chữ đó.
 */
import { pitchContour, recordUntilSilent, speechAvailable, speechCtor } from "../speech";
import { gatedContour, scoreSpeech, sylls, tonesFromContour, type V2Score } from "./speakScore";
import { asrDebugOn, collectAlts, exclusiveMic, rememberHeard, shouldStop } from "./speakTiming";

export const isAndroid = () => exclusiveMic();
export { speechAvailable, exclusiveMic, asrDebugOn };

/** Cho Playwright: window.__miaoziAsr = ["你好"] để giả lập kết quả nhận giọng. */
declare global { interface Window { __miaoziAsr?: string[] | null } }

export interface ListenSession { stop: () => void; result: Promise<V2Score> }

export function startListening(expected: string, onInterim?: (text: string) => void, onDebug?: (line: string) => void): ListenSession {
  if (window.__miaoziAsr) {
    const alts = window.__miaoziAsr;
    return { stop: () => {}, result: Promise.resolve(scoreSpeech(expected, alts, null)) };
  }
  const Ctor = speechCtor();
  if (!Ctor) return { stop: () => {}, result: Promise.reject(new Error("no-asr")) };
  const t0 = performance.now();
  let hasSpeech = false, lastSpeech = t0, finished = false, fatal: string | null = null;
  let netFails = 0, quickEnds = 0, lastStart = t0;
  const finals: string[][] = [];
  let sessionFinals: string[][] = [];
  let interim = "";
  let kept = "";
  const traces: string[] = [];
  const share = (live?: string) => {
    const text = live || collectAlts(finals, sessionFinals, interim, kept)[0] || kept;
    kept = rememberHeard(kept, text);
    onInterim?.(kept);
  };
  const dbg = (m: string) => {
    traces.push(m);
    if (asrDebugOn(location.search, location.hash)) onDebug?.(traces.slice(-8).join(" · "));
  };
  const exclusive = exclusiveMic();
  let rec = new Ctor();
  let resolveDone!: () => void;
  const done = new Promise<void>((r) => { resolveDone = r; });
  const heard = () => { hasSpeech = true; lastSpeech = performance.now(); };
  const commitSession = () => {
    finals.push(...sessionFinals);
    sessionFinals = [];
    kept = rememberHeard(kept, interim);
    interim = "";
  };
  const wire = (r: typeof rec) => {
    r.lang = "zh-CN";
    r.continuous = !exclusive;
    r.interimResults = true;
    r.maxAlternatives = 5;
    r.onspeechstart = heard;
    r.onresult = (ev: unknown) => {
      const e = ev as { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; length: number; [j: number]: { transcript: string } } } };
      const fin: string[][] = []; let im = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) { const a: string[] = []; for (let j = 0; j < Math.min(5, res.length); j++) if (res[j]?.transcript) a.push(res[j].transcript.trim()); fin.push(a); }
        else im += res[0]?.transcript || "";
      }
      sessionFinals = fin;
      interim = im.trim();
      heard();
      share();
      dbg("r:" + (interim || fin.map((a) => a[0]).join("") || "∅") + (fin.length ? "/F" : "/I"));
    };
    r.onerror = (ev: unknown) => {
      const err = (ev as { error?: string }).error || "";
      dbg("err:" + err);
      // Quyền / không bắt được tiếng / dịch vụ cấm → dừng hẳn.
      if (err === "not-allowed" || err === "service-not-allowed" || err === "audio-capture") { fatal = err; finish(); return; }
      // Mạng (hay gặp trên máy không có dịch vụ Google / Wi‑Fi yếu): thử lại vài lần rồi báo lỗi, không kẹt vòng lặp.
      if (err === "network" || err === "aborted") {
        netFails += 1;
        if (netFails >= 3) { fatal = err === "aborted" ? "network" : err; finish(); }
      }
    };
    r.onend = () => {
      commitSession();
      share(kept);
      if (finished) { resolveDone(); return; }
      // Android / tablet: tự kết thúc sau mỗi lượt → mở lại cho tới khi đủ điều kiện dừng.
      // Nếu start/end lập tức (dịch vụ nhận giọng chết) thì dừng, tránh vòng lặp vô hạn.
      const now = performance.now();
      if (now - lastStart < 280) quickEnds += 1; else quickEnds = 0;
      if (quickEnds >= 4) { fatal = fatal || "network"; finish(); resolveDone(); return; }
      try { rec = new Ctor(); wire(rec); lastStart = performance.now(); rec.start(); dbg("restart"); } catch { finish(); resolveDone(); }
    };
  };
  wire(rec);
  try { lastStart = performance.now(); rec.start(); dbg(exclusive ? "start-ex" : "start"); } catch (e) { return { stop: () => {}, result: Promise.reject(e) }; }
  const wantPitch = !exclusive && !!navigator.mediaDevices?.getUserMedia;
  const recP = wantPitch ? recordUntilSilent({ maxMs: 15500, minMs: 700, until: () => finished }).catch(() => null) : Promise.resolve(null);
  const tick = setInterval(() => {
    const now = performance.now();
    if (shouldStop({ elapsed: now - t0, hasSpeech, sinceLastSpeech: now - lastSpeech })) finish();
  }, 100);
  function finish() {
    if (finished) return;
    finished = true;
    clearInterval(tick);
    kept = rememberHeard(kept, collectAlts(finals, sessionFinals, interim, kept)[0] || interim);
    try { rec.stop(); } catch { resolveDone(); }
    setTimeout(resolveDone, 1200); // chờ kết quả cuối, không treo nếu onend không tới
  }
  const result = (async () => {
    await done;
    commitSession();
    const alts = collectAlts(finals, [], "", kept);
    if (fatal && !alts.length) throw new Error(fatal);
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
