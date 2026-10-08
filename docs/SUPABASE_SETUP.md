# Thiết lập đồng bộ cho hai người

**Đang nâng từ bản đã cài 0.1 lên 0.2:** làm theo [UPGRADE_0_2.md](UPGRADE_0_2.md) để chạy migration mới, cấu hình email OTP và deploy lại hàm push.

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

Phiên đăng nhập hiện được lưu bằng AsyncStorage; mã thiết bị nhận push nằm trong SecureStore. Nếu xóa app khi tài khoản còn ẩn danh, thiết bị có thể mất danh tính cũ. Từ bản 0.2, vào Bảng tin → Tài khoản để liên kết email riêng của mỗi người; sau khi xác nhận, dùng email OTP để khôi phục trên máy mới. Bật manual linking và cấu hình email templates theo hướng dẫn nâng cấp.
