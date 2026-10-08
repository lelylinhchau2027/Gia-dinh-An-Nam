export function parseWakeTime(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))
    throw new Error("Giờ bắt đầu cần đúng dạng HH:mm, ví dụ 07:00.");
  const [hour, minute] = value.split(":").map(Number);
  return hour! * 60 + minute!;
}
export function shiftedEasyTime(hour: number | null, offsetMinutes: number) {
  if (hour === null) return "";
  const total = Math.round(hour * 60) + offsetMinutes;
  const days = Math.floor(total / 1440);
  const within = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(within / 60)).padStart(2, "0")}:${String(within % 60).padStart(2, "0")}${days > 0 ? " (+1 ngày)" : days < 0 ? " (hôm trước)" : ""}`;
}
