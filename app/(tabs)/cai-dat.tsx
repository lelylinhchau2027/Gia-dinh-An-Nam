import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppTitle } from "../../src/components/AppTitle";
import {
  Card,
  Pill,
  PrimaryButton,
  Screen,
  SectionHeader,
} from "../../src/components/ui";
import {
  activeVaccinations,
  easyTemplates,
  legacyPregnancyExaminations,
  referenceRelease,
  verifiedVaccinationDatasets,
} from "../../src/data/reference";
import { isSupabaseConfigured } from "../../src/lib/supabase";
import {
  getRemotePushToken,
  requestNotificationPermission,
  reconcileSyncedReminders,
} from "../../src/services/notifications";
import { useSQLiteContext } from "expo-sqlite";
import Constants from "expo-constants";
import { registerFamilyPush } from "../../src/services/familySync";
import { useApp } from "../../src/providers/AppProvider";
import { colors, spacing } from "../../src/theme";

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { pendingSyncCount, syncing, syncMessage, syncNow } = useApp();
  const [permission, setPermission] = useState("đang kiểm tra");
  const [pushState, setPushState] = useState<string | null>(null);

  useEffect(() => {
    Notifications.getPermissionsAsync().then((result) =>
      setPermission(result.granted ? "đã cho phép" : "chưa cho phép"),
    );
  }, []);

  const testPushSetup = async () => {
    await requestNotificationPermission();
    await reconcileSyncedReminders(db);
    if (isSupabaseConfigured) {
      try {
        setPushState(await registerFamilyPush());
      } catch (error) {
        setPushState(
          error instanceof Error
            ? error.message
            : "Chưa đăng ký được thiết bị.",
        );
      }
    } else {
      const result = await getRemotePushToken();
      setPushState(
        result.token
          ? "Thiết bị có token; cần cấu hình backend để lưu token."
          : result.reason,
      );
    }
    const next = await Notifications.getPermissionsAsync();
    setPermission(next.granted ? "đã cho phép" : "chưa cho phép");
  };

  return (
    <Screen>
      <AppTitle
        eyebrow="Hệ thống"
        title="Cài đặt"
        subtitle="Trạng thái dữ liệu, đồng bộ và thông báo của gia đình."
      />

      <SectionHeader title="Đồng bộ hai người" />
      <PrimaryButton
        title="Tài khoản • email khôi phục • thiết bị"
        onPress={() => router.push("/account")}
      />
      <Card>
        <SettingRow
          icon="cloud-outline"
          title="Supabase"
          body={
            isSupabaseConfigured
              ? "Đã có cấu hình backend."
              : "Chưa cấu hình .env; app đang chạy local-first."
          }
          status={isSupabaseConfigured ? "Sẵn sàng" : "Local"}
        />
        <SettingRow
          icon="sync-outline"
          title="Hàng đợi đồng bộ"
          body="Mọi thay đổi được giữ trên máy trước khi gửi lên không gian gia đình."
          status={`${pendingSyncCount} mục`}
        />
        <PrimaryButton
          title={syncing ? "Đang đồng bộ..." : "Đồng bộ ngay"}
          icon="sync-outline"
          disabled={syncing || !isSupabaseConfigured}
          onPress={syncNow}
        />
        <PrimaryButton
          title="Ghép hai thiết bị"
          icon="link-outline"
          disabled={!isSupabaseConfigured}
          onPress={() => router.push("/family/connect")}
        />
        {syncMessage ? <Text style={styles.helper}>{syncMessage}</Text> : null}
      </Card>

      <SectionHeader title="Thông báo" />
      <Card style={styles.gap}>
        <SettingRow
          icon="notifications-outline"
          title="Quyền thông báo"
          body="Nhắc cục bộ vẫn hoạt động khi không có mạng. Remote push cần APNs provisioning."
          status={permission}
        />
        <PrimaryButton
          title="Kiểm tra thông báo trên thiết bị"
          icon="shield-checkmark-outline"
          onPress={testPushSetup}
        />
        {pushState ? <Text style={styles.helper}>{pushState}</Text> : null}
      </Card>

      <SectionHeader title="Bộ dữ liệu tham chiếu" />
      <Card style={styles.gap}>
        <View style={styles.releaseLine}>
          <View style={styles.grow}>
            <Text style={styles.releaseTitle}>{referenceRelease.label}</Text>
            <Text style={styles.helper}>
              Snapshot {referenceRelease.capturedAt}
            </Text>
          </View>
          <Pill label="Đang rà soát" tone="amber" />
        </View>
        <Text style={styles.dataLine}>
          {activeVaccinations.length} mốc tiêm phòng đang hiển thị
        </Text>
        <Text style={styles.dataLine}>
          {verifiedVaccinationDatasets.length} nhóm đã thay bằng nguồn hiện hành
        </Text>
        <Text style={styles.dataLine}>
          {legacyPregnancyExaminations.length} mốc khám thai
        </Text>
        <Text style={styles.dataLine}>
          {easyTemplates.length} mẫu E.A.S.Y gốc
        </Text>
        <Text style={styles.warning}>{referenceRelease.warning}</Text>
      </Card>

      <Text style={styles.footer}>
        Gia Đình An Nam · {Constants.expoConfig?.version}
      </Text>
    </Screen>
  );
}

function SettingRow({
  icon,
  title,
  body,
  status,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  status: string;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={22} color={colors.sage} />
      <View style={styles.grow}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.helper}>{body}</Text>
      </View>
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  grow: { flex: 1 },
  rowTitle: { color: colors.ink, fontWeight: "900", marginBottom: 4 },
  helper: { color: colors.inkMuted, fontSize: 12, lineHeight: 17 },
  status: { color: colors.primary, fontWeight: "800", fontSize: 12 },
  releaseLine: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  releaseTitle: { color: colors.ink, fontWeight: "900", fontSize: 16 },
  dataLine: { color: colors.ink, fontSize: 14 },
  warning: { color: colors.amber, fontSize: 12, lineHeight: 18 },
  footer: {
    textAlign: "center",
    color: colors.inkMuted,
    fontSize: 12,
    marginTop: spacing.xl,
  },
});
