# Quy tắc cập nhật dữ liệu tham chiếu

## Nguyên tắc

`src/data/legacy` là bản gốc bất biến được trích từ Bé của mẹ 1.2.21. Không sửa trực tiếp các JSON này.

Dữ liệu mới nằm trong `src/data/current`. Một nhóm cũ chỉ bị loại khỏi nội dung hiển thị khi bản mới:

1. Có nguồn chính thức hoặc hướng dẫn chuyên môn đủ tin cậy.
2. Ghi rõ ngày hiệu lực, ngày rà soát và đường dẫn nguồn.
3. Đủ nội dung để thay toàn bộ nhóm tương ứng; không trộn các mũi cũ/mới trong cùng một nhóm.
4. Qua kiểm tra thủ công về độ tuổi, số liều, khoảng cách tối thiểu và phạm vi áp dụng.

Nếu chưa đạt bốn điều kiện, app tiếp tục dùng nhóm gốc và gắn cảnh báo “đang chờ kiểm chứng”. E.A.S.Y là phương pháp sinh hoạt, không phải phác đồ y tế; app giữ các mẫu gốc và cho phép gia đình điều chỉnh theo bé.

## Trạng thái ngày 08/10/2026

- Rota: đã thay hoàn toàn nhóm gốc bằng lịch 2 liều TCMR 2026 — liều 1 lúc đủ 2 tháng, liều 2 cách tối thiểu 1 tháng và hoàn thành trước 6 tháng.
- Các nhóm tiêm khác: giữ bản gốc trong lúc chuẩn hóa trọn bộ lịch quốc gia và phân biệt rõ TCMR với tiêm dịch vụ.
- E.A.S.Y, khám thai, Wonder Weeks và biểu đồ tăng trưởng: giữ bản gốc, hiện cảnh báo nguồn/phiên bản.

Nguồn Rota: [Văn phòng Chương trình Tiêm chủng Quốc gia](https://tiemchungmorong.vn/news/in-country-news/vac-xin-phong-tieu-chay-cap-do-vi-rut-rota-da-duoc-trien-khai-dong-bo-tren-toan-quoc-trong-chuong-trinh-tiem-chung-mo-rong-tu-nam-2026), công bố ngày 06/01/2026.

## Mô hình phát hành

Mỗi lần cập nhật dữ liệu cần đổi `referenceRelease.id`, ghi changelog và giữ file cũ để có thể so sánh/khôi phục. App không tự tải nội dung y tế chưa duyệt từ Internet vào lịch đang dùng.
