import { useState } from "preact/hooks";
import { DEFAULT_SETTINGS, type Settings, type Shift } from "../schedule";
import { claimReward, exportPayload, getState, importPayload, patchSettings, weekKey } from "../store";
import { Button, Card, Switch, go } from "../ui";

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
        <div class="field">
          <span>Phần thưởng tuần (khi hoàn thành tuần)</span>
          <input value={st.weeklyReward} onInput={(e) => patchSettings({ weeklyReward: (e.target as HTMLInputElement).value })} placeholder="ví dụ: trà sữa" />
        </div>
        <Switch on={st.companyMode} onChange={(v) => patchSettings({ companyMode: v })} label="Chế độ công ty (im lặng, kín đáo)" />
        <Switch on={st.notify} onChange={(v) => patchSettings({ notify: v })} label="Thông báo khi app đang mở" />
        <Switch on={st.autoplay !== false} onChange={(v) => patchSettings({ autoplay: v })} label="Tự phát âm khi sang từ / câu mới" />
      </Card>
      <Card>
        <h3 class="h3">Lịch học cá nhân</h3>
        <p class="muted">Mặc định: T2–T6 sáng nghe+đọc 30–120 phút, tối 21:00–21:30 nói+viết. T7 học bù. CN nghỉ, tối kiểm tra tuần 20 phút.</p>
        <ShiftEd title="Ca sáng (công ty)" shift={st.morning} onChange={(p) => setShift("morning", p)} />
        <ShiftEd title="Ca tối (ở nhà)" shift={st.evening} onChange={(p) => setShift("evening", p)} />
        <ShiftEd title="Kiểm tra tuần (Chủ nhật)" shift={st.sundayWeeklyTest} onChange={(p) => setShift("sundayWeeklyTest", p)} />
        <Switch on={st.saturdayMakeup} onChange={(v) => patchSettings({ saturdayMakeup: v })} label="Thứ Bảy là ngày học bù / ôn nhẹ" />
        <Button small kind="ghost" onClick={() => patchSettings(DEFAULT_SETTINGS)}>Khôi phục lịch mặc định</Button>
      </Card>
      {week?.done && (
        <Card>
          <h3 class="h3">Thưởng tuần</h3>
          <p>{week.rewardClaimed ? "Đã nhận: " : "Đến hạn nhận: "}<strong>{st.weeklyReward}</strong></p>
          {!week.rewardClaimed && <Button kind="green" onClick={() => claimReward()}>Đánh dấu đã nhận thưởng</Button>}
        </Card>
      )}
      <Card>
        <h3 class="h3">Thẻ trên thông báo / màn hình khóa</h3>
        <p class="muted">Web app không làm được widget khóa màn hình như app gốc. Khi chủ cho phép thông báo, Android có thể hiện thẻ trên màn hình khóa. App cũng nhắc khi đến giờ ca học (chỉ khi đang mở trang, và im nếu bật chế độ công ty).</p>
        <Button kind="blue" wide onClick={() => void notifyCard(setMsg)}>Gửi thẻ ôn lên thông báo</Button>
        {msg && <p class="muted">{msg}</p>}
      </Card>
      <Card>
        <h3 class="h3">Dữ liệu giữa các máy</h3>
        <p class="muted">Xuất file JSON, chuyển sang máy kia rồi nhập vào. Đồng bộ mây (Gist) sẽ thêm sau — lớp lưu trữ đã tách sẵn.</p>
        <div class="tools">
          <Button kind="yellow" onClick={async () => {
            const data = await exportPayload();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "lohan-tien-do.json";
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
        <p class="muted">Cài ra màn hình chính (trình duyệt: “Thêm vào màn hình chính”). Bấm nút dưới để tải sẵn âm thanh và dữ liệu nét — lần sau học không cần mạng.</p>
        <Button kind="purple" wide onClick={() => void precacheAll(setMsg)}>Tải dữ liệu ngoại tuyến</Button>
        <div class="tools" style={{ marginTop: 8 }}>
          <Button kind="ghost" small onClick={() => go("/dict")}>Tra từ HSK1</Button>
          <Button kind="ghost" small onClick={() => go("/mistakes")}>Sổ lỗi sai</Button>
          <Button kind="ghost" small onClick={() => go("/penalty")}>Chép phạt</Button>
        </div>
      </Card>
      <p class="muted" style={{ textAlign: "center" }}>Lò Hán {__APP_VERSION__}</p>
    </div>
  );
}

function ShiftEd({ title, shift, onChange }: { title: string; shift: Shift; onChange: (p: Partial<Shift>) => void }) {
  const days = [1, 2, 3, 4, 5, 6, 0];
  const names = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  return (
    <div style={{ margin: "10px 0" }}>
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
  const n = new Notification("Lò Hán · " + word.hanzi, {
    body: "Nghĩa là gì? Mở app để trả lời — pinyin ẩn.",
    tag: "lohan-card",
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
