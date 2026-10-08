# Làm lại giao diện — 0.4.0 (build 4)

## Lý do làm lại

Hai ảnh chụp bản 0.3 trên iPhone cho thấy nội dung bị thụt hai bên, khoảng trống tím lớn phía dưới và nhiều icon hiển thị không đúng chức năng. Kết quả kiểm tra web trước đó không phản ánh được các lỗi native này.

- `Screen` dùng chung padding của trang cuộn cho cả khung không cuộn; `padding: 0` không ghi đè các thuộc tính cụ thể `paddingHorizontal` / `paddingBottom`. Tab Em bé nay có khung tràn ngang riêng; `Screen` cũng bỏ cách ghép padding này.
- Đã đối chiếu PNG trong IPA build 3 với PNG trong repository: byte ảnh đúng. Chưa xác định được nguyên nhân cuối cùng của việc tráo icon trên iPhone. Bản mới chuyển bitmap sang nguồn ảnh định danh bằng nội dung (`data:image/png;base64`), không dùng mã số đăng ký asset. Test so sánh toàn bộ byte và ánh xạ từng tiện ích. Đây là biện pháp phòng ngừa; vẫn cần xác nhận trên iPhone.

## Đã thay đổi

- **Em bé:** ảnh bìa tràn ngang, avatar và tên ở giữa; thanh tím xuất hiện khi cuộn; font Quicksand; lưới bốn cột theo thứ tự gốc; nút “Khác” mở lựa chọn tiện ích. Chuyển thai kỳ / đã sinh trong bảng hồ sơ, không chiếm thêm một khối trên trang chính. Cỡ chữ trợ năng rất lớn dùng ba cột.
- **Icon:** dùng ảnh gốc, đường cong nền vuông bo tròn và SVG lịch hai tông màu trích từ IPA. Các glyph báo / danh sách / răng vẫn dùng FontAwesome tương ứng, không tuyên bố toàn bộ pixel đã giống tuyệt đối.
- **Nhật ký tiện ích:** trang riêng theo ngày cho sữa, hút sữa, ngủ, bỉm, ăn dặm, cảm xúc…; có tổng, ngày trước/sau, nút Thêm, lịch sử mọi ngày và sửa từng bản ghi. Cảm xúc có lịch tháng. Nhấn giữ icon ở tab Em bé để ghi nhanh.
- **Huy chương:** khôi phục đủ 64 mục trong 5 nhóm 17/13/8/13/13 từ truy vấn tham chiếu công khai. Chọn tiêu chí → ghi ngày → sửa/xóa qua nhật ký; biểu đồ chỉ phản ánh số tiêu chí gia đình đã ghi. Không cộng trùng, không tự gán kỷ niệm cũ vào tiêu chí.
- **Răng:** hai ảnh lợi và năm đường SVG gốc tạo đủ 20 răng, số hiển thị 1–10 theo bản gốc. Giữ nguyên khóa vị trí của bản 0.3 (`Trên · Phải 1`...) để không mất ghi nhận cũ.
- **E.A.S.Y:** trang danh sách riêng, lịch của bé và các mẫu phổ biến; thay giờ bắt đầu để dịch các mốc; lưu lựa chọn qua nhật ký chung, tiếp tục dùng cơ chế đồng bộ sẵn có. Chưa tự tạo nhắc giờ. Chưa có trình sửa từng hoạt động trong lịch.
- **Bảng tin / Cẩm nang:** thanh tiêu đề tím gọn, bỏ phần mở đầu lớn; bài đăng và bài đọc dạng danh sách. Giữ đăng ảnh, like, bình luận, tìm kiếm và lưu bài.
- **Bàn phím:** `Screen` bật inset bàn phím native iOS, cuộn tới ô vừa focus khi bàn phím đang mở; kéo để thu bàn phím, nút lưu không cần chạm hai lần. Các form dùng `FormInput` và thanh “Xong” riêng cho từng màn hình, kể cả bàn phím số. Không cộng thêm một lớp KeyboardAvoidingView để tránh đẩy nội dung hai lần.
- **Tab bar:** tính phần đáy theo safe area, bỏ padding đáy 120 cố định và tăng phần dành cho icon/nhãn để tránh cắt chữ.

## Dữ liệu và quyền riêng tư

Không đổi Bundle ID hoặc tên database. Không xóa dữ liệu và không cần SQL migration mới ngoài `0002_family_social.sql` đã dùng ở 0.2.

- Huy chương lưu `details.tool = milestones`, `medalId`, `milestone`, `category`. Kỷ niệm cũ không có `medalId` vẫn đọc được trong nhật ký.
- Lựa chọn E.A.S.Y lưu như một sự kiện gia đình: `details.tool = easy_plan`, `templateId`, `wakeTime`. Danh sách lấy lựa chọn mới nhất; không tính sự kiện này thành một cữ sữa hoặc giấc ngủ.
- Tùy chọn ẩn/hiện tiện ích chỉ lưu trên thiết bị. Đóng bảng mà chưa bấm Xong không áp dụng bản nháp. Chỉ cho chỉnh sau khi tải xong đúng hồ sơ bé/giai đoạn, tránh lấy nhầm lựa chọn mặc định trong lúc app khởi động.
- Bộ huy chương là **dữ liệu gốc chưa kiểm chứng y khoa mới**, không phải thang chẩn đoán. Các cảnh báo và nguồn lịch tiêm tiếp tục giữ nguyên.
- Không sao chép tài khoản, token, executable, ảnh trẻ khác hoặc bài cộng đồng. Ảnh/video người dùng cung cấp để đối chiếu không được đưa vào repository.

Tái tạo dữ liệu (chỉ cần khi thay nguồn):

```bash
python3 scripts/extract_legacy_icons.py /duong/dan/app-goc.ipa
node scripts/extract_legacy_teeth.cjs /duong/dan/app-goc.ipa
npm run assets:legacy
node scripts/export_legacy_medals.cjs
```

Script hình răng chỉ phân tích literal, không chạy mã trong IPA. Script huy chương chỉ yêu cầu tên nhóm và tiêu chí công khai, không có child ID / user ID / xác thực; chỉ thay snapshot sau khi kiểm tra đủ số mục.

## Kiểm tra tự động và giới hạn

- `npm test`: 16 test, gồm dữ liệu/đồng bộ/phân quyền cũ, ánh xạ icon và nguyên byte PNG, 64 tiêu chí không trùng, tọa độ răng, tổng theo đơn vị, dịch giờ E.A.S.Y qua nửa đêm.
- `npm run typecheck`: kiểm tra TypeScript.
- `scripts/ui_smoke.cjs`: kiểm tra Chromium 390×844 và 320×740 với profile riêng, chỉ dữ liệu thử. Lưu/hủy ẩn tiện ích và mở lại app; tạo/sửa sữa; tách sữa hút; lưu huy chương và răng; lưu giờ E.A.S.Y; tìm trong cẩm nang. Ảnh ở `build/preview/assistant-04-*.png`, được gitignore.
- Xuất bundle iOS bằng Expo là kiểm tra đóng gói JS/tài nguyên, **không phải build IPA và không chứng minh bàn phím native đúng**.

Chạy smoke test khi có `playwright-core` và Chromium:

```bash
npx expo start --web --offline --port 8086
# Trong terminal khác; NODE_PATH chỉ cần nếu cài playwright-core ở thư mục riêng.
UI_BASE_URL=http://localhost:8086 npm run test:ui
```

Chưa chạy native trên macOS/iPhone trong lượt sửa này. Chưa phát hành IPA mới.

### Kiểm tra native bằng GitHub Actions

Workflow `.github/workflows/check-ios-ui.yml` (tên **Check iOS UI**) chỉ chạy thủ công. Nó build bản Release cho Simulator trong thư mục tạm, không đụng thư mục `ios/` đang làm việc và không cấp Supabase secrets cho app thử nghiệm. Khởi động một iPhone Simulator có sẵn, cài Maestro CLI 2.11.0 với kiểm tra SHA-256, rồi chạy `.maestro/assistant.yaml`.

Kịch bản mở tab Em bé, chụp icon; nhập lượng sữa, chuyển xuống ghi chú nhiều dòng, chụp màn hình lúc bàn phím mở; bấm Xong; lưu và mở lại app để kiểm tra bản ghi; chụp form số đo và sơ đồ răng. Artifact **an-nam-native-ui** chứa ảnh và chẩn đoán kể cả khi test thất bại.

Đây là bộ kiểm tra mới **chưa được chạy**. `assertVisible`/focus và thao tác lưu không thay thế việc nhìn ảnh để xác nhận ô nhập không bị bàn phím che. Chạy workflow IPA riêng sau đó nếu cần cài lên iPhone.

Tham khảo chính thức: [Maestro iOS](https://docs.maestro.dev/get-started/supported-platform/ios), [Maestro CLI](https://docs.maestro.dev/maestro-cli/maestro-cli-commands-and-options), [chụp ảnh test](https://docs.maestro.dev/reference/commands-available/takescreenshot).

## Chưa tương đương 100% app gốc

- “Bé cùng tuần sinh” giữ đúng vị trí/icon nhưng hiển thị trạng thái chưa kết nối cộng đồng; không thay bằng “Việc của bố mẹ” nữa. Không có dữ liệu cộng đồng và không nối tài khoản vào máy chủ cũ.
- “Bé theo tuần” vẫn là lịch sử gia đình; chưa có toàn bộ bài phát triển theo tuần của bản gốc.
- Chưa kéo thả thứ tự tiện ích, chưa sửa từng hoạt động E.A.S.Y hoặc gắn ảnh riêng cho từng ghi nhận răng/huy chương.
- Lịch tiêm chưa tính lịch cá nhân đầy đủ, chưa khôi phục đủ các trạng thái cũ. Biểu đồ số đo chưa có các đường chuẩn được kiểm chứng.
- Không sao chép nguyên logic máy chủ/đăng nhập/cộng đồng cũ. Lưu trữ, đồng bộ và phân quyền vẫn là hệ thống của Gia Đình An Nam.

## Cần kiểm tra trên iPhone trước khi coi là đạt

1. Cài đè build 4, giữ dữ liệu và cùng Bundle ID. So ảnh bìa, avatar, lưới icon và cuộn tới đáy; không còn dải tím thừa/cắt nhãn tab.
2. Nhập lượng sữa bằng bàn phím số → chuyển sang ghi chú ở cuối form khi bàn phím vẫn mở → gõ nhiều dòng. Ô nhập/con trỏ phải còn nhìn thấy; nút Xong đóng bàn phím; có thể cuộn tới Lưu.
3. Lặp lại với ba số đo, tên/nơi tiêm, hồ sơ bé, bài đăng, bình luận và lời nhắn. Kiểm tra màn hình modal và khi bật cỡ chữ lớn.
4. Lưu khi mất mạng; đóng/mở lại app; nối mạng và xác nhận trên điện thoại người còn lại. Thử sửa/xóa một bản ghi răng, huy chương và sữa.
5. Đối chiếu từng màn hình với video gốc trước khi nhận là giống hoàn toàn. Không dùng ảnh web thay cho nghiệm thu iPhone.

## Tài nguyên gốc

Ảnh và các dữ liệu trích từ app gốc thuộc tác giả tương ứng; việc có IPA không tự tạo giấy phép phân phối lại. Các tài nguyên này phục vụ bản thử nghiệm cá nhân theo yêu cầu người dùng. Trước khi phân phối rộng rãi cần xác nhận quyền sử dụng hoặc thay bằng tài nguyên được cấp phép.
