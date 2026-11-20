#!/usr/bin/env python3
"""Tạo lại âm chữ 哪 (Xiaoxiao đọc trơn thành nái).
edge-tts bọc SSML và escape XML nên không gửi <phoneme> trực tiếp được.
Cách làm: đọc cụm “哪国” (ngữ cảnh bắt buộc nǎ), cắt đúng âm tiết 哪 theo WordBoundary.
"""
import asyncio, subprocess, tempfile
from pathlib import Path
import edge_tts

ROOT = Path("/workspace/hsk")
OUT = ROOT / "public/audio"
VOICE = "zh-CN-XiaoxiaoNeural"
# Azure WordBoundary offset/duration: 100-nanosecond ticks (10_000_000 = 1 giây)
TICK = 10_000_000

async def speak(text: str, rate: str):
    comm = edge_tts.Communicate(text, VOICE, rate=rate, boundary="WordBoundary")
    audio = b""
    bounds = []
    async for ev in comm.stream():
        if ev["type"] == "audio":
            audio += ev["data"]
        elif ev["type"] == "WordBoundary":
            bounds.append(ev)
    return audio, bounds

def crop_na(mp3: bytes, bounds, dest: Path):
    na = next((b for b in bounds if b["text"] == "哪"), None)
    if not na:
        raise SystemExit("no 哪 boundary: " + str(bounds))
    start = max(0, na["offset"] / TICK - 0.04)
    end = na["offset"] / TICK + na["duration"] / TICK + 0.10
    # thêm một chút đuôi im lặng cho giống các từ 1 chữ khác (~1s)
    pad = 0.35
    with tempfile.TemporaryDirectory() as td:
        src = Path(td) / "in.mp3"
        wav = Path(td) / "cut.wav"
        src.write_bytes(mp3)
        # cắt + pad silence, xuất mp3 48k (giống file cũ)
        subprocess.check_call([
            "ffmpeg", "-y", "-i", str(src),
            "-af", f"atrim=start={start:.3f}:end={end:.3f},asetpts=N/SR/TB,apad=pad_dur={pad}",
            "-t", f"{end - start + pad:.3f}",
            "-ac", "1", "-ar", "24000",
            str(wav),
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.check_call([
            "ffmpeg", "-y", "-i", str(wav), "-codec:a", "libmp3lame", "-b:a", "48k", str(dest),
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

async def main():
    jobs = [("w3-n03-09.mp3", "-10%"), ("w3-n03-09-slow.mp3", "-35%")]
    for name, rate in jobs:
        audio, bounds = await speak("哪国", rate)
        dest = OUT / name
        crop_na(audio, bounds, dest)
        dur = subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(dest)],
            text=True,
        ).strip()
        print(name, dest.stat().st_size, "bytes", dur, "s", "bounds", [(b["text"], round(b["offset"]/TICK,3), round(b["duration"]/TICK,3)) for b in bounds])

asyncio.run(main())
