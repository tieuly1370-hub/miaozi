import json, time, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE = "http://127.0.0.1:4173/"
OUT = Path("/workspace/hsk/shots/v11"); OUT.mkdir(parents=True, exist_ok=True)
errs = []
def shot(p, name, full=False):
    p.screenshot(path=str(OUT / f"{name}.png"), full_page=full); print("shot", name)
def go(p, h): p.evaluate(f"location.hash = {json.dumps(h)}"); p.wait_for_timeout(500)
INIT = """
window.__played = [];
const _play = HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play = function() { window.__played.push(this.src); return _play.call(this).catch(()=>{}); };
"""
def setup(p, unlock=3):
    p.goto(BASE, wait_until="networkidle")
    p.wait_for_function("() => window.__lohan && window.__lohan.getState")
    p.evaluate("async () => { await window.__lohan.reset(); await window.__lohan.unlock(%d); }" % unlock)
    p.wait_for_timeout(400)

def draw_char(p, box_el, char):
    data = json.load(open(f"/workspace/hsk/public/hanzi-data/{char}.json"))
    bb = box_el.bounding_box()
    size = bb["width"]; pad = 8; sc = (size - 2 * pad) / 1024
    for med in data["medians"]:
        pts = [(bb["x"] + pad + x * sc, bb["y"] + pad + (900 - y) * sc) for x, y in med]
        p.mouse.move(*pts[0]); p.mouse.down()
        for a, b in zip(pts, pts[1:]):
            for t in (0.33, 0.66, 1.0):
                p.mouse.move(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        p.mouse.up(); p.wait_for_timeout(120)

with sync_playwright() as pw:
    br = pw.chromium.launch(channel="chrome", args=["--no-sandbox", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"])
    for dev, vp in (("tablet", {"width": 1280, "height": 800}), ("phone", {"width": 390, "height": 844})):
        ctx = br.new_context(viewport=vp, locale="vi-VN", accept_downloads=True, device_scale_factor=2 if dev == "phone" else 1.5)
        ctx.add_init_script(INIT)
        p = ctx.new_page()
        p.on("pageerror", lambda e: errs.append(f"{dev} pageerror {e}"))
        p.on("console", lambda m: errs.append(f"{dev} console {m.text}") if m.type == "error" else None)
        setup(p)
        go(p, "/"); p.wait_for_selector("[data-testid=day-plan]"); shot(p, f"{dev}-today-plan")
        steps = p.locator("[data-testid=plan-step]").count(); print(dev, "plan steps", steps)
        # Writing: 你们 in lesson 1 (index 3)
        go(p, "/write")
        p.locator("select").first.select_option("1"); p.wait_for_timeout(300)
        for _ in range(3): p.click("text=Từ tiếp"); p.wait_for_timeout(200)
        p.wait_for_selector("[data-testid=write-word]")
        p.wait_for_timeout(800)
        n_boxes = p.locator("[data-testid=write-box]").count(); print(dev, "write boxes for 你们:", n_boxes)
        shot(p, f"{dev}-write-2boxes")
        if dev == "tablet":
            hosts = p.locator(".writer-host")
            draw_char(p, hosts.nth(0), "你"); p.wait_for_timeout(500)
            print("after char1:", p.locator(".step-dot.ok").count(), "ok dots;", p.locator(".wbox.on").count(), "active")
            draw_char(p, hosts.nth(1), "们"); p.wait_for_timeout(600)
            print("after char2:", p.locator(".step-dot.ok").count(), "ok dots")
            shot(p, "tablet-write-done")
            # retry button
            p.locator("text=Viết lại").first.click(); p.wait_for_timeout(400)
        # Autoplay: words page
        p.evaluate("window.__played = []")
        go(p, "/lesson/1/words"); p.wait_for_timeout(900)
        p.click("text=Từ tiếp"); p.wait_for_timeout(900)
        played = p.evaluate("window.__played"); print(dev, "autoplay played:", [x.split('/')[-1] for x in played])
        # Sentence autoplay
        p.evaluate("window.__played = []"); go(p, "/lesson/1/sentences"); p.wait_for_timeout(900)
        print(dev, "sentence autoplay:", [x.split('/')[-1] for x in p.evaluate("window.__played")])
        # Textbook
        go(p, "/lesson/3/book"); p.wait_for_selector("[data-testid=textbook]"); p.wait_for_timeout(500)
        shot(p, f"{dev}-textbook-top")
        p.evaluate("document.querySelectorAll('.tb-gram')[0].scrollIntoView()"); p.wait_for_timeout(300)
        p.locator(".tb-reveal").first.click()
        p.locator(".tb-zh").nth(13).click(); p.wait_for_timeout(500)
        shot(p, f"{dev}-textbook-grammar")
        p.evaluate("[...document.querySelectorAll('h3')].find(h=>h.textContent.includes('Hội thoại')).scrollIntoView()"); p.wait_for_timeout(300)
        shot(p, f"{dev}-textbook-dialogue")
        # Penalties: 4 penalties with same id (old bug) -> reload -> migrate
        p.evaluate("""() => { const now = Date.now(); const mk = (c) => ({id: 'miss-' + now, type: 'missed', createdAt: now, dueChars: c, copies: 5, done: false, extraReview: 0, note: 'x'});
          const st = window.__lohan.getState(); window.__lohan.debugSeed({ progress: {...st.progress, startedOn: '2026-11-01'}, penalties: [mk(['你','好']), mk(['我']), mk(['是']), mk(['人'])] }); }""")
        p.wait_for_timeout(600); p.reload(wait_until="networkidle"); p.wait_for_function("() => window.__lohan && window.__lohan.getState")
        ids = p.evaluate("window.__lohan.getState().penalties.map(p=>p.id)"); print(dev, "penalty ids unique:", len(set(ids)) == len(ids), len(ids))
        go(p, "/penalty"); p.wait_for_selector("[data-testid=penalty]")
        p.locator("[data-testid=pen-item]").nth(2).click(); p.wait_for_timeout(200)
        sel = p.locator("[data-testid=pen-item][aria-checked=true]").count(); print(dev, "selected items after clicking 1:", sel)
        p.click("[data-testid=pen-mode-app]"); p.wait_for_timeout(500)
        p.locator(".pen-facts").scroll_into_view_if_needed(); shot(p, f"{dev}-penalty")
        # write in first minipad, undo, check counter
        p.locator(".minipad").first.scroll_into_view_if_needed(); p.wait_for_timeout(200)
        pad = p.locator(".minipad canvas").first; bb = pad.bounding_box()
        p.mouse.move(bb["x"] + 20, bb["y"] + 20); p.mouse.down(); p.mouse.move(bb["x"] + 80, bb["y"] + 70, steps=6); p.mouse.up()
        p.mouse.move(bb["x"] + 80, bb["y"] + 20); p.mouse.down(); p.mouse.move(bb["x"] + 20, bb["y"] + 80, steps=6); p.mouse.up()
        p.wait_for_timeout(200)
        print(dev, "chip after writing 1 box:", p.locator(".chip").filter(has_text="ô").first.inner_text())
        p.locator(".minipad-tools button[aria-label='Bỏ nét cuối']").first.click()
        p.locator(".minipad-tools button[aria-label='Xóa ô']").first.click(); p.wait_for_timeout(200)
        print(dev, "chip after clear:", p.locator(".chip").filter(has_text="ô").first.inner_text())
        p.click("[data-testid=pen-mode-paper]"); p.wait_for_timeout(300)
        shot(p, f"{dev}-penalty-paper")
        # Speak page
        go(p, "/speak"); p.wait_for_selector("[data-testid=mic-check]"); p.wait_for_timeout(300)
        p.click("text=Kiểm tra micro"); p.wait_for_timeout(3200)
        shot(p, f"{dev}-speak")
        print(dev, "mic msg:", p.locator("[data-testid=mic-check] p.muted").last.inner_text())
        # PDF dialog
        go(p, "/sheets"); p.wait_for_selector("[data-testid=pdf-dialog]")
        p.locator("[data-testid=pdf-grid] button").nth(1).click()
        shot(p, f"{dev}-pdf-dialog")
        if dev == "tablet":
            p.locator("select").first.select_option("1")
            with p.expect_download() as dl:
                p.click("#pdf-export-go")
            d = dl.value; path = OUT / "lesson1.pdf"; d.save_as(str(path)); print("pdf saved", path.stat().st_size)
            # custom: mistakes/custom selection with plain grid & no strokes
            p.locator("[data-testid=pdf-src] button").nth(2).click()
            for h in ["谢", "对不起"]:
                pass
            p.locator(".pick-chip").nth(4).click(); p.locator(".pick-chip").nth(10).click()
            p.locator("[data-testid=pdf-grid] button").nth(0).click()
            with p.expect_download() as dl:
                p.click("#pdf-export-go")
            dl.value.save_as(str(OUT / "custom.pdf"))
        ctx.close()
    br.close()
print("ERRORS:", "\n".join(errs) if errs else "none")
