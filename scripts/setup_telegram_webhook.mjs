// Run explicitly after deploying Functions. Reads secrets from hidden prompts,
// never accepts bot tokens as command-line arguments, never prints response URLs.
import readline from "node:readline";
import { Writable } from "node:stream";

async function ask(label, hidden = false) {
  if (!process.stdin.isTTY)
    throw new Error("Run from an interactive terminal.");
  process.stdout.write(label);
  const output = new Writable({
    write(chunk, encoding, done) {
      if (!hidden) process.stdout.write(chunk, encoding);
      done();
    },
  });
  const rl = readline.createInterface({
    input: process.stdin,
    output,
    terminal: true,
  });
  const value = await new Promise((resolve) =>
    rl.question("", (answer) => {
      rl.close();
      resolve(answer.trim());
    }),
  );
  if (hidden) process.stdout.write("\n");
  return value;
}
try {
  const project = await ask("Supabase project ref: ");
  if (!/^[a-z0-9]{15,30}$/.test(project))
    throw new Error("Invalid project ref.");
  const botToken = await ask("BotFather token (hidden): ", true);
  const secret = await ask(
    "TELEGRAM_WEBHOOK_SECRET from Supabase (hidden): ",
    true,
  );
  if (!/^\d+:[\w-]+$/.test(botToken) || !/^[\w-]{32,256}$/.test(secret))
    throw new Error("Invalid token/secret format.");
  const call = async (method, data) => {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/${method}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(15000),
      },
    );
    const body = await response.json();
    if (!body.ok)
      throw new Error(
        "Telegram rejected the request; verify token and HTTPS Function deployment.",
      );
    return body.result;
  };
  const info = await call("getWebhookInfo", {});
  const url = `https://${project}.supabase.co/functions/v1/telegram-webhook`;
  if (info.url && info.url !== url) {
    const confirm = await ask(
      "This bot already has a different webhook. Replace it? Type YES: ",
    );
    if (confirm !== "YES") {
      console.log("No changes made.");
      process.exit(0);
    }
  }
  await call("setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false,
  });
  const after = await call("getWebhookInfo", {});
  if (after.url !== url) throw new Error("Webhook verification failed.");
  console.log(
    "Webhook registered. Open An Nam on each iPhone, link Telegram, confirm identity, and send a test.",
  );
  console.log("Pending updates:", after.pending_update_count ?? 0);
} catch {
  // Native fetch errors may include a URL containing the bot token. Do not print them.
  console.error(
    "Setup failed. Check project ref, token, webhook secret and network. No secret was printed.",
  );
  process.exitCode = 1;
}
