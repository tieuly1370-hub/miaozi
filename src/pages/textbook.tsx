import { useState } from "preact/hooks";
import { ALL_WORDS, LESSONS, YT_WATCH, type Word } from "../data/curriculum";
import { TEXTBOOK, type TbLine } from "../data/textbook";
import { playId } from "../audio";
import { getState, markSegWatched, markTextbookRead } from "../store";
import { Button, Card, CarrierNote, cls, go } from "../ui";

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

function Line(props: { line: TbLine; showPy: boolean; showVi: boolean }) {
  const [py, setPy] = useState(false);
  const [vi, setVi] = useState(false);
  const l = props.line;
  return (
    <div class="tb-line" data-testid="tb-line">
      {l.who && <span class="tb-who">{l.who}</span>}
      <div class="tb-body">
        <button class="tb-zh" onClick={() => void playId(l.id).catch(() => {})} title="Chạm để nghe">{l.zh} <span class="tb-play">🔊</span></button>
        {props.showPy || py
          ? <div class="tb-py">{l.py}</div>
          : <button class="tb-reveal" onClick={() => setPy(true)}>pinyin</button>}
        {props.showVi || vi
          ? <div class="tb-vi">{l.vi}</div>
          : <button class="tb-reveal" onClick={() => setVi(true)}>nghĩa</button>}
      </div>
    </div>
  );
}

function WordRow(props: { w: Word; showPy: boolean }) {
  const [py, setPy] = useState(false);
  const w = props.w;
  return (
    <div class="tb-word">
      <button class="tb-zh big" onClick={() => void playId(w.id).catch(() => {})}>{w.hanzi}</button>
      <div>
        {props.showPy || py ? <div class="tb-py">{w.pinyin}</div> : <button class="tb-reveal" onClick={() => setPy(true)}>pinyin</button>}
        <div>{w.vi} <span class="muted">· {w.pos}</span></div>
        <CarrierNote id={w.id} />
      </div>
    </div>
  );
}

export function TextbookPage(props: { n: number }) {
  const les = LESSONS[props.n - 1];
  const tb = TEXTBOOK[props.n - 1];
  const s = getState();
  const [showPy, setShowPy] = useState(false);
  const [showVi, setShowVi] = useState(false);
  if (!les || !tb) return <Card>Chưa có giáo trình bài này.</Card>;
  const read = !!s.progress.textbookRead?.[props.n];
  const vids = [les.lecture && { t: "Bài giảng", v: les.lecture }, les.workbook && { t: "Sách bài tập", v: les.workbook }].filter(Boolean) as { t: string; v: NonNullable<typeof les.lecture> }[];
  let segNo = 0;
  return (
    <div class="stack tb" data-testid="textbook">
      <Card>
        <div class="muted">Giáo trình · Bài {les.id}/15</div>
        <div class="hanzi sm">{les.titleZh}</div>
        <h2 class="h2">{les.titleVi}</h2>
        <div class="tb-toggles">
          <button class={cls("pill", showPy && "on")} onClick={() => setShowPy(!showPy)}>{showPy ? "Ẩn pinyin" : "Hiện hết pinyin"}</button>
          <button class={cls("pill", showVi && "on")} onClick={() => setShowVi(!showVi)}>{showVi ? "Ẩn nghĩa" : "Hiện hết nghĩa"}</button>
        </div>
        <p class="muted">Chạm chữ Hán để nghe. Pinyin và nghĩa ẩn sẵn — tự đọc trước, chạm để kiểm tra.</p>
      </Card>

      <Card>
        <h3 class="h3">🎯 Mục tiêu</h3>
        <ul class="tb-list">{tb.goals.map((g, i) => <li key={i}>{g}</li>)}</ul>
      </Card>

      {vids.length > 0 && (
        <Card>
          <h3 class="h3">🎬 Video thầy Thành Luân</h3>
          {vids.map(({ t, v }) => (
            <div key={v.id}>
              <div class="muted" style={{ marginTop: 6 }}>{t}</div>
              {v.segments.map((sg, i) => {
                const idx = ++segNo;
                return (
                  <a key={i} class="seg" href={YT_WATCH(v.id, sg.start)} target="_blank" rel="noreferrer" onClick={() => markSegWatched(les.id, idx)}>
                    <span>Đoạn {i + 1} · {fmt(sg.start)}–{fmt(sg.end)}</span>
                    <span class={cls("chip", (s.progress.watchSeg[les.id] || 0) >= idx ? "green" : "blue")}>{(s.progress.watchSeg[les.id] || 0) >= idx ? "đã mở" : "Mở"}</span>
                  </a>
                );
              })}
            </div>
          ))}
        </Card>
      )}

      <Card>
        <h3 class="h3">📝 Từ mới ({les.words.length})</h3>
        <div class="tb-words">{les.words.map((w) => <WordRow key={w.id} w={w} showPy={showPy} />)}</div>
      </Card>

      <Card>
        <h3 class="h3">📐 Ngữ pháp</h3>
        {tb.grammar.map((g, i) => (
          <div class="tb-gram" key={i}>
            <h4>{i + 1}. {g.title}</h4>
            <div class="tb-pattern">{g.pattern}</div>
            <p>{g.explain}</p>
            {g.ex.map((l) => <Line key={l.id} line={l} showPy={showPy} showVi={showVi} />)}
          </div>
        ))}
      </Card>

      {tb.dialogues.map((d, i) => (
        <Card key={i}>
          <h3 class="h3">💬 Hội thoại {i + 1}: {d.title}</h3>
          <Button small kind="blue" onClick={async () => {
            for (const l of d.lines) {
              try {
                const a = await playId(l.id);
                await new Promise<void>((r) => { a.addEventListener("ended", () => r(), { once: true }); a.addEventListener("pause", () => r(), { once: true }); });
                await new Promise((r) => setTimeout(r, 350));
              } catch { break; }
            }
          }}>▶ Nghe cả đoạn</Button>
          {d.lines.map((l) => <Line key={l.id} line={l} showPy={showPy} showVi={showVi} />)}
        </Card>
      ))}

      <Card>
        <h3 class="h3">💡 Ghi chú</h3>
        <ul class="tb-list">{tb.notes.map((g, i) => <li key={i}>{g}</li>)}</ul>
      </Card>

      <Button kind={read ? "ghost" : "primary"} wide id="tb-done" onClick={() => { markTextbookRead(les.id); go("/"); }}>
        {read ? "Đã đọc — về Hôm nay" : "Đọc xong giáo trình bài này"}
      </Button>
    </div>
  );
}

/** Tra từ trong 15 bài HSK1 (không mở web khác). */
export function DictPage() {
  const [q, setQ] = useState("");
  const norm = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
  const nq = norm(q.trim());
  const hits = nq ? ALL_WORDS.filter((w) => w.hanzi.includes(q.trim()) || norm(w.pinyin).replace(/'/g, "").includes(nq.replace(/\s+/g, "")) || norm(w.vi).includes(nq)).slice(0, 40) : [];
  return (
    <div class="stack" data-testid="dict">
      <Card>
        <h2 class="h2">Tra từ HSK1</h2>
        <input class="search" placeholder="Gõ chữ Hán, pinyin (không dấu cũng được) hoặc nghĩa…" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
        {!nq && <p class="muted">Chỉ tra trong {ALL_WORDS.length} từ của 15 bài — học đúng một trục, không lạc sang web khác.</p>}
        {nq && !hits.length && <p class="muted">Không có trong HSK1.</p>}
      </Card>
      {hits.map((w) => (
        <Card key={w.id}>
          <div class="row spread">
            <WordRow w={w} showPy={true} />
            <Button small kind="ghost" onClick={() => go("/lesson/" + w.lesson + "/book")}>Bài {w.lesson}</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
