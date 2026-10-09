import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.117.3";

export async function telegram(
  method: string,
  payload: Record<string, unknown>,
) {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("TelegramNotConfigured");
  // Never include this URL/token, Telegram payload or exception text in logs.
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    },
  );
  const result = await response.json();
  if (!result.ok) {
    const error = new Error(
      `TelegramHTTP${result.error_code ?? response.status}`,
    ) as Error & { retryAfter?: number; permanent?: boolean };
    error.retryAfter = Number(result.parameters?.retry_after) || undefined;
    error.permanent = [400, 401, 403, 404].includes(
      result.error_code ?? response.status,
    );
    throw error;
  }
  return result.result;
}

export async function digest(value: string) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export function notificationText(kind: string, dueAt?: string) {
  const labels: Record<string, string> = {
    attention:
      "Người nhà cần bạn hỗ trợ ngay. Hãy mở An Nam hoặc liên hệ trực tiếp với người nhà.",
    reminder_created:
      "Người nhà vừa tạo lời nhắc. Mở An Nam xem chi tiết và xác nhận đã nhận.",
    rescheduled:
      "Một lời nhắc đã thay đổi. Mở An Nam xem lại và xác nhận phiên bản mới.",
    acknowledged:
      "Người nhà đã xác nhận nhận lời nhắc của bạn. Đây chưa phải xác nhận hoàn thành.",
    completed: "Một lời nhắc gia đình đã được cập nhật trạng thái hoàn thành.",
    family_posts: "Gia đình có bài đăng mới. Mở An Nam để xem.",
    post_comments: "Gia đình có bình luận mới. Mở An Nam để xem.",
    care_entries: "Nhật ký chăm bé có cập nhật mới. Mở An Nam để xem.",
    test: "Kết nối Telegram hoạt động. Đây là tin thử của Gia Đình An Nam.",
  };
  if (kind === "calendar" && dueAt)
    return (
      "Nhắc lịch trong 7 ngày tới: " +
      new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date(dueAt)) +
      " (giờ Việt Nam). Mở An Nam xem chi tiết."
    );
  return labels[kind] ?? "Gia đình có cập nhật mới. Mở An Nam để xem.";
}

export async function processTelegram(
  admin: SupabaseClient,
  familyId: string | null = null,
) {
  const { data: jobs, error } = await admin.rpc("claim_telegram_jobs", {
    target_family: familyId,
  });
  if (error) throw new Error("QueueUnavailable");
  let accepted = 0;
  for (const job of jobs ?? []) {
    const finish = async (values: Record<string, unknown>) => {
      const { error } = await admin
        .from("telegram_jobs")
        .update(values)
        .eq("id", job.id)
        .eq("lease_id", job.lease_id)
        .eq("state", "processing");
      if (error) throw new Error("QueueCheckpointFailed");
    };
    try {
      const [{ data: link, error: le }, { data: members, error: me }] =
        await Promise.all([
          admin
            .from("telegram_links")
            .select("chat_id,enabled,confirmed_at")
            .eq("user_id", job.recipient_id)
            .maybeSingle(),
          admin
            .from("family_members")
            .select("user_id")
            .eq("family_id", job.family_id),
        ]);
      if (le || me) throw new Error("MembershipUnavailable");
      if (
        !link?.enabled ||
        !link.confirmed_at ||
        !members?.some((m) => m.user_id === job.recipient_id) ||
        (job.actor_id && !members.some((m) => m.user_id === job.actor_id))
      ) {
        await finish({ state: "cancelled" });
        continue;
      }
      let reminder;
      if (job.source_table === "reminders") {
        const { data, error } = await admin
          .from("reminders")
          .select("*")
          .eq("id", job.entity_id)
          .eq("family_id", job.family_id)
          .maybeSingle();
        if (error) throw new Error("ReminderUnavailable");
        reminder = data;
        if (
          !reminder ||
          reminder.schedule_version !== job.revision ||
          (job.kind !== "completed" && reminder.completed_at) ||
          (["reminder_created", "rescheduled", "attention"].includes(
            job.kind,
          ) &&
            reminder.acknowledged_at) ||
          (job.kind === "calendar" &&
            new Date(reminder.due_at).getTime() <= Date.now())
        ) {
          await finish({ state: "cancelled" });
          continue;
        }
      } else if (
        ["family_posts", "post_comments", "care_entries"].includes(
          job.source_table,
        )
      ) {
        const { data, error } = await admin
          .from(job.source_table)
          .select(job.source_table === "care_entries" ? "id,deleted_at" : "id")
          .eq("id", job.entity_id)
          .eq("family_id", job.family_id)
          .maybeSingle();
        if (error) throw new Error("SourceUnavailable");
        if (!data || (data as { deleted_at?: string }).deleted_at) {
          await finish({ state: "cancelled" });
          continue;
        }
      }
      // Recheck fencing after reads; cancellation already in-flight at Telegram remains best effort.
      const { data: active, error: ae } = await admin
        .from("telegram_jobs")
        .select("id")
        .eq("id", job.id)
        .eq("lease_id", job.lease_id)
        .eq("state", "processing")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (ae) throw new Error("LeaseUnavailable");
      if (!active) continue;
      const canAck =
        reminder &&
        reminder.created_by !== job.recipient_id &&
        !reminder.acknowledged_at &&
        !reminder.completed_at;
      const result = await telegram("sendMessage", {
        chat_id: link.chat_id,
        text:
          "Gia Đình An Nam\n" + notificationText(job.kind, reminder?.due_at),
        ...(canAck
          ? {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "Tôi đã nhận lời nhắc",
                      callback_data: `ack:${job.id}`,
                    },
                  ],
                ],
              },
            }
          : {}),
      });
      await finish({
        state: "accepted",
        telegram_message_id: String(result.message_id),
        last_error: null,
      });
      accepted++;
    } catch (cause) {
      const e = cause as Error & { permanent?: boolean; retryAfter?: number };
      const delay =
        e.retryAfter ??
        [60, 120, 300, 900, 3600][Math.min(job.attempts - 1, 4)];
      await finish({
        state: e.permanent || job.attempts >= 12 ? "failed" : "pending",
        due_at: new Date(Date.now() + delay * 1000).toISOString(),
        lease_id: null,
        last_error: e.message?.startsWith("TelegramHTTP")
          ? e.message
          : "TemporaryDeliveryFailure",
      });
    }
  }
  return { accepted, processed: jobs?.length ?? 0 };
}
