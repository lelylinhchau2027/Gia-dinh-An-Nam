# Nâng cấp 0.5.0 — nhiều bé, ảnh và chat gia đình

## Trạng thái và lỗi iPhone 11

Phiên bản mã nguồn là **0.5.0, build 5**. Trạng thái build và IPA nằm tại [Build IPA for ESign](https://github.com/lelylinhchau2027/Gia-dinh-An-Nam/actions/workflows/build-unsigned-ios.yml); chọn lượt thành công đúng commit/phiên bản, tải artifact `gia-dinh-an-nam-unsigned-ipa` và giải nén. IPA chưa ký, giữ nguyên Bundle ID khi ký/cài đè.

Người dùng báo máy iPhone 11 jailbreak/cài TrollStore ghép gia đình thành công nhưng tắt app khi mở Em bé hoặc đăng bài. Chưa có phiên bản iOS và file crash `.ips`, nên **chưa xác định nguyên nhân native và chưa xác nhận đã sửa dứt điểm**. Không quy lỗi cho TrollStore chỉ từ cách cài đặt.

Các thay đổi phòng vệ đã làm:

- Chặn JSON chi tiết/đính kèm sai dạng và ngày không hợp lệ trước khi hiển thị; không gửi tọa độ NaN vào biểu đồ.
- Bảng tin dùng danh sách ảo hóa, chỉ dựng nhóm bài gần vùng xem; ảnh tải lên giới hạn cạnh dài 1600 px, không phóng ảnh dọc thành bitmap rất lớn.
- Thêm ErrorBoundary cho màn hình: lỗi render JavaScript có trang thử lại và báo cáo lưu trên máy. Nó **không bắt được** crash native, iOS jetsam/thiếu bộ nhớ hoặc lỗi do môi trường jailbreak.
- Báo cáo không tự gửi lên server. Người dùng chủ động chọn chia sẻ; không thêm SDK thu thập dữ liệu.

Lấy log: Cài đặt iPhone → Quyền riêng tư & Bảo mật (hoặc Quyền riêng tư, tùy iOS) → Phân tích & Cải tiến → Dữ liệu phân tích. Chọn file Gia Đình An Nam mới nhất; nếu bị hệ thống đóng do thiếu bộ nhớ, kiểm tra `JetsamEvent` cùng thời điểm. Có thể dùng công cụ xem crash sẵn có trên máy jailbreak. Gửi kèm phiên bản iOS, thao tác cuối cùng và cách cài IPA. Không cần gửi chứng chỉ, token hay database của bé.

Lượt Simulator 0.4 `37804027838` build/cài được, thất bại ở selector tên bé: ảnh đã hiển thị An Nam nhưng cây accessibility gộp tên trong nút hồ sơ. Kịch bản được đổi sang `assistant-scroll`. Không dùng kết quả này làm bằng chứng rằng iPhone 11 không crash; phần kiểm tra bàn phím khi đó chưa chạy đến.

## 1. Nâng Supabase trước khi dùng ảnh/video trong chat

1. Giữ nguyên project Supabase đang dùng; không tạo lại gia đình hoặc xóa app.
2. Bảo đảm đã chạy `0001_family_core.sql` và `0002_family_social.sql` ở các bản trước.
3. Mở SQL Editor trong đúng project.
4. Dán toàn bộ `supabase/migrations/0003_family_chat.sql`, bấm Run **một lần**.
5. Nếu báo lỗi, lưu thông báo lỗi để kiểm tra. Migration chạy trong transaction; không tự bỏ constraint hoặc tắt RLS để chạy cho qua.

Migration thêm `family_messages.attachments`, trạng thái đọc `family_message_reads`, RPC ghi nhận đọc và realtime của bảng này. Bucket `family-media` vẫn private; bổ sung MP4/MOV và giới hạn tối đa 25 MB. Chính sách kho ảnh vẫn giới hạn đường dẫn theo gia đình/người tải lên. Không xóa hồ sơ, nhật ký, bài đăng hoặc tin nhắn cũ.

Chưa áp dụng migration lên Supabase thật từ môi trường phát triển. Nếu chưa nâng, tin văn bản cũ vẫn đồng bộ; app sẽ yêu cầu nâng khi thêm media/trạng thái đọc. Cả hai iPhone nên dùng cùng bản mới để cùng xem tệp đính kèm.

## 2. Hồ sơ nhiều bé

- Em bé → **Đổi bé** → **Thêm bé vào gia đình**.
- Mỗi bé có tên, ngày sinh/dự sinh, ảnh bìa, avatar, nhật ký và lịch E.A.S.Y riêng.
- Chọn một bé trong bảng Đổi bé. Lựa chọn nhớ trên từng điện thoại, không ép điện thoại còn lại đổi theo.
- Thêm/sửa hồ sơ vẫn lưu cục bộ và đưa vào hàng đợi đồng bộ. Ảnh hồ sơ cần mạng và gia đình đã ghép.
- Avatar chuyển xuống sát chân ảnh bìa, để phần trên của ảnh bìa thoáng hơn.
- Không có thao tác xóa bé trong bản này, tránh xóa nhầm nhật ký gia đình.

## 3. Xem ảnh và nhắn tin

- Ảnh bài đăng hiển thị trọn khung theo tỷ lệ ảnh, không crop về khung cao 260 cố định. Ảnh cực dài/rộng được contain trong khung giới hạn.
- Chạm ảnh để mở toàn màn hình; iOS hỗ trợ chụm hai ngón phóng to. Ảnh tải lên vẫn được nén để chia sẻ, không phải bản gốc nguyên byte.
- Nút trò chuyện trên Bảng tin/Em bé mở cuộc trò chuyện hai người: bong bóng trái/phải, giờ gửi, chờ gửi/đã gửi/đã đọc, tải tin cũ hơn.
- Tin văn bản lưu vào SQLite trước, còn khi mất mạng sẽ chờ đồng bộ. “Đã gửi” nghĩa là server đã nhận, không tự coi là người kia đã đọc.
- Mỗi tin tối đa 4 ảnh/video; video MP4/MOV tối đa 25 MB. Media cần mạng để tải lên trước khi gửi. Video trên iOS dùng upload nhị phân native, không chuyển toàn bộ video thành base64 trong JavaScript.
- Video chỉ khởi tạo trình phát khi mở toàn màn hình; đóng màn hình sẽ giải phóng trình phát. Không tự phát mọi video trong danh sách.
- Ô soạn nằm ở đáy và có xử lý nâng lên cùng bàn phím. Cần nghiệm thu lại trên hai iPhone thật.
- Bản này chưa có cuộc gọi, ghi âm, tìm kiếm hội thoại, thu hồi tin hoặc bảo đảm lưu bản nháp chưa gửi khi đóng app. Ảnh đã tải lên nhưng bỏ khỏi bản nháp chưa được dọn tự động.

## 4. Thông báo: phân biệt hai loại

Đã đối chiếu `giaphaos-ios/src/services/notifications.ts` và `giaphaos-ios/app.config.js`: Gia Phả chỉ dùng thông báo **cục bộ**, không đăng ký token push. Vì thế việc Gia Phả báo được không chứng minh bản ký hiện tại có quyền APNs.

Trong Cài đặt của An Nam:

1. **Thử nhắc cục bộ sau 10 giây**: cấp quyền, về màn hình chính hoặc khóa máy, đợi thông báo. Không cần `aps-environment`.
2. **Đăng ký push từ máy người còn lại**: kiểm tra riêng token nhận push. Thiếu `aps-environment` sẽ có giải thích, không ảnh hưởng bước thử cục bộ.

`aps-environment` hợp lệ thuộc cấu hình ký/provisioning APNs. Chỉ thêm một khóa vào mã hoặc cài bằng TrollStore không tự hoàn tất đăng ký APNs. Chưa thay chứng chỉ, profile hay cấu hình Expo/APNs trong lượt này. Không bỏ entitlement của app chỉ để che lỗi.

Nhắc việc đã đồng bộ được đặt lịch cục bộ trên từng máy. Với lịch mới/sửa từ điện thoại khác, thiết bị cần nhận được dữ liệu trước. Tin nhắn mới khi app bị đóng vẫn cần push APNs; realtime khi app mở không thay thế được push nền.

Nguồn chính thức: [Apple — Push notification entitlement](https://developer.apple.com/library/archive/documentation/Miscellaneous/Reference/EntitlementKeyReference/Chapters/EnablingLocalAndPushNotifications.html), [Expo Video](https://docs.expo.dev/versions/v57.0.0/sdk/video/).

## 5. Kiểm thử trước khi build IPA

```bash
npm run typecheck
npm test
# Với server web và Playwright/Chromium đã cài, chỉ profile thử riêng:
npm run test:ui
```

Test gồm migration giữ dữ liệu cũ, chọn hai bé và tách nhật ký, nhận đủ bé sau ghép, hàng đợi tin nhắn media, giới hạn tệp, thiếu APNs không chặn nhắc cục bộ, PostgreSQL/RLS cô lập tin nhắn/media/trạng thái đọc.

Kiểm thử tại máy phát triển ngày 09/10/2026: TypeScript đạt; **23/23 test đạt**; browser smoke test đạt các luồng nhật ký, E.A.S.Y, huy chương/răng, thêm/chuyển hai bé không lẫn dữ liệu, tin nhắn cục bộ còn sau tải lại, bố cục 320 px và không có lỗi JavaScript chưa bắt. Đây không phải kiểm thử đồng bộ trên hai iPhone thật.

Browser test không dùng tài khoản gia đình thật; không thay thế việc thử native. Có thể chạy `Check iOS UI` và `Build IPA for ESign` sau khi push. Bản mới thêm module native phát video, nên phải build/cài IPA mới; bundle JS riêng không đủ.

Trên máy thật: thử mở Em bé ngay sau ghép; chuyển qua lại hai bé; tạo một bản ghi ở mỗi bé và so trên máy kia; xem ảnh bài đăng ngang/dọc và toàn màn hình; gửi tin khi mất mạng; gửi ảnh/video và kiểm tra ở máy kia; thử bàn phím số/multiline; thử cả hai nút thông báo. Giữ Bundle ID và cài đè, không gỡ app trước khi bảo đảm dữ liệu đã đồng bộ.
