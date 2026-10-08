import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { AppState } from 'react-native';
import {
  cancelLocalReminder,
  prepareNotifications,
  scheduleLocalReminder,
} from '../services/notifications';
import {
  completeReminder as completeReminderInDb,
  getPendingSyncCount,
  insertCareEntry,
  insertMessage,
  insertReminder,
  loadSnapshot,
} from '../lib/database';
import type { AppSnapshot, CareKind, Reminder } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import { subscribeFamilyChanges, synchronizeFamily } from '../services/familySync';

type AppContextValue = AppSnapshot & {
  loading: boolean;
  error: string | null;
  pendingSyncCount: number;
  syncing: boolean;
  syncMessage: string | null;
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
  addCare: (input: {
    kind: CareKind;
    amount?: number | null;
    unit?: string | null;
    note?: string | null;
  }) => Promise<void>;
  sendMessage: (body: string) => Promise<void>;
  addReminder: (input: {
    title: string;
    details?: string | null;
    dueAt: Date;
  }) => Promise<void>;
  completeReminder: (reminder: Reminder) => Promise<void>;
};

const emptySnapshot: AppSnapshot = {
  family: null,
  child: null,
  entries: [],
  messages: [],
  reminders: [],
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const [snapshot, setSnapshot] = useState<AppSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [next, pending] = await Promise.all([
        loadSnapshot(db),
        getPendingSyncCount(db),
      ]);
      setSnapshot(next);
      setPendingSyncCount(pending);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Không thể đọc dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [db]);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const result = await synchronizeFamily(db);
      setSyncMessage(result.message);
      await refresh();
    } catch (nextError) {
      setSyncMessage(nextError instanceof Error ? nextError.message : 'Không thể đồng bộ');
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [db, refresh]);

  useEffect(() => {
    prepareNotifications().catch(() => undefined);
    refresh().then(() => {
      if (isSupabaseConfigured) syncNow();
    });
  }, [refresh, syncNow]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && isSupabaseConfigured) syncNow();
    });
    return () => subscription.remove();
  }, [syncNow]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    subscribeFamilyChanges(() => syncNow())
      .then((nextUnsubscribe) => {
        if (cancelled) nextUnsubscribe();
        else unsubscribe = nextUnsubscribe;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [snapshot.family?.id, syncNow]);

  const addCare = useCallback(
    async (input: {
      kind: CareKind;
      amount?: number | null;
      unit?: string | null;
      note?: string | null;
    }) => {
      if (!snapshot.family || !snapshot.child) throw new Error('Chưa có hồ sơ bé');
      await insertCareEntry(db, {
        familyId: snapshot.family.id,
        childId: snapshot.child.id,
        ...input,
      });
      await refresh();
      if (isSupabaseConfigured) syncNow();
    },
    [db, refresh, snapshot.child, snapshot.family, syncNow],
  );

  const sendMessage = useCallback(
    async (body: string) => {
      if (!snapshot.family) throw new Error('Chưa có gia đình');
      await insertMessage(db, snapshot.family.id, body.trim());
      await refresh();
      if (isSupabaseConfigured) syncNow();
    },
    [db, refresh, snapshot.family, syncNow],
  );

  const addReminder = useCallback(
    async (input: { title: string; details?: string | null; dueAt: Date }) => {
      if (!snapshot.family) throw new Error('Chưa có gia đình');
      const notificationId = await scheduleLocalReminder({
        title: input.title,
        body: input.details,
        dueAt: input.dueAt,
      });
      await insertReminder(db, {
        familyId: snapshot.family.id,
        childId: snapshot.child?.id ?? null,
        title: input.title,
        details: input.details ?? null,
        dueAt: input.dueAt.toISOString(),
        notificationId,
      });
      await refresh();
      if (isSupabaseConfigured) syncNow();
    },
    [db, refresh, snapshot.child?.id, snapshot.family, syncNow],
  );

  const completeReminder = useCallback(
    async (reminder: Reminder) => {
      await cancelLocalReminder(reminder.local_notification_id);
      await completeReminderInDb(db, reminder);
      await refresh();
      if (isSupabaseConfigured) syncNow();
    },
    [db, refresh, syncNow],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ...snapshot,
      loading,
      error,
      pendingSyncCount,
      syncing,
      syncMessage,
      refresh,
      syncNow,
      addCare,
      sendMessage,
      addReminder,
      completeReminder,
    }),
    [
      snapshot,
      loading,
      error,
      pendingSyncCount,
      syncing,
      syncMessage,
      refresh,
      syncNow,
      addCare,
      sendMessage,
      addReminder,
      completeReminder,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
