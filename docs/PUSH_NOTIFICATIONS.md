# Thông báo của Gia Đình An Nam

Ứng dụng dùng hai lớp thông báo vì mỗi lớp giải quyết một nhu cầu khác nhau.

## 1. Nhắc đúng giờ trên chính điện thoại

Khi tạo việc, app lập lịch thông báo cục bộ ngay trên máy. Cách này không cần mạng và thường chính xác hơn remote push cho lịch cố định. Mỗi điện thoại sau khi đồng bộ một việc cần tự lập lịch cục bộ cho việc đó.

## 2. Báo ngay cho người còn lại

Khi một người ghi sữa, gửi lời nhắn hoặc tạo việc, app gọi Edge Function `notify-family`. Hàm xác nhận người gửi là thành viên, chỉ lấy token của người còn lại, rồi gửi qua Expo Push Service đến APNs.

Remote push là cơ chế “best effort”: iOS có quyền trì hoãn hoặc gom thông báo trong một số trạng thái. Vì vậy không nên dùng remote push làm đồng hồ báo duy nhất cho thuốc hay lịch y tế quan trọng.

## Yêu cầu bắt buộc trên iPhone

Việc cài trực tiếp file IPA không bỏ qua hệ thống ký mã và APNs của Apple. Để remote push hoạt động cần:

1. Tài khoản Apple Developer trả phí.
2. App ID khớp bundle ID `vn.giadinhanam.family` và có Push Notifications capability.
3. APNs key/certificate hợp lệ gắn vào bản build.
4. Provisioning profile hợp lệ cho hai iPhone nếu dùng Ad Hoc; mỗi UDID phải có trong profile.
5. EAS project ID trong cấu hình build và APNs key được cấu hình cho đúng Expo project nếu dùng Expo Push Service. Expo Go không phải bản kiểm thử push cuối cùng.

Quy trình dự kiến:

```bash
npx eas login
npx eas init
npx eas credentials
npx eas build --platform ios --profile adhoc
```

Sau khi Supabase được tạo:

```bash
supabase db push
supabase functions deploy notify-family
```

Không đặt APNs key, `.p8`, service-role key hoặc mật khẩu Apple trong app hay Git. Service-role key chỉ tồn tại trong môi trường Edge Function.

Nếu ký IPA bằng ESign, profile dùng để ký phải cung cấp entitlement `aps-environment` cho đúng bundle ID. ESign không thể biến một profile không có quyền push thành profile có quyền push. Xem quy trình riêng tại [`BUILD_UNSIGNED_IPA.md`](BUILD_UNSIGNED_IPA.md).

## Kiểm thử trước khi dùng thật

- Cho phép thông báo trên cả hai iPhone.
- Tạo một việc sau 2–3 phút trên máy A và xác nhận máy A báo đúng giờ.
- Tắt app trên máy B, gửi lời nhắn từ A và xác nhận B nhận remote push.
- Bật chế độ nguồn điện thấp, đổi Wi-Fi/4G và thử lại.
- Gỡ/cài lại app B để xác nhận token cũ bị vô hiệu và token mới được đăng ký.
- Thử hoàn thành việc trên một máy và xác nhận thông báo đã lên lịch trên cả hai máy được hủy/cập nhật.
