import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) throw new Error("Thiếu phiên đăng nhập");

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const admin = createClient(url, serviceKey);
    const { data: userData, error: userError } = await caller.auth.getUser();
    if (userError || !userData.user)
      throw new Error("Phiên đăng nhập không hợp lệ");

    const input = await request.json();
    const familyId = String(input.family_id ?? "");
    const title = String(input.title ?? "").slice(0, 120);
    const body = String(input.body ?? "").slice(0, 500);
    if (!familyId || !title || !body)
      throw new Error("Nội dung thông báo chưa đầy đủ");

    const { data: membership } = await admin
      .from("family_members")
      .select("family_id")
      .eq("family_id", familyId)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!membership) throw new Error("Bạn không thuộc gia đình này");

    // Inspect previous tickets on each invocation; HTTP 200 alone is not delivery.
    const { data: pending } = await admin
      .from("push_receipts")
      .select("ticket_id,expo_push_token")
      .eq("family_id", familyId)
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - 15 * 60000).toISOString())
      .limit(100);
    if (pending?.length) {
      try {
        const response = await fetch(
          "https://exp.host/--/api/v2/push/getReceipts",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: pending.map((r) => r.ticket_id) }),
            signal: AbortSignal.timeout(10000),
          },
        );
        if (response.ok) {
          const { data } = await response.json();
          for (const row of pending) {
            const receipt = data?.[row.ticket_id];
            if (!receipt) continue;
            await admin
              .from("push_receipts")
              .update({
                status: receipt.status,
                error: receipt.details?.error ?? null,
                checked_at: new Date().toISOString(),
              })
              .eq("ticket_id", row.ticket_id);
            if (receipt.details?.error === "DeviceNotRegistered")
              await admin
                .from("push_tokens")
                .update({ enabled: false })
                .eq("expo_push_token", row.expo_push_token);
          }
        }
      } catch {
        /* Next invocation retries receipt lookup; sending remains available. */
      }
    }

    const { data: tokens, error: tokenError } = await admin
      .from("push_tokens")
      .select("expo_push_token")
      .eq("family_id", familyId)
      .neq("user_id", userData.user.id)
      .eq("enabled", true);
    if (tokenError) throw tokenError;

    let accepted = 0;
    if (tokens?.length) {
      const messages = tokens.map(({ expo_push_token }) => ({
        to: expo_push_token,
        title,
        body,
        sound: "default",
        priority: "high",
        data: typeof input.data === "object" ? input.data : {},
      }));
      const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages),
        signal: AbortSignal.timeout(15000),
      });
      if (!pushResponse.ok)
        throw new Error(`Expo Push trả về ${pushResponse.status}`);
      const result = await pushResponse.json();
      if (result.errors?.length || !Array.isArray(result.data))
        throw new Error("Expo không chấp nhận yêu cầu gửi.");
      const errors: string[] = [];
      for (let i = 0; i < result.data.length; i++) {
        const ticket = result.data[i];
        const token = tokens[i]?.expo_push_token;
        if (!token) continue;
        if (ticket.status === "ok" && ticket.id) {
          accepted++;
          const { error } = await admin
            .from("push_receipts")
            .upsert({
              ticket_id: ticket.id,
              family_id: familyId,
              expo_push_token: token,
            });
          if (error) console.error("Cannot persist Expo ticket:", error.code);
        } else if (ticket.details?.error === "DeviceNotRegistered") {
          await admin
            .from("push_tokens")
            .update({ enabled: false })
            .eq("expo_push_token", token);
        } else errors.push(ticket.details?.error ?? "PushTicketError");
      }
      if (errors.length)
        throw new Error(`Expo chưa gửi được: ${errors.join(", ")}`);
    }

    return Response.json(
      { accepted_by_expo: accepted, target_devices: tokens?.length ?? 0 },
      { headers: corsHeaders },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Lỗi không xác định" },
      { status: 400, headers: corsHeaders },
    );
  }
});
