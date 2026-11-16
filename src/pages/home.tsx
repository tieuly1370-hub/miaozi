import { useMemo } from "preact/hooks";
import { LESSONS, TOTAL_LESSONS } from "../data/curriculum";
import { tutorLine } from "../tutor";
import { Bar, Button, Card, TutorBubble, go, cls } from "../ui";
import { getState, lessonUnlocked, openMakeups, plannedToday, weekKey } from "../store";
import { dayNameVi, sessionComplete, isOffDay, type PlannedSession } from "../schedule";

export function Onboarding() {
  const line = tutorLine("welcome", getState().settings);
  return (
    <div class="stack" data-testid="onboarding">
      <TutorBubble mood={line.mood} text={line.text} />
      <Card>
        <h2 class="h2">Lộ trình, không nhảy cóc</h2>
        <ol class="muted" style={{ paddingLeft: 18 }}>
          <li>Tuần 0 — Nền móng: pinyin, thanh điệu, 8 nét, 30 bộ thủ.</li>
          <li>15 bài theo Giáo trình chuẩn HSK1 (video thầy Thành Luân).</li>
          <li>Mỗi bài 3 ngày làm việc. Bài sau chỉ mở khi bài kiểm tra ≥ 80%, có phần nhận mặt chữ không pinyin.</li>
          <li>Ca sáng ở công ty: nghe + đọc (30–120 phút). Tối 21:00: nói + viết trên tablet.</li>
          <li>Thứ Bảy học bù, Chủ nhật nghỉ + kiểm tra tuần 20 phút.</li>
        </ol>
      </Card>
      <Button kind="primary" wide id="start-week0" onClick={() => go("/week0")}>Bắt đầu Tuần 0 — Nền móng</Button>
    </div>
  );
}

export function Today() {
  const s = getState();
  const now = new Date();
  const planned = plannedToday(now);
  const makeups = openMakeups();
  const dow = now.getDay();
  const kind =
    dow === 0 ? "sunday" : dow === 6 ? "saturday"
    : now.getHours() >= 20 ? "evening"
    : "morning";
  const line = tutorLine(s.settings.companyMode ? "company" : kind, s.settings);
  const openPen = s.penalties.filter((p) => !p.done);
  const week = s.progress.weekly[weekKey()];
  const activeMin = Object.values(s.today.activeBySession).reduce((a, b) => a + b, 0) / 60000;
  const acc = s.today.total ? s.today.correct / s.today.total : 0;

  const status = (p: PlannedSession) => {
    const logs = s.sessions.filter((l) => l.sessionId === p.id);
    if (sessionComplete(logs, p)) return "xong";
    const ms = s.today.activeBySession[p.id] || 0;
    if (ms > 0) return "đang học";
    return p.required ? "cần làm" : "tùy chọn";
  };

  return (
    <div class="stack" data-testid="today">
      <TutorBubble mood={line.mood} text={line.text} />
      <div class="grid today">
        <Card>
          <div class="row spread">
            <h2 class="h2">Hôm nay · {dayNameVi(dow)}</h2>
            <span class="chip pink">Chuỗi {s.streak.current} ngày</span>
          </div>
          <p class="muted">Buổi chỉ tính khi làm đủ thời gian thật (không ngồi idle) và đúng ≥ 70%. Ngày nghỉ không phá chuỗi. Học bù trong 48 giờ vẫn giữ chuỗi.</p>
          {planned.map((p) => {
            const st = status(p);
            const href = p.skills.includes("speak") || p.skills.includes("write") ? "/today/evening" : "/today/morning";
            return (
              <button class="seg" key={p.id} onClick={() => go(href)}>
                <div>
                  <strong>{p.label}</strong>
                  <div class="muted">{p.start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}–{p.end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · tối thiểu {p.minMinutes} phút</div>
                </div>
                <span class={cls("chip", st === "xong" ? "green" : st === "đang học" ? "blue" : "peach")}>{st}</span>
              </button>
            );
          })}
          {isOffDay(now, s.settings) && !makeups.length && (
            <p class="muted">Hôm nay không có ca bắt buộc.</p>
          )}
          <div class="row spread" style={{ marginTop: 12 }}>
            <span class="muted">Thời gian thật hôm nay: {Math.floor(activeMin)} phút · đúng {s.today.total ? Math.round(acc * 100) : 0}%</span>
          </div>
        </Card>
        <div class="stack">
          <Card>
            <h3 class="h3">Tiếp theo trên lộ trình</h3>
            {!s.progress.week0Passed ? (
              <Button kind="primary" wide onClick={() => go("/week0")}>Tiếp tục Tuần 0 — Nền móng</Button>
            ) : s.progress.unlockedLesson <= TOTAL_LESSONS ? (
              <CurrentLesson />
            ) : (
              <Button kind="purple" wide onClick={() => go("/review-week")}>Tuần ôn + đề thi thử</Button>
            )}
            <div style={{ marginTop: 10 }}>
              <Button kind="yellow" wide onClick={() => go("/review")}>Ôn flashcard đến hạn</Button>
            </div>
          </Card>
          {makeups.length > 0 && (
            <Card>
              <h3 class="h3">Học bù — chuỗi vẫn giữ</h3>
              {makeups.map((m) => (
                <div class="muted" key={m.id}>
                  Thiếu ca {m.kind === "morning" ? "sáng" : m.kind === "evening" ? "tối" : "kiểm tra tuần"} ngày {m.missedDate}. Hạn đến {new Date(m.dueBy).toLocaleString("vi-VN")}.
                </div>
              ))}
              <Button kind="pink" wide onClick={() => go("/penalty")}>Làm bài chép phạt / học bù</Button>
            </Card>
          )}
          {openPen.length > 0 && (
            <Card>
              <h3 class="h3">Thưởng / phạt đang mở</h3>
              {openPen.map((p) => <p class="muted" key={p.id}>{p.note}</p>)}
              <Button small kind="ghost" onClick={() => go("/penalty")}>Nộp bài chép phạt (PDF)</Button>
            </Card>
          )}
          {week?.done && !week.rewardClaimed && (
            <Card>
              <p>Tuần này đã hoàn thành. Phần thưởng: <strong>{s.settings.weeklyReward}</strong>.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CurrentLesson() {
  const s = getState();
  const n = Math.min(TOTAL_LESSONS, Math.max(1, s.progress.unlockedLesson));
  const les = LESSONS[n - 1];
  const day = s.progress.lessonDay[n] || 1;
  return (
    <div>
      <div class="hanzi sm">{les.titleZh}</div>
      <div>Bài {n}: {les.titleVi} · Ngày {day}/3</div>
      <p class="muted">{day === 1 ? "Xem video + làm quen từ mới" : day === 2 ? "Luyện từ và chữ" : "Câu + kiểm tra bài"}</p>
      <Bar value={((n - 1) + (day - 1) / 3) / TOTAL_LESSONS} />
      <div style={{ marginTop: 10 }}>
        <Button kind="primary" wide onClick={() => go("/lesson/" + n)}>Vào bài {n}</Button>
      </div>
    </div>
  );
}

export function ShiftPage(props: { shift: "morning" | "evening" }) {
  const morning = props.shift === "morning";
  return (
    <div class="stack" data-testid={"shift-" + props.shift}>
      <Card>
        <h2 class="h2">{morning ? "Ca sáng — nghe + đọc" : "Ca tối — nói + viết"}</h2>
        <p class="muted">{morning
          ? "Tối thiểu 2 lần 15 phút (hoặc 30 phút thật). Có thể học thêm đến 120 phút. Phù hợp lúc rảnh ở công ty."
          : "21:00–21:30 trên tablet: luyện nói (chấm thanh rất chặt) và viết chữ / ghi chú tay."}</p>
        <div class="grid cols-2">
          {morning ? (
            <>
              <Button kind="blue" wide onClick={() => go("/listen")}>Luyện nghe</Button>
              <Button kind="yellow" wide onClick={() => go("/review")}>Đọc / flashcard</Button>
              <Button kind="ghost" wide onClick={() => go("/roadmap")}>Xem video bài học</Button>
            </>
          ) : (
            <>
              <Button kind="pink" wide onClick={() => go("/speak")}>Luyện nói</Button>
              <Button kind="purple" wide onClick={() => go("/write")}>Viết theo nét</Button>
              <Button kind="ghost" wide onClick={() => go("/notes")}>Ghi chú tay</Button>
              <Button kind="yellow" wide onClick={() => go("/sheets")}>Xuất giấy ôn / PDF</Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

export function Roadmap() {
  const s = getState();
  return (
    <div class="stack" data-testid="roadmap">
      <Card>
        <h2 class="h2">Lộ trình HSK1</h2>
        <p class="muted">Bám Giáo trình chuẩn HSK1, 15 bài, video thầy Thành Luân. Cổng chặn: phải qua bài kiểm tra (có nhận mặt chữ không pinyin) mới mở bài sau.</p>
      </Card>
      <div class="roadmap">
        <button class={cls("rm-item", s.progress.week0Passed ? "done" : "current")} onClick={() => go("/week0")}>
          <div class="num">0</div>
          <div>
            <strong>Tuần 0 — Nền móng</strong>
            <div class="muted">Pinyin, thanh điệu, 8 nét, bộ thủ</div>
          </div>
          <span class="chip">{s.progress.week0Passed ? "xong" : "đang"}</span>
        </button>
        {LESSONS.map((l) => {
          const unlocked = lessonUnlocked(l.id);
          const passed = !!s.progress.lessonPassed[l.id];
          const current = unlocked && !passed && (s.progress.unlockedLesson === l.id);
          return (
            <button
              class={cls("rm-item", passed && "done", current && "current", !unlocked && "locked")}
              key={l.id}
              onClick={() => unlocked ? go("/lesson/" + l.id) : undefined}
              disabled={!unlocked}
            >
              <div class="num">{l.id}</div>
              <div>
                <strong>Bài {l.id}. {l.titleZh}</strong>
                <div class="muted">{l.titleVi} · {l.words.length} từ</div>
              </div>
              <span class="chip">{passed ? "đạt" : unlocked ? "mở" : "khóa"}</span>
            </button>
          );
        })}
        <button class={cls("rm-item", s.progress.unlockedLesson > 15 ? "current" : "locked")} onClick={() => s.progress.unlockedLesson > 15 ? go("/review-week") : undefined} disabled={s.progress.unlockedLesson <= 15}>
          <div class="num">★</div>
          <div>
            <strong>Tuần ôn + 2 đề thi thử</strong>
            <div class="muted">Nghe + đọc, dạng HSK1</div>
          </div>
          <span class="chip">{s.progress.unlockedLesson > 15 ? "mở" : "khóa"}</span>
        </button>
      </div>
    </div>
  );
}

export function useNowTick() {
  return useMemo(() => Date.now(), [Math.floor(Date.now() / 15000)]);
}
