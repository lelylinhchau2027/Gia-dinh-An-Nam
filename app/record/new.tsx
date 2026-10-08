import { FormInput as TextInput } from "../../src/components/FormInput";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { editCare } from "../../src/lib/childRecords";
import { LinkButton } from "../../src/components/ui";
import { formStyles as form } from "../../src/components/forms";
import { Screen, PrimaryButton } from "../../src/components/ui";
import { careMeta, quickCareKinds } from "../../src/data/care";
import { useApp } from "../../src/providers/AppProvider";
import { colors, radius, spacing } from "../../src/theme";
import type { CareEntry, CareKind } from "../../src/types";
import { findAssistantTool, entryToolId } from "../../src/data/assistant";
import { AssistantIcon } from "../../src/components/AssistantIcon";
import { DayPicker } from "../../src/components/DayPicker";
import { TeethDiagram } from "../../src/components/TeethDiagram";

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
    tool?: string;
    tooth?: string;
    referenceId?: string;
    vaccine?: string;
    dose?: string;
    category?: string;
    day?: string;
    medalId?: string;
    milestone?: string;
  }>();
  const db = useSQLiteContext();
  const { addCare, child, refresh, syncNow } = useApp();
  const tool = findAssistantTool(
    existing ? entryToolId(existing) : params.tool,
  );
  const kind = useMemo<CareKind>(
    () =>
      existing?.kind ??
      tool?.kind ??
      (params.kind && params.kind in careMeta
        ? (params.kind as CareKind)
        : "milk"),
    [params.kind, existing?.kind, tool?.kind],
  );
  const meta = careMeta[kind];
  const [amount, setAmount] = useState(existing?.amount?.toString() ?? "");
  const [note, setNote] = useState(existing?.note ?? params.context ?? "");
  const [unit, setUnit] = useState(
    existing?.unit ?? tool?.unit ?? meta.defaultUnit ?? "",
  );
  const [details, setDetails] = useState<Record<string, string>>(
    existing?.details ?? {
      ...(tool ? { tool: tool.id } : {}),
      ...(tool?.id === "pump" ? { feeding: "Hút sữa" } : {}),
      ...(params.tooth ? { tooth: params.tooth } : {}),
      ...(params.referenceId ? { referenceId: params.referenceId } : {}),
      ...(params.vaccine ? { vaccine: params.vaccine } : {}),
      ...(params.dose ? { dose: params.dose } : {}),
      ...(params.category ? { category: params.category } : {}),
      ...(params.medalId ? { medalId: params.medalId } : {}),
      ...(params.milestone ? { milestone: params.milestone } : {}),
    },
  );
  const [editingTime, setEditingTime] = useState(false);
  const toLocal = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const [time, setTime] = useState(
    existing
      ? toLocal(new Date(existing.occurred_at))
      : params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day)
        ? `${params.day} ${toLocal(new Date()).slice(11)}`
        : toLocal(new Date()),
  );
  const [started, setStarted] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const saveLock = useRef(false);
  useEffect(() => {
    if (child && !existing && tool?.id !== "pump")
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
    if (saveLock.current) return;
    setSaveError("");
    const parsed = amount.trim() ? Number(amount.replace(",", ".")) : null;
    if (amount.trim() && (!Number.isFinite(parsed) || parsed! < 0)) {
      Alert.alert("Số lượng chưa đúng", "Hãy nhập một con số hợp lệ.");
      return;
    }
    try {
      saveLock.current = true;
      setSaving(true);
      if (
        (tool?.numeric ||
          [
            "milk",
            "sleep",
            "weaning",
            "temperature",
            "growth",
            "medicine",
          ].includes(kind)) &&
        (parsed === null || parsed <= 0)
      )
        throw new Error("Hãy nhập số lượng lớn hơn 0.");
      if (tool?.id === "injections" && !details.vaccine?.trim())
        throw new Error("Hãy nhập tên vắc-xin đã tiêm.");
      if (tool?.id === "teeth" && !details.tooth)
        throw new Error("Hãy chọn răng đã mọc.");
      if (
        tool?.id === "milestones" &&
        !details.milestone &&
        !details.achievement?.trim()
      )
        throw new Error("Hãy chọn hoặc nhập điều con đã làm được.");
      if (tool?.id === "fetal" && !details.metric)
        throw new Error("Hãy chọn loại số đo thai nhi.");
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
      setSaveError(
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
      Alert.alert(
        "Chưa thể lưu",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  return (
    <Screen contentStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{
          title: `${existing ? "Sửa" : "Thêm"} ${tool?.title.toLowerCase() ?? meta.label.toLowerCase()}`,
        }}
      />
      <View style={styles.hero}>
        {tool ? <AssistantIcon tool={tool} size={42} /> : null}
        <Text style={styles.heroLabel}>
          {child?.nickname || child?.name || "Bé yêu"}
        </Text>
      </View>
      {details.medalId ? (
        <Text style={[styles.label, { fontSize: 19, lineHeight: 27 }]}>
          {details.milestone}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() => setEditingTime((v) => !v)}
        style={form.chip}
      >
        <Text style={styles.label}>
          Thời điểm: {time.slice(11)} ·{" "}
          {time.slice(0, 10).split("-").reverse().join("/")}　✎
        </Text>
      </Pressable>
      {editingTime ? (
        <View style={form.gap}>
          <DayPicker
            value={time.slice(0, 10)}
            onChange={(day) => setTime(day + time.slice(10))}
          />
          <Text>Giờ (HH:mm)</Text>
          <TextInput
            style={styles.input}
            value={time.slice(11)}
            onChangeText={(value) => setTime(time.slice(0, 10) + " " + value)}
            accessibilityLabel="Giờ ghi nhận"
            keyboardType="numbers-and-punctuation"
          />
          <LinkButton
            title="Lấy giờ hiện tại"
            onPress={() => setTime(toLocal(new Date()))}
          />
        </View>
      ) : null}
      {!existing &&
      tool?.id !== "pump" &&
      (kind === "sleep" || kind === "milk") ? (
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
      {tool?.numeric || (kind !== "diaper" && kind !== "activity") ? (
        <View style={styles.field}>
          <Text style={styles.label}>
            {kind === "milk"
              ? "Lượng sữa"
              : kind === "sleep"
                ? "Thời gian ngủ"
                : kind === "temperature"
                  ? "Nhiệt độ"
                  : "Số lượng"}{" "}
            ({unit || "chọn đơn vị bên dưới"})
          </Text>
          <TextInput
            accessibilityLabel="Số lượng"
            testID="record-amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder={`Ví dụ: ${kind === "temperature" ? "37.2" : "120"}`}
            placeholderTextColor={colors.inkMuted}
            style={styles.input}
          />
          {tool?.presets && unit === tool.unit ? (
            <View style={form.wrap}>
              {tool.presets.map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setAmount(String(value))}
                  style={[
                    form.chip,
                    amount === String(value) && form.activeChip,
                  ]}
                >
                  <Text>
                    {value} {unit}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
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
        details.medalId
          ? {}
          : tool?.choices
            ? tool.choices
            : kind === "milk"
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
                  ? {
                      metric: ["Cân nặng", "Chiều dài / chiều cao", "Vòng đầu"],
                    }
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
                  setUnit(
                    tool?.id === "fetal"
                      ? choice.includes("(g)")
                        ? "g"
                        : "cm"
                      : choice === "Cân nặng"
                        ? "kg"
                        : "cm",
                  );
                if (field === "feeding")
                  setUnit(choice.startsWith("Bú mẹ") ? "phút" : "ml");
              }}
            >
              <Text>{choice}</Text>
            </Pressable>
          ))}
        </View>
      ))}

      {Object.entries(tool?.fields ?? {}).map(([field, label]) => (
        <View key={field} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            accessibilityLabel={label}
            style={styles.input}
            value={details[field] ?? ""}
            onChangeText={(value) =>
              setDetails((d) => ({ ...d, [field]: value }))
            }
            placeholder={label}
          />
        </View>
      ))}
      {tool?.id === "teeth" ? (
        <View style={styles.field}>
          <Text style={styles.label}>Chọn răng đã mọc</Text>
          <TeethDiagram
            records={existing ? [existing] : []}
            selected={details.tooth}
            onSelect={(tooth) => setDetails((d) => ({ ...d, tooth }))}
          />
          <Text style={form.hint}>
            {details.tooth
              ? "Đã chọn: " + details.tooth
              : "Chạm một răng trên sơ đồ"}
          </Text>
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.label}>Ghi chú</Text>
        <TextInput
          accessibilityLabel="Ghi chú"
          testID="record-note"
          value={note}
          onChangeText={setNote}
          multiline
          placeholder="Chi tiết để người còn lại dễ theo dõi..."
          placeholderTextColor={colors.inkMuted}
          style={[styles.input, styles.textarea]}
        />
      </View>
      {saveError ? (
        <Text accessibilityRole="alert" style={form.error}>
          {saveError}
        </Text>
      ) : null}
      <PrimaryButton
        testID="save-care-record"
        title={saving ? "Đang lưu..." : "Lưu vào nhật ký chung"}
        icon="checkmark"
        onPress={save}
        disabled={saving || !!started}
      />
      {tool?.hint ? <Text style={form.hint}>{tool.hint}</Text> : null}
      {tool?.kind && !existing ? (
        <LinkButton
          title={`Xem lịch sử ${tool.title.toLowerCase()}`}
          onPress={() =>
            router.push({
              pathname: "/assistant/[tool]",
              params: { tool: tool.id },
            })
          }
        />
      ) : null}
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
  hero: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderColor: "#EEE",
  },
  heroLabel: {
    fontFamily: "QuicksandSemiBold",
    fontSize: 20,
    color: colors.ink,
  },
  heroTime: { color: colors.inkMuted },
  field: { gap: spacing.sm },
  label: { color: colors.ink, fontFamily: "QuicksandSemiBold", fontSize: 16 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    fontFamily: "Quicksand",
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
