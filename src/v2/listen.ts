/**
 * Nói → chấm (v2). Lỗi gốc của bản 1.2: thu âm (getUserMedia) và nhận giọng nói chạy cùng lúc — trên Chrome Android hai thứ
 * tranh micro nên nhận giọng thường trả rỗng; thêm nữa luật cũ bắt buộc thanh đo bằng YIN đúng tuyệt đối từng âm tiết.
 * Bản này: Android chỉ chạy nhận giọng nói; máy khác thu song song để đo thanh (chỉ tham khảo).
 */
import { pitchContour, recognizeAlts, recordUntilSilent, speechAvailable } from "../speech";
import { gatedContour, scoreSpeech, sylls, tonesFromContour, type V2Score } from "./speakScore";

export const isAndroid = () => /Android/i.test(navigator.userAgent);
export { speechAvailable };

/** Cho Playwright: window.__miaoziAsr = ["你好"] để giả lập kết quả nhận giọng. */
declare global { interface Window { __miaoziAsr?: string[] | null } }

export async function listenAndScore(expected: string): Promise<V2Score> {
  if (window.__miaoziAsr) return scoreSpeech(expected, window.__miaoziAsr, null);
  const wantPitch = !isAndroid() && !!navigator.mediaDevices?.getUserMedia;
  const asrP = recognizeAlts("zh-CN", 7000).catch(() => [] as string[]);
  const recP = wantPitch ? recordUntilSilent({ maxMs: 6000, minMs: 700 }).catch(() => null) : Promise.resolve(null);
  const [alts, rec] = await Promise.all([asrP, recP]);
  let tones: (number | undefined)[] | null = null;
  if (rec && rec.samples.length) {
    try { tones = tonesFromContour(gatedContour(rec.samples, rec.sampleRate, pitchContour).hz, sylls(expected).length); } catch { tones = null; }
  }
  return scoreSpeech(expected, alts, tones);
}
