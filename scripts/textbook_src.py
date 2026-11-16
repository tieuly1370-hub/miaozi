# Nội dung Giáo trình Lò Hán — tự biên soạn (không chép sách HSK Standard Course).
# Mỗi câu: (zh, vi). Hội thoại: (vai, zh, vi).
T = {}
T[1] = dict(
 goals=["Chào hỏi người khác đúng mức lịch sự (你 / 您 / 你们).", "Xin lỗi và đáp lại lời xin lỗi.", "Đọc chuẩn thanh 3 + thanh 3 (你好 đọc thành ní hǎo)."],
 grammar=[
  dict(title="Chào: 你好 / 您好 / 你们好", pattern="Đại từ + 好", explain="Ghép đại từ với 好 là thành câu chào. 您 là 'ngài', dùng với người lớn tuổi, thầy cô, khách. 你们 là 'các bạn' — thêm 们 để chỉ số nhiều.",
       ex=[("你好！","Chào bạn!"),("您好！","Chào ngài!"),("你们好！","Chào các bạn!")]),
  dict(title="Biến điệu thanh 3", pattern="thanh 3 + thanh 3 → thanh 2 + thanh 3", explain="Hai thanh 3 đứng liền nhau thì chữ đầu đọc thành thanh 2. Pinyin vẫn viết nǐ hǎo, nhưng miệng đọc ní hǎo. Loa trong app đã đọc đúng như vậy.",
       ex=[("你好。","Xin chào.")]),
  dict(title="Xin lỗi và đáp lại", pattern="对不起 → 没关系", explain="对不起 = xin lỗi. Người kia đáp 没关系 = không sao. Chữ 不 trong 对不起 và 系 trong 没关系 đọc nhẹ (thanh nhẹ).",
       ex=[("对不起！","Xin lỗi!"),("没关系。","Không sao.")]),
 ],
 dialogues=[dict(title="Gặp nhau ở lớp", lines=[("A","你好！","Chào bạn!"),("B","你好！","Chào bạn!"),("A","您好！","Chào thầy!"),("C","你们好！","Chào các em!")]),
            dict(title="Va phải nhau", lines=[("A","对不起！","Xin lỗi!"),("B","没关系。","Không sao.")])],
 notes=["Người Trung Quốc chào thầy cô và người lớn bằng 您好, kèm hơi cúi đầu.", "Đừng đọc 你 thành 'nỉ' kiểu tiếng Việt: thanh 3 xuống thấp rồi mới lên."],
)
T[2] = dict(
 goals=["Cảm ơn và đáp lại lời cảm ơn.", "Nói tạm biệt.", "Nắm biến điệu của 不 (bù → bú trước thanh 4)."],
 grammar=[
  dict(title="Cảm ơn: 谢谢 → 不客气", pattern="谢谢 (+ người)", explain="谢谢 = cảm ơn, chữ thứ hai đọc nhẹ: xièxie. Đáp lại bằng 不客气 = đừng khách sáo / không có gì.",
       ex=[("谢谢！","Cảm ơn!"),("谢谢你！","Cảm ơn bạn!"),("不客气。","Không có gì.")]),
  dict(title="Biến điệu của 不", pattern="不 + thanh 4 → bú", explain="不 vốn đọc thanh 4 (bù). Khi đứng trước một chữ thanh 4 thì đọc thành thanh 2 (bú). Ví dụ 不客气 đọc bú kèqi, 不是 đọc bú shì.",
       ex=[("不客气。","Không có gì."),("不，不客气。","Không, không có gì đâu.")]),
  dict(title="Tạm biệt: 再见", pattern="再见", explain="再 = lại, 见 = gặp. 再见 = hẹn gặp lại, tạm biệt. Hai chữ đều thanh 4: đọc dứt khoát, xuống giọng.",
       ex=[("再见！","Tạm biệt!"),("老师再见！","Chào thầy ạ (lúc về)!")]),
 ],
 dialogues=[dict(title="Nhận quà", lines=[("A","谢谢你！","Cảm ơn bạn!"),("B","不客气。","Không có gì."),("A","再见！","Tạm biệt!"),("B","再见！","Tạm biệt!")])],
 notes=["Người Trung Quốc ít nói 谢谢 với người rất thân; với bạn bè mới quen thì nên nói.", "Lưu ý 谢 đọc xiè, âm x gần 'x' tiếng Việt nhưng đầu lưỡi đặt sau răng dưới."],
)
T[3] = dict(
 goals=["Hỏi và nói tên mình.", "Giới thiệu nghề nghiệp bằng 是.", "Đặt câu hỏi có/không bằng 吗."],
 grammar=[
  dict(title="Hỏi tên: 叫什么名字", pattern="你叫什么名字？ — 我叫 + tên", explain="叫 = gọi là, tên là. 什么 = gì. Trong tiếng Trung, từ để hỏi đứng đúng chỗ của câu trả lời, không đảo lên đầu câu.",
       ex=[("你叫什么名字？","Bạn tên là gì?"),("我叫小明。","Tôi tên là Tiểu Minh.")]),
  dict(title="Câu chữ 是", pattern="A 是 B", explain="是 = là, nối hai danh từ. Phủ định thêm 不 đằng trước: 不是 (đọc bú shì).",
       ex=[("我是学生。","Tôi là học sinh."),("我不是老师。","Tôi không phải giáo viên.")]),
  dict(title="Câu hỏi với 吗", pattern="Câu kể + 吗？", explain="Thêm 吗 (thanh nhẹ) vào cuối câu kể là thành câu hỏi có/không. Trả lời 是 hoặc 不是.",
       ex=[("你是老师吗？","Bạn là giáo viên phải không?"),("你是中国人吗？","Bạn là người Trung Quốc à?")]),
 ],
 dialogues=[dict(title="Làm quen", lines=[("A","你好！你叫什么名字？","Chào bạn! Bạn tên là gì?"),("B","我叫小明。你呢？","Mình tên Tiểu Minh. Còn bạn?"),("A","我叫小红。你是老师吗？","Mình tên Tiểu Hồng. Bạn là giáo viên à?"),("B","我不是老师，我是学生。","Mình không phải giáo viên, mình là học sinh.")])],
 notes=["Họ đứng trước tên: 王小明 thì 王 là họ.", "什么 đọc shénme, chữ 么 đọc nhẹ; 名字 đọc míngzi."],
)
T[4] = dict(
 goals=["Hỏi 'ai', 'nước nào'.", "Nói sở hữu bằng 的.", "Hỏi lại bằng 呢."],
 grammar=[
  dict(title="Sở hữu: 的", pattern="A 的 B = B của A", explain="的 (de, thanh nhẹ) nối người sở hữu với vật. Với người thân, bạn bè có thể bỏ 的: 我朋友, 我妈妈.",
       ex=[("她是我的汉语老师。","Cô ấy là giáo viên tiếng Trung của tôi."),("这是我的书。","Đây là sách của tôi.")]),
  dict(title="Hỏi người: 谁", pattern="… 是谁？", explain="谁 = ai, đọc shéi (cũng có người đọc shuí). Đặt 谁 vào chỗ của người cần hỏi.",
       ex=[("她是谁？","Cô ấy là ai?"),("他是我同学。","Anh ấy là bạn học của tôi.")]),
  dict(title="Hỏi quốc tịch: 哪国人", pattern="你是哪国人？ — 我是 + nước + 人", explain="哪 = nào. 哪国人 = người nước nào. Trả lời: tên nước + 人.",
       ex=[("你是哪国人？","Bạn là người nước nào?"),("我是中国人。","Tôi là người Trung Quốc.")]),
  dict(title="Hỏi lại: 呢", pattern="Danh từ + 呢？", explain="呢 ở cuối câu ngắn = 'còn … thì sao?', dùng để hỏi lại điều vừa nói.",
       ex=[("我是学生，你呢？","Tôi là học sinh, còn bạn?")]),
 ],
 dialogues=[dict(title="Xem ảnh", lines=[("A","她是谁？","Cô ấy là ai?"),("B","她是我的汉语老师。","Cô ấy là giáo viên tiếng Trung của mình."),("A","她是哪国人？","Cô ấy là người nước nào?"),("B","她是中国人，北京人。","Cô ấy là người Trung Quốc, người Bắc Kinh."),("A","他呢？","Còn anh ấy?"),("B","他是我的同学。","Anh ấy là bạn học của mình.")])],
 notes=["汉语 = tiếng Hán (tiếng Trung). Người Việt quen nói 'tiếng Trung' = 中文 cũng được.", "Người Việt hay nói 越南人 (Yuènánrén) = người Việt Nam."],
)
T[5] = dict(
 goals=["Đếm số 0–100.", "Nói nhà có mấy người.", "Hỏi tuổi bằng 几岁 / 多大."],
 grammar=[
  dict(title="Số đếm", pattern="十一 = 11, 二十 = 20, 二十五 = 25", explain="Ghép số giống tiếng Việt: hai mươi lăm = 二十五. 一百 = 100. 零 = số 0.",
       ex=[("我二十五岁。","Tôi 25 tuổi."),("一百","một trăm")]),
  dict(title="Có: 有 / 没有", pattern="A 有 B", explain="有 = có. Phủ định là 没有, không dùng 不有. Đếm người trong nhà dùng lượng từ 口.",
       ex=[("我家有三口人。","Nhà tôi có ba người."),("我没有女儿。","Tôi không có con gái.")]),
  dict(title="Hỏi tuổi", pattern="几岁 (trẻ nhỏ) / 多大 (người lớn)", explain="Hỏi trẻ em dưới 10 tuổi: 你几岁了？ Hỏi người lớn ngang hàng: 你今年多大？ 几 = mấy (số nhỏ).",
       ex=[("你女儿几岁了？","Con gái bạn mấy tuổi rồi?"),("你今年多大？","Năm nay bạn bao nhiêu tuổi?")]),
  dict(title="了 cuối câu", pattern="… 了。", explain="了 (le) ở cuối câu báo một tình hình mới, giống 'rồi': 五岁了 = năm tuổi rồi.",
       ex=[("她五岁了。","Bé ấy năm tuổi rồi.")]),
 ],
 dialogues=[dict(title="Hỏi về gia đình", lines=[("A","你家有几口人？","Nhà bạn có mấy người?"),("B","我家有四口人。","Nhà mình có bốn người."),("A","你有女儿吗？","Bạn có con gái không?"),("B","有，她今年八岁了。","Có, năm nay bé tám tuổi rồi."),("A","你今年多大？","Năm nay bạn bao nhiêu tuổi?"),("B","我三十五岁。","Mình 35 tuổi.")])],
 notes=["Số 4 (四 sì) đọc gần 死 (chết) nên nhiều người Trung Quốc kiêng số 4; số 8 (八) được ưa thích.", "一 đứng một mình đọc yī; trước chữ thanh 4 đọc yí, trước thanh 1-2-3 đọc yì."],
)
T[6] = dict(
 goals=["Nói mình biết làm gì bằng 会.", "Khen món ăn bằng 很 + tính từ.", "Hỏi cách làm bằng 怎么."],
 grammar=[
  dict(title="Biết làm: 会", pattern="A 会 + động từ", explain="会 = biết (kỹ năng học được). Phủ định 不会. Câu hỏi: 你会…吗？",
       ex=[("我会说汉语。","Tôi biết nói tiếng Trung."),("妈妈不会写汉字。","Mẹ không biết viết chữ Hán.")]),
  dict(title="Câu tính từ: 很", pattern="Chủ ngữ + 很 + tính từ", explain="Tính từ làm vị ngữ không cần 是. Thường thêm 很 cho câu tự nhiên; 很 lúc này không mạnh như 'rất'.",
       ex=[("中国菜很好吃。","Món Trung Quốc ngon."),("汉字很难写。","Chữ Hán khó viết.")]),
  dict(title="Hỏi cách làm: 怎么", pattern="怎么 + động từ？", explain="怎么 = thế nào, cách nào. 这个字怎么读？ = chữ này đọc thế nào?",
       ex=[("这个字怎么读？","Chữ này đọc thế nào?"),("这个字怎么写？","Chữ này viết thế nào?")]),
 ],
 dialogues=[dict(title="Ở nhà bạn", lines=[("A","你会说汉语吗？","Bạn biết nói tiếng Trung không?"),("B","我会说一点儿。","Mình biết nói một chút."),("A","你会写汉字吗？","Bạn biết viết chữ Hán không?"),("B","我会写，这个字怎么读？","Mình biết viết. Chữ này đọc thế nào?"),("A","这个字读“菜”。我妈妈做的菜很好吃。","Chữ này đọc là 'cài'. Món mẹ mình nấu ngon lắm.")])],
 notes=["会 và 能 đều dịch 'có thể', nhưng 会 là biết do học (bơi, nói tiếng Trung), 能 là có khả năng/được phép (học ở bài 10).", "说话 = nói chuyện; 说汉语 = nói tiếng Trung."],
)
T[7] = dict(
 goals=["Hỏi và nói ngày tháng, thứ.", "Nói kế hoạch đi đâu làm gì.", "Lịch sự hỏi bằng 请问."],
 grammar=[
  dict(title="Ngày tháng", pattern="X 月 X 号 (日)，星期 X", explain="Thứ tự lớn đến nhỏ: năm → tháng → ngày → thứ. Nói chuyện dùng 号, viết dùng 日. Thứ Hai = 星期一 … thứ Bảy = 星期六, Chủ nhật = 星期日 / 星期天.",
       ex=[("今天几号？","Hôm nay ngày mấy?"),("今天十月九号，星期三。","Hôm nay ngày 9 tháng 10, thứ Tư.")]),
  dict(title="Danh từ thời gian đứng trước động từ", pattern="Chủ ngữ + thời gian + động từ (hoặc thời gian + chủ ngữ + …)", explain="Khác tiếng Việt, thời gian không đứng cuối câu: 我明天去 chứ không nói 我去明天.",
       ex=[("我明天去学校。","Mai tôi đến trường."),("明天我去学校看书。","Mai tôi đến trường đọc sách.")]),
  dict(title="Đi làm gì: 去 + nơi + việc", pattern="去 + địa điểm + động từ", explain="Liên động: đi đâu trước, làm gì sau.",
       ex=[("我去商店买东西。","Tôi đi cửa hàng mua đồ.")]),
 ],
 dialogues=[dict(title="Hỏi ngày", lines=[("A","请问，今天几号？","Cho hỏi, hôm nay ngày mấy?"),("B","今天九月一号。","Hôm nay ngày 1 tháng 9."),("A","今天星期几？","Hôm nay thứ mấy?"),("B","今天星期一。明天我去学校。","Hôm nay thứ Hai. Mai mình đến trường."),("A","你去学校做什么？","Bạn đến trường làm gì?"),("B","我去看书。","Mình đi đọc sách.")])],
 notes=["Chữ 号 trong ngày tháng đọc hào. 几号 = ngày mấy, 星期几 = thứ mấy.", "Thứ trong tuần của người Trung Quốc đếm từ thứ Hai = 一, khác tiếng Việt (thứ Hai = 2)."],
)
T[8] = dict(
 goals=["Nói mình muốn làm gì bằng 想.", "Hỏi giá bằng 多少钱.", "Dùng lượng từ 个, 块 và 这/那."],
 grammar=[
  dict(title="Muốn: 想", pattern="A 想 + động từ", explain="想 = muốn, định. Phủ định 不想.",
       ex=[("我想喝茶。","Tôi muốn uống trà."),("我不想吃米饭。","Tôi không muốn ăn cơm.")]),
  dict(title="Lượng từ", pattern="số / 这 / 那 + lượng từ + danh từ", explain="Giữa số đếm (hoặc 这, 那) và danh từ phải có lượng từ. 个 dùng chung nhiều nhất. Tiền dùng 块 (tệ). 两 dùng thay 二 trước lượng từ: 两个.",
       ex=[("这个杯子","cái cốc này"),("那个人","người kia"),("三个苹果","ba quả táo")]),
  dict(title="Hỏi giá: 多少钱", pattern="… 多少钱？ — … 块。", explain="多少 = bao nhiêu (số lớn hoặc không biết trước). 钱 = tiền.",
       ex=[("这个杯子多少钱？","Cái cốc này bao nhiêu tiền?"),("十块。","Mười tệ.")]),
 ],
 dialogues=[dict(title="Ở cửa hàng", lines=[("A","你好，我想买杯子。","Chào anh, tôi muốn mua cốc."),("B","这个杯子很好。","Cái cốc này tốt lắm."),("A","这个杯子多少钱？","Cái cốc này bao nhiêu tiền?"),("B","二十八块。","28 tệ."),("A","那个呢？","Còn cái kia?"),("B","那个十块。","Cái kia 10 tệ.")])],
 notes=["Ở Trung Quốc nói 块 khi mua bán; trên giá ghi 元 (yuán).", "Người ta trả tiền chủ yếu bằng điện thoại (WeChat Pay, Alipay)."],
)
T[9] = dict(
 goals=["Hỏi và nói vị trí bằng 在 + 哪儿.", "Nói nơi làm việc.", "Dùng 那儿 / 这儿 / 下面."],
 grammar=[
  dict(title="Ở đâu: 在", pattern="Người/vật + 在 + nơi chốn", explain="在 = ở. Hỏi: … 在哪儿？ 哪儿 đọc nǎr (âm r cuốn lưỡi).",
       ex=[("小猫在哪儿？","Con mèo ở đâu?"),("小猫在椅子下面。","Con mèo ở dưới ghế.")]),
  dict(title="Làm việc ở đâu: 在 + nơi + động từ", pattern="Chủ ngữ + 在 + nơi chốn + động từ", explain="Nơi xảy ra hành động đứng trước động từ: 在医院工作 = làm việc ở bệnh viện.",
       ex=[("我爸爸在医院工作。","Bố tôi làm việc ở bệnh viện."),("你儿子在哪儿工作？","Con trai bạn làm việc ở đâu?")]),
 ],
 dialogues=[dict(title="Tìm con chó", lines=[("A","我的小狗呢？","Con chó của mình đâu rồi?"),("B","你的小狗在那儿。","Con chó của bạn ở đằng kia."),("A","在哪儿？","Ở đâu?"),("B","在椅子下面。","Ở dưới ghế.")]),
            dict(title="Nghề nghiệp", lines=[("A","你爸爸在哪儿工作？","Bố bạn làm ở đâu?"),("B","他在医院工作，他是医生。","Bố mình làm ở bệnh viện, bố là bác sĩ.")])],
 notes=["儿化: 哪儿 nǎr, 那儿 nàr, 这儿 zhèr — chữ 儿 không đọc thành âm riêng mà cuốn lưỡi ở cuối.", "Người miền Nam Trung Quốc hay nói 哪里, 那里 thay cho 哪儿, 那儿."],
)
T[10] = dict(
 goals=["Xin phép bằng 能…吗.", "Tả vị trí: 上, 里, 前面, 后面.", "Nói 'có/không có' ở một chỗ."],
 grammar=[
  dict(title="Có thể: 能", pattern="A 能 + động từ (吗)？", explain="能 = có thể, được phép. 我能坐这儿吗？ = Tôi ngồi đây được không? Phủ định 不能.",
       ex=[("我能坐这儿吗？","Tôi ngồi đây được không?"),("这儿不能坐。","Chỗ này không được ngồi.")]),
  dict(title="Nơi chốn + 有 + vật", pattern="Nơi chốn + 有 + vật", explain="Nói 'ở chỗ nào có cái gì'. Phủ định 没有.",
       ex=[("桌子上有一本书。","Trên bàn có một quyển sách."),("杯子里没有水。","Trong cốc không có nước.")]),
  dict(title="Từ phương vị", pattern="Danh từ + 上 / 里 / 前面 / 后面 / 下面", explain="Phương vị đứng SAU danh từ (ngược tiếng Việt): 桌子上 = trên bàn.",
       ex=[("电脑在桌子上。","Máy tính ở trên bàn."),("学校后面有医院。","Sau trường có bệnh viện.")]),
  dict(title="和 nối danh từ", pattern="A 和 B", explain="和 = và, chỉ nối danh từ/đại từ, không nối hai câu.",
       ex=[("我和妈妈","tôi và mẹ")]),
 ],
 dialogues=[dict(title="Trong thư viện", lines=[("A","你好，我能坐这儿吗？","Chào bạn, mình ngồi đây được không?"),("B","能，请坐。","Được, mời ngồi."),("A","桌子上的电脑是你的吗？","Máy tính trên bàn là của bạn à?"),("B","不是，是我同学的。","Không phải, của bạn học mình."),("A","你的书呢？","Còn sách của bạn?"),("B","在我的杯子后面。","Ở sau cái cốc của mình.")])],
 notes=["请坐 = mời ngồi — câu lịch sự rất hay dùng.", "Lượng từ cho sách là 本: 一本书."],
)
T[11] = dict(
 goals=["Hỏi và nói giờ.", "Nói lúc nào làm gì bằng 什么时候.", "Dùng 前 = trước (thời gian)."],
 grammar=[
  dict(title="Giờ giấc", pattern="X 点 (X 分)", explain="点 = giờ, 分 = phút. 现在几点？ = bây giờ mấy giờ? 2 giờ nói 两点.",
       ex=[("现在几点？","Bây giờ mấy giờ?"),("现在两点十分。","Bây giờ 2 giờ 10 phút.")]),
  dict(title="Thời gian trước động từ", pattern="Chủ ngữ + thời điểm + động từ", explain="Giống bài 7: giờ giấc đặt trước động từ.",
       ex=[("我中午十二点吃饭。","Tôi ăn cơm lúc 12 giờ trưa."),("我们三点去看电影。","3 giờ chúng tôi đi xem phim.")]),
  dict(title="Khi nào: 什么时候", pattern="什么时候 + động từ？", explain="Hỏi thời điểm chung chung. Trả lời bằng ngày/giờ cụ thể.",
       ex=[("你什么时候回家？","Khi nào bạn về nhà?"),("我五点回家。","5 giờ tôi về nhà.")]),
  dict(title="Trước: 前", pattern="thời điểm + 前", explain="三点前 = trước 3 giờ.",
       ex=[("我六点前回家。","Tôi về nhà trước 6 giờ.")]),
 ],
 dialogues=[dict(title="Rủ xem phim", lines=[("A","现在几点？","Bây giờ mấy giờ rồi?"),("B","现在十一点。","Bây giờ 11 giờ."),("A","我们什么时候去看电影？","Khi nào mình đi xem phim?"),("B","下午三点，好吗？","3 giờ chiều nhé?"),("A","好。我们中午先吃饭。","Ừ. Trưa mình ăn cơm trước đã."),("B","好，你住在哪儿？","Ừ, bạn sống ở đâu?")])],
 notes=["Người Trung Quốc ăn trưa sớm, khoảng 11:30–12:00, và hay nghỉ trưa ngắn.", "两 (liǎng) dùng khi đếm '2 cái, 2 giờ'; 二 dùng khi đọc số."],
)
T[12] = dict(
 goals=["Hỏi thời tiết, sức khỏe bằng 怎么样.", "Nói 'quá…' bằng 太…了.", "Nói thời tiết nóng, lạnh, mưa."],
 grammar=[
  dict(title="Thế nào: 怎么样", pattern="… 怎么样？", explain="Hỏi đánh giá, tình trạng: 天气怎么样？ 身体怎么样？",
       ex=[("明天天气怎么样？","Mai thời tiết thế nào?"),("你身体怎么样？","Sức khỏe bạn thế nào?")]),
  dict(title="Quá: 太…了", pattern="太 + tính từ + 了", explain="Biểu thị mức độ quá cao, thường kèm cảm xúc. Nhớ có 了 ở cuối.",
       ex=[("今天太热了！","Hôm nay nóng quá!"),("这个太贵了。","Cái này đắt quá.")]),
  dict(title="Hơi tiêu cực: 不太", pattern="不太 + tính từ", explain="不太 = không … lắm, nói giảm nhẹ.",
       ex=[("今天不太冷。","Hôm nay không lạnh lắm.")]),
 ],
 dialogues=[dict(title="Gọi về nhà", lines=[("A","北京天气怎么样？","Thời tiết Bắc Kinh thế nào?"),("B","今天下雨，太冷了！","Hôm nay mưa, lạnh quá!"),("A","你身体怎么样？","Sức khỏe con thế nào?"),("B","我身体很好。","Con khỏe lắm."),("A","多喝水，多吃水果。","Uống nhiều nước, ăn nhiều hoa quả nhé.")])],
 notes=["贵 (guì) = đắt: không có trong danh sách HSK1 bài này nhưng rất hay dùng.", "Bắc Kinh mùa đông rất lạnh và khô, mùa hè nóng."],
)
T[13] = dict(
 goals=["Nói đang làm gì bằng 在 + động từ (+ 呢).", "Gợi ý bằng 吧.", "Nghe máy điện thoại: 喂."],
 grammar=[
  dict(title="Đang: 在 + động từ (呢)", pattern="Chủ ngữ + 在 + động từ (+ 呢)", explain="在 đứng trước động từ = đang. Có thể thêm 呢 ở cuối cho tự nhiên.",
       ex=[("你在做什么呢？","Bạn đang làm gì thế?"),("我在看电视呢。","Mình đang xem tivi.")]),
  dict(title="Gợi ý: 吧", pattern="Câu + 吧", explain="吧 cuối câu = nhé, đi — gợi ý hoặc đề nghị nhẹ nhàng.",
       ex=[("我们一起去吧。","Chúng mình cùng đi nhé."),("明天给我打电话吧。","Mai gọi điện cho mình nhé.")]),
  dict(title="Cũng: 也", pattern="Chủ ngữ + 也 + động từ", explain="也 đứng sau chủ ngữ, trước động từ. Không đặt 也 ở đầu câu.",
       ex=[("我也喜欢学习汉语。","Mình cũng thích học tiếng Trung.")]),
  dict(title="Cho: 给", pattern="给 + người + động từ", explain="给 + người đặt trước động từ: 给你打电话 = gọi điện cho bạn.",
       ex=[("我下午给你打电话。","Chiều mình gọi điện cho bạn.")]),
 ],
 dialogues=[dict(title="Cuộc gọi buổi tối", lines=[("A","喂，你在做什么呢？","Alo, bạn đang làm gì đấy?"),("B","我在学习汉语呢。","Mình đang học tiếng Trung."),("A","我也在学习汉语。","Mình cũng đang học tiếng Trung."),("B","明天上午我们一起学习吧。","Sáng mai mình cùng học nhé."),("A","好，明天给你打电话。","Được, mai mình gọi cho bạn.")])],
 notes=["Nghe máy người Trung Quốc nói 喂 (thường đọc wéi khi nghe điện thoại).", "睡觉 đọc shuìjiào — chữ 觉 ở đây là jiào, không phải jué."],
)
T[14] = dict(
 goals=["Kể việc đã làm bằng 了 sau động từ.", "Nói 'đều' bằng 都, 'một chút' bằng 一点儿.", "Khen đồ đẹp."],
 grammar=[
  dict(title="了 sau động từ: đã xong", pattern="Động từ + 了 + (số lượng) + tân ngữ", explain="了 đặt ngay sau động từ báo hành động đã xảy ra. Phủ định dùng 没(有) + động từ, bỏ 了.",
       ex=[("我买了一些苹果。","Tôi đã mua ít táo."),("我没买衣服。","Tôi không mua quần áo.")]),
  dict(title="Đều: 都", pattern="Chủ ngữ (số nhiều) + 都 + động từ/tính từ", explain="都 đứng sau chủ ngữ, tổng kết 'tất cả đều'.",
       ex=[("这些衣服都很漂亮。","Mấy bộ quần áo này đều đẹp."),("我们都是学生。","Chúng tôi đều là học sinh.")]),
  dict(title="Một chút: 一点儿", pattern="Động từ + 一点儿 + danh từ", explain="一点儿 đọc yìdiǎnr: một ít, một chút.",
       ex=[("我想喝一点儿水。","Tôi muốn uống chút nước.")]),
 ],
 dialogues=[dict(title="Đi mua sắm về", lines=[("A","你买了什么东西？","Bạn đã mua gì thế?"),("B","我买了一些衣服和苹果。","Mình mua ít quần áo và táo."),("A","这些衣服都很漂亮啊！","Mấy bộ này đều đẹp ghê!"),("B","谢谢！你想吃一点儿苹果吗？","Cảm ơn! Bạn muốn ăn chút táo không?"),("A","好啊。王先生什么时候回来？","Được đấy. Khi nào anh Vương về?"),("B","他开车去了，二十分钟后回来。","Anh ấy lái xe đi rồi, 20 phút nữa về.")])],
 notes=["先生 = ông, anh (lịch sự) hoặc chồng; 小姐 = cô (bài 12).", "啊 cuối câu làm câu cảm thán mềm hơn."],
)
T[15] = dict(
 goals=["Nhấn mạnh cách thức/thời gian bằng 是…的.", "Nói 'rất vui được quen'.", "Ôn toàn bộ HSK1 chuẩn bị thi."],
 grammar=[
  dict(title="Cấu trúc 是…的", pattern="Chủ ngữ + 是 + (thời gian / cách thức / nơi) + động từ + 的", explain="Dùng khi việc đã xảy ra rồi, muốn nhấn mạnh làm lúc nào, bằng cách nào, ở đâu.",
       ex=[("我是坐飞机来的。","Tôi đến bằng máy bay."),("你是什么时候来的？","Bạn đến lúc nào?"),("我是去年来的。","Tôi đến từ năm ngoái.")]),
  dict(title="Cùng nhau: 一起", pattern="A 和 B 一起 + động từ", explain="一起 đứng trước động từ. Đọc yìqǐ.",
       ex=[("我和朋友一起去饭店。","Tôi và bạn cùng đi nhà hàng.")]),
  dict(title="Rất vui được quen", pattern="认识你很高兴 / 很高兴认识你", explain="Hai cách nói đều đúng, dùng khi mới quen.",
       ex=[("认识你很高兴。","Rất vui được làm quen với bạn.")]),
 ],
 dialogues=[dict(title="Gặp ở sân bay", lines=[("A","你好！我叫李月。","Xin chào! Tôi là Lý Nguyệt."),("B","你好！认识你很高兴。","Chào bạn! Rất vui được quen bạn."),("A","你是什么时候来北京的？","Bạn đến Bắc Kinh lúc nào?"),("B","我是昨天来的。","Mình đến hôm qua."),("A","你是坐飞机来的吗？","Bạn đi máy bay đến à?"),("B","不是，我是坐火车来的。","Không, mình đi tàu hỏa đến."),("A","我们一起去饭店吃饭吧。","Mình cùng đi nhà hàng ăn cơm nhé."),("B","好，我们坐出租车去。","Được, mình đi taxi.")])],
 notes=["去年 (qùnián) = năm ngoái, 明年 = năm sau, 今年 = năm nay.", "Hết bài 15: làm tuần ôn và 2 đề thi thử trong app trước khi đăng ký thi."],
)
