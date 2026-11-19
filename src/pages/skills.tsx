import { SpeakTry } from "../v2/ui2";
import { useEffect, useMemo, useState } from "preact/hooks";
import { ALL_WORDS, ALL_SENTENCES, LESSONS, type Word } from "../data/curriculum";
import { mockExam, weeklyTest } from "../data/exams";
import { audioUrlFor, playId } from "../audio";
import {
  speechAvailable,
} from "../speech";
import { cardId, parseCardId } from "../srs";
import {
  addMistake, bumpSpeak, dueReview, getState, markIntroduced, markWeekDone, noteInput, passMock,
  plannedToday, recordAnswer, srsReview, startActivity,
} from "../store";
import { AudioBtn, Bar, Button, Card, Decomp, Options, PinyinReveal, PitchChart, WordFace, go, useAutoPlay } from "../ui";

export function ReviewPage() {
  const cards = dueReview();
  const [i, setI] = useState(0);
  const [hinted, setHinted] = useState(false);
  const [showVi, setShowVi] = useState(false);
  useEffect(() => {
    startActivity(plannedToday().find((p) => p.skills.includes("read")) || plannedToday()[0] || null, "read");
    const on = () => noteInput();
    window.addEventListener("pointerdown", on);
    return () => window.removeEventListener("pointerdown", on);
  }, []);
  if (!cards.length) {
    return (
      <Card data-testid="review-empty">
        <h2 class="h2">Không có thẻ đến hạn</h2>
        <p class="muted">Học từ mới trong bài, rồi thẻ sẽ xuất hiện đúng lúc cần ôn. Pinyin ẩn mặc định — chạm là gợi ý, thẻ sẽ quay lại sớm hơn.</p>
        <Button onClick={() => go("/")}>Về hôm nay</Button>
      </Card>
    );
  }
  const card = cards[i % cards.length];
  const { wordId, skill } = parseCardId(card.id);
  const word = ALL_WORDS.find((w) => w.id === wordId);
  if (!word) return <Card>Thiếu dữ liệu thẻ.</Card>;
  const next = (q: number) => {
    srsReview(card.id, hinted ? Math.min(q, 2) : q);
    setHinted(false);
    setShowVi(false);
    setI(i + 1);
  };
  return (
    <div class="stack" data-testid="review">
      <Card>
        <h2 class="h2">Ôn bài</h2>
        <p class="muted">{cards.length} thẻ đến hạn · {skill === "recognize" ? "chữ → nghĩa" : skill === "sound" ? "chữ → âm" : "nghĩa → viết"}</p>
        <div class="hanzi" style={{ textAlign: "center" }}>{skill === "write" ? word.vi : word.hanzi}</div>
        {skill !== "write" && (
          <PinyinReveal pinyin={word.pinyin} firstIntro={false} onHint={() => setHinted(true)} />
        )}
        {skill === "sound" && (
          <div class="tools"><AudioBtn id={word.id} /><p class="muted">Tự đọc trước, rồi mới nghe kiểm tra.</p></div>
        )}
        {showVi || skill === "write" ? (
          <div style={{ textAlign: "center" }}>
            {skill === "write" && <div class="hanzi">{word.hanzi}</div>}
            <div>{word.vi}</div>
            <Decomp word={word} />
          </div>
        ) : (
          <Button kind="ghost" wide onClick={() => setShowVi(true)}>Lật nghĩa</Button>
        )}
        <div class="grid cols-2" style={{ marginTop: 12 }}>
          <Button kind="pink" onClick={() => { recordAnswer(false, word, "ôn"); next(0); }}>Lại</Button>
          <Button kind="yellow" onClick={() => next(2)}>Khó</Button>
          <Button kind="blue" onClick={() => { recordAnswer(true, word, "ôn"); next(3); }}>Tốt</Button>
          <Button kind="green" onClick={() => { recordAnswer(true, word, "ôn"); next(5); }}>Dễ</Button>
        </div>
      </Card>
    </div>
  );
}

export function ListenPage() {
  const s = getState();
  const cap = Math.max(1, s.progress.unlockedLesson);
  const words = ALL_WORDS.filter((w) => w.lesson <= cap);
  const [w, setW] = useState<Word>(() => words[0]);
  const [opts, setOpts] = useState<Word[]>([]);
  const [chosen, setChosen] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  useAutoPlay(round ? w?.id : null, [round]);
  const deal = () => {
    setRound((r) => r + 1);
    const item = words[Math.floor(Math.random() * words.length)];
    const d = words.filter((x) => x.id !== item.id).sort(() => Math.random() - 0.5).slice(0, 3);
    setW(item);
    setOpts([item, ...d].sort(() => Math.random() - 0.5));
    setChosen(null);
  };
  useEffect(() => { deal(); startActivity(plannedToday().find((p) => p.skills.includes("listen")) || plannedToday()[0] || null, "listen"); }, []);
  if (!w) return null;
  return (
    <div class="stack" data-testid="listen">
      <Card>
        <h2 class="h2">Luyện nghe</h2>
        <p class="muted">Nghe rồi chọn chữ Hán — không hiện pinyin trên đáp án.</p>
        <AudioBtn id={w.id} label="Phát" />
        <AudioBtn id={w.id} slow />
        <div style={{ height: 8 }} />
        <Options
          options={opts.map((x) => ({ id: x.id, text: x.hanzi, hanzi: x.hanzi }))}
          chosen={chosen}
          answer={w.id}
          locked={!!chosen}
          onPick={(id) => {
            setChosen(id);
            const ok = id === w.id;
            recordAnswer(ok, w, "nghe");
            srsReview(cardId(w.id, "sound"), ok ? 4 : 0);
          }}
        />
        {chosen && <div style={{ marginTop: 8 }}><Button wide kind="primary" onClick={deal}>Câu tiếp</Button></div>}
      </Card>
    </div>
  );
}

export function SpeakPage() {
  const s = getState();
  const cap = Math.max(1, s.v2?.lesson || s.progress.unlockedLesson);
  const words = ALL_WORDS.filter((w) => w.lesson <= cap);
  const [i, setI] = useState(0);
  const w = words[i % Math.max(1, words.length)];
  if (!w) return null;
  return (
    <div class="stack" data-testid="speak">
      <Card>
        <h2 class="h2">Luyện nói</h2>
        <div class="hanzi" style={{ textAlign: "center" }}>{w.hanzi}</div>
        <div class="muted" style={{ textAlign: "center" }}>{w.pinyin} · {w.vi}</div>
        <div class="tools"><AudioBtn id={w.id} /><AudioBtn id={w.id} slow /></div>
        <SpeakTry key={w.id} expected={w.hanzi} onScore={(sc) => {
          bumpSpeak();
          srsReview(cardId(w.id, "sound"), sc.pass ? 4 : 1);
          if (!sc.pass && sc.heardNorm) addMistake(w, "nói", sc.message);
        }} />
        <Button wide onClick={() => setI(i + 1)}>Từ tiếp</Button>
      </Card>
    </div>
  );
}

function micErrorText(e: Error): string {
  const n = (e && (e as DOMException).name) || "";
  if (n === "NotAllowedError" || n === "SecurityError") return "Micro đang bị chặn. Chạm biểu tượng ổ khóa cạnh địa chỉ web → Quyền → Micro → Cho phép, rồi thử lại.";
  if (n === "NotFoundError") return "Máy này không có micro (hoặc micro đang tắt).";
  if (n === "NotReadableError") return "Micro đang bị app khác dùng (gọi điện, ghi âm…). Tắt app đó rồi thử lại.";
  return "Không thu được tiếng. " + (e?.message || "");
}

/** Hướng dẫn trước khi nói: cần micro + Chrome/Edge. */
function MicCheck(props: { asrOk: boolean }) {
  const [state, setState] = useState<"unknown" | "granted" | "denied" | "prompt">("unknown");
  const [msg, setMsg] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  useEffect(() => {
    const p = (navigator as Navigator & { permissions?: Permissions }).permissions;
    p?.query({ name: "microphone" as PermissionName }).then((r) => {
      setState(r.state as "granted" | "denied" | "prompt");
      r.onchange = () => setState(r.state as "granted" | "denied" | "prompt");
    }).catch(() => {});
  }, []);
  const test = async () => {
    setMsg("Nói “nǐ hǎo” vào micro…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      ctx.createMediaStreamSource(stream).connect(an);
      const buf = new Float32Array(an.fftSize);
      let peak = 0;
      const t0 = Date.now();
      await new Promise<void>((res) => {
        const tick = () => {
          an.getFloatTimeDomainData(buf);
          const rms = Math.sqrt(buf.reduce((a, x) => a + x * x, 0) / buf.length);
          peak = Math.max(peak, rms);
          setLevel(Math.min(1, rms * 8));
          if (Date.now() - t0 < 2500) requestAnimationFrame(tick); else res();
        };
        tick();
      });
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
      setState("granted");
      setLevel(0);
      setMsg(peak > 0.02 ? "Micro tốt. Bấm “Đọc ngay” để luyện." : "Micro mở được nhưng gần như không nghe thấy tiếng. Nói to hơn hoặc lại gần máy.");
    } catch (e) {
      setMsg(micErrorText(e as Error));
      if ((e as DOMException).name === "NotAllowedError") setState("denied");
    }
  };
  return (
    <div class="mic-box" data-testid="mic-check">
      <ul class="checklist">
        <li class={props.asrOk ? "ok" : "warn"}>{props.asrOk ? "Trình duyệt hỗ trợ nhận giọng nói." : "Trình duyệt này chưa nhận giọng nói — hãy mở bằng Chrome hoặc Edge. Tạm thời chỉ chấm thanh điệu."}</li>
        <li class={state === "granted" ? "ok" : state === "denied" ? "bad" : "warn"}>
          {state === "granted" ? "Đã cho phép micro." : state === "denied" ? "Micro đang bị chặn: chạm ổ khóa cạnh địa chỉ web → Micro → Cho phép." : "Cần cho phép micro: lần đầu bấm nút, trình duyệt sẽ hỏi — chọn “Cho phép”."}
        </li>
        <li class="ok">Thanh điệu chấm ngay trên máy. Phần nhận âm (phụ âm, vần) của Chrome cần có mạng.</li>
      </ul>
      <div class="row">
        <Button small kind="ghost" onClick={test}>Kiểm tra micro</Button>
        {level > 0 && <div class="progress" style={{ flex: 1 }}><span style={{ width: Math.round(level * 100) + "%" }} /></div>}
      </div>
      {msg && <p class="muted">{msg}</p>}
    </div>
  );
}

export function MistakesPage() {
  const s = getState();
  return (
    <div class="stack" data-testid="mistakes">
      <Card>
        <h2 class="h2">Sổ lỗi sai</h2>
        {!s.mistakes.length && <p class="muted">Chưa có lỗi. Sai sẽ được ghi lại để ôn đúng chỗ.</p>}
        {s.mistakes.map((m) => (
          <div class="seg" key={m.id}>
            <div>
              <span class="hanzi xs">{m.hanzi}</span>
              <div class="muted">{m.kind} · {m.times} lần · {m.note}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function ReviewWeekPage() {
  const s = getState();
  if (s.progress.unlockedLesson <= 15) {
    return <Card><p>Hết 15 bài mới mở tuần ôn và đề thi thử.</p><Button onClick={() => go("/roadmap")}>Lộ trình</Button></Card>;
  }
  return (
    <div class="stack" data-testid="review-week">
      <Card>
        <h2 class="h2">Tuần ôn + đề thi thử</h2>
        <p class="muted">Ôn flashcard cả 150+ từ, xem lại video tổng hợp 6 đề của thầy, rồi làm 2 đề gốc (nghe + đọc) dạng HSK1 — không chép đề thật.</p>
        <Button kind="yellow" wide onClick={() => go("/review")}>Ôn flashcard</Button>
        <div style={{ height: 8 }} />
        <a class="btn blue wide" href="https://www.youtube.com/watch?v=tEt96A87bDE" target="_blank" rel="noreferrer">Video tổng hợp đề thi thử (thầy Thành Luân)</a>
        <div style={{ height: 8 }} />
        <Button kind="primary" wide onClick={() => go("/mock/1")}>Đề thi thử 1 {s.progress.mocks[1] ? `· ${Math.round(s.progress.mocks[1].score * 100)}%` : ""}</Button>
        <div style={{ height: 8 }} />
        <Button kind="purple" wide onClick={() => go("/mock/2")}>Đề thi thử 2 {s.progress.mocks[2] ? `· ${Math.round(s.progress.mocks[2].score * 100)}%` : ""}</Button>
      </Card>
    </div>
  );
}

export function MockPage(props: { n: 1 | 2 }) {
  const exam = useMemo(() => mockExam(props.n), [props.n]);
  const qs = [...exam.listening, ...exam.reading];
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [ok, setOk] = useState(0);
  const [done, setDone] = useState(false);
  const q = qs[i];
  useAutoPlay(q && (q.kind === "listen-choice" || q.kind === "listen-tone") ? q.audioId : null, [i]);
  if (done) {
    const score = ok / qs.length;
    return (
      <Card data-testid="mock-result">
        <h2 class="h2">Đề thử {props.n}: {Math.round(score * 100)}%</h2>
        <Bar value={score} />
        <p>Nghe {exam.listening.length} câu, đọc {exam.reading.length} câu. Điểm HSK1 thật tính khác chút, đây là bài luyện cùng dạng.</p>
        <Button wide onClick={() => go("/review-week")}>Về tuần ôn</Button>
      </Card>
    );
  }
  return (
    <div class="stack" data-testid="mock">
      <Card>
        <div class="row spread">
          <h2 class="h2">Đề thử {props.n} · {i < exam.listening.length ? "Nghe" : "Đọc"}</h2>
          <span class="muted">{i + 1}/{qs.length}</span>
        </div>
        <Bar value={i / qs.length} />
        <p>{q.prompt}</p>
        {q.hanzi && q.kind !== "listen-choice" && q.kind !== "listen-tone" && <div class="hanzi sm" style={{ textAlign: "center" }}>{q.hanzi}</div>}
        {(q.kind === "listen-choice" || q.kind === "listen-tone") && <AudioBtn id={q.audioId} />}
        <Options options={q.options} chosen={chosen} answer={q.answer} locked={!!chosen} onPick={(id) => {
          setChosen(id);
          if (id === q.answer) setOk((x) => x + 1);
          recordAnswer(id === q.answer);
        }} />
        {chosen && <div style={{ marginTop: 8 }}><Button kind="primary" wide onClick={() => {
          if (i + 1 >= qs.length) {
            const score = ok / qs.length;
            passMock(props.n, score);
            markWeekDone();
            setDone(true);
          } else { setI(i + 1); setChosen(null); }
        }}>{i + 1 >= qs.length ? "Kết quả" : "Câu tiếp"}</Button></div>}
      </Card>
    </div>
  );
}

export function WeeklyPage() {
  const s = getState();
  const qs = useMemo(() => weeklyTest(Math.max(1, s.progress.unlockedLesson), new Date().getDate() + 20), []);
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [ok, setOk] = useState(0);
  const [done, setDone] = useState(false);
  const q = qs[i];
  useAutoPlay(q?.audioId, [i]);
  if (done) {
    const score = ok / qs.length;
    if (score >= 0.7) markWeekDone();
    return (
      <Card>
        <h2 class="h2">Kiểm tra tuần: {Math.round(score * 100)}%</h2>
        <Bar value={score} />
        {score >= 0.7
          ? <p>Đạt tuần. Phần thưởng {s.settings.displayName} đã đặt: <strong>{s.settings.weeklyReward}</strong>.</p>
          : <p>Chưa đạt 70%. Ôn sổ lỗi và flashcard rồi làm lại.</p>}
        <Button wide onClick={() => go("/")}>Về hôm nay</Button>
      </Card>
    );
  }
  return (
    <div class="stack" data-testid="weekly">
      <Card>
        <div class="row spread"><h2 class="h2">Kiểm tra tuần</h2><span>{i + 1}/{qs.length}</span></div>
        <p>{q.prompt}</p>
        {q.hanzi && <div class="hanzi" style={{ textAlign: "center" }}>{q.hanzi}</div>}
        {q.audioId && <AudioBtn id={q.audioId} />}
        <Options options={q.options} chosen={chosen} answer={q.answer} locked={!!chosen} onPick={(id) => {
          setChosen(id); if (id === q.answer) setOk((x) => x + 1); recordAnswer(id === q.answer);
        }} />
        {chosen && <Button wide kind="primary" onClick={() => { if (i + 1 >= qs.length) setDone(true); else { setI(i + 1); setChosen(null); } }}>Tiếp</Button>}
      </Card>
    </div>
  );
}

void markIntroduced;
void LESSONS;
