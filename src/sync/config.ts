/** v2.1 — Đồng bộ Google Drive (thư mục ẩn appDataFolder của chính tài khoản người dùng). Client ID OAuth là công khai. */
export const GOOGLE_CLIENT_ID = "397105962766-9kjoup0oe8n4nnhtvop2nqo3hv4c3d2n.apps.googleusercontent.com";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
export const SYNC_FILE = "miaozi-sync.json";
/** Gộp các thay đổi rồi mới đẩy lên (ms). */
export const SYNC_DEBOUNCE_MS = 20_000;
export const syncConfigured = () => GOOGLE_CLIENT_ID.endsWith(".apps.googleusercontent.com");
