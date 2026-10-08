# Nâng từ 0.1 lên 0.2

Giữ nguyên Bundle ID `vn.giadinhanam.family` và cài đè IPA. Không gỡ bản 0.1 trước khi liên kết email. SQLite tự thêm cột mới và giữ nhật ký, nhắc việc, gia đình đang có.

## 1. Nâng database Supabase trước khi dùng bản mới

Trong cùng project đang dùng, mở SQL Editor, tạo query mới, dán toàn bộ `supabase/migrations/0002_family_social.sql` và chạy **một lần**. Không chạy lại `0001_family_core.sql`.

Migration thêm ảnh hồ sơ, chi tiết nhật ký, dấu xóa để đồng bộ, bài đăng, bình luận, lượt thích, kho ảnh private `family-media` và bảng theo dõi kết quả gửi thông báo. Không xóa hay tạo lại bảng dữ liệu cũ. Nếu có lỗi, transaction được rollback; gửi nguyên thông báo lỗi trước khi thử sửa dữ liệu.

## 2. Bật liên kết email và mã OTP

Trong Authentication:

1. Giữ Anonymous Sign-Ins bật để các máy đang dùng tiếp tục hoạt động.
2. Bật Email provider, Confirm email và **Allow manual linking** (tên/nhóm tùy phiên bản Dashboard).
3. Trong Email Templates → **Change Email Address**, thêm mã `{{ .Token }}` vào nội dung. Đây là email dùng khi liên kết tài khoản ẩn danh.
4. Trong Email Templates → **Magic Link**, hiển thị `{{ .Token }}` để đăng nhập lại bằng mã, không chỉ đường dẫn.
5. Cấu hình SMTP của bạn để gửi được đến hai địa chỉ email thật; dịch vụ email thử nghiệm của Supabase có giới hạn người nhận/tần suất.

Mẫu nội dung cho cả hai template (giữ nguyên dấu ngoặc):

```html
<h2>Gia Đình An Nam</h2>
<p>Mã xác nhận của bạn: <strong>{{ .Token }}</strong></p>
<p>Nhập mã trong ứng dụng. Nếu không yêu cầu, hãy bỏ qua email này.</p>
```

Trên mỗi iPhone: **Bảng tin → Tài khoản → Liên kết email**, dùng email riêng của người đó, nhập mã xác nhận. App dùng `updateUser` để giữ nguyên user ID và tư cách thành viên. Nếu email đã thuộc tài khoản khác, app báo lỗi; không tự gộp/xóa dữ liệu.

Trên máy mới: **Tài khoản → Khôi phục tài khoản cũ** trước khi tạo/ghép gia đình. Dùng email đã xác nhận, nhập OTP; gia đình cũ được tải lại. App chặn khôi phục đè lên một gia đình hoặc dữ liệu local đang chờ đồng bộ.

Nguồn: [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous), [Email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates).

## 3. Nâng hàm gửi push

Sau khi chạy migration:

```bash
cd /home/user/lua-obfuscator/becuame/gia-dinh-an-nam
npx supabase@latest login
npx supabase@latest functions deploy notify-family --project-ref YOUR_PROJECT_REF
```

Không cần đổi ba GitHub secrets. APNs/certificate/profile vẫn phải khớp như bản đầu.

Hàm mới kiểm tra từng ticket Expo, lưu ticket được chấp nhận và kiểm tra receipt cũ ở lần gọi tiếp theo sau ít nhất 15 phút. Token `DeviceNotRegistered` bị tắt. `accepted_by_expo` chỉ có nghĩa Expo nhận yêu cầu, không phải điện thoại đã hiển thị. Không có cron kiểm tra receipt khi không có lượt gọi nào tiếp theo. [Expo receipts](https://docs.expo.dev/push-notifications/sending-notifications/).

App lưu hàng đợi gửi push riêng, thử lại khi đồng bộ lúc app mở; sau tám lần lỗi cần xem nguyên nhân trong SQLite/Edge Function logs. Mạng ngắt đúng lúc gửi có thể gây thông báo lặp. Nhắc cục bộ được đối chiếu với lịch thật của iOS, sửa khi thay đổi giờ, hủy khi hoàn thành và phục hồi khi lịch của hệ điều hành bị mất. Tối đa 48 nhắc sắp tới được lập lịch trên mỗi máy; phần còn lại được bổ sung khi app mở/đồng bộ. Thiết bị còn lại cần mở app để nhận lịch mới hoặc thay đổi; không hứa hẹn iOS chạy đồng bộ nền khi app bị tắt.

## 4. Kiểm thử sau khi cài đè

1. Nhật ký cũ vẫn còn, thanh dưới có Bảng tin / Em bé / Cẩm nang.
2. Đăng bài và ảnh trên A; B kéo làm mới, thích và bình luận; A thấy cập nhật.
3. Đổi ảnh bìa/đại diện và tên bé; hai máy cùng thấy sau đồng bộ.
4. Ghi/sửa/xóa một lần bú ở chế độ offline; mở mạng và đồng bộ hai máy.
5. Bấm giờ ngủ, chuyển màn hình rồi quay lại: bộ đếm tiếp tục từ giờ bắt đầu.
6. Tạo hẹn giờ, sửa giờ, hoàn thành từ B; mở A để đồng bộ và kiểm tra lịch cục bộ.
7. Liên kết email trên cả hai máy; kiểm tra email xác nhận đến đúng người.

## Phạm vi bản 0.2

- Bảng tin cho hai thành viên, tối đa sáu ảnh mỗi bài; phân trang, like/bỏ like, bình luận, xóa nội dung của mình. Bài/ảnh cần mạng; chưa có hàng đợi đăng ảnh offline.
- Em bé: ảnh bìa, ảnh đại diện, hồ sơ; hai nhánh Đang mang thai / Đã sinh. Đổi nhánh chỉ đổi nhóm tiện ích; ngày sinh/ngày dự sinh chỉnh ở hồ sơ.
- Nhật ký: sửa/xóa, nhập giờ quá khứ, chi tiết bú/bỉm/tăng trưởng, bộ đếm bắt đầu được lưu qua lần mở app. Biểu đồ hiển thị lịch sử số đo của bé, chưa tính Z-score/bách phân vị WHO.
- Cẩm nang: bài đọc theo nhóm, tìm kiếm, lưu bài trên thiết bị; lịch tiêm/E.A.S.Y/khám thai cũ vẫn truy cập được. Hai bài dinh dưỡng mới có nguồn WHO. Chỉ nhóm Rota đã có lịch tiêm mới; các nhóm khác vẫn được đánh dấu dữ liệu cũ, chưa tuyên bố rà soát toàn bộ.
- Tài khoản: liên kết email, khôi phục trên máy mới, xem hai thành viên và bật/tắt token thông báo của chính mình. Chưa có quy trình tự gộp hai tài khoản hoặc thay thành viên gia đình.

Các tính năng lớn như album offline, ảnh đính kèm từng bản ghi y tế, nhiều hồ sơ bé, lịch E.A.S.Y tự chỉnh theo ngày, toàn bộ bài viết app gốc và xuất/nhập backup chưa nằm trong bản này.

## Kiểm tra dành cho phát triển

`npm test` chạy kiểm tra SQLite upgrade, hàng đợi và xóa đồng bộ, lịch thông báo, cùng RLS PostgreSQL thử nghiệm bằng PGlite. `npm run typecheck` kiểm tra TypeScript. Script build IPA chạy hai bước này trước khi gọi Xcode.
