#!/usr/bin/env python3
import asyncio, json, os, sys
from pathlib import Path

# edge_tts
import edge_tts

ROOT = Path("/workspace/hsk")
OUT = ROOT / "public" / "audio"
OUT.mkdir(parents=True, exist_ok=True)
MAN = json.loads((ROOT / "scripts/tts-manifest.json").read_text())
VOICE = "zh-CN-XiaoxiaoNeural"
CONCUR = 6

def path_for(item, slow=False):
    sub = {"word": "w", "sent": "s", "tone": "t", "drill": "d", "init": "i", "final": "f"}.get(item["kind"], "x")
    # safe id
    sid = "".join(c if c.isalnum() or c in "-_" else "_" for c in item["id"])
    name = f"{sub}-{sid}" + ("-slow" if slow else "") + ".mp3"
    return OUT / name

async def one(sem, item, slow, results):
    dest = path_for(item, slow)
    if dest.exists() and dest.stat().st_size > 200:
        results["skip"] += 1
        return
    text = item["text"]
    if not text.strip():
        results["fail"] += 1
        return
    rate = "-25%" if slow else "+0%"
    tmp = dest.with_suffix(".tmp.mp3")
    async with sem:
        for attempt in range(3):
            try:
                comm = edge_tts.Communicate(text, VOICE, rate=rate)
                await comm.save(str(tmp))
                if tmp.exists() and tmp.stat().st_size > 200:
                    tmp.replace(dest)
                    results["ok"] += 1
                    return
            except Exception as e:
                results["err"] = str(e)
                await asyncio.sleep(0.8 * (attempt + 1))
        results["fail"] += 1
        if tmp.exists():
            tmp.unlink()

async def main():
    jobs = []
    for item in MAN:
        jobs.append((item, False))
        if item["kind"] in ("word", "sent"):
            jobs.append((item, True))
    results = {"ok": 0, "skip": 0, "fail": 0, "err": ""}
    sem = asyncio.Semaphore(CONCUR)
    print(f"jobs {len(jobs)}", flush=True)
    # run in batches to print progress
    batch = 40
    for i in range(0, len(jobs), batch):
        chunk = jobs[i:i+batch]
        await asyncio.gather(*[one(sem, it, sl, results) for it, sl in chunk])
        print(f"progress {min(i+batch,len(jobs))}/{len(jobs)} ok={results['ok']} skip={results['skip']} fail={results['fail']} {results['err']}", flush=True)
    print("DONE", results, flush=True)
    # index map id -> files
    index = {}
    for item in MAN:
        rec = {"n": path_for(item, False).name}
        if item["kind"] in ("word", "sent"):
            rec["s"] = path_for(item, True).name
        index[item["id"]] = rec
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False), encoding="utf-8")
    print("index", len(index), "files", len(list(OUT.glob('*.mp3'))))

if __name__ == "__main__":
    asyncio.run(main())
