/** Thành phần giao diện v2: mèo Miao, thanh 6 ô, chấm nói, Pomodoro. */
import { useEffect, useState } from "preact/hooks";
import { getState } from "../store";
import { Button, cls } from "../ui";
import { SEC_ORDER, WEIGHT, type SecMap } from "./queue";
import { SEC_SHORT } from "./lessons";
import { setPomodoro } from "./state2";
import { onMiao } from "./miaoBus";
import { miaoSrc, type MiaoSay } from "./miao";
import type { MiaoExpr } from "../data/miaoLines";

/** Miao 2.2 — mèo mướp cam (ảnh biểu cảm có sẵn trong public/miao). */
export function MiaoFace(props: { expr?: MiaoExpr; size?: number; class?: string }) {
  const s = props.size || 40;
  return <img class={cls("miao-face", props.class)} src={miaoSrc(props.expr || "vui")} width={s} height={s} alt="Miao" draggable={false} />;
}
/** Giữ tên cũ cho chỗ còn gọi (logo). */
export function CatSvg(props: { size?: number; mood?: "calm" | "proud" | "scold" }) {
  return <MiaoFace size={props.size} expr={props.mood === "scold" ? "kho_chiu" : props.mood === "proud" ? "dac_y" : "vui"} />;
}

/** Lời Miao trong thẻ (v2.1: Chế độ Công ty vẫn hiện bình thường). */
export function Miao(props: { text: string; mood?: "calm" | "proud" | "scold"; expr?: MiaoExpr; testid?: string }) {
  const expr = props.expr || (props.mood === "scold" ? "kho_chiu" : props.mood === "proud" ? "dac_y" : "ngai_ngu");
  return (
    <div class={cls("tutor", props.mood || "calm")} data-testid={props.testid || "tutor"}>
      <div class="avatar cat"><MiaoFace size={44} expr={expr} /></div>
      <p>{props.text}</p>
    </div>
  );
}

/** Bong bóng Miao nổi ở góc: nghe miaoBus, tự ẩn sau ~3 giây, không chặn bấm (pointer-events: none). */
/** Câu Miao đang nói (tự tắt sau ~3,2 s). Dùng cho bong bóng + mặt mèo ở đầu trang (logo header / thanh trái). */
export function useMiaoSay(): MiaoSay | null {
  const [say, setSay] = useState<MiaoSay | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const off = onMiao((x) => { setSay(x); clearTimeout(t); t = setTimeout(() => setSay(null), 3200); });
    return () => { off(); clearTimeout(t); };
  }, []);
  return say;
}

/** Mặt Miao ở góc trên (logo): đổi biểu cảm theo câu đang nói. */
export function MiaoTopFace(props: { size: number; rest?: MiaoExpr }) {
  const say = useMiaoSay();
  return <span class={cls("miao-top", say && "talk")}><MiaoFace size={props.size} expr={say ? say.line.expr : props.rest || "vui"} /></span>;
}

/** Bong bóng thoại — nằm trong thanh đầu trang (dính trên cùng khi cuộn), cạnh mèo ở góc trên trái: tay viết ở nửa dưới không che. */
export function MiaoBubble() {
  const say = useMiaoSay();
  if (!say) return null;
  return (
    <div class="miao-float talk" data-testid="miao-float" aria-live="polite">
      <div class="miao-say" data-testid="miao-bubble" data-group={say.group} data-id={say.line.id} data-expr={say.line.expr}>{say.line.text}</div>
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
