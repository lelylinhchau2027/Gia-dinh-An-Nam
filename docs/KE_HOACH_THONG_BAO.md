# Kế hoạch thông báo — Gia Đình An Nam

Ngày lập: 09/10/2026. Cập nhật triển khai: **mã nguồn 0.6 đang kiểm thử; chưa bật trên Supabase/Telegram thật**.

## Quyết định mới — ưu tiên hơn mọi bảng đề xuất bên dưới

- Bỏ gửi chat văn bản/ảnh/video; giữ dữ liệu lịch sử, thay bằng lời nhắc với hai trạng thái riêng: **đã nhận** và **đã hoàn thành**.
- Telegram báo lời nhắc mới, sửa lịch, xác nhận, hoàn thành, bài/bình luận/nhật ký mới. Có nút **Tôi đã nhận lời nhắc** trong app và Telegram; đổi nội dung/giờ cần xác nhận lại.
- Lịch gửi Telegram **21:00 Asia/Ho_Chi_Minh mỗi ngày từ D-7 đến D-1**; iPhone nhắc cục bộ đúng T. Không tự bù mốc đã qua. Quy tắc này thay bảng D-7/D-1/T-2 cũ.
- Ngày/giờ dùng nút chọn thay vì nhập chuỗi: hồ sơ bé, nhật ký, E.A.S.Y, lời nhắc.
- Thêm ba kiểu widget: tóm tắt bé, lịch tháng, báo cần hỗ trợ. Nút hỗ trợ mở app để xác nhận gửi Telegram, không gọi điện, không phải kênh cấp cứu bảo đảm. Widget dữ liệu mặc định tắt, cần App Group hợp lệ; không công khai dữ liệu để né quyền ký.
- Đã có migration 0005, ba Edge Functions và script cấu hình webhook/Cron. **Chưa deploy, chưa có token bot, chưa chứng minh nhận nền trên hai iPhone.**
- Chưa triển khai các phần của đề xuất cũ: gộp/giờ yên lặng/tổng kết, lặp lịch, bộ lọc từng loại/bé, xác nhận lịch cục bộ của máy kia. Bản đầu gửi từng sự kiện, có tạm dừng/hủy liên kết toàn bộ Telegram.

Hướng dẫn hiện hành và các bước cần làm: [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md).

---

## Đề xuất ban đầu (lưu lịch sử, không dùng làm mô tả tính năng đã hoàn thành)

Phạm vi: hai tài khoản bố/mẹ, nhiều hồ sơ bé; giữ IPA hiện tại, dùng Supabase hiện có, không thuê VPS. Các giờ dưới đây là mặc định sản phẩm đề xuất, không phải chỉ định chăm sóc/y tế. Mỗi người có thể điều chỉnh.

## 1. Đang có gì, cần bổ sung gì?

| Phần | Hiện trạng trong mã | Việc cần làm theo kế hoạch |
| --- | --- | --- |
| Nhắc cục bộ | Đã đặt được nhắc có giờ và đối soát lịch sau đồng bộ | Thêm nhiều mốc trước sự kiện, lặp lịch, trạng thái từng máy, tùy chọn từng bé |
| Chat | 0004 đã có hàng đợi server gửi qua Expo/APNs | Bổ sung kênh Telegram; không coi migration 0004 là đã triển khai Telegram |
| Nhật ký bé/việc chung | Đường gửi `notify-family` cũ qua Expo | Chuyển sang sự kiện server và kênh do người nhận chọn |
| Bài đăng/bình luận/like | Đã có dữ liệu, chưa có hàng đợi thông báo mới | Thêm trigger, quy tắc người nhận và gộp thông báo |
| E.A.S.Y | Lưu mẫu và giờ bắt đầu, chưa tự tạo nhắc | Chỉ tạo lịch sau khi người dùng bật nhắc và xem trước |
| Tiêm/khám | Có dữ liệu tham khảo và tạo nhắc thủ công | Tách mốc tham khảo khỏi ngày hẹn được gia đình xác nhận |
| Telegram | Chưa có liên kết tài khoản hoặc bot trong app | Cần bot, migration mới, Function, webhook, Cron và kiểm thử thật |

Chưa có cơ sở xác nhận trạng thái triển khai SQL/Function trên Supabase đang dùng. Kế hoạch không tự nâng backend, không tạo bot, không gửi dữ liệu gia đình ra ngoài và không push/build app.

## 2. Vai trò ba nơi nhận thông báo

- **Cục bộ:** IPA đặt lịch trên chính iPhone sau khi có dữ liệu. iOS có thể hiển thị lịch đã đặt dù app đóng/mất mạng. Không thể biết sự kiện mới trên máy kia nếu chưa nhận dữ liệu. [Cơ chế của Apple](https://developer.apple.com/library/archive/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/SchedulingandHandlingLocalNotifications.html).
- **Telegram:** Supabase gửi báo hoạt động mới, nhắc chuẩn bị và báo đổi/hủy lịch. Máy nhận không cần mở An Nam; vẫn cần mạng, Telegram hoạt động và quyền thông báo phù hợp. Thông báo mang tên Telegram/bot, không phải IPA An Nam.
- **Hộp thông báo trong An Nam:** lưu lịch sử, trạng thái chưa đọc và liên kết tới đúng bé/bài đăng/lịch. Đây không phải một kênh báo nền thứ ba.

Không phát thêm thông báo cục bộ tức thì cho cùng một hoạt động đã gửi qua Telegram. Khi đang mở đúng màn hình, ưu tiên cập nhật nội dung/huy hiệu trong app. Không tự chuyển sang APNs khi chưa có cấu hình ký hợp lệ.

## 3. Quy ước chung

- `D`: ngày diễn ra sự kiện; `T`: giờ hẹn chính xác. `D-1 21:00`: 21 giờ tối hôm trước, không phải trước đúng 24 giờ.
- Múi giờ gia đình mặc định đề xuất: `Asia/Ho_Chi_Minh`. Lưu thời điểm thực tế bằng UTC và giữ múi giờ/ngày gốc; không dùng múi giờ máy chủ để suy ra ngày.
- Mỗi người có tùy chọn nhận riêng; lịch chung mặc định nhận ở cả bố và mẹ. Hoạt động do ai tạo thì chỉ báo người còn lại.
- Mặc định dùng một iPhone chính cho nhắc cục bộ mỗi tài khoản; Telegram gửi một lần tới tài khoản đã liên kết, không nhân theo số thiết bị đăng nhập Telegram.
- Giờ yên lặng của app đề xuất: **22:00–07:00**. Thông báo hoạt động không phải chat được gộp tới 07:00. Chat và lịch có giờ đã bật nhắc được phép yêu cầu gửi đúng lúc; có công tắc tắt riêng. Quy tắc này không vượt được Focus/chế độ im lặng của iOS/Telegram.
- “Ngay” nghĩa là gửi lần đầu ngay sau khi dữ liệu đã lưu thành công trên Supabase, không chờ Cron. Mục tiêu kiểm thử: thông báo xuất hiện trong 15 giây ở điều kiện mạng tốt; không phải cam kết SLA.
- “Gộp 60 giây”: chờ tối đa 60 giây từ sự kiện đầu, không kéo dài cửa sổ mỗi lần có sự kiện tiếp theo. Với Cron mỗi phút, dự kiến gửi trong 60–120 giây sau sự kiện đầu.

## 4. Thông báo hoạt động mới giữa hai người

Các dòng ghi “bật” chỉ được bật sau khi người dùng đồng ý liên kết Telegram. Mặc định nội dung Telegram là thông báo tổng quát; bảng mô tả loại sự kiện, không mặc định chuyển toàn bộ nội dung riêng tư.

| Tính năng/sự kiện | Kênh, mặc định | Thời điểm và cách gộp | Người nhận |
| --- | --- | --- | --- |
| Tin nhắn văn bản | Telegram, bật | Ngay sau khi lưu server; không chờ tổng kết ngày | Người còn lại |
| Tin nhắn ảnh/video | Telegram, bật | Sau khi tệp tải xong và tin được lưu; chỉ báo có tin mới, không gửi tệp sang Telegram | Người còn lại |
| Đăng bài/ảnh gia đình | Telegram, bật | Một thông báo cho một bài, dù bài có nhiều ảnh; gửi ngay | Người còn lại |
| Bình luận | Telegram, bật | Bình luận đầu gửi ngay; thêm trong 60 giây gộp thành một lượt cập nhật | Người còn lại, không tự báo bình luận của mình |
| Like | Chỉ trong app, Telegram tắt | Nếu bật: gộp 5 phút theo bài; bỏ like thì hủy lượt chưa gửi | Chủ bài, nếu khác người like |
| Ghi sữa/bú, hút sữa | Telegram, bật | Gộp 60 giây theo bé/người nhận | Người còn lại |
| Ghi ngủ/thức, bỉm, ăn dặm | Telegram, bật | Cùng cửa sổ 60 giây của nhật ký bé | Người còn lại |
| Ghi hoạt động/cảm xúc | Trong app và tổng kết; Telegram tức thì tắt | Nếu bật: cùng cửa sổ nhật ký 60 giây | Người còn lại |
| Ghi nhiệt độ, thuốc đã dùng, khám bệnh | Telegram, bật | Ngay khi lưu; chỉ báo vừa có cập nhật sức khỏe, không suy luận mức khẩn cấp | Người còn lại |
| Chiều cao/cân nặng/vòng đầu | Telegram, bật | Gộp 60 giây cho các chỉ số cùng lần đo; không kết luận “bất thường” tự động | Người còn lại |
| Số đo thai, đếm cú đạp, cân nặng mẹ | Telegram, bật cho hồ sơ thai kỳ | Gộp 60 giây; không dùng thông báo làm đánh giá sức khỏe thai | Người còn lại |
| Răng mới, huy chương/mốc bé đạt | Telegram, bật | Một thông báo sau khi lưu mốc; gộp các mốc nhập cùng lượt trong 60 giây | Người còn lại |
| Tạo/giao việc, tạo lịch hẹn | Telegram, bật | Ngay, báo đã có việc/lịch mới; không thay thế các mốc nhắc đến hạn | Người còn lại/người được giao |
| Đổi giờ, đổi người nhận, hủy lịch | Telegram, bật | Ngay; hủy các job tương lai thuộc phiên bản cũ | Người bị ảnh hưởng, trừ người sửa |
| Hoàn thành việc/lịch | Telegram, bật | Một lần khi đổi trạng thái; không lặp khi đồng bộ lại | Người còn lại |
| Đổi tên/ảnh bìa/avatar bé | Trong app, Telegram tắt | Không cần báo riêng mặc định | Người còn lại |
| Tổng kết chăm bé | Telegram, bật | **21:00 mỗi ngày**, chỉ khi hôm đó có bản ghi; mỗi người tối đa một bản gộp các bé | Cả hai |

Quy tắc bổ sung:

- Sửa ghi chú/sửa lỗi chính tả của một bản ghi không tạo thêm báo tức thì; hộp thông báo cập nhật bản gốc. Đổi lịch hẹn là ngoại lệ cần báo rõ.
- Dữ liệu quá 2 giờ tuổi khi mới đồng bộ lên server chỉ vào tổng kết/hộp thông báo, không giả làm hoạt động “vừa xảy ra”. Chat chưa đọc xử lý riêng ở mục 8.
- Tổng kết chỉ tổng hợp dữ liệu thực tế đã đồng bộ; không đánh giá bé có ăn đủ, có bệnh hoặc cần dùng thuốc. Mặc định Telegram chỉ báo “Tổng kết hôm nay đã sẵn sàng”, số liệu chi tiết xem trong An Nam.
- Bản nhắc/lịch mới do chính mình tạo không gửi lại Telegram cho mình ngay lúc tạo. Các mốc nhắc đến hạn vẫn gửi tới mình nếu mình là người nhận lịch.

## 5. Lịch nhắc trước ngày và trong ngày sự kiện

Đây là bộ mặc định đề xuất. Mỗi dòng có thể tắt/bật từng mốc. Các mốc Telegram chuẩn bị và cục bộ sát giờ là hai lượt có chủ đích, không gọi đó là tự động dự phòng khi kênh kia thất bại.

| Loại lịch | Trước ngày sự kiện | Ngày diễn ra | Sau giờ/ngày hẹn |
| --- | --- | --- | --- |
| **Tiêm phòng đã xác nhận ngày/giờ** | Telegram **D-7 21:00**, **D-1 21:00** | Telegram **T-2 giờ**; cục bộ **T-1 giờ** | D+1 09:00: Telegram một lần “Cập nhật kết quả lịch hẹn” nếu chưa có kết quả; không kết luận bỏ mũi |
| **Khám thai, khám bé, tái khám đã có hẹn** | Telegram **D-1 21:00**; D-7 là tùy chọn, tắt | Telegram **T-2 giờ**; cục bộ **T-1 giờ** | D+1 09:00 hỏi cập nhật kết quả một lần nếu chưa ghi nhận |
| **Lịch hẹn chỉ có ngày, chưa có giờ** | Tiêm: D-7 và D-1 21:00 Telegram; khám: D-1 21:00 Telegram | Telegram **07:00**, nói rõ “chưa có giờ hẹn”; không tự đặt nhắc cục bộ sát giờ | D+1 09:00 như trên; app mời bổ sung giờ |
| **Sinh nhật bé** | Telegram **D-1 21:00**; D-7 21:00 tùy chọn, tắt | Cục bộ **08:00**; không thêm Telegram mặc định | Không nhắc quá hạn |
| **Kỷ niệm/ngày đặc biệt gia đình** | Telegram **D-1 21:00** | Cục bộ **08:00** | Không nhắc quá hạn |
| **Việc chung có hạn giờ** | Không có nhắc trước ngày mặc định; có thể bật D-1 21:00 Telegram | Cục bộ **T-15 phút**; nhắc đúng T là tùy chọn, tắt | Telegram **T+30 phút** một lần cho người được giao nếu chưa hoàn thành; không tự gọi là đã quên |
| **Lịch thuốc do phụ huynh nhập theo chỉ định** | Không nhắc D-1; không suy ra lịch từ một bản ghi “đã uống” | Cục bộ **đúng T** từng lần đã xác nhận; Telegram cùng giờ là tùy chọn, tắt | Chỉ ghi “chưa xác nhận” trong app; không tự nhắc uống bù, không chuyển giờ/liều |
| **E.A.S.Y đã tùy chỉnh và bật nhắc** | Không nhắc trước ngày | Cục bộ **trước 5 phút** mỗi hoạt động được chọn; Telegram tắt | Bỏ qua mốc đã qua, không dồn các cữ cũ |
| **Nhắc hút sữa/cho ăn/ngủ tự đặt riêng** | Không nhắc trước ngày | Cục bộ đúng giờ do người dùng chọn; Telegram tắt | Không tự suy ra lần tiếp theo hay cảnh báo vì thiếu bản ghi |
| **Nhắc nhập cân/đo hoặc đếm cử động thai** | Không có lịch tự bật | Chỉ khi người dùng tự đặt: cục bộ đúng ngày/giờ họ chọn | Không đánh giá sức khỏe khi chưa nhập |
| **Bé sang tuần/tháng mới** | Không báo trước | Tùy chọn cục bộ **09:00** ngày mốc; mặc định tắt | Không nhắc quá hạn |
| **Mốc tiêm/khám chỉ lấy từ dữ liệu tham khảo** | Không tạo lịch hẹn hoặc push tự động | Hiện gợi ý trong app để hỏi cơ sở y tế/xác nhận ngày | Không gắn nhãn trễ hạn y tế từ dữ liệu tham khảo |
| **Wonder weeks, răng dự kiến, mốc phát triển dự kiến** | Không nhắc dự báo tự động | Chỉ xem tham khảo; chỉ báo khi bố/mẹ ghi mốc thực tế | Không cảnh báo bé chậm hoặc bất thường |

Lịch thuốc, đếm cử động và lịch khám không phải hệ thống cấp cứu. Không dựa vào thông báo để quyết định liều, khoảng cách dùng thuốc, đánh giá sốt hay xử trí y tế.

## 6. Xử lý giờ đặc biệt và tránh báo dồn

1. **Ngày có nhiều lịch:** các thông báo chuẩn bị cùng 21:00 gộp thành một tin Telegram/người, phân mục từng bé. Có tổng kết ngày thì ghép trong cùng tin; không gửi hai tin tổng kết và chuẩn bị sát nhau.
2. **Hẹn sáng sớm:** nếu T-2 giờ rơi trước 07:00, chuyển lượt Telegram chuẩn bị đó vào D-1 21:00 và gộp với lượt đã có. Cục bộ T-1 giờ vẫn giữ giờ thật, nhưng phải hiển thị cảnh báo nhắc ban đêm khi lưu lịch.
3. **Hẹn ban đêm:** lượt Telegram chuẩn bị rơi từ 22:00 trở đi chuyển lên 21:00 cùng ngày nếu còn ở tương lai. Không dịch lịch thuốc/E.A.S.Y sang giờ khác vì giờ yên lặng; cho người dùng chọn bật/tắt từng mốc.
4. **Tạo lịch muộn:** bỏ những mốc đã qua; không gửi lại cả D-7, D-1. Nếu T còn dưới 1 giờ, màn hình lưu nêu rõ không còn mốc T-1 giờ và hỏi có muốn thêm một nhắc đúng T; không tự bật.
5. **Nhập ngày nhưng thiếu giờ:** giữ date-only, không tự biến 00:00 thành giờ hẹn. D0 07:00 là lời nhắc xem lịch, không phải giờ phải đến cơ sở y tế.
6. **Sửa/hủy/hoàn thành:** hủy job tương lai theo phiên bản. Mọi lần gửi server đều đọc lại trạng thái mới nhất. Máy đã đồng bộ sẽ hủy lịch cục bộ tương ứng; máy đang offline có thể còn báo lịch cũ (mục 8).
7. **Lặp:** sinh nhật/kỷ niệm có occurrence từng năm; lịch ngày/thứ có occurrence riêng. Ngày 29/02 cần người dùng chọn 28/02 hoặc 01/03 cho năm không nhuận trước khi bật lặp, không ngầm chọn.
8. **Đổi múi giờ:** lịch hẹn cơ sở giữ giờ nơi hẹn; 21:00 tổng kết theo múi giờ gia đình. Khi điện thoại đi nước ngoài, hiển thị cả giờ gia đình và giờ trên máy, không âm thầm dời lịch. Nhắc thuốc không tự chuyển múi giờ; phải kiểm tra lại lịch đã nhập.
9. **Nhiều bé:** mọi lịch có `child_id` hoặc đánh dấu “việc gia đình”. Đổi bé đang xem không được dừng lịch của bé khác. Tùy chọn nhận có bộ lọc từng bé.

## 7. Ví dụ dễ đối chiếu

### Lịch tiêm ngày 20/10/2026 lúc 10:00

Giả sử lịch được tạo trước 13/10, cả hai đã chọn nhận:

| Thời điểm | Kênh | Nội dung về mặt chức năng |
| --- | --- | --- |
| 13/10 21:00 | Telegram | Chuẩn bị cho lịch hẹn trong 7 ngày |
| 19/10 21:00 | Telegram | Ngày mai có lịch; xem giờ/nơi hẹn trong An Nam |
| 20/10 08:00 | Telegram | Còn 2 giờ tới lịch hẹn |
| 20/10 09:00 | Cục bộ trên từng iPhone đã tải lịch | Còn 1 giờ tới lịch hẹn |
| 21/10 09:00 | Telegram, có điều kiện | Chỉ hỏi cập nhật kết quả nếu chưa ghi đã đi/hủy/đổi lịch |

Nếu đã ghi kết quả ngày 20/10, không gửi lượt 21/10. Không tự nhắc lại việc tiêm hay đề xuất lịch tiêm bù.

### Sinh nhật ngày 20/10

- 19/10 21:00: Telegram nhắc chuẩn bị, gửi cả hai theo tùy chọn.
- 20/10 08:00: iPhone đã tải lịch hiển thị chúc mừng cục bộ, không cần mạng.
- Nếu muốn vẫn nhận ngày sinh nhật dù ít mở An Nam: có thể chọn **Telegram thay cục bộ cho mốc 08:00**, không tự thêm cả hai.

### Mẹ ghi một cữ sữa lúc 14:00

- Nếu dữ liệu lên server lúc 14:00: gộp các cập nhật cùng bé trong cửa sổ một phút; Telegram báo cho bố dự kiến 14:01–14:02. Không báo ngược cho mẹ.
- Nếu mẹ mất mạng và 15:00 mới đồng bộ: chỉ có thể gửi từ 15:00, nội dung chi tiết trong app giữ giờ ghi 14:00.
- Nếu bố chưa mở An Nam, Telegram vẫn là đường báo độc lập. Nhắc cục bộ không thể tự biết cữ sữa này.

## 8. Mất mạng, thông báo muộn, sửa lịch và lỗi gửi

| Tình huống | Hành vi bắt buộc |
| --- | --- |
| Máy tạo dữ liệu offline | Lưu trên máy; hiện “Chờ đồng bộ, chưa thể báo người nhà”. Chỉ tạo sự kiện server khi dữ liệu tới Supabase |
| Máy nhận chưa mở/tải lịch | Telegram vẫn gửi nếu đã liên kết; không tuyên bố nhắc cục bộ đã được đặt trên máy đó |
| Máy nhận không có mạng | Lịch cục bộ đã đặt vẫn có thể báo. Telegram có thể đến muộn khi kết nối lại, không bảo đảm thời điểm iPhone hiện |
| Lịch vừa hủy nhưng máy nhận offline | Hủy phía server ngay; local trên máy kia chỉ hủy sau đồng bộ. Trong app phải thể hiện giới hạn này; Telegram báo thay đổi nếu gửi được |
| Không còn quyền local/Telegram bị tắt tiếng | Hiện hướng dẫn kiểm tra; không âm thầm coi thiết bị sẵn sàng |
| Chưa liên kết Telegram hoặc đã chặn bot | Hiện lỗi cần xử lý; dữ liệu vẫn lưu. Không tự lấy tài khoản khác gửi thay |
| Đọc đúng tin chat trong An Nam trước lúc worker gửi | Có thể bỏ lượt Telegram chưa gửi dựa trên mốc đọc đã xác nhận; không suy ra “đã đọc” chỉ vì app đang mở |
| Server mất mạng hoặc API trả 5xx | Lưu queue, thử lại sau 1, 2, 5, 15, 60 phút; sau đó tối đa mỗi giờ, tối đa 12 lần và không quá hạn sự kiện |
| Telegram giới hạn tốc độ | Tôn trọng `retry_after`, không cố gửi dồn để bù |
| Bot token sai/người dùng chặn bot | Dừng gửi cho lỗi cấu hình hoặc người nhận bị ảnh hưởng, hiển thị hướng xử lý; không retry vô hạn |
| API trả thành công | Ghi “Telegram đã nhận yêu cầu” + message ID; không ghi “iPhone đã báo” hoặc “người kia đã đọc” |

Hạn gửi đề xuất, tính từ `due_at` của job (dùng thời gian server, nội dung hiển thị vẫn giữ thời gian gốc):

- Chat: tối đa 24 giờ; khi tin đã chờ hơn 15 phút, gộp thành báo số tin chưa đọc thay vì phát liên tiếp từng tin. Dữ liệu chat không bị xóa khi thông báo hết hạn.
- Nhật ký cập nhật: tối đa 2 giờ; quá hạn đưa vào tổng kết. Dữ liệu nhập lịch sử quá 2 giờ không tạo báo tức thì ngay từ đầu.
- Bài đăng/bình luận: tối đa 12 giờ; nếu trì hoãn do giờ yên lặng thì gửi bản gộp lúc 07:00 khi vẫn còn hạn.
- Lượt chuẩn bị D-7/D-1: bỏ khi đã tới ngày mốc chuẩn bị kế tiếp hoặc ngày sự kiện; không gửi “ngày mai” khi đã sang hôm nay. D-7 chỉ còn giá trị trong ngày D-7; D-1 chỉ trong ngày D-1.
- Lượt sát giờ: không gửi sau T. Tổng kết: hết hạn sau 2 giờ, không bù tổng kết tối qua vào hôm sau. Lượt hỏi cập nhật D+1: hết hạn vào cuối D+1.
- Cron mỗi phút chỉ quyết định khi nào **bắt đầu gửi**, không kiểm soát lúc Telegram/iOS hiển thị; tin đã được Telegram nhận có thể vẫn tới muộn. Nội dung có ngày/giờ đầy đủ để tránh hiểu nhầm.

Không thể bảo đảm exactly-once nếu Telegram đã nhận nhưng phản hồi bị mất trước khi lưu kết quả. Khóa chống trùng và lease giảm rủi ro; kiểm thử phải bao gồm tình huống timeout này, không hứa không bao giờ trùng.

## 9. Màn hình và thao tác cần bổ sung

### Cài đặt → Thông báo

- Hai thẻ độc lập: **Nhắc trên iPhone này** và **Nhận qua Telegram**. Không hiện lỗi thiếu APNs như lỗi của nhắc cục bộ/Telegram.
- Telegram: “Liên kết”, “Gửi tin thử”, “Tạm dừng”, “Hủy liên kết”; chỉ hiển thị tài khoản của chính người dùng.
- Công tắc chat, bài đăng, bình luận, like, từng nhóm nhật ký, tổng kết 21:00, từng bé; có mẫu “Đầy đủ”, “Ít làm phiền”, “Tùy chỉnh”. Mẫu Đầy đủ dùng bảng trên, không bật like/nhắc dự báo.
- Giờ yên lặng; ngoại lệ chat/lịch có giờ; giờ tổng kết; chọn máy chính; mặc định riêng tư.
- Lịch sử: chờ đồng bộ → chờ gửi → Telegram đã nhận / đã đặt trên máy / lỗi / hết hạn / đã hủy. “Đã đặt” không đồng nghĩa iOS đã hiển thị.
- Trang chẩn đoán: lần đồng bộ cuối của từng máy, các lịch sắp báo, kiểm tra cục bộ sau 10 giây, Telegram thử, trạng thái worker gần nhất. Không lộ token/bot key/chat ID của người khác.

### Khi tạo hoặc sửa lịch

1. Chọn bé/việc gia đình và loại lịch.
2. Chọn ngày, giờ (hoặc ghi rõ chưa có giờ), múi giờ.
3. Chọn người nhận: bố, mẹ hoặc cả hai; mặc định cả hai cho lịch bé, người được giao cho việc riêng.
4. Xem trước danh sách **ngày giờ cụ thể + kênh + người nhận**; tắt/bật từng lượt.
5. Chọn lặp nếu cần, giới hạn kết thúc; lịch thuốc phải nhập/xác nhận riêng.
6. Lưu: báo máy này đã đặt bao nhiêu lượt, server đã nhận chưa, máy kia đã xác nhận đặt lịch hay chưa.

“Đã xác nhận đặt lịch” được gửi sau khi thiết bị đối chiếu danh sách lịch với iOS, kèm phiên bản và thời gian. Nó chỉ là bằng chứng lập lịch tại thời điểm đó, không dùng để khẳng định điện thoại đã nhận banner hay tự bỏ mọi kênh dự phòng.

## 10. Riêng tư và liên kết đúng người

- Mỗi người liên kết cuộc trò chuyện riêng với bot; không dùng nhóm công khai hoặc nhập tay chat ID không xác thực.
- App tạo mã liên kết ngẫu nhiên, dùng một lần, hết hạn 10 phút, gắn với tài khoản đã đăng nhập. Server lưu hash; mở bot và bấm Start, sau đó quay lại An Nam xác nhận tài khoản Telegram trước khi bắt đầu gửi.
- Worker luôn kiểm tra người nhận/người gửi còn thuộc gia đình và người nhận đã bật loại thông báo đó. Rời gia đình/hủy liên kết thì dừng job chưa gửi.
- Bot token chỉ lưu trong Supabase Secrets; Telegram webhook kiểm tra secret header riêng. Không dùng bot token trong IPA/Git/chat. Endpoint app kiểm tra JWT; worker dùng secret riêng, không mở truy cập vô danh.
- Mặc định tin chỉ gồm “Gia đình có tin nhắn/cập nhật/lịch hẹn mới” và thời điểm; không gửi tên bé, số đo, tên thuốc, ảnh/video, trích đoạn chat, URL ảnh có chữ ký hoặc mã ghép gia đình.
- Mức “hiện chi tiết” chỉ bổ sung sau khi có lựa chọn đồng ý rõ ràng cho dữ liệu gia đình. Telegram không phải kênh lưu hồ sơ sức khỏe; bản đầu chỉ triển khai mức tổng quát.
- Bản đầu xem chi tiết bằng cách mở An Nam. Không hứa nút Telegram mở đúng màn hình IPA trước khi kiểm thử deep link; nếu cần trang HTTPS chuyển hướng phải được duyệt hosting, không mở công khai dữ liệu.
- Phản hồi “đã xong”/“hoãn” qua bot chưa nằm trong bản đầu. Làm trong app để tránh cập nhật nhầm lịch/nhầm bé; không dùng phản hồi bot để xác nhận đã uống thuốc.

Telegram cung cấp `sendMessage`, webhook và trường lỗi/thời gian thử lại; thiết kế liên kết/quyền riêng tư trên là phần cần tự triển khai trong An Nam. [Telegram Bot API](https://core.telegram.org/bots/api).

## 11. Kiến trúc triển khai trên Supabase, không VPS

```text
Chat / bài đăng / nhật ký / lịch hẹn được lưu vào Supabase
                    ↓ transaction
       Sự kiện + công việc thông báo theo người nhận
          ├─ Webhook → Function → Telegram (hoạt động mới)
          └─ Cron mỗi phút → Function (lịch đến hạn, gộp, thử lại)

Lịch hẹn Supabase → đồng bộ xuống iPhone → đặt nhắc cục bộ với iOS
```

Supabase có ví dụ chính thức cho [Telegram webhook trên Edge Functions](https://supabase.com/docs/guides/functions/examples/telegram-bot), và hỗ trợ [Cron gọi Function với secret lưu trong Vault](https://supabase.com/docs/guides/functions/schedule-functions). Không chạy bot polling liên tục và không dùng GitHub Actions làm máy gửi định kỳ.

Các thành phần mới dự kiến (tên sẽ chốt khi triển khai):

| Thành phần | Trách nhiệm |
| --- | --- |
| Migration 0005 trở đi | Liên kết Telegram, tùy chọn người nhận, mở rộng lịch/sự kiện/queue, RLS; không sửa lịch sử 0001–0004 đã áp dụng |
| `notification_preferences` | Theo user/bé/loại, kênh, yên lặng, riêng tư, máy chính |
| `telegram_links` / `telegram_link_tokens` | Liên kết đã xác nhận và mã dùng một lần, chống gắn một chat vào hai người |
| Lịch + quy tắc nhắc + occurrence | Giờ hẹn/múi giờ, lặp, phiên bản, người nhận, từng mốc D-7/D-1/T-60 |
| `notification_events` | ID sự kiện ổn định, family/child/entity/actor, loại thay đổi, revision, thời điểm ghi nhận; không sao chép ảnh/chat vào log |
| `notification_deliveries` | Theo event/occurrence/người/kênh/mốc; trạng thái, `due_at`, expiry, attempts, lease, Telegram message ID |
| `device_reminder_schedules` | Thiết bị đã lập lịch phiên bản nào, bao nhiêu lượt, lúc nào; không giả làm delivery receipt |
| Function liên kết và Telegram webhook | Xác thực, nhận Start, xác nhận liên kết, xử lý chặn bot; dedupe Telegram `update_id` |
| Function dispatch | Gửi test/hoạt động/lịch; kiểm tra quyền lại trước khi gửi, retry và rate limit |

Quy tắc kỹ thuật bắt buộc:

- Trigger chỉ enqueue trong transaction, không gọi Telegram trực tiếp trong transaction lưu bài/tin. Gửi lỗi không được làm mất dữ liệu gia đình.
- Khóa unique tối thiểu: `(source_event_or_occurrence_id, revision, recipient_id, channel, reminder_stage)`. Đồng bộ lại cùng bản ghi không tạo event mới. Các trường không ảnh hưởng thông báo không tăng revision gửi.
- Claim job có lease và khóa hàng; worker song song không cùng claim một lượt. Trước gửi đọc lại lịch mới nhất, membership, liên kết Telegram, tùy chọn và expiry.
- Hủy/sửa lịch sau khi job đã gửi tới Telegram không thể thu hồi banner chắc chắn; thông báo thay đổi là một sự kiện riêng. Không coi xóa tin bot là cách thu hồi bảo đảm.
- Queue APNs từ 0004 không tự biến thành Telegram. Khi bật Telegram cho chat, phải sửa đường `notify-family`/dispatch để không tiếp tục báo lỗi APNs hoặc gửi song song ngoài ý muốn. Giữ khả năng nâng lại APNs sau này; bật từng kênh rõ ràng.
- Chạy một worker lịch thống nhất thay vì thêm Cron riêng cho mỗi loại; vô hiệu Cron cũ trùng chức năng sau khi kiểm tra chuyển đổi. Không backfill hàng loạt thông báo từ dữ liệu cũ.
- Cục bộ dùng ngân sách ứng dụng tối đa 48 lịch đang chờ để nhất quán với mã hiện có, không khẳng định đây là giới hạn iOS. Xếp ưu tiên lịch thuốc đã xác nhận/lịch hẹn, rồi việc chung, rồi sinh hoạt; trong mỗi nhóm xếp theo giờ. Hiện rõ lượt nào chưa đặt vì đầy.
- Mở/đồng bộ app thì nạp thêm lịch vào cửa sổ; E.A.S.Y có nhiều mốc nên phải hiện “đã đặt đến ngày/giờ nào”. Không hứa các lịch chưa được đưa vào iOS vẫn báo nếu nhiều ngày không mở app.
- Migration có bảng trạng thái riêng, RLS chặn truy cập chéo gia đình; không để client đọc token, chạy claim, tự ghi “đã gửi” hay sửa liên kết người khác.
- Log kỹ thuật giữ 30 ngày rồi dọn theo lịch; không xóa dữ liệu chat/nhật ký nguồn. Không ghi bot token, URL chứa token hoặc nội dung sức khỏe vào log.

## 12. Thứ tự làm và điều kiện qua từng bước

| Giai đoạn | Công việc | Kết quả cần thấy |
| --- | --- | --- |
| 1. Chốt mặc định | Duyệt bảng mốc, múi giờ, 21:00 tổng kết, riêng tư, giờ yên lặng | Không còn quy tắc mâu thuẫn; chưa gửi thật |
| 2. Nền dữ liệu | Migration thử nghiệm, queue đa loại, RLS, dedupe, sửa/hủy/lặp | Test dữ liệu độc lập đạt, không đụng lịch gia đình thật |
| 3. Liên kết Telegram | Tạo bot do chủ gia đình quản lý, lưu Secrets, deploy Function và webhook nhận | Bố/mẹ liên kết đúng tài khoản, gửi tin thử tới từng người; sai secret/mã hết hạn bị từ chối |
| 4. Hoạt động tức thì | Chat trước, sau đó bài/bình luận/nhật ký; thống nhất với đường APNs cũ | Máy nhận khóa màn hình vẫn nhận Telegram; không báo cho chính người tạo |
| 5. Lịch định trước | Tiêm/khám/sinh nhật/việc, rồi lịch tự chọn thuốc/E.A.S.Y | Preview khớp job server và lịch iOS; hoàn thành/đổi giờ hủy đúng bản |
| 6. Giảm làm phiền | Gộp 21:00, nhật ký 60 giây, giờ yên lặng, nhiều bé, hàng đợi muộn | Không bắn hàng loạt bản ghi cũ, không bỏ lịch bé khác khi chuyển tab |
| 7. Nghiệm thu | iPhone 15 ESign + iPhone 11 TrollStore, Wi-Fi/di động, offline, foreground/nền | Ghi thời gian thực tế, hoàn thành bảng test bên dưới rồi mới dùng thường xuyên |

Backend triển khai theo thứ tự migration → Secrets → Function → Telegram webhook → liên kết/test → database webhook/Cron → bật từng loại thông báo. Đây là quy trình tương lai, không phải khẳng định đã triển khai. Giữ tính năng tắt Telegram riêng để quay về đồng bộ + cục bộ khi có lỗi; không phải xóa app hoặc dữ liệu để rollback.

## 13. Kiểm thử nghiệm thu bắt buộc

1. Chat cả hai chiều khi máy nhận ở Home, khóa màn hình, trong An Nam; ghi đủ giờ lưu server, gửi API và giờ banner thật. Không dùng API success thay cho kiểm tra banner.
2. Một bài nhiều ảnh chỉ một báo; đăng/sửa/đồng bộ lại không nhân thông báo; bình luận/like tuân thủ công tắc.
3. Nhật ký liên tiếp trong một phút gộp đúng bé; dữ liệu offline cũ không giả làm vừa xảy ra; sức khỏe không bị gộp lẫn với bản tổng kết thường.
4. Lịch ví dụ 20/10: kiểm tra toàn bộ mốc bằng đồng hồ mô phỏng trong unit test; test thiết bị bằng lịch thử gần, không đổi đồng hồ iPhone đang dùng hoặc lịch y tế thật.
5. Hẹn 06:30, 00:30, chỉ có ngày, tạo sát giờ, ngày 29/02, qua nửa đêm, thay múi giờ; không tạo thời điểm vô lý/đã qua.
6. Hai máy đã đồng bộ rồi mất mạng: nhắc cục bộ vẫn được kiểm thử; máy chưa đồng bộ phải hiện chưa đặt, không báo “đã nhận”.
7. Hủy/hoàn thành/đổi lịch: server ngừng job cũ; máy offline giữ nhắc cũ là giới hạn được hiển thị. Khi online phải hủy lịch cũ trước khi lập mới.
8. Bật/tắt giờ yên lặng và ngoại lệ chat; kiểm tra Focus/tắt tiếng Telegram không bị app hiểu nhầm thành lỗi backend.
9. Đổi bé không mất lịch bé kia; nhiều thiết bị một tài khoản không tăng số Telegram; máy phụ không tự giành vai trò máy chính.
10. Sai token, chặn bot, chưa Start, hủy liên kết, rời gia đình, mã liên kết bị phát lại hoặc gửi cho người khác; không rò dữ liệu.
11. HTTP 429/5xx/timeout, hai worker đồng thời, Telegram nhận nhưng DB lưu kết quả lỗi; retry có giới hạn, theo dõi rủi ro gửi trùng.
12. Đạt ngân sách 48 local: cảnh báo và danh sách chưa đặt đúng, không báo xanh toàn bộ; quay lại app nạp thêm lịch.
13. Chạy cả 0004 cũ và bản mới trong kiểm thử nâng cấp; một tin không kích hoạt hai kênh ngoài lựa chọn, không backfill toàn bộ chat cũ.

## 14. Chi phí và giới hạn vận hành

- Không cần VPS riêng: dùng Supabase Edge Functions + database webhook + Cron.
- Một Cron mỗi phút khoảng **43.200 lần/tháng 30 ngày**, nếu lần nào cũng gọi Function. Cộng thêm hoạt động, webhook liên kết, lượt retry/test và các app khác dùng chung hạn mức.
- Gói Free hiện có 500.000 lượt Edge Function trong hạn mức; với hai người, phần này dự kiến nằm trong quota nhưng phải theo dõi usage thật. Đây không phải cam kết miễn phí mọi tài nguyên; ảnh/video, dung lượng DB và băng thông có quota riêng. [Giá Edge Functions](https://supabase.com/docs/guides/functions/pricing).
- Free có chính sách pause sau một tuần không hoạt động và không có SLA uptime; không coi Cron là bảo đảm tránh pause. Khi project dừng/Telegram lỗi/máy mất mạng, thông báo có thể chậm hoặc không đến. [Điều kiện gói Supabase](https://supabase.com/pricing).
- Mục tiêu thực dụng: hoạt động mới gửi nhanh, lịch biết trước có local dùng khi mất mạng, trạng thái lỗi minh bạch. Không quảng cáo chính xác 100% hoặc dùng làm kênh báo y tế khẩn cấp.

## 15. Mặc định đề nghị duyệt trước khi viết mã

1. Giữ IPA; local cho giờ hẹn, Telegram cho liên lạc/cập nhật và nhắc chuẩn bị; không yêu cầu VPS/PWA ở giai đoạn này.
2. Dùng bảng thời điểm ở mục 4–5; 21:00 tổng kết + chuẩn bị, 22:00–07:00 yên lặng, chat là ngoại lệ có thể tắt.
3. Telegram riêng tư, chỉ lời báo tổng quát; không chuyển ảnh, nội dung chat hoặc thông tin sức khỏe sang Telegram.
4. Không tự tạo nhắc thuốc/tiêm/E.A.S.Y từ dữ liệu tham khảo; người dùng xem trước và xác nhận.
5. Làm chat + đăng bài + nhật ký trước, lịch nhiều mốc sau; chỉ bật dùng thật sau kiểm thử hai iPhone.
