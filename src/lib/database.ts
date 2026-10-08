import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  AppSnapshot,
  CareEntry,
  CareKind,
  Child,
  FamilyMessage,
  Reminder,
} from '../types';
import { makeId } from './ids';

const DEMO_FAMILY_ID = 'family_local_an_nam';
const DEMO_USER_ID = 'local_parent_1';
const DEMO_CHILD_ID = 'child_local_beyeu';

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS families (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      pairing_code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS family_members (
      id TEXT PRIMARY KEY NOT NULL,
      family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL,
      is_current INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS children (
      id TEXT PRIMARY KEY NOT NULL,
      family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      nickname TEXT,
      birthday TEXT,
      due_date TEXT,
      gender TEXT,
      updated_at TEXT NOT NULL,
      sync_state TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS care_entries (
      id TEXT PRIMARY KEY NOT NULL,
      family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      amount REAL,
      unit TEXT,
      note TEXT,
      occurred_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_by_name TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_state TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS family_messages (
      id TEXT PRIMARY KEY NOT NULL,
      family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_by_name TEXT NOT NULL,
      sync_state TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY NOT NULL,
      family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      child_id TEXT REFERENCES children(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      details TEXT,
      due_at TEXT NOT NULL,
      completed_at TEXT,
      created_by TEXT NOT NULL,
      created_by_name TEXT NOT NULL,
      local_notification_id TEXT,
      updated_at TEXT NOT NULL,
      sync_state TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS sync_outbox (
      id TEXT PRIMARY KEY NOT NULL,
      family_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_care_child_time
      ON care_entries(child_id, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reminders_family_due
      ON reminders(family_id, due_at ASC);
    CREATE INDEX IF NOT EXISTS idx_messages_family_time
      ON family_messages(family_id, created_at DESC);
  `);

  const family = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM families LIMIT 1',
  );
  if (!family) await seedLocalFamily(db);
}

async function seedLocalFamily(db: SQLiteDatabase): Promise<void> {
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO families (id, name, pairing_code, created_at) VALUES (?, ?, ?, ?)',
      DEMO_FAMILY_ID,
      'Gia Đình An Nam',
      'AN-NAM-DEMO',
      now,
    );
    await db.runAsync(
      `INSERT INTO family_members
        (id, family_id, display_name, role, is_current, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      DEMO_USER_ID,
      DEMO_FAMILY_ID,
      'Bạn',
      'parent',
      1,
      now,
    );
    await db.runAsync(
      `INSERT INTO children
        (id, family_id, name, nickname, updated_at, sync_state)
       VALUES (?, ?, ?, ?, ?, ?)`,
      DEMO_CHILD_ID,
      DEMO_FAMILY_ID,
      'Bé yêu',
      'An Nam',
      now,
      'pending',
    );
    await db.runAsync(
      `INSERT INTO family_messages
        (id, family_id, body, created_at, created_by, created_by_name, sync_state)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      makeId('msg'),
      DEMO_FAMILY_ID,
      'Chào mừng hai bạn đến với không gian chăm sóc bé của gia đình.',
      now,
      'system',
      'Gia Đình An Nam',
      'pending',
    );
  });
}

export async function loadSnapshot(db: SQLiteDatabase): Promise<AppSnapshot> {
  const family = await db.getFirstAsync<AppSnapshot['family']>(
    'SELECT id, name, pairing_code FROM families LIMIT 1',
  );
  const child = family
    ? await db.getFirstAsync<AppSnapshot['child']>(
        `SELECT id, family_id, name, nickname, birthday, due_date, gender
         FROM children WHERE family_id = ? ORDER BY updated_at DESC LIMIT 1`,
        family.id,
      )
    : null;
  const entries = child
    ? await db.getAllAsync<CareEntry>(
        `SELECT id, family_id, child_id, kind, amount, unit, note, occurred_at,
                created_by, created_by_name, sync_state
         FROM care_entries WHERE child_id = ?
         ORDER BY occurred_at DESC LIMIT 80`,
        child.id,
      )
    : [];
  const messages = family
    ? await db.getAllAsync<FamilyMessage>(
        `SELECT id, family_id, body, created_at, created_by, created_by_name
         FROM family_messages WHERE family_id = ?
         ORDER BY created_at DESC LIMIT 30`,
        family.id,
      )
    : [];
  const reminders = family
    ? await db.getAllAsync<Reminder>(
        `SELECT id, family_id, child_id, title, details, due_at, completed_at,
                created_by, created_by_name, local_notification_id
         FROM reminders WHERE family_id = ?
         ORDER BY completed_at IS NOT NULL, due_at ASC LIMIT 50`,
        family.id,
      )
    : [];
  return { family, child, entries, messages, reminders };
}

async function enqueue(
  db: SQLiteDatabase,
  familyId: string,
  entityType: string,
  entityId: string,
  payload: unknown,
  operation: 'upsert' | 'update' = 'upsert',
): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_outbox
      (id, family_id, entity_type, entity_id, operation, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    makeId('outbox'),
    familyId,
    entityType,
    entityId,
    operation,
    JSON.stringify(payload),
    new Date().toISOString(),
  );
}

async function currentAuthor(db: SQLiteDatabase): Promise<{
  id: string;
  displayName: string;
}> {
  const member = await db.getFirstAsync<{ id: string; display_name: string }>(
    `SELECT id, display_name FROM family_members
     WHERE is_current = 1 LIMIT 1`,
  );
  return {
    id: member?.id ?? DEMO_USER_ID,
    displayName: member?.display_name ?? 'Bạn',
  };
}

export async function insertCareEntry(
  db: SQLiteDatabase,
  input: {
    familyId: string;
    childId: string;
    kind: CareKind;
    amount?: number | null;
    unit?: string | null;
    note?: string | null;
  },
): Promise<void> {
  const id = makeId('care');
  const now = new Date().toISOString();
  const author = await currentAuthor(db);
  const payload = {
    id,
    family_id: input.familyId,
    child_id: input.childId,
    kind: input.kind,
    amount: input.amount ?? null,
    unit: input.unit ?? null,
    note: input.note ?? null,
    occurred_at: now,
    created_by: author.id,
    created_by_name: author.displayName,
    updated_at: now,
  };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO care_entries
       (id, family_id, child_id, kind, amount, unit, note, occurred_at,
        created_by, created_by_name, updated_at, sync_state)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      payload.id,
      payload.family_id,
      payload.child_id,
      payload.kind,
      payload.amount,
      payload.unit,
      payload.note,
      payload.occurred_at,
      payload.created_by,
      payload.created_by_name,
      payload.updated_at,
    );
    await enqueue(db, input.familyId, 'care_entries', id, payload);
  });
}

export async function insertMessage(
  db: SQLiteDatabase,
  familyId: string,
  body: string,
): Promise<void> {
  const id = makeId('msg');
  const now = new Date().toISOString();
  const author = await currentAuthor(db);
  const payload = {
    id,
    family_id: familyId,
    body,
    created_at: now,
    created_by: author.id,
    created_by_name: author.displayName,
  };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO family_messages
       (id, family_id, body, created_at, created_by, created_by_name, sync_state)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      payload.id,
      payload.family_id,
      payload.body,
      payload.created_at,
      payload.created_by,
      payload.created_by_name,
    );
    await enqueue(db, familyId, 'family_messages', id, payload);
  });
}

export async function insertReminder(
  db: SQLiteDatabase,
  input: {
    familyId: string;
    childId: string | null;
    title: string;
    details: string | null;
    dueAt: string;
    notificationId: string | null;
  },
): Promise<void> {
  const id = makeId('reminder');
  const now = new Date().toISOString();
  const author = await currentAuthor(db);
  const payload = {
    id,
    family_id: input.familyId,
    child_id: input.childId,
    title: input.title,
    details: input.details,
    due_at: input.dueAt,
    completed_at: null,
    created_by: author.id,
    created_by_name: author.displayName,
    local_notification_id: input.notificationId,
    updated_at: now,
  };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO reminders
       (id, family_id, child_id, title, details, due_at, completed_at,
        created_by, created_by_name, local_notification_id, updated_at, sync_state)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 'pending')`,
      payload.id,
      payload.family_id,
      payload.child_id,
      payload.title,
      payload.details,
      payload.due_at,
      payload.created_by,
      payload.created_by_name,
      payload.local_notification_id,
      payload.updated_at,
    );
    await enqueue(db, input.familyId, 'reminders', id, payload);
  });
}

export async function completeReminder(
  db: SQLiteDatabase,
  reminder: Reminder,
): Promise<void> {
  const completedAt = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE reminders SET completed_at = ?, updated_at = ?, sync_state = 'pending'
       WHERE id = ?`,
      completedAt,
      completedAt,
      reminder.id,
    );
    await enqueue(db, reminder.family_id, 'reminders', reminder.id, {
      id: reminder.id,
      family_id: reminder.family_id,
      child_id: reminder.child_id,
      title: reminder.title,
      details: reminder.details,
      due_at: reminder.due_at,
      completed_at: completedAt,
      created_by: reminder.created_by,
      created_by_name: reminder.created_by_name,
      updated_at: completedAt,
    }, 'update');
  });
}

export async function getPendingSyncCount(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM sync_outbox',
  );
  return row?.count ?? 0;
}

export type OutboxItem = {
  id: string;
  family_id: string;
  entity_type: 'children' | 'care_entries' | 'family_messages' | 'reminders';
  entity_id: string;
  operation: 'upsert' | 'update';
  payload: string;
  attempts: number;
};

export async function getPendingOutbox(db: SQLiteDatabase): Promise<OutboxItem[]> {
  return db.getAllAsync<OutboxItem>(
    `SELECT id, family_id, entity_type, entity_id, operation, payload, attempts
     FROM sync_outbox
     ORDER BY CASE entity_type WHEN 'children' THEN 0 ELSE 1 END, created_at ASC
     LIMIT 100`,
  );
}

export async function acknowledgeOutbox(
  db: SQLiteDatabase,
  item: OutboxItem,
): Promise<void> {
  const syncableTables = new Set([
    'children',
    'care_entries',
    'family_messages',
    'reminders',
  ]);
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM sync_outbox WHERE id = ?', item.id);
    if (syncableTables.has(item.entity_type)) {
      await db.runAsync(
        `UPDATE ${item.entity_type} SET sync_state = 'synced' WHERE id = ?`,
        item.entity_id,
      );
    }
  });
}

export async function rejectOutbox(
  db: SQLiteDatabase,
  item: OutboxItem,
  message: string,
): Promise<void> {
  await db.runAsync(
    `UPDATE sync_outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
    message.slice(0, 500),
    item.id,
  );
}

export async function attachRemoteFamily(
  db: SQLiteDatabase,
  input: {
    id: string;
    name: string;
    inviteCode: string;
    userId: string;
    displayName: string;
    preserveLocalData: boolean;
  },
): Promise<void> {
  const current = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM families LIMIT 1',
  );
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    if (!input.preserveLocalData && current) {
      await db.runAsync('DELETE FROM sync_outbox WHERE family_id = ?', current.id);
      await db.runAsync('DELETE FROM families WHERE id = ?', current.id);
    }

    await db.runAsync(
      `INSERT INTO families (id, name, pairing_code, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name, pairing_code = excluded.pairing_code`,
      input.id,
      input.name,
      input.inviteCode,
      now,
    );

    if (input.preserveLocalData && current && current.id !== input.id) {
      await db.runAsync('UPDATE family_members SET family_id = ? WHERE family_id = ?', input.id, current.id);
      await db.runAsync('UPDATE children SET family_id = ? WHERE family_id = ?', input.id, current.id);
      await db.runAsync('UPDATE care_entries SET family_id = ? WHERE family_id = ?', input.id, current.id);
      await db.runAsync('UPDATE family_messages SET family_id = ? WHERE family_id = ?', input.id, current.id);
      await db.runAsync('UPDATE reminders SET family_id = ? WHERE family_id = ?', input.id, current.id);

      const queued = await db.getAllAsync<{ id: string; payload: string }>(
        'SELECT id, payload FROM sync_outbox WHERE family_id = ?',
        current.id,
      );
      for (const row of queued) {
        const payload = JSON.parse(row.payload) as Record<string, unknown>;
        payload.family_id = input.id;
        await db.runAsync(
          'UPDATE sync_outbox SET family_id = ?, payload = ? WHERE id = ?',
          input.id,
          JSON.stringify(payload),
          row.id,
        );
      }
      await db.runAsync('DELETE FROM families WHERE id = ?', current.id);
    }

    await db.runAsync('UPDATE family_members SET is_current = 0');
    await db.runAsync(
      `INSERT INTO family_members
        (id, family_id, display_name, role, is_current, created_at)
       VALUES (?, ?, ?, 'parent', 1, ?)
       ON CONFLICT(id) DO UPDATE SET
         family_id = excluded.family_id,
         display_name = excluded.display_name,
         is_current = 1`,
      input.userId,
      input.id,
      input.displayName,
      now,
    );
    await db.runAsync(
      `UPDATE care_entries SET created_by = ?, created_by_name = ?
       WHERE created_by = ?`,
      input.userId,
      input.displayName,
      DEMO_USER_ID,
    );
    await db.runAsync(
      `UPDATE family_messages SET created_by = ?, created_by_name = ?
       WHERE created_by = ?`,
      input.userId,
      input.displayName,
      DEMO_USER_ID,
    );
    await db.runAsync(
      `UPDATE reminders SET created_by = ?, created_by_name = ?
       WHERE created_by = ?`,
      input.userId,
      input.displayName,
      DEMO_USER_ID,
    );

    if (input.preserveLocalData) {
      const localChildren = await db.getAllAsync<Child>(
        'SELECT id, family_id, name, nickname, birthday, due_date, gender FROM children WHERE family_id = ?',
        input.id,
      );
      for (const child of localChildren) {
        const alreadyQueued = await db.getFirstAsync<{ id: string }>(
          `SELECT id FROM sync_outbox WHERE entity_type = 'children' AND entity_id = ?`,
          child.id,
        );
        if (!alreadyQueued) {
          await enqueue(db, input.id, 'children', child.id, {
            ...child,
            updated_at: now,
          });
        }
      }
    }
  });
}

type RemoteSnapshot = {
  children: Array<Omit<Child, 'family_id'> & { family_id: string; updated_at: string }>;
  careEntries: Array<Omit<CareEntry, 'sync_state'>>;
  messages: FamilyMessage[];
  reminders: Array<Reminder & { updated_at: string }>;
};

export async function mergeRemoteSnapshot(
  db: SQLiteDatabase,
  snapshot: RemoteSnapshot,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const child of snapshot.children) {
      await db.runAsync(
        `INSERT INTO children
          (id, family_id, name, nickname, birthday, due_date, gender, updated_at, sync_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced')
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name, nickname = excluded.nickname,
           birthday = excluded.birthday, due_date = excluded.due_date,
           gender = excluded.gender, updated_at = excluded.updated_at,
           sync_state = 'synced'
         WHERE children.sync_state <> 'pending'`,
        child.id, child.family_id, child.name, child.nickname, child.birthday,
        child.due_date, child.gender, child.updated_at,
      );
    }
    for (const entry of snapshot.careEntries) {
      await db.runAsync(
        `INSERT INTO care_entries
          (id, family_id, child_id, kind, amount, unit, note, occurred_at,
           created_by, created_by_name, updated_at, sync_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
         ON CONFLICT(id) DO UPDATE SET
           amount = excluded.amount, unit = excluded.unit, note = excluded.note,
           occurred_at = excluded.occurred_at, updated_at = excluded.updated_at,
           sync_state = 'synced'
         WHERE care_entries.sync_state <> 'pending'`,
        entry.id, entry.family_id, entry.child_id, entry.kind, entry.amount,
        entry.unit, entry.note, entry.occurred_at, entry.created_by,
        entry.created_by_name, (entry as CareEntry & { updated_at?: string }).updated_at ?? entry.occurred_at,
      );
    }
    for (const message of snapshot.messages) {
      await db.runAsync(
        `INSERT INTO family_messages
          (id, family_id, body, created_at, created_by, created_by_name, sync_state)
         VALUES (?, ?, ?, ?, ?, ?, 'synced')
         ON CONFLICT(id) DO UPDATE SET body = excluded.body, sync_state = 'synced'
         WHERE family_messages.sync_state <> 'pending'`,
        message.id, message.family_id, message.body, message.created_at,
        message.created_by, message.created_by_name,
      );
    }
    for (const reminder of snapshot.reminders) {
      await db.runAsync(
        `INSERT INTO reminders
          (id, family_id, child_id, title, details, due_at, completed_at,
           created_by, created_by_name, local_notification_id, updated_at, sync_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'synced')
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title, details = excluded.details,
           due_at = excluded.due_at, completed_at = excluded.completed_at,
           updated_at = excluded.updated_at, sync_state = 'synced'
         WHERE reminders.sync_state <> 'pending'`,
        reminder.id, reminder.family_id, reminder.child_id, reminder.title,
        reminder.details, reminder.due_at, reminder.completed_at,
        reminder.created_by, reminder.created_by_name, reminder.updated_at,
      );
    }
  });
}
