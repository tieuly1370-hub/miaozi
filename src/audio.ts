export type AudioIndex = Record<string, { n: string; s?: string; c?: string }>;

let index: AudioIndex | null = null;
let current: HTMLAudioElement | null = null;

export async function loadAudioIndex(): Promise<AudioIndex> {
  if (index) return index;
  const res = await fetch("./audio/index.json");
  index = (await res.json()) as AudioIndex;
  return index;
}

export function stopAudio() {
  if (current) {
    current.pause();
    current.src = "";
    current = null;
  }
}

export async function playId(id: string, slow = false): Promise<HTMLAudioElement> {
  const idx = await loadAudioIndex();
  const rec = idx[id];
  if (!rec) throw new Error("Không có file âm cho " + id);
  const file = slow && rec.s ? rec.s : rec.n;
  return playUrl("./audio/" + file);
}

export function playUrl(url: string): Promise<HTMLAudioElement> {
  stopAudio();
  const a = new Audio(url);
  current = a;
  return new Promise((resolve, reject) => {
    a.oncanplaythrough = () => {};
    a.onerror = () => reject(new Error("Không phát được âm thanh"));
    a.onended = () => { if (current === a) current = null; };
    a.preload = "auto";
    a.play().then(() => resolve(a)).catch(reject);
  });
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
