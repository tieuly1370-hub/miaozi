"""Render Miaozi v2.2 static demos to PNG. Does not touch the app."""
from pathlib import Path
from playwright.sync_api import sync_playwright

MOCK = Path("/workspace/hsk/mock/v22")
OUT = Path("/workspace/hsk/shots/v22")
OUT.mkdir(parents=True, exist_ok=True)

JOBS = [
    ("demo-write-landscape.html", "demo-write-landscape.png", 1280, 853),
    ("demo-today-landscape.html", "demo-today-landscape.png", 1280, 853),
    ("demo-write-portrait.html", "demo-write-portrait.png", 853, 1280),
]

def main():
    with sync_playwright() as pw:
        br = pw.chromium.launch(channel="chrome", args=["--no-sandbox"])
        for html, png, w, h in JOBS:
            ctx = br.new_context(
                viewport={"width": w, "height": h},
                locale="vi-VN",
                device_scale_factor=2,
            )
            p = ctx.new_page()
            p.goto((MOCK / html).as_uri(), wait_until="networkidle")
            p.wait_for_timeout(200)
            # overflow report
            info = p.evaluate(
                """() => {
                  const b = document.body;
                  const issues = [];
                  if (b.scrollWidth > b.clientWidth + 1) issues.push('h-scroll ' + b.scrollWidth + '>' + b.clientWidth);
                  if (b.scrollHeight > b.clientHeight + 1) issues.push('v-scroll ' + b.scrollHeight + '>' + b.clientHeight);
                  document.querySelectorAll('*').forEach(el => {
                    const r = el.getBoundingClientRect();
                    if (r.width === 0 || r.height === 0) return;
                    if (r.right > b.clientWidth + 2 || r.bottom > b.clientHeight + 2 || r.left < -2 || r.top < -2) {
                      const id = (el.className && String(el.className).slice(0,60)) || el.tagName;
                      if (issues.length < 12) issues.push('clip ' + id + ' ' + JSON.stringify({l:+r.left.toFixed(1),t:+r.top.toFixed(1),r:+r.right.toFixed(1),b:+r.bottom.toFixed(1)}));
                    }
                  });
                  return issues;
                }"""
            )
            dest = OUT / png
            p.screenshot(path=str(dest), full_page=False)
            print(f"shot {png} {w}x{h} dsf=2  overflow={info or 'ok'}")
            ctx.close()
        br.close()

if __name__ == "__main__":
    main()
