"""Miaozi 2.2 — sinh mẹo nhớ theo khuôn từ Make Me a Hanzi (`decomposition`) + Hán Việt / nghĩa mảnh (src/data/hanziParts.ts).
Dùng cho HSK2–4 về sau (HSK1 giữ mẹo đã soạn trong hanziInfo.ts). Không gọi AI.
Vào: tệp TSV  chữ<TAB>hán việt<TAB>nghĩa tiếng Việt   (mỗi dòng một chữ; thiếu cột thì để trống)
Ra : JSON {chữ: {hv, vi, parts:[[mảnh, hv, nghĩa]], text, hint_en}}
Chạy: python3 scripts/v22/build_mnemonics.py chars.tsv > out.json
      python3 scripts/v22/build_mnemonics.py --demo   (chạy thử trên 278 chữ HSK1 → scripts/v22/out/hsk1_template.json)
Mẫu câu: «Chữ 休 (hưu) – nghỉ ngơi: người 亻 đứng cạnh cây 木.»"""
import json, re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
MM = {}
for l in (ROOT / "scripts/v22/mmah_dictionary.txt").open(encoding="utf8"):
    j = json.loads(l); MM[j["character"]] = j
PARTS = json.loads(re.search(r"= (\{.*\});", (ROOT / "src/data/hanziParts.ts").read_text()).group(1))
LINK = {"⿰": "{a} đứng cạnh {b}", "⿱": "{a} ở trên, {b} ở dưới", "⿲": "{a}, {b} và {c} xếp hàng ngang", "⿳": "{a}, {b}, {c} chồng lên nhau",
        "⿴": "{a} bao quanh {b}", "⿵": "{a} trùm lên {b}", "⿶": "{a} đỡ lấy {b}", "⿷": "{a} ôm lấy {b}", "⿸": "{a} che phía trên {b}",
        "⿹": "{a} ôm góc {b}", "⿺": "{b} ngồi trên {a}", "⿻": "{a} đan vào {b}"}
def split(ids):
    """Tách IDS cấp 1: trả về (toán tử, [mảnh])."""
    if not ids or ids[0] not in LINK: return None, []
    op, rest, kids, i = ids[0], ids[1:], [], 0
    def take(j):
        if rest[j] in LINK:
            n = 3 if rest[j] in "⿲⿳" else 2; k = j + 1
            for _ in range(n): k = take(k)
            return k
        return j + 1
    n = 3 if op in "⿲⿳" else 2
    for _ in range(n):
        if i >= len(rest): break
        j = take(i); kids.append(rest[i:j]); i = j
    return op, kids
def label(p):
    hv, vi = PARTS.get(p, ["", ""])
    return f"{vi or hv or 'mảnh'} {p}" if len(p) == 1 else "một mảnh"
def make(ch, hv="", vi=""):
    m = MM.get(ch, {})
    op, kids = split(m.get("decomposition", ""))
    flat = []
    for k in kids:  # mảnh ghép lồng → bung thêm một cấp
        if len(k) == 1: flat.append(k)
        else: flat += [x for x in split(k)[1] if len(x) == 1]
    flat = [k for k in flat if k != "？"]
    if len(flat) > len(kids): op = "+"
    kids = flat
    head = f"Chữ {ch}" + (f" ({hv})" if hv else "") + (f" – {vi}" if vi else "")
    if not op or len(kids) < 2:
        text = head + ": " + (f"tự là một hình — nhớ cả khối." if not kids else f"gồm {label(kids[0])}.")
    else:
        L = [label(k) for k in kids] + ["", ""]
        body = " + ".join(L[:len(kids)]) if op == "+" else LINK[op].format(a=L[0], b=L[1], c=L[2])
        text = f"{head}: {body}" + (f" → {vi}." if vi else ".")
    return {"hv": hv, "vi": vi, "parts": [[k, *PARTS.get(k, ["", ""])] for k in kids], "text": text, "hint_en": (m.get("etymology") or {}).get("hint", "")}
if __name__ == "__main__":
    if sys.argv[1:] == ["--demo"]:
        info = json.loads(re.search(r"HANZI_INFO: Record<string, HanziInfo> = (\{.*?\});\n", (ROOT / "src/data/hanziInfo.ts").read_text()).group(1))
        out = {c: make(c, v["hv"]) for c, v in info.items()}
        (ROOT / "scripts/v22/out").mkdir(exist_ok=True)
        (ROOT / "scripts/v22/out/hsk1_template.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf8")
        for c in "休好明想谢": print(out[c]["text"])
    else:
        rows = [l.rstrip("\n").split("\t") + ["", ""] for l in open(sys.argv[1], encoding="utf8") if l.strip()]
        print(json.dumps({r[0]: make(r[0], r[1], r[2]) for r in rows}, ensure_ascii=False, indent=1))
