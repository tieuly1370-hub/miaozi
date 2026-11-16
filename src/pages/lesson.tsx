import { useEffect, useMemo, useState } from "preact/hooks";
import { LESSONS, YT_WATCH, PASS_SCORE, type Word, type Lesson } from "../data/curriculum";
import {
  getState, lessonUnlocked, markIntroduced, recordAnswer,
  srsReview, startActivity, noteInput, plannedToday, addMistake, markSegWatched,
} from "../store";
import { cardId } from "../srs";
import { AudioBtn, Bar, Button, Card, CarrierNote, Decomp, Options, PinyinReveal, WordFace, go, useAutoPlay } from "../ui";
import { WriteWord } from "./write";
import { GSKILLS, SKILL_VI } from "../gate";
import { NHAI, isNhaiUrl, nhaiUnitLink } from "../nhai";
import { gateRec, unitPassed, setNhaiLink } from "../store";
import { cls } from "../ui";
import { TextbookPage } from "./textbook";

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
        <p>Cần hoàn thành {n === 1 ? "Tuần 0" : "đủ 4 kỹ năng của bài " + (n - 1)} trước.</p>
        <Button onClick={() => go(n === 1 ? "/week0" : "/lesson/" + (n - 1))}>Quay lại</Button>
      </Card>
    );
  }
  const tab = props.tab || "hub";
  if (tab === "book") return <TextbookPage n={n} />;
  if (tab === "watch") return <Watch les={les} />;
  if (tab === "words") return <Words les={les} />;
  if (tab === "practice") return <Practice les={les} />;
  if (tab === "sentences") return <Sentences les={les} />;
  const day = s.progress.lessonDay[n] || 1;
  return (
    <div class="stack" data-testid="lesson-hub">
      <Card>
        <div class="muted">Bài {n}/15 · Ngày {day}/3</div>
        <div class="hanzi sm">{les.titleZh}</div>
        <h2 class="h2">{les.titleVi}</h2>
        <p class="kw">{les.words.length} từ: {les.words.map((w) => w.hanzi).join(" ")}</p>
        <div class="gate-dots">{GSKILLS.map((k) => <span key={k} class={cls("gdot", gateRec(n, k)?.pass && "ok")}>{SKILL_VI[k]} {gateRec(n, k)?.pass ? "✓" : ""}</span>)}</div>
        {unitPassed(n) && <p class="chip green">Đã qua đủ 4 kỹ năng</p>}
      </Card>
      <Card>
        <h3 class="h3">Học trên Nhai HSK</h3>
        <div class="tools">
          <a class="btn primary small" href={nhaiUnitLink(n, "vocab")} target="_blank" rel="noreferrer">Từ vựng bài {n} ↗</a>
          <a class="btn blue small" href={nhaiUnitLink(n, "grammar")} target="_blank" rel="noreferrer">Ngữ pháp ↗</a>
          <a class="btn ghost small" href={NHAI.hanzi} target="_blank" rel="noreferrer">Phân tích chữ ↗</a>
          <a class="btn ghost small" href={NHAI.reading} target="_blank" rel="noreferrer">Bài khoá ↗</a>
          <a class="btn ghost small" href={NHAI.shadowing} target="_blank" rel="noreferrer">Shadowing ↗</a>
        </div>
        <PinLink n={n} />
        {les.lecture && <a class="alt-link" href={YT_WATCH(les.lecture.id, 0)} target="_blank" rel="noreferrer">Tuỳ chọn: video thầy Thành Luân bài {n} ↗</a>}
      </Card>
      <div class="grid cols-2">
        <Button kind="yellow" wide onClick={() => go(`/lesson/${n}/words`)}>Xem lại từ (có pinyin)</Button>
        <Button kind="purple" wide onClick={() => go(`/lesson/${n}/practice`)}>Luyện viết + nhận chữ</Button>
        <Button kind="pink" wide onClick={() => go(`/lesson/${n}/sentences`)}>Luyện câu</Button>
        <Button kind="ghost" wide onClick={() => go(`/lesson/${n}/book`)}>Ghi chú bài (cũ)</Button>
      </div>
      <Button kind="primary" wide id="lesson-test-btn" onClick={() => go(`/gate/${n}`)}>Cổng qua bài {n} — 4 kỹ năng</Button>
      <p class="notice">Bài {n + 1} chỉ mở khi qua đủ Nghe, Đọc, Nói, Viết của bài {n}. Trang luyện ở đây chỉ để tập — không tính qua bài, không tính ca.</p>
    </div>
  );
}

function PinLink({ n }: { n: number }) {
  const cur = getState().settings.nhaiUnit || {};
  const [v, setV] = useState(cur[`${n}:vocab`] || "");
  const [msg, setMsg] = useState("");
  return (
    <details class="pin">
      <summary class="muted">Ghim link đúng bài trên Nhai (một lần, lần sau bấm là vào thẳng)</summary>
      <p class="muted">Mở bài tương ứng trên Nhai (đã đăng nhập), copy địa chỉ trên thanh trình duyệt rồi dán vào đây.</p>
      <div class="row">
        <input class="input" value={v} placeholder="https://nhaihsk.com/…" onInput={(e) => setV((e.target as HTMLInputElement).value)} />
        <Button small onClick={() => {
          if (!v.trim()) { setNhaiLink(`${n}:vocab`, ""); setMsg("Đã bỏ ghim."); return; }
          if (!isNhaiUrl(v)) { setMsg("Link phải bắt đầu bằng https://nhaihsk.com/"); return; }
          setNhaiLink(`${n}:vocab`, v.trim()); setMsg("Đã ghim.");
        }}>Lưu</Button>
      </div>
      {msg && <p class="muted">{msg}</p>}
    </details>
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
        {vid && <SegList title="Bài giảng" video={vid} lesson={les.id} offset={0} />}
        {wb && <SegList title="Sách bài tập" video={wb} lesson={les.id} offset={vid?.segments.length || 0} />}
        {!wb && les.id <= 5 && <p class="muted">Playlist không có video sách bài tập riêng cho bài 1–5 (bài 6 mới bắt đầu xen kẽ).</p>}
      </Card>
      <Button kind="primary" wide onClick={() => go(`/lesson/${les.id}`)}>Quay lại bài</Button>
    </div>
  );
}

function SegList({ title, video, lesson, offset }: { title: string; video: NonNullable<Lesson["lecture"]>; lesson: number; offset: number }) {
  const watched = getState().progress.watchSeg[lesson] || 0;
  return (
    <div>
      <h3 class="h3">{title}</h3>
      <p class="muted">{video.title} · {Math.floor(video.duration / 60)} phút</p>
      {video.segments.map((s, i) => (
        <a class="seg" key={i} href={YT_WATCH(video.id, s.start)} target="_blank" rel="noreferrer" onClick={() => markSegWatched(lesson, offset + i + 1)}>
          <div>{s.label}</div>
          <span class={"chip " + (offset + i < watched ? "green" : "blue")}>{offset + i < watched ? "đã mở" : "Mở video"}</span>
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
  useAutoPlay(w?.id);
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
        <CarrierNote id={w.id} />
        <Decomp word={w} />
      </Card>
      <div class="row">
        <Button kind="ghost" disabled={i === 0} onClick={() => setI(i - 1)}>Trước</Button>
        {i + 1 < les.words.length
          ? <Button kind="primary" wide onClick={() => setI(i + 1)}>Từ tiếp</Button>
          : <Button kind="primary" wide onClick={() => go(`/lesson/${les.id}`)}>Xong, quay lại bài</Button>}
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
          <WriteWord key={w.id} word={w} onDone={(ok) => { recordAnswer(ok, w, "viết"); srsReview(cardId(w.id, "write"), ok ? 4 : 0); }} />
          <div style={{ marginTop: 10 }}><Button wide onClick={() => setI(i + 1)}>Từ tiếp</Button></div>
        </Card>
      )}
      <Button kind="green" wide onClick={() => go(`/lesson/${les.id}`)}>Quay lại bài</Button>
    </div>
  );
}

function Sentences({ les }: { les: Lesson }) {
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const s = les.sentences[i];
  const others = les.sentences.filter((x) => x.id !== s.id).slice(0, 3);
  useAutoPlay(s.id);
  // pad with previous lessons already in component via options if needed — keep simple
  return (
    <div class="stack" data-testid="lesson-sents">
      <Card>
        <div class="muted">Câu {i + 1}/{les.sentences.length}</div>
        <div class="hanzi sm" style={{ textAlign: "center" }}>{s.hanzi}</div>
        <PinyinReveal pinyin={s.pinyin} firstIntro={false} onHint={() => {}} />
        <div class="tools"><AudioBtn id={s.id} /><AudioBtn id={s.id} slow /></div>
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
          : <Button kind="primary" wide onClick={() => go(`/lesson/${les.id}`)}>Quay lại bài</Button>
      )}
    </div>
  );
}

