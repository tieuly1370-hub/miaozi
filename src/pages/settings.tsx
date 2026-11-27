import { useEffect, useState } from "preact/hooks";
import { signOut, subscribeSync, syncInfo, syncNow } from "../sync/drive";
import { syncConfigured } from "../sync/config";
import { DEFAULT_SETTINGS, type Settings, type Shift } from "../schedule";
import { claimReward, exportPayload, getState, importPayload, patchSettings, resetLearning, weekKey } from "../store";
import { clearPenalties } from "../v2/state2";
import { Button, Card, Switch, go } from "../ui";
import { PEN_DEFAULT, PEN_MAX, PEN_MIN } from "../v2/pen";

export function SettingsPage() {
  const s = getState();
  const [msg, setMsg] = useState<string | null>(null);
  const st = s.settings;
  const week = s.progress.weekly[weekKey()];
  const setShift = (key: "morning" | "evening" | "sundayWeeklyTest", patch: Partial<Shift>) => {
    patchSettings({ [key]: { ...st[key], ...patch } } as Partial<Settings>);
  };
  return (
    <div class="stack" data-testid="settings">
      <Card>
        <h2 class="h2">Cài đặt</h2>
        <div class="field">
          <span>Tên gọi</span>
          <input value={st.displayName} onInput={(e) => patchSettings({ displayName: (e.target as HTMLInputElement).value })} />
        </div>
        <Switch on={st.autoplay !== false} onChange={(v) => patchSettings({ autoplay: v })} label="Tự phát âm khi sang từ / câu mới" />
        <label class="field pen-field" data-testid="pen-width">
          <span>Độ dày bút máy <b>{(st.penWidth ?? PEN_DEFAULT).toFixed(1)}</b></span>
          <input type="range" min={PEN_MIN} max={PEN_MAX} step={0.1} value={st.penWidth ?? PEN_DEFAULT} onInput={(e) => patchSettings({ penWidth: Number((e.target as HTMLInputElement).value) })} />
        </label>
      </Card>
      <SyncCard />
      <Card>
        <h3 class="h3">Dữ liệu giữa các máy</h3>
        <p class="muted small">Xuất file JSON rồi nhập ở máy kia.</p>
        <div class="tools">
          <Button kind="yellow" onClick={async () => {
            const data = await exportPayload();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "miaozi-tien-do.json";
            a.click();
          }}>Xuất JSON</Button>
          <label class="btn ghost">Nhập JSON
            <input type="file" accept="application/json" hidden onChange={async (e) => {
              const f = (e.target as HTMLInputElement).files?.[0];
              if (!f) return;
              const data = JSON.parse(await f.text());
              await importPayload(data.data ? data : { data });
              setMsg("Đã nhập tiến độ.");
            }} />
          </label>
        </div>
      </Card>
      <Card>
        <h3 class="h3">Dùng ngoại tuyến</h3>
        <p class="muted small">Tải sẵn âm thanh và nét chữ để học khi mất mạng.</p>
        <Button kind="purple" wide onClick={() => void precacheAll(setMsg)}>Tải dữ liệu ngoại tuyến</Button>
        {msg && <p class="muted">{msg}</p>}
      </Card>
      <DataTools />
      <Card data-testid="about">
        <h3 class="h3">Giới thiệu</h3>
        <p class="small">Miaozi {__APP_VERSION__}</p>
        <p class="muted small">Bộ thủ và tách chữ: <a href="https://github.com/skishore/makemeahanzi" target="_blank" rel="noreferrer">Make Me a Hanzi</a> (Shaunak Kishore; dữ liệu theo LGPL và Arphic Public License). Nét chữ: hanzi-writer-data (Arphic). Mẹo nhớ HSK1 do Miaozi soạn; HSK 2: danh sách từ theo Giáo trình chuẩn HSK 2 (bản số hoá joelypoley/hsk_standard_course_vocab), nghĩa và câu ví dụ do Miaozi soạn. Âm thanh: giọng máy (Xiaoxiao), đã soát bằng Whisper.</p>
      </Card>
    </div>
  );
}

function ShiftEd({ title, shift, onChange }: { title: string; shift: Shift; onChange: (p: Partial<Shift>) => void }) {
  const days = [1, 2, 3, 4, 5, 6, 0];
  const names = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  return (
    <div style={{ margin: "14px 0" }}>
      <strong>{title}</strong>
      <div class="tools">
        {days.map((d, i) => (
          <Button key={d} small kind={shift.days.includes(d) ? "primary" : "ghost"} onClick={() => {
            const has = shift.days.includes(d);
            onChange({ days: has ? shift.days.filter((x) => x !== d) : [...shift.days, d].sort() });
          }}>{names[i]}</Button>
        ))}
      </div>
      <div class="row">
        <label class="field">Bắt đầu <input type="time" value={shift.start} onInput={(e) => onChange({ start: (e.target as HTMLInputElement).value })} /></label>
        <label class="field">Kết thúc <input type="time" value={shift.end} onInput={(e) => onChange({ end: (e.target as HTMLInputElement).value })} /></label>
        <label class="field">Tối thiểu (phút) <input type="number" min={5} max={180} value={shift.minMinutes} onInput={(e) => onChange({ minMinutes: Number((e.target as HTMLInputElement).value) })} /></label>
      </div>
    </div>
  );
}

async function notifyCard(setMsg: (s: string) => void) {
  if (!("Notification" in window)) { setMsg("Trình duyệt không hỗ trợ thông báo."); return; }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") { setMsg("Chưa được phép gửi thông báo."); return; }
  const s = getState();
  if (s.settings.companyMode) { setMsg("Chế độ công ty đang bật — không hiện thông báo. Tắt tạm để test thẻ."); return; }
  const { dueReview } = await import("../store");
  const { ALL_WORDS } = await import("../data/curriculum");
  const { parseCardId } = await import("../srs");
  const due = dueReview();
  const card = due[0];
  const word = card ? ALL_WORDS.find((w) => w.id === parseCardId(card.id).wordId) : ALL_WORDS[0];
  if (!word) { setMsg("Chưa có thẻ."); return; }
  const n = new Notification("Miaozi · " + word.hanzi, {
    body: "Nghĩa là gì? Mở app để trả lời — pinyin ẩn.",
    tag: "miaozi-card",
    icon: "./icons/icon-192.png",
    silent: false,
    requireInteraction: true,
  });
  n.onclick = () => { window.focus(); go("/review"); n.close(); };
  setMsg("Đã gửi thẻ «" + word.hanzi + "». Trên Android, nếu cho phép, thẻ có thể hiện cả trên màn hình khóa.");
}

async function precacheAll(setMsg: (s: string) => void) {
  const sw = await navigator.serviceWorker?.ready;
  if (!sw?.active) { setMsg("Service worker chưa sẵn. Tải lại trang rồi thử."); return; }
  const [audio, hanzi] = await Promise.all([
    fetch("./audio/index.json").then((r) => r.json()) as Promise<Record<string, { n: string; s?: string }>>,
    fetch("./hanzi-data/index.json").then((r) => r.json()) as Promise<string[]>,
  ]);
  const urls = [
    ...Object.values(audio).flatMap((x) => ["./audio/" + x.n, x.s ? "./audio/" + x.s : ""]).filter(Boolean),
    "./fonts/vn-Regular.ttf", "./fonts/vn-Bold.ttf", "./fonts/cjk-sc.ttf",
    ...hanzi.map((c) => "./hanzi-data/" + encodeURIComponent(c) + ".json"),
  ];
  setMsg("Đang tải " + urls.length + " tệp…");
  const handler = (e: MessageEvent) => {
    if (e.data?.type === "PRECACHE_DONE") {
      setMsg(`Đã lưu ${e.data.ok}/${e.data.total} tệp. Có thể học khi mất mạng.`);
      navigator.serviceWorker.removeEventListener("message", handler);
    }
  };
  navigator.serviceWorker.addEventListener("message", handler);
  sw.active.postMessage({ type: "PRECACHE_ALL", urls });
}

function SyncCard() {
  const [i, setI] = useState(syncInfo());
  useEffect(() => subscribeSync(setI), []);
  const t = i.lastSync ? new Date(i.lastSync).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : null;
  return (
    <Card data-testid="sync-card">
      <h3 class="h3">Đồng bộ Google Drive</h3>
      {!syncConfigured() ? <p class="notice">Chưa cấu hình.</p> : (
        <>
          <p class="muted small">Tiến độ lưu vào thư mục ẩn của Miaozi trong Drive của chủ (app không xem được file khác). Tự đồng bộ khi mở app và sau mỗi thay đổi.</p>
          {i.email && <p class="small">Tài khoản: <b>{i.email}</b></p>}
          <p class="small" data-testid="sync-status">{i.status === "syncing" ? (i.message || "Đang đồng bộ…") : i.status === "signedOut" ? "Chưa đăng nhập." : i.status === "error" ? <span class="bad-text">{i.message}</span> : `Đã đồng bộ${t ? ` lúc ${t}` : ""}.`}</p>
          <div class="row">
            {i.status === "signedOut"
              ? <Button kind="primary" id="sync-login" onClick={() => void syncNow(true)}>Đăng nhập Google</Button>
              : <><Button kind="primary" id="sync-now" disabled={i.status === "syncing"} onClick={() => void syncNow(true)}>Đồng bộ ngay</Button><Button kind="ghost" small onClick={signOut}>Đăng xuất</Button></>}
          </div>
        </>
      )}
    </Card>
  );
}

function DataTools() {
  const [ask, setAsk] = useState<"pen" | "reset1" | "reset2" | null>(null);
  const [msg, setMsg] = useState("");
  const close = () => setAsk(null);
  const doClear = () => { clearPenalties(); setMsg("Đã xoá chép phạt."); close(); };
  const doReset = () => { resetLearning({ keepSettings: true }); setMsg("Đã bắt đầu lại từ đầu. Cài đặt và đăng nhập Drive được giữ lại."); close(); };
  return (
    <Card data-testid="data-tools">
      <h3 class="h3">Dữ liệu học</h3>
      <p class="muted small">Dùng khi thử app và bị đầy chép phạt, hoặc muốn học lại từ đầu. Xoá chép phạt không đụng tới tiến độ, thẻ ôn và chuỗi ngày.</p>
      <div class="tools data-tools-btns">
        <Button kind="ghost" id="clear-penalties" onClick={() => setAsk("pen")}>Xoá chép phạt</Button>
        <Button kind="ghost" id="full-reset" class="danger-soft" onClick={() => setAsk("reset1")}>Bắt đầu lại từ đầu</Button>
      </div>
      {msg && <p class="ok-text small" data-testid="data-msg">{msg}</p>}
      {ask === "pen" && (
        <div class="data-confirm" data-testid="confirm-penalties">
          <p>Xoá hết bài chép phạt đang nợ (kể cả phạt Xin nghỉ và Mục 1)? Tiến độ học và chuỗi ngày vẫn giữ.</p>
          <div class="row"><Button kind="pink" id="confirm-penalties" onClick={doClear}>Xoá chép phạt</Button><Button kind="ghost" onClick={close}>Thôi</Button></div>
        </div>
      )}
      {ask === "reset1" && (
        <div class="data-confirm" data-testid="confirm-reset-1">
          <p>Xóa hết tiến độ, chuỗi ngày, thẻ ôn và chép phạt. Cài đặt và đăng nhập Drive giữ nguyên.</p>
          <div class="row"><Button kind="ghost" class="danger-soft" id="confirm-reset-1" onClick={() => setAsk("reset2")}>Tiếp tục</Button><Button kind="ghost" onClick={close}>Thôi</Button></div>
        </div>
      )}
      {ask === "reset2" && (
        <div class="data-confirm" data-testid="confirm-reset-2">
          <p>Xác nhận lần nữa: không lấy lại được tiến độ đã xóa.</p>
          <div class="row"><Button kind="ghost" class="danger-soft" id="confirm-reset-2" onClick={doReset}>Xác nhận xóa hết</Button><Button kind="ghost" onClick={close}>Thôi</Button></div>
        </div>
      )}
    </Card>
  );
}
