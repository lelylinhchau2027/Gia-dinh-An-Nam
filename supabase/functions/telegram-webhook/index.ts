import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.3";
import { digest, telegram, processTelegram } from "../_shared/telegram.ts";
Deno.serve(async (req) => {
  const secret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");
  if (
    req.method !== "POST" ||
    !secret ||
    req.headers.get("x-telegram-bot-api-secret-token") !== secret
  )
    return new Response("Unauthorized", { status: 401 });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const input = await req.json();
    const msg = input.message;
    if (
      msg?.chat?.type === "private" &&
      String(msg.from?.id) === String(msg.chat.id)
    ) {
      const match = String(msg.text ?? "").match(/^\/start ([a-f0-9]{48})$/);
      if (match) {
        const { data, error } = await admin.rpc("consume_telegram_link", {
          code_digest: await digest(match[1]),
          chat: String(msg.chat.id),
          telegram_user: String(msg.from.id),
          telegram_name: String(msg.from.first_name ?? "Telegram"),
        });
        if (error) throw new Error("LinkUnavailable");
        if (data)
          await telegram("sendMessage", {
            chat_id: String(msg.chat.id),
            text: "Quay lại An Nam → Telegram, kiểm tra tên và bấm Xác nhận liên kết. Chưa gửi dữ liệu gia đình trước khi bạn xác nhận.",
          });
      }
    }
    const callback = input.callback_query;
    if (
      callback?.message?.chat?.type === "private" &&
      /^ack:[a-f0-9-]{36}$/.test(callback.data ?? "")
    ) {
      const { data: link, error: le } = await admin
        .from("telegram_links")
        .select("user_id,chat_id")
        .eq("telegram_user_id", String(callback.from.id))
        .eq("enabled", true)
        .not("confirmed_at", "is", null)
        .maybeSingle();
      if (le) throw new Error("LinkUnavailable");
      let text =
        "Lời nhắc đã thay đổi hoặc tài khoản chưa liên kết. Mở An Nam kiểm tra.";
      if (link && link.chat_id === String(callback.message.chat.id)) {
        const { data: job, error: je } = await admin
          .from("telegram_jobs")
          .select("entity_id,revision,family_id")
          .eq("id", callback.data.slice(4))
          .eq("recipient_id", link.user_id)
          .eq("source_table", "reminders")
          .maybeSingle();
        if (je) throw new Error("JobUnavailable");
        if (job) {
          const { error } = await admin.rpc("acknowledge_family_reminder", {
            target_id: job.entity_id,
            actor: link.user_id,
            expected_revision: job.revision,
          });
          if (!error) {
            text = "Đã xác nhận nhận lời nhắc, chưa đánh dấu hoàn thành.";
            try {
              await processTelegram(admin, job.family_id);
            } catch {
              /* RPC committed; Cron retries outbound. */
            }
          }
        }
      }
      // Replayed/old callbacks can no longer be answered, but acknowledgement is idempotent.
      try {
        await telegram("answerCallbackQuery", {
          callback_query_id: callback.id,
          text,
        });
      } catch {
        /* No data mutation retry needed. */
      }
    }
    return new Response("ok");
  } catch {
    return new Response("Retry later", { status: 503 });
  }
});
