// node --experimental-strip-types tests/merge.test.ts
import { mergeDocs } from "../src/sync/merge.ts";
let fail = 0;
const ok = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fail++; };
const A = { app: "miaozi" as const, v: 1 as const, at: 100, data: {
  settings: { displayName: "A" }, progress: {}, streak: { count: 3, best: 5 }, onboarded: true,
  srs: { c1: { id: "c1", last: 10, reps: 1 }, c2: { id: "c2", last: 50, reps: 3 } },
  mistakes: [{ id: "m1", hanzi: "你", at: 1, times: 1 }], sessions: [], notes: { 1: { lesson: 1, strokes: [1], updatedAt: 5 } },
  penalties: [{ id: "p1", done: false, written: { 你: 2 } }],
  v2: { lesson: 2, sec: { 1: { s2: { done: true, at: 3 } } }, sub: { 1: { vocabSeen: ["a"], dialog: false } }, days: { "2026-11-18": { modes: [], ms: 100, secs: ["s2"], tests: [] } }, busy: ["2026-11-17"], tests: {}, low: { week: "2026-11-16", count: 1, days: ["2026-11-16"] }, skillLog: [] },
} };
const B = { app: "miaozi" as const, v: 1 as const, at: 200, data: {
  settings: { displayName: "B" }, progress: {}, streak: { count: 1, best: 7 }, onboarded: false,
  srs: { c1: { id: "c1", last: 20, reps: 2 }, c2: { id: "c2", last: 40, reps: 2 } },
  mistakes: [{ id: "m2", hanzi: "好", at: 2, times: 2 }], sessions: [], notes: { 1: { lesson: 1, strokes: [2], updatedAt: 3 } },
  penalties: [{ id: "p1", done: true, written: { 你: 1, 好: 3 } }, { id: "p2", done: false }],
  v2: { lesson: 1, sec: { 1: { s3: { done: true, at: 4 } } }, sub: { 1: { vocabSeen: ["b"], dialog: true } }, days: { "2026-11-18": { modes: [], ms: 50, secs: ["s3"], tests: [] }, "2026-11-19": { modes: [], ms: 1, secs: ["s4"], tests: [] } }, busy: ["2026-11-19"], tests: {}, low: { week: "2026-11-16", count: 1, days: ["2026-11-17"] }, skillLog: [] },
} };
const m = mergeDocs(A, B).data as any;
ok("settings: bản mới hơn thắng", m.settings.displayName === "B");
ok("streak: lấy max", m.streak.count === 3 && m.streak.best === 7);
ok("srs: lần ôn gần nhất thắng", m.srs.c1.last === 20 && m.srs.c2.last === 50);
ok("mistakes: hợp", m.mistakes.length === 2);
ok("notes: updatedAt mới hơn thắng", m.notes[1].strokes[0] === 1);
ok("penalties: xong thắng, số lần viết max", m.penalties.find((p: any) => p.id === "p1").done && m.penalties.find((p: any) => p.id === "p1").written.你 === 2 && m.penalties.length === 2);
ok("v2.sec: hợp các mục đã xong", m.v2.sec[1].s2.done && m.v2.sec[1].s3.done);
ok("v2.lesson: max", m.v2.lesson === 2);
ok("v2.sub: mảng hợp, cờ OR", m.v2.sub[1].vocabSeen.length === 2 && m.v2.sub[1].dialog === true);
ok("v2.days: hợp theo ngày", m.v2.days["2026-11-18"].secs.length === 2 && !!m.v2.days["2026-11-19"]);
ok("busy (Xin nghỉ): hợp", m.v2.busy.length === 2);
ok("Cạn pin cùng tuần: hợp ngày", m.v2.low.days.length === 2);
ok("không có bản Drive → giữ nguyên", mergeDocs(A, null) === A);
// v2.2.2: xoá chép phạt / bắt đầu lại không bị Drive kéo dữ liệu cũ trở lại
const localCleared = { app: "miaozi" as const, v: 1 as const, at: 400, data: {
  settings: { displayName: "Local" }, progress: {}, streak: { count: 2, best: 2 }, onboarded: true,
  srs: {}, mistakes: [], sessions: [], notes: {},
  penalties: [],
  v2: { lesson: 2, sec: {}, sub: {}, days: {}, busy: [], tests: {}, low: { week: "2026-11-16", count: 0, days: [] }, skillLog: [], penaltiesClearedAt: 1000 },
} };
const remotePending = { app: "miaozi" as const, v: 1 as const, at: 300, data: {
  settings: { displayName: "Remote" }, progress: {}, streak: { count: 2, best: 2 }, onboarded: true,
  srs: {}, mistakes: [], sessions: [], notes: {},
  penalties: [
    { id: "old", done: false, createdAt: 100, copies: 3 },
    { id: "kept-new", done: false, createdAt: 2000, copies: 1 },
    { id: "kept-done", done: true, createdAt: 50, copies: 2 },
  ],
  v2: { lesson: 2, sec: {}, sub: {}, days: {}, busy: [], tests: {}, low: { week: "2026-11-16", count: 0, days: [] }, skillLog: [] },
} };
const cleared = mergeDocs(localCleared, remotePending).data as any;
ok("clearedAt mới hơn: bỏ phạt đang nợ cũ trên Drive", !cleared.penalties.some((p: any) => p.id === "old"));
ok("clearedAt: giữ phạt tạo sau mốc xoá", cleared.penalties.some((p: any) => p.id === "kept-new"));
ok("clearedAt: giữ phạt đã xong", cleared.penalties.some((p: any) => p.id === "kept-done"));
ok("clearedAt: ghi mốc lớn hơn lên bản gộp", cleared.v2.penaltiesClearedAt === 1000);

const afterReset = { app: "miaozi" as const, v: 1 as const, at: 500, data: {
  settings: { displayName: "Sau reset", companyMode: true }, progress: {}, streak: { count: 1, best: 1 }, onboarded: true,
  srs: { n: { id: "n", last: 900, reps: 1 } }, mistakes: [], sessions: [], notes: {},
  penalties: [],
  v2: { lesson: 1, sec: {}, sub: {}, days: { "2026-11-20": { modes: [], ms: 10, secs: ["s2"], tests: [] } }, busy: [], tests: {}, low: { week: "2026-11-16", count: 0, days: [] }, skillLog: [], resetAt: 2000 },
} };
const oldDrive = { app: "miaozi" as const, v: 1 as const, at: 800, data: {
  settings: { displayName: "Bản Drive cũ" }, progress: { "1": { done: true } }, streak: { count: 9, best: 12 }, onboarded: true,
  srs: { c9: { id: "c9", last: 10, reps: 5 } }, mistakes: [{ id: "m9", hanzi: "你", at: 1, times: 1 }], sessions: [], notes: {},
  penalties: [{ id: "p-old", done: false, createdAt: 50, copies: 5 }],
  v2: { lesson: 8, sec: { 1: { s2: { done: true, at: 3 } } }, sub: {}, days: { "2026-11-18": { modes: [], ms: 999, secs: ["s6a"], tests: [] } }, busy: ["2026-11-17"], tests: {}, low: { week: "2026-11-16", count: 1, days: ["2026-11-16"] }, skillLog: [], resetAt: 1000 },
} };
const reset = mergeDocs(afterReset, oldDrive).data as any;
ok("resetAt mới hơn: không lấy lại streak cũ trên Drive", reset.streak.count === 1 && reset.streak.best === 1);
ok("resetAt mới hơn: không lấy lại thẻ ôn / lỗi / phạt cũ", !reset.srs.c9 && reset.mistakes.length === 0 && reset.penalties.length === 0);
ok("resetAt mới hơn: giữ tiến độ học sau lần reset", reset.srs.n?.reps === 1 && !!reset.v2.days["2026-11-20"] && !reset.v2.days["2026-11-18"]);
ok("resetAt: ghi mốc lớn hơn lên bản gộp", reset.v2.resetAt === 2000);
ok("resetAt: cài đặt vẫn gộp theo at (không bị xóa)", reset.settings.displayName === "Bản Drive cũ");

if (fail) { console.log(fail + " FAIL"); process.exit(1); } else console.log("ALL PASS");
