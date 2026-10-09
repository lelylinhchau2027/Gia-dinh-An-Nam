# 0.6.0 (build 7) — Telegram, lời nhắc và widget

## Đã thay đổi trong mã nguồn

- Bỏ giao diện gửi chat văn bản/ảnh/video; route cũ mở danh sách lời nhắc. Không xóa dữ liệu chat hay ảnh/video lịch sử. Các bản ghi chat chưa gửi vẫn ở trên máy, không tự chuyển thành lời nhắc và không tính vào số thay đổi đang đồng bộ.
- Lời nhắc có xác nhận riêng của người còn lại, qua app hoặc nút Telegram; không đồng nghĩa hoàn thành. Sửa nội dung/giờ làm mất hiệu lực xác nhận cũ. Hoàn thành dừng nhắc tương lai.
- Telegram: liên kết Start một lần + xác nhận trong app; gửi thử, tạm dừng, bật lại, hủy liên kết, trạng thái 10 lượt gửi gần nhất. Bot không nhận/hiển thị hồ sơ sức khỏe, ảnh hay nội dung lời nhắc.
- Server enqueue cùng transaction với dữ liệu. Worker kiểm tra membership, phiên bản, thời hạn và liên kết trước gửi; lease/chống trùng/retry giới hạn. Bản tin API được Telegram nhận không tự đánh dấu người nhà đã đọc.
- Lịch Telegram lúc 21:00 giờ Việt Nam trong D-7..D-1. Nhắc cục bộ đúng giờ hẹn; vẫn có giới hạn 48 lịch trên máy, cần mở app để nạp thêm.
- Ngày sinh/dự sinh, giờ nhật ký, giờ E.A.S.Y, ngày/giờ lời nhắc dùng bộ chọn; các ngày đo/mốc vốn có bộ chọn tiếp tục dùng.
- Ba widget SwiftUI: Bé yêu, Lịch tháng, Báo cần hỗ trợ. Thông tin riêng chỉ chia sẻ cục bộ qua App Group sau khi người dùng bật; có nhãn thời gian dữ liệu. Nút hỗ trợ mở app để xác nhận gửi báo nhanh, không tự gửi chỉ vì widget được tải.
- Bỏ tự đăng ký token APNs và giao diện thử APNs. GitHub Actions đóng gói/kiểm tra widget `.appex`; build không còn bắt buộc EAS project ID.

## Cần làm để sử dụng

Theo [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md): backup → migration 0005 → Secrets → deploy ba Functions → Telegram webhook → Vault + trigger/Cron → cài bản mới và liên kết riêng hai tài khoản.

Chưa thực hiện các bước đó trên Supabase thật; không có token bot trong repo. Chưa push/build IPA mới trong lượt triển khai này. Không gỡ app cũ khi dữ liệu chưa đồng bộ.

Widget thông tin cần quyền App Group trên cả app và extension. Chưa xác nhận profile bên bán cấp có quyền này; không dùng dữ liệu public để lách quyền. Chưa kiểm thử WidgetKit/ESign/TrollStore trên thiết bị và chưa biên dịch Swift bằng Xcode trong môi trường Linux.

## Đã kiểm tra trên máy phát triển

- `npm test`: **39/39 đạt**, gồm migration PostgreSQL thử nghiệm, RLS, queue/lease, link một lần, xác nhận, retry Telegram, cửa sổ D-7..D-1 và chống vòng lặp webhook khi insert không có hàng mới.
- `npm run typecheck`, `deno check` ba Functions, cú pháp shell build, Node script webhook, `git diff --check` đạt.
- Browser smoke: nhật ký cũ, nhiều bé, chọn giờ E.A.S.Y, tạo/lưu lại lời nhắc offline, chuyển route chat, màn widget/hỗ trợ, màn hình 320px; không có lỗi JavaScript chưa bắt. Browser không kiểm chứng bàn phím native.
- Expo iOS JavaScript export đạt; prebuild trên bản sao tạm tạo `AnNamWidgets.appex` target, embed phase và App Group; cấu hình cuối không có `aps-environment` hay remote-notification background mode. Đây chưa phải build IPA hoặc nghiệm thu widget native.

## Chưa triển khai từ kế hoạch dài hạn

Gộp thông báo, giờ yên lặng tùy chỉnh, tổng kết ngày, lịch lặp, tự nhắc E.A.S.Y/thuốc, tùy chọn từng nhóm thông báo và chọn bé khác nhau cho từng instance widget. Bản này chỉ chọn một bé dùng chung cho widget Bé yêu; có thể thêm nhiều loại/kích thước widget.

Thông báo không phải kênh cấp cứu đảm bảo. Telegram/Supabase/mạng/iOS có thể trì hoãn; máy offline có thể còn lịch cục bộ cũ cho tới lần đồng bộ tiếp theo.
