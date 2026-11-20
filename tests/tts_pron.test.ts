// node --experimental-strip-types tests/tts_pron.test.ts
import { needsPronOverride, numToMark, ttsInput, ttsSsml, PRON_OVERRIDE } from "../src/ttsPron.ts";
let fail = 0;
const ok = (c: boolean, m: string) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fail++; };

ok(PRON_OVERRIDE["哪"] === "na3", "哪 → na3");
ok(numToMark("na3") === "nǎ", "na3 → nǎ");
ok(needsPronOverride("哪") && needsPronOverride("他是哪国人？") && !needsPronOverride("你好"), "cần override đúng chỗ có 哪");
ok(ttsInput("哪").includes("nǎ") && ttsInput("哪").includes("哪"), "ttsInput chèn nǎ");
ok(ttsSsml("哪").includes("<phoneme") && ttsSsml("哪").includes("na 3") && ttsSsml("哪").includes("哪"), "SSML phoneme na 3");
ok(ttsSsml("他是哪国人？").includes("他是") && ttsSsml("他是哪国人？").includes("phoneme") && ttsSsml("他是哪国人？").includes("国人？"), "SSML giữ chữ xung quanh");
ok(!ttsSsml("你好").includes("phoneme"), "câu không có 哪 không bọc phoneme");

console.log(fail ? `${fail} FAIL` : "ALL PASS");
process.exit(fail ? 1 : 0);
