/** v2.4 — bản gọn: Bài học (HSK 1/2/3 → bài → màn Viết) và Kiểm tra (chỉ bài đã học xong). */
import { useState } from "preact/hooks";
import { LESSONS } from "../data/curriculum";
import { getState } from "../store";
import { Card, cls, go } from "../ui";
import { LEVELS, levelLessonIds, levelOpen, setLevelOpen, lessonNo } from "../v2/levels";
import { isLessonCompleted } from "../v2/state2";

const lessonById = (n: number) => LESSONS[n - 1];

export function LevelsHome() {
  const [, bump] = useState(0);
  const s = getState();
  return (
    <div class="stack slim-levels" data-testid="levels-home">
      {LEVELS.map((lv) => {
        if (lv.coming) return (
          <Card key={lv.id} class="level-card is-coming"><div class="level-head" data-testid={"level-" + lv.id}><b class="h3">{lv.title}</b><span class="chip">Sắp có</span></div></Card>
        );
        const ids = levelLessonIds(lv);
        const done = ids.filter(isLessonCompleted).length;
        const open = levelOpen(lv.id, done >= ids.length);
        return (
          <Card key={lv.id} class="level-card">
            <button class="level-head" data-testid={"level-" + lv.id} aria-expanded={open} onClick={() => { setLevelOpen(lv.id, !open); bump((n) => n + 1); }}>
              <b class="h3">{lv.title}</b>
              <span class="tiny">{ids.length} bài · đã xong {done}</span>
              <span class="chev">{open ? "▾" : "▸"}</span>
            </button>
            {open && (
              <div class="lesson-rows">
                {ids.map((n) => {
                  const L = lessonById(n);
                  const wd = L.words.filter((w) => s.v2.write.done[w.id]).length;
                  const c = isLessonCompleted(n);
                  return (
                    <button key={n} class={cls("lesson-row", c && "is-done")} data-testid="lesson-row" onClick={() => go("/write/" + n)}>
                      <span class="lr-no">{lessonNo(n)}</span>
                      <span class="lr-title"><b>{L.titleVi || L.titleZh}</b>{L.titleZh && !/^第/.test(L.titleZh) && <span class="tiny hanzi">{L.titleZh}</span>}</span>
                      <span class="lr-meta tiny">{c ? "✓ Đã xong" : `${wd}/${L.words.length} từ`}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

