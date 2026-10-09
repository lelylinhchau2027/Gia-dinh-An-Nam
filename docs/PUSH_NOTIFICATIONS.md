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
3. APNs key/certificate của đúng Apple Team đặt trên máy chủ/Expo; **không nhúng khóa bí mật vào IPA**.
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
- Thử đổi token trên thiết bị thử riêng sau khi đã xác nhận email khôi phục và sao lưu/đồng bộ; không gỡ app đang chứa dữ liệu duy nhất để thử.
- Thử hoàn thành việc trên một máy và xác nhận thông báo đã lên lịch trên cả hai máy được hủy/cập nhật.

## Triển khai 0.5.1: push chat không phụ thuộc máy gửi còn mở

Luồng: lưu tin nhắn → trigger tạo `chat_push_jobs` → webhook gọi `dispatch-push` → Expo → APNs → iPhone. Cron xử lý lại lỗi và receipt. Cả webhook lẫn Cron đều cần thiết: Cron mỗi phút là dự phòng, không phải luồng gửi tức thì. Tin nhắn còn offline chưa thể đến máy kia.

### A. Ký và APNs (cần chủ tài khoản Apple Developer)

1. Trong Apple Developer, tạo/chọn explicit App ID **vn.giadinhanam.family**, bật Push Notifications.
2. Tạo lại provisioning profile cho App ID này, đúng chứng chỉ ký, có UDID hai iPhone nếu dùng Development/Ad Hoc. Profile phải có **aps-environment**, không phải chỉ `com.apple.developer.aps-environment` của macOS.
3. Tạo hoặc dùng APNs authentication key `.p8` thuộc cùng Team; cấu hình vào đúng Expo project với `npx eas-cli@latest credentials --platform ios`. Key chỉ ở máy chủ/Expo. Không gửi key vào chat hoặc commit vào Git.
4. ESign ký bằng certificate/profile đúng App ID. Không tự đổi tên entitlement trong file `.mobileprovision`: sửa nội dung làm mất hiệu lực chữ ký profile. TrollStore cũng không tạo giúp App ID/khóa máy chủ APNs của app mới.
5. Nếu chỉ có certificate mua/chia sẻ mà không quản lý App ID và APNs: cần bên cung cấp cấp cấu hình này hoặc dùng Apple Developer do bạn quản lý. Đổi Bundle ID đơn thuần không giải quyết phần thiếu.

Không yêu cầu App Store để dùng APNs, nhưng vẫn cần các thành phần ký/máy chủ phù hợp. Nếu chưa có, có thể dùng chat lúc app mở; không được coi là đã có chat nền đáng tin cậy.

### B. Nâng database và Function

1. Trong đúng Supabase project → SQL Editor, chạy `supabase/migrations/0004_reliable_chat_push.sql` một lần, sau 0001–0003. Không tạo lại project/gia đình. Chưa chạy migration thì app vẫn dùng đường legacy, không có worker bền vững.
2. Project Settings/Edge Functions → Secrets: tạo `PUSH_WORKER_SECRET` là chuỗi ngẫu nhiên riêng dài tối thiểu 32 ký tự. Giữ secret này riêng trên Supabase; không dùng anon key thay secret. Nếu Expo bật enhanced push security, thêm `EXPO_ACCESS_TOKEN` ở đây, không ở app.
3. Dùng CLI đã đăng nhập Supabase ở thư mục dự án:

```bash
npx supabase functions deploy notify-family --project-ref YOUR_PROJECT_REF --no-verify-jwt
npx supabase functions deploy dispatch-push --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

Hai function tự xác thực: request từ app phải qua `auth.getUser()` và kiểm tra membership; worker chỉ nhận secret đúng qua header `x-push-worker-secret`. Tắt JWT gateway **không** có nghĩa mở endpoint không xác thực. `SUPABASE_SERVICE_ROLE_KEY` là secret môi trường của Function, không copy vào app.

### C. Webhook để gửi ngay

Database → Webhooks → Create webhook:

- Tên: `an-nam-chat-push`.
- Table: `public.chat_push_jobs`; event: **INSERT** duy nhất (không chọn UPDATE).
- HTTP POST: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/dispatch-push`.
- Headers: `Content-Type: application/json`, `x-push-worker-secret: <secret đã tạo ở B>`.
- Đặt HTTP timeout 60.000 ms nếu giao diện cho phép; Function có thể cần đợi Expo. Nếu webhook timeout, Cron và lease sẽ tiếp tục xử lý công việc còn dang dở.
- Function không tin nội dung webhook để chọn gia đình; nó lấy job từ DB và dùng lease chống hai worker xử lý đồng thời.

### D. Cron để không mất lần gửi lại khi cả hai máy đóng

1. Bật Supabase Cron (`pg_cron`), `pg_net` và Vault trong project.
2. Supabase Vault → tạo secrets `an_nam_push_worker_secret` (cùng giá trị `PUSH_WORKER_SECRET`) và `an_nam_push_worker_url` (URL Function bên trên).
3. SQL Editor chạy block dưới đây **một lần**. Secret không được ghi trực tiếp vào câu lệnh Cron:

```sql
select cron.schedule('an-nam-push-every-minute', '* * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='an_nam_push_worker_url'),
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-push-worker-secret',(select decrypted_secret from vault.decrypted_secrets where name='an_nam_push_worker_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$$);
```

4. Xem lịch sử Cron và Edge Function. Webhook/Cron lỗi hoặc project bị pause thì hàng đợi chưa được xử lý. Cron mỗi phút có tiêu thụ lượt gọi Function; theo dõi usage của Supabase project. Không dùng GitHub Actions để polling push mỗi phút.

### E. Chẩn đoán và nghiệm thu

Cài đặt trong app có 3 phép thử riêng: nhắc cục bộ, đăng ký token, push máy chủ. Xem thêm trạng thái hai người. Trạng thái ticket chỉ là Expo nhận yêu cầu; `provider_accepted` chỉ là APNs/FCM nhận, không chứng minh iPhone đã báo. Phải thử thực tế lúc máy khóa, cả hai chiều.

Không có token được giữ chờ, không báo thành công. Thử lại tối đa 12 lượt với backoff; expiry 24 giờ. Lỗi cấu hình dừng để tránh lặp vô hạn. Sau khi sửa cấu hình, ưu tiên tạo một tin mới để thử. Job thất bại/hết hạn không bị tự gửi hàng loạt lại. Bảng job/ticket không chứa bản sao nội dung chat; nội dung chỉ được đọc khi gửi. RLS chặn truy cập bảng worker từ client, chỉ cung cấp số liệu trạng thái gia đình qua RPC.

Phần chat mới dùng hàng đợi server; nhắc nhật ký/công việc cũ vẫn dùng đường `notify-family` legacy. Chưa triển khai cơ chế nhắc y tế khẩn cấp, không dùng push làm kênh bảo đảm an toàn.

Nguồn chính thức: [Supabase scheduling](https://supabase.com/docs/guides/functions/schedule-functions), [Database webhooks](https://supabase.com/docs/guides/database/webhooks), [Expo reliability](https://docs.expo.dev/push-notifications/sending-notifications/).
