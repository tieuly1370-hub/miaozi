"""Miaozi 2.4 — Playwright cho bản gọn: thanh dưới 3 tab, Bài học HSK 1/2/3, màn Viết (nút sắp lại + Nghe), đánh dấu xong bài,
Kiểm tra chỉ lấy bài đã xong (không có Nói), Cài đặt đã ẩn streak/chế độ/giờ nhắc, chấm viết chặt khi Ẩn mẫu (vẽ nét thật bằng chuột),
giữ dữ liệu cũ khi nâng cấp. Chạy: npm run build && (npx vite preview --port 4173 &) && python3 scripts/test_v24.py"""
import json, re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = "http://127.0.0.1:4173/"
OUT = Path("/workspace/hsk/shots/v24"); OUT.mkdir(parents=True, exist_ok=True)
INIT = """window.__played = []; const _play = HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play = function() { window.__played.push(this.src); return _play.call(this).catch(()=>{}); };"""
results = []
def check(name, cond, extra=""):
    results.append((name, bool(cond))); print(("PASS " if cond else "FAIL ") + name + (f" — {extra}" if extra else ""), flush=True)
def go(p, h):
    p.evaluate(f"location.hash = {json.dumps(h)}"); p.wait_for_timeout(500)
    if p.locator("[data-testid=leave-guard]").count(): p.click("#leave-go"); p.wait_for_timeout(250)
def ready(p): p.wait_for_function("() => window.__miaozi && window.__miaozi.getState && window.__miaozi.V2")
def st(p, js): return p.evaluate(f"() => {{ const s = window.__miaozi.getState(); return {js}; }}")
def fresh(p):
    p.goto(BASE, wait_until="networkidle"); ready(p)
    p.evaluate("async () => { await window.__miaozi.reset(); window.__miaozi.debugSeed({ penalties: [], mistakes: [] }); }"); p.wait_for_timeout(300)
def medians(c): return json.load(open(f"/workspace/hsk/public/hanzi-data/{c}.json"))["medians"]
def draw_char(p, ch, xform=lambda i, x, y: (x, y)):
    """Vẽ từng nét theo medians (đổi toạ độ chữ → màn hình qua transform của nhóm SVG hanzi-writer)."""
    for i, med in enumerate(medians(ch)):
        g = p.evaluate("""() => { const box = document.querySelector('[data-testid=write-box].on .hw-svg svg'); const r = box.getBoundingClientRect();
          const g = box.querySelector('g[transform]'); return { x: r.left, y: r.top, t: g.getAttribute('transform') }; }""")
        nums = [float(v) for v in re.findall(r"-?\d+\.?\d*", g["t"])]
        tx, ty, sc = nums[0], nums[1], nums[2]
        pts = [xform(i, x, y) for x, y in med]
        sx = lambda x: g["x"] + tx + sc * x; sy = lambda y: g["y"] + ty - sc * y
        p.mouse.move(sx(pts[0][0]), sy(pts[0][1])); p.mouse.down()
        for a, b in zip(pts, pts[1:]):
            for k in range(1, 5):
                p.mouse.move(sx(a[0] + (b[0] - a[0]) * k / 4), sy(a[1] + (b[1] - a[1]) * k / 4))
        p.mouse.up(); p.wait_for_timeout(260)
    p.wait_for_timeout(500)

with sync_playwright() as pw:
    b = pw.chromium.launch()
    p = b.new_page(viewport={"width": 1280, "height": 800}); p.add_init_script(INIT)
    errs = []; p.on("pageerror", lambda e: errs.append(str(e)))
    fresh(p)
    nav = [a.inner_text().replace("\n", " ").strip() for a in p.locator("[data-testid=nav] a").all()]
    check("thanh dưới chỉ 3 tab: Bài học, Kiểm tra, Cài đặt", len(nav) == 3 and "Bài học" in nav[0] and "Kiểm tra" in nav[1] and "Cài đặt" in nav[2], str(nav))
    check("header không còn chuỗi ngày", "chuỗi" not in p.locator("header.top").inner_text())
    check("trang chính có HSK 1 / HSK 2 / HSK 3", all(p.locator(f"[data-testid=level-hsk{i}]").count() for i in (1, 2, 3)))
    check("HSK 3 hiện Sắp có", "Sắp có" in p.locator("[data-testid=level-hsk3]").inner_text())
    if p.locator("[data-testid=level-hsk1]").get_attribute("aria-expanded") == "true": p.click("[data-testid=level-hsk1]")
    if p.locator("[data-testid=level-hsk2]").get_attribute("aria-expanded") != "true": p.click("[data-testid=level-hsk2]")
    p.wait_for_timeout(200)
    rows = p.locator("[data-testid=lesson-row]")
    check("bấm HSK 2 xổ ra 15 bài", rows.count() == 15, str(rows.count()))
    p.screenshot(path=str(OUT / "home-tablet.png"))
    rows.nth(0).click(); p.wait_for_timeout(900)
    check("bấm bài → màn Viết của bài (HSK 2 · Bài 1)", p.locator("[data-testid=write-lesson-label]").inner_text().strip().lower() == "hsk 2 · bài 1")
    check("từ đầu tiên của HSK 2 bài 1 là 觉得", "觉得" in p.locator("[data-testid=write-pos]").inner_text())
    tools = p.locator("[data-testid=canvas-tools]").inner_text()
    check("hàng công cụ dưới ô viết: Hoàn tác, Viết lại, Xem mẫu, Ẩn mẫu", all(x in tools for x in ["Hoàn tác", "Viết lại", "Xem mẫu", "Ẩn mẫu"]), tools.replace("\n", " "))
    navr = p.locator("[data-testid=word-nav]").inner_text()
    check("hàng chuyển từ riêng: ‹ Trước / Từ tiếp ›", "Trước" in navr and "Từ tiếp" in navr)
    check("thẻ chữ có Nghe + Khó", p.locator("[data-testid=char-info] [data-testid=listen-char]").count() == 1 and p.locator("[data-testid=char-info] [data-testid=star-btn]").count() == 1)
    check("PDF / Ghi chú tay ở cuối", p.locator(".write-foot").inner_text().count("PDF") == 1 and "Ghi chú tay" in p.locator(".write-foot").inner_text())
    check("thẻ chữ HSK 2 có Hán Việt + mẹo nhớ", "Hán Việt" in p.locator("[data-testid=char-info]").inner_text() and p.locator("[data-testid=mnemo-line]").count() == 1)
    p.evaluate("window.__played = []"); p.click("[data-testid=listen-char]"); p.wait_for_timeout(500)
    pl = p.evaluate("window.__played")
    check("Nghe chữ 觉 (không có từ riêng) → phát âm từ 觉得", any("w4-n20-01.mp3" in x for x in pl), str(pl[-1:]))
    p.click("[data-testid=listen-char]"); p.wait_for_timeout(500)
    check("chạm lại → nghe chậm", any("w4-n20-01-slow.mp3" in x for x in p.evaluate("window.__played")))
    p.screenshot(path=str(OUT / "write-tablet.png"))
    # chấm chặt khi Ẩn mẫu: viết 哥 (HSK 2 bài 10, từ 3 = 哥哥) gọn → đạt; lệch thành phần → không đạt
    go(p, "#/write/29"); idx = st(p, "window.__miaozi.getState().v2.write.lesson")
    k = p.evaluate("() => [...document.querySelectorAll('[data-testid=write-word-item] .hz-w')].findIndex(e => e.textContent === '哥哥')")
    p.locator("[data-testid=write-word-item]").nth(k).click(); p.wait_for_timeout(400)
    p.locator("[data-testid=canvas-tools] .toggle button").first.click(); p.wait_for_timeout(700)
    check("Ẩn mẫu bật", st(p, "s.v2.write.hide") is True)
    draw_char(p, "哥", lambda i, x, y: (x * 0.9 + 40, y * 0.9 + 30))
    m1 = p.locator("[data-testid=write-box].on .wbox-msg").first.inner_text() if p.locator("[data-testid=write-box].on").count() else ""
    ok1 = p.locator("[data-testid=write-word] .step-dot.ok").count() == 1
    check("Ẩn mẫu: 哥 viết gọn (hơi nhỏ, hơi lệch) → Đạt", ok1, m1)
    p.wait_for_timeout(900)
    def sloppy(i, x, y):
        return (250 + (x - 250) * 0.5, 780 + (y - 780) * 0.5) if i < 5 else (512 + (x - 512) * 1.1 + 120, 300 + (y - 300) * 1.6)
    draw_char(p, "哥", sloppy)
    box = p.locator("[data-testid=write-box]").last
    txt = box.inner_text()
    check("Ẩn mẫu: 哥 thứ 2 viết lệch / sai tỉ lệ → KHÔNG đạt (nét bị trả lại hoặc chữ trượt)", p.locator("[data-testid=write-word] .step-dot.ok").count() == 1 and ("lệch" in txt or "Sai" in txt or "sai" in txt), txt.replace("\n", " ")[:120])
    p.screenshot(path=str(OUT / "write-strict.png"))
    # lệch vừa phải (可 dưới dịch phải 170, kéo cao 1.3): Ẩn mẫu → bị bắt; có mẫu → vẫn khoan dung như cũ
    mild = lambda i, x, y: (x, y) if i < 5 else (x + 170, 300 + (y - 300) * 1.3)
    def first_char_result():
        p.wait_for_timeout(200)
        return p.locator("[data-testid=write-word] .step-dot").first.get_attribute("class"), p.locator("[data-testid=write-box]").first.inner_text().replace("\n", " ")[:90]
    go(p, "#/settings"); go(p, "#/write/29"); p.locator("[data-testid=write-word-item]").nth(k).click(); p.wait_for_timeout(700)
    draw_char(p, "哥", mild); c1, t1 = first_char_result()
    check("Ẩn mẫu: 可 dưới lệch phải / kéo cao → KHÔNG đạt", "ok" not in c1.split(), t1)
    p.locator("[data-testid=canvas-tools] .toggle button").first.click(); p.wait_for_timeout(300)
    check("tắt Ẩn mẫu", st(p, "s.v2.write.hide") is False)
    go(p, "#/settings"); go(p, "#/write/29"); p.locator("[data-testid=write-word-item]").nth(k).click(); p.wait_for_timeout(700)
    draw_char(p, "哥", mild); c2, t2 = first_char_result()
    check("Có mẫu: cùng nét lệch đó vẫn khoan dung như trước (Đạt)", "ok" in c2.split(), t2)
    # đánh dấu xong bài
    go(p, "#/write/1"); p.click("#mark-lesson-done"); p.wait_for_timeout(300)
    check("Đánh dấu đã học xong bài 1", p.locator("[data-testid=lesson-done]").count() == 1 and st(p, "!!s.v2.doneLessons[1]"))
    go(p, "#/")
    p.wait_for_timeout(200)
    # Kiểm tra
    p.evaluate("async () => { await window.__miaozi.reset(); }"); p.wait_for_timeout(300)
    go(p, "#/tests"); p.wait_for_timeout(700)
    check("Kiểm tra: chưa có bài xong → lời nhắc", p.locator("[data-testid=test-empty]").count() == 1)
    p.evaluate("() => { const s = window.__miaozi.getState(); s.v2.doneLessons = { 1: Date.now(), 2: Date.now(), 3: Date.now() }; s.v2.write = { ...s.v2.write, lesson: 4 }; window.__miaozi.debugSeed({}); }")
    go(p, "#/settings"); go(p, "#/tests"); p.wait_for_timeout(500)
    items = p.evaluate("async () => (await window.__miaozi.levelTestItems('weekly', [1,2,3])).map(i => [i.t, i.skill, i.wordId || i.key])")
    lessons = p.evaluate("""async () => { const its = await window.__miaozi.levelTestItems('weekly', [1,2,3]); return its.map(i => i.key.split(':')[1] || '').filter(id => id[0] === 'n').map(id => id.slice(1, 3)); }""")
    check("Kiểm tra tuần: chỉ từ bài 1–3 đã xong (đang học bài 4 không vào đề)", len(lessons) >= 10 and all(x in ("01", "02", "03") for x in lessons), str(sorted(set(lessons))))
    check("Kiểm tra: không có câu Nói", all(t != "speak" for t, _, _ in items) and len(items) > 10, f"{len(items)} câu")
    p.click("#test-weekly"); p.wait_for_timeout(800)
    check("bắt đầu Kiểm tra tuần mở đề", p.locator("[data-testid=exam-speak]").count() == 0 and p.locator(".exam-prompt, [data-testid=exam-pick], [data-testid=exam-build], [data-testid=exam-write]").count() >= 1)
    p.screenshot(path=str(OUT / "test-tablet.png"))
    go(p, "#/settings"); p.wait_for_timeout(500)
    t = p.locator("[data-testid=settings]").inner_text()
    check("Cài đặt: ẩn Streak, Chế độ Công ty, Giờ nhắc học; còn Tên gọi + Đồng bộ", all(x not in t for x in ["Streak", "Chế độ Công ty", "Giờ nhắc học"]) and "Tên gọi" in t and "Đồng bộ" in t)
    # giữ dữ liệu cũ khi nâng cấp
    p.evaluate("() => { const s = window.__miaozi.getState(); s.v2.write.done = { 'n01-01': true, 'n02-03': true }; s.notes = { '1': { strokes: [], updatedAt: 5 } }; s.v2.stars = { '好': 1 }; window.__miaozi.debugSeed({}); }")
    p.wait_for_timeout(500); p.reload(wait_until="networkidle"); ready(p); p.wait_for_timeout(300)
    check("tải lại: giữ chữ đã viết, ghi chú, ⭐", st(p, "!!s.v2.write.done['n01-01'] && !!s.notes['1'] && !!s.v2.stars['好']"))
    check("không lỗi JS", not errs, "; ".join(errs[:3]))
    # điện thoại
    ph = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True); ph.add_init_script(INIT)
    ph.goto(BASE + "#/write/20", wait_until="networkidle"); ready(ph); ph.wait_for_timeout(900)
    ph.screenshot(path=str(OUT / "write-phone.png"), full_page=True)
    ov = ph.evaluate("() => document.documentElement.scrollWidth <= window.innerWidth + 1")
    check("điện thoại: màn Viết không tràn ngang", ov)
    ph.goto(BASE + "#/", wait_until="networkidle"); ph.wait_for_timeout(500); ph.screenshot(path=str(OUT / "home-phone.png"))
    b.close()
fails = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(fails)}/{len(results)} PASS" + (f"; FAIL: {fails}" if fails else ""))
sys.exit(1 if fails else 0)
