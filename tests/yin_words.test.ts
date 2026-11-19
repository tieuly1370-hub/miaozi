// Thanh của từ đơn/đôi trong kho âm của app (edge-tts Xiaoxiao). node --experimental-strip-types tests/yin_words.test.ts
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
(globalThis as any).window = {};
const sp = await import("../src/speech.ts");
const v2 = await import("../src/v2/speakScore.ts");
const cur = await import("../src/data/curriculum.ts");
const idx = JSON.parse(readFileSync(new URL("../public/audio/index.json", import.meta.url), "utf8"));
const conf: Record<string, number> = {};
let tot = 0, ok = 0, lenient = 0, sentFail = 0, n = 0;
for (const w of cur.ALL_WORDS) {
  const rec = idx[w.id]; if (!rec || rec.c) continue;
  const chars = [...w.hanzi].filter((c) => /[\u4e00-\u9fff]/.test(c));
  if (chars.length > 2) continue;
  const raw = execFileSync("ffmpeg", ["-v", "quiet", "-i", "public/audio/" + rec.n, "-ac", "1", "-ar", "48000", "-f", "f32le", "-"], { maxBuffer: 1 << 26 });
  const s = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  const want = w.pinyinNum.split(" ").map((x: string) => Number(x.slice(-1)) || 5);
  for (let i = want.length - 2; i >= 0; i--) if (want[i] === 3 && want[i + 1] === 3) want[i] = 2;
  const got = v2.tonesFromContour(v2.gatedContour(s, 48000, sp.pitchContour).hz, want.length);
  want.forEach((t: number, k: number) => { if (t === 5) return; tot++; if (got[k] === t) ok++; if (v2.toneOk(t, got[k], k === want.length - 1)) lenient++; conf[`${t}->${got[k] ?? "?"}`] = (conf[`${t}->${got[k] ?? "?"}`] || 0) + 1; });
  const sc = v2.scoreSpeech(w.hanzi, [w.hanzi], got); n++; if (!sc.pass) { sentFail++; console.log("TRƯỢT", w.hanzi, want.join(""), got.join("")); }
}
console.log(`Từ 1–2 chữ: thanh đúng tuyệt đối ${ok}/${tot} = ${Math.round(ok / tot * 100)}%, khoan dung ${Math.round(lenient / tot * 100)}%`);
console.log("Ma trận nhầm:", JSON.stringify(conf));
console.log(`Từ bị đánh trượt khi đọc đúng (giọng chuẩn): ${sentFail}/${n}`);
process.exit(sentFail ? 1 : 0);
