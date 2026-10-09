import { client, familySession } from "./social";
export async function pushHealth() {
  const { familyId } = await familySession();
  const { data, error } = await client().rpc("family_push_health", {
    p_family_id: familyId,
  });
  if (error)
    throw new Error(
      ["PGRST202", "42883"].includes(error.code)
        ? "Cần chạy migration 0004 để xem trạng thái push máy chủ."
        : "Chưa đọc được trạng thái máy chủ. Kiểm tra mạng và gia đình.",
    );
  return `Thiết bị đã đăng ký: của bạn ${data.own_devices}, người còn lại ${data.partner_devices}.\nHàng đợi: ${data.pending}; lỗi/hết hạn 24 giờ qua: ${data.failed}.\nTrạng thái gần nhất: ${data.last_provider_status || "chưa gửi"}.\n${data.last_error ? "Lỗi: " + data.last_error : ""}\n“provider_accepted” chỉ là APNs/FCM đã nhận, chưa chứng minh điện thoại đã hiển thị.`;
}
export async function testServerPush() {
  const { familyId } = await familySession();
  const { data, error } = await client().functions.invoke("dispatch-push", {
    body: { action: "test", family_id: familyId },
  });
  if (error || !data?.managed_by_server)
    throw new Error(
      "Chưa thử được push máy chủ. Kiểm tra đã triển khai dispatch-push và migration 0004; mỗi lần thử cách nhau ít nhất 30 giây.",
    );
  return "Đã yêu cầu máy chủ gửi push về thiết bị của tài khoản này. Hãy kiểm tra banner, rồi đọc trạng thái máy chủ; đây chưa phải xác nhận đã nhận.";
}
