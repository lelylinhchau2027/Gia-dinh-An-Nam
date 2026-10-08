# GitHub Actions → IPA → ESign: hướng dẫn từng bước

Quy trình của Gia Đình An Nam là:

```text
Linux/Windows viết code
        ↓ push
GitHub Actions (máy Mac ảo, Xcode 26.4+)
        ↓ artifact
Gia-Dinh-An-Nam-unsigned.ipa
        ↓ ký bằng chứng chỉ + provisioning profile
ESign trên iPhone
        ↓
Cài trên hai iPhone
```

Không cần sở hữu máy Mac. GitHub không giữ chứng chỉ ký vì workflow chỉ tạo IPA chưa ký.

## 0. Phân biệt ba loại chứng chỉ trước khi làm

| Trường hợp | Cài IPA | Remote push giữa hai máy |
|---|---:|---:|
| Apple Developer Program trả phí, App ID/profile/APNs cùng một Team | Có | Có thể hoạt động đầy đủ |
| Chứng chỉ/profile mua hoặc được chia sẻ | Thường có | Chỉ có nếu profile chứa `aps-environment` và có APNs key của đúng Team |
| Xcode Personal Team miễn phí | Tạm thời | Không phù hợp để dùng lâu dài; profile thường chỉ có hạn 7 ngày |

Bundle ID cố định của app là `vn.giadinhanam.family`. Nếu ESign đổi Bundle ID, cấu hình App ID, provisioning profile và APNs topic cũng phải đổi theo; vì vậy bản dùng thật không nên để ESign tự đổi.

## 1. Tạo Supabase cho hai người dùng chung

### 1.1 Tạo project

1. Đăng nhập [Supabase Dashboard](https://supabase.com/dashboard) và tạo một project riêng.
2. Chọn region gần nơi hai người sử dụng nhất.
3. Lưu database password vào trình quản lý mật khẩu; không đưa mật khẩu này vào app hoặc GitHub repository.
4. Chờ project ở trạng thái sẵn sàng.

### 1.2 Bật đăng nhập ẩn danh cho bản thử nghiệm

Trong Dashboard, mở **Authentication → Providers/Sign In → Anonymous** và bật anonymous sign-ins.

Bản hiện tại dùng tài khoản ẩn danh gắn với Secure Storage trên từng máy. Đây là cách nhanh để thử hai iPhone, nhưng cần bổ sung email OTP trước khi lưu dữ liệu gia đình lâu dài; nếu xóa app, danh tính ẩn danh cũ có thể mất.

### 1.3 Tạo database

1. Mở **SQL Editor → New query**.
2. Sao chép toàn bộ nội dung file `supabase/migrations/0001_family_core.sql` trong repository.
3. Dán vào SQL Editor và chọn **Run** đúng một lần.
4. Trong **Table Editor**, kiểm tra đã có các bảng `families`, `family_members`, `children`, `care_entries`, `family_messages`, `reminders` và `push_tokens`.

Migration đã bật Row Level Security, giới hạn tối đa hai thành viên và thêm các bảng dữ liệu vào Supabase Realtime.

### 1.4 Deploy hàm gửi thông báo

Có thể thực hiện trên Linux, ngay trong thư mục app:

```bash
cd /home/user/lua-obfuscator/becuame/gia-dinh-an-nam
npx supabase@latest login
npx supabase@latest functions deploy notify-family --project-ref YOUR_PROJECT_REF
```

`YOUR_PROJECT_REF` là chuỗi ở đầu URL project, ví dụ URL `https://abcxyz.supabase.co` thì project ref là `abcxyz`.

Supabase tự cung cấp `SUPABASE_URL`, `SUPABASE_ANON_KEY` và `SUPABASE_SERVICE_ROLE_KEY` cho Edge Function. Không tạo secret `SUPABASE_SERVICE_ROLE_KEY` trong GitHub và tuyệt đối không đặt key đó trong app.

### 1.5 Lấy hai giá trị dùng cho build

Tại **Project Settings → API** hoặc nút **Connect**, lấy:

- Project URL: `https://PROJECT.supabase.co`
- Publishable/anon client key: key công khai dành cho client, không phải secret/service-role key

Giữ hai giá trị này để tạo GitHub Actions secrets ở bước 4.

## 2. Tạo Expo project ID và cấu hình APNs

App dùng Expo Push Service làm cổng gửi đến APNs, dù binary được build bằng GitHub Actions. Vì vậy vẫn cần một Expo project ID.

### 2.1 Tạo Expo project

Trên Linux:

```bash
cd /home/user/lua-obfuscator/becuame/gia-dinh-an-nam
npx eas-cli@latest login
npx eas-cli@latest init
```

Chọn tạo/liên kết project `gia-dinh-an-nam`. Lệnh sẽ hiện UUID dạng `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` và thường ghi nó vào `extra.eas.projectId` trong `app.json`. Sao chép UUID đó làm `EXPO_PUBLIC_EAS_PROJECT_ID`.

Không cần chạy `eas build`; GitHub Actions đảm nhiệm phần build.

### 2.2 Tạo quyền Push Notifications phía Apple

Với Apple Developer Program trả phí:

1. Tạo **Explicit App ID** `vn.giadinhanam.family`.
2. Bật capability **Push Notifications** cho App ID.
3. Đăng ký UDID của cả hai iPhone nếu dùng Ad Hoc profile.
4. Tạo provisioning profile Ad Hoc chứa App ID, certificate phân phối và hai UDID.
5. Tạo APNs authentication key `.p8`, hoặc dùng key còn hiệu lực của cùng Apple Team.
6. Chạy `npx eas-cli@latest credentials -p ios`, chọn project/bundle ID trên và cấu hình Push Notifications key cho đúng Expo project.

APNs key không được commit vào GitHub. Provisioning profile dùng khi ký trong ESign phải thuộc cùng Team và cùng App ID với APNs key đã cấu hình cho Expo.

Nếu chỉ có `.p12` và `.mobileprovision` từ một dịch vụ khác nhưng không có quyền quản lý APNs của Team đó, hãy coi remote push là chưa bảo đảm. Nhắc cục bộ trên từng máy vẫn có thể hoạt động.

## 3. Tạo repository GitHub riêng

Workspace cha hiện có thể trỏ tới repository của app gia phả. Không push Gia Đình An Nam vào repository đó. Tạo một repository private mới từ đúng thư mục app:

```bash
cd /home/user/lua-obfuscator/becuame/gia-dinh-an-nam
git init -b main
git add .
git status --short
git commit -m "Initial Gia Dinh An Nam iOS app"
gh repo create gia-dinh-an-nam --private --source=. --remote=origin --push
```

Nếu chưa dùng GitHub CLI, tạo một repository trống trên github.com rồi chạy:

```bash
git remote add origin https://github.com/TAI_KHOAN/gia-dinh-an-nam.git
git push -u origin main
```

Trước khi push, `git status` không được có `.env`, `.p8`, `.p12` hoặc `.mobileprovision`. `.gitignore` của dự án đã loại các file này.

## 4. Tạo GitHub Actions secrets

Trong repository mới, mở:

**Settings → Secrets and variables → Actions → New repository secret**

Tạo đúng ba secret sau:

| Tên secret | Giá trị |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://PROJECT.supabase.co` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | publishable/anon client key |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | UUID của Expo project |

Các giá trị này được nhúng vào JavaScript bundle để app kết nối dịch vụ. Không thêm database password, Apple password, service-role key hoặc APNs `.p8` vào workflow build unsigned.

## 5. Chạy build

1. Mở tab **Actions** trong repository.
2. Chọn **Build IPA for ESign**.
3. Chọn **Run workflow → main → Run workflow**.
4. Lần đầu thường mất khoảng 15–30 phút do cài npm packages, CocoaPods và biên dịch native.
5. Khi job xanh, mở run vừa xong. Phần Summary phải hiện bundle ID `vn.giadinhanam.family`.
6. Ở cuối trang, tải artifact **`gia-dinh-an-nam-unsigned-ipa`**.
7. Giải nén artifact ZIP để lấy:
   - `Gia-Dinh-An-Nam-unsigned.ipa`
   - `Gia-Dinh-An-Nam-unsigned.ipa.sha256`

Artifact được giữ 30 ngày. IPA này chưa ký nên chưa thể cài trực tiếp.

## 6. Ký và cài bằng ESign

Tên các nút có thể hơi khác giữa các bản ESign, nhưng thứ tự cần giữ là:

1. Nhập certificate `.p12`, mật khẩu `.p12` và provisioning profile `.mobileprovision` vào ESign.
2. Nhập `Gia-Dinh-An-Nam-unsigned.ipa` vào thư viện ứng dụng.
3. Chọn **Signature/Ký**.
4. Chọn đúng certificate và provisioning profile đi cùng nhau.
5. Giữ Bundle ID `vn.giadinhanam.family`.
6. Bật tùy chọn ký toàn bộ framework/dylib/plug-in nếu ESign hiển thị lựa chọn này.
7. Không xóa entitlement Push Notifications. Profile hợp lệ phải cấp `aps-environment`.
8. Ký, cài đặt và tin cậy nhà phát triển trong iOS nếu hệ thống yêu cầu.
9. Lặp lại bằng cùng IPA/profile trên iPhone còn lại. Với Ad Hoc, profile phải chứa UDID của cả hai máy.

ESign chỉ gắn chữ ký và các entitlement mà provisioning profile cho phép; ESign không thể tự tạo quyền push nếu profile không có quyền đó.

## 7. Ghép hai máy và kiểm thử

Trên iPhone thứ nhất:

1. Mở app và cho phép thông báo.
2. Vào **Gia đình → Kết nối hai người → Máy thứ nhất**.
3. Nhập tên gia đình, tên người dùng và tạo mã ghép 8 ký tự.
4. Vào **Cài đặt → Đăng ký thông báo**.

Trên iPhone thứ hai:

1. Mở app và cho phép thông báo.
2. Chọn **Máy thứ hai**, nhập tên và mã 8 ký tự.
3. Vào **Cài đặt → Đăng ký thông báo**.

Kiểm tra theo thứ tự:

1. Máy A tạo một bản ghi chăm bé; máy B đồng bộ và nhìn thấy dữ liệu.
2. Máy B gửi lời nhắn khi app trên máy A đang tắt; máy A phải nhận remote push.
3. Máy A tạo việc hẹn sau 3 phút; sau khi máy B đồng bộ, cả hai máy phải có nhắc cục bộ.
4. Thử lại khi một máy dùng Wi-Fi và máy còn lại dùng 4G/5G.
5. Khởi động lại app và hai iPhone rồi kiểm tra lại.

Remote push của APNs là best-effort, có thể bị iOS trì hoãn. Các việc quan trọng theo giờ được app lập lịch cục bộ trên từng máy sau khi đồng bộ; không dùng app làm phương tiện duy nhất cho thuốc hoặc lịch y tế khẩn cấp.

## 8. Cập nhật phiên bản sau này

Mỗi lần sửa app:

1. Tăng `expo.version` và `expo.ios.buildNumber` trong `app.json`.
2. Commit và push lên `main`.
3. Chạy lại workflow.
4. Tải IPA mới, ký bằng cùng Bundle ID/profile rồi cài đè.
5. Không gỡ app cũ nếu chưa có đăng nhập email/khôi phục tài khoản, vì bản hiện tại dùng danh tính ẩn danh trên thiết bị.

Ví dụ:

```json
{
  "version": "0.1.1",
  "ios": {
    "buildNumber": "2"
  }
}
```

## 9. Xử lý lỗi thường gặp

| Hiện tượng | Nguyên nhân/cách xử lý |
|---|---|
| Workflow dừng ở `Validate build configuration` | Thiếu/sai tên một trong ba GitHub Actions secrets |
| Không thấy workflow | File phải ở `.github/workflows/build-unsigned-ios.yml` trên nhánh mặc định; bật Actions cho repository |
| `npm ci` hoặc CocoaPods lỗi mạng | Chọn **Re-run failed jobs**; nếu lặp lại, đọc dòng lỗi đầu tiên trong step tương ứng |
| Xcode báo phiên bản không đủ | Workflow phải dùng `macos-26`; SDK 57 hiện cần Xcode 26.4+ |
| Job xanh nhưng không thấy IPA | Tải ở mục **Artifacts**, không phải Releases; artifact là ZIP chứa IPA |
| ESign báo profile không khớp | Bundle ID, Team ID, certificate hoặc UDID không khớp provisioning profile |
| App cài được nhưng chỉ hiện Local | Supabase URL/key sai hoặc migration chưa chạy |
| Hai máy đồng bộ nhưng không có remote push | Kiểm tra quyền notification, Expo project ID, APNs key cùng Team, và `aps-environment` trong profile |
| Máy thứ hai báo gia đình đủ người | Danh tính ẩn danh cũ đã chiếm suất; cần phục hồi/xóa thành viên bằng quản trị backend trước khi ghép lại |

## Checklist trước bản dùng thật

- [ ] Repository riêng đang là private.
- [ ] Supabase migration đã chạy và anonymous sign-in đã bật.
- [ ] Edge Function `notify-family` đã deploy.
- [ ] Expo project ID đã tạo.
- [ ] App ID, profile và APNs key cùng Bundle ID/Apple Team.
- [ ] Hai UDID có trong Ad Hoc profile.
- [ ] Ba GitHub Actions secrets đã cấu hình.
- [ ] Workflow xanh và IPA đã được ESign ký.
- [ ] Đồng bộ, lời nhắn, remote push và nhắc cục bộ đã được thử trên hai máy.
- [ ] Trước khi lưu dữ liệu lâu dài: bổ sung email OTP/khôi phục tài khoản.
