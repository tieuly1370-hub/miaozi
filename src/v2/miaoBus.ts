/** Kênh sự kiện Miao dùng chung: mọi trang làm bài gọi miaoAnswer / miaoEvent, bong bóng MiaoBubble nghe. */
import { createMiao, type MiaoEvent, type MiaoSay } from "./miao";
const engine = createMiao();
type L = (s: MiaoSay) => void;
const subs = new Set<L>();
const day = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const emit = (s: MiaoSay | null) => { if (s) subs.forEach((f) => f(s)); return s; };
export const miaoAnswer = (ok: boolean) => emit(engine.answer(ok, day()));
export const miaoEvent = (ev: Exclude<MiaoEvent, "answer">) => emit(engine.event(ev, day()));
export function onMiao(f: L) { subs.add(f); return () => { subs.delete(f); }; }
export const miaoEngine = engine;
