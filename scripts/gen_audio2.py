#!/usr/bin/env python3
"""v1.1: sửa âm đơn chữ (đa âm / thanh nhẹ) + âm cho Giáo trình. Cập nhật public/audio/index.json."""
import asyncio, json
from pathlib import Path
import edge_tts
ROOT = Path("/workspace/hsk"); OUT = ROOT/"public/audio"
VOICE = "zh-CN-XiaoxiaoNeural"
idx = json.loads((OUT/"index.json").read_text())
# id -> (text to speak, carrier label shown in UI or None)
FIX = {
 "l04-03": ("我的", "我的"), "l05-07": ("好了", "好了"), "l03-07": ("好吗", "好吗"), "l04-07": ("你呢", "你呢"),
 "l13-10": ("好吧", "好吧"), "l14-13": ("好啊", "好啊"), "l04-05": ("哪国", "哪国"),
 "l05-05": ("挤", None), "l14-16": ("兜", None), "l10-04": ("盒", None), "l08-15": ("纳", None),
 "l13-01": ("位", None), "l06-01": ("惠", None), "l11-03": ("芬", None),
 "drill-cha-chǎ": ("镲", None), "drill-cha-chà": ("岔", None),
}
man = json.loads((ROOT/"scripts/tts-manifest.json").read_text())
words = {m["id"]: m for m in man if m["kind"] == "word"}
jobs = []
def sid(x): return "".join(c if c.isalnum() or c in "-_" else "_" for c in x)
for wid, m in words.items():
    if len(m["text"]) == 1 or wid in FIX:
        text, carrier = FIX.get(wid, (m["text"], None))
        n = f"w-{sid(wid)}.v2.mp3"; s = f"w-{sid(wid)}-slow.v2.mp3"
        jobs += [(text, "-10%", n), (text, "-35%", s)]
        idx[wid] = {"n": n, "s": s, **({"c": carrier} if carrier else {})}
for did in ("drill-cha-chǎ", "drill-cha-chà"):
    text, _ = FIX[did]; n = f"d-{sid(did)}.v2.mp3"; jobs.append((text, "+0%", n)); idx[did] = {"n": n}
for t in json.loads((ROOT/"scripts/tts-textbook.json").read_text()):
    n = f"g-{t['id']}.mp3"; s = f"g-{t['id']}-slow.mp3"
    jobs += [(t["text"], "+0%", n), (t["text"], "-30%", s)]
    idx[t["id"]] = {"n": n, "s": s}
async def one(sem, text, rate, name, st):
    dest = OUT/name
    if dest.exists() and dest.stat().st_size > 200: st["skip"] += 1; return
    async with sem:
        for a in range(4):
            try:
                await edge_tts.Communicate(text, VOICE, rate=rate).save(str(dest))
                if dest.stat().st_size > 200: st["ok"] += 1; return
            except Exception as e:
                st["err"] = str(e); await asyncio.sleep(1 + a)
        st["fail"] += 1
async def main():
    sem = asyncio.Semaphore(6); st = {"ok": 0, "skip": 0, "fail": 0, "err": ""}
    await asyncio.gather(*[one(sem, *j, st) for j in jobs])
    print(len(jobs), st)
    (OUT/"index.json").write_text(json.dumps(idx, ensure_ascii=False))
asyncio.run(main())
