import { useEffect, useRef, useState } from "preact/hooks";
import HanziWriter from "hanzi-writer";
import { ALL_WORDS, LESSONS } from "../data/curriculum";
import { buildPracticePdf, downloadBlob } from "../pdf";
import { getState, markPenaltyDone, saveNote, type Stroke } from "../store";
import { Button, Card, go } from "../ui";

const charCache = new Map<string, unknown>();

export async function loadCharData(char: string): Promise<unknown> {
  if (charCache.has(char)) return charCache.get(char);
  const res = await fetch("./hanzi-data/" + encodeURIComponent(char) + ".json");
  if (!res.ok) throw new Error("missing " + char);
  const data = await res.json();
  charCache.set(char, data);
  return data;
}

export function WriteBox(props: {
  character: string;
  onResult?: (ok: boolean, mistakes: number, strokes: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState("Viết theo đúng thứ tự nét");
  const [mistakes, setMistakes] = useState(0);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    el.innerHTML = "";
    let writer: ReturnType<typeof HanziWriter.create> | null = null;
    let miss = 0;
    let total = 0;
    let cancelled = false;
    (async () => {
      try {
        const data = await loadCharData(props.character);
        if (cancelled || !host.current) return;
        writer = HanziWriter.create(host.current, props.character, {
          width: host.current.clientWidth || 260,
          height: host.current.clientWidth || 260,
          padding: 8,
          showOutline: true,
          showCharacter: false,
          strokeColor: "#3A2F2A",
          outlineColor: "#E8D8C8",
          drawingColor: "#B64E5C",
          drawingWidth: 22,
          strokeAnimationSpeed: 1.1,
          charDataLoader: (_c: string, onComplete: (d: unknown) => void) => onComplete(data),
        });
        writer.quiz({
          onMistake: () => { miss += 1; setMistakes(miss); setMsg("Sai nét hoặc sai thứ tự, thử lại."); },
          onCorrectStroke: () => setMsg("Đúng nét."),
          onComplete: (s: { totalMistakes?: number }) => {
            const m = s.totalMistakes ?? miss;
            const ok = m <= 1;
            setMsg(ok ? "Đạt." : "Xong nhưng sai nhiều nét. Viết lại nhé.");
            props.onResult?.(ok, m, total);
          },
        });
      } catch {
        setMsg("Chưa có dữ liệu nét cho chữ này. Hãy viết tay ở ghi chú.");
        props.onResult?.(false, 0, 0);
      }
    })();
    return () => { cancelled = true; try { writer?.destroy(); } catch { /* */ } };
  }, [props.character]);
  return (
    <div data-testid="write-box">
      <div class="writer-host" ref={host} />
      <p class="muted" style={{ textAlign: "center" }}>{props.character} · {msg}{mistakes ? ` · sai ${mistakes}` : ""}</p>
    </div>
  );
}

export function WritePage() {
  const s = getState();
  const unlocked = Math.max(1, s.progress.unlockedLesson);
  const words = ALL_WORDS.filter((w) => w.lesson <= unlocked && w.hanzi.length === 1);
  const [i, setI] = useState(0);
  const w = words[i % Math.max(1, words.length)];
  if (!w) return <Card>Chưa có chữ.</Card>;
  return (
    <div class="stack" data-testid="write-page">
      <Card>
        <h2 class="h2">Viết theo nét</h2>
        <p>Nghĩa: <strong>{w.vi}</strong> — viết {w.hanzi}</p>
        <WriteBox key={w.hanzi} character={w.hanzi} />
        <div class="tools">
          <Button onClick={() => setI(i + 1)}>Chữ tiếp</Button>
          <Button kind="ghost" onClick={() => go("/notes")}>Mở ghi chú tay</Button>
        </div>
      </Card>
    </div>
  );
}

export function NotesPage(props: { lesson?: number }) {
  const s = getState();
  const lesson = props.lesson ?? Math.max(1, Math.min(15, s.progress.unlockedLesson || 1));
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

export function SheetsPage() {
  const s = getState();
  const n = Math.max(1, Math.min(15, s.progress.unlockedLesson || 1));
  const [lesson, setLesson] = useState(n);
  const [trace, setTrace] = useState(true);
  const chars = [...new Set(LESSONS[lesson - 1].words.flatMap((w) => [...w.hanzi].filter((c) => c >= "\u4e00")))];
  return (
    <div class="stack" data-testid="sheets">
      <Card>
        <h2 class="h2">Giấy ôn viết (ô mễ) — PDF</h2>
        <div class="field">
          <span>Bài</span>
          <select value={lesson} onChange={(e) => setLesson(Number((e.target as HTMLSelectElement).value))}>
            {LESSONS.map((l) => <option value={l.id} key={l.id}>Bài {l.id}. {l.titleZh}</option>)}
          </select>
        </div>
        <label class="muted"><input type="checkbox" checked={trace} onChange={(e) => setTrace((e.target as HTMLInputElement).checked)} /> Có chữ mờ để tô</label>
        <p class="muted">{chars.length} chữ: {chars.join(" ")}</p>
        <Button kind="primary" wide id="export-sheet" onClick={async () => {
          const blob = await buildPracticePdf({
            title: `Lò Hán — Bài ${lesson} ${LESSONS[lesson - 1].titleZh}`,
            subtitle: "Ô mễ luyện viết",
            chars,
            rowsPerChar: 2,
            trace,
          });
          downloadBlob(blob, `lohan-bai${lesson}-viet.pdf`);
        }}>Xuất PDF</Button>
      </Card>
    </div>
  );
}

export function PenaltyPage() {
  const s = getState();
  const open = s.penalties.filter((p) => !p.done && p.copies > 0);
  const [active, setActive] = useState(open[0]?.id || "");
  const p = open.find((x) => x.id === active) || open[0];
  const [imgs, setImgs] = useState<Record<string, string[]>>({});
  if (!open.length) {
    return (
      <Card data-testid="penalty-empty">
        <h2 class="h2">Không có bài chép phạt</h2>
        <p class="muted">Khi bỏ buổi học hoặc sai một từ hai lần, bài chép phạt sẽ xuất hiện ở đây. Nộp bằng PDF trong app, hoặc tải PDF viết tay rồi giữ làm bằng.</p>
        <Button onClick={() => go("/")}>Về hôm nay</Button>
      </Card>
    );
  }
  return (
    <div class="stack" data-testid="penalty">
      <Card>
        <h2 class="h2">Chép phạt — nộp bài</h2>
        <p>{p.note}</p>
        <div class="tools">
          {open.map((x) => (
            <Button small kind={x.id === p.id ? "primary" : "ghost"} key={x.id} onClick={() => setActive(x.id)}>
              {x.dueChars.join(" ")}
            </Button>
          ))}
        </div>
        {p.dueChars.map((ch) => (
          <div key={ch} style={{ marginTop: 12 }}>
            <div class="hanzi sm">{ch} · viết {p.copies} lần</div>
            <CopyRow
              char={ch}
              n={p.copies}
              onChange={(urls) => setImgs((m) => ({ ...m, [ch]: urls }))}
            />
          </div>
        ))}
        <div style={{ height: 12 }} />
        <Button kind="primary" wide id="submit-penalty" onClick={async () => {
          const attempts = p.dueChars.map((ch) => ({ char: ch, images: imgs[ch] || [] }));
          const blob = await buildPracticePdf({
            title: "Lò Hán — Nộp bài chép phạt",
            subtitle: p.note,
            chars: p.dueChars,
            attempts,
          });
          downloadBlob(blob, `lohan-chep-phat-${Date.now()}.pdf`);
          markPenaltyDone(p.id);
        }}>Nộp bài (xuất PDF)</Button>
      </Card>
    </div>
  );
}

function CopyRow(props: { char: string; n: number; onChange: (urls: string[]) => void }) {
  const refs = useRef<(HTMLCanvasElement | null)[]>([]);
  const pads = Array.from({ length: props.n }, (_, i) => i);
  const collect = () => {
    const urls = refs.current.map((c) => (c && c.width ? c.toDataURL("image/png") : ""));
    props.onChange(urls);
  };
  return (
    <div class="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
      {pads.map((i) => (
        <MiniGrid key={i} char={props.char} onReady={(c) => { refs.current[i] = c; }} onUp={collect} />
      ))}
    </div>
  );
}

function MiniGrid(props: { char: string; onReady: (c: HTMLCanvasElement) => void; onUp: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const r = c.getBoundingClientRect();
    c.width = r.width * dpr;
    c.height = r.height * dpr;
    const ctx = c.getContext("2d")!;
    const drawGrid = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.strokeStyle = "rgba(200,180,160,.7)";
      ctx.lineWidth = dpr;
      ctx.strokeRect(2, 2, c.width - 4, c.height - 4);
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(c.width, c.height);
      ctx.moveTo(c.width, 0); ctx.lineTo(0, c.height);
      ctx.moveTo(c.width / 2, 0); ctx.lineTo(c.width / 2, c.height);
      ctx.moveTo(0, c.height / 2); ctx.lineTo(c.width, c.height / 2);
      ctx.stroke();
    };
    drawGrid();
    props.onReady(c);
    let drawing = false;
    const pt = (e: PointerEvent) => {
      const b = c.getBoundingClientRect();
      return { x: (e.clientX - b.left) * dpr, y: (e.clientY - b.top) * dpr };
    };
    const down = (e: PointerEvent) => { drawing = true; c.setPointerCapture(e.pointerId); const p = pt(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (e: PointerEvent) => {
      if (!drawing) return;
      const p = pt(e);
      ctx.strokeStyle = "#3A2F2A";
      ctx.lineWidth = 2.2 * dpr * (0.7 + (e.pressure || 0.5));
      ctx.lineCap = "round";
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    };
    const up = () => { drawing = false; props.onUp(); };
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up);
    return () => { c.removeEventListener("pointerdown", down); c.removeEventListener("pointermove", move); c.removeEventListener("pointerup", up); };
  }, []);
  return <div class="canvas-wrap rice-bg" style={{ height: 110 }}><canvas ref={ref} /></div>;
}
