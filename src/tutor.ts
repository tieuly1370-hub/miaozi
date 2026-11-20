import type { Settings } from "./schedule";

export type TutorMood = "cheer" | "nudge" | "scold" | "proud" | "calm";

export function tutorLine(kind: string, settings: Settings): { mood: TutorMood; text: string } {
  const n = settings.displayName || "chủ";
  // v2.2: giọng Miao — lười, láo, hơi kiêu nhưng quan tâm (cùng giọng spec/miao_lines_user.md).
  const map: Record<string, { mood: TutorMood; text: string }[]> = {
    morning: [
      { mood: "nudge", text: `Sáng rồi đấy ${n}. Mở link Nhai tôi giao, học xong quay lại làm bài cho tôi xem.` },
      { mood: "scold", text: `Đọc lướt không tính là học đâu. Lát nữa tôi hỏi bằng chữ Hán, không có pinyin cứu.` },
    ],
    evening: [
      { mood: "nudge", text: `Tối rồi, lấy tablet với bút ra. Viết không nhìn mẫu, nói không nhìn chữ.` },
      { mood: "calm", text: `Tối nay hai việc thôi: viết cho đúng, nói cho đúng thanh. Xong tôi cho đi ngủ.` },
    ],
    late: [{ mood: "scold", text: `Trễ hơn 30 phút rồi nhé. Thêm 5 thẻ ôn, coi như phí đến muộn.` }],
    missed: [{ mood: "scold", text: `Hôm qua trốn học à? Học bù trong 48 giờ, chép phạt 3 chữ. Tôi nhớ đấy.` }],
    pass: [
      { mood: "proud", text: `Qua rồi. Cũng được đấy, sang việc tiếp đi.` },
      { mood: "proud", text: `Đạt. Tôi công nhận, nhưng đừng vội vênh mặt.` },
    ],
    fail: [
      { mood: "scold", text: `Chưa qua. Đọc lý do bên dưới, làm lại đúng phần đó rồi thử lại.` },
      { mood: "scold", text: `Trượt rồi. Không sao, sửa đúng chỗ sai rồi làm lại ngay.` },
    ],
    gatePass: [
      { mood: "proud", text: `Qua rồi! Lần này là ${n} làm thật, không phải đoán. Tôi công nhận.` },
      { mood: "proud", text: `Đạt. Đừng tự mãn nhé, tuần sau tôi bốc lại chữ cũ đấy.` },
      { mood: "proud", text: `Ghê đấy, qua gọn. Thưởng bạn được ngủ sớm hôm nay.` },
    ],
    gateFail: [
      { mood: "scold", text: `Trượt rồi. Điểm cao mà viết không ra chữ thì tôi không cho qua đâu. Xem phần cần làm lại bên dưới.` },
      { mood: "scold", text: `Chưa đủ chuẩn. Ôn đúng chỗ sai bên dưới rồi làm lại, tôi chờ.` },
      { mood: "scold", text: `Sai vài chỗ thôi, đừng nản. Sửa xong mấy chỗ bên dưới rồi thi lại luôn.` },
    ],
    hint: [{ mood: "nudge", text: `Xem pinyin rồi nhé, thẻ này sẽ quay lại sớm hơn. Pinyin là cái nạng, đừng dựa mãi.` }],
    streakSave: [{ mood: "scold", text: `Mở app cho có thì không tính đâu. Làm đạt bài mới giữ được chuỗi.` }],
    weekDone: [{ mood: "proud", text: `Xong cả tuần rồi! Phần thưởng: ${settings.weeklyReward}. ${n} tự kiếm được đấy.` }],
    company: [{ mood: "calm", text: `Đang ở công ty thì học im lặng thôi, đeo tai nghe vào. Yêu cầu vẫn như cũ.` }],
    idle: [{ mood: "nudge", text: `Ngồi im nãy giờ rồi đấy. Ngồi không thì không tính giờ học đâu.` }],
    write: [{ mood: "nudge", text: `Viết đúng thứ tự nét nhé. Tay chưa nhớ thì chưa gọi là biết chữ.` }],
    speakFail: [{ mood: "scold", text: `Sai thanh là thành từ khác luôn đấy. Đọc chậm, rõ từng âm rồi nói lại.` }],
    speakPass: [{ mood: "proud", text: `Âm đúng, thanh đúng. Nói hay đấy, tôi nghe mà cũng phải gật gù.` }],
    welcome: [
      { mood: "nudge", text: `Chào ${n}. Tôi là Miao, gia sư kiêm giám thị. Học trên Nhai, về đây làm bài cho tôi xem. Không đoán mò, không nhảy cóc.` },
    ],
    sunday: [{ mood: "nudge", text: `Chủ nhật rồi, có kiểm tra tuần đấy. Tôi bốc chữ của mọi bài đã học, ôn trước đi.` }],
    saturday: [{ mood: "calm", text: `Thứ Bảy là ngày trả nợ. Nợ bài nào làm bài đó, không nợ thì ôn chữ cũ.` }],
  };
  const list = map[kind] || [{ mood: "calm" as TutorMood, text: `Tôi vẫn ở đây canh đấy, ${n} học tiếp đi.` }];
  return list[Math.floor(Math.random() * list.length)];
}
