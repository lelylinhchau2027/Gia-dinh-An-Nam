import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.3";
import { processTelegram } from "../_shared/telegram.ts";
Deno.serve(async (req) => {
  const secret = Deno.env.get("TELEGRAM_WORKER_SECRET");
  if (
    req.method !== "POST" ||
    !secret ||
    req.headers.get("x-telegram-worker-secret") !== secret
  )
    return new Response("Unauthorized", { status: 401 });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error } = await admin.rpc("enqueue_telegram_calendar");
    if (error) throw new Error("QueueUnavailable");
    return Response.json(await processTelegram(admin));
  } catch {
    return Response.json(
      { error: "Telegram worker failed; check secrets and migration 0005." },
      { status: 503 },
    );
  }
});
