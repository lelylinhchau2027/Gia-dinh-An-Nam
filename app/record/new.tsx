import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { editCare } from "../../src/lib/childRecords";
import { LinkButton } from "../../src/components/ui";
import { formStyles as form } from "../../src/components/forms";
import { Screen, PrimaryButton } from "../../src/components/ui";
import { careMeta, quickCareKinds } from "../../src/data/care";
import { useApp } from "../../src/providers/AppProvider";
import { colors, radius, spacing } from "../../src/theme";
import type { CareEntry, CareKind } from "../../src/types";

export default function NewRecordScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const db = useSQLiteContext();
  const [loaded, setLoaded] = useState<{
    id: string;
    entry?: CareEntry;
    error?: string;
  }>();
  useEffect(() => {
    if (!id) return;
    let active = true;
    db.getFirstAsync<Omit<CareEntry, "details"> & { details: string }>(
      "SELECT * FROM care_entries WHERE id=? AND deleted_at IS NULL",
      id,
    )
      .then((row) => {
        if (active)
          setLoaded({
            id,
            entry: row
              ? { ...row, details: JSON.parse(row.details || "{}") }
              : undefined,
          });
      })
      .catch(() => {
        if (active)
          setLoaded({
            id,
            error: "Không đọc được nhật ký. Hãy quay lại và thử lại.",
          });
      });
    return () => {
      active = false;
    };
  }, [id, db]);
  if (id && loaded?.id !== id)
    return (
      <Screen>
        <Text>Đang mở nhật ký…</Text>
      </Screen>
    );
  if (id && !loaded?.entry)
    return (
      <Screen>
        <Text>{loaded?.error ?? "Bản ghi không còn tồn tại."}</Text>
      </Screen>
    );
  return (
    <RecordForm key={id ?? "new"} existing={id ? loaded?.entry : undefined} />
  );
}

function RecordForm({ existing }: { existing?: CareEntry }) {
  const params = useLocalSearchParams<{
    kind?: string;
    id?: string;
    context?: string;
  }>();
  const db = useSQLiteContext();
  const { addCare, child, refresh, syncNow } = useApp();
  const kind = useMemo<CareKind>(
    () =>
      existing?.kind ??
      (params.kind && params.kind in careMeta
        ? (params.kind as CareKind)
        : "milk"),
    [params.kind, existing?.kind],
  );
  const meta = careMeta[kind];
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? "");
  const [note, setNote] = useState(existing?.note ?? params.context ?? "");
  const [unit, setUnit] = useState(existing?.unit ?? meta.defaultUnit ?? "");
  const [details, setDetails] = useState<Record<string, string>>(
    existing?.details ?? {},
  );
  const toLocal = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const [time, setTime] = useState(
    toLocal(new Date(existing?.occurred_at ?? Date.now())),
  );
  const [started, setStarted] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (child && !existing)
      db.getFirstAsync<{ kind: string; started_at: string }>(
        "SELECT kind, started_at FROM care_timers WHERE child_id=?",
        child.id,
      )
        .then((row) => {
          if (row?.kind === kind) setStarted(row.started_at);
        })
        .catch(() => undefined);
  }, [child?.id, kind, existing?.id, db]);
  useEffect(() => {
    if (!started) return;
    const tick = () =>
      setElapsed(
        Math.max(
          0,
          Math.floor((Date.now() - new Date(started).getTime()) / 1000),
        ),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [started]);
  const timer = async () => {
    if (!child) return;
    try {
      if (started) {
        setAmount(
          (
            Math.max(1, Date.now() - new Date(started).getTime()) / 60000
          ).toFixed(1),
        );
        setUnit("phút");
        setTime(toLocal(new Date(started)));
        setStarted(null);
        await db.runAsync(
          "DELETE FROM care_timers WHERE child_id=? AND kind=?",
          child.id,
          kind,
        );
      } else {
        const old = await db.getFirstAsync(
          "SELECT child_id FROM care_timers WHERE child_id=?",
          child.id,
        );
        if (old)
          throw new Error("Đang có một bộ đếm khác. Hãy kết thúc trước.");
        const now = new Date().toISOString();
        await db.runAsync(
          "INSERT INTO care_timers (child_id, kind, started_at) VALUES (?, ?, ?)",
          child.id,
          kind,
          now,
        );
        setStarted(now);
      }
    } catch (e) {
      Alert.alert(
        "Bộ đếm",
        e instanceof Error ? e.message : "Chưa lưu được bộ đếm.",
      );
    }
  };

  const save = async () => {
    const parsed = amount.trim() ? Number(amount.replace(",", ".")) : null;
    if (amount.trim() && (!Number.isFinite(parsed) || parsed! < 0)) {
      Alert.alert("Số lượng chưa đúng", "Hãy nhập một con số hợp lệ.");
      return;
    }
    try {
      setSaving(true);
      if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(time))
        throw new Error("Thời gian cần đúng dạng YYYY-MM-DD HH:mm.");
      const date = new Date(time.replace(" ", "T") + ":00");
      if (
        !Number.isFinite(date.getTime()) ||
        toLocal(date) !== time ||
        date.getTime() > Date.now() + 60000
      )
        throw new Error("Thời điểm ghi nhận không hợp lệ hoặc ở tương lai.");
      if (existing)
        await editCare(db, existing, {
          amount: parsed,
          unit: parsed !== null ? unit || null : null,
          note: note.trim() || null,
          occurred_at: date.toISOString(),
          details,
        });
      else
        await addCare({
          kind,
          amount: parsed,
          unit: parsed !== null ? unit || null : null,
          note: note.trim() || null,
          occurredAt: date.toISOString(),
          details,
        });
      await refresh();
      void syncNow();
      router.back();
    } catch (error) {
      Alert.alert(
        "Chưa thể lưu",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.hero, { backgroundColor: meta.soft }]}>
        <Text style={[styles.heroLabel, { color: meta.color }]}>
          {meta.label}
        </Text>
        <Text style={styles.heroTime}>
          Bây giờ ·{" "}
          {new Intl.DateTimeFormat("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date())}
        </Text>
      </View>

      <Text style={styles.label}>Thời điểm (YYYY-MM-DD HH:mm)</Text>
      <TextInput
        style={styles.input}
        value={time}
        onChangeText={setTime}
        keyboardType="numbers-and-punctuation"
      />
      {!existing && (kind === "sleep" || kind === "milk") ? (
        <PrimaryButton
          title={
            started
              ? `Dừng bộ đếm · ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`
              : "Bắt đầu bộ đếm"
          }
          onPress={timer}
          disabled={saving}
        />
      ) : null}
      {kind !== "diaper" && kind !== "activity" ? (
        <View style={styles.field}>
          <Text style={styles.label}>
            Số lượng ({unit || "chọn đơn vị bên dưới"})
          </Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder={`Ví dụ: ${kind === "temperature" ? "37.2" : "120"}`}
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
          />
        </View>
      ) : null}

      {(["milk", "growth", "weaning", "medicine"] as CareKind[]).includes(
        kind,
      ) ? (
        <View style={form.wrap}>
          {(kind === "milk"
            ? ["ml", "phút"]
            : kind === "growth"
              ? ["kg", "cm"]
              : kind === "weaning"
                ? ["g", "ml"]
                : ["ml", "mg", "viên", "giọt"]
          ).map((u) => (
            <Pressable
              key={u}
              style={[form.chip, unit === u && form.activeChip]}
              onPress={() => setUnit(u)}
            >
              <Text>{u}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {Object.entries(
        kind === "milk"
          ? {
              feeding: [
                "Bú bình",
                "Bú mẹ bên trái",
                "Bú mẹ bên phải",
                "Hút sữa",
              ],
            }
          : kind === "diaper"
            ? {
                diaper: ["Ướt", "Bẩn", "Cả hai"],
                consistency: ["Lỏng", "Mềm", "Cứng"],
              }
            : kind === "growth"
              ? { metric: ["Cân nặng", "Chiều dài / chiều cao", "Vòng đầu"] }
              : kind === "activity" && params.context
                ? { context: ["Khám thai", "Thai máy", "Ghi chú thai kỳ"] }
                : {},
      ).map(([field, choices]) => (
        <View key={field} style={form.wrap}>
          {choices.map((choice) => (
            <Pressable
              key={choice}
              style={[form.chip, details[field] === choice && form.activeChip]}
              onPress={() => {
                setDetails((d) => ({ ...d, [field]: choice }));
                if (field === "metric")
                  setUnit(choice === "Cân nặng" ? "kg" : "cm");
                if (field === "feeding")
                  setUnit(choice.startsWith("Bú mẹ") ? "phút" : "ml");
              }}
            >
              <Text>{choice}</Text>
            </Pressable>
          ))}
        </View>
      ))}

      <View style={styles.field}>
        <Text style={styles.label}>Ghi chú</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Chi tiết để người còn lại dễ theo dõi..."
          placeholderTextColor={colors.inkMuted}
          style={[styles.input, styles.textarea]}
        />
      </View>
      <PrimaryButton
        title={saving ? "Đang lưu..." : "Lưu vào nhật ký chung"}
        icon="checkmark"
        onPress={save}
        disabled={saving || !!started}
      />
      {existing ? (
        <LinkButton
          title="Xóa bản ghi"
          disabled={saving}
          onPress={() =>
            Alert.alert(
              "Xóa bản ghi?",
              "Thay đổi sẽ được đồng bộ cho người còn lại.",
              [
                { text: "Giữ lại", style: "cancel" },
                {
                  text: "Xóa",
                  style: "destructive",
                  onPress: async () => {
                    setSaving(true);
                    try {
                      await editCare(db, existing, {
                        deleted_at: new Date().toISOString(),
                      });
                      await refresh();
                      void syncNow();
                      router.back();
                    } catch {
                      Alert.alert("Chưa xóa được");
                    } finally {
                      setSaving(false);
                    }
                  },
                },
              ],
            )
          }
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg },
  hero: { borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm },
  heroLabel: { fontWeight: "900", fontSize: 28 },
  heroTime: { color: colors.inkMuted },
  field: { gap: spacing.sm },
  label: { color: colors.ink, fontWeight: "800" },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
    color: colors.ink,
    fontSize: 16,
  },
  textarea: {
    minHeight: 120,
    paddingTop: spacing.md,
    textAlignVertical: "top",
  },
});
