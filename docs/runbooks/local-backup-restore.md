# Backup/restore local D1 và R2

Phạm vi: snapshot logic của DB và bucket LEARNING_FILES trong local state. Không truy cập Cloudflare remote, không thay thế D1 Time Travel/R2 recovery production hoặc SQL Server backup. Chưa có business schema/dữ liệu người dùng.

Trước snapshot, dừng toàn bộ writer/dev/preview ở workspace. `--writers-stopped` là xác nhận của người vận hành; script không thể chứng minh mọi writer ngoài app đã ngừng. Không chạy với luồng ghi đang hoạt động vì DB/R2 không có transaction chung. File snapshot chứa nội dung riêng, được ghi mode 0600 và không ghi đè; giữ ở thư mục riêng an toàn và không commit.

```sh
npm run backup:local -- /private/tmp/geeospace-backup.json --writers-stopped
npm run restore:local -- /private/tmp/geeospace-backup.json /private/tmp/geeospace-restored-new
```

Backup đọc `.wrangler/state`; restore bắt buộc thư mục mới chưa tồn tại và nằm ngoài active state, kể cả khi thư mục cha đi qua symlink. Script dùng đường dẫn vật lý sau khi resolve symlink. Snapshot có checksum; corruption bị chặn trước khi ghi. Kiểm tra lại cấu trúc, tập bản ghi không phụ thuộc thứ tự SELECT và object bodies sau phục hồi.

Destination mới có `restore-status.json`: `in-progress`, rồi `verified` sau kiểm chứng. Nếu restore thất bại giữa DB và R2, script đánh dấu `failed`, đổi tên vùng mới sang hậu tố `.failed-<timestamp>` và báo đường dẫn cách ly. Không dùng vùng cách ly làm active state; giữ snapshot và nguồn để điều tra. Script không xóa hoặc đổi tên thư mục đã tồn tại do người dùng cung cấp.

Giới hạn được cố ý fail closed: payload tối đa 16 MiB, không virtual/FTS tables, không integer vượt safe range, không extended R2 HTTP metadata ngoài contentType, không snapshot đang có writer. Custom metadata và file bodies được giữ. Khi business schema hoặc dữ liệu vượt giới hạn, cần recovery route phù hợp và test trước migration; không coi việc có script này là đã đạt recovery production.

`npm run test:integration` dùng D1/R2 thật qua local runtime: backup trạng thái trống trước schema test, kiểm tra unique constraint/batch rollback/CAS, snapshot DB + file, từ chối bản corrupt, restore sang vùng tách biệt rồi so dữ liệu/checksum. Test chỉ chứa fixture và hủy vùng test sau chạy.
