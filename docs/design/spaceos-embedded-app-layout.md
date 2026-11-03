# Quy chuẩn layout và theme cho app nhúng SpaceOS v1

Calendar là mẫu triển khai. Quy chuẩn áp dụng cho các app do team GeeO kiểm soát và có tích hợp bridge SpaceOS.

[App Thông báo](./spaceos-notifications-and-app-status.md) áp dụng cùng quy chuẩn, với sidebar nguồn/chủ đề, nội dung sự kiện và status channel riêng cho toolbar. Mở mặc định 820px, hỗ trợ tối thiểu 320px; bố cục đổi từ hai cột sang một cột tại 640px.

## Brief Calendar

- Register là Product. Giáo viên và nhân viên mở lịch cạnh các cửa sổ khác trên desktop hoặc dùng màn hình nhỏ khi di chuyển.
- Ưu tiên quét nhanh khoảng ngày, bộ lọc và lịch. Nhận diện GeeO đỏ tiết chế, nền sáng trung tính #f8f8fa, chữ #201f26, accent #b12536. Dark dùng cùng vai trò màu với bảng màu riêng.
- Dùng Inter nếu có và system sans làm dự phòng. Khoảng ngày là điểm nhấn chữ chính. Nhịp lưới lịch và dấu ngày hôm nay là chi tiết nhận diện.
- Variance 3, motion 2, density 6. Tiêu chí là bỏ hàng nhận diện trùng khi nhúng, giữ thao tác và trạng thái nguồn rõ ở 320px trở lên.

## Phân lớp

| Vùng | Quy tắc |
|---|---|
| OS chrome | SpaceOS sở hữu tên app, đóng/thu nhỏ, kéo cửa sổ và mở riêng. |
| Nhận diện standalone | App có header gọn với tên và icon khi chạy riêng. Ẩn header sau khi nhận context nhúng hợp lệ. |
| Toolbar nghiệp vụ | Giữ ngữ cảnh hiện tại, điều hướng và nhóm thao tác liên quan. Calendar đặt khoảng ngày, GMT+7, hôm nay, trước/sau, chế độ xem và chi nhánh tại đây. |
| Nội dung | Calendar, danh sách hoặc bảng là vùng chính. Trang chi tiết ưu tiên tên đối tượng và hành động của đối tượng. Form nhóm theo nhiệm vụ và đặt nút lưu tại vị trí dự đoán được. |
| Phản hồi | Hiện tải, trống, hết phiên, thiếu quyền và lỗi nguồn trong vùng trạng thái sát nội dung. Lỗi có hành động khắc phục khi khả dụng. |

Shopify tách app surface khỏi chrome của host. SpaceOS áp dụng phân lớp đó cho cửa sổ nhúng. [Shopify App Home](https://shopify.dev/docs/apps/build/app-home).

## Kích thước cửa sổ và bố cục responsive

Mỗi app phải ghi ba giá trị trong hồ sơ thiết kế trước khi tích hợp. Dùng CSS px và phân biệt kích thước cửa sổ desktop với chiều rộng viewport bên trong app.

| Giá trị | Ý nghĩa | Calendar |
|---|---|---|
| Chiều rộng mở mặc định | Kích thước desktop khi mở app lần đầu, co theo vùng làm việc | 820 px |
| Chiều rộng kéo tối thiểu trên desktop | Mức app đề xuất để thao tác chính vẫn thoải mái khi đặt cạnh cửa sổ khác | 480 px đề xuất cho Calendar |
| Viewport nhỏ nhất được hỗ trợ | Mức cần kiểm tra ở mobile, cửa sổ hẹp và zoom | 320 px |

- **Desktop rộng.** Calendar dùng lưới tuần bảy cột khi viewport của app rộng hơn 640 px. Toolbar đặt điều hướng, khoảng ngày và chế độ xem trên cùng hàng khi đủ chỗ.
- **Desktop thu hẹp.** Ở 640 px trở xuống, Calendar dùng danh sách theo ngày cho chế độ tuần và xuống dòng theo nhóm toolbar. Giữ ngày đang xem, bộ lọc và chế độ khi kéo cửa sổ.
- **Mobile.** SpaceOS mở app dạng sheet ở viewport host dưới 768 px. App bố trí nội dung theo chiều rộng thật của sheet, cho phép cuộn dọc và giữ vùng chạm chính từ 44 px. Lịch tháng giữ lưới để chọn ngày và mở lịch biểu.
- **Khi thiếu chiều rộng.** Ưu tiên bố cục gọn hoặc sheet. Giới hạn kéo desktop được áp dụng ở window manager khi có metadata theo app. Tránh đặt `min-width` cho trang iframe làm tràn màn hình ở mobile hoặc khi zoom.

Window manager hiện dùng giới hạn chung 320 px cho cửa sổ desktop. Mức 480 px là thông số thiết kế đề xuất của Calendar. Bố cục hiện tại vẫn hỗ trợ viewport hẹp đến 320 px.

## Tokens và hành vi

- Dùng semantic tokens cho nền app, bề mặt, nền phụ, chữ, chữ phụ, viền, accent, nền chọn và focus. Màu nghiệp vụ giữ cùng ngữ nghĩa khi đổi theme. Bề mặt nội dung dùng màu đặc và viền nhẹ.
- Nhịp spacing cơ sở 4px. Gutter nhúng 12–16px, standalone tối đa 28px. Khoảng nhóm toolbar 8–12px. Control desktop cao tối thiểu 36px, control chính trên thiết bị cảm ứng 44px. Calendar giữ nút ngày trong lưới tháng theo chiều rộng từng ô.
- Chữ nội dung 13–14px, meta 12px, tiêu đề ngữ cảnh 16–20px. Dùng trọng lượng chữ để phân cấp. Radius control 8px, vùng nội dung 10px.
- Theme standalone theo hệ thống. Khi nhúng, app áp dụng theme đã resolve, locale và reduced motion qua bridge hiện có. Đổi theme hoặc locale giữ khoảng ngày, chế độ và bộ lọc. Chrome OS điều phối motion cửa sổ. Calendar dùng phản hồi trạng thái tức thì.
- CSS mẫu v1 được phục vụ từ chính origin Calendar. Team có thể dùng cùng semantic token và ánh xạ sang component stack của mình. App độc lập nên pin bản CSS tương thích với release của mình. Atlassian cũng dùng token và context của host để đồng bộ theme cho app. [Atlassian theming](https://developer.atlassian.com/platform/forge/design-tokens-and-theming/).

## Kiểm tra trước khi duyệt app

- Kiểm tra nhúng và standalone ở 320, 375, 768 và 1440 CSS px, tại chiều rộng desktop tối thiểu của app và ngay hai phía điểm đổi bố cục. Kéo cửa sổ desktop qua các mức này và kiểm tra riêng sheet mobile. Đo theo viewport của app. Toolbar được xuống dòng theo nhóm, vùng trang không cuộn ngang. [WCAG Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
- Kiểm tra VI/EN, light/dark, reduced motion, keyboard và focus-visible. Đo tương phản chữ thường tối thiểu 4.5:1 và đường viền focus có tương phản tối thiểu 3:1.
- Kiểm tra dữ liệu thật và các trạng thái tải, trống, thiếu quyền, lỗi. Theme và resize không được làm mất bộ lọc, draft hoặc ngữ cảnh hiện tại.
- Khi nhúng, chỉ có một tiêu đề nhận diện app trong chrome cửa sổ. Ở tab riêng, tên app vẫn nhận diện được. Các điều khiển nghiệp vụ hoạt động ở cả hai chế độ.
