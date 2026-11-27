#!/usr/bin/env python3
"""BƯỚC BẮT BUỘC khi nạp audio cấp HSK mới: nghe lại từng clip bằng Whisper (faster-whisper, chạy trên máy, miễn phí)
rồi so pinyin với dữ liệu. Chạy: /workspace/venv-audit/bin/python scripts/audit_audio.py <prefix-id ...> [--model small]
VD: audit_audio.py n2 n30 s2 s30  (khớp tiền tố id: n20-…n34 = từ HSK 2, s20-…s34 = câu HSK 2) — hoặc --ids n02-12,n03-09
Ra: scripts/audit/<ngày>-report.json + in danh sách clip bị gắn cờ. Clip bị cờ: nghe lại bằng tai, sửa bằng TTS_TEXT
(src/ttsPron.ts) rồi tạo lại bằng gen_audio_*.py --force <id>. Giới hạn: Whisper trả về chữ Hán, nên chỉ bắt được lỗi
khi máy đọc ra âm khác (sai âm / sai thanh làm Whisper chọn chữ khác); thanh nhẹ (5) và biến điệu 一/不 không so."""
import json, re, sys, pathlib, datetime, subprocess
import numpy as np
from faster_whisper import WhisperModel
from pypinyin import lazy_pinyin, Style
ROOT = pathlib.Path(__file__).resolve().parents[1]; AUD = ROOT / "public/audio"
args = sys.argv[1:]
model_name = args[args.index("--model") + 1] if "--model" in args else "small"
ids = set(args[args.index("--ids") + 1].split(",")) if "--ids" in args else set()
prefixes = [a for a in args if not a.startswith("--") and a not in (model_name,) and "," not in a]
data = {}
for f in ["src/data/curriculum.ts", "src/data/hsk2.ts"]:
    t = (ROOT / f).read_text()
    for m in re.finditer(r'"id": "([a-z]\d\d-\d\d)",\s*"lesson": \d+,\s*"hanzi": "([^"]+)",\s*"pinyin": "[^"]*",\s*"pinyinNum": "([^"]*)"', t):
        data[m.group(1)] = (m.group(2), m.group(3))
idx = json.loads((AUD / "index.json").read_text())
todo = [i for i in data if i in idx and (i in ids or any(i.startswith(p) for p in prefixes))]
model = WhisperModel(model_name, device="cpu", compute_type="int8")
han = lambda s: "".join(c for c in s if "\u3400" <= c <= "\u9fff")
DIG = dict(zip("0123456789", "零一二三四五六七八九"))
def py(s):  # chữ → ['hen3', ...]
    s = "".join(DIG.get(c, c) for c in s).replace("这儿", "这")
    return [p if p[-1].isdigit() else p + "5" for p in lazy_pinyin(han(s), style=Style.TONE3, neutral_tone_with_five=True)]
SKIPC = set("一不")
def compare(exp_hz, exp_num, heard):
    e = [x.replace("ü", "v") for x in exp_num.split() if x != "r5"]; h = py(heard.replace("儿", "") if "r5" in exp_num.split() else heard)
    if len(h) != len(e): return "len", e, h
    for k, (a, b) in enumerate(zip(e, h)):
        if a[:-1] != b[:-1]: return "sound", e, h
        hz = han(exp_hz)
        if a[-1] != b[-1] and "5" not in (a[-1], b[-1]) and not (k < len(hz) and hz[k] in SKIPC): return "tone", e, h
    return "", e, h
def load(f):  # giải mã bằng ffmpeg → float32 16 kHz (bản av đi kèm faster-whisper lỗi với file này)
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", str(AUD / f), "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0
def hear(m, f, prompt=False):  # câu mồi làm Whisper bịa / cắt câu (2026-11-27) → mặc định tắt
    segs, _ = m.transcribe(load(f), language="zh", beam_size=5, vad_filter=False, initial_prompt="以下是普通话的句子。" if prompt else None)
    return "".join(x.text for x in segs).strip()
rep = []
for i in sorted(todo):
    hz, num = data[i]
    heard = hear(model, idx[i]["n"])
    flag, e, h = compare(hz, num, heard)
    rep.append({"id": i, "hanzi": hz, "pinyin": num, "heard": heard, "heardPy": " ".join(h), "flag": flag})
# Vòng 2 (clip 1 âm tiết bị cờ — Whisper hay nghe nhầm âm tiết đứng riêng): model lớn hơn, nghe cả bản thường lẫn bản chậm,
# không dùng câu mồi. Một trong hai khớp → bỏ cờ ("cleared"); cả hai sai → "confirmed" (phải nghe bằng tai / sửa).
second = [r for r in rep if r["flag"] and len(r["pinyin"].split()) == 1]
if second and "--no-confirm" not in args:
    big = WhisperModel(args[args.index("--model2") + 1] if "--model2" in args else "medium", device="cpu", compute_type="int8")
    for r in second:
        hz, num = data[r["id"]]
        res = [compare(hz, num, hear(big, idx[r["id"]][k], prompt=False)) for k in ("n", "s")]
        r["pass2"] = [" ".join(x[2]) for x in res]
        r["flag"] = "" if any(not x[0] for x in res) else "confirmed-" + r["flag"]
for r in rep:
    if r["flag"]: print("FLAG", r["flag"], r["id"], r["hanzi"], r["pinyin"], "| heard:", r["heard"], r["heardPy"], r.get("pass2", ""), flush=True)
out = ROOT / "scripts/audit" / f"{datetime.date.today()}-report.json"; out.parent.mkdir(exist_ok=True)
old = json.loads(out.read_text()) if out.exists() else []
keep = {r["id"]: r for r in old}; keep.update({r["id"]: r for r in rep})
out.write_text(json.dumps(list(keep.values()), ensure_ascii=False, indent=1))
print(f"audited {len(rep)} clips, flagged {sum(1 for r in rep if r['flag'])} → {out}")
