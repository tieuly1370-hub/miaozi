/** v2.4 — tab Kiểm tra: chọn cấp, đề chỉ từ bài đã học xong (không có phần Nói). */
import { useState } from "preact/hooks";
import { getState } from "../store";
import { Button, Card, cls, go } from "../ui";
import { LEVELS, levelLessonIds, lessonNo, type Level } from "../v2/levels";
import { isLessonCompleted, recordTest, logSkills } from "../v2/state2";
import { levelTestItems, v2Judge, type Item } from "../gate";
import { ExamRunner } from "./exam";

type Kind = "weekly" | "monthly" | "lesson";
const KIND_VI: Record<Kind, string> = { weekly: "Kiểm tra tuần", monthly: "Kiểm tra tháng", lesson: "Kiểm tra bài" };

export function TestsHub() {
  const avail = LEVELS.filter((l) => !l.coming);
  const [lvId, setLv] = useState<string>(() => {
    const cur = getState().v2.write.lesson || 1;
    return (avail.find((l) => cur >= (l.from || 0) && cur <= (l.to || 0)) || avail[0]).id;
  });
  const [run, setRun] = useState<{ items: Item[]; title: string; key: string } | null>(null);
  const [out, setOut] = useState<null | { title: string; pass: boolean; first: number; total: number; wrong: string[] }>(null);
  const lv = avail.find((l) => l.id === lvId) as Level;
  const ids = levelLessonIds(lv).filter(isLessonCompleted);
  if (run) return <ExamRunner items={run.items} title={run.title} onFinish={(o) => {
    const j = v2Judge(o.items, o.firstOk);
    recordTest(run.key, j.pass, j.score);
    logSkills("test", o.items, o.firstOk);
    setOut({ title: run.title, pass: j.pass, first: j.first, total: j.total, wrong: j.wrong.map((i) => i.answerHanzi) });
    setRun(null);
  }} />;
  const start = (kind: Kind, lessons: number[], title: string) => {
    const items = levelTestItems(kind, lessons, getState().mistakes.map((m) => m.wordId || ""));
    if (!items.length) return;
    setOut(null);
    setRun({ items, title, key: `${lv.id}:${kind}:${lessons.join(",")}` });
  };
  const recent = [...ids].sort((a, b) => a - b).slice(-3);
  return (
    <div class="stack" data-testid="tests-hub">
      <Card>
        <div class="segctl" data-testid="test-level">
          {avail.map((l) => <button key={l.id} type="button" class={cls(l.id === lvId && "on")} onClick={() => setLv(l.id)}>{l.title}</button>)}
        </div>
        <p class="muted small">Đề chỉ lấy từ các bài <b>đã học xong</b> (viết đạt hết từ của bài, hoặc bấm “Đánh dấu đã học xong bài” ở màn Viết). Có chữ na ná, nghe chọn chữ, chọn nghĩa, ghép câu và viết từ trí nhớ (chấm chặt). Đạt khi đúng ngay lần đầu ≥ 80%.</p>
        {out && <p class={out.pass ? "chip green" : "bad-text"} data-testid="test-result">{out.title}: {out.pass ? "ĐẠT" : "CHƯA ĐẠT"} — {out.first}/{out.total}{out.wrong.length ? ` · sai: ${[...new Set(out.wrong)].join(" ")}` : ""}</p>}
      </Card>
      {!ids.length ? (
        <Card><p data-testid="test-empty">Chưa có bài nào học xong ở {lv.title}. Học xong một bài ở tab <b>Bài học</b> rồi quay lại đây nhé.</p>
          <Button kind="ghost" onClick={() => go("/")}>Sang Bài học</Button></Card>
      ) : (
        <>
          <Card>
            <h3 class="h3">{KIND_VI.weekly}</h3>
            <p class="muted small">Các bài xong gần nhất: {recent.map((n) => "Bài " + lessonNo(n)).join(", ")}.</p>
            <Button kind="primary" wide id="test-weekly" onClick={() => start("weekly", ids, `${lv.title} · ${KIND_VI.weekly}`)}>Bắt đầu</Button>
          </Card>
          <Card>
            <h3 class="h3">{KIND_VI.monthly}</h3>
            <p class="muted small">Dài gấp đôi, trộn tất cả {ids.length} bài đã xong của {lv.title}.</p>
            <Button kind="blue" wide id="test-monthly" onClick={() => start("monthly", ids, `${lv.title} · ${KIND_VI.monthly}`)}>Bắt đầu</Button>
          </Card>
          <Card>
            <h3 class="h3">Kiểm tra từng bài</h3>
            <div class="chips-row">{ids.map((n) => <button key={n} class="chip" data-testid="test-lesson" onClick={() => start("lesson", [n], `${lv.title} · Bài ${lessonNo(n)}`)}>Bài {lessonNo(n)}</button>)}</div>
          </Card>
        </>
      )}
    </div>
  );
}
