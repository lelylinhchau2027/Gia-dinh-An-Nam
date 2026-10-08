import type { CareEntry } from "../types";

export function careDay(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function shiftDay(day: string, offset: number) {
  const date = new Date(`${day}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return careDay(date.toISOString());
}
export function dailyTotals(entries: CareEntry[]) {
  const amounts = new Map<string, number>();
  for (const entry of entries) {
    if (entry.amount === null || !Number.isFinite(entry.amount) || !entry.unit)
      continue;
    amounts.set(entry.unit, (amounts.get(entry.unit) ?? 0) + entry.amount);
  }
  return [...amounts]
    .map(([unit, amount]) => `${Math.round(amount * 10) / 10} ${unit}`)
    .join(" · ");
}
export const feelingEmoji: Record<string, string> = {
  "Rất vui": "😄",
  Vui: "🙂",
  "Bình thường": "😐",
  "Khó chịu": "😣",
  Khóc: "😭",
};
