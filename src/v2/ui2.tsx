/** Thành phần giao diện v2: mèo Miao, thanh 6 ô, chấm nói, Pomodoro. */
import { useEffect, useState } from "preact/hooks";
import { getState } from "../store";
import { Button, cls } from "../ui";
import { SEC_ORDER, WEIGHT, type SecMap } from "./queue";
import { SEC_SHORT } from "./lessons";
import { listenAndScore, speechAvailable } from "./listen";
import type { V2Score } from "./speakScore";
import { setPomodoro } from "./state2";

/** Mèo Miao — SVG tự vẽ (tai nhọn, mắt tròn, ria). */
export function CatSvg(props: { size?: number; mood?: "calm" | "proud" | "scold" }) {
  const s = props.size || 40;
  const mood = props.mood || "calm";
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" aria-hidden="true" class="cat-svg">
      <path d="M12 26 L14 8 L27 19 Q32 17.5 37 19 L50 8 L52 26 Q56 34 52 44 Q46 56 32 56 Q18 56 12 44 Q8 34 12 26Z" fill="#F4B860" stroke="#5A3E36" stroke-width="2.2" stroke-linejoin="round" />
      <path d="M16 13 L24 20 L17 24Z M48 13 L40 20 L47 24Z" fill="#F6C9C3" />
      <path d="M26 21 Q28 15 32 21 Q36 15 38 21" fill="none" stroke="#D9913A" stroke-width="2" stroke-linecap="round" />
      {mood === "scold" ? (
        <g stroke="#3A2F2A" stroke-width="2.6" stroke-linecap="round"><path d="M20 33 L27 35" /><path d="M44 33 L37 35" /></g>
      ) : mood === "proud" ? (
        <g fill="none" stroke="#3A2F2A" stroke-width="2.6" stroke-linecap="round"><path d="M20 35 Q23.5 31 27 35" /><path d="M37 35 Q40.5 31 44 35" /></g>
      ) : (
        <g fill="#3A2F2A"><ellipse cx="23.5" cy="35" rx="3" ry="3.6" /><ellipse cx="40.5" cy="35" rx="3" ry="3.6" /><circle cx="24.6" cy="33.8" r="1" fill="#fff" /><circle cx="41.6" cy="33.8" r="1" fill="#fff" /></g>
      )}
      <path d="M30 41 L34 41 L32 43.5Z" fill="#D66B6B" />
      <path d="M32 43.5 Q32 47 28.5 47 M32 43.5 Q32 47 35.5 47" fill="none" stroke="#5A3E36" stroke-width="1.6" stroke-linecap="round" />
      <g stroke="#5A3E36" stroke-width="1.2" stroke-linecap="round"><path d="M8 38 L20 40" /><path d="M8 44 L20 43" /><path d="M56 38 L44 40" /><path d="M56 44 L44 43" /></g>
    </svg>
  );
}

/** Lời Miao (ẩn hẳn ở Chế độ Công ty). */
export function Miao(props: { text: string; mood?: "calm" | "proud" | "scold"; testid?: string }) {
  if (getState().settings.companyMode) return <p class="doc-note" data-testid={props.testid || "tutor"}>{props.text}</p>;
  return (
    <div class={cls("tutor", props.mood || "calm")} data-testid={props.testid || "tutor"}>
      <div class="avatar cat"><CatSvg size={40} mood={props.mood} /></div>
      <p><strong>Miao. </strong>{props.text}</p>
    </div>
  );
}

export function SixBar(props: { sec: SecMap; active?: string[]; onPick?: (id: string) => void }) {
  return (
    <div class="sixbar" data-testid="sixbar">
      {SEC_ORDER.filter((id) => id !== "s1").map((id) => {
        const r = props.sec[id];
        return (
          <button key={id} class={cls("cell", r?.done && "done", r?.owed && !r.done && "owed", props.active?.includes(id) && "act")}
            style={{ flexGrow: WEIGHT[id] }} title={`Mục ${SEC_SHORT[id]}`} onClick={() => props.onPick?.(id)} data-testid={"cell-" + id}>
            {SEC_SHORT[id]}{r?.done ? " ✓" : r?.owed ? " nợ" : ""}
          </button>
        );
      })}
    </div>
  );
}

export function PctBar(props: { pct: number }) {
  return (
    <div class="pctbar" data-testid="pctbar" aria-valuenow={props.pct}>
      <span style={{ width: props.pct + "%" }} />
      <b>{props.pct % 1 ? props.pct.toFixed(1) : props.pct}%</b>
    </div>
  );
}

/** Chấm nói: bấm → nói → hiện chữ máy nghe được + % + từng chữ đúng/sai. */
export function SpeakTry(props: { expected: string; pinyin?: string; onScore?: (s: V2Score) => void; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<V2Score | null>(null);
  const [err, setErr] = useState("");
  const ok = speechAvailable() || !!window.__miaoziAsr;
  const run = async () => {
    setBusy(true); setErr(""); setRes(null);
    try { const sc = await listenAndScore(props.expected); setRes(sc); props.onScore?.(sc); }
    catch (e) { setErr("Không mở được micro / nhận giọng nói: " + (e as Error).message); }
    setBusy(false);
  };
  return (
    <div class="speak-try" data-testid="speak-try">
      {!ok && <p class="notice">Trình duyệt này không có nhận giọng nói. Mở Miaozi bằng Chrome (Android/Windows) hoặc Edge. Có thể bấm “Bỏ qua → nợ” nếu hôm nay không nói được.</p>}
      <Button kind="primary" wide disabled={busy || !ok} onClick={run} class="speak-btn">{busy ? "Đang nghe… nói đi" : (props.label || "🎤 Bấm rồi nói")}</Button>
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

export function Pomodoro() {
  const p = getState().v2.pomodoro;
  const [, tick] = useState(0);
  useEffect(() => { if (!p) return; const t = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(t); }, [p?.end]);
  useEffect(() => {
    if (!p) return;
    const left = p.end - Date.now();
    if (left <= 0) return;
    const t = setTimeout(() => {
      try { if ("Notification" in window && Notification.permission === "granted" && !getState().settings.companyMode) new Notification("Miaozi", { body: `Hết ${p.mins} phút Pomodoro. Nghỉ 5 phút.` }); } catch { /* */ }
      try { navigator.vibrate?.(300); } catch { /* */ }
    }, left);
    return () => clearTimeout(t);
  }, [p?.end]);
  const left = p ? Math.max(0, p.end - Date.now()) : 0;
  const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
  return (
    <div class="pomo" data-testid="pomodoro">
      <span class="muted">Pomodoro</span>
      {p && left > 0 ? (
        <>
          <strong class="pomo-time">{mm}:{String(ss).padStart(2, "0")}</strong>
          <Button small kind="ghost" onClick={() => setPomodoro(null)}>Dừng</Button>
        </>
      ) : (
        <>
          {p && <span class="chip green tiny">Xong {p.mins}p!</span>}
          {[15, 45, 60].map((m) => <Button key={m} small kind="ghost" onClick={() => setPomodoro(m)}>{m}p</Button>)}
        </>
      )}
    </div>
  );
}
