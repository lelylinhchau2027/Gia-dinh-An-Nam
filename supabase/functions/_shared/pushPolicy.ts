export function retryAt(attempt: number, now = Date.now()) {
  return new Date(
    now + Math.min(3600, 15 * 2 ** Math.min(attempt, 8)) * 1000,
  ).toISOString();
}
export function permanentPushError(code: string) {
  return [
    "DeviceNotRegistered",
    "InvalidCredentials",
    "MessageTooBig",
    "MismatchSenderId",
    "UNAUTHORIZED",
  ].includes(code);
}
export function pushPayload(
  job: {
    id: string;
    family_id: string;
    kind: string;
    message_id: string | null;
    expires_at: string;
  },
  token: string,
  message?: { created_by_name?: string; body?: string },
) {
  return {
    to: token,
    sound: "default",
    priority: "high",
    interruptionLevel: "active",
    title:
      job.kind === "test"
        ? "Kiểm tra push An Nam"
        : (message?.created_by_name || "Người nhà").slice(0, 80),
    body:
      job.kind === "test"
        ? "Đây là push từ máy chủ qua Expo/APNs, không phải nhắc cục bộ."
        : (message?.body || "Bạn có tin nhắn mới.").slice(0, 350),
    expiration: Math.floor(Date.parse(job.expires_at) / 1000),
    // Deduplicate retries of this event, never collapse different messages.
    collapseId: job.id,
    threadId: `family:${job.family_id}`,
    data: {
      route: job.kind === "test" ? "/cai-dat" : "/family/message",
      push_job_id: job.id,
      entity_id: job.message_id,
    },
  };
}
