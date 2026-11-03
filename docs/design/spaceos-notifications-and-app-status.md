# Thông báo và trạng thái ứng dụng trên SpaceOS

Áp dụng [quy chuẩn app nhúng](./spaceos-embedded-app-layout.md). Người dùng chọn app Thông báo độc lập, nhúng như Calendar ngày 03/11/2026. Source triển khai ở `apps/notifications/`; OS sở hữu cửa sổ và thanh trạng thái.

## App Thông báo

Bố cục tham chiếu được chuyển thành hai vùng: sidebar tìm kiếm/nguồn/chủ đề/tùy chọn và vùng cập nhật có bộ lọc thời gian, danh sách, chi tiết. Không sao chép các nhóm Leads, Sales, Email trong ảnh vì không phải nguồn GeeO đã được xác minh. Khi nhúng chỉ chrome OS hiển thị tên app; chạy riêng có header Thông báo. Dùng semantic tokens Calendar v1, GeeO đỏ tiết chế, bề mặt đặc, Inter/system sans, nội dung 14px và meta 12px.

| Kích thước | Quy tắc |
|---|---|
| Mở lần đầu trên desktop | 820px, co theo workspace |
| Kéo tối thiểu | 320px theo window manager hiện hành |
| Trên 640px viewport app | Sidebar 224px, vùng nội dung linh hoạt |
| Từ 640px trở xuống | Nguồn và tìm kiếm nằm trên danh sách; toolbar xuống dòng |
| Nhỏ nhất hỗ trợ | 320px; control 44px, không cuộn ngang |

Tìm kiếm không phân biệt dấu tiếng Việt, kết hợp chủ đề và Tất cả/Sắp diễn ra/Đã diễn ra. Nhóm chủ đề và tự cập nhật danh sách là sở thích của trình duyệt; chỉ các boolean này được lưu, không lưu sự kiện hoặc thông tin người dùng. Theme/locale, thu nhỏ và khôi phục giữ bộ lọc. Chi tiết dùng dialog với Escape, nút đóng và focus của trình duyệt.

Loading, chưa cấu hình, cần đăng nhập, thiếu quyền, lỗi nguồn, nguồn trống và không khớp bộ lọc là các trạng thái riêng. Mất quyền hoặc refresh lỗi xóa nội dung nguồn khỏi giao diện. Nguồn trống chỉ được kết luận sau response hợp lệ.

## Đối chiếu legacy

`ClientAppv1/src/components/dashboard/Notifications.js` lấy `GET /api/ClassEvents/GetEventsPerUser/{sub}`, nhóm theo `subject`, hiển thị `title` và `startTime`. Menu chuông trong `src/components/common/layout/AppMainLayout.js` dùng cùng loại dữ liệu. Component dashboard gọi `handleNotificationClick` nhưng không định nghĩa handler; không tái tạo hành vi lỗi đó.

- Đây là snapshot sự kiện lịch theo người dùng, chưa chứng minh là durable notification feed.
- `startTime` là giờ sự kiện, không phải giờ phát thông báo. Hiển thị theo Asia/Ho_Chi_Minh, ghi GMT+7.
- Badge là số sự kiện của snapshot, không phải unread hoặc số việc cần xử lý. Không có đánh dấu đã đọc/đọc tất cả cho nguồn này.
- Không suy ra thông báo mới, thay đổi hoặc hủy từ việc đọc snapshot. Không tạo nhắc việc khi nguồn lỗi.
- Không tạo deep link tới lớp từ title/subject. Mở item hiện xem chi tiết sự kiện; cần destination contract và quyền đã xác minh trước khi mở LMS.

Adapter trong `notification-data.mjs` dùng actor do server session resolver cung cấp, không nhận user ID/token từ query browser. Chỉ chiếu title/subject/startTime và identity snapshot; gộp row trùng chính xác. Identity này không dùng làm durable read-state ID. Timestamp không có offset đòi hỏi `sourceOffset` đã được owner xác nhận. Adapter mặc định trả chưa cấu hình cho đến khi có session integration thật.

## Ba lớp thông tin trên OS

| Lớp | Mục đích | Thông báo hiện tại |
|---|---|---|
| Icon trên thanh đầu | Liếc nhanh, mở popover | Chuông 17px trong hit area theo OS; số sự kiện khi nguồn xác định được |
| Popover | Tóm tắt ngắn và một hành động chính | Trạng thái nguồn, thời điểm kiểm tra, tùy chọn thông tin ngắn, Mở Thông báo |
| App đầy đủ | Tìm kiếm, lọc và đọc chi tiết | Danh sách nhóm theo chủ đề |

Toolbar không chứa tiêu đề sự kiện, tên người hoặc nội dung riêng tư. Không nhấp nháy icon, không toast cho từng snapshot và không thay đổi thứ tự icon theo số đếm. Trạng thái không xác định không hiển thị 0. Số lớn rút gọn 99+; tên truy cập và popover vẫn dùng số đầy đủ. Thông tin ngắn mặc định tắt; ở host ≤1100px chỉ giữ icon để dành chỗ cho utilities. Popover dùng top layer, Escape/outside-click và trả focus về trigger.

Cho các app tiếp theo, dùng cùng phân lớp nhưng đăng ký rõ app ID, icon từ registry OS, kiểu giá trị (count/progress/status), ưu tiên và quyền hiển thị. Đề xuất tối đa ba app được ghim cạnh utilities trên desktop; phần còn lại vào overflow có nhãn. Chỉ một dòng thông tin ngắn trên một item, không để app tự render HTML hoặc gửi URL tùy ý lên menubar. Chuông là mục đầu tiên được triển khai; registry nhiều app/ghim/overflow động là thiết kế mở rộng, chưa được bật trong bản này.

## Transport và realtime

`AppStatusTray` quản lý iframe `/status` riêng, nên đóng/thu nhỏ cửa sổ Thông báo không ngắt cập nhật toolbar. Iframe trạng thái chỉ tải `/api/status`, endpoint trả count/status/observedAt, không trả tiêu đề. App đầy đủ tải `/api/notifications`. Cả hai đều same-origin với app độc lập, không mở CORS wildcard.

Bridge v1 dùng `spaceos:ready` và `spaceos:init`, đồng bộ theme đã resolve, locale, reducedMotion, visible và instanceId. Cả hai phía kiểm tra exact origin và WindowProxy. Sau handshake, status channel gửi:

```json
{
  "type": "spaceos:app-status",
  "version": 1,
  "appId": "notifications",
  "instanceId": "host-issued-instance",
  "sequence": 1,
  "status": "ready",
  "count": 12,
  "observedAt": "2026-11-03T08:00:00.000Z"
}
```

Ví dụ trên chỉ minh họa contract. Runtime kiểm tra version, app ID, instance, sequence tăng, count nguyên có giới hạn và observation time. Trạng thái lỗi phải gửi count/observedAt = null; không chấp nhận payload chứa count giả cho lỗi. Host chỉ lấy trường đã định nghĩa, bỏ nội dung khác. Chỉ status frame đã đăng ký được cập nhật toolbar, không phải mọi iframe app.

Hiện dùng polling 60 giây, dừng request khi host ẩn và kiểm tra lại khi hiện. Không gọi polling là realtime push. Sau 150 giây không có trạng thái hợp lệ, host bỏ badge và báo cần cập nhật lại. Request có timeout, response cũ bị bỏ khi bị thay thế. Tab riêng dùng polling khi trang hiển thị; tắt tự cập nhật trong app chỉ tác động danh sách, không tắt kênh trạng thái của OS.

Khi backend có feed được xác thực, status channel có thể nhận SSE/WebSocket và phát cùng contract tới OS; cần cursor/reconnect/reconcile và permission-revocation trước khi kích hoạt. Không mở nhiều kết nối push cho mỗi lần mở cửa sổ. [Phase 6](../../plans/261029-1103-geeo-staff-workspace/phase-06-notification-board.md) vẫn sở hữu durable feed, read-state và rule nghiệp vụ; bản UI này không hoàn thành hoặc thay thế các gate đó.

## Chạy và kiểm tra

Xem [runbook app Thông báo](../runbooks/notifications-local.md) cho cổng, cấu hình, adapter session và các lệnh kiểm thử.
