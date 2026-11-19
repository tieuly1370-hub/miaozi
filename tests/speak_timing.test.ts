// node --experimental-strip-types tests/speak_timing.test.ts
import { shouldStop, joinAlts, MAX_LISTEN_MS } from "../src/v2/speakTiming.ts";
let fail = 0;
const ok = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fail++; };
ok("Chưa nói, 5 s: chưa dừng (chờ người nói)", !shouldStop({ elapsed: 5000, hasSpeech: false, sinceLastSpeech: 5000 }));
ok("Chưa nói, 14,9 s: chưa dừng", !shouldStop({ elapsed: 14900, hasSpeech: false, sinceLastSpeech: 14900 }));
ok("Tối đa 15 s: dừng", shouldStop({ elapsed: MAX_LISTEN_MS, hasSpeech: false, sinceLastSpeech: 15000 }));
ok("Đang nói (im 1 s): chưa dừng", !shouldStop({ elapsed: 6000, hasSpeech: true, sinceLastSpeech: 1000 }));
ok("Im 2,4 s: chưa dừng", !shouldStop({ elapsed: 6000, hasSpeech: true, sinceLastSpeech: 2400 }));
ok("Im 2,5 s sau khi nói: dừng", shouldStop({ elapsed: 6000, hasSpeech: true, sinceLastSpeech: 2500 }));
ok("Trong 3 s đầu: không dừng dù im", !shouldStop({ elapsed: 2900, hasSpeech: true, sinceLastSpeech: 2600 }));
ok("Android ghép nhiều đoạn final", joinAlts([["你好"], ["老师", "老是"]], "")[0] === "你好老师" && joinAlts([["你好"], ["老师", "老是"]], "").includes("你好老是"));
ok("Bấm Xong khi chỉ có interim", joinAlts([], "谢谢")[0] === "谢谢");
if (fail) { console.log(fail + " FAIL"); process.exit(1); } else console.log("ALL PASS");
