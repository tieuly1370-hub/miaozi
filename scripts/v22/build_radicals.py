"""Miaozi 2.2 — sinh src/data/radicals.ts (≈50 bộ hay gặp) + src/data/hanziParts.ts (âm Hán Việt + nghĩa của mảnh).
Nguồn: Make Me a Hanzi (github.com/skishore/makemeahanzi, dictionary.txt, LGPL / Arphic Public License) — trường `radical`.
Chạy: python3 scripts/v22/build_radicals.py   (cần scripts/v22/mmah_dictionary.txt; tải bằng curl nếu thiếu)"""
import json, re, collections, pathlib, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[2]
DICT = ROOT / "scripts/v22/mmah_dictionary.txt"
if not DICT.exists():
    urllib.request.urlretrieve("https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt", DICT)
src = (ROOT / "src/data/hanziInfo.ts").read_text()
INFO = json.loads(re.search(r"HANZI_INFO: Record<string, HanziInfo> = (\{.*?\});\n", src).group(1))
PART_VI = json.loads(re.search(r"PART_VI: Record<string, string> = (\{.*?\});\n", src).group(1))
MM = {}
for l in DICT.open(encoding="utf8"):
    j = json.loads(l); MM[j["character"]] = j

# gộp biến thể → khóa chính
VAR = {"亻": "人", "氵": "水", "氺": "水", "讠": "言", "扌": "手", "忄": "心", "钅": "金", "饣": "食", "纟": "糸", "⺮": "竹", "艹": "艸",
       "灬": "火", "礻": "示", "衤": "衣", "刂": "刀", "⺈": "刀", "⺌": "小", "犭": "犬", "辶": "辵", "阝": "阜", "王": "玉", "攵": "攴", "⺼": "月"}
# khóa chính → (mặt hiển thị, biến thể, tên Hán Việt, nghĩa)
RAD = {
 "口": ("口", [], "khẩu", "miệng"), "人": ("亻", ["人"], "nhân", "người"), "言": ("讠", ["言"], "ngôn", "lời nói"),
 "木": ("木", [], "mộc", "cây"), "一": ("一", [], "nhất", "một"), "日": ("日", [], "nhật", "mặt trời, ngày"),
 "女": ("女", [], "nữ", "phụ nữ"), "十": ("十", [], "thập", "mười"), "水": ("氵", ["水"], "thủy", "nước"),
 "玉": ("王", ["玉"], "ngọc", "ngọc"), "宀": ("宀", [], "miên", "mái nhà"), "心": ("心", ["忄"], "tâm", "tim, lòng"),
 "辵": ("辶", [], "sước", "đi"), "月": ("月", ["⺼"], "nguyệt / nhục", "trăng; thịt"), "土": ("土", [], "thổ", "đất"),
 "大": ("大", [], "đại", "lớn"), "子": ("子", [], "tử", "con"), "八": ("八", ["丷"], "bát", "tám"),
 "艸": ("艹", [], "thảo", "cỏ"), "手": ("扌", ["手"], "thủ", "tay"), "巾": ("巾", [], "cân", "khăn"),
 "见": ("见", [], "kiến", "nhìn thấy"), "白": ("白", [], "bạch", "trắng"), "丨": ("丨", [], "cổn", "nét sổ"),
 "囗": ("囗", [], "vi", "vây quanh"), "儿": ("儿", [], "nhân (đi)", "chân"), "二": ("二", [], "nhị", "hai"),
 "雨": ("雨", [], "vũ", "mưa"), "目": ("目", [], "mục", "mắt"), "欠": ("欠", [], "khiếm", "thiếu, ngáp"),
 "阜": ("阝", [], "phụ", "gò đất"), "火": ("火", ["灬"], "hỏa", "lửa"), "刀": ("刂", ["刀"], "đao", "dao"),
 "门": ("门", [], "môn", "cửa"), "走": ("走", [], "tẩu", "chạy"), "糸": ("纟", ["糸"], "mịch", "sợi tơ"),
 "亅": ("亅", [], "quyết", "nét móc"), "彳": ("彳", [], "xích", "bước"), "夕": ("夕", [], "tịch", "buổi tối"),
 "小": ("小", ["⺌"], "tiểu", "nhỏ"), "食": ("饣", ["食"], "thực", "ăn"), "斤": ("斤", [], "cân", "cái rìu"),
 "广": ("广", [], "nghiễm", "mái hiên"), "金": ("钅", ["金"], "kim", "kim loại"), "犬": ("犭", ["犬"], "khuyển", "chó, thú"),
 "亠": ("亠", [], "đầu", "cái nắp"), "竹": ("⺮", ["竹"], "trúc", "tre"), "冫": ("冫", [], "băng", "nước đá"),
 "贝": ("贝", [], "bối", "vỏ sò, tiền"), "又": ("又", [], "hựu", "tay phải, lại"), "戈": ("戈", [], "qua", "cây giáo"),
 "寸": ("寸", [], "thốn", "tấc"), "工": ("工", [], "công", "thợ"), "山": ("山", [], "sơn", "núi"),
}
cnt = collections.Counter(); ex = collections.defaultdict(list)
for ch in INFO:
    r = MM.get(ch, {}).get("radical")
    if not r: continue
    r = VAR.get(r, r); cnt[r] += 1; ex[r].append(ch)
ranked = [r for r, n in cnt.most_common() if r in RAD]
top = [r for r in ranked if cnt[r] >= 2][:50]
for extra in ["又", "戈", "寸", "工", "山"]:
    if len(top) >= 50: break
    if extra not in top: top.append(extra)
rows = []
for r in top:
    face, var, hv, vi = RAD[r]
    rows.append({"k": r, "f": face, "v": var, "hv": hv, "vi": vi, "n": cnt[r], "ex": ex[r]})
out = "// Sinh bởi scripts/v22/build_radicals.py — đếm trường `radical` của Make Me a Hanzi trên 278 chữ HSK1 (đã gộp biến thể).\n"
out += "export type Radical = { k: string; f: string; v: string[]; hv: string; vi: string; n: number; ex: string[] };\n"
out += "export const RADICALS: Radical[] = " + json.dumps(rows, ensure_ascii=False) + ";\n"
(ROOT / "src/data/radicals.ts").write_text(out, encoding="utf8")
print("radicals:", len(rows), "".join(r["f"] for r in rows))

# ---- Mảnh chữ: Hán Việt + nghĩa (cho chip Mẹo nhớ) ----
HV = dict(x.split(":") for x in """亻:nhân 人:nhân 女:nữ 口:khẩu 讠:ngôn 氵:thủy 水:thủy 艹:thảo 木:mộc 日:nhật 月:nguyệt 宀:miên 辶:sước 扌:thủ 手:thủ 忄:tâm 心:tâm
钅:kim 饣:thực 纟:mịch 糸:mịch 土:thổ 犭:khuyển 贝:bối 门:môn 目:mục 子:tử 王:vương 雨:vũ 疒:nạch 灬:hỏa 火:hỏa 礻:thị 阝:phụ 冫:băng 禾:hòa ⺮:trúc
刂:đao 力:lực 走:tẩu 广:nghiễm 囗:vi 攵:phộc 欠:khiếm 彳:xích 隹:chuy 页:hiệt 立:lập 田:điền 大:đại 小:tiểu 十:thập 一:nhất 八:bát 又:hựu 寸:thốn
夕:tịch 见:kiến 马:mã 也:dã 己:kỷ 巾:cân 户:hộ 方:phương 衣:y 虫:trùng 鸟:điểu 矢:thỉ 戈:qua 斤:cân 止:chỉ 车:xa 白:bạch 米:mễ 气:khí 云:vân 穴:huyệt
牛:ngưu 羊:dương 工:công 元:nguyên 可:khả 合:hợp 生:sinh 青:thanh 丿:phiệt 丨:cổn 冖:mịch 厶:khư 亠:đầu 不:bất 丷:bát 𠂇:tả 且:thả 乍:sạ 几:kỷ 儿:nhân
冂:quynh 二:nhị 匕:chủy ⺍:tiểu 彐:kệ 丶:chủ 巴:ba 令:lệnh 夂:truy 交:giao 士:sĩ 买:mãi 占:chiêm 中:trung 覀:á 丁:đinh 尔:nhĩ 干:can 老:lão 帀:táp 豕:thỉ
你:nhĩ 射:xạ 各:các 同:đồng 再:tái 丩:củ 正:chính 殳:thù 天:thiên 亅:quyết 艮:cấn 高:cao 兴:hưng 只:chỉ 勺:chước 玉:ngọc 去:khứ 乂:nghệ 文:văn 那:na
三:tam 氺:thủy 畏:úy 亡:vong 相:tương 尼:ni 父:phụ 未:vị 亥:hợi 年:niên 五:ngũ 六:lục 七:thất 九:cửu 从:tòng 丂:khảo 其:kỳ 自:tự 故:cố 反:phản 面:diện
此:thử 采:thải 下:hạ 电:điện 㐫:hung 舌:thiệt 召:triệu 东:đông 西:tây 乃:nãi 乞:khất 免:miễn 冄:nhiễm 勹:bao 巳:tỵ 非:phi ⺌:tiểu 出:xuất 上:thượng
午:ngọ 刀:đao 果:quả 景:cảnh 彡:sam 完:hoàn 匚:phương 后:hậu 卜:bốc 苗:miêu 卓:trác 票:phiếu 书:thư 刖:ngoạt 至:chí 丙:bính 古:cổ 奇:kỳ 弟:đệ 习:tập
卖:mại 昌:xương 哥:ca 句:cú 化:hóa 戋:tiên 夬:quyết 平:bình 更:canh 商:thương 服:phục 牙:nha 侯:hầu 首:thủ 开:khai 弓:cung 垂:thùy 兑:đoài 了:liễu
旦:đán 来:lai 约:ước 曷:hạt 执:chấp 以:dĩ 是:thị 疋:sơ 先:tiên 与:dữ 者:giả 吾:ngô 爫:trảo 友:hữu 北:bắc 飞:phi 妾:thiếp 主:chủ 孝:hiếu 示:thị 身:thân
夭:yêu 求:cầu 井:tỉnh""".split())
VI = dict(PART_VI); VI.update({"女": "phụ nữ", "王": "ngọc / vua", "子": "con", "亻": "người", "人": "người", "丿": "nét phẩy", "丨": "nét sổ", "冖": "khăn trùm",
  "亠": "cái nắp", "几": "cái ghế", "儿": "chân người", "二": "hai", "冂": "vùng biên", "匕": "cái thìa", "丶": "nét chấm", "士": "kẻ sĩ", "中": "giữa", "尔": "ngươi",
  "豕": "con heo", "各": "mỗi", "天": "trời", "高": "cao", "文": "văn", "三": "ba", "亡": "mất", "父": "cha", "自": "tự mình", "电": "điện", "舌": "lưỡi", "东": "đông",
  "西": "tây", "非": "không phải", "出": "ra", "上": "trên", "下": "dưới", "刀": "dao", "果": "quả", "书": "sách", "古": "cổ", "弟": "em trai", "习": "tập", "平": "bằng",
  "牙": "răng", "首": "đầu", "开": "mở", "弓": "cây cung", "来": "đến", "是": "là", "先": "trước", "友": "bạn", "北": "bắc", "飞": "bay", "主": "chủ", "身": "thân",
  "求": "cầu xin", "井": "giếng", "示": "bày ra", "老": "già", "你": "bạn", "同": "cùng", "再": "lại", "去": "đi", "年": "năm", "面": "mặt", "午": "trưa", "交": "giao"})
parts = {}
for v in INFO.values():
    for p in v["parts"]:
        p = re.sub(r"\s*\(.*$|\s*\.\.\.$|\)$", "", p).strip()
        if not p or not re.match(r"[\u2e80-\u9fff\U00020000-\U0002ffff]", p): continue
        hv = HV.get(p) or INFO.get(p, {}).get("hv", "")
        parts[p] = [hv, VI.get(p, "")]
for r in rows:
    for f in [r["f"], *r["v"]]: parts.setdefault(f, [r["hv"].split(" ")[0], r["vi"]])
out = "// Sinh bởi scripts/v22/build_radicals.py — mảnh chữ: [Hán Việt, nghĩa] cho chip «Mẹo nhớ nhanh».\n"
out += "export const PARTS: Record<string, [string, string]> = " + json.dumps(parts, ensure_ascii=False) + ";\n"
(ROOT / "src/data/hanziParts.ts").write_text(out, encoding="utf8")
print("parts:", len(parts), "no hv:", [p for p, x in parts.items() if not x[0]])

# ---- Tập hợp mảnh chữ (cây phân giải MMAH) + pinyin cho quiz bộ thủ ----
IDC = set("⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻")
def han_chars(s):
    return [c for c in s if ("\u2e80" <= c <= "\u9fff") or ("\U00020000" <= c <= "\U0002ffff")]
def comps_of(ch, seen=None):
    if seen is None: seen = set()
    if ch in seen: return set()
    seen.add(ch)
    out = set()
    d = MM.get(ch, {}).get("decomposition") or ""
    for c in han_chars(d):
        if c in IDC: continue
        out.add(c)
        out |= comps_of(c, seen)
    r = MM.get(ch, {}).get("radical")
    if r: out.add(r)
    return out
comps, pys = {}, {}
for ch in INFO:
    cs = comps_of(ch)
    comps[ch] = "".join(sorted(cs))
    py = (MM.get(ch, {}).get("pinyin") or [""])
    pys[ch] = py[0] if py else ""
out = "// Sinh bởi scripts/v22/build_radicals.py — mảnh chữ (cây phân giải MMAH) + pinyin cho 278 chữ HSK1.\n"
out += "export const HANZI_COMPS: Record<string, string> = " + json.dumps(comps, ensure_ascii=False) + ";\n"
out += "export const HANZI_PY: Record<string, string> = " + json.dumps(pys, ensure_ascii=False) + ";\n"
(ROOT / "src/data/hanziComps.ts").write_text(out, encoding="utf8")
print("comps:", len(comps), "with py:", sum(1 for v in pys.values() if v))
