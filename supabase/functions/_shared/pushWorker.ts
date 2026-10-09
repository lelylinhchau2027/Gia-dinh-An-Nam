import { permanentPushError, pushPayload, retryAt } from "./pushPolicy.ts";

// This module runs only in Edge Functions with a service-role client.
async function checked(query: any) {
  const { data, error } = await query;
  if (error) throw new Error("PushDatabaseError");
  return data;
}
async function expo(path: string, payload: unknown) {
  const token = Deno.env.get("EXPO_ACCESS_TOKEN");
  const response = await fetch(`https://exp.host/--/api/v2/push/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      response.status === 401 || response.status === 403
        ? "InvalidCredentials"
        : `ExpoHTTP${response.status}`,
    );
  const result = await response.json();
  if (result.errors?.length)
    throw new Error(
      result.errors[0]?.code === "UNAUTHORIZED"
        ? "UNAUTHORIZED"
        : "ExpoRequestError",
    );
  return result.data;
}
export async function processChatPush(
  admin: any,
  familyId: string | null = null,
) {
  // Receipt checks run on cron even when both phones are closed.
  let receipts = admin
    .from("chat_push_deliveries")
    .select("*,chat_push_jobs!inner(family_id,expires_at)")
    .eq("state", "ticket")
    .lt("submitted_at", new Date(Date.now() - 15 * 60000).toISOString())
    .limit(100);
  if (familyId) receipts = receipts.eq("chat_push_jobs.family_id", familyId);
  let receiptError = false;
  try {
    const pending = await checked(receipts);
    if (pending.length) {
      const received = await expo("getReceipts", {
        ids: pending.map((d: any) => d.ticket_id),
      });
      for (const d of pending) {
        const r = received?.[d.ticket_id];
        if (!r && Date.parse(d.submitted_at) > Date.now() - 23 * 3600000)
          continue;
        const code =
          r?.status === "ok" ? null : r?.details?.error || "ReceiptUnavailable";
        const retry =
          code &&
          !permanentPushError(code) &&
          Date.parse(d.chat_push_jobs.expires_at) > Date.now();
        await checked(
          admin
            .from("chat_push_deliveries")
            .update({
              state: !code ? "provider_accepted" : retry ? "retry" : "failed",
              last_error: code,
              checked_at: new Date().toISOString(),
            })
            .eq("job_id", d.job_id)
            .eq("token_id", d.token_id),
        );
        if (code === "DeviceNotRegistered")
          await checked(
            admin
              .from("push_tokens")
              .update({ enabled: false })
              .eq("id", d.token_id),
          );
        if (code)
          await checked(
            admin
              .from("chat_push_jobs")
              .update({
                state: retry ? "pending" : "failed",
                last_error: code,
                next_attempt_at: new Date().toISOString(),
              })
              .eq("id", d.job_id)
              .eq("state", "submitted"),
          );
      }
    }
  } catch {
    receiptError = true; /* A receipt outage must not block fresh messages. */
  }
  const jobs = await checked(
    admin.rpc("claim_chat_push", { p_family_id: familyId, p_limit: 10 }),
  );
  let submitted = 0;
  for (const job of jobs) {
    const finish = (values: Record<string, unknown>) =>
      checked(
        admin
          .from("chat_push_jobs")
          .update({ ...values, lease_until: null })
          .eq("id", job.id)
          .eq("lease_id", job.lease_id),
      );
    try {
      // Re-check current membership to prevent notifying an account no longer in the family.
      const members = await checked(
        admin
          .from("family_members")
          .select("user_id")
          .eq("family_id", job.family_id),
      );
      const recipients = members
        .map((m: any) => m.user_id)
        .filter((id: string) =>
          job.kind === "test" ? id === job.sender_id : id !== job.sender_id,
        );
      if (!members.some((m: any) => m.user_id === job.sender_id))
        throw new Error("SenderLeftFamily");
      const tokens = recipients.length
        ? await checked(
            admin
              .from("push_tokens")
              .select("id,expo_push_token")
              .eq("family_id", job.family_id)
              .in("user_id", recipients)
              .eq("enabled", true),
          )
        : [];
      if (!tokens.length) throw new Error("NoRecipientToken");
      const deliveries = await checked(
        admin.from("chat_push_deliveries").select("*").eq("job_id", job.id),
      );
      let message;
      if (job.kind === "message") {
        message = await checked(
          admin
            .from("family_messages")
            .select("created_by_name,body")
            .eq("family_id", job.family_id)
            .eq("id", job.message_id)
            .single(),
        );
      }
      let jobError: string | null = null;
      for (const device of tokens) {
        const previous = deliveries.find((d: any) => d.token_id === device.id);
        if (
          previous &&
          ["ticket", "provider_accepted"].includes(previous.state)
        )
          continue;
        if (previous?.state === "failed") {
          jobError = previous.last_error || "PushTicketError";
          continue;
        }
        const tickets = await expo("send", [
          pushPayload(job, device.expo_push_token, message),
        ]);
        const ticket = Array.isArray(tickets) ? tickets[0] : null;
        const code =
          ticket?.status === "ok" && ticket.id
            ? null
            : ticket?.details?.error || "PushTicketError";
        await checked(
          admin
            .from("chat_push_deliveries")
            .upsert({
              job_id: job.id,
              token_id: device.id,
              state: !code
                ? "ticket"
                : permanentPushError(code)
                  ? "failed"
                  : "retry",
              ticket_id: !code ? ticket.id : null,
              last_error: code,
              submitted_at: new Date().toISOString(),
              checked_at: null,
            }),
        );
        if (code === "DeviceNotRegistered")
          await checked(
            admin
              .from("push_tokens")
              .update({ enabled: false })
              .eq("id", device.id),
          );
        if (code) jobError = code;
      }
      if (jobError) throw new Error(jobError);
      await finish({ state: "submitted", last_error: null });
      submitted++;
    } catch (e) {
      const code = e instanceof Error ? e.message : "PushWorkerError";
      const stop =
        permanentPushError(code) ||
        code === "SenderLeftFamily" ||
        job.attempts >= 12;
      await finish({
        state: stop ? "failed" : "pending",
        last_error: code,
        next_attempt_at: retryAt(job.attempts),
      });
    }
  }
  return {
    processed: jobs.length,
    submitted,
    receipt_check_failed: receiptError,
  };
}
