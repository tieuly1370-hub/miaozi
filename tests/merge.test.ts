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
if (fail) { console.log(fail + " FAIL"); process.exit(1); } else console.log("ALL PASS");
