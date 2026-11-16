import type { Settings } from "./schedule";

export type TutorMood = "cheer" | "nudge" | "scold" | "proud" | "calm";

export function tutorLine(kind: string, settings: Settings): { mood: TutorMood; text: string } {
  const n = settings.displayName || "chủ";
  const map: Record<string, { mood: TutorMood; text: string }[]> = {
    morning: [
      { mood: "nudge", text: `Miêu đây. Ca sáng rồi ${n} ơi, 30 phút nghe và đọc thôi, xong rồi lướt web cũng được.` },
      { mood: "cheer", text: `Ca nghe-đọc bắt đầu! Không cần học lâu, nhưng phải học thật.` },
    ],
    evening: [
      { mood: "nudge", text: `21 giờ rồi ${n}. Mở tablet, bút sẵn, 30 phút nói và viết nhé.` },
      { mood: "calm", text: `Tối chỉ ôn miệng và viết chữ, không nhồi từ mới. Từ từ cũng tới.` },
    ],
    late: [
      { mood: "scold", text: `${n} vào trễ hơn 30 phút. Miêu thêm 5 thẻ ôn hôm nay, không phải để phạt cho vui, mà để chữ đọng lại.` },
    ],
    missed: [
      { mood: "scold", text: `Bỏ một buổi rồi. Chuỗi vẫn giữ nếu ${n} học bù trong 48 giờ, kèm chép phạt 3 chữ. Làm luôn đi.` },
    ],
    pass: [
      { mood: "proud", text: `Đạt rồi! Bài sau chỉ mở khi phần nhận mặt chữ không pinyin cũng ổn. ${n} làm được đấy.` },
    ],
    fail: [
      { mood: "calm", text: `Chưa tới 80%. Không sao — chỉ ôn đúng chỗ sai, rồi thi lại. Không cần học lại cả bài.` },
    ],
    hint: [
      { mood: "nudge", text: `Hiện pinyin rồi thì thẻ này sẽ quay lại sớm hơn. Cứ dùng khi cần, đừng dùng thay vì nhìn chữ.` },
    ],
    streakSave: [
      { mood: "scold", text: `Vào cho có không tính. Buổi chỉ được ghi nhận khi làm đủ thời gian thật và đúng từ 70%.` },
    ],
    weekDone: [
      { mood: "proud", text: `Xong tuần rồi! Phần thưởng ${n} đã đặt là: ${settings.weeklyReward}. Nhận đi, đáng lắm.` },
    ],
    company: [
      { mood: "calm", text: `Chế độ công ty: im lặng, gọn, không chuông. Cứ học từng ô một.` },
    ],
    idle: [
      { mood: "nudge", text: `Hình như ${n} đang dừng. Thời gian rảnh không tính vào buổi học đâu.` },
    ],
    write: [
      { mood: "cheer", text: `Viết từng nét cho đúng. Tay nhớ thì mắt cũng nhớ.` },
    ],
    speakFail: [
      { mood: "nudge", text: `Chưa đạt. Đọc chậm, giữ đúng thanh. Đừng lướt như Duolingo — sai thanh là không qua.` },
    ],
    speakPass: [
      { mood: "proud", text: `Thanh điệu đúng, âm tiết đúng. Như vậy mới giữ được phát âm.` },
    ],
    welcome: [
      { mood: "cheer", text: `Chào ${n}. Lò Hán đi đúng Giáo trình chuẩn HSK1, 15 bài, có cổng chặn. Bắt đầu từ Nền móng, không nhảy cóc.` },
    ],
    sunday: [
      { mood: "nudge", text: `Chủ nhật nghỉ buổi sáng, nhưng tối 20 giờ có bài kiểm tra tuần 20 phút nhé.` },
    ],
    saturday: [
      { mood: "calm", text: `Thứ Bảy là ngày học bù. Không nợ thì chỉ cần ôn nhẹ 15 phút, muốn nghỉ cũng được.` },
    ],
  };
  const list = map[kind] || [{ mood: "calm" as TutorMood, text: `Miêu ở đây, ${n} cứ học tiếp.` }];
  return list[Math.floor(Math.random() * list.length)];
}
