export type AudioIndex = Record<string, { n: string; s?: string; c?: string }>;

let index: AudioIndex | null = null;
let current: HTMLAudioElement | null = null;

export async function loadAudioIndex(): Promise<AudioIndex> {
  if (index) return index;
  const res = await fetch("./audio/index.json");
  index = (await res.json()) as AudioIndex;
  return index;
}

/* ---------- Bộ phát chung (v2.1): chỉ một âm thanh tại một thời điểm, có Tạm dừng / Dừng ---------- */
export type AudioStatus = "idle" | "playing" | "paused";
export interface AudioSnap { status: AudioStatus; id: string | null; label: string; seq: { i: number; n: number } | null }
let snap: AudioSnap = { status: "idle", id: null, label: "", seq: null };
const subs = new Set<(s: AudioSnap) => void>();
let seqToken = 0;
function set(p: Partial<AudioSnap>) { snap = { ...snap, ...p }; subs.forEach((f) => f(snap)); }
export function audioState(): AudioSnap { return snap; }
export function subscribeAudio(f: (s: AudioSnap) => void): () => void { subs.add(f); return () => { subs.delete(f); }; }

function halt() {
  if (current) { current.pause(); current.removeAttribute("src"); try { current.load(); } catch { /* */ } current = null; }
}
/** Dừng hẳn (kể cả chuỗi tự phát). */
export function stopAudio() {
  seqToken++;
  halt();
  if (snap.status !== "idle") set({ status: "idle", id: null, label: "", seq: null });
}
export function pauseAudio() { if (current && snap.status === "playing") { current.pause(); set({ status: "paused" }); } }
export function resumeAudio() { if (current && snap.status === "paused") { void current.play().catch(() => {}); set({ status: "playing" }); } }
export function toggleAudio() { if (snap.status === "playing") pauseAudio(); else resumeAudio(); }

export async function playId(id: string, slow = false, label = ""): Promise<HTMLAudioElement> {
  seqToken++; // phát mục khác → hủy chuỗi đang chạy
  return playIdIn(id, slow, label, null);
}
async function playIdIn(id: string, slow: boolean, label: string, seq: AudioSnap["seq"]): Promise<HTMLAudioElement> {
  const idx = await loadAudioIndex();
  const rec = idx[id];
  if (!rec) throw new Error("Không có file âm cho " + id);
  const file = slow && rec.s ? rec.s : rec.n;
  return startUrl("./audio/" + file, id, label, seq);
}

export function playUrl(url: string): Promise<HTMLAudioElement> { seqToken++; return startUrl(url, url, "", null); }

function startUrl(url: string, id: string, label: string, seq: AudioSnap["seq"]): Promise<HTMLAudioElement> {
  halt();
  const a = new Audio(url);
  current = a;
  set({ status: "playing", id, label, seq });
  return new Promise((resolve, reject) => {
    a.addEventListener("error", () => { if (current === a) { current = null; if (!seq) set({ status: "idle", id: null, label: "", seq: null }); } reject(new Error("Không phát được âm thanh")); });
    a.addEventListener("ended", () => { if (current === a) { current = null; if (!seq) set({ status: "idle", id: null, label: "", seq: null }); } });
    a.preload = "auto";
    a.play().then(() => resolve(a)).catch((e) => { if (current === a) { current = null; set({ status: "idle", id: null, label: "", seq: null }); } reject(e); });
  });
}

function waitEnd(a: HTMLAudioElement, maxMs = 20000): Promise<void> {
  return new Promise((r) => {
    if (a.ended) return r();
    const t = setTimeout(r, maxMs);
    const fin = () => { clearTimeout(t); r(); };
    a.addEventListener("ended", fin, { once: true });
    a.addEventListener("error", fin, { once: true });
    a.addEventListener("emptied", fin, { once: true });
  });
}
/** Phát cả chuỗi, cách nhau gapMs. Dừng được bằng stopAudio() hoặc khi phát mục khác. Trả về true nếu chạy hết. */
export async function playSequence(ids: string[], gapMs = 2000, label = "Tự phát"): Promise<boolean> {
  const my = ++seqToken;
  for (let i = 0; i < ids.length; i++) {
    if (my !== seqToken) return false;
    try { const a = await playIdIn(ids[i], false, label, { i: i + 1, n: ids.length }); await waitEnd(a); } catch { /* */ }
    if (my !== seqToken) return false;
    // chờ khoảng nghỉ; nếu đang tạm dừng thì chờ tới khi tiếp tục
    let left = i < ids.length - 1 ? gapMs : 0;
    while (left > 0 || snap.status === "paused") {
      await new Promise((r) => setTimeout(r, 100));
      if (my !== seqToken) return false;
      if (snap.status !== "paused") left -= 100;
    }
  }
  if (my === seqToken) set({ status: "idle", id: null, label: "", seq: null });
  return my === seqToken;
}

export async function decodeUrl(url: string): Promise<{ buffer: AudioBuffer; ctx: AudioContext }> {
  const ctx = new AudioContext();
  const res = await fetch(url);
  const arr = await res.arrayBuffer();
  const buffer = await ctx.decodeAudioData(arr);
  return { buffer, ctx };
}

export async function audioUrlFor(id: string, slow = false): Promise<string | null> {
  const idx = await loadAudioIndex();
  const rec = idx[id];
  if (!rec) return null;
  const file = slow && rec.s ? rec.s : rec.n;
  return "./audio/" + file;
}

/** Cụm chứa từ (dùng cho trợ từ thanh nhẹ như 的, 了, 吗 — đọc riêng nghe sai). */
export async function carrierFor(id: string): Promise<string | null> {
  const idx = await loadAudioIndex();
  return idx[id]?.c || null;
}

/** Tự phát âm khi sang mục mới (nếu bật trong Cài đặt). */
export async function autoPlay(id: string | undefined | null, enabled: boolean) {
  if (!id || !enabled) return;
  try { await playId(id); } catch { /* trình duyệt chặn tự phát khi chưa chạm màn hình */ }
}
