# App Calendar độc lập tại máy

App dùng Node.js ≥22 <27. Entry chạy local là Next app ở `apps/calendar/` (port 3200); SpaceOS dùng 3100. `apps/calendar/server.mjs` là static server legacy, không phải entry mặc định. Kiểm tra owner cổng trước khi chạy, không chuyển cổng để né tiến trình đang sống.

```sh
SPACEOS_PARENT_ORIGIN=http://127.0.0.1:3100 npm --prefix apps/calendar run dev
```

Đặt `NEXT_PUBLIC_SPACEOS_CALENDAR_ORIGIN=http://127.0.0.1:3200` cho SpaceOS rồi chạy `npm run dev`. Giá trị public này được nhúng lúc build: production phải build lại với origin HTTPS đúng. Không dùng cùng origin với host. Mở app riêng tại `http://127.0.0.1:3200`, hoặc route `/calendar` của SpaceOS. Khi dừng công việc, Ctrl+C tiến trình app do mình khởi tạo; không dừng server của phiên khác.

`SPACEOS_PARENT_ORIGIN` phải là exact HTTPS origin, hoặc HTTP localhost/127.0.0.1 cho development. Chưa đặt thì standalone vẫn hoạt động và CSP từ chối mọi frame ancestor. `GET /api/events` yêu cầu `from`/`to` dạng ngày, `to` sau `from`, cửa sổ tối đa 42 ngày; ngoài phạm vi trả 400 `INVALID_DATE_RANGE`. Responses không được cache. Bridge (`spaceos:ready`/`spaceos:init` trong `components/desktop/embedded-calendar.tsx`) không mang access token.

## Kết nối nguồn thật

Entry mặc định chưa nạp session GeeO nên trả `CALENDAR_NOT_CONFIGURED` (503). Cấu hình origin chỉ kết nối giao diện, không tự cấp quyền truy cập dữ liệu. Không đặt access token trong biến `NEXT_PUBLIC_*`, query, localStorage hoặc postMessage.

Đường tích hợp server là `createCalendarEventsHandler` trong `apps/calendar/calendar-data.mjs`, qua `handleCalendar` trong `apps/calendar/lib/http-handler.mjs` và `createLocalMvpHandler` trong `apps/calendar/local-mvp.mjs`:

- `GEEO_CALENDAR_MVP_ACCESS_TOKEN` chỉ dùng cho local development; `NODE_ENV=production` có token thì route trả 503 `CALENDAR_MVP_DISABLED`. Token không rời server adapter.
- `GEEO_CALENDAR_API_ORIGIN` phải là exact origin đã xác minh (cho phép `https://dev-lms.gee-o.vn`, `https://lms.gee-o.vn`, `https://lms.gee-o.edu` theo `local-mvp.mjs`); sai định dạng bị từ chối lúc cấu hình, không thử dò endpoint.
- `GEEO_CALENDAR_SOURCE_OFFSET` chỉ đặt sau khi owner xác nhận timezone của event không offset; không tự suy theo máy chạy. Xem mẫu trong `apps/calendar/.env.example`.
- `resolveActor` local kiểm tra token qua `/auth/connect/userinfo`, yêu cầu `permission` chứa `class.schedule` và `branch_ids` không rỗng. Authorization theo campus vẫn thuộc backend.

Chưa cung cấp resolver hoặc bằng chứng quyền của source thì giữ adapter mặc định. Không tái sử dụng token trong bundle cũ hay credential của người khác.

## Kiểm thử

```sh
npm --prefix apps/calendar test
npm --prefix apps/calendar run typecheck
npm run test:embedded
```

`playwright.embedded.config.ts` khởi chạy cả ba dịch vụ (3100/3200/3300) khi chưa chạy, giữ server đang có tại local và tự dừng server do runner tạo. CI không reuse server. Fixtures chỉ được trả qua interception trong test, không nằm trong runtime app. Kiểm tra browser covers standalone/iframe, nguồn lỗi, responsive, locale và giữ bộ lọc khi resize/theme.

Thiết kế và quy chuẩn nhúng: [Calendar trong quy chuẩn app nhúng](../design/spaceos-embedded-app-layout.md).
