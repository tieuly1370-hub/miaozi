/** Bài đọc hiểu do Miaozi tự soạn — chỉ dùng chữ đã học tới bài `upTo` (đã kiểm bằng scripts/v2/check_reading.mjs). */
export type RQ = { q: string; opts: string[]; a: number };
export type Passage = { id: string; upTo: number; level: 1 | 2 | 3; title: string; zh: string[]; vi: string; qs: RQ[] };

export const LESSON_PASSAGES: Passage[] = [
  { id: "r01", upTo: 1, level: 1, title: "Chào cô Vương", zh: ["王老师：大家好！", "学生：老师好！", "王老师：谢谢大家。", "学生：不客气。老师再见！", "王老师：同学们再见！"],
    vi: "Cô Vương chào cả lớp, học sinh chào lại, cô cảm ơn, học sinh nói không có gì rồi chào tạm biệt.",
    qs: [
      { q: "Ai nói “大家好”?", opts: ["Cô Vương", "Học sinh", "Bạn học", "Không ai"], a: 0 },
      { q: "Khi cô cảm ơn, học sinh đáp thế nào?", opts: ["再见", "不客气", "你好", "谢谢"], a: 1 },
      { q: "Cuối bài, mọi người làm gì?", opts: ["Hỏi tên", "Xin lỗi", "Chào tạm biệt", "Cảm ơn"], a: 2 },
    ] },
  { id: "r02", upTo: 2, level: 1, title: "Làm quen", zh: ["A：你好！请问，你叫什么名字？", "B：我叫王生。我是学生。", "A：我也是学生。我叫大同。认识你很高兴！", "B：认识你，我也很高兴。"],
    vi: "Hai bạn hỏi tên nhau: B tên Vương Sinh, A tên Đại Đồng, cả hai là học sinh và rất vui được quen nhau.",
    qs: [
      { q: "B tên là gì?", opts: ["大同", "王生", "王老师", "同学"], a: 1 },
      { q: "A làm gì?", opts: ["Giáo viên", "Học sinh", "Không nói", "Bác sĩ"], a: 1 },
      { q: "Hai người cảm thấy thế nào?", opts: ["Rất vui được quen nhau", "Xin lỗi nhau", "Không vui", "Bận"], a: 0 },
    ] },
  { id: "r03", upTo: 3, level: 1, title: "Chị gái tôi", zh: ["A：喂，你好！你是中国人吗？", "B：不是，我是泰国人。", "A：她是谁？", "B：她是我姐姐。她是中文老师。", "A：你姐姐工作忙吗？", "B：她很忙。我很想她。"],
    vi: "B là người Thái Lan. Người trong ảnh là chị gái B, dạy tiếng Trung, công việc rất bận; B rất nhớ chị.",
    qs: [
      { q: "B là người nước nào?", opts: ["Trung Quốc", "Pháp", "Thái Lan", "Việt Nam"], a: 2 },
      { q: "Chị gái B làm nghề gì?", opts: ["Giáo viên tiếng Trung", "Học sinh", "Bác sĩ", "Không có việc"], a: 0 },
      { q: "Công việc của chị thế nào?", opts: ["Không bận", "Rất bận", "Quá dễ", "Không biết"], a: 1 },
    ] },
  { id: "r04", upTo: 4, level: 1, title: "Gia đình tôi", zh: ["我家有五口人：爸爸、妈妈、哥哥、妹妹和我。", "哥哥今年二十岁，他是学生。", "妹妹今年八岁。", "我爸爸是老师，他有很多学生。", "你家有几口人？"],
    vi: "Nhà tôi có năm người. Anh trai 20 tuổi, là học sinh; em gái 8 tuổi; bố là giáo viên, có nhiều học trò.",
    qs: [
      { q: "Nhà “tôi” có mấy người?", opts: ["Bốn", "Năm", "Sáu", "Tám"], a: 1 },
      { q: "Anh trai bao nhiêu tuổi?", opts: ["8", "12", "20", "28"], a: 2 },
      { q: "Bố làm nghề gì?", opts: ["Học sinh", "Bác sĩ", "Giáo viên", "Không nói"], a: 2 },
    ] },
  { id: "r05", upTo: 5, level: 1, title: "Chủ nhật", zh: ["今天是十月八号，星期日。我休息。", "妈妈会做饭，她做饺子和面条儿。", "我很喜欢饺子。", "我哥哥有一个新电脑，真好看！", "我也想有一个新电脑。"],
    vi: "Hôm nay chủ nhật 8/10, tôi nghỉ. Mẹ làm sủi cảo và mì. Anh trai có máy tính mới rất đẹp, tôi cũng muốn có.",
    qs: [
      { q: "Hôm nay là thứ mấy?", opts: ["Thứ hai", "Thứ bảy", "Chủ nhật", "Thứ sáu"], a: 2 },
      { q: "Mẹ làm món gì?", opts: ["Bánh bao", "Sủi cảo và mì", "Cơm", "Sữa"], a: 1 },
      { q: "Anh trai có gì mới?", opts: ["Điện thoại", "Máy tính", "Con mèo", "Quần áo"], a: 1 },
    ] },
  { id: "r06", upTo: 6, level: 1, title: "Đi siêu thị", zh: ["明天我想去超市买东西。", "我想买一些牛奶和包子。", "超市那边有一个饭店，叫西安饭店。", "西安饭店的包子非常好吃。", "我们怎么去？我们坐出租车去。"],
    vi: "Mai tôi muốn đi siêu thị mua sữa và bánh bao. Cạnh siêu thị có nhà hàng Tây An, bánh bao rất ngon. Chúng tôi đi taxi.",
    qs: [
      { q: "Ngày mai “tôi” muốn đi đâu?", opts: ["Bệnh viện", "Siêu thị", "Trường học", "Rạp phim"], a: 1 },
      { q: "Muốn mua gì?", opts: ["Sữa và bánh bao", "Táo", "Quần áo", "Máy tính"], a: 0 },
      { q: "Đi bằng gì?", opts: ["Đi bộ", "Máy bay", "Taxi", "Tàu hỏa"], a: 2 },
    ] },
  { id: "r07", upTo: 7, level: 2, title: "Một ngày làm việc", zh: ["现在是早上七点。", "我八点上班，下午五点半下班。", "晚上我在家里看电影。", "明天我没有事，我想和姐姐去电影院看电影。", "我们下午三点见吧！"],
    vi: "Tôi đi làm lúc 8 giờ, tan lúc 5 rưỡi chiều, tối xem phim ở nhà. Mai rảnh, muốn cùng chị đi rạp, hẹn 3 giờ chiều.",
    qs: [
      { q: "Mấy giờ “tôi” đi làm?", opts: ["7 giờ", "8 giờ", "5 giờ rưỡi", "3 giờ"], a: 1 },
      { q: "Mấy giờ tan làm?", opts: ["5 giờ", "5 giờ rưỡi", "6 giờ rưỡi", "8 giờ"], a: 1 },
      { q: "Ngày mai hẹn gặp chị lúc mấy giờ?", opts: ["3 giờ chiều", "7 giờ sáng", "8 giờ tối", "Không hẹn"], a: 0 },
    ] },
  { id: "r08", upTo: 8, level: 2, title: "Con mèo nhỏ", zh: ["我家有一只小猫，它非常漂亮。", "今天早上我没看见它。", "它不在房间里，也不在桌子下。", "它在房间外。", "我爸爸是医生，他在医院工作，医院里病人很多。"],
    vi: "Nhà tôi có con mèo nhỏ rất đẹp. Sáng nay không thấy nó; nó không ở trong phòng, không dưới bàn, mà ở ngoài phòng. Bố tôi là bác sĩ.",
    qs: [
      { q: "Con mèo thế nào?", opts: ["Rất to", "Rất đẹp", "Bị ốm", "Rất già"], a: 1 },
      { q: "Cuối cùng con mèo ở đâu?", opts: ["Dưới bàn", "Trong phòng", "Ngoài phòng", "Ở bệnh viện"], a: 2 },
      { q: "Bố làm việc ở đâu?", opts: ["Trường học", "Bệnh viện", "Hiệu sách", "Siêu thị"], a: 1 },
    ] },
  { id: "r09", upTo: 9, level: 2, title: "Bạn tôi", zh: ["白天我在学校学习，晚上在家读书。", "我的朋友很喜欢唱歌，她唱歌非常好听。", "我家有一只狗，它喜欢和我玩。", "桌子上有三本书，椅子上有一个包。"],
    vi: "Ban ngày tôi học ở trường, tối đọc sách ở nhà. Bạn tôi hát rất hay. Nhà có con chó thích chơi với tôi. Trên bàn có 3 quyển sách.",
    qs: [
      { q: "Ban ngày “tôi” ở đâu?", opts: ["Ở nhà", "Ở trường", "Ở công ty", "Ở siêu thị"], a: 1 },
      { q: "Bạn hát thế nào?", opts: ["Rất hay", "Không hay", "Không hát", "Hát nhỏ"], a: 0 },
      { q: "Trên bàn có gì?", opts: ["Một cái túi", "Ba quyển sách", "Con chó", "Cái ti vi"], a: 1 },
    ] },
  { id: "r10", upTo: 10, level: 2, title: "Mua táo", zh: ["我去商店买水果。", "售货员：“这些苹果五块钱一斤，很便宜。”", "我想买两斤。", "商店那边也有衣服。我问：“这件衣服多少钱？”", "“三百元。”三百元太贵，我不买。"],
    vi: "Táo 5 đồng một cân, rẻ, tôi muốn mua 2 cân. Chiếc áo giá 300 đồng, quá đắt nên tôi không mua.",
    qs: [
      { q: "Táo giá bao nhiêu?", opts: ["5 đồng một cân", "3 đồng một cân", "300 đồng", "Không nói"], a: 0 },
      { q: "“Tôi” muốn mua mấy cân táo?", opts: ["Một", "Hai", "Năm", "Ba"], a: 1 },
      { q: "Vì sao không mua áo?", opts: ["Không đẹp", "Quá đắt", "Không vừa", "Hết tiền"], a: 1 },
    ] },
  { id: "r11", upTo: 11, level: 2, title: "Em trai học y", zh: ["我弟弟是大学生，他在大学学医。", "他早上七点起床，晚上十一点睡觉。", "昨天我问他：“你现在在做什么？”", "他说：“我正在找饭店，我想吃饺子。”"],
    vi: "Em trai tôi là sinh viên y, dậy 7 giờ, ngủ 11 giờ. Hôm qua em nói đang tìm nhà hàng vì muốn ăn sủi cảo.",
    qs: [
      { q: "Em trai học ngành gì?", opts: ["Tiếng Trung", "Y", "Lái xe", "Âm nhạc"], a: 1 },
      { q: "Em dậy lúc mấy giờ?", opts: ["6 giờ", "7 giờ", "11 giờ", "8 giờ"], a: 1 },
      { q: "Hôm qua em đang làm gì?", opts: ["Ngủ", "Tìm nhà hàng", "Lái xe", "Đọc sách"], a: 1 },
    ] },
  { id: "r12", upTo: 12, level: 3, title: "Trời lạnh", zh: ["昨天下雪了，天气很冷。", "今天下雨了，我觉得有点儿冷。", "我姐姐生病了，没去公司。", "她去医院看病，医生说：“多喝热水，吃一点儿药，休息两天。”"],
    vi: "Hôm qua tuyết rơi, hôm nay mưa, hơi lạnh. Chị tôi ốm, không đi làm; bác sĩ dặn uống nhiều nước nóng, uống chút thuốc, nghỉ hai ngày.",
    qs: [
      { q: "Hôm qua thời tiết thế nào?", opts: ["Nóng", "Tuyết rơi, lạnh", "Mưa", "Đẹp"], a: 1 },
      { q: "Chị gái làm sao?", opts: ["Bị ốm", "Đi làm muộn", "Đi chơi", "Đi mua sắm"], a: 0 },
      { q: "Bác sĩ dặn nghỉ mấy ngày?", opts: ["Một", "Hai", "Ba", "Không nghỉ"], a: 1 },
    ] },
  { id: "r13", upTo: 13, level: 3, title: "Bữa sáng", zh: ["早上我和妈妈去饭店吃早饭。", "服务员说：“女士，先生，请坐！你们要什么？”", "妈妈说：“请给我们两杯茶、两个鸡蛋和一个面包。”", "面包很大，我和妈妈一人一半。"],
    vi: "Sáng tôi và mẹ đi ăn sáng. Mẹ gọi hai cốc trà, hai quả trứng và một ổ bánh mì; bánh to nên mỗi người một nửa.",
    qs: [
      { q: "Họ đi ăn bữa nào?", opts: ["Bữa sáng", "Bữa trưa", "Bữa tối", "Không ăn"], a: 0 },
      { q: "Gọi mấy cốc trà?", opts: ["Một", "Hai", "Ba", "Bốn"], a: 1 },
      { q: "Bánh mì được chia thế nào?", opts: ["Mẹ ăn hết", "Mỗi người một nửa", "Mang về", "Không ăn"], a: 1 },
    ] },
  { id: "r14", upTo: 14, level: 3, title: "Trên tàu", zh: ["我妹妹是小学生，明年她上中学。", "她很喜欢汉语，会写很多汉字。", "昨天中午我们坐火车。", "火车上有些人在说话，有的人在睡觉。", "妹妹说：“不要说话，我在写汉字！”"],
    vi: "Em gái là học sinh tiểu học, năm sau lên trung học, thích tiếng Trung. Trên tàu em bảo mọi người đừng nói chuyện vì em đang viết chữ Hán.",
    qs: [
      { q: "Năm sau em gái sẽ thế nào?", opts: ["Lên trung học", "Lên đại học", "Đi làm", "Nghỉ học"], a: 0 },
      { q: "Hôm qua họ đi bằng gì?", opts: ["Máy bay", "Tàu hỏa", "Taxi", "Ô tô"], a: 1 },
      { q: "Em gái nói gì?", opts: ["Đừng nói chuyện", "Đi ngủ thôi", "Tôi đói", "Đến rồi"], a: 0 },
    ] },
  { id: "r15", upTo: 15, level: 3, title: "Bắc Kinh", zh: ["去年我和男朋友去北京。", "我们坐飞机去，要三个小时。", "北京非常好玩儿！", "明年我想和家人去西安。", "我男朋友说：“我去机场接你们。”"],
    vi: "Năm ngoái tôi và bạn trai đi Bắc Kinh bằng máy bay, mất 3 tiếng; Bắc Kinh rất vui. Năm sau tôi muốn cùng gia đình đi Tây An.",
    qs: [
      { q: "Năm ngoái họ đi đâu?", opts: ["Tây An", "Bắc Kinh", "Thái Lan", "Pháp"], a: 1 },
      { q: "Bay mất bao lâu?", opts: ["Một tiếng", "Hai tiếng", "Ba tiếng", "Năm tiếng"], a: 2 },
      { q: "Năm sau muốn đi đâu?", opts: ["Bắc Kinh", "Tây An", "Sân bay", "Siêu thị"], a: 1 },
    ] },
];

/** Bài đọc tổng hợp theo cấp (thư viện Đọc hiểu). */
export const EXTRA_PASSAGES: Passage[] = [
  { id: "x1", upTo: 5, level: 1, title: "Tổng hợp cấp 1: Nhà Đại Đồng", zh: ["我叫王大同，我是学生。", "我家有四口人：爸爸、妈妈、姐姐和我。", "我爸爸是中文老师，妈妈会做饭。", "今天星期日，爸爸妈妈休息。", "妈妈做饺子，我很喜欢。"],
    vi: "Đại Đồng là học sinh, nhà bốn người; bố dạy tiếng Trung, mẹ biết nấu ăn. Chủ nhật bố mẹ nghỉ, mẹ làm sủi cảo.",
    qs: [
      { q: "Nhà Đại Đồng có mấy người?", opts: ["Ba", "Bốn", "Năm", "Sáu"], a: 1 },
      { q: "Bố dạy môn gì?", opts: ["Tiếng Trung", "Tiếng Pháp", "Không dạy", "Toán"], a: 0 },
      { q: "Chủ nhật mẹ làm gì?", opts: ["Đi làm", "Làm sủi cảo", "Mua máy tính", "Ngủ"], a: 1 },
    ] },
  { id: "x2", upTo: 10, level: 2, title: "Tổng hợp cấp 2: Thứ bảy", zh: ["星期六上午，我和朋友去商店。", "商店里的东西很多。", "我朋友想买一件新衣服。", "那件衣服八百块，太贵，她不买。", "下午，我们去超市买水果和牛奶，晚上在家看电视。"],
    vi: "Sáng thứ bảy đi cửa hàng với bạn; áo 800 đồng đắt quá nên bạn không mua. Chiều đi siêu thị mua hoa quả, sữa; tối xem ti vi.",
    qs: [
      { q: "Khi nào họ đi cửa hàng?", opts: ["Sáng thứ bảy", "Tối chủ nhật", "Chiều thứ hai", "Hôm qua"], a: 0 },
      { q: "Chiếc áo giá bao nhiêu?", opts: ["80 đồng", "800 đồng", "300 đồng", "8 đồng"], a: 1 },
      { q: "Buổi tối họ làm gì?", opts: ["Xem ti vi ở nhà", "Đi siêu thị", "Hát", "Ngủ sớm"], a: 0 },
    ] },
  { id: "x3", upTo: 15, level: 3, title: "Tổng hợp cấp 3: Tiểu Nguyệt ở Bắc Kinh", zh: ["我叫小月，我是大学生，在北京学习汉语。", "去年九月我坐飞机来北京。", "北京十二月非常冷，常常下雪。", "我有很多中国朋友，他们都对我很好。", "明年我想去西安。"],
    vi: "Tiểu Nguyệt là sinh viên học tiếng Trung ở Bắc Kinh, đến từ tháng 9 năm ngoái bằng máy bay. Tháng 12 rất lạnh, hay có tuyết. Bạn Trung Quốc đối xử tốt. Năm sau muốn đi Tây An.",
    qs: [
      { q: "Tiểu Nguyệt học gì?", opts: ["Y", "Tiếng Trung", "Lái xe", "Hát"], a: 1 },
      { q: "Tháng 12 ở Bắc Kinh thế nào?", opts: ["Nóng", "Rất lạnh, hay có tuyết", "Mưa nhiều", "Đẹp"], a: 1 },
      { q: "Năm sau muốn đi đâu?", opts: ["Tây An", "Thái Lan", "Pháp", "Về nhà"], a: 0 },
    ] },
];

export const ALL_PASSAGES = [...LESSON_PASSAGES, ...EXTRA_PASSAGES];
