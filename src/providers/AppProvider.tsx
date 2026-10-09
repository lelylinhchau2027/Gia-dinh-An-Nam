import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSQLiteContext } from "expo-sqlite";
import { Alert, AppState } from "react-native";
import {
  cancelLocalReminder,
  prepareNotifications,
  scheduleLocalReminder,
  reconcileSyncedReminders,
  requestNotificationPermission,
} from "../services/notifications";
import {
  completeReminder as completeReminderInDb,
  getPendingSyncCount,
  insertCareEntry,
  insertMessage,
  insertReminder,
  loadSnapshot,
} from "../lib/database";
import type {
  AppSnapshot,
  CareKind,
  Reminder,
  MessageAttachment,
} from "../types";
import { selectActiveChild } from "../lib/childRecords";
import { isSupabaseConfigured } from "../lib/supabase";
import { coalescedTask } from "../lib/syncRunner";
import {
  subscribeFamilyChanges,
  synchronizeFamily,
} from "../services/familySync";

type AppContextValue = AppSnapshot & {
  loading: boolean;
  error: string | null;
  pendingSyncCount: number;
  syncing: boolean;
  syncMessage: string | null;
  refresh: () => Promise<void>;
  selectChild: (id: string) => Promise<void>;
  syncNow: () => Promise<void>;
  addCare: (input: {
    kind: CareKind;
    amount?: number | null;
    unit?: string | null;
    note?: string | null;
    occurredAt?: string;
    details?: Record<string, string>;
  }) => Promise<void>;
  sendMessage: (
    body: string,
    attachments?: MessageAttachment[],
  ) => Promise<void>;
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
  children: [],
  currentUserId: null,
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
  const refreshSequence = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++refreshSequence.current;
    try {
      setError(null);
      const [next, pending] = await Promise.all([
        loadSnapshot(db),
        getPendingSyncCount(db),
      ]);
      if (request === refreshSequence.current) {
        setSnapshot(next);
        setPendingSyncCount(pending);
      }
    } catch (nextError) {
      if (request === refreshSequence.current)
        setError(
          nextError instanceof Error
            ? nextError.message
            : "Không thể đọc dữ liệu",
        );
    } finally {
      if (request === refreshSequence.current) setLoading(false);
    }
  }, [db]);

  const syncNow = useMemo(
    () =>
      coalescedTask(async () => {
        setSyncing(true);
        try {
          const result = await synchronizeFamily(db, refresh);
          setSyncMessage(result.message);
          await refresh();
        } catch (nextError) {
          setSyncMessage(
            nextError instanceof Error
              ? nextError.message
              : "Không thể đồng bộ",
          );
        } finally {
          setSyncing(false);
        }
      }),
    [db, refresh],
  );

  const selectChild = useCallback(
    async (id: string) => {
      if (!snapshot.family) throw new Error("Chưa có gia đình.");
      await selectActiveChild(db, snapshot.family.id, id);
      await refresh();
    },
    [db, snapshot.family?.id, refresh],
  );

  useEffect(() => {
    prepareNotifications().catch(() => undefined);
    reconcileSyncedReminders(db).catch(() => undefined);
    refresh().then(() => {
      if (isSupabaseConfigured) syncNow();
    });
  }, [refresh, syncNow]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void reconcileSyncedReminders(db).catch(() => undefined);
        if (isSupabaseConfigured) void syncNow();
      }
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active" && isSupabaseConfigured)
        void syncNow();
    }, 60000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [syncNow, db]);

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
      occurredAt?: string;
      details?: Record<string, string>;
    }) => {
      if (!snapshot.family || !snapshot.child)
        throw new Error("Chưa có hồ sơ bé");
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
    async (body: string, attachments: MessageAttachment[] = []) => {
      if (!snapshot.family) throw new Error("Chưa có gia đình");
      await insertMessage(db, snapshot.family.id, body.trim(), attachments);
      await refresh();
      if (isSupabaseConfigured) syncNow();
    },
    [db, refresh, snapshot.family, syncNow],
  );

  const addReminder = useCallback(
    async (input: { title: string; details?: string | null; dueAt: Date }) => {
      if (!snapshot.family) throw new Error("Chưa có gia đình");
      await insertReminder(db, {
        familyId: snapshot.family.id,
        childId: snapshot.child?.id ?? null,
        title: input.title,
        details: input.details ?? null,
        dueAt: input.dueAt.toISOString(),
        notificationId: null,
      });
      try {
        const permitted = await requestNotificationPermission();
        if (!permitted)
          Alert.alert(
            "Đã lưu nhắc việc",
            "Hãy bật quyền thông báo trong Cài đặt iPhone để nhận nhắc giờ.",
          );
        await reconcileSyncedReminders(db);
      } catch {
        Alert.alert(
          "Đã lưu nhắc việc",
          "Chưa lập được thông báo trên máy. App sẽ thử lại khi mở hoặc đồng bộ; bạn không cần tạo lại nhắc việc.",
        );
      }
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
      selectChild,
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
      selectChild,
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
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}
