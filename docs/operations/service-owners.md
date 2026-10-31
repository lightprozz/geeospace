# Owner và điều kiện kích hoạt

Guide workspace ghi DevOps / Infrastructure Team là owner tài liệu triển khai, nhưng chưa xác nhận owner thực thi Auth/SQL hoặc backup receipt. Bảng này ghi các vai trò phải được gán khi tích hợp, không giả rằng đã có owner hoặc SLA. [Địa chỉ tích hợp và bằng chứng mới](./integration-targets.md) đã xác định Auth/API staging; không cần hỏi lại toàn bộ URL từ đầu.

| Vai trò | Quyết định cần xác nhận | Gate |
|---|---|---|
| Owner Gee-O Auth | Issuer staging đã xác minh; còn client code+PKCE, callback, scope, login interaction, disable/revoke | Trước hoàn tất Phase 2 |
| Owner GeeO API/LMS | API staging đã xác minh route bảo vệ; còn target frontend Next mới, object/campus scope, route ID, exact teacher assignment | Phase 2/3 |
| Vận hành SQL Server | Database/context bị thay đổi, quyền backup, restore rehearsal, RPO/RTO | Trước schema/bulk write backend đầu tiên |
| Người nhận yêu cầu/báo sai công | Template được phép, người/đơn vị nhận và cách theo dõi | Trước bật action tương ứng |
| Publisher/assignment manager | Quyền trung tâm, nội dung khóa, rule quiz, giao/thu hồi | Phase 5 |
| Publisher thông báo | Audience, thời gian hiệu lực, rule/version và người xử lý | Phase 6 |
| Owner Dify Cloud | App URL/type, tài liệu được phép, tool credential | Phase 7 |
| Chủ nghiệp vụ lương | Công thức, nguồn input và publication workflow | Gate 8B; không cản module khác |

Thông báo giai đoạn này chỉ trong app theo kế hoạch; chưa thêm email/push hoặc SLA tự đặt. Các vai trò nghiệp vụ chưa được gán không được thay bằng quyền admin giả trong code.
