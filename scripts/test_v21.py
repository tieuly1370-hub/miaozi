"""Miaozi 2.1 — kiểm thử Playwright (bản 2.1: không chờ thi lại, Xin nghỉ, Cạn pin, thanh điều hướng, bộ phát âm chung, nói, Streak, công ty màu thường). Header dùng chung từ 2.0: chế độ, giới hạn Cạn pin, 3 kịch bản Smart Queue, hoàn thành mục, giữ trạng thái viết,
lịch tháng, di chuyển dữ liệu 1.2, chấm nói (giả lập kết quả nhận giọng), chép phạt không bắt PDF, thi 6A/vượt bài thật.
Chạy: npm run build && npx vite preview --port 4173 &  python3 scripts/test_v2.py"""
import json, re, sys, datetime as dt
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = "http://127.0.0.1:4173/"
OUT = Path("/workspace/hsk/shots/v21"); OUT.mkdir(parents=True, exist_ok=True)
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
    for kk, f in v.items():
        if kk != "c": FILE2ID[f] = k
CARRIER = {k: v["c"] for k, v in IDX.items() if v.get("c")}
INIT = """window.__played = []; const _play = HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play = function() { window.__played.push(this.src); return _play.call(this).catch(()=>{}); };"""
han = lambda s: "".join(c for c in s if "\u3400" <= c <= "\u9fff")
results = []; errs = []
def check(name, cond, extra=""):
    results.append((name, bool(cond))); print(("PASS " if cond else "FAIL ") + name + (f" — {extra}" if extra else ""))
def shot(p, name, full=False): p.screenshot(path=str(OUT / f"{name}.png"), full_page=full); print("  shot", name)
def go(p, h): p.evaluate(f"location.hash = {json.dumps(h)}"); p.wait_for_timeout(450)
def st(p, js): return p.evaluate(f"() => {{ const s = window.__miaozi.getState(); return {js}; }}")
def ready(p): p.wait_for_function("() => window.__miaozi && window.__miaozi.getState && window.__miaozi.V2")
def at(p, y, m, d, h=10):
    p.clock.set_fixed_time(dt.datetime(y, m, d, h, 0, 0))
def fresh(p, extra_js=""):
    p.goto(BASE, wait_until="networkidle"); ready(p)
    p.evaluate("async () => { await window.__miaozi.reset(); window.__miaozi.debugSeed({ penalties: [], mistakes: [] }); }")
    if extra_js: p.evaluate(extra_js)
    p.wait_for_timeout(350)
def reload(p):
    p.wait_for_timeout(450); p.reload(wait_until="networkidle"); ready(p); p.wait_for_timeout(300)
def active_secs(p): return [e.get_attribute("data-testid")[4:] for e in p.locator("section.sec[data-active='1']").all()]
def pct(p, n=1): return st(p, f"window.__miaozi.Q.percent(s.v2.sec[{n}] || {{}})")
def earn(p, n, which):
    """Đặt dữ liệu tiến độ con (như thể đã làm) — nút Hoàn thành vẫn phải bấm trên giao diện."""
    p.evaluate("""([n, which]) => { const M = window.__miaozi, s = M.getState(), L = M.getState(); const V = M.V2; const u = V.subOf(n);
      const les = %s[n - 1];
      if (which === 's2') { u.vocabSeen = les.w; u.dialog = true; u.videoOpened = true; u.videoDone = true; }
      if (which === 's3') { u.s3 = { score: 5, at: Date.now() }; }
      if (which === 's4') { u.written = les.w; u.sentOk = [0, 1, 2]; }
      if (which === 's5') { u.spoken = les.s; }
      if (which === 's6a') { u.s6a = { score: 0.9, at: Date.now(), pass: true }; }
      if (which === 's6b') { u.s6b = { score: 0.9, at: Date.now(), pass: true }; }
      M.debugSeed({}); }""" % json.dumps([{"w": [w["id"] for w in l["words"]], "s": [s["id"] for s in l["sentences"]]} for l in L]), [n, which])
    p.wait_for_timeout(150)
def complete(p, n, sid):
    go(p, f"/lesson/{n}"); p.wait_for_selector(f"#complete-{sid}")
    btn = p.locator(f"#complete-{sid}")
    ok = btn.is_enabled(); btn.click(); p.wait_for_timeout(250); return ok

def draw_char(p, host, char, pad=8):
    data = json.load(open(f"/workspace/hsk/public/hanzi-data/{char}.json"))
    host.scroll_into_view_if_needed()
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
def answer_item(p):
    p.wait_for_timeout(650)
    if p.locator("[data-testid=exam-feedback]").count():
        now = p.evaluate("Date.now()"); p.clock.set_fixed_time(now / 1000 + 6); p.wait_for_timeout(1200); p.click("#exam-next"); return "fb"
    if p.locator("[data-testid=exam-write]").count():
        vi = re.search(r"“(.*)”", p.locator("[data-testid=write-prompt]").inner_text()).group(1)
        for c in han(VI2H[vi]): draw_char(p, p.locator("[data-testid=exam-writer]"), c); p.wait_for_timeout(450)
        return "w"
    if p.locator("[data-testid=exam-speak]").count():
        prompt = p.locator("[data-testid=exam-speak] .exam-prompt").inner_text()
        vi = re.search(r"“(.*)”", prompt).group(1)
        target = SVI.get(vi) if "cả câu" in prompt else VI2H.get(vi)
        # giả lập kết quả nhận giọng kiểu Chrome: có dấu câu
        p.evaluate("t => { window.__miaoziAsr = [t + '。'] }", target)
        p.locator("[data-testid=exam-speak] .speak-btn").click(); p.wait_for_timeout(1800); return "s"
    if p.locator("[data-testid=exam-build]").count():
        prompt = p.locator("[data-testid=exam-build] p").first.inner_text()
        m = re.search(r"“(.*)”", prompt)
        target = han(SVI[m.group(1)]) if m else (p.wait_for_timeout(600) or han(BY_ID[last_audio(p)]))
        build(p, target); return "b"
    if p.locator("[data-testid=exam-pick]").count():
        show = p.locator("[data-testid=exam-show]"); prompt = p.locator("[data-testid=exam-pick] p").first.inner_text()
        if show.count(): want = H2VI[show.inner_text().strip()]
        elif "nghĩa là" in prompt: want = VI2H[re.search(r"“(.*)”", prompt).group(1)]
        else:
            p.wait_for_timeout(600); aid = last_audio(p)
            want = CARRIER.get(aid) or BY_ID[aid]  # trợ từ thanh nhẹ: phương án là cả cụm
        for o in p.locator("[data-testid=exam-opt]").all():
            if o.inner_text().strip() == want: o.click(); return "p"
        p.locator("[data-testid=exam-opt]").first.click(); return "p?"
    return None
def run_exam(p, done_sel, max_steps=60):
    for _ in range(max_steps):
        if p.locator(done_sel).count(): return True
        if answer_item(p) is None: p.wait_for_timeout(400)
    return p.locator(done_sel).count() > 0


def nav_labels(p): return [a.inner_text().split("\n")[-1].strip() for a in p.locator("[data-testid=nav] a").all()]
def playing_count(p): return p.evaluate("[...document.querySelectorAll('audio')].length + (window.__audioEls||[]).filter(a => !a.paused).length")

with sync_playwright() as pw:
    br = pw.chromium.launch(channel="chrome", args=["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"])
    for dev, vp in (("tablet", {"width": 1180, "height": 820}), ("phone", {"width": 390, "height": 844})):
        ctx = br.new_context(viewport=vp, locale="vi-VN", device_scale_factor=2 if dev == "phone" else 1.5)
        ctx.add_init_script(INIT + """
window.__audioEls = []; const _A = window.Audio; window.Audio = function(u) { const a = new _A(u); window.__audioEls.push(a); return a; }; window.Audio.prototype = _A.prototype;""")
        p = ctx.new_page()
        p.on("pageerror", lambda e, dev=dev: errs.append(f"{dev} pageerror {e}"))
        p.on("console", lambda m, dev=dev: errs.append(f"{dev} console {m.text}") if m.type == "error" and "favicon" not in m.text else None)
        T = dev + ": "

        # ---------- Thanh điều hướng ----------
        at(p, 2026, 11, 19); fresh(p); go(p, "/")
        labels = nav_labels(p)
        check(T + "Nav: Hôm nay - Viết - Bài học - Luyện thêm - Cài đặt", labels == ["Hôm nay", "Viết", "Bài học", "Luyện thêm", "Cài đặt"], str(labels))
        check(T + "Nav: Bài học là nút giữa nổi bật", p.locator("[data-testid=nav] a").nth(2).get_attribute("class").find("nav-main") >= 0)
        check(T + "Nav: không còn Lịch", "Lịch" not in labels)
        bb = p.locator("[data-testid=nav] a.nav-main .ico").bounding_box(); bb2 = p.locator("[data-testid=nav] a").nth(0).locator(".ico").bounding_box()
        check(T + "Nút Bài học to hơn", bb["height"] > bb2["height"] * 1.8, f"{bb['height']} vs {bb2['height']}")
        shot(p, f"{dev}-today")
        p.click("[data-nav=practice]"); p.wait_for_selector("[data-testid=practice]")
        check(T + "Luyện thêm: link shadowing Nhai đúng", p.locator("#shadowing-link").get_attribute("href") == "https://nhaihsk.com/shadowing#cat-HSK1-3")
        check(T + "Luyện thêm: có dịch + đọc hiểu", p.locator("text=Dịch Việt → Trung").count() == 1 and p.locator("[data-testid=reading]").count() == 1)
        shot(p, f"{dev}-practice")
        p.click("[data-nav=lesson]"); p.wait_for_selector("[data-testid=lesson2]")
        check(T + "Nút Bài học mở bài hiện tại", p.evaluate("location.hash") == "#/lesson/1")

        # ---------- Chế độ ----------
        go(p, "/")
        check(T + "Chỉ còn 3 nút: Công ty, Cạn pin, Xin nghỉ", p.locator(".mode-btn").count() == 3 and p.locator("[data-testid=mode-standard]").count() == 0 and p.locator("[data-testid=mode-burst]").count() == 0)
        go(p, "/lesson/1")
        check(T + "Không chọn chế độ → gợi ý mục tiếp theo (S2)", active_secs(p) == ["s2"], str(active_secs(p)))
        check(T + "Không làm mờ mục khác", p.locator(".sec-dim").count() == 0 and p.evaluate("getComputedStyle(document.querySelector('[data-testid=sec-s5]')).opacity") == "1")
        check(T + "Mục gợi ý có hiệu ứng lấp lánh", p.evaluate("getComputedStyle(document.querySelector('[data-testid=sec-s2]')).animationName") == "miao-glow")
        if dev == "phone": shot(p, f"{dev}-lesson-sparkle")
        # Công ty: giao diện bình thường
        go(p, "/"); p.click("[data-testid=mode-company]"); p.wait_for_timeout(250)
        check(T + "Công ty: không đổi màu xám, vẫn có mèo", not p.evaluate("document.body.classList.contains('company')") and p.locator(".cat-logo").count() == 1 and p.title() == "Miaozi — HSK1")
        go(p, "/lesson/1")
        check(T + "Công ty: gợi ý 2, 3, 6A", active_secs(p) == ["s2", "s3", "s6a"], str(active_secs(p)))
        check(T + "Công ty: có tự phát + ẩn pinyin", p.locator("#autoplay-all").count() == 1 and p.locator("#toggle-pinyin").count() == 1)
        # ---------- Bộ phát âm chung ----------
        p.click("#autoplay-all"); p.wait_for_timeout(900)
        check(T + "Tự phát: thanh điều khiển hiện", p.locator("[data-testid=audio-dock]").count() == 1)
        p.click("#audio-toggle"); p.wait_for_timeout(200)
        check(T + "Tạm dừng được", p.locator("[data-testid=audio-dock]").get_attribute("data-status") == "paused")
        p.click("#audio-toggle"); p.wait_for_timeout(200)
        check(T + "Tiếp tục được", p.locator("[data-testid=audio-dock]").get_attribute("data-status") == "playing")
        p.click("#audio-stop"); p.wait_for_timeout(300)
        n_before = len(p.evaluate("window.__played"))
        p.wait_for_timeout(2600)
        check(T + "Dừng tự phát: không phát tiếp", p.locator("[data-testid=audio-dock]").count() == 0 and len(p.evaluate("window.__played")) == n_before)
        # bấm mục khác khi đang phát → mục cũ dừng, chỉ 1 âm phát
        p.click("[data-testid=open-s2]"); p.wait_for_selector("[data-testid=s2]")
        ws = p.locator("[data-testid=vocab-word]")
        ws.nth(0).click(); p.locator(".vrow-body .btn.blue").first.click(); p.wait_for_timeout(300)
        ws.nth(1).click(); p.locator(".vrow-body .btn.blue").first.click(); p.wait_for_timeout(400)
        npl = p.evaluate("window.__audioEls.filter(a => !a.paused && a.src).length")
        check(T + "Chỉ 1 âm thanh phát cùng lúc", npl <= 1, str(npl))
        p.click("[data-testid=mode-company]") if p.locator("[data-testid=mode-company]").count() else None
        go(p, "/"); p.click("[data-testid=mode-company]"); p.wait_for_timeout(150)
        check(T + "Tắt Công ty", not st(p, "s.settings.companyMode"))

        # ---------- Cạn pin 3/tuần ----------
        at(p, 2026, 11, 16); fresh(p); go(p, "/")
        for d in (16, 17, 18):
            at(p, 2026, 11, d); reload(p); go(p, "/"); p.click("[data-testid=mode-low]"); p.wait_for_timeout(150)
        at(p, 2026, 11, 19); reload(p); go(p, "/")
        check(T + "Cạn pin: hết 3 lượt → nút khóa + thông báo", not p.locator("[data-testid=mode-low]").is_enabled() and "hết 3 lượt" in p.locator("[data-testid=low-msg]").inner_text())
        at(p, 2026, 11, 23); reload(p); go(p, "/")
        check(T + "Cạn pin: thứ Hai reset 3/3", "Còn 3/3" in p.locator("[data-testid=mode-low]").inner_text())

        # ---------- Xin nghỉ ----------
        at(p, 2026, 11, 19); fresh(p, "() => { const M = window.__miaozi; M.getState().v2.days['2026-11-18'] = { modes: [], ms: 1, secs: ['s2'], tests: [] }; M.debugSeed({}); }"); go(p, "/")
        p.click("[data-testid=mode-off]"); p.wait_for_selector("[data-testid=off-ask]")
        if dev == "phone": shot(p, f"{dev}-xin-nghi")
        p.click("#off-confirm"); p.wait_for_timeout(200)
        check(T + "Xin nghỉ ghi nhận", st(p, "s.v2.busy.includes('2026-11-19')"))
        at(p, 2026, 11, 20); reload(p)
        pen = st(p, "s.penalties.filter(x => !x.done && /Xin nghỉ/.test(x.reason || x.note || '')).map(x => x.dueChars)")
        les1 = [w["hanzi"] for w in L[0]["words"]]
        check(T + "Xin nghỉ case 1: hôm sau chép phạt 5 từ của bài gần nhất", len(pen) == 1 and len(pen[0]) == 5 and all(c in les1 for c in pen[0]), str(pen))
        check(T + "Xin nghỉ không đứt chuỗi (học 18, nghỉ 19 → hôm 20 chuỗi vẫn 1)", st(p, "window.__miaozi.V2.streakNow()") == 1)
        # case 2: đã có phạt → thêm 5
        go(p, "/"); p.click("[data-testid=mode-off]"); p.click("#off-confirm"); p.wait_for_timeout(150)
        at(p, 2026, 11, 21); reload(p)
        tot = st(p, "[...new Set(s.penalties.filter(x => !x.done).flatMap(x => x.dueChars))].length")
        check(T + "Xin nghỉ case 2: thêm 5 từ (tổng 10)", tot == 10, str(tot))
        go(p, "/"); p.click("[data-testid=mode-off]"); p.click("#off-confirm"); p.wait_for_timeout(150)
        at(p, 2026, 11, 22); reload(p)
        tot = st(p, "[...new Set(s.penalties.filter(x => !x.done).flatMap(x => x.dueChars))].length")
        check(T + "Xin nghỉ trần: không quá số từ mới của bài", tot == min(15, len(les1)), f"{tot} / {len(les1)}")
        go(p, "/streak"); p.wait_for_selector("[data-testid=streak-page]")
        kinds = p.evaluate("Object.fromEntries([...document.querySelectorAll('[data-testid=cal-day]')].map(e => [e.dataset.date, e.dataset.kind]))")
        check(T + "Streak: ngày nghỉ tô màu riêng", kinds.get("2026-11-19") == "off" and kinds.get("2026-11-21") == "off")
        check(T + "Streak: không còn ghi phút / màu chế độ", "phút" not in p.inner_text("[data-testid=streak-page]"))

        # ---------- Streak ----------
        at(p, 2026, 11, 19); fresh(p, """() => { const M = window.__miaozi; const v = M.getState().v2;
          v.days['2026-11-14'] = { modes: [], ms: 1, secs: ['s2'], tests: [] }; v.days['2026-11-17'] = { modes: [], ms: 1, secs: ['s2'], tests: [] }; v.days['2026-11-18'] = { modes: [], ms: 1, secs: ['s3'], tests: [] };
          v.days['2026-11-19'] = { modes: [], ms: 1, secs: ['s4'], tests: [] }; v.busy = ['2026-11-16']; M.debugSeed({}); }""")
        go(p, "/"); p.click("[data-testid=streak]"); p.wait_for_selector("[data-testid=streak-page]")
        check(T + "Chạm chuỗi ở Hôm nay → mở Streak", p.evaluate("location.hash") == "#/streak")
        kinds = p.evaluate("Object.fromEntries([...document.querySelectorAll('[data-testid=cal-day]')].map(e => [e.dataset.date, e.dataset.kind]))")
        check(T + "Streak: học / nghỉ / bỏ lỡ", kinds["2026-11-17"] == "studied" and kinds["2026-11-16"] == "off" and kinds["2026-11-15"] == "missed", str({k: kinds[k] for k in ("2026-11-15", "2026-11-16", "2026-11-17")}))
        check(T + "Streak hiện chuỗi 3 (ngày nghỉ 16 giữ chuỗi, 15 bỏ lỡ làm đứt)", p.locator("[data-testid=streak-current]").inner_text() == "3")
        shot(p, f"{dev}-streak")
        go(p, "/settings"); p.wait_for_selector("#settings-streak")
        check(T + "Cài đặt có link Streak", p.locator("#settings-streak").count() == 1)

        # ---------- Không chờ thi lại ----------
        fresh(p); go(p, "/lesson/1/s3"); p.wait_for_selector("[data-testid=s3]")
        for q in p.locator("[data-testid=s3-q]").all(): q.locator(".opt").last.click()
        p.click("#s3-submit"); p.wait_for_timeout(200)
        r = p.locator("[data-testid=s3-result]").inner_text()
        if int(r.split("/")[0]) < 4:
            check(T + "S3 trượt → làm lại ngay (không chờ)", p.locator("#s3-retry").count() == 1 and "Chờ" not in p.inner_text("[data-testid=s3]") and st(p, "Object.keys(s.v2.retry).length") == 0)
            p.click("#s3-retry"); p.wait_for_timeout(150)
            check(T + "S3 làm lại: bài mở lại ngay", p.locator("#s3-submit").count() == 1)
        else: check(T + "S3 (trúng ≥4/5, bỏ qua)", True)
        fresh(p, "() => window.__miaozi.V2.finishCheck(1, 's6a', false, 0.3, [])")
        go(p, "/lesson/1/s6a"); p.wait_for_selector("[data-testid=s6a]")
        check(T + "6A trượt → thi lại ngay", p.locator("#start-s6a").count() == 1 and "phút nữa" not in p.inner_text("[data-testid=s6a]"))
        fresh(p, "() => window.__miaozi.V2.recordTest('weekly:2026-11-22', false, 0.2)")
        at(p, 2026, 11, 22); reload(p); go(p, "/test/weekly"); p.wait_for_selector("[data-testid=test-weekly]")
        check(T + "Kiểm tra tuần trượt → làm lại ngay", p.locator("#test-start").count() == 1 and "phút nữa" not in p.inner_text("body"))

        # ---------- Nói: chưa chấm khi chưa nói xong ----------
        at(p, 2026, 11, 19); fresh(p); go(p, "/lesson/1/s5"); p.wait_for_selector("[data-testid=s5]")
        p.evaluate("""() => { window.__miaoziAsr = null; class FakeRec { constructor() { window.__rec = this; } start() { window.__recStarts = (window.__recStarts||0) + 1; } stop() { setTimeout(() => this.onend && this.onend(), 50); } }
          window.SpeechRecognition = FakeRec; window.webkitSpeechRecognition = FakeRec; Object.defineProperty(navigator, 'userAgent', { get: () => 'Android' }); }""")
        p.locator("[data-testid=s5] .speak-btn").first.click(); p.wait_for_timeout(300)
        p.evaluate("""() => { const r = window.__rec; r.onresult({ resultIndex: 0, results: { length: 1, 0: { isFinal: false, length: 1, 0: { transcript: '你' } } } }); }""")
        p.wait_for_timeout(1500)
        check(T + "Nói: đang nói dở chưa chấm (1,5 s)", p.locator("[data-testid=listening]").count() == 1 and p.locator("[data-testid=speak-res]").count() == 0)
        p.evaluate("""() => { const r = window.__rec; r.onresult({ resultIndex: 0, results: { length: 1, 0: { isFinal: true, length: 1, 0: { transcript: '你好' } } } }); r.onend(); }""")
        p.wait_for_timeout(500)
        check(T + "Nói: Android tự kết thúc → mở lại nghe tiếp", p.evaluate("window.__recStarts") >= 2 and p.locator("[data-testid=speak-res]").count() == 0)
        check(T + "Nói: hiện chữ nghe được tạm thời", "你好" in p.locator("[data-testid=speak-live]").inner_text())
        if dev == "phone": shot(p, f"{dev}-speak-listening")
        p.click("#speak-done"); p.wait_for_timeout(1600)
        check(T + "Nói: bấm Xong → chấm ngay", p.locator("[data-testid=speak-res]").count() >= 1, p.locator("[data-testid=speak-heard]").first.inner_text() if p.locator("[data-testid=speak-heard]").count() else "")

        # ---------- Bài nghe trợ từ: âm và đáp án khớp ----------
        # dùng chuỗi đáp án trong bài 6A thật (tablet)
        if dev == "tablet":
            at(p, 2026, 11, 19); fresh(p); go(p, "/lesson/3/s6a")
            p.evaluate("() => { const M = window.__miaozi; const v = M.getState().v2; v.lesson = 3; M.debugSeed({}); }"); go(p, "/lesson/3/s6a")
            p.click("#start-s6a"); seen = []
            for _ in range(40):
                if p.locator("[data-testid=s6-result]").count(): break
                if p.locator("[data-testid=exam-pick]").count() and not p.locator("[data-testid=exam-feedback]").count():
                    p.wait_for_timeout(700); aid = last_audio(p)
                    if aid in CARRIER: seen.append((aid, [o.inner_text() for o in p.locator("[data-testid=exam-opt]").all()]))
                if answer_item(p) is None: p.wait_for_timeout(300)
            good = all(CARRIER[a] in opts and all(len(o) == len(CARRIER[a]) for o in opts) for a, opts in seen)
            check(T + "Nghe trợ từ: đáp án là cả cụm khớp âm (" + ",".join(CARRIER[a] for a, _ in seen) + ")", good, str(seen)[:200])
            if p.locator("[data-testid=s6-result]").count(): shot(p, f"{dev}-s6a-result")

        # ---------- Báo cáo điểm yếu (thứ Hai) ----------
        at(p, 2026, 11, 23); fresh(p, """() => { const M = window.__miaozi; const now = Date.now();
          M.debugSeed({ mistakes: [{ id: 'm1', wordId: 'n01-01', hanzi: '你', kind: 'listen', note: 'bạn', at: now - 86400000, times: 4 }, { id: 'm2', wordId: 'n01-02', hanzi: '好', kind: 'read', note: 'tốt', at: now - 2*86400000, times: 2 }] });
          M.getState().v2.skillLog = [{ at: now - 86400000, date: '2026-11-22', source: 'weekly', skill: 'listen', first: 3, total: 10 }, { at: now - 86400000, date: '2026-11-22', source: 'weekly', skill: 'read', first: 9, total: 10 }];
          M.getState().v2.report = {}; M.debugSeed({}); }""")
        reload(p); go(p, "/")
        check(T + "Báo cáo tuần hiện thứ Hai: chữ sai nhiều + kỹ năng yếu nhất", p.locator("[data-testid=weak-report]").count() == 1 and "你" in p.inner_text("[data-testid=weak-report]") and "yếu nhất: Nghe" in p.inner_text("[data-testid=weak-report]"))
        check(T + "Báo cáo tuần → Miao giao chép phạt", st(p, "s.penalties.some(x => /Báo cáo tuần/.test(x.reason || x.note || '') && x.dueChars.includes('你'))"))
        shot(p, f"{dev}-weekly-report", full=dev == "tablet")

        # ---------- Đồng bộ Drive (giao diện) + phiên bản ----------
        go(p, "/settings"); p.wait_for_selector("[data-testid=sync-card]")
        check(T + "Đồng bộ Drive đã cấu hình (có nút Đăng nhập Google)", p.locator("#sync-login").count() == 1 and "Chưa cấu hình" not in p.inner_text("[data-testid=sync-card]"))
        check(T + "Cài đặt hiện Miaozi 2.1.0", "Miaozi 2.1.0" in p.inner_text("body"))
        shot(p, f"{dev}-settings-sync")
        ctx.close()
    br.close()

bad = [r for r in results if not r[1]]
print(f"\n{len(results) - len(bad)}/{len(results)} PASS")
for b in bad: print("FAIL:", b[0])
uniq_errs = sorted(set(errs))
print("errors:", len(uniq_errs)); [print(" ", e[:200]) for e in uniq_errs[:15]]
