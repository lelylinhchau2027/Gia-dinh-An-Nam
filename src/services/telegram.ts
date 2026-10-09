import { supabase } from "../lib/supabase";
export type TelegramStatus = {
  link: {
    display_name: string;
    enabled: boolean;
    confirmed_at: string | null;
    updated_at: string;
  } | null;
  jobs: Array<{
    kind: string;
    state: string;
    created_at: string;
    last_error: string | null;
  }>;
};
export async function telegramAction<T = { ok: boolean }>(
  action: string,
  values: Record<string, unknown> = {},
): Promise<T> {
  if (!supabase) throw new Error("Chưa cấu hình Supabase.");
  const { data, error } = await supabase.functions.invoke("telegram-account", {
    body: { action, ...values },
  });
  if (error) {
    let message =
      "Chưa kết nối được Telegram. Kiểm tra mạng, migration 0005 và Edge Functions.";
    try {
      const body = await error.context?.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
      /* No raw URLs/tokens. */
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}
