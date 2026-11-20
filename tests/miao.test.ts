// node --experimental-strip-types tests/miao.test.ts
import { createMiao, canPinTrigger, MIAO_RULES } from "../src/v2/miao.ts";
import { MIAO_LINES } from "../src/data/miaoLines.ts";
import { useLow, lowLeft } from "../src/v2/queue.ts";
let fail = 0;
const ok = (n: string, c: boolean, x = "") => { console.log((c ? "PASS " : "FAIL ") + n + (x ? " — " + x : "")); if (!c) fail++; };
const D = "2026-11-20";
{
  const m = createMiao();
  ok("Sai lần 1 → an ủi (quan_tam)", m.answer(false, D)?.group === "sai_lan_dau" && m.counters.wrong === 1);
  const s2 = m.answer(false, D);
  ok("Sai lần 2 → chửi vừa (kho_chiu)", s2?.group === "sai_lan_2" && s2.line.expr === "kho_chiu");
  const s3 = m.answer(false, D);
  ok("Sai lần 3 → chửi gắt (cuoi_khinh_bi)", s3?.group === "sai_lien_tuc" && s3.line.expr === "cuoi_khinh_bi");
  ok("Sai lần 4 vẫn chửi gắt", m.answer(false, D)?.group === "sai_lien_tuc");
  ok("Đúng → xoá chuỗi sai, đúng 1 câu thì im", m.answer(true, D) === null && m.counters.wrong === 0 && m.counters.right === 1);
  ok("Đúng 2 → khen nhẹ", m.answer(true, D)?.group === "dung_vai_lan");
  m.answer(true, D); const s4 = m.answer(true, D);
  ok("Đúng 4 → vẫn khen nhẹ", s4?.group === "dung_vai_lan" && s4.line.expr === "vui");
  const s5 = m.answer(true, D);
  ok("Đúng 5 → khen lớn (dac_y)", s5?.group === "dung_nhieu" && s5.line.expr === "dac_y");
  ok("Sai sau chuỗi đúng → xoá chuỗi đúng, là sai lần đầu (không chửi gắt)", m.answer(false, D)?.group === "sai_lan_dau" && m.counters.right === 0);
}
{
  const m = createMiao();
  m.answer(false, D); m.answer(false, D);
  ok("Sang ngày mới → đếm lại (sai đầu tiên của ngày là an ủi)", m.answer(false, "2026-11-21")?.group === "sai_lan_dau");
}
{
  const m = createMiao(); let prev = ""; let rep = 0;
  for (let i = 0; i < 300; i++) { const s = m.answer(false, D)!; if (i > 2 && s.line.id === prev) rep++; prev = s.line.id; }
  ok("Không lặp cùng một câu hai lần liền (300 lượt)", rep === 0);
  const m2 = createMiao({ rand: () => 0 }); m2.answer(false, D); m2.answer(false, D);
  const a = m2.answer(false, D)!.line.id, b = m2.answer(false, D)!.line.id;
  ok("Không lặp kể cả khi random luôn = 0", a !== b);
}
{
  const m = createMiao();
  ok("Xin nghỉ → luôn cà khịa (nghi_ngo)", m.event("xin_nghi", D)?.line.expr === "nghi_ngo");
  ok("Thành tích → khen lớn", m.event("thanh_tich", D)?.group === "dung_nhieu");
  ok("Cạn pin → nghi_ngo", m.event("can_pin", D)?.line.expr === "nghi_ngo");
}
{ // Cạn pin theo tuần
  let le = undefined as ReturnType<typeof useLow> | undefined;
  const days = [new Date(2026, 10, 16), new Date(2026, 10, 17), new Date(2026, 10, 18)];
  const fired: boolean[] = [];
  for (const d of days) { const b = lowLeft(le || undefined, d); le = useLow(le || undefined, d)!; fired.push(canPinTrigger(b, lowLeft(le, d))); }
  ok("Cạn pin: chỉ lượt thứ 3 của tuần mới kích hoạt", JSON.stringify(fired) === "[false,false,true]");
  const d4 = new Date(2026, 10, 18);
  ok("Chọn lại cùng ngày lượt 3 → không kích hoạt lần nữa", !canPinTrigger(lowLeft(le!, d4), lowLeft(useLow(le!, d4)!, d4)));
  const mon = new Date(2026, 10, 23);
  ok("Sang thứ Hai → reset 3 lượt, lượt 1 không kích hoạt", lowLeft(le!, mon) === 3 && !canPinTrigger(3, lowLeft(useLow(le!, mon)!, mon)));
}
{
  const groups = ["sai_lien_tuc", "sai_lan_2", "can_pin", "xin_nghi", "sai_lan_dau", "dung_nhieu", "dung_vai_lan"];
  ok("Mỗi nhóm ≥ 20 câu", groups.every((g) => MIAO_LINES.filter((l) => l.group === g).length >= 20));
  ok("Không có chữ Hán trong lời thoại", !MIAO_LINES.some((l) => /[\u3400-\u9fff]/.test(l.text)));
  ok("Mã câu không trùng", new Set(MIAO_LINES.map((l) => l.id)).size === MIAO_LINES.length);
  ok("Mọi luật có câu thoại", MIAO_RULES.every((r) => MIAO_LINES.some((l) => l.group === r.group)));
  ok("Câu của chủ giữ nguyên văn", MIAO_LINES.some((l) => l.text === "Không hổ là sen của tôi!") && MIAO_LINES.some((l) => l.text === "Não hôm nay nghỉ phép rồi à?"));
}
console.log(fail ? `${fail} FAIL` : "ALL PASS"); if (fail) process.exit(1);
