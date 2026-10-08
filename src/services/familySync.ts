import * as SecureStore from 'expo-secure-store';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import {
  acknowledgeOutbox,
  attachRemoteFamily,
  getPendingOutbox,
  mergeRemoteSnapshot,
  rejectOutbox,
  type OutboxItem,
} from '../lib/database';
import { makeId } from '../lib/ids';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getRemotePushToken, reconcileSyncedReminders } from './notifications';

type RemoteFamily = {
  id: string;
  name: string;
  invite_code: string;
};

type Membership = {
  familyId: string;
  displayName: string;
  role: 'owner' | 'parent';
  family: RemoteFamily;
};

export type SyncResult = {
  state: 'disabled' | 'unpaired' | 'synced';
  uploaded: number;
  downloaded: number;
  message: string;
};

function configuredClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Chưa cấu hình Supabase trong file .env');
  }
  return supabase;
}

async function currentUser() {
  const client = configuredClient();
  const { data: sessionData } = await client.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user;

  const { data, error } = await client.auth.signInAnonymously();
  if (error) {
    throw new Error(`Không thể tạo tài khoản thiết bị: ${error.message}. Hãy bật Anonymous Sign-Ins trong Supabase.`);
  }
  if (!data.user) throw new Error('Supabase không trả về tài khoản thiết bị');
  return data.user;
}

async function getMembership(userId: string): Promise<Membership | null> {
  const client = configuredClient();
  const { data, error } = await client
    .from('family_members')
    .select('family_id, display_name, role, families!inner(id, name, invite_code)')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const raw = data as unknown as {
    family_id: string;
    display_name: string;
    role: 'owner' | 'parent';
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
  functionName: 'create_family' | 'join_family',
  parameters: Record<string, string>,
): Promise<RemoteFamily> {
  const client = configuredClient();
  const { data, error } = await client.rpc(functionName, parameters);
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as RemoteFamily | undefined;
  if (!row) throw new Error('Backend không trả về thông tin gia đình');
  return row;
}

export async function createPairedFamily(
  db: SQLiteDatabase,
  input: { familyName: string; displayName: string },
): Promise<RemoteFamily> {
  const user = await currentUser();
  const family = await rpcFamily('create_family', {
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
  const family = await rpcFamily('join_family', {
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
    item.entity_type !== 'children' &&
    String(payload.created_by ?? '').startsWith('local_')
  ) {
    payload.created_by = userId;
  }
  delete payload.local_notification_id;
  delete payload.sync_state;
  return payload;
}

async function notifyPartner(item: OutboxItem, payload: Record<string, unknown>) {
  const client = configuredClient();
  let title = 'Gia Đình An Nam';
  let body = 'Có cập nhật mới trong gia đình.';
  let route = '/';
  if (item.entity_type === 'care_entries') {
    title = 'Bé vừa có cập nhật mới';
    body = payload.note ? String(payload.note) : 'Mở ứng dụng để xem nhật ký chăm bé.';
    route = '/theo-doi';
  } else if (item.entity_type === 'family_messages') {
    title = String(payload.created_by_name ?? 'Người nhà');
    body = String(payload.body ?? body);
    route = '/gia-dinh';
  } else if (item.entity_type === 'reminders') {
    title = payload.completed_at ? 'Một việc chung đã hoàn thành' : 'Có việc chung mới';
    body = String(payload.title ?? body);
    route = '/gia-dinh';
  } else {
    return;
  }
  await client.functions.invoke('notify-family', {
    body: {
      family_id: payload.family_id,
      title,
      body,
      data: { route, entity_id: item.entity_id },
    },
  });
}

async function registerThisDevice(familyId: string, userId: string): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  const result = await getRemotePushToken();
  if (!result.token) return;
  let deviceId = await SecureStore.getItemAsync('an_nam_device_id');
  if (!deviceId) {
    deviceId = makeId('device');
    await SecureStore.setItemAsync('an_nam_device_id', deviceId);
  }
  const client = configuredClient();
  const { error } = await client.from('push_tokens').upsert(
    {
      family_id: familyId,
      user_id: userId,
      device_id: deviceId,
      expo_push_token: result.token,
      platform: Platform.OS,
      enabled: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,device_id' },
  );
  if (error) throw error;
}

export async function registerFamilyPush(): Promise<string> {
  const user = await currentUser();
  const membership = await getMembership(user.id);
  if (!membership) throw new Error('Hãy ghép thiết bị vào gia đình trước');
  await registerThisDevice(membership.familyId, user.id);
  return 'Thiết bị đã đăng ký nhận thông báo từ người còn lại.';
}

export async function synchronizeFamily(db: SQLiteDatabase): Promise<SyncResult> {
  if (!isSupabaseConfigured) {
    return {
      state: 'disabled', uploaded: 0, downloaded: 0,
      message: 'Đang dùng dữ liệu cục bộ vì chưa cấu hình Supabase.',
    };
  }

  const client = configuredClient();
  const user = await currentUser();
  const membership = await getMembership(user.id);
  if (!membership) {
    return {
      state: 'unpaired', uploaded: 0, downloaded: 0,
      message: 'Thiết bị chưa được ghép vào gia đình.',
    };
  }

  const localFamily = await db.getFirstAsync<{ id: string }>('SELECT id FROM families LIMIT 1');
  if (localFamily?.id !== membership.familyId) {
    const { count, error } = await client
      .from('children')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', membership.familyId);
    if (error) throw error;
    await attachRemoteFamily(db, {
      id: membership.family.id,
      name: membership.family.name,
      inviteCode: membership.family.invite_code,
      userId: user.id,
      displayName: membership.displayName,
      preserveLocalData: membership.role === 'owner' && (count ?? 0) === 0,
    });
  }

  let uploaded = 0;
  for (const item of await getPendingOutbox(db)) {
    const payload = normalizedPayload(item, membership.familyId, user.id);
    let mutation;
    if (item.operation === 'update') {
      const changes = { ...payload };
      delete changes.id;
      delete changes.family_id;
      delete changes.created_by;
      mutation = await client
        .from(item.entity_type)
        .update(changes)
        .eq('id', item.entity_id)
        .eq('family_id', membership.familyId);
    } else {
      mutation = await client.from(item.entity_type).upsert(payload);
    }
    const { error } = mutation;
    if (error) {
      await rejectOutbox(db, item, error.message);
      continue;
    }
    await acknowledgeOutbox(db, item);
    uploaded += 1;
    notifyPartner(item, payload).catch(() => undefined);
  }

  const [childrenResult, careResult, messageResult, reminderResult] = await Promise.all([
    client.from('children').select('*').eq('family_id', membership.familyId),
    client.from('care_entries').select('*').eq('family_id', membership.familyId).order('occurred_at', { ascending: false }).limit(200),
    client.from('family_messages').select('*').eq('family_id', membership.familyId).order('created_at', { ascending: false }).limit(100),
    client.from('reminders').select('*').eq('family_id', membership.familyId).order('due_at', { ascending: true }).limit(100),
  ]);
  const firstError = childrenResult.error ?? careResult.error ?? messageResult.error ?? reminderResult.error;
  if (firstError) throw firstError;

  const children = childrenResult.data ?? [];
  const careEntries = careResult.data ?? [];
  const messages = messageResult.data ?? [];
  const reminders = reminderResult.data ?? [];
  await mergeRemoteSnapshot(db, {
    children: children as never[],
    careEntries: careEntries as never[],
    messages: messages as never[],
    reminders: reminders as never[],
  });
  await reconcileSyncedReminders(db);
  return {
    state: 'synced',
    uploaded,
    downloaded: children.length + careEntries.length + messages.length + reminders.length,
    message: 'Đã đồng bộ dữ liệu gia đình.',
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
  for (const table of ['children', 'care_entries', 'family_messages', 'reminders']) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
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
