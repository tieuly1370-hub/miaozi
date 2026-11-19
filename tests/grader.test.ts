// node --experimental-strip-types tests/grader.test.ts
(globalThis as any).window = {};
import { gradeSentence, SENT_TASKS } from "../src/v2/grader.ts";
const cur = await import("../src/data/curriculum.ts");
let fail = 0;
const ok = (n: string, c: boolean, x = "") => { console.log((c ? "PASS " : "FAIL ") + n + (x ? " — " + x : "")); if (!c) fail++; };
const knownUpTo = (n: number) => { const s = new Set<string>(); for (const l of cur.LESSONS.slice(0, n)) { for (const w of l.words) for (const c of w.hanzi) s.add(c); for (const t of l.sentences) for (const c of t.hanzi) s.add(c); } return s; };
for (const [k, tasks] of Object.entries(SENT_TASKS)) {
  const known = knownUpTo(Number(k));
  for (const t of tasks) { const r = gradeSentence(t.example, t, known); ok(`Bài ${k} câu mẫu ${t.example}`, r.pass, r.bad.join(" | ")); }
}
const K = knownUpTo(19);
const T = (keys: string[]) => ({ keys, hint: "", example: "" });
const bad = (s: string, keys: string[], want: RegExp) => { const r = gradeSentence(s, T(keys), K); ok(`chặn: ${s}`, !r.pass && r.bad.some((b) => want.test(b)), r.bad.join(" | ")); };
bad("你是中国人吗什么", ["吗"], /cuối|từ để hỏi/);
bad("你叫什么名字吗？", ["叫"], /từ để hỏi/);
bad("我去超市明天", ["明天"], /thời gian/);
bad("我工作在医院", ["工作"], /在/);
bad("我有二个孩子", ["孩子"], /两/);
bad("我有三书", ["书"], /lượng từ/);
bad("我是很忙", ["忙"], /是/);
bad("我不很忙", ["忙"], /不很/);
bad("wo hen mang", ["忙"], /Chỉ gõ chữ Hán/);
bad("好", ["好"], /ngắn/);
bad("我很忙", ["老师"], /Thiếu từ khóa/);
ok("chấp nhận 我住在北京", gradeSentence("我住在北京。", T(["住"]), K).pass);
ok("chấp nhận 星期一我去学校", gradeSentence("星期一我去学校。", T(["星期"]), K).pass);
ok("chữ chưa học bị báo", !gradeSentence("老师好", T(["老师"]), new Set(["老", "师"])).pass);
console.log(fail ? `${fail} FAIL` : "ALL PASS"); process.exit(fail ? 1 : 0);
