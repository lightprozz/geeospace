# Địa chỉ tích hợp GeeO

Kiểm tra công khai ngày 31/10/2026, Asia/Ho_Chi_Minh. Các địa chỉ này là inventory và bằng chứng readiness; chưa kích hoạt connector hoặc xác nhận client Geeospace đã đăng ký. Không lưu credential ở đây.

| Thành phần | Địa chỉ | Bằng chứng và giới hạn |
|---|---|---|
| Login production | https://login.gee-o.vn | Người dùng cung cấp; trang trả 200. Root discovery trả 404, nên không dùng domain này làm OIDC issuer |
| LMS production | https://lms.gee-o.vn | Người dùng cung cấp; trang trả 200 và dẫn tới Login khi chưa xác thực. Bundle hiện khớp build legacy ClientAppv1, không phải bằng chứng GeeO-LMS-FE Next đã triển khai |
| Auth staging | https://dev-lms.gee-o.vn/auth | Khớp Authority trong cấu hình staging; discovery trả 200 và issuer đúng địa chỉ này |
| API staging origin | https://dev-lms.gee-o.vn | Route V2 Worklog đã đối chiếu source trả 401 khi GET không credential; chưa kiểm chứng dữ liệu, scope hoặc mutation |
| Auth API trong cấu hình gốc | https://auth-api-acad.gee-o.edu.vn | Là giá trị trong source config gốc; không kết nối được từ môi trường khảo sát, không chọn làm target đã xác minh |

## OIDC staging đã xác minh

Discovery: https://dev-lms.gee-o.vn/auth/.well-known/openid-configuration.

Metadata công khai trả authorize, token, userinfo và endsession dưới `/auth/connect/`. Server quảng bá `authorization_code` và PKCE `S256`; điều này chứng minh capability của server, không chứng minh một client bất kỳ được dùng code flow. Geeospace phải yêu cầu S256, không dùng plain chỉ vì discovery có liệt kê.

`AuthAPI/Startup.cs` nạp client in-memory từ `IdentityServerConfig.GetClients(Configuration)`. Source hiện có ba client dùng password/external_api/passwordless hoặc token_exchange; chưa thấy client Geeospace với code flow và redirect/logout allowlist. Không tái sử dụng client LMS hoặc token-exchange để thay thiết kế BFF đã duyệt. Chưa có cấu hình issuer/client được bật trong app Geeospace; auth route tiếp tục fail closed.

## Phân biệt frontend và route API

Bundle công khai `lms.gee-o.vn/static/js/main.7e77a339.chunk.js` khớp checksum và kích thước 815096 bytes với `GitHub/oldsource/ClientAppv1/build/static/js/main.7e77a339.chunk.js`. Không suy route/class/session của frontend Next mới từ bundle legacy này. URL deployment GeeO-LMS-FE mới và destination policy vẫn cần xác nhận trước LMS handoff.

Một ví dụ hướng dẫn workspace dùng `/api/v2/working-time/query`, nhưng route đó trả 404 trong lượt GET khảo sát và không phải route Worklog query hiện hữu. Caller FE và controller xác định `POST /api/v2/working-time/worklog/query`; route GET `worklog/shift-options` trả 401 không credential. Không đổi sang POST để dò endpoint và không dùng 401 làm bằng chứng user đã có quyền.

## Điều kiện còn thiếu

- Đăng ký client Geeospace code+PKCE, redirect/logout allowlist, scope/audience và owning login interaction; metadata chưa thay kiểm chứng authorize → callback → token.
- Xác nhận origin staging của Geeospace, target LMS-FE mới và người phụ trách Auth/SQL. Guide workspace ghi DevOps / Infrastructure Team sở hữu tài liệu triển khai, chưa xác nhận người/đơn vị vận hành từng service hoặc database.
- Cookie/session/refresh/revoke, quyền actor/object/campus, nguồn nghiệp vụ và recovery phải kiểm chứng với môi trường được cấp; không lấy secret từ client public hoặc chuyển token sang browser.

[Bằng chứng khảo sát](../../plans/reports/scout-261031-1040-geeo-integration-targets.md), [owner và gate](./service-owners.md), [plan hiện tại](../../plans/261029-1103-geeo-staff-workspace/plan.md).
