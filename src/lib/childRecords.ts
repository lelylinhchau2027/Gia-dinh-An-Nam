import type { SQLiteDatabase } from "expo-sqlite";
import type { CareEntry, Child } from "../types";
import { enqueue } from "./database";

export function parseDay(value: string): string | null {
  if (!value.trim()) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Ngày cần đúng dạng YYYY-MM-DD.");
  const date = new Date(`${value}T12:00:00Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new Error("Ngày không tồn tại.");
  return value;
}
export async function saveChild(db: SQLiteDatabase, child: Child) {
  if (!child.name.trim() || child.name.length > 80)
    throw new Error("Tên bé cần từ 1 đến 80 ký tự.");
  const payload = {
    ...child,
    name: child.name.trim(),
    updated_at: new Date().toISOString(),
  };
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "UPDATE children SET name=?, nickname=?, birthday=?, due_date=?, gender=?, avatar_path=?, cover_path=?, updated_at=?, sync_state='pending' WHERE id=?",
      payload.name,
      payload.nickname,
      payload.birthday,
      payload.due_date,
      payload.gender,
      payload.avatar_path ?? null,
      payload.cover_path ?? null,
      payload.updated_at,
      payload.id,
    );
    await enqueue(db, child.family_id, "children", child.id, payload);
  });
}
export async function editCare(
  db: SQLiteDatabase,
  entry: CareEntry,
  changes:
    | {
        amount: number | null;
        unit: string | null;
        note: string | null;
        occurred_at: string;
        details: Record<string, string>;
      }
    | { deleted_at: string },
) {
  const payload = {
    id: entry.id,
    family_id: entry.family_id,
    ...changes,
    updated_at: new Date().toISOString(),
  };
  await db.withTransactionAsync(async () => {
    if ("deleted_at" in changes)
      await db.runAsync(
        "UPDATE care_entries SET deleted_at=?, updated_at=?, sync_state='pending' WHERE id=?",
        changes.deleted_at,
        payload.updated_at,
        entry.id,
      );
    else
      await db.runAsync(
        "UPDATE care_entries SET amount=?, unit=?, note=?, occurred_at=?, details=?, updated_at=?, sync_state='pending' WHERE id=?",
        changes.amount,
        changes.unit,
        changes.note,
        changes.occurred_at,
        JSON.stringify(changes.details),
        payload.updated_at,
        entry.id,
      );
    await enqueue(
      db,
      entry.family_id,
      "care_entries",
      entry.id,
      payload,
      "update",
    );
  });
}
