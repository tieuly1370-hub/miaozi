import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { load, getState, subscribe, debugSeed, setOnboarded, DEFAULT_PROGRESS, plannedToday, patchSettings } from "./store";
import { DEFAULT_SETTINGS, DEFAULT_STREAK, padDate, atHm } from "./schedule";
import { useHash, go, Back, cls } from "./ui";
import { Onboarding, Today, Roadmap, ShiftPage } from "./pages/home";
import { Week0 } from "./pages/week0";
import { LessonPage } from "./pages/lesson";
import { ReviewPage, ListenPage, SpeakPage, MistakesPage, ReviewWeekPage, MockPage } from "./pages/skills";
import { GatePage, CheckPage } from "./pages/exam";
import { WritePage, NotesPage, SheetsPage, PenaltyPage } from "./pages/write";
import { SettingsPage } from "./pages/settings";
import { DictPage } from "./pages/textbook";
import { UpdateBanner } from "./update";
import { tutorLine } from "./tutor";
import { LessonV2 } from "./pages/lesson2";
import { TodayV2, RoadmapV2, CalendarPage, ReadingPage, TestPage, ExtrasPage } from "./pages/home2";
import { CatSvg } from "./v2/ui2";
import { startTicker, streakNow } from "./v2/state2";
import * as Q from "./v2/queue";
import * as V2 from "./v2/state2";

export function App() {
  const [ok, setOk] = useState(false);
  const [, bump] = useState(0);
  const path = useHash();
  useEffect(() => {
    load().then(() => {
      setOk(true);
      installDebug();
      startTicker();
    });
    return subscribe(() => bump((n) => n + 1));
  }, []);
  const cm = ok ? getState().settings.companyMode : false;
  useEffect(() => {
    if (!ok) return;
    const s = getState();
    document.body.classList.toggle("company", s.settings.companyMode);
    document.title = s.settings.companyMode ? "Ghi chú" : "Miaozi — HSK1";
  }, [ok, path, cm]);
  useEffect(() => {
    if (!ok) return;
    const t = setInterval(() => maybeRemind(), 60_000);
    maybeRemind();
    return () => clearInterval(t);
  }, [ok]);

  if (!ok) return <div class="app"><p class="muted">Đang mở Miaozi…</p></div>;
  const s = getState();
  // v2.0: vào thẳng trang Hôm nay (Tuần 0 pinyin vẫn mở ở Thêm → Tuần 0).
  const showOnboard = false && !s.onboarded && (path === "/" || path === "");
  // visiting week0 from CTA counts as onboarded
  const route = parse(path);

  return (
    <div class="app">
      <header class="top">
        <div class="brand" onClick={() => go("/")} style={{ cursor: "pointer" }}>
          {s.settings.companyMode ? <div class="logo doc-logo">≡</div> : <div class="logo cat-logo"><CatSvg size={38} /></div>}
          <div>
            <h1>{s.settings.companyMode ? "Ghi chú" : "Miaozi"}</h1>
            <p>{s.settings.companyMode ? "tài liệu" : `chuỗi ${streakNow()} ngày · ${s.settings.displayName}`}</p>
          </div>
        </div>
        {route.back && <Back to={route.back} />}
        <button
          class={cls("icon-btn", s.settings.companyMode && "on")}
          title="Chế độ công ty"
          onClick={() => patchSettings({ companyMode: !s.settings.companyMode })}
        >{s.settings.companyMode ? "▣" : "☕"}</button>
      </header>
      <UpdateBanner />
      <main>
        {showOnboard ? <OnboardingGate /> : route.view}
      </main>
      <nav class="nav">
        <a class={route.tab === "today" ? "on" : ""} href="#/"><span class="ico">☀</span>Hôm nay</a>
        <a class={route.tab === "road" ? "on" : ""} href="#/roadmap"><span class="ico">课</span>Bài học</a>
        <a class={route.tab === "cal" ? "on" : ""} href="#/calendar"><span class="ico">历</span>Lịch</a>
        <a class={route.tab === "write" ? "on" : ""} href="#/write"><span class="ico">写</span>Viết</a>
        <a class={route.tab === "more" ? "on" : ""} href="#/settings"><span class="ico">⋯</span>Thêm</a>
      </nav>
    </div>
  );
}

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
  }}><Onboarding /></div>;
}

function parse(path: string): { view: ComponentChildren; tab: string; back?: string } {
  const p = path.replace(/^#/, "") || "/";
  const parts = p.split("/").filter(Boolean);
  const wrap = (view: ComponentChildren, tab: string, back?: string) => ({ view, tab, back });
  if (parts[0] === "week0") return wrap(<Week0 part={parts[1]} />, "road", parts[1] ? "/week0" : "/");
  if (parts[0] === "lesson" && parts[2] === "test") return wrap(<GatePage n={Number(parts[1] || 1)} />, "road", "/lesson/" + parts[1]);
  if (parts[0] === "gate") return wrap(<GatePage n={Number(parts[1] || 1)} skill={parts[2]} />, "road", parts[2] ? "/gate/" + parts[1] : "/lesson/" + parts[1]);
  if (parts[0] === "check") return wrap(<CheckPage key={parts[1]} kind={parts[1] === "evening" ? "evening" : parts[1] === "weekly" ? "weekly" : "morning"} />, "today", "/");
  if (parts[0] === "lesson") return wrap(<LessonV2 key={parts[1]} n={Number(parts[1] || 1)} sec={parts[2]} />, "road", "/roadmap");
  if (parts[0] === "lesson-old") return wrap(<LessonPage n={Number(parts[1] || 1)} tab={parts[2]} />, "road", "/roadmap");
  if (parts[0] === "roadmap") return wrap(<RoadmapV2 />, "road");
  if (parts[0] === "roadmap-old") return wrap(<Roadmap />, "road");
  if (parts[0] === "calendar") return wrap(<CalendarPage />, "cal");
  if (parts[0] === "reading") return wrap(<ReadingPage />, "today", "/");
  if (parts[0] === "extras") return wrap(<ExtrasPage />, "today", "/");
  if (parts[0] === "test") return wrap(<TestPage key={parts[1]} kind={parts[1] === "monthly" ? "monthly" : "weekly"} />, "today", "/");
  if (parts[0] === "today" && parts[1] === "morning") return wrap(<ShiftPage shift="morning" />, "today", "/");
  if (parts[0] === "today" && parts[1] === "evening") return wrap(<ShiftPage shift="evening" />, "today", "/");
  if (parts[0] === "review") return wrap(<ReviewPage />, "review");
  if (parts[0] === "listen") return wrap(<ListenPage />, "today", "/today/morning");
  if (parts[0] === "speak") return wrap(<SpeakPage />, "today", "/today/evening");
  if (parts[0] === "write") return wrap(<WritePage />, "write");
  if (parts[0] === "notes") return wrap(<NotesPage lesson={parts[1] ? Number(parts[1]) : undefined} />, "write", "/write");
  if (parts[0] === "sheets") return wrap(<SheetsPage />, "write", "/write");
  if (parts[0] === "penalty") return wrap(<PenaltyPage />, "more", "/settings");
  if (parts[0] === "mistakes") return wrap(<MistakesPage />, "more", "/settings");
  if (parts[0] === "dict") return wrap(<DictPage />, "more", "/settings");
  if (parts[0] === "settings") return wrap(<SettingsPage />, "more");
  if (parts[0] === "review-week") return wrap(<ReviewWeekPage />, "road", "/roadmap");
  if (parts[0] === "mock") return wrap(<MockPage n={(Number(parts[1]) === 2 ? 2 : 1)} />, "road", "/review-week");
  if (parts[0] === "weekly") return wrap(<CheckPage kind="weekly" />, "today", "/");
  void Today;
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

