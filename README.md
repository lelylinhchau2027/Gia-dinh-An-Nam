# Gia Đình An Nam

**0.6.0 (build 7, đang kiểm thử)** chuyển sang **Telegram + nhắc cục bộ**, thay chat bằng lời nhắc có xác nhận, chọn ngày/giờ bằng nút, thêm ba kiểu widget iPhone. Xem [hướng dẫn triển khai Telegram và widget](docs/TELEGRAM_SETUP.md). Cần migration **0005**, bot, ba Functions và Cron/webhook; chưa triển khai backend thật hoặc xác minh widget trên thiết bị. Widget dữ liệu cần quyền App Group hợp lệ khi ký, không phải chỉ cài IPA là đủ.

Các mục 0.5 trở về trước dưới đây lưu lịch sử; hướng dẫn APNs/chat không còn áp dụng cho bản 0.6.

**0.5.1 (build 6)** cải thiện hàng đợi thông báo chat và chẩn đoán lỗi JS. Xem [hướng dẫn nâng cấp](docs/UPGRADE_0_5_1.md) và [triển khai push](docs/PUSH_NOTIFICATIONS.md). Cần migration 0004, Function/webhook/Cron và profile/APNs hợp lệ; chỉ cài IPA không tự hoàn thành cấu hình push nền.

Phiên bản **0.5.0 (build 5)** bổ sung nhiều hồ sơ bé, xem ảnh toàn màn hình, chat ảnh/video và tách kiểm tra thông báo cục bộ/push. **Chat media cần migration `0003_family_chat.sql`.** Xem [hướng dẫn nâng cấp và tình trạng lỗi iPhone 11](docs/UPGRADE_0_5.md). Chưa xác định nguyên nhân crash native khi thiếu file `.ips`. Tải IPA từ artifact của lượt [Build IPA for ESign](https://github.com/lelylinhchau2027/Gia-dinh-An-Nam/actions/workflows/build-unsigned-ios.yml) thành công tương ứng với phiên bản cần cài.

IPA 0.5 từ commit `df1813b` đã [build và xác minh thành công](https://github.com/lelylinhchau2027/Gia-dinh-An-Nam/actions/runs/37873030940). **Yêu cầu iOS 16.4+** (đã đối chiếu Info.plist cả bản 0.4 và 0.5). Cài đè với Bundle ID cũ, không gỡ app khi chưa bảo đảm dữ liệu đã đồng bộ.

Bản **0.4.0 (build 4)** làm lại tab Em bé theo ảnh/video gốc, khôi phục 64 huy chương và sơ đồ răng, cải thiện trang theo ngày, lịch E.A.S.Y và nhập liệu với bàn phím iOS. Xem [thay đổi, giới hạn và kiểm thử](docs/ASSISTANT_REDESIGN.md). Chưa tuyên bố tương đương toàn bộ app gốc.

Ba tab Bảng tin / Em bé / Cẩm nang tiếp tục giữ ảnh gia đình, bình luận, like, hồ sơ ảnh bìa/đại diện và email OTP. Nếu chưa nâng Supabase từ bản đầu, làm theo [hướng dẫn 0.2](docs/UPGRADE_0_2.md); bản 0.4 không cần migration mới.

Ứng dụng riêng cho hai vợ chồng cùng theo dõi và chăm sóc bé. Bản đầu được xây bằng Expo/React Native, lưu dữ liệu cục bộ trước bằng SQLite và đã có schema Supabase dành cho đồng bộ hai thiết bị.

## Đã có trong bản đầu

- Trang tổng quan và ghi nhanh: bú/sữa, ngủ, bỉm, ăn dặm, nhiệt độ, thuốc, hoạt động, tăng trưởng.
- Dòng thời gian chăm sóc bé lưu trên máy, dùng được khi mất mạng.
- Việc chung, nhắc cục bộ và lời nhắn giữa hai người.
- Màn hình đọc lịch tiêm, E.A.S.Y và khám thai thay cho việc xem JSON.
- Toàn bộ dữ liệu tham chiếu đã trích xuất từ Bé của mẹ 1.2.21 được giữ làm nền.
- Cơ chế thay từng nhóm dữ liệu cũ bằng bản hiện hành có nguồn; nhóm Rota đã dùng lịch TCMR 2026.
- Luồng tạo/nhập mã ghép đôi, giới hạn đúng hai thành viên, đồng bộ offline-first, Realtime, RLS, kho token thiết bị và hàm gửi push cho người còn lại.

## Chạy ứng dụng

Yêu cầu Node.js 22.13+.

```bash
npm install
cp .env.example .env
npm run start
```

Kiểm tra mã nguồn:

```bash
npm run typecheck
npm test
npm run doctor
```

Nếu chưa cấu hình Supabase, ứng dụng vẫn chạy ở chế độ local-first với hồ sơ demo. Cấu hình backend nằm trong [`supabase/migrations/0001_family_core.sql`](supabase/migrations/0001_family_core.sql).

Hướng dẫn tạo backend và ghép hai máy: [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md). Hướng dẫn APNs/IPA: [`docs/PUSH_NOTIFICATIONS.md`](docs/PUSH_NOTIFICATIONS.md).

Build IPA chưa ký để ký lại bằng ESign: [`docs/BUILD_UNSIGNED_IPA.md`](docs/BUILD_UNSIGNED_IPA.md). Trên Mac chạy `npm run build:ios:unsigned`; nếu không có Mac, dùng workflow GitHub Actions đã chuẩn bị ở thư mục `.github/workflows` của repository.

Workflow **Check iOS UI** kiểm tra riêng bản Release trên iPhone Simulator bằng dữ liệu demo, chụp giao diện và bàn phím. Không cần Apple certificate hoặc Supabase secrets, không tạo IPA cài lên máy thật. Lượt 0.4 dừng ở selector tên bé; đã sửa selector, cần chạy lại và thử trên iPhone.

Quy trình chi tiết từ tạo Supabase, Expo project, repository và GitHub secrets đến ký/cài trên hai iPhone: [`docs/GITHUB_ACTIONS_ESIGN_TUNG_BUOC.md`](docs/GITHUB_ACTIONS_ESIGN_TUNG_BUOC.md).

Web chỉ dùng để xem nhanh giao diện. Do SQLite trên web dùng `SharedArrayBuffer`, máy chủ preview phải trả hai header `Cross-Origin-Opener-Policy: same-origin` và `Cross-Origin-Embedder-Policy: require-corp`. Mục tiêu phát hành chính của dự án là iOS.

## Cấu trúc chính

- `app/`: các màn hình và điều hướng Expo Router.
- `src/lib/database.ts`: SQLite và hàng đợi đồng bộ trên thiết bị.
- `src/data/legacy/`: dữ liệu gốc, không chỉnh sửa.
- `src/data/current/`: dữ liệu mới đã đối chiếu nguồn.
- `supabase/`: schema dùng chung và Edge Function gửi thông báo.
- `docs/`: quy tắc dữ liệu, đồng bộ và thông báo.

Đây là công cụ ghi nhận và nhắc lịch cho gia đình, không thay thế tư vấn y tế hay lịch cá nhân do cơ sở y tế xác nhận.
