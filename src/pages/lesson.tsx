import { useEffect, useMemo, useState } from "preact/hooks";
import { LESSONS, YT_WATCH, PASS_SCORE, type Word, type Lesson } from "../data/curriculum";
import { lessonTest } from "../data/exams";
import {
  getState, lessonUnlocked, markDayDone, markIntroduced, passLesson, recordAnswer,
  srsReview, startActivity, noteInput, plannedToday, addMistake,
} from "../store";
import { cardId } from "../srs";
import { AudioBtn, Bar, Button, Card, Decomp, Options, PinyinReveal, WordFace, go, cls } from "../ui";
import { WriteBox } from "./write";

export function LessonPage(props: { n: number; tab?: string }) {
  const n = props.n;
  const les = LESSONS[n - 1];
  const s = getState();
  useEffect(() => {
    const plan = plannedToday();
    startActivity(plan[0] || null, "read");
    const on = () => noteInput();
    window.addEventListener("pointerdown", on);
    return () => window.removeEventListener("pointerdown", on);
  }, [n]);
  if (!les) return <Card>Không có bài này.</Card>;
  if (!lessonUnlocked(n)) {
    return (
      <Card data-testid="lesson-locked">
        <h2 class="h2">Bài {n} đang khóa</h2>
        <p>Cần hoàn thành {n === 1 ? "Tuần 0" : "bài " + (n - 1) + " (≥ 80%, gồm nhận mặt chữ không pinyin)"} trước.</p>
        <Button onClick={() => go(n === 1 ? "/week0" : "/lesson/" + (n - 1))}>Quay lại</Button>
      </Card>
    );
  }
  const tab = props.tab || "hub";
  if (tab === "watch") return <Watch les={les} />;
  if (tab === "words") return <Words les={les} />;
  if (tab === "practice") return <Practice les={les} />;
  if (tab === "sentences") return <Sentences les={les} />;
  if (tab === "test") return <Test les={les} />;
  const day = s.progress.lessonDay[n] || 1;
  const passed = s.progress.lessonPassed[n];
  return (
    <div class="stack" data-testid="lesson-hub">
      <Card>
        <div class="muted">Bài {n}/15 · Ngày {day}/3</div>
        <div class="hanzi sm">{les.titleZh}</div>
        <h2 class="h2">{les.titleVi}</h2>
        <p class="muted">{les.grammarNote}</p>
        <p class="kw">{les.words.length} từ · {les.sentences.length} câu gốc (không chép giáo trình)</p>
        {passed && <p class="chip green">Đã đạt {Math.round(passed.score * 100)}%</p>}
      </Card>
      <div class="grid cols-2">
        <Button kind="blue" wide onClick={() => go(`/lesson/${n}/watch`)}>Ngày 1 · Xem video</Button>
        <Button kind="yellow" wide onClick={() => go(`/lesson/${n}/words`)}>Ngày 1 · Từ mới</Button>
        <Button kind="purple" wide onClick={() => go(`/lesson/${n}/practice`)}>Ngày 2 · Luyện chữ</Button>
        <Button kind="pink" wide onClick={() => go(`/lesson/${n}/sentences`)}>Ngày 3 · Câu</Button>
      </div>
      <Button kind="primary" wide id="lesson-test-btn" onClick={() => go(`/lesson/${n}/test`)}>Kiểm tra bài {n}</Button>
      <p class="notice">Bài {n + 1} chỉ mở khi đạt ≥ 80%, trong đó có phần nhận mặt chữ không pinyin. Trượt thì chỉ ôn câu sai rồi thi lại.</p>
    </div>
  );
}

function Watch({ les }: { les: Lesson }) {
  const vid = les.lecture;
  const wb = les.workbook;
  return (
    <div class="stack" data-testid="lesson-watch">
      <Card>
        <h2 class="h2">Video thầy Thành Luân</h2>
        <p class="muted">Mỗi đoạn khoảng 15–20 phút. Xem xong một mốc thì dừng, làm từ mới. App mở YouTube đúng phút (thêm &t=).</p>
        {vid && <SegList title="Bài giảng" video={vid} />}
        {wb && <SegList title="Sách bài tập" video={wb} />}
        {!wb && les.id <= 5 && <p class="muted">Playlist không có video sách bài tập riêng cho bài 1–5 (bài 6 mới bắt đầu xen kẽ).</p>}
      </Card>
      <Button kind="primary" wide onClick={() => { markDayDone(les.id, 1); go(`/lesson/${les.id}/words`); }}>Đã xem, sang từ mới</Button>
    </div>
  );
}

function SegList({ title, video }: { title: string; video: NonNullable<Lesson["lecture"]> }) {
  return (
    <div>
      <h3 class="h3">{title}</h3>
      <p class="muted">{video.title} · {Math.floor(video.duration / 60)} phút</p>
      {video.segments.map((s, i) => (
        <a class="seg" key={i} href={YT_WATCH(video.id, s.start)} target="_blank" rel="noreferrer">
          <div>{s.label}</div>
          <span class="chip blue">Mở YouTube</span>
        </a>
      ))}
    </div>
  );
}

function Words({ les }: { les: Lesson }) {
  const [i, setI] = useState(0);
  const w = les.words[i];
  const s = getState();
  const first = w && !(s.srs[cardId(w.id, "recognize")]?.introduced);
  useEffect(() => { if (w) markIntroduced(w.id); }, [w?.id]);
  if (!w) return null;
  return (
    <div class="stack" data-testid="lesson-words">
      <Card>
        <div class="row spread"><span class="muted">Từ {i + 1}/{les.words.length}</span><span class="chip">Lần đầu hiện pinyin</span></div>
        <WordFace word={w} firstIntro={true} showVi />
        <div class="tools">
          <AudioBtn id={w.id} />
          <AudioBtn id={w.id} slow />
        </div>
        <Decomp word={w} />
      </Card>
      <div class="row">
        <Button kind="ghost" disabled={i === 0} onClick={() => setI(i - 1)}>Trước</Button>
        {i + 1 < les.words.length
          ? <Button kind="primary" wide onClick={() => setI(i + 1)}>Từ tiếp</Button>
          : <Button kind="primary" wide onClick={() => { markDayDone(les.id, 1); go(`/lesson/${les.id}`); }}>Xong từ mới</Button>}
      </div>
    </div>
  );
}

function Practice({ les }: { les: Lesson }) {
  const [mode, setMode] = useState<"recog" | "write">("recog");
  const [i, setI] = useState(0);
  const words = les.words;
  const w = words[i % words.length];
  const others = useMemo(() => {
    const rest = words.filter((x) => x.id !== w.id);
    return [...rest].sort(() => Math.random() - 0.5).slice(0, 3);
  }, [w.id]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [hinted, setHinted] = useState(false);
  return (
    <div class="stack" data-testid="lesson-practice">
      <div class="tools">
        <Button small kind={mode === "recog" ? "primary" : "ghost"} onClick={() => setMode("recog")}>Nhận chữ</Button>
        <Button small kind={mode === "write" ? "primary" : "ghost"} onClick={() => setMode("write")}>Viết nét</Button>
      </div>
      {mode === "recog" ? (
        <Card>
          <div class="hanzi" style={{ textAlign: "center" }}>{w.hanzi}</div>
          <PinyinReveal pinyin={w.pinyin} firstIntro={false} onHint={() => {
            setHinted(true);
            srsReview(cardId(w.id, "recognize"), 2);
          }} />
          <p>Nghĩa là gì?</p>
          <Options
            options={[w, ...others].sort((a, b) => a.id.localeCompare(b.id)).map((x) => ({ id: x.id, text: x.vi }))}
            chosen={chosen}
            answer={w.id}
            locked={!!chosen}
            onPick={(id) => {
              setChosen(id);
              const ok = id === w.id;
              recordAnswer(ok, w, "nhận chữ");
              srsReview(cardId(w.id, "recognize"), hinted ? 2 : ok ? 4 : 0);
            }}
          />
          {chosen && <div style={{ marginTop: 8 }}><Button wide onClick={() => { setI(i + 1); setChosen(null); setHinted(false); }}>Tiếp</Button></div>}
        </Card>
      ) : (
        <Card>
          <p>Viết: <strong>{w.vi}</strong> {w.hanzi.length > 1 ? `(${w.hanzi})` : ""}</p>
          <WriteChars word={w} onDone={(ok) => { recordAnswer(ok, w, "viết"); srsReview(cardId(w.id, "write"), ok ? 4 : 0); }} />
          <Button wide onClick={() => setI(i + 1)}>Chữ / từ tiếp</Button>
        </Card>
      )}
      <Button kind="green" wide onClick={() => { markDayDone(les.id, 2); go(`/lesson/${les.id}`); }}>Xong ngày 2</Button>
    </div>
  );
}

function WriteChars({ word, onDone }: { word: Word; onDone: (ok: boolean) => void }) {
  const chars = [...word.hanzi].filter((c) => c >= "\u4e00");
  const [k, setK] = useState(0);
  const [okAll, setOk] = useState(true);
  const ch = chars[k];
  if (!ch) return <p>Không có chữ để viết.</p>;
  return (
    <div>
      <div class="muted">Chữ {k + 1}/{chars.length}: {ch}</div>
      <WriteBox
        key={ch + k}
        character={ch}
        onResult={(ok) => {
          const next = okAll && ok;
          setOk(next);
          if (k + 1 < chars.length) setK(k + 1);
          else onDone(next);
        }}
      />
    </div>
  );
}

function Sentences({ les }: { les: Lesson }) {
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const s = les.sentences[i];
  const others = les.sentences.filter((x) => x.id !== s.id).slice(0, 3);
  // pad with previous lessons already in component via options if needed — keep simple
  return (
    <div class="stack" data-testid="lesson-sents">
      <Card>
        <div class="muted">Câu {i + 1}/{les.sentences.length}</div>
        <div class="hanzi sm" style={{ textAlign: "center" }}>{s.hanzi}</div>
        <PinyinReveal pinyin={s.pinyin} firstIntro={false} onHint={() => {}} />
        <AudioBtn id={s.id} />
        <AudioBtn id={s.id} slow />
        <p>Nghĩa là gì?</p>
        <Options
          options={[s, ...others].map((x) => ({ id: x.id, text: x.vi }))}
          chosen={chosen}
          answer={s.id}
          locked={!!chosen}
          onPick={(id) => { setChosen(id); recordAnswer(id === s.id); }}
        />
      </Card>
      {chosen && (
        i + 1 < les.sentences.length
          ? <Button kind="primary" wide onClick={() => { setI(i + 1); setChosen(null); }}>Câu tiếp</Button>
          : <Button kind="primary" wide onClick={() => { markDayDone(les.id, 3); go(`/lesson/${les.id}/test`); }}>Sang kiểm tra bài</Button>
      )}
    </div>
  );
}

function Test({ les }: { les: Lesson }) {
  const s = getState();
  const last = s.progress.lessonPassed[les.id];
  const reviewOnly = last && last.score < PASS_SCORE;
  const [wrongIds, setWrongIds] = useState<string[] | null>(null);
  const all = useMemo(() => lessonTest(les.id), [les.id]);
  const qs = wrongIds ? all.filter((q) => wrongIds.includes(q.id)) : all;
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [ok, setOk] = useState(0);
  const [miss, setMiss] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [writeOk, setWriteOk] = useState<boolean | null>(null);
  const q = qs[i];

  const finish = (correct: number, missed: string[]) => {
    const score = qs.length ? correct / qs.length : 0;
    // If this is a retake of wrong items only, blend? Spec: review wrong, retake. I'll score the retake itself, but if they only retake wrong, require 80% of retake AND overall conceptually. Simpler: retake the full test after a review round, or score retake of missed at 80%.
    // If reviewOnly/wrongIds, passing the missed set at 80% + previous correct counts as pass of full test.
    let final = score;
    if (wrongIds) {
      const prevCorrect = all.length - wrongIds.length;
      final = (prevCorrect + correct) / all.length;
    }
    passLesson(les.id, final);
    setMiss(missed);
    setDone(true);
  };

  if (done) {
    const score = (wrongIds
      ? (all.length - wrongIds.length + ok)
      : ok) / all.length;
    const passed = score >= PASS_SCORE;
    return (
      <Card data-testid="lesson-test-result">
        <h2 class="h2">{passed ? "Đạt rồi, mở bài tiếp!" : "Chưa đạt 80%"}</h2>
        <p>Đúng {Math.round(score * all.length)}/{all.length} ({Math.round(score * 100)}%).</p>
        <Bar value={score} />
        {!passed && <p class="muted">Chỉ ôn các câu sai, rồi thi lại phần đó.</p>}
        {passed && les.id < 15 && <Button kind="primary" wide onClick={() => go("/lesson/" + (les.id + 1))}>Vào bài {les.id + 1}</Button>}
        {passed && les.id === 15 && <Button kind="primary" wide onClick={() => go("/review-week")}>Sang tuần ôn</Button>}
        {!passed && (
          <Button kind="pink" wide onClick={() => {
            setWrongIds(miss.length ? miss : null);
            setI(0); setOk(0); setChosen(null); setDone(false); setWriteOk(null);
          }}>Ôn câu sai và thi lại</Button>
        )}
        <div style={{ marginTop: 8 }}><Button kind="ghost" wide onClick={() => go("/lesson/" + les.id)}>Về bài học</Button></div>
      </Card>
    );
  }
  if (!q) return null;
  const isWrite = q.kind === "write";
  return (
    <div class="stack" data-testid="lesson-test">
      <Card>
        <div class="row spread">
          <h2 class="h2">Kiểm tra bài {les.id}</h2>
          <span class="muted">{i + 1}/{qs.length}{wrongIds ? " · phần sai" : ""}</span>
        </div>
        <Bar value={i / qs.length} />
        <p>{q.prompt}</p>
        {q.kind === "recog" || q.kind === "read-meaning" ? <div class="hanzi" style={{ textAlign: "center" }}>{q.hanzi}</div> : null}
        {q.kind === "listen-choice" || q.kind === "listen-tone" ? <AudioBtn id={q.audioId} label="Nghe" /> : null}
        {isWrite ? (
          <div>
            <WriteBox character={q.answer} onResult={(okw) => {
              setWriteOk(okw);
              setChosen(okw ? q.answer : "no");
              if (okw) setOk((x) => x + 1);
              else setMiss((m) => [...m, q.id]);
              recordAnswer(okw);
            }} />
          </div>
        ) : (
          <Options
            options={q.options}
            chosen={chosen}
            answer={q.answer}
            locked={!!chosen}
            onPick={(id) => {
              if (chosen) return;
              setChosen(id);
              const good = id === q.answer;
              if (good) setOk((x) => x + 1);
              else setMiss((m) => [...m, q.id]);
              recordAnswer(good);
              if (!good && q.hanzi) {
                const word = les.words.find((w) => w.hanzi === q.hanzi);
                if (word) addMistake(word, "kiểm tra");
              }
            }}
          />
        )}
        {chosen && (
          <div style={{ marginTop: 12 }}>
            <Button kind="primary" wide onClick={() => {
              if (i + 1 >= qs.length) finish(ok, miss);
              else { setI(i + 1); setChosen(null); setWriteOk(null); }
            }}>{i + 1 >= qs.length ? "Xem kết quả" : "Câu tiếp"}</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
