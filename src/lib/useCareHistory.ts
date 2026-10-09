import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useApp } from "../providers/AppProvider";
import { readCareHistory } from "./careHistory";
import type { CareEntry } from "../types";

export function useCareHistory() {
  const db = useSQLiteContext();
  const { child, entries: changes } = useApp();
  const [entries, setEntries] = useState<CareEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      (child ? readCareHistory(db, child.id) : Promise.resolve([]))
        .then((rows) => {
          if (active) {
            setEntries(rows);
            setError("");
          }
        })
        .catch(() => {
          if (active)
            setError("Chưa đọc được lịch sử. Hãy quay lại và thử lại.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [db, child?.id, changes]),
  );
  return {
    entries: entries.filter((e) => e.child_id === child?.id),
    loading,
    error,
    child,
  };
}
