/** v2.1 — Hôm nay (Công ty / Cạn pin / Xin nghỉ, gợi ý mục, báo cáo điểm yếu thứ Hai), lộ trình, Streak. */
import { useMemo, useState } from "preact/hooks";
import { MIAO_GREET } from "../data/miaoGreet";
import { SEC_SAY, fillGreet, greetCtx, joinVi, pickGreet } from "../v2/greet";
import { getState } from "../store";
import { LOW_LABEL, LOW_EMPTY_MSG, mondayOf, percent, streakFrom, ymd, lessonComplete } from "../v2/queue";
import { LESSON_COUNT, SEC_SHORT, SEC_TITLE, lesson, isExtended } from "../v2/lessons";
import { LEVELS, levelOpen, setLevelOpen, type Level } from "../v2/levels";
import {
  SKILL_NAME, active, chooseMode, currentMode, dismissReport, hasPenalty, isOffToday, lowLeftNow, markOff, openPenalties, owedList, secOf,
  setCompany, streakNow, studiedDays, todayKey, weakReport,
} from "../v2/state2";
import { MiaoFace, PctBar, Pomodoro, SixBar } from "../v2/ui2";
import { miaoEvent } from "../v2/miaoBus";
import { dueReview } from "../store";
import { WORD_BY_ID } from "../data/curriculum";
import { SEC_ORDER } from "../v2/queue";
import { Button, Card, cls, go } from "../ui";

export function TodayV2() {
  const st = getState();
  const v = st.v2;
  const n = v.lesson;
  const sec = secOf(n);
  const mode = currentMode();
  const act = active(n);
  const [msg, setMsg] = useState<string | null>(null);
  const [askOff, setAskOff] = useState(false);
  const left = lowLeftNow();
  const lowUsedToday = (v.low?.days || []).includes(todayKey());
  const owed = owedList();
  const company = st.settings.companyMode;
  const now = new Date();
  const isSunday = now.getDay() === 0;
  const wk = `weekly:${ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((7 - now.getDay()) % 7)))}`;
  const mk = `monthly:${ymd(now).slice(0, 7)}`;
  const monthOpen = now.getDate() >= new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - 6;
  const off = isOffToday();
  const showReport = now.getDay() === 1 && !v.report[mondayOf(now)]?.seen;
  const rep = showReport ? weakReport(st, now) : null;
  const pens = openPenalties();
  const penWords = [...new Set(pens.flatMap((p) => p.dueChars))];
  // Lời chào: dữ liệu ở src/data/miaoGreet.ts; bốc 1 câu mỗi lần vào trang (không đổi khi re-render), không lặp câu lần trước.
  const [firstOpen] = useState(() => { try { const k = "miaozi.greetDay", t = ymd(new Date()); const f = localStorage.getItem(k) !== t; localStorage.setItem(k, t); return f; } catch { return false; } });
  const gctx = greetCtx({ off, mode: mode || "", penN: penWords.length, act, allDone: SEC_ORDER.every((id) => id === "s1" || sec[id]?.done), firstOpen });
  const muc = joinVi(act.map((id) => SEC_SAY[id] || SEC_TITLE[id]));
  const greet = useMemo(() => {
    let last: string | null = null; try { last = localStorage.getItem("miaozi.greetLast"); } catch { /* */ }
    const g = pickGreet(MIAO_GREET, gctx, last);
    try { if (g) localStorage.setItem("miaozi.greetLast", g.id); } catch { /* */ }
    return g;
  }, [gctx, muc, penWords.length]);
  const line = greet ? fillGreet(greet.text, { muc, n: penWords.length }) : "";
  const DOW = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const doneN = SEC_ORDER.filter((id) => sec[id]?.done).length;
  const next = SEC_ORDER.find((id) => id !== "s1" && !sec[id]?.done && !act.includes(id));
  const due = dueReview().slice(0, 3).map((c) => WORD_BY_ID[c.id.split("::")[0]]).filter(Boolean);
  const weak = (st.mistakes || []).slice().sort((a, b) => (b.times || 1) - (a.times || 1)).slice(0, 4);
  return (
    <div class="today2" data-testid="today2">
      <div class="tcol">
        <div class="card hello" data-testid="tutor">
          <div class="cat-wrap"><MiaoFace size={64} expr={greet?.expr || "ngai_ngu"} /></div>
          <div class="hello-body">
            <div class="greet">Chào {st.settings.displayName || "chủ"}</div>
            <div class="date">{DOW[now.getDay()]}, {now.getDate()} tháng {now.getMonth() + 1}</div>
            <div class="bubble" data-testid="greet" data-ctx={gctx} data-id={greet?.id}>{line}</div>
            <button class="chip pink streak-chip" data-testid="streak" onClick={() => go("/streak")}>🔥 Chuỗi {streakNow()} ngày ›</button>
          </div>
        </div>
        {rep && (
          <Card class="report" data-testid="weak-report">
            <div class="row spread"><h2 class="h3">Điểm yếu tuần trước</h2><Button small kind="ghost" onClick={dismissReport}>Đã xem</Button></div>
            {rep.words.length ? <p>Chữ sai nhiều: {rep.words.map((w) => <span key={w.hanzi} class="chip"><span class="hanzi-inline">{w.hanzi}</span> ×{w.times}</span>)}</p> : <p class="muted">Tuần trước không sai chữ nào.</p>}
            {rep.skills.length > 0 && <p class="small">Kỹ năng: {rep.skills.map((k) => `${SKILL_NAME[k.skill] || k.skill} ${k.pct}%`).join(" · ")}{rep.weakest ? <> — <b>yếu nhất: {SKILL_NAME[rep.weakest]}</b></> : null}</p>}
            {rep.words.length > 0 && <p class="muted small">Đã đưa vào chép phạt (Mục 1).</p>}
          </Card>
        )}
        <div class="card modes-card">
          <div class="modes">
            <button class={cls("mode-btn", mode === "company" && "on")} data-testid="mode-company" onClick={() => setCompany(!company)}>
              <span class="m-ico">🏢</span><span><b>Công ty</b><span class="muted small">Mục im lặng · tự phát audio</span></span>
            </button>
            <button class={cls("mode-btn", mode === "low" && "on")} data-testid="mode-low" disabled={left <= 0 && !lowUsedToday} onClick={() => setMsg(chooseMode("low"))}>
              <span class="m-ico">🔋</span><span><b>Cạn pin</b><span class="muted small">Còn {left}/3 lượt tuần này · 15 phút</span></span>
            </button>
            <button class={cls("mode-btn", off && "on")} data-testid="mode-off" disabled={off} onClick={() => { setAskOff(true); miaoEvent("xin_nghi"); }}>
              <span class="m-ico">🌙</span><span><b>Xin nghỉ</b><span class="muted small">{off ? "Hôm nay đã xin nghỉ" : "Giữ chuỗi · mai chép phạt ≥ 5 từ"}</span></span>
            </button>
          </div>
          {askOff && !off && (
            <div class="notice" data-testid="off-ask">
              <p>Xin nghỉ hôm nay à? Chuỗi tôi giữ cho, nhưng mai chép phạt {penWords.length ? "thêm ít nhất 5 từ vào bài đang nợ" : "ít nhất 5 từ của bài gần nhất"} đấy.</p>
              <div class="row"><Button small kind="primary" id="off-confirm" onClick={() => { markOff(); setAskOff(false); }}>Xin nghỉ</Button><Button small kind="ghost" onClick={() => setAskOff(false)}>Thôi, học tiếp</Button></div>
            </div>
          )}
          {(msg || (left <= 0 && !lowUsedToday)) && <p class="notice" data-testid="low-msg">{msg || LOW_EMPTY_MSG}</p>}
          <Pomodoro />
        </div>
        <div class="card agenda">
          <div class="h-kicker">Hôm nay</div>
          <div class="h-title">Việc nên làm</div>
          <div class="agenda-list">
            {act.map((id) => (
              <button key={id} class="ag-item is-suggest" onClick={() => go(`/lesson/${n}/${id}`)}><span class="ag-num">{SEC_SHORT[id]}</span><span class="ag-title">{SEC_TITLE[id]}</span><span class="ag-tag"><span class="sparkle">✦</span> Đang gợi ý</span></button>
            ))}
            {next && <button class="ag-item" onClick={() => go(`/lesson/${n}/${next}`)}><span class="ag-num">{SEC_SHORT[next]}</span><span class="ag-title">{SEC_TITLE[next]}</span><span class="ag-tag">Tiếp theo</span></button>}
            {owed.map((o) => <a key={o.n + o.id} data-testid="owed" class={cls("ag-item", o.overdue && "is-bad")} href={`#/lesson/${o.n}/${o.id}`}><span class="ag-num">{SEC_SHORT[o.id]}</span><span class="ag-title">Nợ: Bài {o.n} · Mục {SEC_SHORT[o.id]}</span><span class="ag-tag">hạn {o.due.slice(8)}/{o.due.slice(5, 7)}{o.overdue ? " · quá hạn" : ""}</span></a>)}
            <button class={cls("ag-item", isSunday && "is-suggest")} id="weekly-btn" onClick={() => go("/test/weekly")}><span class="ag-num">CN</span><span class="ag-title">Kiểm tra tuần</span><span class="ag-tag">{v.tests[wk]?.pass ? "✓ Đã đạt" : isSunday ? "Hôm nay" : "Chủ nhật"}</span></button>
            <button class={cls("ag-item", monthOpen && "is-suggest")} id="monthly-btn" onClick={() => go("/test/monthly")}><span class="ag-num">Th</span><span class="ag-title">Kiểm tra tháng</span><span class="ag-tag">{v.tests[mk]?.pass ? "✓ Đã đạt" : monthOpen ? "Đang mở" : "Tuần cuối tháng"}</span></button>
          </div>
        </div>
      </div>
      <div class="tcol">
        <div class="card lesson-card">
          <div class="row spread"><div><div class="h-kicker">Bài đang học</div><div class="h-title">Bài {n}: {lesson(n).titleVi}</div></div><span class="tiny">{doneN}/{SEC_ORDER.length} mục</span></div>
          <PctBar pct={percent(sec)} />
          <div class="secs">
            {SEC_ORDER.map((id) => {
              const r = sec[id]; const sug = act.includes(id);
              return (
                <button key={id} class={cls("sec-row", r?.done && "is-done", sug && "is-suggest", r?.owed && !r.done && "is-owed")} onClick={() => go(`/lesson/${n}/${id}`)} data-testid={"cell-" + id}>
                  <span class="mark">{r?.done ? "✓" : sug ? "✦" : ""}</span><span class="n">{SEC_SHORT[id]}</span><span class="t">{SEC_TITLE[id]}</span>
                  <span class="st">{r?.done ? "Xong" : sug ? "Đang gợi ý" : r?.owed ? "Nợ" : "Chưa làm"}</span>
                </button>
              );
            })}
          </div>
          <p class="muted small" data-testid="today-active">{mode ? "Chế độ này gợi ý" : "Gợi ý tiếp theo"}: {act.length ? act.map((id) => `Mục ${SEC_SHORT[id]}`).join(", ") : "không còn mục nào"}{hasPenalty() ? ` · có chép phạt (${penWords.length} từ)` : ""}</p>
          <div class="lesson-actions">
            <Button kind="pink" id="go-lesson" onClick={() => go("/lesson/" + n)}>Vào bài {n}</Button>
            <Button kind="blue" onClick={() => go("/roadmap")}>Lộ trình {LESSON_COUNT} bài</Button>
          </div>
        </div>
        {weak.length > 0 && (
          <div class="card side-card">
            <h3>Điểm yếu gần đây</h3>
            <div class="weak-chars">{weak.map((m) => <span key={m.id} class="wch"><span class="hz">{m.hanzi}</span>×{m.times || 1}</span>)}</div>
          </div>
        )}
        <div class="card side-card">
          <h3>Ôn nhanh</h3>
          {due.length ? <div class="review-list">{due.map((w) => <div key={w.id} class="rv"><span class="hz">{w.hanzi}</span><span><span class="py">{w.pinyin}</span><br /><span class="vi">{w.vi}</span></span><span class="chip blue tiny">đến hạn</span></div>)}</div>
            : <p class="muted small">Chưa có thẻ đến hạn.</p>}
          <Button kind="ghost" wide onClick={() => go("/review")}>Ôn thẻ đến hạn</Button>
        </div>
      </div>
    </div>
  );
}

export function RoadmapV2() {
  return (
    <div class="stack" data-testid="roadmap2">
      <Card><h2 class="h2">Lộ trình</h2><p class="muted">15 bài chính + 4 bài từ vựng mở rộng, đúng thứ tự Nhai HSK. Bài mới mở khi bài trước đạt 100% (hoặc phần thiếu đang nợ trong hạn).</p></Card>
      <LevelList />
    </div>
  );
}

function lessonRows(from: number, to: number) {
  const v = getState().v2;
  return Array.from({ length: to - from + 1 }, (_, i) => from + i).map((k) => {
    const sec = secOf(k); const p = percent(sec); const open = k <= v.lesson;
    return (
      <button key={k} class={cls("card road-item", !open && "locked")} onClick={() => open && go("/lesson/" + k)} data-testid="road-item">
        <div class="row spread"><b>Bài {k}{isExtended(k) ? " (mở rộng)" : ""}: {lesson(k).titleVi}</b><span class="chip tiny">{open ? `${p}%` : "🔒"}</span></div>
        {open && <SixBar sec={sec} />}
      </button>
    );
  });
}

function LevelList() {
  return (
    <div class="level-list" data-testid="level-list">
      {LEVELS.map((lv) => lv.coming ? <ComingLevel key={lv.id} lv={lv} /> : <OpenLevel key={lv.id} lv={lv} />)}
    </div>
  );
}

function OpenLevel(props: { lv: Level }) {
  const { lv } = props;
  const from = lv.from || 1, to = lv.to || from;
  const doneN = Array.from({ length: to - from + 1 }, (_, i) => from + i).filter((k) => lessonComplete(secOf(k))).length;
  const total = to - from + 1;
  const finished = doneN >= total;
  const [open, setOpen] = useState(() => levelOpen(lv.id, finished));
  const toggle = () => { const next = !open; setOpen(next); setLevelOpen(lv.id, next); };
  const pct = Math.round((doneN / total) * 100);
  return (
    <div class="level-block" data-testid={"level-" + lv.id} data-open={open ? "1" : "0"}>
      <button class={cls("level-head", open && "open")} onClick={toggle} data-testid={"level-toggle-" + lv.id} aria-expanded={open}>
        <div class="level-title"><b>{lv.title}</b><span class="muted small">{doneN}/{total} bài</span></div>
        <span class="level-bar progress" aria-hidden="true"><span style={{ width: pct + "%" }} /></span>
        <span class="chev" aria-hidden="true">›</span>
      </button>
      {open && <div class="level-lessons">{lessonRows(from, to)}</div>}
    </div>
  );
}

function ComingLevel(props: { lv: Level }) {
  const { lv } = props;
  return (
    <div class="level-block coming" data-testid={"level-" + lv.id}>
      <div class="level-head">
        <div class="level-title"><b>{lv.title} — sắp có</b><span class="muted small">Đang khóa</span></div>
        <span class="chip tiny">🔒</span>
      </div>
    </div>
  );
}

/* ---------------- Lịch tháng ---------------- */
/* ---------------- Streak: chỉ lịch chuỗi ngày ---------------- */
export function streakStats(studied: Set<string>, off: Set<string>, today: Date, legacy?: { count: number; date: string } | null, legacyBest = 0) {
  const all = [...studied, ...off].sort();
  let best = 0, run = 0;
  if (all.length) {
    const d = new Date(all[0] + "T00:00:00");
    const end = ymd(today);
    while (ymd(d) <= end) {
      const k = ymd(d);
      if (studied.has(k)) run++; else if (!off.has(k) && k !== end) run = 0; // ngày nghỉ: giữ chuỗi, không cộng
      best = Math.max(best, run);
      d.setDate(d.getDate() + 1);
    }
  }
  const current = streakFrom(studied, off, today, legacy);
  return { current, best: Math.max(best, current, legacyBest), first: all[0] || null };
}

export function StreakPage() {
  const st = getState(); const v = st.v2;
  const studied = studiedDays(); const off = new Set(v.busy);
  const stats = streakStats(studied, off, new Date(), v.legacy, st.streak.best || 0);
  const [ym, setYm] = useState(() => { const d = new Date(); return [d.getFullYear(), d.getMonth()] as [number, number]; });
  const first = new Date(ym[0], ym[1], 1);
  const days = new Date(ym[0], ym[1] + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => ymd(new Date(ym[0], ym[1], i + 1)))];
  const today = todayKey();
  const start = stats.first || today;
  const kind = (k: string) => studied.has(k) ? "studied" : off.has(k) ? "off" : k >= start && k < today ? "missed" : k === today ? "today" : "none";
  return (
    <div class="stack" data-testid="streak-page">
      <Card>
        <div class="streak-big">
          <div><b data-testid="streak-current">{stats.current}</b><span>ngày liên tiếp</span></div>
          <div><b data-testid="streak-best">{stats.best}</b><span>dài nhất</span></div>
        </div>
      </Card>
      <Card>
        <div class="row spread">
          <Button small kind="ghost" onClick={() => setYm(ym[1] === 0 ? [ym[0] - 1, 11] : [ym[0], ym[1] - 1])}>‹</Button>
          <h2 class="h3">Tháng {ym[1] + 1}/{ym[0]}</h2>
          <Button small kind="ghost" onClick={() => setYm(ym[1] === 11 ? [ym[0] + 1, 0] : [ym[0], ym[1] + 1])}>›</Button>
        </div>
        <div class="cal-grid">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((x) => <div key={x} class="cal-h">{x}</div>)}
          {cells.map((k, i) => k ? (
            <div key={k} class={cls("cal-d", "k-" + kind(k), k === today && "today")} data-testid="cal-day" data-date={k} data-kind={kind(k)}>
              <span class="cal-n">{Number(k.slice(8))}</span>
              <span class="cal-m">{kind(k) === "studied" ? "🔥" : kind(k) === "off" ? "nghỉ" : kind(k) === "missed" ? "✕" : ""}</span>
            </div>
          ) : <div key={i} />)}
        </div>
        <div class="legend"><span><i class="k-studied" />Đã học</span><span><i class="k-off" />Xin nghỉ</span><span><i class="k-missed" />Bỏ lỡ</span></div>
      </Card>
    </div>
  );
}
