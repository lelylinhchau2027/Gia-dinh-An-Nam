// Treat persisted/remote JSON as untrusted shapes, including older app versions.
export function stringDetails(value: unknown): Record<string, string> {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => typeof v === "string"),
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

export function validDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}
