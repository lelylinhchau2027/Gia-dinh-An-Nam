import type { SQLiteDatabase } from "expo-sqlite";
import type { CareEntry } from "../types";

export async function readCareHistory(
  db: SQLiteDatabase,
  childId: string,
): Promise<CareEntry[]> {
  const rows = await db.getAllAsync<
    Omit<CareEntry, "details"> & { details: string }
  >(
    "SELECT * FROM care_entries WHERE child_id=? AND deleted_at IS NULL ORDER BY occurred_at DESC, id DESC",
    childId,
  );
  return rows.map((row) => ({
    ...row,
    details: JSON.parse(row.details || "{}"),
  }));
}
export function isPumpedMilk(entry: CareEntry) {
  return (
    entry.kind === "milk" &&
    (entry.details?.tool === "pump" || entry.details?.feeding === "Hút sữa")
  );
}
export function summarizeCare(entries: CareEntry[]) {
  return {
    records: entries.length,
    milk: entries
      .filter((e) => e.kind === "milk" && e.unit === "ml" && !isPumpedMilk(e))
      .reduce((v, e) => v + (e.amount ?? 0), 0),
    pumped: entries
      .filter((e) => e.unit === "ml" && isPumpedMilk(e))
      .reduce((v, e) => v + (e.amount ?? 0), 0),
    sleep: entries
      .filter((e) => e.kind === "sleep" && e.unit === "phút")
      .reduce((v, e) => v + (e.amount ?? 0), 0),
    diapers: entries.filter((e) => e.kind === "diaper").length,
  };
}
