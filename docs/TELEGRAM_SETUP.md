# Bật Telegram + nhắc cục bộ (bản 0.6)

Mã nguồn đã có; **chưa có nghĩa bot/Function/Cron đã được triển khai trên project thật**. Không cần VPS, EAS Push hay khóa APNs. Không gửi token cho người khác hoặc đưa token vào Git, IPA, ảnh chụp màn hình.

## 1. Tạo bot riêng

1. Mở Telegram, tìm đúng **@BotFather** (tài khoản chính thức).
2. Gửi `/newbot`, đặt tên hiển thị, sau đó username kết thúc bằng `bot`.
3. Giữ token BotFather cấp ở nơi riêng. Username không phải token; username có thể chia sẻ.
4. Bot nên chỉ dành cho An Nam: một bot chỉ có một webhook. Script bên dưới sẽ hỏi trước nếu phát hiện webhook khác.
5. Cả hai vợ chồng cần cài Telegram và bật quyền thông báo/âm thanh; kiểm tra Focus, tắt tiếng cuộc trò chuyện và Tóm tắt thông báo iOS.

## 2. Nâng database — làm trước khi cài bản mới

Sao lưu dữ liệu Supabase trước. Trong SQL Editor, kiểm tra các migration 0001–0004 đã chạy; không chạy lại toàn bộ lịch sử trên database đang có dữ liệu.

Chạy toàn bộ [0005_telegram_reminders.sql](../supabase/migrations/0005_telegram_reminders.sql) **một lần**. Transaction sẽ rollback nếu lỗi.

Migration thêm bảng riêng tư cho bot/hàng đợi và cột xác nhận. Nó giữ lịch sử chat, nhưng ngừng quyền gửi/sửa chat mới, tắt các token APNs cũ và dừng job chat APNs còn chờ. Cả hai máy cần nâng bản mới; bản cũ gửi chat sẽ không hoạt động sau bước này. Không xóa app để nâng cấp vì có thể mất dữ liệu chưa đồng bộ.

## 3. Thêm Secrets cho Edge Functions

Supabase Dashboard → project An Nam → **Edge Functions → Secrets**. Tạo:

| Tên | Giá trị |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Token do BotFather cấp |
| `TELEGRAM_BOT_USERNAME` | Username bot, **không có @** |
| `TELEGRAM_WEBHOOK_SECRET` | Chuỗi ngẫu nhiên riêng, 64 ký tự hex |
| `TELEGRAM_WORKER_SECRET` | Chuỗi ngẫu nhiên khác, 64 ký tự hex |

Có thể tạo mỗi secret bằng lệnh dưới đây trên terminal riêng, chạy hai lần và lưu riêng từng giá trị. Không chụp màn hình đầu ra hoặc commit chúng:

```bash
node -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'
```

Supabase cung cấp sẵn `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` cho Functions. **Không đặt service-role key trong biến `EXPO_PUBLIC_*`.**

## 4. Deploy ba Functions từ Linux

Thay `YOUR_PROJECT_REF` bằng mã project lấy trong Supabase Settings, không phải URL đầy đủ:

```bash
cd /home/user/lua-obfuscator/becuame/gia-dinh-an-nam
npx supabase@latest login
npx supabase@latest functions deploy telegram-account --project-ref YOUR_PROJECT_REF --no-verify-jwt
npx supabase@latest functions deploy telegram-webhook --project-ref YOUR_PROJECT_REF --no-verify-jwt
npx supabase@latest functions deploy telegram-worker --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

`--no-verify-jwt` chỉ tắt lớp kiểm JWT cũ ở gateway. Trong mã:

- `telegram-account` tự kiểm phiên đăng nhập bằng `auth.getUser()` và membership.
- `telegram-webhook` bắt buộc header bí mật của Telegram.
- `telegram-worker` bắt buộc secret worker riêng.

Gọi worker/webhook không có secret phải nhận **401**, không được gửi tin.

## 5. Đăng ký webhook nhận Start và nút xác nhận

Chạy:

```bash
node scripts/setup_telegram_webhook.mjs
```

Script hỏi project ref, token bot và webhook secret; hai giá trị bí mật được nhập ẩn, không đặt trong câu lệnh/shell history. Đây là bước cấu hình webhook thật trên bot. Script không tự chạy khi build app.

Đến đây bot nhận `/start` và nút “Tôi đã nhận lời nhắc”; **lịch định kỳ vẫn cần bước 6**.

## 6. Bật gửi tức thì và Cron dự phòng

1. Trong Supabase, bật extensions **pg_cron**, **pg_net** và **Supabase Vault** nếu chưa có.
2. Trong Vault, thêm hai secret:
   - `an_nam_project_url`: `https://YOUR_PROJECT_REF.supabase.co`
   - `an_nam_telegram_worker_secret`: **cùng giá trị** `TELEGRAM_WORKER_SECRET` ở bước 3.
3. Chạy file [telegram_dispatch.sql](../supabase/setup/telegram_dispatch.sql) trong SQL Editor. File không chứa token và không cần thay trực tiếp bằng token.

File này tạo trigger gọi Function bất đồng bộ khi có lượt thông báo mới, chỉ gửi body rỗng (không chuyển nội dung hồ sơ qua webhook). Cron `an-nam-telegram-minute` gọi mỗi phút để nhắc lịch và thử lại khi lỗi. Một Cron phục vụ cả gia đình, không cần một Cron cho từng lịch.

**Quan trọng:** đọc danh sách Cron/webhook cũ. Tắt riêng job/webhook đang gọi `dispatch-push`/`notify-family` của An Nam; không tắt job của app gia phả hay dịch vụ khác. Không tạo thêm Database Webhook qua Dashboard trùng trigger đã tạo ở trên.

Kiểm tra không lộ secrets:

```sql
select jobname, schedule, active from cron.job
where jobname = 'an-nam-telegram-minute';

select kind, state, count(*) from public.telegram_jobs
group by kind, state order by kind, state;
```

`accepted` nghĩa Telegram chấp nhận API, không phải điện thoại đã hiển thị hoặc người nhà đã đọc. Theo dõi `failed`/`expired` trong app và Function logs; không ghi token/URL bot vào log.

## 7. Liên kết trên từng iPhone

1. Cài bản mới, mở app, đồng bộ và kiểm tra đúng gia đình.
2. Cài đặt → Telegram → “Đồng ý và mở bot để liên kết”.
3. Trong Telegram bấm **Start**. Mã chỉ dùng một lần và hết hạn sau 10 phút.
4. Quay về app → tải lại trạng thái → kiểm tra đúng tên Telegram của mình → **Xác nhận liên kết**.
5. Bấm gửi tin thử. Làm riêng cho tài khoản bố và mẹ, không dùng chung một tài khoản Telegram.
6. Cài đặt → cho phép nhắc cục bộ → thử sau 10 giây. Telegram không cần quyền APNs của IPA.

Mặc định chỉ chuyển lời báo chung và giờ sự kiện sang Telegram, không có tên bé, nội dung lời nhắc, ảnh, video, chỉ số hay thuốc. Chi tiết đọc trong An Nam. Nút xác nhận trên Telegram gắn đúng người nhận và phiên bản lời nhắc; không đánh dấu việc đã hoàn thành.

## 8. Quy tắc bản này

- Lời nhắc mới/đổi nội dung/đổi giờ: báo người còn lại, cần xác nhận lại khi đổi.
- Người nhận bấm “Tôi đã nhận”: báo ngược cho người tạo. Việc vẫn chưa hoàn thành.
- Lịch: Telegram **21:00 giờ Việt Nam mỗi ngày D-7 đến D-1**, cục bộ **đúng giờ hẹn T**. Không gửi lại các ngày đã qua. Lượt 21h có thể thử lại trong cùng tối, hết hạn nửa đêm.
- Bài mới, bình luận mới, nhật ký mới: báo người còn lại sau khi lưu server; không báo cho chính tác giả. Bản ghi chăm bé cũ hơn 2 giờ không báo như vừa xảy ra.
- Báo cần hỗ trợ: bấm widget → app → xác nhận gửi; yêu cầu Internet và người còn lại đã liên kết Telegram. Lượt báo hết hạn sau 15 phút; tối thiểu 30 giây giữa hai yêu cầu mới. Bấm thử lại cùng yêu cầu không tạo lời nhắc trùng.
- Nhắc cục bộ: tối đa 48 lịch sắp tới theo thời gian, áp dụng mọi bé; mở/đồng bộ app để nạp thêm. Máy chưa tải lịch không tự biết lịch mới; máy offline có thể còn nhắc giờ cũ sau khi người kia sửa.

Chưa có trong bản này: gộp nhật ký/tin lịch, giờ yên lặng tùy chỉnh, tổng kết 21h, lịch lặp sinh nhật tự sinh, tùy chọn từng loại thông báo, tự nhắc E.A.S.Y/thuốc. Không tự biến dữ liệu tham khảo thành chỉ định hoặc lịch dùng thuốc.

## 9. Widget và cách ký IPA

Ba kiểu: **Bé yêu**, **Lịch tháng này**, **Báo bố/mẹ cần hỗ trợ**, có nhiều kích thước. Thêm từ màn hình chính iPhone, chọn từng kiểu; chọn bé và cho phép hiển thị dữ liệu trong Cài đặt → Tiện ích.

Widget dữ liệu dùng App Group `group.vn.giadinhanam.family`; extension có bundle `vn.giadinhanam.family.widget`. App và extension đều cần được ký/cài hợp lệ và cấp cùng nhóm. ESign không được xóa `.appex` nếu muốn widget. Chứng chỉ hiện có chưa được xác nhận cấp được App Group: thiếu quyền thì không hứa widget dữ liệu hoạt động. Không mở public bảng thông tin bé để né quyền ký. Nút hỗ trợ chỉ mở app, không đọc snapshot riêng tư.

Dữ liệu widget mặc định tắt. Khi bật, tên bé/số đo/tên lịch có thể thấy trên màn hình; dữ liệu chỉ là snapshot lần mở/đồng bộ gần nhất. Widget ghi rõ thời điểm cập nhật; iOS quyết định thời điểm refresh. Bản này chọn một bé dùng chung cho các widget Bé yêu, chưa chọn bé độc lập trên từng widget.

## 10. Kiểm thử trên hai máy trước khi dùng

1. Tạo lời nhắc A → B khóa màn hình nhận Telegram → B xác nhận → A thấy thời gian nhận; trạng thái chưa hoàn thành giữ nguyên.
2. Bấm xác nhận hai lần; sửa giờ rồi bấm nút cũ; tài khoản sai/đã hủy liên kết không được xác nhận.
3. Đổi giờ/hoàn thành: job cũ dừng; máy đồng bộ hủy local cũ. Kiểm tra máy offline rồi mở lại.
4. Nhắc cục bộ khi mất mạng; Telegram khi app đóng; phân biệt server nhận và banner thật.
5. Tắt tiếng bot, mất mạng, Supabase dừng, token sai: không hiện “người nhà đã nhận”. Không dùng làm kênh cấp cứu duy nhất.
6. Widget trên iPhone 15 ESign và iPhone 11 TrollStore; extension được cài, có/không App Group, dữ liệu tắt/bật, đổi bé, qua đầu tháng.

Nguồn: [Supabase Cron + Vault](https://supabase.com/docs/guides/functions/schedule-functions), [webhook bất đồng bộ](https://supabase.com/docs/guides/database/webhooks), [Telegram webhook](https://core.telegram.org/bots/api#setwebhook), [WidgetKit cập nhật](https://developer.apple.com/documentation/widgetkit/keeping-a-widget-up-to-date).
