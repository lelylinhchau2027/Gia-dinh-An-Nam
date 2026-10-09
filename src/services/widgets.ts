import type { SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";
import type { AppSnapshot, CareEntry } from "../types";
import { stringDetails } from "../lib/recordValidation";
export const WIDGET_GROUP = "group.vn.giadinhanam.family";

export async function syncWidgets(db: SQLiteDatabase, snapshot: AppSnapshot) {
  if (Platform.OS !== "ios") return;
  const { ExtensionStorage } = await import("@bacons/apple-targets");
  const storage = new ExtensionStorage(WIDGET_GROUP);
  const enabled = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_preferences WHERE key='widget_private_data'",
  );
  if (enabled?.value !== "yes" || !snapshot.child) {
    storage.remove("anNamSnapshot");
    ExtensionStorage.reloadWidget();
    return;
  }
  const selection = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_preferences WHERE key='widget_child'",
  );
  const child =
    snapshot.children.find((c) => c.id === selection?.value) ?? snapshot.child;
  const growth = await db.getAllAsync<CareEntry>(
    "SELECT amount,unit,details,occurred_at FROM care_entries WHERE child_id=? AND kind='growth' AND deleted_at IS NULL ORDER BY occurred_at DESC",
    child.id,
  );
  const metric = (name: string, unit: string) => {
    const names =
      name === "Chiều cao" ? ["Chiều cao", "Chiều dài / chiều cao"] : [name];
    const row = growth.find(
      (g) =>
        names.includes(stringDetails(g.details).metric ?? "") &&
        g.unit === unit,
    );
    return row?.amount == null ? "Chưa ghi" : `${row.amount} ${unit}`;
  };
  const payload = {
    updatedAt: new Date().toISOString(),
    childName: child.nickname || child.name,
    birthday: child.birthday ?? "",
    weight: metric("Cân nặng", "kg"),
    height: metric("Chiều cao", "cm"),
    events: snapshot.reminders
      .filter((r) => !r.completed_at && r.reminder_kind !== "attention")
      .map((r) => ({ id: r.id, title: r.title, dueAt: r.due_at })),
  };
  storage.set("anNamSnapshot", JSON.stringify(payload));
  ExtensionStorage.reloadWidget();
}
