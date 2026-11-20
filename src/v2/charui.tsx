/** v2.2: nút ⭐ chữ khó + «Mẹo nhớ nhanh» (chip mảnh chữ + câu chiết tự). */
import { Fragment } from "preact";
import { useState } from "preact/hooks";
import { cls } from "../ui";
import { isStar, toggleStar } from "./state2";
import { mnemonicFor } from "./mnemo";

export function StarBtn(props: { char: string; small?: boolean }) {
  const on = isStar(props.char);
  return (
    <button class={cls("star-btn", on && "on", props.small && "sm")} data-testid="star-btn" aria-pressed={on} title={on ? "Bỏ đánh dấu chữ khó" : "Đánh dấu chữ khó"}
      onClick={(e) => { e.stopPropagation(); toggleStar(props.char); }}>{on ? "★" : "☆"}<span>{on ? "Chữ khó" : "Khó"}</span></button>
  );
}

export function PartChips(props: { char: string }) {
  const m = mnemonicFor(props.char);
  if (!m || !m.parts.length) return null;
  return (
    <div class="parts" data-testid="part-chips">
      {m.parts.map((p, i) => (
        <Fragment key={p.hz}>
          {i > 0 && <span class="plus">+</span>}
          <span class={cls("part", i === 0 && "is-accent")}>
            <span class="p-hz">{p.hz}</span>
            <span class="p-meta"><b>{p.hv}</b>{p.vi && <span>{p.vi}</span>}</span>
          </span>
        </Fragment>
      ))}
    </div>
  );
}

/** Nút «Mẹo nhớ nhanh»: bấm mới hiện, khỏi rối thẻ. `open` = hiện sẵn (bảng thông tin chữ). */
export function QuickMnemonic(props: { char: string; open?: boolean; chips?: boolean }) {
  const [open, setOpen] = useState(!!props.open);
  const m = mnemonicFor(props.char);
  if (!m) return null;
  return (
    <div class="mnemo" data-testid="mnemo">
      {!props.open && <button class="btn ghost small mnemo-btn" data-testid="mnemo-btn" onClick={() => setOpen(!open)}>💡 Mẹo nhớ nhanh</button>}
      {open && (
        <div class="mnemo-body" data-testid="mnemo-body">
          {props.chips !== false && <PartChips char={props.char} />}
          <p class="note" data-testid="mnemo-line">{m.line}</p>
        </div>
      )}
    </div>
  );
}
