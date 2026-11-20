/** Bài thi chặt: cổng 4 kỹ năng, kiểm tra cuối ca, kiểm tra tuần. */
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import HanziWriter from "hanzi-writer";
import { usePenInk } from "../v2/pen";
import { miaoAnswer } from "../v2/miaoBus";
import { LESSONS, WORD_BY_ID } from "../data/curriculum";
import { playId } from "../audio";
import { speechAvailable } from "../speech";
import { SpeakTry } from "../v2/speakTry";
import { GSKILLS, SKILL_VI, checkItems, gateItems, judge, type GSkill, type Item, type SkillResult } from "../gate";
import {
  abandonGate, addMistake, checkRec, completeSessionCheck, finishGate, gateBlockedUntil, gateRec, gateWritePenalty,
  getState, lessonUnlocked, markWeekDone, noteInput, startGate, unitPassed,
} from "../store";
import { NHAI, nhaiUnitLink } from "../nhai";
import { Bar, Button, Card, TutorBubble, cls, go } from "../ui";
import { tutorLine } from "../tutor";
import { hanChars, loadCharData } from "./write";

const fmtDate = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

/* =================== Bộ chạy bài thi =================== */

export interface ExamOutcome { items: Item[]; firstOk: Record<string, boolean>; finalOk: Record<string, boolean> }

export function ExamRunner(props: { items: Item[]; title: string; onFinish: (o: ExamOutcome) => void }) {
  const items = props.items;
  const byKey = useMemo(() => Object.fromEntries(items.map((i) => [i.key, i])), [items]);
  const [queue, setQueue] = useState<string[]>(() => items.map((i) => i.key));
  const [pos, setPos] = useState(0);
  const firstOk = useRef<Record<string, boolean>>({});
  const finalOk = useRef<Record<string, boolean>>({});
  const tries = useRef<Record<string, number>>({});
  const [fb, setFb] = useState<null | { ok: boolean; item: Item; detail: string; until: number }>(null);
  const [, force] = useState(0);
  const key = queue[pos];
  const item = key ? byKey[key] : undefined;
  const doneCount = Object.keys(finalOk.current).length;

  useEffect(() => {
    if (!item && pos >= queue.length) props.onFinish({ items, firstOk: firstOk.current, finalOk: finalOk.current });
  }, [pos, queue.length]);
  useEffect(() => {
    if (!fb) return;
    const t = setInterval(() => force((x) => x + 1), 250);
    return () => clearInterval(t);
  }, [fb]);

  const answer = (ok: boolean, detail = "") => {
    if (!item) return;
    noteInput();
    const k = item.key;
    const n = (tries.current[k] || 0) + 1;
    tries.current[k] = n;
    if (!(k in firstOk.current)) firstOk.current[k] = ok;
    miaoAnswer(ok);
    if (ok) {
      finalOk.current[k] = true;
      setPos((p) => p + 1);
      return;
    }
    if (item.wordId && WORD_BY_ID[item.wordId]) addMistake(WORD_BY_ID[item.wordId], "thi " + SKILL_VI[item.skill].toLowerCase(), detail);
    if (n >= 2) finalOk.current[k] = false;
    else {
      // Không cho làm lại ngay: đẩy về sau ít nhất 3 câu.
      setQueue((q) => { const x = [...q]; x.splice(Math.min(x.length, pos + 4), 0, k); return x; });
    }
    setFb({ ok: false, item, detail, until: Date.now() + 3500 });
  };

  if (!item) return <Card><p>Đang chấm…</p></Card>;
  const total = items.length;
  return (
    <div class="stack" data-testid="exam">
      <Card>
        <div class="row spread">
          <h2 class="h3">{props.title}</h2>
          <span class="chip">{Math.min(doneCount + 1, total)}/{total}{queue.length > total ? ` · +${queue.length - total} câu làm lại` : ""}</span>
        </div>
        <Bar value={doneCount / total} />
        <div class="row spread" style={{ marginTop: 6 }}>
          <span class={cls("chip tiny", "skill-" + item.skill)}>{SKILL_VI[item.skill]}</span>
          {item.recheck && <span class="chip tiny warn">Ôn bài cũ</span>}
          {(tries.current[item.key] || 0) > 0 && <span class="chip tiny warn">Làm lại lần cuối</span>}
        </div>
      </Card>
      {fb ? (
        <Card class="exam-fb" data-testid="exam-feedback">
          <h3 class="h3 bad-text">{fb.detail || "Sai."}</h3>
          <p class="muted">Đáp án đúng:</p>
          <div class="hanzi" style={{ textAlign: "center" }}>{fb.item.answerHanzi}</div>
          <p style={{ textAlign: "center" }}>{fb.item.vi}</p>
          {fb.item.audio && <div class="tools"><Button small kind="blue" onClick={() => void playId(fb.item.audio!).catch(() => {})}>Nghe đáp án</Button></div>}
          <p class="muted">{(tries.current[fb.item.key] || 0) >= 2 ? "Sai lần thứ hai — câu này bị tính trượt." : "Câu này sẽ quay lại sau vài câu nữa. Lần đầu sai không được tính điểm."}</p>
          <Button wide kind="primary" id="exam-next" disabled={Date.now() < fb.until} onClick={() => { setFb(null); setPos((p) => p + 1); }}>
            {Date.now() < fb.until ? `Đọc kỹ đáp án… ${Math.ceil((fb.until - Date.now()) / 1000)}` : "Câu tiếp"}
          </Button>
        </Card>
      ) : (
        <ItemView key={item.key + ":" + (tries.current[item.key] || 0)} item={item} onAnswer={answer} />
      )}
    </div>
  );
}

function Timer(props: { secs: number; onTimeout: () => void }) {
  const [left, setLeft] = useState(props.secs);
  const fired = useRef(false);
  useEffect(() => {
    const t0 = Date.now();
    const t = setInterval(() => {
      const l = props.secs - (Date.now() - t0) / 1000;
      setLeft(l);
      if (l <= 0 && !fired.current) { fired.current = true; clearInterval(t); props.onTimeout(); }
    }, 200);
    return () => clearInterval(t);
  }, []);
  return (
    <div class="timer" data-testid="timer">
      <div class={cls("timer-bar", left < 5 && "low")} style={{ width: Math.max(0, (left / props.secs) * 100) + "%" }} />
      <span class="muted">{Math.max(0, Math.ceil(left))} giây</span>
    </div>
  );
}

/** Nút nghe có giới hạn số lần (bài thi). */
function LimitedAudio(props: { id: string; max: number; auto?: boolean }) {
  const [used, setUsed] = useState(0);
  const play = () => { setUsed((u) => u + 1); void playId(props.id).catch(() => {}); };
  useEffect(() => { if (props.auto) { const t = setTimeout(play, 300); return () => clearTimeout(t); } }, []);
  return (
    <Button small kind="blue" disabled={used >= props.max} onClick={play}>
      Nghe ({Math.max(0, props.max - used)} lần còn lại)
    </Button>
  );
}

function ItemView(props: { item: Item; onAnswer: (ok: boolean, detail?: string) => void }) {
  const it = props.item;
  if (it.t === "pick") return <PickView item={it} onAnswer={props.onAnswer} />;
  if (it.t === "build") return <BuildView item={it} onAnswer={props.onAnswer} />;
  if (it.t === "write") return <WriteView item={it} onAnswer={props.onAnswer} />;
  return <SpeakView item={it} onAnswer={props.onAnswer} />;
}

function PickView(props: { item: Extract<Item, { t: "pick" }>; onAnswer: (ok: boolean, d?: string) => void }) {
  const it = props.item;
  const [locked, setLocked] = useState(false);
  const done = (ok: boolean, d?: string) => { if (locked) return; setLocked(true); props.onAnswer(ok, d); };
  return (
    <Card data-testid="exam-pick">
      <Timer secs={it.secs} onTimeout={() => done(false, "Hết giờ.")} />
      <p>{it.prompt}</p>
      {it.show && <div class="hanzi exam-show" data-testid="exam-show">{it.show}</div>}
      {it.audio && <div class="tools"><LimitedAudio id={it.audio} max={2} auto /></div>}
      <div class={cls("opts", it.options[0]?.hanzi && "hanzi-opts")}>
        {it.options.map((o) => (
          <button class="opt" key={o.id} data-testid="exam-opt" disabled={locked} onClick={() => done(o.id === it.answer, o.id === it.answer ? "" : `Sai: bạn chọn ${o.hanzi || o.text}.`)}>
            {o.hanzi ? <span class="hanzi xs">{o.hanzi}</span> : o.text}
          </button>
        ))}
      </div>
    </Card>
  );
}

function BuildView(props: { item: Extract<Item, { t: "build" }>; onAnswer: (ok: boolean, d?: string) => void }) {
  const it = props.item;
  const [sel, setSel] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const done = (ok: boolean, d?: string) => { if (locked) return; setLocked(true); props.onAnswer(ok, d); };
  const submit = () => {
    const got = sel.map((i) => it.chunks[i]).join("");
    const ok = got === it.answer.join("");
    done(ok, ok ? "" : `Sai: bạn ghép “${got || "(trống)"}”.`);
  };
  return (
    <Card data-testid="exam-build">
      <Timer secs={it.secs} onTimeout={() => done(false, "Hết giờ.")} />
      <p>{it.prompt}</p>
      {it.audio && <div class="tools"><LimitedAudio id={it.audio} max={3} auto /></div>}
      <div class="build-line" data-testid="build-line">
        {sel.length === 0 && <span class="muted">Chạm các mảnh bên dưới theo đúng thứ tự…</span>}
        {sel.map((i, k) => <button key={k} class="chunk on" onClick={() => setSel(sel.filter((_, j) => j !== k))}>{it.chunks[i]}</button>)}
      </div>
      <div class="chunks">
        {it.chunks.map((c, i) => (
          <button key={i} class="chunk" data-testid="chunk" disabled={sel.includes(i) || locked} onClick={() => setSel([...sel, i])}>{c}</button>
        ))}
      </div>
      <Button wide kind="primary" id="build-submit" disabled={!sel.length || locked} onClick={submit}>Nộp</Button>
    </Card>
  );
}

/** Viết từ trí nhớ: không nét mờ, không gợi ý, không xem mẫu. Sai quá 5 nét ở một chữ = trượt câu (bút tablet đôi khi không nhạy). */
export const MAX_MISS = 5;
function WriteView(props: { item: Extract<Item, { t: "write" }>; onAnswer: (ok: boolean, d?: string) => void }) {
  const it = props.item;
  const chars = hanChars(it.word.hanzi);
  const [k, setK] = useState(0);
  const [miss, setMiss] = useState(0);
  const [locked, setLocked] = useState(false);
  const [round, setRound] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const ink = useRef<HTMLCanvasElement>(null);
  const startAt = useRef(0), strokeN = useRef(0), missR = useRef(0);
  const [size] = useState(() => (window.innerWidth >= 768 ? 360 : Math.min(280, window.innerWidth - 72)));
  // v2.2: mực bút máy (độ dày theo Cài đặt) + Hoàn tác như trang Viết; chấm nét vẫn do hanzi-writer (sai > 5 nét/chữ = trượt).
  const pen = usePenInk(host, ink, !locked, getState().settings.penWidth, [k, round]);
  const done = (ok: boolean, d?: string) => { if (locked) return; setLocked(true); props.onAnswer(ok, d); };
  useEffect(() => {
    const el = host.current?.querySelector(".hw-svg") as HTMLDivElement | null;
    if (!el || locked) return;
    el.innerHTML = "";
    let writer: ReturnType<typeof HanziWriter.create> | null = null;
    let cancelled = false;
    if (!startAt.current) { missR.current = 0; setMiss(0); pen.clear(); }
    pen.reject(); strokeN.current = startAt.current; setCanUndo(startAt.current > 0);
    (async () => {
      try {
        const data = await loadCharData(chars[k]);
        if (cancelled || !host.current) return;
        writer = HanziWriter.create(el, chars[k], {
          width: size, height: size, padding: 10,
          showOutline: false, showCharacter: false, showHintAfterMisses: false as unknown as number,
          highlightOnComplete: false, strokeColor: "#D9C7D1", drawingColor: "rgba(0,0,0,0)", drawingWidth: 22,
          charDataLoader: (_c: string, cb: (d: unknown) => void) => cb(data),
        });
        writer.quiz({
          quizStartStrokeNum: startAt.current,
          onMistake: () => {
            missR.current += 1; const m = missR.current; setMiss(m); pen.reject();
            if (m > MAX_MISS) { try { writer?.cancelQuiz(); } catch { /* */ } done(false, `Sai ${m} nét ở chữ thứ ${k + 1} — tính trượt.`); }
          },
          onCorrectStroke: () => { pen.accept(); strokeN.current += 1; setCanUndo(true); },
          onComplete: () => {
            if (cancelled || missR.current > MAX_MISS) return;
            setCanUndo(false); startAt.current = 0;
            if (k + 1 < chars.length) setK(k + 1);
            else done(true);
          },
        });
      } catch {
        done(false, "Không tải được dữ liệu nét.");
      }
    })();
    return () => { cancelled = true; try { writer?.cancelQuiz(); } catch { /* */ } };
  }, [k, round]);
  const undo = () => { if (locked || strokeN.current <= 0) return; pen.pop(); startAt.current = strokeN.current - 1; setRound((r) => r + 1); };
  return (
    <Card data-testid="exam-write">
      <Timer secs={30 + 30 * chars.length} onTimeout={() => done(false, "Hết giờ.")} />
      <p class="muted">Viết từ trí nhớ — không pinyin, không nét mờ, không gợi ý. Mỗi chữ được sai tối đa 5 nét.</p>
      <div class="exam-prompt" data-testid="write-prompt">“{it.vi}” <span class="muted">({it.word.pos} · {chars.length} chữ)</span></div>
      {it.audio && <div class="tools"><LimitedAudio id={it.audio} max={3} auto /></div>}
      <div class="row spread">
        <span class="muted">Chữ {k + 1}/{chars.length}</span>
        <span class="steps">{chars.map((_, i) => <span key={i} class={cls("step-dot", i < k && "ok", i === k && "on")}>{i < k ? "✓" : i + 1}</span>)}</span>
      </div>
      <div class="writer-host rice-bg exam-writer" data-testid="exam-writer" ref={host} style={{ width: size, height: size }}>
        <div class="hw-svg" />
        <canvas class="ink" ref={ink} aria-hidden="true" />
      </div>
      <div class="row spread">
        <span class="muted">{miss ? `Đã sai ${miss} nét ở chữ này.` : " "}</span>
        <Button small kind="ghost" id="exam-undo" disabled={!canUndo || locked} onClick={undo}>↶ Hoàn tác</Button>
      </div>
    </Card>
  );
}

function SpeakView(props: { item: Extract<Item, { t: "speak" }>; onAnswer: (ok: boolean, d?: string) => void }) {
  const it = props.item;
  const [tech, setTech] = useState(0);
  const [locked, setLocked] = useState(false);
  return (
    <Card data-testid="exam-speak">
      <p class="muted">Chỉ có tiếng Việt. Tự nói ra tiếng Trung. Máy nhận giọng nói rồi chấm từng âm tiết (đạt ≥ 80%); cao độ chỉ để tham khảo.</p>
      <div class="exam-prompt">{it.prompt}</div>
      <SpeakTry key={tech} expected={it.answerHanzi} onScore={(sc) => {
        if (locked) return;
        if (!sc.heardNorm && tech < 2) { setTech(tech + 1); return; } // không nghe được gì → cho nói lại, không tính
        setLocked(true);
        setTimeout(() => props.onAnswer(sc.pass, sc.pass ? "" : `Chưa đạt ${sc.percent}% — máy nghe thành “${sc.heard || "(trống)"}”.`), 1400);
      }} />
    </Card>
  );
}

/* =================== Kết quả =================== */

function ResultView(props: { results: SkillResult[]; title: string; pass: boolean; redo: string[]; onBack: () => void; retry?: string }) {
  const line = useMemo(() => tutorLine(props.pass ? "gatePass" : "gateFail", getState().settings), [props.pass]);
  return (
    <div class="stack" data-testid="exam-result">
      <TutorBubble mood={line.mood} text={line.text} />
      <Card class={props.pass ? "res-pass" : "res-fail"}>
        <h2 class="h2" data-testid="result-verdict">{props.pass ? "ĐẠT" : "TRƯỢT"} — {props.title}</h2>
        {props.results.map((r) => (
          <div class="res-skill" key={r.skill} data-testid={"res-" + r.skill}>
            <div class="row spread">
              <strong>{SKILL_VI[r.skill]}</strong>
              <span class={cls("chip", r.pass ? "green" : "warn")}>{r.pending ? "đang chờ" : `${r.first}/${r.total} · ${Math.round(r.score * 100)}%`} · {r.pass ? "đạt" : "trượt"}</span>
            </div>
            <Bar value={r.score} />
            {r.why.map((w, i) => <p key={i} class="bad-text small">{w}</p>)}
            {r.wrongFirst.length > 0 && (
              <ul class="res-wrong">
                {r.wrongFirst.map((it) => <li key={it.key}><span class="hanzi-inline">{it.answerHanzi}</span> — {it.vi}{it.recheck ? " (bài cũ)" : ""}{r.failedTwice.includes(it) ? " · trượt 2 lần" : " · lần sau mới đúng"}</li>)}
              </ul>
            )}
          </div>
        ))}
      </Card>
      {!props.pass && (
        <Card>
          <h3 class="h3">Phải làm trước khi thi lại</h3>
          <ol class="redo">{props.redo.map((x, i) => <li key={i}>{x}</li>)}</ol>
          {props.retry && <p class="notice">{props.retry}</p>}
        </Card>
      )}
      <Button wide kind="primary" onClick={props.onBack}>Quay lại</Button>
    </div>
  );
}

function redoList(results: SkillResult[], n?: number): string[] {
  const out: string[] = [];
  const failed = results.filter((r) => !r.pass);
  const wrongHan = [...new Set(failed.flatMap((r) => r.wrongFirst.map((i) => i.answerHanzi)))];
  if (failed.some((r) => r.skill === "write" && r.failedTwice.length)) out.push("Nộp chép phạt các chữ viết sai 2 lần (mục Chép phạt) — chưa nộp thì không được thi lại.");
  if (wrongHan.length) out.push(`Học lại trên Nhai HSK các từ: ${wrongHan.join(", ")} (flashcard + quiz + xem thứ tự nét).`);
  if (failed.some((r) => r.skill === "write")) out.push("Luyện viết từ trí nhớ trong Miaozi (Viết) đến khi viết đúng không cần nhìn.");
  if (failed.some((r) => r.skill === "listen")) out.push("Nghe lại audio từ/câu trên Nhai HSK, chép chính tả bằng chữ Hán.");
  if (failed.some((r) => r.skill === "speak")) out.push("Luyện nói trong Miaozi (Nói) — chú ý thanh điệu từng chữ.");
  if (failed.some((r) => r.pending)) out.push("Kỹ năng Nói cần Chrome hoặc Edge (có nhận giọng nói) và micro. Mở Miaozi bằng Chrome trên tablet/điện thoại.");
  if (n) out.push(`Mở lại bài ${n} trên Nhai HSK: ${nhaiUnitLink(n)}`);
  return out;
}

/* =================== Cổng qua bài =================== */

export function GatePage(props: { n: number; skill?: string }) {
  const n = props.n;
  const s = getState();
  const les = LESSONS[n - 1];
  if (!les) return <Card>Không có bài này.</Card>;
  if (!lessonUnlocked(n)) return <Card data-testid="gate-locked"><h2 class="h2">Bài {n} đang khóa</h2><p>Phải qua đủ 4 kỹ năng của bài {n - 1} trước.</p></Card>;
  const skill = GSKILLS.find((k) => k === props.skill);
  if (skill) return <GateSkill key={n + ":" + skill} n={n} skill={skill} />;
  const ready = !!s.progress.dayDone[`${n}:1`] && !!s.progress.dayDone[`${n}:2`];
  const openPen = s.penalties.filter((p) => !p.done && p.copies > 0);
  return (
    <div class="stack" data-testid="gate">
      <Card>
        <div class="muted">Bài {n} · {les.titleZh} — {les.titleVi}</div>
        <h2 class="h2">Cổng qua bài: 4 kỹ năng, thi riêng từng kỹ năng</h2>
        <ul class="muted rules">
          <li><b>Viết</b>: viết lại <b>tất cả {les.words.length} từ</b> của bài từ trí nhớ (nhìn nghĩa + nghe), cộng vài từ bài cũ bốc ngẫu nhiên. Không pinyin, không nét mờ. Sai quá 1 nét/chữ là trượt câu. Phải đúng 100% — câu sai được hỏi lại 1 lần, sai lần 2 là trượt kỹ năng + chép phạt 10 lần.</li>
          <li><b>Nghe</b>: nghe → chọn chữ trong 5 phương án chỉ khác một chữ/một thanh; nghe câu → tự ghép chữ Hán (có mảnh gài).</li>
          <li><b>Đọc</b>: chữ → nghĩa (không pinyin), nghĩa → chữ trong các chữ na ná, dịch câu tiếng Việt → ghép chữ Hán.</li>
          <li><b>Nói</b>: chỉ hiện tiếng Việt, tự nói tiếng Trung, chấm phụ âm, vần, thanh. Cần Chrome/Edge.</li>
          <li>Mỗi kỹ năng ≥ 80% <b>đúng ngay lần đầu</b>, có giới hạn thời gian, nghe tối đa 2–3 lần. Trượt kỹ năng nào thì <b>ngày mai</b> mới được thi lại kỹ năng đó. Thoát giữa chừng = trượt.</li>
        </ul>
      </Card>
      {!ready && <p class="notice" data-testid="gate-not-ready">Chưa được thi: phải xong ngày 1 và ngày 2 của bài (cả kiểm tra ca sáng và ca tối đều đạt).</p>}
      {openPen.length > 0 && <p class="notice">Còn {openPen.length} bài chép phạt chưa nộp — nộp xong mới được thi. <a href="#/penalty">Làm chép phạt</a></p>}
      <div class="grid cols-2">
        {GSKILLS.map((k) => {
          const r = gateRec(n, k);
          const until = gateBlockedUntil(n, k);
          const pend = k === "speak" && !speechAvailable();
          return (
            <Card key={k} class={cls("gate-card", r?.pass && "ok")} data-testid={"gate-" + k}>
              <div class="row spread"><h3 class="h3">{SKILL_VI[k]}</h3>
                <span class={cls("chip", r?.pass ? "green" : r && !r.pass && r.at ? "warn" : "peach")}>{r?.pass ? `đạt ${Math.round(r.score * 100)}%` : r?.at ? `trượt ${Math.round(r.score * 100)}%` : "chưa thi"}</span>
              </div>
              {r?.why && !r.pass && r.why.map((w, i) => <p class="bad-text small" key={i}>{w}</p>)}
              {until && <p class="muted">Thi lại từ ngày {fmtDate(until)}.</p>}
              {pend && !r?.pass && <p class="muted">Đang chờ: trình duyệt này không nhận giọng nói. Mở bằng Chrome/Edge.</p>}
              {!r?.pass && <Button small kind="primary" disabled={!ready || !!until || pend || openPen.length > 0} onClick={() => go(`/gate/${n}/${k}`)}>Thi {SKILL_VI[k]}</Button>}
            </Card>
          );
        })}
      </div>
      {unitPassed(n) && <Card class="res-pass"><p><b>Đã qua bài {n}.</b> Bài {n + 1} đã mở.</p></Card>}
    </div>
  );
}

function GateSkill(props: { n: number; skill: GSkill }) {
  const { n, skill } = props;
  const s = getState();
  const until = gateBlockedUntil(n, skill);
  const rec = gateRec(n, skill);
  const ready = !!s.progress.dayDone[`${n}:1`] && !!s.progress.dayDone[`${n}:2`];
  const openPen = s.penalties.filter((p) => !p.done && p.copies > 0).length;
  const mistakeIds = s.mistakes.map((m) => m.wordId || "");
  const items = useMemo(() => gateItems(n, skill, mistakeIds), [n, skill]);
  const [result, setResult] = useState<SkillResult | null>(null);
  const [started, setStarted] = useState(false);
  const finished = useRef(false);
  useEffect(() => () => { if (started && !finished.current) abandonGate(n, skill); }, [started]);
  if (result) {
    return <ResultView results={[result]} title={`Bài ${n} · ${SKILL_VI[skill]}`} pass={result.pass} redo={redoList([result], n)} onBack={() => go(`/gate/${n}`)}
      retry={result.pass ? undefined : `Thi lại kỹ năng ${SKILL_VI[skill]} sớm nhất từ ngày mai.`} />;
  }
  if (rec?.pass) return <Card><p>Kỹ năng {SKILL_VI[skill]} của bài {n} đã đạt.</p><Button onClick={() => go(`/gate/${n}`)}>Quay lại</Button></Card>;
  if (until) return <Card data-testid="gate-blocked"><p>Hôm nay đã trượt {SKILL_VI[skill]}. Thi lại từ ngày {fmtDate(until)}.</p><Button onClick={() => go(`/gate/${n}`)}>Quay lại</Button></Card>;
  if (!ready || openPen) return <Card><p>Chưa đủ điều kiện thi (xem trang cổng).</p><Button onClick={() => go(`/gate/${n}`)}>Quay lại</Button></Card>;
  if (skill === "speak" && !speechAvailable()) return <Card data-testid="speak-pending"><h2 class="h3">Kỹ năng Nói đang chờ</h2><p>Trình duyệt này không có nhận giọng nói nên không chấm được phụ âm/vần. Không bỏ qua được — mở Miaozi bằng Chrome hoặc Edge rồi thi.</p></Card>;
  if (!started) {
    return (
      <Card data-testid="gate-intro">
        <h2 class="h2">Bài {n} · thi {SKILL_VI[skill]} ({items.length} câu)</h2>
        <p>Đã bấm bắt đầu là phải làm hết. Thoát ra giữa chừng tính là trượt, ngày mai mới được thi lại.</p>
        <Button wide kind="primary" id="gate-start" onClick={() => { startGate(n, skill); setStarted(true); }}>Bắt đầu thi</Button>
      </Card>
    );
  }
  return (
    <ExamRunner items={items} title={`Bài ${n} · ${SKILL_VI[skill]}`} onFinish={(o) => {
      finished.current = true;
      const r = judge(skill, o.items, o.firstOk, o.finalOk);
      if (skill === "write") for (const it of r.failedTwice) gateWritePenalty(it.answerHanzi, `Thi Viết bài ${n}: viết sai ${it.answerHanzi} hai lần`);
      finishGate(n, skill, r.pass, r.score, r.wrongFirst.map((i) => i.answerHanzi), r.why);
      setResult(r);
    }} />
  );
}

/* =================== Kiểm tra cuối ca / tuần =================== */

export function CheckPage(props: { kind: "morning" | "evening" | "weekly" }) {
  const kind = props.kind;
  const s = getState();
  const passedUnits = Object.keys(s.progress.lessonPassed).map(Number);
  const n = kind === "weekly" ? Math.max(1, ...passedUnits, 1) : Math.max(1, Math.min(15, s.progress.unlockedLesson));
  const items = useMemo(() => checkItems(kind, n, s.mistakes.map((m) => m.wordId || "")), [kind, n]);
  const recKind = kind === "weekly" ? "weeklyTest" : kind;
  const rec = checkRec(recKind);
  const [started, setStarted] = useState(false);
  const [out, setOut] = useState<{ results: SkillResult[]; pass: boolean } | null>(null);
  const title = kind === "morning" ? "Kiểm tra ca sáng (nghe + đọc)" : kind === "evening" ? "Kiểm tra ca tối (viết + nói)" : "Kiểm tra tuần (4 kỹ năng)";
  const needSpeak = items.some((i) => i.skill === "speak");
  const noAsr = needSpeak && !speechAvailable();
  if (out) {
    return <ResultView results={out.results} title={title} pass={out.pass} redo={redoList(out.results)} onBack={() => go("/")}
      retry={out.pass ? undefined : "Ca này CHƯA được tính. Làm lại các việc trên, 20 phút sau mới được kiểm tra lại."} />;
  }
  if (rec?.pass) return <Card data-testid="check-done"><p>{title}: đã đạt hôm nay ({Math.round(rec.score * 100)}%). Ca đã được tính.</p><Button onClick={() => go("/")}>Về Hôm nay</Button></Card>;
  const wait = rec?.retryAt && rec.retryAt > Date.now() ? Math.ceil((rec.retryAt - Date.now()) / 60000) : 0;
  if (!started) {
    return (
      <Card data-testid="check-intro">
        <h2 class="h2">{title}</h2>
        <p>Ca học chỉ được tính khi bài này đạt: mỗi kỹ năng ≥ 80% đúng ngay lần đầu{items.some((i) => i.t === "write") ? ", phần viết không được sai chữ nào 2 lần" : ""}. {items.length} câu, có giới hạn thời gian.</p>
        {rec && !rec.pass && <p class="bad-text">Lần trước trượt: {(rec.why || []).join(" ")}</p>}
        {noAsr && <p class="notice" data-testid="check-speak-pending">Phần Nói cần Chrome/Edge có nhận giọng nói. Trên trình duyệt này phần Nói tính là “đang chờ” nên ca chưa thể được tính.</p>}
        {wait > 0 && <p class="notice">Vừa trượt. Ôn lại rồi {wait} phút nữa mới được kiểm tra lại.</p>}
        <Button wide kind="primary" id="check-start" disabled={wait > 0} onClick={() => setStarted(true)}>Bắt đầu</Button>
      </Card>
    );
  }
  const runItems = noAsr ? items.filter((i) => i.skill !== "speak") : items;
  return (
    <ExamRunner items={runItems} title={title} onFinish={(o) => {
      const skills = [...new Set(items.map((i) => i.skill))];
      const results = skills.map((k) => judge(k, o.items, o.firstOk, o.finalOk, k === "speak" && noAsr ? "Nói: chưa chấm được trên trình duyệt này (cần Chrome/Edge)." : undefined));
      for (const r of results) if (r.skill === "write") for (const it of r.failedTwice) gateWritePenalty(it.answerHanzi, `${title}: viết sai ${it.answerHanzi} hai lần`);
      const pass = results.every((r) => r.pass);
      const correct = results.reduce((a, r) => a + r.first, 0);
      const total = results.reduce((a, r) => a + r.total, 0);
      completeSessionCheck(recKind, pass, correct, total, results.flatMap((r) => r.why));
      if (pass && kind === "weekly") markWeekDone();
      setOut({ results, pass });
    }} />
  );
}

export { NHAI };
