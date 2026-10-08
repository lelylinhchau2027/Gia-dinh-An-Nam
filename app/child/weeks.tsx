import { router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { Card, LinkButton, Screen } from "../../src/components/ui";
import { CareTimelineItem } from "../../src/components/CareTimelineItem";
import { useCareHistory } from "../../src/lib/useCareHistory";
import type { CareEntry } from "../../src/types";

export default function WeeksScreen() {
  const { entries, child, loading, error } = useCareHistory();
  const [limit, setLimit] = useState(8);
  const base = child?.birthday
    ? new Date(`${child.birthday}T00:00:00`).getTime()
    : child?.due_date
      ? new Date(`${child.due_date}T00:00:00`).getTime() - 280 * 86400000
      : null;
  const groups = new Map<number, CareEntry[]>();
  entries
    .filter(
      (e) =>
        e.kind === "growth" ||
        ["milestones", "teeth", "fetal", "kick"].includes(
          e.details?.tool ?? "",
        ),
    )
    .forEach((entry) => {
      const week =
        base !== null
          ? Math.floor(
              (new Date(entry.occurred_at).getTime() - base) / 604800000,
            )
          : 0;
      const list = groups.get(week) ?? [];
      list.push(entry);
      groups.set(week, list);
    });
  return (
    <Screen>
      <Text style={{ fontSize: 24, fontWeight: "700", color: "#493940" }}>
        Từng tuần con lớn lên
      </Text>
      <Text style={{ color: "#89747E", lineHeight: 22 }}>
        Các số đo và cột mốc bạn đã ghi cho con, xếp theo tuần. Đây là hành
        trình riêng của bé, chưa phải bộ bài hướng dẫn phát triển từng tuần của
        app gốc.
      </Text>
      <LinkButton
        title="Ghi điều con mới làm được"
        onPress={() =>
          router.push({
            pathname: "/record/new",
            params: { tool: "milestones" },
          })
        }
      />
      {base === null ? (
        <LinkButton
          title="Thêm ngày sinh / dự sinh để chia theo tuần"
          onPress={() => router.push("/child/edit")}
        />
      ) : null}
      {loading ? (
        <Text>Đang tải…</Text>
      ) : error ? (
        <Text>{error}</Text>
      ) : !groups.size ? (
        <Card>
          <Text>
            Chưa có cột mốc hoặc số đo. Những điều bạn ghi nhận sẽ hiện ở đây.
          </Text>
        </Card>
      ) : (
        [...groups]
          .sort(([a], [b]) => b - a)
          .slice(0, limit)
          .map(([week, rows]) => (
            <Card key={week}>
              <Text style={{ fontSize: 18, fontWeight: "700" }}>
                {base === null
                  ? "Chưa có mốc ngày"
                  : week < 0
                    ? "Trước ngày sinh"
                    : child?.birthday
                      ? `Tuần tuổi ${week + 1}`
                      : `Tuần thai ${week}`}
              </Text>
              {rows.map((entry) => (
                <CareTimelineItem key={entry.id} entry={entry} />
              ))}
            </Card>
          ))
      )}
      {groups.size > limit ? (
        <LinkButton
          title="Xem tuần trước"
          onPress={() => setLimit((n) => n + 8)}
        />
      ) : null}
      <LinkButton
        title="Đọc cẩm nang chăm bé"
        onPress={() => router.push("/lich")}
      />
    </Screen>
  );
}
