import json, re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = "http://127.0.0.1:4173/"
OUT = Path("/workspace/hsk/shots/v12"); OUT.mkdir(parents=True, exist_ok=True)
src = open("/workspace/hsk/src/data/curriculum.ts").read()
L = json.loads(src[src.index("export const LESSONS: Lesson[] = ") + 33: src.index("export const ALL_WORDS")].strip().rstrip(";"))
WORDS = [w for l in L for w in l["words"]]; SENTS = [s for l in L for s in l["sentences"]]
BY_ID = {w["id"]: w["hanzi"] for w in WORDS}; BY_ID.update({s["id"]: s["hanzi"] for s in SENTS})
VI2H = {}
for w in WORDS: VI2H.setdefault(w["vi"], w["hanzi"])
H2VI = {w["hanzi"]: w["vi"] for w in WORDS}
SVI = {s["vi"]: s["hanzi"] for s in SENTS}
IDX = json.load(open("/workspace/hsk/public/audio/index.json"))
FILE2ID = {}
for k, v in IDX.items():
    for f in v.values(): FILE2ID[f] = k
errs = []
def shot(p, name, full=False): p.screenshot(path=str(OUT / f"{name}.png"), full_page=full); print("shot", name)
def go(p, h): p.evaluate(f"location.hash = {json.dumps(h)}"); p.wait_for_timeout(500)
INIT = """window.__played = []; const _play = HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play = function() { window.__played.push(this.src); return _play.call(this).catch(()=>{}); };"""
han = lambda s: "".join(c for c in s if "\u3400" <= c <= "\u9fff")

def seed(p, n=1, day=3, extra=""):
    p.goto(BASE, wait_until="networkidle"); p.wait_for_function("() => window.__lohan && window.__lohan.getState")
    p.evaluate("""async ([n, day]) => { await window.__lohan.reset(); await window.__lohan.unlock(n);
      const st = window.__lohan.getState(); const dd = {}; for (let d = 1; d < day; d++) dd[n + ':' + d] = true;
      window.__lohan.debugSeed({ progress: { ...st.progress, lessonDay: { [n]: day }, dayDone: dd, startedOn: '2026-11-01' }, penalties: [] }); }""", [n, day])
    p.wait_for_timeout(300)

def draw_char(p, host, char, pad=10):
    data = json.load(open(f"/workspace/hsk/public/hanzi-data/{char}.json"))
    bb = host.locator("svg").first.bounding_box()
    size = bb["width"]; sc = (size - 2 * pad) / 1024
    for med in data["medians"]:
        pts = [(bb["x"] + pad + x * sc, bb["y"] + pad + (900 - y) * sc) for x, y in med]
        p.mouse.move(*pts[0]); p.mouse.down()
        for a, b in zip(pts, pts[1:]):
            for t in (0.33, 0.66, 1.0): p.mouse.move(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        p.mouse.up(); p.wait_for_timeout(120)
        if p.locator("[data-testid=exam-feedback]").count(): return

def last_audio(p):
    pl = p.evaluate("window.__played")
    return FILE2ID.get(pl[-1].split("/")[-1]) if pl else None

def build(p, target):
    rem = target
    while rem:
        cands = [(c.inner_text(), c) for c in p.locator("[data-testid=chunk]:not([disabled])").all()]
        cands = sorted([x for x in cands if rem.startswith(x[0])], key=lambda x: -len(x[0]))
        if not cands: break
        cands[0][1].click(); rem = rem[len(cands[0][0]):]
    p.click("#build-submit")

def answer_item(p, wrong_write=(), log=None):
    """Trả lời câu hiện tại đúng (trừ chữ trong wrong_write: viết sai)."""
    p.wait_for_timeout(700)
    if p.locator("[data-testid=exam-feedback]").count():
        p.wait_for_timeout(3700); p.click("#exam-next"); return "fb"
    if p.locator("[data-testid=exam-write]").count():
        prompt = p.locator("[data-testid=write-prompt]").inner_text()
        vi = re.search(r"“(.*)”", prompt).group(1); h = VI2H[vi]
        host = p.locator("[data-testid=exam-writer]")
        if h in wrong_write:
            if log is not None: log.append(("write-wrong", h))
            if log is not None and len([x for x in log if x[0] == "write-wrong"]) == 1: shot(p, CUR + "-gate-write-item")
            draw_char(p, host, "大"); return "w-"
        for c in han(h):
            draw_char(p, host, c); p.wait_for_timeout(500)
        return "w+"
    if p.locator("[data-testid=exam-build]").count():
        prompt = p.locator("[data-testid=exam-build] p").first.inner_text()
        m = re.search(r"“(.*)”", prompt)
        if m: target = han(SVI[m.group(1)])
        else:
            p.wait_for_timeout(600); target = han(BY_ID[last_audio(p)])
        build(p, target); return "b"
    if p.locator("[data-testid=exam-pick]").count():
        show = p.locator("[data-testid=exam-show]")
        prompt = p.locator("[data-testid=exam-pick] p").first.inner_text()
        if show.count():
            want = H2VI[show.inner_text().strip()]
        elif "nghĩa là" in prompt:
            want = VI2H[re.search(r"“(.*)”", prompt).group(1)]
        else:
            p.wait_for_timeout(600); want = BY_ID[last_audio(p)]
        for o in p.locator("[data-testid=exam-opt]").all():
            if o.inner_text().strip() == want: o.click(); return "p"
        p.locator("[data-testid=exam-opt]").first.click(); return "p?"
    return None

def run_exam(p, wrong_write=(), max_steps=80):
    log = []
    for _ in range(max_steps):
        if p.locator("[data-testid=exam-result]").count(): break
        r = answer_item(p, wrong_write, log)
        if r is None: p.wait_for_timeout(500)
    return log

with sync_playwright() as pw:
    br = pw.chromium.launch(channel="chrome", args=["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"])
    for dev, vp in (("tablet", {"width": 1280, "height": 800}), ("phone", {"width": 390, "height": 844})):
        CUR = dev
        ctx = br.new_context(viewport=vp, locale="vi-VN", device_scale_factor=2 if dev == "phone" else 1.5)
        ctx.add_init_script(INIT)
        p = ctx.new_page()
        p.on("pageerror", lambda e: errs.append(f"{dev} pageerror {e}"))
        p.on("console", lambda m: errs.append(f"{dev} console {m.text}") if m.type == "error" else None)
        # 1) Today ngày 1: link Nhai
        seed(p, 1, 1); go(p, "/"); p.wait_for_selector("[data-testid=day-plan]")
        links = p.locator("[data-testid=plan-step] a[href*='nhaihsk.com']")
        print(dev, "day1 steps:", [t.split("\n")[0] for t in p.locator(".plan-title").all_inner_texts()])
        print(dev, "nhai links visible:", [a.get_attribute("href") for a in p.locator("a[href*='nhaihsk.com']").all()])
        shot(p, f"{dev}-today-day1", full=True)
        # 2) Today ngày 3: cổng
        seed(p, 1, 3); go(p, "/"); p.wait_for_selector("[data-testid=day-plan]")
        print(dev, "day3 steps:", [t.split("\n")[0] for t in p.locator(".plan-title").all_inner_texts()])
        shot(p, f"{dev}-today-day3", full=True)
        go(p, "/gate/1"); p.wait_for_selector("[data-testid=gate]"); shot(p, f"{dev}-gate-overview", full=True)
        if dev == "tablet":
            # 3) Thi Viết: cố tình viết sai 没关系 và 对不起
            go(p, "/gate/1/write"); p.click("#gate-start")
            log = run_exam(p, wrong_write=("没关系", "对不起"))
            print("write log:", log)
            p.wait_for_selector("[data-testid=exam-result]")
            print("verdict:", p.locator("[data-testid=result-verdict]").inner_text())
            print("why:", p.locator("[data-testid=res-write] .bad-text").all_inner_texts())
            shot(p, "tablet-gate-write-fail", full=True)
            st = p.evaluate("() => { const s = window.__lohan.getState(); return { gate: s.progress.gate, pens: s.penalties.map(x => [x.dueChars, x.copies, x.reason]), unlocked: s.progress.unlockedLesson } }")
            print("state after fail:", json.dumps(st, ensure_ascii=False))
            go(p, "/gate/1"); go(p, "/gate/1/write"); p.wait_for_timeout(400); print("retry today blocked:", p.locator("[data-testid=gate-blocked]").count() == 1)
            # 4) Thi Đọc: trả lời đúng hết
            p.evaluate("() => { const st = window.__lohan.getState(); window.__lohan.debugSeed({ penalties: [] }); }")
            go(p, "/gate/1/read"); p.click("#gate-start"); run_exam(p)
            p.wait_for_selector("[data-testid=exam-result]")
            print("read verdict:", p.locator("[data-testid=result-verdict]").inner_text())
            shot(p, "tablet-gate-read-pass")
            # 5) Thi Nghe: đúng hết
            go(p, "/gate/1/listen"); p.click("#gate-start"); run_exam(p)
            p.wait_for_selector("[data-testid=exam-result]"); print("listen verdict:", p.locator("[data-testid=result-verdict]").inner_text())
            go(p, "/gate/1"); p.wait_for_timeout(400); shot(p, "tablet-gate-after", full=True)
            print("unlocked after 2/4 skills:", p.evaluate("window.__lohan.getState().progress.unlockedLesson"))
            # 6) Kiểm tra ca sáng
            go(p, "/check/morning"); p.click("#check-start"); run_exam(p)
            p.wait_for_selector("[data-testid=exam-result]"); print("morning check:", p.locator("[data-testid=result-verdict]").inner_text())
            print("checks:", json.dumps(p.evaluate("window.__lohan.getState().progress.checks")))
            print("sessions counted:", p.evaluate("window.__lohan.getState().sessions.map(s => [s.sessionId, s.counted, s.correct, s.total])"))
            # 7) Kiểm tra ca tối — sai viết 1 chữ 2 lần
            go(p, "/check/evening"); p.wait_for_timeout(300); shot(p, "tablet-check-evening-intro")
        else:
            go(p, "/gate/1/write"); p.click("#gate-start"); p.wait_for_selector("[data-testid=exam-write]"); p.wait_for_timeout(800)
            shot(p, "phone-gate-write-item")
            go(p, "/gate/1/read"); p.wait_for_timeout(400)
        # 8) migration: v1.1 state
        p.evaluate("""async () => { const st = window.__lohan.getState();
           window.__lohan.debugSeed({ progress: { ...st.progress, gateVersion: 1, unlockedLesson: 3, lessonPassed: {1: {score: 1, at: 1}, 2: {score: 0.9, at: 2}} } }); }""")
        p.wait_for_timeout(600); p.reload(wait_until="networkidle"); p.wait_for_function("() => window.__lohan && window.__lohan.isReady !== undefined || window.__lohan")
        p.wait_for_timeout(800)
        mg = p.evaluate("() => { const s = window.__lohan.getState().progress; return { u: s.unlockedLesson, lp: s.lessonPassed, legacy: s.legacyPassed, gv: s.gateVersion, notice: s.resetNotice } }")
        print(dev, "migration:", mg)
        go(p, "/"); p.wait_for_timeout(500); shot(p, f"{dev}-today-reset-notice")
        ctx.close()
    br.close()
print("ERRORS:", errs[:20])
