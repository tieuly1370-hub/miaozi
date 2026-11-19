import { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { autoPlay, carrierFor, playId, stopAudio } from "./audio";
import { getState } from "./store";
import type { TutorMood } from "./tutor";
import type { Word } from "./data/curriculum";

export function cls(...xs: (string | false | undefined | null)[]) {
  return xs.filter(Boolean).join(" ");
}

export function Button(props: {
  children: ComponentChildren;
  onClick?: () => void;
  kind?: "primary" | "pink" | "blue" | "green" | "purple" | "yellow" | "ghost";
  wide?: boolean;
  small?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  class?: string;
  id?: string;
}) {
  return (
    <button
      id={props.id}
      type={props.type || "button"}
      disabled={props.disabled}
      class={cls("btn", props.kind, props.wide && "wide", props.small && "small", props.class)}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

export function Card(props: { children: ComponentChildren; class?: string; id?: string; "data-testid"?: string }) {
  return <section id={props.id} class={cls("card", props.class)} data-testid={props["data-testid"]}>{props.children}</section>;
}

/** Phát âm tự động khi id đổi (Cài đặt → Tự phát âm). */
export function useAutoPlay(id: string | undefined | null, extraDeps: unknown[] = []) {
  useEffect(() => {
    if (!id) return;
    const t = setTimeout(() => void autoPlay(id, getState().settings.autoplay !== false), 250);
    return () => clearTimeout(t);
  }, [id, ...extraDeps]);
}

/** Ghi chú khi âm được đọc trong cụm (trợ từ thanh nhẹ). */
export function CarrierNote(props: { id?: string }) {
  const [c, setC] = useState<string | null>(null);
  useEffect(() => { setC(null); if (props.id) carrierFor(props.id).then(setC).catch(() => {}); }, [props.id]);
  if (!c) return null;
  return <p class="muted small-note">Chữ này đọc nhẹ, đứng một mình nghe sai nên loa đọc trong cụm <span class="hanzi-inline">{c}</span>.</p>;
}

export function AudioBtn(props: { id?: string; slow?: boolean; label?: string }) {
  const [busy, setBusy] = useState(false);
  if (!props.id) return null;
  return (
    <Button
      small
      kind="blue"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try { await playId(props.id!, props.slow); }
        catch { /* ignore */ }
        setBusy(false);
      }}
    >{props.slow ? "Nghe chậm" : (props.label || "Nghe")}</Button>
  );
}

export function HiddenPinyin(props: {
  pinyin: string;
  introduced?: boolean;
  onHint?: () => void;
}) {
  const [show, setShow] = useState(!!props.introduced && false);
  const [first, setFirst] = useState(!!props.introduced);
  // On first introduction we may show once via introducedFlag from parent
  useEffect(() => { stopAudio(); }, []);
  if (props.introduced && first && !show) {
    // parent will pass introduced=true only on first-seen card to show pinyin once
  }
  const visible = show || (props.introduced && first && !show ? true : show);
  // Simplify: if introduced (first show), start visible until hidden by user? Spec: pinyin on first introduction only.
  const [seen] = useState(!!props.introduced);
  const [open, setOpen] = useState(!!props.introduced);
  useEffect(() => { setOpen(!!props.introduced); }, [props.pinyin, props.introduced]);
  return (
    <div>
      {open ? (
        <div class="pinyin">{props.pinyin}</div>
      ) : (
        <div class="pinyin hidden" title="Chạm để xem pinyin (tính là gợi ý)" onClick={() => {
          setOpen(true);
          props.onHint?.();
        }}>•••• ••••</div>
      )}
      {!open && <div class="pinyin tap" onClick={() => { setOpen(true); props.onHint?.(); }}>Chạm để xem pinyin (gợi ý)</div>}
      {open && !props.introduced && seen === false && null}
    </div>
  );
}

export function PinyinReveal(props: { pinyin: string; firstIntro?: boolean; onHint: () => void }) {
  const [open, setOpen] = useState(!!props.firstIntro);
  useEffect(() => { setOpen(!!props.firstIntro); }, [props.pinyin, props.firstIntro]);
  if (open) return <div class="pinyin" data-testid="pinyin">{props.pinyin}</div>;
  return (
    <div>
      <div class="pinyin hidden" onClick={() => { setOpen(true); props.onHint(); }}>•••• ••••</div>
      <button class="pinyin tap" onClick={() => { setOpen(true); props.onHint(); }}>Chạm để xem pinyin (tính là gợi ý)</button>
    </div>
  );
}

export function TutorBubble(props: { mood: TutorMood; text: string }) {
  const face = { cheer: "🐱", nudge: "🐱", scold: "😾", proud: "😺", calm: "🐱" }[props.mood];
  return (
    <div class={cls("tutor", props.mood)} data-testid="tutor">
      <div class="avatar">{face}</div>
      <p><strong>Miao. </strong>{props.text}</p>
    </div>
  );
}

export function Bar(props: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(props.value * 100)));
  return <div class="progress" aria-valuenow={v}><span style={{ width: v + "%" }} /></div>;
}

export function Options(props: {
  options: { id: string; text: string; hanzi?: string }[];
  chosen?: string | null;
  answer?: string;
  locked?: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <div class="opts">
      {props.options.map((o) => {
        const done = props.locked && props.chosen;
        const klass = done
          ? (o.id === props.answer ? "ok" : o.id === props.chosen ? "bad" : "")
          : o.id === props.chosen ? "sel" : "";
        return (
          <button class={cls("opt", klass)} key={o.id} disabled={props.locked} onClick={() => props.onPick(o.id)}>
            {o.hanzi ? <span class="hanzi xs">{o.hanzi}</span> : o.text}
            {o.hanzi && o.text !== o.hanzi ? <div class="muted">{o.text}</div> : null}
          </button>
        );
      })}
    </div>
  );
}

export function WordFace(props: { word: Word; firstIntro?: boolean; onHint?: () => void; showVi?: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div class="hanzi">{props.word.hanzi}</div>
      <PinyinReveal pinyin={props.word.pinyin} firstIntro={props.firstIntro} onHint={() => props.onHint?.()} />
      {props.showVi && <div style={{ marginTop: 8 }}>{props.word.vi} <span class="muted">({props.word.pos})</span></div>}
    </div>
  );
}

export function Decomp(props: { word: Word }) {
  return (
    <div>
      <div class="decomp">
        {props.word.decomps.map((d) => (
          <div class="part" key={d.char}>
            <div class="hanzi xs">{d.char} = {d.parts.join(" + ")}</div>
            <div>{d.mnemonic}</div>
          </div>
        ))}
      </div>
      {props.word.mnemonic && props.word.mnemonic !== props.word.decomps.map((d) => d.mnemonic).join(" · ") && (
        <p class="muted" style={{ marginTop: 8 }}>{props.word.mnemonic}</p>
      )}
    </div>
  );
}

export function useHash(): string {
  const [h, setH] = useState(location.hash || "#/");
  useEffect(() => {
    const f = () => setH(location.hash || "#/");
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  return h.replace(/^#/, "") || "/";
}

export function go(path: string) {
  if (!path.startsWith("#") && !path.startsWith("/")) path = "/" + path;
  location.hash = path.startsWith("#") ? path : "#" + path;
}

export function Back(props: { to?: string; label?: string }) {
  return (
    <button class="icon-btn" aria-label="Quay lại" style={{ fontSize: 22, lineHeight: 1 }}
      onClick={() => props.to ? go(props.to) : history.length > 1 ? history.back() : go("/")}>‹</button>
  );
}

export function Toast(props: { text: string | null }) {
  if (!props.text) return null;
  return <div class="toast">{props.text}</div>;
}

export function PitchChart(props: {
  refTimes: number[]; refHz: number[];
  userTimes?: number[]; userHz?: number[];
  segs?: { start: number; end: number }[];
}) {
  const ref = useRef<SVGSVGElement>(null);
  const w = 320, h = 120, pad = 8;
  const allHz = [...props.refHz, ...(props.userHz || [])].filter((x) => x > 0);
  const min = Math.min(...allHz, 80) - 10;
  const max = Math.max(...allHz, 300) + 10;
  const tMax = Math.max(
    props.refTimes[props.refTimes.length - 1] || 1,
    props.userTimes?.[props.userTimes.length - 1] || 0,
    0.4,
  );
  const y = (hz: number) => h - pad - ((hz - min) / (max - min)) * (h - pad * 2);
  const x = (t: number) => pad + (t / tMax) * (w - pad * 2);
  const path = (ts: number[], hz: number[]) => {
    let d = "";
    for (let i = 0; i < ts.length; i++) {
      if (!hz[i]) { d += " "; continue; }
      d += `${d && !d.endsWith(" ") ? "L" : "M"}${x(ts[i]).toFixed(1)},${y(hz[i]).toFixed(1)} `;
    }
    return d;
  };
  return (
    <svg class="pitch" viewBox={`0 0 ${w} ${h}`} ref={ref} aria-label="Đường cao độ">
      <text x={pad} y={12} fontSize="9" fill="#7A6A62">cao</text>
      <text x={pad} y={h - 4} fontSize="9" fill="#7A6A62">thấp</text>
      {props.segs?.map((s, i) => (
        <rect key={i} x={x(s.start)} y={pad} width={Math.max(2, x(s.end) - x(s.start))} height={h - pad * 2} fill="#CBE7F8" opacity="0.4" />
      ))}
      <path d={path(props.refTimes, props.refHz)} fill="none" stroke="#3E8A55" stroke-width="2" />
      {props.userTimes && <path d={path(props.userTimes, props.userHz || [])} fill="none" stroke="#B64E5C" stroke-width="2" />}
      <text x={w - 80} y={12} fontSize="9" fill="#3E8A55">mẫu</text>
      <text x={w - 48} y={12} fontSize="9" fill="#B64E5C">chủ</text>
    </svg>
  );
}

export function Switch(props: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div class="toggle">
      <span>{props.label}</span>
      <button class={cls("sw", props.on && "on")} role="switch" aria-checked={props.on} onClick={() => props.onChange(!props.on)}>
        <i />
      </button>
    </div>
  );
}
