import { FormInput as TextInput } from "../../src/components/FormInput";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Card, PrimaryButton, Screen } from "../../src/components/ui";
import { isSupabaseConfigured } from "../../src/lib/supabase";
import { useApp } from "../../src/providers/AppProvider";
import {
  createPairedFamily,
  joinPairedFamily,
} from "../../src/services/familySync";
import { colors, radius, spacing } from "../../src/theme";

type Mode = "create" | "join";

export default function ConnectFamilyScreen() {
  const db = useSQLiteContext();
  const { refresh } = useApp();
  const [mode, setMode] = useState<Mode>("create");
  const [displayName, setDisplayName] = useState("");
  const [familyName, setFamilyName] = useState("Gia Đình An Nam");
  const [inviteCode, setInviteCode] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!displayName.trim()) return;
    try {
      setSaving(true);
      const family =
        mode === "create"
          ? await createPairedFamily(db, { familyName, displayName })
          : await joinPairedFamily(db, { inviteCode, displayName });
      await refresh();
      Alert.alert(
        mode === "create" ? "Đã tạo gia đình" : "Đã ghép thành công",
        mode === "create"
          ? `Mở màn hình này trên máy còn lại và nhập mã ${family.invite_code}.`
          : "Hai thiết bị giờ dùng chung dữ liệu của bé.",
        [{ text: "Xong", onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert(
        "Chưa ghép được",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <Screen contentStyle={styles.content}>
        <Card style={styles.gap}>
          <Text style={styles.title}>Cần cấu hình backend riêng</Text>
          <Text style={styles.helper}>
            Điền EXPO_PUBLIC_SUPABASE_URL và EXPO_PUBLIC_SUPABASE_ANON_KEY trong
            .env, sau đó chạy migration Supabase. Dữ liệu hiện vẫn an toàn trên
            máy.
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.segment}>
        <ModeButton
          active={mode === "create"}
          label="Máy thứ nhất"
          onPress={() => setMode("create")}
        />
        <ModeButton
          active={mode === "join"}
          label="Máy thứ hai"
          onPress={() => setMode("join")}
        />
      </View>

      <Card style={styles.gap}>
        <Text style={styles.title}>
          {mode === "create"
            ? "Tạo không gian gia đình"
            : "Nhập mã từ người còn lại"}
        </Text>
        <Text style={styles.helper}>
          {mode === "create"
            ? "Dữ liệu đang có trên máy này sẽ được đưa lên làm dữ liệu ban đầu."
            : "Sau khi ghép, máy này sẽ tải dữ liệu chung của gia đình thay cho hồ sơ demo."}
        </Text>
        <Text style={styles.label}>Tên hiển thị của bạn</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Ví dụ: Ba hoặc Mẹ"
          placeholderTextColor={colors.inkMuted}
          style={styles.input}
          maxLength={60}
        />
        {mode === "create" ? (
          <>
            <Text style={styles.label}>Tên gia đình</Text>
            <TextInput
              value={familyName}
              onChangeText={setFamilyName}
              style={styles.input}
              maxLength={80}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>Mã ghép 8 ký tự</Text>
            <TextInput
              autoCapitalize="characters"
              autoCorrect={false}
              value={inviteCode}
              onChangeText={(value) =>
                setInviteCode(
                  value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 8),
                )
              }
              placeholder="AB12CD34"
              placeholderTextColor={colors.inkMuted}
              style={[styles.input, styles.codeInput]}
              maxLength={8}
            />
          </>
        )}
        <PrimaryButton
          title={
            saving
              ? "Đang kết nối..."
              : mode === "create"
                ? "Tạo và lấy mã ghép"
                : "Ghép vào gia đình"
          }
          icon={mode === "create" ? "home-outline" : "link-outline"}
          disabled={
            saving ||
            !displayName.trim() ||
            (mode === "create" ? !familyName.trim() : inviteCode.length !== 8)
          }
          onPress={submit}
        />
      </Card>
      <Text style={styles.privacy}>
        Mỗi tài khoản chỉ thuộc một gia đình và mỗi gia đình nhận tối đa hai
        thành viên.
      </Text>
    </Screen>
  );
}

function ModeButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segmentButton, active && styles.segmentActive]}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg },
  gap: { gap: spacing.md },
  segment: {
    flexDirection: "row",
    padding: 4,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.inkMuted, fontWeight: "800" },
  segmentTextActive: { color: colors.primary },
  title: { color: colors.ink, fontSize: 20, fontWeight: "900" },
  helper: { color: colors.inkMuted, lineHeight: 20 },
  label: { color: colors.ink, fontWeight: "800", marginTop: spacing.xs },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.ink,
    backgroundColor: colors.background,
  },
  codeInput: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 3,
    textAlign: "center",
  },
  privacy: {
    color: colors.inkMuted,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
  },
});
