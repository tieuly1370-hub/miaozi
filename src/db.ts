/** Storage layer: IndexedDB key-value. Abstracted so a later GitHub Gist sync can wrap this. */

const DB_NAME = "lohan";
const DB_VER = 1;
const STORE = "kv";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function get<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function set<T>(key: string, value: T): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

export async function del(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

export async function keys(): Promise<string[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAllKeys();
    req.onsuccess = () => resolve(req.result as string[]);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function exportAll(): Promise<{ version: number; exportedAt: string; data: Record<string, unknown> }> {
  const ks = await keys();
  const data: Record<string, unknown> = {};
  for (const k of ks) data[k] = await get(k);
  return { version: 1, exportedAt: new Date().toISOString(), data };
}

export async function importAll(payload: { version?: number; data: Record<string, unknown> }): Promise<void> {
  const data = payload.data || (payload as unknown as Record<string, unknown>);
  for (const [k, v] of Object.entries(data)) {
    if (k === "version" || k === "exportedAt") continue;
    await set(k, v);
  }
}

export const STORAGE_KEYS = {
  settings: "settings",
  progress: "progress",
  streak: "streak",
  srs: "srs",
  mistakes: "mistakes",
  sessions: "sessions",
  notes: "notes",
  penalties: "penalties",
  today: "today",
  onboarded: "onboarded",
} as const;
