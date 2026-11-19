import json, re
src = open("src/data/curriculum.ts").read()
L = json.loads(src[src.index("export const LESSONS: Lesson[] = ") + 33: src.index("export const ALL_WORDS")].strip().rstrip(";"))
tb = open("src/data/textbook.ts").read()
TB = json.loads(tb[tb.index("export const TEXTBOOK: TbLesson[] = ") + len("export const TEXTBOOK: TbLesson[] = "):].strip().rstrip(";"))
pool = []
for l in L:
    for s in l["sentences"]: pool.append({"id": s["id"], "zh": s["hanzi"], "vi": s["vi"], "py": s["pinyin"], "pn": s["pinyinNum"]})
for t in TB:
    for g in t["grammar"]:
        for e in g["ex"]: pool.append({"id": e["id"], "zh": e["zh"], "vi": e["vi"], "py": e["py"]})
    for d in t["dialogues"]:
        for e in d["lines"]: pool.append({"id": e["id"], "zh": e["zh"], "vi": e["vi"], "py": e["py"]})
P = json.load(open("scripts/nhai_parsed.json"))
han = lambda s: [c for c in s if '\u3400' <= c <= '\u9fff']
cum = set(); assign = {}
seen = set()
for n in range(1, 20):
    chars = set(c for w in P["vocab"][str(n)] for c in han(w["hanzi"]))
    new = chars - cum; cum |= chars
    assign[n] = []
    for s in pool:
        h = "".join(han(s["zh"]))
        if h in seen or len(h) < 2: continue
        if set(h) <= cum and (set(h) & new):
            assign[n].append(s); seen.add(h)
for n in range(1, 20): print(n, len(assign[n]), [s["zh"] for s in assign[n]][:8])
json.dump({str(k): v for k, v in assign.items()}, open("/tmp/assign.json", "w"), ensure_ascii=False)
