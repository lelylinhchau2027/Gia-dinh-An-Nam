import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppTitle } from "../../src/components/AppTitle";
import {
  Card,
  LinkButton,
  Screen,
  SectionHeader,
} from "../../src/components/ui";
import { FamilyPhoto } from "../../src/components/FamilyPhoto";
import { careMeta } from "../../src/data/care";
import { useApp } from "../../src/providers/AppProvider";
import { formStyles as s } from "../../src/components/forms";
import { colors } from "../../src/theme";
import type { CareKind } from "../../src/types";
import { useState } from "react";

export default function BabyScreen() {
  const { child, entries } = useApp();
  const [branch, setBranch] = useState<"pregnancy" | "born" | null>(null);
  const stage =
    branch ?? (child?.due_date && !child.birthday ? "pregnancy" : "born");
  const today = entries.filter(
    (e) => new Date(e.occurred_at).toDateString() === new Date().toDateString(),
  );
  const birthday = child?.birthday
    ? new Date(`${child.birthday}T12:00:00`)
    : null;
  const age = birthday
    ? Math.max(0, Math.floor((Date.now() - birthday.getTime()) / 86400000))
    : null;
  const due = child?.due_date ? new Date(`${child.due_date}T12:00:00`) : null;
  const weeks = due
    ? Math.max(
        0,
        Math.floor(40 - (due.getTime() - Date.now()) / (7 * 86400000)),
      )
    : null;
  return (
    <Screen>
      <View style={s.row}>
        <LinkButton
          title="Việc chung"
          onPress={() => router.push("/gia-dinh")}
        />
        <LinkButton title="Cài đặt" onPress={() => router.push("/cai-dat")} />
      </View>
      <AppTitle eyebrow="Cùng con lớn lên" title="Em bé" />
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <FamilyPhoto
          path={child?.cover_path}
          style={{ height: 155, width: "100%" }}
        />
        <View style={{ padding: 18, gap: 12 }}>
          <FamilyPhoto
            path={child?.avatar_path}
            style={{
              height: 88,
              width: 88,
              borderRadius: 44,
              marginTop: -55,
              borderWidth: 4,
              borderColor: colors.surface,
            }}
          />
          <Text style={s.title}>{child?.name ?? "Bé yêu"}</Text>
          <Text style={s.hint}>
            {child?.nickname || "Khoảnh khắc nào cũng đáng nhớ"} ·{" "}
            {stage === "pregnancy"
              ? weeks !== null
                ? `Khoảng tuần thai ${weeks}`
                : "Đang mong con"
              : age !== null
                ? `${age} ngày bên gia đình`
                : "Thêm ngày sinh cho bé"}
          </Text>
          <LinkButton
            title="Sửa hồ sơ • ảnh bìa • ảnh đại diện"
            onPress={() => router.push("/child/edit")}
          />
        </View>
      </Card>
      <View style={s.row}>
        {(["pregnancy", "born"] as const).map((v) => (
          <Pressable
            key={v}
            style={[s.chip, stage === v && s.activeChip]}
            onPress={() => setBranch(v)}
          >
            <Text style={s.label}>
              {v === "pregnancy" ? "Đang mang thai" : "Bé đã sinh"}
            </Text>
          </Pressable>
        ))}
      </View>
      {stage === "pregnancy" ? (
        <>
          <Card style={s.gap}>
            <Text style={s.label}>Hành trình chờ con</Text>
            <Text style={s.body}>
              {child?.due_date
                ? `Ngày dự sinh: ${child.due_date}`
                : "Thêm ngày dự sinh trong hồ sơ để theo dõi hành trình."}
            </Text>
            <LinkButton
              title="Lịch khám thai"
              onPress={() =>
                router.push({
                  pathname: "/lich",
                  params: { section: "pregnancy" },
                })
              }
            />
            <LinkButton
              title="Ghi chú khám thai"
              onPress={() =>
                router.push({
                  pathname: "/record/new",
                  params: { kind: "activity", context: "Khám thai" },
                })
              }
            />
            <LinkButton
              title="Hẹn khám / nhắc bổ sung theo chỉ định"
              onPress={() => router.push("/reminder/new")}
            />
          </Card>
          <LinkButton
            title="Xem nhật ký thai kỳ"
            onPress={() => router.push("/theo-doi")}
          />
        </>
      ) : (
        <>
          <SectionHeader title="Hôm nay của bé" />
          <View style={s.wrap}>
            <Card>
              <Text style={s.label}>
                {today
                  .filter((e) => e.kind === "milk" && e.unit === "ml")
                  .reduce((n, e) => n + (e.amount ?? 0), 0)}{" "}
                ml sữa
              </Text>
            </Card>
            <Card>
              <Text style={s.label}>
                {today
                  .filter((e) => e.kind === "sleep")
                  .reduce((n, e) => n + (e.amount ?? 0), 0)}{" "}
                phút ngủ
              </Text>
            </Card>
          </View>
          <View style={s.wrap}>
            {(Object.keys(careMeta) as CareKind[]).map((kind) => (
              <Pressable
                key={kind}
                style={[
                  s.chip,
                  {
                    minWidth: "45%",
                    flexGrow: 1,
                    gap: 8,
                    backgroundColor: careMeta[kind].soft,
                  },
                ]}
                onPress={() =>
                  router.push({ pathname: "/record/new", params: { kind } })
                }
              >
                <Ionicons
                  name={careMeta[kind].icon}
                  size={26}
                  color={careMeta[kind].color}
                />
                <Text style={s.label}>{careMeta[kind].label}</Text>
              </Pressable>
            ))}
          </View>
          <LinkButton
            title="Nhật ký • sửa bản ghi • thống kê"
            onPress={() => router.push("/theo-doi")}
          />
          <LinkButton
            title="Biểu đồ tăng trưởng"
            onPress={() => router.push("/child/growth")}
          />
          <LinkButton
            title="Lịch tiêm phòng"
            onPress={() =>
              router.push({
                pathname: "/lich",
                params: { section: "vaccines" },
              })
            }
          />
          <LinkButton
            title="Lịch sinh hoạt E.A.S.Y"
            onPress={() =>
              router.push({ pathname: "/lich", params: { section: "easy" } })
            }
          />
        </>
      )}
    </Screen>
  );
}
