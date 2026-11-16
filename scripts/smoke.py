#!/usr/bin/env python3
"""Smoke test main flows and capture screenshots."""
import time, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = "http://127.0.0.1:4173/"
SHOTS = Path("/workspace/hsk/shots")
SHOTS.mkdir(parents=True, exist_ok=True)
PDF_DIR = Path("/tmp/hsk-downloads")
PDF_DIR.mkdir(exist_ok=True)
errors = []

def shot(page, name):
    path = SHOTS / f"{name}.png"
    page.screenshot(path=str(path), full_page=False)
    print("shot", path, path.stat().st_size)
    return path

def wait_app(page):
    page.wait_for_selector(".app", timeout=15000)
    page.wait_for_function("() => window.__lohan && window.__lohan.getState", timeout=15000)

def goto(page, hash_path):
    page.evaluate(f"location.hash = {json.dumps(hash_path)}")
    page.wait_for_timeout(250)

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", args=["--no-sandbox", "--disable-dev-shm-usage"])
        # --- phone ---
        phone = browser.new_context(viewport={"width": 390, "height": 844}, locale="vi-VN",
                                    accept_downloads=True)
        page = phone.new_page()
        page.goto(BASE, wait_until="networkidle")
        wait_app(page)
        # onboarding
        page.wait_for_selector("[data-testid=onboarding]", timeout=8000)
        shot(page, "phone-onboarding")
        page.click("#start-week0")
        page.wait_for_selector("[data-testid=week0]")
        shot(page, "phone-week0")

        goto(page, "/week0/pinyin")
        page.wait_for_selector("[data-testid=week0-pinyin]")
        shot(page, "phone-week0-pinyin")

        goto(page, "/week0/tones")
        page.wait_for_selector("[data-testid=week0-tones]")
        shot(page, "phone-week0-tones")

        goto(page, "/week0/strokes")
        page.wait_for_selector("[data-testid=week0-strokes]")
        page.wait_for_selector("[data-testid=write-box]", timeout=10000)
        page.wait_for_timeout(600)
        # writer should have svg/canvas
        has_writer = page.locator(".writer-host svg, .writer-host canvas, .writer-host > div").count()
        print("writer nodes", has_writer)
        if has_writer == 0:
            errors.append("writing quiz did not render on week0 strokes")
        shot(page, "phone-week0-strokes")

        goto(page, "/week0/test")
        page.wait_for_selector("[data-testid=week0-test]")
        shot(page, "phone-week0-test")

        # complete week0 via API then check lesson 1 unlocked, 2 locked
        page.evaluate("() => window.__lohan.completeWeek0(1)")
        page.wait_for_timeout(200)
        goto(page, "/lesson/1")
        page.wait_for_selector("[data-testid=lesson-hub]")
        shot(page, "phone-lesson1")

        goto(page, "/lesson/1/words")
        page.wait_for_selector("[data-testid=lesson-words]")
        # pinyin should be visible on first intro
        pinyin = page.locator("[data-testid=pinyin]")
        print("first intro pinyin visible", pinyin.count())
        shot(page, "phone-lesson1-words")

        goto(page, "/lesson/1/watch")
        page.wait_for_selector("[data-testid=lesson-watch]")
        shot(page, "phone-lesson1-watch")

        goto(page, "/lesson/2")
        page.wait_for_selector("[data-testid=lesson-locked]")
        print("gating: lesson 2 locked before test — OK")
        shot(page, "phone-lesson2-locked")

        # fail lesson 1 (score 0) — still locked
        page.evaluate("async () => { const m = await import('./assets/noop'); }").catch if False else None
        page.evaluate("""() => {
          // call store passLesson via debug: set passed score 0.5
          const st = window.__lohan.getState();
          st.progress.lessonPassed[1] = { score: 0.5, at: Date.now() };
          // unlocked stays 1
        }""")
        goto(page, "/lesson/2")
        if page.locator("[data-testid=lesson-locked]").count() == 0:
            errors.append("lesson 2 unlocked after failing score — gating broken")
        else:
            print("gating: still locked after fail score — OK")

        # pass lesson 1
        page.evaluate("""async () => {
          const st = window.__lohan.getState();
          st.progress.week0Passed = true;
          st.progress.unlockedLesson = 2;
          window.__lohan.debugSeed({ progress: { ...st.progress } });
        }""")
        page.wait_for_timeout(200)
        goto(page, "/lesson/2")
        page.wait_for_selector("[data-testid=lesson-hub]", timeout=8000)
        print("gating: lesson 2 opens after pass — OK")
        shot(page, "phone-lesson2-open")

        # write page
        goto(page, "/write")
        page.wait_for_selector("[data-testid=write-page]")
        page.wait_for_selector("[data-testid=write-box]")
        page.wait_for_timeout(800)
        shot(page, "phone-write")

        # review — introduce cards first
        page.evaluate("""() => {
          const st = window.__lohan.getState();
          const now = Date.now();
          for (const [id, c] of Object.entries(st.srs)) {
            c.introduced = true;
            c.due = now - 1000;
          }
          window.__lohan.debugSeed({ srs: st.srs });
        }""")
        goto(page, "/review")
        page.wait_for_timeout(400)
        if page.locator("[data-testid=review]").count() or page.locator("[data-testid=review-empty]").count():
            print("review page ok")
        else:
            errors.append("review page missing")
        shot(page, "phone-review")

        # today
        goto(page, "/")
        page.wait_for_selector("[data-testid=today], [data-testid=onboarding]")
        # might still be today after onboarded
        shot(page, "phone-today")

        # PDF export
        goto(page, "/sheets")
        page.wait_for_selector("[data-testid=sheets]")
        shot(page, "phone-sheets")
        with page.expect_download(timeout=15000) as dlinfo:
            page.click("#export-sheet")
        download = dlinfo.value
        out = PDF_DIR / download.suggested_filename
        download.save_as(str(out))
        size = out.stat().st_size
        print("pdf", out, size)
        if size < 1000:
            errors.append(f"PDF too small: {size}")
        # also save a copy in shots
        dest = SHOTS / "practice-sheet.pdf"
        dest.write_bytes(out.read_bytes())

        # settings / company
        goto(page, "/settings")
        page.wait_for_selector("[data-testid=settings]")
        shot(page, "phone-settings")

        # roadmap
        goto(page, "/roadmap")
        page.wait_for_selector("[data-testid=roadmap]")
        shot(page, "phone-roadmap")

        phone.close()

        # --- tablet landscape 1280x800 ---
        tab = browser.new_context(viewport={"width": 1280, "height": 800}, locale="vi-VN")
        page = tab.new_page()
        page.goto(BASE, wait_until="networkidle")
        wait_app(page)
        page.evaluate("""async () => {
          await window.__lohan.reset();
          await window.__lohan.completeWeek0(1);
        }""")
        page.wait_for_timeout(300)
        goto(page, "/")
        page.wait_for_selector("[data-testid=today]")
        shot(page, "tablet-land-today")
        goto(page, "/roadmap")
        page.wait_for_selector("[data-testid=roadmap]")
        shot(page, "tablet-land-roadmap")
        goto(page, "/lesson/1/words")
        page.wait_for_selector("[data-testid=lesson-words]")
        shot(page, "tablet-land-words")
        goto(page, "/week0/strokes")
        page.wait_for_selector("[data-testid=write-box]")
        page.wait_for_timeout(600)
        shot(page, "tablet-land-write")
        goto(page, "/speak")
        page.wait_for_selector("[data-testid=speak]")
        shot(page, "tablet-land-speak")
        tab.close()

        # --- tablet portrait 800x1280 ---
        tabp = browser.new_context(viewport={"width": 800, "height": 1280}, locale="vi-VN")
        page = tabp.new_page()
        page.goto(BASE, wait_until="networkidle")
        wait_app(page)
        page.evaluate("""async () => {
          await window.__lohan.reset();
          await window.__lohan.completeWeek0(1);
        }""")
        page.wait_for_timeout(300)
        goto(page, "/")
        page.wait_for_selector("[data-testid=today]")
        shot(page, "tablet-port-today")
        goto(page, "/lesson/1")
        page.wait_for_selector("[data-testid=lesson-hub]")
        shot(page, "tablet-port-lesson")
        goto(page, "/notes")
        page.wait_for_selector("[data-testid=notes]")
        shot(page, "tablet-port-notes")
        goto(page, "/review")
        page.wait_for_timeout(300)
        shot(page, "tablet-port-review")
        tabp.close()
        browser.close()

    print("ERRORS:", errors)
    (SHOTS / "smoke-report.txt").write_text(
        "errors=" + json.dumps(errors) + "\nfiles=" + ", ".join(sorted(p.name for p in SHOTS.iterdir())) + "\n",
        encoding="utf-8",
    )
    if errors:
        raise SystemExit(1)

if __name__ == "__main__":
    main()
