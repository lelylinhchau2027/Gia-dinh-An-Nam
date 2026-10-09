import type { SQLiteDatabase } from "expo-sqlite";
import {
  acknowledgeOutbox,
  attachRemoteFamily,
  getPendingOutbox,
  mergeRemoteSnapshot,
  rejectOutbox,
  type OutboxItem,
} from "../lib/database";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { telegramAction } from "./telegram";
import { reconcileSyncedReminders } from "./notifications";

type RemoteFamily = {
  id: string;
  name: string;
  invite_code: string;
};

type Membership = {
  familyId: string;
  displayName: string;
  role: "owner" | "parent";
  family: RemoteFamily;
};

export type SyncResult = {
  state: "disabled" | "unpaired" | "synced";
  uploaded: number;
  downloaded: number;
  message: string;
};

function configuredClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Chưa cấu hình Supabase trong file .env");
  }
  return supabase;
}

export async function currentUser() {
  const client = configuredClient();
  const { data: sessionData } = await client.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user;

  const { data, error } = await client.auth.signInAnonymously();
  if (error) {
    throw new Error(
      `Không thể tạo tài khoản thiết bị: ${error.message}. Hãy bật Anonymous Sign-Ins trong Supabase.`,
    );
  }
  if (!data.user) throw new Error("Supabase không trả về tài khoản thiết bị");
  return data.user;
}

async function getMembership(userId: string): Promise<Membership | null> {
  const client = configuredClient();
  const { data, error } = await client
    .from("family_members")
    .select(
      "family_id, display_name, role, families!inner(id, name, invite_code)",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const raw = data as unknown as {
    family_id: string;
    display_name: string;
    role: "owner" | "parent";
    families: RemoteFamily | RemoteFamily[];
  };
  const family = Array.isArray(raw.families) ? raw.families[0] : raw.families;
  if (!family) return null;
  return {
    familyId: raw.family_id,
    displayName: raw.display_name,
    role: raw.role,
    family,
  };
}

async function rpcFamily(
  functionName: "create_family" | "join_family",
  parameters: Record<string, string>,
): Promise<RemoteFamily> {
  const client = configuredClient();
  const { data, error } = await client.rpc(functionName, parameters);
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as
    RemoteFamily | undefined;
  if (!row) throw new Error("Backend không trả về thông tin gia đình");
  return row;
}

export async function createPairedFamily(
  db: SQLiteDatabase,
  input: { familyName: string; displayName: string },
): Promise<RemoteFamily> {
  const user = await currentUser();
  const family = await rpcFamily("create_family", {
    family_name: input.familyName.trim(),
    member_display_name: input.displayName.trim(),
  });
  await attachRemoteFamily(db, {
    id: family.id,
    name: family.name,
    inviteCode: family.invite_code,
    userId: user.id,
    displayName: input.displayName.trim(),
    preserveLocalData: true,
  });
  await synchronizeFamily(db);
  return family;
}

export async function joinPairedFamily(
  db: SQLiteDatabase,
  input: { inviteCode: string; displayName: string },
): Promise<RemoteFamily> {
  const user = await currentUser();
  const family = await rpcFamily("join_family", {
    requested_invite_code: input.inviteCode.trim().toUpperCase(),
    member_display_name: input.displayName.trim(),
  });
  await attachRemoteFamily(db, {
    id: family.id,
    name: family.name,
    inviteCode: family.invite_code,
    userId: user.id,
    displayName: input.displayName.trim(),
    preserveLocalData: false,
  });
  await synchronizeFamily(db);
  return family;
}

function normalizedPayload(item: OutboxItem, familyId: string, userId: string) {
  const payload = JSON.parse(item.payload) as Record<string, unknown>;
  payload.family_id = familyId;
  if (
    item.entity_type !== "children" &&
    String(payload.created_by ?? "").startsWith("local_")
  ) {
    payload.created_by = userId;
  }
  delete payload.local_notification_id;
  delete payload.sync_state;
  return payload;
}

export async function synchronizeFamily(
  db: SQLiteDatabase,
  onDataReady?: () => Promise<void>,
): Promise<SyncResult> {
  if (!isSupabaseConfigured) {
    return {
      state: "disabled",
      uploaded: 0,
      downloaded: 0,
      message: "Đang dùng dữ liệu cục bộ vì chưa cấu hình Supabase.",
    };
  }

  const client = configuredClient();
  const user = await currentUser();
  const membership = await getMembership(user.id);
  if (!membership) {
    return {
      state: "unpaired",
      uploaded: 0,
      downloaded: 0,
      message: "Thiết bị chưa được ghép vào gia đình.",
    };
  }

  const localFamily = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM families LIMIT 1",
  );
  const author = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM family_members WHERE is_current = 1 LIMIT 1",
  );
  if (localFamily?.id !== membership.familyId || author?.id !== user.id) {
    const { count, error } = await client
      .from("children")
      .select("id", { count: "exact", head: true })
      .eq("family_id", membership.familyId);
    if (error) throw error;
    await attachRemoteFamily(db, {
      id: membership.family.id,
      name: membership.family.name,
      inviteCode: membership.family.invite_code,
      userId: user.id,
      displayName: membership.displayName,
      preserveLocalData:
        localFamily?.id === membership.familyId ||
        (membership.role === "owner" && (count ?? 0) === 0),
    });
  }

  let uploaded = 0;
  let failed = 0;
  const blockedEntities = new Set<string>();
  for (const item of await getPendingOutbox(db)) {
    // Retired chat: preserve pending content locally, never send it as a reminder.
    if (item.entity_type === "family_messages") continue;
    const entityKey = `${item.entity_type}:${item.entity_id}`;
    if (blockedEntities.has(entityKey)) {
      failed += 1;
      continue;
    }
    const payload = normalizedPayload(item, membership.familyId, user.id);
    let mutation;
    if (item.operation === "update") {
      const changes = { ...payload };
      delete changes.id;
      delete changes.family_id;
      delete changes.created_by;
      mutation = await client
        .from(item.entity_type)
        .update(changes)
        .eq("id", item.entity_id)
        .eq("family_id", membership.familyId)
        .select("id");
    } else {
      mutation = await client
        .from(item.entity_type)
        .upsert(payload)
        .select("id");
    }
    const { error } = mutation;
    if (error || !mutation.data?.length) {
      await rejectOutbox(
        db,
        item,
        error?.message ?? "Không tìm thấy bản ghi để cập nhật.",
      );
      failed += 1;
      blockedEntities.add(entityKey);
      continue;
    }
    await acknowledgeOutbox(db, item);
    uploaded += 1;
  }

  const pull = async (table: string) => {
    const rows: Record<string, unknown>[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await client
        .from(table)
        .select("*")
        .eq("family_id", membership.familyId)
        .order("id")
        .range(offset, offset + 499);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 500) return rows;
    }
  };
  // Include tombstones regardless of age so old local entries cannot reappear.
  const [children, careEntries, messages, reminders] = await Promise.all(
    ["children", "care_entries", "family_messages", "reminders"].map(pull),
  );
  await mergeRemoteSnapshot(db, {
    children: children as never[],
    careEntries: careEntries as never[],
    messages: messages as never[],
    reminders: reminders as never[],
  });
  // Show synced chat immediately; don't wait behind slow push HTTP calls.
  await onDataReady?.();
  // Atomic server queue + webhook/Cron own delivery. Nudge without blocking sync.
  if (uploaded) void telegramAction("process").catch(() => undefined);
  await reconcileSyncedReminders(db);
  return {
    state: "synced",
    uploaded,
    downloaded:
      children!.length +
      careEntries!.length +
      messages!.length +
      reminders!.length,
    message: failed
      ? `Còn ${failed} thay đổi chưa gửi được. Dữ liệu vẫn lưu trên máy; hãy thử đồng bộ lại.`
      : "Đã đồng bộ dữ liệu gia đình. Trạng thái Telegram xem trong Cài đặt → Telegram.",
  };
}

export async function subscribeFamilyChanges(
  onChange: () => void,
): Promise<() => void> {
  if (!isSupabaseConfigured) return () => undefined;
  const client = configuredClient();
  const user = await currentUser();
  const membership = await getMembership(user.id);
  if (!membership) return () => undefined;

  const channel = client.channel(`family:${membership.familyId}:${user.id}`);
  for (const table of [
    "children",
    "care_entries",
    "family_messages",
    "reminders",
  ]) {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: `family_id=eq.${membership.familyId}`,
      },
      onChange,
    );
  }
  channel.subscribe();
  return () => {
    client.removeChannel(channel).catch(() => undefined);
  };
}
