// node --experimental-strip-types tests/leave_guard.test.ts
import { normHash, toHash } from "../src/v2/leaveGuard.ts";
let fail = 0;
const ok = (n: string, c: boolean) => { console.log((c ? "PASS " : "FAIL ") + n); if (!c) fail++; };
ok("#/ và / cùng một đường", normHash("#/") === "/" && normHash("/") === "/" && normHash("") === "/");
ok("bỏ slash cuối", normHash("#/lesson/1/") === "/lesson/1");
ok("giữ đường lồng", normHash("#/lesson/1/test") === "/lesson/1/test");
ok("toHash chuẩn hoá", toHash("/write") === "#/write" && toHash("#/write") === "#/write" && toHash("write") === "#/write");
ok("khác tab thì khác hash", toHash(normHash("#/lesson/1/test")) !== toHash(normHash("#/")));
if (fail) { console.log(fail + " FAIL"); process.exit(1); } else console.log("ALL PASS");
