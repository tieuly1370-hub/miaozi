import { useEffect, useState } from "preact/hooks";

/** Đăng ký service worker; khi có bản mới thì hiện "Có bản mới, tải lại". */
let waiting: ServiceWorker | null = null;
const listeners = new Set<() => void>();

export function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");
      const found = (w: ServiceWorker | null) => {
        if (!w) return;
        const check = () => {
          if (w.state === "installed" && navigator.serviceWorker.controller) {
            waiting = w;
            listeners.forEach((f) => f());
          }
        };
        w.addEventListener("statechange", check);
        check();
      };
      found(reg.waiting);
      reg.addEventListener("updatefound", () => found(reg.installing));
      // kiểm tra bản mới khi mở lại app và mỗi 30 phút
      document.addEventListener("visibilitychange", () => { if (!document.hidden) void reg.update().catch(() => {}); });
      setInterval(() => void reg.update().catch(() => {}), 30 * 60000);
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return;
        reloading = true;
        location.reload();
      });
    } catch { /* file:// hoặc trình duyệt chặn */ }
  });
}

export function UpdateBanner() {
  const [show, setShow] = useState(!!waiting);
  useEffect(() => {
    const f = () => setShow(true);
    listeners.add(f);
    return () => { listeners.delete(f); };
  }, []);
  if (!show) return null;
  return (
    <div class="update-bar" data-testid="update-bar">
      <span>Có bản mới của Miaozi.</span>
      <button class="btn small primary" onClick={() => {
        if (waiting) waiting.postMessage({ type: "SKIP_WAITING" });
        else location.reload();
      }}>Tải lại</button>
    </div>
  );
}
