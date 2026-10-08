# Tab Em bé theo tab Trợ lí của bản gốc

## Đã đối chiếu trong IPA 1.2.21

Đã xem 17 ảnh `IMG_5435.PNG`–`IMG_5451.PNG` trong thư mục `Ảnh` và các khung hình của video `30efd8e26d7dff92ad6f7adb1b75742d.mp4` (100 giây). Dùng chúng để điều chỉnh nền tím chuyển sắc, font Quicksand, ảnh bìa `bg_child_08`, hồ sơ ở giữa, nhãn và thứ tự tiện ích. Không đưa ảnh/video có dữ liệu riêng của người dùng vào mã nguồn.

- `ChildToolButtonModelFn` (module 1770): danh sách, thứ tự và điều kiện hiển thị tiện ích của bé / thai nhi.
- `ChildToolButtonTypeFn` (1769), `MeasurementTypeFn` (1470): nhãn, màu và icon từng tiện ích.
- `SquircleButton` (1772), `ButtonBarCard` (1773): lưới bốn cột, icon trên nền màu nhạt, nhãn dưới icon. Bản mới dùng ba cột ở màn hình hẹp hoặc khi bật cỡ chữ lớn.
- Icon bitmap được trích nguyên byte từ `assets/src/shared/assets/icons` và `images`. Không sao chép executable, phiên đăng nhập hay cấu hình dịch vụ của app gốc.

Chạy lại việc trích ảnh bằng `python3 scripts/extract_legacy_icons.py /duong/dan/app.ipa`. Script chỉ đọc một whitelist cố định, không giải nén tùy ý đường dẫn trong ZIP.

## Các thao tác mới

- Một chạm icon bú / hút sữa / ngủ / bỉm / ăn dặm / cảm xúc mở ngay form tương ứng. Chọn lượng thường dùng bằng nút; giờ mặc định hiện tại, bấm dòng thời gian để sửa.
- Nhấn giữ icon ghi nhận để xem lịch sử riêng, hoặc bấm “Xem lịch sử” trong form.
- “Các mũi tiêm” có bảng nhóm vắc-xin và các ô số mốc, liên kết bản ghi với mốc tham khảo. Ghi tên vắc-xin, mũi số, nơi tiêm, ngày giờ; phân biệt “đã ghi” và “chưa ghi”, không suy ra “chưa tiêm” chỉ vì không có dữ liệu.
- “Bé làm được gì” ghi mốc và mô tả thực tế. Không đánh giá chậm/nhanh phát triển.
- “Mọc răng” có sơ đồ hai hàm, chọn vị trí trong 20 răng sữa, ghi ngày mọc, mở lại để sửa hoặc xóa. Sơ đồ minh họa và cách đánh số vị trí không hoàn toàn giống bản gốc; chưa có khoảng tuổi mọc răng chuẩn.
- “Đếm cú đạp” có nút +1, trừ chạm nhầm, bản nháp cục bộ qua lần mở lại. Chỉ khi kết thúc phiên mới lưu nhật ký và đồng bộ. Không dùng bộ đếm để suy ra tình trạng thai.
- Thống kê năm/tháng tách sữa bé uống và sữa mẹ hút. Không đổi phút bú mẹ sang ml.
- Tùy chỉnh ẩn/hiện tiện ích lưu trên từng máy. Chưa hỗ trợ kéo thả sắp xếp như app gốc.
- Nhập cân nặng, chiều cao và vòng đầu cùng ngày trong một transaction; nếu một bước lỗi thì không lưu dở dang. Lịch chọn ngày không cần gõ chuỗi YYYY-MM-DD.
- Hoạt động trong ngày có thẻ ngang và bộ lọc ngày; vẫn có lựa chọn xem mọi ngày để truy cập lịch sử cũ.

## Những điểm chưa tương đương bản gốc

- Không nối vào cộng đồng “bé sinh cùng tuần”, không có cửa hàng/quảng cáo.
- Phát triển theo tuần hiện là lịch sử số đo, cột mốc do gia đình ghi; chưa có đầy đủ bộ bài hướng dẫn theo tuần của app gốc.
- Lịch E.A.S.Y vẫn là mẫu tham khảo, chưa có trình dựng lịch riêng theo ngày.
- Lịch tiêm chưa tự tính lịch cá nhân hay xác định mũi nào cần tiêm; cần đối chiếu sổ và cơ sở tiêm.
- Biểu tượng vector dùng FontAwesome5 tương ứng; các biểu tượng bitmap dùng ảnh gốc. Không tuyên bố mọi icon giống 100%.
- Huy chương hiện lưu cột mốc và nhóm kỹ năng; chưa có đủ 64 tiêu chí hay biểu đồ phần trăm như ảnh gốc.
- Biểu đồ chỉ vẽ số đo thực tế, không hiển thị đường chuẩn hoặc suy ra mức đạt chuẩn khi chưa kiểm chứng. BMI trên hồ sơ chỉ tính từ cân nặng/chiều cao cùng ngày, không phân loại sức khỏe.

## Dữ liệu và nâng cấp

Các mục mới lưu `details.tool` trong `care_entries`, tiếp tục dùng hàng đợi offline, sửa/xóa và phân quyền của bản 0.2. Không đổi kiểu `kind` trên máy chủ nên **không cần migration mới ngoài 0002**. Dữ liệu cũ vẫn đọc được. Dữ liệu hút sữa cũ có `feeding: Hút sữa` được nhận diện riêng.

Nháp bộ đếm và tùy chọn ẩn/hiện không đồng bộ; các bản ghi đã lưu mới đồng bộ. Các giới hạn push/cài IPA trong UPGRADE_0_2.md vẫn áp dụng.

## Kiểm tra bản làm lại

- `npm run typecheck` và `npm test`: 11 bài test, gồm lưu nguyên tử ba số đo và hàng đợi đồng bộ, phân biệt hút sữa/bé uống sữa, dữ liệu tiện ích và phân quyền gia đình.
- Đã thử trên Chromium ở bản web: ghi sữa 120 ml, hút sữa 90 ml và đối chiếu tổng; lưu ba số đo; ghi ngày mọc răng rồi mở lại; ghi mũi tiêm theo mốc; khôi phục bản nháp đếm cú đạp sau reload rồi lưu.
- Đây chưa phải kiểm thử native trên iPhone. Cần kiểm tra tiếp bàn phím, vùng chạm, cỡ chữ lớn, bộ đếm khi đưa app xuống nền và đồng bộ hai máy sau khi có IPA mới.
- Đã xuất bundle iOS thành công (1533 modules). Đây là bundle JavaScript/tài nguyên, **không phải file IPA**.
- Ảnh bản web ở `build/preview/an-nam-assistant-grid.png`, `build/preview/an-nam-assistant-320.png` và `build/preview/an-nam-teeth.png`; thư mục build được gitignore, không phát hành ảnh chụp thử nghiệm.
- Phiên bản thử nghiệm giao diện: **0.3.0 (build 3)**, giữ Bundle ID để cài đè. Push và chạy workflow theo yêu cầu của người dùng; kết quả IPA xem trong GitHub Actions.

## Tài nguyên gốc

Ảnh trong `assets/legacy/` thuộc tác giả ứng dụng gốc, không phải tài nguyên do dự án An Nam tự tạo và không được mặc nhiên cấp phép phát hành lại. Được đưa vào bản thử nghiệm theo yêu cầu sử dụng cá nhân và push/build của người dùng. Việc có trong repository không tạo ra giấy phép cho bên khác tái sử dụng; trước khi phân phối rộng rãi cần xác nhận quyền sử dụng hoặc thay bằng bộ icon được cấp phép.
