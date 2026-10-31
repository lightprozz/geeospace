export const modules = [
  { id: "today", label: "Hôm nay", description: "Lịch sắp tới và việc cần bạn xử lý.", icon: "home" },
  { id: "calendar", label: "Lịch làm việc", description: "Lịch cá nhân và lịch tại chi nhánh được phép xem.", icon: "calendar" },
  { id: "requests", label: "Yêu cầu của tôi", description: "Gửi yêu cầu, theo dõi tiến trình và xử lý việc được giao.", icon: "inbox" },
  { id: "learning", label: "Tự học", description: "Khóa được giao, nội dung tự chọn và tiến độ học.", icon: "book" },
  { id: "work", label: "Công & lương", description: "Đối chiếu công, thời gian làm việc và phiếu lương.", icon: "clock" },
  { id: "notifications", label: "Thông báo", description: "Cập nhật dành cho bạn và thông báo trung tâm.", icon: "bell" },
  { id: "assistant", label: "Trợ lý", description: "Hướng dẫn tìm và mở chức năng phù hợp.", icon: "sparkles" }
] as const;

export function findModule(id: string) {
  return modules.find((item) => item.id === id);
}
