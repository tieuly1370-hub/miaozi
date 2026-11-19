// YIN + phân đoạn + phân loại thanh trên mp3 edge-tts (giọng chuẩn). node --experimental-strip-types tests/yin_tts.test.ts
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
(globalThis as any).window = {};
const sp = await import("../src/speech.ts");
const v2 = await import("../src/v2/speakScore.ts");
const dir = new URL("./tts/", import.meta.url).pathname;
const S = readFileSync(dir + "sentences.txt", "utf8").split("\n");
let strict2 = 0, sylTotal = 0, sylOk = 0, sylOkOld = 0, sentFailOld = 0, sentFailNew = 0, n = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith(".mp3")).sort()) {
  const i = Number(f.match(/_(\d+)\.mp3/)![1]);
  const text = S[i];
  for (const sr of [16000, 48000]) {
    const raw = execFileSync("ffmpeg", ["-v", "quiet", "-i", dir + f, "-ac", "1", "-ar", String(sr), "-f", "f32le", "-"], { maxBuffer: 1 << 26 });
    const samples = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
    const want = v2.spokenTones(text);
    const r = sp.tonesFromRecording(samples, sr, want.length);
    const t2 = v2.tonesFromContour(v2.gatedContour(samples, sr, sp.pitchContour).hz, want.length);
    const okNew = want.map((w, k) => v2.toneOk(w, t2[k], k === want.length - 1));
    const okStrict2 = want.map((w, k) => t2[k] !== undefined && (w === 5 || w === t2[k]));
    strict2 += okStrict2.filter(Boolean).length;
    const okOld = want.map((w, k) => r.tones[k] !== undefined && (w === 5 ? [5, 3, 1].includes(r.tones[k]!) : w === r.tones[k]));
    sylTotal += want.length; sylOk += okNew.filter(Boolean).length; sylOkOld += okOld.filter(Boolean).length;
    if (!okOld.every(Boolean)) sentFailOld++;
    const sc = v2.scoreSpeech(text, [text], t2);
    if (!sc.pass) sentFailNew++;
    n++;
    console.log(`${f}@${sr / 1000}k ${text} want=${want.join("")} cũ=${r.tones.map((t: number | undefined) => t ?? "?").join("")} mới=${t2.map((t: number | undefined) => t ?? "?").join("")} cũ:${okOld.every(Boolean) ? "đạt" : "TRƯỢT"} mới:${sc.percent}% ${sc.pass ? "đạt" : "TRƯỢT"}`);
  }
}
console.log(`\nThanh từng âm tiết — luật cũ (khớp tuyệt đối): ${sylOkOld}/${sylTotal} = ${Math.round(sylOkOld / sylTotal * 100)}%; luật mới (khoan dung): ${sylOk}/${sylTotal} = ${Math.round(sylOk / sylTotal * 100)}%`);
console.log(`Thanh v2 khớp tuyệt đối: ${strict2}/${sylTotal} = ${Math.round(strict2 / sylTotal * 100)}%`);
console.log(`Câu bị đánh trượt với giọng chuẩn — cũ: ${sentFailOld}/${n}; mới: ${sentFailNew}/${n}`);
process.exit(sentFailNew ? 1 : 0);
