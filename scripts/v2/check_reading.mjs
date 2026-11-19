// Kiểm: mỗi bài đọc chỉ dùng chữ Hán đã học tới bài upTo.
const cur = await import(process.cwd() + "/src/data/curriculum.ts");
const rd = await import(process.cwd() + "/src/data/reading.ts");
let bad = 0;
for (const p of rd.ALL_PASSAGES) {
  const known = new Set(cur.ALL_WORDS.filter((w) => w.lesson <= p.upTo).flatMap((w) => [...w.hanzi]));
  const miss = [...new Set(p.zh.join("").split("").filter((c) => /[\u4e00-\u9fff]/.test(c) && !known.has(c)))];
  if (miss.length) { bad++; console.log(p.id, "chưa học:", miss.join("")); }
}
console.log(bad ? "FAIL" : "OK", rd.ALL_PASSAGES.length, "bài");
process.exit(bad ? 1 : 0);
