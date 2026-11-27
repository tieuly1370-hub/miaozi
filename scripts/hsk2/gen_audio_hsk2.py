#!/usr/bin/env python3
"""HSK 2 audio: edge-tts zh-CN-XiaoxiaoNeural (giống HSK 1). Từ: w4-<id>.mp3 (-10%) + w4-<id>-slow.mp3 (-35%);
câu: s4-<id>.mp3 (+0%) + -slow (-30%). Ghi public/audio/index.json. TTS_TEXT: chữ đa âm → đọc bằng chữ đồng âm
không đa âm (cùng pinyin, cùng thanh) để engine đọc đúng; ghi rõ trong src/ttsPron.ts (TTS_TEXT).
Chạy: /workspace/venv-audit/bin/python scripts/hsk2/gen_audio_hsk2.py [--force id,id]"""
import asyncio, json, re, sys, pathlib
import edge_tts
ROOT = pathlib.Path(__file__).resolve().parents[2]; OUT = ROOT / "public/audio"
VOICE = "zh-CN-XiaoxiaoNeural"
src = (ROOT / "src/data/hsk2.ts").read_text()
L = json.loads(re.search(r"HSK2_LESSONS: Lesson\[\] = (\[.*\]);", src, re.S).group(1))
pron = (ROOT / "src/ttsPron.ts").read_text()
m = re.search(r"TTS_TEXT: Record<string, string> = (\{.*?\});", pron, re.S)
TTS_TEXT = json.loads(m.group(1)) if m else {}
mc = re.search(r"TTS_CUT: Record<string, \[string, string\]> = (\{.*?\});", pron, re.S)
TTS_CUT = json.loads(mc.group(1)) if mc else {}
import subprocess, tempfile
force = set(sys.argv[sys.argv.index("--force") + 1].split(",")) if "--force" in sys.argv else set()
idx = json.loads((OUT / "index.json").read_text())
jobs = []
def add(i, text, kind):
    t = TTS_TEXT.get(i, text)
    if kind == "w": n, s, rn, rs = f"w4-{i}.mp3", f"w4-{i}-slow.mp3", "-10%", "-35%"
    else: n, s, rn, rs = f"s4-{i}.mp3", f"s4-{i}-slow.mp3", "+0%", "-30%"
    jobs.extend([(t, rn, n, i in force), (t, rs, s, i in force)]); idx[i] = {"n": n, "s": s}
# --hsk1 n02-12,…: tạo lại clip HSK 1 (giữ tên file cũ trong index.json) theo TTS_TEXT
hsk1 = sys.argv[sys.argv.index("--hsk1") + 1].split(",") if "--hsk1" in sys.argv else []
if hsk1:
    jobs.clear()
    for i in hsk1:
        jobs.extend([(TTS_TEXT[i], "-10%", idx[i]["n"], True), (TTS_TEXT[i], "-35%", idx[i]["s"], True)])
else:
    for l in L:
        for w in l["words"]: add(w["id"], w["hanzi"], "w")
        for s in l["sentences"]: add(s["id"], s["hanzi"], "s")
CUT_FILES = {}
for i, (ctx, ch) in TTS_CUT.items():
    if i in idx and not hsk1: CUT_FILES[idx[i]["n"]] = (ctx, ch); CUT_FILES[idx[i]["s"]] = (ctx, ch)
async def cut(text, ch, rate, dest):
    c = edge_tts.Communicate(text, VOICE, rate=rate, boundary="WordBoundary"); audio = b""; bs = []
    async for ev in c.stream():
        if ev["type"] == "audio": audio += ev["data"]
        elif ev["type"] == "WordBoundary": bs.append(ev)
    b = next(x for x in bs if x["text"] == ch)
    st, du = b["offset"] / 1e7, b["duration"] / 1e7
    with tempfile.NamedTemporaryFile(suffix=".mp3") as f:
        f.write(audio); f.flush()
        subprocess.run(["ffmpeg", "-v", "quiet", "-y", "-ss", f"{max(0, st - 0.03):.3f}", "-i", f.name, "-t", f"{du + 0.12:.3f}",
                        "-af", "afade=t=out:st=%.3f:d=0.06" % (du + 0.06), "-c:a", "libmp3lame", "-q:a", "4", str(dest)], check=True)
async def one(sem, text, rate, name, f, st):
    dest = OUT / name
    if not f and dest.exists() and dest.stat().st_size > 200: st["skip"] += 1; return
    async with sem:
        if name in CUT_FILES:
            await cut(CUT_FILES[name][0], CUT_FILES[name][1], rate, dest); st["ok"] += 1; return
        for a in range(5):
            try:
                await edge_tts.Communicate(text, VOICE, rate=rate).save(str(dest))
                if dest.stat().st_size > 200: st["ok"] += 1; return
            except Exception as e: st["err"] = str(e); await asyncio.sleep(1 + a)
        st["fail"] += 1
async def main():
    sem = asyncio.Semaphore(8); st = {"ok": 0, "skip": 0, "fail": 0, "err": ""}
    await asyncio.gather(*[one(sem, *j, st) for j in jobs])
    (OUT / "index.json").write_text(json.dumps(idx, ensure_ascii=False))
    print(len(jobs), st)
asyncio.run(main())
