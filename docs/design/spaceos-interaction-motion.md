# SpaceOS: chrome, tương tác và motion

SpaceOS là lớp OS của Geeospace. Bản thiết kế này giữ composition/hành vi Zuey, nhận diện/token GeeO và stack Next/React hiện tại; dùng Apple HIG hiện hành để hoàn thiện tính nhất quán, khả năng đọc và điều khiển. Không chuyển sang SwiftUI, không lấy asset chân dung, wallpaper hoặc SF Symbols của Apple/Zuey làm asset sản phẩm.

Ngày 31/10/2026 người dùng xác nhận khôi phục đủ Weather, VI/EN, companion GeeO có pause/ẩn và Appearance nâng cao. Quyết định này thay phần loại Weather/mascot khỏi brief trước. Những chức năng này là phạm vi phải triển khai, không phải đã hoàn tất.

Register: Product. Scene: giáo viên/nhân viên làm nhiều việc trên desktop và dùng Home/sheet trên điện thoại. Direction: OS quen thuộc, gọn và có chiều sâu để theo dõi app/ngữ cảnh. Color: giữ GeeO primary và semantic colors; tùy biến shell không đổi màu nghiệp vụ. Type: Inter theo GeeO. Signature: menubar, dock động, cửa sổ và companion GeeO. Dials: variance 3, motion 5 có giảm chuyển động, density 5.

## Cách áp dụng tài liệu Apple

Motion cần có mục đích, ngắn, theo thao tác và cho phép người dùng ngắt; không bắt họ chờ hiệu ứng. Đây là nguyên tắc tham chiếu, không phải bộ duration bắt buộc. [Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion).

Glass phân tách lớp điều khiển với nội dung; không phủ lên mọi card. [Apple HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials). Các cập nhật macOS 27 trong WWDC26 nhấn mạnh diffusion để dễ đọc, viền/specular để tách lớp và thích ứng accessibility. [Apple WWDC26](https://developer.apple.com/videos/play/wwdc2026/102/).

Window layout linh hoạt và hỗ trợ keyboard/pointing device là nền tảng cho công việc trên Mac. [Designing for macOS](https://developer.apple.com/design/human-interface-guidelines/designing-for-macos). SpaceOS áp dụng các nguyên tắc này trên web; không chiếm phím browser như Cmd+W/Q và không giả là menu bar hệ điều hành.

Zuey là chuẩn cho dock toggle đã được chọn: bấm app đang focus thì minimize. Không tự thay hành vi đó bằng một quy ước macOS khác chỉ vì thêm tài liệu Apple.

## Header và dock

| Bề mặt | Hợp đồng thiết kế |
|---|---|
| Menubar | Desktop fine-pointer dùng baseline 36px từ source; coarse-pointer/mobile giữ không gian đủ cho hit area 44px. Logo GeeO, app active khi có, nhóm utilities bên phải, account chip có nhãn và clock. Không ép mọi thiết bị vào control 28px của nguồn |
| Utilities | Weather, VI/EN, palette/shortcut chip, theme, companion toggle, account, clock. Thiếu chiều ngang dùng priority/overflow có keyboard, không ép các control chồng nhau |
| Tài khoản | Có nhãn nhìn thấy được; chỉ thể hiện trạng thái auth thật. Khi client chưa sẵn sàng, dẫn tới trạng thái kết nối, không giả đã đăng nhập |
| Dock | Nhóm app trước, nhóm utilities sau; Home ở nhóm app, không để launcher mới chiếm vị trí của Home. Không nhân bản mục học/LMS chỉ để đủ số icon như Zuey |
| Hình học | Baseline desktop 1440+: icon 48px, dock cao khoảng 66px, đáy 10px, gap 6px như source; smaller/coarse layout phải fit mà không giảm vùng chạm dưới yêu cầu. Đo theo CSS px và DPR, không theo pixel ảnh chụp |
| Fish-eye | Neighbor cùng dịch chuyển để chừa chỗ; không chỉ scale icon trong slot cố định. Đường cong mềm, peak tham chiếu 1.55/reach 150px; giảm biên độ nếu viewport không đủ. Mouse/trackpad có hover; touch không có hover giả |
| Trạng thái | Phân biệt closed, running, active và minimized bằng dot/focus/label; tooltip có tên và shortcut, xuất hiện cả khi keyboard focus. Overview có pressed state |
| Sắp lại | Giữ nguyên tập app đang mở, nội dung, draft, trạng thái và URL; chỉ đổi hình học/bounds. Đây không phải lệnh reset về hai app mặc định |
| Đóng tất cả | Lệnh riêng; không đánh đồng với show-desktop/minimize. Khi module có draft, đi qua hợp đồng unsaved-work của module |

## Hợp đồng trạng thái và điều phối

Tách trạng thái đích khỏi trạng thái đang trình bày. Business/UI state không phụ thuộc việc animation có được phát hay hoàn tất. Một owner quản lý mỗi transform; lifecycle, FLIP, overview và gesture không ghi đè nhau.

| Tình huống | Kết quả và chuyển tiếp |
|---|---|
| Dock → app đóng | Mở từ control gần nhất hoặc icon dock; focus app, cập nhật hash, giữ mounted content khi chỉ ẩn |
| Dock → app ở sau | Đưa ra trước; không chạy lại entrance toàn cửa sổ |
| Dock → app đang focus | Minimize về icon của chính app; focus app hợp lệ kế tiếp |
| Dock → app minimized | Restore theo đường ngược của minimize, không dùng entrance chung |
| Restore giữa minimize | Lấy vị trí/kích thước/opacity hiện tại rồi đảo đích; không nhảy về frame đầu |
| Close | Ra nhanh quanh tâm cửa sổ; ngắt input và chuyển focus hợp lệ, không biến thành animation bay về dock |
| Max/snap/overview | FLIP từ visual rect hiện tại tới rect mới; không layout animation liên tục toàn app |
| Gesture đang chuyển động | Bàn giao từ frame hiện tại sang pointer; không gọi finish để nhảy về đích trước khi kéo |
| Resize/breakpoint giữa animation | Rebase tới bounds mới; bỏ state desktop-only khi sang mobile, không để overview che Home/sheet |
| Background/reduced-motion | Hoàn tất hoặc dừng về state đích đúng; không để window vô hình còn nhận input hoặc overlay kẹt |

Nguồn mở app có loại control, rect, thời điểm và hạn hiệu lực; baseline tham chiếu 700ms. Không giữ vô hạn tọa độ của launcher đã đóng. Focus restoration trở lại trigger thật còn tồn tại, không luôn ép về logo.

## Motion tokens và choreography

Các số dưới đây là baseline SpaceOS đề xuất từ hành vi Zuey và nhu cầu web, **không phải thông số animation Apple công bố**. Được hiệu chỉnh bằng video và profiling trước nghiệm thu.

| Motion | Baseline | Easing/đường đi |
|---|---|---|
| Press/focus | 90–120ms | Phản hồi ngay, scale/brightness rất nhẹ; không đổi bố cục |
| Dock theo pointer | Cập nhật mỗi frame; hồi 200–340ms | Neighbor spacing liên tục; spring có damping, không rung kéo dài |
| Tooltip | Delay hover 150–250ms, vào 150ms | Opacity và dịch 4px; keyboard không phải chờ tìm thông tin |
| Menu/popover/palette | Vào 150–200ms, ra 120–160ms | Từ trigger, ease-out/ease-in; không thay bằng fade toàn màn hình |
| Open window | 340–440ms | Grow từ origin gần nhất, spring ngắn có kiểm soát; không kéo méo nội dung quá lâu |
| Minimize | Khoảng 440ms | Thu hẹp nhiều chặng rồi tăng tốc về dock, ease riêng; không cùng easing với open |
| Restore | 400–440ms | Đảo đường minimize và settle nhanh ở đích; không chỉ nối hai rect bằng scale chung |
| Close | Khoảng 150ms | Tâm khoảng 50%/40%, scale nhẹ, opacity và dịch xuống vài px; ease-in |
| Max/snap/overview | 300–340ms | Transform-only FLIP; layer focus và nhãn overview đồng bộ |
| Mobile sheet | Vào 360–440ms; ra 240–300ms | Trượt theo trục dọc; Home lùi nhẹ; kéo hủy hồi 160–220ms từ đúng vị trí ngón tay |
| Theme/material | 200–340ms | Crossfade khi khả dụng; nội dung, focus và preferences không reset |

Ngắt/retarget phải giữ liên tục vị trí và opacity; với spring giữ vận tốc nếu engine hỗ trợ. Không xếp hàng nhiều animation sau click lặp, không chờ timer để đổi state, không replay entrance khi chỉ focus. Token CSS đọc được cả `ms` và `s` sau tối ưu production.

## Material, depth và khả năng đọc

Menubar/dock/titlebar/popover là lớp functional material; thân app chứa bảng, form, học liệu và tiền lương dùng surface đọc được. Có shadow/rim/specular tiết chế, focused/inactive rõ ràng; không tăng blur toàn màn hình để tạo cảm giác cao cấp.

Tier nâng cao chỉ bật khi browser/capability và performance cho phép; frost là fallback, opaque dùng cho giảm transparency/contrast hoặc khi người dùng tắt. Web CSS không tự nhận tùy chỉnh native Liquid Glass; SpaceOS phải cung cấp preference và fallback riêng. `prefers-reduced-motion`, `prefers-reduced-transparency`, contrast/forced-colors có test tách biệt.

Không mặc định glass càng trong càng đúng macOS mới. Nội dung động sau chrome phải được diffused đủ để control/text vẫn rõ ở light/dark và wallpaper phức tạp. Không animate backdrop-filter trên vùng lớn trong lúc drag.

## Widgets đã chọn

| Widget | Hành vi đầy đủ cần xây |
|---|---|
| Weather | Mặc định off; người dùng chọn thành phố hoặc yêu cầu vị trí gần đúng. Có loading/offline/denied/not-found/error/stale/refresh/off và attribution. Không hiện nhiệt độ giả; không xin vị trí lúc mở app |
| VI/EN | Dịch toàn bộ shell, menu, tooltip, aria, widget/settings và placeholder app; giữ app ID/hash/window rect/theme/preferences. Dữ liệu và mã trạng thái nghiệp vụ không tự dịch hay đổi nghĩa |
| Companion GeeO | Hình/nhân vật do GeeO sở hữu hoặc tạo mới; hỗ trợ hiện/ẩn, pause/resume, kéo có bounds, trạng thái nghỉ/tương tác, menu hướng dẫn mở app thật. Không dùng chân dung Zuey hoặc giả thông báo/câu trả lời AI |
| Appearance nâng cao | Light/dark/system, shell accents phù hợp GeeO, dim cho ảnh/video, preset đầy đủ phù hợp thương hiệu, custom image/video, drag-drop, reset có phạm vi, glass tiers, reduced-motion/animation preference |

Companion chỉ đưa hướng dẫn chung ở Phase 1; notice riêng tư phải qua policy và nguồn Phase 6. Pause companion không vô hiệu motion điều hướng cần thiết của cả OS. Background video/hiệu ứng dừng khi hidden, reduced-motion hoặc người dùng pause; không chạy loop vô ích sau khi widget ẩn.

Ảnh/video từ thiết bị không tự upload. Media lớn dùng blob store phù hợp và revoke object URLs; storage đầy/không khả dụng có thông báo và phương án dùng trong phiên. Migrate preferences cũ mà không làm mất theme/layout/ảnh đã chọn. Không lưu token, dữ liệu học viên hoặc hồ sơ công/lương vào preferences.

Weather dùng adapter độc lập, timeout/cache có giới hạn và nguồn thật. Open-Meteo là một lựa chọn cho evaluation/prototype; dùng thương mại cần plan phù hợp theo nhà cung cấp, không tự coi free tier là quyền triển khai SME. [Open-Meteo pricing](https://open-meteo.com/en/pricing). Không mua dịch vụ hoặc nhận secret qua chat; credential nếu cần chỉ ở server. Provider/production activation được chốt trong bước triển khai widget, không chặn sửa hình học/interaction của OS.

## Tiêu chuẩn kiểm chứng “mượt”

Đây là mục tiêu nghiệm thu SpaceOS đề xuất, không phải số đo hiện tại hay cam kết từ Apple.

- Mỗi thao tác có feedback trong vòng 100ms; chrome không chờ dữ liệu API để cho biết đã nhận input.
- Chạy chuỗi mở → minimize → restore → close tại 10%/50%/90% tiến trình và click nhanh; không jump, ghost, stale callback hoặc lệch hash/focus. Có kiểm tra riêng pointercancel, mất capture và đổi breakpoint.
- Hover dock quét cả hai chiều và vào/ra nhanh: không icon overlap, tooltip nhảy, dock tràn viewport hoặc click nhầm icon do target di chuyển.
- Đo frame pacing theo tần số màn hình thực: T≈16.7ms ở 60Hz, T≈8.3ms ở 120Hz. Target p95 trong khoảng 1.25T và dưới 1% frame dài hơn 2T trong kịch bản steady-state; không long task >50ms do chính animation. Ghi hardware/browser/DPR/refresh và profiler overhead, không suy từ một lần headless.
- Có Chrome và Safari, mouse/trackpad, coarse pointer, keyboard, 320/375/768/1440 và màn hình lớn; có reflow 200%, light/dark, wallpaper tương phản và reduced preferences. Nếu môi trường không có một tổ hợp, ghi unverified thay vì pass.
- Lưu video reference/remake cùng viewport, theme, trạng thái và timeline để so origin/trajectory/duration/easing/settle. Chụp ảnh cuối animation chỉ chứng minh bố cục.
- Kiểm tra resource sau 50 vòng mở/đóng và ẩn widget: không tăng dần listener, RAF, object URL, animation hoặc media playback đang sống.

Các gate thực thi ở [chi tiết Phase 1](../../plans/261029-1103-geeo-staff-workspace/spaceos-chrome-refinement.md); bằng chứng trước sửa ở [audit header/dock](../../plans/reports/design-261031-1108-spaceos-chrome-motion.md).
