import re, json
lines = open("nhai_map.md").read().split("\n")
lessons = {}; titles = {}
cur = None
# titles & counts from table
for l in lines:
    m = re.match(r"\| (\d+) \| (.+?) \| (\d+) từ vựng \| (https://\S+) \|", l)
    if m: titles[int(m.group(1))] = (m.group(2), int(m.group(3)))
for i, l in enumerate(lines):
    m = re.match(r"### Lesson (\d+) (?:—|details)", l)
    if m:
        cur = int(m.group(1)); lessons.setdefault(cur, []); continue
    if l.startswith("## ") or l.startswith("### Characters"): cur = None if not l.startswith("### Lesson") else cur
    if cur is None: continue
    m = re.match(r"\s*(?:-|\d+\.)\s+(\S+) — (.+?) — (.+)$", l)
    if m and re.search(r"[\u4e00-\u9fff]", m.group(1)):
        lessons[cur].append({"hanzi": m.group(1), "pinyin": m.group(2).strip(), "vi": m.group(3).strip()})
for n in sorted(lessons): print(n, titles.get(n), len(lessons[n]))
grammar = {}
gl = None
for l in lines:
    m = re.match(r"- Grammar lesson (\d+) / “(.+?)” — lesson URL (https://nhaihsk.com/grammar/hsk1/lesson-(\d+))", l)
    if m: gl = int(m.group(4)); grammar[gl] = {"title": m.group(2), "url": m.group(3), "patterns": []}; continue
    m = re.match(r"\s+- `(.+?)` — (.*?)Explanation: (.+?) (?:Pattern )?URL: (https://\S+)", l)
    if m and gl:
        grammar[gl]["patterns"].append({"name": m.group(1), "explain": m.group(3).strip(), "url": m.group(4)})
for k in sorted(grammar): print("G", k, len(grammar[k]["patterns"]))
print(sum(len(g["patterns"]) for g in grammar.values()))
json.dump({"titles": titles, "vocab": lessons, "grammar": grammar}, open("/tmp/nhai_parsed.json", "w"), ensure_ascii=False, indent=1)
