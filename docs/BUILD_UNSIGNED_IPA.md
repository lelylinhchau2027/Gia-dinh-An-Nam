# Build IPA chưa ký để ký bằng ESign

Hướng dẫn đầy đủ từ lúc tạo Supabase/repository đến lúc ghép hai iPhone nằm tại [`GITHUB_ACTIONS_ESIGN_TUNG_BUOC.md`](GITHUB_ACTIONS_ESIGN_TUNG_BUOC.md). Tài liệu này chỉ tóm tắt phần build và ký.

## Điều kiện trước khi build

- Backend Supabase đã triển khai và có URL + anon key.
- Một Expo project ID hợp lệ nếu dùng Expo Push Service.
- Bundle ID giữ nguyên: `vn.giadinhanam.family`.
- Chứng chỉ và provisioning profile dùng trong ESign phải thuộc cùng Apple Team, khớp bundle ID và chứa Push Notifications nếu muốn nhận remote push.

Ba biến được nhúng lúc build:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
EXPO_PUBLIC_EAS_PROJECT_ID=YOUR_EXPO_PROJECT_UUID
```

Supabase anon key và Expo project ID là định danh phía client, không phải service-role secret. Tuyệt đối không đưa Supabase service-role key hoặc APNs `.p8` vào ứng dụng.

## Cách 1: build trên GitHub Actions

Tạo một GitHub repository **private riêng** từ chính thư mục `gia-dinh-an-nam`; không dùng repository `giaphaos-ios` đang là remote của workspace cha. Workflow `.github/workflows/build-unsigned-ios.yml` sẽ được nhận tự động.

Trong repository mới, tạo ba Actions secrets có tên đúng như các biến ở trên. Mở **Actions → Build IPA for ESign → Run workflow**. Sau khi job hoàn tất, tải artifact `gia-dinh-an-nam-unsigned-ipa`; bên trong có IPA và file SHA-256.

Workflow dùng macOS/Xcode, tạo native project bằng Expo Prebuild, archive với code signing bị tắt, rồi đóng `Payload/*.app` thành IPA.

## Cách 2: build trên máy Mac

Yêu cầu Xcode 26.4+, CocoaPods, Node.js 22.13+ và npm:

```bash
cd /duong-dan/gia-dinh-an-nam
export EXPO_PUBLIC_SUPABASE_URL='https://PROJECT.supabase.co'
export EXPO_PUBLIC_SUPABASE_ANON_KEY='YOUR_ANON_KEY'
export EXPO_PUBLIC_EAS_PROJECT_ID='YOUR_EXPO_PROJECT_UUID'
npm run build:ios:unsigned
```

Kết quả nằm tại `build/ios/Gia-Dinh-An-Nam-unsigned.ipa`.

## Ký trong ESign

1. Nhập `.p12` và provisioning profile vào ESign.
2. Chọn IPA chưa ký.
3. Giữ bundle ID `vn.giadinhanam.family`; không đổi nếu profile không cho phép wildcard phù hợp.
4. Bật ký lại toàn bộ framework/dylib nếu ESign có lựa chọn này.
5. Cài bản đã ký lên cả hai iPhone và cho phép thông báo.

Sau khi ký, entitlement hiệu lực phải chứa `application-identifier`, `com.apple.developer.team-identifier` và, để nhận remote push, `aps-environment`. Giá trị push do provisioning profile quyết định: profile development dùng `development`, profile Ad Hoc/distribution dùng `production`.

ESign chỉ ký lại mã; nó không thể tự cấp một entitlement mà provisioning profile không cho phép.

- Nếu đây là tài khoản **Apple Developer Program cá nhân trả phí**, có thể tạo App ID/provisioning/APNs cho app này bình thường.
- Nếu đây là **Xcode Personal Team miễn phí**, profile chỉ có hạn 7 ngày và không phải phương thức phân phối lâu dài; remote push cũng không nên được coi là khả dụng.
- Nếu đây là chứng chỉ mua/chia sẻ từ một team khác, remote push chỉ chạy khi profile có `aps-environment` và bạn có APNs key/certificate thuộc đúng team đó.

Trong mọi trường hợp profile không đủ quyền push, thông báo cục bộ vẫn chạy nhưng push giữa hai máy sẽ không chạy.

## Kiểm thử bắt buộc

1. Mở app, xác nhận không còn trạng thái `Local` trong Cài đặt.
2. Ghép máy thứ hai bằng mã 8 ký tự.
3. Trên cả hai máy, chọn đăng ký thông báo.
4. Tắt app trên máy B và gửi lời nhắn từ máy A.
5. Tạo nhắc việc sau 3 phút; xác nhận cả hai máy báo đúng giờ.
6. Khởi động lại hai máy và thử lại khi dùng 4G/Wi-Fi khác nhau.

Remote push qua APNs là best-effort; nhắc đúng giờ quan trọng được app lập lịch cục bộ trên từng máy sau khi đồng bộ.
