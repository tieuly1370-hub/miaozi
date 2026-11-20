/** v2.1 — tải lười: bài đọc, kiểm tra tuần/tháng, Luyện thêm. */
import { useMemo, useState } from "preact/hooks";
import { getState } from "../store";
import { ALL_SENTENCES } from "../data/curriculum";
import { NHAI_CERT_TESTS } from "../data/nhaiCourse";
import { shuffle, v2Items, v2Judge, type Item } from "../gate";
import { normalizeAsr } from "../v2/speakScore";
import { sundayOf, ymd } from "../v2/queue";
import { NHAI_GENERAL, nhaiLesson, passagesUpTo } from "../v2/lessons";
import { logSkills, recordTest } from "../v2/state2";
import { Button, Card, cls, go } from "../ui";
import { ExamRunner } from "./exam";
import { miaoAnswer } from "../v2/miaoBus";

export function ReadingPage(props: { embedded?: boolean } = {}) {
  const n = getState().v2.lesson;
  const list = passagesUpTo(Math.max(1, n));
  const [open, setOpen] = useState<string | null>(null);
  const [ans, setAns] = useState<Record<string, number>>({});
  return (
    <div class="stack" data-testid="reading">
      <Card>
        <h2 class={props.embedded ? "h3" : "h2"}>📖 Đọc hiểu theo cấp</h2>
        <p class="muted small">Chỉ dùng chữ đã học · cấp 1 → 3.</p>
        <a class="btn ghost small" href={NHAI_GENERAL.reading} target="_blank" rel="noreferrer">Thêm bài đọc trên Nhai ↗</a>
      </Card>
      {list.map((p) => (
        <Card key={p.id}>
          <button class="sec-head" onClick={() => setOpen(open === p.id ? null : p.id)}><span class="chip tiny">Cấp {p.level}</span> <b>{p.title}</b> <span class="muted small">(tới bài {p.upTo})</span></button>
          {open === p.id && (
            <div class="stack">
              <div class="passage">{p.zh.map((l, i) => <p key={i} class="hanzi-inline">{l}</p>)}</div>
              {p.qs.map((q, i) => {
                const k = p.id + i; const a = ans[k];
                return (
                  <div key={i} class="mcq"><p>{i + 1}. {q.q}</p>
                    <div class="opts">{q.opts.map((o, j) => <button key={j} class={cls("opt", a !== undefined && j === q.a && "ok", a === j && j !== q.a && "bad")} disabled={a !== undefined} onClick={() => { setAns({ ...ans, [k]: j }); miaoAnswer(j === q.a); }}>{o}</button>)}</div>
                  </div>
                );
              })}
              <details><summary>Bản dịch</summary><p class="muted">{p.vi}</p></details>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

/* ---------------- Kiểm tra tuần (Chủ nhật) / tháng (tuần cuối tháng, toàn bộ từ đầu HSK1) ---------------- */
export function TestPage(props: { kind: "weekly" | "monthly" }) {
  const v = getState().v2;
  const now = new Date();
  const key = props.kind === "weekly" ? `weekly:${sundayOf(now)}` : `monthly:${ymd(now).slice(0, 7)}`;
  const isOpen = props.kind === "weekly" ? now.getDay() === 0 : now.getDate() >= new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - 6;
  const [items, setItems] = useState<Item[] | null>(null);
  const [out, setOut] = useState<null | { pass: boolean; first: number; total: number; wrong: string[] }>(null);
  const rec = v.tests[key];
  const title = props.kind === "weekly" ? "Kiểm tra tuần" : "Kiểm tra tháng";
  if (items) return <ExamRunner items={items} title={title} onFinish={(o) => {
    const j = v2Judge(o.items, o.firstOk);
    recordTest(key, j.pass, j.score);
    logSkills(props.kind, o.items, o.firstOk);
    setOut({ pass: j.pass, first: j.first, total: j.total, wrong: j.wrong.map((i) => i.answerHanzi) });
    setItems(null);
  }} />;
  return (
    <div class="stack" data-testid={"test-" + props.kind}>
      <Card>
        <h2 class="h2">{title}</h2>
        <p>{props.kind === "weekly" ? `Mỗi Chủ nhật: nghe, đọc, viết, nói — chữ của các bài gần đây (tới bài ${v.lesson}), ưu tiên chữ từng sai.` : `Tuần cuối mỗi tháng: dài gấp đôi, bốc ngẫu nhiên từ TẤT CẢ các bài từ đầu HSK1 tới bài ${v.lesson}.`}</p>
        <p class="muted small">Đạt khi đúng ngay lần đầu ≥ 80%. Trượt thì làm lại ngay.</p>
        {rec && <p class={rec.pass ? "chip green" : "bad-text"}>{rec.pass ? "Đã đạt" : "Chưa đạt"} · tốt nhất {Math.round(rec.score * 100)}% · {rec.tries} lần</p>}
        {out && <p class={out.pass ? "chip green" : "bad-text"} data-testid="test-result">{out.pass ? "ĐẠT" : "TRƯỢT"} — {out.first}/{out.total}{out.wrong.length ? ` · sai: ${[...new Set(out.wrong)].join(" ")}` : ""}</p>}
        {!isOpen ? <p class="notice">{props.kind === "weekly" ? "Mở vào Chủ nhật." : "Mở trong 7 ngày cuối tháng."}</p>
          : <Button kind="primary" wide id="test-start" onClick={() => { setOut(null); setItems(v2Items(props.kind, v.lesson, getState().mistakes.map((m) => m.wordId || ""))); }}>Bắt đầu</Button>}
      </Card>
      {props.kind === "monthly" && (
        <Card><h3 class="h3">Đề thi thử HSK1 thật trên Nhai</h3><p class="muted small">40 câu / 32 phút mỗi đề.</p>
          <div class="chips-row">{NHAI_CERT_TESTS.map((u, i) => <a key={u} class="chip" href={u} target="_blank" rel="noreferrer">Đề {i + 1}</a>)}</div></Card>
      )}
    </div>
  );
}

/* ---------------- Luyện thêm (thanh điều hướng) ---------------- */
export function PracticePage() {
  const n = getState().v2.lesson;
  const pool = useMemo(() => shuffle(ALL_SENTENCES.filter((s) => s.lesson <= n)), [n]);
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [shown, setShown] = useState(false);
  const s = pool[i % Math.max(1, pool.length)];
  const ok = s && normalizeAsr(text).replace(/[^\u4e00-\u9fff]/g, "") === normalizeAsr(s.hanzi).replace(/[^\u4e00-\u9fff]/g, "");
  const nl = nhaiLesson(Math.min(n, 15));
  const v = getState().v2;
  const radN = Object.values(v.rad || {}).filter((c) => c.reps >= 1).length;
  const stars = Object.keys(v.stars || {}).length;
  return (
    <div class="stack practice-grid" data-testid="practice">
      <div class="pcol">
        <Card class="shadow-card">
          <h2 class="h3">🎧 Shadowing &amp; video</h2>
          <p class="muted small">{NHAI_GENERAL.shadowingLabel} trên Nhai — nghe rồi nói đuổi.</p>
          <a class="btn primary wide" id="shadowing-link" href={NHAI_GENERAL.shadowing} target="_blank" rel="noreferrer">Mở Shadowing HSK1 ↗</a>
          {nl && <a class="btn ghost wide" href={NHAI_GENERAL.grammar} target="_blank" rel="noreferrer">Video ngữ pháp HSK1 ↗</a>}
        </Card>
        <div class="grid cols-2 practice-links">
          <button class="card link-card" id="to-radicals" data-testid="to-radicals" onClick={() => go("/radicals")}>
            <span class="lc-hz hanzi">部</span><b>Ôn bộ thủ</b><span class="muted small">50 bộ hay gặp · đã thuộc {radN}</span>
          </button>
          <button class="card link-card" id="to-hard" data-testid="to-hard" onClick={() => go("/hard")}>
            <span class="lc-hz">⭐</span><b>Chữ khó</b><span class="muted small">{stars} chữ đã đánh dấu</span>
          </button>
        </div>
        <Card>
          <h2 class="h3">✍️ Dịch Việt → Trung</h2>
          {s && <>
            <p class="exam-prompt">{s.vi}</p>
            <input class="input" value={text} placeholder="Gõ câu tiếng Trung…" onInput={(e) => { setText((e.target as HTMLInputElement).value); setShown(false); }} />
            <div class="row"><Button small kind="primary" onClick={() => { if (!shown) miaoAnswer(!!ok); setShown(true); }}>Kiểm tra</Button><Button small kind="ghost" onClick={() => { setI(i + 1); setText(""); setShown(false); }}>Câu khác</Button></div>
            {shown && <p class={ok ? "ok-text" : "bad-text"}>{ok ? "Đúng." : <>Đáp án: <span class="hanzi-inline">{s.hanzi}</span> ({s.pinyin})</>}</p>}
          </>}
        </Card>
      </div>
      <div class="pcol"><ReadingPage embedded /></div>
    </div>
  );
}
export const ExtrasPage = PracticePage;
