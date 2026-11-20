/** v2.1 — trang bài: 6 mục cố định, mục gợi ý lấp lánh (không làm mờ mục khác). v2.3: Mục 2–5 chỉ cần đánh dấu hoàn thành. */
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { pinyin as toPinyin } from "pinyin-pro";
import { getState } from "../store";
import { audioState, playSequence, stopAudio, toggleAudio } from "../audio";
import { miaoAnswer } from "../v2/miaoBus";
import { PEN_DEFAULT, drawPenStroke, penPt, type PenPt } from "../v2/pen";
import { QuickMnemonic, StarBtn } from "../v2/charui";
import { HANZI_INFO, PART_VI, nhaiHanziUrl } from "../data/hanziInfo";
import { shuffle, v2Items, v2Judge, type Item } from "../gate";
import { gradeSentence, type GradeResult } from "../v2/grader";
import { percent, SEC_ORDER, WEIGHT, type SecId } from "../v2/queue";
import {
  SEC_TITLE, SEC_SHORT, secRule, introText, lesson, nhaiLesson, passageFor, sentTasks, knownChars, NHAI_GENERAL, isExtended, LESSON_COUNT,
} from "../v2/lessons";
import {
  active, addTo, completeSection, currentMode, earned, finishCheck, finishS3, hasPenalty, lessonUnlockedV2, openPenalties, oweSection,
  passPlacement, patchSub, secOf, sentPassed, subOf, recordTest, logSkills,
} from "../v2/state2";
import { Miao, PctBar, SixBar } from "../v2/ui2";
import { SpeakTry } from "../v2/speakTry";
import { AudioBtn, Button, Card, CarrierNote, Switch, cls, go, useAudioSnap } from "../ui";
import { ExamRunner } from "./exam";
import { WriteWord, hanChars } from "./write";

const MODE_VI = { company: "🏢 Công ty", low: "🔋 Cạn pin" } as const;
const py = (zh: string) => toPinyin(zh, { type: "string", nonZh: "consecutive" }) as string;

export function LessonV2(props: { n: number; sec?: string }) {
  const n = Math.max(1, Math.min(LESSON_COUNT, props.n));
  const st = getState();
  const company = st.settings.companyMode;
  const L = lesson(n);
  const sec = secOf(n);
  const act = active(n);
  const mode = currentMode();
  const [open, setOpen] = useState<SecId | null>((props.sec as SecId) || null);
  const [showPy, setShowPy] = useState(true);
  const [placement, setPlacement] = useState(false);
  const u = subOf(n);
  useEffect(() => { if (!u.intro) patchSub(n, { intro: true }); }, [n]);
  useEffect(() => { if (props.sec) setOpen(props.sec as SecId); }, [props.sec]);

  if (!lessonUnlockedV2(n)) {
    return (
      <div class="stack">
        <Card><h2 class="h2">Bài {n} đang khóa</h2><p>Bài mới chỉ mở khi bài trước đạt 100% (hoặc mục còn thiếu đang “nợ” trong hạn tuần này).</p>
          <Button onClick={() => go("/lesson/" + st.v2.lesson)}>Về bài {st.v2.lesson}</Button></Card>
      </div>
    );
  }
  if (placement) return <PlacementRun n={n} onDone={() => setPlacement(false)} />;
  const pct = percent(sec);
  return (
    <div class="stack lesson2" data-testid="lesson2">
      <Card>
        <div class="row spread">
          <div>
            <p class="muted small">{isExtended(n) ? "Từ vựng mở rộng" : "HSK1"} · Bài {n}/{LESSON_COUNT}</p>
            <h2 class="h2" data-testid="lesson-title">{L.titleVi}</h2>
          </div>
          <span class="chip" data-testid="lesson-mode">{mode ? MODE_VI[mode] : "Gợi ý tự động"}</span>
        </div>
        <PctBar pct={pct} />
        <SixBar sec={sec} active={act} onPick={(id) => setOpen(id as SecId)} />
        <p class="muted small" data-testid="suggest-line">✨ Đang gợi ý: {act.length ? act.map((id) => `Mục ${SEC_SHORT[id]}`).join(", ") : "không còn mục nào"}</p>
      </Card>
      <Miao text={introText(n)} />
      {company && <CompanyBar n={n} showPy={showPy} setShowPy={setShowPy} />}
      {SEC_ORDER.map((id) => (
        <Section key={id} n={n} id={id} on={act.includes(id)} open={open === id} setOpen={(v) => setOpen(v ? id : null)} showPy={showPy} />
      ))}
      {pct < 100 && (
        <Card class="dim-card">
          <h3 class="h3">Đã biết bài này rồi?</h3>
          <p class="muted">Thi vượt bài: nghe, đọc, viết từ trí nhớ, nói. Đúng ngay lần đầu ≥ 85% thì cả bài tính xong 100%.</p>
          <Button kind="ghost" id="placement-start" onClick={() => setPlacement(true)}>Thi vượt bài {n}</Button>
        </Card>
      )}
      {pct >= 100 && (
        <Card class="res-pass" data-testid="lesson-done">
          <h3 class="h3">Bài {n} xong 100%.</h3>
          {n < LESSON_COUNT && <Button kind="primary" wide onClick={() => go("/lesson/" + (n + 1))}>Sang bài {n + 1}</Button>}
        </Card>
      )}
    </div>
  );
}

/* ---------------- Chế độ Công ty: tự phát cả bài + ẩn/hiện pinyin ---------------- */
function CompanyBar(props: { n: number; showPy: boolean; setShowPy: (v: boolean) => void }) {
  const a = useAudioSnap();
  const L = lesson(props.n);
  const label = `Bài ${props.n}`;
  const playing = a.status !== "idle" && a.label === label;
  const run = () => { void playSequence([...L.words.map((w) => w.id), ...L.sentences.map((s) => s.id)], 2000, label); };
  useEffect(() => () => { if (audioState().label === label) stopAudio(); }, []);
  return (
    <Card class="company-bar" data-testid="company-bar">
      <div class="row wrap">
        {playing
          ? <><Button small kind="ghost" id="autoplay-pause" onClick={toggleAudio}>{a.status === "paused" ? "▶ Tiếp" : "⏸ Tạm dừng"}</Button><Button small kind="ghost" id="autoplay-stop" onClick={stopAudio}>■ Dừng</Button></>
          : <Button small kind="ghost" id="autoplay-all" onClick={run}>▶ Phát Audio tự động toàn bài</Button>}
        <Button small kind="ghost" id="toggle-pinyin" onClick={() => props.setShowPy(!props.showPy)}>{props.showPy ? "Ẩn Pinyin" : "Hiện Pinyin"}</Button>
      </div>
      <p class="muted small">Từ → câu, cách nhau 2 giây. Chỉ sáng mục im lặng: 2, 3, 6A.</p>
    </Card>
  );
}

/* ---------------- Một mục ---------------- */
function Section(props: { n: number; id: SecId; on: boolean; open: boolean; setOpen: (v: boolean) => void; showPy: boolean }) {
  const { n, id } = props;
  const r = secOf(n)[id];
  const ok = earned(n, id);
  const [skipAsk, setSkipAsk] = useState(false);
  const done = !!r?.done;
  const s1Empty = id === "s1" && !hasPenalty();
  return (
    <section class={cls("card sec", props.on && "sec-on", done && "sec-done", r?.owed && !done && "sec-owed")} data-testid={"sec-" + id} data-active={props.on ? "1" : "0"}>
      <button class="sec-head" onClick={() => props.setOpen(!props.open)} data-testid={"open-" + id}>
        <span class="sec-num">{SEC_SHORT[id]}</span>
        <span class="sec-title">{SEC_TITLE[id]}</span>
        <span class="sec-w muted">{WEIGHT[id]}%</span>
        <span class={cls("chip tiny", done ? "green" : r?.owed ? "warn" : "")}>{done ? "Xong" : r?.owed ? `Nợ · hạn ${r.owed.due.slice(8)}/${r.owed.due.slice(5, 7)}` : s1Empty ? "Không có phạt" : props.on ? "Hôm nay" : "—"}</span>
      </button>
      <p class="sec-rule" data-testid={"rule-" + id}><b>Điều kiện xong:</b> {secRule(id, n)}</p>
      {props.open && (
        <div class="sec-body">
          {id === "s1" && <S1 n={n} />}
          {id === "s2" && <S2 n={n} showPy={props.showPy} />}
          {id === "s3" && <S3 n={n} showPy={props.showPy} />}
          {id === "s4" && <S4 n={n} />}
          {id === "s5" && <S5 n={n} />}
          {(id === "s6a" || id === "s6b") && <S6 n={n} which={id} />}
        </div>
      )}
      {!done && id !== "s1" && (
        <div class="sec-foot">
          <Button kind={ok ? "primary" : "ghost"} disabled={!ok} id={"complete-" + id} onClick={() => completeSection(n, id)}>
            {ok ? "Đánh dấu hoàn thành" : "Đánh dấu hoàn thành (chưa đủ điều kiện)"}
          </Button>
          {!r?.owed && <Button small kind="ghost" id={"skip-" + id} onClick={() => setSkipAsk(!skipAsk)}>Bỏ qua → nợ</Button>}
        </div>
      )}
      {skipAsk && !r?.owed && (
        <div class="skip-ask">
          <p class="muted small">Ghi nợ mục này, phải làm xong trước hết Chủ nhật tuần này. Quá hạn → chép phạt và khóa bài sau.</p>
          {["Mic hỏng / không nói được", "Không có tai nghe", "Bút/tablet không nhạy", "Lý do khác"].map((why) => (
            <Button key={why} small kind="ghost" onClick={() => { oweSection(n, id, why); setSkipAsk(false); }}>{why}</Button>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------- Mục 1: chép phạt trên ô 田 lớn ---------------- */
function S1(props: { n: number }) {
  const pens = openPenalties();
  const chars = useMemo(() => [...new Set(pens.flatMap((p) => p.dueChars.flatMap((w) => hanChars(w))))], [pens.length]);
  const [i, setI] = useState(0);
  const [count, setCount] = useState<Record<string, number>>({});
  const [model, setModel] = useState(true);
  if (!chars.length) return <p class="chip green" data-testid="s1-empty">Không có lỗi phạt, sẵn sàng học bài mới!</p>;
  const need = 3;
  const ch = chars[i % chars.length];
  const allDone = chars.every((c) => (count[c] || 0) >= need);
  return (
    <div data-testid="s1">
      <p>Chép lại các chữ đã sai: <span class="hanzi-inline">{chars.join(" ")}</span> — mỗi chữ {need} lần.</p>
      <p class="muted small">{pens.map((p) => p.reason || p.note).join(" · ")}</p>
      <Switch on={model} label="Hiện chữ mẫu" onChange={setModel} />
      <BigPad key={ch + (count[ch] || 0)} char={ch} model={model} onNext={() => {
        const c = (count[ch] || 0) + 1;
        setCount({ ...count, [ch]: c });
        if (c >= need) setI(i + 1);
      }} />
      <p class="muted">Chữ {ch}: {Math.min(need, count[ch] || 0)}/{need} · {chars.filter((c) => (count[c] || 0) >= need).length}/{chars.length} chữ xong</p>
      <Button kind="primary" wide id="s1-confirm" disabled={!allDone} onClick={() => completeSection(props.n, "s1")}>Xác nhận đã chép phạt xong</Button>
    </div>
  );
}

/** Ô 田 lớn: bút/chuột, bỏ nét, xóa, chữ tiếp. */
function BigPad(props: { char: string; model: boolean; onNext: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<PenPt[][]>([]);
  const cur = useRef<PenPt[] | null>(null);
  const [n, setN] = useState(0);
  const redraw = () => {
    const c = ref.current; if (!c) return;
    const g = c.getContext("2d")!; g.clearRect(0, 0, c.width, c.height);
    const base = c.width * 0.026 * (getState().settings.penWidth ?? PEN_DEFAULT);
    for (const st of cur.current ? [...strokes.current, cur.current] : strokes.current) drawPenStroke(g, st, base, "#2F2430", c.width, c.height); // v2.2: bút máy
  };
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1; const b = c.getBoundingClientRect();
    c.width = Math.max(1, b.width * dpr); c.height = Math.max(1, b.height * dpr);
    const pos = (e: PointerEvent) => penPt(e, c);
    const down = (e: PointerEvent) => { e.preventDefault(); c.setPointerCapture(e.pointerId); cur.current = [pos(e)]; redraw(); };
    const move = (e: PointerEvent) => { if (!cur.current) return; e.preventDefault(); cur.current.push(pos(e)); redraw(); };
    const up = () => { if (cur.current) { strokes.current.push(cur.current); cur.current = null; redraw(); setN(strokes.current.length); } };
    c.addEventListener("pointerdown", down); c.addEventListener("pointermove", move); c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up);
    return () => { c.removeEventListener("pointerdown", down); c.removeEventListener("pointermove", move); c.removeEventListener("pointerup", up); c.removeEventListener("pointercancel", up); };
  }, []);
  return (
    <div class="bigpad">
      <div class="bigpad-box tian">{props.model && <span class="bigpad-model">{props.char}</span>}<canvas ref={ref} data-testid="bigpad" /></div>
      <div class="row">
        <Button small kind="ghost" disabled={!n} onClick={() => { strokes.current.pop(); redraw(); setN(strokes.current.length); }}>↶ Bỏ nét</Button>
        <Button small kind="ghost" disabled={!n} onClick={() => { strokes.current = []; redraw(); setN(0); }}>✕ Xóa</Button>
        <Button small kind="primary" id="bigpad-next" disabled={n < 1} onClick={props.onNext}>Xong lần này → tiếp</Button>
      </div>
    </div>
  );
}

/* ---------------- Mục 2: Nạp từ ---------------- */
function S2(props: { n: number; showPy: boolean }) {
  const n = props.n;
  const L = lesson(n); const u = subOf(n); const nl = nhaiLesson(n);
  const [openW, setOpenW] = useState<string | null>(null);
  const au = useAudioSnap();
  const playing = au.status !== "idle" && au.label === "Hội thoại";
  const seen = L.words.filter((w) => u.vocabSeen.includes(w.id)).length;
  const playDialog = async () => {
    if (await playSequence(L.sentences.map((s) => s.id), 600, "Hội thoại")) patchSub(n, { dialog: true });
  };
  return (
    <div class="stack" data-testid="s2">
      <h4 class="h4">Từ vựng <span class="chip tiny">{seen}/{L.words.length} đã xem</span></h4>
      <div class="vocab-list">
        {L.words.map((w) => (
          <div key={w.id} class={cls("vrow", u.vocabSeen.includes(w.id) && "seen", openW === w.id && "open")} data-testid="vocab-row">
            <button class="vrow-head" data-testid="vocab-word" onClick={(ev) => {
              const row = (ev.currentTarget as HTMLElement).closest(".vrow") as HTMLElement | null;
              const next = openW === w.id ? null : w.id;
              setOpenW(next);
              addTo(n, "vocabSeen", w.id);
              if (next && row) {
                // Đợi layout xổ ra (2 cột tablet dễ đẩy hàng sang chỗ khác) rồi kéo đúng từ đang mở vào khung nhìn.
                requestAnimationFrame(() => requestAnimationFrame(() => {
                  row.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
                }));
              }
            }}>
              <span class="hanzi xs">{w.hanzi}</span>
              {props.showPy && <span class="py">{w.pinyin}</span>}
              <span class="vi">{w.vi}</span>
            </button>
            {openW === w.id && (
              <div class="vrow-body">
                <AudioBtn id={w.id} /> <AudioBtn id={w.id} slow />
                <CarrierNote id={w.id} />
                <div class="decomp">
                  {hanChars(w.hanzi).map((c) => {
                    const h = HANZI_INFO[c];
                    return (
                      <div class="part" key={c} data-testid="hanzi-info">
                        <div><span class="hanzi xs">{c}</span> <b>{h?.hv || ""}</b> {h?.parts?.length ? <span class="muted">= {h.parts.map((p) => `${p}${PART_VI[p] ? ` (${PART_VI[p]})` : ""}`).join(" + ")}</span> : null}</div>
                        {h?.note && <div class="small">{h.note}</div>}
                        <div class="row char-acts"><StarBtn char={c} small /><a class="small" href={nhaiHanziUrl(c)} target="_blank" rel="noreferrer">Chữ {c} trên Nhai ↗</a></div>
                        <QuickMnemonic char={c} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <h4 class="h4">Hội thoại / câu mẫu {u.dialog && <span class="chip green tiny">đã nghe</span>}</h4>
      <ol class="dialog">
        {L.sentences.map((s) => <li key={s.id}><span class="hanzi-inline">{s.hanzi}</span> {props.showPy && <span class="py">{s.pinyin}</span>} <span class="muted">{s.vi}</span> <AudioBtn id={s.id} /></li>)}
      </ol>
      {playing ? <Button kind="blue" id="play-dialog" onClick={stopAudio}>■ Dừng hội thoại</Button> : <Button kind="blue" id="play-dialog" onClick={playDialog}>▶ Nghe cả hội thoại</Button>}
      {!getState().settings.companyMode || true ? (
        <div class="video-card" data-testid="video-card">
          <a class="btn primary wide" href={nl?.vocabUrl || NHAI_GENERAL.vocab} target="_blank" rel="noreferrer" id="video-link" onClick={() => patchSub(n, { videoOpened: true })}>📺 Xem video bài giảng chi tiết tại NhaiHSK</a>
          <p class="muted small">Mở trang bài {n} trên Nhai ({(nl?.vocabUrl || NHAI_GENERAL.vocab).replace("https://", "")}). Nhai không công khai link riêng cho từng video, nên Miaozi dẫn tới đúng trang bài.</p>
          <label class={cls("check", !u.videoOpened && "disabled")}>
            <input type="checkbox" id="video-done" checked={!!u.videoDone} disabled={!u.videoOpened} onChange={(e) => patchSub(n, { videoDone: (e.target as HTMLInputElement).checked })} />
            Đã xem xong video bài giảng {!u.videoOpened && <span class="muted small">(mở link trước)</span>}
          </label>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- Mục 3: Ngữ pháp & đọc hiểu ---------------- */
function S3(props: { n: number; showPy: boolean }) {
  const n = props.n;
  const nl = nhaiLesson(n); const P = passageFor(n); const L = lesson(n); const u = subOf(n);
  const [showVi, setShowVi] = useState(false);
  const qs = useMemo(() => {
    const vocab = shuffle(L.words).slice(0, 2).map((w) => {
      const opts = shuffle([w.vi, ...shuffle(L.words.filter((x) => x.id !== w.id && x.vi !== w.vi)).slice(0, 3).map((x) => x.vi)]);
      return { q: `“${w.hanzi}” nghĩa là gì?`, opts, a: opts.indexOf(w.vi) };
    });
    return [...P.qs, ...vocab];
  }, [n, u.s3?.at]);
  const [ans, setAns] = useState<Record<number, number>>({});
  const [result, setResult] = useState<number | null>(null);
  return (
    <div class="stack" data-testid="s3">
      <h4 class="h4">Ngữ pháp trọng tâm (học trên Nhai)</h4>
      {nl?.patterns?.length ? (
        <ul class="links">{nl.patterns.map((p) => <li key={p.url}><a href={p.url} target="_blank" rel="noreferrer">{p.name}</a> <span class="muted small">{p.explain}</span></li>)}</ul>
      ) : <p class="muted small">Bài này Nhai không có trang ngữ pháp riêng{isExtended(n) ? " (bài từ vựng mở rộng)" : ""} — dùng mục ngữ pháp chung.</p>}
      <a class="btn ghost small" href={nl?.grammarUrl || NHAI_GENERAL.grammar} target="_blank" rel="noreferrer">{nl?.grammarUrl ? `Ngữ pháp bài ${n} trên Nhai ↗` : "Ngữ pháp HSK1 trên Nhai ↗"}</a>
      <h4 class="h4">Đọc hiểu: {P.title}</h4>
      <div class="passage" data-testid="passage">
        {P.zh.map((line, i) => <p key={i}><span class="hanzi-inline">{line}</span>{props.showPy && <><br /><span class="py small">{py(line)}</span></>}</p>)}
      </div>
      <Button small kind="ghost" onClick={() => setShowVi(!showVi)}>{showVi ? "Ẩn bản dịch" : "Xem bản dịch (sau khi làm bài)"}</Button>
      {showVi && <p class="muted">{P.vi}</p>}
      <h4 class="h4">5 câu trắc nghiệm {u.s3 && <span class="chip green tiny">đã đạt {u.s3.score}/5</span>}</h4>
      {(

        <>
          {qs.map((q, i) => (
            <div key={i} class="mcq" data-testid="s3-q">
              <p>{i + 1}. {q.q}</p>
              <div class="opts">{q.opts.map((o, k) => (
                <button key={k} class={cls("opt", ans[i] === k && "sel", result !== null && k === q.a && "ok", result !== null && ans[i] === k && k !== q.a && "bad")} disabled={result !== null} onClick={() => setAns({ ...ans, [i]: k })}>{o}</button>
              ))}</div>
            </div>
          ))}
          {result === null
            ? <Button kind="primary" id="s3-submit" disabled={Object.keys(ans).length < qs.length} onClick={() => { const sc = qs.filter((q, i) => ans[i] === q.a).length; qs.forEach((q, i) => miaoAnswer(ans[i] === q.a)); setResult(sc); finishS3(n, sc); }}>Nộp bài</Button>
            : <div class="row"><p class={result >= 4 ? "chip green" : "bad-text"} data-testid="s3-result">{result}/5 — {result >= 4 ? "Đạt." : "Chưa đạt (cần 4/5). Đọc lại bài rồi làm lại ngay."}</p>
                {result < 4 && <Button small kind="ghost" id="s3-retry" onClick={() => { setAns({}); setResult(null); }}>Làm lại ngay</Button>}</div>}
        </>
      )}
    </div>
  );
}

/* ---------------- Mục 4: viết + đặt câu ---------------- */
function S4(props: { n: number }) {
  const n = props.n; const L = lesson(n); const u = subOf(n);
  const ws = getState().v2.write;
  const firstTodo = Math.max(0, L.words.findIndex((w) => !u.written.includes(w.id)));
  const [i, setI] = useState(firstTodo);
  const [hide, setHide] = useState(ws.hide);
  const w = L.words[i];
  const tasks = sentTasks(n);
  const known = useMemo(() => knownChars(n), [n]);
  return (
    <div class="stack" data-testid="s4">
      <h4 class="h4">A. Viết theo nét <span class="chip tiny">{L.words.filter((x) => u.written.includes(x.id)).length}/{L.words.length}</span></h4>
      <div class="chips-row">{L.words.map((x, k) => <button key={x.id} class={cls("chip", u.written.includes(x.id) && "green", k === i && "on")} onClick={() => setI(k)}>{x.hanzi}</button>)}</div>
      <Switch on={hide} label="Ẩn nét mẫu" onChange={setHide} />
      {w && (
        <div>
          <p><strong>{w.vi}</strong> <span class="muted">{w.pinyin}</span> <AudioBtn id={w.id} /></p>
          <WriteWord key={w.id + (hide ? "h" : "")} word={w} hideOutline={hide} onDone={(ok) => { if (ok) { addTo(n, "written", w.id); const nx = L.words.findIndex((x, k) => k > i && !subOf(n).written.includes(x.id)); if (nx >= 0) setTimeout(() => setI(nx), 600); } }} />
        </div>
      )}
      <h4 class="h4">B. Đặt câu — Miao chấm <span class="chip tiny">{u.sentOk.length}/3</span></h4>
      {tasks.map((t, k) => <SentBox key={k} n={n} k={k} task={t} known={known} passed={u.sentOk.includes(k)} prev={u.sentText?.[k]} />)}
    </div>
  );
}

function SentBox(props: { n: number; k: number; task: ReturnType<typeof sentTasks>[number]; known: Set<string>; passed: boolean; prev?: string }) {
  const [text, setText] = useState(props.prev || "");
  const [res, setRes] = useState<GradeResult | null>(null);
  const [ex, setEx] = useState(false);
  return (
    <div class={cls("sentbox", props.passed && "ok")} data-testid="sentbox">
      <p><b>Câu {props.k + 1}.</b> {props.task.hint} <span class="muted">Từ bắt buộc: <span class="hanzi-inline">{props.task.keys.join("、")}</span></span></p>
      <input class="input" value={text} placeholder="Gõ câu bằng chữ Hán…" onInput={(e) => setText((e.target as HTMLInputElement).value)} data-testid="sent-input" />
      <div class="row">
        <Button small kind="primary" class="grade-btn" onClick={() => { const r = gradeSentence(text, props.task, props.known); setRes(r); miaoAnswer(r.pass); if (r.pass) sentPassed(props.n, props.k, text); }}>Chấm điểm câu</Button>
        <Button small kind="ghost" onClick={() => setEx(!ex)}>Câu mẫu</Button>
        {props.passed && <span class="chip green tiny">Đạt</span>}
      </div>
      {ex && <p class="muted small">Ví dụ: <span class="hanzi-inline">{props.task.example}</span></p>}
      {res && (
        <div class="grade" data-testid="grade-res">
          <p class={res.pass ? "ok-text" : "bad-text"}><b>{res.pass ? "Đạt" : "Chưa đạt"}</b></p>
          {res.bad.map((b, i) => <p key={"b" + i} class="bad-text small">✗ {b}</p>)}
          {res.ok.map((b, i) => <p key={"o" + i} class="ok-text small">✓ {b}</p>)}
          {res.tips.map((b, i) => <p key={"t" + i} class="muted small">• {b}</p>)}
        </div>
      )}
    </div>
  );
}

/* ---------------- Mục 5: nói ---------------- */
function S5(props: { n: number }) {
  const n = props.n; const L = lesson(n); const u = subOf(n);
  return (
    <div class="stack" data-testid="s5">
      <p class="muted">Nghe giọng chuẩn, rồi bấm mic và đọc. Nếu không thu âm được, bấm “Bỏ qua” ở câu đó. <span class="chip tiny">{L.sentences.filter((s) => u.spoken.includes(s.id)).length}/{L.sentences.length}</span></p>
      {L.sentences.map((s) => (
        <div key={s.id} class={cls("speak-row", u.spoken.includes(s.id) && "ok")} data-testid="speak-row">
          <p><span class="hanzi-inline">{s.hanzi}</span> <span class="py">{s.pinyin}</span> <span class="muted">{s.vi}</span></p>
          <div class="row"><AudioBtn id={s.id} label="Giọng chuẩn" /><AudioBtn id={s.id} slow />{u.spoken.includes(s.id) && <span class="chip green tiny">Đạt</span>}</div>
          <SpeakTry expected={s.hanzi} onScore={(sc) => { if (sc.pass) addTo(n, "spoken", s.id); }} />
        </div>
      ))}
    </div>
  );
}

/* ---------------- Mục 6A / 6B ---------------- */
function S6(props: { n: number; which: "s6a" | "s6b" }) {
  const { n, which } = props;
  const [items, setItems] = useState<Item[] | null>(null);
  const [out, setOut] = useState<null | { pass: boolean; first: number; total: number; wrong: string[] }>(null);
  const u = subOf(n);
  const rec = u[which];
  const title = which === "s6a" ? `Kiểm tra 6A — bài ${n}` : `Kiểm tra 6B — bài ${n}`;
  if (items) {
    return <ExamRunner items={items} title={title} onFinish={(o) => {
      const j = v2Judge(o.items, o.firstOk);
      logSkills(which, o.items, o.firstOk);
      finishCheck(n, which, j.pass, j.score, j.wrong.map((i) => ({ hanzi: i.answerHanzi, wordId: i.wordId })));
      setOut({ pass: j.pass, first: j.first, total: j.total, wrong: j.wrong.map((i) => i.answerHanzi) });
      setItems(null);
    }} />;
  }
  return (
    <div class="stack" data-testid={which}>
      <p class="muted">{which === "s6a" ? "Nghe chọn chữ, nhìn chữ chọn nghĩa (không pinyin), ghép câu. Có giờ, chỉ nghe tối đa 2–3 lần." : "Viết từ trí nhớ (không nét mờ, sai tối đa 5 nét/chữ), nói từ và câu chỉ nhìn tiếng Việt."}</p>
      {rec && <p class={rec.pass ? "chip green" : "bad-text"}>Lần gần nhất: {Math.round(rec.score * 100)}% — {rec.pass ? "đạt" : "trượt"}</p>}
      {out && (
        <div class={out.pass ? "res-pass card" : "res-fail card"} data-testid="s6-result">
          <b>{out.pass ? "ĐẠT" : "TRƯỢT"}</b> — đúng ngay lần đầu {out.first}/{out.total}.
          {out.wrong.length > 0 && <p class="small">Chữ sai → chép phạt ở Mục 1: <span class="hanzi-inline">{[...new Set(out.wrong)].join(" ")}</span></p>}
        </div>
      )}
      {<Button kind="primary" id={"start-" + which} onClick={() => { setOut(null); setItems(v2Items(which, n, getState().mistakes.map((m) => m.wordId || ""))); }}>{rec ? "Thi lại" : "Bắt đầu"}</Button>}
    </div>
  );
}

/* ---------------- Thi vượt bài ---------------- */
function PlacementRun(props: { n: number; onDone: () => void }) {
  const items = useMemo(() => v2Items("placement", props.n), [props.n]);
  const [out, setOut] = useState<null | { pass: boolean; first: number; total: number }>(null);
  if (out) return (
    <Card class={out.pass ? "res-pass" : "res-fail"} data-testid="placement-result">
      <h2 class="h2">{out.pass ? "ĐẠT — bài tính xong 100%" : "TRƯỢT — học bài bình thường"}</h2>
      <p>Đúng ngay lần đầu {out.first}/{out.total} (cần ≥ 85%).</p>
      <Button kind="primary" onClick={props.onDone}>Về bài</Button>
    </Card>
  );
  return <ExamRunner items={items} title={`Thi vượt bài ${props.n}`} onFinish={(o) => {
    const j = v2Judge(o.items, o.firstOk, 0.85);
    if (j.pass) passPlacement(props.n, j.score); else recordTest(`placement:${props.n}`, false, j.score);
    setOut({ pass: j.pass, first: j.first, total: j.total });
  }} />;
}
