# SpaceOS: sở thích và thời tiết

Shell dùng GeeO branding, hai ngôn ngữ VI/EN và cấu hình thiết bị; chưa cung cấp phiên Gee-O Auth hoặc dữ liệu nhân sự. Dock bấm app đang focus sẽ thu nhỏ; bấm app đã thu nhỏ sẽ khôi phục. Menu Sắp lại giữ app đang mở, app thu nhỏ và focus; Đóng tất cả là lệnh riêng. Alt và mũi tên lặp lại sẽ trả cửa sổ về normal.

## Sở thích trên thiết bị

Appearance có light/dark/system, accent cho shell, sáu preset, lớp phủ ảnh/video 0–80%, chất liệu auto/frost/glass/opaque và giảm chuyển động. Automatic chọn frost thận trọng; enhanced glass do người dùng chọn. Tắt kính, hệ điều hành giảm transparency/contrast hoặc browser không hỗ trợ sẽ dùng nền đặc. Thân app luôn có surface đọc được.

Ảnh PNG/JPEG/WebP tối đa 3 MB được decode trước khi dùng, lưu cùng sở thích thiết bị. Video MP4/WebM tối đa 15 MB nằm trong IndexedDB `geeospace-ui-media`, tách biệt storage nghiệp vụ. Video không upload; object URL được thu hồi khi đổi media hoặc bỏ nền video. Video dừng khi tab ẩn, giảm chuyển động hoặc tắt motion. Browser chặn autoplay có thể giữ frame tĩnh; video lỗi/mất sẽ trở về nền GeeO với thông báo. Có thể thả tệp vào desktop hoặc Appearance. Reset chỉ đổi giao diện và xóa video thiết bị, giữ bố cục/app.

Khóa `geeospace.desktop.appearance.v1` được migrate cộng thêm trường; giữ theme/ảnh/glass cũ. Layout vẫn ở khóa riêng. Lưu debounce 250 ms và flush khi pagehide; nếu browser từ chối/quota đầy, thông báo rõ và giữ thay đổi trong phiên. Không lưu token, hồ sơ học viên, công hoặc lương trong các sở thích.

Companion là robot SVG tạo mới của GeeO: pause/resume, ẩn/hiện, kéo trong bounds tránh chrome, phím mũi tên và menu mở Today/Request/Assistant. Hiệu ứng vẫy tay chỉ chạy ngắn khi hover, tôn trọng pause/reduced-motion. Trên mobile nhân vật thu gọn; chạm hoặc focus để hiện điều khiển, có thể ẩn khi cần thêm diện tích. Companion chưa tạo thông báo cá nhân hoặc câu trả lời AI.

## Weather opt-in và cấu hình

Weather mặc định off, không gọi provider hoặc xin geolocation khi mở app. Người dùng chọn thành phố từ danh sách hoặc chủ động yêu cầu vị trí gần đúng. Tọa độ làm tròn 0.1 độ, chỉ lưu địa điểm đã chọn trên thiết bị; nút Tắt xóa consent/địa điểm, dừng refresh và xóa quan trắc khỏi UI. Không gắn địa điểm với tài khoản Gee-O.

BFF tại `/api/weather` chỉ hỗ trợ search/forecast, không nhận URL đích. Provider là Open-Meteo, host cố định, redirect bị chặn; timeout 6 giây, cache 30 phút tối đa 100 query, tối đa 20 query đang xử lý trong mỗi isolate, coalesce query trùng. Các giới hạn này không thay quota/rate limit toàn deployment; theo dõi provider usage trước khi public rộng. Client chỉ nhận địa điểm/quan trắc hoặc mã lỗi đã lọc, không nhận key hay exception URL. Thời gian quan trắc khác thời gian tải; UI giữ quan trắc cũ và ghi nhãn khi offline/lỗi/stale. Refresh mỗi 30 phút khi tab hiển thị, có refresh thủ công và online recovery.

Development Next và Workers có `APP_ENV=development` dùng evaluation endpoint. Môi trường khác bắt buộc có server secret `WEATHER_API_KEY` cho commercial Open-Meteo; thiếu cấu hình trả 503 `configuration`, không tự dùng free endpoint. Đặt secret qua cơ chế môi trường đang triển khai, không commit hoặc gửi key trong chat. [Điều khoản và gói Open-Meteo](https://open-meteo.com/en/pricing) cần được owner xác nhận trước bật production; không mua gói hoặc deploy trong đợt UI này. Hiển thị attribution Open-Meteo trong widget. Không cache token hoặc dữ liệu GeeO tại adapter này.

## Kiểm chứng

Regression nằm trong `tests/unit/appearance.test.ts`, `weather.test.ts`, `desktop-window.test.ts` và `tests/e2e/spaceos-chrome.spec.ts`. Bằng chứng theo revision trong [báo cáo UI](../../plans/reports/implementation-261031-1501-spaceos-ui.md); không coi browser headless là chứng minh Safari, trackpad, touch thật hoặc 120 Hz.
