/** v2.1 — Hôm nay (Công ty / Cạn pin / Xin nghỉ, gợi ý mục, báo cáo điểm yếu thứ Hai), lộ trình, Streak. */
import { useState } from "preact/hooks";
import { getState } from "../store";
import { LOW_LABEL, LOW_EMPTY_MSG, mondayOf, percent, streakFrom, ymd } from "../v2/queue";
import { LESSON_COUNT, SEC_SHORT, lesson, isExtended } from "../v2/lessons";
import {
  SKILL_NAME, active, chooseMode, currentMode, dismissReport, hasPenalty, isOffToday, lowLeftNow, markOff, openPenalties, owedList, secOf,
  setCompany, streakNow, studiedDays, todayKey, weakReport,
} from "../v2/state2";
import { Miao, PctBar, Pomodoro, SixBar } from "../v2/ui2";
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
  const line = off ? "Hôm nay chủ xin nghỉ. Chuỗi giữ nguyên, nhưng mai Miao giao chép phạt. Nghỉ cho đáng."
    : mode === "company" ? "Chế độ Công ty: chỉ gợi ý mục im lặng 2, 3, 6A. Đeo tai nghe, tự phát audio."
    : mode === "low" ? "Cạn pin 15 phút: làm đúng mục đang sáng là đủ giữ chuỗi."
    : `Mục tiếp theo đang sáng. Làm xong phải đạt điều kiện mục đó — Miao không cho tick suông.${rep?.weakest ? ` Tuần trước yếu nhất: ${SKILL_NAME[rep.weakest]}.` : ""}`;
  return (
    <div class="stack" data-testid="today2">
      <Miao text={line} />
      {rep && (
        <Card class="report" data-testid="weak-report">
          <div class="row spread"><h2 class="h3">Báo cáo điểm yếu tuần trước</h2><Button small kind="ghost" onClick={dismissReport}>Đã xem</Button></div>
          {rep.words.length ? <p>Chữ sai nhiều nhất: {rep.words.map((w) => <span key={w.hanzi} class="chip"><span class="hanzi-inline">{w.hanzi}</span> ×{w.times}</span>)}</p> : <p class="muted">Tuần trước không có chữ nào sai. Giữ vậy.</p>}
          {rep.skills.length > 0 && <p>Kỹ năng: {rep.skills.map((k) => `${SKILL_NAME[k.skill] || k.skill} ${k.pct}%`).join(" · ")}{rep.weakest ? <> — <b>yếu nhất: {SKILL_NAME[rep.weakest]}</b></> : null}</p>}
          {rep.words.length > 0 && <p class="muted small">Miao đã đưa các chữ này vào chép phạt (Mục 1).</p>}
        </Card>
      )}
      <Card>
        <div class="row spread">
          <h2 class="h3">Hôm nay</h2>
          <button class="chip streak-chip" data-testid="streak" onClick={() => go("/streak")}>🔥 Chuỗi {streakNow()} ngày ›</button>
        </div>
        <div class="modes">
          <button class={cls("mode-btn", mode === "company" && "on")} data-testid="mode-company" onClick={() => setCompany(!company)}>
            <b>🏢 Chế độ Công ty</b><span class="muted small">Gợi ý mục im lặng 2, 3, 6A · tự phát audio</span>
          </button>
          <button class={cls("mode-btn", mode === "low" && "on")} data-testid="mode-low" disabled={left <= 0 && !lowUsedToday} onClick={() => setMsg(chooseMode("low"))}>
            <b>{LOW_LABEL(left)}</b><span class="muted small">Mục 1 (nếu có phạt) + đúng 1 mục tiếp</span>
          </button>
          <button class={cls("mode-btn", off && "on")} data-testid="mode-off" disabled={off} onClick={() => setAskOff(true)}>
            <b>🛌 Xin nghỉ</b><span class="muted small">{off ? "Hôm nay đã xin nghỉ" : "Không đứt chuỗi · mai chép phạt ≥ 5 từ"}</span>
          </button>
        </div>
        {askOff && !off && (
          <div class="notice" data-testid="off-ask">
            <p>Xin nghỉ hôm nay? Chuỗi giữ nguyên. Mai Miao giao chép phạt: {penWords.length ? "thêm ít nhất 5 từ vào bài phạt đang có" : "ít nhất 5 từ của bài gần nhất"} (tối đa bằng số từ mới của bài).</p>
            <div class="row"><Button small kind="primary" id="off-confirm" onClick={() => { markOff(); setAskOff(false); }}>Xin nghỉ</Button><Button small kind="ghost" onClick={() => setAskOff(false)}>Thôi, học tiếp</Button></div>
          </div>
        )}
        {(msg || (left <= 0 && !lowUsedToday)) && <p class="notice" data-testid="low-msg">{msg || LOW_EMPTY_MSG}</p>}
        <Pomodoro />
      </Card>
      <Card>
        <h2 class="h3">Bài {n}: {lesson(n).titleVi}</h2>
        <PctBar pct={percent(sec)} />
        <SixBar sec={sec} active={act} onPick={(id) => go(`/lesson/${n}/${id}`)} />
        <p data-testid="today-active">{mode ? "Chế độ này gợi ý" : "Gợi ý tiếp theo"}: {act.length ? act.map((id) => `Mục ${SEC_SHORT[id]}`).join(", ") : "không còn mục nào"}{hasPenalty() ? ` · có chép phạt (${penWords.length} từ)` : ""}</p>
        <Button kind="primary" wide id="go-lesson" onClick={() => go("/lesson/" + n)}>Vào bài {n}</Button>
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
        <Button kind="ghost" onClick={() => go("/streak")}>🔥 Streak</Button>
        <Button kind="ghost" onClick={() => go("/roadmap")}>Lộ trình {LESSON_COUNT} bài</Button>
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
