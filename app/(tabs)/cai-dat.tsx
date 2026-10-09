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
  requestNotificationPermission,
  reconcileSyncedReminders,
  testLocalNotification,
  notificationPermissionLabel,
} from "../../src/services/notifications";
import { useSQLiteContext } from "expo-sqlite";
import Constants from "expo-constants";
import { useApp } from "../../src/providers/AppProvider";
import { colors, spacing } from "../../src/theme";
import { readCrashReport } from "../../src/lib/crashReporting";

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { pendingSyncCount, syncing, syncMessage, syncNow } = useApp();
  const [permission, setPermission] = useState("đang kiểm tra");
  const [localState, setLocalState] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    Notifications.getPermissionsAsync()
      .then((result) => setPermission(notificationPermissionLabel(result)))
      .catch(() => setPermission("chưa đọc được"));
  }, []);

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
          body="Nhắc đã đặt trên iPhone vẫn hoạt động khi mất mạng. Hoạt động từ người nhà nhận qua Telegram."
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
          title="Liên kết / kiểm tra Telegram"
          onPress={() => router.push("/family/telegram")}
        />
        <PrimaryButton
          title="Tiện ích ngoài màn hình"
          onPress={() => router.push("/widgets")}
        />
        <PrimaryButton
          title="Cho phép và đặt lại nhắc cục bộ"
          disabled={checking}
          onPress={async () => {
            setChecking(true);
            try {
              await requestNotificationPermission();
              await reconcileSyncedReminders(db);
              const requests =
                await Notifications.getAllScheduledNotificationsAsync();
              setLocalState(
                "Đang có " +
                  requests.filter((r) => r.content.data?.route === "/gia-dinh")
                    .length +
                  "/48 lịch trên máy. Chỉ những lịch đã đặt mới có thể báo khi app đóng.",
              );
              setPermission(
                notificationPermissionLabel(
                  await Notifications.getPermissionsAsync(),
                ),
              );
            } catch {
              setLocalState(
                "Chưa lập được lịch cục bộ. Hãy kiểm tra quyền thông báo.",
              );
            } finally {
              setChecking(false);
            }
          }}
        />
        <Text style={styles.helper}>
          Telegram nhắc lịch lúc 21:00 giờ Việt Nam trong 7 ngày trước sự kiện.
          iPhone nhắc đúng giờ hẹn, tối đa 48 lịch đang chờ; mở app để nạp thêm.
          Lời nhắc và báo cần hỗ trợ có xác nhận của người còn lại.
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
