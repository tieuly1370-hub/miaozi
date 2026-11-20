import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { load, getState, subscribe, debugSeed, setOnboarded, DEFAULT_PROGRESS, plannedToday, patchSettings } from "./store";
import { DEFAULT_SETTINGS, DEFAULT_STREAK, padDate, atHm } from "./schedule";
import { useHash, go, Back, cls } from "./ui";
import { UpdateBanner } from "./update";
import { tutorLine } from "./tutor";
import { TodayV2, RoadmapV2, StreakPage } from "./pages/home2";
import { MiaoBubble, MiaoTopFace } from "./v2/ui2";
import { miaoAnswer, miaoEvent } from "./v2/miaoBus";
import { startTicker, streakNow } from "./v2/state2";
import { startAutoSync } from "./sync/drive";
import { AudioDock } from "./ui";
import * as Q from "./v2/queue";
import * as V2 from "./v2/state2";
import { makeQuiz as makeRadQuiz } from "./v2/radQuiz";

export function App() {
  const [ok, setOk] = useState(false);
  const [, bump] = useState(0);
  const path = useHash();
  useEffect(() => {
    load().then(() => {
      setOk(true);
      installDebug();
      startTicker();
      startAutoSync();
      // tải sẵn các trang khi rảnh (để dùng ngoại tuyến), sau khi Hôm nay đã hiện
      setTimeout(() => { for (const [k, f] of Object.entries(LOADERS)) f().then((x) => { MODS[k as ModKey] = x as Record<string, unknown>; }).catch(() => {}); }, 6000);
    });
    return subscribe(() => bump((n) => n + 1));
  }, []);
  useEffect(() => { document.body.classList.remove("company"); document.title = "Miaozi — HSK1"; }, []);
  useEffect(() => {
    if (!ok) return;
    const t = setInterval(() => maybeRemind(), 60_000);
    maybeRemind();
    return () => clearInterval(t);
  }, [ok]);

  useEffect(() => {
    const root = document.documentElement;
    const pin = () => {
      const vv = window.visualViewport;
      const land = window.matchMedia("(min-width: 1024px) and (orientation: landscape)").matches;
      if (!vv || land) { root.style.setProperty("--vv-bottom", "0px"); return; }
      const visualBottom = vv.offsetTop + vv.height;
      const layoutBottom = Math.max(window.innerHeight, document.documentElement.clientHeight);
      const gap = Math.max(0, Math.round(layoutBottom - visualBottom));
      root.style.setProperty("--vv-bottom", gap + "px");
    };
    pin();
    window.visualViewport?.addEventListener("resize", pin);
    window.visualViewport?.addEventListener("scroll", pin);
    window.addEventListener("resize", pin);
    window.addEventListener("orientationchange", pin);
    return () => {
      window.visualViewport?.removeEventListener("resize", pin);
      window.visualViewport?.removeEventListener("scroll", pin);
      window.removeEventListener("resize", pin);
      window.removeEventListener("orientationchange", pin);
    };
  }, []);

  if (!ok) return <div class="app"><p class="muted">Đang mở Miaozi…</p></div>;
  const s = getState();
  // v2.0: vào thẳng trang Hôm nay (Tuần 0 pinyin vẫn mở ở Thêm → Tuần 0).
  const showOnboard = false && !s.onboarded && (path === "/" || path === "");
  // visiting week0 from CTA counts as onboarded
  const route = parse(path);

  return (
    <>
    <div class="app">
      <header class="top">
        <div class="brand" onClick={() => go("/")} style={{ cursor: "pointer" }}>
          <div class="logo cat-logo"><MiaoTopFace size={40} /></div>
          <div>
            <h1>Miaozi</h1>
            <p>{s.settings.companyMode ? "🏢 Công ty · " : ""}chuỗi {streakNow()} ngày · {s.settings.displayName}</p>
          </div>
        </div>
        {route.back && <Back to={route.back} />}
        <MiaoBubble />
      </header>
      <UpdateBanner />
      <main>
        {showOnboard ? <OnboardingGate /> : route.view}
      </main>
      <AudioDock />
    </div>
      <nav class="nav" data-testid="nav">
        <div class="rail-brand" onClick={() => go("/")}><MiaoTopFace size={48} /><span>Miaozi</span></div>
        <a class={route.tab === "today" ? "on" : ""} href="#/" data-nav="today"><span class="ico">☀</span>Hôm nay</a>
        <a class={route.tab === "write" ? "on" : ""} href="#/write" data-nav="write"><span class="ico">写</span>Viết</a>
        <a class={cls("nav-main", route.tab === "road" && "on")} href={"#/lesson/" + s.v2.lesson} data-nav="lesson"><span class="ico">课</span>Bài học</a>
        <a class={route.tab === "practice" ? "on" : ""} href="#/practice" data-nav="practice"><span class="ico">练</span>Luyện thêm</a>
        <a class={route.tab === "more" ? "on" : ""} href="#/settings" data-nav="settings"><span class="ico">⚙</span>Cài đặt</a>
      </nav>
    </>
  );
}

/** Trang làm bài → Miao ngồi ở góc (bong bóng thoại hiện khi trả lời). */

function OnboardingGate() {
  useEffect(() => {}, []);
  return <OnboardingWrap />;
}
function OnboardingWrap() {
  useEffect(() => {
    // mark onboarded when they leave via start button; start button goes to week0
  }, []);
  return <div onClick={(e) => {
    const t = e.target as HTMLElement;
    if (t.id === "start-week0" || t.closest("#start-week0")) setOnboarded();
  }}><L m="home" c="Onboarding" /></div>;
}

/* ---------- v2.1: tải lười từng trang (gói đầu chỉ có Hôm nay / Lộ trình / Streak) ---------- */
const LOADERS = {
  home: () => import("./pages/home"),
  week0: () => import("./pages/week0"),
  lesson: () => import("./pages/lesson"),
  skills: () => import("./pages/skills"),
  exam: () => import("./pages/exam"),
  write: () => import("./pages/write"),
  settings: () => import("./pages/settings"),
  textbook: () => import("./pages/textbook"),
  lesson2: () => import("./pages/lesson2"),
  practice: () => import("./pages/practice"),
  radicals: () => import("./pages/radicals"),
};
type ModKey = keyof typeof LOADERS;
const MODS: Partial<Record<ModKey, Record<string, unknown>>> = {};
function L(props: { m: ModKey; c: string; p?: Record<string, unknown> }) {
  const [, bump] = useState(0);
  const [err, setErr] = useState("");
  const mod = MODS[props.m];
  useEffect(() => {
    if (mod) return;
    LOADERS[props.m]().then((x) => { MODS[props.m] = x as Record<string, unknown>; bump((n) => n + 1); }).catch((e) => setErr(String(e?.message || e)));
  }, [props.m]);
  if (err) return <div class="card"><p class="bad-text">Không tải được trang (mạng?). </p><button class="btn ghost" onClick={() => location.reload()}>Tải lại</button></div>;
  if (!mod) return <p class="muted page-loading">Đang tải…</p>;
  const C = mod[props.c] as (p: Record<string, unknown>) => ComponentChildren;
  return <C {...(props.p || {})} />;
}

function parse(path: string): { view: ComponentChildren; tab: string; back?: string } {
  const p = path.replace(/^#/, "") || "/";
  const parts = p.split("/").filter(Boolean);
  const wrap = (view: ComponentChildren, tab: string, back?: string) => ({ view, tab, back });
  const n1 = Number(parts[1] || 1);
  if (parts[0] === "week0") return wrap(<L key={"w0" + parts[1]} m="week0" c="Week0" p={{ part: parts[1] }} />, "road", parts[1] ? "/week0" : "/");
  if (parts[0] === "lesson" && parts[2] === "test") return wrap(<L m="exam" c="GatePage" p={{ n: n1 }} />, "road", "/lesson/" + parts[1]);
  if (parts[0] === "gate") return wrap(<L key={p} m="exam" c="GatePage" p={{ n: n1, skill: parts[2] }} />, "road", parts[2] ? "/gate/" + parts[1] : "/lesson/" + parts[1]);
  if (parts[0] === "check") return wrap(<L key={parts[1]} m="exam" c="CheckPage" p={{ kind: parts[1] === "evening" ? "evening" : parts[1] === "weekly" ? "weekly" : "morning" }} />, "today", "/");
  if (parts[0] === "lesson") return wrap(<L key={parts[1]} m="lesson2" c="LessonV2" p={{ n: n1, sec: parts[2] }} />, "road", "/roadmap");
  if (parts[0] === "lesson-old") return wrap(<L key={p} m="lesson" c="LessonPage" p={{ n: n1, tab: parts[2] }} />, "road", "/roadmap");
  if (parts[0] === "roadmap") return wrap(<RoadmapV2 />, "road");
  if (parts[0] === "roadmap-old") return wrap(<L m="home" c="Roadmap" />, "road");
  if (parts[0] === "streak" || parts[0] === "calendar") return wrap(<StreakPage />, "today", "/");
  if (parts[0] === "reading") return wrap(<L m="practice" c="ReadingPage" />, "practice", "/practice");
  if (parts[0] === "radicals") return wrap(<L key={p} m="radicals" c="RadicalsPage" p={{ tab: parts[1] }} />, "practice", parts[1] ? "/radicals" : "/practice");
  if (parts[0] === "hard") return wrap(<L m="radicals" c="HardCharsPage" />, "practice", "/practice");
  if (parts[0] === "practice" || parts[0] === "extras") return wrap(<L m="practice" c="PracticePage" />, "practice");
  if (parts[0] === "test") return wrap(<L key={parts[1]} m="practice" c="TestPage" p={{ kind: parts[1] === "monthly" ? "monthly" : "weekly" }} />, "today", "/");
  if (parts[0] === "today" && parts[1] === "morning") return wrap(<L key="m" m="home" c="ShiftPage" p={{ shift: "morning" }} />, "today", "/");
  if (parts[0] === "today" && parts[1] === "evening") return wrap(<L key="e" m="home" c="ShiftPage" p={{ shift: "evening" }} />, "today", "/");
  if (parts[0] === "review") return wrap(<L m="skills" c="ReviewPage" />, "more", "/settings");
  if (parts[0] === "listen") return wrap(<L m="skills" c="ListenPage" />, "today", "/today/morning");
  if (parts[0] === "speak") return wrap(<L m="skills" c="SpeakPage" />, "more", "/settings");
  if (parts[0] === "write") return wrap(<L m="write" c="WritePage" />, "write");
  if (parts[0] === "notes") return wrap(<L key={p} m="write" c="NotesPage" p={{ lesson: parts[1] ? Number(parts[1]) : undefined }} />, "write", "/write");
  if (parts[0] === "sheets") return wrap(<L m="write" c="SheetsPage" />, "write", "/write");
  if (parts[0] === "penalty") return wrap(<L m="write" c="PenaltyPage" />, "more", "/settings");
  if (parts[0] === "mistakes") return wrap(<L m="skills" c="MistakesPage" />, "more", "/settings");
  if (parts[0] === "dict") return wrap(<L m="textbook" c="DictPage" />, "more", "/settings");
  if (parts[0] === "settings") return wrap(<L m="settings" c="SettingsPage" />, "more");
  if (parts[0] === "review-week") return wrap(<L m="skills" c="ReviewWeekPage" />, "road", "/roadmap");
  if (parts[0] === "mock") return wrap(<L key={p} m="skills" c="MockPage" p={{ n: Number(parts[1]) === 2 ? 2 : 1 }} />, "road", "/review-week");
  if (parts[0] === "weekly") return wrap(<L key="wk" m="exam" c="CheckPage" p={{ kind: "weekly" }} />, "today", "/");
  return wrap(<TodayV2 />, "today");
}

let lastRemind = "";
function maybeRemind() {
  const s = getState();
  if (!s.settings.notify || s.settings.companyMode) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const now = new Date();
  for (const p of plannedToday(now)) {
    const key = p.id + "-remind";
    if (lastRemind === key) continue;
    const start = p.start.getTime();
    if (Math.abs(now.getTime() - start) < 90_000) {
      lastRemind = key;
      const line = tutorLine(p.kind === "evening" ? "evening" : p.kind === "weeklyTest" ? "sunday" : "morning", s.settings);
      new Notification("Miaozi", { body: line.text, tag: key, icon: "./icons/icon-192.png", silent: s.settings.companyMode });
    }
  }
}

function installDebug() {
  window.__miaozi = window.__lohan = {
    Q,
    V2,
    getState,
    debugSeed,
    miao: { answer: miaoAnswer, event: miaoEvent },
    makeRadQuiz,
    padDate,
    atHm,
    completeWeek0: async (score = 1) => {
      const m = await import("./store");
      m.completeWeek0(score);
    },
    unlock: async (n: number) => {
      const m = await import("./store");
      const st = m.getState();
      st.progress.week0Passed = true;
      st.progress.unlockedLesson = n;
      m.debugSeed({ progress: { ...st.progress } });
    },
    reset: async () => {
      debugSeed({
        settings: { ...DEFAULT_SETTINGS },
        progress: { ...DEFAULT_PROGRESS },
        streak: { ...DEFAULT_STREAK },
        srs: {},
        mistakes: [],
        sessions: [],
        notes: {},
        penalties: [],
        today: { date: padDate(new Date()), activeBySession: {}, correct: 0, total: 0, lastInputAt: Date.now(), started: {}, lateFlagged: {}, wordWrongs: {} },
        onboarded: true,
        v2: V2.DEFAULT_V2(),
      } as never);
    },
  };
}

