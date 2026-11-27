# -*- coding: utf-8 -*-
"""HSK 2 — nguồn dữ liệu (Giáo trình chuẩn HSK 2 / HSK Standard Course 2, 15 bài).
Danh sách từ theo bài: github.com/joelypoley/hsk_standard_course_vocab (hsk_2.csv: New Word + từ ngoài đề cương +
từ ghép từ chữ đã học; bỏ tên riêng 花花, 杨笑笑). Nghĩa tiếng Việt và câu ví dụ do Miaozi tự soạn (không chép bài khoá).
Mỗi từ: (chữ, pinyin hiển thị, nghĩa Việt). Câu: (chữ, nghĩa Việt) — pinyin câu sinh bằng pinyin-pro rồi kiểm tay."""
LESSONS = [
 ("九月去北京旅游最好", "Tháng chín đi Bắc Kinh du lịch là đẹp nhất", [
  ("觉得","juéde","Cảm thấy, thấy rằng"),("旅游","lǚyóu","Du lịch"),("它","tā","Nó (chỉ vật, con vật)"),("踢足球","tī zúqiú","Đá bóng"),
  ("为什么","wèi shénme","Tại sao"),("新","xīn","Mới"),("眼睛","yǎnjing","Mắt"),("要","yào","Muốn, sẽ"),("也","yě","Cũng"),
  ("一起","yìqǐ","Cùng nhau"),("运动","yùndòng","Thể thao, vận động"),("最","zuì","Nhất")],
  [("我觉得九月去北京旅游最好。","Tôi thấy tháng chín đi Bắc Kinh du lịch là tốt nhất."),("你为什么不喜欢运动？","Tại sao bạn không thích vận động?"),("下午我们一起去踢足球。","Buổi chiều chúng ta cùng đi đá bóng.")]),
 ("我每天六点起床", "Mỗi ngày tôi thức dậy lúc sáu giờ", [
  ("出","chū","Ra"),("高","gāo","Cao"),("忙","máng","Bận"),("每","měi","Mỗi"),("跑步","pǎobù","Chạy bộ"),("起床","qǐchuáng","Thức dậy, ra khỏi giường"),
  ("身体","shēntǐ","Cơ thể, sức khỏe"),("生病","shēngbìng","Bị ốm"),("时间","shíjiān","Thời gian"),("休息","xiūxi","Nghỉ ngơi"),("药","yào","Thuốc"),
  ("早上","zǎoshang","Buổi sáng"),("知道","zhīdào","Biết"),("米","mǐ","Mét"),("出院","chūyuàn","Ra viện")],
  [("我每天早上六点起床。","Mỗi sáng tôi dậy lúc sáu giờ."),("他生病了，要吃药，多休息。","Anh ấy bị ốm, phải uống thuốc, nghỉ ngơi nhiều."),("你知道他什么时候出院吗？","Bạn có biết khi nào anh ấy ra viện không?")]),
 ("左边那个红色的是我的", "Cái màu đỏ bên trái là của tôi", [
  ("报纸","bàozhǐ","Báo (giấy)"),("房间","fángjiān","Phòng"),("红","hóng","Đỏ"),("牛奶","niúnǎi","Sữa bò"),("旁边","pángbiān","Bên cạnh"),
  ("千","qiān","Nghìn"),("手表","shǒubiǎo","Đồng hồ đeo tay"),("送","sòng","Tặng, đưa"),("颜色","yánsè","Màu sắc"),("一下","yíxià","Một chút, thử (sau động từ)"),
  ("丈夫","zhàngfu","Chồng"),("真","zhēn","Thật, thật là"),("左边","zuǒbian","Bên trái"),("粉色","fěnsè","Màu hồng"),("粉","fěn","Hồng (màu)"),("红色","hóngsè","Màu đỏ")],
  [("左边那个红色的手表是我的。","Chiếc đồng hồ màu đỏ bên trái là của tôi."),("你的房间是什么颜色的？","Phòng của bạn màu gì?"),("我丈夫每天早上看报纸。","Chồng tôi sáng nào cũng đọc báo.")]),
 ("这个工作是他帮我介绍的", "Công việc này là anh ấy giới thiệu giúp tôi", [
  ("长","cháng","Dài"),("非常","fēicháng","Rất, vô cùng"),("给","gěi","Cho, đưa cho"),("介绍","jièshào","Giới thiệu"),("开始","kāishǐ","Bắt đầu"),
  ("快乐","kuàilè","Vui vẻ"),("两","liǎng","Hai"),("生日","shēngrì","Sinh nhật"),("晚上","wǎnshang","Buổi tối"),("问","wèn","Hỏi"),
  ("已经","yǐjīng","Đã, rồi"),("接","jiē","Đón, nhận"),("帮","bāng","Giúp")],
  [("今天是我的生日，我非常快乐。","Hôm nay là sinh nhật tôi, tôi rất vui."),("这个工作是他帮我介绍的。","Công việc này là anh ấy giới thiệu giúp tôi."),("电影已经开始了。","Phim đã bắt đầu rồi.")]),
 ("就买这件吧", "Mua chiếc này đi", [
  ("吧","ba","Nhé, đi (trợ từ cuối câu)"),("对","duì","Đối với"),("还","hái","Còn, khá, vẫn"),("件","jiàn","Chiếc, cái (lượng từ áo, việc)"),("就","jiù","Thì, liền, chính là"),
  ("咖啡","kāfēi","Cà phê"),("考试","kǎoshì","Kỳ thi, thi"),("可以","kěyǐ","Được, khá ổn"),("意思","yìsi","Ý nghĩa"),("鱼","yú","Cá"),
  ("准备","zhǔnbèi","Chuẩn bị, định"),("以后","yǐhòu","Sau này, sau khi"),("不错","búcuò","Không tệ, khá tốt"),("外面","wàimiàn","Bên ngoài")],
  [("这件衣服还可以，就买这件吧。","Chiếc áo này cũng được, mua chiếc này đi."),("明天有考试，你准备好了吗？","Mai có bài thi, bạn chuẩn bị xong chưa?"),("外面很冷，我们喝杯咖啡吧。","Bên ngoài lạnh lắm, mình uống cốc cà phê nhé.")]),
 ("你怎么不吃了", "Sao bạn không ăn nữa?", [
  ("打篮球","dǎ lánqiú","Chơi bóng rổ"),("好吃","hǎochī","Ngon"),("姐姐","jiějie","Chị gái"),("门","mén","Cửa"),("面条","miàntiáo","Mì sợi"),
  ("所以","suǒyǐ","Cho nên"),("外","wài","Ngoài"),("羊肉","yángròu","Thịt cừu"),("因为","yīnwèi","Bởi vì"),("游泳","yóuyǒng","Bơi"),
  ("公斤","gōngjīn","Ki-lô-gam"),("经常","jīngcháng","Thường xuyên"),("自行车","zìxíngchē","Xe đạp")],
  [("因为下雨，所以我们没去游泳。","Vì trời mưa nên chúng tôi không đi bơi."),("我姐姐经常打篮球。","Chị tôi thường chơi bóng rổ."),("这儿的面条很好吃。","Mì ở đây rất ngon.")]),
 ("你家离公司远吗", "Nhà bạn có xa công ty không?", [
  ("到","dào","Đến"),("公共汽车","gōnggòng qìchē","Xe buýt"),("公司","gōngsī","Công ty"),("机场","jīchǎng","Sân bay"),("教室","jiàoshì","Phòng học"),
  ("快","kuài","Nhanh"),("离","lí","Cách (khoảng cách)"),("路","lù","Đường"),("慢","màn","Chậm"),("小时","xiǎoshí","Tiếng, giờ đồng hồ"),
  ("远","yuǎn","Xa"),("走","zǒu","Đi, đi bộ"),("过","guò","Qua, trải qua")],
  [("你家离公司远吗？","Nhà bạn có xa công ty không?"),("坐公共汽车到机场要一个小时。","Đi xe buýt đến sân bay mất một tiếng."),("我们走路去教室。","Chúng ta đi bộ đến phòng học.")]),
 ("让我想想再告诉你", "Để tôi nghĩ đã rồi nói với bạn", [
  ("白","bái","Trắng"),("等","děng","Đợi"),("服务员","fúwùyuán","Nhân viên phục vụ"),("告诉","gàosu","Nói cho biết"),("贵","guì","Đắt"),
  ("黑","hēi","Đen"),("让","ràng","Để, bảo, cho phép"),("事情","shìqing","Sự việc, chuyện"),("再","zài","Lại, rồi mới"),("找","zhǎo","Tìm")],
  [("让我想想再告诉你。","Để tôi nghĩ đã rồi nói với bạn."),("服务员，这个白的多少钱？","Phục vụ ơi, cái màu trắng này bao nhiêu tiền?"),("你等一下，我去找他。","Bạn đợi một chút, tôi đi tìm anh ấy.")]),
 ("题太多，我没做完", "Nhiều câu quá, tôi làm không xong", [
  ("从","cóng","Từ"),("错","cuò","Sai"),("第一","dì yī","Thứ nhất"),("懂","dǒng","Hiểu"),("上班","shàngbān","Đi làm"),
  ("题","tí","Câu hỏi, đề"),("跳舞","tiàowǔ","Nhảy múa"),("完","wán","Xong, hết"),("问题","wèntí","Vấn đề, câu hỏi"),("希望","xīwàng","Hy vọng"),("欢迎","huānyíng","Chào mừng")],
  [("题太多，我没做完。","Nhiều câu quá, tôi làm không xong."),("欢迎你来我们公司上班。","Chào mừng bạn đến công ty chúng tôi làm việc."),("我希望明天不下雨。","Tôi mong mai trời không mưa.")]),
 ("别找了，手机在桌子上呢", "Đừng tìm nữa, điện thoại ở trên bàn kìa", [
  ("帮助","bāngzhù","Giúp đỡ"),("别","bié","Đừng"),("哥哥","gēge","Anh trai"),("鸡蛋","jīdàn","Trứng gà"),("课","kè","Bài học, tiết học"),
  ("手机","shǒujī","Điện thoại di động"),("西瓜","xīguā","Dưa hấu"),("洗","xǐ","Rửa, giặt"),("正在","zhèngzài","Đang")],
  [("别找了，手机在桌子上呢。","Đừng tìm nữa, điện thoại ở trên bàn kìa."),("哥哥正在洗衣服。","Anh trai đang giặt quần áo."),("谢谢你的帮助。","Cảm ơn sự giúp đỡ của bạn.")]),
 ("他比我大三岁", "Anh ấy hơn tôi ba tuổi", [
  ("比","bǐ","So với, hơn"),("唱歌","chànggē","Hát"),("孩子","háizi","Đứa trẻ, con"),("可能","kěnéng","Có thể"),("男","nán","Nam"),
  ("女","nǚ","Nữ"),("便宜","piányi","Rẻ"),("去年","qùnián","Năm ngoái"),("说话","shuōhuà","Nói chuyện"),("姓","xìng","Họ, mang họ"),("右边","yòubian","Bên phải")],
  [("他比我大三岁。","Anh ấy hơn tôi ba tuổi."),("这个西瓜比那个便宜。","Quả dưa hấu này rẻ hơn quả kia."),("那个孩子姓什么？","Đứa bé kia họ gì?")]),
 ("你穿得太少了", "Bạn mặc ít quá", [
  ("穿","chuān","Mặc, đi (giày)"),("得","de","(trợ từ bổ ngữ trình độ)"),("弟弟","dìdi","Em trai"),("进","jìn","Vào"),("近","jìn","Gần"),
  ("零","líng","Số không"),("妻子","qīzi","Vợ"),("雪","xuě","Tuyết"),("度","dù","Độ")],
  [("今天零下五度，你穿得太少了。","Hôm nay âm năm độ, bạn mặc ít quá."),("我弟弟跑得很快。","Em trai tôi chạy rất nhanh."),("外面下雪了，快进来吧。","Bên ngoài tuyết rơi rồi, mau vào đi.")]),
 ("门开着呢", "Cửa đang mở", [
  ("宾馆","bīnguǎn","Khách sạn"),("铅笔","qiānbǐ","Bút chì"),("往","wǎng","Về phía, hướng"),("笑","xiào","Cười"),("着","zhe","Đang (trạng thái kéo dài)"),
  ("班","bān","Lớp"),("拿","ná","Cầm, lấy"),("一直","yìzhí","Thẳng, luôn luôn"),("长","zhǎng","Lớn lên, mọc"),("路口","lùkǒu","Ngã tư, giao lộ"),("手","shǒu","Tay")],
  [("门开着呢，请进。","Cửa đang mở, mời vào."),("一直往前走，到路口往右走。","Cứ đi thẳng, đến ngã tư thì rẽ phải."),("她笑着说：“谢谢！”","Cô ấy cười nói: “Cảm ơn!”")]),
 ("你看过那个电影吗", "Bạn đã xem bộ phim đó chưa?", [
  ("百","bǎi","Trăm"),("次","cì","Lần"),("但是","dànshì","Nhưng"),("晴","qíng","Nắng, quang đãng"),("虽然","suīrán","Mặc dù"),
  ("玩儿","wánr","Chơi"),("有意思","yǒu yìsi","Thú vị")],
  [("你看过那个电影吗？","Bạn đã xem bộ phim đó chưa?"),("虽然很贵，但是很有意思。","Tuy đắt nhưng rất thú vị."),("我去过北京两次。","Tôi đã đến Bắc Kinh hai lần.")]),
 ("新年就要到了", "Năm mới sắp đến rồi", [
  ("大家","dàjiā","Mọi người"),("火车站","huǒchēzhàn","Ga tàu hỏa"),("妹妹","mèimei","Em gái"),("票","piào","Vé"),("日","rì","Ngày"),
  ("阴","yīn","Âm u, nhiều mây"),("更","gèng","Càng, hơn nữa"),("新年","xīnnián","Năm mới")],
  [("新年就要到了。","Năm mới sắp đến rồi."),("我妹妹去火车站买票了。","Em gái tôi đi ga tàu mua vé rồi."),("明天是阴天，比今天更冷。","Mai trời âm u, lạnh hơn hôm nay.")]),
]

# Pinyin câu (gõ tay, theo cách viết giáo trình: tách theo từ, có biến điệu 不/一).
SENT_PY = {
 "我觉得九月去北京旅游最好。": "Wǒ juéde jiǔ yuè qù Běijīng lǚyóu zuì hǎo.",
 "你为什么不喜欢运动？": "Nǐ wèi shénme bù xǐhuan yùndòng?",
 "下午我们一起去踢足球。": "Xiàwǔ wǒmen yìqǐ qù tī zúqiú.",
 "我每天早上六点起床。": "Wǒ měi tiān zǎoshang liù diǎn qǐchuáng.",
 "他生病了，要吃药，多休息。": "Tā shēngbìng le, yào chī yào, duō xiūxi.",
 "你知道他什么时候出院吗？": "Nǐ zhīdào tā shénme shíhou chūyuàn ma?",
 "左边那个红色的手表是我的。": "Zuǒbian nàge hóngsè de shǒubiǎo shì wǒ de.",
 "你的房间是什么颜色的？": "Nǐ de fángjiān shì shénme yánsè de?",
 "我丈夫每天早上看报纸。": "Wǒ zhàngfu měi tiān zǎoshang kàn bàozhǐ.",
 "今天是我的生日，我非常快乐。": "Jīntiān shì wǒ de shēngrì, wǒ fēicháng kuàilè.",
 "这个工作是他帮我介绍的。": "Zhège gōngzuò shì tā bāng wǒ jièshào de.",
 "电影已经开始了。": "Diànyǐng yǐjīng kāishǐ le.",
 "这件衣服还可以，就买这件吧。": "Zhè jiàn yīfu hái kěyǐ, jiù mǎi zhè jiàn ba.",
 "明天有考试，你准备好了吗？": "Míngtiān yǒu kǎoshì, nǐ zhǔnbèi hǎo le ma?",
 "外面很冷，我们喝杯咖啡吧。": "Wàimiàn hěn lěng, wǒmen hē bēi kāfēi ba.",
 "因为下雨，所以我们没去游泳。": "Yīnwèi xià yǔ, suǒyǐ wǒmen méi qù yóuyǒng.",
 "我姐姐经常打篮球。": "Wǒ jiějie jīngcháng dǎ lánqiú.",
 "这儿的面条很好吃。": "Zhèr de miàntiáo hěn hǎochī.",
 "你家离公司远吗？": "Nǐ jiā lí gōngsī yuǎn ma?",
 "坐公共汽车到机场要一个小时。": "Zuò gōnggòng qìchē dào jīchǎng yào yí ge xiǎoshí.",
 "我们走路去教室。": "Wǒmen zǒulù qù jiàoshì.",
 "让我想想再告诉你。": "Ràng wǒ xiǎngxiang zài gàosu nǐ.",
 "服务员，这个白的多少钱？": "Fúwùyuán, zhège bái de duōshao qián?",
 "你等一下，我去找他。": "Nǐ děng yíxià, wǒ qù zhǎo tā.",
 "题太多，我没做完。": "Tí tài duō, wǒ méi zuòwán.",
 "欢迎你来我们公司上班。": "Huānyíng nǐ lái wǒmen gōngsī shàngbān.",
 "我希望明天不下雨。": "Wǒ xīwàng míngtiān bú xià yǔ.",
 "别找了，手机在桌子上呢。": "Bié zhǎo le, shǒujī zài zhuōzi shang ne.",
 "哥哥正在洗衣服。": "Gēge zhèngzài xǐ yīfu.",
 "谢谢你的帮助。": "Xièxie nǐ de bāngzhù.",
 "他比我大三岁。": "Tā bǐ wǒ dà sān suì.",
 "这个西瓜比那个便宜。": "Zhège xīguā bǐ nàge piányi.",
 "那个孩子姓什么？": "Nàge háizi xìng shénme?",
 "今天零下五度，你穿得太少了。": "Jīntiān líng xià wǔ dù, nǐ chuān de tài shǎo le.",
 "我弟弟跑得很快。": "Wǒ dìdi pǎo de hěn kuài.",
 "外面下雪了，快进来吧。": "Wàimiàn xià xuě le, kuài jìnlai ba.",
 "门开着呢，请进。": "Mén kāizhe ne, qǐng jìn.",
 "一直往前走，到路口往右走。": "Yìzhí wǎng qián zǒu, dào lùkǒu wǎng yòu zǒu.",
 "她笑着说：“谢谢！”": "Tā xiàozhe shuō: “Xièxie!”",
 "你看过那个电影吗？": "Nǐ kànguo nàge diànyǐng ma?",
 "虽然很贵，但是很有意思。": "Suīrán hěn guì, dànshì hěn yǒu yìsi.",
 "我去过北京两次。": "Wǒ qùguo Běijīng liǎng cì.",
 "新年就要到了。": "Xīnnián jiù yào dào le.",
 "我妹妹去火车站买票了。": "Wǒ mèimei qù huǒchēzhàn mǎi piào le.",
 "明天是阴天，比今天更冷。": "Míngtiān shì yīntiān, bǐ jīntiān gèng lěng.",
}
