/** "AI chấm câu" chạy trên máy: luật ngữ pháp HSK1 + từ khóa + chỉ dùng chữ đã học. Không gọi mạng. */
export interface SentTask { keys: string[]; hint: string; example: string; must?: { re: string; msg: string }[] }
export interface GradeResult { pass: boolean; ok: string[]; bad: string[]; tips: string[] }

const isHan = (c: string) => /[\u3400-\u9fff]/.test(c);
const TIME = ["今天", "明天", "昨天", "现在", "早上", "上午", "中午", "下午", "晚上", "今年", "明年", "去年", "星期", "白天"];
const VERBS = ["去", "看", "吃", "喝", "买", "做", "学习", "工作", "上班", "下班", "睡觉", "起床", "回", "来", "坐", "读", "写", "听", "说", "唱", "玩", "休息", "上课", "下课", "开车", "找", "打电话", "卖", "穿", "住", "接"];
const ADJ = ["忙", "高兴", "好", "大", "小", "冷", "热", "贵", "便宜", "漂亮", "好吃", "好看", "好听", "好玩儿", "新", "多", "少", "早", "晚"];
const QW = ["什么", "谁", "哪", "几", "多少", "怎么", "哪儿", "哪里"];
const NOUN_NEED_MW = ["书", "猫", "狗", "苹果", "衣服", "孩子", "儿子", "女儿", "杯子", "椅子", "桌子", "电脑", "手机", "朋友", "学生", "老师", "医生", "电影"];
const NUM = "两二三四五六七八九十几";

function stripPunct(s: string) { return s.replace(/[\s，。！？、,.!?；;：:“”"'（）()]/g, ""); }

export function gradeSentence(input: string, task: SentTask, known: Set<string>): GradeResult {
  const ok: string[] = [], bad: string[] = [], tips: string[] = [];
  const raw = (input || "").trim();
  const s = stripPunct(raw);
  if (!s) return { pass: false, ok, bad: ["Chưa nhập câu."], tips };
  if ([...s].some((c) => /[a-zA-Z0-9]/.test(c))) bad.push("Chỉ gõ chữ Hán (không gõ pinyin, chữ số). Bật bàn phím tiếng Trung (pinyin) để gõ.");
  const han = [...s].filter(isHan);
  if (han.length < 3) bad.push("Câu quá ngắn — cần ít nhất 3 chữ Hán.");
  // 1. từ khóa
  const missing = task.keys.filter((k) => !s.includes(k));
  if (missing.length) bad.push(`Thiếu từ khóa: ${missing.join("、")}.`); else ok.push(`Có đủ từ khóa ${task.keys.join("、")}.`);
  // 2. chỉ chữ đã học
  const unknown = [...new Set(han.filter((c) => !known.has(c)))];
  if (unknown.length) bad.push(`Dùng chữ chưa học: ${unknown.join(" ")}. Miao chỉ chấm câu dùng từ đã học.`); else if (han.length) ok.push("Chỉ dùng chữ đã học.");
  // 3. luật chung
  const maIdx = s.indexOf("吗");
  if (maIdx >= 0 && maIdx !== s.length - 1) bad.push("“吗” phải đứng cuối câu hỏi.");
  if (maIdx >= 0 && QW.some((q) => s.includes(q))) bad.push("Câu đã có từ để hỏi (什么/谁/哪/几/多少/怎么) thì không thêm “吗”.");
  if (maIdx >= 0 && /[^？?]$/.test(raw) && maIdx === s.length - 1) tips.push("Câu hỏi nên kết thúc bằng dấu “？”.");
  // che từ thời gian (去年, 下午…) để không nhận nhầm 去/下 là động từ
  let masked = s; for (const t of TIME.concat(["去年", "下次", "下个"])) masked = masked.split(t).join("＊".repeat(t.length));
  const firstVerb = Math.min(...VERBS.map((v) => { const i = masked.indexOf(v); return i < 0 ? Infinity : i; }));
  for (const t of TIME) {
    const i = s.indexOf(t);
    if (i >= 0 && firstVerb !== Infinity && i > firstVerb) { bad.push(`Từ chỉ thời gian “${t}” phải đặt trước động từ (vd: 我明天去超市).`); break; }
  }
  for (const v of VERBS) {
    if (v === "住" || v === "坐") continue; // 住在/坐在 là đúng
    if (new RegExp(v + "在").test(s)) { bad.push(`“在 + nơi chốn” đặt trước động từ: 我在医院工作, không nói 我工作在医院.`); break; }
  }
  if (/二(个|本|只|件|杯|口|块|斤)/.test(s)) bad.push("Trước lượng từ dùng “两”, không dùng “二” (两个, 两本).");
  for (const n of NOUN_NEED_MW) {
    const re = new RegExp(`[${NUM}]${n}`);
    if (re.test(s) && !new RegExp(`(星期|第)[${NUM}]${n}`).test(s)) { bad.push(`Thiếu lượng từ giữa số và “${n}” (vd: 三本书, 两个孩子, 一只猫).`); break; }
  }
  for (const a of ADJ) {
    const re = new RegExp(`是(很|太|非常)?${a}(?!的|学|饭|子|看|吃|听|玩|天|上|朋)`);
    if (re.test(s)) { bad.push(`Tính từ làm vị ngữ không cần “是”: 我很忙, không nói 我是很忙.`); break; }
  }
  if (/不很/.test(s)) bad.push("Thứ tự đúng là “很不…/不太…”, không nói “不很”.");
  if (/太.+了/.test(s) === false && /太(冷|热|贵|好|忙|大|小|多|少|好吃|漂亮)$/.test(s)) tips.push("Cảm thán “太…了”: thêm 了 ở cuối (太贵了).");
  // 4. mẫu của bài
  for (const m of task.must || []) {
    if (!new RegExp(m.re).test(s)) bad.push(m.msg);
  }
  if (!bad.length) ok.push("Trật tự câu hợp lệ theo các mẫu HSK1 đã học.");
  return { pass: bad.length === 0, ok, bad, tips };
}

/** Đề đặt câu theo bài (bài 1–19). */
export const SENT_TASKS: Record<number, SentTask[]> = {
  1: [
    { keys: ["老师"], hint: "Chào thầy/cô.", example: "老师好！" },
    { keys: ["谢谢"], hint: "Cảm ơn mọi người.", example: "谢谢大家！" },
    { keys: ["再见"], hint: "Chào tạm biệt bạn học.", example: "同学们再见！" },
  ],
  2: [
    { keys: ["叫", "名字"], hint: "Hỏi tên người khác.", example: "你叫什么名字？", must: [{ re: "什么", msg: "Câu hỏi tên cần “什么”." }] },
    { keys: ["是"], hint: "Nói bạn là / không là học sinh (主语 + 是 + 宾语).", example: "我不是老师，我是学生。" },
    { keys: ["认识", "高兴"], hint: "Nói rất vui được quen.", example: "认识你很高兴。" },
  ],
  3: [
    { keys: ["吗"], hint: "Hỏi ai đó có phải người Trung Quốc không (câu hỏi 吗).", example: "你是中国人吗？" },
    { keys: ["的"], hint: "Nói “X là ... của tôi” dùng 的.", example: "她是我的姐姐。" },
    { keys: ["谁"], hint: "Hỏi “đây là ai?”.", example: "这是谁？" },
  ],
  4: [
    { keys: ["有", "口"], hint: "Nói nhà bạn có mấy người.", example: "我家有四口人。" },
    { keys: ["几"], hint: "Hỏi số lượng nhỏ (dưới 10) bằng 几.", example: "你有几个孩子？" },
    { keys: ["岁"], hint: "Nói tuổi của ai đó.", example: "我哥哥今年二十岁。" },
  ],
  5: [
    { keys: ["今天", "星期"], hint: "Nói hôm nay thứ mấy.", example: "今天星期日。" },
    { keys: ["会"], hint: "Nói ai đó biết làm gì (会 + V).", example: "妈妈会做饭。" },
    { keys: ["喜欢"], hint: "Nói bạn thích gì.", example: "我喜欢饺子。" },
  ],
  6: [
    { keys: ["去", "哪儿"], hint: "Hỏi bạn đi đâu.", example: "你去哪儿？" },
    { keys: ["想", "买"], hint: "Nói muốn mua gì.", example: "我想买牛奶。" },
    { keys: ["怎么"], hint: "Hỏi đi bằng cách nào.", example: "我们怎么去？" },
  ],
  7: [
    { keys: ["点"], hint: "Nói mấy giờ bạn đi làm/tan làm (thời gian trước động từ).", example: "我八点上班。" },
    { keys: ["现在"], hint: "Hỏi bây giờ mấy giờ.", example: "现在几点？" },
    { keys: ["吧"], hint: "Rủ ai đó làm gì (…吧).", example: "我们去看电影吧！" },
  ],
  8: [
    { keys: ["在"], hint: "Nói ai đó làm việc ở đâu (在 + nơi + V).", example: "我爸爸在医院工作。" },
    { keys: ["能"], hint: "Nói có thể làm gì.", example: "我能去书店。" },
    { keys: ["只"], hint: "Nói nhà có một con mèo/chó.", example: "我家有一只猫。" },
  ],
  9: [
    { keys: ["本", "书"], hint: "Nói có mấy quyển sách.", example: "桌子上有三本书。" },
    { keys: ["和"], hint: "Nói làm gì cùng ai (和).", example: "我和朋友唱歌。" },
    { keys: ["喜欢", "玩"], hint: "Nói thích chơi với ai/cái gì.", example: "我的狗喜欢玩。" },
  ],
  10: [
    { keys: ["多少钱"], hint: "Hỏi giá.", example: "这件衣服多少钱？" },
    { keys: ["怎么样"], hint: "Hỏi ý kiến (…怎么样？).", example: "这个苹果怎么样？" },
    { keys: ["块"], hint: "Nói giá tiền.", example: "苹果五块钱一斤。" },
  ],
  11: [
    { keys: ["正在"], hint: "Nói ai đang làm gì (正在 + V).", example: "我正在找饭店。" },
    { keys: ["要"], hint: "Nói muốn/sắp làm gì (要 + V).", example: "我要去医院。" },
    { keys: ["知道"], hint: "Nói biết / không biết điều gì.", example: "我不知道他在哪儿。" },
  ],
  12: [
    { keys: ["了"], hint: "Nói thời tiết đã thay đổi (了 cuối câu).", example: "下雨了。" },
    { keys: ["太", "了"], hint: "Cảm thán 太…了.", example: "今天太冷了！", must: [{ re: "太.+了", msg: "Mẫu cảm thán là 太 + tính từ + 了." }] },
    { keys: ["觉得"], hint: "Nói bạn cảm thấy thế nào.", example: "我觉得有点儿冷。" },
  ],
  13: [
    { keys: ["可以"], hint: "Xin phép (可以 + V + 吗？).", example: "我可以坐这儿吗？" },
    { keys: ["一下"], hint: "Nhờ làm gì một chút (V + 一下).", example: "请问一下。" },
    { keys: ["给"], hint: "Đưa/cho ai cái gì (给 + người + vật).", example: "请给我一杯茶。" },
  ],
  14: [
    { keys: ["了"], hint: "Nói đã làm xong việc gì (V + 了).", example: "我看了一个电影。" },
    { keys: ["都"], hint: "Nói “đều”.", example: "他们都是学生。" },
    { keys: ["不要"], hint: "Bảo ai đừng làm gì.", example: "不要说话！" },
  ],
  15: [
    { keys: ["去年"], hint: "Kể năm ngoái bạn đi đâu.", example: "去年我去北京。" },
    { keys: ["坐", "飞机"], hint: "Nói đi bằng máy bay.", example: "我们坐飞机去西安。" },
    { keys: ["接"], hint: "Nói đi đón ai.", example: "我去机场接你。" },
  ],
  16: [
    { keys: ["下次"], hint: "Hẹn lần sau.", example: "下次我们一起吃饭吧。" },
    { keys: ["干什么"], hint: "Hỏi đang làm gì.", example: "你在楼上干什么？" },
    { keys: ["车票"], hint: "Nói về vé xe.", example: "我想买车票。" },
  ],
  17: [
    { keys: ["回家"], hint: "Nói mấy giờ về nhà.", example: "我晚上六点回家。" },
    { keys: ["有时候"], hint: "Nói “có lúc…”.", example: "我有时候在家看电视。" },
    { keys: ["是不是"], hint: "Hỏi “có phải … không”.", example: "你是不是学生？" },
  ],
  18: [
    { keys: ["里边"], hint: "Nói cái gì ở bên trong.", example: "房间里边有一只猫。" },
    { keys: ["请进"], hint: "Mời người khác vào.", example: "请进！请坐！" },
    { keys: ["找到"], hint: "Nói đã tìm thấy.", example: "我找到我的手机了。" },
  ],
  19: [
    { keys: ["钱包"], hint: "Nói về ví tiền.", example: "我的钱包在桌子上。" },
    { keys: ["听到"], hint: "Nói nghe thấy gì.", example: "我听到妈妈说话。" },
    { keys: ["网友"], hint: "Nói về bạn trên mạng.", example: "他是我的网友。" },
  ],
};
