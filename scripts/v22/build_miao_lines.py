"""Sinh src/data/miaoLines.ts từ spec/miao_lines_user.md (câu của chủ, giữ nguyên văn). Nhóm 2 (chủ chưa gửi) viết ở G2 dưới đây."""
import json, re, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
G2 = """Lại sai rồi, nghĩ kỹ chút đi!
Có chắc là đã đọc đề không đấy?
Hai lần rồi đấy, tập trung giùm tôi cái.
Sai tiếp à? Tôi bắt đầu nghi ngờ rồi nha.
Đọc chậm lại, đáp án không chạy mất đâu.
Lần trước sai còn tha, lần này thì hơi khó tha.
Ơ kìa, vừa sai xong lại sai tiếp?
Bạn đang làm bài hay đang thử vận may thế?
Nhìn kỹ lại đi, tôi ngồi đây chứng kiến hết đấy.
Sai hai câu liền, Miao bắt đầu lắc đầu rồi.
Bình tĩnh, đừng bấm nhanh hơn não nghĩ.
Câu này hôm qua học rồi mà, quên nhanh thế?
Thêm một lần sai nữa là tôi cằn nhằn thật đấy.
Sen ơi, mở mắt to ra rồi chọn lại.
Không phải đoán, là phải nhớ cơ!
Hai lần trượt rồi, nghiêm túc lên chút nào.
Tôi đang nhịn đấy, đừng để tôi hết nhịn.
Lại nhầm à? Xem lại một lượt đi.
Học thì học cho tử tế, đừng lướt qua.
Sai đến lần hai rồi, câu sau phải đúng đấy nhé!"""
md = (ROOT / "spec/miao_lines_user.md").read_text(encoding="utf8")
EXPR = {"sai_lien_tuc": "cuoi_khinh_bi", "sai_lan_2": "kho_chiu", "can_pin": "nghi_ngo", "xin_nghi": "nghi_ngo",
        "sai_lan_dau": "quan_tam", "dung_nhieu": "dac_y", "dung_vai_lan": "vui"}
groups = {}
for block in re.split(r"^## ", md, flags=re.M)[1:]:
    head, *body = block.split("\n")
    g = re.match(r"G\d+\s+(\w+)", head).group(1)
    lines = [l.strip() for l in body if l.strip() and not l.startswith(("#", "Điều kiện", "Tính cách", "("))]
    if g == "can_pin": lines = [l.replace("Hôm nay lần thứ ba", "Tuần này lần thứ ba") for l in lines]  # theo ghi chú của chủ: luật Cạn pin tính theo tuần
    groups[g] = lines
groups["sai_lan_2"] = G2.split("\n")
rows = []
for g, lines in groups.items():
    if g not in EXPR: continue
    for i, t in enumerate(lines): rows.append({"id": f"{g}_{i + 1:02d}", "group": g, "text": t, "expr": EXPR[g]})
cnt = {g: sum(r["group"] == g for r in rows) for g in EXPR}
print(cnt)
out = "// Sinh bởi scripts/v22/build_miao_lines.py từ spec/miao_lines_user.md — lời thoại của chủ, giữ nguyên văn (nhóm sai_lan_2 do Miaozi viết).\n"
out += 'export type MiaoExpr = "vui" | "dac_y" | "ngai_ngu" | "kho_chiu" | "cuoi_khinh_bi" | "quan_tam" | "nghi_ngo" | "cau";\n'
out += "export type MiaoLine = { id: string; group: string; text: string; expr: MiaoExpr };\n"
out += "export const MIAO_LINES: MiaoLine[] = " + json.dumps(rows, ensure_ascii=False, indent=0).replace("\n", "") + ";\n"
(ROOT / "src/data/miaoLines.ts").write_text(out, encoding="utf8")
