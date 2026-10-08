# Thiết lập đồng bộ cho hai người

Nếu đang thiết lập lần đầu để build bằng GitHub Actions và ký ESign, làm theo luồng đầy đủ tại [`GITHUB_ACTIONS_ESIGN_TUNG_BUOC.md`](GITHUB_ACTIONS_ESIGN_TUNG_BUOC.md).

## Tạo backend

1. Tạo một project Supabase riêng cho gia đình.
2. Trong Authentication → Providers, bật Anonymous Sign-Ins cho bản thử nghiệm hiện tại.
3. Chạy migration `supabase/migrations/0001_family_core.sql` một lần bằng Supabase CLI hoặc SQL Editor.
4. Sao chép `.env.example` thành `.env`, thay URL và anon key của project.
5. Deploy Edge Function:

```bash
npx supabase@latest login
npx supabase@latest functions deploy notify-family --project-ref YOUR_PROJECT_REF
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` và `SUPABASE_SERVICE_ROLE_KEY` được Supabase cung cấp tự động cho Edge Function. Không đưa service-role key vào `.env` của app.

## Ghép hai iPhone

1. Trên máy đang giữ dữ liệu gốc: Gia đình → Tạo hoặc nhập mã ghép đôi → Máy thứ nhất.
2. Nhập tên hiển thị, tạo gia đình và giữ lại mã 8 ký tự.
3. Trên máy còn lại: chọn Máy thứ hai và nhập mã đó.
4. Vào Cài đặt → Đăng ký thông báo trên cả hai máy.

Backend khóa mỗi gia đình ở tối đa hai tài khoản. Row Level Security bảo đảm chỉ hai thành viên đọc/ghi được bản ghi có cùng `family_id`.

## Lưu ý cho bản dùng lâu dài

Bản thử nghiệm dùng tài khoản ẩn danh được lưu trong Secure Storage. Nếu xóa app trước khi liên kết tài khoản với email, thiết bị có thể mất danh tính cũ và chiếm một “suất” mới không được vì gia đình đã đủ hai người. Trước khi phát hành IPA dùng thật, cần thêm đăng nhập email OTP cho hai địa chỉ email của vợ chồng hoặc quy trình khôi phục do quản trị viên thực hiện.
