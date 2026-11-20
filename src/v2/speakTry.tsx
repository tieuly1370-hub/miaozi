/** v2.1 — Chấm nói: tách khỏi ui2 để trang Hôm nay không phải tải bộ chấm. */
import { useEffect, useRef, useState } from "preact/hooks";
import { Button, cls } from "../ui";
import { stopAudio } from "../audio";
import { micErrorText } from "../speech";
import { speechAvailable, startListening, type ListenSession } from "./listen";
import { skippedSpeak, type V2Score } from "./speakScore";

/** Chấm nói: bấm → nói → hiện chữ máy nghe được + % + từng chữ đúng/sai. Có Bỏ qua khi micro/nhận giọng lỗi. */
export function SpeakTry(props: { expected: string; pinyin?: string; onScore?: (s: V2Score) => void; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<V2Score | null>(null);
  const [err, setErr] = useState("");
  const [live, setLive] = useState("");
  const sess = useRef<ListenSession | null>(null);
  const skipped = useRef(false);
  useEffect(() => () => sess.current?.stop(), []);
  const ok = speechAvailable() || !!window.__miaoziAsr;
  const finish = (sc: V2Score) => { setRes(sc); props.onScore?.(sc); };
  const skip = () => {
    skipped.current = true;
    try { sess.current?.stop(); } catch { /* */ }
    sess.current = null;
    setBusy(false); setErr("");
    finish(skippedSpeak(props.expected));
  };
  const run = async () => {
    stopAudio();
    skipped.current = false;
    setBusy(true); setErr(""); setRes(null); setLive("");
    try {
      const s = startListening(props.expected, setLive);
      sess.current = s;
      const sc = await s.result;
      if (skipped.current) return;
      setRes(sc); props.onScore?.(sc);
    } catch (e) {
      if (skipped.current) return;
      setErr(micErrorText(e));
    }
    sess.current = null;
    setBusy(false);
  };
  const canSkip = !ok || !!err || busy || (res && !res.pass && !res.skipped);
  return (
    <div class="speak-try" data-testid="speak-try">
      {!ok && <p class="notice" data-testid="speak-no-asr">Trình duyệt này không có nhận giọng nói. Mở Miaozi bằng Chrome (Android/Windows) hoặc Edge. Có thể bấm “Bỏ qua” để tính đã nói xong câu này.</p>}
      {busy ? (
        <div class="listening" data-testid="listening">
          <div class="row spread"><span class="rec-dot" /> <span class="muted">Đang nghe… nói hết câu, im 2–3 giây là chấm (tối đa 15 giây)</span></div>
          {live && <p class="hanzi-inline" data-testid="speak-live">{live}</p>}
          <Button kind="primary" wide id="speak-done" onClick={() => sess.current?.stop()}>Xong — chấm luôn</Button>
        </div>
      ) : <Button kind="primary" wide disabled={!ok} onClick={run} class="speak-btn">{props.label || "🎤 Bấm rồi nói"}</Button>}
      {err && <p class="bad-text" data-testid="speak-err">{err}</p>}
      {canSkip && !res?.skipped && <div data-testid="speak-skip"><Button small kind="ghost" id="speak-skip" onClick={skip}>Bỏ qua</Button></div>}
      {res && (
        <div class={cls("speak-res", res.skipped ? "ok" : res.pass ? "ok" : "bad")} data-testid="speak-res">
          <div class="row spread"><strong data-testid="speak-pct">{res.skipped ? "Đã bỏ qua" : (res.pass ? "Đạt" : "Chưa đạt") + " · " + res.percent + "%"}</strong>{res.tonePct !== null && <span class="chip tiny">Cao độ (tham khảo) {res.tonePct}%</span>}</div>
          {!res.skipped && <p class="muted" data-testid="speak-heard">Máy nghe được: <span class="hanzi-inline">{res.heard || "(không nghe được gì)"}</span></p>}
          {res.marks.length > 0 && <div class="marks">{res.marks.map((m, i) => <span key={i} class={cls("mk", m.ok >= 1 ? "ok" : m.ok > 0 ? "near" : "bad")} title={m.py}>{m.char}<small>{m.py}</small></span>)}</div>}
          <p class="small">{res.message}</p>
        </div>
      )}
    </div>
  );
}
