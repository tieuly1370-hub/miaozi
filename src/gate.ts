/**
 * Cổng qua bài kiểm tra 4 kỹ năng riêng — chống đoán mò:
 * - Viết: nhìn nghĩa + nghe, viết lại từ trí nhớ (không pinyin, không nét mờ, không gợi ý).
 * - Nghe: nghe → chọn chữ trong 5 phương án gài (chữ na ná, cùng âm khác thanh); nghe câu → tự ghép chữ.
 * - Đọc: chữ → nghĩa (không pinyin), nghĩa → chữ trong chữ na ná; dịch câu Việt → ghép chữ có mảnh gài.
 * - Nói: chỉ hiện tiếng Việt, tự nói tiếng Trung, chấm phụ âm, vần, thanh từng âm tiết.
 */
import { pinyin as toPinyin } from "pinyin-pro";
import { ALL_WORDS, LESSONS, type Sentence, type Word } from "./data/curriculum";

export type GSkill = "listen" | "read" | "speak" | "write";
export const GSKILLS: GSkill[] = ["listen", "read", "speak", "write"];
export const SKILL_VI: Record<GSkill, string> = { listen: "Nghe", read: "Đọc", speak: "Nói", write: "Viết" };
export const PASS = 0.8;

export interface Opt { id: string; text: string; hanzi?: string }
interface Base { key: string; skill: GSkill; label: string; vi: string; answerHanzi: string; audio?: string; recheck?: boolean; wordId?: string }
export type Item =
  | (Base & { t: "write"; word: Word })
  | (Base & { t: "pick"; show?: string; prompt: string; options: Opt[]; answer: string; secs: number })
  | (Base & { t: "build"; prompt: string; chunks: string[]; answer: string[]; secs: number })
  | (Base & { t: "speak"; prompt: string; pinyinNum: string });

const isHan = (c: string) => /[\u3400-\u9fff]/.test(c);
export const han = (s: string) => [...s].filter(isHan).join("");

/* ---------- random ---------- */
export function shuffle<T>(a: T[]): T[] {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
}
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

/* ---------- chữ na ná (tự soạn, các cặp hay nhầm ở HSK1) ---------- */
const LOOK_GROUPS = [
  "我找钱", "你他们们", "们门问间闻", "大太犬天夫", "人入八", "日目白曰旦", "月用", "木本术禾", "土士王工干", "午牛年",
  "么公", "己已", "对时", "没设", "关美天", "系糸", "不还环否", "起赵", "是走题", "很银跟根", "吃叫吗", "喝渴", "见贝现",
  "汉叹双", "字学子孩", "看着目", "书节", "说话读谁请", "冷今令", "热执", "几儿九凡", "再在", "坐座", "做作昨", "下卜",
  "上止", "开升井", "买卖实", "东车", "西四酉", "电由甲申", "脑恼", "影景", "视现观", "机几", "家字", "名各", "什计",
  "老考孝", "师帅", "生先牛", "吗码妈", "北比此", "京哪就", "国图围", "呢尼泥", "同问司", "朋明", "友左右有", "中申",
  "口日回", "女如好", "儿元几", "岁梦", "今会令", "多夕名", "二三工", "四西", "五王", "六大", "七匕", "零冷", "百白自",
  "会今云", "菜采", "做故", "写与", "怎作", "号兮", "星生", "期其", "天夫无", "去云丢", "校交", "想相", "茶荼", "饭版",
  "商高", "店点占", "个介", "杯坏", "这还远", "少小", "块快", "那哪", "猫苗", "狗句", "椅倚", "面而", "医区", "院完",
  "爸爹", "桌真", "里理", "前剪", "后右", "能熊", "现视", "点店", "分今", "午干", "时对", "候侯", "回四", "影京", "住往注",
  "气乞", "样洋", "雨两", "姐组", "来未米", "身射", "体休本", "爱受", "些此", "果课", "水永", "喂畏", "也他地", "习刁",
  "睡锤", "觉见学", "喜嘉", "欢次", "给结", "打订", "话活", "吧把爸", "苹平", "先生", "车东", "衣农", "服报", "漂飘",
  "亮高", "啊阿", "都者", "认让", "识只", "高亮", "兴光", "听斤", "飞习", "火大", "站占", "谢射", "客各", "钟中", "分份",
];
const LOOK = new Map<string, string[]>();
for (const g of LOOK_GROUPS) {
  const cs = [...new Set([...g])];
  for (const c of cs) LOOK.set(c, [...new Set([...(LOOK.get(c) || []), ...cs.filter((x) => x !== c)])]);
}

/* ---------- chữ cùng âm khác thanh ---------- */
const CHAR_PY = new Map<string, string>();
for (const w of ALL_WORDS) {
  const cs = [...w.hanzi].filter(isHan);
  const sy = w.pinyinNum.split(/\s+/).filter(Boolean);
  if (cs.length === sy.length) cs.forEach((c, i) => { if (!CHAR_PY.has(c) || !/5$/.test(sy[i])) CHAR_PY.set(c, sy[i]); });
}
// Chữ thông dụng ngoài HSK1 — chỉ dùng làm phương án gài (cùng âm khác thanh, gần âm).
const EXTRA_CHARS = "泥腻拟妮逆你呢哈耗毫浩豪蒿嗨海害孩咳嗽刻课科渴可克棵颗磕喝河合盒贺鹤黑嘿很狠恨痕哼横衡红洪宏哄后厚候猴吼胡湖虎户护呼话化花华滑画划换欢环还缓黄皇慌谎晃灰回会汇毁惠婚混活火伙获或货基机鸡几急集级极即季记济计纪家加假价架驾坚间检减见件建江将讲降交教角脚叫较接街节结姐解界借今金紧近进经精景静久九酒旧就局句据聚觉绝军均开看康考靠科可客课空口哭苦块快宽况困拉来蓝篮懒浪老乐累冷离礼李里理力历立利例连练凉两亮辆聊了料林零领另留流六龙楼路旅绿乱妈麻马码骂吗买卖满慢忙猫毛冒么没每美妹门们米面民名明命摸末母木目拿哪那奶男南难脑闹内能你年念鸟您牛农努女暖爬怕拍排盘旁跑朋皮片漂票苹瓶破七期齐其奇骑起气汽千前钱墙桥巧亲轻清情请秋求球区取去全然让热人认日容肉如入三散色森沙山商上烧少绍社谁身深什神生声省师十时识实使始市事试是适室收手首受书叔舒熟数树双水睡顺说司丝死四送诉算虽岁孙所他她它台太谈汤糖躺讨特疼提题体天甜条跳铁听停通同头图土团推腿外完玩晚碗万王往忘望为位味喂温文问我握午五物误西希息习洗喜系细下夏先鲜现线香想向像小笑校些鞋写谢新心信星兴行醒姓休需许续选学雪呀牙眼演羊阳样药要爷也页夜一衣医宜已以意易因音银饮应影用游友有又右鱼雨语元园原远院月越云运再在早怎站张长找照者这真正知直只纸中钟种重周猪主住注祝准桌子字自总走租足嘴最昨左作坐座做";
for (const c of EXTRA_CHARS) {
  if (CHAR_PY.has(c)) continue;
  const p = (toPinyin(c, { toneType: "num", type: "array" }) as string[])[0];
  if (p) CHAR_PY.set(c, p.replace(/0$/, "5").replace(/v/g, "ü"));
}
const toneless = (s: string) => s.replace(/[0-9]/g, "");
function soundAlikes(c: string): string[] {
  const py = CHAR_PY.get(c);
  if (!py) return [];
  const base = toneless(py);
  const same: string[] = [];
  const near: string[] = [];
  for (const [ch, p] of CHAR_PY) {
    if (ch === c) continue;
    if (p === py) continue; // đồng âm cùng thanh: nghe không phân biệt được, không dùng làm phương án gài
    if (toneless(p) === base) same.push(ch);
    else if (toneless(p).slice(1) === base.slice(1) || toneless(p).slice(0, 2) === base.slice(0, 2)) near.push(ch);
  }
  return [...shuffle(same), ...shuffle(near)];
}

/** Biến thể sai đúng một chữ — đòi hỏi nhìn/nghe kỹ từng chữ, không đoán theo hình dáng chung. */
const pyOf = (s: string) => [...s].filter(isHan).map((c) => CHAR_PY.get(c) || c).join(" ");

export function variants(hanzi: string, mode: "look" | "sound" | "both", n: number, avoid: Set<string> = new Set()): string[] {
  const cs = [...hanzi];
  const target = pyOf(hanzi);
  const homophone = (s: string) => mode !== "look" && pyOf(s) === target;
  const out = new Set<string>();
  const idx = cs.map((c, i) => (isHan(c) ? i : -1)).filter((i) => i >= 0);
  for (let tries = 0; tries < 80 && out.size < n; tries++) {
    const i = pick(idx);
    const c = cs[i];
    const pool = mode === "look" ? LOOK.get(c) || [] : mode === "sound" ? soundAlikes(c) : [...(LOOK.get(c) || []), ...soundAlikes(c).slice(0, 4)];
    if (!pool.length) continue;
    const alt = [...cs];
    alt[i] = pick(pool.slice(0, 8));
    const s = alt.join("");
    if (s !== hanzi && !avoid.has(s) && !homophone(s)) out.add(s);
  }
  // Bù bằng từ thật cùng độ dài nếu chưa đủ
  const same = shuffle(ALL_WORDS.filter((w) => w.hanzi.length === hanzi.length && w.hanzi !== hanzi && !avoid.has(w.hanzi)));
  for (const w of same) { if (out.size >= n) break; if (!homophone(w.hanzi)) out.add(w.hanzi); }
  return [...out].slice(0, n);
}

/* ---------- tách câu thành mảnh ---------- */
const WORDSET = new Set(ALL_WORDS.map((w) => w.hanzi));
const MAXLEN = Math.max(...[...WORDSET].map((x) => x.length));
export function chunksOf(sentence: string): string[] {
  const s = han(sentence);
  const out: string[] = [];
  let i = 0;
  while (i < s.length) {
    let len = Math.min(MAXLEN, s.length - i);
    while (len > 1 && !WORDSET.has(s.slice(i, i + len))) len--;
    out.push(s.slice(i, i + len));
    i += len;
  }
  return out;
}

function buildItem(sen: Sentence, skill: "listen" | "read", key: string): Item {
  const answer = chunksOf(sen.hanzi);
  const avoid = new Set(answer);
  const wrong = new Set<string>();
  const ansPy = new Set(answer.map(pyOf));
  for (const c of shuffle(answer).slice(0, 3)) for (const v of variants(c, skill === "listen" ? "sound" : "look", 1, avoid)) if (!ansPy.has(pyOf(v)) || skill === "read") wrong.add(v);
  const extra = shuffle(ALL_WORDS.filter((w) => w.lesson <= sen.lesson && !avoid.has(w.hanzi) && w.hanzi.length <= 2 && !ansPy.has(pyOf(w.hanzi))));
  for (const w of extra) { if (wrong.size >= Math.max(3, Math.ceil(answer.length / 2))) break; wrong.add(w.hanzi); }
  const chunks = shuffle([...answer, ...wrong]);
  const secs = 25 + answer.length * 6;
  return skill === "listen"
    ? { key, skill, t: "build", label: sen.hanzi, vi: sen.vi, answerHanzi: han(sen.hanzi), audio: sen.id, prompt: "Nghe câu rồi ghép lại bằng chữ Hán. Có mảnh gài, không dùng hết.", chunks, answer, secs }
    : { key, skill, t: "build", label: sen.hanzi, vi: sen.vi, answerHanzi: han(sen.hanzi), prompt: `Dịch sang tiếng Trung: “${sen.vi}”`, chunks, answer, secs };
}

function hanziPick(w: Word, skill: "listen" | "read", key: string, recheck = false): Item {
  const opts = [w.hanzi, ...variants(w.hanzi, skill === "listen" ? "sound" : "look", 4, new Set([w.hanzi]))];
  const options = shuffle(opts).map((h, i) => ({ id: "o" + i + h, text: h, hanzi: h }));
  const answer = options.find((o) => o.hanzi === w.hanzi)!.id;
  return skill === "listen"
    ? { key, skill, t: "pick", label: w.hanzi, vi: w.vi, answerHanzi: w.hanzi, wordId: w.id, audio: w.id, prompt: "Nghe rồi chọn đúng chữ. Các phương án chỉ khác nhau một chữ hoặc một thanh.", options, answer, secs: 20, recheck }
    : { key, skill, t: "pick", label: w.hanzi, vi: w.vi, answerHanzi: w.hanzi, wordId: w.id, prompt: `Chữ nào nghĩa là “${w.vi}”? (${w.pos})`, options, answer, secs: 15, recheck };
}

function meaningPick(w: Word, key: string): Item {
  const lookWords = new Set<string>();
  for (const c of [...w.hanzi]) for (const x of LOOK.get(c) || []) ALL_WORDS.filter((y) => y.hanzi.includes(x)).forEach((y) => lookWords.add(y.vi));
  const unit = shuffle(ALL_WORDS.filter((y) => y.lesson === w.lesson).map((y) => y.vi));
  const near = shuffle(ALL_WORDS.filter((y) => y.lesson <= w.lesson + 1 && y.pos === w.pos).map((y) => y.vi));
  const vis = new Set<string>([w.vi]);
  for (const v of [...shuffle([...lookWords]), ...unit, ...near, ...shuffle(ALL_WORDS.map((y) => y.vi))]) {
    if (vis.size >= 5) break;
    if (v && !vis.has(v)) vis.add(v);
  }
  const options = shuffle([...vis]).map((v, i) => ({ id: "m" + i, text: v }));
  const answer = options.find((o) => o.text === w.vi)!.id;
  return { key, skill: "read", t: "pick", label: w.hanzi, vi: w.vi, answerHanzi: w.hanzi, wordId: w.id, show: w.hanzi, prompt: "Chữ này nghĩa là gì? (không có pinyin)", options, answer, secs: 12 };
}

function writeItem(w: Word, key: string, recheck = false): Item {
  return { key, skill: "write", t: "write", word: w, label: w.hanzi, vi: w.vi, answerHanzi: w.hanzi, wordId: w.id, audio: w.id, recheck };
}

function speakItem(prompt: string, hanzi: string, pinyinNum: string, audio: string, vi: string, key: string): Item {
  return { key, skill: "speak", t: "speak", prompt, pinyinNum: spokenPinyin(hanzi, pinyinNum), label: hanzi, vi, answerHanzi: han(hanzi), audio };
}

const wordSpeak = (w: Word, key: string) => {
  const n = han(w.hanzi).length;
  return speakItem(`Nói bằng tiếng Trung: “${w.vi}” (${w.pos}, ${n} chữ)`, w.hanzi, w.pinyinNum, w.id, w.vi, key);
};

/** Áp biến điệu để chấm theo cách đọc thật: 3+3 → 2+3, 不 trước thanh 4 → bú, 一 → yí / yì. */
export function spokenPinyin(hanzi: string, pinyinNum: string): string {
  const sy = pinyinNum.split(/\s+/).filter(Boolean);
  const cs = [...hanzi].filter(isHan);
  const tone = (s: string) => Number(s.match(/[1-5]$/)?.[0] || 5);
  const setT = (s: string, t: number) => s.replace(/[1-5]$/, "") + t;
  const aligned = cs.length === sy.length;
  for (let i = 0; i < sy.length - 1; i++) {
    const next = tone(sy[i + 1]);
    if (aligned && cs[i] === "不" && tone(sy[i]) === 4 && next === 4) sy[i] = setT(sy[i], 2);
    if (aligned && cs[i] === "一" && tone(sy[i]) === 1 && next !== 5) {
      const ordinal = i > 0 && cs[i - 1] === "第";
      if (!ordinal) sy[i] = setT(sy[i], next === 4 ? 2 : 4);
    }
  }
  for (let i = sy.length - 2; i >= 0; i--) {
    if (tone(sy[i]) === 3 && tone(sy[i + 1]) === 3) sy[i] = setT(sy[i], 2);
  }
  return sy.join(" ");
}

function prevWords(n: number): Word[] {
  return ALL_WORDS.filter((w) => w.lesson < n && han(w.hanzi).length > 0);
}

/** Chọn từ ôn lại ngẫu nhiên, ưu tiên từ đã từng sai. */
function recheckWords(n: number, count: number, mistakeIds: string[]): Word[] {
  const prev = prevWords(n);
  if (!prev.length) return [];
  const bad = shuffle(prev.filter((w) => mistakeIds.includes(w.id)));
  const rest = shuffle(prev.filter((w) => !mistakeIds.includes(w.id)));
  return [...bad.slice(0, Math.ceil(count / 2)), ...rest].slice(0, count);
}

/** Bài thi cổng cho 1 kỹ năng của bài n. */
export function gateItems(n: number, skill: GSkill, mistakeIds: string[] = []): Item[] {
  const les = LESSONS[n - 1];
  const W = les.words;
  const S = les.sentences;
  if (skill === "write") {
    const re = recheckWords(n, Math.min(6, Math.max(3, Math.round(W.length / 3))), mistakeIds);
    return shuffle([...W.map((w) => writeItem(w, "w:" + w.id)), ...re.map((w) => writeItem(w, "w:" + w.id, true))]);
  }
  if (skill === "listen") {
    const re = recheckWords(n, 3, mistakeIds);
    return [...shuffle([...W.map((w) => hanziPick(w, "listen", "lp:" + w.id)), ...re.map((w) => hanziPick(w, "listen", "lp:" + w.id, true))]), ...shuffle(S).map((s) => buildItem(s, "listen", "lb:" + s.id))];
  }
  if (skill === "read") {
    const half = shuffle(W).slice(0, Math.ceil(W.length / 2));
    return [
      ...shuffle(W.map((w) => meaningPick(w, "rm:" + w.id))),
      ...half.map((w) => hanziPick(w, "read", "rh:" + w.id)),
      ...shuffle(S).map((s) => buildItem(s, "read", "rb:" + s.id)),
    ];
  }
  // speak
  const nonNum = W.filter((w) => !/^[一二三四五六七八九十零百]$/.test(w.hanzi));
  const nums = W.filter((w) => /^[一二三四五六七八九十零百]$/.test(w.hanzi));
  const words = [...shuffle(nonNum), ...shuffle(nums).slice(0, 3)].slice(0, 14);
  const shortS = [...S].filter((s) => s.pinyinNum.split(/\s+/).length <= 6).sort((a, b) => a.pinyinNum.length - b.pinyinNum.length).slice(0, 2);
  return [
    ...shuffle(words).map((w) => wordSpeak(w, "s:" + w.id)),
    ...shortS.map((s) => speakItem(`Nói cả câu bằng tiếng Trung: “${s.vi}”`, s.hanzi, s.pinyinNum, s.id, s.vi, "ss:" + s.id)),
  ];
}

/** Kiểm tra cuối ca: sáng (nghe + đọc), tối (viết + nói), kiểm tra tuần (cả 4). */
export function checkItems(kind: "morning" | "evening" | "weekly", n: number, mistakeIds: string[] = []): Item[] {
  const unitWords = LESSONS[Math.max(1, Math.min(n, LESSONS.length)) - 1].words;
  const learned = ALL_WORDS.filter((w) => w.lesson <= n);
  const pool = (k: number) => shuffle([...shuffle(unitWords).slice(0, Math.ceil(k * 0.6)), ...recheckWords(n, k, mistakeIds)]).slice(0, k);
  const sens = shuffle(LESSONS.slice(0, n).flatMap((l) => l.sentences));
  if (kind === "morning") {
    const a = pool(4).map((w) => hanziPick(w, "listen", "lp:" + w.id));
    const b = sens.slice(0, 1).map((s) => buildItem(s, "listen", "lb:" + s.id));
    const c = pool(3).map((w) => meaningPick(w, "rm:" + w.id));
    const d = sens.slice(1, 2).map((s) => buildItem(s, "read", "rb:" + s.id));
    return [...a, ...b, ...c, ...d];
  }
  if (kind === "evening") {
    const ws = pool(5).map((w) => writeItem(w, "w:" + w.id, w.lesson < n));
    const sp = shuffle(learned.filter((w) => !/^[一二三四五六七八九十零百]$/.test(w.hanzi))).slice(0, 3).map((w) => wordSpeak(w, "s:" + w.id));
    return [...ws, ...sp];
  }
  const all = shuffle(learned);
  return [
    ...all.slice(0, 6).map((w) => hanziPick(w, "listen", "lp:" + w.id)),
    ...sens.slice(0, 1).map((s) => buildItem(s, "listen", "lb:" + s.id)),
    ...all.slice(6, 12).map((w) => meaningPick(w, "rm:" + w.id)),
    ...sens.slice(1, 2).map((s) => buildItem(s, "read", "rb:" + s.id)),
    ...all.slice(12, 20).map((w) => writeItem(w, "w:" + w.id, true)),
    ...shuffle(learned.filter((w) => !/^[一二三四五六七八九十零百]$/.test(w.hanzi))).slice(0, 3).map((w) => wordSpeak(w, "s:" + w.id)),
  ];
}

export interface SkillResult {
  skill: GSkill;
  total: number;
  first: number;
  /** Mục cuối cùng vẫn sai (trượt 2 lần). */
  failedTwice: Item[];
  wrongFirst: Item[];
  pass: boolean;
  score: number;
  pending?: string;
  why: string[];
}

/** Viết: lần đầu ≥ 80% VÀ mọi mục cuối cùng phải đúng (không mục nào trượt 2 lần). Kỹ năng khác: lần đầu ≥ 80%. */
export function judge(skill: GSkill, items: Item[], firstOk: Record<string, boolean>, finalOk: Record<string, boolean>, pending?: string): SkillResult {
  const its = items.filter((i) => i.skill === skill);
  const total = its.length;
  const first = its.filter((i) => firstOk[i.key]).length;
  const wrongFirst = its.filter((i) => !firstOk[i.key]);
  const failedTwice = its.filter((i) => !finalOk[i.key]);
  const score = total ? first / total : 0;
  const why: string[] = [];
  if (pending) why.push(pending);
  if (score < PASS) why.push(`Đúng ngay lần đầu ${first}/${total} = ${Math.round(score * 100)}%, cần ≥ ${PASS * 100}%.`);
  if (skill === "write" && failedTwice.length) why.push(`${failedTwice.length} chữ viết sai 2 lần: ${failedTwice.map((i) => i.answerHanzi).join(", ")}. Viết phải đúng 100%.`);
  const pass = !pending && total > 0 && score >= PASS && (skill !== "write" || failedTwice.length === 0);
  return { skill, total, first, failedTwice, wrongFirst, pass, score, pending, why };
}
