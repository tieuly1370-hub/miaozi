#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate src/data/curriculum.ts from textbook word lists + original sentences."""
import json, os, re, unicodedata
from pathlib import Path

ROOT = Path("/workspace/hsk")
RAW = json.loads((ROOT / "scripts/lessons-raw.json").read_text())

# --- pinyin helpers ---
MARKS = {
    "ā": ("a", "1"), "á": ("a", "2"), "ǎ": ("a", "3"), "à": ("a", "4"),
    "ē": ("e", "1"), "é": ("e", "2"), "ě": ("e", "3"), "è": ("e", "4"),
    "ī": ("i", "1"), "í": ("i", "2"), "ǐ": ("i", "3"), "ì": ("i", "4"),
    "ō": ("o", "1"), "ó": ("o", "2"), "ǒ": ("o", "3"), "ò": ("o", "4"),
    "ū": ("u", "1"), "ú": ("u", "2"), "ǔ": ("u", "3"), "ù": ("u", "4"),
    "ǖ": ("ü", "1"), "ǘ": ("ü", "2"), "ǚ": ("ü", "3"), "ǜ": ("ü", "4"),
    "Ā": ("A", "1"), "Á": ("A", "2"), "Ǎ": ("A", "3"), "À": ("A", "4"),
    "Ē": ("E", "1"), "É": ("E", "2"), "Ě": ("E", "3"), "È": ("E", "4"),
    "Ī": ("I", "1"), "Í": ("I", "2"), "Ǐ": ("I", "3"), "Ì": ("I", "4"),
    "Ō": ("O", "1"), "Ó": ("O", "2"), "Ǒ": ("O", "3"), "Ò": ("O", "4"),
    "Ū": ("U", "1"), "Ú": ("U", "2"), "Ǔ": ("U", "3"), "Ù": ("U", "4"),
}

def compact_py(s: str) -> str:
    s = s.strip()
    s = s.replace(" ", "")
    return s

def to_num(s: str) -> str:
    """Toned pinyin (possibly multi-syllable, no spaces or with spaces) -> ni3 hao3"""
    s = s.strip()
    # split by spaces first if present, else by syllables roughly
    parts = s.split()
    out = []
    for part in parts:
        tone = "5"
        letters = []
        for ch in part:
            if ch in MARKS:
                base, t = MARKS[ch]
                letters.append(base)
                tone = t
            else:
                letters.append(ch)
        syl = "".join(letters)
        # if no tone mark, keep 5 (neutral) unless already numbered
        if re.search(r"[1-5]$", syl):
            out.append(syl)
        else:
            out.append(syl + tone)
    return " ".join(out)

# --- Vietnamese glosses (override) ---
VI = {
    "你": "bạn", "好": "tốt, khỏe", "您": "ngài, bạn (lịch sự)", "你们": "các bạn",
    "对不起": "xin lỗi", "没关系": "không sao",
    "谢谢": "cảm ơn", "不": "không", "不客气": "không có gì", "再见": "tạm biệt",
    "叫": "tên là, gọi", "什么": "cái gì", "名字": "tên", "我": "tôi", "是": "là",
    "老师": "giáo viên", "吗": "à? (tiểu từ nghi vấn)", "学生": "học sinh", "人": "người",
    "她": "cô ấy", "谁": "ai", "的": "của (trợ từ)", "汉语": "tiếng Hán",
    "哪": "nào", "国": "nước, quốc gia", "呢": "còn... thì sao?", "他": "anh ấy",
    "同学": "bạn cùng lớp", "朋友": "bạn bè",
    "家": "nhà, gia đình", "有": "có", "口": "người (lượng từ gia đình)",
    "女儿": "con gái", "几": "mấy", "岁": "tuổi", "了": "rồi (trợ từ)",
    "今年": "năm nay", "多": "nhiều; (hỏi) mức độ", "大": "lớn; (tuổi) bao nhiêu",
    "会": "biết (làm được)", "说": "nói", "妈妈": "mẹ", "菜": "món ăn, rau",
    "很": "rất", "好吃": "ngon", "做": "làm, nấu", "写": "viết",
    "汉字": "chữ Hán", "字": "chữ", "怎么": "thế nào", "读": "đọc",
    "请": "mời, xin", "问": "hỏi", "今天": "hôm nay", "号": "ngày (trong tháng)",
    "月": "tháng", "星期": "tuần", "昨天": "hôm qua", "明天": "ngày mai",
    "去": "đi", "学校": "trường học", "看": "xem, nhìn", "书": "sách",
    "想": "muốn, nghĩ", "喝": "uống", "茶": "trà", "吃": "ăn", "米饭": "cơm",
    "下午": "buổi chiều", "商店": "cửa hàng", "买": "mua", "个": "cái (lượng từ)",
    "杯子": "cốc, ly", "这": "này", "多少": "bao nhiêu", "钱": "tiền",
    "块": "tệ (đơn vị tiền)", "那": "kia, đó",
    "小": "nhỏ", "猫": "mèo", "在": "ở, đang", "那儿": "chỗ đó", "狗": "chó",
    "椅子": "ghế", "下面": "phía dưới", "哪儿": "ở đâu", "工作": "công việc; làm việc",
    "儿子": "con trai", "医院": "bệnh viện", "医生": "bác sĩ", "爸爸": "bố",
    "桌子": "bàn", "上": "trên", "电脑": "máy tính", "和": "và",
    "本": "quyển", "里": "trong", "前面": "phía trước", "后面": "phía sau",
    "这儿": "chỗ này", "没有": "không có", "能": "có thể", "坐": "ngồi",
    "现在": "bây giờ", "点": "giờ (o'clock)", "分": "phút", "中午": "buổi trưa",
    "吃饭": "ăn cơm", "时候": "lúc, khi", "回": "về", "我们": "chúng tôi, chúng ta",
    "电影": "phim", "住": "ở (cư trú)", "前": "trước",
    "天气": "thời tiết", "怎么样": "thế nào", "太": "quá", "热": "nóng",
    "冷": "lạnh", "下雨": "mưa", "小姐": "cô", "来": "đến",
    "身体": "sức khỏe, cơ thể", "爱": "yêu, thích", "些": "một vài",
    "水果": "hoa quả", "水": "nước",
    "喂": "alo", "也": "cũng", "学习": "học", "上午": "buổi sáng",
    "睡觉": "ngủ", "电视": "tivi", "喜欢": "thích", "给": "cho",
    "打电话": "gọi điện", "吧": "nhé (tiểu từ)",
    "东西": "đồ, thứ", "一点儿": "một chút", "苹果": "táo", "看见": "nhìn thấy",
    "先生": "ông, ngài", "开": "lái; mở", "车": "xe", "回来": "trở về",
    "分钟": "phút", "后": "sau", "衣服": "quần áo", "漂亮": "đẹp",
    "啊": "a (tiểu từ)", "少": "ít", "这些": "những cái này", "都": "đều, tất cả",
    "认识": "quen, nhận ra", "年": "năm", "大学": "đại học",
    "饭店": "nhà hàng, khách sạn", "出租车": "taxi", "一起": "cùng nhau",
    "高兴": "vui, vui vẻ", "听": "nghe", "飞机": "máy bay",
    # extras
    "中国": "Trung Quốc", "北京": "Bắc Kinh", "火车站": "ga tàu hỏa",
    "日": "ngày; nhật", "下": "dưới, xuống", "说话": "nói chuyện",
    "没": "không (phủ định với 有)", "一": "một", "二": "hai", "三": "ba",
    "四": "bốn", "五": "năm", "六": "sáu", "七": "bảy", "八": "tám",
    "九": "chín", "十": "mười", "零": "không (số 0)", "百": "trăm",
}

POS_VI = {
    "pron.": "đại từ", "adj.": "tính từ", "v.": "động từ", "adv.": "trạng từ",
    "n.": "danh từ", "part.": "trợ từ", "m.": "lượng từ", "conj.": "liên từ",
    "mod.": "động từ năng nguyện", "int.": "thán từ", "prep.": "giới từ",
    "n./v.": "danh/động từ", "num./mw.": "số/lượng từ",
}

# Character decompositions + short Vietnamese mnemonics (original)
DECOMP = {
    "一": (["一"], "Một nét ngang, ấy là số một."),
    "二": (["一", "一"], "Hai nét ngang chồng nhau — số hai."),
    "三": (["一", "一", "一"], "Ba nét ngang — số ba."),
    "四": (["囗", "儿"], "Khung vuông chứa chân người — bốn phía."),
    "五": (["五"], "Nét ngang-sổ gãy, nhớ hình số năm."),
    "六": (["六"], "Nóc nhà với hai chấm — sáu."),
    "七": (["七"], "Nét ngang rồi móc — bảy."),
    "八": (["八"], "Hai nét tách ra hai bên — tám."),
    "九": (["九"], "Nét phẩy rồi móc cong — chín."),
    "十": (["一", "丨"], "Ngang rồi sổ, đủ mười."),
    "零": (["雨", "令"], "Mưa ra lệnh — số không, lẻ."),
    "百": (["一", "白"], "Một và trắng — một trăm."),
    "人": (["人"], "Hai nét như người đang bước."),
    "你": (["亻", "尔"], "Người đứng cạnh, gọi 'bạn ơi'."),
    "您": (["你", "心"], "Chữ 'bạn' thêm trái tim — nói lịch sự."),
    "们": (["亻", "门"], "Người đứng trước cửa — chỉ số nhiều."),
    "好": (["女", "子"], "Có mẹ có con — điều tốt đẹp."),
    "对": (["又", "寸"], "Lại thêm một tấc — đối, đúng."),
    "不": (["不"], "Một nét ngang chặn lại: 'không'."),
    "起": (["走", "己"], "Bản thân đứng dậy mà đi."),
    "没": (["氵", "殳"], "Nước bị đánh tan — không còn gì."),
    "关": (["丷", "天"], "Đóng cổng trời — then chốt, liên quan."),
    "系": (["丿", "糸"], "Sợi chỉ buộc lại thành hệ."),
    "谢": (["讠", "射"], "Lời nói gửi tới — cảm ơn."),
    "客": (["宀", "各"], "Người dưới mái nhà — vị khách."),
    "气": (["气"], "Hơi bay lên — khí, khí chất."),
    "再": (["再"], "Một lần nữa, lặp lại."),
    "见": (["见"], "Người với mắt — nhìn thấy."),
    "叫": (["口", "丩"], "Miệng kêu lên — gọi, tên là."),
    "什": (["亻", "十"], "Người và số mười — 'cái gì?'."),
    "么": (["丿", "厶"], "Âm nhẹ, hay đi cùng 什, 那, 怎."),
    "名": (["夕", "口"], "Đêm gọi tên bằng miệng."),
    "字": (["宀", "子"], "Đứa trẻ dưới mái nhà — chữ viết."),
    "我": (["手", "戈"], "Tay cầm giáo — ấy là 'tôi'."),
    "是": (["日", "正"], "Mặt trời đứng ngay ngắn — 'là'."),
    "老": (["老"], "Người lớn tuổi — thầy, già."),
    "师": (["刂", "帀"], "Người dẫn lối — thầy, sư."),
    "吗": (["口", "马"], "Miệng hỏi, đuôi như 'ngựa' — tiểu từ hỏi."),
    "学": (["⺍", "冖", "子"], "Đứa trẻ dưới mái — đang học."),
    "生": (["生"], "Mầm cây mọc lên — sinh, học trò."),
    "她": (["女", "也"], "Bên nữ — cô ấy."),
    "谁": (["讠", "隹"], "Lời hỏi về một người — ai?"),
    "的": (["白", "勺"], "Muỗng trắng — trợ từ 'của'."),
    "汉": (["氵", "又"], "Nước và 'lại' — dân Hán."),
    "语": (["讠", "吾"], "Lời của 'tôi' — ngôn ngữ."),
    "哪": (["口", "那"], "Miệng hỏi 'cái nào / nước nào'."),
    "国": (["囗", "玉"], "Viên ngọc trong khung — quốc gia."),
    "呢": (["口", "尼"], "Miệng nhỏ ở cuối câu — còn thì sao?"),
    "他": (["亻", "也"], "Bên người — anh ấy."),
    "同": (["同"], "Cùng một cửa — cùng, đồng."),
    "朋": (["月", "月"], "Hai thân người đứng cạnh — bạn."),
    "友": (["𠂇", "又"], "Hai bàn tay nắm nhau — hữu."),
    "中": (["口", "丨"], "Nét sổ xuyên giữa — trung, ở giữa."),
    "京": (["亠", "口", "小"], "Nóc nhà kinh thành — kinh đô."),
    "家": (["宀", "豕"], "Heo dưới mái nhà — gia đình."),
    "有": (["𠂇", "月"], "Tay nắm mặt trăng — có."),
    "口": (["口"], "Cái miệng, cái ô — cũng là lượng từ."),
    "女": (["女"], "Hình người nữ quỳ."),
    "儿": (["儿"], "Hai nét như chân trẻ thơ."),
    "几": (["几"], "Như cái ghế nhỏ — hỏi 'mấy'."),
    "岁": (["止", "夕"], "Năm tháng chồng lên — tuổi."),
    "了": (["了"], "Nét móc hoàn thành — rồi."),
    "今": (["人", "丶"], "Người với nét chấm — hiện nay."),
    "年": (["年"], "Lúa và cán — một vòng năm."),
    "多": (["夕", "夕"], "Hai buổi tối — nhiều."),
    "大": (["大"], "Người dang rộng tay — lớn."),
    "会": (["人", "云"], "Người họp dưới mây — biết, sẽ."),
    "说": (["讠", "兑"], "Lời đổi ra miệng — nói."),
    "妈": (["女", "马"], "Người nữ bên chữ ngựa — mẹ."),
    "菜": (["艹", "采"], "Cỏ được hái về — rau, món ăn."),
    "很": (["彳", "艮"], "Bước rất chắc — rất."),
    "吃": (["口", "乞"], "Miệng xin ăn."),
    "做": (["亻", "故"], "Người làm việc — làm, nấu."),
    "写": (["冖", "与"], "Dưới mái, viết ra."),
    "怎": (["乍", "心"], "Lòng bối rối hỏi 'thế nào?'."),
    "读": (["讠", "卖"], "Lời bán ra thành tiếng — đọc."),
    "请": (["讠", "青"], "Lời lịch sự, màu xanh — mời, xin."),
    "问": (["门", "口"], "Miệng đứng ở cửa — hỏi."),
    "天": (["一", "大"], "Lớn thêm một nét trên đầu — trời."),
    "号": (["口", "丂"], "Miệng hô lên một số — ngày, số."),
    "月": (["月"], "Mặt trăng khuyết — tháng."),
    "星": (["日", "生"], "Sao sinh từ ánh mặt trời."),
    "期": (["其", "月"], "Kỳ hạn theo tháng — tuần, kỳ."),
    "昨": (["日", "乍"], "Ngày vừa xảy ra — hôm qua."),
    "明": (["日", "月"], "Mặt trời và trăng — sáng, ngày mai."),
    "去": (["土", "厶"], "Rời khỏi đất — đi."),
    "校": (["木", "交"], "Cây giao nhau — trường."),
    "看": (["手", "目"], "Tay che mắt để nhìn."),
    "书": (["书"], "Nét như cuốn sách đang mở."),
    "想": (["相", "心"], "Nhìn nhau trong lòng — muốn, nghĩ."),
    "喝": (["口", "曷"], "Miệng khát — uống."),
    "茶": (["艹", "人", "木"], "Cỏ, người, cây — tách trà."),
    "米": (["米"], "Hạt lúa tách ra — gạo."),
    "饭": (["饣", "反"], "Thức ăn quay về mâm — cơm."),
    "下": (["下"], "Ngược với 'trên' — dưới, xuống."),
    "午": (["午"], "Giữa ngày — giờ Ngọ, buổi trưa."),
    "商": (["商"], "Miệng dưới mái — buôn bán."),
    "店": (["广", "占"], "Mái rộng chiếm chỗ — cửa hàng."),
    "买": (["买"], "Chữ đơn giản của 'mua' — nhớ nét móc."),
    "个": (["人", "丨"], "Người thêm một nét sổ — cái, lượng từ."),
    "杯": (["木", "不"], "Gỗ + 'không' — cái cốc."),
    "子": (["子"], "Đứa trẻ bọc tã — con, hậu tố."),
    "这": (["辶", "文"], "Bước tới chữ này — đây."),
    "钱": (["钅", "戋"], "Kim loại nhỏ — tiền."),
    "块": (["土", "夬"], "Miếng đất — khối, tệ."),
    "那": (["阝", "冄"], "Bên kia dãy núi — kia, đó."),
    "小": (["小"], "Ba nét nhỏ họp lại — bé."),
    "猫": (["犭", "苗"], "Thú và mầm cây — mèo."),
    "狗": (["犭", "句"], "Thú kêu một câu — chó."),
    "在": (["𠂇", "土"], "Tay trên đất — đang ở."),
    "椅": (["木", "奇"], "Gỗ kỳ lạ thành ghế."),
    "面": (["面"], "Cái mặt, cái phía."),
    "工": (["工"], "Như xà ngang — công việc."),
    "作": (["亻", "乍"], "Người vừa làm — tác, làm."),
    "医": (["匚", "矢"], "Hộp đựng mũi tên — y, chữa bệnh."),
    "院": (["阝", "完"], "Bên thành, đầy đủ — viện."),
    "爸": (["父", "巴"], "Người cha cầm, gọi bố."),
    "桌": (["木", "卓"], "Gỗ cao — cái bàn."),
    "上": (["上"], "Nét ngắn trên nét ngang — trên."),
    "电": (["电"], "Sét xuyên ruộng — điện."),
    "脑": (["月", "㐫"], "Thịt và hộp sọ — bộ não."),
    "和": (["禾", "口"], "Lúa và miệng — hòa, và."),
    "本": (["木", "一"], "Cây có gốc — quyển, gốc."),
    "里": (["田", "土"], "Ruộng và đất — bên trong."),
    "前": (["䒑", "刖"], "Cỏ trước bước đi — phía trước."),
    "后": (["后"], "Nét như quay đầu lại — phía sau."),
    "能": (["厶", "月", "匕", "匕"], "Con gấu mạnh — có thể."),
    "坐": (["人", "人", "土"], "Hai người ngồi trên đất."),
    "现": (["王", "见"], "Ngọc hiện ra trước mắt — hiện tại."),
    "点": (["占", "灬"], "Chiếm chỗ và lửa — điểm, giờ."),
    "分": (["八", "刀"], "Dao chia làm tám — chia, phút."),
    "时": (["日", "寸"], "Ngày đo bằng tấc — thời, giờ."),
    "候": (["亻", "侯"], "Người đứng chờ — lúc."),
    "回": (["囗", "口"], "Ô trong ô — quay về."),
    "影": (["景", "彡"], "Cảnh với nét bóng — phim, bóng."),
    "住": (["亻", "主"], "Người ở chỗ của chủ — cư trú."),
    "太": (["大", "丶"], "Lớn thêm một chấm — quá."),
    "热": (["执", "灬"], "Cầm lửa trong tay — nóng."),
    "冷": (["冫", "令"], "Băng ra lệnh — lạnh."),
    "雨": (["雨"], "Cửa trời nhỏ hạt mưa."),
    "姐": (["女", "且"], "Người nữ đứng — chị, cô."),
    "来": (["来"], "Lúa mạch đi tới — đến."),
    "身": (["身"], "Thân người nghiêng."),
    "体": (["亻", "本"], "Người là gốc — cơ thể."),
    "爱": (["爫", "冖", "友"], "Bạn bè dưới mái, với bàn tay — yêu."),
    "些": (["此", "二"], "Cái này thêm hai — một vài."),
    "果": (["田", "木"], "Ruộng trên cây — quả."),
    "水": (["水"], "Dòng nước chảy."),
    "喂": (["口", "畏"], "Miệng gọi 'alo'."),
    "也": (["也"], "Nét móc duyên dáng — cũng."),
    "习": (["习"], "Một nửa cánh chim — luyện tập."),
    "睡": (["目", "垂"], "Mắt rũ xuống — ngủ."),
    "觉": (["⺍", "见"], "Thấy trong mộng — giấc, cảm thấy."),
    "喜": (["士", "口", "口"], "Kẻ sĩ mở miệng cười — thích, vui."),
    "欢": (["又", "欠"], "Lại muốn thêm — vui thích."),
    "给": (["纟", "合"], "Sợi chỉ hợp lại — đưa cho."),
    "打": (["扌", "丁"], "Tay đánh một cái."),
    "话": (["讠", "舌"], "Lời và lưỡi — câu nói."),
    "吧": (["口", "巴"], "Miệng kéo dài — nhé."),
    "东": (["东"], "Mặt trời sau cây — phương đông."),
    "西": (["西"], "Một trong bốn phương — tây."),
    "苹": (["艹", "平"], "Cỏ 'bằng' — quả táo (苹果)."),
    "先": (["先"], "Người đi trước — tiên, ông."),
    "开": (["开"], "Hai cánh cửa mở ra."),
    "车": (["车"], "Nhìn từ trên xuống: xe."),
    "钟": (["钅", "中"], "Kim loại ở giữa — đồng hồ, phút."),
    "衣": (["衣"], "Áo có thân và vạt."),
    "服": (["月", "服"], "Thân và phục — trang phục."),
    "漂": (["氵", "票"], "Nước và phiếu trôi — đẹp (漂亮)."),
    "亮": (["亠", "口", "几"], "Nóc nhà sáng rỡ."),
    "啊": (["口", "阿"], "Miệng kêu 'a'."),
    "少": (["小", "丿"], "Nhỏ thêm một phẩy — ít."),
    "认": (["讠", "人"], "Lời về một người — nhận ra."),
    "识": (["讠", "只"], "Lời chỉ ra — hiểu, biết."),
    "飞": (["飞"], "Cánh đang bay."),
    "机": (["木", "几"], "Gỗ và khung máy — cái máy."),
    "出": (["出"], "Hai núi chồng — đi ra."),
    "租": (["禾", "且"], "Lúa đem cho thuê."),
    "兴": (["兴"], "Hai tay nâng — hứng khởi."),
    "听": (["口", "斤"], "Miệng và rìu — lắng nghe."),
    "北": (["北"], "Hai người quay lưng — phương Bắc."),
    "日": (["日"], "Mặt trời vuông, có một nét giữa — ngày."),
    "视": (["礻", "见"], "Thần và thấy — nhìn, thị."),
    "都": (["者", "阝"], "Người bên ấp — đều, đô thị."),
    "高": (["高"], "Nóc nhà cao tầng — cao."),

    "火": (["火"], "Ngọn lửa bốc lên."),
    "站": (["立", "占"], "Đứng chiếm một chỗ — trạm, ga."),
    "儿": (["儿"], "Hai nét chân trẻ thơ. (Âm er.)"),
    "样": (["木", "羊"], "Cây và dê — hình dáng, thế nào."),
}

# Word-level mnemonic (optional override; else join char mnemonics)
WORD_MN = {
    "你好": "Hai chữ bạn gặp nhau: 'bạn tốt' = xin chào.",
    "你们": "Bạn + cửa số nhiều: các bạn.",
    "对不起": "Đối không dậy nổi — xin lỗi nặng lời.",
    "没关系": "Không có then chốt nào cả — không sao.",
    "不客气": "Đừng khách sáo — không có gì.",
    "再见": "Lại gặp — tạm biệt, hẹn gặp lại.",
    "什么": "Cái gì vậy?",
    "名字": "Tên và chữ — họ tên.",
    "老师": "Người già dẫn dắt — thầy, cô.",
    "学生": "Người đang học mà sinh ra tri thức.",
    "汉语": "Lời của người Hán — tiếng Trung.",
    "同学": "Cùng học một thầy — bạn cùng lớp.",
    "朋友": "Hai người đứng cạnh, nắm tay — bạn.",
    "女儿": "Người nữ và trẻ thơ — con gái.",
    "今年": "Nay + năm — năm nay.",
    "好吃": "Tốt để ăn — ngon.",
    "汉字": "Chữ của người Hán.",
    "怎么": "Hỏi cách thức — làm sao, thế nào?",
    "今天": "Nay + trời — hôm nay.",
    "星期": "Sao và kỳ — một tuần.",
    "昨天": "Ngày vừa xảy ra + trời — hôm qua.",
    "明天": "Sáng + trời — ngày mai.",
    "学校": "Nơi học dưới mái gỗ — trường.",
    "米饭": "Gạo thành cơm.",
    "下午": "Buổi dưới giờ Ngọ — chiều.",
    "商店": "Cửa hàng buôn bán.",
    "多少": "Nhiều hay ít — bao nhiêu?",
    "杯子": "Cái cốc.",
    "下面": "Phía dưới cái mặt/phía.",
    "哪儿": "Ở chỗ nào? (âm er).",
    "那儿": "Chỗ kia.",
    "这儿": "Chỗ này.",
    "工作": "Làm công — công việc.",
    "儿子": "Đứa trẻ con trai.",
    "医院": "Viện chữa bệnh.",
    "医生": "Người sinh ra việc chữa bệnh — bác sĩ.",
    "爸爸": "Hai lần gọi bố.",
    "妈妈": "Hai lần gọi mẹ.",
    "桌子": "Cái bàn gỗ.",
    "椅子": "Cái ghế gỗ.",
    "电脑": "Não điện — máy tính.",
    "前面": "Phía trước mặt.",
    "后面": "Phía sau.",
    "没有": "Không có.",
    "现在": "Hiện ra ở đây — bây giờ.",
    "中午": "Giữa ngày — trưa.",
    "吃饭": "Ăn cơm.",
    "时候": "Lúc, khoảng thời gian.",
    "我们": "Tôi ở số nhiều — chúng tôi.",
    "电影": "Bóng điện — phim.",
    "天气": "Khí của trời — thời tiết.",
    "怎么样": "Ra sao, thế nào?",
    "下雨": "Xuống mưa.",
    "小姐": "Cô, tiểu thư.",
    "身体": "Thân thể — sức khỏe.",
    "水果": "Quả của nước/cây — hoa quả.",
    "学习": "Học và luyện.",
    "上午": "Buổi trên giờ Ngọ — sáng.",
    "睡觉": "Vào giấc ngủ.",
    "电视": "Nhìn bằng điện — tivi.",
    "喜欢": "Vui mà thích.",
    "打电话": "Đánh một cuộc điện thoại.",
    "东西": "Đông tây — đồ đạc (đủ thứ).",
    "一点儿": "Một chấm nhỏ — một chút.",
    "苹果": "Quả bình — táo.",
    "看见": "Nhìn mà thấy.",
    "先生": "Người sinh trước — ông, ngài.",
    "回来": "Quay về tới.",
    "分钟": "Phút trên đồng hồ.",
    "衣服": "Áo quần.",
    "漂亮": "Trôi nổi mà sáng — đẹp.",
    "这些": "Những cái này.",
    "认识": "Nhận ra mà biết — quen.",
    "大学": "Học lớn — đại học.",
    "饭店": "Cửa hàng cơm — nhà hàng/khách sạn.",
    "出租车": "Xe cho thuê ra ngoài — taxi.",
    "一起": "Cùng một chỗ đứng dậy — cùng nhau.",
    "高兴": "Cao hứng — vui.",
    "飞机": "Máy bay.",
    "火车站": "Trạm xe lửa — ga tàu.",
    "中国": "Nước ở giữa — Trung Quốc.",
    "北京": "Kinh đô phương Bắc.",
    "说话": "Nói lời — nói chuyện.",
}

LESSON_META = {
    1: ("你好", "Xin chào", "Chào hỏi: 你/您/你们. 们 thêm vào sau đại từ để chỉ số nhiều. 对不起 / 没关系 dùng khi xin lỗi."),
    2: ("谢谢", "Cảm ơn", "Cảm ơn và đáp lại: 谢谢 / 不客气. 不 phủ định. 再见 khi tạm biệt."),
    3: ("你叫什么名字", "Bạn tên gì?", "Câu 是 để nói 'là'. 叫 hỏi tên. Cuối câu thêm 吗 để biến thành câu hỏi có/không."),
    4: ("她是我的汉语老师", "Cô ấy là giáo viên tiếng Hán của tôi", "的 nối sở hữu: 我的老师. 谁 hỏi 'ai', 哪 hỏi 'nào'. 呢 hỏi lại 'còn... thì sao?'."),
    5: ("她女儿今年二十岁", "Con gái cô ấy năm nay 20 tuổi", "Có: 有. Hỏi tuổi: 几岁 / 多大. 了 ở cuối câu báo hiệu một tình huống mới. Học thuộc số 1–10."),
    6: ("我会说汉语", "Tôi biết nói tiếng Hán", "会 = biết làm một kỹ năng. 怎么 hỏi cách. 很 đứng trước tính từ (很好吃), không cần 'là'."),
    7: ("今天几号", "Hôm nay ngày mấy?", "Ngày tháng: X 月 X 号. Thứ: 星期 + số (星期一…星期日). 去 + nơi chốn."),
    8: ("我想喝茶", "Tôi muốn uống trà", "想 = muốn. Hỏi giá: 多少钱. Lượng từ: 个 cho đồ vật, 块 cho tiền."),
    9: ("你儿子在哪儿工作", "Con trai bạn làm việc ở đâu?", "在 chỉ vị trí hoặc 'đang'. 哪儿 hỏi nơi chốn. 工作 vừa là động từ vừa là danh từ."),
    10: ("我能坐这儿吗", "Tôi ngồi đây được không?", "能 = có thể (được phép/khả năng). Từ vị trí: 上/里/前面/后面. 和 = và. 没有 phủ định của 有."),
    11: ("现在几点", "Bây giờ mấy giờ?", "Giờ: X 点 X 分. 时候 'lúc'. 回 = về. 前 = trước (thời gian)."),
    12: ("明天天气怎么样", "Ngày mai thời tiết thế nào?", "怎么样 hỏi tình trạng. 太…了 nhấn 'quá…'. Từ thời tiết: 热/冷/下雨."),
    13: ("他在学做中国菜呢", "Anh ấy đang học nấu món Trung", "也 = cũng. 吧 ở cuối câu gợi ý. 给 = cho. 在 + động từ = đang làm. 打电话 = gọi điện."),
    14: ("她买了不少衣服", "Cô ấy đã mua khá nhiều quần áo", "了 sau động từ: việc đã xảy ra. 一点儿 'một chút'. 都 'đều'. 这些 'những cái này'."),
    15: ("我是坐飞机来的", "Tôi đến bằng máy bay", "Cấu trúc 是…的 nhấn cách thức/thời gian đã xảy ra: 我是坐飞机来的. 一起 'cùng nhau'. 认识 'quen'."),
}

# Original sentences (NOT copied from the textbook)
SENTENCES = {
    1: [
        ("你好！您是老师吗？", "Xin chào! Ngài là giáo viên ạ?"),
        ("你们好！", "Xin chào các bạn!"),
        ("对不起。没关系。", "Xin lỗi. Không sao."),
    ],
    2: [
        ("谢谢你！", "Cảm ơn bạn!"),
        ("不，不客气。", "Không, không có gì."),
        ("再见！", "Tạm biệt!"),
    ],
    3: [
        ("我叫小明。你叫什么名字？", "Tôi tên Tiểu Minh. Bạn tên gì?"),
        ("我是学生。你是老师吗？", "Tôi là học sinh. Bạn là giáo viên phải không?"),
        ("他是什么人？", "Anh ấy là người như thế nào / là ai?"),
    ],
    4: [
        ("她是我的朋友。", "Cô ấy là bạn của tôi."),
        ("他是哪国人？他是中国人。", "Anh ấy là người nước nào? Anh ấy là người Trung Quốc."),
        ("你的老师呢？", "Còn giáo viên của bạn thì sao?"),
        ("她是谁？她是我的同学。", "Cô ấy là ai? Cô ấy là bạn cùng lớp của tôi."),
    ],
    5: [
        ("我家有三口人。", "Nhà tôi có ba người."),
        ("她女儿今年五岁。", "Con gái cô ấy năm nay năm tuổi."),
        ("你今年多大？我二十岁了。", "Năm nay bạn bao nhiêu tuổi? Tôi hai mươi tuổi rồi."),
    ],
    6: [
        ("我会说汉语。", "Tôi biết nói tiếng Hán."),
        ("妈妈做的菜很好吃。", "Món mẹ nấu rất ngon."),
        ("这个字怎么读？你会写吗？", "Chữ này đọc thế nào? Bạn viết được không?"),
    ],
    7: [
        ("请问，今天几号？", "Xin hỏi, hôm nay ngày mấy?"),
        ("今天是三月八号，星期一。", "Hôm nay là ngày 8 tháng 3, thứ Hai."),
        ("明天我去学校看书。", "Ngày mai tôi đến trường đọc sách."),
        ("昨天我去学校了。", "Hôm qua tôi đã đến trường."),
    ],
    8: [
        ("我想喝茶。", "Tôi muốn uống trà."),
        ("这个杯子多少钱？三块。", "Cái cốc này bao nhiêu tiền? Ba tệ."),
        ("下午我去商店买米饭。", "Chiều tôi đến cửa hàng mua cơm."),
        ("那个人想吃米饭。", "Người kia muốn ăn cơm."),
    ],
    9: [
        ("你儿子在哪儿工作？他在医院工作。", "Con trai bạn làm việc ở đâu? Anh ấy làm ở bệnh viện."),
        ("小狗在椅子下面。", "Con chó nhỏ ở dưới ghế."),
        ("我爸爸是医生。", "Bố tôi là bác sĩ."),
        ("猫在那儿。", "Con mèo ở chỗ đó."),
    ],
    10: [
        ("我能坐这儿吗？", "Tôi ngồi đây được không?"),
        ("电脑在桌子上。", "Máy tính ở trên bàn."),
        ("书在桌子里吗？没有。", "Sách ở trong bàn chứ? Không có."),
        ("前面有椅子和桌子。", "Phía trước có ghế và bàn."),
    ],
    11: [
        ("现在几点？现在三点十分。", "Bây giờ mấy giờ? Bây giờ ba giờ mười phút."),
        ("我们中午吃饭。", "Chúng tôi ăn cơm trưa."),
        ("我三点前回学校。", "Tôi về trường trước ba giờ."),
        ("你什么时候去看电影？", "Bạn lúc nào đi xem phim?"),
    ],
    12: [
        ("明天天气怎么样？明天太热了。", "Ngày mai thời tiết thế nào? Ngày mai nóng quá."),
        ("今天下雨，很冷。", "Hôm nay mưa, rất lạnh."),
        ("小姐，我想买些水果。", "Cô ơi, tôi muốn mua một ít hoa quả."),
        ("我爱你，你的身体好吗？", "Tôi yêu bạn, sức khỏe bạn thế nào?"),
    ],
    13: [
        ("喂，你在做什么？", "Alo, bạn đang làm gì?"),
        ("我也学习汉语。", "Tôi cũng học tiếng Hán."),
        ("上午我睡觉，下午给你打电话吧。", "Sáng tôi ngủ, chiều gọi điện cho bạn nhé."),
        ("他喜欢看电视。", "Anh ấy thích xem tivi."),
    ],
    14: [
        ("这些衣服都很漂亮。", "Những bộ quần áo này đều rất đẹp."),
        ("我想买一点儿苹果。", "Tôi muốn mua một chút táo."),
        ("先生，我看见你的车了。", "Ông ơi, tôi đã nhìn thấy xe của ông."),
        ("她买了不少东西，十分钟后回来。", "Cô ấy đã mua khá nhiều đồ, mười phút nữa sẽ về."),
    ],
    15: [
        ("认识你我很高兴。", "Rất vui được quen bạn."),
        ("我是坐飞机来的。", "Tôi đến bằng máy bay."),
        ("我们一起去饭店吧。", "Chúng ta cùng đến nhà hàng nhé."),
        ("他在大学工作，今年三十岁。", "Anh ấy làm việc ở đại học, năm nay ba mươi tuổi."),
        ("我听他说，火车站在前面。", "Tôi nghe anh ấy nói, ga tàu ở phía trước."),
    ],
}

# Extra words inserted into lessons
EXTRAS = {
    4: [
        {"hanzi": "中国", "pinyin": "Zhōngguó", "pos": "n.", "en": "China"},
        {"hanzi": "北京", "pinyin": "Běijīng", "pos": "n.", "en": "Beijing"},
    ],
    5: [
        {"hanzi": "一", "pinyin": "yī", "pos": "num.", "en": "one"},
        {"hanzi": "二", "pinyin": "èr", "pos": "num.", "en": "two"},
        {"hanzi": "三", "pinyin": "sān", "pos": "num.", "en": "three"},
        {"hanzi": "四", "pinyin": "sì", "pos": "num.", "en": "four"},
        {"hanzi": "五", "pinyin": "wǔ", "pos": "num.", "en": "five"},
        {"hanzi": "六", "pinyin": "liù", "pos": "num.", "en": "six"},
        {"hanzi": "七", "pinyin": "qī", "pos": "num.", "en": "seven"},
        {"hanzi": "八", "pinyin": "bā", "pos": "num.", "en": "eight"},
        {"hanzi": "九", "pinyin": "jiǔ", "pos": "num.", "en": "nine"},
        {"hanzi": "十", "pinyin": "shí", "pos": "num.", "en": "ten"},
        {"hanzi": "零", "pinyin": "líng", "pos": "num.", "en": "zero"},
        {"hanzi": "百", "pinyin": "bǎi", "pos": "num.", "en": "hundred"},
    ],
    6: [
        {"hanzi": "说话", "pinyin": "shuōhuà", "pos": "v.", "en": "to speak, to talk"},
    ],
    7: [
        {"hanzi": "日", "pinyin": "rì", "pos": "n.", "en": "day; Sunday (星期日)"},
    ],
    10: [
        {"hanzi": "下", "pinyin": "xià", "pos": "n.", "en": "under, below, next"},
        {"hanzi": "没", "pinyin": "méi", "pos": "adv.", "en": "not (with 有)"},
    ],
    15: [
        {"hanzi": "火车站", "pinyin": "huǒchēzhàn", "pos": "n.", "en": "railway station"},
    ],
}

VIDEOS = {
    1: {"lecture": ("EpSs4cdSML0", 7201, "Bài 1: Giáo trình chuẩn HSK 1 — Thành Luân"), "workbook": None},
    2: {"lecture": ("EfN5_uU35vY", 4330, "Bài 2: HSK Standard Course 1 — Thành Luân"), "workbook": None},
    3: {"lecture": ("gZrvRS91p-I", 6368, "Bài 3: Giáo trình chuẩn HSK 1 — Thành Luân"), "workbook": None},
    4: {"lecture": ("WNKzPU_W3bE", 4948, "Bài 4: Giáo trình chuẩn HSK 1 — Thành Luân"), "workbook": None},
    5: {"lecture": ("f8DFvv7FiDs", 3863, "Bài 5: Giáo trình chuẩn HSK 1 — Thành Luân"), "workbook": None},
    6: {"lecture": ("lDq6edF4Ovk", 2761, "Bài 6: Giáo trình chuẩn HSK 1 — Thành Luân"),
        "workbook": ("iII2DRT8g9Y", 1085, "Bài 6: Sách bài tập — Thành Luân")},
    7: {"lecture": ("MDNnjsSX0DU", 2952, "Bài 7: Giáo trình chuẩn HSK 1 — Thành Luân"),
        "workbook": ("l-E9cvlXI8g", 1158, "Bài 7: Sách bài tập — Thành Luân")},
    8: {"lecture": ("9OQI2UK-qX0", 3597, "Bài 8: Giáo trình chuẩn HSK 1 — Thành Luân"),
        "workbook": ("jTq11HQBBy4", 967, "Bài 8: Sách bài tập — Thành Luân")},
    9: {"lecture": ("-u3sGPl2QzI", 3011, "Bài 9: Giáo trình chuẩn HSK 1 — Thành Luân"),
        "workbook": ("P1dU_pSXZAM", 1084, "Bài 9: Sách bài tập — Thành Luân")},
    10: {"lecture": ("cm2WUE5zGyY", 4143, "Bài 10: Giáo trình chuẩn HSK 1 — Thành Luân"),
         "workbook": ("fo6vOrgcnvg", 980, "Bài 10: Sách bài tập — Thành Luân")},
    11: {"lecture": ("3O5EQGb1vLk", 3677, "Bài 11: Giáo trình chuẩn HSK 1 — Thành Luân"),
         "workbook": ("PKA4QPnl86c", 850, "Bài 11: Sách bài tập — Thành Luân")},
    12: {"lecture": ("em01hp4pVYc", 2638, "Bài 12: Giáo trình chuẩn HSK 1 — Thành Luân"),
         "workbook": ("xMPmmrzHoqg", 1039, "Bài 12: Sách bài tập — Thành Luân")},
    13: {"lecture": ("-oib4Xw-LGI", 3181, "Bài 13: Giáo trình chuẩn HSK 1 — Thành Luân"),
         "workbook": ("MIvNrxC8-dQ", 1142, "Bài 13: Sách bài tập — Thành Luân")},
    14: {"lecture": ("3fkgULyP81k", 3311, "Bài 14: Giáo trình chuẩn HSK 1 — Thành Luân"),
         "workbook": ("BZA5238EKZ4", 1213, "Bài 14: Sách bài tập — Thành Luân")},
    15: {"lecture": ("pACKLvBFzkY", 2672, "Bài 15: Giáo trình chuẩn HSK 1 — Thành Luân"),
         "workbook": ("SqPhVZSiE1A", 1167, "Bài 15: Sách bài tập — Thành Luân")},
}
MOCK_VIDEO = ("tEt96A87bDE", 6226, "Tổng hợp 6 bộ đề thi thử HSK1 — Thành Luân")

def segments(duration, kind="lecture"):
    """~15-20 min stop points."""
    if duration <= 20 * 60 + 30:
        return [{"start": 0, "end": duration, "label": "Xem trọn video này (khoảng 15–20 phút), rồi dừng lại làm bài."}]
    step = 18 * 60
    segs = []
    t = 0
    i = 1
    while t < duration:
        end = min(t + step, duration)
        # if remainder is tiny, merge
        if duration - end < 6 * 60 and end < duration:
            end = duration
        remain = end  # label uses clock
        def fmt(sec):
            h, r = divmod(sec, 3600)
            m, s = divmod(r, 60)
            if h:
                return f"{h}:{m:02d}:{s:02d}"
            return f"{m}:{s:02d}"
        if kind == "lecture":
            label = f"Đoạn {i} — xem từ {fmt(t)} đến {fmt(end)}, rồi dừng làm từ / ghi chú."
        else:
            label = f"Bài tập đoạn {i} — xem từ {fmt(t)} đến {fmt(end)}, làm kèm sách bài tập."
        segs.append({"start": t, "end": end, "label": label})
        if end >= duration:
            break
        t = end
        i += 1
    return segs

def video_obj(triple, kind):
    if not triple:
        return None
    vid, dur, title = triple
    return {"id": vid, "title": title, "duration": dur, "segments": segments(dur, kind)}

def decomp_for_word(hanzi):
    items = []
    for ch in hanzi:
        if ch in (" ", "·"):
            continue
        if "\u4e00" <= ch <= "\u9fff" or ch in DECOMP:
            parts, mn = DECOMP.get(ch, ([ch], "Hãy nhớ hình chữ này và viết đúng thứ tự nét."))
            items.append({"char": ch, "parts": parts, "mnemonic": mn})
    return items

def word_obj(lesson, idx, raw):
    hanzi = raw["hanzi"]
    py = compact_py(raw["pinyin"])
    # Keep capital for proper nouns already in source
    wid = f"l{lesson:02d}-{idx:02d}"
    mn = WORD_MN.get(hanzi) or " · ".join(d["mnemonic"] for d in decomp_for_word(hanzi))
    return {
        "id": wid,
        "lesson": lesson,
        "hanzi": hanzi,
        "pinyin": py,
        "pinyinNum": to_num(raw["pinyin"]),
        "vi": VI.get(hanzi, raw.get("en", "")),
        "pos": POS_VI.get(raw.get("pos",""), raw.get("pos","") or "từ"),
        "decomps": decomp_for_word(hanzi),
        "mnemonic": mn,
    }

def build():
    lessons = []
    all_words = []
    all_sents = []
    for raw in RAW:
        n = raw["lesson"]
        title_zh, title_vi, grammar = LESSON_META[n]
        words = []
        idx = 1
        seen = set()
        for w in raw["words"]:
            if w["hanzi"] in seen:
                continue
            seen.add(w["hanzi"])
            obj = word_obj(n, idx, w)
            words.append(obj)
            idx += 1
        for w in EXTRAS.get(n, []):
            if w["hanzi"] in seen:
                continue
            seen.add(w["hanzi"])
            obj = word_obj(n, idx, w)
            words.append(obj)
            idx += 1
        sents = []
        for i, (hz, vi) in enumerate(SENTENCES[n], 1):
            # pinyin left empty, filled in TS via pinyin-pro? Better prefill with pinyin-pro in node later.
            # We'll fill a reasonable pinyin in a second pass using a tiny map, or leave and compute at runtime.
            sents.append({
                "id": f"s{n:02d}-{i:02d}",
                "lesson": n,
                "hanzi": hz,
                "pinyin": "",  # filled below if we can
                "pinyinNum": "",
                "vi": vi,
            })
        v = VIDEOS[n]
        lessons.append({
            "id": n,
            "titleZh": title_zh,
            "titleVi": title_vi,
            "grammarNote": grammar,
            "words": words,
            "sentences": sents,
            "lecture": video_obj(v["lecture"], "lecture"),
            "workbook": video_obj(v["workbook"], "workbook") if v["workbook"] else None,
            "days": 3,
        })
        all_words.extend(words)
        all_sents.extend(sents)
    return lessons, all_words, all_sents

# Week 0 data
INITIALS = [
    ("b","b","như b trong ba"), ("p","p","bật hơi, như p trong pin nhưng mạnh hơn"),
    ("m","m","như m"), ("f","f","như ph"),
    ("d","đ","như đ, đầu lưỡi"), ("t","t","bật hơi, như th mạnh"),
    ("n","n","như n"), ("l","l","như l"),
    ("g","g","như g/c, gốc lưỡi"), ("k","k","bật hơi, mạnh"),
    ("h","h","như h, hơi xát"),
    ("j","gi/z"), ("q","sát, bật hơi, gần 'ch' nhẹ"), ("x","sát, gần 's/x' nhẹ"),
    ("zh","triệt"), ("ch","sát bật hơi"), ("sh","sát"), ("r","gần 'r' cong lưỡi"),
    ("z","gi/dz không bật hơi"), ("c","ts bật hơi"), ("s","s rõ"),
    ("y","như y/i"), ("w","như u/w"),
]
# fix initials to triples
INITIALS = [
    ("b","bô","như b trong ba, không bật hơi"),
    ("p","pô","có bật hơi, để tờ giấy trước miệng sẽ bay"),
    ("m","mô","như m"),
    ("f","phô","như ph"),
    ("d","đê","như đ, đầu lưỡi chạm lợi"),
    ("t","tê","bật hơi mạnh"),
    ("n","nê","như n"),
    ("l","lê","như l"),
    ("g","gê","gốc lưỡi, không bật hơi"),
    ("k","kê","gốc lưỡi, bật hơi"),
    ("h","ha","như h, hơi xát"),
    ("j","ti","lưỡi sát ổ răng, không bật hơi (gần 'gi')"),
    ("q","thi","giống j nhưng bật hơi"),
    ("x","xi","sát nhẹ, gần 's/x'"),
    ("zh","tri","lưỡi cong, không bật hơi"),
    ("ch","xri","lưỡi cong, bật hơi"),
    ("sh","shi","lưỡi cong, sát"),
    ("r","ri","lưỡi cong, gần âm r"),
    ("z","tư","đầu lưỡi, không bật hơi"),
    ("c","thư","đầu lưỡi, bật hơi (như ts)"),
    ("s","tư s","như s rõ"),
    ("y","i","như y / i đầu âm"),
    ("w","u","như u / w đầu âm"),
]

FINALS = [
    ("a","a","như a"), ("o","o","như o tròn môi"), ("e","ơ","như ơ, miệng rộng"),
    ("i","i","như i"), ("u","u","như u"), ("ü","uy","như u nhưng miệng cười (i-shaped)"),
    ("ai","ai","như ai"), ("ei","ây","như ây"), ("ui","uei","u + ây"),
    ("ao","ao","như ao"), ("ou","âu","như âu"), ("iu","iou","i + âu"),
    ("ie","iê","i + e nhẹ"), ("üe","üê","ü + e nhẹ"), ("er","ơ","âm r, lưỡi cong"),
    ("an","an","như an"), ("en","ân","như ân"), ("in","in","như in"),
    ("un","uên","u + ân"), ("ün","uyn","ü + n"),
    ("ang","ang","an cộng cộng minh"), ("eng","âng","ân cộng minh"),
    ("ing","ing","in cộng minh"), ("ong","ung","o cộng minh, tròn môi"),
]

TONES = [
    {"tone": 1, "name": "Thanh 1 — bằng cao", "desc": "Cao và thẳng, không xuống không lên. Ví dụ mā (mẹ).", "contour": "55", "example": "mā", "exampleHanzi": "妈", "exampleVi": "mẹ"},
    {"tone": 2, "name": "Thanh 2 — bah lên", "desc": "Bắt đầu vừa phải, trượt lên cao. Ví dụ má (gai, tê).", "contour": "35", "example": "má", "exampleHanzi": "麻", "exampleVi": "tê, gai"},
    {"tone": 3, "name": "Thanh 3 — ngã xuống rồi lên", "desc": "Hạ xuống thấp rồi nhấc lên (khi đứng một mình). Ví dụ mǎ (ngựa).", "contour": "214", "example": "mǎ", "exampleHanzi": "马", "exampleVi": "ngựa"},
    {"tone": 4, "name": "Thanh 4 — đổ xuống", "desc": "Rơi mạnh từ cao xuống thấp, dứt khoát. Ví dụ mà (mắng).", "contour": "51", "example": "mà", "exampleHanzi": "骂", "exampleVi": "mắng"},
    {"tone": 5, "name": "Thanh nhẹ", "desc": "Ngắn, nhẹ, không nhấn. Ví dụ ma trong 妈妈 (māma).", "contour": "0", "example": "ma", "exampleHanzi": "吗", "exampleVi": "tiểu từ hỏi"},
]

STROKES = [
    {"id": "heng", "zh": "横", "py": "héng", "vi": "Nét ngang", "example": "一", "desc": "Kéo từ trái sang phải, hơi nâng cuối nét."},
    {"id": "shu", "zh": "竖", "py": "shù", "vi": "Nét sổ", "example": "十", "desc": "Từ trên xuống, thẳng và chắc."},
    {"id": "pie", "zh": "撇", "py": "piě", "vi": "Nét phẩy", "example": "人", "desc": "Từ phải trên xuống trái, mỏng dần."},
    {"id": "na", "zh": "捺", "py": "nà", "vi": "Nét mác", "example": "人", "desc": "Từ trái trên xuống phải, loe dần rồi dừng."},
    {"id": "dian", "zh": "点", "py": "diǎn", "vi": "Nét chấm", "example": "太", "desc": "Một chấm ngắn, có hướng."},
    {"id": "ti", "zh": "提", "py": "tí", "vi": "Nét nhắc", "example": "打", "desc": "Từ dưới trái hất lên phải."},
    {"id": "gou", "zh": "钩", "py": "gōu", "vi": "Nét móc", "example": "小", "desc": "Cuối nét sổ hoặc ngang bật móc ngắn."},
    {"id": "zhe", "zh": "折", "py": "zhé", "vi": "Nét gãy", "example": "口", "desc": "Đi một hướng rồi gãy sang hướng khác, không nhấc bút."},
]

STROKE_RULES = [
    "Trên trước, dưới sau (ví dụ 二, 三).",
    "Trái trước, phải sau (ví dụ 你: 亻 rồi 尔).",
    "Ngang trước, sổ sau (ví dụ 十).",
    "Phẩy trước, mác sau (ví dụ 人).",
    "Ngoài trước, trong sau (ví dụ 月, 回).",
    "Giữa trước, rồi hai bên (ví dụ 小, 水).",
    "Khép khung dưới cùng sau cùng (ví dụ 口, 日 — nét ngang đáy viết cuối).",
    "Nét xuyên tâm (sổ dài) thường viết sau (ví dụ 中).",
]

RADICALS = [
    ("人", "rén", "người", "亻 khi đứng bên", ["你", "他", "个"]),
    ("口", "kǒu", "miệng", "ô vuông, cũng là lượng từ", ["叫", "吗", "吃"]),
    ("女", "nǚ", "nữ", "phụ nữ", ["好", "她", "妈"]),
    ("子", "zǐ", "con, trẻ", "cũng là hậu tố", ["好", "字", "孩子"]),
    ("日", "rì", "mặt trời, ngày", "", ["明", "星", "时"]),
    ("月", "yuè", "mặt trăng; thịt (khi bên)", "ở bên trái thường mang nghĩa 'thân thể'", ["期", "朋", "脑"]),
    ("水", "shuǐ", "nước", "bộ 氵 ba chấm nước", ["没", "汉", "漂"]),
    ("火", "huǒ", "lửa", "cũng viết 灬 dưới đáy", ["热", "灯", "点"]),
    ("木", "mù", "cây, gỗ", "", ["校", "桌", "杯"]),
    ("土", "tǔ", "đất", "", ["坐", "块", "在"]),
    ("心", "xīn", "tim, lòng", "cũng viết 忄 ở bên", ["您", "想", "怎"]),
    ("手", "shǒu", "tay", "cũng viết 扌 ở bên", ["打", "看", "我"]),
    ("言", "yán", "lời nói", "giản thể 讠", ["说", "请", "谢"]),
    ("食", "shí", "ăn", "giản thể 饣", ["饭", "饿", "馆"]),
    ("金", "jīn", "kim loại", "giản thể 钅", ["钱", "钟", "银"]),
    ("丝", "sī", "sợi tơ", "giản thể 纟", ["给", "红", "经"]),
    ("艹", "cǎo", "cỏ", "bộ thảo, viết trên đầu", ["菜", "茶", "苹"]),
    ("竹", "zhú", "tre", "bộ trúc trên đầu", ["笔", "笑", "第"]),
    ("刀", "dāo", "dao", "cũng viết 刂 ở bên phải", ["分", "刚", "别"]),
    ("力", "lì", "sức", "", ["功", "男", "动"]),
    ("又", "yòu", "lại, tay phải", "", ["对", "友", "汉"]),
    ("辶", "chuò", "bước đi", "bộ xước, nét ôm bên dưới", ["这", "过", "进"]),
    ("门", "mén", "cửa", "", ["们", "问", "间"]),
    ("雨", "yǔ", "mưa", "", ["零", "雪", "雷"]),
    ("山", "shān", "núi", "", ["岁", "岛", "岩"]),
    ("目", "mù", "mắt", "", ["看", "睡", "眼"]),
    ("田", "tián", "ruộng", "", ["电", "里", "果"]),
    ("贝", "bèi", "vỏ sò, tiền", "", ["贵", "员", "货"]),
    ("车", "chē", "xe", "", ["车", "轻", "辆"]),
    ("马", "mǎ", "ngựa", "", ["妈", "吗", "骑"]),
]

WEEK0_CHARS = ["一", "二", "三", "十", "人", "口", "日", "月", "水", "火", "木", "土", "山", "女", "子", "中", "小", "大"]

# Tone drill syllables
TONE_DRILLS = [
    {"base": "ma", "marks": ["mā", "má", "mǎ", "mà", "ma"], "hanzi": ["妈", "麻", "马", "骂", "吗"]},
    {"base": "yi", "marks": ["yī", "yí", "yǐ", "yì"], "hanzi": ["一", "姨", "椅", "意"]},
    {"base": "wu", "marks": ["wū", "wú", "wǔ", "wù"], "hanzi": ["屋", "无", "五", "物"]},
    {"base": "ni", "marks": ["nī", "ní", "nǐ", "nì"], "hanzi": ["妮", "泥", "你", "逆"]},
    {"base": "hao", "marks": ["hāo", "háo", "hǎo", "hào"], "hanzi": ["蒿", "毫", "好", "号"]},
    {"base": "nai", "marks": ["nāi", "nái", "nǎi", "nài"], "hanzi": ["—,", "—,", "奶", "耐"]},
    {"base": "cha", "marks": ["chā", "chá", "chǎ", "chà"], "hanzi": ["插", "茶", "衩", "差"]},
]

def ts_str(s):
    return json.dumps(s, ensure_ascii=False)

def emit(lessons, all_words, all_sents):
    # Fill sentence pinyin later in a node script? For now leave and compute with a simple approach:
    # We'll run pinyin-pro after this via a small node fill. Placeholder ok if we fill in TS runtime.
    # Better: write a tiny node after generating.

    lines = []
    a = lines.append
    a("// AUTO-GENERATED by scripts/gen_curriculum.py — do not edit by hand")
    a("export type Decomp = { char: string; parts: string[]; mnemonic: string };")
    a("export type Word = {")
    a("  id: string; lesson: number; hanzi: string; pinyin: string; pinyinNum: string;")
    a("  vi: string; pos: string; decomps: Decomp[]; mnemonic: string;")
    a("};")
    a("export type Sentence = { id: string; lesson: number; hanzi: string; pinyin: string; pinyinNum: string; vi: string };")
    a("export type VideoSeg = { start: number; end: number; label: string };")
    a("export type LessonVideo = { id: string; title: string; duration: number; segments: VideoSeg[] };")
    a("export type Lesson = {")
    a("  id: number; titleZh: string; titleVi: string; grammarNote: string;")
    a("  words: Word[]; sentences: Sentence[];")
    a("  lecture: LessonVideo | null; workbook: LessonVideo | null; days: 3;")
    a("};")
    a("export const LESSONS: Lesson[] = " + json.dumps(lessons, ensure_ascii=False, indent=2) + ";")
    a("export const ALL_WORDS: Word[] = LESSONS.flatMap(l => l.words);")
    a("export const ALL_SENTENCES: Sentence[] = LESSONS.flatMap(l => l.sentences);")
    a("export const WORD_BY_ID: Record<string, Word> = Object.fromEntries(ALL_WORDS.map(w => [w.id, w]));")
    a("export const MOCK_EXAM_VIDEO: LessonVideo = " + json.dumps(video_obj(MOCK_VIDEO, "lecture"), ensure_ascii=False) + ";")
    a("export const INITIALS = " + json.dumps([{"id": i[0], "pinyin": i[0], "hint": i[2]} for i in INITIALS], ensure_ascii=False) + ";")
    a("export const FINALS = " + json.dumps([{"id": f[0], "pinyin": f[0], "hint": f[2]} for f in FINALS], ensure_ascii=False) + ";")
    a("export const TONES = " + json.dumps(TONES, ensure_ascii=False, indent=2) + ";")
    a("export const STROKES = " + json.dumps(STROKES, ensure_ascii=False, indent=2) + ";")
    a("export const STROKE_RULES = " + json.dumps(STROKE_RULES, ensure_ascii=False, indent=2) + ";")
    a("export const RADICALS = " + json.dumps([
        {"char": r[0], "pinyin": r[1], "vi": r[2], "note": r[3], "examples": r[4]} for r in RADICALS
    ], ensure_ascii=False, indent=2) + ";")
    a("export const WEEK0_TRACE_CHARS = " + json.dumps(WEEK0_CHARS, ensure_ascii=False) + ";")
    a("export const TONE_DRILLS = " + json.dumps(TONE_DRILLS, ensure_ascii=False, indent=2) + ";")
    a("export const YT_WATCH = (id: string, start = 0) =>")
    a("  `https://www.youtube.com/watch?v=${id}` + (start > 0 ? `&t=${Math.floor(start)}s` : '');")
    a("export const TOTAL_LESSONS = 15;")
    a("export const PASS_SCORE = 0.8;")

    out = ROOT / "src/data/curriculum.ts"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("wrote", out, "bytes", out.stat().st_size)
    print("words", len(all_words), "sents", len(all_sents))

    # TTS manifest
    items = []
    for w in all_words:
        items.append({"id": w["id"], "text": w["hanzi"], "kind": "word"})
    for s in all_sents:
        items.append({"id": s["id"], "text": s["hanzi"], "kind": "sent"})
    # week0 audio
    for t in TONES:
        items.append({"id": f"tone-{t['tone']}", "text": t["exampleHanzi"] if t["exampleHanzi"] else t["example"], "kind": "tone"})
    for drill in TONE_DRILLS:
        for mark, hz in zip(drill["marks"], drill["hanzi"]):
            if hz.startswith("—"):
                # speak pinyin syllable only - edge-tts needs Chinese or we pass SSML? We'll use a Chinese char if possible, else skip
                continue
            items.append({"id": f"drill-{drill['base']}-{mark}", "text": hz, "kind": "drill"})
    # initials/finals: speak an example syllable in pinyin? edge-tts zh-CN may misread latin.
    # Use well-known chars:
    init_ex = {
        "b": "八", "p": "朋", "m": "妈", "f": "饭", "d": "大", "t": "他", "n": "你", "l": "老",
        "g": "个", "k": "看", "h": "好", "j": "叫", "q": "七", "x": "谢", "zh": "这", "ch": "吃",
        "sh": "是", "r": "人", "z": "字", "c": "菜", "s": "三", "y": "一", "w": "我",
    }
    fin_ex = {
        "a": "啊", "o": "哦", "e": "饿", "i": "一", "u": "五", "ü": "雨",
        "ai": "爱", "ei": "杯", "ui": "水", "ao": "好", "ou": "口", "iu": "六",
        "ie": "谢", "üe": "月", "er": "二", "an": "三", "en": "很", "in": "您",
        "un": "文", "ün": "云", "ang": "忙", "eng": "冷", "ing": "名", "ong": "中",
    }
    for k, hz in init_ex.items():
        items.append({"id": f"init-{k}", "text": hz, "kind": "init"})
    for k, hz in fin_ex.items():
        items.append({"id": f"final-{k}", "text": hz, "kind": "final"})

    man = ROOT / "scripts/tts-manifest.json"
    man.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    print("tts items", len(items), "->", man)

    # unique chars for hanzi-writer (words + week0 + radicals + strokes examples + drills)
    chars = set()
    for w in all_words:
        for ch in w["hanzi"]:
            if "\u4e00" <= ch <= "\u9fff":
                chars.add(ch)
    for s in WEEK0_CHARS:
        chars.add(s)
    for r in RADICALS:
        chars.add(r[0])
    for st in STROKES:
        for ch in st["example"]:
            if "\u4e00" <= ch <= "\u9fff":
                chars.add(ch)
    for d in TONE_DRILLS:
        for hz in d["hanzi"]:
            for ch in hz:
                if "\u4e00" <= ch <= "\u9fff":
                    chars.add(ch)
    # common extras in radicals examples
    for r in RADICALS:
        for ex in r[4]:
            for ch in ex:
                if "\u4e00" <= ch <= "\u9fff":
                    chars.add(ch)
    (ROOT / "scripts/hanzi-chars.json").write_text(json.dumps(sorted(chars), ensure_ascii=False), encoding="utf-8")
    print("unique chars", len(chars))

if __name__ == "__main__":
    lessons, words, sents = build()
    missing_vi = [w["hanzi"] for w in words if not w["vi"]]
    missing_de = []
    for w in words:
        for ch in w["hanzi"]:
            if "\u4e00" <= ch <= "\u9fff" and ch not in DECOMP:
                missing_de.append(ch)
    print("missing vi", missing_vi)
    print("missing decomp", sorted(set(missing_de)))
    emit(lessons, words, sents)
