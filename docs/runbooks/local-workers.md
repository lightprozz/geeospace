# Local Workers và build

`npm run cf:build` chạy build Next và adapter OpenNext. `npm run cf:preview` mở local Workers tại 127.0.0.1:8787, dùng local D1/R2; không tạo tài nguyên remote. `npm run test:smoke:worker` tự quản lý vòng đời server preview.

`wrangler.jsonc` dùng nodejs_compat, assets output của OpenNext, self-reference service và hai binding DB/LEARNING_FILES. ID `local-geeospace` chỉ là định danh cho bộ mô phỏng local. Không triển khai nguyên cấu hình này lên account thật.

Điều kiện production còn thiếu: account/resource ID, domain, secret management, cấu hình auth đã kiểm chứng, nguồn nghiệp vụ và backup/restore thực tế. Một local build pass không cấp quyền gọi deployment. Triển khai staging/production phải xác định target và rollback trước khi chạy.

Không dùng `export const runtime = "edge"` cho OpenNext routes. Không dùng ISR/shared cache cho dữ liệu cá nhân; các trang workspace hiện dynamic. `/api/auth/login` trả problem 503 không cache; dữ liệu riêng sẽ cần auth/policy ở từng handler trước khi có kết nối.

Node/workerd có thể cần quyền mở cổng localhost trong sandbox. Nếu bị EPERM thì ghi rõ môi trường, không làm test giả hoặc đổi liên tục sang port khác. Port 3100 dành Next, 8787 dành Workers.

## Chuẩn bị staging và rollback

Chưa có staging target được cấp; các bước dưới đây là trình tự chuẩn bị, không phải deployment đã thực hiện. Người vận hành cần xác nhận account, environment, domain, resource bindings và quyền truy cập. Auth owner phải đăng ký đúng callback/logout và client PKCE; secret được quản lý tại target, không chuyển qua chat hoặc bundle client.

Trước phát hành, lưu source revision hoặc archive source khi chưa có Git checkout, lockfile và artifact đã qua `cf:build` cùng checksum; giữ riêng artifact trước đó và cấu hình binding/version tương ứng. Ghi deployment receipt sau khi phát hành bằng tuyến đã được owner xác nhận. Không dùng local resource ID trong `wrangler.jsonc` làm target staging.

Sau khi phát hành, kiểm tra health, HTTP 404, no-store, login/callback/logout, quyền actor/object và hành trình browser trên domain đích. Rollback chọn deployment/artifact trước đó có receipt xác minh và tương thích schema; thực hiện qua tuyến vận hành của target rồi chạy lại health và hành trình ảnh hưởng. Nếu có migration, theo protocol recovery ở tài liệu nền tảng trước khi đổi app version. Không có target/receipt thì chưa thể diễn tập hoặc công bố rollback staging thành công.
