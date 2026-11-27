import type { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";
import { load, getState, subscribe, debugSeed, setOnboarded, DEFAULT_PROGRESS, plannedToday, patchSettings, resetLearning } from "./store";
import { padDate, atHm } from "./schedule";
import { useHash, go, Back, cls, LeaveModal } from "./ui";
import { UpdateBanner } from "./update";
import { tutorLine } from "./tutor";
import { LevelsHome } from "./pages/slim";
import { MiaoBubble, MiaoTopFace } from "./v2/ui2";
import { miaoAnswer, miaoEvent } from "./v2/miaoBus";
import { startTicker } from "./v2/state2";
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
      setTimeout(() => { for (const [k, f] of Object.entries(LOADERS).filter(([k]) => PREFETCH.includes(k as ModKey))) f().then((x) => { MODS[k as ModKey] = x as Record<string, unknown>; }).catch(() => {}); }, 6000);
    });
    return subscribe(() => bump((n) => n + 1));
  }, []);
  useEffect(() => { document.body.classList.remove("company"); document.title = "Miaozi — HSK"; }, []);
  // v2.4: bỏ nhắc học theo giờ (đã ẩn khỏi Cài đặt) — maybeRemind() không còn chạy.

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
            <p>{s.settings.displayName}</p>
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
      <nav class="nav" data-testid="nav" onClick={(e) => {
        const a = (e.target as HTMLElement).closest("a");
        if (!a) return;
        const href = a.getAttribute("href");
        if (!href || !href.startsWith("#")) return;
        e.preventDefault();
        go(href);
      }}>
        <div class="rail-brand" onClick={() => go("/")}><MiaoTopFace size={48} /><span>Miaozi</span></div>
        <a class={cls("nav-main", route.tab === "road" && "on")} href="#/" data-nav="lesson"><span class="ico">课</span>Bài học</a>
        <a class={route.tab === "test" ? "on" : ""} href="#/tests" data-nav="tests"><span class="ico">考</span>Kiểm tra</a>
        <a class={route.tab === "more" ? "on" : ""} href="#/settings" data-nav="settings"><span class="ico">⚙</span>Cài đặt</a>
      </nav>
      <LeaveModal />
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
  tests: () => import("./pages/tests"),
};
/** v2.4: chỉ tải sẵn các trang còn dùng trong bản gọn. */
const PREFETCH: ModKey[] = ["write", "tests", "exam", "settings"];
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
  // v2.4 bản gọn: Bài học (HSK 1/2/3 → bài → Viết) · Kiểm tra · Cài đặt. Các trang cũ vẫn còn trong code nhưng không còn đường vào.
  if (parts[0] === "write") return wrap(<L key={"w" + (parts[1] || "")} m="write" c="WritePage" p={{ n: parts[1] ? Number(parts[1]) : undefined }} />, "road", "/");
  if (parts[0] === "notes") return wrap(<L key={p} m="write" c="NotesPage" p={{ lesson: parts[1] ? Number(parts[1]) : undefined }} />, "road", "/write");
  if (parts[0] === "sheets") return wrap(<L m="write" c="SheetsPage" />, "road", "/write");
  if (parts[0] === "tests" || parts[0] === "test") return wrap(<L m="tests" c="TestsHub" />, "test");
  if (parts[0] === "settings") return wrap(<L m="settings" c="SettingsPage" />, "more");
  return wrap(<LevelsHome />, "road");
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
    resetLearning,
    miao: { answer: miaoAnswer, event: miaoEvent },
    makeRadQuiz,
    levelTestItems: async (kind: "weekly" | "monthly" | "lesson", ids: number[]) => (await import("./gate")).levelTestItems(kind, ids),
    isLessonCompleted: V2.isLessonCompleted,
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
    reset: async () => { resetLearning({ keepSettings: false }); },
  };
}

