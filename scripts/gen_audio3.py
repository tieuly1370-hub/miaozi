#!/usr/bin/env python3
"""v1.3: âm cho từ Nhai HSK + câu mới. Cập nhật public/audio/index.json, bỏ âm từ cũ (l..-..)."""
import asyncio, json, os
from pathlib import Path
import edge_tts
ROOT = Path("/workspace/hsk"); OUT = ROOT/"public/audio"
VOICE = "zh-CN-XiaoxiaoNeural"
idx = json.loads((OUT/"index.json").read_text())
jobs = []
for t in json.loads((ROOT/"scripts/tts-nhai.json").read_text()):
    i = t["id"]
    if t["kind"] == "word":
        n, s = f"w3-{i}.mp3", f"w3-{i}-slow.mp3"
        jobs += [(t["text"], "-10%", n), (t["text"], "-35%", s)]
        idx[i] = {"n": n, "s": s, **({"c": t["carrier"]} if t.get("carrier") else {})}
    else:
        n, s = f"s3-{i}.mp3", f"s3-{i}-slow.mp3"
        jobs += [(t["text"], "+0%", n), (t["text"], "-30%", s)]
        idx[i] = {"n": n, "s": s}
for k in [k for k in idx if k[:1] == "l" and k[1:3].isdigit() and "-" in k]:
    del idx[k]
async def one(sem, text, rate, name, st):
    dest = OUT/name
    if dest.exists() and dest.stat().st_size > 200: st["skip"] += 1; return
    async with sem:
        for a in range(5):
            try:
                await edge_tts.Communicate(text, VOICE, rate=rate).save(str(dest))
                if dest.stat().st_size > 200: st["ok"] += 1; return
            except Exception as e:
                st["err"] = str(e); await asyncio.sleep(1 + a)
        st["fail"] += 1
async def main():
    sem = asyncio.Semaphore(8); st = {"ok": 0, "skip": 0, "fail": 0, "err": ""}
    await asyncio.gather(*[one(sem, *j, st) for j in jobs])
    print(len(jobs), st)
    (OUT/"index.json").write_text(json.dumps(idx, ensure_ascii=False))
    used = set(f for v in idx.values() for k2, f in v.items() if k2 in ("n", "s"))
    removed = 0
    for f in os.listdir(OUT):
        if f.endswith(".mp3") and f not in used: os.remove(OUT/f); removed += 1
    print("removed unused mp3:", removed, "index entries:", len(idx))
asyncio.run(main())
