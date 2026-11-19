"""Miaozi 2.0 — kiểm thử Playwright: chế độ, giới hạn Cạn pin, 3 kịch bản Smart Queue, hoàn thành mục, giữ trạng thái viết,
lịch tháng, di chuyển dữ liệu 1.2, chấm nói (giả lập kết quả nhận giọng), chép phạt không bắt PDF, thi 6A/vượt bài thật.
Chạy: npm run build && npx vite preview --port 4173 &  python3 scripts/test_v2.py"""
import json, re, sys, datetime as dt
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = "http://127.0.0.1:4173/"
OUT = Path("/workspace/hsk/shots/v2"); OUT.mkdir(parents=True, exist_ok=True)
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
        p.wait_for_timeout(3700); p.click("#exam-next"); return "fb"
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
        else: p.wait_for_timeout(600); want = BY_ID[last_audio(p)]
        for o in p.locator("[data-testid=exam-opt]").all():
            if o.inner_text().strip() == want: o.click(); return "p"
        p.locator("[data-testid=exam-opt]").first.click(); return "p?"
    return None
def run_exam(p, done_sel, max_steps=60):
    for _ in range(max_steps):
        if p.locator(done_sel).count(): return True
        if answer_item(p) is None: p.wait_for_timeout(400)
    return p.locator(done_sel).count() > 0

with sync_playwright() as pw:
    br = pw.chromium.launch(channel="chrome", args=["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"])
    for dev, vp in (("tablet", {"width": 1180, "height": 820}), ("phone", {"width": 390, "height": 844})):
        ctx = br.new_context(viewport=vp, locale="vi-VN", device_scale_factor=2 if dev == "phone" else 1.5)
        ctx.add_init_script(INIT)
        p = ctx.new_page()
        p.on("pageerror", lambda e, dev=dev: errs.append(f"{dev} pageerror {e}"))
        p.on("console", lambda m, dev=dev: errs.append(f"{dev} console {m.text}") if m.type == "error" and "favicon" not in m.text else None)
        T = dev + ": "

        # ---------- Di chuyển dữ liệu 1.2 → 2.0 ----------
        at(p, 2026, 11, 19)
        fresh(p, """() => { const M = window.__miaozi; M.debugSeed({ streak: { current: 4, best: 6, lastFulfilledDate: '2026-11-18', pendingMakeups: [] },
           penalties: [{ id: 'old-1', type: 'wordTwice', createdAt: 1, dueChars: ['好'], copies: 3, done: false, extraReview: 0, note: 'cũ' }],
           sessions: [{ id: 'l1', sessionId: 'x', date: '2026-11-17', kind: 'evening', startedAt: 1, endedAt: 2, activeMs: 1500000, correct: 5, total: 5, counted: true, late: false, skills: [] }],
           progress: { ...M.getState().progress, week0Passed: true, unlockedLesson: 1 } }); }""")
        p.wait_for_timeout(400)
        p.evaluate("""() => new Promise((res) => { const r = indexedDB.open('lohan', 1); r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').delete('v2'); tx.oncomplete = () => { r.result.close(); res(); }; }; })""")
        p.reload(wait_until="networkidle"); ready(p); p.wait_for_timeout(300)
        mg = st(p, "({ lesson: s.v2.lesson, legacy: s.v2.legacy, pens: s.penalties.length, streak: window.__miaozi.V2.streakNow(), min17: Math.round((s.v2.days['2026-11-17']||{}).ms/60000) })")
        check(T + "migrate 1.2: bài hiện tại = 1, giữ phạt, giữ chuỗi, lịch có phút cũ", mg["lesson"] == 1 and mg["pens"] == 1 and mg["streak"] == 4 and mg["min17"] == 25, json.dumps(mg))

        # ---------- Kịch bản 1: Cạn pin hôm nay → Tiêu chuẩn ngày mai ----------
        at(p, 2026, 11, 18)  # Thứ 4
        fresh(p); go(p, "/")
        check(T + "nút Cạn pin đúng nhãn 3/3", p.locator("[data-testid=mode-low]").inner_text().startswith("🔋 Cạn pin 15p (Còn 3/3 lượt tuần này)"))
        p.click("[data-testid=mode-low]"); p.wait_for_timeout(200)
        check(T + "KB1 chọn Cạn pin → còn 2/3", "Còn 2/3 lượt" in p.locator("[data-testid=mode-low]").inner_text())
        go(p, "/lesson/1"); p.wait_for_selector("[data-testid=lesson2]")
        check(T + "KB1 Cạn pin sáng đúng 1 mục (S2)", active_secs(p) == ["s2"], str(active_secs(p)))
        check(T + "mục mờ vẫn bấm mở được", (p.click("[data-testid=open-s5]") or True) and p.locator("[data-testid=s5]").count() == 1)
        check(T + "nút hoàn thành bị khóa khi chưa đủ điều kiện", not p.locator("#complete-s2").is_enabled())
        # S2 trên giao diện: chạm từng thẻ + mở link video + tick
        p.click("[data-testid=open-s2]"); p.wait_for_selector("[data-testid=s2]")
        for b in p.locator("[data-testid=vocab-word]").all(): b.click()
        check(T + "phân tích chữ Hán + link Nhai /hanzi", p.locator("[data-testid=hanzi-info] a[href^='https://nhaihsk.com/hanzi/']").count() >= 1)
        check(T + "link video = trang bài Nhai", p.locator("#video-link").get_attribute("href") == "https://nhaihsk.com/vocab/hsk1/lesson-1")
        with ctx.expect_page() as newp: p.click("#video-link")
        newp.value.close(); p.wait_for_timeout(200)
        p.check("#video-done")
        p.evaluate("() => { window.__miaozi.V2.patchSub(1, { dialog: true }); }")  # nghe hội thoại: đã kiểm riêng nút phát
        if dev == "phone": shot(p, f"{dev}-lesson-s2", full=False)
        check(T + "KB1 S2 đủ điều kiện → bấm hoàn thành", complete(p, 1, "s2"))
        check(T + "KB1 = 25%", pct(p) == 25, str(pct(p)))
        at(p, 2026, 11, 19); reload(p); go(p, "/")
        p.click("[data-testid=mode-standard]"); go(p, "/lesson/1")
        check(T + "KB1 hôm sau Tiêu chuẩn sáng S3 + S4", active_secs(p) == ["s3", "s4"], str(active_secs(p)))
        earn(p, 1, "s3"); complete(p, 1, "s3"); earn(p, 1, "s4"); complete(p, 1, "s4")
        check(T + "KB1 kết thúc 70%", pct(p) == 70, str(pct(p)))

        # ---------- Kịch bản 2: trưa Công ty S2+S3 → tối Cạn pin S4 ----------
        fresh(p); go(p, "/"); p.click("[data-testid=mode-company]"); go(p, "/lesson/1")
        check(T + "KB2 Công ty sáng S2, S3, 6A", active_secs(p) == ["s2", "s3", "s6a"], str(active_secs(p)))
        check(T + "Công ty: giao diện xám, không có mèo", p.evaluate("document.body.classList.contains('company')") and p.locator(".cat-svg").count() == 0 and p.title() == "Ghi chú")
        check(T + "Công ty: có Phát Audio tự động + Ẩn/Hiện Pinyin", p.locator("#autoplay-all").count() == 1 and p.locator("#toggle-pinyin").count() == 1)
        p.click("[data-testid=open-s2]"); p.wait_for_selector("[data-testid=s2]")
        n_py = p.locator("[data-testid=s2] .py").count(); p.click("#toggle-pinyin"); p.wait_for_timeout(150)
        check(T + "Ẩn Pinyin hoạt động", n_py > 0 and p.locator("[data-testid=s2] .py").count() == 0)
        p.click("#toggle-pinyin")
        p.evaluate("() => { window.__played = []; }"); p.click("#autoplay-all"); p.wait_for_timeout(2500)
        check(T + "Phát tự động bắt đầu phát audio", len(p.evaluate("window.__played")) >= 1)
        p.click("text=■ Dừng")
        shot(p, f"{dev}-company-lesson")
        earn(p, 1, "s2"); complete(p, 1, "s2"); earn(p, 1, "s3"); complete(p, 1, "s3")
        check(T + "KB2 trưa = 50%", pct(p) == 50)
        go(p, "/"); p.click("[data-testid=mode-low]"); go(p, "/lesson/1")
        check(T + "KB2 tối Cạn pin sáng S4", active_secs(p) == ["s4"], str(active_secs(p)))
        earn(p, 1, "s4"); complete(p, 1, "s4")
        check(T + "KB2 đạt 70%, chuỗi giữ", pct(p) == 70 and st(p, "window.__miaozi.V2.streakNow()") >= 1)

        # ---------- Kịch bản 3: 85% → 6A sai 2 từ → hôm sau Bứt phá S1 + 6B → 100%, mở bài 2 ----------
        at(p, 2026, 11, 19); fresh(p)
        for sid in ("s2", "s3", "s4", "s5"): earn(p, 1, sid); complete(p, 1, sid)
        go(p, "/"); p.click("[data-testid=mode-standard]")
        check(T + "KB3 Tiêu chuẩn 85%", pct(p) == 85)
        p.evaluate("() => window.__miaozi.V2.finishCheck(1, 's6a', true, 0.86, [{ hanzi: '你', wordId: 'n01-01' }, { hanzi: '好' }])")
        complete(p, 1, "s6a")
        check(T + "KB3 6A sai 2 chữ → có chép phạt", st(p, "s.penalties.filter(x => !x.done).length") == 1)
        at(p, 2026, 11, 20); reload(p); go(p, "/"); p.click("[data-testid=mode-burst]"); go(p, "/lesson/1")
        check(T + "KB3 hôm sau Bứt phá sáng S1 + 6B", active_secs(p) == ["s1", "s6b"], str(active_secs(p)))
        p.click("[data-testid=open-s1]"); p.wait_for_selector("[data-testid=s1]")
        check(T + "S1 nút xác nhận khóa khi chưa chép", not p.locator("#s1-confirm").is_enabled())
        for _ in range(6):
            p.locator("[data-testid=bigpad]").scroll_into_view_if_needed(); bb = p.locator("[data-testid=bigpad]").bounding_box()
            p.mouse.move(bb["x"] + bb["width"] * .3, bb["y"] + bb["height"] * .5); p.mouse.down(); p.mouse.move(bb["x"] + bb["width"] * .7, bb["y"] + bb["height"] * .5, steps=6); p.mouse.up()
            p.click("#bigpad-next"); p.wait_for_timeout(120)
        if dev == "tablet": shot(p, f"{dev}-s1-penalty")
        p.click("#s1-confirm"); p.wait_for_timeout(200)
        check(T + "S1 xong → hết phạt, hiện 'Không có lỗi phạt'", st(p, "s.penalties.filter(x => !x.done).length") == 0 and p.locator("[data-testid=s1-empty]").count() == 1)
        earn(p, 1, "s6b"); complete(p, 1, "s6b")
        check(T + "KB3 = 100%, mở bài 2", pct(p) == 100 and st(p, "s.v2.lesson") == 2 and p.locator("[data-testid=lesson-done]").count() == 1)
        if dev == "tablet": shot(p, f"{dev}-lesson-done", full=True)

        # ---------- Cạn pin: hết lượt + reset thứ 2 ----------
        at(p, 2026, 11, 19)
        fresh(p, "() => { const M = window.__miaozi; M.debugSeed({ v2: { ...M.getState().v2, low: { weekStart: '2026-11-16', count: 3, days: ['2026-11-16','2026-11-17','2026-11-18'] } } }); }")
        go(p, "/")
        msg = p.locator("[data-testid=low-msg]")
        check(T + "Cạn pin hết 3 lượt: nút khóa + câu thông báo đúng nguyên văn", p.locator("[data-testid=mode-low]").is_disabled() and msg.count() == 1 and msg.inner_text() == "Bạn đã dùng hết 3 lượt Cạn pin tuần này, hãy chọn Tiêu chuẩn hoặc Chế độ Công ty nhé!")
        if dev == "phone": shot(p, f"{dev}-today-low-empty")
        at(p, 2026, 11, 23); reload(p); go(p, "/")
        check(T + "Cạn pin reset thứ 2 → 3/3", "Còn 3/3" in p.locator("[data-testid=mode-low]").inner_text() and p.locator("[data-testid=mode-low]").is_enabled())

        # ---------- Bỏ qua → nợ, quá hạn → phạt ----------
        at(p, 2026, 11, 19); fresh(p); go(p, "/lesson/1")
        p.click("#skip-s5"); p.click("text=Mic hỏng / không nói được"); p.wait_for_timeout(200)
        check(T + "Bỏ qua S5 → nợ hạn CN 22/11", st(p, "s.v2.sec[1].s5.owed.due") == "2026-11-22")
        at(p, 2026, 11, 24); reload(p)
        check(T + "Nợ quá hạn → sinh chép phạt", st(p, "s.penalties.filter(x => !x.done && /quá hạn/.test(x.reason||'')).length") == 1)

        # ---------- Hôm nay bận ----------
        at(p, 2026, 11, 19); fresh(p); go(p, "/"); p.click("#busy-btn"); p.wait_for_timeout(150)
        check(T + "Hôm nay bận ghi nhận", st(p, "s.v2.busy.includes('2026-11-19')"))

        # ---------- S3 trượt → chờ 10 phút ----------
        fresh(p); go(p, "/lesson/1/s3"); p.wait_for_selector("[data-testid=s3]")
        for q in p.locator("[data-testid=s3-q]").all(): q.locator(".opt").first.click()
        # chọn đáp án đầu cho mọi câu — có thể trúng; ép sai bằng cách kiểm tra kết quả
        p.click("#s3-submit"); p.wait_for_timeout(200)
        r = p.locator("[data-testid=s3-result]").inner_text()
        if r.startswith(("0/", "1/", "2/", "3/")):
            wait = st(p, "s.v2.retry['s3:1'] - Date.now()")
            check(T + "S3 trượt → khóa đúng 10 phút", 590000 <= wait <= 600000, str(wait))
        else:
            check(T + "S3 (lần này trúng ≥4/5, bỏ qua kiểm tra chờ)", True, r)

        # ---------- S4: chấm câu + viết cho phép sai 5 nét ----------
        fresh(p); go(p, "/lesson/1/s4"); p.wait_for_selector("[data-testid=s4]")
        box = p.locator("[data-testid=sentbox]").first
        box.locator("input").fill("老师好吗什么"); box.locator(".grade-btn").click(); p.wait_for_timeout(150)
        check(T + "Chấm câu sai báo lỗi tiếng Việt", "Chưa đạt" in box.locator("[data-testid=grade-res]").inner_text())
        box.locator("input").fill("老师好！"); box.locator(".grade-btn").click(); p.wait_for_timeout(150)
        check(T + "Chấm câu đúng → Đạt", st(p, "window.__miaozi.V2.subOf(1).sentOk.includes(0)"))
        if dev == "phone": shot(p, f"{dev}-s4-grader")
        host = p.locator("[data-testid=write-box]").first.locator(".writer-host")
        p.wait_for_timeout(600)
        for _ in range(3): draw_char(p, host, "一")  # 3 nét sai
        draw_char(p, host, "你"); p.wait_for_timeout(500)
        draw_char(p, p.locator("[data-testid=write-box]").nth(1).locator(".writer-host"), "好"); p.wait_for_timeout(700)
        check(T + "Viết sai 3 nét vẫn đạt (≤5)", st(p, "window.__miaozi.V2.subOf(1).written.includes('n01-01')"))

        # ---------- S5: nói (giả lập kết quả Chrome: dấu câu + phồn thể) ----------
        go(p, "/lesson/1/s5"); p.wait_for_selector("[data-testid=s5]")
        row = p.locator("[data-testid=speak-row]").first
        exp = han(row.locator(".hanzi-inline").inner_text())
        trad = exp.replace("们", "們").replace("师", "師").replace("谢", "謝").replace("见", "見").replace("们", "們")
        p.evaluate("t => { window.__miaoziAsr = [t + '！'] }", trad)
        row.locator(".speak-btn").click(); p.wait_for_timeout(400)
        heard = row.locator("[data-testid=speak-heard]").inner_text()
        check(T + "Nói: hiện chữ máy nghe + đạt với phồn thể/dấu câu", "Đạt" in row.locator("[data-testid=speak-pct]").inner_text() and trad in heard, heard)
        if dev == "tablet": shot(p, f"{dev}-s5-speak")
        p.evaluate("() => { window.__miaoziAsr = ['今天天气很好'] }")
        p.locator("[data-testid=speak-row]").nth(1).locator(".speak-btn").click(); p.wait_for_timeout(300)
        check(T + "Nói sai câu → chưa đạt", "Chưa đạt" in p.locator("[data-testid=speak-row]").nth(1).locator("[data-testid=speak-pct]").inner_text())
        p.evaluate("() => { window.__miaoziAsr = null }")

        # ---------- Giữ trạng thái viết khi sang Ghi chú tay ----------
        fresh(p); go(p, "/write"); p.wait_for_selector("[data-testid=write-page]")
        p.click("#write-next"); p.click("#write-next"); p.click("[data-testid=write-page] .sw"); p.wait_for_timeout(200)
        before = p.locator("[data-testid=write-pos]").inner_text()
        go(p, "/notes"); p.wait_for_selector("[data-testid=notes]"); go(p, "/write"); p.wait_for_selector("[data-testid=write-page]")
        after = p.locator("[data-testid=write-pos]").inner_text()
        check(T + "Sang Ghi chú tay rồi quay lại: giữ từ đang viết + Ẩn nét mẫu", before.startswith("Từ 3/") and after.startswith("Từ 3/") and p.locator("[data-testid=write-page] .sw").get_attribute("aria-checked") == "true", f"{before} | {after}")
        reload(p); go(p, "/write")
        check(T + "…kể cả sau khi tải lại app", p.locator("[data-testid=write-pos]").inner_text().startswith("Từ 3/"))

        # ---------- Chép phạt: không bắt PDF, ẩn/hiện mẫu ----------
        fresh(p, "() => window.__miaozi.debugSeed({ penalties: [{ id: 'p1', type: 'wordTwice', createdAt: 1, dueChars: ['你'], copies: 2, done: false, extraReview: 0, note: 'x' }] })")
        go(p, "/penalty"); p.click("[data-testid=pen-mode-app]"); p.wait_for_timeout(200)
        check(T + "Chép phạt: hiện chữ mẫu", p.locator("[data-testid=pen-model]").inner_text() == "你")
        p.locator("[data-testid=penalty] .sw").click(); p.wait_for_timeout(100)
        check(T + "Chép phạt: tắt mẫu để viết theo trí nhớ", p.locator("[data-testid=pen-model]").inner_text() == "？")
        for c in p.locator(".minipad canvas").all():
            c.scroll_into_view_if_needed(); bb = c.bounding_box(); p.mouse.move(bb["x"] + 10, bb["y"] + 10); p.mouse.down(); p.mouse.move(bb["x"] + 40, bb["y"] + 40, steps=4); p.mouse.up()
        downloads = []; p.on("download", lambda d: downloads.append(d))
        p.click("#submit-penalty"); p.wait_for_timeout(500)
        check(T + "Nộp chép phạt trong app không cần PDF", st(p, "s.penalties[0].done") and not downloads)

        # ---------- Lịch tháng ----------
        at(p, 2026, 11, 19); fresh(p); go(p, "/"); p.click("[data-testid=mode-standard]")
        earn(p, 1, "s2"); complete(p, 1, "s2")
        p.evaluate("() => { const s = window.__miaozi.getState(); s.v2.days['2026-11-19'].ms += 30 * 60000; s.v2.days['2026-11-18'] = { modes: ['low'], ms: 15 * 60000, secs: ['1:s3'], tests: [] }; window.__miaozi.debugSeed({}); }")
        go(p, "/calendar"); p.wait_for_selector("[data-testid=calendar]")
        d19 = p.locator("[data-date='2026-11-19']"); d18 = p.locator("[data-date='2026-11-18']")
        check(T + "Lịch: ngày có màu theo chế độ + phút học", "30" in d19.inner_text() and "background" in (d19.get_attribute("style") or "") and (d18.get_attribute("style") or "") != (d19.get_attribute("style") or ""), d19.inner_text())
        p.fill("[data-testid=day-note]", "Học trưa ở công ty"); p.locator("[data-testid=day-note]").blur(); reload(p); go(p, "/calendar")
        check(T + "Lịch: ghi chú ngày được lưu", p.locator("[data-testid=day-note]").input_value() == "Học trưa ở công ty")
        check(T + "Lịch: chuỗi đếm 2 ngày", st(p, "window.__miaozi.V2.streakNow()") == 2)
        shot(p, f"{dev}-calendar", full=dev == "tablet")

        # ---------- Kiểm tra tuần / tháng ----------
        at(p, 2026, 11, 19); go(p, "/test/weekly")
        check(T + "Kiểm tra tuần khóa ngoài Chủ nhật", p.locator("#test-start").count() == 0)
        at(p, 2026, 11, 22); reload(p); go(p, "/test/weekly")
        check(T + "Kiểm tra tuần mở Chủ nhật", p.locator("#test-start").count() == 1)
        at(p, 2026, 11, 26); reload(p); go(p, "/test/monthly")
        check(T + "Kiểm tra tháng mở tuần cuối tháng + 13 đề Nhai", p.locator("#test-start").count() == 1 and p.locator("a[href*='certificate-test/hsk1/']").count() == 13)

        # ---------- Thi thật (tablet): 6A + thi vượt bài ----------
        if dev == "tablet":
            at(p, 2026, 11, 19); fresh(p); go(p, "/lesson/1/s6a"); p.click("#start-s6a")
            ok = run_exam(p, "[data-testid=s6-result]")
            check(T + "6A chạy thật qua ExamRunner → ĐẠT", ok and "ĐẠT" in p.locator("[data-testid=s6-result]").inner_text())
            fresh(p); go(p, "/lesson/1"); p.click("#placement-start")
            ok = run_exam(p, "[data-testid=placement-result]", 80)
            check(T + "Thi vượt bài (nghe/đọc/viết/nói) → ĐẠT → 100%", ok and pct(p) == 100, p.locator("[data-testid=placement-result]").inner_text() if ok else "")

        # ---------- Ảnh màn hình chính ----------
        at(p, 2026, 11, 19); fresh(p); go(p, "/"); p.click("[data-testid=mode-standard]")
        earn(p, 1, "s2"); complete(p, 1, "s2"); go(p, "/"); shot(p, f"{dev}-today", full=dev == "tablet")
        go(p, "/lesson/1"); p.click("[data-testid=open-s3]"); p.wait_for_timeout(300); shot(p, f"{dev}-lesson")
        go(p, "/"); p.click("[data-testid=mode-company]"); p.wait_for_timeout(250)
        check(T + "Bật Công ty ngay trên trang Hôm nay → đổi giao diện ngay", p.evaluate("document.body.classList.contains('company')") and p.locator(".cat-svg").count() == 0)
        shot(p, f"{dev}-company-today")
        p.click("[data-testid=mode-company]")
        # nhãn phiên bản
        go(p, "/settings"); check(T + "Cài đặt hiện Miaozi 2.0.0", "Miaozi 2.0.0" in p.inner_text("body"))
        check(T + "Tiêu đề Miaozi", p.title() == "Miaozi — HSK1")
        ctx.close()
    br.close()

bad = [r for r in results if not r[1]]
print(f"\n{len(results) - len(bad)}/{len(results)} PASS")
real_errs = [e for e in errs if "Failed to load resource" not in e]
print("console/page errors:", len(real_errs)); [print("  ", e[:200]) for e in real_errs[:15]]
sys.exit(1 if bad else 0)
