import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { Alert, Share, StyleSheet, Text, View } from "react-native";
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
  testLocalNotification,
  notificationPermissionLabel,
} from "../../src/services/notifications";
import { useSQLiteContext } from "expo-sqlite";
import Constants from "expo-constants";
import { registerFamilyPush } from "../../src/services/familySync";
import { useApp } from "../../src/providers/AppProvider";
import { colors, spacing } from "../../src/theme";
import { readCrashReport } from "../../src/lib/crashReporting";
import { pushHealth, testServerPush } from "../../src/services/pushDiagnostics";

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { pendingSyncCount, syncing, syncMessage, syncNow } = useApp();
  const [permission, setPermission] = useState("đang kiểm tra");
  const [pushState, setPushState] = useState<string | null>(null);
  const [localState, setLocalState] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [serverState, setServerState] = useState<string | null>(null);
  const checkServer = async (test: boolean) => {
    if (checking) return;
    setChecking(true);
    try {
      setServerState(
        test
          ? `${await testServerPush()}\n${await pushHealth()}`
          : await pushHealth(),
      );
    } catch (e) {
      setServerState(
        e instanceof Error ? e.message : "Chưa kiểm tra được máy chủ.",
      );
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    Notifications.getPermissionsAsync()
      .then((result) => setPermission(notificationPermissionLabel(result)))
      .catch(() => setPermission("chưa đọc được"));
  }, []);

  const testPushSetup = async () => {
    if (checking) return;
    setChecking(true);
    try {
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
      setPermission(notificationPermissionLabel(next));
    } catch (e) {
      setPushState(e instanceof Error ? e.message : "Chưa kiểm tra được push.");
    } finally {
      setChecking(false);
    }
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
          title="Thử nhắc cục bộ sau 10 giây"
          disabled={checking}
          onPress={async () => {
            setChecking(true);
            try {
              setLocalState(await testLocalNotification());
              const p = await Notifications.getPermissionsAsync();
              setPermission(notificationPermissionLabel(p));
            } catch (e) {
              setLocalState(
                e instanceof Error ? e.message : "Chưa đặt được nhắc thử.",
              );
            } finally {
              setChecking(false);
            }
          }}
        />
        {localState ? <Text style={styles.helper}>{localState}</Text> : null}
        <PrimaryButton
          title="Đăng ký push từ máy người còn lại"
          disabled={checking}
          icon="shield-checkmark-outline"
          onPress={testPushSetup}
        />
        {pushState ? <Text style={styles.helper}>{pushState}</Text> : null}
        <PrimaryButton
          title="Thử push từ máy chủ về máy này"
          disabled={checking || !isSupabaseConfigured}
          onPress={() => void checkServer(true)}
        />
        <PrimaryButton
          title="Xem trạng thái push hai người"
          disabled={checking || !isSupabaseConfigured}
          onPress={() => void checkServer(false)}
        />
        {serverState ? (
          <Text selectable style={styles.helper}>
            {serverState}
          </Text>
        ) : null}
        <Text style={styles.helper}>
          Nhắc đã đồng bộ được đặt lịch trên từng máy. Tin nhắn mới khi app đang
          đóng vẫn cần push APNs; thông báo cục bộ không thay thế phần này.
        </Text>
      </Card>

      <SectionHeader title="Chẩn đoán lỗi" />
      <Card style={styles.gap}>
        <Text style={styles.helper}>
          Báo cáo JavaScript nghiêm trọng chỉ lưu trên điện thoại, không tự tải
          lên. Hãy xem lại nội dung trước khi chia sẻ; đây không phải toàn bộ
          log native của iOS.
        </Text>
        <PrimaryButton
          title="Chia sẻ lỗi JavaScript gần nhất"
          onPress={async () => {
            const report = readCrashReport();
            if (!report) {
              Alert.alert(
                "Chưa có báo cáo",
                "Chỉ ghi nhận được lỗi xảy ra sau khi cài bản có chẩn đoán này.",
              );
              return;
            }
            try {
              await Share.share({ message: report });
            } catch {
              Alert.alert("Chưa chia sẻ được báo cáo");
            }
          }}
        />
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
        <Text style={styles.status}>{status}</Text>
      </View>
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
