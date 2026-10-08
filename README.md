# Gia Đình An Nam

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
npm run doctor
```

Nếu chưa cấu hình Supabase, ứng dụng vẫn chạy ở chế độ local-first với hồ sơ demo. Cấu hình backend nằm trong [`supabase/migrations/0001_family_core.sql`](supabase/migrations/0001_family_core.sql).

Hướng dẫn tạo backend và ghép hai máy: [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md). Hướng dẫn APNs/IPA: [`docs/PUSH_NOTIFICATIONS.md`](docs/PUSH_NOTIFICATIONS.md).

Build IPA chưa ký để ký lại bằng ESign: [`docs/BUILD_UNSIGNED_IPA.md`](docs/BUILD_UNSIGNED_IPA.md). Trên Mac chạy `npm run build:ios:unsigned`; nếu không có Mac, dùng workflow GitHub Actions đã chuẩn bị ở thư mục `.github/workflows` của repository.

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
