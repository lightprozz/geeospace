# Design brief và hành trình nền tảng

Quyết định bổ sung 31/10 lúc 11:08: khôi phục đủ Weather, VI/EN, companion GeeO pause/ẩn và Appearance nâng cao. [Đặc tả SpaceOS hiện hành](./spaceos-interaction-motion.md) quy định chrome, motion, material và nghiệm thu; các phần mô tả UI đã có bên dưới không có nghĩa các widget bổ sung đã triển khai. Quyết định này thay phần loại weather/companion trước đây.

Register: Product.

Scene: giáo viên/nhân viên chuyển giữa các công việc trong một desktop trên máy tính; trên điện thoại dùng Home và app sheet.

Direction: theo xác nhận 30/10, giữ toàn bộ cấu trúc OS của Zuey: menubar, wallpaper/wordmark, dock và cửa sổ độc lập; thay app bên trong bằng chức năng GeeO. Quyết định này thay thiết kế sidebar ban đầu. Desktop/tablet từ 768px, mobile dưới 768px. [Brief và nguồn](../../plans/reports/design-261030-1701-zuey-layout-realignment.md).

Color: restrained; light background oklch(1 0 0), text oklch(0.141 0.005 285.823), accent oklch(0.5368 0.2116 25.32). Dark primary oklch(0.625 0.2116 25.32), base radius 0.625rem. Semantic token và biến spacing nằm trong app/globals.css.

Giữ primary GeeO; dark primary-foreground dùng oklch(0.145 0 0) để chữ nhỏ trên nút đạt contrast khoảng 5.00:1. Cặp chữ sáng/primary của nguồn chỉ khoảng 3.62:1 ở dark; light giữ nguyên cặp nguồn, khoảng 5.24:1. Đây là điều chỉnh tương phản cho Geeospace, không sửa token LMS-FE.

Type: Inter Variable có tiếng Việt, bundle local. Signature: menubar + dock + cửa sổ, wordmark lớn trên wallpaper. Dials: variance 3, motion 5, density 5. Default dark như hướng tham chiếu; có light/system và reduced-motion.

Desktop Home mở Hôm nay và Trợ lý khi chưa có layout lưu; route riêng mở đúng app. Window có traffic lights, drag/resize/max/restore/snap/minimize và overview. Launcher/tìm nhanh dùng registry app GeeO. Chỉ lưu geometry và sở thích UI local, không token/dữ liệu riêng; trạng thái phone không ghi đè layout desktop.

Mobile Home có thẻ Geeospace, app grid, widget trạng thái và Ask bar; app mở thành full-height sheet với back/swipe. Appearance có dark/light/system, wallpaper preset, ảnh thiết bị PNG/JPEG/WebP tối đa 3 MB và kính có fallback. Ảnh không upload. Không dùng lại video/hình/font cá nhân legacy.

Window motion có một owner cho geometry và lifecycle trong `components/desktop/use-window-motion.ts`. Trạng thái đích cập nhật ngay, phần tử được giữ đến khi exit hoàn tất và không nhận input khi đóng/thu nhỏ. Open/restore có nguồn dock/control, max/snap/overview nội suy transform; animation đang chạy có thể bị thay bằng đích mới. Kéo/resize dùng ref/RAF và chỉ commit model khi kết thúc; click titlebar không tự restore cửa sổ maximized trước khi vượt ngưỡng kéo.

Motion tokens nằm trong `app/globals.css`, JavaScript đọc qua `lib/desktop/motion.ts` và chuyển cả đơn vị ms/s về milliseconds. Reduced-motion bỏ chuyển động không gian và hoàn tất state ngay. Mobile có hồi khi kéo hủy, sheet exit và Home lùi nhẹ; chuyển động không được thay đổi quy tắc Back/Forward hoặc ghi đè layout desktop. Menu dùng phím mũi tên/Home/End, titlebar hỗ trợ di chuyển bằng phím; coarse-pointer traffic controls có vùng bấm 44px. Khi JavaScript không hoạt động, giao diện đưa hướng dẫn khôi phục thay vì loading vô hạn.

Today có error boundary riêng cho từng nguồn; `components/workspace-region.tsx` định nghĩa loading/empty/forbidden/unavailable tách biệt để adapter sau này cung cấp trạng thái thật. Không biến unavailable thành empty hoặc hiển thị thử các trạng thái này bằng dữ liệu nghiệp vụ giả. Chưa có bằng chứng đầy đủ về lỗi widget/nguồn thật sau đăng nhập.

UI vẫn chưa kết nối nghiệp vụ. Không hiện số công việc bằng 0, lịch, người hoặc tiền giả. Trợ lý chưa kết nối Dify nên không tạo câu trả lời giả. Khung OS không thay xác thực/authorization server; chưa triển khai Phase 2.

Sau auth/nguồn thật, triển khai J1–J7 theo [hợp đồng đã duyệt](../../plans/261029-1103-geeo-staff-workspace/user-journeys-and-acceptance.md). Prototype đầu không chứng minh usability; U1/U2 cần nhân viên đại diện và ghi các điểm nhập lại/chuyển app/không hiểu trạng thái. Không xếp hạng nhân viên bằng dữ liệu đo UX.

## Sẵn sàng cho prototype nghiệp vụ

| Bề mặt | Trình bày và hành động đã xác định | Dữ liệu/owner phải xác minh trước khi bật |
|---|---|---|
| Today | Sắp tới → lịch/buổi/LMS; Cần tôi xử lý tách khỏi đã đọc; action giữ context và trạng thái nguồn | GeeO API/LMS owner: exact teacher occurrence, campus scope và destination hợp lệ |
| Yêu cầu của tôi | Phân biệt người gửi/người xử lý; hiển thị waitingOn/nextStep; prefill cần xác nhận, mutation chỉ theo canAct của server | Forms Runtime owner: template, receiver, DTO/permission, concurrency token và draft/idempotency thật |
| Công & lương | Phân biệt Worklog/Worktime/phiếu lương; kỳ công rõ; Báo sai lệch trỏ vào template được phép | Worklog/API owner và đơn vị tiếp nhận; publisher lương/công thức chờ đặc tả, không hiện số tiền giả |

Prototype local hiện chỉ chứng minh shell và trạng thái chưa kết nối, chưa chứng minh dữ liệu hay receiver workflow. Thiếu owner/template thì không tạo nút gửi hoạt động. Danh sách khảo sát draft/idempotency/DTO cùng phương án kết quả gửi chưa rõ ở [hợp đồng hành trình](../../plans/261029-1103-geeo-staff-workspace/user-journeys-and-acceptance.md); source hiện hữu và concurrency được ghi ở [source verification](../../plans/261029-1103-geeo-staff-workspace/reports/source-verification.md). J1–J7 được bổ sung test theo phase có nguồn, không trì hoãn OS/runtime harness đến lúc hoàn tất toàn app.
