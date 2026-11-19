import { useEffect, useRef, useState } from "preact/hooks";
import HanziWriter from "hanzi-writer";
import { ALL_WORDS, LESSONS, type Word } from "../data/curriculum";
import type { GridKind, SheetItem } from "../pdf";
import { getState, markPenaltyDone, saveNote, setPenaltyWritten, type Stroke } from "../store";
import type { Penalty } from "../schedule";
import { AudioBtn, Button, Card, Switch, cls, go, useAutoPlay } from "../ui";
import { setWrite } from "../v2/state2";

const charCache = new Map<string, unknown>();

export async function loadCharData(char: string): Promise<unknown> {
  if (charCache.has(char)) return charCache.get(char);
  const res = await fetch("./hanzi-data/" + encodeURIComponent(char) + ".json");
  if (!res.ok) throw new Error("missing " + char);
  const data = await res.json();
  charCache.set(char, data);
  return data;
}

export const hanChars = (s: string) => [...s].filter((c) => /[\u3400-\u9fff]/.test(c));

type BoxState = "wait" | "active" | "ok" | "bad";

/** Một ô hanzi-writer: viết theo nét, có nút viết lại và xem mẫu. */
export function WriteBox(props: {
  character: string;
  active?: boolean;
  size?: number;
  /** Ẩn nét mẫu mờ — viết không nhìn. */
  hideOutline?: boolean;
  onResult?: (ok: boolean, mistakes: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const writerRef = useRef<ReturnType<typeof HanziWriter.create> | null>(null);
  const [msg, setMsg] = useState("");
  const [mistakes, setMistakes] = useState(0);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState<null | boolean>(null);
  const active = props.active !== false;
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    el.innerHTML = "";
    let writer: ReturnType<typeof HanziWriter.create> | null = null;
    let miss = 0;
    let cancelled = false;
    setMistakes(0);
    setDone(null);
    setMsg(active ? "Viết theo đúng thứ tự nét" : "Chờ chữ trước");
    (async () => {
      try {
        const data = await loadCharData(props.character);
        if (cancelled || !host.current) return;
        const size = props.size || host.current.clientWidth || 220;
        writer = HanziWriter.create(host.current, props.character, {
          width: size,
          height: size,
          padding: 8,
          showOutline: !props.hideOutline,
          showCharacter: false,
          strokeColor: "#3A2F2A",
          outlineColor: active ? "#E8D8C8" : "#F3EAE0",
          drawingColor: "#B64E5C",
          drawingWidth: 22,
          strokeAnimationSpeed: 1.2,
          charDataLoader: (_c: string, onComplete: (d: unknown) => void) => onComplete(data),
        });
        writerRef.current = writer;
        if (!active) return;
        writer.quiz({
          onMistake: () => { miss += 1; setMistakes(miss); setMsg("Sai nét hoặc sai thứ tự — viết lại nét đó."); },
          onCorrectStroke: () => setMsg("Đúng nét."),
          onComplete: (s: { totalMistakes?: number }) => {
            const m = s.totalMistakes ?? miss;
            const ok = m <= 5; // bút tablet đôi khi không nhạy: cho sai tối đa 5 nét/chữ
            setDone(ok);
            setMsg(ok ? "Đạt." : `Xong nhưng sai ${m} nét. Bấm “Viết lại” để luyện thêm.`);
            props.onResult?.(ok, m);
          },
        });
      } catch {
        setMsg("Chưa có dữ liệu nét cho chữ này.");
        props.onResult?.(false, 0);
      }
    })();
    return () => { cancelled = true; try { writer?.cancelQuiz(); } catch { /* */ } writerRef.current = null; };
  }, [props.character, active, round, props.hideOutline]);
  return (
    <div data-testid="write-box" class={cls("wbox", active && "on", done === true && "ok", done === false && "bad")}>
      <div class="writer-host rice-bg" ref={host} style={props.size ? { width: props.size, height: props.size } : undefined} />
      <div class="wbox-foot">
        <span class="muted">{msg}{mistakes ? ` · sai ${mistakes}` : ""}</span>
        {active && (
          <span class="tools tight">
            <Button small kind="ghost" onClick={() => setRound(round + 1)}>Viết lại</Button>
            <Button small kind="ghost" onClick={() => {
              const w = writerRef.current;
              if (!w) return;
              w.cancelQuiz();
              w.animateCharacter({ onComplete: () => setRound((r) => r + 1) });
            }}>Xem mẫu</Button>
          </span>
        )}
      </div>
    </div>
  );
}

/** Từ nhiều chữ: mỗi chữ một ô, viết lần lượt từ trái sang phải. */
export function WriteWord(props: { word: { hanzi: string; id?: string }; onDone?: (ok: boolean) => void; size?: number; hideOutline?: boolean }) {
  const chars = hanChars(props.word.hanzi);
  const [k, setK] = useState(0);
  const [res, setRes] = useState<BoxState[]>(() => chars.map((_, i) => (i === 0 ? "active" : "wait")));
  useEffect(() => { setK(0); setRes(chars.map((_, i) => (i === 0 ? "active" : "wait"))); }, [props.word.hanzi]);
  if (!chars.length) return <p>Không có chữ để viết.</p>;
  const doneCount = res.filter((r) => r === "ok" || r === "bad").length;
  return (
    <div data-testid="write-word">
      <div class="row spread">
        <span class="muted">Chữ {Math.min(k + 1, chars.length)}/{chars.length}</span>
        <span class="steps">{chars.map((c, i) => (
          <span key={i} class={cls("step-dot", res[i] === "ok" && "ok", res[i] === "bad" && "bad", i === k && doneCount < chars.length && "on")}>{c}</span>
        ))}</span>
      </div>
      <div class={cls("wword", chars.length > 1 && "multi")}>
        {chars.map((c, i) => (
          <WriteBox
            key={props.word.hanzi + i}
            character={c}
            size={props.size}
            hideOutline={props.hideOutline}
            active={i <= k}
            onResult={(ok) => {
              setRes((r) => {
                const next = [...r];
                next[i] = ok ? "ok" : "bad";
                if (i + 1 < chars.length && next[i + 1] === "wait") next[i + 1] = "active";
                if (next.every((x) => x === "ok" || x === "bad")) props.onDone?.(next.every((x) => x === "ok"));
                return next;
              });
              if (i === k && i + 1 < chars.length) setK(i + 1);
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Luyện viết — trạng thái (bài, từ đang viết, ẩn mẫu, từ đã đạt) lưu trong store nên sang “Ghi chú tay” rồi quay lại không mất. */
export function WritePage() {
  const s = getState();
  const cap = Math.max(1, s.v2.lesson);
  const ws = s.v2.write;
  const lesson = Math.min(Math.max(1, ws.lesson || cap), LESSONS.length);
  const words = LESSONS[lesson - 1].words;
  const i = Math.min(ws.idx || 0, Math.max(0, words.length - 1));
  const w = words[i];
  useAutoPlay(w?.id);
  if (!w) return <Card>Chưa có chữ.</Card>;
  const doneN = words.filter((x) => ws.done[x.id]).length;
  return (
    <div class="stack" data-testid="write-page">
      <Card>
        <div class="row spread">
          <h2 class="h2">Viết theo nét</h2>
          <select data-testid="write-lesson" value={lesson} onChange={(e) => setWrite({ lesson: Number((e.target as HTMLSelectElement).value), idx: 0 })}>
            {LESSONS.filter((l) => l.id <= cap).map((l) => <option value={l.id} key={l.id}>Bài {l.id}</option>)}
          </select>
        </div>
        <p data-testid="write-pos">Từ {i + 1}/{words.length}: <strong>{w.vi}</strong> <AudioBtn id={w.id} /> <span class="chip tiny">đã đạt {doneN}/{words.length}</span></p>
        <Switch on={ws.hide} label="Ẩn nét mẫu (viết không nhìn)" onChange={(v) => setWrite({ hide: v })} />
        <WriteWord key={w.id + (ws.hide ? "h" : "")} word={w} hideOutline={ws.hide} onDone={(ok) => { if (ok) setWrite({ done: { ...getState().v2.write.done, [w.id]: true } }); }} />
        {ws.done[w.id] && <p class="chip green">Từ này đã viết đạt.</p>}
        <div class="row" style={{ marginTop: 10 }}>
          <Button kind="ghost" disabled={i === 0} onClick={() => setWrite({ idx: i - 1 })}>Trước</Button>
          <Button kind="primary" wide id="write-next" disabled={i + 1 >= words.length} onClick={() => setWrite({ idx: i + 1 })}>Từ tiếp</Button>
        </div>
      </Card>
      <div class="grid cols-2">
        <Button kind="yellow" wide onClick={() => go("/sheets")}>Xuất giấy luyện viết (PDF)</Button>
        <Button kind="ghost" wide id="to-notes" onClick={() => go("/notes")}>Ghi chú tay</Button>
      </div>
    </div>
  );
}

export function NotesPage(props: { lesson?: number }) {
  const s = getState();
  const lesson = props.lesson ?? Math.max(1, s.v2.write.lesson || s.v2.lesson || 1);
  const existing = s.notes[String(lesson)];
  return (
    <div class="stack" data-testid="notes">
      <Card>
        <div class="row spread">
          <h2 class="h2">Ghi chú tay · Bài {lesson}</h2>
          <select value={lesson} onChange={(e) => go("/notes/" + (e.target as HTMLSelectElement).value)}>
            {LESSONS.map((l) => <option value={l.id} key={l.id}>Bài {l.id}. {l.titleZh}</option>)}
          </select>
        </div>
        <p class="muted">Viết trực tiếp bằng bút trên tablet. Có lực nhấn, tẩy, lưu vào máy. Phù hợp ghi chú buổi tối.</p>
        <InkPad
          initial={existing?.strokes || []}
          onSave={(st) => saveNote(lesson, st)}
        />
      </Card>
    </div>
  );
}

export function InkPad(props: {
  initial: Stroke[];
  onSave: (s: Stroke[]) => void;
  grid?: boolean;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>(props.initial.map((s) => ({ ...s, pts: [...s.pts] })));
  const cur = useRef<Stroke | null>(null);
  const [color, setColor] = useState("#3A2F2A");
  const [eraser, setEraser] = useState(false);
  const [width, setWidth] = useState(3);

  const resize = () => {
    const c = canvasRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.max(1, r.width * dpr);
    c.height = Math.max(1, r.height * dpr);
    redraw();
  };

  const redraw = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, c.width, c.height);
    const W = c.width, H = c.height;
    if (props.grid) {
      ctx.strokeStyle = "rgba(200,180,160,.45)";
      ctx.lineWidth = 1;
      ctx.strokeRect(2, 2, W - 4, H - 4);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(W, H);
      ctx.moveTo(W, 0); ctx.lineTo(0, H);
      ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H);
      ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2);
      ctx.stroke();
    }
    const paint = (st: Stroke) => {
      if (st.pts.length < 2) return;
      ctx.globalCompositeOperation = st.eraser ? "destination-out" : "source-over";
      ctx.strokeStyle = st.color;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      st.pts.forEach((p, i) => {
        const x = p.x * W, y = p.y * H;
        ctx.lineWidth = (st.eraser ? st.width * 3 : st.width * (0.7 + p.p * 1.4)) * dpr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    };
    for (const st of strokes.current) paint(st);
    if (cur.current) paint(cur.current);
  };

  useEffect(() => {
    resize();
    const ro = new ResizeObserver(resize);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, []);

  const pos = (e: PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height,
      p: e.pressure || 0.5,
    };
  };

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const down = (e: PointerEvent) => {
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      cur.current = { pts: [pos(e)], color, width, eraser };
    };
    const move = (e: PointerEvent) => {
      if (!cur.current) return;
      e.preventDefault();
      cur.current.pts.push(pos(e));
      redraw();
    };
    const up = () => {
      if (cur.current && cur.current.pts.length) {
        strokes.current = [...strokes.current, cur.current];
        props.onSave(strokes.current);
      }
      cur.current = null;
      redraw();
    };
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    return () => {
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerup", up);
      c.removeEventListener("pointercancel", up);
    };
  }, [color, eraser, width]);

  return (
    <div>
      <div class="tools">
        {["#3A2F2A", "#B64E5C", "#3E8A55", "#3A5EA8"].map((c) => (
          <button key={c} class="icon-btn" style={{ background: c }} onClick={() => { setColor(c); setEraser(false); }} />
        ))}
        <Button small kind={eraser ? "primary" : "ghost"} onClick={() => setEraser(!eraser)}>Tẩy</Button>
        <Button small kind="ghost" onClick={() => { strokes.current = strokes.current.slice(0, -1); redraw(); props.onSave(strokes.current); }}>Hoàn tác</Button>
        <Button small kind="ghost" onClick={() => { strokes.current = []; redraw(); props.onSave([]); }}>Xóa hết</Button>
        <label class="muted">Nét <input type="range" min={1} max={10} value={width} onInput={(e) => setWidth(Number((e.target as HTMLInputElement).value))} /></label>
      </div>
      <div class="canvas-wrap rice-bg" style={{ height: props.height || 360 }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

/* ---------------- Xuất giấy luyện viết (PDF) ---------------- */

type Src = "lesson" | "mistakes" | "custom" | "preset";
interface PdfPrefs {
  grid: GridKind; perRow: number; rowsPerChar: number; solidFirst: boolean; faded: number;
  showPinyin: boolean; showMeaning: boolean; showStrokes: boolean;
}
const DEFAULT_PREFS: PdfPrefs = { grid: "tian", perRow: 8, rowsPerChar: 2, solidFirst: true, faded: 3, showPinyin: true, showMeaning: true, showStrokes: true };
function loadPrefs(): PdfPrefs {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem("miaozi-pdf-prefs") || "{}") }; } catch { return DEFAULT_PREFS; }
}

function Seg<T extends string | number>(props: { value: T; options: { v: T; label: string }[]; onChange: (v: T) => void; testid?: string }) {
  return (
    <div class="segctl" data-testid={props.testid}>
      {props.options.map((o) => (
        <button key={String(o.v)} type="button" class={cls(o.v === props.value && "on")} onClick={() => props.onChange(o.v)}>{o.label}</button>
      ))}
    </div>
  );
}

function Check(props: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label class="check"><input type="checkbox" checked={props.on} onChange={(e) => props.onChange((e.target as HTMLInputElement).checked)} /> {props.label}</label>
  );
}

const wordItem = (w: Word): SheetItem => ({ hanzi: w.hanzi, pinyin: w.pinyin, vi: w.vi });

export function PdfDialog(props: {
  title?: string;
  preset?: { label: string; items: SheetItem[]; prefs?: Partial<PdfPrefs>; fileName?: string; subtitle?: string };
  onClose: () => void;
  onExported?: () => void;
}) {
  const s = getState();
  const unlocked = Math.max(1, Math.min(15, s.progress.unlockedLesson || 1));
  const [src, setSrc] = useState<Src>(props.preset ? "preset" : "lesson");
  const [lesson, setLesson] = useState(unlocked);
  const [picked, setPicked] = useState<string[]>([]);
  const [p, setP] = useState<PdfPrefs>(() => ({ ...loadPrefs(), ...(props.preset?.prefs || {}) }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (patch: Partial<PdfPrefs>) => setP((x) => ({ ...x, ...patch }));
  const mistakeWords = s.mistakes.map((m) => ALL_WORDS.find((w) => w.id === m.wordId)).filter(Boolean) as Word[];
  const pool = ALL_WORDS.filter((w) => w.lesson <= unlocked);
  const items: SheetItem[] =
    src === "preset" ? props.preset!.items
    : src === "lesson" ? LESSONS[lesson - 1].words.map(wordItem)
    : src === "mistakes" ? [...new Map(mistakeWords.map((w) => [w.id, w])).values()].map(wordItem)
    : pool.filter((w) => picked.includes(w.id)).map(wordItem);
  const nChars = items.reduce((a, it) => a + hanChars(it.hanzi).length, 0);
  const faded = Math.min(p.faded, p.perRow - (p.solidFirst ? 1 : 0));
  const cell = 186 / p.perRow;
  const perChar = (p.showStrokes ? Math.min(9, cell * 0.6) + 2 : 0) + p.rowsPerChar * cell + 2;
  const pages = Math.max(1, Math.ceil((nChars * perChar + items.length * 10) / 260));
  const run = async () => {
    if (!items.length) return;
    setBusy(true); setErr(null);
    try {
      localStorage.setItem("miaozi-pdf-prefs", JSON.stringify(p));
      const { buildSheetPdf, downloadBlob } = await import("../pdf");
      const title = src === "preset" ? (props.preset!.label) : src === "lesson" ? `Bài ${lesson} · ${LESSONS[lesson - 1].titleZh} — giấy luyện viết` : src === "mistakes" ? "Chữ hay sai — giấy luyện viết" : "Chữ tự chọn — giấy luyện viết";
      const blob = await buildSheetPdf({ ...p, faded, title, subtitle: props.preset?.subtitle || `Miaozi · ${nChars} chữ · ô ${p.grid === "tian" ? "điền 田" : p.grid === "mi" ? "mễ 米" : "trơn"}`, items });
      (window as unknown as { __lastPdf?: Blob }).__lastPdf = blob;
      downloadBlob(blob, props.preset?.fileName || `miaozi-${src === "lesson" ? "bai" + lesson : src}-luyen-viet.pdf`);
      props.onExported?.();
    } catch (e) {
      setErr("Không xuất được PDF: " + (e as Error).message + ". Cần mạng lần đầu để tải font.");
    }
    setBusy(false);
  };
  return (
    <div class="modal" data-testid="pdf-dialog" onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}>
      <div class="sheet">
        <div class="row spread"><h2 class="h2">{props.title || "Xuất giấy luyện viết"}</h2><button class="icon-btn" aria-label="Đóng" onClick={props.onClose}>✕</button></div>
        <div class="opt-group">
          <div class="opt-label">Chữ nào</div>
          {props.preset ? <p class="kw">{props.preset.label}: <span class="hanzi-inline">{items.map((x) => x.hanzi).join(" ")}</span></p> : (
            <>
              <Seg value={src} onChange={setSrc} testid="pdf-src" options={[{ v: "lesson", label: "Theo bài" }, { v: "mistakes", label: `Chữ hay sai (${mistakeWords.length})` }, { v: "custom", label: "Tự chọn" }]} />
              {src === "lesson" && (
                <select value={lesson} onChange={(e) => setLesson(Number((e.target as HTMLSelectElement).value))}>
                  {LESSONS.filter((l) => l.id <= unlocked).map((l) => <option key={l.id} value={l.id}>Bài {l.id}. {l.titleZh} — {l.titleVi}</option>)}
                </select>
              )}
              {src === "mistakes" && !mistakeWords.length && <p class="muted">Chưa có chữ sai nào. Chọn “Theo bài” hoặc “Tự chọn”.</p>}
              {src === "custom" && (
                <div class="pick">
                  {pool.map((w) => (
                    <button key={w.id} type="button" class={cls("pick-chip", picked.includes(w.id) && "on")}
                      onClick={() => setPicked((x) => x.includes(w.id) ? x.filter((y) => y !== w.id) : [...x, w.id])}>{w.hanzi}</button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div class="opt-group">
          <div class="opt-label">Kiểu ô</div>
          <Seg value={p.grid} onChange={(v) => set({ grid: v })} testid="pdf-grid" options={[{ v: "tian", label: "Ô điền 田" }, { v: "mi", label: "Ô mễ 米" }, { v: "plain", label: "Ô trơn" }]} />
        </div>
        <div class="opt-group two">
          <div>
            <div class="opt-label">Số ô mỗi hàng</div>
            <Seg value={p.perRow} onChange={(v) => set({ perRow: v })} options={[6, 8, 10, 12].map((v) => ({ v, label: String(v) }))} />
          </div>
          <div>
            <div class="opt-label">Số hàng mỗi chữ</div>
            <Seg value={p.rowsPerChar} onChange={(v) => set({ rowsPerChar: v })} options={[1, 2, 3, 4].map((v) => ({ v, label: String(v) }))} />
          </div>
        </div>
        <div class="opt-group">
          <div class="opt-label">Chữ mẫu trong hàng đầu</div>
          <Check on={p.solidFirst} onChange={(v) => set({ solidFirst: v })} label="Ô đầu có chữ mẫu đậm" />
          <div class="row" style={{ flexWrap: "wrap" }}>
            <span class="muted">Số ô chữ mờ để tô:</span>
            <Seg value={faded} onChange={(v) => set({ faded: v })} options={[0, 1, 3, 5, p.perRow - 1].filter((v, i, a) => a.indexOf(v) === i).map((v) => ({ v, label: v === 0 ? "Không" : v === p.perRow - 1 ? "Cả hàng" : String(v) }))} />
          </div>
          <p class="muted">Các ô còn lại để trống, tự viết.</p>
        </div>
        <div class="opt-group">
          <div class="opt-label">Hiện thêm</div>
          <Check on={p.showPinyin} onChange={(v) => set({ showPinyin: v })} label="Pinyin" />
          <Check on={p.showMeaning} onChange={(v) => set({ showMeaning: v })} label="Nghĩa tiếng Việt" />
          <Check on={p.showStrokes} onChange={(v) => set({ showStrokes: v })} label="Thứ tự nét (từng nét một)" />
        </div>
        <p class="muted">Khổ A4 dọc · {nChars} chữ · khoảng {pages} trang. Chữ Hán vẽ từ dữ liệu nét nên in ra rất nét.</p>
        {err && <p class="bad-text">{err}</p>}
        <Button kind="primary" wide id="pdf-export-go" disabled={busy || !items.length} onClick={run}>{busy ? "Đang tạo PDF…" : "Tải PDF"}</Button>
      </div>
    </div>
  );
}

export function SheetsPage() {
  return (
    <div class="stack" data-testid="sheets">
      <PdfDialog onClose={() => go("/write")} />
    </div>
  );
}

/* ---------------- Chép phạt ---------------- */

export function PenaltyPage() {
  const s = getState();
  const open = s.penalties.filter((p) => !p.done && p.copies > 0);
  const [active, setActive] = useState(open[0]?.id || "");
  const p = open.find((x) => x.id === active) || open[0];
  if (!p) {
    const doneList = s.penalties.filter((x) => x.done && x.copies > 0).slice(-5).reverse();
    return (
      <Card data-testid="penalty-empty">
        <h2 class="h2">Không có bài chép phạt</h2>
        <p class="muted">Chép phạt xuất hiện khi bỏ một ca học bắt buộc, hoặc trả lời sai cùng một từ 2 lần trong ngày.</p>
        {doneList.length > 0 && <p class="muted">Đã nộp gần đây: {doneList.map((d) => d.dueChars.join("")).join(", ")}.</p>}
        <Button onClick={() => go("/")}>Về hôm nay</Button>
      </Card>
    );
  }
  return (
    <div class="stack" data-testid="penalty">
      {open.length > 1 && (
        <Card>
          <h3 class="h3">Có {open.length} bài chép phạt — chọn bài để làm</h3>
          <div class="pen-list" role="radiogroup">
            {open.map((x) => (
              <button key={x.id} role="radio" aria-checked={x.id === p.id} class={cls("pen-item", x.id === p.id && "on")} onClick={() => setActive(x.id)} data-testid="pen-item">
                <span class="radio" />
                <span>
                  <strong class="hanzi-inline">{x.dueChars.join(" ")}</strong>
                  <span class="muted"> · {x.reason || (x.type === "missed" ? "Bỏ ca học" : "Sai 2 lần")}</span>
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}
      <PenaltyTask key={p.id} p={p} />
    </div>
  );
}

function PenaltyTask({ p }: { p: Penalty }) {
  const [mode, setMode] = useState<"app" | "paper" | null>(null);
  const [imgs, setImgs] = useState<Record<string, string[]>>({});
  const [showPdf, setShowPdf] = useState(false);
  const [printed, setPrinted] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [model, setModel] = useState(true);
  const chars = [...new Set(p.dueChars.flatMap((w) => hanChars(w)))];
  const total = chars.length * p.copies;
  const written = chars.reduce((a, ch) => a + Math.min(p.copies, (imgs[ch] || []).filter(Boolean).length), 0);
  const why = p.reason || (p.type === "missed" ? "Bỏ một ca học bắt buộc" : "Sai cùng một từ 2 lần trong ngày");
  return (
    <>
      <Card>
        <h2 class="h2">Chép phạt</h2>
        <div class="pen-facts">
          <div><span class="muted">Vì sao</span><strong>{why}</strong></div>
          <div><span class="muted">Phải chép</span><strong><span class="hanzi-inline">{chars.join(" ")}</span> — {chars.length} chữ × {p.copies} lần = {total} ô</strong></div>
          {p.type === "missed" && <div><span class="muted">Kèm theo</span><strong>Học bù ca đã bỏ trong 48 giờ để giữ chuỗi</strong></div>}
        </div>
        <p class="muted">Chép tay giúp nhớ mặt chữ. Chọn <b>một</b> trong hai cách nộp:</p>
        <div class="grid cols-2">
          <button class={cls("choice", mode === "app" && "on")} onClick={() => setMode("app")} data-testid="pen-mode-app">
            <strong>✍️ Viết trong app</strong>
            <span class="muted">Viết bằng bút vào từng ô. App tự đếm, viết đủ là nộp được.</span>
          </button>
          <button class={cls("choice", mode === "paper" && "on")} onClick={() => setMode("paper")} data-testid="pen-mode-paper">
            <strong>🖨️ Viết ra giấy</strong>
            <span class="muted">Tải giấy ô PDF, in hoặc viết vào vở, rồi chụp ảnh nộp.</span>
          </button>
        </div>
      </Card>
      {mode === "app" && (
        <Card>
          <div class="row spread"><h3 class="h3">Viết trong app</h3><span class={cls("chip", written >= total ? "green" : "peach")}>{written}/{total} ô</span></div>
          <p class="muted">Mỗi ô viết một lần chữ. Viết sai thì bấm ↶ (bỏ nét cuối) hoặc ✕ (xóa ô).</p>
          <Switch on={model} label="Hiện chữ mẫu (tắt để viết theo trí nhớ)" onChange={setModel} />
          {chars.map((ch) => (
            <div key={ch} class="pen-char">
              <div class="row"><span class="hanzi sm" data-testid="pen-model">{model ? ch : "？"}</span><span class="muted">{Math.min(p.copies, (imgs[ch] || []).filter(Boolean).length)}/{p.copies}</span></div>
              <CopyRow char={ch} n={p.copies} model={model} onChange={(urls) => { setImgs((m) => ({ ...m, [ch]: urls })); setPenaltyWritten(p.id, ch, urls.filter(Boolean).length); }} />
            </div>
          ))}
          <Button kind="primary" wide id="submit-penalty" disabled={written < total} onClick={() => { markPenaltyDone(p.id, { kind: "app", at: Date.now() }); setMsg("Đã nộp trong app. Miao ghi nhận."); }}>{written < total ? `Còn ${total - written} ô nữa` : "Nộp bài"}</Button>
          <Button kind="ghost" wide disabled={written < total} onClick={async () => {
            const { buildProofPdf, downloadBlob } = await import("../pdf");
            const blob = await buildProofPdf({ title: "Miaozi — bài chép phạt", subtitle: why, attempts: chars.map((ch) => ({ char: ch, images: imgs[ch] || [] })) });
            downloadBlob(blob, `miaozi-chep-phat-${new Date().toISOString().slice(0, 10)}.pdf`);
          }}>Lưu PDF làm bằng chứng (tuỳ chọn)</Button>
          {msg && <p class="chip green">{msg}</p>}
        </Card>
      )}
      {mode === "paper" && (
        <Card>
          <h3 class="h3">Viết ra giấy</h3>
          <ol class="steps-list">
            <li class={cls(printed && "done")}>
              <div>Tải giấy ô có sẵn chữ mẫu ({chars.length} chữ × {p.copies} ô).</div>
              <Button small kind="yellow" onClick={() => setShowPdf(true)}>Tải giấy PDF</Button>
            </li>
            <li>In ra hoặc chép vào vở — mỗi chữ đủ {p.copies} lần.</li>
            <li>
              <div>Chụp ảnh trang đã viết (hoặc chọn file PDF) để nộp.</div>
              <label class="btn primary small" data-testid="pen-upload">Chọn ảnh / PDF
                <input type="file" accept="image/*,application/pdf" capture="environment" hidden onChange={async (e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  if (!f) return;
                  const thumb = f.type.startsWith("image/") ? await makeThumb(f) : undefined;
                  markPenaltyDone(p.id, { kind: "upload", at: Date.now(), name: f.name, thumb });
                  setMsg("Đã nộp. Miao ghi nhận rồi!");
                }} />
              </label>
            </li>
          </ol>
          {msg && <p class="chip green">{msg}</p>}
        </Card>
      )}
      {showPdf && (
        <PdfDialog
          title="Giấy chép phạt"
          preset={{
            label: "Chép phạt", items: chars.map((c) => {
              const w = ALL_WORDS.find((x) => x.hanzi === c);
              return { hanzi: c, pinyin: w?.pinyin, vi: w?.vi };
            }),
            prefs: { rowsPerChar: Math.max(1, Math.ceil((p.copies + 1) / 8)), perRow: 8, faded: 0, solidFirst: true },
            subtitle: `${why} · mỗi chữ ${p.copies} lần`,
            fileName: "miaozi-giay-chep-phat.pdf",
          }}
          onClose={() => setShowPdf(false)}
          onExported={() => setPrinted(true)}
        />
      )}
    </>
  );
}

async function makeThumb(f: File): Promise<string | undefined> {
  try {
    const bmp = await createImageBitmap(f);
    const c = document.createElement("canvas");
    const k = 240 / Math.max(bmp.width, bmp.height);
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.6);
  } catch { return undefined; }
}

function CopyRow(props: { char: string; n: number; model?: boolean; onChange: (urls: string[]) => void }) {
  const urls = useRef<string[]>(Array.from({ length: props.n }, () => ""));
  return (
    <div class="copy-grid">
      {Array.from({ length: props.n }, (_, i) => (
        <MiniPad key={props.char + i} char={props.char} model={props.model && i === 0} onChange={(u) => { urls.current[i] = u; props.onChange([...urls.current]); }} />
      ))}
    </div>
  );
}

/** Ô viết tay nhỏ: có bỏ nét cuối và xóa ô. */
function MiniPad(props: { char: string; model?: boolean; onChange: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<{ x: number; y: number; p: number }[][]>([]);
  const cur = useRef<{ x: number; y: number; p: number }[] | null>(null);
  const [count, setCount] = useState(0);
  const redraw = () => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#3A2F2A";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const all = cur.current ? [...strokes.current, cur.current] : strokes.current;
    for (const st of all) {
      ctx.beginPath();
      st.forEach((pt, i) => {
        ctx.lineWidth = c.width * 0.035 * (0.7 + pt.p * 0.8);
        if (i === 0) ctx.moveTo(pt.x * c.width, pt.y * c.height); else ctx.lineTo(pt.x * c.width, pt.y * c.height);
      });
      if (st.length === 1) ctx.lineTo(st[0].x * c.width + 0.5, st[0].y * c.height);
      ctx.stroke();
    }
  };
  const emit = () => {
    setCount(strokes.current.length);
    props.onChange(strokes.current.length ? ref.current!.toDataURL("image/png") : "");
  };
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect();
    c.width = Math.max(1, r.width * dpr);
    c.height = Math.max(1, r.height * dpr);
    const pos = (e: PointerEvent) => { const b = c.getBoundingClientRect(); return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height, p: e.pressure || 0.5 }; };
    const down = (e: PointerEvent) => { e.preventDefault(); c.setPointerCapture(e.pointerId); cur.current = [pos(e)]; redraw(); };
    const move = (e: PointerEvent) => { if (!cur.current) return; e.preventDefault(); cur.current.push(pos(e)); redraw(); };
    const up = () => { if (cur.current) { strokes.current.push(cur.current); cur.current = null; redraw(); emit(); } };
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up);
    c.addEventListener("pointercancel", up);
    return () => { c.removeEventListener("pointerdown", down); c.removeEventListener("pointermove", move); c.removeEventListener("pointerup", up); c.removeEventListener("pointercancel", up); };
  }, []);
  return (
    <div class={cls("minipad", count > 0 && "filled")}>
      <div class="canvas-wrap rice-bg">{props.model && <span class="minipad-model" aria-hidden="true">{props.char}</span>}<canvas ref={ref} /></div>
      <div class="minipad-tools">
        <button aria-label="Bỏ nét cuối" title="Bỏ nét cuối" disabled={!count} onClick={() => { strokes.current.pop(); redraw(); emit(); }}>↶</button>
        <button aria-label="Xóa ô" title="Xóa ô" disabled={!count} onClick={() => { strokes.current = []; redraw(); emit(); }}>✕</button>
      </div>
    </div>
  );
}
