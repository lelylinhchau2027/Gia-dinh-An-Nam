# 0.5.1 (build 6): hàng đợi push và chẩn đoán crash

## Kết luận từ iPhone 11 và profile đã cung cấp

- Log 0.5.0 xác nhận iPhone 11/iOS 16.4. Không phải thấp hơn MinimumOSVersion 16.4.
- Exception là SIGABRT, đi qua RCTExceptionsManager `reportFatal`. Thiếu thông điệp JavaScript gốc nên chưa xác định lỗi dòng nào; không kết luận thiếu RAM hay jailbreak là nguyên nhân. Có tweak được nạp nhưng đó không phải bằng chứng tweak gây crash.
- Profile được cung cấp không có `aps-environment` cho iOS. Khóa `com.apple.developer.aps-environment` là khóa macOS. App ID của profile khác App ID An Nam. Đổi tên/Bundle ID sang App ID đó **không** bổ sung quyền iOS bị thiếu.
- Giữ `vn.giadinhanam.family` để cài đè. Không sửa profile Apple đã ký, không đổi Team/Bundle ID ngầm, không đưa `.p12`, `.mobileprovision`, `.ips` vào repository.

## Phần đã thay đổi trong mã

1. Đồng bộ đang chạy sẽ ghi nhớ yêu cầu tiếp theo, không bỏ qua tin nhắn mới đến lượt hẹn 60 giây. Sau tải dữ liệu, giao diện được làm mới trước khi chờ gửi push.
2. Migration 0004 tạo công việc push chat cùng transaction lưu tin nhắn. Retry upsert cùng tin không tạo thêm công việc. Worker dùng lease và lưu ticket từng thiết bị để hạn chế gửi trùng; không cam kết exactly-once nếu tiến trình dừng giữa Expo nhận và ghi ticket.
3. `dispatch-push` chạy từ webhook để gửi ngay, Cron để gửi lại/đọc receipt dù hai điện thoại đã đóng. Backoff có giới hạn, thông báo hết hạn sau 24 giờ; bài test sau 5 phút. Receipt được kiểm tra sau 15 phút. Lỗi receipt tạm thời không chặn tin mới.
4. Không có thiết bị nhận không còn được coi là thành công. Cài đặt có thử push máy chủ, trạng thái token hai người, hàng đợi/lỗi. Trạng thái `provider_accepted` chỉ là APNs/FCM đã nhận, không phải máy đã hiện banner.
5. Tự cập nhật token khi đã có quyền, vào foreground hoặc token thay đổi; không tự bật lại thiết bị người dùng đã tắt trong Tài khoản.
6. Lưu đồng bộ lỗi JS fatal trước khi RN kết thúc app. Không chặn RCTFatal và không che lỗi. Mở lại → Cài đặt → Chia sẻ lỗi JavaScript gần nhất. Báo cáo chỉ lưu máy; đã lọc URL/JWT nhưng vẫn cần xem trước khi chia sẻ.

Đây là nâng cấp cơ chế gửi và chẩn đoán, **chưa xác nhận sửa crash iPhone 11 và chưa xác nhận nhận push nền trên hai máy thật**. Giấy phép push/APNs phải hợp lệ trước khi nghiệm thu.

## Kiểm tra mã trước build

- TypeScript: đạt; 34/34 kiểm thử tự động đạt, gồm migration/RLS, retry từng thiết bị, lỗi receipt, tài khoản rời gia đình và ghi lỗi fatal.
- Hai Edge Function qua `deno check`; bundle JavaScript iOS export thành công.
- Kiểm tra trình duyệt với dữ liệu demo: nhật ký, E.A.S.Y, nhiều bé, chat offline và bố cục 320 px đạt. Nút lưu E.A.S.Y chờ hồ sơ bé tải xong; kịch bản cũng chờ dữ liệu trước khi nhập.
- Lượt Simulator 0.5 trước đó dừng vì kiểm tra `focused` của accessibility; ảnh cho thấy ô lượng sữa ở trên bàn phím. Đã sửa phép kiểm tra để dùng nội dung ô và thanh bàn phím. Chưa dùng kết quả đó để khẳng định tất cả bàn phím trên iPhone thật hoạt động đúng.

## Cần làm trên Supabase

Làm theo [PUSH_NOTIFICATIONS.md](PUSH_NOTIFICATIONS.md), mục “Triển khai 0.5.1”. Cần đủ:

- Migration 0001–0003 trước đó, sau đó `0004_reliable_chat_push.sql`.
- Triển khai lại `notify-family`, thêm `dispatch-push`.
- Webhook INSERT trên `chat_push_jobs` + Cron mỗi phút gọi worker với secret riêng.
- APNs credentials trên Expo và profile có quyền iOS đúng App ID/Team/môi trường.

Chỉ cài IPA **không tự nâng backend**. Chưa tự triển khai SQL, Function, webhook, Cron hay APNs từ workspace. Không lấy key bí mật từ file chứng chỉ để gửi lên dịch vụ.

## Kiểm tra sau cài

1. Cài đè, không gỡ app. Xác nhận dữ liệu và tài khoản còn nguyên trên hai máy.
2. Cài đặt → Đăng ký push; sau đó thử push máy chủ và đọc trạng thái. Token đã lưu chưa phải bằng chứng push thành công.
3. Máy B về Home/khóa màn hình, A gửi tin. Đổi vai; thử Wi-Fi/4G, mở app và đóng app. Ghi giờ gửi/giờ nhận thực tế, kiểm tra Focus/Notification Summary/quyền âm thanh.
4. Gửi tin khi A đang đồng bộ và khi mất mạng rồi kết nối lại. Tin chưa lên server chưa thể tạo push.
5. Sau 15 phút xem receipt. `NoRecipientToken`: máy đích chưa đăng ký; `InvalidCredentials`: cấu hình APNs/Expo; `DeviceNotRegistered`: mở máy đích và đăng ký lại.
6. iPhone 11 nếu vẫn crash: thử tắt tweak injection riêng cho app (không gỡ app), gửi báo cáo JS mới cùng `.ips`. Nếu app không mở được, báo cáo nằm trong Documents của app: `an-nam-last-error.json`.

Nguồn: [Apple: phân biệt entitlement iOS/macOS](https://developer.apple.com/library/archive/documentation/Miscellaneous/Reference/EntitlementKeyReference/Chapters/EnablingLocalAndPushNotifications.html), [Expo: ticket, receipt, retry](https://docs.expo.dev/push-notifications/sending-notifications/).
