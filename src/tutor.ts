import type { Settings } from "./schedule";

export type TutorMood = "cheer" | "nudge" | "scold" | "proud" | "calm";

export function tutorLine(kind: string, settings: Settings): { mood: TutorMood; text: string } {
  const n = settings.displayName || "chủ";
  const map: Record<string, { mood: TutorMood; text: string }[]> = {
    morning: [
      { mood: "nudge", text: `Ca sáng. Mở đúng link Nhai Miao giao, học đủ thời gian, rồi quay lại làm kiểm tra ca. Không đạt kiểm tra thì ca này coi như chưa học.` },
      { mood: "scold", text: `Đọc lướt không phải là học. Nghe từng từ, nhìn từng nét. Lát nữa Miao hỏi bằng chữ Hán, không có pinyin cứu đâu.` },
    ],
    evening: [
      { mood: "nudge", text: `21 giờ. Tablet, bút. Viết từ trí nhớ và nói không nhìn chữ. Kiểm tra cuối ca quyết định ca có được tính hay không.` },
      { mood: "calm", text: `Tối nay chỉ có hai việc: viết đúng và nói đúng thanh. Sai một nét cũng là sai.` },
    ],
    late: [
      { mood: "scold", text: `Trễ hơn 30 phút. Thêm 5 thẻ ôn. Đúng giờ là một phần của bài học.` },
    ],
    missed: [
      { mood: "scold", text: `Bỏ ca. Học bù trong 48 giờ, chép phạt 3 chữ. Không có ngoại lệ.` },
    ],
    pass: [
      { mood: "proud", text: `Đạt. Đúng mức yêu cầu, không hơn. Sang việc tiếp.` },
    ],
    fail: [
      { mood: "scold", text: `Không đạt. Đọc kỹ lý do, làm đúng phần phải làm lại, rồi mới thi lại.` },
    ],
    gatePass: [
      { mood: "proud", text: `Đạt. Kỹ năng này ${n} làm được thật, không phải đoán. Giữ được như vậy ở các kỹ năng còn lại.` },
      { mood: "proud", text: `Qua. Miao ghi nhận. Đừng tự mãn — tuần sau Miao bốc lại chữ cũ.` },
    ],
    gateFail: [
      { mood: "scold", text: `Trượt. Điểm cao mà không viết được chữ thì vô nghĩa — Miao không cho qua kiểu đó. Làm lại đúng phần ghi bên dưới, mai thi lại.` },
      { mood: "scold", text: `Chưa đủ chuẩn. Không có điểm khuyến khích, không có thi lại ngay. Ôn đúng chỗ sai rồi quay lại.` },
    ],
    hint: [
      { mood: "nudge", text: `Đã xem pinyin thì thẻ này quay lại sớm hơn. Pinyin là nạng, không phải chân.` },
    ],
    streakSave: [
      { mood: "scold", text: `Mở app cho có không tính. Ca chỉ được ghi nhận khi kiểm tra cuối ca đạt.` },
    ],
    weekDone: [
      { mood: "proud", text: `Tuần đạt. Phần thưởng: ${settings.weeklyReward}. ${n} đã làm ra nó.` },
    ],
    company: [
      { mood: "calm", text: `Chế độ công ty: im lặng, không chuông. Yêu cầu vẫn như cũ.` },
    ],
    idle: [
      { mood: "nudge", text: `Đang dừng. Thời gian ngồi không không được tính.` },
    ],
    write: [
      { mood: "nudge", text: `Viết đúng thứ tự nét. Tay không nhớ thì chưa phải là biết chữ.` },
    ],
    speakFail: [
      { mood: "scold", text: `Sai thanh là sai từ. Đọc chậm, rõ từng âm tiết, rồi làm lại.` },
    ],
    speakPass: [
      { mood: "proud", text: `Đúng phụ âm, đúng vần, đúng thanh. Đạt.` },
    ],
    welcome: [
      { mood: "nudge", text: `Chào ${n}. Miao là gia sư, không phải bạn chơi. Học trên Nhai HSK theo đúng link Miao giao, kiểm tra ở đây. Qua bài phải đủ 4 kỹ năng, viết đúng 100% từ trí nhớ. Không nhảy cóc, không đoán mò.` },
    ],
    sunday: [
      { mood: "nudge", text: `Chủ nhật nghỉ ca sáng. Tối có kiểm tra tuần, bốc ngẫu nhiên chữ của mọi bài đã qua.` },
    ],
    saturday: [
      { mood: "calm", text: `Thứ Bảy là ngày trả nợ. Nợ ca nào thì làm kiểm tra ca đó. Không nợ thì ôn chữ cũ.` },
    ],
  };
  const list = map[kind] || [{ mood: "calm" as TutorMood, text: `Miao ở đây, ${n} cứ học tiếp.` }];
  return list[Math.floor(Math.random() * list.length)];
}
