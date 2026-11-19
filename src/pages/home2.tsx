/** v2.0 — Hôm nay (chọn chế độ), lộ trình 19 bài, lịch tháng, bài đọc, kiểm tra tuần/tháng, bài thêm Bứt phá. */
import { useMemo, useState } from "preact/hooks";
import { getState } from "../store";
import { ALL_SENTENCES } from "../data/curriculum";
import { NHAI_CERT_TESTS } from "../data/nhaiCourse";
import { shuffle, v2Items, v2Judge, type Item } from "../gate";
import { normalizeAsr } from "../v2/speakScore";
import { LOW_LABEL, LOW_EMPTY_MSG, MODE_MIN, mondayOf, percent, sundayOf, ymd, type Mode } from "../v2/queue";
import { LESSON_COUNT, NHAI_GENERAL, SEC_SHORT, lesson, passagesUpTo, isExtended } from "../v2/lessons";
import {
  active, busyLeft, chooseMode, currentMode, hasPenalty, lowLeftNow, markBusy, owedList, recordTest, retryLeftMs, secOf,
  setCompany, setDayNote, streakNow, todayKey,
} from "../v2/state2";
import { Miao, PctBar, Pomodoro, SixBar } from "../v2/ui2";
import { Button, Card, cls, go } from "../ui";
import { ExamRunner } from "./exam";

export const MODE_LABEL: Record<Mode, string> = { company: "🏢 Chế độ Công ty", low: "🔋 Cạn pin", standard: "⚡ Tiêu chuẩn", burst: "🔥 Bứt phá" };
export const MODE_COLOR: Record<Mode, string> = { company: "#9AA0A6", low: "#E8B04B", standard: "#5B8DEF", burst: "#E0654F" };
const fmtMin = (ms: number) => `${Math.ceil(ms / 60000)} phút`;

export function TodayV2() {
  const st = getState();
  const v = st.v2;
  const n = v.lesson;
  const sec = secOf(n);
  const mode = currentMode();
  const act = active(n);
  const [msg, setMsg] = useState<string | null>(null);
  const left = lowLeftNow();
  const lowUsedToday = (v.low?.days || []).includes(todayKey());
  const owed = owedList();
  const company = st.settings.companyMode;
  const now = new Date();
  const isSunday = now.getDay() === 0;
  const wk = `weekly:${sundayOf(now)}`;
  const mk = `monthly:${ymd(now).slice(0, 7)}`;
  const monthOpen = now.getDate() >= new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - 6;
  const pick = (m: Exclude<Mode, "company">) => { const e = chooseMode(m); setMsg(e); };
  return (
    <div class="stack" data-testid="today2">
      {!company && <Miao text={mode ? `Hôm nay ${MODE_LABEL[mode]}. Làm các mục đang sáng. Xong mục nào phải đạt điều kiện mục đó — Miao không cho tick suông.` : "Chọn chế độ cho hôm nay. Chế độ là lựa chọn, không phải số phút bắt buộc — đạt bài kiểm tra mới là đích."} />}
      <Card>
        <div class="row spread">
          <h2 class="h3">Chế độ hôm nay</h2>
          <span class="chip" data-testid="streak">🔥 Chuỗi {streakNow()} ngày</span>
        </div>
        <div class="modes">
          <button class={cls("mode-btn", mode === "company" && "on")} data-testid="mode-company" onClick={() => setCompany(!company)}>
            <b>{MODE_LABEL.company}</b><span class="muted small">Im lặng · mục 2, 3, 6A · 10–20p</span>
          </button>
          <button class={cls("mode-btn", mode === "low" && "on")} data-testid="mode-low" disabled={left <= 0 && !lowUsedToday} onClick={() => pick("low")}>
            <b>{LOW_LABEL(left)}</b><span class="muted small">Mục 1 (nếu có phạt) + đúng 1 mục tiếp</span>
          </button>
          <button class={cls("mode-btn", mode === "standard" && "on")} data-testid="mode-standard" onClick={() => pick("standard")}>
            <b>{MODE_LABEL.standard} 45p</b><span class="muted small">Mục 1 (nếu cần) + 2 mục tiếp</span>
          </button>
          <button class={cls("mode-btn", mode === "burst" && "on")} data-testid="mode-burst" onClick={() => pick("burst")}>
            <b>{MODE_LABEL.burst} 90p</b><span class="muted small">Mọi mục còn lại + bài thêm</span>
          </button>
        </div>
        {(msg || (left <= 0 && !lowUsedToday)) && <p class="notice" data-testid="low-msg">{msg || LOW_EMPTY_MSG}</p>}
        <Pomodoro />
      </Card>
      <Card>
        <div class="row spread">
          <h2 class="h3">Bài {n}: {lesson(n).titleVi}</h2>
          <span class="muted small">{mode ? `~${MODE_MIN[mode]} phút` : ""}</span>
        </div>
        <PctBar pct={percent(sec)} />
        <SixBar sec={sec} active={act} onPick={(id) => go(`/lesson/${n}/${id}`)} />
        <p data-testid="today-active">Hôm nay sáng: {act.length ? act.map((id) => `Mục ${SEC_SHORT[id]}`).join(", ") : "không còn mục nào cho chế độ này"}{hasPenalty() ? " · có chép phạt" : ""}</p>
        <Button kind="primary" wide id="go-lesson" onClick={() => go("/lesson/" + n)}>Vào bài {n}</Button>
        {mode === "burst" && <Button kind="ghost" wide onClick={() => go("/extras")}>Bài thêm Bứt phá (dịch, đọc, video ngắn)</Button>}
      </Card>
      {owed.length > 0 && (
        <Card data-testid="owed">
          <h3 class="h3">Đang nợ</h3>
          <ul>{owed.map((o) => <li key={o.n + o.id} class={o.overdue ? "bad-text" : ""}><a href={`#/lesson/${o.n}/${o.id}`}>Bài {o.n} · Mục {SEC_SHORT[o.id]}</a> — {o.reason} · hạn {o.due.slice(8)}/{o.due.slice(5, 7)}{o.overdue ? " (quá hạn!)" : ""}</li>)}</ul>
        </Card>
      )}
      <Card>
        <h3 class="h3">Kiểm tra</h3>
        <div class="grid cols-2">
          <Button kind={isSunday ? "primary" : "ghost"} id="weekly-btn" onClick={() => go("/test/weekly")}>Kiểm tra tuần {v.tests[wk]?.pass ? "✓" : isSunday ? "(hôm nay)" : "(Chủ nhật)"}</Button>
          <Button kind={monthOpen ? "primary" : "ghost"} id="monthly-btn" onClick={() => go("/test/monthly")}>Kiểm tra tháng {v.tests[mk]?.pass ? "✓" : monthOpen ? "(đang mở)" : "(tuần cuối tháng)"}</Button>
        </div>
      </Card>
      <div class="grid cols-2">
        <Button kind="ghost" id="busy-btn" disabled={v.busy.includes(todayKey())} onClick={() => setMsg(markBusy() || "Đã dời buổi hôm nay. Chuỗi được giữ.")}>{v.busy.includes(todayKey()) ? "Hôm nay đã dời" : `Hôm nay bận (còn ${busyLeft()}/2)`}</Button>
        <Button kind="ghost" onClick={() => go("/calendar")}>📅 Lịch tháng</Button>
        <Button kind="ghost" onClick={() => go("/reading")}>📖 Bài đọc</Button>
        <Button kind="ghost" onClick={() => go("/roadmap")}>Lộ trình 19 bài</Button>
      </div>
    </div>
  );
}

export function RoadmapV2() {
  const v = getState().v2;
  return (
    <div class="stack" data-testid="roadmap2">
      <Card><h2 class="h2">Lộ trình HSK1</h2><p class="muted">15 bài chính + 4 bài từ vựng mở rộng, đúng thứ tự Nhai HSK. Bài mới mở khi bài trước đạt 100% (hoặc phần thiếu đang nợ trong hạn).</p></Card>
      {Array.from({ length: LESSON_COUNT }, (_, i) => i + 1).map((k) => {
        const sec = secOf(k); const p = percent(sec); const open = k <= v.lesson;
        return (
          <button key={k} class={cls("card road-item", !open && "locked")} onClick={() => open && go("/lesson/" + k)} data-testid="road-item">
            <div class="row spread"><b>Bài {k}{isExtended(k) ? " (mở rộng)" : ""}: {lesson(k).titleVi}</b><span class="chip tiny">{open ? `${p}%` : "🔒"}</span></div>
            {open && <SixBar sec={sec} />}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Lịch tháng ---------------- */
export function CalendarPage() {
  const v = getState().v2;
  const [ym, setYm] = useState(() => { const d = new Date(); return [d.getFullYear(), d.getMonth()] as [number, number]; });
  const [sel, setSel] = useState<string>(todayKey());
  const first = new Date(ym[0], ym[1], 1);
  const days = new Date(ym[0], ym[1] + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => ymd(new Date(ym[0], ym[1], i + 1)))];
  const d = v.days[sel];
  const totalMs = cells.reduce((a, k) => a + (k ? v.days[k]?.ms || 0 : 0), 0);
  return (
    <div class="stack" data-testid="calendar">
      <Card>
        <div class="row spread">
          <Button small kind="ghost" onClick={() => setYm(ym[1] === 0 ? [ym[0] - 1, 11] : [ym[0], ym[1] - 1])}>‹</Button>
          <h2 class="h3" data-testid="cal-title">Tháng {ym[1] + 1}/{ym[0]}</h2>
          <Button small kind="ghost" onClick={() => setYm(ym[1] === 11 ? [ym[0] + 1, 0] : [ym[0], ym[1] + 1])}>›</Button>
        </div>
        <div class="cal-grid">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((x) => <div key={x} class="cal-h">{x}</div>)}
          {cells.map((k, i) => {
            if (!k) return <div key={i} />;
            const dl = v.days[k]; const m = dl?.modes?.[dl.modes.length - 1];
            const busy = v.busy.includes(k);
            return (
              <button key={k} class={cls("cal-d", k === todayKey() && "today", k === sel && "sel")} data-testid="cal-day" data-date={k}
                style={m ? { background: MODE_COLOR[m] + "33", borderColor: MODE_COLOR[m] } : undefined} onClick={() => setSel(k)}>
                <span class="cal-n">{Number(k.slice(8))}</span>
                {dl && dl.ms > 0 && <span class="cal-m">{Math.round(dl.ms / 60000)}p</span>}
                {busy && <span class="cal-m">bận</span>}
                {dl?.note && <span class="cal-dot">✎</span>}
              </button>
            );
          })}
        </div>
        <div class="legend">{(Object.keys(MODE_LABEL) as Mode[]).map((m) => <span key={m}><i style={{ background: MODE_COLOR[m] }} />{MODE_LABEL[m]}</span>)}</div>
        <p class="muted small">Cả tháng: {Math.round(totalMs / 60000)} phút học thật (chỉ tính khi app đang mở và có thao tác).</p>
      </Card>
      <Card data-testid="cal-detail">
        <h3 class="h3">{sel.split("-").reverse().join("/")}</h3>
        {d ? (
          <ul>
            <li>Chế độ: {d.modes.length ? d.modes.map((m) => MODE_LABEL[m]).join(", ") : "—"}</li>
            <li>Học: {Math.round(d.ms / 60000)} phút</li>
            <li>Mục xong: {d.secs.length ? d.secs.map((s) => { const [ln, id] = s.split(":"); return `B${ln}·${SEC_SHORT[id as keyof typeof SEC_SHORT]}`; }).join(", ") : "—"}</li>
            {d.tests.length > 0 && <li>Kiểm tra đạt: {d.tests.join(", ")}</li>}
          </ul>
        ) : <p class="muted">Chưa có dữ liệu ngày này.</p>}
        <textarea class="input" rows={3} placeholder="Ghi chú ngày học…" value={d?.note || ""} data-testid="day-note" onChange={(e) => setDayNote(sel, (e.target as HTMLTextAreaElement).value)} />
      </Card>
    </div>
  );
}

/* ---------------- Bài đọc theo cấp ---------------- */
export function ReadingPage() {
  const n = getState().v2.lesson;
  const list = passagesUpTo(Math.max(1, n));
  const [open, setOpen] = useState<string | null>(null);
  const [ans, setAns] = useState<Record<string, number>>({});
  return (
    <div class="stack" data-testid="reading">
      <Card>
        <h2 class="h2">Bài đọc hiểu</h2>
        <p class="muted">Miaozi tự soạn, chỉ dùng chữ đã học tới bài hiện tại. Cấp 1 → 3 tăng dần.</p>
        <a class="btn ghost small" href={NHAI_GENERAL.reading} target="_blank" rel="noreferrer">Thêm bài đọc HSK1 trên Nhai ↗</a>
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
                    <div class="opts">{q.opts.map((o, j) => <button key={j} class={cls("opt", a !== undefined && j === q.a && "ok", a === j && j !== q.a && "bad")} disabled={a !== undefined} onClick={() => setAns({ ...ans, [k]: j })}>{o}</button>)}</div>
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
  const wait = retryLeftMs("test:" + key);
  const title = props.kind === "weekly" ? "Kiểm tra tuần" : "Kiểm tra tháng";
  if (items) return <ExamRunner items={items} title={title} onFinish={(o) => {
    const j = v2Judge(o.items, o.firstOk);
    recordTest(key, j.pass, j.score);
    setOut({ pass: j.pass, first: j.first, total: j.total, wrong: j.wrong.map((i) => i.answerHanzi) });
    setItems(null);
  }} />;
  return (
    <div class="stack" data-testid={"test-" + props.kind}>
      <Card>
        <h2 class="h2">{title}</h2>
        <p>{props.kind === "weekly" ? `Mỗi Chủ nhật: nghe, đọc, viết, nói — chữ của các bài gần đây (tới bài ${v.lesson}), ưu tiên chữ từng sai.` : `Tuần cuối mỗi tháng: dài gấp đôi, bốc ngẫu nhiên từ TẤT CẢ các bài từ đầu HSK1 tới bài ${v.lesson}.`}</p>
        <p class="muted small">Đạt khi đúng ngay lần đầu ≥ 80%. Trượt chờ 10 phút.</p>
        {rec && <p class={rec.pass ? "chip green" : "bad-text"}>{rec.pass ? "Đã đạt" : "Chưa đạt"} · tốt nhất {Math.round(rec.score * 100)}% · {rec.tries} lần</p>}
        {out && <p class={out.pass ? "chip green" : "bad-text"} data-testid="test-result">{out.pass ? "ĐẠT" : "TRƯỢT"} — {out.first}/{out.total}{out.wrong.length ? ` · sai: ${[...new Set(out.wrong)].join(" ")}` : ""}</p>}
        {!isOpen ? <p class="notice">{props.kind === "weekly" ? "Mở vào Chủ nhật." : "Mở trong 7 ngày cuối tháng."}</p>
          : wait > 0 ? <p class="notice">Chờ {fmtMin(wait)} nữa thi lại.</p>
          : <Button kind="primary" wide id="test-start" onClick={() => { setOut(null); setItems(v2Items(props.kind, v.lesson, getState().mistakes.map((m) => m.wordId || ""))); }}>Bắt đầu</Button>}
      </Card>
      {props.kind === "monthly" && (
        <Card><h3 class="h3">Đề thi thử HSK1 thật trên Nhai</h3><p class="muted small">40 câu / 32 phút mỗi đề.</p>
          <div class="chips-row">{NHAI_CERT_TESTS.map((u, i) => <a key={u} class="chip" href={u} target="_blank" rel="noreferrer">Đề {i + 1}</a>)}</div></Card>
      )}
    </div>
  );
}

/* ---------------- Bài thêm (Bứt phá) ---------------- */
export function ExtrasPage() {
  const n = getState().v2.lesson;
  const pool = useMemo(() => shuffle(ALL_SENTENCES.filter((s) => s.lesson <= n)), [n]);
  const [i, setI] = useState(0);
  const [text, setText] = useState("");
  const [shown, setShown] = useState(false);
  const s = pool[i % Math.max(1, pool.length)];
  const ok = s && normalizeAsr(text).replace(/[^\u4e00-\u9fff]/g, "") === normalizeAsr(s.hanzi).replace(/[^\u4e00-\u9fff]/g, "");
  return (
    <div class="stack" data-testid="extras">
      <Card>
        <h2 class="h2">Dịch Việt → Trung</h2>
        {s && <>
          <p class="exam-prompt">{s.vi}</p>
          <input class="input" value={text} placeholder="Gõ câu tiếng Trung…" onInput={(e) => { setText((e.target as HTMLInputElement).value); setShown(false); }} />
          <div class="row"><Button small kind="primary" onClick={() => setShown(true)}>Kiểm tra</Button><Button small kind="ghost" onClick={() => { setI(i + 1); setText(""); setShown(false); }}>Câu khác</Button></div>
          {shown && <p class={ok ? "ok-text" : "bad-text"}>{ok ? "Đúng." : <>Đáp án: <span class="hanzi-inline">{s.hanzi}</span> ({s.pinyin})</>}</p>}
        </>}
      </Card>
      <Card><h2 class="h3">Đọc hiểu theo cấp</h2><Button kind="ghost" onClick={() => go("/reading")}>Mở thư viện bài đọc</Button></Card>
      <Card>
        <h2 class="h3">Video ngắn / shadowing</h2>
        <p class="muted small">Nhai không có shadowing theo từng bài HSK1, nên đây là một mục chung: “{NHAI_GENERAL.shadowingLabel}”. Chọn video ngắn, nói đuổi từng câu.</p>
        <a class="btn ghost" href={NHAI_GENERAL.shadowing} target="_blank" rel="noreferrer">Shadowing HSK1 trên Nhai ↗</a>
      </Card>
      <Card><p class="muted small">Tuần này: {mondayOf(new Date()).split("-").reverse().join("/")} → {sundayOf(new Date()).split("-").reverse().join("/")}</p></Card>
    </div>
  );
}
