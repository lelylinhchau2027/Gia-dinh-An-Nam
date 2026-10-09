import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.3";
import { digest, processTelegram } from "../_shared/telegram.ts";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const reply = (body: unknown, status = 200) =>
    Response.json(body, { status, headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  try {
    const authorization = req.headers.get("Authorization") || "";
    const caller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authorization } } },
    );
    const {
      data: { user },
      error: ue,
    } = await caller.auth.getUser();
    if (ue || !user) return reply({ error: "Hãy đăng nhập lại." }, 401);
    const { data: member, error: me } = await caller
      .from("family_members")
      .select("family_id,display_name")
      .eq("user_id", user.id)
      .single();
    if (me || !member) return reply({ error: "Hãy ghép gia đình trước." }, 403);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const input = await req.json();
    const check = (e: unknown) => {
      if (e) throw new Error("DatabaseUnavailable");
    };
    if (input.action === "status") {
      const { data: link, error } = await admin
        .from("telegram_links")
        .select("display_name,confirmed_at,enabled,updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      check(error);
      const { data: jobs, error: je } = await admin
        .from("telegram_jobs")
        .select("kind,state,created_at,last_error")
        .eq("recipient_id", user.id)
        .eq("family_id", member.family_id)
        .order("created_at", { ascending: false })
        .limit(10);
      check(je);
      return reply({ link, jobs });
    }
    if (input.action === "start") {
      const username = Deno.env.get("TELEGRAM_BOT_USERNAME");
      if (
        !username ||
        !/^[a-zA-Z0-9_]+$/.test(username) ||
        !Deno.env.get("TELEGRAM_BOT_TOKEN")
      )
        return reply({ error: "Chưa cấu hình bot trên Supabase." }, 503);
      const bytes = crypto.getRandomValues(new Uint8Array(24));
      const code = Array.from(bytes, (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      const { error } = await admin
        .from("telegram_link_codes")
        .upsert({
          user_id: user.id,
          code_hash: await digest(code),
          expires_at: new Date(Date.now() + 600000).toISOString(),
        });
      check(error);
      return reply({ url: `https://t.me/${username}?start=${code}` });
    }
    if (input.action === "confirm") {
      // Compare the exact link version shown in-app, not a potentially replaced /start result.
      const { data, error } = await admin
        .from("telegram_links")
        .update({ enabled: true, confirmed_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("updated_at", input.link_version)
        .is("confirmed_at", null)
        .select("user_id");
      check(error);
      if (!data?.length)
        return reply(
          {
            error: "Liên kết đã thay đổi. Tải lại và xác nhận đúng tài khoản.",
          },
          409,
        );
    } else if (input.action === "unlink" || input.action === "pause") {
      const query =
        input.action === "unlink"
          ? admin.from("telegram_links").delete()
          : admin.from("telegram_links").update({ enabled: false });
      check((await query.eq("user_id", user.id)).error);
      check(
        (
          await admin
            .from("telegram_link_codes")
            .delete()
            .eq("user_id", user.id)
        ).error,
      );
      check(
        (
          await admin
            .from("telegram_jobs")
            .update({ state: "cancelled", lease_id: null })
            .eq("recipient_id", user.id)
            .in("state", ["pending", "processing"])
        ).error,
      );
    } else if (input.action === "resume") {
      check(
        (
          await admin
            .from("telegram_links")
            .update({ enabled: true })
            .eq("user_id", user.id)
            .not("confirmed_at", "is", null)
        ).error,
      );
    } else if (input.action === "acknowledge") {
      const { error } = await admin.rpc("acknowledge_family_reminder", {
        target_id: input.id,
        actor: user.id,
        expected_revision: input.revision,
      });
      if (error)
        return reply(
          {
            error:
              "Không thể xác nhận: lời nhắc đã đổi, đã xong hoặc do chính bạn tạo. Hãy đồng bộ lại.",
          },
          409,
        );
      try {
        await processTelegram(admin, member.family_id);
      } catch {
        /* Confirmation saved; Cron handles delivery. */
      }
    } else if (input.action === "attention") {
      const { data, error } = await admin.rpc("create_attention_reminder", {
        actor: user.id,
        request_id: input.request_id,
      });
      if (error)
        return reply(
          {
            error:
              "Chưa gửi được: người còn lại phải liên kết Telegram, và mỗi lượt cách nhau ít nhất 30 giây. Hãy liên hệ trực tiếp nếu cần gấp.",
          },
          409,
        );
      // Persistence succeeded even if delivery fails; retrying the same request is idempotent.
      try {
        await processTelegram(admin, member.family_id);
      } catch {
        /* Cron recovers. */
      }
      return reply({ id: data, saved: true });
    } else if (input.action === "test") {
      const { data: link, error } = await admin
        .from("telegram_links")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("enabled", true)
        .not("confirmed_at", "is", null)
        .maybeSingle();
      check(error);
      if (!link)
        return reply({ error: "Hãy liên kết và bật Telegram trước." }, 409);
      // Unique 30-second bucket is an atomic rate limit, including concurrent taps.
      const { error: ie } = await admin
        .from("telegram_jobs")
        .insert({
          family_id: member.family_id,
          actor_id: user.id,
          recipient_id: user.id,
          source_table: "test",
          entity_id: user.id,
          kind: "test",
          dedupe_key: `test:${user.id}:${Math.floor(Date.now() / 30000)}`,
          expires_at: new Date(Date.now() + 300000).toISOString(),
        });
      if (ie?.code === "23505")
        return reply({ error: "Đợi 30 giây trước khi thử lại." }, 429);
      check(ie);
      return reply(await processTelegram(admin, member.family_id));
    } else if (input.action === "process")
      return reply(await processTelegram(admin, member.family_id));
    else return reply({ error: "Unknown action" }, 400);
    return reply({ ok: true });
  } catch {
    return reply(
      {
        error:
          "Chưa kết nối được Telegram. Kiểm tra migration 0005, Functions và Secrets trên Supabase.",
      },
      503,
    );
  }
});
