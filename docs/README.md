# Geeospace

Ứng dụng Next.js 16 dành cho giáo viên/nhân viên. Mã hiện tại là nền tảng Phase 1: desktop OS với menubar/dock/cửa sổ, Home mobile, trạng thái chưa kết nối, lỗi API, build OpenNext, kiểm thử local D1/R2 và recovery local. Chưa có phiên đăng nhập Gee-O Auth, dữ liệu lịch/yêu cầu/công, tự học hoặc kết nối Dify thực tế.

## Chạy tại máy

Từ gốc workspace, dùng Node.js 24 hoặc 26 và npm. Các phiên bản package thực tế nằm trong package.json và package-lock.json.

```sh
npm ci
npm run dev
```

Mở http://127.0.0.1:3100/ để vào desktop hoặc Home mobile. `/today`, `/calendar` và các route app vẫn mở đúng đích; các tương tác OS dùng hash của app. Giao diện chưa kết nối là chủ ý: không hiển thị lịch, số việc, tên người hay số tiền giả. `/sign-in` mở app Tài khoản giải thích auth chưa được thiết lập; `/api/auth/login` trả 503 `GEEO_AUTH_NOT_READY`. Không dùng shell như bằng chứng hoàn thiện nghiệp vụ.

Dock mở/khôi phục app; bấm app đang focus sẽ thu nhỏ. Ba nút trên titlebar đóng, thu nhỏ và phóng to; kéo titlebar hoặc các cạnh để sắp cửa sổ. Cmd/Ctrl+K tìm nhanh; Alt+O mở tổng quan; Giao diện đổi màu/hình nền. Trên điện thoại, chọn app từ Home, dùng nút Trang chủ hoặc kéo titlebar xuống để về Home.

## Kiểm chứng

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm run cf:build
npm run test:smoke:worker
```

Vitest unit/integration dùng fixture chỉ trong test. Integration tạo D1/R2 local tách biệt dưới thư mục tạm rồi hủy. Playwright dùng cổng cố định 3100/8787; local có thể tái sử dụng dev server 3100 sau khi xác minh health service là Geeospace. CI không tái sử dụng. Runner dừng server do nó tạo, giữ nguyên server người dùng đang chạy. Nếu cổng bận bởi dịch vụ khác, không tăng cổng hoặc kill tiến trình người khác.

Build/dev dùng Webpack vì Turbopack ở máy thực thi đã lỗi bind cổng nội bộ. Đây vẫn là Next.js 16. React dùng Server Components mặc định. Font Inter được bundle từ package, không tải Google Fonts lúc build.

## Nguồn và quyết định

- [Plan đang thực hiện](../plans/261029-1103-geeo-staff-workspace/plan.md).
- [Ranh giới kiến trúc](./architecture/platform-foundation.md).
- [Local Workers](./runbooks/local-workers.md), [backup/restore local](./runbooks/local-backup-restore.md).
- [GeeO SQL backup gate](./runbooks/geeo-sql-backup-restore.md).
- [Design brief](./design/employee-experience.md), [owner vận hành](./operations/service-owners.md).
- [Thiết kế chrome, interaction và motion SpaceOS](./design/spaceos-interaction-motion.md), cùng [sở thích thiết bị và cấu hình Weather](./operations/spaceos-preferences-weather.md).
- [Địa chỉ tích hợp GeeO đã xác minh](./operations/integration-targets.md); Auth/API staging đã tìm được, registered client và session integration vẫn chưa hoàn tất.

Legacy tại refer/zuey-me-main là bằng chứng hành vi, gồm khung OS đã được người dùng yêu cầu giữ lại ngày 30/10. Các component/state/CSS được dựng độc lập với token GeeO; không dùng source, assets cá nhân, workflow, migration hoặc account legacy. Phạm vi nghiệp vụ theo plan GeeO, không thêm lại commerce/booking hoặc nội dung tác giả.
