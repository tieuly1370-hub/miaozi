import { useEffect, useState } from "preact/hooks";
import {
  INITIALS, FINALS, TONES, STROKES, STROKE_RULES, RADICALS, WEEK0_TRACE_CHARS,
} from "../data/curriculum";
import { week0Test } from "../data/exams";
import { completeWeek0, getState, markWeek0Part, recordAnswer, startActivity, noteInput } from "../store";
import { plannedToday } from "../store";
import { AudioBtn, Bar, Button, Card, Options, go } from "../ui";
import { WriteBox } from "./write";
import { pinyin } from "pinyin-pro";

/** Chữ mẫu được loa đọc cho mỗi thanh mẫu / vận mẫu (loa đọc cả âm tiết, không đọc âm rời). */
const EXAMPLE: Record<string, string> = {"init-b": "八", "init-p": "朋", "init-m": "妈", "init-f": "饭", "init-d": "大", "init-t": "他", "init-n": "你", "init-l": "老", "init-g": "个", "init-k": "看", "init-h": "好", "init-j": "叫", "init-q": "七", "init-x": "谢", "init-zh": "这", "init-ch": "吃", "init-sh": "是", "init-r": "人", "init-z": "字", "init-c": "菜", "init-s": "三", "init-y": "一", "init-w": "我", "final-a": "啊", "final-o": "哦", "final-e": "饿", "final-i": "一", "final-u": "五", "final-ü": "雨", "final-ai": "爱", "final-ei": "杯", "final-ui": "水", "final-ao": "好", "final-ou": "口", "final-iu": "六", "final-ie": "谢", "final-üe": "月", "final-er": "二", "final-an": "三", "final-en": "很", "final-in": "您", "final-un": "文", "final-ün": "云", "final-ang": "忙", "final-eng": "冷", "final-ing": "名", "final-ong": "中"};

export function Week0(props: { part?: string }) {
  const part = props.part || "hub";
  useEffect(() => {
    const ses = plannedToday()[0] || null;
    startActivity(ses, "read");
    const on = () => noteInput();
    window.addEventListener("pointerdown", on);
    return () => window.removeEventListener("pointerdown", on);
  }, []);
  if (part === "pinyin") return <PinyinPart />;
  if (part === "tones") return <TonesPart />;
  if (part === "strokes") return <StrokesPart />;
  if (part === "radicals") return <RadicalsPart />;
  if (part === "test") return <Week0Test />;
  const s = getState();
  const parts = s.progress.week0Parts;
  return (
    <div class="stack" data-testid="week0">
      <Card>
        <h2 class="h2">Tuần 0 — Nền móng</h2>
        <p class="muted">Làm vững pinyin và mặt chữ trước khi vào bài 1. Không vội. Xong bốn phần rồi làm bài kiểm tra (≥ 80%) mới mở bài 1.</p>
      </Card>
      <div class="grid cols-2">
        <Button kind={parts.pinyin ? "green" : "yellow"} wide onClick={() => go("/week0/pinyin")}>1. Thanh mẫu & vận mẫu</Button>
        <Button kind={parts.tones ? "green" : "pink"} wide onClick={() => go("/week0/tones")}>2. Bốn thanh + thanh nhẹ</Button>
        <Button kind={parts.strokes ? "green" : "blue"} wide onClick={() => go("/week0/strokes")}>3. Tám nét cơ bản</Button>
        <Button kind={parts.radicals ? "green" : "purple"} wide onClick={() => go("/week0/radicals")}>4. Ba mươi bộ thủ</Button>
      </div>
      <Button kind="primary" wide id="week0-test-btn" onClick={() => go("/week0/test")}>Kiểm tra Nền móng</Button>
      {s.progress.week0Passed && <p class="muted">Đã đạt {Math.round((s.progress.week0Score || 0) * 100)}%. Bài 1 đã mở.</p>}
    </div>
  );
}

function PinyinPart() {
  return (
    <div class="stack" data-testid="week0-pinyin">
      <Card>
        <h2 class="h2">Thanh mẫu (initials)</h2>
        <p class="muted">Nghe và nhìn chữ mẫu. Chú ý cặp không bật hơi / bật hơi: b-p, d-t, g-k, j-q, zh-ch, z-c.</p>
        <div class="grid cols-3">
          {INITIALS.map((i) => (
            <div class="card" key={i.id} style={{ margin: 0 }}>
              <strong>{i.pinyin}</strong>
              <div class="muted">{i.hint}</div>
              <div class="muted">Nghe mẫu: <span class="hanzi-inline">{EXAMPLE["init-" + i.id]}</span> {pinyin(EXAMPLE["init-" + i.id] || "")}</div>
              <AudioBtn id={"init-" + i.id} />
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h2 class="h2">Vận mẫu (finals)</h2>
        <div class="grid cols-3">
          {FINALS.map((f) => (
            <div class="card" key={f.id} style={{ margin: 0 }}>
              <strong>{f.pinyin}</strong>
              <div class="muted">{f.hint}</div>
              <div class="muted">Nghe mẫu: <span class="hanzi-inline">{EXAMPLE["final-" + f.id]}</span> {pinyin(EXAMPLE["final-" + f.id] || "")}</div>
              <AudioBtn id={"final-" + f.id} />
            </div>
          ))}
        </div>
      </Card>
      <Button kind="primary" wide onClick={() => { markWeek0Part("pinyin"); go("/week0"); }}>Xong phần pinyin</Button>
    </div>
  );
}

function TonesPart() {
  const [quiz, setQuiz] = useState(0);
  const drills = TONES.filter((t) => t.tone <= 4);
  return (
    <div class="stack" data-testid="week0-tones">
      <Card>
        <h2 class="h2">Bốn thanh + thanh nhẹ</h2>
        <p class="muted">Nghe cho rõ đường cao độ. Khi luyện nói, app chấm thanh bằng đường cao độ, không cho qua chỉ vì nhận ra đúng chữ.</p>
        {TONES.map((t) => (
          <div class="seg" key={t.tone}>
            <div>
              <strong>{t.name}</strong>
              <div class="muted">{t.desc}</div>
              <div class="hanzi sm">{t.exampleHanzi} <span class="muted">{t.exampleVi}</span></div>
            </div>
            <AudioBtn id={"tone-" + t.tone} />
          </div>
        ))}
      </Card>
      <Card>
        <h3 class="h3">Nghe phân biệt</h3>
        <ToneDrill i={quiz} onNext={() => setQuiz((x) => x + 1)} />
      </Card>
      <Button kind="primary" wide onClick={() => { markWeek0Part("tones"); go("/week0"); }}>Xong phần thanh điệu</Button>
    </div>
  );
}

function ToneDrill(props: { i: number; onNext: () => void }) {
  const items = [
    { id: "tone-1", ans: "1" }, { id: "tone-2", ans: "2" }, { id: "tone-3", ans: "3" }, { id: "tone-4", ans: "4" },
  ];
  const it = items[props.i % items.length];
  const [chosen, setChosen] = useState<string | null>(null);
  return (
    <div>
      <AudioBtn id={it.id} label="Phát âm" />
      <div style={{ height: 8 }} />
      <Options
        options={["1", "2", "3", "4"].map((x) => ({ id: x, text: "Thanh " + x }))}
        chosen={chosen}
        answer={it.ans}
        locked={!!chosen}
        onPick={(id) => { setChosen(id); recordAnswer(id === it.ans); }}
      />
      {chosen && <div style={{ marginTop: 8 }}><Button small onClick={() => { setChosen(null); props.onNext(); }}>Câu tiếp</Button></div>}
    </div>
  );
}

function StrokesPart() {
  const [char, setChar] = useState(WEEK0_TRACE_CHARS[0]);
  return (
    <div class="stack" data-testid="week0-strokes">
      <Card>
        <h2 class="h2">Tám nét cơ bản</h2>
        {STROKES.map((s) => (
          <div class="seg" key={s.id}>
            <div>
              <strong>{s.vi}</strong> · {s.zh} ({s.py})
              <div class="muted">{s.desc} — ví dụ 「{s.example}」</div>
            </div>
          </div>
        ))}
      </Card>
      <Card>
        <h3 class="h3">Quy tắc thứ tự nét</h3>
        <ol class="muted" style={{ paddingLeft: 18 }}>{STROKE_RULES.map((r) => <li key={r}>{r}</li>)}</ol>
      </Card>
      <Card>
        <h3 class="h3">Viết thử chữ đơn giản</h3>
        <div class="tools">
          {WEEK0_TRACE_CHARS.map((c) => (
            <Button small kind={c === char ? "primary" : "ghost"} key={c} onClick={() => setChar(c)}>{c}</Button>
          ))}
        </div>
        <WriteBox character={char} />
      </Card>
      <Button kind="primary" wide onClick={() => { markWeek0Part("strokes"); go("/week0"); }}>Xong phần nét</Button>
    </div>
  );
}

function RadicalsPart() {
  return (
    <div class="stack" data-testid="week0-radicals">
      <Card>
        <h2 class="h2">Khoảng 30 bộ thủ hay gặp</h2>
        <p class="muted">Bộ thủ là mảnh ghép của chữ. Nhớ bộ thì nhớ mặt chữ, không cần bám pinyin.</p>
        <div class="grid cols-2">
          {RADICALS.map((r) => (
            <div class="card" key={r.char} style={{ margin: 0 }}>
              <div class="hanzi sm">{r.char}</div>
              <div>{r.vi} · {r.pinyin}</div>
              {r.note && <div class="muted">{r.note}</div>}
              <div class="muted">Ví dụ: {r.examples.join(" ")}</div>
            </div>
          ))}
        </div>
      </Card>
      <Button kind="primary" wide onClick={() => { markWeek0Part("radicals"); go("/week0"); }}>Xong phần bộ thủ</Button>
    </div>
  );
}

function Week0Test() {
  const qs = week0Test();
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [ok, setOk] = useState(0);
  const [done, setDone] = useState(false);
  const q = qs[i];
  const finish = (correct: number) => {
    const score = correct / qs.length;
    completeWeek0(score);
    setDone(true);
  };
  if (done) {
    const score = ok / qs.length;
    return (
      <Card data-testid="week0-result">
        <h2 class="h2">{score >= 0.8 ? "Đạt Nền móng!" : "Chưa đạt"}</h2>
        <p>Đúng {ok}/{qs.length} ({Math.round(score * 100)}%). Cần ≥ 80%.</p>
        <Bar value={score} />
        {score >= 0.8
          ? <Button kind="primary" wide onClick={() => go("/lesson/1")}>Vào Bài 1</Button>
          : <Button kind="pink" wide onClick={() => { setI(0); setOk(0); setChosen(null); setDone(false); }}>Làm lại</Button>}
      </Card>
    );
  }
  return (
    <div class="stack" data-testid="week0-test">
      <Card>
        <div class="row spread"><h2 class="h2">Kiểm tra Nền móng</h2><span class="muted">{i + 1}/{qs.length}</span></div>
        <Bar value={i / qs.length} />
        <p>{q.prompt}</p>
        {q.hanzi && <div class="hanzi" style={{ textAlign: "center" }}>{q.kind === "listen-tone" ? "" : q.hanzi}</div>}
        {q.audioId && <AudioBtn id={q.audioId} label="Nghe" />}
        <div style={{ height: 8 }} />
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
            recordAnswer(good);
          }}
        />
        {chosen && (
          <div style={{ marginTop: 12 }}>
            <Button kind="primary" wide onClick={() => {
              if (i + 1 >= qs.length) finish(ok);
              else { setI(i + 1); setChosen(null); }
            }}>{i + 1 >= qs.length ? "Xem kết quả" : "Câu tiếp"}</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
