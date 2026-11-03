# App Thông báo độc lập tại máy

App dùng Node.js ≥22 <27, không thêm dependency. Static server và API đọc nằm ở `apps/notifications/server.mjs`. Cổng cố định là 3300; SpaceOS dùng 3100. Kiểm tra owner cổng trước khi chạy, không chuyển cổng để né tiến trình đang sống.

```sh
SPACEOS_PARENT_ORIGIN=http://127.0.0.1:3100 npm --prefix apps/notifications start
```

Đặt `NEXT_PUBLIC_SPACEOS_NOTIFICATIONS_ORIGIN=http://127.0.0.1:3300` trong `.env.local` của SpaceOS và chạy `npm run dev`. Giá trị public này được nhúng lúc build: production phải build lại với origin HTTPS đúng. Không dùng cùng origin với host. Mở app riêng tại `http://127.0.0.1:3300`, hoặc route `/notifications` của SpaceOS. Khi dừng công việc, Ctrl+C tiến trình app do mình khởi tạo; không dừng server của phiên khác.

`SPACEOS_PARENT_ORIGIN` phải là exact HTTPS origin, hoặc HTTP localhost/127.0.0.1 cho development. Chưa đặt thì standalone vẫn hoạt động và CSP từ chối mọi frame ancestor. Server chỉ phục vụ allowlist assets và GET `/api/notifications`, `/api/status`; query bổ sung hoặc mutation bị từ chối. Responses không được cache. Bridge không mang access token. Production cần thiết lập session/cookie của app đúng mô hình đăng nhập đã duyệt; bridge không tự tạo SSO hay chuyển token của host vào iframe.

## Kết nối nguồn thật

Entry point mặc định chưa nạp session GeeO nên trả `NOTIFICATIONS_NOT_CONFIGURED` (503). Cấu hình origin chỉ kết nối giao diện, không tự cấp quyền truy cập dữ liệu. Không đặt access token trong biến `NEXT_PUBLIC_*`, query, localStorage hoặc postMessage.

Đường tích hợp server là `createNotificationsHandler` trong `notification-data.mjs`, truyền vào `createNotificationsServer({ spaceOrigin, getNotifications })`:

- `apiOrigin`: exact HTTPS origin đã xác minh có endpoint legacy. Route source được lấy từ caller legacy, chưa xác minh live bằng một phiên được cấp quyền.
- `resolveActor(request)`: xác minh session phía server rồi trả `subject`, `accessToken`, `canReadUserEvents`; không lấy các trường này trực tiếp từ query/header do client tự đặt. Authorization phía backend vẫn phải kiểm tra recipient.
- `sourceOffset`: chỉ cần cho timestamp upstream không có timezone; owner phải xác nhận giá trị, không tự suy theo máy chạy.

Chưa cung cấp resolver hoặc bằng chứng quyền của source thì giữ adapter mặc định. Không tái sử dụng token trong bundle cũ hay credential của người khác. Không có database/migration/read-state trong thay đổi này.

Các trạng thái 401/403/503 được giữ tách khỏi snapshot trống. Payload không hợp lệ hoặc network timeout báo unavailable, không trả danh sách rỗng thay lỗi. `/api/status` chỉ chiếu count và thời điểm quan sát; không có tiêu đề sự kiện. Cập nhật hiện là polling 60 giây, chưa có realtime push hoặc read receipts.

## Kiểm thử

```sh
npm --prefix apps/notifications test
npx vitest run tests/unit/app-status.test.ts tests/unit/desktop-window.test.ts
npm run test:notifications -- --workers=3
npm run typecheck
npm run lint
npm run build
```

Playwright config `playwright.notifications.config.ts` khởi chạy cả hai dịch vụ khi chưa chạy, giữ server đang có tại local và tự dừng server do runner tạo. Nếu tái sử dụng SpaceOS, xác minh origin notifications đã được nạp. CI không reuse server. Fixtures chỉ được trả qua interception trong test, không nằm trong runtime app. Kiểm tra browser covers standalone/iframe, nguồn lỗi, tìm kiếm, chi tiết, responsive, locale và status channel.

Thiết kế và ý nghĩa badge: [Thông báo và trạng thái ứng dụng](../design/spaceos-notifications-and-app-status.md).
