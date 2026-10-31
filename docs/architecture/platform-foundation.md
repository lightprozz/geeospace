# Nền tảng và ranh giới dữ liệu

Next.js App Router là UI và backend của Geeospace. Auth sẽ dùng Gee-O Auth duy nhất; API GeeO tiếp tục sở hữu lịch/lớp, request, công và lương. Chưa có adapter nghiệp vụ hoặc tài khoản riêng ở mã nền tảng này.

Đề xuất Cloudflare dùng OpenNext, D1 và R2 được kiểm chứng local trước khi có dữ liệu thật. `wrangler.jsonc` là cấu hình local, tên DB/bucket và ID local không là tài nguyên Cloudflare đã cấp. Không có script deploy production. Môi trường staging/production cần account/resource/client/domain được xác minh riêng.

Phần server configuration chỉ nhận URL hợp lệ, HTTPS ngoài loopback development, không cho credential/query/hash trong URL. Lỗi chỉ nêu trường cấu hình, không echo giá trị. `/api/health` báo khả dụng của service/binding, không trả endpoint upstream hoặc credential. `loadReadOnlySource` giới hạn thời gian từng nguồn và trả unavailable độc lập; lỗi không chuyển thành danh sách trống hoặc công việc đã xong.

Plain Next development hỗ trợ shell không binding. Ngoài development, Worker thiếu context, APP_ENV, APP_ORIGIN, DB hoặc LEARNING_FILES phải trả health 503; không fallback sang cấu hình local. Các page workspace có route riêng để URL không tồn tại trả HTTP 404 trước khi render/stream; không dùng catch-all để dựng module tùy ý.

## UI shell và navigation

Theo quyết định 30/10, desktop/window manager và Home mobile thay sidebar. Registry tại `lib/desktop/apps.ts` chỉ là metadata UI công khai. Route riêng là entry mở app; thao tác sau đó dùng canonical `/#<app-id>`. Hash chỉ nhận ID whitelist, không là quyền truy cập hoặc nguồn dữ liệu nghiệp vụ. Desktop hash phản ánh cửa sổ active: minimize, close hoặc show-desktop cập nhật hash; reload không mở lại app đã minimize chỉ vì hash cũ. Direct link từ ngoài vẫn mở đúng app.

Trên phone, mở app từ Home tạo entry sheet, chuyển app bên trong thay entry đó. Back/swipe quay lại Home bằng history khi entry do shell tạo; entry bên ngoài không bị back ra website khác. Browser Back/Forward và chuyển breakpoint phải giữ app/hash nhất quán. Local layout chỉ chứa ID, rect, mode và trạng thái cửa sổ; phone không ghi đè layout desktop. Appearance chỉ chứa sở thích và ảnh thiết bị được kiểm tra, không upload. Lỗi storage không chặn sử dụng UI.

Các panel hiện là trạng thái chưa kết nối. Phase sau vẫn phải có server session/policy trong handler; việc app xuất hiện trong dock, launcher hoặc URL không cấp quyền đọc/ghi. Nội dung từ Dify/iframe cũng không tự điều khiển window state bằng message tùy ý.

## Quyết định ranh giới dữ liệu

Timezone nghiệp vụ là `Asia/Ho_Chi_Minh`; không lấy ngày/kỳ công từ timezone trình duyệt. GeeO giữ quyền sở hữu dữ liệu nghiệp vụ hiện hữu; Next BFF không nhân bản lịch, request, công hoặc lương thành hệ thống thứ hai.

| Nhóm dữ liệu | Owner và điều kiện lưu |
|---|---|
| Danh mục tính năng, trạng thái chưa kết nối | Geeospace; không chứa thông tin cá nhân |
| Lịch, request, công, lương | GeeO; chỉ qua connector theo người dùng sau Phase 2 |
| Token và server session | Chưa triển khai; chỉ server, mã hóa/version/revocation theo Phase 2 |
| Enrollment, quiz, completion | D1 dự kiến; chờ schema, quyền, concurrency và recovery gate Phase 5 |
| Học liệu riêng | R2 dự kiến; chờ upload/quota/retention/access gate Phase 5 |
| Snapshot local | File riêng mode 0600; chỉ local drill, không commit hoặc coi là backup production |

Capability local đã thử: D1 rollback cả batch khi vi phạm unique, conditional update theo version, R2 body/contentType/custom metadata và restore sang vùng tách biệt. Chưa chốt quota/retention của account thật, schema quan hệ khóa học, upload dở dang, cookie/streaming session và recovery production. Chỉ có binding registry, chưa có business migration; các gate đó không được suy ra từ test fixture.

Ứng dụng đang dùng Next 16.4.3 và OpenNext 1.20.14 theo peer requirement tại ngày triển khai. Có override dependency bắc cầu `adm-zip` và glob của node-minify để giữ adapter đã vá middleware mà audit không còn cảnh báo hiện hữu; package manifest/lockfile là nguồn chi tiết. Không chạy audit fix --force hoặc hạ adapter chưa vá.

Các hợp đồng tương lai vẫn phải có server session, actor/scope, CSRF và object authorization trước khi đọc/ghi dữ liệu riêng. Không dùng shell công khai hoặc visibility navigation làm lớp bảo mật. Giai đoạn này mọi module chỉ hiển thị trạng thái chưa kết nối, không nhận credential của người dùng.

Business schema chưa được áp vào D1. `db/schema.ts` mới xác định tên binding. Test capability dùng schema tạm riêng để chứng minh batch rollback, CAS, file storage và logical restore. Backup local có giới hạn, không là bằng chứng backup SQL Server hoặc recovery production.

## Capability và migration trước dữ liệu thật

| Năng lực | Bằng chứng hiện có | Điều kiện còn thiếu |
|---|---|---|
| Quan hệ/transaction | Integration test dùng D1 thật local: unique, batch rollback, version CAS | Schema quan hệ khóa học, foreign keys và concurrency theo domain ở phase sở hữu |
| File | R2 local giữ body, content type, custom metadata qua snapshot/restore | Upload dở dang, giới hạn kích thước, quyền đọc theo enrollment và policy file thật |
| Integrity/recovery | Checksum snapshot, từ chối corruption và restore vào vùng mới | Backup production, lịch retention, RPO/RTO và diễn tập trên target được cấp |
| Runtime | Next/OpenNext build và browser smoke trên workerd | Cookie/streaming session thật sau khi có Auth client; account/resource limits thật |
| Quota/retention | Local snapshot chủ động giới hạn 16 MiB; đây là giới hạn công cụ local | Owner chốt quota học liệu, số attempt, retention session/draft/quiz/file; không dùng giới hạn snapshot làm quota sản phẩm |

Migration nghiệp vụ phải forward-only, version tăng và đi cùng app version tương thích. Trước lần áp đầu tiên, owner ghi target, schema hiện tại, backup receipt/checksum và restore destination tách biệt; xác minh recovery trước khi chạy. Mỗi migration chỉ được áp một lần, ghi version khi thành công; thất bại không đánh dấu đã áp. Không dựa vào transaction xuyên D1/R2: file upload cần trạng thái pending/committed, checksum và cleanup theo hợp đồng phase học liệu.

Thay đổi phá vỡ schema dùng expand → backfill có checkpoint → chuyển reader/writer → contract ở bản sau, chỉ sau backup mới và kiểm tra compatibility. Nếu lỗi, dừng writer liên quan, giữ receipt và bản sao lỗi; ưu tiên forward-fix hoặc app artifact còn tương thích. Restore database cần owner quyết định và integrity check, không tự restore đè dữ liệu mới. Chưa có business migration hoặc account thật nên đây là protocol thiết kế, không phải bằng chứng migration production đã chạy.

Tài liệu đối chiếu: [OpenNext setup](https://opennext.js.org/cloudflare/get-started), [Cloudflare OpenNext](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/). Không đổi sang vinext hoặc export tĩnh để vượt gate.
