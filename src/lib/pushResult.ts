// HTTP 200 only means the function ran; never treat zero recipients as success.
export function assertPushAccepted(result: unknown) {
  const value = result as {
    target_devices?: number;
    accepted_by_expo?: number;
    managed_by_server?: boolean;
    job_id?: string;
  } | null;
  // Durable server ownership is NOT delivery to a phone.
  if (
    value?.managed_by_server === true &&
    typeof value.job_id === "string" &&
    value.job_id
  )
    return;
  if (
    !value ||
    typeof value.target_devices !== "number" ||
    typeof value.accepted_by_expo !== "number"
  )
    throw new Error("Backend thông báo chưa trả về kết quả hợp lệ.");
  if (value.target_devices < 1)
    throw new Error(
      "Máy người nhận chưa đăng ký được push. Tin nhắn đã lưu nhưng chưa có thiết bị nhận thông báo.",
    );
  if (value.accepted_by_expo < value.target_devices)
    throw new Error(
      "Expo chưa nhận đủ thông báo cho các thiết bị đích. Cần kiểm tra token và cấu hình APNs.",
    );
}
