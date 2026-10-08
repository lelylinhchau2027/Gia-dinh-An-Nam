import { FormInput as TextInput } from "../../src/components/FormInput";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { PrimaryButton, Screen } from "../../src/components/ui";
import { useApp } from "../../src/providers/AppProvider";
import { colors, radius, spacing } from "../../src/theme";

export default function MessageScreen() {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const { sendMessage } = useApp();
  const save = async () => {
    if (!body.trim()) return;
    try {
      setSaving(true);
      await sendMessage(body);
      router.back();
    } catch (error) {
      Alert.alert(
        "Chưa gửi được",
        error instanceof Error ? error.message : "Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Screen contentStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.hint}>
        Lời nhắn sẽ đồng bộ và gửi thông báo cho người còn lại khi backend push
        được bật.
      </Text>
      <TextInput
        autoFocus
        multiline
        value={body}
        onChangeText={setBody}
        placeholder="Ví dụ: Em đã cho bé uống vitamin rồi nhé."
        placeholderTextColor={colors.inkMuted}
        style={styles.input}
      />
      <PrimaryButton
        title={saving ? "Đang lưu..." : "Gửi lời nhắn"}
        icon="send"
        disabled={!body.trim() || saving}
        onPress={save}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg },
  hint: { color: colors.inkMuted, lineHeight: 20 },
  input: {
    minHeight: 170,
    textAlignVertical: "top",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    color: colors.ink,
    fontSize: 16,
  },
});
