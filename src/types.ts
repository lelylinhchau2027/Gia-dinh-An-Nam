export type CareKind =
  | "milk"
  | "sleep"
  | "diaper"
  | "weaning"
  | "temperature"
  | "medicine"
  | "activity"
  | "growth";

export type Child = {
  id: string;
  family_id: string;
  name: string;
  nickname: string | null;
  birthday: string | null;
  due_date: string | null;
  gender: string | null;
  avatar_path?: string | null;
  cover_path?: string | null;
};

export type CareEntry = {
  id: string;
  family_id: string;
  child_id: string;
  kind: CareKind;
  amount: number | null;
  unit: string | null;
  note: string | null;
  occurred_at: string;
  created_by: string;
  created_by_name: string;
  sync_state: "pending" | "synced" | "error";
  details?: Record<string, string>;
  deleted_at?: string | null;
};

export type FamilyMessage = {
  id: string;
  family_id: string;
  body: string;
  created_at: string;
  created_by: string;
  created_by_name: string;
  attachments?: MessageAttachment[];
  sync_state?: "pending" | "synced" | "error";
};

export type MessageAttachment = {
  path: string;
  type: "image" | "video";
  mimeType: string;
  width: number;
  height: number;
  size: number;
};

export type Reminder = {
  id: string;
  family_id: string;
  child_id: string | null;
  title: string;
  details: string | null;
  due_at: string;
  completed_at: string | null;
  created_by: string;
  created_by_name: string;
  local_notification_id: string | null;
  reminder_kind?: "calendar" | "attention";
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  schedule_version?: number;
  sync_state?: "pending" | "synced" | "error";
};

export type Family = {
  id: string;
  name: string;
  pairing_code: string;
};

export type AppSnapshot = {
  family: Family | null;
  child: Child | null;
  children: Child[];
  currentUserId: string | null;
  entries: CareEntry[];
  messages: FamilyMessage[];
  reminders: Reminder[];
};

export type LegacyReferenceItem = {
  id: string;
  type: string;
  conditionType: string;
  targetType: string;
  title: string;
  shortTitle: string | null;
  description: string | null;
  valueFrom: number | null;
  valueTo: number | null;
  displayValue: string | null;
  task: boolean;
  taskRequired: boolean;
  enabled: boolean;
  extraItems: Array<{ name: string; value: string }>;
};

export type EasySlot = {
  fakeId: string | null;
  from: number;
  to: number | null;
  types: Array<"E" | "A" | "S" | "Y" | "NONE">;
  notes: string;
};

export type EasyTemplate = {
  id: string;
  type: "common";
  name: string;
  shortName: string | null;
  fromWeek: number;
  toWeek: number | null;
  conditions: string;
  notes: string;
  easyTimeGroups: Array<{
    fakeId: string | null;
    easyTimes: EasySlot[];
  }>;
  useCount: number;
  published: boolean;
};
