// node --experimental-strip-types tests/queue.test.ts
import * as q from "../src/v2/queue.ts";
let fail = 0;
const ok = (name: string, cond: boolean, extra = "") => { console.log((cond ? "PASS " : "FAIL ") + name + (extra ? " — " + extra : "")); if (!cond) fail++; };
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Kịch bản 1
{
  let sec: q.SecMap = {};
  const d1 = new Date(2026, 10, 18); // Thứ 4
  let le = q.useLow(undefined, d1)!;
  ok("KB1: Cạn pin sáng đúng 1 mục (S2)", eq(q.activeSections("low", sec, false), ["s2"]));
  sec.s2 = { done: true };
  ok("KB1: xong S2 = 25%", q.percent(sec) === 25);
  ok("KB1: còn 2/3 lượt", q.lowLeft(le, d1) === 2 && q.LOW_LABEL(q.lowLeft(le, d1)) === "🔋 Cạn pin 15p (Còn 2/3 lượt tuần này)");
  ok("KB1: hôm sau Tiêu chuẩn sáng S3+S4", eq(q.activeSections("standard", sec, false), ["s3", "s4"]));
  ok("KB1: kết thúc 70%", q.percentAfter("standard", sec, false) === 70);
}
// Kịch bản 2
{
  const sec: q.SecMap = {};
  ok("KB2: Công ty sáng S2,S3,6A", eq(q.activeSections("company", sec, true), ["s2", "s3", "s6a"]));
  ok("KB2: Công ty tối đa 57.5%", q.percentAfter("company", sec, false) === 57.5);
  sec.s2 = { done: true }; sec.s3 = { done: true };
  ok("KB2: trưa xong S2+S3 = 50%", q.percent(sec) === 50);
  ok("KB2: tối Cạn pin sáng S4", eq(q.activeSections("low", sec, false), ["s4"]));
  ok("KB2: đạt 70%", q.percentAfter("low", sec, false) === 70);
  const today = new Date(2026, 10, 19);
  const studied = new Set(["2026-11-17", "2026-11-18", "2026-11-19"]);
  ok("KB2: chuỗi giữ nguyên (3 ngày)", q.streakFrom(studied, new Set(), today) === 3);
}
// Kịch bản 3
{
  const sec: q.SecMap = { s2: { done: true }, s3: { done: true }, s4: { done: true }, s5: { done: true } };
  ok("KB3: Tiêu chuẩn 85%", q.percent(sec) === 85);
  sec.s6a = { done: true }; // 6A đạt ≥80% nhưng sai 2 từ → có lỗi phạt
  ok("KB3: hôm sau Bứt phá sáng S1 + 6B", eq(q.activeSections("burst", sec, true), ["s1", "s6b"]));
  sec.s6b = { done: true };
  ok("KB3: xong = 100%", q.percent(sec) === 100 && q.lessonComplete(sec));
  ok("KB3: mở bài sau", q.unlocksNext(sec, "2026-11-20"));
}
// Cạn pin: giới hạn & reset thứ 2
{
  const mon = new Date(2026, 10, 16), tue = new Date(2026, 10, 17), wed = new Date(2026, 10, 18), thu = new Date(2026, 10, 19), nextMon = new Date(2026, 10, 23);
  let le = q.useLow(undefined, mon)!;
  le = q.useLow(le, mon)!;
  ok("Cạn pin: chọn lại trong cùng ngày không trừ thêm", le.count === 1);
  le = q.useLow(le, tue)!; le = q.useLow(le, wed)!;
  ok("Cạn pin: dùng 3 lượt → còn 0", q.lowLeft(le, wed) === 0);
  ok("Cạn pin: lượt thứ 4 bị chặn", q.useLow(le, thu) === null);
  ok("Cạn pin: thông báo hết lượt đúng nguyên văn", q.LOW_EMPTY_MSG === "Bạn đã dùng hết 3 lượt Cạn pin tuần này, hãy chọn Tiêu chuẩn hoặc Chế độ Công ty nhé!");
  ok("Cạn pin: Chủ nhật vẫn cùng tuần", q.lowLeft(le, new Date(2026, 10, 22)) === 0);
  ok("Cạn pin: reset thứ 2", q.lowLeft(le, nextMon) === 3 && q.useLow(le, nextMon)!.count === 1);
  ok("mondayOf CN", q.mondayOf(new Date(2026, 10, 22)) === "2026-11-16" && q.sundayOf(mon) === "2026-11-22");
}
// Nợ & chuỗi
{
  const sec: q.SecMap = { s2: { done: true }, s3: { done: true }, s4: { done: true }, s6a: { done: true }, s6b: { done: true }, s5: { owed: { at: 0, due: "2026-11-22", reason: "mic hỏng" } } };
  ok("Nợ trong hạn: mở bài sau", q.unlocksNext(sec, "2026-11-20"));
  ok("Nợ quá hạn: khoá lại", !q.unlocksNext(sec, "2026-11-23"));
  ok("Nợ vẫn là chưa xong (95%)", q.percent(sec) === 85 && q.pending(sec).includes("s5"));
  const today = new Date(2026, 10, 19);
  ok("Chuỗi: ngày bận không đứt", q.streakFrom(new Set(["2026-11-17", "2026-11-19"]), new Set(["2026-11-18"]), today) === 2);
  ok("Chuỗi: hôm nay chưa học chưa đứt", q.streakFrom(new Set(["2026-11-18"]), new Set(), today) === 1);
  ok("Chuỗi: cộng chuỗi cũ 1.2", q.streakFrom(new Set(["2026-11-19"]), new Set(), today, { count: 4, date: "2026-11-18" }) === 5);
}
console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);
