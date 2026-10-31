# Gate backup/restore GeeO SQL Server

Chưa truy cập database GeeO và chưa thực hiện thay đổi schema/data. Hiện chưa xác nhận owner vận hành, database/context, nguồn backup hoặc quyền restore; tài liệu này là checklist gate, không phải runbook đã vận hành thành công.

Trước bất kỳ migration/seed/bulk update AuthAPI/GeeO nào, owner phải xác nhận target dev/staging/production, các database/context thực sự liên quan, snapshot point nhất quán, retention và nơi khôi phục tách biệt. Không đưa connection string/credential vào tài liệu hoặc logs.

Owner chạy backup bằng tuyến vận hành đã có của GeeO, ghi receipt/thời điểm/checksum nếu có, sau đó rehearsal restore vào database riêng và đối chiếu schema, record totals và integrity theo domain. Đo RPO/RTO thay vì tự đặt giá trị. Nếu cần freeze ghi, xác nhận thời gian và cách mở lại với người vận hành.

Migration chỉ được tiếp tục khi có bằng chứng backup/restore phù hợp target và ứng dụng/schema rollback hoặc forward-fix tương thích. Lấy backup mới ngay trước thay đổi tiếp theo. Không dùng script local D1/R2 để chứng minh SQL Server recovery và không restore toàn DB nhằm hoàn tác một thay đổi UI.
