import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.3";
import { processChatPush } from "../_shared/pushWorker.ts";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization,apikey,content-type,x-push-worker-secret",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const secret = Deno.env.get("PUSH_WORKER_SECRET");
    if (secret && req.headers.get("x-push-worker-secret") === secret) {
      return Response.json(await processChatPush(admin), { headers: cors });
    }
    const authorization = req.headers.get("Authorization") || "";
    if (!authorization.startsWith("Bearer "))
      return new Response("Unauthorized", { status: 401, headers: cors });
    const caller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authorization } } },
    );
    const {
      data: { user },
      error,
    } = await caller.auth.getUser();
    if (error || !user)
      return new Response("Unauthorized", { status: 401, headers: cors });
    const input = await req.json();
    const { data: member, error: memberError } = await caller
      .from("family_members")
      .select("family_id")
      .eq("user_id", user.id)
      .eq("family_id", input.family_id)
      .single();
    if (memberError || !member)
      return new Response("Forbidden", { status: 403, headers: cors });
    if (input.action === "test") {
      const { data: recent, error: recentError } = await admin
        .from("chat_push_jobs")
        .select("id")
        .eq("sender_id", user.id)
        .eq("kind", "test")
        .gt("created_at", new Date(Date.now() - 30000).toISOString())
        .limit(1);
      if (recentError) throw new Error("PushDatabaseError");
      if (recent?.length)
        return Response.json(
          { error: "Đợi 30 giây trước khi thử lại." },
          { status: 429, headers: cors },
        );
      const { error: insertError } = await admin
        .from("chat_push_jobs")
        .insert({
          family_id: member.family_id,
          sender_id: user.id,
          kind: "test",
          expires_at: new Date(Date.now() + 5 * 60000).toISOString(),
        });
      if (insertError) throw new Error("PushDatabaseError");
    } else if (input.action !== "process")
      return new Response("Bad action", { status: 400, headers: cors });
    const result = await processChatPush(admin, member.family_id);
    return Response.json(
      { ...result, managed_by_server: true },
      { headers: cors },
    );
  } catch {
    // No tokens, secrets or message bodies in logs/responses.
    return Response.json(
      {
        error:
          "Chưa xử lý được push. Kiểm tra migration 0004, cấu hình Edge Function và nhật ký máy chủ.",
      },
      { status: 503, headers: cors },
    );
  }
});
