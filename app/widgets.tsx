import { useEffect, useState } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { Alert, Pressable, Switch, View } from "react-native";
import { FamilyText as Text } from "../src/components/FamilyText";
import {
  Card,
  PrimaryButton,
  Screen,
  SectionHeader,
} from "../src/components/ui";
import { useApp } from "../src/providers/AppProvider";
import { syncWidgets } from "../src/services/widgets";

export default function WidgetSettings() {
  const db = useSQLiteContext();
  const snapshot = useApp();
  const [enabled, setEnabled] = useState(false);
  const [childId, setChildId] = useState("");
  useEffect(() => {
    void db
      .getAllAsync<{ key: string; value: string }>(
        "SELECT key,value FROM app_preferences WHERE key IN ('widget_private_data','widget_child')",
      )
      .then((rows) => {
        setEnabled(
          rows.some(
            (r) => r.key === "widget_private_data" && r.value === "yes",
          ),
        );
        setChildId(rows.find((r) => r.key === "widget_child")?.value ?? "");
      })
      .catch(() => undefined);
  }, [db]);
  const save = async (on: boolean, id: string) => {
    try {
      await db.runAsync(
        "INSERT OR REPLACE INTO app_preferences(key,value) VALUES('widget_private_data',?)",
        on ? "yes" : "no",
      );
      await db.runAsync(
        "INSERT OR REPLACE INTO app_preferences(key,value) VALUES('widget_child',?)",
        id,
      );
      setEnabled(on);
      setChildId(id);
      await syncWidgets(db, snapshot);
    } catch {
      Alert.alert(
        "Chưa cập nhật được widget",
        "Bản ký cần giữ extension và App Group. Widget không đọc dữ liệu gia đình công khai trên mạng.",
      );
    }
  };
  return (
    <Screen>
      <SectionHeader title="Ba kiểu tiện ích" />
      <Card>
        <Text>
          • Bé yêu: tên, tuổi theo tháng, cân nặng, chiều cao mới nhất.
        </Text>
        <Text>
          • Lịch tháng: các lịch chưa hoàn thành trong tháng hiện tại.
        </Text>
        <Text>
          • Cần hỗ trợ: chạm để mở An Nam và xác nhận gửi báo nhanh qua
          Telegram.
        </Text>
      </Card>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={{ flex: 1 }}>
            Cho phép hiện thông tin bé và tên lịch trên màn hình chính
          </Text>
          <Switch
            value={enabled}
            onValueChange={(v) => void save(v, childId)}
          />
        </View>
        <Text>
          Bất kỳ ai nhìn màn hình có thể thấy thông tin này. Mặc định tắt; không
          lưu token tài khoản trong widget.
        </Text>
        {snapshot.children.map((c) => (
          <Pressable
            key={c.id}
            style={{ padding: 14, minHeight: 48 }}
            onPress={() => void save(enabled, c.id)}
          >
            <Text>
              {(childId || snapshot.child?.id) === c.id ? "● " : "○ "}
              {c.nickname || c.name}
            </Text>
          </Pressable>
        ))}
      </Card>
      <Text>
        Nhấn giữ màn hình chính → Sửa / dấu + → tìm “An Nam” → chọn kiểu và kích
        thước. Có thể thêm nhiều kiểu cùng lúc.
      </Text>
      <Text>
        App cập nhật ảnh chụp dữ liệu khi mở/đồng bộ. iOS quyết định thời điểm
        làm mới widget; widget không thay thế thông báo đúng giờ. Hãy xem thời
        gian cập nhật hiển thị trên widget.
      </Text>
      <Text>
        ESign cần giữ phần mở rộng .appex và quyền App Group trên cả app lẫn
        widget. Nếu chứng chỉ không cấp quyền đó, tiện ích thông tin sẽ hiện
        hướng dẫn, không có dữ liệu. Tiện ích “Cần hỗ trợ” không cần dữ liệu
        chia sẻ nhưng vẫn phải cài được extension.
      </Text>
      <PrimaryButton
        title="Yêu cầu làm mới widget"
        onPress={() =>
          void syncWidgets(db, snapshot)
            .then(() =>
              Alert.alert(
                "Đã yêu cầu làm mới",
                "Kiểm tra ngoài màn hình; iOS có thể trì hoãn. Nếu chưa có dữ liệu, kiểm tra quyền App Group khi ký.",
              ),
            )
            .catch(() => Alert.alert("Chưa cập nhật được widget"))
        }
      />
    </Screen>
  );
}
