/** v2.2 — Ôn bộ thủ (≈50 bộ hay gặp ở HSK1, đếm từ Make Me a Hanzi) + danh sách chữ khó ⭐. Tải lười. */
import { useEffect, useMemo, useState } from "preact/hooks";
import { RADICALS, type Radical } from "../data/radicals";
import { HANZI_INFO } from "../data/hanziInfo";
import { face, makeQuiz, type RadQ as Q } from "../v2/radQuiz";
import { getState } from "../store";
import { dueCards } from "../srs";
import { radQuizLog, radReview, starList, toggleStar } from "../v2/state2";
import { miaoAnswer } from "../v2/miaoBus";
import { mnemonicFor } from "../v2/mnemo";
import { Button, Card, cls, go } from "../ui";
import { setWork } from "../v2/leaveGuard";

const BY_K = Object.fromEntries(RADICALS.map((r) => [r.k, r]));
const learned = () => RADICALS.filter((r) => (getState().v2.rad?.[r.k]?.reps || 0) >= 1).length;

export function RadicalsPage(props: { tab?: string }) {
  const tab = props.tab === "cards" || props.tab === "quiz" ? props.tab : "list";
  const q = getState().v2.radQuiz || { right: 0, total: 0, days: [] };
  return (
    <div class="stack" data-testid="radicals">
      <Card>
        <div class="row spread"><h2 class="h2">Ôn bộ thủ</h2><span class="chip pink" data-testid="rad-progress">Đã thuộc {learned()}/{RADICALS.length}</span></div>
        <p class="muted small">{RADICALS.length} bộ hay gặp nhất trong chữ HSK1{q.total ? ` · trắc nghiệm đúng ${Math.round((q.right / q.total) * 100)}% (${q.total} câu)` : ""}</p>
        <div class="seg-tabs">
          <button class={cls(tab === "list" && "on")} onClick={() => go("/radicals")} data-testid="rad-tab-list">Danh sách</button>
          <button class={cls(tab === "cards" && "on")} onClick={() => go("/radicals/cards")} data-testid="rad-tab-cards">Thẻ ôn</button>
          <button class={cls(tab === "quiz" && "on")} onClick={() => go("/radicals/quiz")} data-testid="rad-tab-quiz">Trắc nghiệm</button>
        </div>
      </Card>
      {tab === "list" && <RadList />}
      {tab === "cards" && <RadCards />}
      {tab === "quiz" && <RadQuiz />}
    </div>
  );
}

function RadList() {
  const [open, setOpen] = useState<string | null>(null);
  const rad = getState().v2.rad || {};
  return (
    <>
      <div class="rad-grid" data-testid="rad-list">
        {RADICALS.map((r) => (
          <button key={r.k} class={cls("rad-tile", (rad[r.k]?.reps || 0) >= 1 && "done", open === r.k && "on")} onClick={() => setOpen(open === r.k ? null : r.k)} data-testid="rad-tile">
            <span class="rt-hz">{r.f}</span><span class="rt-hv">{r.hv}</span>
          </button>
        ))}
      </div>
      {open && <RadDetail r={BY_K[open]} />}
      <a class="btn ghost small" href="https://nhaihsk.com/radicals" target="_blank" rel="noreferrer">Đủ 214 bộ trên Nhai ↗</a>
    </>
  );
}

function RadDetail(props: { r: Radical }) {
  const r = props.r;
  return (
    <Card class="rad-detail">
      <div class="row"><span class="rd-hz">{face(r)}</span><div><b>Bộ {r.hv}</b><div class="muted">{r.vi} · gặp {r.n} lần trong HSK1</div></div></div>
      <div class="rad-ex">{r.ex.slice(0, 10).map((c) => <span key={c} class="chip"><span class="hanzi-inline">{c}</span> {HANZI_INFO[c]?.hv || ""}</span>)}</div>
    </Card>
  );
}

function RadCards() {
  const all = getState().v2.rad || {};
  const queue = useMemo(() => {
    const due = dueCards(all).map((c) => c.id).filter((k) => BY_K[k]);
    const fresh = RADICALS.filter((r) => !all[r.k]).slice(0, 10).map((r) => r.k);
    return [...due, ...fresh];
  }, []);
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const r = BY_K[queue[i]];
  if (!r) return <Card data-testid="rad-cards-done"><p>Hết thẻ đến hạn hôm nay. Mai ôn tiếp, hoặc làm trắc nghiệm.</p><Button kind="pink" onClick={() => go("/radicals/quiz")}>Làm trắc nghiệm</Button></Card>;
  const grade = (q: number) => { radReview(r.k, q); setFlip(false); setI(i + 1); };
  return (
    <Card class="rad-card" data-testid="rad-card">
      <p class="muted small">Thẻ {i + 1}/{queue.length}</p>
      <button class="rc-face" onClick={() => setFlip(true)} data-testid="rad-flip">
        <span class="rc-hz">{face(r)}</span>
        {flip ? <span class="rc-back"><b>Bộ {r.hv}</b> — {r.vi}<br /><span class="hanzi-inline">{r.ex.slice(0, 6).join(" ")}</span></span> : <span class="muted">Bộ gì, nghĩa là gì? Chạm để lật</span>}
      </button>
      {flip && <div class="grid cols-4 rc-grades">
        <Button kind="pink" onClick={() => grade(0)}>Lại</Button><Button kind="ghost" onClick={() => grade(2)}>Khó</Button>
        <Button kind="blue" onClick={() => grade(3)} id="rad-good">Tốt</Button><Button kind="ghost" onClick={() => grade(5)}>Dễ</Button>
      </div>}
    </Card>
  );
}

function RadQuiz() {
  const [qs, setQs] = useState(() => makeQuiz());
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const q = qs[i];
  const started = i > 0 || pick !== null || right > 0;
  useEffect(() => {
    setWork("rad-quiz", !!q && started);
    return () => setWork("rad-quiz", false);
  }, [!!q, started]);
  if (!q) return (
    <Card data-testid="rad-quiz-done"><h3 class="h3">Xong: đúng {right}/{qs.length}</h3>
      <Button kind="pink" onClick={() => { setQs(makeQuiz()); setI(0); setRight(0); setPick(null); }}>Làm lượt mới</Button></Card>
  );
  const answer = (o: string) => {
    if (pick) return;
    const ok = o === q.ans;
    setPick(o); if (ok) setRight(right + 1);
    miaoAnswer(ok); radQuizLog(ok);
    if (!ok) radReview(q.r.k, 0);
  };
  return (
    <Card class="rad-quiz" data-testid="rad-quiz">
      <p class="muted small">Câu {i + 1}/{qs.length}</p>
      <p class="exam-prompt" data-testid="rad-q" data-kind={q.kind}>{q.prompt}</p>
      <div class="rq-show hanzi">{q.show}</div>
      {q.hint && <p class="muted small rq-hint" data-testid="rad-hint">{q.hint}</p>}
      <div class="opts cols-2">{q.opts.map((o) => (
        <button key={o} class={cls("opt", q.kind !== "meaning" && "opt-hz", pick && o === q.ans && "ok", pick === o && o !== q.ans && "bad")} data-testid="rad-opt" data-ok={o === q.ans ? "1" : "0"} disabled={!!pick} onClick={() => answer(o)}>{o}</button>
      ))}</div>
      {pick && <div class="row spread rq-foot"><span class={pick === q.ans ? "ok-text" : "bad-text"}>{pick === q.ans ? "Đúng" : `Đáp án: ${q.ans}`} · bộ {q.r.f} {q.r.hv} — {q.r.vi}</span>
        <Button kind="blue" id="rad-next" onClick={() => { setI(i + 1); setPick(null); }}>Tiếp</Button></div>}
    </Card>
  );
}

/* ---------------- Chữ khó ⭐ ---------------- */
export function HardCharsPage() {
  const list = starList();
  const [msg, setMsg] = useState("");
  const text = list.map((c) => { const m = mnemonicFor(c); return m ? `${c} (${m.hv})${m.gloss ? " – " + m.gloss : ""}` : c; }).join("\n");
  const copy = async () => {
    const all = `Chữ khó cần mẹo nhớ (${list.length}):\n${text}`;
    try { await navigator.clipboard.writeText(all); setMsg("Đã chép danh sách."); }
    catch { const t = document.createElement("textarea"); t.value = all; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); setMsg("Đã chép danh sách."); }
  };
  return (
    <div class="stack" data-testid="hard-chars">
      <Card>
        <div class="row spread"><h2 class="h2">⭐ Chữ khó</h2><span class="chip pink">{list.length} chữ</span></div>
        <p class="muted small">Chữ đánh dấu ⭐ sẽ được ôn nhiều hơn. Gửi danh sách này để Miao viết mẹo nhớ riêng.</p>
        <Button kind="pink" id="copy-hard" disabled={!list.length} onClick={() => void copy()}>Sao chép danh sách</Button>
        {msg && <p class="ok-text small" data-testid="copy-msg">{msg}</p>}
      </Card>
      {list.length === 0 ? <Card><p class="muted">Chưa có chữ nào. Bấm ☆ trên thẻ chữ (trang Viết, Mục 2) để đánh dấu.</p></Card> : (
        <Card>
          <div class="hard-list">{list.map((c) => { const m = mnemonicFor(c); return (
            <div key={c} class="hard-row" data-testid="hard-row">
              <span class="hz-big hanzi">{c}</span>
              <div class="hr-body"><b>{m?.hv}</b> {m?.gloss && <span class="muted">– {m.gloss}</span>}<p class="small">{m?.line}</p></div>
              <button class="star-btn on sm" onClick={() => toggleStar(c)} title="Bỏ đánh dấu">★</button>
            </div>
          ); })}</div>
        </Card>
      )}
    </div>
  );
}
