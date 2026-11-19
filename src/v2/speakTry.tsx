/** v2.1 — Chấm nói: tách khỏi ui2 để trang Hôm nay không phải tải bộ chấm. */
import { useEffect, useRef, useState } from "preact/hooks";
import { Button, cls } from "../ui";
import { stopAudio } from "../audio";
import { speechAvailable, startListening, type ListenSession } from "./listen";
import type { V2Score } from "./speakScore";

/** Chấm nói: bấm → nói → hiện chữ máy nghe được + % + từng chữ đúng/sai. */
export function SpeakTry(props: { expected: string; pinyin?: string; onScore?: (s: V2Score) => void; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<V2Score | null>(null);
  const [err, setErr] = useState("");
  const [live, setLive] = useState("");
  const sess = useRef<ListenSession | null>(null);
  useEffect(() => () => sess.current?.stop(), []);
  const ok = speechAvailable() || !!window.__miaoziAsr;
  const run = async () => {
    stopAudio();
    setBusy(true); setErr(""); setRes(null); setLive("");
    try { const s = startListening(props.expected, setLive); sess.current = s; const sc = await s.result; setRes(sc); props.onScore?.(sc); }
    catch (e) { setErr("Không mở được micro / nhận giọng nói: " + (e as Error).message); }
    sess.current = null;
    setBusy(false);
  };
  return (
    <div class="speak-try" data-testid="speak-try">
      {!ok && <p class="notice">Trình duyệt này không có nhận giọng nói. Mở Miaozi bằng Chrome (Android/Windows) hoặc Edge. Có thể bấm “Bỏ qua → nợ” nếu hôm nay không nói được.</p>}
      {busy ? (
        <div class="listening" data-testid="listening">
          <div class="row spread"><span class="rec-dot" /> <span class="muted">Đang nghe… nói hết câu, im 2–3 giây là chấm (tối đa 15 giây)</span></div>
          {live && <p class="hanzi-inline" data-testid="speak-live">{live}</p>}
          <Button kind="primary" wide id="speak-done" onClick={() => sess.current?.stop()}>Xong — chấm luôn</Button>
        </div>
      ) : <Button kind="primary" wide disabled={!ok} onClick={run} class="speak-btn">{props.label || "🎤 Bấm rồi nói"}</Button>}
      {err && <p class="bad-text">{err}</p>}
      {res && (
        <div class={cls("speak-res", res.pass ? "ok" : "bad")} data-testid="speak-res">
          <div class="row spread"><strong data-testid="speak-pct">{res.pass ? "Đạt" : "Chưa đạt"} · {res.percent}%</strong>{res.tonePct !== null && <span class="chip tiny">Cao độ (tham khảo) {res.tonePct}%</span>}</div>
          <p class="muted" data-testid="speak-heard">Máy nghe được: <span class="hanzi-inline">{res.heard || "(không nghe được gì)"}</span></p>
          <div class="marks">{res.marks.map((m, i) => <span key={i} class={cls("mk", m.ok >= 1 ? "ok" : m.ok > 0 ? "near" : "bad")} title={m.py}>{m.char}<small>{m.py}</small></span>)}</div>
          <p class="small">{res.message}</p>
        </div>
      )}
    </div>
  );
}

