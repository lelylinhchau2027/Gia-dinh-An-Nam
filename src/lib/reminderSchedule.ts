/** Vietnam wall-clock days, not 24-hour offsets. */
export function calendarStages(dueAt: Date, now = new Date()): Date[] {
  if (!Number.isFinite(dueAt.getTime()) || dueAt <= now) return [];
  const day = new Date(dueAt.getTime() + 7 * 3600000)
    .toISOString()
    .slice(0, 10);
  const midnight = Date.parse(`${day}T00:00:00+07:00`);
  return Array.from(
    { length: 7 },
    (_, i) => new Date(midnight - (7 - i) * 86400000 + 21 * 3600000),
  ).filter((d) => d > now && d < dueAt);
}
export function calendarPreview(dueAt: Date, now = new Date()): string[] {
  if (!Number.isFinite(dueAt.getTime())) return [];
  const fmt = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const stages = calendarStages(dueAt, now);
  return [
    ...stages.map((d) => `Telegram · ${fmt.format(d)} (giờ Việt Nam)`),
    ...(stages.length
      ? []
      : ["Không còn lượt nhắc trước ngày; không gửi bù các ngày đã qua."]),
    `Cục bộ · ${fmt.format(dueAt)} (giờ Việt Nam) · đúng giờ hẹn`,
  ];
}
