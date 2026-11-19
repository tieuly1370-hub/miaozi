/**
 * v2.1 — Đồng bộ Google Drive, không máy chủ: Google Identity Services (token client) + Drive REST, phạm vi drive.appdata
 * (thư mục ẩn của app trong Drive người dùng; app không thấy file khác). Không có refresh token → token sống ~1 giờ;
 * hết hạn thì tự xin lại im lặng khi có thể, không được thì cần bấm "Đồng bộ ngay".
 */
import { DRIVE_SCOPE, GOOGLE_CLIENT_ID, SYNC_DEBOUNCE_MS, SYNC_FILE, syncConfigured } from "./config";
import { mergeDocs, type SyncDoc } from "./merge";
import { applySynced, changedAt, onLocalChange, syncSnapshot } from "../store";

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { google?: any } }

export type SyncStatus = "unconfigured" | "signedOut" | "idle" | "syncing" | "error";
export interface SyncInfo { status: SyncStatus; lastSync: number; email?: string; message?: string }
const LS = "miaozi-sync";
let info: SyncInfo = { status: syncConfigured() ? "signedOut" : "unconfigured", lastSync: 0 };
try { const x = JSON.parse(localStorage.getItem(LS) || "{}"); info.lastSync = x.lastSync || 0; info.email = x.email; } catch { /* */ }
let enabled = (() => { try { return JSON.parse(localStorage.getItem(LS) || "{}").enabled === true; } catch { return false; } })();
const TK = "miaozi-sync-token";
/** Token chỉ có quyền thư mục ẩn của app, sống ~1 giờ — giữ qua lần tải lại trang. */
let token: { value: string; exp: number } | null = (() => { try { const t = JSON.parse(localStorage.getItem(TK) || "null"); return t && t.exp > Date.now() ? t : null; } catch { return null; } })();
function saveToken() { try { if (token) localStorage.setItem(TK, JSON.stringify(token)); else localStorage.removeItem(TK); } catch { /* */ } }
const subs = new Set<(i: SyncInfo) => void>();
function set(p: Partial<SyncInfo>) {
  info = { ...info, ...p };
  try { localStorage.setItem(LS, JSON.stringify({ lastSync: info.lastSync, email: info.email, enabled })); } catch { /* */ }
  subs.forEach((f) => f(info));
}
export function syncInfo() { return info; }
export function subscribeSync(f: (i: SyncInfo) => void) { subs.add(f); return () => { subs.delete(f); }; }

let gisP: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return (gisP ||= new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = () => res(); s.onerror = () => { gisP = null; rej(new Error("Không tải được Google (mạng / bị chặn)")); };
    document.head.appendChild(s);
  }));
}
let client: any = null;
let pending: ((t: string | null, err?: string) => void) | null = null;
async function getClient() {
  await loadGis();
  if (!client) client = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID, scope: DRIVE_SCOPE,
    callback: (r: any) => {
      if (r?.access_token) { token = { value: r.access_token, exp: Date.now() + (Number(r.expires_in || 3600) - 60) * 1000 }; saveToken(); }
      const p = pending; pending = null; p?.(r?.access_token || null, r?.error);
    },
    error_callback: (e: any) => { const p = pending; pending = null; p?.(null, e?.type || "popup"); },
  });
  return client;
}
function requestToken(prompt: "" | "consent" | "none"): Promise<string> {
  return getClient().then((c) => new Promise<string>((res, rej) => {
    pending = (t, err) => (t ? res(t) : rej(new Error(err || "Không đăng nhập được")));
    c.requestAccessToken({ prompt, hint: info.email });
  }));
}
const valid = () => !!token && token.exp > Date.now();

async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const r = await fetch("https://www.googleapis.com" + path, { ...init, headers: { ...(init.headers || {}), Authorization: "Bearer " + token!.value } });
  if (r.status === 401) { token = null; saveToken(); throw new Error("Phiên Google hết hạn — bấm Đồng bộ ngay"); }
  if (!r.ok) throw new Error(`Drive lỗi ${r.status}`);
  return r;
}
async function findFile(): Promise<string | null> {
  const q = encodeURIComponent(`name='${SYNC_FILE}'`);
  const j = await (await api(`/drive/v3/files?spaces=appDataFolder&q=${q}&fields=files(id,modifiedTime)&pageSize=10`)).json();
  return j.files?.[0]?.id || null;
}
async function readFile(id: string): Promise<SyncDoc | null> {
  try { return await (await api(`/drive/v3/files/${id}?alt=media`)).json(); } catch (e) { if (String(e).includes("hết hạn")) throw e; return null; }
}
async function writeFile(id: string | null, doc: SyncDoc) {
  const body = JSON.stringify(doc);
  if (id) { await api(`/upload/drive/v3/files/${id}?uploadType=media`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body }); return; }
  const boundary = "miaozi" + Math.random().toString(36).slice(2);
  const meta = JSON.stringify({ name: SYNC_FILE, parents: ["appDataFolder"], mimeType: "application/json" });
  const multipart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
  await api(`/upload/drive/v3/files?uploadType=multipart`, { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body: multipart });
}
async function fetchEmail() {
  try { const j = await (await api("/drive/v3/about?fields=user(emailAddress)")).json(); if (j.user?.emailAddress) set({ email: j.user.emailAddress }); } catch { /* */ }
}

let running = false;
/** Một lượt: tải → gộp → áp vào máy → ghi lại Drive. */
export async function syncNow(interactive = false): Promise<void> {
  if (!syncConfigured()) { set({ status: "unconfigured" }); return; }
  if (running) return;
  running = true;
  try {
    if (!valid()) {
      if (!interactive) {
        // không tự mở cửa sổ Google khi chưa bấm (trình duyệt chặn popup) — chờ chủ bấm "Đồng bộ ngay"
        set(enabled ? { status: "error", message: "Phiên Google hết hạn — bấm Đồng bộ ngay" } : { status: "signedOut" });
        return;
      }
      set({ status: "syncing", message: "Đang đăng nhập Google…" });
      await requestToken(enabled ? "" : "consent");
      enabled = true;
      if (!info.email) await fetchEmail();
    }
    set({ status: "syncing", message: "Đang đồng bộ…" });
    const id = await findFile();
    const remote = id ? await readFile(id) : null;
    const local: SyncDoc = { app: "miaozi", v: 1, at: changedAt() || 0, data: syncSnapshot() };
    const merged = mergeDocs(local, remote);
    applySynced(merged.data, merged.at);
    await writeFile(id, merged);
    set({ status: "idle", lastSync: Date.now(), message: undefined });
  } catch (e) {
    const msg = (e as Error).message || String(e);
    set({ status: valid() ? "error" : enabled ? "error" : "signedOut", message: interactive || valid() ? msg : "Cần bấm Đồng bộ ngay để đăng nhập lại" });
  } finally { running = false; }
}
export function signOut() {
  try { if (token) window.google?.accounts?.oauth2?.revoke?.(token.value, () => {}); } catch { /* */ }
  token = null; saveToken(); enabled = false; set({ status: "signedOut", email: undefined, message: undefined });
}

let timer = 0;
/** Tự đồng bộ: khi mở app và sau mỗi thay đổi (gom 20 giây). */
export function startAutoSync() {
  if (!syncConfigured()) return;
  if (enabled) setTimeout(() => void syncNow(false), 1500);
  if (enabled && valid()) set({ status: "idle" });
  onLocalChange(() => {
    if (!enabled) return;
    clearTimeout(timer);
    timer = window.setTimeout(() => void syncNow(false), SYNC_DEBOUNCE_MS);
  });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && enabled && valid() && timer) { clearTimeout(timer); timer = 0; void syncNow(false); } });
}
